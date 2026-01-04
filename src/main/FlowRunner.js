import engine from './engine';
import TriggerManager from './TriggerManager';
import Logger from './Logger';

class FlowRunner {
    constructor() {
        this.triggerManager = new TriggerManager(this.handleTriggerFire.bind(this));
        // Map<flowId, Set<triggerNodeId>>
        this.runningFlows = new Map();
    }

    async run(flow) {
        const flowId = flow.id || flow.name || 'default';
        Logger.info(`Initializing flow triggers for: ${flow.name || 'Unnamed Flow'} (ID: ${flowId})`);
        
        // Stop existing instance of this flow to prevent duplicate triggers
        this.stop(flowId);

        const { nodes } = flow;

        // Register all triggers in the flow
        const triggers = nodes.filter(n => n.type === 'trigger');
        const registeredNodeIds = new Set();

        for (const trigger of triggers) {
            this.triggerManager.register(trigger, flow);
            registeredNodeIds.add(trigger.id);
        }
        
        this.runningFlows.set(flowId, registeredNodeIds);

        return { success: true, triggerCount: triggers.length };
    }

    async handleTriggerFire(triggerNode, allNodes, allEdges) {
        Logger.info(`Flow triggered by: ${triggerNode.data.label || triggerNode.type}`);
        
        let currentNodes = this.getNextNodes(triggerNode.id, allNodes, allEdges);

        while (currentNodes.length > 0) {
            const nextNodes = [];

            for (const node of currentNodes) {
                try {
                    if (node.type === 'condition') {
                        const result = await engine.evaluateCondition(node);
                        if (result) {
                            nextNodes.push(...this.getNextNodes(node.id, allNodes, allEdges));
                        }
                    } else if (node.type === 'action') {
                        await engine.executeAction(node);
                        nextNodes.push(...this.getNextNodes(node.id, allNodes, allEdges));
                    }
                } catch (err) {
                    Logger.error(`Error executing node ${node.id}: ${err.message}`);
                }
            }

            currentNodes = nextNodes;
        }
    }

    getNextNodes(nodeId, allNodes, allEdges) {
        const targetIds = allEdges
            .filter(e => e.source === nodeId)
            .map(e => e.target);
        
        return allNodes.filter(n => targetIds.includes(n.id));
    }

    stop(id) {
        // Stop all listeners associated with this flow
        if (this.runningFlows.has(id)) {
            const nodeIds = this.runningFlows.get(id);
            for (const nodeId of nodeIds) {
                this.triggerManager.clear(nodeId);
            }
            this.runningFlows.delete(id);
            Logger.info(`Stopped flow: ${id}`);
        }
    }

    stopAll() {
        this.triggerManager.clearAll();
        this.runningFlows.clear();
        Logger.info('Stopped all flows');
    }
}

export default new FlowRunner();
