import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqgctxgiajlfifppfer.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zy-lQ20-ZUrw4eKtsqRoUA_j3rTZMno';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);