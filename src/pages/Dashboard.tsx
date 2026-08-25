import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { supabase } from '../lib/supabase';
import AddWebsite from './AddWebsite';

type Website = {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	status: 'up' | 'down' | null;
	response_time: number | null;
	last_checked_at: string | null;
};

type WebsiteCheck = {
	website_id: string;
	status: 'up' | 'down';
	response_time: number | null;
	checked_at: string;
};

type WebsiteStats = {
	uptime: number | null;
	checks: number;
};

function UptimeGraph({ checks }: { checks: WebsiteCheck[] }) {
	const sorted = [...checks].sort(
		(a, b) =>
			new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime(),
	);

	if (sorted.length === 0) {
		return (
			<div className="flex h-8 w-52 items-center justify-center rounded-md bg-zinc-800 text-[10px] text-zinc-600">
				No data
			</div>
		);
	}

	const segmentCount = Math.min(48, sorted.length);
	const checksPerSegment = sorted.length / segmentCount;

	const segments = Array.from({ length: segmentCount }, (_, index) => {
		const start = Math.floor(index * checksPerSegment);

		const end = Math.floor((index + 1) * checksPerSegment);

		const segmentChecks = sorted.slice(start, Math.max(end, start + 1));

		const upCount = segmentChecks.filter(
			(check) => check.status === 'up',
		).length;

		return upCount / segmentChecks.length;
	});

	return (
		<div className="flex w-52 flex-col gap-1">
			<div className="flex h-8 items-end gap-[2px]">
				{segments.map((uptime, index) => (
					<div
						key={index}
						title={`${(uptime * 100).toFixed(1)}% uptime`}
						className={`min-w-0 flex-1 rounded-[2px] ${
							uptime === 1
								? 'bg-green-500'
								: uptime >= 0.5
									? 'bg-yellow-500'
									: 'bg-red-500'
						}`}
						style={{
							height: `${Math.max(20, uptime * 100)}%`,
						}}
					/>
				))}
			</div>

			<div className="flex justify-between text-[10px] text-zinc-600">
				<span>24h</span>
				<span>Now</span>
			</div>
		</div>
	);
}

export default function Dashboard() {
	const [websites, setWebsites] = useState<Website[]>([]);
	const [checks, setChecks] = useState<WebsiteCheck[]>([]);
	const [stats, setStats] = useState<Record<string, WebsiteStats>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [showAddWebsite, setShowAddWebsite] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadWebsites() {
			const { data: websiteData, error: websiteError } = await supabase
				.from('websites')
				.select('*')
				.order('created_at', {
					ascending: false,
				});

			if (cancelled) return;

			if (websiteError) {
				setError(websiteError.message);
				setLoading(false);
				return;
			}

			const loadedWebsites = websiteData ?? [];

			setWebsites(loadedWebsites);

			if (loadedWebsites.length === 0) {
				setChecks([]);
				setStats({});
				setLoading(false);
				return;
			}

			const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

			const { data: checkData, error: checkError } = await supabase
				.from('website_checks')
				.select('website_id, status, response_time, checked_at')
				.in(
					'website_id',
					loadedWebsites.map((website) => website.id),
				)
				.gte('checked_at', since)
				.order('checked_at', {
					ascending: true,
				});

			if (cancelled) return;

			if (checkError) {
				setError(checkError.message);
				setLoading(false);
				return;
			}

			const loadedChecks = (checkData ?? []) as WebsiteCheck[];

			setChecks(loadedChecks);

			const newStats: Record<string, WebsiteStats> = {};

			for (const website of loadedWebsites) {
				const websiteChecks = loadedChecks.filter(
					(check) => check.website_id === website.id,
				);

				const uptime =
					websiteChecks.length > 0
						? (websiteChecks.filter((check) => check.status === 'up').length /
								websiteChecks.length) *
							100
						: null;

				newStats[website.id] = {
					uptime,
					checks: websiteChecks.length,
				};
			}

			setStats(newStats);
			setLoading(false);
		}

		loadWebsites();

		return () => {
			cancelled = true;
		};
	}, []);

	async function reloadWebsites() {
		const { data: websiteData, error: websiteError } = await supabase
			.from('websites')
			.select('*')
			.order('created_at', {
				ascending: false,
			});

		if (websiteError) {
			setError(websiteError.message);
			return;
		}

		setWebsites(websiteData ?? []);
	}

	async function deleteWebsite(website: Website) {
		const confirmed = window.confirm(
			`Delete "${website.name}"?\n\nThis will also delete its monitoring history.`,
		);

		if (!confirmed) return;

		setDeleting(website.id);
		setError('');

		const { error: deleteError } = await supabase
			.from('websites')
			.delete()
			.eq('id', website.id);

		if (deleteError) {
			setError(deleteError.message);
			setDeleting(null);
			return;
		}

		setWebsites((current) =>
			current.filter((currentWebsite) => currentWebsite.id !== website.id),
		);

		setChecks((current) =>
			current.filter((check) => check.website_id !== website.id),
		);

		setStats((current) => {
			const next = { ...current };
			delete next[website.id];
			return next;
		});

		setDeleting(null);
	}

	if (loading) {
		return <p className="text-zinc-400">Loading...</p>;
	}

	return (
		<div>
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold">Dashboard</h2>

					<p className="mt-1 text-sm text-zinc-500">
						Monitor your websites and services.
					</p>
				</div>

				<button
					onClick={() => setShowAddWebsite(true)}
					className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400"
				>
					+ Add website
				</button>
			</div>

			{showAddWebsite && (
				<div className="mt-6">
					<AddWebsite
						onCancel={() => setShowAddWebsite(false)}
						onAdded={() => {
							setShowAddWebsite(false);
							reloadWebsites();
						}}
					/>
				</div>
			)}

			{error && <p className="mt-6 text-sm text-red-400">{error}</p>}

			<div className="mt-6 space-y-3">
				{websites.map((website) => {
					const websiteStats = stats[website.id];

					const websiteChecks = checks.filter(
						(check) => check.website_id === website.id,
					);

					return (
						<div
							key={website.id}
							className="rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700"
						>
							<div className="flex items-center justify-between gap-6 p-4">
								<Link
									to={`/dashboard/website/${website.id}`}
									className="min-w-0 flex-1"
								>
									<div className="flex items-center gap-2">
										<span
											className={`h-2 w-2 rounded-full ${
												website.status === 'up'
													? 'bg-green-500'
													: website.status === 'down'
														? 'bg-red-500'
														: 'bg-zinc-600'
											}`}
										/>

										<h3 className="font-medium">{website.name}</h3>
									</div>

									<p className="mt-1 truncate text-sm text-zinc-500">
										{website.url}
									</p>

									<div className="mt-2 flex gap-4 text-xs text-zinc-500">
										<span>
											{website.status === 'up'
												? 'Up'
												: website.status === 'down'
													? 'Down'
													: 'Unknown'}
										</span>

										{website.response_time !== null && (
											<span>{website.response_time} ms</span>
										)}

										<span>{websiteStats?.checks ?? 0} checks</span>
									</div>
								</Link>

								<div className="flex shrink-0 items-center gap-5">
									<Link
										to={`/dashboard/website/${website.id}`}
										className="hidden sm:block"
									>
										<UptimeGraph checks={websiteChecks} />
									</Link>

									<Link
										to={`/dashboard/website/${website.id}`}
										className="w-20 text-right"
									>
										<p className="text-[11px] text-zinc-500">24h uptime</p>

										<p className="mt-1 text-lg font-semibold">
											{websiteStats?.uptime !== null &&
											websiteStats?.uptime !== undefined
												? `${websiteStats.uptime.toFixed(2)}%`
												: '—'}
										</p>
									</Link>

									<button
										onClick={() => deleteWebsite(website)}
										disabled={deleting === website.id}
										className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{deleting === website.id ? 'Deleting...' : 'Delete'}
									</button>
								</div>
							</div>
						</div>
					);
				})}

				{websites.length === 0 && (
					<div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
						<p className="text-zinc-500">No websites yet.</p>

						<button
							onClick={() => setShowAddWebsite(true)}
							className="mt-3 text-sm text-blue-400 hover:text-blue-300"
						>
							Add your first website
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
