import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

const theme = {
  background: '#080808',
  card: '#101010',
  text: '#EDE8DF',
  muted: '#7A7570',
  gold: '#C49A3C',
  border: '#1E1E1E',
};

const style = {
  root: {
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
    padding: '24px',
    backgroundColor: theme.background,
    color: theme.text,
    fontFamily: 'Georgia, serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'start',
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.card,
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 1px 10px rgba(0,0,0,0.35)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: theme.text,
  },
  markReadButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
  },
  markReadButtonDisabled: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${theme.border}`,
    background: 'transparent',
    color: theme.muted,
    cursor: 'not-allowed',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
    opacity: 0.5,
  },
  // FIX 1: Split into two separate style objects — no more borderLeft being
  // overridden by the border shorthand.
  notificationItemBase: {
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: theme.background,
    borderRadius: '8px',
    cursor: 'pointer',
  },
  notificationItemUnread: {
    outline: `1px solid ${theme.border}`,
    borderLeft: `4px solid ${theme.gold}`,
  },
  notificationItemRead: {
    outline: `1px solid ${theme.border}`,
    borderLeft: `4px solid transparent`,
  },
  message: {
    fontSize: '1rem',
    color: theme.text,
    marginBottom: '4px',
  },
  type: {
    fontSize: '0.85rem',
    color: theme.muted,
    marginBottom: '4px',
  },
  timeAgo: {
    fontSize: '0.8rem',
    color: theme.muted,
  },
  emptyState: {
    fontStyle: 'italic',
    color: theme.muted,
    textAlign: 'center',
    padding: '40px 0',
  },
};

const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const NotificationsScreen = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  // FIX 3: Start loading as false — only set true when we actually start fetching
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
      return;
    }

    setNotifications(data || []);
    setLoading(false);
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return;
    }

    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, is_read: true }))
    );
  };

  // FIX 6: Mark a single notification as read on click
  const markOneAsRead = async (notifId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
  };

  // FIX 2: useEffect depends on user so it re-runs when user loads
  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // FIX 4: Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user?.id) {
    return (
      <div style={{ ...style.root, justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: theme.text }}>Please log in to view notifications.</p>
      </div>
    );
  }

  // FIX 5: Derive whether there are any unread notifications
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div style={style.root}>
      <div style={style.card}>
        <div style={style.header}>
          <h1 style={style.title}>Notifications</h1>
          {/* FIX 5: Disable "Mark All as Read" when nothing is unread */}
          <button
            style={hasUnread ? style.markReadButton : style.markReadButtonDisabled}
            onClick={hasUnread ? markAllAsRead : undefined}
            disabled={!hasUnread}
          >
            Mark All as Read
          </button>
        </div>

        {loading ? (
          <p style={{ color: theme.muted }}>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div style={style.emptyState}>No notifications yet</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              // FIX 1: Merge base + conditional style — no shorthand override
              style={{
                ...style.notificationItemBase,
                ...(notif.is_read
                  ? style.notificationItemRead
                  : style.notificationItemUnread),
              }}
              // FIX 6: Click to mark individual notification as read
              onClick={() => !notif.is_read && markOneAsRead(notif.id)}
            >
              <div style={style.message}>{notif.message}</div>
              <div style={style.type}>{notif.type}</div>
              <div style={style.timeAgo}>{timeAgo(notif.created_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;