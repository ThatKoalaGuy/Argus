import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Props = {
	onAdded: () => void;
	onCancel: () => void;
};

export default function AddWebsite({ onAdded, onCancel }: Props) {
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setError('');
		setLoading(true);

		const { error } = await supabase.from('websites').insert({
			name: name.trim(),
			url: url.trim(),
		});

		setLoading(false);

		if (error) {
			setError(error.message);
			return;
		}

		onAdded();
	}

	return (
		<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
			<div className="mb-5">
				<h2 className="text-lg font-semibold text-white">Add website</h2>

				<p className="mt-1 text-sm text-zinc-500">
					Add a website for Argus to monitor.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="website-name"
						className="mb-1.5 block text-sm font-medium text-zinc-300"
					>
						Name
					</label>

					<input
						id="website-name"
						type="text"
						placeholder="My Website"
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
						disabled={loading}
						className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
					/>
				</div>

				<div>
					<label
						htmlFor="website-url"
						className="mb-1.5 block text-sm font-medium text-zinc-300"
					>
						URL
					</label>

					<input
						id="website-url"
						type="url"
						placeholder="https://example.com"
						value={url}
						onChange={(event) => setUrl(event.target.value)}
						required
						disabled={loading}
						className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
					/>
				</div>

				{error && (
					<div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2.5 text-sm text-red-400">
						{error}
					</div>
				)}

				<div className="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onClick={onCancel}
						disabled={loading}
						className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
					>
						Cancel
					</button>

					<button
						type="submit"
						disabled={loading}
						className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Adding...' : 'Add website'}
					</button>
				</div>
			</form>
		</div>
	);
}
