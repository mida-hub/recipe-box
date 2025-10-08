
import { useContext } from 'react';
import { Backdrop, CircularProgress, Box } from '@mui/material';
import { LoadingContext } from '../contexts/LoadingContext';

const LoadingSpinner = ({ simple = false }) => {
  const { loading } = useContext(LoadingContext);

  // Suspense fallback用のシンプルなスピナー
  if (simple) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw' }}>
        <CircularProgress color="primary" size={80} thickness={6} />
      </Box>
    );
  }

  // APIローディング用のBackdrop付きスピナー
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={loading}
    >
      <CircularProgress color="primary" size={80} thickness={6} />
    </Backdrop>
  );
};

export default LoadingSpinner;
