<script lang="ts">
	import { marked, type Tokens } from "marked";

	let { content, class: className = "" }: { content: string; class?: string } = $props();

	const renderer = new marked.Renderer();

	renderer.link = function ({ href, title, tokens }: Tokens.Link) {
		const text = tokens?.map((t) => ("text" in t ? t.text : "")).join("") || href;
		const titleAttr = title ? ` title="${title}"` : "";
		return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
	};

	renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
		const escaped = escapeHtml(text);
		const label = lang ? `<span class="code-lang">${lang}</span>` : "";
		return `
<div class="code-block-wrapper">
	<div class="code-block-header">
		${label}
		<button class="code-copy-btn" data-code="${encodeURIComponent(text)}">Copy</button>
	</div>
	<pre><code class="language-${lang || ""}">${escaped}</code></pre>
</div>`;
	};

	marked.use({ renderer });

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
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function handleCopy(e: MouseEvent) {
		const btn = e.target as HTMLElement;
		if (!btn.classList.contains("code-copy-btn")) return;
		const code = decodeURIComponent(btn.getAttribute("data-code") || "");
		navigator.clipboard.writeText(code);
		btn.textContent = "Copied!";
		setTimeout(() => (btn.textContent = "Copy"), 2000);
	}
</script>

<svelte:window onclick={handleCopy} />

<div class="markdown-content {className ?? ''}">
	{@html html}
</div>

<style>
	.markdown-content :global(.code-block-wrapper) {
		margin: 0.5rem 0;
		border-radius: 0.5rem;
		border: 1px solid var(--border);
		background: oklch(0.15 0.005 285);
		overflow-x: auto;
		max-width: 100%;
		display: block;
	}
	.markdown-content :global(.code-block-wrapper pre) {
		margin: 0;
		border-radius: 0;
		border: none;
		background: transparent;
		display: block;
		overflow-x: auto;
		max-width: 100%;
		white-space: pre;
	}
	.markdown-content :global(.code-block-wrapper code) {
		background: transparent;
		padding: 0;
		font-size: 0.8125rem;
		color: oklch(0.95 0 0);
		white-space: pre;
	}
	.markdown-content :global(.code-block-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.75rem;
		border-bottom: 1px solid oklch(0.25 0.005 285);
	}
	.markdown-content :global(.code-lang) {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: oklch(0.55 0 0);
	}
	.markdown-content :global(.code-copy-btn) {
		font-size: 0.625rem;
		color: oklch(0.55 0 0);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}
	.markdown-content :global(.code-copy-btn:hover) {
		background: oklch(0.3 0.005 285);
		color: oklch(0.8 0 0);
	}
</style>
