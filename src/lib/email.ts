import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | undefined;

export function appUrl(path = "/"): string {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
}

export async function sendEmail(msg: { to: string | string[]; subject: string; text: string }) {
  const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
  if (!to) return;

  if (!process.env.SMTP_HOST) {
    console.log(`\n[email] (SMTP not configured, not sent)\nTo: ${to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject: msg.subject,
      text: msg.text,
    });
  } catch (err) {
    console.error("[email] failed to send", err);
  }
}
