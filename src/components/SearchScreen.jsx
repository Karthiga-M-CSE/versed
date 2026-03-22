import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

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
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
    background: '#0f0f0f',
    color: theme.text,
    fontFamily: 'Georgia, serif',
    fontSize: '1rem',
    marginBottom: '20px',
    boxSizing: 'border-box',
  },
  section: { marginBottom: '24px' },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: '12px',
  },
  personCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: theme.background,
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
  },
  personName: { fontSize: '1rem', color: theme.text },
  personUsername: { fontSize: '0.85rem', color: theme.muted },
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  followButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
  },
  followingButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: `1px solid ${theme.gold}`,
    background: theme.gold,
    color: '#080808',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
  },
  messageButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: `1px solid ${theme.border}`,
    background: 'transparent',
    color: theme.muted,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
  },
  postCard: {
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: theme.background,
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
  },
  postBody: { fontSize: '1rem', color: theme.text, marginBottom: '4px' },
  postHandle: { fontSize: '0.85rem', color: theme.muted },
  emptyState: { textAlign: 'center', padding: '40px 0' },
  trendingTag: {
    display: 'inline-block',
    padding: '8px 12px',
    margin: '4px',
    borderRadius: '6px',
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
  },
  errorText: { color: '#e05c5c', fontSize: '0.85rem', marginBottom: '12px' },
};

const TRENDING_TAGS = ['#Melancholy', '#Longing', '#3am', '#Rage', '#Wonder', '#Poetry'];

const SearchScreen = ({ user, onOpenChat }) => {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [posts, setPosts] = useState([]);
  const [followingMap, setFollowingMap] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pendingFollows = useRef(new Set());

  const fetchFollowing = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    if (error) { console.error('Error fetching follows:', error); return; }
    const map = new Map();
    (data || []).forEach(row => map.set(row.following_id, true));
    setFollowingMap(map);
  };

  const search = async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setPeople([]); setPosts([]); return; }

    const cleanQuery = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    setLoading(true);
    setError(null);

    let peopleQuery = supabase
      .from('profiles')
      .select('id, name, username')
      .or(`name.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%`)
      .limit(20);

    if (user?.id) peopleQuery = peopleQuery.neq('id', user.id);

    const [peopleRes, postsRes] = await Promise.all([
      peopleQuery,
      supabase
        .from('posts')
        .select('id, body, user_handle, user_name')
        .eq('mode', 'public')
        .ilike('body', `%${cleanQuery}%`)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (peopleRes.error) {
      setError(`People search failed: ${peopleRes.error.message}`);
    } else {
      setPeople(peopleRes.data || []);
    }

    if (postsRes.error) {
      setError(`Posts search failed: ${postsRes.error.message}`);
    } else {
      setPosts(postsRes.data || []);
    }

    setLoading(false);
  };

  const handleFollow = async (profileId) => {
    if (!user?.id || pendingFollows.current.has(profileId)) return;
    pendingFollows.current.add(profileId);
    const isFollowing = followingMap.get(profileId);

    setFollowingMap(prev => {
      const newMap = new Map(prev);
      if (isFollowing) newMap.delete(profileId);
      else newMap.set(profileId, true);
      return newMap;
    });

    let opError = null;
    if (isFollowing) {
      const { error } = await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', profileId);
      opError = error;
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId });
      opError = error;
    }

    if (opError) {
      setError('Could not update follow status. Please try again.');
      setFollowingMap(prev => {
        const newMap = new Map(prev);
        if (isFollowing) newMap.set(profileId, true);
        else newMap.delete(profileId);
        return newMap;
      });
    }

    pendingFollows.current.delete(profileId);
  };

  useEffect(() => { fetchFollowing(); }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => { search(query); }, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!user?.id) {
    return (
      <div style={{ ...style.root, justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: theme.text }}>Please log in to search.</p>
      </div>
    );
  }

  return (
    <div style={style.root}>
      <div style={style.card}>
        <input
          type="text"
          placeholder="Search for people or posts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={style.searchInput}
          autoFocus
        />

        {error && <p style={style.errorText}>{error}</p>}
        {loading && <p style={{ color: theme.muted }}>Searching...</p>}

        {!query.trim() && !loading && (
          <div style={style.emptyState}>
            <p style={{ color: theme.muted, marginBottom: '16px' }}>Trending tags</p>
            {TRENDING_TAGS.map(tag => (
              <span key={tag} style={style.trendingTag} onClick={() => setQuery(tag)}>{tag}</span>
            ))}
          </div>
        )}

        {query.trim() && !loading && (
          <>
            <div style={style.section}>
              <h2 style={style.sectionTitle}>People</h2>
              {people.length === 0 ? (
                <p style={{ color: theme.muted }}>No people found.</p>
              ) : (
                people.map(person => (
                  <div key={person.id} style={style.personCard}>
                    <div>
                      <div style={style.personName}>{person.name || 'Unnamed'}</div>
                      <div style={style.personUsername}>@{person.username || 'unknown'}</div>
                    </div>
                    <div style={style.actions}>
                      {/* 💬 Message button — opens chat with this person */}
                      <button
                        style={style.messageButton}
                        onClick={() => onOpenChat && onOpenChat(person.id)}
                      >
                        💬
                      </button>
                      <button
                        style={followingMap.get(person.id) ? style.followingButton : style.followButton}
                        onClick={() => handleFollow(person.id)}
                        disabled={pendingFollows.current.has(person.id)}
                      >
                        {followingMap.get(person.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={style.section}>
              <h2 style={style.sectionTitle}>Posts</h2>
              {posts.length === 0 ? (
                <p style={{ color: theme.muted }}>No posts found.</p>
              ) : (
                posts.map(post => (
                  <div key={post.id} style={style.postCard}>
                    <div style={style.postBody}>{post.body}</div>
                    <div style={style.postHandle}>
                      {post.user_handle ? `@${post.user_handle}` : post.user_name || 'unknown'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;