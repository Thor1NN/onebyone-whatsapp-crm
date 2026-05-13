import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegramUser } from "@/lib/telegram/user-client";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const { password } = await req.json();
    if (!password) return error("Password is required");

    const result = await telegramUser.submitPassword(password);
    if (!result.success) return error(result.error || "Failed to submit password");

    await new Promise((r) => setTimeout(r, 1500));
    return success(telegramUser.getInfo());
  } catch (err) {
    console.error("auth-password error:", err);
    return error("Failed to submit password", 500);
  }
}
