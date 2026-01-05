import { Proxy as MitmProxy } from 'http-mitm-proxy';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { app } from 'electron';
import Logger from '../main/Logger';

class MitmController {
    constructor() {
        this.proxy = new MitmProxy();
        this.port = 8080;
        this.host = '0.0.0.0';
        this.isRunning = false;
        this.mitmFlows = [];
        this.caPath = path.join(app.getPath('userData'), 'mitm-ca');
        
        if (!fs.existsSync(this.caPath)) {
            fs.mkdirSync(this.caPath, { recursive: true });
        }

        this.setupProxy();
    }

    setupProxy() {
        this.proxy.onError((ctx, err) => {
            // Ignore some common errors
            if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
            Logger.error(`MITM Proxy Error: ${err.message}`);
            console.error('Proxy Error:', err);
        });

        this.proxy.onRequest(async (ctx, callback) => {
            ctx.use(MitmProxy.gunzip);
            
            // Check for Blocking (URL based)
            const result = await this.processRequest(ctx);
            if (result && result.blocked) {
                ctx.proxyToClientResponse.writeHead(403, { 'Content-Type': 'text/plain' });
                ctx.proxyToClientResponse.end('Blocked by Winomation');
                return;
            }

            // Body modification logic for request
            this.prepareRequestBodyModifiers(ctx);

            return callback();
        });

        this.proxy.onResponse(async (ctx, callback) => {
            ctx.use(MitmProxy.gunzip);
            
            await this.processResponse(ctx);
            return callback();
        });
    }

    prepareRequestBodyModifiers(ctx) {
        // We only add filters here. The logic will be evaluated inside the filter 
        // because we need the body chunk by chunk or buffered.
        // For simplicity, we'll implement the "blocking" part of the flow in onRequest
        // and "modification" part in filters.
    }

    async processRequest(ctx) {
        const url = (ctx.isSSL ? 'https://' : 'http://') + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url;
        
        for (const flowData of this.mitmFlows) {
            const flow = flowData.flow;
            const startNodes = flow.nodes.filter(n => n.data.type === 'mitm_request');
            for (const startNode of startNodes) {
                const outcome = await this.evaluateMitmBranch(startNode, flow.nodes, flow.edges, ctx, 'request');
                if (outcome && outcome.blocked) return { blocked: true };
            }
        }
        return { blocked: false };
    }

    async processResponse(ctx) {
        for (const flowData of this.mitmFlows) {
            const flow = flowData.flow;
            const startNodes = flow.nodes.filter(n => n.data.type === 'mitm_response');
            for (const startNode of startNodes) {
                await this.evaluateMitmBranch(startNode, flow.nodes, flow.edges, ctx, 'response');
            }
        }
    }

    async evaluateMitmBranch(currentNode, allNodes, allEdges, ctx, stage) {
        const nextNodes = this.getNextNodes(currentNode.id, allNodes, allEdges);
        
        for (const node of nextNodes) {
            if (node.type === 'condition') {
                const passed = await this.evaluateMitmCondition(node, ctx, stage);
                if (passed) {
                    const result = await this.evaluateMitmBranch(node, allNodes, allEdges, ctx, stage);
                    if (result && result.blocked) return result;
                }
            } else if (node.type === 'action') {
                const result = await this.executeMitmAction(node, ctx, stage);
                if (result && result.blocked) return result;
                
                const branchResult = await this.evaluateMitmBranch(node, allNodes, allEdges, ctx, stage);
                if (branchResult && branchResult.blocked) return branchResult;
            }
        }
    }

    async evaluateMitmCondition(node, ctx, stage) {
        const { type, params } = node.data;
        
        if (type === 'mitm_is_running') return this.isRunning;
        if (!ctx) return false;

        const url = (ctx.isSSL ? 'https://' : 'http://') + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url;

        switch (type) {
            case 'mitm_url_match':
                return url.toLowerCase().includes(params.keyword.toLowerCase());
            
            case 'mitm_body_match':
                // Note: Body match in 'onRequest' or 'onResponse' root is hard without buffering.
                // We'll treat this as "matched" if it's a URL match for now, or just return false.
                // Re-think: Body match is best used inside filters.
                return false; 
            
            case 'mitm_status_match':
                if (stage !== 'response') return false;
                return ctx.serverToProxyResponse.statusCode === parseInt(params.status);
            
            case 'mitm_is_running':
                return this.isRunning;
            
            default:
                return false;
        }
    }

    async executeMitmAction(node, ctx, stage) {
        const { type, params } = node.data;

        switch (type) {
            case 'mitm_block':
                if (!ctx) return { success: false, error: 'No proxy context' };
                return { blocked: true };
            
            case 'mitm_modify_body':
                if (!ctx) return { success: false, error: 'No proxy context' };
                const filter = (chunk, proxyContext, next) => {
                    let body = chunk.toString();
                    if (body.includes(params.search)) {
                        body = body.split(params.search).join(params.replace);
                        return next(null, Buffer.from(body));
                    }
                    next(null, chunk);
                };
                if (stage === 'response') ctx.addResponseFilter(filter);
                else ctx.addRequestFilter(filter);
                break;
            
            case 'mitm_set_status':
                if (!ctx) return { success: false, error: 'No proxy context' };
                if (stage === 'response') {
                    ctx.serverToProxyResponse.statusCode = parseInt(params.status);
                }
                break;
            
            case 'mitm_drop_header':
                if (!ctx) return { success: false, error: 'No proxy context' };
                const header = params.header.toLowerCase();
                if (stage === 'request') {
                    delete ctx.clientToProxyRequest.headers[header];
                } else if (stage === 'response') {
                    delete ctx.serverToProxyResponse.headers[header];
                }
                break;

            case 'mitm_set_json_field':
                if (!ctx) return { success: false, error: 'No proxy context' };
                const jsonFilter = (chunk, proxyContext, next) => {
                    try {
                        let body = chunk.toString();
                        const json = JSON.parse(body);
                        const parts = params.path.split('.');
                        let current = json;
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!current[parts[i]]) current[parts[i]] = {};
                            current = current[parts[i]];
                        }
                        let val = params.value;
                        if (val === 'true') val = true;
                        else if (val === 'false') val = false;
                        else if (!isNaN(val)) val = Number(val);
                        current[parts[parts.length - 1]] = val;
                        
                        Logger.info(`MITM: Modified JSON field ${params.path}`);
                        return next(null, Buffer.from(JSON.stringify(json)));
                    } catch (e) {
                        return next(null, chunk);
                    }
                };
                if (stage === 'response') ctx.addResponseFilter(jsonFilter);
                else ctx.addRequestFilter(jsonFilter);
                break;

            case 'mitm_start':
                this.port = parseInt(params.port) || 8080;
                this.host = params.host || '0.0.0.0';
                await this.start();
                break;
            
            case 'mitm_stop':
                this.stop();
                break;
            
            case 'mitm_generate_cert':
                await this.generateCertificate();
                break;
            
            case 'mitm_install_cert':
                await this.installCertificate();
                break;
        }
    }

    getNextNodes(nodeId, allNodes, allEdges) {
        const targetIds = allEdges
            .filter(e => e.source === nodeId)
            .map(e => e.target);
        return allNodes.filter(n => targetIds.includes(n.id));
    }

    setFlows(flows) {
        this.mitmFlows = flows.filter(f => 
            f.flow.nodes.some(n => n.data.category === 'Mitm')
        );
        
        if (this.mitmFlows.length > 0) {
            this.start();
        } else {
            this.stop();
        }
    }

    async start() {
        if (this.isRunning) {
            Logger.info('MITM Proxy is already running');
            return;
        }
        return new Promise((resolve) => {
            this.proxy.listen({ port: this.port, host: this.host, sslCaDir: this.caPath }, (err) => {
                if (err) {
                    Logger.error(`Proxy start failed: ${err.message}`);
                    console.error('Proxy start failed:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    this.isRunning = true;
                    Logger.success(`MITM Proxy running on ${this.host}:${this.port}`);
                    console.log(`MITM Proxy running on ${this.host}:${this.port}`);
                    resolve({ success: true });
                }
            });
        });
    }

    stop() {
        if (!this.isRunning) return;
        this.proxy.close();
        this.isRunning = false;
        Logger.info('MITM Proxy stopped');
        console.log('MITM Proxy stopped');
    }

    async generateCertificate() {
        Logger.info('Generating MITM Certificate...');
        // Certificate is automatically generated on proxy start if it doesn't exist.
        // We can force it by starting and stopping a temporary instance.
        const tempPort = 8081;
        try {
            await new Promise((resolve, reject) => {
                this.proxy.listen({ port: tempPort, sslCaDir: this.caPath }, (err) => {
                    if (err) reject(err);
                    else {
                        setTimeout(() => {
                            this.proxy.close();
                            resolve();
                        }, 2000);
                    }
                });
            });
            Logger.success('MITM Root CA Certificate generated successfully');
            return { success: true };
        } catch (e) {
            Logger.error(`Failed to generate certificate: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    async installCertificate() {
        Logger.info('Attempting to install MITM Certificate to Windows store...');
        const certPath = path.join(this.caPath, 'certs', 'ca.pem');
        
        if (!fs.existsSync(certPath)) {
            Logger.warn('Certificate not found, generating first...');
            await this.generateCertificate();
        }

        if (!fs.existsSync(certPath)) {
            Logger.error('Certificate file still not found after generation attempt');
            return { success: false, error: 'Certificate file not found' };
        }

        return new Promise((resolve) => {
            const cmd = `certutil -addstore -f "Root" "${certPath}"`;
            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    Logger.error(`Certificate installation failed: ${stderr || err.message}`);
                    resolve({ success: false, error: stderr || err.message });
                }
                else {
                    Logger.success('Winomation Root CA installed successfully to System Store');
                    resolve({ success: true, message: 'Winomation Root CA installed successfully' });
                }
            });
        });
    }
}

export default new MitmController();
