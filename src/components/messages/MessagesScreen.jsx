import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';

const theme = {
  background: '#080808',
  card: '#101010',
  text: '#EDE8DF',
  muted: '#7A7570',
  gold: '#C49A3C',
  border: '#1E1E1E',
};

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
};

const MessagesScreen = ({ user, initialPartnerId = null }) => {
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});         // id -> { name, username }
  const [selectedId, setSelectedId] = useState(initialPartnerId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileMode, setMobileMode] = useState(window.innerWidth < 820);
  const [showMobileChat, setShowMobileChat] = useState(!!initialPartnerId);
  const bottomRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 820;
      setMobileMode(mobile);
      if (!mobile) setShowMobileChat(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── FETCH PROFILE NAMES ──
  const fetchProfiles = useCallback(async (ids) => {
    if (!ids.length) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username')
      .in('id', ids);

    if (error) { console.error('fetch profiles error', error); return; }

    const map = {};
    (data || []).forEach(p => { map[p.id] = p; });
    setProfiles(prev => ({ ...prev, ...map }));
  }, []);

  // ── LOAD CONVERSATIONS ──
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('loadConversations error:', error);
      setLoading(false);
      return;
    }

    const byPartner = {};
    (data || []).forEach(msg => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!partnerId) return;
      if (!byPartner[partnerId] || new Date(msg.created_at) > new Date(byPartner[partnerId].created_at)) {
        byPartner[partnerId] = { partnerId, lastMessage: msg.content, created_at: msg.created_at };
      }
    });

    const list = Object.values(byPartner).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setConversations(list);

    // Fetch real names for all partners
    const partnerIds = list.map(c => c.partnerId);
    if (initialPartnerId && !partnerIds.includes(initialPartnerId)) {
      partnerIds.push(initialPartnerId);
    }
    fetchProfiles(partnerIds);

    if (!selectedId && list.length > 0) setSelectedId(list[0].partnerId);
    setLoading(false);
  }, [user?.id, selectedId, fetchProfiles, initialPartnerId]);

  // ── LOAD MESSAGES ──
  const loadMessages = useCallback(async (partnerId) => {
    if (!user?.id || !partnerId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) { console.error('loadMessages error:', error); return; }
    setMessages(data || []);
  }, [user?.id]);

  // ── SEND MESSAGE ──
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedId || !user?.id || sending) return;
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedId,
      content: newMessage.trim(),
      is_read: false,
    });

    if (error) {
      console.error('send message error:', error);
    } else {
      setNewMessage('');
      loadMessages(selectedId);
      loadConversations();
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    loadConversations();

    const subscription = supabase
      .channel(`messages-${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadConversations();
        if (selectedId) loadMessages(selectedId);
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user?.id]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // If initialPartnerId is passed (start chat from profile), select it
  useEffect(() => {
    if (initialPartnerId) {
      setSelectedId(initialPartnerId);
      setShowMobileChat(true);
      fetchProfiles([initialPartnerId]);
    }
  }, [initialPartnerId, fetchProfiles]);

  const getDisplayName = (id) => {
    const p = profiles[id];
    if (p?.name) return p.name;
    if (p?.username) return `@${p.username}`;
    return 'User';
  };

  const selectedConversation = useMemo(
    () => conversations.find(c => c.partnerId === selectedId),
    [conversations, selectedId]
  );

  if (!user?.id) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: theme.background }}>
        <p style={{ color: theme.text }}>Please log in to see your conversations.</p>
      </div>
    );
  }

  return (
    <section style={{ height: '100vh', display: 'flex', backgroundColor: theme.background, color: theme.text, fontFamily: 'Georgia, serif', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      {((mobileMode && !showMobileChat) || !mobileMode) && (
        <aside style={{ width: '300px', minWidth: '260px', borderRight: `1px solid ${theme.border}`, backgroundColor: theme.card, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${theme.border}` }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.gold, fontFamily: 'sans-serif' }}>Messages</p>
          </div>

          {loading ? (
            <div style={{ padding: '16px', color: theme.muted }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '16px', color: theme.muted, fontStyle: 'italic', fontSize: 14 }}>No conversations yet. Find someone in Search and message them!</div>
          ) : (
            conversations.map(conv => {
              const active = conv.partnerId === selectedId;
              return (
                <div key={conv.partnerId}
                  onClick={() => { setSelectedId(conv.partnerId); if (mobileMode) setShowMobileChat(true); }}
                  style={{ borderBottom: `1px solid ${theme.border}`, padding: '14px 16px', cursor: 'pointer', backgroundColor: active ? '#181818' : 'transparent', borderLeft: active ? `3px solid ${theme.gold}` : '3px solid transparent' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: theme.text, marginBottom: 4 }}>
                    {getDisplayName(conv.partnerId)}
                  </div>
                  <div style={{ color: theme.muted, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.lastMessage || 'No messages yet'}
                  </div>
                  <div style={{ color: theme.muted, fontSize: 10, marginTop: 4, fontFamily: 'sans-serif' }}>
                    {formatTime(conv.created_at)}
                  </div>
                </div>
              );
            })
          )}
        </aside>
      )}

      {/* CHAT PANE */}
      {(!mobileMode || showMobileChat) && (
        <article style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Chat Header */}
          <div style={{ borderBottom: `1px solid ${theme.border}`, padding: '14px 20px', backgroundColor: theme.card, display: 'flex', alignItems: 'center', gap: 12 }}>
            {mobileMode && (
              <button onClick={() => setShowMobileChat(false)}
                style={{ color: theme.gold, border: 0, background: 'transparent', cursor: 'pointer', fontSize: 16 }}>
                ←
              </button>
            )}
            <div>
              <p style={{ color: theme.gold, fontSize: 14, fontFamily: 'Georgia, serif' }}>
                {selectedId ? getDisplayName(selectedId) : 'Select a conversation'}
              </p>
              {selectedId && profiles[selectedId]?.username && (
                <p style={{ color: theme.muted, fontSize: 11, fontFamily: 'sans-serif' }}>
                  @{profiles[selectedId].username}
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: theme.background, display: 'flex', flexDirection: 'column' }}>
            {!selectedId ? (
              <div style={{ color: theme.muted, fontStyle: 'italic', textAlign: 'center', marginTop: 60 }}>Select a conversation to start reading 🖤</div>
            ) : messages.length === 0 ? (
              <div style={{ color: theme.muted, fontStyle: 'italic', textAlign: 'center', marginTop: 60 }}>No messages yet. Say something. 🖤</div>
            ) : (
              messages.map(msg => {
                const mine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} style={{ marginBottom: '12px', alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <div style={{ backgroundColor: mine ? '#1e1e1e' : '#181818', border: `1px solid ${mine ? theme.gold + '33' : theme.border}`, borderRadius: '14px', padding: '10px 14px', color: theme.text, fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.7 }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 10, color: theme.muted, marginTop: 4, textAlign: mine ? 'right' : 'left', fontFamily: 'sans-serif' }}>
                      {mine ? 'You' : getDisplayName(msg.sender_id)} · {formatTime(msg.created_at)}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {selectedId && (
            <div style={{ borderTop: `1px solid ${theme.border}`, padding: '14px 16px', backgroundColor: theme.card, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write something beautiful..."
                rows={1}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: '#0f0f0f', color: theme.text, fontFamily: 'Georgia, serif', fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.6 }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${theme.gold}`, background: 'transparent', color: theme.gold, cursor: newMessage.trim() ? 'pointer' : 'default', fontFamily: 'Georgia, serif', fontSize: 13, opacity: newMessage.trim() ? 1 : 0.4 }}>
                {sending ? '...' : 'Send'}
              </button>
            </div>
          )}
        </article>
      )}
    </section>
  );
};

export default MessagesScreen;