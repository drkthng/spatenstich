// supabase/functions/_shared/cors.ts
// Shared CORS headers for browser-invocable Edge Functions.
// Origin '*' is acceptable — these endpoints all enforce auth/userId checks
// individually inside each handler (defense-in-depth).
// Created in Plan 02-03 for extract-vereinsregeln; reusable by future browser-
// invocable functions.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
