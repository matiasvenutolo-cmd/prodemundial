"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Match {
  id: number; match_number: number; group_name: string;
  home_team: string; away_team: string; match_date: string; venue: string;
  home_score: number | null; away_score: number | null; is_played: boolean;
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<Record<number, { home: number; away: number }>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [recalc, setRecalc] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { router.push("/dashboard"); return; }
      setIsAdmin(true);
      const { data: md } = await supabase.from("matches").select("*").order("match_date", { ascending: true });
      if (md) {
        setMatches(md);
        const r: Record<number, { home: number; away: number }> = {};
        md.forEach((m: Match) => { if (m.is_played && m.home_score!==null) r[m.id] = { home: m.home_score, away: m.away_score! }; });
        setResults(r);
      }
      setLoading(false);
    };
    load();
  }, []);

  const onResultChange = (id: number, t: "home"|"away", v: string) => {
    const n = Math.max(0, Math.min(20, parseInt(v)||0));
    setResults(p => ({ ...p, [id]: { home: t==="home"?n:(p[id]?.home??0), away: t==="away"?n:(p[id]?.away??0) } }));
  };

  const calcPts = (ph: number, pa: number, rh: number, ra: number) => {
    let pts = 0;
    const po = ph>pa?1:ph===pa?0:-1;
    const ro = rh>ra?1:rh===ra?0:-1;
    if (po===ro) pts = 1;
    if (ph===rh && pa===ra) pts = 3;
    return pts;
  };

  const saveResult = async (id: number) => {
    const r = results[id]; if (!r) return;
    setSaving(p => ({ ...p, [id]: true }));
    await supabase.from("matches").update({ home_score: r.home, away_score: r.away, is_played: true }).eq("id", id);
    const { data: preds } = await supabase.from("predictions").select("*").eq("match_id", id);
    if (preds) { for (const p of preds) { const pts = calcPts(p.home_score, p.away_score, r.home, r.away); await supabase.from("predictions").update({ points: pts }).eq("id", p.id); } }
    setMatches(p => p.map(m => m.id===id ? { ...m, home_score: r.home, away_score: r.away, is_played: true } : m));
    setSaving(p => ({ ...p, [id]: false }));
    setMsg("✅ Resultado guardado y puntos recalculados.");
    setTimeout(() => setMsg(""), 4000);
  };

  const recalcAll = async () => {
    setRecalc(true); let c = 0;
    for (const m of matches.filter(m => m.is_played)) {
      const { data: preds } = await supabase.from("predictions").select("*").eq("match_id", m.id);
      if (preds) { for (const p of preds) { const pts = calcPts(p.home_score, p.away_score, m.home_score!, m.away_score!); await supabase.from("predictions").update({ points: pts }).eq("id", p.id); c++; } }
    }
    setRecalc(false);
    setMsg(`✅ Recalculados ${c} pronosticos.`);
    setTimeout(() => setMsg(""), 5000);
  };

  const syncAPI = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/update-scores", { method: "POST" });
      const data = await res.json();
      if (data.updated > 0) {
        setMsg(`✅ ${data.updated} partidos actualizados desde API-Football.`);
        const { data: md } = await supabase.from("matches").select("*").order("match_date", { ascending: true });
        if (md) setMatches(md);
      } else {
        setMsg(`No hay partidos nuevos para actualizar. ${data.message || ""}`);
      }
    } catch (e) {
      setMsg("❌ Error al sincronizar con la API.");
    }
    setSyncing(false);
    setTimeout(() => setMsg(""), 5000);
  };

  if (loading || !isAdmin) return null;

  const played = matches.filter(m => m.is_played).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Panel de Administracion</h1>

      {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">🔄 Sincronizar con API</h2>
          <p className="text-sm text-gray-500 mb-4">Actualiza resultados automaticamente desde API-Football</p>
          <p className="text-xs text-gray-400 mb-4">Partidos jugados: {played} / {matches.length}</p>
          <button onClick={syncAPI} disabled={syncing}
            className="w-full py-2.5 bg-bc-celeste text-white font-bold rounded-lg hover:bg-bc-blue transition-colors disabled:opacity-50">
            {syncing ? "Sincronizando..." : "Sincronizar resultados"}
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">🔄 Recalcular puntos</h2>
          <p className="text-sm text-gray-500 mb-4">Recalcula todos los puntos de todos los pronosticos</p>
          <p className="text-xs text-gray-400 mb-4">Util si hubo algun error o correccion</p>
          <button onClick={recalcAll} disabled={recalc}
            className="w-full py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
            {recalc ? "Recalculando..." : "Recalcular todo"}
          </button>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Carga manual de resultados</h2>
      <div className="space-y-3">
        {matches.map(match => {
          const r = results[match.id];
          const isSv = saving[match.id];
          return (
            <div key={match.id} className={`card-match ${match.is_played?"border-green-300 bg-green-50":""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Grupo {match.group_name} - #{match.match_number}</span>
                {match.is_played && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Jugado</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-right"><span className="text-sm font-medium text-gray-900">{match.home_team}</span></div>
                <div className="flex items-center gap-1 mx-3">
                  <input type="number" min="0" max="20" value={r?.home ?? ""}
                    onChange={(e) => onResultChange(match.id,"home",e.target.value)}
                    className="w-14 h-12 text-center text-lg font-bold bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-bc-blue focus:outline-none" placeholder="-" />
                  <span className="text-gray-300 font-bold px-1">-</span>
                  <input type="number" min="0" max="20" value={r?.away ?? ""}
                    onChange={(e) => onResultChange(match.id,"away",e.target.value)}
                    className="w-14 h-12 text-center text-lg font-bold bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-bc-blue focus:outline-none" placeholder="-" />
                </div>
                <div className="flex-1 text-left"><span className="text-sm font-medium text-gray-900">{match.away_team}</span></div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {new Date(match.match_date).toLocaleString("es-AR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })} - {match.venue}
                </span>
                <button onClick={() => saveResult(match.id)} disabled={isSv || !r}
                  className="px-4 py-1.5 text-xs bg-bc-blue text-white rounded-md hover:bg-bc-celeste transition-colors disabled:opacity-30">
                  {isSv ? "Guardando..." : "Cargar resultado"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
