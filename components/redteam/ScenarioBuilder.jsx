import React from "react";

export default function ScenarioBuilder() {
  const [validation, setValidation] = React.useState({ errors: [], warnings: [] });
  const [importJson, setImportJson] = React.useState("");

  React.useEffect(() => {
    const scenario = {
      name,
      description,
      techniques,
      users: entities.users,
      devices: entities.devices,
      ips: entities.ips,
      stages,
      tags
    };
    onScenarioUpdate && onScenarioUpdate(scenario);
    validateScenario(scenario);
  }, [name, description, techniques, entities, stages, tags]);

  const validateScenario = (scenario) => {
    const errors = [];
    const warnings = [];
    if (!scenario.name) errors.push("Scenario name required");
    if (!scenario.techniques.length) errors.push("At least one technique required");
    if (!scenario.users || !scenario.users.length) errors.push("At least one user required");
    if (!scenario.devices || !scenario.devices.length) errors.push("At least one device required");
    if (!scenario.stages || !scenario.stages.length) errors.push("At least one stage required");
    scenario.stages.forEach((stage, idx) => {
      if (!stage) warnings.push(`Stage ${idx+1} is empty`);
    });
    setValidation({ errors, warnings });
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      setName(parsed.name || "");
      setDescription(parsed.description || "");
      setTechniques(parsed.techniques || []);
      setEntities({ users: parsed.users || [], devices: parsed.devices || [], ips: parsed.ips || [] });
      setStages(parsed.stages || []);
      setTags(parsed.tags || []);
    } catch (e) {
      alert("Invalid scenario JSON");
    }
  };
  const handleExport = () => {
    const scenario = {
      name,
      description,
      techniques,
      users: entities.users,
      devices: entities.devices,
      ips: entities.ips,
      stages,
      tags
    };
    navigator.clipboard.writeText(JSON.stringify(scenario, null, 2));
    alert("Scenario copied to clipboard");
  };

  return (
    <div className="scenario-builder">
      <h2>Scenario Builder</h2>
      <label>Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Scenario name" />
      <label>Description</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Scenario description" />
      <TechniqueSelector onSelect={setTechniques} />
      <EntitySelector onSelect={setEntities} />
      <TimelineDesigner stages={stages} setStages={setStages} />
      <label>Tags</label>
      <input value={tags.join(",")} onChange={e => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="Comma-separated tags" />
      <div style={{marginTop:'16px'}}>
        <h4>Stage Preview</h4>
        <pre style={{background:'#111',color:'#fff',padding:'8px',borderRadius:'6px'}}>{JSON.stringify(stages, null, 2)}</pre>
      </div>
      <div style={{marginTop:'16px'}}>
        <h4>Scenario Import/Export</h4>
        <textarea
          rows={6}
          style={{width:'100%'}}
          value={importJson}
          onChange={e => setImportJson(e.target.value)}
          placeholder="Paste scenario JSON here"
        />
        <button onClick={handleImport}>Import Scenario</button>
        <button onClick={handleExport}>Export Scenario</button>
      </div>
      <div style={{marginTop:'16px'}}>
        <h4>Validation Feedback</h4>
        {validation.errors.length > 0 && (
          <div style={{color:'red'}}>
            <b>Errors:</b>
            <ul>{validation.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
          </div>
        )}
        {validation.warnings.length > 0 && (
          <div style={{color:'orange'}}>
            <b>Warnings:</b>
            <ul>{validation.warnings.map((warn, i) => <li key={i}>{warn}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
import TechniqueSelector from "./TechniqueSelector";
import EntitySelector from "./EntitySelector";
import TimelineDesigner from "./TimelineDesigner";
}