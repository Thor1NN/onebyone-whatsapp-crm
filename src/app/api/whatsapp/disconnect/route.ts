import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { whatsapp } from "@/lib/whatsapp/manager";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    await whatsapp.disconnect();
    return success({ message: "WhatsApp disconnected" });
  } catch (err) {
    console.error("Disconnect error:", err);
    return error("Failed to disconnect", 500);
  }
}
