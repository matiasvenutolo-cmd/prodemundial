"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Prediction {
  match_id: number;
  home_score: number;
  away_score: number;
  points: number;
}

const GROUP_LABELS = ["Todos", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<number, { home: number; away: number }>>({});
  const [savedPredictions, setSavedPredictions] = useState<Record<number, Prediction>>({});
  const [selectedGroup, setSelectedGroup] = useState("Todos");
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUser(user);

      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: true });

      if (matchData) setMatches(matchData);

      const { data: predData } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id);

      if (predData) {
        const predMap: Record<number, { home: number; away: number }> = {};
        const savedMap: Record<number, Prediction> = {};
        predData.forEach((p: any) => {
          predMap[p.match_id] = { home: p.home_score, away: p.away_score };
          savedMap[p.match_id] = p;
        });
        setPredictions(predMap);
        setSavedPredictions(savedMap);
      }
      setLoading(false);
    };
    load();
  }, []);

  const isMatchLocked = (matchDate: string) => new Date(matchDate) <= new Date();

  const handlePredictionChange = (matchId: number, team: "home" | "away", value: string) => {
    const num = Math.max(0, Math.min(20, parseInt(value) || 0));
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        home: team === "home" ? num : (prev[matchId]?.home ?? 0),
        away: team === "away" ? num : (prev[matchId]?.away ?? 0),
      },
    }));
  };

  const savePrediction = async (matchId: number) => {
    if (!user || !predictions[matchId]) return;
    setSaving((prev) => ({ ...prev, [matchId]: true }));

    const pred = predictions[matchId];
    const { error } = await supabase.from("predictions").upsert(
      { user_id: user.id, match_id: matchId, home_score: pred.home, away_score: pred.away },
      { onConflict: "user_id,match_id" }
    );

    if (!error) {
      setSavedPredictions((prev) => ({
        ...prev,
        [matchId]: { match_id: matchId, home_score: pred.home, away_score: pred.away, points: 0 },
      }));
    }
    setSaving((prev) => ({ ...prev, [matchId]: false }));
  };

  const saveAllPredictions = async () => {
    if (!user) return;
    setSavingAll(true);
    let count = 0;

    for (const match of filteredMatches) {
      if (isMatchLocked(match.match_date)) continue;
      const pred = predictions[match.id];
      if (pred === undefined) continue;

      const { error } = await supabase.from("predictions").upsert(
        { user_id: user.id, match_id: match.id, home_score: pred.home, away_score: pred.away },
        { onConflict: "user_id,match_id" }
      );
      if (!error) count++;
    }

    setSaveMessage(`✅ ${count} pronósticos guardados`);
    setTimeout(() => setSaveMessage(""), 3000);
    setSavingAll(false);
  };

  const filteredMatches = selectedGroup === "Todos"
    ? matches
    : matches.filter((m) => m.group_name === selectedGroup);

  const groupedByDate = filteredMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = formatDate(m.match_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const totalMatches = matches.length;
  const filledPredictions = Object.keys(savedPredictions).length;
  const progressPct = totalMatches > 0 ? Math.round((filledPredictions / totalMatches) * 100) : 0;

  const totalPoints = Object.values(savedPredictions).reduce((s, p) => s + (p.points || 0), 0);

  if (loading) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header con progreso */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🏟️ Mis Pronósticos</h1>
            <p className="text-sm text-gray-400 mt-1">
              {filledPredictions} de {totalMatches} completados • {totalPoints} puntos acumulados
            </p>
          </div>
          <button
            onClick={saveAllPredictions}
            disabled={savingAll}
            className="px-6 py-2.5 bg-gold text-primary font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 text-sm"
          >
            {savingAll ? "Guardando..." : "💾 Guardar todos"}
          </button>
        </div>

        {saveMessage && (
          <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
            {saveMessage}
          </div>
        )}

        {/* Barra de progreso */}
        <div className="w-full bg-dark-blue rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-right">{progressPct}%</p>
      </div>

      {/* Filtro por grupo */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {GROUP_LABELS.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGroup(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedGroup === g
                ? "bg-gold text-primary"
                : "bg-dark-blue text-gray-400 hover:text-white hover:bg-dark-blue/80"
            }`}
          >
            {g === "Todos" ? "📋 Todos" : `Grupo ${g}`}
          </button>
        ))}
      </div>

      {/* Partidos agrupados por fecha */}
      {Object.entries(groupedByDate).map(([date, dayMatches]) => (
        <div key={date} className="mb-6 fade-in">
          <h2 className="text-sm font-semibold text-gold mb-3 sticky top-16 bg-primary/90 backdrop-blur-sm py-2 z-10">
            📅 {date}
          </h2>
          <div className="space-y-3">
            {dayMatches.map((match) => {
              const locked = isMatchLocked(match.match_date);
              const pred = predictions[match.id];
              const saved = savedPredictions[match.id];
              const isSaving = saving[match.id];
              const pts = saved?.points || 0;

              return (
                <div
                  key={match.id}
                  className={`card-match ${
                    match.is_played
                      ? pts === 3
                        ? "border-green-500/50 bg-green-900/10"
                        : pts === 1
                        ? "border-yellow-500/50 bg-yellow-900/10"
                        : "border-red-500/30 bg-red-900/5"
                      : ""
                  }`}
                >
                  {/* Encabezado del partido */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500">
                      Grupo {match.group_name} • #{match.match_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatTime(match.match_date)}</span>
                      {match.is_played && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          pts === 3
                            ? "bg-green-500/20 text-green-400"
                            : pts === 1
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          +{pts} pts
                        </span>
                      )}
                      {locked && !match.is_played && (
                        <span className="text-xs text-gray-500">🔒</span>
                      )}
                    </div>
                  </div>

                  {/* Resultado real */}
                  {match.is_played && (
                    <div className="flex items-center justify-center gap-3 mb-3 p-2 bg-primary/50 rounded-lg">
                      <span className="text-xs text-gray-400">Resultado:</span>
                      <span className="text-lg font-bold text-white">
                        {match.home_score} - {match.away_score}
                      </span>
                    </div>
                  )}

                  {/* Equipos y pronóstico */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Local */}
                    <div className="flex-1 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-medium text-white truncate">{match.home_team}</span>
                        <span className="text-xl">{match.home_flag}</span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex items-center gap-1 mx-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={pred?.home ?? ""}
                        onChange={(e) => handlePredictionChange(match.id, "home", e.target.value)}
                        disabled={locked}
                        className={`w-12 h-12 text-center text-lg font-bold rounded-lg border transition-colors ${
                          locked
                            ? "bg-gray-800/50 border-gray-700 text-gray-400 cursor-not-allowed"
                            : "bg-primary border-dark-blue text-white focus:border-gold focus:outline-none"
                        }`}
                        placeholder="-"
                      />
                      <span className="text-gray-500 font-bold">-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={pred?.away ?? ""}
                        onChange={(e) => handlePredictionChange(match.id, "away", e.target.value)}
                        disabled={locked}
                        className={`w-12 h-12 text-center text-lg font-bold rounded-lg border transition-colors ${
                          locked
                            ? "bg-gray-800/50 border-gray-700 text-gray-400 cursor-not-allowed"
                            : "bg-primary border-dark-blue text-white focus:border-gold focus:outline-none"
                        }`}
                        placeholder="-"
                      />
                    </div>

                    {/* Visitante */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{match.away_flag}</span>
                        <span className="text-sm font-medium text-white truncate">{match.away_team}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sede + Guardar */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-600 truncate">{match.venue}</span>
                    {!locked && (
                      <button
                        onClick={() => savePrediction(match.id)}
                        disabled={isSaving || !pred}
                        className="px-3 py-1 text-xs bg-pitch/20 text-pitch rounded-md hover:bg-pitch/30 transition-colors disabled:opacity-30"
                      >
                        {isSaving ? "..." : saved ? "✓ Actualizar" : "Guardar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
