import { whatsappManager } from "@/lib/whatsapp/manager";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
