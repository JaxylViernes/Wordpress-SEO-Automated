

// // server/services/email-service.ts
// import nodemailer, { Transporter } from "nodemailer";

// const SMTP_USER = process.env.SMTP_USER!;         // your@gmail.com
// const SMTP_PASS = process.env.SMTP_PASS!;         // 16-char Gmail App Password
// const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER; // should equal SMTP_USER or a verified Gmail alias
// const REPLY_TO = process.env.REPLY_TO || FROM_EMAIL;

// const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// const norm = (s: string) => String(s || "").trim().toLowerCase();

// let transporter: Transporter | null = null;
// let verified = false;

// async function makeTransport(): Promise<Transporter> {
//   // Try 465 (SSL) first; fallback to 587 STARTTLS if needed
//   try {
//     const t465 = nodemailer.createTransport({
//       host: "smtp.gmail.com",
//       port: 465,
//       secure: true,
//       auth: { user: SMTP_USER, pass: SMTP_PASS },
//       tls: { servername: "smtp.gmail.com" },
//     });
//     await t465.verify();
//     console.log("📮 Gmail SMTP ready (465/SSL)");
//     return t465;
//   } catch (e) {
//     console.warn("⚠️ 465 verify failed, trying 587/STARTTLS:", (e as any)?.message || e);
//   }

//   const t587 = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     port: 587,
//     secure: false, // STARTTLS
//     auth: { user: SMTP_USER, pass: SMTP_PASS },
//     tls: { servername: "smtp.gmail.com" },
//   });
//   await t587.verify(); // throws if login fails
//   console.log("📮 Gmail SMTP ready (587/STARTTLS)");
//   return t587;
// }

// async function ensureTransport() {
//   if (!transporter) transporter = await makeTransport();
//   if (!verified) {
//     await transporter.verify();
//     verified = true;
//   }
// }

// function buildTextFromHtml(html: string) {
//   // very basic fallback text; good enough for transactional
//   return html.replace(/<style[\s\S]*?<\/style>/gi, "")
//              .replace(/<[^>]+>/g, "")
//              .replace(/\s{2,}/g, " ")
//              .trim();
// }

// function templatePasswordEmail(code: string) {
//   const preheader = `Your verification code is ${code}. It expires in 10 minutes.`;
//   const html = `
//   <!doctype html>
//   <html>
//   <head>
//     <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1">
//     <title>Password Reset Code</title>
//     <style>
//       /* minimal resets */
//       body { margin:0; padding:0; background:#f6f7f9; }
//       .container { max-width:560px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; }
//       .header { padding:20px 24px; font:700 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto; color:#111827; border-bottom:1px solid #edf2f7;}
//       .content { padding:24px; font:400 14px/1.6 system-ui, -apple-system, Segoe UI, Roboto; color:#111827; }
//       .code { background:#f3f4f6; border-radius:12px; padding:18px; text-align:center; font:700 28px/1 system-ui, -apple-system, Segoe UI, Roboto; letter-spacing:6px; }
//       .muted { color:#6b7280; font-size:12px; margin-top:12px; }
//       .footer { padding:16px 24px; color:#6b7280; font:400 12px/1.6 system-ui, -apple-system, Segoe UI, Roboto; text-align:center; }
//     </style>
//   </head>
//   <body>
//     <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
//       ${preheader}
//     </span>
//     <div style="padding:24px;">
//       <div class="container">
//         <div class="header">AI Content Manager</div>
//         <div class="content">
//           <p>Here is your verification code:</p>
//           <div class="code">${code}</div>
//           <p class="muted">This code expires in <b>10 minutes</b>. If you didn’t request it, you can safely ignore this email.</p>
//         </div>
//         <div class="footer">
//           This is an automated message. Replies to this address may not be monitored.
//         </div>
//       </div>
//     </div>
//   </body>
//   </html>`;
//   return { html, preheader };
// }

// async function sendWithRetry(mail: Parameters<Transporter["sendMail"]>[0]) {
//   await ensureTransport();

//   const attempts = 3;
//   let delay = 300;

//   for (let i = 0; i < attempts; i++) {
//     try {
//       const info = await transporter!.sendMail(mail);
//       console.log("✉️ Gmail SMTP accepted:", info.messageId, "→", mail.to);
//       return true;
//     } catch (err: any) {
//       const msg = err?.response || err?.message || String(err);
//       const code = err?.responseCode;
//       const transient = code && (code >= 400 && code < 500); // crude; Gmail 4xx often transient
//       console.warn(`⚠️ send attempt ${i + 1} failed:`, code, msg);

//       if (!transient || i === attempts - 1) {
//         // EAUTH (535) etc. -> no point retrying
//         throw err;
//       }
//       await new Promise(r => setTimeout(r, delay + Math.random() * 200));
//       delay *= 2;
//     }
//   }
//   return false;
// }

// async function send(toEmail: string, subject: string, html: string) {
//   const to = norm(toEmail);
//   if (!EMAIL_RE.test(to)) throw new Error("Invalid recipient email");

//   const text = buildTextFromHtml(html);

//   return sendWithRetry({
//     from: `AI Content Manager <${FROM_EMAIL}>`,
//     to,
//     subject,
//     text,
//     html,
//     replyTo: REPLY_TO,
//     headers: {
//       "Auto-Submitted": "auto-generated",
//       "X-Priority": "3 (Normal)",
//       "X-MSMail-Priority": "Normal",
//       Importance: "Normal",
//     },
//     // request DSN if supported; mostly ignored by Gmail but harmless
//     dsn: { id: undefined, return: "headers", notify: ["failure", "delay"], recipient: to },
//   });
// }

// export const emailService = {
//   async sendPasswordResetCode(toEmail: string, code: string) {
//     const { html } = templatePasswordEmail(code);
//     try {
//       return await send(toEmail, "Password Reset Code", html);
//     } catch (e: any) {
//       console.error("❌ Failed to send email:", e?.response || e?.message || e);
//       return false;
//     }
//   },
// };

// export default emailService;





// server/services/email-service.ts
import nodemailer, { Transporter } from "nodemailer";

const SMTP_USER = process.env.SMTP_USER!;         // your@gmail.com
const SMTP_PASS = process.env.SMTP_PASS!;         // 16-char Gmail App Password
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER; // should equal SMTP_USER or a verified Gmail alias
const REPLY_TO = process.env.REPLY_TO || FROM_EMAIL;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (s: string) => String(s || "").trim().toLowerCase();

let transporter: Transporter | null = null;
let verified = false;

async function makeTransport(): Promise<Transporter> {
  // Try 465 (SSL) first; fallback to 587 STARTTLS if needed
  try {
    const t465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { servername: "smtp.gmail.com" },
    });
    await t465.verify();
    console.log("📮 Gmail SMTP ready (465/SSL)");
    return t465;
  } catch (e) {
    console.warn("⚠️ 465 verify failed, trying 587/STARTTLS:", (e as any)?.message || e);
  }

  const t587 = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { servername: "smtp.gmail.com" },
  });
  await t587.verify(); // throws if login fails
  console.log("📮 Gmail SMTP ready (587/STARTTLS)");
  return t587;
}

async function ensureTransport() {
  if (!transporter) transporter = await makeTransport();
  if (!verified) {
    await transporter.verify();
    verified = true;
  }
}

function buildTextFromHtml(html: string) {
  // very basic fallback text; good enough for transactional
  return html.replace(/<style[\s\S]*?<\/style>/gi, "")
             .replace(/<[^>]+>/g, "")
             .replace(/\s{2,}/g, " ")
             .trim();
}

function templatePasswordEmail(code: string) {
  const preheader = `Your verification code is ${code}. It expires in 10 minutes.`;
  const html = `
  <!doctype html>
  <html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Reset Code</title>
    <style>
      /* minimal resets */
      body { margin:0; padding:0; background:#f6f7f9; }
      .container { max-width:560px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; }
      .header { padding:20px 24px; font:700 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto; color:#111827; border-bottom:1px solid #edf2f7;}
      .content { padding:24px; font:400 14px/1.6 system-ui, -apple-system, Segoe UI, Roboto; color:#111827; }
      .code { background:#f3f4f6; border-radius:12px; padding:18px; text-align:center; font:700 28px/1 system-ui, -apple-system, Segoe UI, Roboto; letter-spacing:6px; }
      .muted { color:#6b7280; font-size:12px; margin-top:12px; }
      .footer { padding:16px 24px; color:#6b7280; font:400 12px/1.6 system-ui, -apple-system, Segoe UI, Roboto; text-align:center; }
    </style>
  </head>
  <body>
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${preheader}
    </span>
    <div style="padding:24px;">
      <div class="container">
        <div class="header">AI Content Manager</div>
        <div class="content">
          <p>Here is your verification code:</p>
          <div class="code">${code}</div>
          <p class="muted">This code expires in <b>10 minutes</b>. If you didn't request it, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          This is an automated message. Replies to this address may not be monitored.
        </div>
      </div>
    </div>
  </body>
  </html>`;
  return { html, preheader };
}

function templateVerificationEmail(code: string) {
  const preheader = `Your email verification code is ${code}. It expires in 10 minutes.`;
  const html = `
  <!doctype html>
  <html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Email Verification Code</title>
    <style>
      /* minimal resets */
      body { margin:0; padding:0; background:#f6f7f9; }
      .container { max-width:560px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; }
      .header { padding:20px 24px; font:700 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto; color:#111827; border-bottom:1px solid #edf2f7;}
      .content { padding:24px; font:400 14px/1.6 system-ui, -apple-system, Segoe UI, Roboto; color:#111827; }
      .code { background:#f3f4f6; border-radius:12px; padding:18px; text-align:center; font:700 28px/1 system-ui, -apple-system, Segoe UI, Roboto; letter-spacing:6px; }
      .muted { color:#6b7280; font-size:12px; margin-top:12px; }
      .footer { padding:16px 24px; color:#6b7280; font:400 12px/1.6 system-ui, -apple-system, Segoe UI, Roboto; text-align:center; }
    </style>
  </head>
  <body>
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${preheader}
    </span>
    <div style="padding:24px;">
      <div class="container">
        <div class="header">Welcome to AI Content Manager</div>
        <div class="content">
          <p>Please verify your email address by entering this code:</p>
          <div class="code">${code}</div>
          <p class="muted">This code expires in <b>10 minutes</b>. If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          This is an automated message. Replies to this address may not be monitored.
        </div>
      </div>
    </div>
  </body>
  </html>`;
  return { html, preheader };
}

async function sendWithRetry(mail: Parameters<Transporter["sendMail"]>[0]) {
  await ensureTransport();

  const attempts = 3;
  let delay = 300;

  for (let i = 0; i < attempts; i++) {
    try {
      const info = await transporter!.sendMail(mail);
      console.log("✉️ Gmail SMTP accepted:", info.messageId, "→", mail.to);
      return true;
    } catch (err: any) {
      const msg = err?.response || err?.message || String(err);
      const code = err?.responseCode;
      const transient = code && (code >= 400 && code < 500); // crude; Gmail 4xx often transient
      console.warn(`⚠️ send attempt ${i + 1} failed:`, code, msg);

      if (!transient || i === attempts - 1) {
        // EAUTH (535) etc. -> no point retrying
        throw err;
      }
      await new Promise(r => setTimeout(r, delay + Math.random() * 200));
      delay *= 2;
    }
  }
  return false;
}

async function send(toEmail: string, subject: string, html: string) {
  const to = norm(toEmail);
  if (!EMAIL_RE.test(to)) throw new Error("Invalid recipient email");

  const text = buildTextFromHtml(html);

  return sendWithRetry({
    from: `AI Content Manager <${FROM_EMAIL}>`,
    to,
    subject,
    text,
    html,
    replyTo: REPLY_TO,
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Priority": "3 (Normal)",
      "X-MSMail-Priority": "Normal",
      Importance: "Normal",
    },
    // request DSN if supported; mostly ignored by Gmail but harmless
    dsn: { id: undefined, return: "headers", notify: ["failure", "delay"], recipient: to },
  });
}

export const emailService = {
  async sendPasswordResetCode(toEmail: string, code: string) {
    const { html } = templatePasswordEmail(code);
    try {
      return await send(toEmail, "Password Reset Code", html);
    } catch (e: any) {
      console.error("❌ Failed to send password reset email:", e?.response || e?.message || e);
      return false;
    }
  },

  async sendVerificationCode(toEmail: string, code: string) {
    const { html } = templateVerificationEmail(code);
    try {
      return await send(toEmail, "Email Verification Code", html);
    } catch (e: any) {
      console.error("❌ Failed to send verification email:", e?.response || e?.message || e);
      return false;
    }
  }
};

export default emailService;