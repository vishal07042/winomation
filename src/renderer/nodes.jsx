import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const nodeStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    width: '200px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-element)',
    boxShadow: 'var(--shadow-md)',
    transition: 'all 0.2s ease',
};

const Header = ({ icon, type, color, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>{icon}</span>
            <span style={{ fontWeight: 600, color, fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{type}</span>
        </div>
        {children}
    </div>
);

const PlayButton = ({ onClick, color }) => (
    <button 
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className="nodrag"
        style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            opacity: 0.7
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.opacity = 1;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.opacity = 0.7;
        }}
        title="Run this action"
    >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
    </button>
);

export const TriggerNode = memo(({ data }) => (
    <div style={{ ...nodeStyle, borderTop: '4px solid var(--trigger-color)' }}>
        <Header icon={data.icon || '⚡'} type="Trigger" color="var(--trigger-color)" />
        <div style={{ fontWeight: 500 }}>{data.label}</div>
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', color: 'var(--text-secondary)' }}>{Object.values(data.params || {}).join(', ')}</div>
        <Handle type="source" position={Position.Bottom} style={{ background: 'var(--trigger-color)', width: '8px', height: '8px' }} />
    </div>
));

export const ConditionNode = memo(({ id, data }) => {
    const onPlay = () => {
        if (window.electronAPI) {
            window.electronAPI.runAction({ id, data });
        }
    };

    return (
        <div style={{ ...nodeStyle, borderTop: '4px solid var(--condition-color)' }}>
            <Handle type="target" position={Position.Top} style={{ background: 'var(--condition-color)', width: '8px', height: '8px' }} />
            <Header icon={data.icon || '🔍'} type="Condition" color="var(--condition-color)">
                <PlayButton onClick={onPlay} color="var(--condition-color)" />
            </Header>
            <div style={{ fontWeight: 500 }}>{data.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', color: 'var(--text-secondary)' }}>{Object.values(data.params || {}).join(', ')}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: 'var(--condition-color)', width: '8px', height: '8px' }} />
        </div>
    );
});

export const ActionNode = memo(({ id, data }) => {
    const onPlay = () => {
        if (window.electronAPI) {
            window.electronAPI.runAction({ id, data });
        }
    };

    return (
        <div style={{ ...nodeStyle, borderTop: '4px solid var(--action-color)' }}>
            <Handle type="target" position={Position.Top} style={{ background: 'var(--action-color)', width: '8px', height: '8px' }} />
            <Header icon={data.icon || '🎬'} type="Action" color="var(--action-color)">
                <PlayButton onClick={onPlay} color="var(--action-color)" />
            </Header>
            <div style={{ fontWeight: 500 }}>{data.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', color: 'var(--text-secondary)' }}>{Object.values(data.params || {}).join(', ')}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: 'var(--action-color)', width: '8px', height: '8px' }} />
        </div>
    );
});
