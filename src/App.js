import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import HomeScreen from './components/home/homescreen';

const s = {
  page: { minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia, serif', padding:'20px' },
  card: { background:'#101010', border:'1px solid #1E1E1E', padding:'48px 40px', width:'100%', maxWidth:'420px' },
  logo: { fontSize:'28px', letterSpacing:'0.35em', color:'#EDE8DF', textAlign:'center', marginBottom:'8px', textTransform:'uppercase' },
  logoAccent: { color:'#C49A3C' },
  tagline: { fontSize:'13px', color:'#7A7570', textAlign:'center', fontStyle:'italic', marginBottom:'40px' },
  tabRow: { display:'flex', marginBottom:'32px', borderBottom:'1px solid #1E1E1E' },
  tab: (active) => ({ flex:1, padding:'12px', background:'transparent', border:'none', borderBottom: active?'2px solid #C49A3C':'2px solid transparent', color: active?'#C49A3C':'#7A7570', fontSize:'11px', letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', fontFamily:'sans-serif', transition:'all 0.2s', marginBottom:'-1px' }),
  label: { fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#7A7570', marginBottom:'8px', fontFamily:'sans-serif' },
  input: { width:'100%', background:'#161616', border:'1px solid #1E1E1E', padding:'13px 16px', color:'#EDE8DF', fontSize:'14px', fontFamily:'Georgia, serif', outline:'none', marginBottom:'20px', boxSizing:'border-box' },
  btnPrimary: { width:'100%', padding:'14px', background:'#EDE8DF', color:'#080808', border:'none', fontSize:'11px', letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', fontFamily:'sans-serif', marginBottom:'16px' },
  btnGoogle: { width:'100%', padding:'13px', background:'transparent', color:'#EDE8DF', border:'1px solid #1E1E1E', fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase', cursor:'pointer', fontFamily:'sans-serif', marginBottom:'24px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' },
  divider: { display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' },
  dividerLine: { flex:1, height:'1px', background:'#1E1E1E' },
  dividerText: { fontSize:'10px', color:'#7A7570', letterSpacing:'0.15em', fontFamily:'sans-serif' },
  errorBox: { background:'rgba(140,46,46,0.15)', border:'1px solid #8C2E2E', padding:'12px 16px', marginBottom:'20px', fontSize:'12px', color:'#B03A3A', fontFamily:'sans-serif' },
  successBox: { background:'rgba(74,140,74,0.1)', border:'1px solid #4A8C4A', padding:'12px 16px', marginBottom:'20px', fontSize:'13px', color:'#4A8C4A', fontFamily:'sans-serif', lineHeight:1.6 },
  bottomText: { textAlign:'center', fontSize:'11px', color:'#7A7570', fontFamily:'sans-serif' },
  row: { display:'flex', gap:'12px' },
  half: { flex:1 },
  loadingSpinner: { textAlign:'center', color:'#7A7570', fontStyle:'italic', fontSize:'14px', padding:'20px 0' },
};

function LoginPage({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  }

  return (
    <>
      {error && <div style={s.errorBox}>{error}</div>}
      <p style={s.label}>Email Address</p>
      <input style={s.input} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />
      <p style={s.label}>Password</p>
      <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />
      <button style={s.btnPrimary} onClick={handleLogin} disabled={loading}>{loading?'Signing in...':'Sign In'}</button>
      <div style={s.divider}><div style={s.dividerLine}/><span style={s.dividerText}>or</span><div style={s.dividerLine}/></div>
      <button style={s.btnGoogle} onClick={() => supabase.auth.signInWithOAuth({ provider:'google' })}><span>G</span> Continue with Google</button>
      <p style={s.bottomText}>Don't have an account? <span style={{ color:'#C49A3C', cursor:'pointer' }} onClick={onSwitch}>Create one</span></p>
    </>
  );
}

function SignupPage({ onSwitch }) {
  const [form, setForm] = useState({ name:'', username:'', dob:'', email:'', password:'' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function handleSignup() {
    if (!form.name||!form.username||!form.dob||!form.email||!form.password) { setError('Please fill in all fields.'); return; }
    if (!form.email.includes('@')) { setError('Please enter a valid email.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.username.includes(' ')) { setError('Username cannot contain spaces.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { name: form.name, username: form.username, dob: form.dob } }
    });
    if (err) setError(err.message);
    else setSuccess('Account created! Check your email to confirm then sign in. 🖤');
    setLoading(false);
  }

  return (
    <>
      {error && <div style={s.errorBox}>{error}</div>}
      {success && <div style={s.successBox}>{success}</div>}
      <div style={s.row}>
        <div style={s.half}><p style={s.label}>Full Name</p><input style={s.input} placeholder="Your name" value={form.name} onChange={e => update('name', e.target.value)} /></div>
        <div style={s.half}><p style={s.label}>Username</p><input style={s.input} placeholder="@handle" value={form.username} onChange={e => update('username', e.target.value)} /></div>
      </div>
      <p style={s.label}>Date of Birth</p>
      <input style={s.input} type="date" value={form.dob} onChange={e => update('dob', e.target.value)} />
      <p style={s.label}>Email Address</p>
      <input style={s.input} type="email" placeholder="your@email.com" value={form.email} onChange={e => update('email', e.target.value)} />
      <p style={s.label}>Password</p>
      <input style={s.input} type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => update('password', e.target.value)} />
      <button style={s.btnPrimary} onClick={handleSignup} disabled={loading}>{loading?'Creating account...':'Create Account'}</button>
      <div style={s.divider}><div style={s.dividerLine}/><span style={s.dividerText}>or</span><div style={s.dividerLine}/></div>
      <button style={s.btnGoogle} onClick={() => supabase.auth.signInWithOAuth({ provider:'google' })}><span>G</span> Sign up with Google</button>
      <p style={s.bottomText}>Already have an account? <span style={{ color:'#C49A3C', cursor:'pointer' }} onClick={onSwitch}>Sign in</span></p>
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={s.page}>
      <p style={s.loadingSpinner}>Loading Versed...</p>
    </div>
  );

  if (user) return <HomeScreen user={user} onSignOut={() => supabase.auth.signOut()} />;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Ver<span style={s.logoAccent}>·</span>sed</div>
        <p style={s.tagline}>Where words find their depth</p>
        <div style={s.tabRow}>
          <button style={s.tab(tab==='login')} onClick={() => setTab('login')}>Sign In</button>
          <button style={s.tab(tab==='signup')} onClick={() => setTab('signup')}>Create Account</button>
        </div>
        {tab==='login' ? <LoginPage onSwitch={() => setTab('signup')} /> : <SignupPage onSwitch={() => setTab('login')} />}
      </div>
    </div>
  );
}
