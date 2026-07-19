import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
supabase.from('products').select('*').then(({ data, error }) => {
  if (error) console.error(error);
  else fs.writeFileSync('C:/Users/sarko/.gemini/antigravity-ide/brain/18a55c82-fd05-4f7c-9423-ab740536e309/scratch/products.json', JSON.stringify(data, null, 2));
});
