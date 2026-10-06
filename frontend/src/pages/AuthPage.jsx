import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brand } from '../layouts/AppLayout';
export default function AuthPage({ register = false }) {
  const [input, setInput] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const { user, authenticate } = useAuth(); const navigate = useNavigate();
  if (user) return <Navigate to="/app" replace />;
  const change = key => e => setInput({ ...input, [key]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await authenticate(register ? 'register' : 'login', register ? input : { email: input.email, password: input.password }); navigate('/app'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Box className="auth-page"><Box className="auth-story"><Link to="/" style={{ textDecoration: 'none' }}><Brand dark /></Link><Box mt="auto" mb="auto"><Typography className="eyebrow" color="#e7a66d" mb={3}>YOUR OPERATIONS, ONE SHARED GOAL</Typography><Typography variant="h1" sx={{ fontSize: '3.1rem' }}>Every disruption<br />deserves a plan.</Typography><Typography color="#a9b8cc" lineHeight={1.8} mt={3} maxWidth={420}>Connect context, decisions and action in one auditable workflow. Let agents handle coordination. Keep control of what matters.</Typography></Box><Stack direction="row" spacing={1.5} color="#a9b8cc" alignItems="center"><ShieldCheck size={20} /><Typography variant="body2">Scoped tools. Explicit authority. Verified outcomes.</Typography></Stack></Box>
    <Box className="auth-form-wrap"><Paper variant="outlined" sx={{ width: '100%', maxWidth: 450, p: { xs: 3, md: 4 } }}><Typography className="eyebrow" color="primary" mb={1.5}>STOCKPILOT WORKSPACE</Typography><Typography variant="h3" component="h1">{register ? 'Create your account' : 'Welcome back'}</Typography><Typography color="text.secondary" mt={1} mb={3}>{register ? 'Start coordinating smarter supply operations.' : 'Sign in to your operations workspace.'}</Typography>
      <Box component="form" onSubmit={submit}><Stack spacing={2.5}>{error && <Alert severity="error">{error}</Alert>}
        {register && <TextField label="Full name" name="name" autoComplete="name" required value={input.name} onChange={change('name')} slotProps={{ htmlInput: { minLength: 2, maxLength: 80 } }} />}
        <TextField label="Work email" name="email" type="email" autoComplete="email" required value={input.email} onChange={change('email')} />
        <TextField label="Password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required value={input.password} onChange={change('password')} slotProps={{ htmlInput: { minLength: register ? 12 : 1, maxLength: 72 } }} helperText={register ? 'At least 12 characters. Passwords are securely hashed.' : ''} />
        <Button type="submit" variant="contained" disabled={busy} endIcon={<ArrowRight size={17} />}>{busy ? 'Please wait…' : register ? 'Create workspace' : 'Sign in'}</Button></Stack></Box>
      <Typography variant="body2" textAlign="center" color="text.secondary" mt={3}>{register ? 'Already have an account?' : 'New to StockPilot?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></Typography>
    </Paper><Typography variant="caption" color="text.secondary" mt={3}>Agentic AI with accountable execution.</Typography></Box></Box>;
}
