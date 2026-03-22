import nodemailer from "nodemailer"

export interface EmailToolInput {
    to: string
    subject: string
    body: string
}

function getTransportConfig() {
    const user = process.env.EMAIL_USER
    const pass = process.env.EMAIL_PASS

    if (!user || !pass) {
        throw new Error("Email credentials are not configured")
    }

    const host = process.env.EMAIL_HOST ?? "smtp.gmail.com"
    const port = Number.parseInt(process.env.EMAIL_PORT ?? "587", 10)

    return {
        from: process.env.EMAIL_FROM ?? user,
        transport: nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        }),
    }
}

export async function emailTool(input: EmailToolInput) {
    const { transport, from } = getTransportConfig()
    const info = await transport.sendMail({
        from: `"WorkingGent" <${from}>`,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1a1a1a;max-width:640px;margin:0 auto;padding:24px">${input.body.replace(/\n/g, "<br/>")}</div>`,
    })

    return {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
    }
}
