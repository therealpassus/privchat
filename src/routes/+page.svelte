<script lang="ts">
	import { goto } from "$app/navigation";
	import { PromptInput, MessageList } from "$lib/components/chat";
	import { toggleTheme, getTheme } from "$lib/theme.svelte";
	import {
		getKey,
		getBaseUrl,
		hasAnyKey,
		configuredProviders,
		type ProviderKey,
		providers,
	} from "$lib/keys.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Icon from "$lib/components/ui/icon.svelte";

	let inputValue = $state("");
	let isGenerating = $state(false);
	let messages = $state<{ id: string; role: "user" | "assistant"; content: string }[]>([]);
	let dark = $state(getTheme());
	let abortController = $state<AbortController | null>(null);

	let selectedProvider = $state<ProviderKey>(restoreProvider());
	let selectedModel = $state(restoreModel());
	let menuOpen = $state(false);

	function restoreProvider(): ProviderKey {
		if (typeof window === "undefined") return "openai";
		const stored = localStorage.getItem("privchat:last-provider");
		if (stored === "openai" || stored === "deepseek") return stored;
		return "openai";
	}

	function restoreModel(): string {
		if (typeof window === "undefined") return "";
		return localStorage.getItem("privchat:last-model") ?? "";
	}

	function persistSelection(provider: ProviderKey, model: string) {
		localStorage.setItem("privchat:last-provider", provider);
		localStorage.setItem("privchat:last-model", model);
	}

	let providerModels = $state<Record<ProviderKey, string[]>>({
		openai: [],
		deepseek: [],
	});
	let modelsLoading = $state(false);

	function modelLabel(id: string) {
		if (!id) return "";
		return id
			.replace(/-/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	async function fetchModels() {
		const key = getKey(selectedProvider);
		if (!key) return;
		modelsLoading = true;
		try {
			const res = await fetch("/api/models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: getBaseUrl(selectedProvider),
					apiKey: key,
				}),
			});
			const data = await res.json();
			if (data.models?.length) {
				providerModels[selectedProvider] = data.models.map((m: { id: string }) => m.id);
				if (!selectedModel || !providerModels[selectedProvider].includes(selectedModel)) {
					selectedModel = providerModels[selectedProvider][0];
					persistSelection(selectedProvider, selectedModel);
				}
			}
		} catch {
			/* keep previous models */
		} finally {
			modelsLoading = false;
		}
	}

	$effect(() => {
		selectedProvider;
		if (activeProviders.length > 0) {
			fetchModels();
		}
	});

	const SYSTEM_PROMPT = `You are a sharp, warm, and concise assistant. Get straight to the point — no fluff, no throat-clearing. Keep answers short and prioritize what matters most. Use markdown (headers, lists, inline code) when it adds clarity. Be direct but never cold: a touch of personality is welcome, just don't waste words. If you don't know, admit it in one sentence. No greetings, no sign-offs.`;

	const activeProviders = $derived(configuredProviders());

	$effect(() => {
		if (activeProviders.length > 0) {
			if (!activeProviders.includes(selectedProvider)) {
				selectedProvider = activeProviders[0];
			}
		} else {
			selectedProvider = "openai";
		}
	});

	function handleThemeToggle() {
		toggleTheme();
		dark = getTheme();
	}

	async function handleSubmit(text: string) {
		if (!hasAnyKey() || isGenerating) return;

		const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: text };
		const aMsg = { id: crypto.randomUUID(), role: "assistant" as const, content: "" };
		messages.push(userMsg, aMsg);
		const assistantIdx = messages.length - 1;
		isGenerating = true;

		const controller = new AbortController();
		abortController = controller;

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: getBaseUrl(selectedProvider),
					apiKey: getKey(selectedProvider),
					model: selectedModel,
					messages: [
						{ role: "system", content: SYSTEM_PROMPT },
						...messages
							.filter((m) => m.content)
							.map((m) => ({ role: m.role, content: m.content })),
					],
				}),
				signal: controller.signal,
			});

			if (!res.ok) {
				const err = await res.text();
				messages[assistantIdx].content = `Error: ${res.status} - ${err.slice(0, 300)}`;
				return;
			}

			const reader = res.body?.getReader();
			if (!reader) {
				messages[assistantIdx].content = "No response stream";
				return;
			}

			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				messages[assistantIdx].content += decoder.decode(value, { stream: true });
			}
		} catch (err) {
			if ((err as Error).name !== "AbortError") {
				messages[assistantIdx].content = `Error: ${(err as Error).message}`;
			}
		} finally {
			isGenerating = false;
			abortController = null;
		}
	}

	function handleStop() {
		abortController?.abort();
		isGenerating = false;
	}
</script>

<div class="flex h-screen flex-col bg-background">
	<header class="flex h-14 shrink-0 items-center justify-between border-b px-4">
		<h1 class="text-sm font-semibold">PrivChat</h1>
		<div class="flex items-center gap-1">
			{#if activeProviders.length > 0}
				<div class="relative">
					<button
						class="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors"
						onclick={() => {
							menuOpen = !menuOpen;
							if (menuOpen && providerModels[selectedProvider].length === 0) fetchModels();
						}}
						onblur={() => setTimeout(() => (menuOpen = false), 200)}
					>
						{providers.find((pr) => pr.key === selectedProvider)?.label}
						<span class="text-muted-foreground">·</span>
						{modelLabel(selectedModel) || "..."}
						<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground {menuOpen ? 'rotate-180' : ''} transition-transform">
							<path d="m6 9 6 6 6-6"/>
						</svg>
					</button>
					{#if menuOpen}
						<div
							role="menu"
							tabindex="-1"
							class="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-md"
							onmousedown={(e) => e.preventDefault()}
						>
							{#each activeProviders as p}
								{@const info = providers.find((pr) => pr.key === p)!}
								<div class="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									{info.label}
								</div>
								{#if providerModels[p].length === 0}
									<div class="px-2.5 pb-1 text-[11px] text-muted-foreground pl-3">
										{modelsLoading ? "Loading..." : "No models"}
									</div>
								{:else}
									{#each providerModels[p] as modelId}
										<button
											class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent {selectedProvider === p && selectedModel === modelId ? 'text-foreground font-medium' : 'text-muted-foreground'}"
										onclick={() => {
											const changed = selectedProvider !== p;
											selectedProvider = p;
											selectedModel = modelId;
											persistSelection(p, modelId);
											menuOpen = false;
											if (changed && providerModels[p].length === 0) fetchModels();
										}}
										>
											<span class="flex-1 text-left pl-3">{modelLabel(modelId)}</span>
											{#if selectedProvider === p && selectedModel === modelId}
												<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
													<path d="M20 6 9 17l-5-5"/>
												</svg>
											{/if}
										</button>
									{/each}
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			<Button variant="ghost" size="icon" onclick={handleThemeToggle} aria-label="Toggle theme">
				{#snippet children()}
					{#if dark}
						<Icon name="sun" class="size-4" />
					{:else}
						<Icon name="moon" class="size-4" />
					{/if}
				{/snippet}
			</Button>
			<Button variant="ghost" size="icon" onclick={() => goto("/settings")} aria-label="Settings">
				{#snippet children()}
					<Icon name="settings" class="size-4" />
				{/snippet}
			</Button>
		</div>
	</header>

	<MessageList {messages} />

	{#if !hasAnyKey()}
		<div class="flex items-center justify-between border-t bg-muted/50 px-4 py-2.5">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
				No API key configured
			</div>
			<Button variant="outline" size="sm" onclick={() => goto("/settings")}>
				{#snippet children()}Configure{/snippet}
			</Button>
		</div>
	{/if}

	<div class="shrink-0 border-t bg-background px-3 py-2.5">
		<PromptInput
			bind:value={inputValue}
			isGenerating={isGenerating}
			onSubmit={handleSubmit}
			onStop={handleStop}
			disabled={!hasAnyKey()}
		/>
	</div>
</div>
