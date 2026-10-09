<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { doc, getDoc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';

	let sidebarOpen = $state(true);
	let property = $state<any>(null);
	let loading = $state(true);
	let hours = $state('');
	let paying = $state(false);

	let propertyType = $state('Office');
	let propertySize = $state('');
	let hourlyPrice = $state('');
	let location = $state('');
	let latitude = $state<number | null>(null);
	let longitude = $state<number | null>(null);

	let propertyImages = $state<File[]>([]);
	let previews = $state<string[]>([]);
	let uploading = $state(false);

	let search = $state('');
	let map: any;
	let marker: any;

	const links = [
		{ label: 'Home', href: '/home' },
		{ label: 'Chat', href: '/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Tenants', href: '/tenants' },
		{ label: 'Houses', href: '/houses' }
	];

	let amount = $derived(property && hours ? Number(hours) * Number(property.hourlyPrice || 50) : 0);

	function handleImages(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);

		if (files.length < 1 || files.length > 4) {
			alert('Please choose 1 to 4 images.');
			input.value = '';
			return;
		}

		propertyImages = files;

		previews.forEach((url) => URL.revokeObjectURL(url));
		previews = files.map((file) => URL.createObjectURL(file));
	}

	async function findLocation() {
		if (!search) return;

		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`
		);

		const data = await response.json();

		if (!data.length) return;

		const lat = Number(data[0].lat);
		const lon = Number(data[0].lon);

		location = data[0].display_name;
		latitude = lat;
		longitude = lon;

		if (map) {
			map.setView([lat, lon], 16);
			marker.setLatLng([lat, lon]);
		}
	}

	async function updateLocation(lat: number, lon: number) {
		latitude = lat;
		longitude = lon;

		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
		);

		const data = await response.json();

		if (data.display_name) {
			location = data.display_name;
			search = data.display_name;
		}
	}

	async function submitProperty() {
		if (
			!propertySize ||
			!hourlyPrice ||
			!location ||
			latitude == null ||
			longitude == null ||
			propertyImages.length < 1 ||
			propertyImages.length > 4
		) {
			return;
		}

		const user = auth.currentUser;

		if (!user) return;

		uploading = true;

		try {
			const formData = new FormData();

			for (const image of propertyImages) {
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

			await addDoc(collection(db, 'properties'), {
				type: propertyType,
				size: Number(propertySize),
				hourlyPrice: Number(hourlyPrice),
				location,
				latitude,
				longitude,
				ownerId: user.uid,
				ownerEmail: user.email,
				ownerName: user.displayName ?? 'User',
				images: uploadData.urls,
				createdAt: serverTimestamp()
			});

			goto('/sharespace');
		} catch (error) {
			console.error(error);
		} finally {
			uploading = false;
		}
	}

	async function loadProperty() {
		const id = page.url.searchParams.get('id');

		if (!id) {
			loading = false;
			return;
		}

		const snapshot = await getDoc(doc(db, 'properties', id));

		if (!snapshot.exists()) {
			goto('/sharespace');
			return;
		}

		property = {
			id: snapshot.id,
			...snapshot.data()
		};

		loading = false;
	}

	async function loadMap() {
		if (!property?.latitude || !property?.longitude) return;

		const L = await import('leaflet');

		if (!document.querySelector('#leaflet-css')) {
			const css = document.createElement('link');
			css.id = 'leaflet-css';
			css.rel = 'stylesheet';
			css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
			document.head.appendChild(css);
		}

		const mapElement = document.getElementById('property-map');

		if (!mapElement) return;

		const icon = L.icon({
			iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
			iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
			shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41]
		});

		map = L.map(mapElement).setView([Number(property.latitude), Number(property.longitude)], 15);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);

		L.marker([Number(property.latitude), Number(property.longitude)], { icon })
			.addTo(map)
			.bindPopup(property.location)
			.openPopup();
	}

	async function pay() {
		if (!property || !hours) return;

		const selectedHours = Number(hours);

		if (selectedHours < 1) return;

		paying = true;

		const response = await fetch('/api/stripe-checkout-sharespace', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				propertyId: property.id,
				propertyType: property.type,
				hours: selectedHours,
				hourlyPrice: Number(property.hourlyPrice || 50),
				amount
			})
		});

		const data = await response.json();

		if (data.url) {
			window.location.href = data.url;
			return;
		}

		paying = false;
	}

	async function removeProperty() {
		if (!property) return;

		const user = auth.currentUser;

		if (!user || property.ownerId !== user.uid) return;

		await deleteDoc(doc(db, 'properties', property.id));

		goto('/sharespace');
	}

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

		await signOut(auth);
		goto('/');
	}

	onMount(() => {
		const cookies = document.cookie.split('; ');
		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

		const isTenant = tenantCookie?.split('=')[1] === 'true';

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			}

			if (page.url.searchParams.get('id')) {
				await loadProperty();

				setTimeout(() => {
					loadMap();
				}, 300);

				return;
			}

			if (isTenant) {
				goto('/sharespace');
				return;
			}

			loading = false;

			setTimeout(async () => {
				const L = await import('leaflet');

				if (!document.querySelector('#leaflet-css')) {
					const css = document.createElement('link');
					css.id = 'leaflet-css';
					css.rel = 'stylesheet';
					css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
					document.head.appendChild(css);
				}

				map = L.map('create-map').setView([28.4595, 77.0266], 12);

				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; OpenStreetMap contributors'
				}).addTo(map);

				const icon = L.icon({
					iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
					iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
					shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
					iconSize: [25, 41],
					iconAnchor: [12, 41]
				});

				marker = L.marker([28.4595, 77.0266], {
					draggable: true,
					icon
				}).addTo(map);

				marker.on('dragend', async () => {
					const position = marker.getLatLng();
					await updateLocation(position.lat, position.lng);
				});

				map.on('click', async (event: any) => {
					marker.setLatLng(event.latlng);
					await updateLocation(event.latlng.lat, event.latlng.lng);
				});
			}, 300);
		});

		return () => {
			unsubscribe();

			if (map) {
				map.remove();
			}
		};
	});
</script>

<div class="relative min-h-screen w-full text-black">
	<div class="fixed inset-0 z-0 h-full w-full bg-[#f2ecce]"></div>

	<div class="relative z-10 flex min-h-screen">
		<div
			class={`shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-55' : 'w-0'}`}
		>
			<div
				class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-white/40 bg-white/35 p-2 backdrop-blur-xl"
			>
				<div class="px-3 py-3">
					<span class="text-lg font-bold text-zinc-900">
						<span class="font-light italic">tenant</span><span class="font-semibold">App</span>
					</span>
				</div>

				<nav class="mt-3 flex flex-1 flex-col gap-1">
					{#each links as link}
						<button
							type="button"
							onclick={() => goto(link.href)}
							class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
								link.href === '/sharespace'
									? 'bg-blue-600 text-white'
									: 'text-zinc-700 hover:bg-white/40'
							}`}
						>
							{link.label}
						</button>
					{/each}

					<hr class="border-white/50" />

					<button
						type="button"
						onclick={logout}
						class="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-black hover:bg-red-500 hover:text-white"
					>
						Log Out
					</button>
				</nav>
			</div>
		</div>

		<main class="min-w-0 flex-1 overflow-y-auto p-8">
			{#if page.url.searchParams.get('id')}
				{#if loading}
					<div
						class="mx-auto flex min-h-[600px] max-w-6xl items-center justify-center rounded-[25px] bg-white/35"
					>
						<p>Loading space...</p>
					</div>
				{:else if property}
					<div
						class="mx-auto w-full max-w-6xl rounded-[25px] border border-white/40 bg-white/35 p-8 backdrop-blur-xl"
					>
						<button
							type="button"
							onclick={() => goto('/sharespace')}
							class="mb-6 rounded-xl bg-white/60 px-4 py-2 text-sm"
						>
							← Back to shareSpace
						</button>

						<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
							<div>
								<div class="grid grid-cols-2 gap-3">
									{#each property.images ?? [property.image || '/house.png'] as image}
										<img
											src={image}
											alt={property.type}
											class="h-64 w-full rounded-2xl object-cover"
										/>
									{/each}
								</div>
							</div>

							<div>
								<h1 class="text-4xl font-semibold">
									{property.type}
								</h1>

								<p class="mt-2 text-zinc-600">
									{property.location}
								</p>

								<div class="mt-6 grid grid-cols-2 gap-3">
									<div class="rounded-2xl bg-white/60 p-4">
										<p class="text-xs text-zinc-500">Capacity</p>

										<p class="mt-1 text-lg font-semibold">
											{property.size}
											{property.size > 1 ? ' People' : ' Person'}
										</p>
									</div>

									<div class="rounded-2xl bg-white/60 p-4">
										<p class="text-xs text-zinc-500">Hourly price</p>

										<p class="mt-1 text-lg font-semibold">
											₹{property.hourlyPrice || 50}/hour
										</p>
									</div>
								</div>

								<div class="mt-6 rounded-2xl bg-white/60 p-5">
									<p class="text-sm text-zinc-500">Rent for one hour</p>

									<p class="mt-1 text-3xl font-semibold">
										₹{property.hourlyPrice || 50}
									</p>
								</div>

								{#if property.ownerId === auth.currentUser?.uid}
									<button
										type="button"
										onclick={removeProperty}
										class="mt-6 w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white hover:bg-red-600"
									>
										Take off market
									</button>
								{:else}
									<div class="mt-5">
										<label class="mb-2 block text-sm font-medium"> How many hours? </label>

										<input
											type="number"
											min="1"
											step="1"
											placeholder="2"
											bind:value={hours}
											class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
										/>
									</div>

									<div class="mt-4 rounded-xl bg-white/70 p-4">
										<div class="flex items-center justify-between">
											<span class="text-sm text-zinc-500"> Total </span>

											<span class="text-lg font-semibold">
												₹{amount}
											</span>
										</div>
									</div>

									<button
										type="button"
										onclick={pay}
										disabled={paying || !hours}
										class="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
									>
										{paying ? 'Opening payment...' : `Pay ₹${amount}`}
									</button>
								{/if}
							</div>
						</div>

						<div class="mt-8">
							<h2 class="text-xl font-semibold">Location</h2>

							<p class="mt-1 text-sm text-zinc-500">
								{property.location}
							</p>

							{#if property.latitude != null && property.longitude != null}
								<div
									id="property-map"
									class="mt-4 h-[400px] w-full overflow-hidden rounded-2xl"
								></div>
							{:else}
								<div
									class="mt-4 flex h-[400px] items-center justify-center rounded-2xl bg-white/50"
								>
									<p class="text-sm text-red-500">No map location saved.</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{:else}
				<div
					class="mx-auto w-full max-w-6xl rounded-[25px] border border-white/40 bg-white/35 p-8 backdrop-blur-xl"
				>
					<h1 class="text-3xl">
						List your <span class="font-light italic">space</span>
					</h1>

					<div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
						<div class="space-y-5">
							<div class="flex gap-4">
								<div class="flex-1">
									<label class="mb-2 block text-sm font-medium"> Type </label>

									<select
										bind:value={propertyType}
										class="w-full rounded-xl border border-white/40 bg-white/50 px-4 py-3 text-sm"
									>
										<option value="Office">Office</option>
										<option value="Kitchen">Kitchen</option>
										<option value="Garage">Garage</option>
										<option value="Pool">Pool</option>
									</select>
								</div>

								<div class="flex-1">
									<label class="mb-2 block text-sm font-medium"> Capacity </label>

									<input
										type="number"
										min="1"
										bind:value={propertySize}
										placeholder="10"
										class="w-full rounded-xl border border-white/40 bg-white/50 px-4 py-3 text-sm"
									/>
								</div>
							</div>

							<div>
								<label class="mb-2 block text-sm font-medium"> Price per hour </label>

								<div class="flex items-center gap-2">
									<span class="text-lg">₹</span>

									<input
										type="number"
										min="1"
										bind:value={hourlyPrice}
										placeholder="50"
										class="w-full rounded-xl border border-white/40 bg-white/50 px-4 py-3 text-sm"
									/>

									<span class="text-sm text-zinc-600"> /hour </span>
								</div>
							</div>

							<div>
								<label class="mb-2 block text-sm font-medium"> Images </label>

								<input
									type="file"
									accept="image/*"
									multiple
									onchange={handleImages}
									class="w-full rounded-xl border border-white/40 bg-white/50 px-4 py-3 text-sm"
								/>

								<p class="mt-2 text-xs text-zinc-500">Choose 1 to 4 images.</p>

								{#if previews.length}
									<div class="mt-4 grid grid-cols-4 gap-2">
										{#each previews as preview}
											<img
												src={preview}
												alt="Preview"
												class="h-20 w-full rounded-xl object-cover"
											/>
										{/each}
									</div>
								{/if}
							</div>

							<div>
								<label class="mb-2 block text-sm font-medium"> Location </label>

								<div class="flex gap-2">
									<input
										bind:value={search}
										placeholder="Search for a location"
										class="min-w-0 flex-1 rounded-xl border border-white/40 bg-white/50 px-4 py-3 text-sm"
									/>
								</div>

								{#if location}
									<p class="mt-2 text-xs text-zinc-600">
										{location}
									</p>
								{/if}
							</div>

							<button
								type="button"
								onclick={submitProperty}
								disabled={uploading ||
									!propertySize ||
									!hourlyPrice ||
									!location ||
									propertyImages.length < 1}
								class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
							>
								{uploading ? 'Uploading...' : 'List space'}
							</button>
						</div>

						<div>
							<p class="mb-2 text-sm font-medium">Pick the location</p>

							<div id="create-map" class="h-[500px] w-full overflow-hidden rounded-2xl"></div>

							<p class="mt-2 text-xs text-zinc-500">Click the map or drag the marker.</p>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>
