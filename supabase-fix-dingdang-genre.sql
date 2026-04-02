-- Fix 丁噹 genre: 'western' -> 'cpop' (她是華語流行歌手)
UPDATE concerts
SET genre = 'cpop'
WHERE artist LIKE '%丁噹%'
  AND genre = 'western';
