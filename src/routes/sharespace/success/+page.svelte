<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import { deleteDoc, doc } from 'firebase/firestore';

	let deleting = $state(true);

	onMount(async () => {
		const propertyId = page.url.searchParams.get('propertyId');

		if (!propertyId) {
			deleting = false;
			return;
		}

		try {
			await deleteDoc(doc(db, 'properties', propertyId));
		} catch (err) {
			console.error(err);
		}

		deleting = false;

		setTimeout(() => {
			goto('/sharespace');
		}, 2000);
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<h1 class="text-2xl font-semibold">Payment successful.</h1>
</div>
