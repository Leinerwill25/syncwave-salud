// pages/api/invite/accept.ts
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') return res.status(405).end();
	const { token, name, email, password } = req.body;
	try {
		const payload: any = jwt.verify(token, process.env.INVITE_SECRET!);
		const invite = await prisma.invite.findUnique({ where: { token } });
		if (!invite || invite.used) return res.status(400).json({ message: 'Invite inválida o usada' });

		// crear usuario
		const user = await prisma.user.create({
			data: {
				email,
				name,
				role: invite.role,
				organizationId: invite.organizationId,
			},
		});

		await prisma.invite.update({ where: { id: invite.id }, data: { used: true } });
		return res.status(200).json({ userId: user.id });
	} catch (err: any) {
		return res.status(400).json({ message: err.message || 'Error' });
	}
}
