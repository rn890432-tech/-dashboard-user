import React from "react";

export default function InvestigationGraph({ simulationId, events, showSyntheticOnly }) {
  const [graph, setGraph] = React.useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = React.useState(null);
  React.useEffect(() => {
    if (!simulationId) return;
    fetch(`/redteam/simulation/${simulationId}/graph`)
      .then(res => res.json())
      .then(setGraph)
      .catch(() => setGraph({ nodes: [], edges: [] }));
  }, [simulationId]);
  const filteredNodes = showSyntheticOnly ? graph.nodes.filter(n => n.is_synthetic) : graph.nodes;
  const filteredEdges = graph.edges.filter(e => filteredNodes.some(n => n.id === e.source) && filteredNodes.some(n => n.id === e.target));
  return (
    <div className="investigation-graph" style={{background:'#222',padding:'16px',borderRadius:'8px'}}>
      <h3>Investigation Graph</h3>
      <div style={{marginBottom:'8px'}}>
        <span style={{color:'purple',fontWeight:'bold'}}>● Synthetic</span>
        <span style={{color:'gray',marginLeft:'16px'}}>● Real</span>
        <span style={{marginLeft:'16px'}}>Simulation ID: {simulationId}</span>
      </div>
      <GraphRenderer
        nodes={filteredNodes}
        edges={filteredEdges}
        highlightSynthetic={true}
        onNodeClick={setSelectedNode}
      />
      {selectedNode && (
        <div style={{marginTop:'8px',background:'#444',color:'#fff',padding:'8px',borderRadius:'6px'}}>
          <b>Node Details:</b>
          <pre>{JSON.stringify(selectedNode, null, 2)}</pre>
        </div>
      )}
      <div style={{marginTop:'8px'}}>
        <label>
          <input type="checkbox" checked={showSyntheticOnly} readOnly /> Show Synthetic Only
        </label>
      </div>
    </div>
  );
}
import GraphRenderer from "./GraphRenderer";
}