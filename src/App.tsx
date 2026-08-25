import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AppPage from './pages/App';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/app" replace />} />

				<Route path="/login" element={<Login />} />

				<Route element={<ProtectedRoute />}>
					<Route path="/app" element={<AppPage />}>
						<Route index element={<Dashboard />} />
					</Route>
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
