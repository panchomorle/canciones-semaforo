-- Migration: Add sender_name to dedications and update get_public_dedications RPC
-- Issue #6: Configurable dedication anonymity, sender privacy, and admin song dedications dropdown

-- 1. Add sender_name column to dedications
ALTER TABLE public.dedications ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- 2. Update get_public_dedications to return actual recipient_name for all callers and NEVER return sender_name
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
    d.recipient_name,
    (p_client_token IS NOT NULL AND d.client_token = p_client_token) AS is_mine,
    d.created_at
  FROM public.dedications d
  ORDER BY d.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_dedications(TEXT) TO anon, authenticated;
