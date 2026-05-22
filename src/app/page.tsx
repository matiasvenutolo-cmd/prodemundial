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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError("Email o contraseña incorrectos");
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
      setError("Ingresá tu nombre completo");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Registro exitoso. Ya podés iniciar sesión.");
      setIsLogin(true);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      {/* HEADER CON GRADIENTE BANCO CIUDAD */}
      <div className="bg-gradient-to-br from-[#0054A6] to-[#00AEEF] pt-16 pb-32 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Prode Mundial 2026
          </h1>
          <p className="text-white/80 text-sm font-medium">
            Banco Ciudad
          </p>
          <p className="text-white/60 text-xs mt-2">
            Fase de Grupos | 11 Jun - 27 Jun 2026
          </p>
        </div>
      </div>

      {/* CARD */}
      <div className="max-w-md mx-auto px-4 -mt-20">
        <div className="bg-white rounded-2xl p-8 shadow-xl">

          {/* TABS */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                isLogin
                  ? "bg-[#0054A6] text-white"
                  : "text-gray-500"
              }`}
            >
              Iniciar sesión
            </button>

            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                !isLogin
                  ? "bg-[#0054A6] text-white"
                  : "text-gray-500"
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* MENSAJES */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
              ✅ {success}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">

            {!isLogin && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded bg-gray-50"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded bg-gray-50"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded bg-gray-50"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0054A6] text-white font-bold rounded hover:bg-[#00AEEF]"
            >
              {loading
                ? "Cargando..."
                : isLogin
                ? "Ingresar"
                : "Registrarse"}
            </button>
          </form>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-6 text-xs text-gray-500">
          🎯 1 punto por acierto | 🔥 3 por resultado exacto
        </div>
      </div>
    </div>
  );
}
