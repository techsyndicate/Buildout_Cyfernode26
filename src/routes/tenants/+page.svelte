<script lang="ts">
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { onAuthStateChanged } from 'firebase/auth';
    import {
        collection,
        addDoc,
        getDocs,
        query,
        where,
        doc,
        updateDoc,
        arrayUnion,
        serverTimestamp
    } from 'firebase/firestore';
    import { goto } from '$app/navigation';

    let loading = $state(true);
    let tenantSpaces = $state<any[]>([]);
    let joinCode = $state('');
    let newCode = $state('');
    let error = $state('');
    let creating = $state(false);
    let sidebarOpen = $state(true);

    const links = [
        { label: 'Home', href: '/home' },
        { label: 'Chat', href: '/chat' },
        { label: 'shareSpace', href: '/sharespace' },
        { label: 'Tenants', href: '/tenants' }
    ];

    async function loadSpaces(uid: string) {
        const q = query(collection(db, 'tenantSpaces'), where('members', 'array-contains', uid));
        const snapshot = await getDocs(q);

        tenantSpaces = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        loading = false;
    }

    async function createSpace() {
        const user = auth.currentUser;
        if (!user || creating) return;
        creating = true;

        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            await addDoc(collection(db, 'tenantSpaces'), {
                code,
                ownerId: user.uid,
                members: [user.uid],
                createdAt: serverTimestamp()
            });

            newCode = code;
            await loadSpaces(user.uid);
        } finally {
            creating = false;
        }
    }

    async function joinSpace() {
        error = '';

        const user = auth.currentUser;
        if (!user) return;

        if (joinCode.length !== 6) {
            error = 'Please enter a valid 6-digit code.';
            return;
        }

        const q = query(collection(db, 'tenantSpaces'), where('code', '==', joinCode));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            error = 'Property not found with this code.';
            return;
        }

        const tenantDoc = snapshot.docs[0];
        const data = tenantDoc.data();

        if (!data.members.includes(user.uid)) {
            await updateDoc(doc(db, 'tenantSpaces', tenantDoc.id), {
                members: arrayUnion(user.uid)
            });
        }

        goto(`/tenants/${tenantDoc.id}`);
    }

    onMount(() => {
        return onAuthStateChanged(auth, (user) => {
            if (!user) goto('/');
            else loadSpaces(user.uid);
        });
    });
</script>

<div class="flex h-screen w-full overflow-hidden bg-white text-zinc-900">
    <div
        class={`shrink-0 overflow-hidden transition-all duration-300 ${
            sidebarOpen ? 'w-55' : 'w-0'
        }`}
    >
        <div
            class="m-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
        >
            <div class="px-3 py-3">
                <span class="text-sm font-bold tracking-tight text-zinc-900">Buildout</span>
            </div>

            <nav class="mt-3 flex flex-1 flex-col gap-1">
                {#each links as link}
                    <button
                        type="button"
                        onclick={() => goto(link.href)}
                        class={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                            link.href === '/tenants'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                    >
                        {link.label}
                    </button>
                {/each}
            </nav>
        </div>
    </div>

    <main class="flex-1 overflow-y-auto p-10">
        <div class="mx-auto max-w-4xl">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">Tenants</h1>
                <p class="text-sm text-zinc-500">
                    Manage your properties and connect with tenants.
                </p>
            </div>

            <div class="mt-8 grid gap-6 md:grid-cols-2">
                <div
                    class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
                >
                    <span class="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                        Landlord
                    </span>

                    <h2 class="mt-2 text-base font-semibold">Create a property space</h2>

                    <p class="mt-1 text-sm text-zinc-500">
                        Generate an invite code to share with your tenant.
                    </p>

                    <button
                        onclick={createSpace}
                        disabled={creating}
                        class="mt-6 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                        {creating ? 'Creating...' : 'Create Space'}
                    </button>

                    {#if newCode}
                        <div class="mt-6 rounded-xl bg-zinc-50 p-4 text-center shadow-inner">
                            <span class="text-xs text-zinc-400">Your Invite Code</span>

                            <p class="mt-1 text-2xl font-bold tracking-widest text-zinc-900">
                                {newCode}
                            </p>
                        </div>
                    {/if}
                </div>

                <div
                    class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
                >
                    <span class="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                        Tenant
                    </span>

                    <h2 class="mt-2 text-base font-semibold">Join a space</h2>

                    <p class="mt-1 text-sm text-zinc-500">
                        Enter the 6-digit code provided by your landlord.
                    </p>

                    <input
                        bind:value={joinCode}
                        maxlength="6"
                        inputmode="numeric"
                        placeholder="123456"
                        class="mt-6 w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                    />

                    {#if error}
                        <p class="mt-2 text-xs text-red-500">{error}</p>
                    {/if}

                    <button
                        onclick={joinSpace}
                        class="mt-4 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
                    >
                        Join Space
                    </button>
                </div>
            </div>

            <div class="mt-12">
                <h2 class="text-base font-semibold">Your Properties</h2>

                {#if loading}
                    <p class="mt-4 text-sm text-zinc-400">Loading spaces...</p>
                {:else if tenantSpaces.length === 0}
                    <p class="mt-4 text-sm text-zinc-400">
                        You aren't connected to any properties yet.
                    </p>
                {:else}
                    <div class="mt-4 grid gap-4 md:grid-cols-2">
                        {#each tenantSpaces as tenant}
                            <button
                                onclick={() => goto(`/tenants/${tenant.id}`)}
                                class="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-[0_10px_25px_rgba(0,0,0,0.09)]"
                            >
                                <div>
                                    <span class="font-medium text-zinc-900">Tenant Space</span>

                                    <p class="mt-1 text-xs text-zinc-500">
                                        Code: {tenant.code}
                                    </p>
                                </div>

                                <span class="text-zinc-400">→</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </main>
</div>