import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AppPage() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-5">
          <h1 className="text-xl font-semibold">Argus</h1>
          <p className="text-xs text-zinc-500">Infrastructure monitoring</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavLink
            to="/app"
            end
            className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/app/websites"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Websites
          </NavLink>

          <NavLink
            to="/app/incidents"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-800"
          >
            Incidents
          </NavLink>
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <p className="truncate text-sm text-zinc-400">{email}</p>

          <button
            onClick={handleLogout}
            className="mt-2 text-sm text-zinc-500 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}