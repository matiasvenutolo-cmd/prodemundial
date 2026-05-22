
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email o contrasena incorrectos.");
    else { router.push("/dashboard"); router.refresh(); }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    if (!fullName.trim()) { setError("Ingresa tu nombre completo."); setLoading(false); return; }
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    });
    if (error) setError(error.message);
    else { setSuccess("Registro exitoso! Ya podes iniciar sesion."); setIsLogin(true); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-bc-blue to-bc-celeste pt-16 pb-32 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-3xl font-bold text-white mb-1">Prode Mundial 2026</h1>
          <p className="text-white/80 text-sm font-medium">Banco Ciudad</p>
          <p className="text-white/60 text-xs mt-2">Fase de Grupos | 11 Jun - 27 Jun 2026</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-20">
        <div className="bg-white rounded-2xl p-8 shadow-xl bc-glow">
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isLogin ? "bg-bc-blue text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}>
              Iniciar Sesion
            </button>
            <button onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isLogin ? "bg-bc-blue text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}>
              Registrarse
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">❌ {error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">✅ {success}</div>}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nombre completo</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Perez"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-bc-blue focus:outline-none focus:ring-1 focus:ring-bc-blue/20 transition-colors"
                  required />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.nombre@bancociudad.com.ar"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-bc-blue focus:outline-none focus:ring-1 focus:ring-bc-blue/20 transition-colors"
                required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Contrasena</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-bc-blue focus:outline-none focus:ring-1 focus:ring-bc-blue/20 transition-colors"
                required minLength={6} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-bc-blue text-white font-bold rounded-lg hover:bg-bc-celeste transition-colors disabled:opacity-50">
              {loading ? "Cargando..." : isLogin ? "Iniciar Sesion" : "Registrarse"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-gray-400">Adivina los resultados y competi con tus companeros</p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <span>🎯 1 pto por acierto</span>
            <span>🔥 3 pts por exacto</span>
          </div>
        </div>
      </div>
    </div>
  );
}
