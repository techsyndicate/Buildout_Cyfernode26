<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let name = $state('');
	let sidebarOpen = $state(true);
	let tenant = $state(false);
	let links = $state([]);

	onMount(() => {
		const cookies = document.cookie.split('; ');
		const tenantCookie = cookies.find((row) => row.startsWith('tenant='));
		const isTenant = tenantCookie?.split('=')[1] === 'true';

		tenant = isTenant;

		links = isTenant
			? [
					{ label: 'Home', href: '/tenant/home' },
					{ label: 'Chat', href: '/tenant/chat' },
					{ label: 'shareSpace', href: '/sharespace' },
					{ label: 'Landlords', href: '/tenant/landlords' },
					{ label: 'Houses', href: '/tenant/houses' }
				]
			: [
					{ label: 'Home', href: '/home' },
					{ label: 'Chat', href: '/chat' },
					{ label: 'shareSpace', href: '/sharespace' },
					{ label: 'Tenants', href: '/tenants' },
					{ label: 'Houses', href: '/houses' }
				];

		onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/');
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
				<span class="text-lg font-bold text-zinc-900">
					<span class="font-light italic">tenant</span><span class="font-semibold">App</span>
				</span>
			</div>

			<nav class="mt-3 flex flex-1 flex-col gap-1">
				{#each links as link}
					<button
						type="button"
						onclick={() => goto(link.href)}
						class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
							link.href === '/houses'
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

	<main class="min-w-0 flex-1 overflow-y-auto">
		<div class="flex min-h-screen items-center justify-center p-8">
			<div
				class="min-h-[550px] w-full max-w-6xl rounded-[25px] bg-white/85 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
			>
				<h1 class="text-3xl tracking-tight text-zinc-950">
					<span class="font-medium">Rent</span> your
					<span class="font-light italic">Properties</span>
				</h1>

				<div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
					{#each Array(12) as _}
						<div
							class="h-48 rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
						>
							<div class="flex h-full items-center gap-5">
								<img src="/house.png" alt="House" class="h-20 w-20 rounded-[20px] object-cover" />

								<div class="space-y-1 text-sm text-zinc-600">
									<h3 class="font-semibold text-zinc-950">placeholder 1</h3>
									<p>placeholder 2</p>
									<p>placeholder 3</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>
</div>
