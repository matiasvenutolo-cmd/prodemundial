"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Match {
  id: number; match_number: number; group_name: string;
  home_team: string; away_team: string; match_date: string; venue: string;
  home_score: number | null; away_score: number | null; is_played: boolean;
}
interface Prediction { match_id: number; home_score: number; away_score: number; points: number; }

const GROUPS = ["Todos", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function fmtDate(s: string) {
  const d = new Date(s);
  const days = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
}
function fmtTime(s: string) { return new Date(s).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }); }

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [preds, setPreds] = useState<Record<number, { home: number; away: number }>>({});
  const [saved, setSaved] = useState<Record<number, Prediction>>({});
  const [group, setGroup] = useState("Todos");
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUser(user);
      const { data: md } = await supabase.from("matches").select("*").order("match_date", { ascending: true });
      if (md) setMatches(md);
      const { data: pd } = await supabase.from("predictions").select("*").eq("user_id", user.id);
      if (pd) {
        const pm: Record<number, { home: number; away: number }> = {};
        const sm: Record<number, Prediction> = {};
        pd.forEach((p: any) => { pm[p.match_id] = { home: p.home_score, away: p.away_score }; sm[p.match_id] = p; });
        setPreds(pm); setSaved(sm);
      }
      setLoading(false);
    };
    load();
  }, []);

  const locked = (d: string) => new Date(d) <= new Date();

  const onChange = (id: number, t: "home"|"away", v: string) => {
    const n = Math.max(0, Math.min(20, parseInt(v) || 0));
    setPreds(p => ({ ...p, [id]: { home: t==="home"?n:(p[id]?.home??0), away: t==="away"?n:(p[id]?.away??0) } }));
  };

  const savePred = async (id: number) => {
    if (!user || !preds[id]) return;
    setSaving(p => ({ ...p, [id]: true }));
    const pr = preds[id];
    const { error } = await supabase.from("predictions").upsert(
      { user_id: user.id, match_id: id, home_score: pr.home, away_score: pr.away },
      { onConflict: "user_id,match_id" }
    );
    if (!error) setSaved(p => ({ ...p, [id]: { match_id: id, home_score: pr.home, away_score: pr.away, points: 0 } }));
    setSaving(p => ({ ...p, [id]: false }));
  };

  const saveAll = async () => {
    if (!user) return; setSavingAll(true); let c = 0;
    for (const m of filtered) {
      if (locked(m.match_date)) continue;
      const pr = preds[m.id]; if (!pr) continue;
      const { error } = await supabase.from("predictions").upsert(
        { user_id: user.id, match_id: m.id, home_score: pr.home, away_score: pr.away },
        { onConflict: "user_id,match_id" }
      );
      if (!error) c++;
    }
    setMsg(`✅ ${c} pronosticos guardados`);
    setTimeout(() => setMsg(""), 3000); setSavingAll(false);
  };

  const filtered = group === "Todos" ? matches : matches.filter(m => m.group_name === group);
  const byDate = filtered.reduce<Record<string, Match[]>>((a, m) => {
    const k = fmtDate(m.match_date); if (!a[k]) a[k] = []; a[k].push(m); return a;
  }, {});
  const total = matches.length;
  const filled = Object.keys(saved).length;
  const pct = total > 0 ? Math.round((filled/total)*100) : 0;
  const pts = Object.values(saved).reduce((s, p) => s + (p.points||0), 0);

  if (loading) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏟️ Mis Pronosticos</h1>
            <p className="text-sm text-gray-500 mt-1">{filled} de {total} completados - {pts} puntos</p>
          </div>
          <button onClick={saveAll} disabled={savingAll}
            className="px-6 py-2.5 bg-bc-blue text-white font-bold rounded-lg hover:bg-bc-celeste transition-colors disabled:opacity-50 text-sm">
            {savingAll ? "Guardando..." : "💾 Guardar todos"}
          </button>
        </div>
        {msg && <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm text-center">{msg}</div>}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-bc-blue to-bc-celeste rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{pct}%</p>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {GROUPS.map(g => (
          <button key={g} onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              group === g ? "bg-bc-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {g === "Todos" ? "📋 Todos" : `Grupo ${g}`}
          </button>
        ))}
      </div>

      {Object.entries(byDate).map(([date, dayM]) => (
        <div key={date} className="mb-6 fade-in">
          <h2 className="text-sm font-semibold text-bc-blue mb-3 sticky top-16 bg-white/95 backdrop-blur-sm py-2 z-10">
            📅 {date}
          </h2>
          <div className="space-y-3">
            {dayM.map(match => {
              const lk = locked(match.match_date);
              const pr = preds[match.id];
              const sv = saved[match.id];
              const isSv = saving[match.id];
              const p = sv?.points || 0;
              return (
                <div key={match.id} className={`card-match ${
                  match.is_played ? p===3 ? "border-green-400 bg-green-50" : p===1 ? "border-amber-400 bg-amber-50" : "border-red-300 bg-red-50" : ""
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-400">Grupo {match.group_name} - #{match.match_number}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{fmtTime(match.match_date)}</span>
                      {match.is_played && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p===3?"bg-green-100 text-green-700":p===1?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"
                        }`}>+{p} pts</span>
                      )}
                      {lk && !match.is_played && <span className="text-xs text-gray-400">🔒</span>}
                    </div>
                  </div>
                  {match.is_played && (
                    <div className="flex items-center justify-center gap-3 mb-3 p-2 bg-white rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500">Resultado:</span>
                      <span className="text-lg font-bold text-gray-900">{match.home_score} - {match.away_score}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 text-right"><span className="text-sm font-medium text-gray-900">{match.home_team}</span></div>
                    <div className="flex items-center gap-1 mx-2">
                      <input type="number" min="0" max="20" value={pr?.home ?? ""}
                        onChange={(e) => onChange(match.id,"home",e.target.value)} disabled={lk}
                        className={`w-12 h-12 text-center text-lg font-bold rounded-lg border transition-colors ${
                          lk?"bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed":"bg-white border-gray-300 text-gray-900 focus:border-bc-blue focus:outline-none focus:ring-1 focus:ring-bc-blue/20"
                        }`} placeholder="-" />
                      <span className="text-gray-300 font-bold">-</span>
                      <input type="number" min="0" max="20" value={pr?.away ?? ""}
                        onChange={(e) => onChange(match.id,"away",e.target.value)} disabled={lk}
                        className={`w-12 h-12 text-center text-lg font-bold rounded-lg border transition-colors ${
                          lk?"bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed":"bg-white border-gray-300 text-gray-900 focus:border-bc-blue focus:outline-none focus:ring-1 focus:ring-bc-blue/20"
                        }`} placeholder="-" />
                    </div>
                    <div className="flex-1 text-left"><span className="text-sm font-medium text-gray-900">{match.away_team}</span></div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400 truncate">{match.venue}</span>
                    {!lk && (
                      <button onClick={() => savePred(match.id)} disabled={isSv || !pr}
                        className="px-3 py-1 text-xs bg-bc-blue/10 text-bc-blue rounded-md hover:bg-bc-blue/20 transition-colors disabled:opacity-30">
                        {isSv ? "..." : sv ? "Actualizar" : "Guardar"}
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
