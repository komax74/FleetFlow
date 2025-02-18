import { supabase } from "./supabase";

export async function exportUsers() {
  try {
    const { data, error } = await supabase.from("profiles").select("*");

    if (error) throw error;

    // Convert to CSV or JSON
    const json = JSON.stringify(data, null, 2);

    // Create and download file
    const blob = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.json";
    a.click();
    window.URL.revokeObjectURL(url);

    return data;
  } catch (error) {
    console.error("Error exporting users:", error);
    throw error;
  }
}

export async function importUsers(jsonData: string) {
  try {
    const users = JSON.parse(jsonData);

    // Insert users into profiles table
    const { error } = await supabase.from("profiles").insert(users);

    if (error) throw error;
  } catch (error) {
    console.error("Error importing users:", error);
    throw error;
  }
}
