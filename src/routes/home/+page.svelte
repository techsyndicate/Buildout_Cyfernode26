<script lang="ts">
    import { onMount } from 'svelte';
    import { auth } from '$lib/firebase';
    import { onAuthStateChanged, signOut } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import Grainient from '$lib/components/svelte-bits/Grainient.svelte';

    let name = $state('');
    let sidebarOpen = $state(true);
    let tenant = $state(false);

    const links = [
        { label: 'Home', href: '/home' },
        { label: 'Chat', href: '/chat' },
        { label: 'shareSpace', href: '/sharespace' },
        { label: 'Tenants', href: '/tenants' },
        { label: 'Houses', href: '/houses' }
    ];

    onMount(() => {
        const cookies = document.cookie.split('; ');
        const tenantCookie = cookies.find((row) => row.startsWith('tenant='));

        if (tenantCookie) {
            tenant = tenantCookie.split('=')[1] === 'true';
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

<div class="relative flex h-screen w-full overflow-hidden bg-neutral-200 text-black">
    <div class="fixed inset-0 z-0 h-full w-full">
        <div style="width: 100%; height: 100%; position: relative;">
            <Grainient color1="#e5e5e5" color2="#d4d4d4" color3="#f5f5f5" />
        </div>
    </div>

    <div class={`relative z-10 shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-55' : 'w-0'}`}>
        <div class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-black/10 bg-neutral-100/80 p-2 shadow-md backdrop-blur-xl">
            <div class="px-3 py-3">
                <span class="text-lg font-light italic">tenant</span>
                <span class="text-lg font-semibold">App</span>
            </div>

            <nav class="mt-3 flex flex-1 flex-col gap-1">
                {#each links as link}
                    <button
                        type="button"
                        onclick={() => goto(link.href)}
                        class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                            link.href === '/home'
                                ? 'bg-neutral-800 text-white shadow-sm'
                                : 'text-neutral-800 hover:bg-neutral-200 hover:text-black'
                        }`}
                    >
                        {link.label}
                    </button>
                {/each}

                <hr class="my-2 border-black/10" />

                <button
                    type="button"
                    onclick={logout}
                    class="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-black transition hover:bg-red-500 hover:text-white"
                >
                    Log Out
                </button>
            </nav>
        </div>
    </div>

    <main class="relative z-10 flex flex-1 items-center justify-center overflow-y-auto p-8">
        <div class="mx-auto w-full max-w-6xl">
            <div class="rounded-2xl border border-black/10 bg-neutral-100/80 p-7 shadow-md backdrop-blur-xl">
                <h1 class="text-3xl tracking-tight text-black">
                    <span class="font-light italic">Welcome,</span>
                    <span class="font-semibold">{name}!</span>
                </h1>

                <p class="mt-1 text-neutral-700">What would you like to do?</p>

                <h2 class="mt-20 text-2xl font-semibold tracking-tight text-black">Quick Actions</h2>

                <div class="mt-5 grid auto-rows-55 grid-cols-1 gap-4 rounded-3xl border border-black/10 bg-neutral-100/60 p-2 shadow-md backdrop-blur-xl md:grid-cols-2 lg:grid-cols-4">
                    <div class="flex flex-col justify-between rounded-2xl border border-black/10 bg-neutral-100/90 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white lg:col-span-2 lg:row-span-2">
                        <div>
                            <h2 class="text-3xl font-bold tracking-tight text-black">Check your tenants</h2>
                            <p class="mt-3 max-w-md text-neutral-700">View and manage your tenants.</p>
                        </div>

                        <a
                            href="/tenants"
                            class="w-fit rounded-xl bg-black px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 hover:shadow-md"
                        >
                            Manage Tenants →
                        </a>
                    </div>

                    <div class="flex flex-col justify-between rounded-2xl border border-black/10 bg-neutral-100/90 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white lg:col-span-2">
                        <div>
                            <h2 class="mt-1 text-2xl font-bold tracking-tight text-black">Find a space using shareSpace</h2>
                        </div>

                        <a
                            href="/sharespace"
                            class="mt-4 w-fit rounded-xl border border-black/20 bg-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white hover:shadow-md"
                        >
                            Explore →
                        </a>
                    </div>

                    <div class="flex flex-col justify-between rounded-2xl border border-black/10 bg-neutral-100/90 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white">
                        <div>
                            <h2 class="mt-1 text-xl font-bold tracking-tight text-black">Your houses</h2>
                        </div>

                        <a
                            href="/houses"
                            class="text-sm font-medium text-neutral-800 underline underline-offset-4 hover:text-black"
                        >
                            View houses →
                        </a>
                    </div>

                    <div class="flex flex-col justify-between rounded-2xl border border-black/10 bg-neutral-100/90 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white">
                        <div>
                            <h2 class="mt-1 text-xl font-bold tracking-tight text-black">Recent activity</h2>
                        </div>

                        <p class="text-sm text-neutral-700">Nothing here yet.</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>