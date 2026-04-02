import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAdminPassword() {
  const password = 'admin123';
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  console.log('Generated hash:', hashedPassword);
  
  const { data, error } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword })
    .eq('email', 'admin@pucit.edu.pk')
    .select();
    
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  } else {
    console.log('Admin password updated successfully!');
    console.log('Data:', data);
    process.exit(0);
  }
}

fixAdminPassword();
