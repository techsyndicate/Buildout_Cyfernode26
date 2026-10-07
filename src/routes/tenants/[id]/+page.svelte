<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import {
		collection,
		addDoc,
		getDocs,
		query,
		orderBy,
		serverTimestamp,
		doc,
		getDoc,
		updateDoc
	} from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let loading = $state(true);
	let isOwner = $state(true);
	let complaints = $state<any[]>([]);

	let title = $state('');
	let description = $state('');
	let submitting = $state(false);

	let replies = $state<Record<string, any[]>>({});
	let replyText = $state<Record<string, string>>({});

	let rulesText = $state('');
	let savingRules = $state(false);

	let tenantId = $derived(page.params.id);

	async function loadData(currentTenantId: string) {
		if (!currentTenantId) return;

		loading = true;

		const user = auth.currentUser;

		if (!user) return;

		const tenantRef = doc(db, 'tenantSpaces', currentTenantId);
		const tenantSnap = await getDoc(tenantRef);

		if (!tenantSnap.exists()) {
			goto('/tenants');
			return;
		}

		const data = tenantSnap.data();

		rulesText = data.rules || '';

		const q = query(
			collection(db, 'tenantSpaces', currentTenantId, 'maintenance'),
			orderBy('createdAt', 'desc')
		);

		const snap = await getDocs(q);

		complaints = snap.docs.map((d) => ({
			id: d.id,
			...d.data()
		}));

		replies = {};

		for (const complaint of complaints) {
			const replySnap = await getDocs(
				query(
					collection(db, 'tenantSpaces', currentTenantId, 'maintenance', complaint.id, 'replies'),
					orderBy('createdAt', 'asc')
				)
			);

			replies[complaint.id] = replySnap.docs.map((r) => ({
				id: r.id,
				...r.data()
			}));
		}

		loading = false;
	}

	$effect(() => {
		if (tenantId && auth.currentUser) {
			loadData(tenantId);
		}
	});

	async function saveRules() {
		if (!tenantId) return;

		savingRules = true;

		try {
			await updateDoc(doc(db, 'tenantSpaces', tenantId), {
				rules: rulesText
			});
		} finally {
			savingRules = false;
		}
	}

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
		const cookies = document.cookie.split('; ');
		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));
		const tenantMode = tenantCookie?.split('=')[1] === 'true';

		isOwner = !tenantMode;

		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/');
				return;
			}

			if (tenantMode) {
				loadData(tenantId);
			} else if (tenantId) {
				loadData(tenantId);
			}
		});

		return unsubscribe;
	});

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
		await signOut(auth);
		goto('/');
	}
</script>
<div class="relative flex min-h-screen w-full overflow-hidden bg-[#f2ecce] text-zinc-900">
    <div class="fixed inset-0 z-0 h-full w-full bg-[#f2ecce]"></div>


	<main class="relative z-10 flex-1 overflow-y-auto p-6 sm:p-10">
		<div class="mx-auto max-w-3xl">
			<button
				onclick={() => goto(isOwner ? '/tenants' : '/tenant/landlords')}
				class="rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/30"
			>
				← Back
			</button>

			<div
				class="mt-6 flex items-center justify-between rounded-3xl border border-white/40 bg-white/25 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
			>
				<div>
					<h1 class="text-2xl font-bold tracking-tight text-zinc-950">
						{isOwner ? 'Tenant Dashboard' : 'Property Dashboard'}
					</h1>

					<p class="mt-1 text-sm text-zinc-600">
						{isOwner
							? 'Manage rules, maintenance, and communicate with your tenant.'
							: 'View rules and report problems.'}
					</p>
				</div>

				<span
					class="rounded-full border border-white/40 bg-white/35 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur-md"
				>
					{isOwner ? 'Owner' : 'Tenant'}
				</span>
			</div>

			<div
				class="mt-8 rounded-3xl border border-white/40 bg-white/30 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
			>
				<h2 class="text-base font-semibold text-zinc-950">Rules</h2>

				<p class="mt-0.5 text-xs text-zinc-600">Important guidelines set by the landlord.</p>

				{#if isOwner}
					<textarea
						bind:value={rulesText}
						placeholder="Write Rules here (e.g., Quiet hours after 10 PM, no smoking...)"
						rows="4"
						class="mt-4 w-full resize-none rounded-xl border border-white/50 bg-white/35 p-3 text-sm text-zinc-900 backdrop-blur-md outline-none placeholder:text-zinc-500 focus:border-white/80 focus:bg-white/50"
					></textarea>

					<button
						onclick={saveRules}
						disabled={savingRules}
						class="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
					>
						{savingRules ? 'Saving...' : 'Save Rules'}
					</button>
				{:else}
					<div
						class="mt-4 min-h-[80px] rounded-xl border border-white/40 bg-white/25 p-4 text-sm whitespace-pre-line text-zinc-700 backdrop-blur-md"
					>
						{rulesText || 'No rules have been set for this space yet.'}
					</div>
				{/if}
			</div>

			{#if !isOwner}
				<div
					class="mt-8 rounded-3xl border border-white/40 bg-white/30 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
				>
					<h2 class="text-base font-semibold text-zinc-950">What needs fixing?</h2>

					<input
						bind:value={title}
						placeholder="Brief title (e.g., Leaking faucet)"
						class="mt-4 w-full rounded-xl border border-white/50 bg-white/35 px-4 py-2.5 text-sm text-zinc-900 backdrop-blur-md outline-none placeholder:text-zinc-500 focus:border-white/80 focus:bg-white/50"
					/>

					<textarea
						bind:value={description}
						placeholder="Add a few details..."
						rows="3"
						class="mt-3 w-full resize-none rounded-xl border border-white/50 bg-white/35 px-4 py-2.5 text-sm text-zinc-900 backdrop-blur-md outline-none placeholder:text-zinc-500 focus:border-white/80 focus:bg-white/50"
					></textarea>

					<button
						onclick={submitComplaint}
						disabled={submitting}
						class="mt-4 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
					>
						{submitting ? 'Sending...' : 'Submit Request'}
					</button>
				</div>
			{/if}

			<div class="mt-10">
				<div
					class="rounded-3xl border border-white/40 bg-white/30 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
				>
					<h2 class="text-base font-semibold text-zinc-950">Recent Maintenance Requests</h2>

					<div class="mt-6 space-y-4">
						{#if loading}
							<p class="text-sm text-zinc-500">Loading requests...</p>
						{:else if complaints.length === 0}
							<p class="text-sm text-zinc-500">No maintenance requests found.</p>
						{:else}
							{#each complaints as complaint}
								<div
									class="rounded-2xl border border-white/50 bg-white/30 p-6 backdrop-blur-md transition hover:bg-white/40"
								>
									<div class="flex items-start justify-between gap-4">
										<div>
											<h3 class="font-semibold text-zinc-950">
												{complaint.title}
											</h3>

											<p class="mt-1 text-sm text-zinc-700">
												{complaint.description}
											</p>
										</div>

										<span
											class="rounded-full border border-amber-200/60 bg-amber-50/70 px-2.5 py-1 text-xs font-medium text-amber-700 backdrop-blur-md"
										>
											{complaint.status}
										</span>
									</div>

									{#if replies[complaint.id]?.length}
										<div class="mt-6 space-y-3 border-t border-white/50 pt-4">
											{#each replies[complaint.id] as reply}
												<div
													class="rounded-xl border border-white/40 bg-white/25 p-3 text-sm backdrop-blur-md"
												>
													<p class="text-zinc-800">{reply.message}</p>

													<span class="mt-1 block text-[10px] text-zinc-500">
														Response from owner
													</span>
												</div>
											{/each}
										</div>
									{/if}

									{#if isOwner}
										<div class="mt-6 border-t border-white/50 pt-4">
											<div class="flex gap-2">
												<input
													bind:value={replyText[complaint.id]}
													placeholder="Write a response..."
													class="flex-1 rounded-xl border border-white/50 bg-white/35 px-3 py-2 text-sm text-zinc-900 backdrop-blur-md outline-none placeholder:text-zinc-500 focus:border-white/80 focus:bg-white/50"
												/>

												<button
													onclick={() => sendReply(complaint.id)}
													class="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
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
			</div>
		</div>
	</main>
</div>
