
// supabase/functions/get-bot-status/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // In a real implementation, we would query the Python bot for its status
    // For now, we'll just return a simulated status
    
    // Call the Python bot API to get status
    const botApiUrl = Deno.env.get("BOT_API_URL");
    const botApiKey = Deno.env.get("BOT_API_KEY");
    
    if (!botApiUrl) {
      // For testing, we'll just return a simulated status
      return new Response(
        JSON.stringify({
          success: true,
          status: "idle" // Default to idle for simulation
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // In production, we would make a real API call to the Python bot
      const response = await fetch(`${botApiUrl}/status`, {
        headers: {
          "Authorization": `Bearer ${botApiKey}`
        }
      });
      
      const result = await response.json();
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, status: "error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
