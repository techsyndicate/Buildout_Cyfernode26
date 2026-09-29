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

	async function handleTenantLogin() {
		try {
			await signInWithPopup(auth, new GoogleAuthProvider());
			document.cookie = 'tenant=true; path=/';
			goto('/tenant/home');
		} catch (err) {
			console.log(err);
		}
	}

	async function logout() {
		await signOut(auth);
		goto('/');
	}
</script>

<div class="min-h-screen bg-white">
	<div
		class={`fixed top-4 right-4 left-4 z-50 mx-auto max-w-7xl transition-all duration-300 ${showNav ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'}`}
	>
		<div
			class="relative flex items-center justify-between overflow-hidden rounded-xl bg-black px-6 py-3 shadow-xl"
		>
			<div class="absolute inset-0 overflow-hidden rounded-xl">
				<ColorBends
					rotation={0}
					autoRotate={0}
					speed={0.2}
					scale={0.4}
					frequency={2.5}
					warpStrength={0.8}
					mouseInfluence={0.5}
					parallax={0.2}
					noise={0.1}
					iterations={1}
					intensity={1.5}
					bandWidth={8}
					colors={['#00bfff']}
				/>
			</div>

			<span class="relative z-10 text-xl font-bold text-white">tenantApp</span>

			<div class="relative z-10 hidden gap-6 text-sm text-zinc-300 md:flex">
				<a href="#features" class="hover:text-white">Features</a>
				<a href="#testimonials" class="hover:text-white">Testimonials</a>
				<a href="#contact" class="hover:text-white">Contact</a>
			</div>

			<button
				onclick={handleLogin}
				class="relative z-10 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200"
			>
				Login with Google
			</button>
		</div>
	</div>

	<div
		class="relative m-4 flex min-h-[95.5vh] flex-col justify-between overflow-hidden rounded-2xl bg-black p-6 md:p-10"
	>
		<div class="absolute inset-0 overflow-hidden rounded-2xl">
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

		<header class="relative z-10 -mt-3 -ml-2 flex items-center justify-between">
			<span class="text-2xl font-bold text-white">tenantApp</span>
			<nav class="hidden gap-6 text-sm text-zinc-300 md:flex">
				<a href="#features" class="hover:text-white">Features</a>
				<a href="#testimonials" class="hover:text-white">Testimonials</a>
				<a href="#contact" class="hover:text-white">Contact</a>
			</nav>
		</header>

		<main class="relative z-10 my-auto flex flex-col items-center text-center">
			<h1 class="text-4xl font-extrabold text-white md:text-6xl">tenantApp</h1>
			<p class="mt-4 text-lg text-zinc-100 md:text-xl">
				Your all-in-one solution for managing tenant relationships
			</p>

			<div class="mt-8 flex items-center justify-center gap-4">
				<button
					onclick={handleLogin}
					class="rounded-lg border border-white bg-black/70 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-black"
				>
					Login with Google
				</button>

				<span class="text-xl font-bold text-white italic">OR</span>

				<button
					onclick={handleTenantLogin}
					class="rounded-lg border border-white bg-black/70 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-black"
				>
					Tenant Login
				</button>
			</div>
		</main>

		<div class="relative z-10 text-center">
			<span class="text-xs text-zinc-500">↓ Scroll down for more ↓</span>
		</div>
	</div>

	<div class="px-6 py-16">
		<section id="features" class="mx-auto mb-20 max-w-5xl">
			<h2 class="mb-10 text-center text-2xl font-bold md:text-3xl">Features</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div class="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
					<h3 class="text-xl font-bold">Chat with Tenants</h3>
					<p class="mt-2 text-sm text-zinc-900">
						Easily communicate with your tenants through a secure chat system, keeping all
						conversations organized and accessible.
					</p>
				</div>
				<div class="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
					<h3 class="text-xl font-bold">Use shareSpace</h3>
					<p class="mt-2 text-sm text-zinc-900">
						shareSpace is a platform that allows you to rent spaces for a short period of time, such
						as 2-3 hours.
					</p>
				</div>
				<div class="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
					<h3 class="text-xl font-bold">Manage your Properties</h3>
					<p class="mt-2 text-sm text-zinc-900">
						Set rules, have a noticeboard, get maintainance or improvement requests, and more all
						from the app.
					</p>
				</div>
			</div>
		</section>

		<section id="testimonials" class="mx-auto max-w-5xl">
			<h2 class="mb-10 text-center text-2xl font-bold md:text-3xl">Testimonials</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div class="flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-6">
					<div>
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold">Manik Sharma</h3>
							<span class="text-base tracking-wider">⭐⭐⭐⭐⭐</span>
						</div>
						<p class="mt-3 text-sm text-zinc-900">
							Five stars! Easy to use, feature rich, exactly what I was looking for!
						</p>
					</div>
				</div>
				<div class="flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-6">
					<div>
						<div class="flex items-center justify-between">
							<h3 class="text-xl font-bold">Shashwat Singh</h3>
							<span class="text-base tracking-wider">⭐⭐⭐⭐⭐</span>
						</div>
						<p class="mt-3 text-sm text-zinc-900">
							I love it! It is so user friendly, and extremely useful. Everything I could want and
							more!
						</p>
					</div>
				</div>
			</div>
		</section>
	</div>

	<footer id="contact" class="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
		Made with ❤️ by <a class="text-[#16e16e] hover:underline" href="https://techsyndicate.us/"
			>Tech Syndicate</a
		>
	</footer>
</div>
