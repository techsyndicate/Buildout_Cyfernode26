<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import ColorBends from '$lib/components/svelte-bits/ColorBends.svelte';

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				goto('/home');
			}
		});

		return unsubscribe;
	});

	async function signIn() {
		const provider = new GoogleAuthProvider();

		try {
			await signInWithPopup(auth, provider);
			await goto('/home');
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div
	class="relative m-6 grid h-[93.5vh] grid-rows-[auto_1fr] overflow-hidden rounded-2xl bg-black p-8"
>
	<div class="absolute inset-0 -z-0 overflow-hidden rounded-2xl">
		<ColorBends
			rotation={90}
			autoRotate={0}
			speed={0.2}
			scale={1}
			frequency={1}
			warpStrength={1}
			mouseInfluence={1}
			parallax={0.5}
			noise={0.15}
			iterations={1}
			intensity={1.5}
			bandWidth={6}
			colors={['#00bfff']}
		/>
	</div>

	<header class="relative z-10 flex w-full items-center justify-between">
		<span class="-mt-3 text-xl font-semibold text-white">tenantApp</span>

		<nav class="-mt-3 flex gap-8 font-medium">
			<a href="#rent" class="text-white hover:underline">About Us</a>
			<a href="#contact" class="text-white hover:underline">Contact</a>
		</nav>
	</header>

	<main
		class="relative z-10 flex flex-col items-center justify-center gap-10 self-center text-center"
	>
		<div>
			<h1 class="text-5xl font-bold text-white">tenantApp</h1>
			<p class="mt-2 text-3xl text-white">Rent out, check details, and more..</p>
		</div>

		<div class="flex flex-col items-center gap-3">
			<p class="text-xl text-white">Wanna see more?</p>

			<button
				onclick={signIn}
				class="rounded-lg border-2 border-white px-6 py-2 font-medium text-white transition hover:bg-white hover:text-black"
			>
				Sign Up
			</button>
		</div>
	</main>
</div>
