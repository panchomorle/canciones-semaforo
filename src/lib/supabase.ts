import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wokcfinjefvpwqetvgsk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indva2NmaW5qZWZ2cHdxZXR2Z3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDEwOTMsImV4cCI6MjEwNTMxNzA5M30.iX6FFCzx5x-wL_fScwoU5UPcdTDBEob7ahESsPJFL5c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
