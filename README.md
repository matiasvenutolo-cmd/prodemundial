# ⚽ Prode Mundial 2026 - Banco Ciudad

Aplicacion de pronosticos deportivos para la fase de grupos del Mundial 2026.

## Setup rapido

### 1. Supabase
1. Crear proyecto en [supabase.com](https://supabase.com)
2. SQL Editor: ejecutar `supabase-schema.sql`
3. SQL Editor: ejecutar `limpiar-banderas.sql`
4. Settings > API: copiar URL y anon key

### 2. API-Football (resultados automaticos)
1. Registrarse gratis en [api-football.com](https://www.api-football.com/)
2. Plan gratuito: 100 requests/dia (mas que suficiente)
3. Copiar tu API key

### 3. Variables de entorno
```bash
cp .env.local.example .env.local
```
Completar con tus valores.

### 4. Correr
```bash
npm install
npm run dev
```

### 5. Admin
```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'admin@bancociudad.com.ar';
```

### 6. Deploy a Vercel
- Subir a GitHub
- Importar en Vercel
- Agregar env vars (incluir API_FOOTBALL_KEY y CRON_SECRET)
- Deploy!

El cron de Vercel (vercel.json) sincroniza resultados cada 2 horas automaticamente.

## Reglas

| Acierto | Puntos |
|---------|--------|
| Acertas quien gana o empata | 1 punto |
| Acertas resultado exacto | 3 puntos |

## Stack
- Next.js 14 + TypeScript + Tailwind CSS
- Supabase (Auth + PostgreSQL + RLS)
- API-Football (resultados automaticos)
- Vercel (deploy + cron)
