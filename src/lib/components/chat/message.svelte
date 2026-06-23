<script lang="ts">
	import { cn } from "$lib/utils";
	import Markdown from "./markdown.svelte";

	let {
		role,
		content,
		time,
		sources = [],
		class: className = ""
	}: {
		role: "user" | "assistant";
		content: string;
		time?: string;
		sources?: { title: string; url: string }[];
		class?: string;
	} = $props();

	let copied = $state(false);

	function formatTime(ts: string) {
		try {
			const d = new Date(ts);
			return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		} catch { return ""; }
	}

	function handlePress() {
		if (!content) return;
		navigator.clipboard.writeText(content);
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}
</script>

<div class={cn("flex px-4 py-2", role === "user" ? "justify-end" : "justify-start", className)}>
	<div class="flex flex-col max-w-[92%]">
	<button
		class={cn(
			"min-w-0 max-w-full rounded-[14px] break-words overflow-x-auto overflow-y-hidden shadow-sm relative text-left",
			role === "user"
				? "bg-blue-500 text-white rounded-br-[4px] px-3 py-2 text-[14px] leading-snug"
				: content
					? "bg-neutral-100/80 text-neutral-900 dark:bg-neutral-800/60 dark:text-neutral-200 rounded-bl-[4px] px-3 py-2 text-[14px] leading-snug"
					: "bg-neutral-100/80 dark:bg-neutral-800/60 rounded-bl-[4px] px-3 py-2"
		)}
		oncontextmenu={(e) => { e.preventDefault(); handlePress(); }}
	>
		{#if content}
			{#if role === "user"}
				<span class="whitespace-pre-wrap">{content}</span>
			{:else}
				<Markdown {content} />
			{/if}
			{#if time}
				<div class="text-right mt-1 -mb-1">
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
		{#if copied}
			<div class="absolute inset-0 flex items-center justify-center bg-black/10 rounded-[14px]">
				<span class="text-[11px] font-medium opacity-80">Copied</span>
			</div>
		{/if}
	</button>
	{#if role === "assistant" && sources.length > 0 && content}
		<div class="flex flex-wrap gap-1 mt-1">
			{#each sources as source}
				{@const host = (() => { try { return new URL(source.url).hostname.replace("www.", ""); } catch { return ""; } })()}
				{#if host}
					<a href={source.url} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-full bg-background/40 border border-border/40 px-2 py-0.5 text-[10px] leading-none text-muted-foreground hover:bg-background hover:text-foreground no-underline">
						<span class="flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white shrink-0">
							{host.charAt(0).toUpperCase()}
						</span>
						<span class="truncate max-w-[100px]">{host}</span>
					</a>
				{/if}
			{/each}
		</div>
	{/if}
	</div>
</div>

<style>
	button {
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

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
