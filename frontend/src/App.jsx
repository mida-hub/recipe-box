import { useState, useEffect, Suspense, lazy, useCallback, useContext, useMemo } from 'react';
import axios from 'axios';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import { AppBar, Toolbar, Typography, Button, Box, Container, LinearProgress } from '@mui/material';
import LoadingSpinner from './components/LoadingSpinner';
import RecipeSkeleton from './components/RecipeSkeleton';
import { LoadingContext, LoadingProvider } from './contexts/LoadingContext';

// Lazy load components
const LazyLoginScreen = lazy(() => import('./components/LoginScreen'));
const LazyMainAppContent = lazy(() => import('./components/MainAppContent'));

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''; // バックエンドのURL

// Axios instance with interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
});

function AppContent() {
  const { setLoading: setApiLoading } = useContext(LoadingContext);
  // Predict login state from localStorage to show App Shell immediately
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Predict if logged in to show skeleton early
  const wasLoggedIn = useMemo(() => localStorage.getItem('is_logged_in') === 'true', []);

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(async (config) => {
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (!config.noSpinner) {
        setApiLoading(true);
      }
      return config;
    }, (error) => {
      setApiLoading(false);
      return Promise.reject(error);
    });

    const responseInterceptor = api.interceptors.response.use((response) => {
      setApiLoading(false);
      return response;
    }, (error) => {
      setApiLoading(false);
      return Promise.reject(error);
    });

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [setApiLoading]);

  const fetchRecipes = useCallback(async (currentUser) => {
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      const response = await api.get('/api/recipes', { noSpinner: true });
      setRecipes(response.data);
      localStorage.setItem('recipe_cache', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    // Try to load from cache immediately
    if (wasLoggedIn) {
      try {
        const cachedRecipes = localStorage.getItem('recipe_cache');
        if (cachedRecipes) {
          setRecipes(JSON.parse(cachedRecipes));
        }
      } catch (e) {
        console.error('Failed to parse cache', e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      if (currentUser) {
        localStorage.setItem('is_logged_in', 'true');
        fetchRecipes(currentUser);
      } else {
        localStorage.setItem('is_logged_in', 'false');
        setRecipes([]);
        localStorage.removeItem('recipe_cache');
      }
    });
    return () => unsubscribe();
  }, [fetchRecipes, wasLoggedIn]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Main Layout with AppBar (App Shell)
  const renderContent = () => {
    if (isAuthChecking) {
      // While checking Auth, if we think we are logged in, show skeleton.
      // Otherwise show nothing (or a very minimal splash) to avoid flickering.
      return wasLoggedIn ? (
        <Container sx={{ mt: 4 }}>
          <RecipeSkeleton />
        </Container>
      ) : <LoadingSpinner simple />;
    }

    if (!user) {
      return (
        <Suspense fallback={<LoadingSpinner simple />}>
          <LazyLoginScreen />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<Container sx={{ mt: 4 }}><RecipeSkeleton /></Container>}>
        <LazyMainAppContent 
          recipes={recipes}
          api={api}
          fetchRecipes={() => fetchRecipes(user)}
          handleLogout={handleLogout}
          isUpdating={isUpdating}
        />
      </Suspense>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <LoadingSpinner />
      {/* AppBar is part of the App Shell - rendered immediately if user is likely logged in */}
      {(user || (isAuthChecking && wasLoggedIn)) && (
        <AppBar position="static" color="primary">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" component="div">レシピメモ</Typography>
            {user && <Button color="inherit" onClick={handleLogout}>ログアウト</Button>}
          </Toolbar>
        </AppBar>
      )}
      <Box sx={{ height: '4px' }}>
        {isUpdating && <LinearProgress />}
      </Box>
      {renderContent()}
    </Box>
  );
}

function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}

export default App;
