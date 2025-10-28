Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Create 'clips' bucket with public access
    const createBucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        id: 'clips',
        name: 'clips',
        public: true,
        file_size_limit: 104857600, // 100MB
        allowed_mime_types: ['video/mp4', 'video/webm', 'audio/mpeg', 'image/jpeg']
      })
    });

    if (!createBucketResponse.ok) {
      const errorText = await createBucketResponse.text();
      // Bucket might already exist, which is fine
      if (!errorText.includes('already exists')) {
        throw new Error(`Failed to create bucket: ${errorText}`);
      }
    }

    // Set up RLS policies for public access
    const policyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_storage_policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        bucket_name: 'clips',
        policy_name: 'Public Access',
        definition: 'true'
      })
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Clips storage bucket created successfully',
        bucket: 'clips'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'BUCKET_CREATION_ERROR',
          message: error.message
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
