import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendNotificationEmail({
  to,
  displayName,
  title,
  content,
  actionUrl,
}: {
  to: string;
  displayName: string;
  title: string;
  content: string;
  actionUrl: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY absente — email non envoyé");
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Meet & Match <notifications@meet-and-match.app>";

  const safeTitle = escapeHtml(title);
  const safeContent = escapeHtml(content);
  const safeName = escapeHtml(displayName);

  await resend.emails.send({
    from,
    to,
    subject: `${title} — Meet & Match`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#2e1a47">
        <p style="color:#6b5f7a;font-size:14px">Bonjour ${safeName},</p>
        <h1 style="font-size:20px;margin:0 0 12px">${safeTitle}</h1>
        <p style="line-height:1.6;font-size:15px;margin:0 0 24px">${safeContent}</p>
        <a href="${actionUrl}" style="display:inline-block;background:linear-gradient(90deg,#7b3d8f,#e91e8c);color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;font-size:14px">
          Ouvrir dans l'application
        </a>
        <p style="margin-top:32px;font-size:12px;color:#9b8fa8">
          Vous recevez cet email car une activité a eu lieu sur votre compte Meet &amp; Match.
          Gérez vos préférences depuis Paramètres → Notifications.
        </p>
      </div>
    `,
  });
}
