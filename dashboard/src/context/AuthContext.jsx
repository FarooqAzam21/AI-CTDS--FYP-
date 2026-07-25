import React, { createContext, useContext, useState, useEffect } from 'react';
import API_BASE from '../config/api';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext(null);

const roleAliases = {
  super_admin: 'owner',
  workspace_admin: 'admin',
  security_analyst: 'analyst',
};

const normalizeRole = (role) => roleAliases[role] || role || 'viewer';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  // Keep the UI blocked until Supabase has inspected an OAuth callback or a
  // previously persisted session.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) console.error('Unable to restore Supabase session:', error);

      if (data.session) {
        // Replace stale backend tokens after an OAuth redirect.
        setToken(data.session.access_token);
      } else if (!localStorage.getItem('token')) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setToken(session.access_token);
        if (event === 'SIGNED_IN') {
          fetch(`${API_BASE}/me/record-login`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` }
          }).catch((error) => console.warn('Google login tracking failed:', error));
        }
      }
    });

    restoreSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile(token);
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE}/rbac/my-permissions`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          const body = await response.json().catch(() => ({}));
          if (body.detail === 'Workspace access is pending owner approval.') {
            setUser({ user_id: '', email: '', role: 'pending', permissions: [] });
            return;
          }
        }
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Auth error:', error);
      // Never grant a local role when the backend cannot validate the session.
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken) => {
    setLoading(true);
    setToken(newToken);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    const role = normalizeRole(user.role);
    if (role === 'owner') return true;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.map(normalizeRole).includes(role);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (normalizeRole(user.role) === 'owner') return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      login,
      logout,
      hasRole,
      hasPermission,
      isAuthenticated: !!token && !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
