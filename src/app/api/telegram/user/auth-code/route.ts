import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegramUser } from "@/lib/telegram/user-client";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const { code } = await req.json();
    if (!code) return error("Code is required");

    const result = await telegramUser.submitCode(String(code));
    if (!result.success) return error(result.error || "Failed to submit code");

    // Give it a moment to process
    await new Promise((r) => setTimeout(r, 1500));
    return success(telegramUser.getInfo());
  } catch (err) {
    console.error("auth-code error:", err);
    return error("Failed to submit code", 500);
  }
}
