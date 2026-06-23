-- ══════════════════════════════════════════════════════════════════════════
-- SUPPRIMER TOUS LES UTILISATEURS — repart de zero (migration PIN 6 chiffres)
-- À exécuter dans : Supabase Dashboard > SQL Editor
--
-- DESTRUCTIF : supprime tous les comptes auth. Les donnees liees (profils,
-- sauvegardes, trophees, achats, notes) partent automatiquement via ON DELETE
-- CASCADE depuis public.profiles. Apres ca, recree des comptes avec un PIN 6 chiffres.
-- ══════════════════════════════════════════════════════════════════════════

DELETE FROM auth.users;

-- Verification : doit renvoyer 0.
SELECT COUNT(*) AS comptes_restants FROM auth.users;
