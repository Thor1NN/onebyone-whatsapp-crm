import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegramUser } from "@/lib/telegram/user-client";
import { success, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  await telegramUser.disconnect();
  return success({ message: "Disconnected" });
}
