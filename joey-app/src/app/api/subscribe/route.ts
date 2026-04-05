import { postSubscribe } from "@/controllers/subscribeController";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return postSubscribe(request);
}
