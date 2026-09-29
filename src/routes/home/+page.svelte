<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let name = $state('');
	let sidebarOpen = $state(true);

	const links = [
		{ label: 'Home', href: '/home' },
		{ label: 'Chat', href: '/chat' },
		{ label: 'shareSpace', href: '/sharespace' },
		{ label: 'Tenants', href: '/tenants' },
		{ label: 'Houses', href: '/houses' }
	];

	let tenant = $state(false);

	onMount(() => {
		const cookies = document.cookie.split('; ');

		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

		if (tenantCookie) {
			const value = tenantCookie.split('=')[1];
			tenant = value === 'true';
		}
		onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/');
				return;
			} else if (tenant) {
				goto('/tenant/home');
				return;
			}
			name = user.displayName ?? 'User';
		});
	});

	async function logout() {
		document.cookie = 'tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
		await signOut(auth);
		goto('/');
	}
</script>

<div
	class="flex h-screen w-full overflow-hidden bg-cover bg-fixed bg-center text-black"
	style="background-image: url('/xyz.png');"
>
	<div
		class={`shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-55' : 'w-0'}`}
	>
		<div
			class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)] backdrop-blur-sm"
		>
			<div class="px-3 py-3">
				<span class="text-lg font-light italic">tenant</span><span class="text-lg font-semibold"
					>App</span
				>
			</div>

			<nav class="mt-3 flex flex-1 flex-col gap-1">
				{#each links as link}
					<button
						type="button"
						onclick={() => goto(link.href)}
						class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
							link.href === '/home'
								? 'bg-blue-600 text-white shadow-sm'
								: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
						}`}
					>
						{link.label}
					</button>
				{/each}

				<hr class="border" />

				<button
					type="button"
					onclick={logout}
					class="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-black hover:bg-red-500 hover:text-white"
				>
					Log Out
				</button>
			</nav>
		</div>
	</div>

	<main class="min-w-0 flex-1 overflow-y-auto p-8">
		<div class="mx-auto max-w-6xl">
			<div
				class="rounded-2xl border border-white/60 bg-white/85 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
			>
				<h1 class="text-3xl tracking-tight text-zinc-950">
					<span class="font-light italic">Welcome,</span> <span class="font-semibold">{name}!</span>
				</h1>

				<p class="mt-1 text-zinc-500">What would you like to do?</p>

				<h2 class="mt-20 text-2xl font-semibold tracking-tight text-zinc-950">Quick Actions</h2>

				<div
					class="mt-5 grid auto-rows-55 grid-cols-1 gap-4 rounded-3xl border border-zinc-200 bg-white/70 p-2 shadow-[0_10px_35px_rgba(0,0,0,0.08)] md:grid-cols-2 lg:grid-cols-4"
				>
					<div
						class="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)] lg:col-span-2 lg:row-span-2"
					>
						<div>
							<h2 class="text-3xl font-bold tracking-tight text-zinc-950">Check your tenants</h2>
							<p class="mt-3 max-w-md text-zinc-600">View and manage your tenants.</p>
						</div>

						<a
							href="/tenants"
							class="w-fit rounded-xl bg-black px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 hover:shadow-md"
						>
							Manage Tenants →
						</a>
					</div>

					<div
						class="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)] lg:col-span-2"
					>
						<div>
							<h2 class="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
								Find a space using shareSpace
							</h2>
						</div>

						<a
							href="/sharespace"
							class="mt-4 w-fit rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white hover:shadow-md"
						>
							Explore →
						</a>
					</div>

					<div
						class="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
					>
						<div>
							<h2 class="mt-1 text-xl font-bold tracking-tight text-zinc-950">Your houses</h2>
						</div>

						<a
							href="/houses"
							class="text-sm font-medium text-zinc-800 underline underline-offset-4 hover:text-black"
						>
							View houses →
						</a>
					</div>

					<div
						class="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
					>
						<div>
							<h2 class="mt-1 text-xl font-bold tracking-tight text-zinc-950">Recent activity</h2>
						</div>

						<p class="text-sm text-zinc-500">Nothing here yet.</p>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>
