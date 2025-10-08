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

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(async (config) => {
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      setApiLoading(true);
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
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const response = await api.get('/api/recipes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecipes(response.data);
      } catch (error) {
        console.error('Error fetching recipes:', error);
        setRecipes([]);
      }
    } else {
      setRecipes([]);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        fetchRecipes(currentUser);
      }
    });
    return () => unsubscribe();
  }, [fetchRecipes]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRecipes([]); // Clear recipes on logout
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
