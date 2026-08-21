import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../services/api';
import { ACCESS_PROFILES, permissionsForUser } from './permissions';

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = () => getMe().then(({ data }) => active && setUser(data)).catch(() => {}).finally(() => active && setLoading(false));
    refresh();
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const value = useMemo(() => {
    const permissions = permissionsForUser(user || {});
    const role = String(user?.role || localStorage.getItem('role') || 'agent').toLowerCase();
    const profile = user?.accessProfile || user?.profile || role;
    return {
      user,
      loading,
      profile,
      permissions,
      can: (permission) => role === 'superadmin' || permissions.has(permission),
      homePage: user?.homePage || ACCESS_PROFILES[profile]?.homePage || '/inbox',
    };
  }, [user, loading]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('usePermissions deve ser usado dentro de PermissionProvider');
  return context;
}
