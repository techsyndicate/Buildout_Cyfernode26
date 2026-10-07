<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

	let name = $state('');
	let tenant = $state(false);

	let houseType = $state('Apartment');
	let location = $state('');
	let latitude = $state<number | null>(null);
	let longitude = $state<number | null>(null);
	let bedrooms = $state('');
	let rent = $state('');

	let houseImages = $state<File[]>([]);
	let previews = $state<string[]>([]);
	let uploading = $state(false);

	let search = $state('');
	let map: any;
	let marker: any;

	let links = $state([
		{ label: 'Home', href: '/home' },
		{ label: 'Chat', href: '/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Tenants', href: '/tenants' },
		{ label: 'Houses', href: '/houses' }
	]);

	function handleImages(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);

		if (files.length > 4) {
			alert('You can upload a maximum of 4 images.');
			input.value = '';
			return;
		}

		houseImages = files;
		previews.forEach((url) => URL.revokeObjectURL(url));
		previews = files.map((file) => URL.createObjectURL(file));
	}

	async function findLocation() {
		if (!search.trim()) return;

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`
			);

			const data = await response.json();

			if (!data.length) {
				alert('Location not found.');
				return;
			}

			const result = data[0];
			const lat = Number(result.lat);
			const lon = Number(result.lon);

			location = result.display_name;
			latitude = lat;
			longitude = lon;

			map.setView([lat, lon], 16);
			marker.setLatLng([lat, lon]);
		} catch (error) {
			console.error(error);
			alert('Could not find location.');
		}
	}

	async function updateLocation(lat: number, lon: number) {
		latitude = lat;
		longitude = lon;

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
			);

			const data = await response.json();

			if (data.display_name) {
				location = data.display_name;
				search = data.display_name;
			}
		} catch (error) {
			console.error(error);
		}
	}

	async function submitHouse() {
		if (
			!location ||
			latitude === null ||
			longitude === null ||
			!bedrooms ||
			!rent ||
			houseImages.length < 1 ||
			houseImages.length > 4
		) {
			return;
		}

		const user = auth.currentUser;

		if (!user) return;

		uploading = true;

		try {
			const formData = new FormData();

			for (const image of houseImages) {
				formData.append('images', image);
			}

			const uploadResponse = await fetch('/api/upload-image', {
				method: 'POST',
				body: formData
			});

			const uploadData = await uploadResponse.json();

			if (!uploadResponse.ok || !uploadData.urls) {
				throw new Error(uploadData.error ?? 'Image upload failed');
			}

			await addDoc(collection(db, 'houses'), {
				type: houseType,
				location,
				latitude,
				longitude,
				bedrooms: Number(bedrooms),
				rent: Number(rent),
				ownerId: user.uid,
				ownerEmail: user.email,
				ownerName: user.displayName ?? 'User',
				images: uploadData.urls,
				createdAt: serverTimestamp()
			});

			goto('/houses');
		} catch (error) {
			console.error(error);
			alert('Failed to list house.');
		} finally {
			uploading = false;
		}
	}

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

		await signOut(auth);
		goto('/');
	}

	onMount(async () => {
		const cookies = document.cookie.split('; ');
		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

		tenant = tenantCookie?.split('=')[1] === 'true';

		links = tenant
			? [
					{ label: 'Home', href: '/tenant/home' },
					{ label: 'Chat', href: '/tenant/chat' },
					{ label: 'shareSpace', href: '/sharespace' },
					{ label: 'Landlords', href: '/tenant/landlords' },
					{ label: 'Houses', href: '/tenant/houses' }
				]
			: [
					{ label: 'Home', href: '/home' },
					{ label: 'Chat', href: '/chat' },
					{ label: 'shareSpace', href: '/sharespace' },
					{ label: 'Tenants', href: '/tenants' },
					{ label: 'Houses', href: '/houses' }
				];

		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/');
				return;
			}

			if (tenant) {
				goto('/tenant/home');
				return;
			}

			name = user.displayName ?? 'User';
		});

		const L = await import('leaflet');

		const style = document.createElement('link');
		style.rel = 'stylesheet';
		style.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		document.head.appendChild(style);

		const icon = L.icon({
			iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
			iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
			shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [1, -34],
			shadowSize: [41, 41]
		});

		map = L.map('map').setView([28.4595, 77.0266], 12);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);

		marker = L.marker([28.4595, 77.0266], {
			draggable: true,
			icon
		}).addTo(map);

		marker.on('dragend', async () => {
			const position = marker.getLatLng();
			await updateLocation(position.lat, position.lng);
		});

		map.on('click', async (event: any) => {
			const lat = event.latlng.lat;
			const lon = event.latlng.lng;

			marker.setLatLng([lat, lon]);
			await updateLocation(lat, lon);
		});

		setTimeout(() => {
			map.invalidateSize();
		}, 100);

		return () => {
			unsubscribe();
			previews.forEach((url) => URL.revokeObjectURL(url));
			map?.remove();
		};
	});
</script>

<div class="min-h-screen w-full bg-[#f2ecce] text-black">
	<main class="w-full p-8">
		<div class="mx-auto w-full max-w-6xl">
			<div
				class="rounded-2xl border border-black/10 bg-neutral-100/80 p-7 shadow-md backdrop-blur-xl"
			>
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl tracking-tight text-black">
							<span class="font-light italic">List</span> a
							<span class="font-semibold">house</span>
						</h1>

						<p class="mt-1 text-neutral-700">Put your place up for rent.</p>
					</div>

					<button
						type="button"
						onclick={() => goto('/houses')}
						class="rounded-xl border bg-blue-600/70 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
					>
						Back to houses
					</button>
				</div>

				<div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<label class="mb-2 block text-sm font-medium text-neutral-800"> Type </label>

						<select
							bind:value={houseType}
							class="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black outline-none focus:border-blue-500"
						>
							<option value="Apartment">Apartment</option>
							<option value="House">House</option>
							<option value="Villa">Villa</option>
						</select>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-neutral-800"> Bedrooms </label>

						<input
							type="number"
							min="1"
							step="1"
							placeholder="2"
							bind:value={bedrooms}
							class="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black outline-none placeholder:text-neutral-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-neutral-800"> Rent </label>

						<div class="flex items-center gap-2">
							<span class="text-sm text-neutral-700">₹</span>

							<input
								type="number"
								min="1"
								step="1"
								placeholder="25000"
								bind:value={rent}
								class="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black outline-none placeholder:text-neutral-500 focus:border-blue-500"
							/>
						</div>
					</div>

					<div class="md:col-span-2">
						<label class="mb-2 block text-sm font-medium text-neutral-800"> Location </label>

						<div class="flex gap-2">
							<input
								type="text"
								placeholder="Search for a location"
								bind:value={search}
								onkeydown={(e) => {
									if (e.key === 'Enter') findLocation();
								}}
								class="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black outline-none placeholder:text-neutral-500 focus:border-blue-500"
							/>

							<button
								type="button"
								onclick={findLocation}
								class="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
							>
								Search
							</button>
						</div>

						<div
							id="map"
							class="mt-3 h-80 w-full overflow-hidden rounded-xl border border-black/10"
						></div>

						{#if location}
							<p class="mt-2 text-xs text-neutral-600">
								{location}
							</p>
						{/if}
					</div>

					<div class="md:col-span-2">
						<label class="mb-2 block text-sm font-medium text-neutral-800"> House images </label>

						<input
							type="file"
							accept="image/*"
							multiple
							onchange={handleImages}
							class="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm backdrop-blur-md"
						/>

						<p class="mt-2 text-xs text-neutral-600">Upload up to 4 images.</p>

						{#if previews.length}
							<div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
								{#each previews as preview, i}
									<div class="overflow-hidden rounded-xl border border-black/10 bg-white">
										<img src={preview} alt={`House ${i + 1}`} class="h-40 w-full object-cover" />
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div class="mt-8 flex items-center justify-between">
					<p class="text-sm text-neutral-600">
						{houseImages.length}/4 images selected
					</p>

					<button
						type="button"
						onclick={submitHouse}
						disabled={uploading ||
							!location ||
							latitude === null ||
							longitude === null ||
							!bedrooms ||
							!rent ||
							houseImages.length < 1 ||
							houseImages.length > 4}
						class="rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{uploading ? 'Uploading...' : 'List house'}
					</button>
				</div>
			</div>
		</div>
	</main>
</div>
