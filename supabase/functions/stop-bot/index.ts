
// supabase/functions/stop-bot/index.ts

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
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // In a real implementation, we would send a stop command to the Python bot
    // For now, we'll just simulate stopping the bot
    
    // Call the Python bot API to stop the bot
    const botApiUrl = Deno.env.get("BOT_API_URL");
    const botApiKey = Deno.env.get("BOT_API_KEY");
    
    if (!botApiUrl) {
      // For testing, we'll just simulate a successful response
      // Update bot status in the database (via broadcast channel)
      await supabaseClient
        .channel('bot_status_changes')
        .send({
          type: 'broadcast',
          event: 'bot_status',
          payload: { status: 'idle' },
        });
        
      return new Response(
        JSON.stringify({
          success: true,
          message: "Bot stopped successfully (simulated)",
          status: "idle"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // In production, we would make a real API call to the Python bot
      const response = await fetch(`${botApiUrl}/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${botApiKey}`
        }
      });
      
      const result = await response.json();
      
      // Update bot status in the database (via broadcast channel)
      await supabaseClient
        .channel('bot_status_changes')
        .send({
          type: 'broadcast',
          event: 'bot_status',
          payload: { status: 'idle' },
        });
      
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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
