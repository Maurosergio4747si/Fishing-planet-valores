import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (supabaseUrl) {
  // Strip /rest/v1 if included by mistake, and remove trailing slashes
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
  supabaseUrl = supabaseUrl.replace(/\/+$/, '');

  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = 'https://' + supabaseUrl;
  }
  
  try {
    const urlObj = new URL(supabaseUrl);
    // Auto-append .supabase.co if it's just a project ID
    if (!urlObj.hostname.includes('.') && urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
      urlObj.hostname = urlObj.hostname + '.supabase.co';
    }
    // Remove any path that might cause 'Invalid path specified' errors in the Supabase Client
    urlObj.pathname = '/';
    supabaseUrl = urlObj.toString().replace(/\/+$/, '');
  } catch(e) {}
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
