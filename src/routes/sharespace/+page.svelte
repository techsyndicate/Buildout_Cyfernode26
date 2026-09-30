<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import {
		collection,
		addDoc,
		getDocs,
		query,
		orderBy,
		serverTimestamp,
		deleteDoc,
		doc
	} from 'firebase/firestore';
	import DarkVeil from '$lib/components/Darkveil.svelte';

	let name = $state('');
	let sidebarOpen = $state(true);
	let links = $state([]);
	let properties = $state([]);
	let showRentModal = $state(false);
	let selectedProperty = $state<any>(null);
	let propertyType = $state('Office');
	let propertySize = $state('');
	let hours = $state('');

	let propertyImage = $state<File | null>(null);
	let uploading = $state(false);

	function rent() {
		showRentModal = true;
	}

	function openProperty(property: any) {
		selectedProperty = property;
		hours = '';
	}

	function closeProperty() {
		selectedProperty = null;
		hours = '';
	}

	let billablehours = $derived(
		selectedProperty && hours ? Number(hours) * (selectedProperty.size > 10 ? 2 : 1) : 0
	);

	let amount = $derived(billablehours * 50);

	async function pay() {
		if (!hours || !selectedProperty) return;

		const response = await fetch('/api/stripe-checkout-sharespace', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				propertyId: selectedProperty.id,
				propertyType: selectedProperty.type,
				hours: billablehours
			})
		});

		const data = await response.json();

		if (data.url) {
			window.location.href = data.url;
		}
	}

	async function removeProperty() {
		if (!selectedProperty) return;

		const user = auth.currentUser;

		if (!user || selectedProperty.ownerId !== user.uid) return;

		await deleteDoc(doc(db, 'properties', selectedProperty.id));

		selectedProperty = null;
		await loadProperties();
	}

	async function loadProperties() {
		const user = auth.currentUser;

		if (!user) return;

		const snapshot = await getDocs(
			query(collection(db, 'properties'), orderBy('createdAt', 'desc'))
		);

		properties = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}));

		const mine = allProperties.filter((property) => property.ownerId === user.uid);
		const others = allProperties.filter((property) => property.ownerId !== user.uid);

		if (mine.length > 0) {
			properties = [fakeProperties[0], fakeProperties[1], ...mine, ...others];
		} else {
			properties = [...fakeProperties, ...others];
		}
	}

	async function submitRent() {
		if (!propertySize || !propertyImage) return;

		const user = auth.currentUser;

		if (!user) return;

		uploading = true;

		try {
			const formData = new FormData();
			formData.append('image', propertyImage);

			const uploadResponse = await fetch('/api/upload-image', {
				method: 'POST',
				body: formData
			});

			const uploadData = await uploadResponse.json();

			if (!uploadResponse.ok || !uploadData.url) {
				throw new Error(uploadData.error ?? 'Image upload failed');
			}

			await addDoc(collection(db, 'properties'), {
				type: propertyType,
				size: Number(propertySize),
				ownerId: user.uid,
				ownerEmail: user.email,
				ownerName: user.displayName ?? 'User',
				image: uploadData.url,
				createdAt: serverTimestamp()
			});

			propertySize = '';
			propertyType = 'Office';
			propertyImage = null;
			showRentModal = false;

			await loadProperties();
		} catch (error) {
			console.error(error);
		} finally {
			uploading = false;
		}
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

		links = isTenant
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

		onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			}

			name = user.displayName ?? 'User';
			await loadProperties();
		});
	});
</script>

<div class="relative flex h-screen w-full overflow-hidden bg-black text-black">
	<div class="fixed inset-0 z-0 h-full w-full">
		<DarkVeil
			hueShift={0}
			noiseIntensity={0}
			scanlineIntensity={0}
			speed={0.5}
			scanlineFrequency={0}
			warpAmount={0}
			resolutionScale={1}
		/>
	</div>

	<div
		class={`relative z-10 shrink-0 overflow-hidden transition-all duration-300 ${
			sidebarOpen ? 'w-55' : 'w-0'
		}`}
	>
		<div
			class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-white/30 bg-white/20 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
		>
			<div class="px-3 py-3">
				<span class="text-lg font-bold text-zinc-950">
					<span class="font-light italic">tenant</span><span class="font-semibold">App</span>
				</span>
			</div>

			<nav class="mt-3 flex flex-1 flex-col gap-1">
				{#each links as link}
					<button
						type="button"
						onclick={() => goto(link.href)}
						class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
							link.href === '/sharespace'
								? 'bg-blue-600/70 text-white shadow-sm'
								: 'text-zinc-900 hover:bg-white/30 hover:text-black'
						}`}
					>
						{link.label}
					</button>
				{/each}

				<hr class="my-2 border-black/20" />

				<button
					type="button"
					onclick={logout}
					class="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-black transition hover:bg-red-500/80 hover:text-white"
				>
					Log Out
				</button>
			</nav>
		</div>
	</div>

	<main class="relative z-10 min-w-0 flex-1 overflow-y-auto">
		<div class="flex min-h-screen items-center justify-center p-8">
			<div
				class="min-h-[550px] w-full max-w-6xl rounded-[25px] border border-white/30 bg-white/20 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
			>
				<h1 class="text-3xl tracking-tight text-zinc-950">
					<span class="font-medium">share</span><span class="font-light italic">Space</span>
				</h1>

				<p class="mt-2 text-sm text-zinc-800">
					Find somewhere useful. Rent somewhere you don't.
				</p>

				<div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each properties as property}
						<button
							type="button"
							onclick={() => openProperty(property)}
							class="h-48 cursor-pointer rounded-2xl border border-white/40 bg-white/35 p-6 text-left shadow-[0_4px_15px_rgba(0,0,0,0.12)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]"
						>
							<div class="flex h-full items-center gap-5">
								<img
									src={property.image}
									alt={property.type}
									class="h-24 w-24 rounded-[25px] object-cover"
								/>

								<div class="space-y-1 text-sm text-zinc-700">
									<p class="font-semibold text-zinc-950">{property.type}</p>

									<p>
										{property.size}
										{property.size > 1 ? ' People' : ' Person'}
									</p>

									<p class="text-xs text-zinc-500">{property.ownerEmail}</p>
								</div>
							</div>
						</button>
					{/each}
				</div>

				<div
					class="mt-10 flex min-h-36 items-center justify-between gap-8 rounded-2xl border border-white/40 bg-white/35 px-8 py-7 shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-xl"
				>
					<div class="max-w-xs">
						<p class="text-xs font-medium tracking-wider text-zinc-600 uppercase">
							have some space?
						</p>

						<p class="mt-1 text-lg font-medium text-zinc-950">
							Let someone make use of it.
						</p>

						<p class="mt-1 text-sm text-zinc-700">
							List an office, kitchen, garage or pool.
						</p>
					</div>

					<div class="flex items-center gap-8">
						<div class="hidden text-right sm:block">
							<p class="text-sm font-medium text-zinc-800">Your space</p>
							<p class="mt-1 text-xs text-zinc-600">Set your own availability</p>
						</div>

						<button class="white" onclick={rent}>Rent Now</button>
					</div>
				</div>
			</div>
		</div>
	</main>

	{#if showRentModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
			<div
				class="relative w-full max-w-md rounded-3xl border border-white/40 bg-white/35 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl"
			>
				<button
					type="button"
					onclick={() => (showRentModal = false)}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-600 transition hover:text-zinc-950"
				>
					×
				</button>

				<h1 class="text-2xl font-semibold text-zinc-950">shareSpace form</h1>

				<div class="mt-6 space-y-5">
					<div class="flex gap-4">
						<div class="flex-1">
							<label class="mb-2 block text-sm font-medium text-zinc-800">Type</label>

							<select
								bind:value={propertyType}
								class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm text-zinc-950 outline-none backdrop-blur-md focus:border-blue-500"
							>
								<option value="Office">Office</option>
								<option value="Kitchen">Kitchen</option>
								<option value="Garage">Garage</option>
								<option value="Pool">Pool</option>
							</select>
						</div>

						<div class="flex-1">
							<label class="mb-2 block text-sm font-medium text-zinc-800">Size</label>

							<div class="flex items-center gap-2">
								<input
									type="number"
									min="1"
									step="1"
									placeholder="10"
									bind:value={propertySize}
									class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm text-zinc-950 outline-none backdrop-blur-md focus:border-blue-500"
								/>

								<span class="text-sm whitespace-nowrap text-zinc-700">people</span>
							</div>
						</div>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-zinc-800">
							Property image
						</label>

						<input
							type="file"
							accept="image/*"
							onchange={(e) => {
								const input = e.currentTarget as HTMLInputElement;
								propertyImage = input.files?.[0] ?? null;
							}}
							class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm backdrop-blur-md"
						/>

						{#if propertyImage}
							<p class="mt-2 truncate text-xs text-zinc-600">
								{propertyImage.name}
							</p>
						{/if}
					</div>

					<button
						type="button"
						onclick={submitRent}
						disabled={uploading || !propertyImage || !propertySize}
						class="w-full rounded-xl bg-blue-600/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{uploading ? 'Uploading...' : 'Submit'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if selectedProperty}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
			<div
				class="relative w-full max-w-md rounded-3xl border border-white/40 bg-white/35 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl"
			>
				<button
					type="button"
					onclick={closeProperty}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-600 transition hover:text-zinc-950"
				>
					×
				</button>

				<div class="flex items-center gap-4">
					<img
						src={selectedProperty.image}
						alt={selectedProperty.type}
						class="h-20 w-20 rounded-2xl object-cover"
					/>

					<div>
						<h1 class="text-2xl font-semibold text-zinc-950">
							{selectedProperty.type}
						</h1>

						<p class="mt-1 text-sm text-zinc-700">
							{selectedProperty.ownerEmail}
						</p>

						<p class="mt-1 text-sm text-zinc-700">
							{selectedProperty.size}
							{selectedProperty.size > 1 ? ' People' : ' Person'}
						</p>
					</div>
				</div>

				{#if selectedProperty.ownerId === auth.currentUser?.uid}
					<div class="mt-7">
						<p class="text-sm text-zinc-700">
							This is your property. Taking it off the market will remove it from shareSpace.
						</p>

						<button
							type="button"
							onclick={removeProperty}
							class="mt-5 w-full rounded-xl bg-red-500/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-600"
						>
							Take off market
						</button>
					</div>
				{:else}
					<div class="mt-7">
						<label class="mb-2 block text-sm font-medium text-zinc-800">
							How many hours?
						</label>

						<input
							type="number"
							min="1"
							step="1"
							placeholder="2"
							bind:value={hours}
							class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm text-zinc-950 outline-none backdrop-blur-md focus:border-blue-500"
						/>
					</div>

					<button
						type="button"
						onclick={pay}
						class="mt-5 w-full rounded-xl bg-blue-600/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
					>
						Pay ₹{amount}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.white {
		border-radius: 15px;
		color: white;
		padding: 10px;
		background-color: rgba(37, 99, 235, 0.8);
		width: 150px;
		border: none;
		cursor: pointer;
	}
</style>