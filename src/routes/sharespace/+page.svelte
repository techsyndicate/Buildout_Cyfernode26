<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';

	let name = $state('');
	let sidebarOpen = $state(true);
	let links = $state([]);
	let properties = $state([]);
	let showRentModal = $state(false);
	let showPayModal = $state(false);
	let selectedProperty = $state<any>(null);
	let propertyType = $state('Office');
	let propertySize = $state('');
	let hours = $state('');
	let amount = $derived(Number(hours || 0) * 50);

	const fakeProperties = [
		{
			id: 'fake-1',
			type: 'Office',
			size: 20,
			ownerEmail: 'contact@techsyndicate.us',
			image: '/office.jpg'
		},
		{
			id: 'fake-2',
			type: 'Kitchen',
			size: 6,
			ownerEmail: 'shashwat@mail.com',
			image: '/kitchen.jpg'
		},
		{
			id: 'fake-3',
			type: 'Pool',
			size: 12,
			ownerEmail: 'manik@mail.com',
			image: '/pool.jpg'
		}
	];

	const propertyImages = {
		Office: '/office.jpg',
		Kitchen: '/kitchen.jpg',
		Garage: '/garage.jpg',
		Terrace: '/terrace.png',
		Pool: '/pool.jpg'
	};

	function rent() {
		showRentModal = true;
	}

	function openProperty(property: any) {
		if (property.ownerId === auth.currentUser?.uid) return;

		selectedProperty = property;
		hours = '';
		showPayModal = true;
	}

	function closePayModal() {
		showPayModal = false;
		selectedProperty = null;
		hours = '';
	}

	function pay() {
		if (!hours) return;
	}

	async function loadProperties() {
		const user = auth.currentUser;

		if (!user) return;

		const snapshot = await getDocs(
			query(collection(db, 'properties'), orderBy('createdAt', 'desc'))
		);

		const allProperties = snapshot.docs.map((doc) => ({
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
		if (!propertySize) return;

		const user = auth.currentUser;

		if (!user) return;

		await addDoc(collection(db, 'properties'), {
			type: propertyType,
			size: Number(propertySize),
			ownerId: user.uid,
			ownerEmail: user.email,
			ownerName: user.displayName ?? 'User',
			image: propertyImages[propertyType as keyof typeof propertyImages],
			createdAt: serverTimestamp()
		});

		propertySize = '';
		propertyType = 'Office';
		showRentModal = false;

		await loadProperties();
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
							link.href === '/sharespace'
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
				<h1 class="text-3xl tracking-tight text-zinc-950">
					<span class="font-medium">share</span><span class="font-light italic">Space</span>
				</h1>

				<p class="mt-2 text-sm text-zinc-500">Find somewhere useful. Rent somewhere you don't.</p>

				<div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each properties as property}
						<button
							type="button"
							onclick={() => openProperty(property)}
							class="h-48 cursor-pointer rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
						>
							<div class="flex h-full items-center gap-5">
								<img
									src={property.image}
									alt={property.type}
									class="h-24 w-24 rounded-[25px] object-cover"
								/>

								<div class="space-y-1 text-sm text-zinc-600">
									<p class="font-semibold text-zinc-950">{property.type}</p>
									<p>{property.size} PEOPLE</p>
									<p class="text-xs text-zinc-400">{property.ownerEmail}</p>
								</div>
							</div>
						</button>
					{/each}
				</div>

				<div
					class="mt-10 flex min-h-36 items-center justify-between gap-8 rounded-2xl border border-zinc-200 bg-zinc-50 px-8 py-7"
				>
					<div class="max-w-xs">
						<p class="text-xs font-medium tracking-wider text-zinc-400 uppercase">
							have some space?
						</p>

						<p class="mt-1 text-lg font-medium text-zinc-950">Let someone make use of it.</p>

						<p class="mt-1 text-sm text-zinc-500">List an office, kitchen, garage or pool.</p>
					</div>

					<div class="flex items-center gap-8">
						<div class="hidden text-right sm:block">
							<p class="text-sm font-medium text-zinc-700">Your space</p>
							<p class="mt-1 text-xs text-zinc-400">Set your own availability</p>
						</div>

						<button class="white" onclick={rent}>Rent Now</button>
					</div>
				</div>
			</div>
		</div>
	</main>

	{#if showRentModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div
				class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
			>
				<button
					type="button"
					onclick={() => (showRentModal = false)}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-400 transition hover:text-zinc-900"
				>
					×
				</button>

				<h1 class="text-2xl font-semibold text-zinc-950">shareSpace form</h1>

				<div class="mt-6 space-y-5">
					<div class="flex gap-4">
						<div class="flex-1">
							<label class="mb-2 block text-sm font-medium text-zinc-700">Type</label>

							<select
								bind:value={propertyType}
								class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
							>
								<option value="Office">Office</option>
								<option value="Kitchen">Kitchen</option>
								<option value="Garage">Garage</option>
								<option value="Pool">Pool</option>
							</select>
						</div>

						<div class="flex-1">
							<label class="mb-2 block text-sm font-medium text-zinc-700">Size</label>

							<div class="flex items-center gap-2">
								<input
									type="number"
									min="1"
									step="1"
									placeholder="10"
									bind:value={propertySize}
									class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
								/>

								<span class="text-sm whitespace-nowrap text-zinc-500">people</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						onclick={submitRent}
						class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
					>
						Submit
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showPayModal && selectedProperty}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div
				class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
			>
				<button
					type="button"
					onclick={closePayModal}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-400 transition hover:text-zinc-900"
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
						<h1 class="text-2xl font-semibold text-zinc-950">{selectedProperty.type}</h1>
						<p class="mt-1 text-sm text-zinc-500">{selectedProperty.ownerEmail}</p>
					</div>
				</div>

				<div class="mt-7">
					<label class="mb-2 block text-sm font-medium text-zinc-700">How many hours?</label>

					<input
						type="number"
						min="1"
						step="1"
						placeholder="2"
						bind:value={hours}
						class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
					/>
				</div>

				<button
					type="button"
					onclick={pay}
					class="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
				>
					Pay ₹{amount}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.white {
		border-radius: 15px;
		color: white;
		padding: 10px;
		background-color: #2563eb;
		width: 150px;
		border: none;
		cursor: pointer;
	}
</style>
