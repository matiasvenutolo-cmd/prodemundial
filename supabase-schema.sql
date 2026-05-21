-- =============================================
-- PRODE MUNDIAL 2026 - BANCO CIUDAD
-- Schema SQL para Supabase
-- =============================================

-- 1. Tabla de perfiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfiles visibles para todos los autenticados"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. Tabla de partidos
CREATE TABLE public.matches (
  id SERIAL PRIMARY KEY,
  match_number INT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT NOT NULL DEFAULT '',
  away_flag TEXT NOT NULL DEFAULT '',
  match_date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  home_score INT,
  away_score INT,
  is_played BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partidos visibles para todos"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden actualizar partidos"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. Tabla de pronósticos
CREATE TABLE public.predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id INT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver todos los pronósticos"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden insertar sus propios pronósticos"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios pronósticos"
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Función para calcular puntos
CREATE OR REPLACE FUNCTION public.calculate_points(
  pred_home INT,
  pred_away INT,
  real_home INT,
  real_away INT
) RETURNS INT AS $$
DECLARE
  pts INT := 0;
  pred_outcome INT; -- 1=home, 0=draw, -1=away
  real_outcome INT;
BEGIN
  -- Determinar resultado predicho
  IF pred_home > pred_away THEN pred_outcome := 1;
  ELSIF pred_home = pred_away THEN pred_outcome := 0;
  ELSE pred_outcome := -1;
  END IF;

  -- Determinar resultado real
  IF real_home > real_away THEN real_outcome := 1;
  ELSIF real_home = real_away THEN real_outcome := 0;
  ELSE real_outcome := -1;
  END IF;

  -- 1 punto por acertar el resultado (gana/empata/pierde)
  IF pred_outcome = real_outcome THEN
    pts := 1;
  END IF;

  -- 2 puntos extra (total 3) por resultado exacto
  IF pred_home = real_home AND pred_away = real_away THEN
    pts := 3;
  END IF;

  RETURN pts;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Trigger para crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Vista para la tabla de posiciones
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.email,
  COALESCE(SUM(pr.points), 0) AS total_points,
  COALESCE(SUM(CASE WHEN pr.points = 3 THEN 1 ELSE 0 END), 0) AS exact_scores,
  COALESCE(SUM(CASE WHEN pr.points = 1 THEN 1 ELSE 0 END), 0) AS correct_outcomes,
  COUNT(pr.id) AS total_predictions
FROM public.profiles p
LEFT JOIN public.predictions pr ON p.id = pr.user_id
GROUP BY p.id, p.full_name, p.email
ORDER BY total_points DESC, exact_scores DESC, correct_outcomes DESC;

-- =============================================
-- 7. INSERTAR LOS 72 PARTIDOS DE FASE DE GRUPOS
-- Horarios en hora argentina (UTC-3)
-- =============================================

INSERT INTO public.matches (match_number, group_name, home_team, home_flag, away_team, away_flag, match_date, venue) VALUES
(1,  'A', 'México',             '🇲🇽', 'Sudáfrica',              '🇿🇦', '2026-06-11T16:00:00-03:00', 'Estadio Azteca, CDMX'),
(2,  'A', 'Corea del Sur',      '🇰🇷', 'República Checa',        '🇨🇿', '2026-06-11T23:00:00-03:00', 'Estadio Akron, Guadalajara'),
(3,  'B', 'Canadá',             '🇨🇦', 'Bosnia y Herzegovina',   '🇧🇦', '2026-06-12T16:00:00-03:00', 'BMO Field, Toronto'),
(4,  'D', 'Estados Unidos',     '🇺🇸', 'Paraguay',               '🇵🇾', '2026-06-12T22:00:00-03:00', 'SoFi Stadium, Los Ángeles'),
(5,  'B', 'Qatar',              '🇶🇦', 'Suiza',                  '🇨🇭', '2026-06-13T16:00:00-03:00', 'Levi''s Stadium, San Francisco'),
(6,  'C', 'Brasil',             '🇧🇷', 'Marruecos',              '🇲🇦', '2026-06-13T19:00:00-03:00', 'MetLife Stadium, Nueva York'),
(7,  'C', 'Haití',              '🇭🇹', 'Escocia',                '🏴\U000e0067\U000e0062\U000e0073\U000e0063\U000e0074\U000e007f', '2026-06-13T22:00:00-03:00', 'Gillette Stadium, Boston'),
(8,  'D', 'Australia',          '🇦🇺', 'Turquía',                '🇹🇷', '2026-06-14T01:00:00-03:00', 'BC Place, Vancouver'),
(9,  'E', 'Alemania',           '🇩🇪', 'Curazao',                '🇨🇼', '2026-06-14T14:00:00-03:00', 'NRG Stadium, Houston'),
(10, 'F', 'Países Bajos',       '🇳🇱', 'Japón',                  '🇯🇵', '2026-06-14T17:00:00-03:00', 'AT&T Stadium, Dallas'),
(11, 'E', 'Costa de Marfil',    '🇨🇮', 'Ecuador',                '🇪🇨', '2026-06-14T20:00:00-03:00', 'Lincoln Financial, Filadelfia'),
(12, 'F', 'Suecia',             '🇸🇪', 'Túnez',                  '🇹🇳', '2026-06-14T23:00:00-03:00', 'Estadio BBVA, Monterrey'),
(13, 'H', 'España',             '🇪🇸', 'Cabo Verde',             '🇨🇻', '2026-06-15T13:00:00-03:00', 'Mercedes-Benz, Atlanta'),
(14, 'G', 'Bélgica',            '🇧🇪', 'Egipto',                 '🇪🇬', '2026-06-15T16:00:00-03:00', 'Lumen Field, Seattle'),
(15, 'H', 'Arabia Saudita',     '🇸🇦', 'Uruguay',                '🇺🇾', '2026-06-15T19:00:00-03:00', 'Hard Rock Stadium, Miami'),
(16, 'G', 'Irán',               '🇮🇷', 'Nueva Zelanda',          '🇳🇿', '2026-06-15T22:00:00-03:00', 'SoFi Stadium, Los Ángeles'),
(17, 'I', 'Francia',            '🇫🇷', 'Senegal',                '🇸🇳', '2026-06-16T16:00:00-03:00', 'MetLife Stadium, Nueva York'),
(18, 'I', 'Irak',               '🇮🇶', 'Noruega',                '🇳🇴', '2026-06-16T19:00:00-03:00', 'Gillette Stadium, Boston'),
(19, 'J', 'Argentina',          '🇦🇷', 'Argelia',                '🇩🇿', '2026-06-16T22:00:00-03:00', 'Arrowhead Stadium, Kansas City'),
(20, 'J', 'Austria',            '🇦🇹', 'Jordania',               '🇯🇴', '2026-06-17T01:00:00-03:00', 'Levi''s Stadium, San Francisco'),
(21, 'K', 'Portugal',           '🇵🇹', 'RD Congo',               '🇨🇩', '2026-06-17T14:00:00-03:00', 'NRG Stadium, Houston'),
(22, 'L', 'Inglaterra',         '🏴\U000e0067\U000e0062\U000e0065\U000e006e\U000e0067\U000e007f', 'Croacia',                '🇭🇷', '2026-06-17T17:00:00-03:00', 'AT&T Stadium, Dallas'),
(23, 'L', 'Ghana',              '🇬🇭', 'Panamá',                 '🇵🇦', '2026-06-17T20:00:00-03:00', 'BMO Field, Toronto'),
(24, 'K', 'Uzbekistán',         '🇺🇿', 'Colombia',               '🇨🇴', '2026-06-17T23:00:00-03:00', 'Estadio Azteca, CDMX'),
(25, 'A', 'República Checa',    '🇨🇿', 'Sudáfrica',              '🇿🇦', '2026-06-18T13:00:00-03:00', 'Mercedes-Benz, Atlanta'),
(26, 'B', 'Suiza',              '🇨🇭', 'Bosnia y Herzegovina',   '🇧🇦', '2026-06-18T16:00:00-03:00', 'SoFi Stadium, Los Ángeles'),
(27, 'B', 'Canadá',             '🇨🇦', 'Qatar',                  '🇶🇦', '2026-06-18T19:00:00-03:00', 'BC Place, Vancouver'),
(28, 'A', 'México',             '🇲🇽', 'Corea del Sur',          '🇰🇷', '2026-06-18T22:00:00-03:00', 'Estadio Akron, Guadalajara'),
(29, 'D', 'Estados Unidos',     '🇺🇸', 'Australia',              '🇦🇺', '2026-06-19T16:00:00-03:00', 'Lumen Field, Seattle'),
(30, 'C', 'Escocia',            '🏴\U000e0067\U000e0062\U000e0073\U000e0063\U000e0074\U000e007f', 'Marruecos',              '🇲🇦', '2026-06-19T19:00:00-03:00', 'Gillette Stadium, Boston'),
(31, 'C', 'Brasil',             '🇧🇷', 'Haití',                  '🇭🇹', '2026-06-19T22:00:00-03:00', 'Lincoln Financial, Filadelfia'),
(32, 'D', 'Turquía',            '🇹🇷', 'Paraguay',               '🇵🇾', '2026-06-20T01:00:00-03:00', 'Levi''s Stadium, San Francisco'),
(33, 'F', 'Países Bajos',       '🇳🇱', 'Suecia',                 '🇸🇪', '2026-06-20T14:00:00-03:00', 'NRG Stadium, Houston'),
(34, 'E', 'Alemania',           '🇩🇪', 'Costa de Marfil',        '🇨🇮', '2026-06-20T17:00:00-03:00', 'BMO Field, Toronto'),
(35, 'E', 'Ecuador',            '🇪🇨', 'Curazao',                '🇨🇼', '2026-06-20T21:00:00-03:00', 'Arrowhead Stadium, Kansas City'),
(36, 'F', 'Túnez',              '🇹🇳', 'Japón',                  '🇯🇵', '2026-06-21T01:00:00-03:00', 'Estadio BBVA, Monterrey'),
(37, 'H', 'España',             '🇪🇸', 'Arabia Saudita',         '🇸🇦', '2026-06-21T13:00:00-03:00', 'Mercedes-Benz, Atlanta'),
(38, 'G', 'Bélgica',            '🇧🇪', 'Irán',                   '🇮🇷', '2026-06-21T16:00:00-03:00', 'SoFi Stadium, Los Ángeles'),
(39, 'H', 'Uruguay',            '🇺🇾', 'Cabo Verde',             '🇨🇻', '2026-06-21T19:00:00-03:00', 'Hard Rock Stadium, Miami'),
(40, 'G', 'Nueva Zelanda',      '🇳🇿', 'Egipto',                 '🇪🇬', '2026-06-21T22:00:00-03:00', 'BC Place, Vancouver'),
(41, 'J', 'Argentina',          '🇦🇷', 'Austria',                '🇦🇹', '2026-06-22T14:00:00-03:00', 'AT&T Stadium, Dallas'),
(42, 'I', 'Francia',            '🇫🇷', 'Irak',                   '🇮🇶', '2026-06-22T18:00:00-03:00', 'Lincoln Financial, Filadelfia'),
(43, 'I', 'Noruega',            '🇳🇴', 'Senegal',                '🇸🇳', '2026-06-22T21:00:00-03:00', 'MetLife Stadium, Nueva York'),
(44, 'J', 'Jordania',           '🇯🇴', 'Argelia',                '🇩🇿', '2026-06-23T00:00:00-03:00', 'Levi''s Stadium, San Francisco'),
(45, 'K', 'Portugal',           '🇵🇹', 'Uzbekistán',             '🇺🇿', '2026-06-23T14:00:00-03:00', 'NRG Stadium, Houston'),
(46, 'L', 'Inglaterra',         '🏴\U000e0067\U000e0062\U000e0065\U000e006e\U000e0067\U000e007f', 'Ghana',                  '🇬🇭', '2026-06-23T17:00:00-03:00', 'Gillette Stadium, Boston'),
(47, 'L', 'Panamá',             '🇵🇦', 'Croacia',                '🇭🇷', '2026-06-23T20:00:00-03:00', 'BMO Field, Toronto'),
(48, 'K', 'Colombia',           '🇨🇴', 'RD Congo',               '🇨🇩', '2026-06-23T23:00:00-03:00', 'Estadio Akron, Guadalajara'),
(49, 'B', 'Suiza',              '🇨🇭', 'Canadá',                 '🇨🇦', '2026-06-24T16:00:00-03:00', 'BC Place, Vancouver'),
(50, 'B', 'Bosnia y Herzegovina','🇧🇦', 'Qatar',                 '🇶🇦', '2026-06-24T16:00:00-03:00', 'Lumen Field, Seattle'),
(51, 'C', 'Marruecos',          '🇲🇦', 'Haití',                  '🇭🇹', '2026-06-24T19:00:00-03:00', 'Mercedes-Benz, Atlanta'),
(52, 'C', 'Escocia',            '🏴\U000e0067\U000e0062\U000e0073\U000e0063\U000e0074\U000e007f', 'Brasil',                 '🇧🇷', '2026-06-24T19:00:00-03:00', 'Lincoln Financial, Filadelfia'),
(53, 'A', 'República Checa',    '🇨🇿', 'México',                 '🇲🇽', '2026-06-24T22:00:00-03:00', 'Estadio Azteca, CDMX'),
(54, 'A', 'Sudáfrica',          '🇿🇦', 'Corea del Sur',          '🇰🇷', '2026-06-24T22:00:00-03:00', 'Estadio BBVA, Monterrey'),
(55, 'E', 'Ecuador',            '🇪🇨', 'Alemania',               '🇩🇪', '2026-06-25T17:00:00-03:00', 'MetLife Stadium, Nueva York'),
(56, 'E', 'Curazao',            '🇨🇼', 'Costa de Marfil',        '🇨🇮', '2026-06-25T17:00:00-03:00', 'Lincoln Financial, Filadelfia'),
(57, 'F', 'Túnez',              '🇹🇳', 'Países Bajos',           '🇳🇱', '2026-06-25T20:00:00-03:00', 'Arrowhead Stadium, Kansas City'),
(58, 'F', 'Japón',              '🇯🇵', 'Suecia',                 '🇸🇪', '2026-06-25T20:00:00-03:00', 'AT&T Stadium, Dallas'),
(59, 'D', 'Turquía',            '🇹🇷', 'Estados Unidos',         '🇺🇸', '2026-06-25T23:00:00-03:00', 'SoFi Stadium, Los Ángeles'),
(60, 'D', 'Paraguay',           '🇵🇾', 'Australia',              '🇦🇺', '2026-06-25T23:00:00-03:00', 'Levi''s Stadium, San Francisco'),
(61, 'I', 'Noruega',            '🇳🇴', 'Francia',                '🇫🇷', '2026-06-26T16:00:00-03:00', 'Gillette Stadium, Boston'),
(62, 'I', 'Senegal',            '🇸🇳', 'Irak',                   '🇮🇶', '2026-06-26T16:00:00-03:00', 'BMO Field, Toronto'),
(63, 'H', 'Uruguay',            '🇺🇾', 'España',                 '🇪🇸', '2026-06-26T21:00:00-03:00', 'Estadio Akron, Guadalajara'),
(64, 'H', 'Cabo Verde',         '🇨🇻', 'Arabia Saudita',         '🇸🇦', '2026-06-26T21:00:00-03:00', 'NRG Stadium, Houston'),
(65, 'G', 'Nueva Zelanda',      '🇳🇿', 'Bélgica',                '🇧🇪', '2026-06-27T00:00:00-03:00', 'BC Place, Vancouver'),
(66, 'G', 'Egipto',             '🇪🇬', 'Irán',                   '🇮🇷', '2026-06-27T00:00:00-03:00', 'Lumen Field, Seattle'),
(67, 'L', 'Panamá',             '🇵🇦', 'Inglaterra',             '🏴\U000e0067\U000e0062\U000e0065\U000e006e\U000e0067\U000e007f', '2026-06-27T18:00:00-03:00', 'MetLife Stadium, Nueva York'),
(68, 'L', 'Croacia',            '🇭🇷', 'Ghana',                  '🇬🇭', '2026-06-27T18:00:00-03:00', 'Lincoln Financial, Filadelfia'),
(69, 'K', 'Colombia',           '🇨🇴', 'Portugal',               '🇵🇹', '2026-06-27T20:30:00-03:00', 'Hard Rock Stadium, Miami'),
(70, 'K', 'RD Congo',           '🇨🇩', 'Uzbekistán',             '🇺🇿', '2026-06-27T20:30:00-03:00', 'Mercedes-Benz, Atlanta'),
(71, 'J', 'Jordania',           '🇯🇴', 'Argentina',              '🇦🇷', '2026-06-27T23:00:00-03:00', 'AT&T Stadium, Dallas'),
(72, 'J', 'Argelia',            '🇩🇿', 'Austria',                '🇦🇹', '2026-06-27T23:00:00-03:00', 'Arrowhead Stadium, Kansas City');
