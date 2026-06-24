<script lang="ts">
	import { cn } from "$lib/utils";
	import Icon from "$lib/components/ui/icon.svelte";

	let {
		value = $bindable(""),
		placeholder = "Message",
		disabled = false,
		isGenerating = false,
		autofocus = false,
		agentStatus = "",
		onSubmit,
		onStop,
		class: className = ""
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		isGenerating?: boolean;
		autofocus?: boolean;
		agentStatus?: string;
		onSubmit?: (message: string) => void;
		onStop?: () => void;
		class?: string;
	} = $props();

	let textareaEl = $state<HTMLTextAreaElement>();
	let rows = $state(1);

	function resize() {
		if (!textareaEl) return;
		textareaEl.style.height = "0px";
		void textareaEl.offsetHeight;
		textareaEl.style.height = textareaEl.scrollHeight + "px";
		const lineHeight = 24;
		const textHeight = textareaEl.scrollHeight - 48;
		rows = Math.min(Math.max(1, Math.ceil(textHeight / lineHeight)), 6);
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
		"flex w-full items-center rounded-[20px] border border-black/5 dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl px-5",
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
			"flex-1 resize-none bg-transparent py-6 text-base placeholder:text-muted-foreground/40",
			"focus-visible:outline-none disabled:cursor-not-allowed"
		)}
	></textarea>

	<div>
		<button
			class={cn(
				"inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
				isGenerating || agentStatus ? "bg-foreground/10 text-foreground/60"
				: hasContent && !disabled ? "bg-foreground text-background"
				: "bg-muted-foreground/15 text-muted-foreground"
			)}
			disabled={(!value.trim() && !isGenerating && !agentStatus) || disabled}
			onclick={() => isGenerating ? onStop?.() : handleSubmit()}
			aria-label={isGenerating ? "Stop generating" : agentStatus ? "Processing" : "Send message"}
		>
			{#if isGenerating}
				<Icon name="square" class="size-4" />
			{:else if agentStatus}
				{#if agentStatus.includes("browsing") || agentStatus.includes("Reading")}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="agent-pulse">
						<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
					</svg>
				{:else}
					<span class="flex items-center gap-0.5">
						<span class="agent-dot" style="animation-delay:0ms"></span>
						<span class="agent-dot" style="animation-delay:0.15s"></span>
						<span class="agent-dot" style="animation-delay:0.3s"></span>
					</span>
				{/if}
			{:else}
				<Icon name="arrow-up" class="size-5" />
			{/if}
		</button>
	</div>
</div>

<style>
	.agent-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.4;
		animation: agent-bounce 1.2s ease-in-out infinite;
	}
	@keyframes agent-bounce {
		0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
		30% { opacity: 0.8; transform: translateY(-3px); }
	}
	.agent-pulse {
		animation: agent-glow 2s ease-in-out infinite;
	}
	@keyframes agent-glow {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 1; }
	}
</style>
