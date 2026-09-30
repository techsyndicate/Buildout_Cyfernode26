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

	let name = $state('');
	let sidebarOpen = $state(true);

	let chats = $state<any[]>([]);
	let joinCode = $state('');
	let newCode = $state('');
	let error = $state('');
	let loading = $state(true);

	const links = [
		{ label: 'Home', href: '/home' },
		{ label: 'Chat', href: '/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Tenants', href: '/tenants' },
		{ label: 'Houses', href: '/houses' }
	];

	async function loadChats(uid: string) {
		const q = query(collection(db, 'chatrooms'), where('members', 'array-contains', uid));

		const snapshot = await getDocs(q);

		chats = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}));

		loading = false;
	}

	let tenant = $state(false);

	function generateCode() {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	async function createChat() {
		error = '';

		const user = auth.currentUser;

		if (!user) return;

		const code = generateCode();

		await addDoc(collection(db, 'chatrooms'), {
			code: code,
			members: [user.uid],
			createdAt: serverTimestamp()
		});

		newCode = code;

		await loadChats(user.uid);
	}

	async function joinChat() {
		error = '';

		const user = auth.currentUser;

		if (!user) return;

		if (joinCode.length !== 6) {
			error = 'Enter a 6-digit code.';
			return;
		}

		const q = query(collection(db, 'chatrooms'), where('code', '==', joinCode));

		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			error = 'Chat not found.';
			return;
		}

		const chatDoc = snapshot.docs[0];
		const chatData = chatDoc.data();

		if (chatData.members.includes(user.uid)) {
			goto(`/chat/${chatDoc.id}`);
			return;
		}

		await updateDoc(doc(db, 'chatrooms', chatDoc.id), {
			members: arrayUnion(user.uid)
		});

		joinCode = '';

		await loadChats(user.uid);
	}

	onMount(() => {
		const cookies = document.cookie.split('; ');

		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

		if (tenantCookie) {
			const value = tenantCookie.split('=')[1];
			tenant = value === 'true';
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			} else if (tenant) {
				goto('/tenant/chat');
				return;
			}

			name = user.displayName ?? 'User';

			await loadChats(user.uid);
		});

		return unsubscribe;
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
			<Grainient color1="#04ff00" color2="#0aadff" color3="#422361" />
		</div>
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
							link.href === '/chat'
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

	<main class="relative z-10 min-w-0 flex-1 overflow-y-auto p-8">
		<div class="mx-auto max-w-4xl">
			<div
				class="rounded-2xl border border-white/30 bg-white/20 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
			>
				<h1 class="text-3xl tracking-tight text-zinc-950">
					<span class="font-light italic">Chat</span>
					<span>with your</span>
					<span class="font-semibold">tenants</span>
				</h1>

				<p class="mt-2 text-zinc-800">Create a chat or join one using a code.</p>

				<div class="mt-8">
					<div
						class="rounded-3xl border border-white/40 bg-white/35 p-6 shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
					>
						<h2 class="mt-1 text-2xl font-bold text-zinc-950">Create a new chat</h2>

						<button
							onclick={createChat}
							class="mt-6 rounded-xl bg-black/70 px-5 py-3 text-sm font-medium text-white transition hover:bg-black/90"
						>
							Create Chat
						</button>

						{#if newCode}
							<div
								class="mt-5 rounded-2xl border border-white/30 bg-white/20 p-4 shadow-inner backdrop-blur-lg"
							>
								<p class="text-sm text-zinc-600">Your chat code</p>

								<p class="mt-1 text-3xl font-bold tracking-widest text-zinc-950">
									{newCode}
								</p>

								<p class="mt-2 text-sm text-zinc-600">
									Send this code to the person you want to chat with.
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

				<div class="mt-10">
					<h2 class="text-xl font-bold text-zinc-950">Your chats</h2>

					{#if loading}
						<p class="mt-4 text-zinc-700">Loading...</p>
					{:else if chats.length === 0}
						<div
							class="mt-4 rounded-2xl border border-white/40 bg-white/35 p-6 text-zinc-700 shadow-[0_6px_20px_rgba(0,0,0,0.10)] backdrop-blur-xl"
						>
							No chats yet.
						</div>
					{:else}
						<div class="mt-4 space-y-3">
							{#each chats as chat}
								<button
									onclick={() => goto(`/chat/${chat.id}`)}
									class="flex w-full items-center justify-between rounded-2xl border border-white/40 bg-white/35 p-5 text-left shadow-[0_6px_20px_rgba(0,0,0,0.10)] backdrop-blur-xl transition hover:bg-white/45 hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
								>
									<div>
										<p class="font-semibold text-zinc-950">Chat</p>

										<p class="mt-1 text-sm text-zinc-600">
											Code: {chat.code}
										</p>
									</div>

									<span class="text-zinc-600"> → </span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</main>
</div>
