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

	$effect(() => {
		if (!window.visualViewport) return;
		const vv = window.visualViewport;
		const adjust = () => {
			const root = document.querySelector<HTMLElement>('[data-app-shell]');
			if (root) root.style.height = vv.height + 'px';
		};
		vv.addEventListener('resize', adjust);
		return () => vv.removeEventListener('resize', adjust);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
