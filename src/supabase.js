import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://eunqeeaelzpxvqupfnrp.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bnFlZWFlbHpweHZxdXBmbnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTI4NzUsImV4cCI6MjA4ODE2ODg3NX0.dwo0PKv3HXezNsQpMfRB_pUKNUpxF1xDqX0gYAgVTjI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
