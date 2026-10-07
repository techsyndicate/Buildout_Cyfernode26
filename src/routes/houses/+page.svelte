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
	import Grainient from '$lib/components/svelte-bits/Grainient.svelte';

	let name = $state('');
	let sidebarOpen = $state(true);
	let tenant = $state(false);
	let links = $state([]);

	let houses = $state<any[]>([]);
	let showHouseModal = $state(false);
	let selectedHouse = $state<any>(null);

	let houseType = $state('Apartment');
	let location = $state('');
	let bedrooms = $state('');
	let rent = $state('');
	let houseImage = $state<File | null>(null);
	let uploading = $state(false);

	async function loadHouses() {
		const user = auth.currentUser;

		if (!user) return;

		const snapshot = await getDocs(query(collection(db, 'houses'), orderBy('createdAt', 'desc')));

		houses = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}));
	}

	function openHouse(house: any) {
		selectedHouse = house;
		showHouseModal = true;
	}

	function closeHouseModal() {
		showHouseModal = false;
		selectedHouse = null;
	}

	function openHouseForm() {
		selectedHouse = null;
		houseType = 'Apartment';
		location = '';
		bedrooms = '';
		rent = '';
		houseImage = null;
		showHouseModal = true;
	}

	async function removeHouse() {
		if (!selectedHouse) return;

		const user = auth.currentUser;

		if (!user) return;

		if (selectedHouse.ownerId !== user.uid) return;

		await deleteDoc(doc(db, 'houses', selectedHouse.id));

		closeHouseModal();
		await loadHouses();
	}

	async function submitHouse() {
		if (!location || !bedrooms || !rent || !houseImage) return;

		const user = auth.currentUser;

		if (!user) return;

		uploading = true;

		try {
			const formData = new FormData();
			formData.append('image', houseImage);

			const uploadResponse = await fetch('/api/upload-image', {
				method: 'POST',
				body: formData
			});

			const uploadData = await uploadResponse.json();

			if (!uploadResponse.ok || !uploadData.url) {
				throw new Error(uploadData.error ?? 'Image upload failed');
			}

			await addDoc(collection(db, 'houses'), {
				type: houseType,
				location,
				bedrooms: Number(bedrooms),
				rent: Number(rent),
				ownerId: user.uid,
				ownerEmail: user.email,
				ownerName: user.displayName ?? 'User',
				image: uploadData.url,
				createdAt: serverTimestamp()
			});

			houseType = 'Apartment';
			location = '';
			bedrooms = '';
			rent = '';
			houseImage = null;
			showHouseModal = false;

			await loadHouses();
		} catch (error) {
			console.error(error);
			alert('Failed to upload image');
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

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			}

			name = user.displayName ?? 'User';

			await loadHouses();
		});

		return unsubscribe;
	});
</script>

<div class="relative flex min-h-screen w-full overflow-hidden bg-[#f2ecce] text-zinc-900">
    <div class="fixed inset-0 z-0 h-full w-full bg-[#f2ecce]"></div>
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
							link.href === '/houses' || link.href === '/tenant/houses'
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
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl tracking-tight text-zinc-950">
							<span class="font-medium">Rent</span> your
							<span class="font-light italic">Properties</span>
						</h1>

						<p class="mt-2 text-sm text-zinc-700">Find a place to live or put yours up for rent.</p>
					</div>

					{#if !tenant}
						<button
							type="button"
							onclick={openHouseForm}
							class="rounded-xl bg-blue-600/80 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
						>
							List a house
						</button>
					{/if}
				</div>

				<div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each houses as house}
						<button
							type="button"
							onclick={() => openHouse(house)}
							class="h-48 rounded-2xl border border-white/40 bg-white/35 p-6 text-left shadow-[0_4px_15px_rgba(0,0,0,0.12)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]"
						>
							<div class="flex h-full items-center gap-5">
								<img src={house.image} alt="House" class="h-20 w-20 rounded-[20px] object-cover" />

								<div class="space-y-1 text-sm text-zinc-700">
									<h3 class="font-semibold text-zinc-950">
										{house.type}
									</h3>

									<p>{house.location}</p>

									<p>{house.bedrooms} bedrooms</p>

									<p class="font-medium text-zinc-950">
										₹{house.rent}/month
									</p>

									{#if house.ownerId === auth.currentUser?.uid}
										<p class="text-xs text-blue-600">Your listing</p>
									{/if}
								</div>
							</div>
						</button>
					{:else}
						<div
							class="col-span-full rounded-2xl border border-white/40 bg-white/20 p-12 text-center backdrop-blur-lg"
						>
							<p class="text-sm text-zinc-700">No houses listed yet.</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>

	{#if showHouseModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
		>
			<div
				class="relative w-full max-w-md rounded-3xl border border-white/40 bg-white/35 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl"
			>
				<button
					type="button"
					onclick={closeHouseModal}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-600 transition hover:text-zinc-950"
				>
					×
				</button>

				{#if selectedHouse}
					<img src={selectedHouse.image} alt="House" class="h-40 w-full rounded-2xl object-cover" />

					<h1 class="mt-5 text-2xl font-semibold text-zinc-950">
						{selectedHouse.type}
					</h1>

					<div class="mt-3 space-y-1 text-sm text-zinc-700">
						<p>{selectedHouse.location}</p>
						<p>{selectedHouse.bedrooms} bedrooms</p>
						<p>₹{selectedHouse.rent}/month</p>
					</div>

					{#if selectedHouse.ownerId === auth.currentUser?.uid}
						<button
							type="button"
							onclick={removeHouse}
							class="mt-6 w-full rounded-xl bg-red-500/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-600"
						>
							Take off market
						</button>
					{:else}
						<p class="mt-6 text-center text-sm text-zinc-600">
							This property belongs to another landlord.
						</p>
					{/if}
				{:else}
					<h1 class="text-2xl font-semibold text-zinc-950">List a house</h1>

					<div class="mt-6 space-y-5">
						<div>
							<label class="mb-2 block text-sm font-medium text-zinc-800"> Type </label>

							<select
								bind:value={houseType}
								class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm text-zinc-950 backdrop-blur-md outline-none focus:border-blue-500"
							>
								<option value="Apartment">Apartment</option>
								<option value="House">House</option>
								<option value="Villa">Villa</option>
							</select>
						</div>

						<div>
							<label class="mb-2 block text-sm font-medium text-zinc-800"> Location </label>

							<input
								type="text"
								placeholder="Sector 46, Gurugram"
								bind:value={location}
								class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm text-zinc-950 backdrop-blur-md outline-none placeholder:text-zinc-500 focus:border-blue-500"
							/>
						</div>

						<div class="flex gap-4">
							<div class="flex-1">
								<label class="mb-2 block text-sm font-medium text-zinc-800"> Bedrooms </label>

								<input
									type="number"
									min="1"
									step="1"
									placeholder="2"
									bind:value={bedrooms}
									class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm text-zinc-950 backdrop-blur-md outline-none placeholder:text-zinc-500 focus:border-blue-500"
								/>
							</div>

							<div class="flex-1">
								<label class="mb-2 block text-sm font-medium text-zinc-800"> Rent </label>

								<div class="flex items-center gap-2">
									<span class="text-sm text-zinc-700">₹</span>

									<input
										type="number"
										min="1"
										step="1"
										placeholder="25000"
										bind:value={rent}
										class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm text-zinc-950 backdrop-blur-md outline-none placeholder:text-zinc-500 focus:border-blue-500"
									/>
								</div>
							</div>
						</div>

						<div>
							<label class="mb-2 block text-sm font-medium text-zinc-800"> House image </label>

							<input
								type="file"
								accept="image/*"
								onchange={(e) => {
									const input = e.currentTarget as HTMLInputElement;
									houseImage = input.files?.[0] ?? null;
								}}
								class="w-full rounded-xl border border-white/40 bg-white/30 px-4 py-3 text-sm backdrop-blur-md"
							/>

							{#if houseImage}
								<p class="mt-2 truncate text-xs text-zinc-600">
									{houseImage.name}
								</p>
							{/if}
						</div>

						<button
							type="button"
							onclick={submitHouse}
							disabled={uploading || !location || !bedrooms || !rent || !houseImage}
							class="w-full rounded-xl bg-blue-600/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{uploading ? 'Uploading...' : 'List house'}
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
