// lib/mailer.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendInviteEmail(to: string, inviteUrl: string, orgName: string) {
	const msg = {
		to,
		from: process.env.MAIL_FROM!,
		subject: `Invitaciones para especialistas — ${orgName}`,
		html: `<p>Su pago fue validado. Comparta este link con sus especialistas para que se registren:</p>
           <p><a href="${inviteUrl}">${inviteUrl}</a></p>
           <p>Si necesita más links, contacte a soporte.</p>`,
	};
	await sgMail.send(msg);
}
