<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import { deleteDoc, doc } from 'firebase/firestore';
	import Grainient from '$lib/components/svelte-bits/Grainient.svelte';

	let deleting = $state(true);

	onMount(async () => {
		const houseId = page.url.searchParams.get('houseId');

		if (!houseId) {
			deleting = false;
			return;
		}

		try {
			await deleteDoc(doc(db, 'houses', houseId));
		} catch (err) {
			console.error(err);
		}

		deleting = false;

		setTimeout(() => {
			goto('/tenant/houses');
		}, 1000);
	});
</script>

<div class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black text-black">
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
		class="relative z-10 rounded-2xl border border-white/30 bg-white/20 px-12 py-10 text-center shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
	>
		<div
			class="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-white/35 backdrop-blur-lg"
		>
			{#if deleting}
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-black"></div>
			{:else}
				<span class="text-2xl text-green-600">✓</span>
			{/if}
		</div>

		<h1 class="mt-5 text-2xl font-semibold text-zinc-950">
			Payment successful.
		</h1>

		<p class="mt-2 text-sm text-zinc-700">
			Your house has been removed successfully.
		</p>

		<p class="mt-4 text-xs text-zinc-600">
			Redirecting you to your houses...
		</p>
	</div>
</div>