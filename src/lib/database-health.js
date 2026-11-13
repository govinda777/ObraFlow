/**
 * A catalog-only readiness probe. It intentionally reads no tenant or business
 * rows and requires the exact least-privilege runtime role used by the app.
 */
export const AUTHORIZATION_HEALTH_QUERY = `
  WITH required_policies(table_name, policy_name, command) AS (
    VALUES
      ('tenant_memberships', 'tenant_memberships_self_select', 'r'),
      ('project_memberships', 'project_memberships_self_select', 'r'),
      ('projects', 'projects_active_project_member_select', 'r'),
      ('tasks', 'tasks_active_project_member_select', 'r'),
      ('evidences', 'evidences_active_project_member_select', 'r'),
      ('audit_events', 'audit_events_project_select', 'r'),
      ('audit_events', 'audit_events_actor_insert', 'a')
  )
  SELECT
    COALESCE((
      SELECT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
      FROM pg_catalog.pg_roles
      WHERE rolname = current_user
        AND rolname = 'obraflow_runtime'
    ), false) AS runtime_role_safe,
    (
      SELECT COUNT(*) = 7
      FROM required_policies AS required
      JOIN pg_catalog.pg_namespace AS ns
        ON ns.nspname = 'public'
      JOIN pg_catalog.pg_class AS relation
        ON relation.relnamespace = ns.oid
       AND relation.relname = required.table_name
      JOIN pg_catalog.pg_policy AS policy
        ON policy.polrelid = relation.oid
       AND policy.polname = required.policy_name
       AND policy.polcmd = required.command
       AND policy.polpermissive
       AND policy.polroles @> ARRAY[
         (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'obraflow_runtime')
       ]::oid[]
      WHERE relation.relrowsecurity
        AND relation.relforcerowsecurity
        AND CASE
          WHEN required.command = 'a' THEN policy.polwithcheck IS NOT NULL
          ELSE policy.polqual IS NOT NULL
        END
    ) AS required_policies_ready,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger AS audit_trigger
      JOIN pg_catalog.pg_class AS relation
        ON relation.oid = audit_trigger.tgrelid
      JOIN pg_catalog.pg_namespace AS ns
        ON ns.oid = relation.relnamespace
      WHERE ns.nspname = 'public'
        AND relation.relname = 'audit_events'
        AND audit_trigger.tgname = 'audit_events_append_only'
        AND audit_trigger.tgenabled <> 'D'
        AND NOT audit_trigger.tgisinternal
    ) AS audit_append_only,
    NOT pg_catalog.has_table_privilege(current_user, 'public.audit_events', 'UPDATE')
      AND NOT pg_catalog.has_table_privilege(current_user, 'public.audit_events', 'DELETE')
      AND NOT pg_catalog.has_table_privilege(current_user, 'public.audit_events', 'TRUNCATE')
      AND NOT pg_catalog.has_database_privilege(current_user, current_database(), 'CREATE')
      AND NOT pg_catalog.has_schema_privilege(current_user, 'public', 'CREATE')
      AND NOT pg_catalog.has_column_privilege(
        current_user, 'public.collaborators', 'payment_info', 'SELECT'
      ) AS sensitive_access_restricted
`;

/**
 * @param {unknown} value
 * @returns {value is {
 *   runtime_role_safe: true,
 *   required_policies_ready: true,
 *   audit_append_only: true,
 *   sensitive_access_restricted: true
 * }}
 */
function isAuthorizationHealthReady(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = /** @type {Record<string, unknown>} */ (value);
  return row.runtime_role_safe === true
    && row.required_policies_ready === true
    && row.audit_append_only === true
    && row.sensitive_access_restricted === true;
}

/**
 * Runs with the caller's database role; production must pass the Neon runtime
 * role. Throws a deliberately generic error so callers can fail closed without
 * returning catalog details to a health-check client.
 *
 * @param {(statement: string) => Promise<unknown[]>} query
 * @returns {Promise<void>}
 */
export async function assertAuthorizationDatabaseReady(query) {
  const rows = await query(AUTHORIZATION_HEALTH_QUERY);
  if (!Array.isArray(rows) || !isAuthorizationHealthReady(rows[0])) {
    throw new Error("Authorization database readiness check failed");
  }
}
