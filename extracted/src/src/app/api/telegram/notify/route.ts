import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/* ============================================================
   POST /api/telegram/notify
   Telegram bot notification scaffold (Priority #27).
   Sends a message to a Telegram chat via bot API.
   Requires TELEGRAM_BOT_TOKEN env var.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, message } = body;

    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // If no bot token configured, just log (scaffold mode)
    if (!botToken) {
      console.log("[Telegram Notify — Scaffold]", { chatId: chatId || "default", message: message.substring(0, 100) });
      return NextResponse.json({
        success: true,
        delivered: false,
        message: "Telegram bot not configured (TELEGRAM_BOT_TOKEN missing). Message logged.",
      });
    }

    // Send via Telegram Bot API
    const defaultChatId = chatId || process.env.TELEGRAM_DEFAULT_CHAT_ID;
    if (!defaultChatId) {
      return NextResponse.json({ error: "chatId required (no default configured)" }, { status: 400 });
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: defaultChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return NextResponse.json({ success: true, delivered: true, messageId: data.result?.message_id });
    } else {
      return NextResponse.json({ success: false, error: data.description }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ============================================================
   GET /api/telegram/notify — get webhook info
   ============================================================ */

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  return NextResponse.json({
    configured: !!botToken,
    message: botToken ? "Telegram bot is configured" : "Telegram bot not configured. Set TELEGRAM_BOT_TOKEN env var.",
  });
}
