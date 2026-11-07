import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LoadingProvider } from './contexts/LoadingContext';
import { cafeTheme } from './theme';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={cafeTheme}>
      <CssBaseline />
      <LoadingProvider>
        <App />
      </LoadingProvider>
    </ThemeProvider>
  </StrictMode>,
)
