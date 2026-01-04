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

// --- UI Components ---

const SearchableSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Helper to get label and value from option (which can be string or object)
    const getLabel = (opt) => (typeof opt === 'object' ? opt.label : opt);
    const getValue = (opt) => (typeof opt === 'object' ? opt.value : opt);

    const filteredOptions = options.filter(opt => 
        getLabel(opt).toLowerCase().includes(search.toLowerCase())
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

    const handleSelect = (opt) => {
        onChange(getValue(opt));
        setIsOpen(false);
        setSearch('');
    };
    
    // Display value logic
    const selectedOption = options.find(opt => getValue(opt) === value);
    const displayLabel = selectedOption ? getLabel(selectedOption) : value;
    const displayValue = isOpen ? search : displayLabel;

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
                <input 
                    type="text"
                    className="modern-input"
                    value={displayValue}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!isOpen) setIsOpen(true);
                        onChange(e.target.value);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    style={{
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0
                    }}
                />
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        padding: '0 12px',
                        borderTopRightRadius: '8px',
                        borderBottomRightRadius: '8px',
                        cursor: 'pointer',
                        borderLeft: 'none'
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
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    zIndex: 1000,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, i) => {
                            const label = getLabel(opt);
                            const val = getValue(opt);
                            const isSelected = val === value;
                            
                            return (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(opt)}
                                    style={{
                                        padding: '10px 12px',
                                        fontSize: '13px',
                                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        background: isSelected ? 'rgba(49, 130, 206, 0.1)' : 'transparent',
                                        borderBottom: '1px solid rgba(255,255,255,0.02)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'rgba(49, 130, 206, 0.1)' : 'transparent'}
                                >
                                    {label}
                                    {typeof opt === 'object' && val !== label && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{val}</div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
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
        <div style={{ 
            height: '100%',
            color: 'var(--text-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '14px'
        }}>
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
        <div className="fade-in" style={{ padding: '24px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '28px', marginRight: '16px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>{data.icon}</span>
                <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedNode.type}</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{data.label}</div>
                </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--bg-element)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Configuration</h4>
                {Object.keys(params).map((key) => {
                    const type = paramTypes[key] || PARAM_TYPES.TEXT;
                    
                    return (
                        <div key={key} style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', color: '#ccc', textTransform: 'capitalize', fontWeight: 500 }}>
                                    {key.replace(/([A-Z])/g, ' $1')}
                                </label>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', border: '1px solid var(--border-color)' }}>{type}</span>
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
                                    className="modern-input"
                                    type={type === PARAM_TYPES.NUMBER ? 'number' : 'text'}
                                    value={params[key]}
                                    onChange={(e) => handleParamChange(key, e.target.value)}
                                    placeholder={`Enter ${key}...`}
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
                    padding: '12px', 
                    background: 'transparent', 
                    border: '1px solid var(--error)', 
                    color: 'var(--error)', 
                    borderRadius: '8px', 
                    fontSize: '13px', 
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                Remove Node
            </button>
        </div>
    );
};

const onDragStart = (event, nodeData, category) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ ...nodeData, category }));
    event.dataTransfer.effectAllowed = 'move';
    
    // Add visual drag effect
    const el = event.target;
    el.style.opacity = '0.5';
};

const onDragEnd = (event) => {
    event.target.style.opacity = '1';
}

const CategoryGroup = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div style={{ marginBottom: '8px' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    padding: '8px 4px',
                    userSelect: 'none',
                    transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
                <span style={{ marginRight: '6px', fontSize: '10px', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                {title}
            </div>
            {isOpen && (
                <div className="fade-in" style={{ paddingLeft: '8px' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

const Section = ({ title, items, category, color, searchTerm }) => {
    const filtered = items.filter(i => 
        !searchTerm || 
        i.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) return null;

    const grouped = filtered.reduce((acc, obj) => {
        const key = obj.category;
        if (!acc[key]) acc[key] = [];
        acc[key].push(obj);
        return acc;
    }, {});

    return (
        <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: color, marginRight: '10px', boxShadow: `0 0 10px ${color}` }}></div>
                <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0, fontWeight: 600 }}>{title}</h3>
            </div>
            {Object.entries(grouped).map(([catName, catItems]) => (
                <CategoryGroup key={catName} title={catName}>
                    {catItems.map((item) => (
                        <div
                            className="drag-item"
                            key={item.type}
                            onDragStart={(event) => onDragStart(event, item, category)}
                            onDragEnd={onDragEnd}
                            draggable
                            style={{
                                padding: '12px 16px',
                                background: 'var(--bg-element)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                borderLeft: `3px solid ${color}`
                            }}
                        >
                            <span style={{ marginRight: '12px', fontSize: '18px' }}>{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </CategoryGroup>
            ))}
        </div>
    );
};

const Sidebar = () => {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <aside style={{ height: '100%', background: 'var(--bg-panel)', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px 0', letterSpacing: '-0.5px' }}>
                    Winomation
                    <span style={{ color: 'var(--accent-primary)' }}>.</span>
                </h2>
                <input 
                    type="text" 
                    className="modern-input"
                    placeholder="Search components..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <Section title="Triggers" items={CATALOG.triggers} category={NODE_TYPES.TRIGGER} color="var(--trigger-color)" searchTerm={searchTerm} />
            <Section title="Conditions" items={CATALOG.conditions} category={NODE_TYPES.CONDITION} color="var(--condition-color)" searchTerm={searchTerm} />
            <Section title="Actions" items={CATALOG.actions} category={NODE_TYPES.ACTION} color="var(--action-color)" searchTerm={searchTerm} />
        </aside>
    );
};

// --- Resizable Layout ---

const ResizableLayout = ({ left, center, right }) => {
    const [leftWidth, setLeftWidth] = useState(300);
    const [rightWidth, setRightWidth] = useState(320);
    const containerRef = useRef(null);

    const startResizeLeft = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = leftWidth;

        const doDrag = (dragEvent) => {
            const newWidth = startWidth + (dragEvent.clientX - startX);
            if (newWidth > 200 && newWidth < 600) {
                setLeftWidth(newWidth);
            }
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    }, [leftWidth]);

    const startResizeRight = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = rightWidth;

        const doDrag = (dragEvent) => {
            const newWidth = startWidth - (dragEvent.clientX - startX);
            if (newWidth > 250 && newWidth < 600) {
                setRightWidth(newWidth);
            }
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    }, [rightWidth]);

    return (
        <div ref={containerRef} style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <div style={{ width: leftWidth, flexShrink: 0 }}>
                {left}
            </div>
            <div 
                onMouseDown={startResizeLeft}
                style={{ 
                    width: '4px', 
                    cursor: 'col-resize', 
                    background: 'var(--border-color)', 
                    transition: 'background 0.2s',
                    zIndex: 10
                }} 
                className="resizer-hover"
            />
            
            <div style={{ flexGrow: 1, height: '100%', position: 'relative', minWidth: '400px' }}>
                {center}
            </div>

            <div 
                onMouseDown={startResizeRight}
                style={{ 
                    width: '4px', 
                    cursor: 'col-resize', 
                    background: 'var(--border-color)', 
                    transition: 'background 0.2s',
                    zIndex: 10
                }} 
                className="resizer-hover"
            />
            <div style={{ width: rightWidth, flexShrink: 0, background: 'var(--bg-panel)', borderLeft: '1px solid var(--border-color)' }}>
                {right}
            </div>
        </div>
    );
};

// --- Dashboard ---

const Dashboard = ({ onOpen, onCreate }) => {
    const [workflows, setWorkflows] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        if (window.electronAPI) {
            const list = await window.electronAPI.getWorkflows();
            setWorkflows(list);
        }
    };

    const handleDelete = async (e, name) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            await window.electronAPI.deleteWorkflow(name);
            loadWorkflows();
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();
        if (newName.length >= 3) {
            onCreate(newName);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', height: '100vh', boxSizing: 'border-box', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0' }}>My Workflows</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your automation tasks</p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="primary-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <span style={{ fontSize: '20px' }}>+</span> New Workflow
                </button>
            </div>

            {isCreating && (
                <div className="fade-in" style={{ marginBottom: '40px', padding: '24px', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 16px 0' }}>Name Your Workflow</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px' }}>
                        <input 
                            autoFocus
                            type="text" 
                            className="modern-input" 
                            placeholder="e.g., Daily Backup" 
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            style={{ maxWidth: '400px' }}
                        />
                        <button type="submit" className="primary-btn" disabled={newName.length < 3}>Create</button>
                        <button 
                            type="button" 
                            onClick={() => { setIsCreating(false); setNewName(''); }}
                            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {workflows.map(wf => (
                    <div 
                        key={wf.filename}
                        onClick={() => onOpen(wf.name)}
                        className="hover-scale"
                        style={{ 
                            background: 'var(--bg-panel)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '12px', 
                            padding: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '160px'
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{wf.name}</h3>
                                <button 
                                    onClick={(e) => handleDelete(e, wf.name)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {new Date(wf.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', background: 'var(--bg-element)', padding: '4px 8px', borderRadius: '4px' }}>
                                    {wf.nodeCount} nodes
                                </span>
                            </div>
                            <span style={{ color: 'var(--accent-primary)', fontSize: '14px', fontWeight: 600 }}>Open &rarr;</span>
                        </div>
                    </div>
                ))}

                {workflows.length === 0 && !isCreating && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                        <p>No workflows found. Create one to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Editor ---

const FlowEditor = ({ workflowName, initialData, onBack }) => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const nodeTypes = useMemo(() => ({
        trigger: TriggerNode,
        condition: ConditionNode,
        action: ActionNode,
    }), []);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#555', strokeWidth: 2 } }, eds)), [setEdges]);

    const onSelectionChange = useCallback((params) => {
        setSelectedNodeId(params.nodes[0]?.id || null);
    }, []);

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

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

    const runWorkflow = () => {
        const flow = { nodes, edges };
        if (window.electronAPI) {
            window.electronAPI.runFlow(flow);
        }
    };

    const saveWorkflow = async () => {
        setIsSaving(true);
        if (window.electronAPI) {
            await window.electronAPI.saveWorkflow(workflowName, { nodes, edges });
        }
        setTimeout(() => setIsSaving(false), 500);
    };

    return (
        <ResizableLayout 
            left={<Sidebar />}
            right={<NodeSettings selectedNode={selectedNode} onUpdate={onUpdateNode} />}
            center={
                <div ref={reactFlowWrapper} style={{ height: '100%', width: '100%' }}>
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
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[20, 20]}
                    >
                        <Panel position="top-left" style={{ margin: '16px' }}>
                            <button 
                                onClick={onBack}
                                style={{ 
                                    background: 'var(--bg-panel)', 
                                    border: '1px solid var(--border-color)', 
                                    color: 'var(--text-secondary)', 
                                    padding: '8px 12px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                &larr; Dashboard
                            </button>
                        </Panel>

                        <Panel position="top-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ background: 'var(--bg-panel)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                                {workflowName}
                            </div>
                            <button 
                                onClick={saveWorkflow}
                                style={{ 
                                    background: 'var(--bg-element)', 
                                    border: '1px solid var(--border-color)', 
                                    color: 'var(--text-primary)', 
                                    padding: '10px 16px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    fontWeight: 500
                                }}
                            >
                                {isSaving ? 'Saving...' : '💾 Save'}
                            </button>
                            <button 
                                className="primary-btn hover-scale"
                                onClick={runWorkflow}
                                style={{ boxShadow: '0 4px 12px rgba(49, 130, 206, 0.4)' }}
                            >
                                🚀 RUN
                            </button>
                        </Panel>
                        <Background color="#222" gap={24} size={1} />
                        <Controls style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        <MiniMap 
                            maskColor="rgba(0,0,0,0.6)" 
                            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                            nodeStrokeColor={(n) => {
                                if (n.type === 'trigger') return 'var(--trigger-color)';
                                if (n.type === 'condition') return 'var(--condition-color)';
                                return 'var(--action-color)';
                            }}
                            nodeColor="#222"
                        />
                    </ReactFlow>
                </div>
            }
        />
    );
};

export default function App() {
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'editor'
    const [currentWorkflow, setCurrentWorkflow] = useState({ name: '', data: null });

    const handleOpenWorkflow = async (name) => {
        let data = null;
        if (window.electronAPI) {
            const loaded = await window.electronAPI.loadWorkflow(name);
            if (loaded && loaded.flow) {
                data = loaded.flow;
            }
        }
        setCurrentWorkflow({ name, data });
        setCurrentView('editor');
    };

    const handleCreateWorkflow = (name) => {
        setCurrentWorkflow({ name, data: null });
        setCurrentView('editor');
    };

    return (
        <ReactFlowProvider>
            {currentView === 'dashboard' ? (
                <Dashboard onOpen={handleOpenWorkflow} onCreate={handleCreateWorkflow} />
            ) : (
                <FlowEditor 
                    workflowName={currentWorkflow.name} 
                    initialData={currentWorkflow.data} 
                    onBack={() => setCurrentView('dashboard')}
                />
            )}
        </ReactFlowProvider>
    );
}
