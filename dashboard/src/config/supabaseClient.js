import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ssegsbvpqmnwmzvqetye.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzZWdzYnZwcW1ud216dnFldHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNzM5MDgsImV4cCI6MjA5OTk0OTkwOH0.8b4r58X_I8jxO5Mp68SsRP-FFc1puuor9ULcFwVQ9uI';

export const supabase = createClient(supabaseUrl, supabaseKey);
