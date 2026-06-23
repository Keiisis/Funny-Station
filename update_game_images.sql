-- ══════════════════════════════════════════════════════════════════════════
-- SQL SCRIPT : Mettre à jour les images des jeux de la FunnyStation
-- À exécuter dans : Supabase Dashboard > SQL Editor (bypasse la RLS)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Jeux originaux / web
UPDATE public.games SET background_url = '/images/neon-runner.png' WHERE slug = 'neon-runner';
UPDATE public.games SET background_url = '/images/orb-arena.png' WHERE slug = 'orb-arena';
UPDATE public.games SET background_url = '/images/serpens.png' WHERE slug = 'serpens';
UPDATE public.games SET background_url = '/images/top-down-horror.jpg' WHERE slug = 'top-down-horror';

-- 2. Jeux Game Boy Advance (GBA)
UPDATE public.games SET background_url = '/images/dragon-ball-advanced-adventure.jpg' WHERE slug = 'dragon-ball-advanced-adventure';
UPDATE public.games SET background_url = '/images/dbz-buus-fury-gt-transformation.jpg' WHERE slug = 'dbz-buus-fury-gt-transformation';
UPDATE public.games SET background_url = '/images/jackie-chan.jpg' WHERE slug = 'jackie-chan';
UPDATE public.games SET background_url = '/images/007-everything-or-nothing.jpg' WHERE slug = '007-everything-or-nothing';
UPDATE public.games SET background_url = '/images/naruto-ninja-council-2.webp' WHERE slug = 'naruto-ninja-council-2';
UPDATE public.games SET background_url = '/images/nfs-most-wanted.jpg' WHERE slug = 'nfs-most-wanted';
UPDATE public.games SET background_url = '/images/one-piece.jpg' WHERE slug = 'one-piece';
UPDATE public.games SET background_url = '/images/street-fighter-alpha-3.jpg' WHERE slug = 'street-fighter-alpha-3';
UPDATE public.games SET background_url = '/images/super-mario-advance-4.jpg' WHERE slug = 'super-mario-advance-4';
UPDATE public.games SET background_url = '/images/gta-advance.png' WHERE slug = 'gta-advance';
