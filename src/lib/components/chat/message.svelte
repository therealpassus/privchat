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

	const sourceColors = ["#f0abfc", "#fbbf24", "#34d399", "#60a5fa", "#fb7185", "#a78bfa", "#f472b6", "#38bdf8", "#fb923c"];
</script>

<div class={cn("flex px-5 py-2", role === "user" ? "justify-end" : "justify-start", className)}>
	{#if role === "user"}
		<div class="flex flex-col max-w-[85%]">
			<button
				class="min-w-0 max-w-full rounded-2xl bg-neutral-950 text-neutral-100 px-3.5 py-2 text-[15px] leading-relaxed break-words overflow-hidden text-left relative border border-white/[0.06]"
				oncontextmenu={(e) => { e.preventDefault(); handlePress(); }}
			>
				<span class="whitespace-pre-wrap">{content}</span>
				{#if time}
					<div class="text-right mt-1.5 -mb-1">
						<span class="text-[10px] opacity-40">{formatTime(time)}</span>
					</div>
				{/if}
				{#if copied}
					<div class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
						<span class="text-[11px] font-medium opacity-80">Copied</span>
					</div>
				{/if}
			</button>
		</div>
	{:else}
		<div class="flex flex-col max-w-[92%]">
			{#if content}
				<div class="text-[15px] leading-relaxed text-foreground/90 dark:text-foreground/80">
					<Markdown {content} />
				</div>
				{#if time}
					<div class="mt-1">
						<span class="text-[10px] text-muted-foreground/40">{formatTime(time)}</span>
					</div>
				{/if}
			{:else}
				<div class="flex items-center gap-1.5 py-1">
					<div class="shimmer-dot"></div>
					<div class="shimmer-dot" style="animation-delay: 0.2s"></div>
					<div class="shimmer-dot" style="animation-delay: 0.4s"></div>
				</div>
			{/if}
			{#if sources.length > 0}
				<div class="flex flex-wrap gap-1.5 mt-2.5">
					{#each sources as source, idx}
						{@const host = (() => { try { return new URL(source.url).hostname.replace("www.", ""); } catch { return ""; } })()}
						{#if host}
							{@const color = sourceColors[idx % sourceColors.length]}
							<a href={source.url} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-full bg-muted/50 border border-border/40 px-2 py-0.5 text-[10px] leading-none text-muted-foreground hover:bg-muted no-underline">
								<span class="flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white shrink-0" style="background:{color}">
									{host.charAt(0).toUpperCase()}
								</span>
								<span class="truncate max-w-[100px]">{host}</span>
							</a>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/if}
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
