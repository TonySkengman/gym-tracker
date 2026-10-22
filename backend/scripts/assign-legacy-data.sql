-- Opt-in migration for a local single-user database created before authentication.
-- Run only after verifying that all unowned data belongs to this account.
\set ON_ERROR_STOP on
BEGIN;
SELECT id AS owner_id FROM user_accounts WHERE email = lower(trim(:'email')) \gset
UPDATE workout_plans SET owner_id = :'owner_id'::bigint WHERE owner_id IS NULL;
UPDATE workout_sessions SET owner_id = :'owner_id'::bigint WHERE owner_id IS NULL;
UPDATE scheduled_workouts SET owner_id = :'owner_id'::bigint WHERE owner_id IS NULL;
COMMIT;
