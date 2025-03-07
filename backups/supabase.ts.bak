import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";

const supabaseUrl = "https://wxhavjosbvfymltejqqa.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aGF2am9zYnZmeW1sdGVqcXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NDAxNzgsImV4cCI6MjA1NTAxNjE3OH0.ZbhSsV5Itzy1mHGA0VS9-YsBMi3_Iq5xZ84d3ZztHFs";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aGF2am9zYnZmeW1sdGVqcXFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTQ0MDE3OCwiZXhwIjoyMDU1MDE2MTc4fQ.Oi1yfPPLXYHDVrwZVQnwHYLwKB_dRpHROC3lDY-0_Ko";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
);
