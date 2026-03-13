import React, { useState } from "react";
import TimelineDesigner from "./TimelineDesigner";

import React, { useState, useEffect } from "react";
import TimelineDesigner from "./TimelineDesigner";

export default function ScenarioBuilder({ onUpdate }) {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [ips, setIps] = useState([]);
  const [stages, setStages] = useState([]);
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [importJson, setImportJson] = useState("");
  const [scenarioList, setScenarioList] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedBulk, setSelectedBulk] = useState([]);
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  // Role state: 'admin', 'analyst', 'viewer'
  const [role, setRole] = useState('admin');

  useEffect(() => {
    fetch("/redteam/scenario")
      .then(res => res.json())
      .then(setScenarioList)
      .catch(() => setScenarioList([]));
  }, []);

  const update = () => {
    onUpdate({ name, description, users, devices, ips, stages, tags });
    validateScenario();
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      setName(parsed.name || "");
      setDescription(parsed.description || "");
      setUsers(parsed.users || []);
      setDevices(parsed.devices || []);
      setIps(parsed.ips || []);
      setStages(parsed.stages || []);
      setTags(parsed.tags || []);
      update();
    } catch (e) {
      alert("Invalid scenario JSON");
    }
  };

  const handleExport = () => {
    const scenario = JSON.stringify({ name, description, users, devices, ips, stages, tags }, null, 2);
    navigator.clipboard.writeText(scenario);
    alert("Scenario copied to clipboard");
  };

  const handleSave = () => {
    fetch("/redteam/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, users, devices, ips, stages, tags })
    })
      .then(() => alert("Scenario saved"))
      .catch(() => alert("Save failed"));
  };

  const handleDelete = (id) => {
    fetch(`/redteam/scenario/${id}`, { method: "DELETE" })
      .then(() => setScenarioList(scenarioList.filter(s => s.id !== id)))
      .catch(() => alert("Delete failed"));
  };

  const handleSelect = (scenario) => {
    setSelectedScenario(scenario);
    setName(scenario.name || "");
    setDescription(scenario.description || "");
    setUsers(scenario.users || []);
    setDevices(scenario.devices || []);
    setIps(scenario.ips || []);
    setStages(scenario.stages || []);
    setTags(scenario.tags || []);
    update();
    const handleTagAdd = (tag) => {
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
        update();
      }
    };
    const handleTagRemove = (tag) => {
      setTags(tags.filter(t => t !== tag));
      update();
    };
    const handleBulkSelect = (id) => {
      setSelectedBulk(selectedBulk.includes(id) ? selectedBulk.filter(b => b !== id) : [...selectedBulk, id]);
    };
    const handleBulkDelete = () => {
      Promise.all(selectedBulk.map(id => fetch(`/redteam/scenario/${id}`, { method: "DELETE" })))
        .then(() => setScenarioList(scenarioList.filter(s => !selectedBulk.includes(s.id))))
        .catch(() => alert("Bulk delete failed"));
      setSelectedBulk([]);
    };
    const validateScenario = () => {
      const errors = [];
      const warnings = [];
      if (!name) errors.push("Scenario name required");
      if (!description) warnings.push("Scenario description recommended");
      if (!users.length) errors.push("No users specified");
      if (!devices.length) errors.push("No devices specified");
      if (!ips.length) warnings.push("No IPs specified");
      if (!stages.length) errors.push("No stages defined");
      stages.forEach((stage, idx) => {
        if (!stage.type) errors.push(`Stage ${idx+1} missing type`);
        if (!stage.name) warnings.push(`Stage ${idx+1} missing name`);
      });
      setValidation({ errors, warnings });
    };
  };

  return (
    <div className="scenario-builder">
      <div style={{marginBottom:'16px'}}>
        <h4>Scenario Library</h4>
        <ul>
          {scenarioList.map(s => (
            <li key={s.id} style={{marginBottom:'4px'}}>
              <input type="checkbox" checked={selectedBulk.includes(s.id)} onChange={() => handleBulkSelect(s.id)} />
              <button onClick={() => handleSelect(s)}>{s.name || s.id}</button>
              {role === 'admin' && <button onClick={() => handleDelete(s.id)} style={{marginLeft:'8px',color:'red'}}>Delete</button>}
            </li>
          ))}
        </ul>
        {role === 'admin' && <button onClick={handleSave}>Save Current Scenario</button>}
        {role === 'admin' && <button onClick={handleBulkDelete} disabled={selectedBulk.length === 0} style={{marginLeft:'8px',color:'red'}}>Bulk Delete</button>}
      </div>
      <div style={{marginBottom:'16px'}}>
        <h4>Scenario Name</h4>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); update(); }}
          placeholder="Scenario name"
          disabled={role !== 'admin'}
        />
        <h4>Scenario Description</h4>
        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); update(); }}
          placeholder="Scenario description"
          disabled={role !== 'admin'}
          rows={3}
          style={{width:'100%'}}
        />
      </div>
      <div style={{marginBottom:'16px'}}>
        <h4>Scenario Tags</h4>
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
          {tags.map(tag => (
            <span key={tag} style={{background:'#333',color:'#fff',padding:'4px 8px',borderRadius:'4px'}}>
              {tag} {role === 'admin' && <button style={{marginLeft:'4px',color:'red'}} onClick={() => handleTagRemove(tag)}>x</button>}
            </span>
          ))}
        </div>
        {role === 'admin' && <input
          type="text"
          placeholder="Add tag"
          onKeyDown={e => {
            if (e.key === "Enter") {
              handleTagAdd(e.target.value);
              e.target.value = "";
            }
          }}
          style={{marginTop:'8px'}}
        />}
      </div>
      <div style={{marginBottom:'16px'}}>
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
      <label>Users (comma-separated)</label>
      <input
        onChange={(e) => {
          setUsers(e.target.value.split(",").map(u => u.trim()).filter(Boolean));
          update();
        }}
        value={users.join(",")}
        disabled={role !== 'admin'}
      />
      <label>Devices (comma-separated)</label>
      <input
        onChange={(e) => {
          setDevices(e.target.value.split(",").map(d => d.trim()).filter(Boolean));
          update();
        }}
        value={devices.join(",")}
        disabled={role !== 'admin'}
      />
      <label>IPs (comma-separated)</label>
      <input
        onChange={(e) => {
          setIps(e.target.value.split(",").map(ip => ip.trim()).filter(Boolean));
          update();
        }}
        value={ips.join(",")}
      />
      <TimelineDesigner stages={stages} setStages={setStages} />
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
    </div>
  );
}
