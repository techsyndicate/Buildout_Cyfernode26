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

	const houseImages = {
		Apartment: '/house.png',
		House: '/house.png',
		Villa: '/house.png'
	};

	onMount(() => {
		const cookies = document.cookie.split('; ');
		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));
		const isTenant = tenantCookie?.split('=')[1] === 'true';

		tenant = isTenant;

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
			await loadHouses();
		});
	});

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

	async function removeHouse() {
		if (!selectedHouse) return;

		const user = auth.currentUser;

		if (!user) return;

		if (selectedHouse.ownerId !== user.uid) return;

		await deleteDoc(doc(db, 'houses', selectedHouse.id));

		closeHouseModal();
		await loadHouses();
	}

	function openHouseForm() {
		showHouseModal = false;
		selectedHouse = null;
		houseType = 'Apartment';
		location = '';
		bedrooms = '';
		rent = '';
		showHouseModal = false;
	}

	async function submitHouse() {
		if (!location || !bedrooms || !rent) return;

		const user = auth.currentUser;

		if (!user) return;

		await addDoc(collection(db, 'houses'), {
			type: houseType,
			location: location,
			bedrooms: Number(bedrooms),
			rent: Number(rent),
			ownerId: user.uid,
			ownerEmail: user.email,
			ownerName: user.displayName ?? 'User',
			image: houseImages[houseType as keyof typeof houseImages],
			createdAt: serverTimestamp()
		});

		houseType = 'Apartment';
		location = '';
		bedrooms = '';
		rent = '';
		showHouseModal = false;

		await loadHouses();
	}

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
		await signOut(auth);
		goto('/');
	}
</script>

<div
	class="flex h-screen w-full overflow-hidden bg-cover bg-fixed bg-center text-black"
	style="background-image: url('/xyz.png');"
>
	<div
		class={`shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-55' : 'w-0'}`}
	>
		<div
			class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)] backdrop-blur-sm"
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
						class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
							link.href === '/houses' || link.href === '/tenant/houses'
								? 'bg-blue-600 text-white shadow-sm'
								: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
						}`}
					>
						{link.label}
					</button>
				{/each}

				<hr class="border" />

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

	<main class="min-w-0 flex-1 overflow-y-auto">
		<div class="flex min-h-screen items-center justify-center p-8">
			<div
				class="min-h-[550px] w-full max-w-6xl rounded-[25px] bg-white/85 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
			>
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl tracking-tight text-zinc-950">
							<span class="font-medium">Rent</span> your
							<span class="font-light italic">Properties</span>
						</h1>

						<p class="mt-2 text-sm text-zinc-500">Find a place to live or put yours up for rent.</p>
					</div>

					{#if !tenant}
						<button
							type="button"
							onclick={openHouseForm}
							class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
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
							class="h-48 rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
						>
							<div class="flex h-full items-center gap-5">
								<img src={house.image} alt="House" class="h-20 w-20 rounded-[20px] object-cover" />

								<div class="space-y-1 text-sm text-zinc-600">
									<h3 class="font-semibold text-zinc-950">
										{house.type}
									</h3>

									<p>{house.location}</p>

									<p>{house.bedrooms} bedrooms</p>

									<p class="font-medium text-zinc-900">
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
							class="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center"
						>
							<p class="text-sm text-zinc-500">No houses listed yet.</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>

	{#if showHouseModal && selectedHouse}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div
				class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
			>
				<button
					type="button"
					onclick={closeHouseModal}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-400 transition hover:text-zinc-900"
				>
					×
				</button>

				<img src={selectedHouse.image} alt="House" class="h-40 w-full rounded-2xl object-cover" />

				<h1 class="mt-5 text-2xl font-semibold text-zinc-950">
					{selectedHouse.type}
				</h1>

				<div class="mt-3 space-y-1 text-sm text-zinc-500">
					<p>{selectedHouse.location}</p>
					<p>{selectedHouse.bedrooms} bedrooms</p>
					<p>₹{selectedHouse.rent}/month</p>
				</div>

				{#if selectedHouse.ownerId === auth.currentUser?.uid}
					<button
						type="button"
						onclick={removeHouse}
						class="mt-6 w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-600"
					>
						Take off market
					</button>
				{:else}
					<p class="mt-6 text-center text-sm text-zinc-400">
						This property belongs to another landlord.
					</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if showHouseModal && !selectedHouse}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div
				class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
			>
				<button
					type="button"
					onclick={() => (showHouseModal = false)}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-400 transition hover:text-zinc-900"
				>
					×
				</button>

				<h1 class="text-2xl font-semibold text-zinc-950">List a house</h1>

				<div class="mt-6 space-y-5">
					<div>
						<label class="mb-2 block text-sm font-medium text-zinc-700">Type</label>

						<select
							bind:value={houseType}
							class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
						>
							<option value="Apartment">Apartment</option>
							<option value="House">House</option>
							<option value="Villa">Villa</option>
						</select>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-zinc-700">Location</label>

						<input
							type="text"
							placeholder="Sector 46, Gurugram"
							bind:value={location}
							class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
						/>
					</div>

					<div class="flex gap-4">
						<div class="flex-1">
							<label class="mb-2 block text-sm font-medium text-zinc-700">Bedrooms</label>

							<input
								type="number"
								min="1"
								bind:value={bedrooms}
								placeholder="2"
								class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
							/>
						</div>

						<div class="flex-1">
							<label class="mb-2 block text-sm font-medium text-zinc-700">Rent</label>

							<div class="flex items-center gap-2">
								<span class="text-sm text-zinc-500">₹</span>

								<input
									type="number"
									min="1"
									bind:value={rent}
									placeholder="25000"
									class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
								/>
							</div>
						</div>
					</div>

					<button
						type="button"
						onclick={submitHouse}
						class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
					>
						List house
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
