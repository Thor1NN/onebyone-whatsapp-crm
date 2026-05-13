import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegram } from "@/lib/telegram/manager";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { botToken } = body;

    if (!botToken || typeof botToken !== "string") {
      return error("Bot token is required");
    }

    if (!botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return error("Invalid bot token format. Should be like: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ");
    }

    const result = await telegram.initialize(botToken);

    if (!result.success) {
      return error(result.error || "Failed to connect bot");
    }

    return success({
      message: "Telegram bot connected",
      botUsername: telegram.getBotUsername(),
    });
  } catch (err) {
    console.error("Telegram connect error:", err);
    return error("Failed to connect Telegram bot", 500);
  }
}
