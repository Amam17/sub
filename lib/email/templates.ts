// lib/email/templates.ts
//
// Wraps the plain-text body already stored on email_logs (written
// by notify()) in a simple branded HTML shell. Keeping the stored
// content as plain text means the in-app notification and the
// email body stay a single source of truth — this only affects
// how it's presented when actually sent.

const BRAND_PRIMARY = "#2563EB";
const BRAND_DEEP = "#1D4ED8";

export function renderEmailHtml(params: {
  subject: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://subshare.com";
  const paragraphs = params.body
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("");

  const cta = params.ctaUrl
    ? `<tr><td style="padding-top:8px;">
         <a href="${params.ctaUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">
           ${escapeHtml(params.ctaLabel ?? "View Details")}
         </a>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,${BRAND_DEEP},${BRAND_PRIMARY});padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:800;">SubShare</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;color:#0a0a0b;font-size:18px;font-weight:700;">${escapeHtml(params.subject)}</h1>
                ${paragraphs}
                <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;color:#64748b;font-size:12px;">
                  SubShare · Find. Pay. Use. · <a href="${appUrl}" style="color:#64748b;">${appUrl.replace(/^https?:\/\//, "")}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
