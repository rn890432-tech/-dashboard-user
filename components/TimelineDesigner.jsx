import React, { useState } from "react";

export default function TimelineDesigner({ stages, setStages }) {
  const addStage = () => {
    const newStage = { type: "custom_stage", params: {} };
    setStages([...stages, newStage]);
  };
  const updateStage = (idx, key, value) => {
    const updated = stages.map((stage, i) =>
      i === idx ? { ...stage, [key]: value } : stage
    );
    setStages(updated);
  };
  const deleteStage = (idx) => {
    setStages(stages.filter((_, i) => i !== idx));
  };
  const moveStage = (idx, dir) => {
    const newStages = [...stages];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    [newStages[idx], newStages[targetIdx]] = [newStages[targetIdx], newStages[idx]];
    setStages(newStages);
  };
  return (
    <div className="timeline-designer">
      <h3>Timeline</h3>
      {stages.map((stage, idx) => (
        <div key={idx} className="timeline-stage" style={{marginBottom:'8px',background:'#222',padding:'8px',borderRadius:'6px'}}>
          <span>Stage {idx + 1}</span>
          <pre>{JSON.stringify(stage, null, 2)}</pre>
          <input
            placeholder="Stage Type"
            value={stage.type}
            onChange={e => updateStage(idx, "type", e.target.value)}
          />
          <input
            placeholder="Param Key"
            value={stage.paramKey || ""}
            onChange={e => updateStage(idx, "paramKey", e.target.value)}
          />
          <input
            placeholder="Param Value"
            value={stage.paramValue || ""}
            onChange={e => updateStage(idx, "paramValue", e.target.value)}
          />
          <button onClick={() => deleteStage(idx)} style={{marginLeft:'8px',color:'red'}}>Delete</button>
          <button onClick={() => moveStage(idx, -1)} style={{marginLeft:'8px'}}>↑</button>
          <button onClick={() => moveStage(idx, 1)} style={{marginLeft:'4px'}}>↓</button>
        </div>
      ))}
      <button onClick={addStage}>Add Stage</button>
    </div>
  );
}
