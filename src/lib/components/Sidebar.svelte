<script lang="ts">
	type SidebarLink = {
		label: string;
		href: string;
	};

	let {
		title = '',
		subtitle = '',
		links = [],
		currentPath = ''
	}: {
		title?: string;
		subtitle?: string;
		links?: SidebarLink[];
		currentPath?: string;
		onLogout?: () => void;
	} = $props();
</script>

<div
	class="flex h-full flex-col gap-3 overflow-hidden border-r border-white/10 bg-white/5 p-6 backdrop-blur-[3px]"
>
	<h1 class="mb-2 text-2xl font-bold text-neutral-900 drop-shadow-xs">
		{title}
	</h1>

	{#if subtitle}
		<p class="mb-4 text-sm text-neutral-800">
			{subtitle}
		</p>
	{/if}

	<nav class="flex flex-col gap-2">
		{#each links as link}
			<a
				href={link.href}
				class:text-blue-600={currentPath !== link.href}
				class:font-bold={currentPath === link.href}
				class:text-neutral-900={currentPath === link.href}
				class="hover:underline"
			>
				{link.label}
			</a>
		{/each}

		<hr class="border-white/20" />
	</nav>
</div>
