import React, { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext';

export default function UserDashboard({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const { editUserRole, user } = useAuth();

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
    if (user.role !== 'ADMIN') return;
    // Simulate backend PATCH call
    editUserRole(id, newRole);
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
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
                {isAdmin && user.role === 'ADMIN' ? (
                  <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                    <option value="ADMIN">Admin</option>
                    <option value="ANALYST">Analyst</option>
                    <option value="VIEWER">Viewer</option>
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
