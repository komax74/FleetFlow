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
        }

        // Also try from Supabase if available
        try {
          const { data, error } = await supabase
            .from("settings")
            .select("*")
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
          console.log("Database table not available yet");
        }
      } catch (error) {
        console.error("Error fetching footer text:", error);
      }
    };

    fetchFooterText();
  }, []);

  return (
    <footer className="py-6 border-t">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <img
                src="/images/logo/ncg-logo-color.png"
                alt="NCG Logo"
                className="h-8 mr-3"
              />
              <span className="text-lg font-semibold">FleetFlow</span>
            </div>
          </div>

          <div className="text-center md:text-right">
            <div
              className="text-sm text-gray-600"
              dangerouslySetInnerHTML={{ __html: footerText }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
