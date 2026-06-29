require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: orders } = await supabaseAdmin.from("orders").select("id, status").limit(1);
  if (!orders || orders.length === 0) return console.log("No orders found");
  
  const originalStatus = orders[0].status;
  
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "order packaged" })
    .eq("id", orders[0].id)
    .select();

  console.log("Error:", error);
  
  if (!error) {
    console.log("Successfully updated to a new status. Reverting...");
    await supabaseAdmin.from("orders").update({ status: originalStatus }).eq("id", orders[0].id);
  }
}

test();
