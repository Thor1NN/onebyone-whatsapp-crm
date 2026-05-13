import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegram } from "@/lib/telegram/manager";
import { success, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  await telegram.disconnect();

  return success({ message: "Telegram bot disconnected" });
}
