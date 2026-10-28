import { createClient } from "@supabase/supabase-js";
import { getUserFromBearer } from "@/lib/adminRequestAuth";

export async function isDhlOperator(request: Request): Promise<boolean> {
  const user = await getUserFromBearer(request);
  if (!user?.email) return false;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin.from("admin_operator_emails").select("email").eq("email", user.email.trim().toLowerCase()).maybeSingle();
  return !error && !!data;
}
