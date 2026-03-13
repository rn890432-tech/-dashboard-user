// InvestigationGraph: Interactive threat investigation graph
import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

const typeColors = {
  ip: '#ff0033',
  domain: '#ff9800',
  user: '#2196f3',
  device: '#00ff00',
  malware: '#9c27b0',
  email: '#607d8b',
};

function mapNodesEdges(raw) {
  return {
    nodes: (raw.nodes || []).map(n => ({
      id: n.id,
      data: { label: n.label || n.id },
      style: { background: typeColors[n.type] || '#222', color: '#fff', borderRadius: 8, padding: 8 },
      type: 'default',
      position: { x: Math.random()*600, y: Math.random()*400 },
    })),
    edges: (raw.edges || []).map(e => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: '#ff9800', strokeWidth: 2 },
    })),
  };
}

import { useState } from 'react';

export default function InvestigationGraph({ graphData, onNodeClick, responseStatus = {} }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    const mapped = mapNodesEdges(graphData || {});
    // Add animated status badges and glowing borders for response actions
    const enhancedNodes = mapped.nodes.map(n => {
      const status = responseStatus[n.id];
      return status ? {
        ...n,
        style: {
          ...n.style,
          border: '3px solid #00fff7',
          boxShadow: '0 0 16px #00fff7',
          animation: 'glowNode 1s infinite alternate',
        },
        data: {
          ...n.data,
          badge: <span style={{background:'#00fff7',color:'#222',borderRadius:'6px',padding:'2px 8px',fontWeight:'bold',marginLeft:'8px',animation:'glowBadge 1s infinite alternate'}}>{status}</span>
        }
      } : n;
    });
    setNodes(enhancedNodes);
    setEdges(mapped.edges);
  }, [graphData, responseStatus]);

  return (
    <div style={{ height: 600, background: '#181a1b', borderRadius: 12, padding: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background color="#222" gap={16} />
        <Controls />
        <style>{`
          @keyframes glowNode {
            from { box-shadow: 0 0 8px #00fff7; }
            to { box-shadow: 0 0 24px #ff0033, 0 0 8px #00fff7; }
          }
          @keyframes glowBadge {
            from { background: #00fff7; }
            to { background: #ff0033; }
          }
        `}</style>
      </ReactFlow>
    </div>
  );
}
