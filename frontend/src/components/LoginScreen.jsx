import { Button, Box, Typography, Container } from '@mui/material';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import GoogleIcon from '@mui/icons-material/Google';

function LoginScreen() {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
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
        bgcolor: '#f0f2f5',
        py: 4,
      }}
    >
      <Container maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          ログイン
        </Typography>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleGoogleLogin}
          sx={{ mt: 3 }}
          startIcon={<GoogleIcon />}
        >
          Googleでログイン
        </Button>
      </Container>
    </Box>
  );
}

export default LoginScreen;
