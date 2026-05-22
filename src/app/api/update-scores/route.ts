import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const TEAM_MAP: Record<string, string> = {
  "Mexico": "M\u00e9xico", "South Korea": "Corea del Sur", "Korea Republic": "Corea del Sur",
  "Czech Republic": "Rep\u00fablica Checa", "Czechia": "Rep\u00fablica Checa",
  "Canada": "Canad\u00e1", "Bosnia And Herzegovina": "Bosnia y Herzegovina",
  "Bosnia-Herzegovina": "Bosnia y Herzegovina", "USA": "Estados Unidos",
  "United States": "Estados Unidos", "Qatar": "Qatar", "Switzerland": "Suiza",
  "Brazil": "Brasil", "Morocco": "Marruecos", "Haiti": "Hait\u00ed", "Scotland": "Escocia",
  "Australia": "Australia", "Turkey": "Turqu\u00eda", "Germany": "Alemania",
  "Curacao": "Curazao", "Netherlands": "Pa\u00edses Bajos", "Japan": "Jap\u00f3n",
  "Ivory Coast": "Costa de Marfil", "Cote D\'Ivoire": "Costa de Marfil",
  "Ecuador": "Ecuador", "Sweden": "Suecia", "Tunisia": "T\u00fanez",
  "Spain": "Espa\u00f1a", "Cape Verde": "Cabo Verde", "Cape Verde Islands": "Cabo Verde",
  "Belgium": "B\u00e9lgica", "Egypt": "Egipto", "Saudi Arabia": "Arabia Saudita",
  "Uruguay": "Uruguay", "Iran": "Ir\u00e1n", "New Zealand": "Nueva Zelanda",
  "France": "Francia", "Senegal": "Senegal", "Iraq": "Irak", "Norway": "Noruega",
  "Argentina": "Argentina", "Algeria": "Argelia", "Austria": "Austria",
  "Jordan": "Jordania", "Portugal": "Portugal", "DR Congo": "RD Congo",
  "Congo DR": "RD Congo", "England": "Inglaterra", "Croatia": "Croacia",
  "Ghana": "Ghana", "Panama": "Panam\u00e1", "Uzbekistan": "Uzbekist\u00e1n",
  "Colombia": "Colombia", "South Africa": "Sud\u00e1frica", "Paraguay": "Paraguay",
};

function calcPoints(ph: number, pa: number, rh: number, ra: number): number {
  const po = ph > pa ? 1 : ph === pa ? 0 : -1;
  const ro = rh > ra ? 1 : rh === ra ? 0 : -1;
  if (ph === rh && pa === ra) return 3;
  if (po === ro) return 1;
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      return NextResponse.json({ updated: 0, message: "API_FOOTBALL_KEY no configurada" }, { status: 200 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const apiRes = await fetch(
      "https://v3.football.api-sports.io/fixtures?league=1&season=2026&status=FT",
      { headers: { "x-apisports-key": apiKey }, cache: "no-store" }
    );

    if (!apiRes.ok) {
      return NextResponse.json({ updated: 0, message: "Error al consultar API-Football" }, { status: 200 });
    }

    const apiData = await apiRes.json();
    const fixtures = apiData?.response || [];
    let updated = 0;
    const errors: string[] = [];

    for (const fix of fixtures) {
      const homeAPI = fix.teams?.home?.name || "";
      const awayAPI = fix.teams?.away?.name || "";
      const homeScore = fix.goals?.home;
      const awayScore = fix.goals?.away;

      if (homeScore === null || awayScore === null) continue;

      const homeES = TEAM_MAP[homeAPI] || homeAPI;
      const awayES = TEAM_MAP[awayAPI] || awayAPI;

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, is_played")
        .eq("home_team", homeES)
        .eq("away_team", awayES)
        .single();

      if (matchError || !matchData) {
        errors.push(`No encontrado: ${homeES} vs ${awayES}`);
        continue;
      }

      if (matchData.is_played) continue;

      await supabase
        .from("matches")
        .update({ home_score: homeScore, away_score: awayScore, is_played: true })
        .eq("id", matchData.id);

      const { data: preds } = await supabase
        .from("predictions")
        .select("*")
        .eq("match_id", matchData.id);

      if (preds) {
        for (const pred of preds) {
          const pts = calcPoints(pred.home_score, pred.away_score, homeScore, awayScore);
          await supabase.from("predictions").update({ points: pts }).eq("id", pred.id);
        }
      }

      updated++;
    }

    return NextResponse.json({ updated, errors, total_fixtures: fixtures.length });
  } catch (e: any) {
    return NextResponse.json({ updated: 0, message: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const fakeReq = new NextRequest(req.url, { method: "POST" });
  return POST(fakeReq);
}
