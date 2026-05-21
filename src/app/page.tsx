"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push("/dashboard");
    };
    checkUser();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email o contraseña incorrectos.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!fullName.trim()) {
      setError("Ingresá tu nombre completo.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("¡Registro exitoso! Ya podés iniciar sesión.");
      setIsLogin(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-3xl font-bold text-gold mb-1">Prode Mundial 2026</h1>
          <p className="text-gray-400 text-sm">Banco Ciudad</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs text-gray-500">🇺🇸 🇲🇽 🇨🇦</span>
            <span className="text-xs text-gray-500">|</span>
            <span className="text-xs text-gray-500">11 Jun - 19 Jul 2026</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card-bg border border-dark-blue rounded-2xl p-8 gold-glow">
          {/* Tabs */}
          <div className="flex mb-6 bg-primary rounded-lg p-1">
            <button
              onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
              className={`flex-1 py-2, px-4 rounded-md text-sm font-medium transition-all py-2 ${
                isLogin ? "bg-gold text-primary" : "text-gray-400 hover:text-white"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isLogin ? "bg-gold text-primary" : "text-gray-400 hover:text-white"
              }`}
            >
              Registrarse
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              ❌ {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              ✅ {success}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-3 bg-primary border border-dark-blue rounded-lg text-white placeholder:text-gray-600 focus:border-gold focus:outline-none transition-colors"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.nombre@bancociudad.com.ar"
                className="w-full px-4 py-3 bg-primary border border-dark-blue rounded-lg text-white placeholder:text-gray-600 focus:border-gold focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 bg-primary border border-dark-blue rounded-lg text-white placeholder:text-gray-600 focus:border-gold focus:outline-none transition-colors"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold text-primary font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Cargando..." : isLogin ? "Iniciar Sesión" : "Registrarse"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-gray-600">
            Adiviná los resultados de la fase de grupos y competí con tus compañeros
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-600">
            <span>🎯 1 pto por acierto</span>
            <span>🔥 3 pts por exacto</span>
          </div>
        </div>
      </div>
    </div>
  );
}
