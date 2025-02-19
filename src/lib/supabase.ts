import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";

const supabaseUrl = "https://wxhavjosbvfymltejqqa.supabase.co";
const supabaseAnonKey =
const supabaseServiceKey =

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
);
