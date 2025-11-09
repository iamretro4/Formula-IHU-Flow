// Process Email Queue
// This function processes pending emails from the email_queue table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const MAX_RETRIES = 3;

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get pending emails
    const { data: emails, error: fetchError } = await supabaseClient
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(50); // Process 50 at a time

    if (fetchError) {
      throw new Error(`Failed to fetch emails: ${fetchError.message}`);
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending emails to process", processed: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    let processed = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        // Send email via Resend
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: email.from_email || "onboarding@resend.dev",
            to: email.to_email,
            subject: email.subject,
            html: email.html_content,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        const data = await response.json();

        // Update email status to sent
        await supabaseClient
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", email.id);

        processed++;
      } catch (error: any) {
        console.error(`Failed to send email ${email.id}:`, error);

        // Update retry count
        const newRetryCount = (email.retry_count || 0) + 1;
        const status = newRetryCount >= MAX_RETRIES ? "failed" : "pending";

        await supabaseClient
          .from("email_queue")
          .update({
            retry_count: newRetryCount,
            status,
            error_message: error.message,
          })
          .eq("id", email.id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Email queue processed",
        processed,
        failed,
        total: emails.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error processing email queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

