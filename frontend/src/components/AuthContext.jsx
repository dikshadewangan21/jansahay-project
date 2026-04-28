import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * AuthContext — stores JWT token and user profile.
 * Token is persisted in localStorage so it survives page refresh.
 * Provides login(), logout(), and the current user object.
 */
const AuthContext = createContext(null);

const TOKEN_KEY = 'js_token';
const USER_KEY  = 'js_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });

  // Login: store token + user from API response
  const login = useCallback(({ token: t, user: u }) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  // Logout: wipe everything
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Check if a report ID is in the user's voted list
  const hasVotedOn = useCallback((reportId) => {
    if (!user?.votedReports) return false;
    return user.votedReports.includes(reportId);
  }, [user]);

  // Update voted reports list after a vote action
  const updateVote = useCallback((reportId, voted) => {
    setUser((prev) => {
      if (!prev) return prev;
      const voted_ = prev.votedReports || [];
      const updated = voted
        ? [...new Set([...voted_, reportId])]
        : voted_.filter((id) => id !== reportId);
      const newUser = { ...prev, votedReports: updated };
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      token, user, isLoggedIn: !!token,
      isAdmin:     user?.role === 'admin',
      isVolunteer: user?.role === 'volunteer' || user?.role === 'admin',
      login, logout, hasVotedOn, updateVote,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
