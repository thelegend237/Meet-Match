-- ============================================================================
-- MEET & MATCH — Migration 048 : Provider ViaziPay (MTN / Orange)
-- ============================================================================

ALTER TYPE public.payment_provider ADD VALUE IF NOT EXISTS 'viazipay';
