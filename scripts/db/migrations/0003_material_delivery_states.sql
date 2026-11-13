-- Material fixtures already use these documented procurement states. Extend
-- the enum forward-only; never rewrite historical migration 0001.
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'PENDING_PURCHASE';
