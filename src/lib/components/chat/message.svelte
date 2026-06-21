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
			"max-w-[78%] min-w-0 w-fit rounded-[18px] px-4 py-2.5 text-[15px] leading-snug break-words overflow-hidden",
			"border border-white/30 dark:border-white/[0.06]",
			"translate-z-0",
			"shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.04)]",
			"dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.08)]",
			role === "user"
				? "bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-md"
				: content
					? "bg-neutral-100/95 backdrop-blur-xl text-neutral-900 dark:bg-neutral-800/95 dark:text-neutral-100 rounded-bl-md"
					: "bg-neutral-100/95 backdrop-blur-xl dark:bg-neutral-800/95 rounded-bl-md"
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
			<div class="shimmer-bar w-24"></div>
		{/if}
	</div>
</div>

<style>
	.shimmer-bar {
		height: 12px;
		border-radius: 6px;
		background: linear-gradient(90deg, var(--muted) 25%, var(--border) 50%, var(--muted) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.8s ease-in-out infinite;
	}
	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}
</style>
