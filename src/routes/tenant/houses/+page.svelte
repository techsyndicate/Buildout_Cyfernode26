<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { collection, getDocs, query, orderBy } from 'firebase/firestore';

	let name = $state('');
	let sidebarOpen = $state(true);
	let tenant = $state(false);

	let houses = $state<any[]>([]);
	let selectedHouse = $state<any>(null);
	let showRentModal = $state(false);
	let months = $state('');

	const links = [
		{ label: 'Home', href: '/tenant/home' },
		{ label: 'Chat', href: '/tenant/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Landlords', href: '/tenant/landlords' },
		{ label: 'Houses', href: '/tenant/houses' }
	];

	async function loadHouses() {
		const snapshot = await getDocs(query(collection(db, 'houses'), orderBy('createdAt', 'desc')));

		houses = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}));
	}

	function openHouse(house: any) {
		selectedHouse = house;
		months = '';
		showRentModal = true;
	}

	function closeRentModal() {
		showRentModal = false;
		selectedHouse = null;
		months = '';
	}

	let amount = $derived(selectedHouse && months ? Number(months) * Number(selectedHouse.rent) : 0);

	async function pay() {
		if (!selectedHouse || !months) return;

		const selectedMonths = Number(months);

		if (selectedMonths < 1) return;

		if (selectedMonths > Number(selectedHouse.maxmonths)) {
			alert(`You can only rent this house for ${selectedHouse.maxmonths} months.`);
			return;
		}

		const response = await fetch('/api/stripe-checkout-houses', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				houseId: selectedHouse.id,
				houseType: selectedHouse.type,
				months: selectedMonths,
				amount
			})
		});

		const data = await response.json();

		if (data.url) {
			window.location.href = data.url;
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

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			}

			if (!tenant) {
				goto('/houses');
				return;
			}

			name = user.displayName ?? 'User';

			await loadHouses();
		});

		return unsubscribe;
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
							link.href === '/tenant/houses'
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
					<span class="font-medium">Find</span>
					a <span class="font-light italic">House</span>
				</h1>

				<p class="mt-2 text-sm text-zinc-500">Find a place and rent it for as long as you need.</p>

				<div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each houses as house}
						<button
							type="button"
							onclick={() => openHouse(house)}
							class="h-48 cursor-pointer rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
						>
							<div class="flex h-full items-center gap-5">
								<img
									src={house.image || '/house.png'}
									alt="House"
									class="h-20 w-20 rounded-[20px] object-cover"
								/>

								<div class="space-y-1 text-sm text-zinc-600">
									<h3 class="font-semibold text-zinc-950">
										{house.type}
									</h3>

									<p>{house.location}</p>

									<p>{house.bedrooms} bedrooms</p>

									<p class="text-zinc-900">
										₹{house.rent}/month
									</p>
								</div>
							</div>
						</button>
					{:else}
						<div
							class="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center"
						>
							<p class="text-sm text-zinc-500">No houses available right now.</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>

	{#if showRentModal && selectedHouse}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
		>
			<div
				class="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
			>
				<button
					type="button"
					onclick={closeRentModal}
					class="absolute top-4 right-5 text-2xl leading-none text-zinc-400 transition hover:text-zinc-900"
				>
					×
				</button>

				<div class="flex items-center gap-4">
					<img
						src={selectedHouse.image || '/house.png'}
						alt="House"
						class="h-20 w-20 rounded-2xl object-cover"
					/>

					<div>
						<h1 class="text-2xl font-semibold text-zinc-950">
							{selectedHouse.type}
						</h1>

						<p class="mt-1 text-sm text-zinc-500">
							{selectedHouse.location}
						</p>

						<p class="mt-1 text-sm text-zinc-500">
							{selectedHouse.bedrooms} bedrooms
						</p>
					</div>
				</div>

				<div class="mt-7">
					<p class="text-sm text-zinc-500">
						₹{selectedHouse.rent} per month
					</p>

					<label class="mt-5 mb-2 block text-sm font-medium text-zinc-700">
						How many months?
					</label>

					<input
						type="number"
						min="1"
						step="1"
						placeholder="2"
						bind:value={months}
						class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
					/>
				</div>

				<div class="mt-5 rounded-xl bg-zinc-50 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-zinc-500">Total</span>
						<span class="text-lg font-semibold text-zinc-950">
							₹{amount}
						</span>
					</div>
				</div>

				<button
					type="button"
					onclick={pay}
					class="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Pay ₹{amount}
				</button>
			</div>
		</div>
	{/if}
</div>
