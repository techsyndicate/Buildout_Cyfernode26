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
		getDoc,
		updateDoc,
		arrayUnion,
		serverTimestamp
	} from 'firebase/firestore';
	import { goto } from '$app/navigation';

	let name = $state('');
	let sidebarOpen = $state(true);

	let chats = $state<any[]>([]);
	let joinCode = $state('');
	let newCode = $state('');
	let error = $state('');
	let loading = $state(true);

	const links = [
		{ label: 'Home', href: '/tenant/home' },
		{ label: 'Chat', href: '/tenant/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Landlords', href: '/tenant/landlords' },
		{ label: 'Houses', href: '/tenant/houses' }
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
			} else if (!tenant) {
				goto('/chat');
				return;
			}

			name = user.displayName ?? 'User';

			await loadChats(user.uid);
		});

		return unsubscribe;
	});

	async function logout() {
		await signOut(auth);
		goto('/');
	}
</script>

<div class="flex h-screen w-full overflow-hidden bg-white text-black">
	<div
		class={`shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-55' : 'w-0'}`}
	>
		<div
			class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
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
							link.href === '/tenant/chat'
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

	<main class="min-w-0 flex-1 overflow-y-auto p-8">
		<div class="mx-auto max-w-4xl">
			<h1 class="text-3xl font-bold">Chat</h1>
			<p class="mt-2 text-zinc-600">Create a chat or join one using a code.</p>

			<div
				class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
			>
				<h2 class="mt-1 text-2xl font-bold">Join a chat</h2>

				<input
					bind:value={joinCode}
					maxlength="6"
					inputmode="numeric"
					placeholder="123456"
					class="mt-6 w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
				/>

				<button
					onclick={joinChat}
					class="mt-3 rounded-xl border border-black px-5 py-3 text-sm font-medium transition hover:bg-black hover:text-white"
				>
					Join Chat
				</button>

				{#if error}
					<p class="mt-3 text-sm text-red-500">{error}</p>
				{/if}
			</div>

			<div class="mt-10">
				<h2 class="text-xl font-bold">Your chats</h2>

				{#if loading}
					<p class="mt-4 text-zinc-500">Loading...</p>
				{:else if chats.length === 0}
					<div
						class="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-500 shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
					>
						No chats yet.
					</div>
				{:else}
					<div class="mt-4 space-y-3">
						{#each chats as chat}
							<button
								onclick={() => goto(`/chat/${chat.id}`)}
								class="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition hover:bg-zinc-50 hover:shadow-[0_10px_25px_rgba(0,0,0,0.09)]"
							>
								<div>
									<p class="font-semibold">Chat</p>

									<p class="mt-1 text-sm text-zinc-500">
										Code: {chat.code}
									</p>
								</div>

								<span class="text-zinc-400">→</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
