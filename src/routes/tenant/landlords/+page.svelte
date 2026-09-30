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
	import Grainient from '$lib/components/svelte-bits/Grainient.svelte';

	let loading = $state(true);
	let tenantSpaces = $state<any[]>([]);
	let joinCode = $state('');
	let newCode = $state('');
	let error = $state('');
	let creating = $state(false);
	let sidebarOpen = $state(true);

	const links = [
		{ label: 'Home', href: '/tenant/home' },
		{ label: 'Chat', href: '/tenant/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Landlords', href: '/tenant/landlords' },
		{ label: 'Houses', href: '/tenant/houses' }
	];

	let tenant = $state(false);

	async function loadSpaces(uid: string) {
		const q = query(collection(db, 'tenantSpaces'), where('members', 'array-contains', uid));
		const snapshot = await getDocs(q);

		tenantSpaces = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
			if (!user) goto('/');
			else if (!tenant) {
				goto('/tenants');
				return;
			} else loadSpaces(user.uid);
		});
	});

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
		await signOut(auth);
		goto('/');
	}
</script>

<div class="relative flex h-screen w-full overflow-hidden bg-black text-black">
	<div class="fixed inset-0 z-0 h-full w-full">
		<div style="width: 100%; height: 100%; position: relative;">
			<Grainient color1="#00b3a7" color2="#011ffe" color3="#fff700" />
		</div>
	</div>

	<div
		class={`relative z-10 shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-55' : 'w-0'}`}
	>
		<div
			class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-white/30 bg-white/20 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
		>
			<div class="px-3 py-3">
				<span class="text-lg font-light italic">tenant</span><span class="text-lg font-semibold"
					>App</span
				>
			</div>

			<nav class="mt-3 flex flex-1 flex-col gap-1">
				{#each links as link}
					<button
						type="button"
						onclick={() => goto(link.href)}
						class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
							link.href === '/tenant/landlords'
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

	<main class="relative z-10 flex-1 overflow-y-auto p-10">
		<div class="mx-auto max-w-4xl">
			<div>
				<h1 class="text-3xl text-zinc-950">
					<span class="font-light italic">Talk</span> with your
					<span class="font-semibold">landlords</span>
				</h1>

				<p class="text-sm text-zinc-800">Manage your properties and connect with tenants.</p>
			</div>

			<div class="mt-8">
				<div
					class="rounded-2xl border border-white/40 bg-white/35 p-6 shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
				>
					<h2 class="mt-2 text-base font-semibold text-zinc-950">Join a space</h2>

					<p class="mt-1 text-sm text-zinc-700">
						Enter the 6-digit code provided by your landlord.
					</p>

					<input
						bind:value={joinCode}
						maxlength="6"
						inputmode="numeric"
						placeholder="123456"
						class="mt-6 w-full rounded-lg border border-white/40 bg-white/20 px-4 py-2.5 text-sm text-zinc-950 backdrop-blur-md transition outline-none placeholder:text-zinc-500 focus:border-zinc-900"
					/>

					{#if error}
						<p class="mt-2 text-xs text-red-500">{error}</p>
					{/if}

					<button
						onclick={joinSpace}
						class="mt-4 rounded-lg bg-black/70 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/90"
					>
						Join Space
					</button>
				</div>
			</div>

			<div class="mt-12">
				<h2 class="text-base font-semibold text-zinc-950">Your Properties</h2>

				{#if loading}
					<p class="mt-4 text-sm text-zinc-700">Loading spaces...</p>
				{:else if tenantSpaces.length === 0}
					<p class="mt-4 text-sm text-zinc-700">You aren't connected to any properties yet.</p>
				{:else}
					<div class="mt-4 grid gap-4 md:grid-cols-2">
						{#each tenantSpaces as tenant}
							<button
								onclick={() => goto(`/tenants/${tenant.id}`)}
								class="flex items-center justify-between rounded-2xl border border-white/40 bg-white/35 p-5 text-left shadow-[0_6px_20px_rgba(0,0,0,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
							>
								<div>
									<span class="font-medium text-zinc-950">Tenant Space</span>

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
	</main>
</div>
