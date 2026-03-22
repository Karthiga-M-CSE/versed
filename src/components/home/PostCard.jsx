import React, { useState } from 'react';

const c = {
  bg2: '#101010', bg3: '#161616', cream: '#EDE8DF',
  muted: '#7A7570', gold: '#C49A3C', goldDim: '#7A5E22',
  border: '#1E1E1E', purple: '#7A7ACA',
};

const MODE = {
  public:  { label: '🌍 Public',  color: c.gold,   border: c.goldDim, bg: 'rgba(196,154,60,0.08)' },
  private: { label: '👥 Private', color: c.purple, border: '#5A5AAA', bg: 'rgba(90,90,170,0.08)'  },
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostCard({ post }) {
  const [reactions, setReactions] = useState({ '🖤': 0, '🔥': 0, '😢': 0, '✨': 0 });
  const [reacted, setReacted] = useState({});
  const [bookmarked, setBookmarked] = useState(false);
  const poem = post.body.includes('\n');

  function toggleReact(emoji) {
    setReacted(prev => ({ ...prev, [emoji]: !prev[emoji] }));
    setReactions(prev => ({ ...prev, [emoji]: prev[emoji] + (reacted[emoji] ? -1 : 1) }));
  }

  return (
    <div style={{ background: c.bg2, border: `1px solid ${c.border}`, padding: '20px', marginBottom: '2px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.bg3, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', fontSize: 15, color: c.gold, flexShrink: 0 }}>
            {(post.user_name || '?')[0].toUpperCase()}
          </div>
          <div>
            <span style={{ fontSize: 13, color: c.cream }}>{post.user_name}</span>
            <span style={{ fontSize: 11, color: c.muted, marginLeft: 6 }}>@{post.user_handle}</span>
            <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 8px', border: `1px solid ${MODE[post.mode]?.border}`, color: MODE[post.mode]?.color, background: MODE[post.mode]?.bg, flexShrink: 0, fontFamily: 'sans-serif' }}>
          {MODE[post.mode]?.label}
        </span>
      </div>

      {/* Body */}
      <p style={{ fontFamily: 'Georgia,serif', fontSize: poem ? 16 : 15, lineHeight: poem ? 2.2 : 1.85, color: c.cream, marginBottom: '16px', whiteSpace: 'pre-wrap', fontStyle: poem ? 'italic' : 'normal', borderLeft: poem ? `2px solid ${c.goldDim}` : 'none', paddingLeft: poem ? '16px' : '0' }}>
        {post.body}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingTop: '12px', borderTop: `1px solid ${c.border}`, flexWrap: 'wrap' }}>
        {Object.entries(reactions).map(([emoji, count]) => (
          <button key={emoji} onClick={() => toggleReact(emoji)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', border: reacted[emoji] ? `1px solid ${c.goldDim}` : '1px solid transparent', color: reacted[emoji] ? c.gold : c.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {emoji} {count}
          </button>
        ))}
        <span style={{ flexGrow: 1 }}></span>
        <button
          onClick={() => setBookmarked(b => !b)}
          style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: bookmarked ? c.gold : c.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {bookmarked ? '🔖' : '⊹'} Save
        </button>
      </div>

    </div>
  );
}
