import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wxhavjosbvfymltejqqa.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aGF2am9zYnZmeW1sdGVqcXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NDAxNzgsImV4cCI6MjA1NTAxNjE3OH0.ZbhSsV5Itzy1mHGA0VS9-YsBMi3_Iq5xZ84d3ZztHFs";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  try {
    // First create the user in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: "marcello@esimple.it",
      password: "your-password-here", // Replace with actual password
      options: {
        data: {
          full_name: "Marcello Admin",
          role: "admin",
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("No user returned from signup");

    // Then create/update the profile
    const { error: profileError } = await supabase.from("profiles").upsert([
      {
        id: authData.user.id,
        email: "marcello@esimple.it",
        full_name: "Marcello Admin",
        role: "admin",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcello",
      },
    ]);

    if (profileError) throw profileError;
    console.log("Admin user created/updated successfully");
  } catch (error) {
    console.error("Error creating/updating admin:", error);
  }
}

createAdmin();
