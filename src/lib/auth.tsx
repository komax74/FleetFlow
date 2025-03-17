import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "user";
  company: string | null;
  created_at?: string;
  updated_at?: string;
};

type AuthContextType = {
  user: any | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await getProfile(data.user.id);
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }

  async function signOut() {
    try {
      // Clear local storage first to ensure we don't have stale data
      localStorage.removeItem("sb-wxhavjosbvfymltejqqa-auth-token");
      localStorage.removeItem("supabase.auth.token");

      // Then try the official signOut method
      try {
        const { error } = await supabase.auth.signOut();
        if (error) console.warn("Supabase signOut error:", error);
      } catch (signOutError) {
        console.warn("Caught signOut error:", signOutError);
        // Continue with manual cleanup even if signOut fails
      }

      // Reset state regardless of signOut success
      setUser(null);
      setProfile(null);

      // Force reload to clear any remaining state
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      // Force reload as a last resort
      window.location.href = "/";
    }
  }

  const value = {
    user,
    profile,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth };
export default AuthProvider;

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
