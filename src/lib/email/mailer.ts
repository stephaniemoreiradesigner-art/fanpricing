import nodemailer from 'nodemailer'

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === 'true'

  if (!host || !user || !pass) {
    throw new Error('Configurações SMTP ausentes. Defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env')
  }

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

export async function sendEmail({
  to,
  subject,
  html,
  cc,
}: {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
}) {
  const from = process.env.EMAIL_FROM ?? `"FanPricing" <noreply@fanpricing.com.br>`
  const transporter = createTransport()
  await transporter.sendMail({ from, to, subject, html, ...(cc ? { cc } : {}) })
}
