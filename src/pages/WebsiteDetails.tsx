import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Website = {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	status: 'up' | 'down' | null;
	response_time: number | null;
	last_checked_at: string | null;
	created_at: string;
	domain_expires_at: string | null;
	domain_checked_at: string | null;
};

type WebsiteCheck = {
	id: string;
	status: 'up' | 'down';
	response_time: number | null;
	checked_at: string;
};

function ResponseTimeGraph({ checks }: { checks: WebsiteCheck[] }) {
	const validChecks = checks.filter(
		(check) => check.status === 'up' && check.response_time !== null,
	);

	if (validChecks.length === 0) {
		return (
			<div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-500">
				No response-time data yet.
			</div>
		);
	}

	const width = 900;
	const height = 260;
	const padding = 30;

	const maxResponse = Math.max(
		100,
		...validChecks.map((check) => check.response_time as number),
	);

	const points = validChecks
		.map((check, index) => {
			const x =
				padding +
				(index / Math.max(validChecks.length - 1, 1)) * (width - padding * 2);

			const y =
				height -
				padding -
				((check.response_time as number) / maxResponse) *
					(height - padding * 2);

			return `${x},${y}`;
		})
		.join(' ');

	return (
		<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h3 className="font-medium text-white">Response time</h3>
					<p className="mt-1 text-xs text-zinc-500">Last 24 hours</p>
				</div>

				<p className="text-xs text-zinc-500">
					Max {Math.round(maxResponse)} ms
				</p>
			</div>

			<div className="overflow-hidden rounded-lg bg-zinc-950">
				<svg
					viewBox={`0 0 ${width} ${height}`}
					className="h-64 w-full"
					preserveAspectRatio="none"
				>
					<line
						x1={padding}
						y1={padding}
						x2={width - padding}
						y2={padding}
						stroke="currentColor"
						className="text-zinc-900"
					/>

					<line
						x1={padding}
						y1={height / 2}
						x2={width - padding}
						y2={height / 2}
						stroke="currentColor"
						className="text-zinc-900"
					/>

					<line
						x1={padding}
						y1={height - padding}
						x2={width - padding}
						y2={height - padding}
						stroke="currentColor"
						className="text-zinc-900"
					/>

					<polyline
						points={points}
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-blue-400"
					/>
				</svg>
			</div>
		</div>
	);
}

function DomainExpiration({
	expiresAt,
	checkedAt,
}: {
	expiresAt: string | null;
	checkedAt: string | null;
}) {
	if (!expiresAt) {
		return (
			<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h3 className="font-medium text-white">Domain expiration</h3>

						<p className="mt-1 text-xs text-zinc-500">RDAP expiration check</p>
					</div>

					<span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
						Unavailable
					</span>
				</div>

				<p className="mt-5 text-sm text-zinc-500">
					No domain expiration date could be determined.
				</p>

				{checkedAt && (
					<p className="mt-3 text-xs text-zinc-600">
						Last checked {new Date(checkedAt).toLocaleString()}
					</p>
				)}
			</div>
		);
	}

	const expiration = new Date(expiresAt);
	const now = new Date();

	const millisecondsRemaining = expiration.getTime() - now.getTime();

	const daysRemaining = Math.ceil(
		millisecondsRemaining / (1000 * 60 * 60 * 24),
	);

	let status: 'healthy' | 'warning' | 'urgent' | 'critical';

	if (daysRemaining >= 90) {
		status = 'healthy';
	} else if (daysRemaining >= 30) {
		status = 'warning';
	} else if (daysRemaining >= 7) {
		status = 'urgent';
	} else {
		status = 'critical';
	}

	const styles = {
		healthy: {
			badge: 'bg-green-500/10 text-green-400',
			dot: 'bg-green-500',
			label: 'Healthy',
		},
		warning: {
			badge: 'bg-yellow-500/10 text-yellow-400',
			dot: 'bg-yellow-500',
			label: 'Expiring soon',
		},
		urgent: {
			badge: 'bg-orange-500/10 text-orange-400',
			dot: 'bg-orange-500',
			label: 'Renew soon',
		},
		critical: {
			badge: 'bg-red-500/10 text-red-400',
			dot: 'bg-red-500',
			label: daysRemaining < 0 ? 'Expired' : 'Critical',
		},
	};

	const currentStyle = styles[status];

	return (
		<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h3 className="font-medium text-white">Domain expiration</h3>

					<p className="mt-1 text-xs text-zinc-500">RDAP expiration check</p>
				</div>

				<span
					className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${currentStyle.badge}`}
				>
					<span className={`h-1.5 w-1.5 rounded-full ${currentStyle.dot}`} />

					{currentStyle.label}
				</span>
			</div>

			<div className="mt-5">
				<p className="text-2xl font-semibold text-white">
					{expiration.toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})}
				</p>

				<p className="mt-1 text-sm text-zinc-500">
					{daysRemaining < 0
						? `Expired ${Math.abs(daysRemaining)} days ago`
						: daysRemaining === 0
							? 'Expires today'
							: `${daysRemaining} days remaining`}
				</p>
			</div>

			{checkedAt && (
				<p className="mt-4 text-xs text-zinc-600">
					Last checked {new Date(checkedAt).toLocaleString()}
				</p>
			)}
		</div>
	);
}

export default function WebsiteDetails() {
	const { id } = useParams<{ id: string }>();

	const [website, setWebsite] = useState<Website | null>(null);
	const [checks, setChecks] = useState<WebsiteCheck[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let cancelled = false;

		async function loadData() {
			if (!id) {
				if (!cancelled) {
					setError('Website not found.');
					setLoading(false);
				}
				return;
			}

			const { data: websiteData, error: websiteError } = await supabase
				.from('websites')
				.select('*')
				.eq('id', id)
				.single();

			if (cancelled) return;

			if (websiteError) {
				setError(websiteError.message);
				setLoading(false);
				return;
			}

			setWebsite(websiteData);

			const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

			const { data: checkData, error: checkError } = await supabase
				.from('website_checks')
				.select('id, status, response_time, checked_at')
				.eq('website_id', id)
				.gte('checked_at', since)
				.order('checked_at', {
					ascending: false,
				});

			if (cancelled) return;

			if (checkError) {
				setError(checkError.message);
			} else {
				setChecks(checkData ?? []);
			}

			setLoading(false);
		}

		loadData();

		return () => {
			cancelled = true;
		};
	}, [id]);

	if (loading) {
		return (
			<div className="min-h-screen bg-zinc-950 p-8 text-white">
				<div className="text-zinc-400">Loading website...</div>
			</div>
		);
	}

	if (error || !website) {
		return (
			<div className="min-h-screen bg-zinc-950 p-8 text-white">
				<Link
					to="/dashboard"
					className="text-sm text-blue-400 hover:text-blue-300"
				>
					← Back to dashboard
				</Link>

				<p className="mt-6 text-red-400">{error || 'Website not found.'}</p>
			</div>
		);
	}

	const upChecks = checks.filter((check) => check.status === 'up');

	const uptime =
		checks.length > 0 ? (upChecks.length / checks.length) * 100 : null;

	const averageResponse =
		upChecks.length > 0
			? upChecks.reduce((sum, check) => sum + (check.response_time ?? 0), 0) /
				upChecks.length
			: null;

	const fastestResponse =
		upChecks.length > 0
			? Math.min(...upChecks.map((check) => check.response_time ?? Infinity))
			: null;

	const slowestResponse =
		upChecks.length > 0
			? Math.max(...upChecks.map((check) => check.response_time ?? 0))
			: null;

	return (
		<div className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<Link
					to="/dashboard"
					className="text-sm text-zinc-500 hover:text-zinc-300"
				>
					← Back to dashboard
				</Link>

				<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-3">
							<span
								className={`h-3 w-3 shrink-0 rounded-full ${
									website.status === 'up'
										? 'bg-green-500'
										: website.status === 'down'
											? 'bg-red-500'
											: 'bg-zinc-600'
								}`}
							/>

							<h1 className="truncate text-3xl font-semibold">
								{website.name}
							</h1>
						</div>

						<a
							href={website.url}
							target="_blank"
							rel="noreferrer"
							className="mt-2 block truncate text-sm text-zinc-500 hover:text-blue-400"
						>
							{website.url}
						</a>
					</div>

					<div className="text-left sm:text-right">
						<p className="text-lg font-medium">
							{website.status === 'up' && (
								<span className="text-green-400">● Up</span>
							)}

							{website.status === 'down' && (
								<span className="text-red-400">● Down</span>
							)}

							{!website.status && (
								<span className="text-zinc-500">● Unknown</span>
							)}
						</p>

						{website.last_checked_at && (
							<p className="mt-1 text-xs text-zinc-600">
								Last checked{' '}
								{new Date(website.last_checked_at).toLocaleString()}
							</p>
						)}
					</div>
				</div>

				<div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
					<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
						<p className="text-xs text-zinc-500">24h uptime</p>

						<p className="mt-2 text-2xl font-semibold text-white">
							{uptime !== null ? `${uptime.toFixed(2)}%` : '—'}
						</p>
					</div>

					<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
						<p className="text-xs text-zinc-500">Current response</p>

						<p className="mt-2 text-2xl font-semibold text-white">
							{website.response_time !== null
								? `${website.response_time} ms`
								: '—'}
						</p>
					</div>

					<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
						<p className="text-xs text-zinc-500">Average response</p>

						<p className="mt-2 text-2xl font-semibold text-white">
							{averageResponse !== null
								? `${Math.round(averageResponse)} ms`
								: '—'}
						</p>
					</div>

					<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
						<p className="text-xs text-zinc-500">Total checks</p>

						<p className="mt-2 text-2xl font-semibold text-white">
							{checks.length}
						</p>
					</div>
				</div>

				<div className="mt-6">
					<ResponseTimeGraph checks={checks} />
				</div>

				<div className="mt-6 grid gap-6 lg:grid-cols-2">
					<DomainExpiration
						expiresAt={website.domain_expires_at}
						checkedAt={website.domain_checked_at}
					/>

					<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
						<h3 className="font-medium text-white">Monitoring information</h3>

						<div className="mt-4 space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-zinc-500">Status</span>

								<span>{website.status ?? 'Unknown'}</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Monitoring</span>

								<span>{website.enabled ? 'Enabled' : 'Disabled'}</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Check interval</span>

								<span>1 minute</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Checks recorded</span>

								<span>{checks.length}</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Added</span>

								<span>{new Date(website.created_at).toLocaleDateString()}</span>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-6 grid gap-6 lg:grid-cols-2">
					<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
						<h3 className="font-medium text-white">Response statistics</h3>

						<div className="mt-4 space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-zinc-500">Fastest</span>

								<span>
									{fastestResponse !== null
										? `${Math.round(fastestResponse)} ms`
										: '—'}
								</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Average</span>

								<span>
									{averageResponse !== null
										? `${Math.round(averageResponse)} ms`
										: '—'}
								</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Slowest</span>

								<span>
									{slowestResponse !== null
										? `${Math.round(slowestResponse)} ms`
										: '—'}
								</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Successful checks</span>

								<span>{upChecks.length}</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Failed checks</span>

								<span>{checks.length - upChecks.length}</span>
							</div>
						</div>
					</div>

					<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
						<h3 className="font-medium text-white">Domain information</h3>

						<div className="mt-4 space-y-3 text-sm">
							<div className="flex justify-between gap-4">
								<span className="text-zinc-500">Domain</span>

								<span className="truncate">
									{(() => {
										try {
											return new URL(website.url).hostname;
										} catch {
											return '—';
										}
									})()}
								</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Expiration</span>

								<span>
									{website.domain_expires_at
										? new Date(website.domain_expires_at).toLocaleDateString()
										: 'Unavailable'}
								</span>
							</div>

							<div className="flex justify-between">
								<span className="text-zinc-500">Last domain check</span>

								<span>
									{website.domain_checked_at
										? new Date(website.domain_checked_at).toLocaleString()
										: 'Never'}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-white">Recent checks</h3>

							<p className="mt-1 text-xs text-zinc-500">Last 24 hours</p>
						</div>

						<span className="text-xs text-zinc-500">
							{checks.length} checks
						</span>
					</div>

					<div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
						{checks.length === 0 ? (
							<p className="py-10 text-center text-sm text-zinc-600">
								No checks recorded yet.
							</p>
						) : (
							<div className="max-h-96 overflow-y-auto">
								{checks.map((check) => (
									<div
										key={check.id}
										className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 text-sm last:border-0"
									>
										<div className="flex items-center gap-3">
											<span
												className={`h-2 w-2 rounded-full ${
													check.status === 'up' ? 'bg-green-500' : 'bg-red-500'
												}`}
											/>

											<div>
												<p className="font-medium text-white">
													{check.status === 'up' ? 'Up' : 'Down'}
												</p>

												<p className="text-xs text-zinc-600">
													{new Date(check.checked_at).toLocaleString()}
												</p>
											</div>
										</div>

										<span className="text-zinc-500">
											{check.response_time !== null
												? `${check.response_time} ms`
												: '—'}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
