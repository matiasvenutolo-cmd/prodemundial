"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Entry {
  id: string; full_name: string; email: string;
  total_points: number; exact_scores: number; correct_outcomes: number; total_predictions: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [userId, setUserId] = useState("");
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

  const medal = (p: number) => {
    if (p===1) return { e: "🥇", bg: "bg-yellow-50 border-yellow-300" };
    if (p===2) return { e: "🥈", bg: "bg-gray-50 border-gray-300" };
    if (p===3) return { e: "🥉", bg: "bg-amber-50 border-amber-300" };
    return { e: "", bg: "" };
  };

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏆 Tabla de Posiciones</h1>
        <p className="text-sm text-gray-500 mt-1">{entries.length} participantes</p>
      </div>

      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[entries[1], entries[0], entries[2]].map((e, i) => {
            const pos = i===0?2:i===1?1:3;
            const m = medal(pos);
            const me = e.id === userId;
            return (
              <div key={e.id} className={`text-center p-4 rounded-xl border ${m.bg} ${pos===1?"transform -translate-y-2 bc-glow":""} ${me?"ring-2 ring-bc-blue":""}`}>
                <div className="text-3xl mb-1">{m.e}</div>
                <p className="font-bold text-gray-900 text-sm truncate">{e.full_name}</p>
                <p className="text-2xl font-bold text-bc-blue mt-1">{e.total_points}</p>
                <p className="text-xs text-gray-400">puntos</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participante</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pts</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Exactos</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Aciertos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((e, i) => {
              const pos = i+1;
              const m = medal(pos);
              const me = e.id === userId;
              return (
                <tr key={e.id} className={`${me?"bg-bc-blue/5 border-l-2 border-l-bc-blue":"hover:bg-gray-50"} transition-colors`}>
                  <td className="px-4 py-3 text-sm">{m.e || <span className="text-gray-400">{pos}</span>}</td>
                  <td className="px-4 py-3">
                    <p className={`text-sm font-medium ${me?"text-bc-blue":"text-gray-900"}`}>{e.full_name} {me && "(Vos)"}</p>
                    <p className="text-xs text-gray-400 truncate">{e.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center"><span className="text-lg font-bold text-bc-blue">{e.total_points}</span></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 hidden sm:table-cell">{e.exact_scores}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 hidden sm:table-cell">{e.correct_outcomes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🏆</div>
          <p>Todavia no hay participantes.</p>
        </div>
      )}
    </div>
  );
}
