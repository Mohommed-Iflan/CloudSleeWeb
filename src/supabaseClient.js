import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bewdtedexomudpelsrxj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJld2R0ZWRleG9tdWRwZWxzcnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2OTU1MDQsImV4cCI6MjA4NjI3MTUwNH0.7lRWrwqN8-0If8NEmQfIiZkp_fYbDV0PULYk_cTAxlg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);