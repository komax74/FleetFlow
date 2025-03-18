import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";

const supabaseUrl = "https://wxhavjosbvfymltejqqa.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aGF2am9zYnZmeW1sdGVqcXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NDAxNzgsImV4cCI6MjA1NTAxNjE3OH0.ZbhSsV5Itzy1mHGA0VS9-YsBMi3_Iq5xZ84d3ZztHFs";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aGF2am9zYnZmeW1sdGVqcXFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTQ0MDE3OCwiZXhwIjoyMDU1MDE2MTc4fQ.Oi1yfPPLXYHDVrwZVQnwHYLwKB_dRpHROC3lDY-0_Ko";

// Create a single instance of the Supabase client
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null =
  null;

// Standard client for authenticated users
export const supabase = (() => {
  if (!supabaseInstance) {
    console.log("Initializing Supabase client with URL:", supabaseUrl);
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
})();

// Admin client with service role permissions
export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    console.log("Initializing Supabase admin client with URL:", supabaseUrl);
    supabaseAdminInstance = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }
  return supabaseAdminInstance;
})();
