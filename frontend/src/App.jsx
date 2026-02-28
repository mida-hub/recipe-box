import { useState, useEffect, Suspense, lazy, useCallback, useContext } from 'react';
import axios from 'axios';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import LoadingSpinner from './components/LoadingSpinner';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(async (config) => {
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Do not show full screen loader for background fetch
      if (!config.noSpinner) {
        setApiLoading(true);
      }
      return config;
    }, (error) => {
      setApiLoading(false);
      return Promise.reject(error);
    });

    const responseInterceptor = api.interceptors.response.use((response) => {
      if (import.meta.env.DEV) {
        setTimeout(() => { setApiLoading(false); }, 1000);
      } else {
        setApiLoading(false);
      }
      return response;
    }, (error) => {
      if (import.meta.env.DEV) {
        setTimeout(() => { setApiLoading(false); }, 1000);
      } else {
        setApiLoading(false);
      }
      return Promise.reject(error);
    });

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [setApiLoading]);

  const fetchRecipes = useCallback(async (currentUser) => {
    if (!currentUser) {
      setRecipes([]);
      localStorage.removeItem('recipe_cache');
      return;
    }
    setIsUpdating(true);
    try {
      const token = await currentUser.getIdToken();
      // Add noSpinner flag to prevent full screen loader
      const response = await api.get('/api/recipes', {
        headers: { Authorization: `Bearer ${token}` },
        noSpinner: true,
      });
      setRecipes(response.data);
      localStorage.setItem('recipe_cache', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching recipes:', error);
      // Keep cached data on error
    } finally {
      setIsUpdating(false);
    }
  }, [setRecipes]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        // Load from cache first
        try {
          const cachedRecipes = localStorage.getItem('recipe_cache');
          if (cachedRecipes) {
            setRecipes(JSON.parse(cachedRecipes));
          }
        } catch (e) {
          console.error('Failed to parse cached recipes', e);
          localStorage.removeItem('recipe_cache');
        }
        // Then fetch latest
        fetchRecipes(currentUser);
      } else {
        // Clear data on logout
        setRecipes([]);
        localStorage.removeItem('recipe_cache');
      }
    });
    return () => unsubscribe();
  }, [fetchRecipes]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener will handle clearing recipes and cache
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) return <LoadingSpinner simple />;

  if (!user) {
    return (
      <Suspense fallback={<LoadingSpinner simple />}>
        <LazyLoginScreen />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner simple />}>
      <LazyMainAppContent 
        recipes={recipes}
        api={api}
        fetchRecipes={() => fetchRecipes(user)}
        handleLogout={handleLogout}
        isUpdating={isUpdating}
      />
    </Suspense>
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
