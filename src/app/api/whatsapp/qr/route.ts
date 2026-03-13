import { whatsappManager } from "@/lib/whatsapp/manager";
import QRCode from "qrcode";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const qr = whatsappManager.getQR();
  const status = whatsappManager.getStatus();

  if (status === "connected") {
    return NextResponse.json({ status: "connected" });
  }

  if (status === "error") {
    return NextResponse.json({ status: "error" });
  }

  if (!qr) {
    return NextResponse.json({ status: status || "loading" });
  }

  try {
    const qrImage = await QRCode.toDataURL(qr);
    return NextResponse.json({ 
      status: "qr", 
      qr: qrImage 
    });
  } catch {
    return NextResponse.json({ status: "error", message: "Failed to generate QR" }, { status: 500 });
  }
}
