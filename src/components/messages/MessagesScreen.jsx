import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
    height: '100vh',
    display: 'flex',
    backgroundColor: theme.background,
    color: theme.text,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: '320px',
    minWidth: '280px',
    borderRight: `1px solid ${theme.border}`,
    backgroundColor: theme.card,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  conversationItem: (active) => ({
    borderBottom: `1px solid ${theme.border}`,
    padding: '12px',
    cursor: 'pointer',
    backgroundColor: active ? '#181818' : 'transparent',
  }),
  conversationTitle: {
    fontWeight: 600,
    color: theme.text,
  },
  conversationSub: {
    color: theme.muted,
    fontSize: '0.85rem',
    marginTop: '4px',
  },
  contentPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  contentHeader: {
    borderBottom: `1px solid ${theme.border}`,
    padding: '12px 16px',
    backgroundColor: theme.card,
    color: theme.gold,
    fontWeight: 700,
  },
  messageFeed: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    backgroundColor: theme.background,
  },
  messageRow: (mine) => ({
    marginBottom: '12px',
    alignSelf: mine ? 'flex-end' : 'flex-start',
    maxWidth: '78%',
  }),
  messageBubble: (mine) => ({
    backgroundColor: mine ? '#2c2c2c' : '#181818',
    border: `1px solid ${theme.border}`,
    borderRadius: '14px',
    padding: '10px 14px',
    color: theme.text,
    fontFamily: 'Georgia, serif',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
  messageMeta: {
    fontSize: '0.7rem',
    color: theme.muted,
    marginTop: '4px',
  },
  mobileToggle: {
    display: 'none',
    height: '35px',
    background: theme.card,
    borderBottom: `1px solid ${theme.border}`,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    color: theme.text,
    fontWeight: 600,
  },
};

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const MessagesScreen = ({ user }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMode, setMobileMode] = useState(window.innerWidth < 820);
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 820;
      setMobileMode(mobile);
      if (!mobile) setShowMobileChat(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const partnerIdByMessage = useCallback((msg) => {
    if (!user) return null;
    if (msg.sender_id === user.id) return msg.receiver_id;
    return msg.sender_id;
  }, [user]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadConversations = useCallback(async () => {
    if (!user || !user.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase loadConversations error:', error);
      setLoading(false);
      return;
    }

    const byPartner = data.reduce((acc, msg) => {
      const partnerId = partnerIdByMessage(msg);
      if (!partnerId) return acc;

      if (!acc[partnerId] || new Date(msg.created_at) > new Date(acc[partnerId].created_at)) {
        acc[partnerId] = {
          partnerId,
          lastMessage: msg.content,
          created_at: msg.created_at,
        };
      }
      return acc;
    }, {});

    const conversationList = Object.values(byPartner)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setConversations(conversationList);

    if (!selectedId && conversationList.length > 0) {
      setSelectedId(conversationList[0].partnerId);
    }

    setLoading(false);
  }, [user, selectedId, partnerIdByMessage]);

  const loadMessages = useCallback(async (partnerId) => {
    if (!user || !user.id || !partnerId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase loadMessages error:', error);
      return;
    }

    const filtered = data.filter((msg) => {
      const participants = [msg.sender_id, msg.receiver_id];
      return participants.includes(user.id) && participants.includes(partnerId);
    });

    setMessages(filtered);
  }, [user]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadConversations();

    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadConversations();
        if (selectedId) loadMessages(selectedId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadConversations, loadMessages, selectedId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    }
  }, [selectedId, loadMessages]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.partnerId === selectedId),
    [conversations, selectedId]
  );

  if (!user || !user.id) {
    return (
      <div style={{ ...style.root, justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: theme.text }}>Please log in to see your conversations.</p>
      </div>
    );
  }

  return (
    <section style={style.root}>
      {(mobileMode && !showMobileChat) || !mobileMode ? (
        <aside style={style.sidebar}>
          <div style={{ ...style.mobileToggle, display: mobileMode ? 'flex' : 'none' }}>
            <span>Inbox</span>
            <span style={{ color: theme.muted }}>Tap conversation</span>
          </div>
          {loading ? (
            <div style={{ padding: '12px', color: theme.muted }}>Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '12px', color: theme.muted }}>No conversations yet.</div>
          ) : (
            conversations.map((conv) => {
              const active = conv.partnerId === selectedId;
              return (
                <div
                  key={conv.partnerId}
                  style={style.conversationItem(active)}
                  onClick={() => {
                    setSelectedId(conv.partnerId);
                    if (mobileMode) setShowMobileChat(true);
                  }}
                >
                  <div style={style.conversationTitle}>User {conv.partnerId}</div>
                  <div style={style.conversationSub}>
                    {conv.lastMessage || 'No messages yet'}
                  </div>
                  <div style={style.conversationSub}>{formatTime(conv.created_at)}</div>
                </div>
              );
            })
          )}
        </aside>
      ) : null}

      {(!mobileMode || showMobileChat) && (
        <article style={style.contentPane}>
          {mobileMode && (
            <div style={style.mobileToggle}>
              <button
                style={{ color: theme.gold, border: 0, background: 'transparent', cursor: 'pointer' }}
                onClick={() => setShowMobileChat(false)}
              >
                ← Back
              </button>
              <strong>Chat</strong>
              <span />
            </div>
          )}
          <div style={style.contentHeader}>
            {selectedConversation
              ? `Conversation with User ${selectedConversation.partnerId}`
              : 'Select a conversation'}
          </div>
          <div style={style.messageFeed}>
            {selectedId && messages.length === 0 ? (
              <div style={{ color: theme.muted }}>No messages in this thread yet.</div>
            ) : (
              messages.map((msg) => {
                const mine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} style={style.messageRow(mine)}>
                    <div style={style.messageBubble(mine)}>{msg.content}</div>
                    <div style={style.messageMeta}>
                      {mine ? 'You' : `User ${msg.sender_id}`} • {formatTime(msg.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      )}
    </section>
  );
};

export default MessagesScreen;
