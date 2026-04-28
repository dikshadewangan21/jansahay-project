/**
 * useNotifications hook
 *
 * Manages in-app notification state for the logged-in user.
 * - Polls the unread count every 30 seconds when the user is logged in
 * - Provides fetch, markRead, markAllRead, and delete helpers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '../services/api';
import { useAuth } from '../components/AuthContext';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function useNotifications() {
  const { isLoggedIn } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [open,          setOpen]          = useState(false);

  const pollerRef = useRef(null);

  // ── Fetch unread count only (lightweight, used for badge) ──────────────────
  const refreshCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await notificationsApi.unreadCount();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silently fail — badge just won't update
    }
  }, [isLoggedIn]);

  // ── Fetch full notification list (called when dropdown opens) ─────────────
  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const data = await notificationsApi.list({ limit: 20 });
      setNotifications(data.data || []);
      setUnreadCount(data.meta?.unreadCount ?? 0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // ── Mark single as read ───────────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Silently fail
    }
  }, []);

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  // ── Delete notification ───────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== id);
      });
    } catch {
      // Silently fail
    }
  }, []);

  // ── Toggle dropdown open/closed ───────────────────────────────────────────
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) fetchNotifications(); // fetch fresh list on open
      return !prev;
    });
  }, [fetchNotifications]);

  // ── Poll unread count while logged in ─────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    refreshCount(); // immediate first fetch

    pollerRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(pollerRef.current);
  }, [isLoggedIn, refreshCount]);

  return {
    notifications,
    unreadCount,
    loading,
    open,
    toggleOpen,
    setOpen,
    markRead,
    markAllRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
