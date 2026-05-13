import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegramUser } from "@/lib/telegram/user-client";
import { success, error, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  if (!telegramUser.isConnected()) {
    return error("Telegram user account not connected");
  }

  try {
    const groups = await telegramUser.listGroups();
    return success(groups);
  } catch (err) {
    console.error("list groups error:", err);
    return error("Failed to list groups", 500);
  }
}
