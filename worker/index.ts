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

interface WebsiteCheckResult {
	status: 'up' | 'down';
	responseTime: number | null;
}

interface RdapBootstrap {
	services: [string[], string[]][];
}

interface RdapEvent {
	eventAction?: string;
	eventDate?: string;
}

interface RdapDomain {
	events?: RdapEvent[];
}

/*
 * Extract the domain from a URL.
 *
 * https://www.example.com/something
 * -> example.com
 */
function getDomain(url: string): string | null {
	try {
		const hostname = new URL(url).hostname.toLowerCase();

		return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
	} catch {
		return null;
	}
}

/*
 * Check a website.
 */
async function checkWebsite(url: string): Promise<WebsiteCheckResult> {
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

/*
 * Find the RDAP server responsible for a TLD.
 */
async function getRdapServer(domain: string): Promise<string | null> {
	try {
		const tld = domain.split('.').pop()?.toLowerCase();

		if (!tld) {
			return null;
		}

		const response = await fetch('https://data.iana.org/rdap/dns.json');

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as RdapBootstrap;

		for (const service of data.services) {
			const tlds = service[0];
			const servers = service[1];

			if (tlds.includes(tld) && servers.length > 0) {
				return servers[0];
			}
		}

		return null;
	} catch {
		return null;
	}
}

/*
 * Get domain expiration date using RDAP.
 */
async function getDomainExpiration(domain: string): Promise<string | null> {
	try {
		const rdapServer = await getRdapServer(domain);

		if (!rdapServer) {
			return null;
		}

		const response = await fetch(
			`${rdapServer.replace(/\/$/, '')}/domain/${domain}`,
			{
				headers: {
					Accept: 'application/rdap+json',
				},
			},
		);

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as RdapDomain;

		const expirationEvent = data.events?.find(
			(event) =>
				event.eventAction === 'expiration' ||
				event.eventAction === 'registrar expiration',
		);

		return expirationEvent?.eventDate ?? null;
	} catch {
		return null;
	}
}

/*
 * Normal website monitoring.
 *
 * Runs every minute.
 */
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

			/*
			 * Update current website status.
			 */
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

			/*
			 * Save historical check.
			 */
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

/*
 * Check domain expiration dates.
 *
 * Runs once per day.
 */
async function checkDomainExpirations(env: Env) {
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
			const domain = getDomain(website.url);

			if (!domain) {
				return {
					id: website.id,
					name: website.name,
					domain: null,
					expiresAt: null,
				};
			}

			const expiresAt = await getDomainExpiration(domain);
			const checkedAt = new Date().toISOString();

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
						domain_expires_at: expiresAt,
						domain_checked_at: checkedAt,
					}),
				},
			);

			if (!updateResponse.ok) {
				throw new Error(
					`Failed to update domain expiration for ${website.name}: ${await updateResponse.text()}`,
				);
			}

			return {
				id: website.id,
				name: website.name,
				domain,
				expiresAt,
			};
		}),
	);

	return results;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		/*
		 * Health endpoint.
		 */
		if (url.pathname === '/api/health') {
			return Response.json({
				status: 'ok',
				service: 'argus-monitor',
			});
		}

		/*
		 * Manually run HTTP checks.
		 */
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

		/*
		 * Manually run domain expiration checks.
		 *
		 * This is useful for testing instead of waiting
		 * for the daily cron.
		 */
		if (url.pathname === '/api/check-domains') {
			try {
				const results = await checkDomainExpirations(env);

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

		/*
		 * Serve the React application.
		 */
		return env.ASSETS.fetch(request);
	},

	async scheduled(controller: { cron: string }, env: Env): Promise<void> {
		console.log(`ARGUS CRON FIRED: ${controller.cron}`);

		try {
			/*
			 * Every-minute HTTP monitoring.
			 */
			if (controller.cron === '*/1 * * * *') {
				await checkWebsites(env);

				console.log('ARGUS HTTP MONITORING FINISHED');

				return;
			}

			/*
			 * Daily domain expiration check.
			 */
			if (controller.cron === '0 3 * * *') {
				await checkDomainExpirations(env);

				console.log('ARGUS DOMAIN CHECK FINISHED');

				return;
			}

			console.log(`ARGUS UNKNOWN CRON: ${controller.cron}`);
		} catch (error) {
			console.error('ARGUS CRON FAILED', error);

			throw error;
		}
	},
};
