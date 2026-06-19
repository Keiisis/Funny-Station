-- ============================================================================
-- FunnyStation — Nettoyage des comptes fantômes
-- ============================================================================
-- Ce script supprime les utilisateurs dans auth.users qui ont été créés
-- avec un email @funnystation.local mais qui n'ont PAS de profil associé
-- dans la table profiles (= tentatives d'inscription échouées).
--
-- ⚠️  À exécuter dans le SQL Editor de Supabase (Dashboard > SQL Editor).
-- ============================================================================

-- 1. Voir quels comptes fantômes existent (mode preview, pas de suppression)
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.username AS profile_username
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@funnystation.local'
ORDER BY u.created_at DESC;

-- 2. Supprimer les comptes fantômes (décommenter pour exécuter)
-- ⚠️  ATTENTION : cette action est irréversible !
-- DELETE FROM auth.users
-- WHERE email LIKE '%@funnystation.local'
--   AND id NOT IN (SELECT id FROM public.profiles);
