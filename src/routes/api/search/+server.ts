import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { query } = await request.json();
		if (!query) return json({ results: "", sources: 0 });

		const apiKey = env.BRAVE_API_KEY;
		if (!apiKey) return json({ results: "", sources: 0, error: "No Brave API key configured" });

		const res = await fetch(
			`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
			{
				headers: {
					"Accept": "application/json",
					"Accept-Encoding": "gzip",
					"X-Subscription-Token": apiKey,
				},
				signal: AbortSignal.timeout(6000),
			}
		);

		if (!res.ok) return json({ results: "", sources: 0 });

		const data = await res.json();
		const results: { title: string; description: string; url: string }[] = data.web?.results || [];

		const parts = results.map((r, i) => {
			const title = r.title.replace(/\s*[-|]\s*[^-|]*$/, "").trim().slice(0, 80);
			return { title, url: r.url, snippet: r.description.replace(/<[^>]*>/g, "").slice(0, 200) };
		});

		return json({
			sources: parts,
		});
	} catch {
		return json({ sources: [] });
	}
};
