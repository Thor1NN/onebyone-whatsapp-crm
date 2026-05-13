import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { telegram } from "@/lib/telegram/manager";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  return success({
    status: telegram.getStatus(),
    botUsername: telegram.getBotUsername(),
  });
}
