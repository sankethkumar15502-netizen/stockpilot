import { Component, lazy, Suspense } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
const Landing = lazy(() => import('./pages/Landing'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workflows = lazy(() => import('./pages/Workflows'));
const CreateWorkflow = lazy(() => import('./pages/CreateWorkflow'));
const WorkflowDetail = lazy(() => import('./pages/WorkflowDetail'));
const Approvals = lazy(() => import('./pages/Approvals'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Audit = lazy(() => import('./pages/Audit'));
const Business = lazy(() => import('./pages/Business'));
const Loading = () => <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress size={28} aria-label="Loading application" /></Box>;
function Protected() {
  const { user, loading } = useAuth();
  return loading ? <Loading /> : user ? <AppLayout /> : <Navigate to="/login" replace />;
}
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    return this.state.error ? <Box p={4}><Alert severity="error">This view could not load. Reload the application to recover.</Alert><Button onClick={() => window.location.reload()}>Reload</Button></Box> : this.props.children;
  }
}
export default function App() {
  return <ErrorBoundary><BrowserRouter><Suspense fallback={<Loading />}><Routes>
    <Route path="/" element={<Landing />} /><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} />
    <Route path="/app" element={<Protected />}><Route index element={<Dashboard />} /><Route path="workflows" element={<Workflows />} /><Route path="workflows/new" element={<CreateWorkflow />} /><Route path="workflows/:id" element={<WorkflowDetail />} /><Route path="approvals" element={<Approvals />} /><Route path="analytics" element={<Analytics />} /><Route path="audit" element={<Audit />} /><Route path="business" element={<Business />} /></Route>
    <Route path="*" element={<Box p={5}><Alert severity="info">Page not found.</Alert><Button component={Link} to="/">Back to StockPilot</Button></Box>} />
  </Routes></Suspense></BrowserRouter></ErrorBoundary>;
}
