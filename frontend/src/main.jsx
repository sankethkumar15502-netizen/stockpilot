import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')).render(<StrictMode><ThemeProvider theme={theme}><CssBaseline /><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></ThemeProvider></StrictMode>);
