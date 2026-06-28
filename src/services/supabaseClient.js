import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ceeeqzdhtywinkwwkxfh.supabase.co';
const supabaseAnonKey = 'sb_publishable_w1Mcrm3g9kNx6EUj3dxjkw_9Mr8vfEW';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
