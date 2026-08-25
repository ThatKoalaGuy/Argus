import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
	const navigate = useNavigate();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);

	useEffect(() => {
		async function checkSession() {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (session) {
				navigate('/app', { replace: true });
			} else {
				setCheckingSession(false);
			}
		}

		checkSession();
	}, [navigate]);

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();

		setError('');
		setLoading(true);

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		setLoading(false);

		if (error) {
			setError(error.message);
			return;
		}

		navigate('/app', { replace: true });
	}

	if (checkingSession) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-zinc-950">
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
			</main>
		);
	}

	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
			{/* Background */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

				<div
					className="absolute inset-0 opacity-[0.035]"
					style={{
						backgroundImage:
							'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
						backgroundSize: '40px 40px',
					}}
				/>
			</div>

			{/* Login */}
			<div className="relative z-10 w-full max-w-sm">
				{/* Logo */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg">
						<div className="h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.8)]" />
					</div>

					<h1 className="text-2xl font-semibold tracking-tight text-white">
						Argus
					</h1>

					<p className="mt-1 text-sm text-zinc-500">
						Website & infrastructure monitoring
					</p>
				</div>

				{/* Card */}
				<div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
					<div className="mb-6">
						<h2 className="text-lg font-medium text-white">Welcome back</h2>

						<p className="mt-1 text-sm text-zinc-500">
							Sign in to your Argus account.
						</p>
					</div>

					<form onSubmit={handleLogin} className="space-y-4">
						{/* Email */}
						<div>
							<label
								htmlFor="email"
								className="mb-1.5 block text-sm font-medium text-zinc-300"
							>
								Email
							</label>

							<input
								id="email"
								type="email"
								autoComplete="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
							/>
						</div>

						{/* Password */}
						<div>
							<div className="mb-1.5 flex items-center justify-between">
								<label
									htmlFor="password"
									className="text-sm font-medium text-zinc-300"
								>
									Password
								</label>

								<button
									type="button"
									className="text-xs text-zinc-500 transition hover:text-zinc-300"
								>
									Forgot password?
								</button>
							</div>

							<input
								id="password"
								type="password"
								autoComplete="current-password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
							/>
						</div>

						{/* Error */}
						{error && (
							<div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2.5 text-sm text-red-400">
								{error}
							</div>
						)}

						{/* Submit */}
						<button
							type="submit"
							disabled={loading}
							className="flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? (
								<>
									<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-white" />
									Signing in...
								</>
							) : (
								'Sign in'
							)}
						</button>
					</form>

					<div className="my-6 flex items-center gap-3">
						<div className="h-px flex-1 bg-zinc-800" />
						<span className="text-xs text-zinc-600">OR</span>
						<div className="h-px flex-1 bg-zinc-800" />
					</div>

					<button
						type="button"
						className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
					>
						Continue with GitHub
					</button>
				</div>

				<p className="mt-6 text-center text-xs text-zinc-600">
					Argus · Open source monitoring
				</p>
			</div>
		</main>
	);
}
