import React from "react";
import { ForceGraph2D } from 'react-force-graph';

export default function GraphRenderer({ nodes, edges, highlightSynthetic, onNodeClick }) {
  // Convert nodes/edges to force-graph format
  const graphData = {
    nodes: nodes.map(n => ({ ...n, color: n.is_synthetic ? 'purple' : 'gray' })),
    links: edges.map(e => ({ source: e.source, target: e.target }))
  };
  return (
    <div style={{height:'300px',background:'#333',borderRadius:'6px',margin:'8px 0'}}>
      <ForceGraph2D
        graphData={graphData}
        nodeAutoColorBy="color"
        nodeLabel={node => node.label || node.id}
        onNodeClick={onNodeClick}
        width={600}
        height={300}
      />
    </div>
  );
}