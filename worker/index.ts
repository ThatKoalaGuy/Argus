interface Env {
	ASSETS: {
		fetch(request: Request): Promise<Response>;
	};
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
}

interface Website {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
}

async function checkWebsite(url: string) {
	const start = performance.now();

	try {
		const response = await fetch(url, {
			method: 'GET',
			redirect: 'follow',
		});

		return {
			status: response.ok ? 'up' : 'down',
			responseTime: Math.round(performance.now() - start),
		};
	} catch {
		return {
			status: 'down',
			responseTime: null,
		};
	}
}

async function checkWebsites(env: Env) {
	const response = await fetch(
		`${env.SUPABASE_URL}/rest/v1/websites?select=id,name,url,enabled&enabled=eq.true`,
		{
			headers: {
				apikey: env.SUPABASE_SERVICE_ROLE_KEY,
				Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch websites: ${await response.text()}`);
	}

	const websites = (await response.json()) as Website[];

	const results = await Promise.all(
		websites.map(async (website) => {
			const result = await checkWebsite(website.url);

			const checkedAt = new Date().toISOString();

			// Update current website status
			const updateResponse = await fetch(
				`${env.SUPABASE_URL}/rest/v1/websites?id=eq.${website.id}`,
				{
					method: 'PATCH',
					headers: {
						apikey: env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
						'Content-Type': 'application/json',
						Prefer: 'return=minimal',
					},
					body: JSON.stringify({
						status: result.status,
						response_time: result.responseTime,
						last_checked_at: checkedAt,
					}),
				},
			);

			if (!updateResponse.ok) {
				throw new Error(
					`Failed to update ${website.name}: ${await updateResponse.text()}`,
				);
			}

			// Save historical check
			const historyResponse = await fetch(
				`${env.SUPABASE_URL}/rest/v1/website_checks`,
				{
					method: 'POST',
					headers: {
						apikey: env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
						'Content-Type': 'application/json',
						Prefer: 'return=minimal',
					},
					body: JSON.stringify({
						website_id: website.id,
						checked_at: checkedAt,
						status: result.status,
						response_time: result.responseTime,
						error: result.status === 'down' ? 'Request failed' : null,
					}),
				},
			);

			if (!historyResponse.ok) {
				throw new Error(
					`Failed to save check for ${website.name}: ${await historyResponse.text()}`,
				);
			}

			return {
				id: website.id,
				name: website.name,
				...result,
			};
		}),
	);

	return results;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/api/health') {
			return Response.json({
				status: 'ok',
				service: 'argus-monitor',
			});
		}

		if (url.pathname === '/api/check') {
			try {
				const results = await checkWebsites(env);

				return Response.json({
					success: true,
					results,
				});
			} catch (error) {
				return Response.json(
					{
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					},
					{ status: 500 },
				);
			}
		}

		return env.ASSETS.fetch(request);
	},

	async scheduled(_controller: unknown, env: Env): Promise<void> {
		console.log('ARGUS CRON FIRED');

		try {
			await checkWebsites(env);
			console.log('ARGUS CRON FINISHED');
		} catch (error) {
			console.error('ARGUS CRON FAILED', error);
			throw error;
		}
	},
};
