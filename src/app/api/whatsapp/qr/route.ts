import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { whatsapp } from "@/lib/whatsapp/manager";
import { success, error, unauthorized } from "@/lib/api-response";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const status = whatsapp.getStatus();
  const qr = whatsapp.getQRCode();
  const phone = whatsapp.getPhoneNumber();

  let qrImage: string | null = null;
  if (qr) {
    qrImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
  }

  return success({ status, qrImage, phoneNumber: phone });
}

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    if (whatsapp.isConnected()) {
      return success({ status: "CONNECTED", message: "Already connected" });
    }

    whatsapp.initialize().catch(console.error);

    return success({ status: "QR_WAITING", message: "Initializing WhatsApp..." });
  } catch (err) {
    console.error("WhatsApp init error:", err);
    return error("Failed to initialize WhatsApp", 500);
  }
}
