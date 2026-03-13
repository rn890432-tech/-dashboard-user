import React from "react";

export default function TechniqueSelector() {
  // Accept onSelect prop
  const [selected, setSelected] = React.useState([]);
  React.useEffect(() => {
    if (typeof onSelect === "function") onSelect(selected);
  }, [selected]);
  return (
    <div className="technique-selector">
      <h3>Technique Selector</h3>
      <input
        placeholder="Comma-separated MITRE techniques"
        value={selected.join(",")}
        onChange={e => setSelected(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
      />
    </div>
  );
}