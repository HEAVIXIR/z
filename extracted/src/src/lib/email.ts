/* ============================================================
   HEAVIX email utility — production-ready signature, sandbox-safe.
   ------------------------------------------------------------
   In production: configure SMTP env vars (SMTP_HOST, SMTP_PORT,
   SMTP_USER, SMTP_PASS, SMTP_FROM) and install `nodemailer`, then
   `sendVerificationEmail` will route through SMTP. Otherwise
   (dev/sandbox), the code is logged to the server console so the
   developer can read it from `dev.log` and complete the
   verification flow.
   ============================================================ */

export interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 0;
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM =
  process.env.SMTP_FROM ?? "HEAVIX <no-reply@havix.local>";

export const isSmtpConfigured = (): boolean =>
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

/** Low-level send. Falls back to console logging when SMTP is not set. */
export async function sendEmail(args: SendEmailArgs): Promise<void> {
  if (!isSmtpConfigured()) {
    // ── Dev / sandbox fallback ──────────────────────────────────
    // Print a clearly-delimited block so the code can be picked out
    // of `dev.log` while developing without a real SMTP server.
    console.log(
      [
        "────────────── [HEAVIX EMAIL — DEV FALLBACK] ──────────────",
        `To:      ${args.to}`,
        `From:    ${SMTP_FROM}`,
        `Subject: ${args.subject}`,
        "Body:",
        args.text,
        "───────────────────────────────────────────────────────────",
      ].join("\n"),
    );
    return;
  }

  // ── Production: lazy-load nodemailer so the dependency is only
  //    required when SMTP is actually configured. The dynamic
  //    import keeps this module working in the sandbox where
  //    nodemailer isn't installed. ─────────────────────────────
  try {
    const mod = (await import("nodemailer")) as typeof import("nodemailer");
    const transporter = mod.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: SMTP_FROM,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html ?? args.text,
    });
  } catch (err) {
    // Log but don't throw — verification codes shouldn't take down
    // the request. The caller still returns the devCode in dev mode.
    console.error("[HEAVIX EMAIL] send failed:", err);
  }
}

/** Send a 6-digit email verification code to the user. */
export async function sendVerificationEmail(
  email: string,
  code: string,
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "کد تأیید ایمیل — HEAVIX",
    text: [
      "با سلام،",
      "",
      `کد تأیید ایمیل شما در هویکس: ${code}`,
      "",
      "این کد تا ۱۰ دقیقه معتبر است.",
      "اگر شما این درخواست را ارسال نکرده‌اید، این پیام را نادیده بگیرید.",
      "",
      "— تیم هویکس",
    ].join("\n"),
    html: `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h2 style="color:#F58220;margin:0 0 16px">HEAVIX — تأیید ایمیل</h2>
        <p style="font-size:14px;color:#333">با سلام،</p>
        <p style="font-size:14px;color:#333">کد تأیید ایمیل شما:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0b0b0b;text-align:center;background:#fafafa;border:1px dashed #ddd;border-radius:8px;padding:16px;margin:16px 0">${code}</p>
        <p style="font-size:12px;color:#888">این کد تا ۱۰ دقیقه معتبر است.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
        <p style="font-size:11px;color:#aaa">اگر شما این درخواست را ارسال نکرده‌اید، این پیام را نادیده بگیرید.</p>
      </div>
    `,
  });
}
