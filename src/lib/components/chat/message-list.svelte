<script lang="ts">
	import { cn } from "$lib/utils";
	import Message from "./message.svelte";

	let {
		messages = [],
		class: className = ""
	}: {
		messages: { id: string; role: "user" | "assistant"; content: string }[];
		class?: string;
	} = $props();

	let scrollContainer: HTMLDivElement;

	$effect(() => {
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	});
</script>

<div
	bind:this={scrollContainer}
	class={cn("flex flex-1 flex-col overflow-y-auto", className)}
>
	{#if messages.length === 0}
		<div class="flex flex-1 items-center justify-center p-8">
			<div class="text-center space-y-4 max-w-md">
				<h2 class="text-2xl font-semibold tracking-tight">PrivChat</h2>
				<p class="text-sm text-muted-foreground">
					Your messages stay on your device. Start a conversation below.
				</p>
			</div>
		</div>
	{:else}
		<div class="pt-4 pb-4">
			{#each messages as msg (msg.id)}
				<Message role={msg.role} content={msg.content} />
			{/each}
		</div>
	{/if}
</div>
