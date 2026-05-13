import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegramUser } from "@/lib/telegram/user-client";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const { apiId, apiHash, phoneNumber } = await req.json();

    if (!apiId || !apiHash || !phoneNumber) {
      return error("API ID, API Hash, and phone number are required");
    }
    if (!/^\d+$/.test(String(apiId))) {
      return error("API ID must be a number");
    }

    const result = await telegramUser.startAuth(String(apiId), apiHash, phoneNumber);
    if (!result.success) return error(result.error || "Failed to start auth");

    return success({ message: "Verification code sent to your Telegram app" });
  } catch (err) {
    console.error("auth-start error:", err);
    return error("Failed to start authentication", 500);
  }
}
