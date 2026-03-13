import React, { useState, useEffect } from "react";
import UserDetails from "./UserDetails";

export default function UserList({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    // Placeholder for API call
    fetch('/redteam/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  return (
    <div className="user-list">
      <h2>Users</h2>
      {users.map((user) => (
        <div
          key={user.id}
          className="user-item"
          onClick={() => setSelectedUser(user)}
        >
          <strong>{user.name}</strong> — {user.role}
        </div>
      ))}

      {selectedUser && <UserDetails user={selectedUser} isAdmin={isAdmin} />}
    </div>
  );
}
