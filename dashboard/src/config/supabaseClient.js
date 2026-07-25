import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ssegsbvpqmnwmzvqetye.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzZWdzYnZwcW1ud216dnFldHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNzM5MDgsImV4cCI6MjA5OTk0OTkwOH0.8b4r58X_I8jxO5Mp68SsRP-FFc1puuor9ULcFwVQ9uI';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // PKCE keeps access and refresh tokens out of the callback URL and is the
    // recommended OAuth flow for browser applications.
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
});

// Configure VITE_AUTH_REDIRECT_URL in Vercel with the canonical production
// URL (for example, https://cyberguard.example.vercel.app).  Falling back to
// the current origin keeps preview deployments and local development working.
export const getOAuthRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === 'https:' || url.hostname === 'localhost') {
        return url.origin;
      }
    } catch {
      // Use the browser origin below when the deployment variable is malformed.
    }
  }

  return window.location.origin;
};
