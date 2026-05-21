"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.is_admin || false);
      }
      setLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push("/");
  };

  const isActive = (path: string) => pathname === path;

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-bounce">⚽</div>
            <p className="text-gold font-medium">Cargando...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      {user && (
        <nav className="bg-dark-blue/80 backdrop-blur-md border-b border-gold/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/dashboard" className="flex items-center gap-2 text-gold font-bold text-lg">
                ⚽ Prode Mundial 2026
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/dashboard")
                      ? "bg-gold/20 text-gold"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  🏟️ Pronosticos
                </Link>
                <Link
                  href="/leaderboard"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/leaderboard")
                      ? "bg-gold/20 text-gold"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  🏆 Tabla de Posiciones
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive("/admin")
                        ? "bg-red-500/20 text-red-400"
                        : "text-red-300 hover:bg-red-500/10 hover:text-red-400"
                    }`}
                  >
                    ⚙️ Admin
                  </Link>
                )}
                <div className="ml-4 pl-4 border-l border-gray-600 flex items-center gap-3">
                  <span className="text-xs text-gray-400">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                  >
                    Salir
                  </button>
                </div>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden text-gray-300 hover:text-white p-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
              <div className="md:hidden pb-4 space-y-1">
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5">
                  🏟️ Pronosticos
                </Link>
                <Link href="/leaderboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5">
                  🏆 Tabla de Posiciones
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10">
                    ⚙️ Admin
                  </Link>
                )}
                <div className="pt-2 border-t border-gray-700">
                  <p className="px-4 py-1 text-xs text-gray-500">{user.email}</p>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg">
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      )}
      <main className="min-h-screen">{children}</main>
    </>
  );
}
