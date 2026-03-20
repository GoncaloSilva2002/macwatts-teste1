/**
 * Cloudflare Worker - Resend proxy
 * Set secret in Worker: RESEND_API_KEY = re_...
 */

const RESEND_API_URL = "https://api.resend.com/emails";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders(origin) });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders(origin) });
    }

    if (!env.RESEND_API_KEY) {
      return new Response("Missing RESEND_API_KEY", { status: 500, headers: corsHeaders(origin) });
    }

    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await resendResponse.text();
    return new Response(responseText, {
      status: resendResponse.status,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json"
      }
    });
  }
};
