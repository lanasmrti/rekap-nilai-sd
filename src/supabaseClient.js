import { createClient } from "@supabase/supabase-js";

// Perhatikan perubahannya: menggunakan process.env dan REACT_APP_
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
