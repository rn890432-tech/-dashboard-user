import React from "react";

export default function TimelineDesigner() {
  // Accept stages and setStages props
  return (
    <div className="timeline-designer">
      <h3>Timeline Designer</h3>
      <input
        placeholder="Comma-separated stage names"
        value={Array.isArray(stages) ? stages.join(",") : ""}
        onChange={e => setStages(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
      />
      {/* Stage order design UI */}
    </div>
  );
}