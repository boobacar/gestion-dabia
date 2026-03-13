import {
  DisconnectReason,
  useMultiFileAuthState as useBaileysAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeWASocket,
  proto,
  Browsers
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs";
import { createAdminClient } from "../supabase/admin";

/**
 * --- NUCLEAR STABILITY SYSTEM V8.8 (LAZY SURVIVAL) ---
 * Ultimate version designed to survive Next.js build crashes.
 * Deffers everything until explicit user interaction.
 */

const SESSION_PATH = path.join(process.cwd(), "whatsapp-session-v8-final");
const LOG_FILE = path.join(process.cwd(), "whatsapp-v8.log");
const SYSTEM_KEY = "DABIA_WHATSAPP_SYSTEM";

const g = global as any;

function logToFile(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
  console.log(msg);
}

// Security: Prevent any action during server boot
if (!g[SYSTEM_KEY]) {
  logToFile(`[WA] V9.0 Robust System Initialized.`);
  g[SYSTEM_KEY] = { sockets: {}, manager: null };
}

class WhatsAppManager {
  private sock: WASocket | null = null;
  private qr: string | null = null;
  private connectionStatus: "connecting" | "connected" | "disconnected" | "error" | "qr" = "disconnected";
  private isLoggingOut = false;
  private isDestroyed = false;
  private initPromise: Promise<void> | null = null;
  public readonly instanceId = Math.random().toString(36).substring(7);

  constructor() {
    logToFile(`[WA] Manager Instance [${this.instanceId}] created.`);
    if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });
  }

  public async init(force = false) {
    if (this.isDestroyed) return;
    if (this.initPromise && !force) return this.initPromise;

    this.initPromise = (async () => {
      if (this.isDestroyed) return;
      if (!force && (this.connectionStatus === "connecting" || this.connectionStatus === "connected")) {
        return;
      }

      logToFile(`[WA][${this.instanceId}] Session init requested.`);
      
      try {
        await this.destroySocket();
        
        if (force) {
          logToFile(`[WA][${this.instanceId}] Forced folder purge.`);
          if (fs.existsSync(SESSION_PATH)) fs.rmSync(SESSION_PATH, { recursive: true, force: true });
          fs.mkdirSync(SESSION_PATH, { recursive: true });
        }

        const { state, saveCreds } = await useBaileysAuthState(SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion().catch(() => ({ 
          version: [2, 3000, 1015901307] as [number, number, number] 
        }));

        if (this.isDestroyed) return;

        this.sock = makeWASocket({
          version,
          auth: state,
          logger: pino({ level: "silent" }),
          printQRInTerminal: false,
          browser: Browsers.macOS("DABIA Premium"), 
          connectTimeoutMs: 60000,
          generateHighQualityLinkPreview: true,
        });

        g[SYSTEM_KEY].sockets[this.instanceId] = this.sock;

        this.sock.ev.on("creds.update", saveCreds);
        this.sock.ev.on("messages.upsert", async (u) => {
          if (this.isDestroyed) return;
          if (u.type === "notify") {
            for (const m of u.messages) {
              if (!this.isDestroyed) await this.saveMessageToDb(m);
            }
          }
        });

        this.sock.ev.on("connection.update", (u) => {
          if (this.isDestroyed) return;
          const { connection, lastDisconnect, qr } = u;
          
          if (qr) {
            this.qr = qr;
            this.connectionStatus = "qr";
          }

          if (connection === "close") {
            const error = lastDisconnect?.error as Boom;
            const code = error?.output?.statusCode;
            
            // Only reconnect for specific reasons, or if we don't have a code but it's not a deliberate logout
            const isLogout = code === DisconnectReason.loggedOut || this.isLoggingOut;
            const shouldReconnect = !isLogout && !this.isDestroyed;
            
            logToFile(`[WA][${this.instanceId}] Connection closed. Code: ${code}, Reason: ${error?.message || "unknown"}.`);
            
            this.sock = null;
            this.qr = null;
            this.connectionStatus = isLogout ? "disconnected" : "error";
            delete g[SYSTEM_KEY].sockets[this.instanceId];

            if (shouldReconnect) {
              const delay = code ? 15000 : 30000; // Longer delay for unknown errors
              logToFile(`[WA][${this.instanceId}] Scheduling reconnect in ${delay}ms.`);
              setTimeout(() => { if (!this.isDestroyed) this.init(); }, delay);
            }
          } else if (connection === "open") {
            logToFile(`[WA][${this.instanceId}] Connected successfully! ✅`);
            this.connectionStatus = "connected";
            this.qr = null;
          }
        });
      } catch (err) {
        logToFile(`[WA][${this.instanceId}] Error during init: ${err}`);
        this.connectionStatus = "error";
      }
    })();

    const p = this.initPromise;
    if (p) {
        p.finally(() => { 
            if (this.initPromise === p) this.initPromise = null; 
        }).catch(e => {
            logToFile(`[WA][${this.instanceId}] Promise failure: ${e}`);
        });
    }
    return p;
  }

  public async destroySocket() {
    if (!this.sock) return;
    try {
      logToFile(`[WA][${this.instanceId}] Destroying socket...`);
      this.sock.ev.removeAllListeners("connection.update");
      this.sock.ev.removeAllListeners("creds.update");
      this.sock.ev.removeAllListeners("messages.upsert");
      
      const s = this.sock as any;
      if (s.ws) {
        // Remove error listeners to prevent uncaughtException during close
        s.ws.removeAllListeners("error");
        s.ws.on("error", () => {}); // No-op
        
        if (s.ws.terminate) {
          s.ws.terminate();
        } else if (s.ws.close) {
          s.ws.close();
        }
      }
      if (s.end) s.end(undefined);
    } catch (e) {
      logToFile(`[WA][${this.instanceId}] Error in destroySocket: ${e}`);
    } finally {
      this.sock = null;
      delete g[SYSTEM_KEY].sockets[this.instanceId];
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.destroySocket();
  }

  public async logout() {
    this.isLoggingOut = true;
    logToFile(`[WA][${this.instanceId}] User requested logout.`);
    await this.destroySocket();
    if (fs.existsSync(SESSION_PATH)) fs.rmSync(SESSION_PATH, { recursive: true, force: true });
    this.connectionStatus = "disconnected";
    this.qr = null;
    this.isLoggingOut = false;
    setTimeout(() => { if (!this.isDestroyed) this.init(true); }, 2000);
  }

  public getStatus() { return this.connectionStatus; }
  public getQR() { return this.qr; }

  public async sendMessage(to: string, text: string) {
    if (this.connectionStatus !== "connected" || !this.sock) throw new Error("WhatsApp non connecté");
    const jid = `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
  }

  public async sendDocument(to: string, buffer: Buffer, fileName: string, caption?: string) {
    if (this.connectionStatus !== "connected" || !this.sock) throw new Error("WhatsApp non connecté");
    const jid = `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, {
      document: buffer,
      mimetype: "application/pdf",
      fileName,
      caption
    });
  }

  private async saveMessageToDb(msg: proto.IWebMessageInfo) {
    try {
      const jid = msg.key.remoteJid;
      if (!jid || jid === "status@broadcast") return;
      const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "[Média]";
      if (!body) return;
      const supabase = createAdminClient();
      let { data: chat } = await supabase.from("whatsapp_chats").select("id").eq("remote_jid", jid).single();
      if (!chat) {
        const phone = jid.split("@")[0];
        const { data: p } = await supabase.from("patients").select("id").ilike("phone_number", `%${phone}`).limit(1).single();
        const { data: nc } = await supabase.from("whatsapp_chats").insert({
          remote_jid: jid,
          patient_id: p?.id || null,
          last_message: body,
          last_message_at: new Date().toISOString()
        }).select("id").single();
        chat = nc;
      } else {
        await supabase.from("whatsapp_chats").update({ last_message: body, last_message_at: new Date().toISOString() }).eq("id", chat.id);
      }
      await supabase.from("whatsapp_messages").upsert({
        chat_id: chat.id,
        wa_message_id: msg.key.id!,
        content: body,
        from_me: !!msg.key.fromMe,
        timestamp: new Date().toISOString(),
        status: "sent"
      });
    } catch (e) {}
  }
}

// Singleton persistence logic
if (!g[SYSTEM_KEY].manager) {
  logToFile(`[WA] Creating new WhatsAppManager singleton.`);
  g[SYSTEM_KEY].manager = new WhatsAppManager();
}

export const whatsappManager = g[SYSTEM_KEY].manager as WhatsAppManager;
