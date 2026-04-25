import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 2. Parse FormData properly
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file found in request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const owner = "Mohommed-Iflan";
    const repo = "CloudSlee_Images";
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = fileName;

    // 3. Convert to Base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join("");
    const base64Content = btoa(binaryString);

    // 4. Upload to GitHub
    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "CloudSlee-App"
        },
        body: JSON.stringify({
          message: `Upload product image: ${file.name}`,
          content: base64Content,
        }),
      }
    );

    const ghData = await ghRes.json();

    if (!ghRes.ok) {
      return new Response(JSON.stringify({ error: `GitHub API: ${ghData.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ghRes.status,
      });
    }

    const imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;

    return new Response(JSON.stringify({ url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
})