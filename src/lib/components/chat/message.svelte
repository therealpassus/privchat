<script lang="ts">
	import { cn } from "$lib/utils";
	import Markdown from "./markdown.svelte";

	let {
		role,
		content,
		isStreaming = false,
		class: className = ""
	}: {
		role: "user" | "assistant";
		content: string;
		isStreaming?: boolean;
		class?: string;
	} = $props();
</script>

<div class={cn("flex px-4 py-2", role === "user" ? "justify-end" : "justify-start", className)}>
	<div
		class={cn(
			"max-w-[78%] min-w-0 w-fit rounded-[18px] break-words overflow-hidden shadow-sm transition-all duration-300",
			role === "user"
				? "bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-md px-4 py-2.5 text-[15px] leading-snug"
				: content
					? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 rounded-bl-md px-4 py-2.5 text-[15px] leading-snug"
					: "bg-neutral-100 dark:bg-neutral-800 rounded-bl-md px-3 py-2"
		)}
	>
		{#if content}
			{#if role === "user"}
				<span class="whitespace-pre-wrap">{content}</span>
			{:else}
				<Markdown {content} />
				{#if isStreaming}
					<span class="inline-block w-0.5 h-4 ml-0.5 bg-neutral-400 dark:bg-neutral-500 animate-pulse align-[-2px]"></span>
				{/if}
			{/if}
		{:else if role === "assistant"}
			<div class="flex items-center gap-1">
				<div class="shimmer-bar w-6 h-2"></div>
				<div class="shimmer-bar w-6 h-2"></div>
				<div class="shimmer-bar w-6 h-2" style="animation-delay: 0.15s"></div>
			</div>
		{/if}
	</div>
</div>

<style>
	.shimmer-bar {
		height: 4px;
		border-radius: 2px;
		background: var(--muted-foreground);
		opacity: 0.3;
		animation: pulse-dot 1.2s ease-in-out infinite;
	}
	@keyframes pulse-dot {
		0%, 60%, 100% { opacity: 0.2; transform: scale(0.8); }
		30% { opacity: 0.6; transform: scale(1); }
	}
</style>
