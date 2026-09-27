<script lang="ts">
    import { onMount } from 'svelte';
    import { auth } from '$lib/firebase';
    import { onAuthStateChanged } from 'firebase/auth';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import Sidebar from '$lib/components/Sidebar.svelte';

    let name = $state('');

    let sidebarOpen = $state(true);

    const links = [
        { label: 'Home', href: '/home' },
        { label: 'Chat', href: '/chat' },
        { label: 'shareSpace', href: '/sharespace' },
        { label: 'Tenants', href: '/tenants' }
    ];

    onMount(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                goto('/');
                return;
            }

            name = user.displayName ?? 'User';
        });

        return unsubscribe;
    });
</script>

<div class="flex h-screen w-full overflow-hidden bg-white text-black">
    <div
        class={`shrink-0 overflow-hidden border-r border-black transition-all duration-300 ${
            sidebarOpen ? 'w-55' : 'w-0'
        }`}
    >
        <Sidebar currentPath={page.url.pathname} title="Buildout" subtitle="Navigation" {links} />
    </div>

    <main class="min-w-0 flex-1 overflow-y-auto p-8">
        <div class="mx-auto max-w-6xl">
            <h1 class="mb-2 ml-2 text-3xl font-bold">Welcome, {name}!</h1>
            <p class="mb-8 ml-2 text-zinc-500">What would you like to do?</p>

            <h2 class="mt-25 ml-2 text-2xl font-semibold">Quick Actions</h2>
            <div
                class="mt-5 grid auto-rows-[13.75rem] grid-cols-1 gap-4 rounded-3xl border-2 border-black p-2 md:grid-cols-2 lg:grid-cols-4"
            >
                <div
                    class="flex flex-col justify-between rounded-2xl border border-black bg-white p-6 transition hover:bg-zinc-50 lg:col-span-2 lg:row-span-2"
                >
                    <div>
                        <p class="mb-2 text-sm font-medium text-zinc-500">Tenants</p>
                        <h2 class="text-3xl font-bold">Check your tenants</h2>
                        <p class="mt-3 max-w-md text-zinc-600">View and manage your tenants.</p>
                    </div>

                    <a
                        href="/tenants"
                        class="w-fit rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                        Manage Tenants →
                    </a>
                </div>

                <div
                    class="flex flex-col justify-between rounded-2xl border border-black bg-white p-6 transition hover:bg-zinc-50 lg:col-span-2"
                >
                    <div>
                        <p class="text-sm font-medium text-zinc-500">shareSpace</p>
                        <h2 class="mt-1 text-2xl font-bold">Find a space</h2>
                    </div>

                    <a
                        href="/sharespace"
                        class="mt-4 w-fit rounded-xl border border-black px-4 py-2 text-sm transition hover:bg-black hover:text-white"
                    >
                        Explore →
                    </a>
                </div>

                <div
                    class="flex flex-col justify-between rounded-2xl border border-black bg-white p-6 transition hover:bg-zinc-50"
                >
                    <div>
                        <p class="text-sm font-medium text-zinc-500">Houses</p>
                        <h2 class="mt-1 text-xl font-bold">Your houses</h2>
                    </div>

                    <a href="/houses" class="text-sm font-medium underline underline-offset-4">
                        View houses →
                    </a>
                </div>

                <div
                    class="flex flex-col justify-between rounded-2xl border border-black bg-white p-6 transition hover:bg-zinc-50"
                >
                    <div>
                        <p class="text-sm font-medium text-zinc-500">Activity</p>
                        <h2 class="mt-1 text-xl font-bold">Recent activity</h2>
                    </div>

                    <p class="text-sm text-zinc-500">Nothing here yet.</p>
                </div>
            </div>
        </div>
    </main>

    <aside class="h-screen w-75 shrink-0 border-l border-black">
        <div class="flex h-full flex-col bg-white p-4">
            <h2 class="mb-4 text-lg font-bold">Chat Window</h2>
            <p class="text-zinc-600">To be done</p>
        </div>
    </aside>
</div>