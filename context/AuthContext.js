import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Default to Viewer, not logged in
  const [user, setUser] = useState({ name: "Guest", role: "VIEWER", isLoggedIn: false });

  const login = (role) => setUser({ name: role === 'ADMIN' ? "Admin_User" : "Guest", role, isLoggedIn: true });
  const logout = () => setUser({ name: "Guest", role: "VIEWER", isLoggedIn: false });

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
