import React, { useState } from "react";
import UserSimulations from "./UserSimulations";

export default function UserDetails({ user, isAdmin }) {
  const [showSimulations, setShowSimulations] = useState(false);
  const [role, setRole] = useState(user.role);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    // Placeholder for API call: PATCH /api/redteam/users/{id}/role
    fetch(`/redteam/users/${user.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_role: newRole }),
    })
      .then(res => res.json())
      .then(data => console.log(`Role for ${user.name} updated to ${newRole}`));
  };

  return (
    <div className="user-details">
      <h3>User Details</h3>
      <p><strong>Name:</strong> {user.name}</p>
      <p><strong>Department:</strong> {user.department}</p>

      {isAdmin ? (
        <div>
          <label><strong>Role:</strong></label>
          <select value={role} onChange={(e) => handleRoleChange(e.target.value)}>
            <option value="Admin">Admin</option>
            <option value="Analyst">Analyst</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>
      ) : (
        <p><strong>Role:</strong> {role}</p>
      )}

      <button onClick={() => setShowSimulations(!showSimulations)}>
        {showSimulations ? "Hide Simulations" : "View Simulations"}
      </button>

      {showSimulations && <UserSimulations userId={user.id} />}
    </div>
  );
}
