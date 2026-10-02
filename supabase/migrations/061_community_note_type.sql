-- Type de notification pour le message quotidien de l'équipe.
-- Doit être commité avant toute fonction qui l'utilise.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'community_note';
