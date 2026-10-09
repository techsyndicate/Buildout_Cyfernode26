<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { doc, getDoc } from 'firebase/firestore';

	let sidebarOpen = $state(true);
	let house = $state<any>(null);
	let months = $state('');
	let loading = $state(true);
	let paying = $state(false);

	const links = [
		{ label: 'Home', href: '/tenant/home' },
		{ label: 'Chat', href: '/tenant/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Landlords', href: '/tenant/landlords' },
		{ label: 'Houses', href: '/tenant/houses' }
	];

	let amount = $derived(house && months ? Number(months) * Number(house.rent) : 0);

	let mapUrl = $derived.by(() => {
		if (!house?.latitude || !house?.longitude) return '';

		const lat = Number(house.latitude);
		const lon = Number(house.longitude);

		const size = 0.01;

		const left = lon - size;
		const right = lon + size;
		const bottom = lat - size;
		const top = lat + size;

		return `https://www.openstreetmap.org/export/embed.html?bbox=${left},${bottom},${right},${top}&layer=mapnik&marker=${lat},${lon}`;
	});

	async function loadHouse() {
		const id = page.url.searchParams.get('id');

		if (!id) {
			goto('/tenant/houses');
			return;
		}

		const snapshot = await getDoc(doc(db, 'houses', id));

		if (!snapshot.exists()) {
			goto('/tenant/houses');
			return;
		}

		house = {
			id: snapshot.id,
			...snapshot.data()
		};

		loading = false;
	}

	async function pay() {
		if (!house || !months) return;

		const selectedMonths = Number(months);

		if (selectedMonths < 1) return;

		if (house.maxmonths && selectedMonths > Number(house.maxmonths)) {
			alert(`You can only rent this house for ${house.maxmonths} months.`);
			return;
		}

		paying = true;

		const response = await fetch('/api/stripe-checkout-houses', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				houseId: house.id,
				houseType: house.type,
				months: selectedMonths,
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

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

		await signOut(auth);
		goto('/');
	}

	onMount(() => {
		const cookies = document.cookie.split('; ');
		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

		if (tenantCookie?.split('=')[1] !== 'true') {
			goto('/houses');
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			}

			await loadHouse();
		});

		return unsubscribe;
	});
</script>

<div class="relative min-h-screen w-full text-black">
	<div class="fixed inset-0 z-0 h-full w-full bg-[#f2ecce]"></div>

	<div class="relative z-10 flex min-h-screen">
		<div
			class={`shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-55' : 'w-0'}`}
		>
			<div
				class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-white/40 bg-white/35 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl"
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
								link.href === '/tenant/houses'
									? 'bg-blue-600 text-white shadow-sm'
									: 'text-zinc-600 hover:bg-white/40 hover:text-zinc-900'
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
			{#if loading}
				<div
					class="mx-auto flex min-h-[600px] max-w-6xl items-center justify-center rounded-[25px] border border-white/40 bg-white/35 backdrop-blur-xl"
				>
					<p class="text-sm text-zinc-500">Loading house...</p>
				</div>
			{:else if house}
				<div
					class="mx-auto w-full max-w-6xl rounded-[25px] border border-white/40 bg-white/35 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
				>
					<button
						type="button"
						onclick={() => goto('/tenant/houses')}
						class="mb-6 rounded-xl bg-white/60 px-4 py-2 text-sm text-zinc-700 transition hover:bg-white/80"
					>
						← Back to houses
					</button>

					<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
						<div>
							<div class="grid grid-cols-2 gap-3">
								{#each house.images ?? [house.image || '/house.png'] as image}
									<img src={image} alt="House" class="h-64 w-full rounded-2xl object-cover" />
								{/each}
							</div>
						</div>

						<div>
							<h1 class="text-4xl font-semibold text-zinc-950">
								{house.type}
							</h1>

							<p class="mt-2 text-zinc-600">
								{house.location}
							</p>

							<div class="mt-6 grid grid-cols-2 gap-3">
								<div class="rounded-2xl bg-white/60 p-4">
									<p class="text-xs text-zinc-500">Bedrooms</p>

									<p class="mt-1 text-lg font-semibold">
										{house.bedrooms}
									</p>
								</div>

								<div class="rounded-2xl bg-white/60 p-4">
									<p class="text-xs text-zinc-500">Rent</p>

									<p class="mt-1 text-lg font-semibold">
										₹{house.rent}/month
									</p>
								</div>
							</div>

							<div class="mt-6 rounded-2xl bg-white/60 p-5">
								<p class="text-sm text-zinc-500">Rent for one month</p>

								<p class="mt-1 text-3xl font-semibold text-zinc-950">
									₹{house.rent}
								</p>
							</div>

							<div class="mt-5">
								<label class="mb-2 block text-sm font-medium text-zinc-700">
									How many months?
								</label>

								<input
									type="number"
									min="1"
									step="1"
									placeholder="1"
									bind:value={months}
									class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
								/>
							</div>

							<div class="mt-4 rounded-xl bg-white/70 p-4">
								<div class="flex items-center justify-between">
									<span class="text-sm text-zinc-500"> Total </span>

									<span class="text-lg font-semibold text-zinc-950">
										₹{amount}
									</span>
								</div>
							</div>

							<button
								type="button"
								onclick={pay}
								disabled={paying || !months}
								class="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{paying ? 'Please Wait...' : `Pay ₹${amount}`}
							</button>
						</div>
					</div>

					<div class="mt-8">
						<h2 class="text-xl font-semibold text-zinc-950">Location</h2>

						<p class="mt-1 text-sm text-zinc-500">
							{house.location}
						</p>

						{#if mapUrl}
							<iframe
								src={mapUrl}
								class="mt-4 h-[400px] w-full rounded-2xl border-0"
								title="House location"
							></iframe>
						{:else}
							<div class="mt-4 flex h-[400px] items-center justify-center rounded-2xl bg-white/50">
								<p class="text-sm text-red-500">This house does not have a location saved.</p>
							</div>
						{/if}

						<p class="mt-2 text-xs text-zinc-400">
							{house.latitude}, {house.longitude}
						</p>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>
