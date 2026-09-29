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
		goto("/");
	}

</script>

{#if loading}
	<div class="flex h-screen items-center justify-center bg-white text-zinc-900">
		<p class="text-sm text-zinc-400">Loading chat...</p>
	</div>
{:else if allowed}
	<div class="flex h-screen flex-col bg-white text-zinc-900">
		<header class="flex items-center gap-4 border-b border-zinc-200 p-5">
			<button
				onclick={() => goto('/chat')}
				class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
			>
				←
			</button>

			<div>
				<h1 class="font-bold">Chat</h1>
				<p class="text-xs text-zinc-400">ID: {chatId}</p>
			</div>
		</header>

		<main class="flex-1 overflow-y-auto bg-zinc-50 p-6">
			<div class="mx-auto flex max-w-3xl flex-col gap-3">
				{#if messages.length === 0}
					<p class="text-center text-sm text-zinc-400">No messages yet. Say something.</p>
				{/if}

				{#each messages as message}
					<div class={`flex ${message.sender === userId ? 'justify-end' : 'justify-start'}`}>
						<div
							class={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
								message.sender === userId
									? 'bg-zinc-900 text-white'
									: 'border border-zinc-200 bg-white text-zinc-900'
							}`}
						>
							<p>{message.text}</p>
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
			class="border-t border-zinc-200 bg-white p-4"
		>
			<div class="mx-auto flex max-w-3xl gap-3">
				<input
					bind:value={text}
					placeholder="Type a message..."
					class="min-w-0 flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
				/>

				<button
					type="submit"
					class="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
				>
					Send
				</button>
			</div>
		</form>
	</div>
{/if}
