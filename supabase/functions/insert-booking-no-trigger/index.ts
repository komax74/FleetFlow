import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      vehicle_id,
      user_id,
      start_date,
      end_date,
      pickup_time,
      return_time,
    } = await req.json();

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Validate required fields
    if (
      !vehicle_id ||
      !user_id ||
      !start_date ||
      !end_date ||
      !pickup_time ||
      !return_time
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Format times correctly
    const formattedPickupTime = pickup_time.includes(":")
      ? pickup_time
      : `${pickup_time}:00`;
    const formattedReturnTime = return_time.includes(":")
      ? return_time
      : `${return_time}:00`;

    // Direct SQL query to bypass triggers
    const { data, error } = await supabaseClient.rpc(
      "insert_booking_no_trigger",
      {
        p_vehicle_id: vehicle_id,
        p_user_id: user_id,
        p_start_date: start_date,
        p_end_date: end_date,
        p_pickup_time: formattedPickupTime,
        p_return_time: formattedReturnTime,
      },
    );

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
