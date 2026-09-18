-- Create songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  is_played BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create dedications table
CREATE TABLE IF NOT EXISTS public.dedications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  client_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_client_token UNIQUE (client_token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dedications_song_id ON public.dedications(song_id);
CREATE INDEX IF NOT EXISTS idx_dedications_client_token ON public.dedications(client_token);

-- Enable Row Level Security (RLS)
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dedications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can insert songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can update songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can delete songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can view all dedications" ON public.dedications;
DROP POLICY IF EXISTS "Public can insert dedication on unplayed songs" ON public.dedications;
DROP POLICY IF EXISTS "Admins can delete dedications" ON public.dedications;

-- Songs RLS Policies
CREATE POLICY "Anyone can view songs"
  ON public.songs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert songs"
  ON public.songs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update songs"
  ON public.songs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete songs"
  ON public.songs
  FOR DELETE
  TO authenticated
  USING (true);

-- Dedications RLS Policies
CREATE POLICY "Admins can view all dedications"
  ON public.dedications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can insert dedication on unplayed songs"
  ON public.dedications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.songs s
      WHERE s.id = dedications.song_id
        AND s.is_played = FALSE
    )
  );

CREATE POLICY "Admins can delete dedications"
  ON public.dedications
  FOR DELETE
  TO authenticated
  USING (true);

-- Masked Dedications RPC for guest feed
CREATE OR REPLACE FUNCTION public.get_public_dedications(p_client_token TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  song_id UUID,
  recipient_name TEXT,
  is_mine BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.song_id,
    CASE 
      WHEN auth.role() = 'authenticated' THEN d.recipient_name
      WHEN p_client_token IS NOT NULL AND d.client_token = p_client_token THEN d.recipient_name
      ELSE 'Alguien especial'
    END AS recipient_name,
    (p_client_token IS NOT NULL AND d.client_token = p_client_token) AS is_mine,
    d.created_at
  FROM public.dedications d
  ORDER BY d.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_dedications(TEXT) TO anon, authenticated;

-- Add tables to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'songs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'dedications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dedications;
  END IF;
END $$;
