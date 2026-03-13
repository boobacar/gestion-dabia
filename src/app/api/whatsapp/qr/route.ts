import { whatsappManager } from "@/lib/whatsapp/manager";
import QRCode from "qrcode";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BRIDGE_URL = process.env.NEXT_PUBLIC_WA_BRIDGE_URL;

export async function GET() {
  let qr: string | null = null;
  let status: string = "loading";

  if (BRIDGE_URL) {
    try {
      const res = await fetch(`${BRIDGE_URL}/status`);
      const data = await res.json();
      status = data.status;
      if (data.hasQR) {
        const qrRes = await fetch(`${BRIDGE_URL}/qr`);
        const qrData = await qrRes.json();
        qr = qrData.qr;
      }
    } catch (err) {
      status = "error";
    }
  } else {
    qr = whatsappManager.getQR();
    status = whatsappManager.getStatus();
  }

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
