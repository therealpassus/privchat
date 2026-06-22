import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { url } = await request.json();
		if (!url) return json({ text: "" });

		const page = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0 (compatible; PrivChat/1.0)" },
			signal: AbortSignal.timeout(6000),
		});

		if (!page.ok) return json({ text: "" });

		const html = await page.text();
		if (html.length < 100) return json({ text: "" });

		const text = html
			.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
			.replace(/<[^>]+>/g, " ")
			.replace(/&[a-z]+;/gi, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 3000);

		return json({ text });
	} catch {
		return json({ text: "" });
	}
};
