<script lang="ts">
	import { goto } from "$app/navigation";
	import { getKey, setKey, removeKey, clearAll, providers } from "$lib/keys.svelte";
	import type { ProviderKey } from "$lib/keys.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import Icon from "$lib/components/ui/icon.svelte";

	let selected = $state<ProviderKey>(providers[0].key);
	let inputValue = $state("");
	let saved = $state(false);
	let showKey = $state(false);
	let validating = $state(false);
	let validationError = $state<string | null>(null);

	$effect(() => {
		const first = [...providers].sort((a, b) => {
			const aC = getKey(a.key).length > 0 ? 0 : 1;
			const bC = getKey(b.key).length > 0 ? 0 : 1;
			return aC - bC;
		})[0].key;
		selected = first;
		inputValue = getKey(first);
	});

	function selectProvider(key: ProviderKey) {
		selected = key;
		inputValue = getKey(key);
		showKey = false;
		validationError = null;
	}

	async function handleSave() {
		validationError = null;
		const key = inputValue.trim();
		if (!key) {
			removeKey(selected);
			inputValue = "";
			return;
		}

		validating = true;
		try {
			const res = await fetch("/api/validate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: providers.find((p) => p.key === selected)!.baseUrl,
					apiKey: key,
				}),
			});
			const data = await res.json();
			if (data.valid) {
				setKey(selected, key);
				inputValue = key;
				saved = true;
				setTimeout(() => (saved = false), 2000);
			} else {
				validationError = data.error || "Invalid key";
			}
		} catch {
			validationError = "Could not reach server to validate";
		} finally {
			validating = false;
		}
	}

	function handleRemove() {
		removeKey(selected);
		inputValue = "";
		showKey = false;
		validationError = null;
	}

	function handleClearAll() {
		clearAll();
		inputValue = "";
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	const selectedProvider = $derived(providers.find((p) => p.key === selected)!);
	const sortedProviders = $derived([...providers].sort((a, b) => {
		const aKey = getKey(a.key).length > 0 ? 0 : 1;
		const bKey = getKey(b.key).length > 0 ? 0 : 1;
		return aKey - bKey;
	}));
</script>

<div class="flex h-full overflow-x-hidden flex-col bg-background">
	<header class="flex h-14 shrink-0 items-center gap-3 border-b px-4">
		<Button variant="ghost" size="icon" onclick={() => goto("/")} aria-label="Back to chat">
			{#snippet children()}
				<Icon name="chevron-left" class="size-4" />
			{/snippet}
		</Button>
		<h1 class="text-sm font-semibold">Settings</h1>
	</header>

	<div class="flex-1 overflow-y-auto p-4">
		<div class="mx-auto max-w-md space-y-6">
			<div class="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
				API keys are stored locally in your browser and never leave your device.
			</div>

			<div class="space-y-3">
				<h2 class="text-sm font-medium">Providers</h2>
				<div class="space-y-1">
					{#each sortedProviders as provider}
						{@const configured = getKey(provider.key).length > 0}
						<button
							class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent {selected === provider.key ? 'bg-accent' : ''}"
							onclick={() => selectProvider(provider.key)}
						>
							<span
								class="flex h-2 w-2 shrink-0 rounded-full {configured ? 'bg-emerald-500' : 'bg-muted-foreground/30'}"
							></span>
							<span class="flex-1 text-left">{provider.label}</span>
							{#if configured}
								<span class="text-xs text-muted-foreground">Configured</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-3 rounded-lg border p-4">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-medium">{selectedProvider.label}</h3>
						<p class="text-xs text-muted-foreground">{selectedProvider.hint}</p>
					</div>
					{#if inputValue}
						<Button variant="ghost" size="sm" onclick={handleRemove}>
							{#snippet children()}Remove{/snippet}
						</Button>
					{/if}
				</div>

				<div class="flex gap-2">
					<input
						type={showKey ? "text" : "password"}
						bind:value={inputValue}
						placeholder={selectedProvider.placeholder}
						autocomplete="off"
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm tracking-[0.15em] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
					<Button variant="outline" size="icon" onclick={() => (showKey = !showKey)} aria-label="Toggle visibility">
						{#snippet children()}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								{#if showKey}
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
									<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
									<path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/>
									<line x1="1" x2="23" y1="1" y2="23"/>
								{:else}
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
									<circle cx="12" cy="12" r="3"/>
								{/if}
							</svg>
						{/snippet}
					</Button>
				</div>

				{#if validationError}
					<p class="text-sm text-red-600 dark:text-red-400 break-words">{validationError}</p>
				{/if}

				<div class="flex gap-2">
					<Button variant="default" onclick={handleSave} disabled={validating}>
						{#snippet children()}
							{validating ? "Validating..." : saved ? "Saved" : "Save key"}
						{/snippet}
					</Button>
					<Button variant="ghost" onclick={handleClearAll}>
						{#snippet children()}Clear all{/snippet}
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
