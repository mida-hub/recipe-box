import { Button, Box, Typography, Container } from '@mui/material';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import GoogleIcon from '@mui/icons-material/Google';

function LoginScreen() {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      // User is signed in. App.jsx will handle redirection.
    } catch (error) {
      console.error("Error during Google login:", error);
      // Handle Errors here.
      // const errorCode = error.code;
      // const errorMessage = error.message;
      // const email = error.customData.email;
      // const credential = GoogleAuthProvider.credentialFromError(error);
      // ...
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 3, boxShadow: '0 8px 30px rgba(61, 52, 47, 0.06)', border: '1px solid #F0ECE6', textAlign: 'center' }}>
        <Typography variant="h4" component="div" sx={{ mb: 1 }}>
          🍳
        </Typography>
        <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>
          レシピメモ
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          家族のおいしいレシピをあつめる場所
        </Typography>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          onClick={handleGoogleLogin}
          sx={{ mt: 1 }}
          startIcon={<GoogleIcon />}
        >
          Googleでログイン
        </Button>
      </Container>
    </Box>
  );
}

export default LoginScreen;
