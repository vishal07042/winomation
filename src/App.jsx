import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Panel,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TriggerNode, ConditionNode, ActionNode } from './renderer/nodes';
import { CATALOG, NODE_TYPES, PARAM_TYPES } from './common/nodeDefinitions';

const initialNodes = [];
const initialEdges = [];

let idCounter = 0;
const getId = () => `node_${Date.now()}_${idCounter++}`;

const SearchableSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50); 

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
                <input 
                    type="text"
                    value={isOpen ? search : value}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!isOpen) setIsOpen(true);
                        onChange(e.target.value); // Allow custom typing
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        background: '#151515',
                        border: '1px solid #333',
                        color: '#fff',
                        padding: '8px 12px',
                        borderTopLeftRadius: '4px',
                        borderBottomLeftRadius: '4px',
                        fontSize: '12px',
                        outline: 'none'
                    }}
                />
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        color: '#666',
                        padding: '0 8px',
                        borderTopRightRadius: '4px',
                        borderBottomRightRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {isOpen ? '▴' : '▾'}
                </button>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    marginTop: '4px',
                    zIndex: 1000,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.6)'
                }}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, i) => (
                            <div
                                key={i}
                                onClick={() => handleSelect(opt)}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    color: opt === value ? '#3182ce' : '#ccc',
                                    cursor: 'pointer',
                                    background: opt === value ? 'rgba(49, 130, 206, 0.1)' : 'transparent',
                                    borderBottom: '1px solid rgba(255,255,255,0.02)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = opt === value ? 'rgba(49, 130, 206, 0.1)' : 'transparent'}
                            >
                                {opt}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '12px', fontSize: '12px', color: '#555', textAlign: 'center' }}>
                            {options.length === 0 ? 'Loading system data...' : 'No system match found'}
                            <div style={{ fontSize: '10px', marginTop: '4px' }}>Custom input will be used</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const NodeSettings = ({ selectedNode, onUpdate }) => {
    const [processes, setProcesses] = useState([]);
    const [installedApps, setInstalledApps] = useState([]);

    useEffect(() => {
        if (!selectedNode) return;
        
        const fetchData = async () => {
            if (window.electronAPI) {
                const [procList, appList] = await Promise.all([
                    window.electronAPI.getRunningProcesses(),
                    window.electronAPI.getInstalledApps()
                ]);
                setProcesses(procList);
                setInstalledApps(appList);
            }
        };
        fetchData();
    }, [selectedNode]);

    if (!selectedNode) return (
        <div style={{ width: '320px', background: '#1a1a1a', borderLeft: '1px solid #333', padding: '20px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Select a node to configure
        </div>
    );

    const { data } = selectedNode;
    const params = data.params || {};
    const paramTypes = data.paramTypes || {};

    const handleParamChange = (key, value) => {
        onUpdate(selectedNode.id, {
            ...data,
            params: { ...params, [key]: value }
        });
    };

    return (
        <div style={{ width: '320px', background: '#1a1a1a', borderLeft: '1px solid #333', padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '28px', marginRight: '16px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>{data.icon}</span>
                <div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedNode.type}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{data.label}</div>
                </div>
            </div>

            <div style={{ padding: '15px', background: '#222', borderRadius: '10px', border: '1px solid #333', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '11px', color: '#888', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PARAMETERS</h4>
                {Object.keys(params).map((key) => {
                    const type = paramTypes[key] || PARAM_TYPES.TEXT;
                    
                    return (
                        <div key={key} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '11px', color: '#ccc', textTransform: 'capitalize', fontWeight: 500 }}>
                                    {key.replace(/([A-Z])/g, ' $1')}
                                </label>
                                <span style={{ fontSize: '9px', color: '#555', background: '#151515', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase' }}>{type}</span>
                            </div>
                            
                            {type === PARAM_TYPES.PROCESS ? (
                                <SearchableSelect 
                                    options={processes} 
                                    value={params[key]} 
                                    onChange={(val) => handleParamChange(key, val)}
                                    placeholder="Select a process..."
                                />
                            ) : type === PARAM_TYPES.APP ? (
                                <SearchableSelect 
                                    options={installedApps} 
                                    value={params[key]} 
                                    onChange={(val) => handleParamChange(key, val)}
                                    placeholder="Select an app..."
                                />
                            ) : type === PARAM_TYPES.SELECT ? (
                                <SearchableSelect 
                                    options={data.options?.[key] || []} 
                                    value={params[key]} 
                                    onChange={(val) => handleParamChange(key, val)}
                                    placeholder="Select an option..."
                                />
                            ) : (
                                <input
                                    type={type === PARAM_TYPES.NUMBER ? 'number' : 'text'}
                                    value={params[key]}
                                    onChange={(e) => handleParamChange(key, e.target.value)}
                                    placeholder={`Enter ${key}...`}
                                    style={{
                                        width: '100%',
                                        background: '#151515',
                                        border: '1px solid #333',
                                        color: '#eee',
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        outline: 'none'
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={() => onUpdate(selectedNode.id, null, true)}
                style={{ 
                    width: '100%', 
                    padding: '10px', 
                    background: 'transparent', 
                    border: '1px solid #e53e3e', 
                    color: '#e53e3e', 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                Delete Node
            </button>
        </div>
    );
};

const Sidebar = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const onDragStart = (event, nodeData, category) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ ...nodeData, category }));
        event.dataTransfer.effectAllowed = 'move';
    };

    const filterItems = (items) => {
        if (!searchTerm) return items;
        return items.filter(i => 
            i.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
            i.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const Section = ({ title, items, category, color }) => {
        const filtered = filterItems(items);
        if (filtered.length === 0) return null;

        const grouped = filtered.reduce((acc, obj) => {
            const key = obj.category;
            if (!acc[key]) acc[key] = [];
            acc[key].push(obj);
            return acc;
        }, {});

        return (
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: color, marginRight: '8px' }}></div>
                    <h3 style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>{title}</h3>
                </div>
                {Object.entries(grouped).map(([catName, catItems]) => (
                    <div key={catName} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '9px', color: '#555', marginBottom: '5px', marginLeft: '12px' }}>{catName}</div>
                        {catItems.map((item) => (
                            <div
                                key={item.type}
                                onDragStart={(event) => onDragStart(event, item, category)}
                                draggable
                                style={{
                                    padding: '8px 12px',
                                    background: '#252525',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    marginBottom: '6px',
                                    cursor: 'grab',
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    color: '#ccc',
                                    transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
                            >
                                <span style={{ marginRight: '10px', fontSize: '16px' }}>{item.icon}</span>
                                {item.label}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <aside style={{ width: '280px', background: '#1a1a1a', borderRight: '1px solid #333', padding: '20px', overflowY: 'auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 15px 0' }}>Winomation</h2>
                <input 
                    type="text" 
                    placeholder="Search nodes..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        background: '#222',
                        border: '1px solid #333',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        outline: 'none'
                    }}
                />
            </div>
            <Section title="Triggers" items={CATALOG.triggers} category={NODE_TYPES.TRIGGER} color="#ff4d4d" />
            <Section title="Conditions" items={CATALOG.conditions} category={NODE_TYPES.CONDITION} color="#ffad33" />
            <Section title="Actions" items={CATALOG.actions} category={NODE_TYPES.ACTION} color="#33adff" />
        </aside>
    );
};

const FlowEditor = () => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(true);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getLogs().then(setLogs);
            window.electronAPI.onLog((log) => {
                setLogs((prev) => [...prev.slice(-99), log]);
            });
        }
    }, []);

    const clearLogs = () => {
        if (window.electronAPI) {
            window.electronAPI.clearLogs();
            setLogs([]);
        }
    };

    // Resizable UI State
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [settingsWidth, setSettingsWidth] = useState(320);
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);

    const nodeTypes = useMemo(() => ({
        trigger: TriggerNode,
        condition: ConditionNode,
        action: ActionNode,
    }), []);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#444', strokeWidth: 2 } }, eds)), [setEdges]);

    const onSelectionChange = useCallback((params) => {
        setSelectedNodeId(params.nodes[0]?.id || null);
    }, []);

    const onNodesDelete = useCallback((deleted) => {
        setEdges((eds) => eds.filter((edge) => !deleted.some((node) => node.id === edge.source || node.id === edge.target)));
        setSelectedNodeId(null);
    }, [setEdges]);

    const onUpdateNode = useCallback((id, newData, isDelete) => {
        if (isDelete) {
            setNodes((nds) => nds.filter(node => node.id !== id));
            setEdges((eds) => eds.filter(edge => edge.source !== id && edge.target !== id));
            setSelectedNodeId(null);
        } else {
            setNodes((nds) => nds.map(node => node.id === id ? { ...node, data: newData } : node));
        }
    }, [setNodes, setEdges]);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));

            if (!data) return;

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNode = {
                id: getId(),
                type: data.category,
                position,
                data: { 
                    label: data.label, 
                    type: data.type, 
                    params: { ...data.params },
                    paramTypes: { ...data.paramTypes },
                    options: { ...data.options },
                    icon: data.icon,
                    category: data.category
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    // Resizer Logic
    const startResizingLeft = useCallback(() => setIsResizingLeft(true), []);
    const startResizingRight = useCallback(() => setIsResizingRight(true), []);
    const stopResizing = useCallback(() => {
        setIsResizingLeft(false);
        setIsResizingRight(false);
    }, []);

    const onMouseMove = useCallback((e) => {
        if (isResizingLeft) {
            setSidebarWidth(Math.max(200, Math.min(500, e.clientX)));
        } else if (isResizingRight) {
            setSettingsWidth(Math.max(250, Math.min(600, window.innerWidth - e.clientX)));
        }
    }, [isResizingLeft, isResizingRight]);

    useEffect(() => {
        if (isResizingLeft || isResizingRight) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizingLeft, isResizingRight, onMouseMove, stopResizing]);

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

    const runWorkflow = () => {
        const flow = { nodes, edges };
        if (window.electronAPI) {
            window.electronAPI.runFlow(flow);
        }
    };

    return (
        <div 
            style={{ 
                display: 'flex', 
                width: '100vw', 
                height: '100vh', 
                background: '#0a0a0a', 
                color: '#fff', 
                cursor: (isResizingLeft || isResizingRight) ? 'col-resize' : 'default',
                userSelect: (isResizingLeft || isResizingRight) ? 'none' : 'auto'
            }}
        >
            {/* Sidebar with Visible Resizer */}
            <div style={{ width: sidebarWidth, display: 'flex', position: 'relative', borderRight: '1px solid #222' }}>
                <div style={{ flexGrow: 1, minWidth: 0, height: '100%' }}>
                    <Sidebar />
                </div>
                {/* Visual line and hidden handle */}
                <div 
                    onMouseDown={startResizingLeft}
                    style={{ 
                        position: 'absolute',
                        right: '-5px',
                        top: 0,
                        bottom: 0,
                        width: '10px',
                        cursor: 'col-resize',
                        zIndex: 100,
                        backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(49, 130, 206, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                />
            </div>

            {/* Main Editor Canvas */}
            <div ref={reactFlowWrapper} style={{ flexGrow: 1, height: '100%', position: 'relative', background: '#0e0e0e', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flexGrow: 1, minHeight: 0 }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onSelectionChange={onSelectionChange}
                        onNodesDelete={onNodesDelete}
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[15, 15]}
                    >
                        <Panel position="top-right" style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={runWorkflow}
                                className="run-btn"
                                style={{ 
                                    background: '#3182ce', 
                                    border: 'none', 
                                    color: '#fff', 
                                    padding: '10px 24px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    boxShadow: '0 0 20px rgba(49, 130, 206, 0.3)',
                                    transition: 'all 0.2s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                🚀 Start Workflow
                            </button>
                        </Panel>
                        <Background color="#1a1a1a" gap={20} variant="dots" />
                        <Controls style={{ background: '#1a1a1a', border: '1px solid #333' }} />
                        <MiniMap 
                            maskColor="rgba(0,0,0,0.8)" 
                            style={{ background: '#1a1a1a', border: '1px solid #333' }}
                            nodeStrokeColor={(n) => {
                                if (n.type === 'trigger') return '#ff4d4d';
                                if (n.type === 'condition') return '#ffad33';
                                return '#33adff';
                            }}
                            nodeColor="#222"
                        />
                    </ReactFlow>
                </div>

                {/* Log Panel */}
                {showLogs && (
                    <div style={{ 
                        height: '200px', 
                        background: '#111', 
                        borderTop: '1px solid #222', 
                        display: 'flex', 
                        flexDirection: 'column',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                    }}>
                        <div style={{ 
                            padding: '8px 16px', 
                            background: '#151515', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: '1px solid #222'
                        }}>
                            <span style={{ color: '#888', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>System Logs</span>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={clearLogs} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '10px' }}>CLEAR</button>
                                <button onClick={() => setShowLogs(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '10px' }}>HIDE</button>
                            </div>
                        </div>
                        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px 16px' }}>
                            {logs.map((log, i) => (
                                <div key={i} style={{ marginBottom: '4px', display: 'flex', gap: '8px' }}>
                                    <span style={{ color: '#444', minWidth: '70px' }}>[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                                    <span style={{ 
                                        color: log.type === 'error' ? '#f56565' : 
                                               log.type === 'warn' ? '#ed8936' : 
                                               log.type === 'success' ? '#48bb78' : '#cbd5e0'
                                    }}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            {logs.length === 0 && <div style={{ color: '#444' }}>No logs yet...</div>}
                        </div>
                    </div>
                )}
                {!showLogs && (
                    <button 
                        onClick={() => setShowLogs(true)}
                        style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            color: '#888',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            zIndex: 10
                        }}
                    >
                        SHOW LOGS
                    </button>
                )}
            </div>

            {/* Node Settings with Visible Resizer */}
            <div style={{ width: settingsWidth, display: 'flex', position: 'relative', borderLeft: '1px solid #222' }}>
                <div 
                    onMouseDown={startResizingRight}
                    style={{ 
                        position: 'absolute',
                        left: '-5px',
                        top: 0,
                        bottom: 0,
                        width: '10px',
                        cursor: 'col-resize',
                        zIndex: 100,
                        backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(49, 130, 206, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                />
                <div style={{ flexGrow: 1, minWidth: 0, height: '100%' }}>
                    <NodeSettings selectedNode={selectedNode} onUpdate={onUpdateNode} />
                </div>
            </div>
        </div>
    );
};

export default function App() {
    return (
        <ReactFlowProvider>
            <FlowEditor />
        </ReactFlowProvider>
    );
}
