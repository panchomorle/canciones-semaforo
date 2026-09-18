INSERT INTO public.songs (title, artist, is_played)
VALUES 
  ('De Música Ligera', 'Soda Stereo', false),
  ('Mil Horas', 'Los Abuelos de la Nada', false),
  ('Seguir Viviendo Sin Tu Amor', 'Luis Alberto Spinetta', false),
  ('Ji ji ji', 'Patricio Rey y sus Redonditos de Ricota', false),
  ('Crimen', 'Gustavo Cerati', false),
  ('Flaca', 'Andrés Calamaro', false)
ON CONFLICT DO NOTHING;
