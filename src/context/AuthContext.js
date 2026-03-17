import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

const roleHierarchy = {
  'OWNER': 5,
  'ADMIN': 4,
  'BILLING_ADMIN': 3,
  'ANALYST': 2,
  'VIEWER': 1
};

export const AuthProvider = ({ children }) => {
  // Default to Viewer, not logged in
  const [user, setUser] = useState({
    id: 'guest',
    name: 'Guest',
    role: 'VIEWER',
    isLoggedIn: false,
    organizationId: 'org_default',
    organizationName: 'Default SOC Org',
    subscription: { planCode: 'enterprise', status: 'active' },
  });

  const login = (role, organizationId = 'org_default') => {
    const normalizedRole = roleHierarchy[role] ? role : 'VIEWER';
    const identity = normalizedRole === 'OWNER'
      ? { id: 'user_owner', name: 'Tenant Owner' }
      : normalizedRole === 'ADMIN'
        ? { id: 'user_owner', name: 'Admin_User' }
        : normalizedRole === 'BILLING_ADMIN'
          ? { id: 'user_billing', name: 'Billing_Admin' }
          : normalizedRole === 'ANALYST'
            ? { id: 'user_analyst', name: 'Analyst_User' }
            : { id: 'guest', name: 'Guest' };
    setUser({
      ...identity,
      role: normalizedRole,
      isLoggedIn: true,
      organizationId,
      organizationName: organizationId === 'org_default' ? 'Default SOC Org' : organizationId,
      subscription: { planCode: 'enterprise', status: 'active' },
    });
  };
  const logout = () => setUser({
    id: 'guest',
    name: 'Guest',
    role: 'VIEWER',
    isLoggedIn: false,
    organizationId: 'org_default',
    organizationName: 'Default SOC Org',
    subscription: { planCode: 'enterprise', status: 'active' },
  });

  // RBAC: check if user has at least required role
  const hasRole = (requiredRole) => roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  const canManageBilling = () => hasRole('BILLING_ADMIN');

  // Role editing: only ADMIN can edit roles
  const editUserRole = (targetUserId, newRole) => {
    if (!hasRole('ADMIN')) return false;
    return true;
  };

  // Return HTTP headers for every API request.
  // X-Org-Id  → tenant scope (required by tenant guard middleware)
  // X-User-Role → RBAC enforcement (validated server-side)
  // X-User-Id  → audit logging and trail
  const getHeaders = () => ({
    'X-Org-Id': user.organizationId || 'org_default',
    'X-User-Role': user.role || 'VIEWER',
    'X-User-Id': user.id || 'unknown',
  });

  // Convenience aliases for SOC pages.
  // NOTE: enrichedUser intentionally exposes BOTH `organizationId` (legacy,
  // used by GlobalAttackMapPage / SimulationControlPanel) AND `orgId`
  // (used by CaseManagementPage / ExecutiveRiskDashboardPage / DataConnectorsPage).
  // They always hold the same value — do NOT remove either.
  const enrichedUser = {
    ...user,
    orgId: user.organizationId || 'org_default',   // alias — same value as organizationId
    displayName: user.name || 'analyst',
  };

  return (
    <AuthContext.Provider value={{ user: enrichedUser, login, logout, hasRole, canManageBilling, editUserRole, getHeaders }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
