"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  email: string;
  total_points: number;
  exact_scores: number;
  correct_outcomes: number;
  total_predictions: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserId(user.id);

      const { data } = await supabase.from("leaderboard").select("*");
      if (data) setEntries(data);
      setLoading(false);
    };
    load();
  }, []);

  const getMedalStyle = (pos: number) => {
    if (pos === 1) return { emoji: "🥇", bg: "bg-yellow-500/10 border-yellow-500/30" };
    if (pos === 2) return { emoji: "🥈", bg: "bg-gray-400/10 border-gray-400/30" };
    if (pos === 3) return { emoji: "🥉", bg: "bg-amber-700/10 border-amber-700/30" };
    return { emoji: "", bg: "" };
  };

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🏆 Tabla de Posiciones</h1>
        <p className="text-sm text-gray-400 mt-1">{entries.length} participantes</p>
      </div>

      {/* Podio top 3 */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[entries[1], entries[0], entries[2]].map((e, idx) => {
            const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const medal = getMedalStyle(pos);
            const isMe = e.id === userId;
            return (
              <div
                key={e.id}
                className={`text-center p-4 rounded-xl border ${medal.bg} ${
                  pos === 1 ? "transform -translate-y-2 gold-glow" : ""
                } ${isMe ? "ring-2 ring-gold" : ""}`}
              >
                <div className="text-3xl mb-1">{medal.emoji}</div>
                <p className="font-bold text-white text-sm truncate">{e.full_name}</p>
                <p className="text-2xl font-bold text-gold mt-1">{e.total_points}</p>
                <p className="text-xs text-gray-500">puntos</p>
                <div className="mt-2 flex justify-center gap-2 text-xs text-gray-400">
                  <span>🎯{e.exact_scores}</span>
                  <span>✓{e.correct_outcomes}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla completa */}
      <div className="bg-card-bg border border-dark-blue rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-blue">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Participante</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Pts</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">🎯 Exactos</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">✓ Aciertos</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Jugados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-blue">
              {entries.map((e, idx) => {
                const pos = idx + 1;
                const medal = getMedalStyle(pos);
                const isMe = e.id === userId;
                return (
                  <tr
                    key={e.id}
                    className={`transition-colors ${
                      isMe ? "bg-gold/5 border-l-2 border-l-gold" : "hover:bg-white/5"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">
                      {medal.emoji || (
                        <span className="text-gray-500">{pos}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className={`text-sm font-medium ${isMe ? "text-gold" : "text-white"}`}>
                          {e.full_name} {isMe && "(Vos)"}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{e.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-gold">{e.total_points}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-300 hidden sm:table-cell">
                      {e.exact_scores}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-300 hidden sm:table-cell">
                      {e.correct_outcomes}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell">
                      {e.total_predictions}/72
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">🏆</div>
          <p>Todavía no hay participantes.</p>
          <p className="text-sm mt-1">¡Registrate y cargá tus pronósticos!</p>
        </div>
      )}
    </div>
  );
}
