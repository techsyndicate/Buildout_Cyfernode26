<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
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

	const chatId = page.params.id;

	async function sendMessage() {
		if (!text.trim()) return;
		if (!userId) return;

		await addDoc(collection(db, 'chatrooms', chatId, 'messages'), {
			sender: userId,
			text: text.trim(),
			timestamp: serverTimestamp()
		});

		text = '';
	}

	onMount(() => {
		const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				goto('/');
				return;
			}

			userId = user.uid;

			const chat = await getDoc(doc(db, 'chatrooms', chatId));

			if (!chat.exists()) {
				goto('/chat');
				return;
			}

			const data = chat.data();

			if (!data.members.includes(user.uid)) {
				goto('/chat');
				return;
			}

			allowed = true;
			loading = false;

			const messagesQuery = query(
				collection(db, 'chatrooms', chatId, 'messages'),
				orderBy('timestamp', 'asc')
			);

			const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
				messages = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data()
				}));
			});

			return unsubscribeMessages;
		});

		return unsubscribeAuth;
	});
</script>

{#if loading}
	<div class="flex h-screen items-center justify-center">
		<p>Loading...</p>
	</div>
{:else if allowed}
	<div class="flex h-screen flex-col">
		<header class="flex items-center gap-4 border-b p-5">
			<button onclick={() => goto('/chat')} class="rounded-xl border px-3 py-2 hover:bg-zinc-100">
				←
			</button>

			<div>
				<h1 class="font-bold">Chat</h1>
				<p class="text-sm text-zinc-500">ID: {chatId}</p>
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
							class={`max-w-[70%] rounded-2xl px-4 py-3 ${
								message.sender === userId ? 'bg-black text-white' : 'border bg-white'
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
			class="border-t bg-white p-4"
		>
			<div class="mx-auto flex max-w-3xl gap-3">
				<input
					bind:value={text}
					placeholder="Type a message..."
					class="min-w-0 flex-1 rounded-xl border px-4 py-3 outline-none focus:border-black"
				/>

				<button
					type="submit"
					class="rounded-xl bg-black px-5 py-3 font-medium text-white hover:bg-zinc-800"
				>
					Send
				</button>
			</div>
		</form>
	</div>
{/if}
