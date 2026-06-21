<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	$effect(() => {
		const el = document.getElementById("app-loading");
		if (el) {
			el.style.opacity = "0";
			setTimeout(() => el.remove(), 200);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
