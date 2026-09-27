import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://exmbiprgddrhldvmblwd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tkJbNj06G6QRs7XaS6d_nw_sKwuPVd0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)