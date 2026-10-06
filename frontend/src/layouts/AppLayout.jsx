import { useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { LayoutDashboard, Workflow, ShieldCheck, ChartNoAxesCombined, ScrollText, Package, LogOut, Menu, ArrowRight, Plus } from 'lucide-react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useResource } from '../hooks/useResource';

const navigation = [
  ['Overview', '/app', LayoutDashboard, true], ['Workflows', '/app/workflows', Workflow],
  ['Approval center', '/app/approvals', ShieldCheck], ['Business context', '/app/business', Package],
  ['Analytics', '/app/analytics', ChartNoAxesCombined], ['Audit trail', '/app/audit', ScrollText],
];
export function Brand({ dark = false }) {
  return <Stack direction="row" spacing={1.2} alignItems="center"><Box className="brand-icon"><ArrowRight size={22} /></Box>
    <Typography fontSize="1.2rem" fontWeight={750} letterSpacing="-.5px" color={dark ? '#fff' : 'text.primary'}>stockpilot<span style={{ color: '#dd995f' }}>.</span></Typography></Stack>;
}
export default function AppLayout() {
  const [mobile, setMobile] = useState(false);
  const { user, logout } = useAuth();
  const toast = useToast();
  const health = useResource('/health', 30000);
  const sidebar = <Box className="sidebar-content"><Box p={3}><Brand dark /><Typography variant="caption" color="#8b9bb0" mt={1.5} display="block">AUTONOMOUS SUPPLY OPERATIONS</Typography></Box>
    <Box px={2} mt={1}><Button fullWidth variant="contained" color="secondary" component={Link} to="/app/workflows/new" onClick={() => setMobile(false)} startIcon={<Plus size={17} />} sx={{ bgcolor: '#edaa6b', color: '#172334' }}>New workflow</Button></Box>
    <Typography className="nav-label" px={3} mt={4} mb={1}>WORKSPACE</Typography><Box component="nav" aria-label="Main navigation" px={1.5}>
      {navigation.map(([name, to, Icon, end]) => <NavLink key={to} end={end} to={to} onClick={() => setMobile(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} /><span>{name}</span></NavLink>)}
    </Box><Box sx={{ flex: 1 }} /><Box className="sidebar-note"><ShieldCheck size={18} /><Typography variant="body2">Policy-constrained agents.<br /><span>Every action leaves evidence.</span></Typography></Box>
    <Stack direction="row" spacing={1.3} alignItems="center" px={2.5} py={2.5} borderTop="1px solid #263348"><Avatar sx={{ width: 33, height: 33, bgcolor: '#354860', fontSize: 14 }}>{user.name.slice(0, 1)}</Avatar><Box flex={1} minWidth={0}><Typography variant="body2" color="#fff" noWrap>{user.name}</Typography><Typography variant="caption" color="#8b9bb0">Operations manager</Typography></Box>
      <IconButton aria-label="Sign out" size="small" sx={{ color: '#a4b3c5' }} onClick={async () => { try { await logout(); } catch (e) { toast(e.message, 'error'); } }}><LogOut size={17} /></IconButton></Stack>
  </Box>;
  return <Box className="app-frame"><Box className="desktop-sidebar">{sidebar}</Box><Drawer open={mobile} onClose={() => setMobile(false)} slotProps={{ paper: { sx: { bgcolor: '#111d2e', width: 250 } } }}>{sidebar}</Drawer>
    <Box className="main-frame"><Stack className="topbar" direction="row" alignItems="center" justifyContent="space-between" px={{ xs: 2, md: 4 }}>
      <Stack direction="row" alignItems="center" gap={1}><IconButton className="mobile-menu" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={20} /></IconButton><Typography variant="body2" color="text.secondary">Workspace <span style={{ margin: '0 10px', color: '#c1c9d1' }}>/</span> Supply operations</Typography></Stack>
      <Chip label="Sandbox business ledger" size="small" variant="outlined" sx={{ bgcolor: '#fafbfc' }} /></Stack>
      <Box component="main" className="page-content">
        {health.data && !health.data.aiConfigured && <Alert severity="warning" sx={{ mb: 3 }}>Live AI needs configuration. Set <strong>GEMINI_API_KEY</strong> or <strong>OPENAI_API_KEY</strong> for the selected provider in the backend environment, then restart the API. Business data and authentication are available.</Alert>}
        {health.data?.provider === 'TEST_FIXTURE_NOT_AI' && <Alert severity="info" sx={{ mb: 3 }}>TEST FIXTURE execution — deterministic test responses, not live AI. Business tools and MongoDB are real.</Alert>}
        {health.error && <Alert severity="error" sx={{ mb: 3 }}>API connectivity interrupted. Check the backend and retry.</Alert>}
        <Outlet />
      </Box><Box component="footer" className="app-footer">StockPilot · Auditable goal-to-action operations <span>Business records are sandbox data. Agent execution uses live AI when configured.</span></Box>
    </Box></Box>;
}
