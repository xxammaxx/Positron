/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
				heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
				mono: ['IBM Plex Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
			},
			colors: {
				pass: 'var(--color-pass)',
				fail: 'var(--color-fail)',
				warn: 'var(--color-warn)',
				blocked: 'var(--color-blocked)',
				human: 'var(--color-human)',
				active: 'var(--color-active)',
			},
		},
	},
	plugins: [],
};
