import { json } from '@sveltejs/kit';
import { IMGBB_API_KEY } from '$env/static/private';

export async function POST({ request }) {
	const formData = await request.formData();
	const file = formData.get('image');

	if (!(file instanceof File)) {
		return json({ error: 'No image provided' }, { status: 400 });
	}

	if (!file.type.startsWith('image/')) {
		return json({ error: 'File must be an image' }, { status: 400 });
	}

	const buffer = await file.arrayBuffer();
	const base64 = Buffer.from(buffer).toString('base64');

	const body = new URLSearchParams();
	body.append('key', IMGBB_API_KEY);
	body.append('image', base64);

	const response = await fetch('https://api.imgbb.com/1/upload', {
		method: 'POST',
		body
	});

	const data = await response.json();

	if (!response.ok || !data.success) {
		return json(
			{ error: data.error?.message ?? 'Image upload failed' },
			{ status: 500 }
		);
	}

	return json({
		url: data.data.url,
		displayUrl: data.data.display_url
	});
}