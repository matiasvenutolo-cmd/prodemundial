"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Match {
  id: number;
  match_number: number;
  group_name: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_date: string;
  venue: string;
  home_score: number | null;
  away_score: number | null;
  is_played: boolean;
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<Record<number, { home: number; away: number }>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) { router.push("/dashboard"); return; }
      setIsAdmin(true);

      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: true });

      if (matchData) {
        setMatches(matchData);
        const r: Record<number, { home: number; away: number }> = {};
        matchData.forEach((m: Match) => {
          if (m.is_played && m.home_score !== null && m.away_score !== null) {
            r[m.id] = { home: m.home_score, away: m.away_score };
          }
        });
        setResults(r);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleResultChange = (matchId: number, team: "home" | "away", value: string) => {
    const num = Math.max(0, Math.min(20, parseInt(value) || 0));
    setResults((prev) => ({
      ...prev,
      [matchId]: {
        home: team === "home" ? num : (prev[matchId]?.home ?? 0),
        away: team === "away" ? num : (prev[matchId]?.away ?? 0),
      },
    }));
  };

  const calculatePoints = (predHome: number, predAway: number, realHome: number, realAway: number): number => {
    let pts = 0;
    const predOutcome = predHome > predAway ? 1 : predHome === predAway ? 0 : -1;
    const realOutcome = realHome > realAway ? 1 : realHome === realAway ? 0 : -1;
    if (predOutcome === realOutcome) pts = 1;
    if (predHome === realHome && predAway === realAway) pts = 3;
    return pts;
  };

  const saveResult = async (matchId: number) => {
    const result = results[matchId];
    if (result === undefined) return;

    setSaving((prev) => ({ ...prev, [matchId]: true }));

    // Actualizar partido
    await supabase
      .from("matches")
      .update({ home_score: result.home, away_score: result.away, is_played: true })
      .eq("id", matchId);

    // Obtener y recalcular pronósticos
    const { data: preds } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_id", matchId);

    if (preds) {
      for (const pred of preds) {
        const pts = calculatePoints(pred.home_score, pred.away_score, result.home, result.away);
        await supabase
          .from("predictions")
          .update({ points: pts })
          .eq("id", pred.id);
      }
    }

    // Actualizar match local
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, home_score: result.home, away_score: result.away, is_played: true } : m
      )
    );

    setSaving((prev) => ({ ...prev, [matchId]: false }));
    setMessage(`✅ Resultado del partido #${matchId} guardado y puntos recalculados.`);
    setTimeout(() => setMessage(""), 4000);
  };

  const recalculateAll = async () => {
    setRecalculating(true);
    const playedMatches = matches.filter((m) => m.is_played);
    let count = 0;

    for (const match of playedMatches) {
      const { data: preds } = await supabase
        .from("predictions")
        .select("*")
        .eq("match_id", match.id);

      if (preds) {
        for (const pred of preds) {
          const pts = calculatePoints(pred.home_score, pred.away_score, match.home_score!, match.away_score!);
          await supabase.from("predictions").update({ points: pts }).eq("id", pred.id);
          count++;
        }
      }
    }

    setRecalculating(false);
    setMessage(`✅ Recalculados ${count} pronósticos en ${playedMatches.length} partidos.`);
    setTimeout(() => setMessage(""), 5000);
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ Panel de Administración</h1>
          <p className="text-sm text-gray-400 mt-1">
            Cargá los resultados reales de los partidos
          </p>
        </div>
        <button
          onClick={recalculateAll}
          disabled={recalculating}
          className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {recalculating ? "Recalculando..." : "🔄 Recalcular todo"}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {matches.map((match) => {
          const result = results[match.id];
          const isSaving = saving[match.id];

          return (
            <div
              key={match.id}
              className={`card-match ${match.is_played ? "border-green-500/30" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  Grupo {match.group_name} • #{match.match_number}
                </span>
                {match.is_played && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    ✓ Jugado
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-right">
                  <span className="text-sm font-medium text-white">{match.home_flag} {match.home_team}</span>
                </div>

                <div className="flex items-center gap-1 mx-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={result?.home ?? ""}
                    onChange={(e) => handleResultChange(match.id, "home", e.target.value)}
                    className="w-14 h-12 text-center text-lg font-bold bg-primary border border-dark-blue rounded-lg text-white focus:border-gold focus:outline-none"
                    placeholder="-"
                  />
                  <span className="text-gray-500 font-bold px-1">-</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={result?.away ?? ""}
                    onChange={(e) => handleResultChange(match.id, "away", e.target.value)}
                    className="w-14 h-12 text-center text-lg font-bold bg-primary border border-dark-blue rounded-lg text-white focus:border-gold focus:outline-none"
                    placeholder="-"
                  />
                </div>

                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-white">{match.away_team} {match.away_flag}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-600">
                  {new Date(match.match_date).toLocaleString("es-AR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                  })} • {match.venue}
                </span>
                <button
                  onClick={() => saveResult(match.id)}
                  disabled={isSaving || result === undefined}
                  className="px-4 py-1.5 text-xs bg-pitch text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-30"
                >
                  {isSaving ? "Guardando..." : "Cargar resultado"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
