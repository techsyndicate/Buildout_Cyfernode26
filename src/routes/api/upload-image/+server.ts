import { json } from '@sveltejs/kit';
import { IMGBB_API_KEY } from '$env/static/private';

export async function POST({ request }) {
	const formData = await request.formData();
	const files = formData.getAll('images');

	if (!files.length) {
		return json({ error: 'No images provided' }, { status: 400 });
	}

	if (files.length > 4) {
		return json({ error: 'Please upload 1 to 4 images' }, { status: 400 });
	}

	const urls: string[] = [];

	for (const file of files) {
		if (!(file instanceof File)) {
			return json({ error: 'Invalid image' }, { status: 400 });
		}

		if (!file.type.startsWith('image/')) {
			return json({ error: 'All files must be images' }, { status: 400 });
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

		urls.push(data.data.url);
	}

	return json({
		urls
	});
}