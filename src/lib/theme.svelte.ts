let isDark = $state(false);

if (typeof document !== 'undefined') {
	isDark = document.documentElement.classList.contains('dark');
}

export function getTheme() {
	return isDark;
}

export function toggleTheme() {
	isDark = !isDark;
	document.documentElement.classList.toggle('dark', isDark);
	localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

export function setTheme(theme: 'dark' | 'light') {
	isDark = theme === 'dark';
	document.documentElement.classList.toggle('dark', isDark);
	localStorage.setItem('theme', theme);
}
