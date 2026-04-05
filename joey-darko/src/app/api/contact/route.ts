import { postContact } from "@/controllers/contactController";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return postContact(request);
}
