<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import {
		collection,
		addDoc,
		getDocs,
		query,
		where,
		doc,
		updateDoc,
		arrayUnion,
		serverTimestamp
	} from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import DarkVeil from '$lib/components/DarkVeil.svelte';

	let loading = $state(true);
	let tenantSpaces = $state<any[]>([]);
	let joinCode = $state('');
	let newCode = $state('');
	let error = $state('');
	let creating = $state(false);
	let sidebarOpen = $state(true);

	const links = [
		{ label: 'Home', href: '/home' },
		{ label: 'Chat', href: '/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Tenants', href: '/tenants' },
		{ label: 'Houses', href: '/houses' }
	];

	let tenant = $state(false);

	async function loadSpaces(uid: string) {
		const q = query(collection(db, 'tenantSpaces'), where('members', 'array-contains', uid));
		const snapshot = await getDocs(q);

		tenantSpaces = snapshot.docs.map((d) => ({
			id: d.id,
			...d.data()
		}));

		loading = false;
	}

	async function createSpace() {
		const user = auth.currentUser;

		if (!user || creating) return;

		creating = true;

		try {
			const code = Math.floor(100000 + Math.random() * 900000).toString();

			await addDoc(collection(db, 'tenantSpaces'), {
				code,
				ownerId: user.uid,
				members: [user.uid],
				createdAt: serverTimestamp()
			});

			newCode = code;

			await loadSpaces(user.uid);
		} finally {
			creating = false;
		}
	}

	async function joinSpace() {
		error = '';

		const user = auth.currentUser;

		if (!user) return;

		if (joinCode.length !== 6) {
			error = 'Please enter a valid 6-digit code.';
			return;
		}

		const q = query(collection(db, 'tenantSpaces'), where('code', '==', joinCode));
		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			error = 'Property not found with this code.';
			return;
		}

		const tenantDoc = snapshot.docs[0];
		const data = tenantDoc.data();

		if (!data.members.includes(user.uid)) {
			await updateDoc(doc(db, 'tenantSpaces', tenantDoc.id), {
				members: arrayUnion(user.uid)
			});
		}

		goto(`/tenants/${tenantDoc.id}`);
	}

	onMount(() => {
		const cookies = document.cookie.split('; ');

		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

		if (tenantCookie) {
			const value = tenantCookie.split('=')[1];
			tenant = value === 'true';
		}

		return onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/');
			} else if (tenant) {
				goto('/tenant/landlords');
				return;
			} else {
				loadSpaces(user.uid);
			}
		});
	});

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
		await signOut(auth);
		goto('/');
	}
</script>

<div class="relative flex h-screen w-full overflow-hidden bg-black text-zinc-900">
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
				<span class="text-lg font-light italic">tenant</span>
				<span class="text-lg font-semibold">App</span>
			</div>

			<nav class="mt-3 flex flex-1 flex-col gap-1">
				{#each links as link}
					<button
						type="button"
						onclick={() => goto(link.href)}
						class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
							link.href === '/tenants'
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

	<main class="relative z-10 min-w-0 flex-1 overflow-y-auto p-10">
		<div class="mx-auto max-w-4xl">
			<div
				class="rounded-2xl border border-white/30 bg-white/20 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
			>
				<div>
					<h1 class="text-3xl tracking-tight text-zinc-950">
						<span class="font-light italic">Manage</span>
						your
						<span class="font-semibold">tenants</span>
					</h1>

					<p class="text-sm text-zinc-700">
						Manage your properties and connect with tenants.
					</p>
				</div>

				<div class="mt-8">
					<div
						class="rounded-2xl border border-white/40 bg-white/35 p-6 shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
					>
						<h2 class="mt-2 text-base font-semibold text-zinc-950">
							Create a property space
						</h2>

						<p class="mt-1 text-sm text-zinc-700">
							Generate an invite code to share with your tenant.
						</p>

						<button
							onclick={createSpace}
							disabled={creating}
							class="mt-6 rounded-lg bg-black/70 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-50"
						>
							{creating ? 'Creating...' : 'Create Space'}
						</button>

						{#if newCode}
							<div
								class="mt-6 rounded-xl border border-white/30 bg-white/20 p-4 text-center shadow-inner backdrop-blur-lg"
							>
								<span class="text-xs text-zinc-600">
									Your Invite Code
								</span>

								<p class="mt-1 text-2xl font-bold tracking-widest text-zinc-950">
									{newCode}
								</p>
							</div>
						{/if}

						{#if error}
							<p class="mt-4 text-sm font-medium text-red-600">
								{error}
							</p>
						{/if}
					</div>
				</div>

				<div class="mt-12">
					<h2 class="text-base font-semibold text-zinc-950">
						Your Properties
					</h2>

					{#if loading}
						<p class="mt-4 text-sm text-zinc-700">
							Loading spaces...
						</p>
					{:else if tenantSpaces.length === 0}
						<div
							class="mt-4 rounded-2xl border border-white/40 bg-white/20 p-5 text-sm text-zinc-700 backdrop-blur-lg"
						>
							You aren't connected to any properties yet.
						</div>
					{:else}
						<div class="mt-4 grid gap-4 md:grid-cols-2">
							{#each tenantSpaces as tenant}
								<button
									onclick={() => goto(`/tenants/${tenant.id}`)}
									class="flex items-center justify-between rounded-2xl border border-white/40 bg-white/35 p-5 text-left shadow-[0_6px_20px_rgba(0,0,0,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
								>
									<div>
										<span class="font-medium text-zinc-950">
											Tenant Space
										</span>

										<p class="mt-1 text-xs text-zinc-600">
											Code: {tenant.code}
										</p>
									</div>

									<span class="text-zinc-600">→</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</main>
</div>