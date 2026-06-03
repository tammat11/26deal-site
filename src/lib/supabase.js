import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://xhsyvdflxfkywkuhwfwk.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gsCUZrj_9Nu-LRGg9sJI8w_iYPomAOH';

export const supabase = createClient(url, key);
