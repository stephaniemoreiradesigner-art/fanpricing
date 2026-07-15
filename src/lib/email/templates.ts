function baseLayout(content: string, opts: { brandColor: string; companyName: string }) {
  const { brandColor, companyName } = opts
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${companyName}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${brandColor};padding:28px 40px;text-align:center;">
              <span style="display:inline-block;width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.2);line-height:44px;font-size:20px;font-weight:700;color:#fff;">
                ${companyName.charAt(0).toUpperCase()}
              </span>
              <p style="margin:12px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${companyName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Este e-mail foi enviado por ${companyName}. Não responda a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function confirmationEmailTemplate(opts: {
  fullName: string
  confirmationUrl: string
  brandColor: string
  companyName: string
}) {
  const { fullName, confirmationUrl, brandColor, companyName } = opts
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Bem-vindo, ${fullName}!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Seu cadastro foi recebido em <strong>${companyName}</strong>. Para ativar o seu acesso,
      clique no botão abaixo para confirmar seu e-mail.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b7280;line-height:1.6;">
      Após a confirmação, um administrador irá liberar o seu acesso ao sistema.
    </p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${confirmationUrl}"
         style="display:inline-block;padding:14px 32px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
        Confirmar e-mail
      </a>
    </div>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      O link expira em 24 horas. Se você não criou esta conta, ignore este e-mail.
    </p>`
  return baseLayout(content, { brandColor, companyName })
}

export function passwordResetEmailTemplate(opts: {
  fullName: string
  resetUrl: string
  brandColor: string
  companyName: string
}) {
  const { fullName, resetUrl, brandColor, companyName } = opts
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Redefinir senha</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Olá${fullName ? `, ${fullName}` : ''}! Recebemos uma solicitação para redefinir a senha
      da sua conta em <strong>${companyName}</strong>.
    </p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${resetUrl}"
         style="display:inline-block;padding:14px 32px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
        Redefinir minha senha
      </a>
    </div>
    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">
      O link expira em 1 hora.
    </p>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.
    </p>`
  return baseLayout(content, { brandColor, companyName })
}

// ---- Fase 4: aprovação de desconto -----------------------------------------

// E-mail enviado aos administradores quando um desconto <32% de margem é solicitado.
export function discountRequestEmailTemplate(opts: {
  requesterName: string
  discountPct: number
  marginPct: number // fração (0.28 = 28%)
  justification: string
  approvalUrl: string
  brandColor: string
  companyName: string
}) {
  const { requesterName, discountPct, marginPct, justification, approvalUrl, brandColor, companyName } = opts
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Aprovação de desconto solicitada</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      <strong>${requesterName || 'Um usuário'}</strong> solicitou um desconto que reduz a margem abaixo do limite.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px;color:#374151;">
      <tr><td style="padding:6px 0;">Desconto solicitado</td><td style="padding:6px 0;text-align:right;font-weight:700;">${discountPct}%</td></tr>
      <tr><td style="padding:6px 0;">Margem resultante</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#dc2626;">${(marginPct * 100).toFixed(1)}%</td></tr>
    </table>
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Justificativa:</p>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px 14px;white-space:pre-wrap;">${justification}</p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${approvalUrl}"
         style="display:inline-block;padding:14px 32px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
        Aprovar ou recusar
      </a>
    </div>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      Você também pode acessar pelo sino de notificações dentro do sistema.
    </p>`
  return baseLayout(content, { brandColor, companyName })
}

// E-mail enviado ao solicitante quando o desconto é aprovado ou recusado.
export function discountDecisionEmailTemplate(opts: {
  requesterName: string
  approved: boolean
  discountPct: number
  reviewerName: string
  decisionReason?: string | null
  quoteUrl: string
  brandColor: string
  companyName: string
}) {
  const { requesterName, approved, discountPct, reviewerName, decisionReason, quoteUrl, brandColor, companyName } = opts
  const titulo = approved ? 'Desconto aprovado' : 'Desconto recusado'
  const cor = approved ? '#16a34a' : '#dc2626'
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${cor};">${titulo}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      Olá${requesterName ? `, ${requesterName}` : ''}! Sua solicitação de desconto de <strong>${discountPct}%</strong>
      foi <strong style="color:${cor};">${approved ? 'aprovada' : 'recusada'}</strong> por ${reviewerName || 'um administrador'}.
    </p>
    ${
      !approved && decisionReason
        ? `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Motivo:</p>
           <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px 14px;white-space:pre-wrap;">${decisionReason}</p>`
        : ''
    }
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${quoteUrl}"
         style="display:inline-block;padding:14px 32px;background:${brandColor};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
        Ver orçamento
      </a>
    </div>`
  return baseLayout(content, { brandColor, companyName })
}
