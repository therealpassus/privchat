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
		"flex w-full items-center rounded-[20px] border border-black/5 dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl px-3.5",
		"focus-within:border-black/10 dark:focus-within:border-white/[0.08]",
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
			"flex-1 resize-none bg-transparent py-3 text-base placeholder:text-muted-foreground/40",
			"focus-visible:outline-none disabled:cursor-not-allowed"
		)}
	></textarea>

	<div>
		<button
			class={cn(
				"inline-flex size-9 shrink-0 items-center justify-center rounded-full",
				hasContent && !disabled
					? "bg-foreground text-background"
					: "bg-muted-foreground/15 text-muted-foreground"
			)}
			disabled={(!value.trim() && !isGenerating) || disabled}
			onclick={() => isGenerating ? onStop?.() : handleSubmit()}
			aria-label={isGenerating ? "Stop generating" : "Send message"}
		>
			{#if isGenerating}
				<Icon name="square" class="size-4" />
			{:else}
				<Icon name="arrow-up" class="size-[18px]" />
			{/if}
		</button>
	</div>
</div>
