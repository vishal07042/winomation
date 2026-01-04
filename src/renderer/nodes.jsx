import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const nodeStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#fff',
    width: '200px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#1e1e1e',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.2s ease',
};

const Header = ({ icon, type, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
        <span style={{ fontSize: '18px', marginRight: '8px' }}>{icon}</span>
        <span style={{ fontWeight: 600, color, fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{type}</span>
    </div>
);

export const TriggerNode = memo(({ data }) => (
    <div style={{ ...nodeStyle, borderTop: '4px solid #e53e3e' }}>
        <Header icon={data.icon || '⚡'} type="Trigger" color="#e53e3e" />
        <div style={{ fontWeight: 500 }}>{data.label}</div>
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{Object.values(data.params || {}).join(', ')}</div>
        <Handle type="source" position={Position.Bottom} style={{ background: '#e53e3e', width: '8px', height: '8px' }} />
    </div>
));

export const ConditionNode = memo(({ data }) => (
    <div style={{ ...nodeStyle, borderTop: '4px solid #d69e2e' }}>
        <Handle type="target" position={Position.Top} style={{ background: '#d69e2e', width: '8px', height: '8px' }} />
        <Header icon={data.icon || '🔍'} type="Condition" color="#d69e2e" />
        <div style={{ fontWeight: 500 }}>{data.label}</div>
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{Object.values(data.params || {}).join(', ')}</div>
        <Handle type="source" position={Position.Bottom} style={{ background: '#d69e2e', width: '8px', height: '8px' }} />
    </div>
));

export const ActionNode = memo(({ data }) => (
    <div style={{ ...nodeStyle, borderTop: '4px solid #3182ce' }}>
        <Handle type="target" position={Position.Top} style={{ background: '#3182ce', width: '8px', height: '8px' }} />
        <Header icon={data.icon || '🚀'} type="Action" color="#3182ce" />
        <div style={{ fontWeight: 500 }}>{data.label}</div>
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{Object.values(data.params || {}).join(', ')}</div>
    </div>
));
