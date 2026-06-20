<script lang="ts">
	import { marked } from "marked";

	let { content, class: className = "" }: { content: string; class?: string } = $props();

	const html = $derived.by(() => {
		try {
			return marked.parse(content, { breaks: true }) as string;
		} catch {
			return escapeHtml(content);
		}
	});

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}
</script>

<div class="markdown-content {className ?? ''}">
	{@html html}
</div>

<style>
	.markdown-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
		margin: 0.5rem 0;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.markdown-content :global(th) {
		padding: 0.375rem 0.625rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		background: var(--muted);
		color: var(--foreground);
	}
	.markdown-content :global(td) {
		padding: 0.375rem 0.625rem;
		text-align: left;
	}
	.markdown-content :global(th),
	.markdown-content :global(td) {
		border-bottom: 1px solid var(--border);
	}
	.markdown-content :global(tr:last-child td) {
		border-bottom: none;
	}
	.markdown-content :global(tr:nth-child(even) td) {
		background: color-mix(in srgb, var(--muted) 40%, transparent);
	}
	.markdown-content :global(thead tr th) {
		border-bottom-width: 2px;
	}
</style>
