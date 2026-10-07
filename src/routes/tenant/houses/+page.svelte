<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { collection, getDocs, query, orderBy } from 'firebase/firestore';
	import Grainient from '$lib/components/svelte-bits/Grainient.svelte';

	let name = $state('');
	let sidebarOpen = $state(true);
	let tenant = $state(false);
	let houses = $state<any[]>([]);

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
		goto(`/tenant/houses/list?id=${house.id}`);
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

<div class="relative flex h-screen w-full overflow-hidden text-black">
	<div class="fixed inset-0 z-0 h-full w-full">
		<div class="relative h-full w-full">
			<Grainient color1="#40981b" color2="#f53100" color3="#0091ff" />
		</div>
	</div>

	<div
		class={`relative z-10 shrink-0 overflow-hidden transition-all duration-300 ${
			sidebarOpen ? 'w-55' : 'w-0'
		}`}
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

	<main class="relative z-10 min-w-0 flex-1 overflow-y-auto">
		<div class="flex min-h-screen items-center justify-center p-8">
			<div
				class="min-h-[550px] w-full max-w-6xl rounded-[25px] border border-white/40 bg-white/35 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
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
							class="h-48 cursor-pointer rounded-2xl border border-white/50 bg-white/60 p-6 text-left shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
						>
							<div class="flex h-full items-center gap-5">
								<img
									src={house.images?.[0] || house.image || '/house.png'}
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
							class="col-span-full rounded-2xl border border-dashed border-white/60 bg-white/30 p-12 text-center backdrop-blur-sm"
						>
							<p class="text-sm text-zinc-500">No houses available right now.</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>
</div>
