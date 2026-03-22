import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';

const c = {
  bg: '#080808', bg2: '#101010', bg3: '#161616',
  cream: '#EDE8DF', muted: '#7A7570', gold: '#C49A3C',
  goldDim: '#7A5E22', border: '#1E1E1E', green: '#4A8C4A',
  red: '#B03A3A',
};

const PASTEL_COLORS = [
  { name: 'Yellow',   color: 'rgba(255, 245, 150, 0.5)' },
  { name: 'Pink',     color: 'rgba(255, 182, 193, 0.5)' },
  { name: 'Mint',     color: 'rgba(152, 251, 152, 0.45)' },
  { name: 'Lavender', color: 'rgba(200, 182, 255, 0.5)' },
  { name: 'Peach',    color: 'rgba(255, 218, 185, 0.5)' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function Calendar({ selectedDate, onSelectDate, entriesMap }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = formatDate(new Date());

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: c.bg2, border: `1px solid ${c.border}`, padding: '20px', marginBottom: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={() => setViewDate(new Date(year, month-1, 1))} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: c.cream }}>{MONTHS[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month+1, 1))} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: c.muted, fontFamily: 'sans-serif', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasEntry = entriesMap[dateStr];
          return (
            <button key={dateStr} onClick={() => onSelectDate(dateStr)}
              style={{ padding: '8px 4px', background: isSelected ? c.gold : isToday ? c.bg3 : 'transparent', border: isToday && !isSelected ? `1px solid ${c.goldDim}` : '1px solid transparent', color: isSelected ? c.bg : isToday ? c.gold : c.cream, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif', borderRadius: 2, position: 'relative', transition: 'all 0.2s' }}>
              {day}
              {hasEntry && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: isSelected ? c.bg : c.gold, display: 'block' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DiaryScreen({ user }) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [entriesMap, setEntriesMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const editorRef = useRef();
  const saveTimer = useRef();
  const savedRange = useRef();

  useEffect(() => {
  fetchAllEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  useEffect(() => {
    loadEntry(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function fetchAllEntries() {
    const { data } = await supabase
      .from('diary')
      .select('entry_date')
      .eq('user_id', user.id);
    if (data) {
      const map = {};
      data.forEach(e => { map[e.entry_date] = true; });
      setEntriesMap(map);
    }
  }

  async function loadEntry(date) {
    // Clear editor first
    if (editorRef.current) editorRef.current.innerHTML = '';
    setSaved(false);

    const { data } = await supabase
      .from('diary')
      .select('content')
      .eq('user_id', user.id)
      .eq('entry_date', date)
      .single();

    const entryContent = data?.content || '';
    if (editorRef.current) editorRef.current.innerHTML = entryContent;
  }

  function handleInput() {
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      autoSave(editorRef.current.innerHTML);
    }, 1500);
  }

  async function autoSave(html) {
    setSaving(true);
    const { data: existing } = await supabase
      .from('diary')
      .select('id')
      .eq('user_id', user.id)
      .eq('entry_date', selectedDate)
      .single();

    if (existing) {
      await supabase.from('diary').update({ content: html, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('diary').insert({ user_id: user.id, entry_date: selectedDate, content: html });
      setEntriesMap(prev => ({ ...prev, [selectedDate]: true }));
    }
    setSaving(false);
    setSaved(true);
  }

  async function handleDelete() {
    if (!window.confirm('Delete this entry forever?')) return;
    setDeleting(true);
    await supabase.from('diary').delete().eq('user_id', user.id).eq('entry_date', selectedDate);
    if (editorRef.current) editorRef.current.innerHTML = '';
    setEntriesMap(prev => { const n = { ...prev }; delete n[selectedDate]; return n; });
    setDeleting(false);
    setSaved(false);
  }

  function execCmd(cmd, value = null) {
    editorRef.current.focus();
    document.execCommand(cmd, false, value);
  }

  function handleHighlight(color) {
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('hiliteColor', false, color);
    }
    setShowHighlights(false);
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function addComment() {
    if (!commentText.trim() || !savedRange.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
    const span = document.createElement('span');
    span.style.borderBottom = `2px solid ${c.gold}`;
    span.style.cursor = 'pointer';
    span.title = commentText;
    span.setAttribute('data-comment', commentText);
    try { savedRange.current.surroundContents(span); } catch(e) {}
    setCommentText('');
    setShowComment(false);
    savedRange.current = null;
    handleInput();
  }

  const displayDate = new Date(selectedDate + 'T00:00:00');
  const dateLabel = displayDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ paddingBottom: '100px' }}>

      <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} entriesMap={entriesMap} />

      {/* Entry header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: c.bg2 }}>
        <div>
          <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 15, color: c.cream }}>{dateLabel}</p>
          <p style={{ fontSize: 10, color: saving ? c.gold : saved ? c.green : c.muted, fontFamily: 'sans-serif', marginTop: 4, letterSpacing: '0.1em' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Start writing to auto-save'}
          </p>
        </div>
        {entriesMap[selectedDate] && (
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${c.border}`, color: c.red, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '10px 12px', borderBottom: `1px solid ${c.border}`, background: c.bg2, flexWrap: 'wrap' }}>
        <button onClick={() => execCmd('bold')} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid transparent', color: c.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif' }}><strong>B</strong></button>
        <button onClick={() => execCmd('italic')} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid transparent', color: c.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif' }}><em>I</em></button>
        <button onClick={() => execCmd('underline')} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid transparent', color: c.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif' }}><u>U</u></button>

        <div style={{ width: 1, height: 20, background: c.border, margin: '0 6px' }} />

        {/* Highlight */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowHighlights(!showHighlights)}
            style={{ padding: '6px 10px', background: 'transparent', border: '1px solid transparent', color: c.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            🖌 Highlight
          </button>
          {showHighlights && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: c.bg3, border: `1px solid ${c.border}`, padding: '10px', display: 'flex', gap: 8, zIndex: 100, borderRadius: 2 }}>
              {PASTEL_COLORS.map(p => (
                <button key={p.name} onClick={() => handleHighlight(p.color)} title={p.name}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: p.color, border: `1px solid ${c.border}`, cursor: 'pointer' }} />
              ))}
              <button onClick={() => { execCmd('hiliteColor', 'transparent'); setShowHighlights(false); }}
                style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${c.border}`, color: c.muted, fontSize: 11, cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: c.border, margin: '0 6px' }} />

        {/* Comment */}
        <button onClick={() => { saveSelection(); setShowComment(!showComment); }}
          style={{ padding: '6px 10px', background: 'transparent', border: '1px solid transparent', color: c.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          💬 Comment
        </button>
      </div>

      {/* Comment input */}
      {showComment && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${c.border}`, background: c.bg3 }}>
          <input
            style={{ flex: 1, background: c.bg2, border: `1px solid ${c.border}`, padding: '8px 12px', color: c.cream, fontFamily: 'Georgia,serif', fontSize: 13, outline: 'none' }}
            placeholder="Add a comment to selected text…"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addComment()}
            autoFocus
          />
          <button onClick={addComment}
            style={{ padding: '8px 16px', background: c.cream, color: c.bg, border: 'none', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Add
          </button>
          <button onClick={() => setShowComment(false)}
            style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${c.border}`, color: c.muted, fontSize: 13, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        style={{ minHeight: '350px', padding: '24px 20px', color: c.cream, fontFamily: 'Georgia,serif', fontSize: 16, lineHeight: 1.9, outline: 'none', caretColor: c.gold, background: c.bg }}
        data-placeholder="Write about your day…"
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #7A7570;
          font-style: italic;
          pointer-events: none;
        }
      `}</style>

    </div>
  );
}