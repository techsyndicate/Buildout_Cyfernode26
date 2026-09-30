import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_TEST_KEY } from '$env/static/private';

const stripe = new Stripe(STRIPE_TEST_KEY);

export async function POST({ request, url }) {
	const { houseId, houseType, months, amount } = await request.json();

	if (!houseId || !months || months < 1) {
		return json({ error: 'Invalid payment' }, { status: 400 });
	}

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',

		line_items: [
			{
				price_data: {
					currency: 'inr',
					product_data: {
						name: `${houseType} - ${months} month${months > 1 ? 's' : ''}`
					},
					unit_amount: Math.round(Number(amount) * 100)
				},
				quantity: 1
			}
		],

		metadata: {
			houseId: houseId,
			months: String(months)
		},

		success_url: `${url.origin}/tenant/houses/success?houseId=${houseId}`,
		cancel_url: `${url.origin}/tenant/houses`
	});

	return json({ url: session.url });
}
