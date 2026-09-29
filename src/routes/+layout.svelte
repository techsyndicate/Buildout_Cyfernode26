<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	async function logout() {
		await signOut(auth);
		goto("/");
	}

</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
