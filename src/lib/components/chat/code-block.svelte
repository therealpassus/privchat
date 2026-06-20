<script lang="ts">
	import { cn } from "$lib/utils";

	let { code, lang }: { code: string; lang?: string } = $props();

	let copied = $state(false);

	function handleCopy() {
		navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="my-1.5 overflow-hidden rounded-lg border bg-zinc-950 dark:bg-zinc-900">
	<div class="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
		<span class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
			{lang || "code"}
		</span>
		<button
			class="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
			onclick={handleCopy}
		>
			{copied ? "Copied" : "Copy"}
		</button>
	</div>
	<pre class="overflow-x-auto px-3 py-2 text-xs leading-relaxed"><code class="text-zinc-100 font-mono">{code}</code></pre>
</div>
