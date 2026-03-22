import React, { useState } from 'react';

const c = {
  bg: '#080808', bg2: '#101010', bg3: '#161616',
  cream: '#EDE8DF', muted: '#7A7570', gold: '#C49A3C',
  goldDim: '#7A5E22', border: '#1E1E1E', purple: '#7A7ACA',
};

const MODE = {
  public:  { label: '🌍 Public',  color: c.gold,   border: c.goldDim, bg: 'rgba(196,154,60,0.08)' },
  private: { label: '👥 Private', color: c.purple, border: '#5A5AAA', bg: 'rgba(90,90,170,0.08)'  },
};

export default function ComposeModal({ onClose, onPost }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('public');
  const [loading, setLoading] = useState(false);

  async function handlePost() {
    if (!text.trim()) return;
    setLoading(true);
    await onPost({ text, mode });
    setLoading(false);
    onClose();
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>

      <div style={{ background: c.bg2, border: `1px solid ${c.border}`, width: '100%', maxWidth: '600px', padding: '24px', borderRadius: '8px 8px 0 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: c.cream }}>New Post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        {/* Textarea */}
        <textarea
          style={{ width: '100%', background: c.bg3, border: `1px solid ${c.border}`, padding: '14px', color: c.cream, fontFamily: 'Georgia,serif', fontSize: 15, lineHeight: 1.8, resize: 'none', outline: 'none', minHeight: '150px', boxSizing: 'border-box', marginBottom: '16px' }}
          placeholder="What words are living in you right now…"
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['public', 'private'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ padding: '7px 14px', border: mode === m ? `1px solid ${MODE[m].border}` : `1px solid ${c.border}`, background: mode === m ? MODE[m].bg : 'transparent', color: mode === m ? MODE[m].color : c.muted, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                {MODE[m].label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: 11, color: c.muted }}>{text.length}</span>
            <button onClick={handlePost} disabled={loading || !text.trim()}
              style={{ padding: '9px 24px', background: text.trim() ? c.cream : c.bg3, color: text.trim() ? c.bg : c.muted, border: 'none', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'sans-serif', transition: 'all 0.2s' }}>
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
