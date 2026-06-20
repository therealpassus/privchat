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
</script>

<div
	class={cn(
		"flex w-full items-center rounded-2xl border border-border/60 bg-muted/50 px-2.5 transition-colors",
		"focus-within:border-border focus-within:bg-background",
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
			"flex-1 resize-none bg-transparent px-2 py-2 text-sm placeholder:text-muted-foreground",
			"focus-visible:outline-none disabled:cursor-not-allowed"
		)}
	></textarea>

	<button
		class={cn(
			"inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
			value.trim() && !disabled
				? "bg-foreground text-background hover:bg-foreground/80"
				: "bg-muted-foreground/20 text-muted-foreground"
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
