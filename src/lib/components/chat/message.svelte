<script lang="ts">
	import { cn } from "$lib/utils";
	import Markdown from "./markdown.svelte";

	let {
		role,
		content,
		class: className = ""
	}: {
		role: "user" | "assistant";
		content: string;
		class?: string;
	} = $props();
</script>

<div class={cn("flex px-4 py-2", role === "user" ? "justify-end" : "justify-start", className)}>
	<div
		class={cn(
			"max-w-[78%] min-w-0 w-fit rounded-[18px] px-4 py-2.5 text-[15px] leading-snug break-words overflow-hidden shadow-sm",
			role === "user"
				? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md"
				: content
					? "bg-stone-100 text-stone-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-md"
					: "bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-zinc-500 rounded-bl-md"
		)}
	>
		{#if content}
			{#if role === "user"}
				<span class="whitespace-pre-wrap">{content}</span>
			{:else}
				<Markdown {content} />
			{/if}
		{:else if role === "assistant"}
			<span class="inline-flex gap-0.5">
				<span class="typing-dot" style="animation-delay: 0ms">.</span>
				<span class="typing-dot" style="animation-delay: 150ms">.</span>
				<span class="typing-dot" style="animation-delay: 300ms">.</span>
			</span>
		{/if}
	</div>
</div>
