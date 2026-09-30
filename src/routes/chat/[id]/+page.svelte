<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import {
		doc,
		getDoc,
		collection,
		addDoc,
		query,
		orderBy,
		onSnapshot,
		serverTimestamp
	} from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Grainient from '$lib/components/svelte-bits/Grainient.svelte';

	let messages = $state<any[]>([]);
	let text = $state('');
	let userId = $state('');
	let allowed = $state(false);
	let loading = $state(true);

	let chatId = $derived(page.params.id);

	async function loadChat(currentChatId: string) {
		if (!currentChatId || !auth.currentUser) return;
		loading = true;

		const chat = await getDoc(doc(db, 'chatrooms', currentChatId));

		if (!chat.exists() || !chat.data().members?.includes(auth.currentUser.uid)) {
			goto('/chat');
			return;
		}

		allowed = true;
		loading = false;

		const messagesQuery = query(
			collection(db, 'chatrooms', currentChatId, 'messages'),
			orderBy('timestamp', 'asc')
		);

		return onSnapshot(messagesQuery, (snapshot) => {
			messages = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		});
	}

	$effect(() => {
		if (chatId && userId) {
			const unsubscribe = loadChat(chatId);
			return () => {
				unsubscribe.then((unsub) => unsub?.());
			};
		}
	});

	async function sendMessage() {
		if (!text.trim() || !userId || !chatId) return;

		await addDoc(collection(db, 'chatrooms', chatId, 'messages'), {
			sender: userId,
			text: text.trim(),
			timestamp: serverTimestamp()
		});

		text = '';
	}

	onMount(() => {
		return onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/');
				return;
			}

			userId = user.uid;
			if (chatId) {
				loadChat(chatId);
			}
		});
	});

	async function logout() {
		await signOut(auth);
		goto('/');
	}
</script>

<div class="relative flex h-screen w-full overflow-hidden text-zinc-900">
	<div class="fixed inset-0 z-0 h-full w-full">
		<div class="relative h-full w-full">
			<Grainient color1="#ff8800" color2="#332ab7" color3="#f320bb" />
		</div>
	</div>

	{#if loading}
		<div class="relative z-10 flex h-screen w-full items-center justify-center">
			<p class="text-sm font-light text-white/80">Loading chat...</p>
		</div>
	{:else if allowed}
		<div class="relative z-10 flex h-screen w-full flex-col backdrop-blur-md">
			<header
				class="flex items-center gap-4 border-b border-white/20 bg-white/15 px-6 py-4 backdrop-blur-xl"
			>
				<button
					onclick={() => goto('/chat')}
					class="rounded-xl border border-white/30 bg-white/20 px-3.5 py-2 text-sm text-white transition-all duration-200 hover:bg-white/30"
				>
					&larr;
				</button>

				<div>
					<h1 class="font-semibold text-white">Chat Room</h1>
					<p class="text-xs font-light text-white/70">ID: {chatId}</p>
				</div>
			</header>

			<main class="flex-1 overflow-y-auto p-6">
				<div class="mx-auto flex max-w-3xl flex-col gap-3.5">
					{#if messages.length === 0}
						<p class="mt-4 text-center text-sm font-light text-white/70">
							No messages yet. Say something.
						</p>
					{/if}

					{#each messages as message}
						<div class={`flex ${message.sender === userId ? 'justify-end' : 'justify-start'}`}>
							<div
								class={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-lg backdrop-blur-md transition-all ${
									message.sender === userId
										? 'border border-white/40 bg-white/35 font-medium text-white'
										: 'border border-white/20 bg-white/20 text-white'
								}`}
							>
								<p class="leading-relaxed">{message.text}</p>
							</div>
						</div>
					{/each}
				</div>
			</main>

			<form
				onsubmit={(event) => {
					event.preventDefault();
					sendMessage();
				}}
				class="border-t border-white/20 bg-white/15 p-4 backdrop-blur-xl"
			>
				<div class="mx-auto flex max-w-3xl gap-3">
					<input
						bind:value={text}
						placeholder="Type a message..."
						class="min-w-0 flex-1 rounded-2xl border border-white/30 bg-white/20 px-4 py-3 text-sm text-white placeholder-white/60 backdrop-blur-md transition-all outline-none focus:border-white/60 focus:bg-white/30"
					/>
				</div>
			</form>
		</div>
	{/if}
</div>
