import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { whatsapp } from "@/lib/whatsapp/manager";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  return success({
    status: whatsapp.getStatus(),
    phoneNumber: whatsapp.getPhoneNumber(),
    isConnected: whatsapp.isConnected(),
  });
}
