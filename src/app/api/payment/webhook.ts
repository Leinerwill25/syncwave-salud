// pages/api/payment/webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import prisma from '../../../lib/prisma';
import { sendInviteEmail } from '../../../lib/mailer';
import jwt from 'jsonwebtoken';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

export const config = { api: { bodyParser: false } };

async function buffer(req: any) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const sig = req.headers['stripe-signature']!;
	const buf = await buffer(req);
	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(buf.toString(), sig as string, process.env.STRIPE_WEBHOOK_SECRET!);
	} catch (err) {
		return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session;
		const orgId = session.metadata?.organizationId;
		const userId = session.metadata?.userId;
		const planSlug = session.metadata?.planSlug;

		// crear subscription en DB
		await prisma.subscription.create({
			data: {
				organizationId: orgId,
				stripeSubscriptionId: session.subscription as string,
				status: 'ACTIVE',
				startDate: new Date(),
			},
		});

		// Generar invitaciones según specialistCount y enviar por email:
		const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { users: true } });
		const count = org?.specialistCount ?? 0;
		const invitesToCreate = Math.max(1, count); // crea N invites; puedes limitar

		for (let i = 0; i < invitesToCreate; i++) {
			const token = jwt.sign({ orgId, i }, process.env.INVITE_SECRET!, { expiresIn: '30d' });
			// create Invite record
			const invite = await prisma.invite.create({
				data: {
					organizationId: orgId,
					email: ``, // vacío: admin compartirá link
					token,
					role: 'MEDICO',
					expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				},
			});
			// send email to organization contact with invite link (they will forward)
			const inviteUrl = `${process.env.APP_URL}/invite/accept?token=${token}`;
			await sendInviteEmail(org!.contactEmail, inviteUrl, org!.name);
		}
	}

	res.json({ received: true });
}
