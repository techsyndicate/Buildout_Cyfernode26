<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import ColorBends from '$lib/components/svelte-bits/ColorBends.svelte';

	let showNav = $state(false);

	onMount(() => {
		const unsub = onAuthStateChanged(auth, (u) => {
			if (u) goto('/home');
		});

		const checkScroll = () => {
			showNav = window.scrollY > 500;
		};

		window.addEventListener('scroll', checkScroll);
		return () => {
			unsub();
			window.removeEventListener('scroll', checkScroll);
		};
	});

	async function handleLogin() {
		try {
			await signInWithPopup(auth, new GoogleAuthProvider());
			goto('/home');
		} catch (err) {
			console.log(err);
		}
	}
</script>

<div class="bg-white min-h-screen">
	<div class={`fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto transition-all duration-300 ${showNav ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
		<div class="bg-black rounded-xl px-6 py-3 flex items-center justify-between shadow-xl relative overflow-hidden">
			<div class="absolute inset-0 overflow-hidden rounded-xl">
				<ColorBends rotation={0} autoRotate={0} speed={0.2} scale={0.4} frequency={2.5} warpStrength={0.8} mouseInfluence={0.5} parallax={0.2} noise={0.1} iterations={1} intensity={1.5} bandWidth={8} colors={['#00bfff']} />
			</div>

			<span class="text-white font-bold relative z-10">tenantApp</span>

			<div class="hidden md:flex gap-6 text-sm text-zinc-300 relative z-10">
				<a href="#features" class="hover:text-white">Features</a>
				<a href="#testimonials" class="hover:text-white">Testimonials</a>
				<a href="#contact" class="hover:text-white">Contact</a>
			</div>

			<button onclick={handleLogin} class="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 relative z-10">
				Sign In
			</button>
		</div>
	</div>

	<div class="bg-black m-4 min-h-[90vh] rounded-2xl p-6 md:p-10 flex flex-col justify-between relative overflow-hidden">
		<div class="absolute inset-0 overflow-hidden rounded-2xl">
			<ColorBends rotation={90} autoRotate={0} speed={0.2} scale={1} frequency={1} warpStrength={1} mouseInfluence={1} parallax={0.5} noise={0.15} iterations={1} intensity={1.5} bandWidth={6} colors={['#00bfff']} />
		</div>

		<header class="flex items-center justify-between relative z-10">
			<span class="text-white font-bold">tenantApp</span>
			<nav class="hidden md:flex gap-6 text-sm text-zinc-300">
				<a href="#features" class="hover:text-white">Features</a>
				<a href="#testimonials" class="hover:text-white">Testimonials</a>
				<a href="#contact" class="hover:text-white">Contact</a>
			</nav>
		</header>

		<main class="flex flex-col items-center text-center my-auto relative z-10">
			<h1 class="text-4xl md:text-6xl font-extrabold text-white">tenantApp</h1>
			<p class="text-zinc-300 text-lg md:text-xl mt-4">heading placeholder 1</p>

			<button onclick={handleLogin} class="mt-8 border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-black transition">
				Sign Up with Google
			</button>
		</main>

		<div class="text-center relative z-10">
			<span class="text-xs text-zinc-500">Scroll down for more</span>
		</div>
	</div>

	<div class="py-16 px-6">
		<section id="features" class="max-w-5xl mx-auto mb-20">
			<h2 class="text-2xl md:text-3xl font-bold text-center mb-10">heading placeholder 2</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="bg-zinc-50 border border-zinc-200 p-6 rounded-xl">
					<p class="text-sm text-zinc-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.</p>
				</div>
				<div class="bg-zinc-50 border border-zinc-200 p-6 rounded-xl">
					<p class="text-sm text-zinc-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.</p>
				</div>
				<div class="bg-zinc-50 border border-zinc-200 p-6 rounded-xl">
					<p class="text-sm text-zinc-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.</p>
				</div>
			</div>
		</section>

		<section id="testimonials" class="max-w-5xl mx-auto">
			<h2 class="text-2xl md:text-3xl font-bold text-center mb-10">heading placeholder 3</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="bg-zinc-50 border border-zinc-200 p-6 rounded-xl">
					<p class="text-sm text-zinc-700">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.</p>
				</div>
				<div class="bg-zinc-50 border border-zinc-200 p-6 rounded-xl">
					<p class="text-sm text-zinc-700">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.</p>
				</div>
			</div>
		</section>
	</div>

	<footer id="contact" class="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
		© 2026 tenantApp. All rights reserved.
	</footer>
</div>