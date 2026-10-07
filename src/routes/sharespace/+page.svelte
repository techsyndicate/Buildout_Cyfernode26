<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { collection, getDocs, query, orderBy } from 'firebase/firestore';
	import Grainient from '$lib/components/svelte-bits/Grainient.svelte';

	let name = $state('');
	let sidebarOpen = $state(true);
	let links = $state<any[]>([]);
	let properties = $state<any[]>([]);
	let isTenant = $state(false);

	function openProperty(property: any) {
		goto(`/sharespace/list?id=${property.id}`);
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
	}

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

		await signOut(auth);
		goto('/');
	}

	onMount(() => {
		const cookies = document.cookie.split('; ');
		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

		isTenant = tenantCookie?.split('=')[1] === 'true';

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

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			}

			name = user.displayName ?? 'User';
			await loadProperties();
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

				<p class="mt-2 text-sm text-zinc-800">Find somewhere useful. Rent somewhere you don't.</p>

				<div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each properties as property}
						<button
							type="button"
							onclick={() => openProperty(property)}
							class="h-48 cursor-pointer rounded-2xl border border-white/40 bg-white/35 p-6 text-left shadow-[0_4px_15px_rgba(0,0,0,0.12)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/45"
						>
							<div class="flex h-full items-center gap-5">
								<img
									src={property.images?.[0] || property.image || '/house.png'}
									alt={property.type}
									class="h-24 w-24 rounded-[25px] object-cover"
								/>

								<div class="space-y-1 text-sm text-zinc-700">
									<p class="font-semibold text-zinc-950">
										{property.type}
									</p>

									<p>
										{property.size}
										{property.size > 1 ? ' People' : ' Person'}
									</p>

									<p>
										₹{property.hourlyPrice || 50}/hour
									</p>

									<p class="text-xs text-zinc-500">
										{property.location}
									</p>
								</div>
							</div>
						</button>
					{:else}
						<div
							class="col-span-full rounded-2xl border border-dashed border-white/60 bg-white/30 p-12 text-center"
						>
							<p class="text-sm text-zinc-500">No spaces available right now.</p>
						</div>
					{/each}
				</div>

				{#if !isTenant}
					<div
						class="mt-10 flex min-h-36 items-center justify-between gap-8 rounded-2xl border border-white/40 bg-white/35 px-8 py-7 shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
					>
						<div class="max-w-s">
							<p class="mt-1 text-lg font-medium text-zinc-950">
								Have some space? Let someone make use of it.
							</p>

							<p class="mt-1 text-sm text-zinc-700">List an office, kitchen, garage or pool.</p>
						</div>

						<button
							type="button"
							onclick={() => goto('/sharespace/list')}
							class="rounded-[15px] bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
						>
							List your space
						</button>
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
