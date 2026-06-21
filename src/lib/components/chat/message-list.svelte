<script lang="ts">
	import { tick } from "svelte";
	import { cn } from "$lib/utils";
	import Message from "./message.svelte";

	let {
		messages = [],
		class: className = ""
	}: {
		messages: { id: string; role: "user" | "assistant"; content: string; time?: string }[];
		class?: string;
	} = $props();

	let scrollContainer: HTMLDivElement;

	const grouped = $derived.by(() => {
		const result: { day: string; messages: typeof messages }[] = [];
		let currentDay = "";
		let currentGroup: typeof messages = [];
		for (const msg of messages) {
			const day = msg.time ? new Date(msg.time).toDateString() : "";
			if (day !== currentDay) {
				if (currentGroup.length) result.push({ day: currentDay, messages: currentGroup });
				currentDay = day;
				currentGroup = [];
			}
			currentGroup.push(msg);
		}
		if (currentGroup.length) result.push({ day: currentDay, messages: currentGroup });
		return result;
	});

	async function scrollToBottom() {
		await tick();
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	$effect(() => {
		messages;
		messages.forEach((m) => m.content);
		scrollToBottom();
	});

	function getDayKey(ts?: string): string {
		if (!ts) return "";
		const d = new Date(ts);
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	function formatDayLabel(ts?: string): string {
		if (!ts) return "";
		const d = new Date(ts);
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today.getTime() - 86400000);
		const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		if (msgDay.getTime() === today.getTime()) return "Today";
		if (msgDay.getTime() === yesterday.getTime()) return "Yesterday";
		return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
	}
</script>

<div
	bind:this={scrollContainer}
	class={cn("flex flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-none", className)}
>
	{#if messages.length === 0}
		<div class="flex flex-1 items-center justify-center p-8">
			<div class="text-center space-y-4 max-w-md">
				<h2 class="text-2xl font-semibold tracking-tight privechat-title">PrivChat</h2>
				<p class="text-sm text-muted-foreground">
					Your messages stay on your device. Send a message to get started.
				</p>
			</div>
		</div>
	{:else}
		<div class="pt-3 pb-3">
			{#each grouped as group}
				<div class="flex justify-center pt-3 pb-1">
					<span class="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-3 py-0.5">
						{formatDayLabel(group.messages[0]?.time)}
					</span>
				</div>
				{#each group.messages as msg (msg.id)}
					<Message role={msg.role} content={msg.content} time={msg.time} />
				{/each}
			{/each}
		</div>
	{/if}
</div>
