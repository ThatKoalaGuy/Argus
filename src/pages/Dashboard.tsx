/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AddWebsite from './AddWebsite';

type Website = {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
};

export default function Dashboard() {
	const [websites, setWebsites] = useState<Website[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [showAddWebsite, setShowAddWebsite] = useState(false);

	async function loadWebsites() {
		const { data, error } = await supabase
			.from('websites')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			setError(error.message);
		} else {
			setWebsites(data ?? []);
		}

		setLoading(false);
	}

	useEffect(() => {
		loadWebsites();
	}, []);

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
							loadWebsites();
						}}
					/>
				</div>
			)}

			{error && <p className="mt-6 text-sm text-red-400">{error}</p>}

			<div className="mt-6 space-y-3">
				{websites.map((website) => (
					<div
						key={website.id}
						className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
					>
						<h3 className="font-medium">{website.name}</h3>

						<p className="mt-1 text-sm text-zinc-500">{website.url}</p>
					</div>
				))}

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
