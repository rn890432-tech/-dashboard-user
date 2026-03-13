import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

const roleHierarchy = {
  'ADMIN': 3,
  'ANALYST': 2,
  'VIEWER': 1
};

export const AuthProvider = ({ children }) => {
  // Default to Viewer, not logged in
  const [user, setUser] = useState({ name: "Guest", role: "VIEWER", isLoggedIn: false });

  const login = (role) => setUser({ name: role === 'ADMIN' ? "Admin_User" : role === 'ANALYST' ? "Analyst_User" : "Guest", role, isLoggedIn: true });
  const logout = () => setUser({ name: "Guest", role: "VIEWER", isLoggedIn: false });

  // RBAC: check if user has at least required role
  const hasRole = (requiredRole) => roleHierarchy[user.role] >= roleHierarchy[requiredRole];

  // Role editing: only ADMIN can edit roles
  const editUserRole = (targetUserId, newRole) => {
    if (user.role !== 'ADMIN') return false;
    // Simulate backend PATCH call
    // ...
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, editUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
