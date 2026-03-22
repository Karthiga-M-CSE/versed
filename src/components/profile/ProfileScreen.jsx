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
    maxWidth: '520px',
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.card,
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 1px 10px rgba(0,0,0,0.35)',
  },
  avatar: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: theme.gold,
    color: '#080808',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2.7rem',
    fontWeight: 'bold',
    userSelect: 'none',
  },
  name: {
    fontSize: '1.7rem',
    margin: '12px 0 4px',
    color: theme.text,
  },
  username: {
    color: theme.muted,
    marginBottom: '8px',
  },
  bio: {
    color: theme.text,
    marginBottom: '16px',
  },
  section: {
    borderBottom: `1px solid ${theme.border}`,
    paddingBottom: '14px',
    marginBottom: '14px',
  },
  button: {
    width: '100%',
    padding: '10px 14px',
    margin: '8px 0',
    borderRadius: '9px',
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '1rem',
  },
  formInput: {
    width: '100%',
    margin: '8px 0 12px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
    background: '#0f0f0f',
    color: theme.text,
    fontFamily: 'Georgia, serif',
    fontSize: '1rem',
  },
  textarea: {
    width: '100%',
    height: '96px',
    margin: '8px 0 12px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
    background: '#0f0f0f',
    color: theme.text,
    fontFamily: 'Georgia, serif',
    fontSize: '1rem',
    resize: 'vertical',
  },
  muted: {
    color: theme.muted,
    fontSize: '0.9rem',
    margin: '6px 0 10px',
  },
};

const ProfileScreen = ({ user, onSignOut }) => {
  const [profile, setProfile] = useState({ name: '', username: '', bio: '' });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('name,username,bio')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error', error);
      }
      if (data) {
        setProfile(data);
        setForm(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async (evt) => {
    evt.preventDefault();
    if (!user || !user.id) return;
    setSaving(true);

    const updates = {
      id: user.id,
      name: form.name,
      username: form.username,
      bio: form.bio,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(updates, { returning: 'minimal' });

    if (error) {
      console.error('Profile save error', error);
      setSaving(false);
      return;
    }

    setProfile({ name: form.name, username: form.username, bio: form.bio });
    setEditing(false);
    setSaving(false);
  };

  const initial = profile.name?.trim()?.[0]?.toUpperCase() || 'U';

  if (!user || !user.id) {
    return (
      <div style={{ ...style.root, justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: theme.text }}>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div style={style.root}>
      <div style={style.card}>
        <div style={style.section}>
          <div style={style.avatar}>{initial}</div>
          <h1 style={style.name}>{profile.name || 'No Name'}</h1>
          <p style={style.username}>@{profile.username || 'username'}</p>
          <p style={style.bio}>{profile.bio || 'Bio not set.'}</p>
        </div>

        <button style={style.button} onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>

        {editing && (
          <form onSubmit={handleSave}>
            <label style={style.muted}>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              style={style.formInput}
              required
            />
            <label style={style.muted}>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              style={style.formInput}
              required
            />
            <label style={style.muted}>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              style={style.textarea}
            />
            <button type="submit" style={style.button} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}

        <button style={style.button} onClick={onSignOut}>
          Sign Out
        </button>

        {loading && <p style={{ color: theme.muted, marginTop: '12px' }}>Loading profile…</p>}
      </div>
    </div>
  );
};

export default ProfileScreen;
