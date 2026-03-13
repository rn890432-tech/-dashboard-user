import React, { useState, useEffect } from "react";

export default function UserDashboard({ isAdmin }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("/users")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      })
      .then(data => setUsers(data))
      .catch(() => setUsers([]));
  }, []);

  const handleRoleChange = (id, newRole) => {
    // Example: actor_id is current admin user (hardcoded for demo)
    const actor_id = "u1";
    fetch(`/users/${id}/role?new_role=${newRole}&actor_id=${actor_id}`, {
      method: "PATCH"
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update role");
        return res.json();
      })
      .then(data => {
        setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      })
      .catch(() => {});
  };

  return (
    <div className="user-dashboard">
      <h2>User Management Dashboard</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Department</th><th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.department}</td>
              <td>
                {isAdmin ? (
                  <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                    <option value="Admin">Admin</option>
                    <option value="Analyst">Analyst</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                ) : (
                  user.role
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
