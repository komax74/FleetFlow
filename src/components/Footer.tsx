import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const Footer = () => {
  const [footerText, setFooterText] = useState(
    "© 2024 FleetFlow - Gestione flotta aziendale. Tutti i diritti riservati.",
  );

  useEffect(() => {
    const fetchFooterText = async () => {
      try {
        // First try to get from localStorage
        const storedFooterText = localStorage.getItem("footer_text");
        if (storedFooterText) {
          setFooterText(storedFooterText);
          return;
        }

        // If not in localStorage, try from Supabase if available
        try {
          const { data, error } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "footer_text")
            .single();

          if (error && error.code !== "PGRST116") {
            throw error;
          }

          if (data) {
            setFooterText(data.value);
            localStorage.setItem("footer_text", data.value);
          }
        } catch (dbError) {
          // Silently fail if database table doesn't exist yet
          console.log("Using default footer text");
        }
      } catch (error) {
        console.error("Error fetching footer text:", error);
        // If there's an error, we'll just use the default text
      }
    };

    fetchFooterText();
  }, []);

  return (
    <footer className="py-3 px-6 text-center text-xs text-gray-500 border-t mt-auto">
      <div
        className="max-w-[1400px] mx-auto"
        dangerouslySetInnerHTML={{ __html: footerText }}
      />
    </footer>
  );
};

export default Footer;
