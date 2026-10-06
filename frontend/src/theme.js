import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: {
    primary: { main: '#17695d', dark: '#0e4f45', light: '#e2f0eb' },
    secondary: { main: '#d27d35' }, background: { default: '#f4f6f8', paper: '#ffffff' },
    text: { primary: '#162336', secondary: '#687587' }, divider: '#e5e9ee',
    success: { main: '#17695d' }, warning: { main: '#a9691e' }, error: { main: '#b63f4b' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    h1: { fontSize: '3.6rem', lineHeight: 1.12, fontWeight: 750, letterSpacing: '-2px' },
    h2: { fontSize: '2.1rem', fontWeight: 730, letterSpacing: '-1px' },
    h3: { fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.65px' },
    h4: { fontSize: '1.25rem', fontWeight: 700 }, h5: { fontSize: '1.05rem', fontWeight: 650 },
    h6: { fontSize: '0.95rem', fontWeight: 650 }, body1: { fontSize: '0.94rem' },
    body2: { fontSize: '0.85rem' }, button: { textTransform: 'none', fontWeight: 650 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 7, padding: '9px 17px' } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { outlined: { borderColor: '#e5e9ee' } } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 5, fontSize: '0.7rem' } } },
    MuiTableCell: { styleOverrides: { head: { background: '#f9fafb', color: '#687587', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 650 }, root: { borderColor: '#eef1f4', padding: '16px' } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
  },
});
