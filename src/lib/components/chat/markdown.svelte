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
