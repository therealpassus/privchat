<script lang="ts">
	import { cn } from "$lib/utils";
	import Markdown from "./markdown.svelte";

	let {
		role,
		content,
		time,
		class: className = ""
	}: {
		role: "user" | "assistant";
		content: string;
		time?: string;
		class?: string;
	} = $props();

	let menuOpen = $state(false);

	function formatTime(ts: string) {
		try {
			const d = new Date(ts);
			return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		} catch { return ""; }
	}

	function handleContextMenu(e: MouseEvent | TouchEvent) {
		e.preventDefault();
		menuOpen = true;
	}

	function handleCopy() {
		navigator.clipboard.writeText(content);
		menuOpen = false;
	}
</script>

<svelte:window onclick={() => (menuOpen = false)} />

<div class={cn("flex px-4 py-2", role === "user" ? "justify-end" : "justify-start", className)}>
	<div
		role="button"
		tabindex="0"
		class={cn(
			"max-w-[78%] min-w-0 w-fit rounded-[18px] break-words overflow-hidden shadow-sm transition-all duration-300 relative",
			role === "user"
				? "bg-blue-500 text-white rounded-br-md px-4 py-2.5 text-[15px] leading-snug"
				: content
					? "bg-neutral-100/80 text-neutral-900 dark:bg-neutral-800/60 dark:text-neutral-200 rounded-bl-md px-4 py-2.5 text-[15px] leading-snug"
					: "bg-neutral-100/80 dark:bg-neutral-800/60 rounded-bl-md px-4 py-2.5"
		)}
		oncontextmenu={handleContextMenu}
	>
		{#if content}
			{#if role === "user"}
				<span class="whitespace-pre-wrap select-text">{content}</span>
			{:else}
				<Markdown {content} />
			{/if}
			{#if time}
				<div class="text-right mt-1 -mb-1 select-none">
					<span class="text-[10px] opacity-50">{formatTime(time)}</span>
				</div>
			{/if}
		{:else if role === "assistant"}
			<div class="flex items-center gap-1.5 min-h-[24px]">
				<div class="shimmer-dot"></div>
				<div class="shimmer-dot" style="animation-delay: 0.2s"></div>
				<div class="shimmer-dot" style="animation-delay: 0.4s"></div>
			</div>
		{/if}

		{#if menuOpen && content}
			<button
				class="absolute bottom-1 right-1 z-10 rounded-lg bg-black/80 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/90"
				onclick={handleCopy}
				onmousedown={(e) => e.stopPropagation()}
			>
				Copy
			</button>
		{/if}
	</div>
</div>

<style>
	.shimmer-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--muted-foreground);
		opacity: 0.25;
		animation: shimmer-dot 1.2s ease-in-out infinite;
	}
	@keyframes shimmer-dot {
		0%, 60%, 100% { opacity: 0.25; }
		30% { opacity: 0.6; }
	}
</style>
