<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { db } from '$lib/firebase';
	import { deleteDoc, doc } from 'firebase/firestore';

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

<div class="flex min-h-screen items-center justify-center">
	<h1 class="text-2xl font-semibold">Payment successful.</h1>
</div>
