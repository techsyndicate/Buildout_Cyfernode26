<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
	import {
		collection,
		addDoc,
		getDocs,
		query,
		orderBy,
		serverTimestamp,
		doc,
		getDoc
	} from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let loading = $state(true);
	let isOwner = $state(false);
	let complaints = $state<any[]>([]);

	let title = $state('');
	let description = $state('');
	let submitting = $state(false);

	let replies = $state<Record<string, any[]>>({});
	let replyText = $state<Record<string, string>>({});

	let tenantId = $derived(page.params.id);

	const links = [
		{ label: 'Home', href: '/home' },
		{ label: 'Chat', href: '/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Tenants', href: '/tenants' }
	];

	async function loadData(currentTenantId: string) {
		if (!currentTenantId) return;
		loading = true;

		const user = auth.currentUser;
		if (!user) return;

		const tenantRef = doc(db, 'tenantSpaces', currentTenantId);
		const tenantSnap = await getDoc(tenantRef);

		if (!tenantSnap.exists() || !tenantSnap.data().members?.includes(user.uid)) {
			goto('/tenants');
			return;
		}

		isOwner = tenantSnap.data().ownerId === user.uid;

		const q = query(
			collection(db, 'tenantSpaces', currentTenantId, 'maintenance'),
			orderBy('createdAt', 'desc')
		);
		const snap = await getDocs(q);

		complaints = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

		for (let c of complaints) {
			const replySnap = await getDocs(
				query(
					collection(db, 'tenantSpaces', currentTenantId, 'maintenance', c.id, 'replies'),
					orderBy('createdAt', 'asc')
				)
			);
			replies[c.id] = replySnap.docs.map((r) => ({ id: r.id, ...r.data() }));
		}

		loading = false;
	}

	$effect(() => {
		if (tenantId && auth.currentUser) {
			loadData(tenantId);
		}
	});

	async function submitComplaint() {
		if (!title.trim() || !description.trim() || submitting || !tenantId) return;
		submitting = true;

		try {
			await addDoc(collection(db, 'tenantSpaces', tenantId, 'maintenance'), {
				title: title.trim(),
				description: description.trim(),
				createdBy: auth.currentUser?.uid,
				status: 'Open',
				createdAt: serverTimestamp()
			});
			title = '';
			description = '';
			await loadData(tenantId);
		} finally {
			submitting = false;
		}
	}

	async function sendReply(complaintId: string) {
		const message = replyText[complaintId]?.trim();
		if (!message || !tenantId) return;

		await addDoc(collection(db, 'tenantSpaces', tenantId, 'maintenance', complaintId, 'replies'), {
			message,
			createdBy: auth.currentUser?.uid,
			createdAt: serverTimestamp()
		});

		replyText[complaintId] = '';
		await loadData(tenantId);
	}

	onMount(() => {
		return onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/');
			} else if (tenantId) {
				loadData(tenantId);
			}
		});
	});
</script>

<div class="flex h-screen bg-white text-zinc-900">
	<main class="flex-1 overflow-y-auto p-10">
		<div class="mx-auto max-w-3xl">
			<button
				onclick={() => goto('/tenants')}
				class="text-sm font-medium text-zinc-400 hover:text-zinc-900"
			>
				← Back to tenants
			</button>

			<div class="mt-6 flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold tracking-tight">Maintenance</h1>
					<p class="text-sm text-zinc-500">
						{isOwner
							? 'Review and respond to issues reported by your tenant.'
							: 'Report a problem in your space.'}
					</p>
				</div>
				<span class="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
					{isOwner ? 'Owner' : 'Tenant'}
				</span>
			</div>

			{#if !isOwner}
				<div class="mt-8 rounded-2xl border border-zinc-200 p-6 shadow-sm">
					<h2 class="text-base font-semibold">What needs fixing?</h2>
					<input
						bind:value={title}
						placeholder="Brief title (e.g., Leaking faucet)"
						class="mt-4 w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
					/>
					<textarea
						bind:value={description}
						placeholder="Add a few details..."
						rows="3"
						class="mt-3 w-full resize-none rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
					></textarea>
					<button
						onclick={submitComplaint}
						disabled={submitting}
						class="mt-4 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
					>
						{submitting ? 'Sending...' : 'Submit Request'}
					</button>
				</div>
			{/if}

			<div class="mt-10 space-y-6">
				<h2 class="text-base font-semibold">Recent Requests</h2>

				{#if loading}
					<p class="text-sm text-zinc-400">Loading requests...</p>
				{:else if complaints.length === 0}
					<p class="text-sm text-zinc-400">No maintenance requests found.</p>
				{:else}
					{#each complaints as complaint}
						<div class="rounded-2xl border border-zinc-200 p-6">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="font-semibold">{complaint.title}</h3>
									<p class="mt-1 text-sm text-zinc-600">{complaint.description}</p>
								</div>
								<span
									class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
								>
									{complaint.status}
								</span>
							</div>

							{#if replies[complaint.id]?.length}
								<div class="mt-6 space-y-3 border-t border-zinc-100 pt-4">
									{#each replies[complaint.id] as reply}
										<div class="rounded-xl bg-zinc-50 p-3 text-sm">
											<p>{reply.message}</p>
											<span class="mt-1 block text-[10px] text-zinc-400">Response from owner</span>
										</div>
									{/each}
								</div>
							{/if}

							{#if isOwner}
								<div class="mt-6 border-t border-zinc-100 pt-4">
									<div class="flex gap-2">
										<input
											bind:value={replyText[complaint.id]}
											placeholder="Write a response..."
											class="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
										/>
										<button
											onclick={() => sendReply(complaint.id)}
											class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
										>
											Reply
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</main>
</div>
