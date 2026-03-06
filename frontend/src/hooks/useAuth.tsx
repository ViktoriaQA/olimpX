import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { AuthService, RegisterData, LoginData, AuthResponse } from "@/services/authService";
import { config } from "@/config";

type User = {
  id: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: string;
  is_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  nickname?: string;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_expires_at?: string;
  onboarded?: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (data: RegisterData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithDiscord: () => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  profile: User | null;
  role: string | null;
  session: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  const saveAuthData = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem(config.auth.tokenKey, authToken);
    localStorage.setItem(config.auth.userKey, JSON.stringify(userData));
  };

  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(config.auth.tokenKey);
    localStorage.removeItem(config.auth.userKey);
  };

  const restoreSession = async () => {
    try {
      const storedToken = localStorage.getItem(config.auth.tokenKey);
      const storedUser = localStorage.getItem(config.auth.userKey);

      if (storedToken && storedUser) {
        // Verify token is still valid
        const response = await AuthService.getCurrentUser(storedToken);
        setUser(response.user);
        setToken(storedToken);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      const response = await AuthService.register(data);
      saveAuthData(response.user, response.token);
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully.",
      });
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginData) => {
    try {
      setLoading(true);
      const response = await AuthService.login(data);
      saveAuthData(response.user, response.token);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const response = await AuthService.getGoogleAuthUrl();
      window.location.href = response.auth_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      toast({
        title: "Google login failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const loginWithDiscord = async () => {
    try {
      const response = await AuthService.getDiscordAuthUrl();
      window.location.href = response.auth_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Discord login failed';
      toast({
        title: "Discord login failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const logout = () => {
    clearAuthData();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    // Use setTimeout to ensure the redirect happens after state updates
    setTimeout(() => {
      navigate('/');
    }, 0);
  };

  const refreshProfile = async () => {
    if (!token) return;
    
    try {
      const response = await AuthService.getCurrentUser(token);
      setUser(response.user);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  // Initialize session
  useEffect(() => {
    // Check for OAuth callback first (Google or Discord)
    const urlParams = new URLSearchParams(window.location.search);
    const callbackToken = urlParams.get('token');
    
    if (callbackToken && !isInitialized) {
      // Handle OAuth callback (Google or Discord)
      const handleOAuthCallback = async () => {
        try {
          // Get user data using the token
          const response = await AuthService.getCurrentUser(callbackToken);
          const userData = response.user;
          
          // Save both token and user data
          localStorage.setItem(config.auth.tokenKey, callbackToken);
          localStorage.setItem(config.auth.userKey, JSON.stringify(userData));
          
          // Update state
          setUser(userData);
          setToken(callbackToken);
          setIsInitialized(true);
          
          // Clear URL parameters and navigate to dashboard
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/dashboard');
        } catch (error) {
          console.error('Failed to handle OAuth callback:', error);
          // If failed, clear token and redirect to auth
          localStorage.removeItem(config.auth.tokenKey);
          setIsInitialized(true);
          navigate('/auth');
        } finally {
          setLoading(false);
        }
      };
      
      handleOAuthCallback();
    } else if (!isInitialized) {
      // Normal session restoration
      restoreSession().then(() => {
        setIsInitialized(true);
      });
    }
  }, [navigate, isInitialized]);

  const value: AuthContextType = {
    user,
    token,
    loading,
    register,
    login,
    loginWithGoogle,
    loginWithDiscord,
    logout,
    restoreSession,
    refreshProfile,
    isAuthenticated: !!user && !!token,
    profile: user,
    role: user?.role || null,
    session: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
