-- ══════════════════════════════════════════════════════════════════════════
-- RECENTRAGE DU CATALOGUE FunnyStation
-- À exécuter dans : Supabase Dashboard > SQL Editor
--
-- Objectif : retirer les jeux trop lourds pour l'émulation en navigateur (gros
-- ISOs PSP), qui « téléchargent mais ne démarrent pas » par manque de mémoire.
-- On garde ce qui tourne parfaitement : GBA, JS/HTML5, Python, Lua, WASM, etc.
--
-- Les trophées, achats et notes liés se suppriment automatiquement (ON DELETE
-- CASCADE). Les fichiers restent sur ton bucket R2 (à supprimer côté Cloudflare
-- si tu veux libérer l'espace).
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Retire TOUS les jeux PSP (ISOs de plusieurs centaines de Mo → non fiables
--    en navigateur, quel que soit l'appareil). C'est le principal « encombrant ».
DELETE FROM public.games WHERE runtime = 'psp';

-- 2) Retire TOUS les jeux PS1 : le cœur PlayStation exige un BIOS et les jeux
--    commerciaux ne démarrent pas de façon fiable en navigateur. Le runtime 'psx'
--    a été entièrement retiré du code → on nettoie le catalogue en conséquence.
DELETE FROM public.games WHERE runtime = 'psx';

-- 3) Retire la démo Java (game.jar placeholder = ne démarre pas). CheerpJ fonctionne
--    avec un VRAI .jar uploadé, mais le jeu de démo livré est un faux fichier.
DELETE FROM public.games WHERE slug = 'java-retro';

-- 4) (OPTIONNEL) Retire les jeux Android « APK natif » : un navigateur ne peut pas
--    exécuter un .apk. Décommente si tu en as ajouté :
-- DELETE FROM public.games WHERE runtime = 'android';

-- 5) (OPTIONNEL) Retire un jeu précis par son slug, ex :
-- DELETE FROM public.games WHERE slug = 'gta-vice-city-stories';

-- ── Vérification : ce qui reste dans le catalogue ──
SELECT title, slug, runtime, status,
       ROUND(LENGTH(assets_bucket_path)) AS _path_len
FROM public.games
ORDER BY runtime, title;
