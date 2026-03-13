import React, { useState } from "react";
import UserDashboard from "./UserDashboard";
import AuditLog from "./AuditLog";

export default function UserManagementDashboard({ isAdmin }) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="user-management-dashboard">
      <h1>User Management</h1>
      <div className="umd-tabs">
        <button onClick={() => setActiveTab("users")}>Users</button>
        <button onClick={() => setActiveTab("audit")}>Audit Log</button>
      </div>

      <div className="umd-content">
        {activeTab === "users" && <UserDashboard isAdmin={isAdmin} />}
        {activeTab === "audit" && <AuditLog />}
      </div>
    </div>
  );
}
