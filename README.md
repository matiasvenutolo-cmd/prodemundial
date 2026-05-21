# ⚽ Prode Mundial 2026 - Banco Ciudad

Aplicación de pronósticos deportivos para la fase de grupos del Mundial 2026.

## 🚀 Setup rápido

### 1. Crear proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un nuevo proyecto.
2. En **Settings > API**, copiá la `URL` y la `anon public key`.

### 2. Ejecutar el schema SQL

1. En tu proyecto de Supabase, andá a **SQL Editor**.
2. Copiá y pegá todo el contenido de `supabase-schema.sql`.
3. Ejecutá el script. Esto crea las tablas, funciones, triggers y los 72 partidos.

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editá `.env.local` con tus valores de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Instalar y correr

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### 5. Configurar usuario admin

Después de que el admin se registre, ejecutá en el SQL Editor de Supabase:

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'admin@bancociudad.com.ar';
```

### 6. Deploy a Vercel

1. Subí el proyecto a un repo de GitHub.
2. Conectalo en [vercel.com](https://vercel.com).
3. Agregá las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy! 🎉

## 📋 Reglas del Prode

| Acierto | Puntos |
|---------|--------|
| Acertar quién gana o si empata | **1 punto** |
| Acertar el resultado exacto | **3 puntos** |
| No acertar nada | **0 puntos** |

## 🔧 Stack Tecnológico

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **Deploy:** Vercel
