import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import PostCard from './PostCard';
import ComposeModal from './ComposeModal';
import useWindowSize from '../../useWindowSize';
import DiaryScreen from '../diary/DiaryScreen';
import MessagesScreen from '../messages/MessagesScreen';
import NotificationsScreen from '../notifications/NotificationsScreen';
import SearchScreen from '../SearchScreen';
import ProfileScreen from '../profile/ProfileScreen';

const c = {
  bg: '#080808', bg2: '#101010', bg3: '#161616',
  cream: '#EDE8DF', muted: '#7A7570', gold: '#C49A3C',
  border: '#1E1E1E',
};

export default function HomeScreen({ user, onSignOut }) {
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showCompose, setShowCompose] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isMobile, isTablet, isDesktop } = useWindowSize();

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'You';
  const userHandle = user?.user_metadata?.username || userName.toLowerCase().replace(/\s/g, '');
  const userInitial = userName[0].toUpperCase();

  // ── FETCH UNREAD NOTIFICATIONS COUNT ──
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (!error) setUnreadCount(count || 0);
  }, [user]);

  // ── REAL-TIME BADGE UPDATE ──
  useEffect(() => {
    fetchUnreadCount();
    if (!user?.id) return;

    const channel = supabase
      .channel(`notif-badge-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        // Re-fetch count when notifications are marked read
        fetchUnreadCount();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, fetchUnreadCount]);

  // ── FETCH POSTS ──
  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (followsError) {
      console.error('Error fetching follows:', followsError);
      query = query.eq('mode', 'public');
    } else {
      const followingIds = follows.map(f => f.following_id);
      if (followingIds.length > 0) {
        query = query.or(`mode.eq.public,user_id.in.(${followingIds.join(',')})`);
      } else {
        query = query.eq('mode', 'public');
      }
    }

    const { data, error } = await query;
    if (!error) setPosts(data || []);
    setLoadingPosts(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleNewPost({ text, mode }) {
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      body: text,
      mode: mode,
      user_name: userName,
      user_handle: userHandle,
      created_at: new Date().toISOString(),
    });
    if (!error) fetchPosts();
  }

  // When switching to notifications, refresh the badge count
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'notifications') fetchUnreadCount();
  };

  const navItems = [
    { key: 'home',     icon: '🏠', label: 'Home'    },
    { key: 'messages', icon: '💬', label: 'Messages' },
    { key: 'compose',  icon: '✚',  label: 'Post', special: true },
    { key: 'diary',    icon: '📖', label: 'Diary'    },
    { key: 'profile',  icon: '👤', label: 'Profile'  },
  ];

  // ── RESPONSIVE VALUES ──
  const feedWidth = isMobile ? '100%' : isTablet ? '600px' : '680px';
  const sidebarWidth = isDesktop ? '280px' : '0px';
  const headerPad = isMobile ? '12px 16px' : '16px 24px';
  const contentPad = isMobile ? '0' : '0 16px';
  const logoSize = isMobile ? '18px' : '22px';
  const taglineSize = isMobile ? '7px' : '8px';

  // ── RENDER SECTIONS ──
  const renderFeed = () => (
    <div style={{ paddingBottom: isMobile ? '90px' : '40px' }}>
      {loadingPosts ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: c.muted, fontStyle: 'italic', fontFamily: 'Georgia,serif', fontSize: 16 }}>
          Loading...
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: isMobile ? 18 : 22, color: c.muted, marginBottom: 12 }}>
            The page is empty.
          </p>
          <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 13, color: c.muted, opacity: 0.6 }}>
            Be the first to leave a word. 🖤
          </p>
        </div>
      ) : (
        posts.map(p => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'home':          return renderFeed();
      case 'messages':      return <MessagesScreen user={user} />;
      case 'diary':         return <DiaryScreen user={user} />;
      case 'search':        return <SearchScreen user={user} />;
      case 'notifications': return <NotificationsScreen user={user} />;
      case 'profile':       return <ProfileScreen user={user} onSignOut={onSignOut} />;
      default:              return renderFeed();
    }
  };

  return (
    <div style={{ background: c.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>

      {/* DESKTOP LEFT SIDEBAR */}
      {isDesktop && (
        <div style={{ width: sidebarWidth, flexShrink: 0, borderRight: `1px solid ${c.border}`, padding: '32px 20px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: 22, letterSpacing: '0.3em', color: c.cream, textTransform: 'uppercase', fontFamily: 'Georgia,serif' }}>VER·SED</div>
            <div style={{ fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', color: c.gold, fontFamily: 'sans-serif', marginTop: 4 }}>THE ART OF WORDS</div>
          </div>
          {navItems.map(item => (
            <button key={item.key}
              onClick={() => item.special ? setShowCompose(true) : handleTabChange(item.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: item.special ? c.cream : activeTab === item.key ? c.bg2 : 'transparent', border: activeTab === item.key && !item.special ? `1px solid ${c.border}` : 'none', color: item.special ? c.bg : activeTab === item.key ? c.gold : c.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia,serif', marginBottom: 4, borderRadius: 2, textAlign: 'left', width: '100%', transition: 'all 0.2s' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.bg3, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.gold, fontFamily: 'Georgia,serif', fontSize: 15 }}>
                {userInitial}
              </div>
              <div>
                <p style={{ fontSize: 13, color: c.cream, fontFamily: 'Georgia,serif' }}>{userName}</p>
                <p style={{ fontSize: 11, color: c.muted }}>@{userHandle}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN FEED */}
      <div style={{ width: feedWidth, maxWidth: feedWidth, flex: isMobile ? 1 : 'none', borderRight: isDesktop ? `1px solid ${c.border}` : 'none', minHeight: '100vh' }}>

        {/* HEADER */}
        <div style={{ position: 'sticky', top: 0, background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${c.border}`, zIndex: 50, padding: headerPad }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {!isDesktop && (
              <div>
                <div style={{ fontSize: logoSize, letterSpacing: '0.3em', color: c.cream, textTransform: 'uppercase', fontFamily: 'Georgia,serif' }}>VER·SED</div>
                <div style={{ fontSize: taglineSize, letterSpacing: '0.25em', textTransform: 'uppercase', color: c.gold, fontFamily: 'sans-serif' }}>THE ART OF WORDS</div>
              </div>
            )}
            {isDesktop && (
              <p style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: c.cream, textTransform: 'capitalize' }}>
                {activeTab}
              </p>
            )}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {/* 🔍 Search button */}
              <button
                onClick={() => handleTabChange('search')}
                style={{ background: 'none', border: 'none', color: activeTab === 'search' ? c.gold : c.muted, fontSize: isMobile ? 16 : 18, cursor: 'pointer' }}
              >
                🔍
              </button>

              {/* 🔔 Notifications button with live badge */}
              <button
                onClick={() => handleTabChange('notifications')}
                style={{ background: 'none', border: 'none', color: activeTab === 'notifications' ? c.gold : c.muted, fontSize: isMobile ? 16 : 18, cursor: 'pointer', position: 'relative' }}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: '999px',
                    background: c.gold,
                    color: '#080808',
                    fontSize: 9,
                    fontFamily: 'sans-serif',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: contentPad }}>
          {renderContent()}
        </div>

        {/* BOTTOM NAV — mobile and tablet only */}
        {!isDesktop && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 0', zIndex: 50 }}>
            {navItems.map(item => (
              <button key={item.key}
                onClick={() => item.special ? setShowCompose(true) : handleTabChange(item.key)}
                style={{ background: item.special ? c.cream : 'transparent', border: 'none', width: item.special ? 44 : 'auto', height: item.special ? 44 : 'auto', borderRadius: item.special ? '50%' : 0, color: item.special ? c.bg : activeTab === item.key ? c.gold : c.muted, fontSize: item.special ? 20 : isMobile ? 20 : 22, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, transition: 'all 0.2s' }}>
                {item.icon}
                {!isMobile && <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{item.label}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP RIGHT SIDEBAR */}
      {isDesktop && (
        <div style={{ width: '260px', flexShrink: 0, padding: '32px 20px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ background: c.bg2, border: `1px solid ${c.border}`, borderLeft: `2px solid ${c.gold}`, padding: '16px', marginBottom: '24px' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: c.gold, marginBottom: 10, fontFamily: 'sans-serif' }}>✦ Daily Quote</p>
            <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.75, color: c.cream, marginBottom: 8 }}>"The wound is the place where the Light enters you."</p>
            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.muted, fontFamily: 'sans-serif' }}>— Rumi</p>
          </div>
          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: c.gold, marginBottom: 14, fontFamily: 'sans-serif' }}>✦ Trending</p>
            {['#Melancholy', '#Longing', '#3am', '#Rage', '#Wonder'].map(tag => (
              <div key={tag}
                onClick={() => handleTabChange('search')}
                style={{ padding: '10px 0', borderBottom: `1px solid ${c.border}`, fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 15, color: c.cream, cursor: 'pointer' }}>
                {tag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPOSE MODAL */}
      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} onPost={handleNewPost} />
      )}
    </div>
  );
}