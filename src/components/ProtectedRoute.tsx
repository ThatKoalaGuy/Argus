import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute() {
	const [loading, setLoading] = useState(true);
	const [loggedIn, setLoggedIn] = useState(false);

	useEffect(() => {
		async function checkAuth() {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			setLoggedIn(!!session);
			setLoading(false);
		}

		checkAuth();
	}, []);

	if (loading) {
		return <p>Loading...</p>;
	}

	if (!loggedIn) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
}
