import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_TEST_KEY } from '$env/static/private';

const stripe = new Stripe(STRIPE_TEST_KEY);

export async function POST({ request, url }) {
	const { propertyId, propertyType, hours } = await request.json();

	if (!propertyId || !hours || hours < 1) {
		return json({ error: 'Invalid payment' }, { status: 400 });
	}

	const amount = Number(hours) * 50;

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',

		line_items: [
			{
				price_data: {
					currency: 'inr',
					product_data: {
						name: `${propertyType}`
					},
					unit_amount: Math.round(amount * 100)
				},
				quantity: 1
			}
		],

		metadata: {
			propertyId: propertyId,
			hours: String(hours)
		},

		success_url: `${url.origin}/sharespace/success?propertyId=${propertyId}`,
		cancel_url: `${url.origin}/sharespace`
	});

	return json({ url: session.url });
}