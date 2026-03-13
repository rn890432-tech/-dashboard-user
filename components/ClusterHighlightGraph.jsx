// ClusterHighlightGraph: Highlights nodes in InvestigationGraph for a campaign
import React from 'react';
import InvestigationGraph from './InvestigationGraph';

export default function ClusterHighlightGraph({ graphData, clusterNodes, onNodeClick }) {
  // Highlight nodes belonging to cluster
  const nodes = (graphData.nodes || []).map(n =>
    clusterNodes.includes(n.id)
      ? { ...n, style: { ...n.style, border: '3px solid #ff9800', boxShadow: '0 0 12px #ff9800' } }
      : n
  );
  return (
    <InvestigationGraph graphData={{ ...graphData, nodes }} onNodeClick={onNodeClick} />
  );
}
