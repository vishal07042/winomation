const engine = require('./engine');
const TriggerManager = require('./TriggerManager');

class FlowRunner {
    constructor() {
        this.triggerManager = new TriggerManager(this.handleTriggerFire.bind(this));
        this.runningFlows = new Set();
    }

    async run(flow) {
        console.log('[FlowRunner] Initializing flow triggers...');
        const { nodes } = flow;

        // Register all triggers in the flow
        const triggers = nodes.filter(n => n.type === 'trigger');

        for (const trigger of triggers) {
            this.triggerManager.register(trigger, flow);
        }
        
        return { success: true, triggerCount: triggers.length };
    }

    async handleTriggerFire(triggerNode, allNodes, allEdges) {
        console.log(`[FlowRunner] Trigger fired event: ${triggerNode.data.label}`);
        
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
                    console.error(`Error executing node ${node.id}:`, err);
                    // In a production system, we'd check error policy here
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
        // For now, simpler to stop individual nodes if we had that mapping
        // In a real system, we'd map flowId -> nodeIds
    }
}

module.exports = new FlowRunner();
