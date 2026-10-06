import { createContext, useContext, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  return <ToastContext.Provider value={(message, severity = 'success') => setToast({ message, severity })}>
    {children}<Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert severity={toast?.severity || 'success'} onClose={() => setToast(null)} variant="filled">{toast?.message}</Alert>
    </Snackbar>
  </ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
