import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('orderId') as string

    if (!file || !orderId) {
      return new Response(JSON.stringify({ error: "Missing file or orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')
    
    // --- CONFIGURATION SECTION ---
    const owner = "Mohommed-Iflan"
    const repo = "CloudSlee_Images"
    const branch = "main"
    // -----------------------------
    
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not found in Supabase secrets')

    // 2. Convert file to Base64
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i])
    }
    const base64Content = btoa(binary)

    // 3. Prepare File Path (Handling the space in "Review Images")
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const filePath = `Review Images/${orderId}/${fileName}`
    
    // GitHub API requires the path to be URI encoded for the URL
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`

    // 4. Upload to GitHub
    const ghResponse = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function'
      },
      body: JSON.stringify({
        message: `Upload review image for order ${orderId}`,
        content: base64Content,
        branch: branch
      }),
    })

    const ghResult = await ghResponse.json()
    
    if (!ghResponse.ok) {
      console.error("GitHub API Error:", ghResult)
      throw new Error(ghResult.message || "GitHub Upload Failed")
    }

    // 5. Construct the public URL for your database
    const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Function Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})