<script lang="ts">
	import { cn } from "$lib/utils";
	import Icon from "$lib/components/ui/icon.svelte";

	let {
		value = $bindable(""),
		placeholder = "Message",
		disabled = false,
		isGenerating = false,
		onSubmit,
		onStop,
		class: className = ""
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		isGenerating?: boolean;
		onSubmit?: (message: string) => void;
		onStop?: () => void;
		class?: string;
	} = $props();

	let textareaEl: HTMLTextAreaElement;
	let rows = $state(1);

	function resize() {
		if (!textareaEl) return;
		textareaEl.style.height = "0px";
		void textareaEl.offsetHeight;
		textareaEl.style.height = textareaEl.scrollHeight + "px";
		rows = Math.min(Math.ceil(textareaEl.scrollHeight / 24), 6);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function handleSubmit() {
		const trimmed = value.trim();
		if (!trimmed || disabled || isGenerating) return;
		onSubmit?.(trimmed);
		value = "";
		if (textareaEl) {
			textareaEl.style.height = "0px";
			void textareaEl.offsetHeight;
			textareaEl.style.height = textareaEl.scrollHeight + "px";
		}
		rows = 1;
	}

	const hasContent = $derived(value.trim().length > 0);
</script>

<div
	class={cn(
		"flex w-full items-end rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl px-2 shadow-lg transition-colors",
		"focus-within:border-border",
		disabled && "opacity-50",
		className
	)}
>
	<textarea
		bind:this={textareaEl}
		bind:value
		{placeholder}
		{disabled}
		rows={rows}
		onkeydown={handleKeydown}
		oninput={resize}
		class={cn(
			"flex-1 resize-none bg-transparent px-2 py-2.5 text-sm placeholder:text-muted-foreground/60",
			"focus-visible:outline-none disabled:cursor-not-allowed"
		)}
	></textarea>

	<div class="mb-1.5">
		<button
			class={cn(
				"inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-200",
				hasContent && !disabled
					? "bg-foreground text-background hover:scale-105 active:scale-95"
					: "bg-muted-foreground/15 text-muted-foreground"
			)}
			disabled={(!value.trim() && !isGenerating) || disabled}
			onclick={() => isGenerating ? onStop?.() : handleSubmit()}
			aria-label={isGenerating ? "Stop generating" : "Send message"}
		>
			{#if isGenerating}
				<Icon name="square" class="size-3" />
			{:else}
				<Icon name="arrow-up" class="size-3.5" />
			{/if}
		</button>
	</div>
</div>
