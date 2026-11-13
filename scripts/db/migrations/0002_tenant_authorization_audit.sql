-- Move legacy global roles to explicit tenant/project relationships.
-- Existing users without an explicit project/employer relationship receive no
-- tenant membership. Legacy rows that cannot be mapped cause this transaction
-- to fail rather than being assigned to a guessed tenant.

-- `obraflow_runtime` is provisioned by OpenTofu before this migration. The
-- migration owns schema objects, policies, and grants, not database roles.

CREATE SCHEMA app_private AUTHORIZATION CURRENT_USER;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO obraflow_runtime;

ALTER TABLE users ALTER COLUMN name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN wallet_address VARCHAR(42);
ALTER TABLE users ADD CONSTRAINT users_wallet_lowercase_check
  CHECK (wallet_address IS NULL OR wallet_address = lower(wallet_address));
CREATE UNIQUE INDEX users_wallet_address_unique
  ON users(wallet_address) WHERE wallet_address IS NOT NULL;
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DISABLED'));

CREATE TABLE tenants (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  owner_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_memberships (
  id VARCHAR(80) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('CLIENT', 'CONTRACTOR', 'ENGINEER', 'FOREMAN', 'DESIGNER')),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  authz_version INTEGER NOT NULL DEFAULT 1 CHECK (authz_version > 0),
  invited_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tenant_id)
);

CREATE TABLE role_permissions (
  role TEXT NOT NULL CHECK (role IN ('CLIENT', 'CONTRACTOR', 'ENGINEER', 'FOREMAN', 'DESIGNER')),
  resource TEXT NOT NULL CHECK (resource <> ''),
  action TEXT NOT NULL CHECK (action <> ''),
  PRIMARY KEY (role, resource, action)
);

ALTER TABLE projects ADD COLUMN tenant_id VARCHAR(80);

-- Only an explicit contractor relationship in a project/collaborator record
-- is used to identify a legacy tenant owner. A user.role value alone is not.
INSERT INTO tenants (id, name, slug, owner_user_id)
SELECT
  'tenant_legacy_' || owners.contractor_id,
  COALESCE(NULLIF(owner.name, ''), 'Legacy tenant ' || owners.contractor_id),
  'legacy-' || md5(owners.contractor_id),
  owners.contractor_id
FROM (
  SELECT contractor_id FROM projects
  UNION
  SELECT contractor_id FROM collaborators
) AS owners
JOIN users AS owner ON owner.id = owners.contractor_id;

INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status)
SELECT
  'mem_owner_' || tenant.owner_user_id,
  tenant.id,
  tenant.owner_user_id,
  'CONTRACTOR',
  'ACTIVE'
FROM tenants AS tenant;

UPDATE projects AS project
SET tenant_id = tenant.id
FROM tenants AS tenant
WHERE tenant.owner_user_id = project.contractor_id;

INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status)
SELECT
  'mem_' || substr(md5(project.tenant_id || ':' || project.client_id), 1, 32),
  project.tenant_id,
  project.client_id,
  'CLIENT',
  'ACTIVE'
FROM projects AS project
ON CONFLICT (user_id, tenant_id) DO NOTHING;

ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT projects_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE projects ADD CONSTRAINT projects_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE projects ADD CONSTRAINT projects_client_membership_fk
  FOREIGN KEY (client_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE projects ADD CONSTRAINT projects_contractor_membership_fk
  FOREIGN KEY (contractor_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT;

ALTER TABLE epics ADD COLUMN tenant_id VARCHAR(80);
UPDATE epics AS epic
SET tenant_id = project.tenant_id
FROM projects AS project
WHERE project.id = epic.project_id;

ALTER TABLE collaborators ADD COLUMN tenant_id VARCHAR(80);
UPDATE collaborators AS collaborator
SET tenant_id = tenant.id
FROM tenants AS tenant
WHERE tenant.owner_user_id = collaborator.contractor_id;

ALTER TABLE tasks ADD COLUMN tenant_id VARCHAR(80);
ALTER TABLE tasks ADD COLUMN project_id VARCHAR(50);
UPDATE tasks AS task
SET tenant_id = epic.tenant_id,
    project_id = epic.project_id
FROM epics AS epic
WHERE epic.id = task.epic_id;

ALTER TABLE materials ADD COLUMN tenant_id VARCHAR(80);
ALTER TABLE materials ADD COLUMN project_id VARCHAR(50);
UPDATE materials AS material
SET tenant_id = task.tenant_id,
    project_id = task.project_id
FROM tasks AS task
WHERE task.id = material.task_id;

ALTER TABLE evidences ADD COLUMN tenant_id VARCHAR(80);
ALTER TABLE evidences ADD COLUMN project_id VARCHAR(50);
UPDATE evidences AS evidence
SET tenant_id = task.tenant_id,
    project_id = task.project_id
FROM tasks AS task
WHERE task.id = evidence.task_id;

ALTER TABLE financial_transactions ADD COLUMN tenant_id VARCHAR(80);
UPDATE financial_transactions AS txn
SET tenant_id = project.tenant_id
FROM projects AS project
WHERE project.id = txn.project_id;

ALTER TABLE payrolls ADD COLUMN tenant_id VARCHAR(80);
UPDATE payrolls AS payroll
SET tenant_id = project.tenant_id
FROM projects AS project
WHERE project.id = payroll.project_id;

ALTER TABLE ai_room_simulations ADD COLUMN tenant_id VARCHAR(80);
UPDATE ai_room_simulations AS simulation
SET tenant_id = project.tenant_id
FROM projects AS project
WHERE project.id = simulation.project_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE tenant_id IS NULL)
    OR EXISTS (SELECT 1 FROM epics WHERE tenant_id IS NULL)
    OR EXISTS (SELECT 1 FROM collaborators WHERE tenant_id IS NULL)
    OR EXISTS (SELECT 1 FROM tasks WHERE tenant_id IS NULL OR project_id IS NULL)
    OR EXISTS (SELECT 1 FROM materials WHERE tenant_id IS NULL OR project_id IS NULL)
    OR EXISTS (SELECT 1 FROM evidences WHERE tenant_id IS NULL OR project_id IS NULL)
    OR EXISTS (SELECT 1 FROM financial_transactions WHERE tenant_id IS NULL)
    OR EXISTS (SELECT 1 FROM payrolls WHERE tenant_id IS NULL)
    OR EXISTS (SELECT 1 FROM ai_room_simulations WHERE tenant_id IS NULL)
  THEN
    RAISE EXCEPTION 'Tenant backfill is incomplete; reconcile legacy relationships before retrying this migration.';
  END IF;
END $$;

ALTER TABLE epics ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE collaborators ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE materials ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE materials ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE evidences ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE evidences ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE financial_transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payrolls ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ai_room_simulations ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE epics ADD CONSTRAINT epics_id_project_tenant_unique UNIQUE (id, project_id, tenant_id);
ALTER TABLE epics ADD CONSTRAINT epics_project_tenant_fk
  FOREIGN KEY (project_id, tenant_id) REFERENCES projects(id, tenant_id) ON DELETE CASCADE;
ALTER TABLE collaborators ADD CONSTRAINT collaborators_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE collaborators ADD CONSTRAINT collaborators_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE collaborators ADD CONSTRAINT collaborators_contractor_membership_fk
  FOREIGN KEY (contractor_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT tasks_id_project_tenant_unique UNIQUE (id, project_id, tenant_id);
ALTER TABLE tasks ADD CONSTRAINT tasks_epic_project_tenant_fk
  FOREIGN KEY (epic_id, project_id, tenant_id) REFERENCES epics(id, project_id, tenant_id) ON DELETE CASCADE;
ALTER TABLE materials ADD CONSTRAINT materials_id_project_tenant_unique UNIQUE (id, project_id, tenant_id);
ALTER TABLE materials ADD CONSTRAINT materials_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE materials ADD CONSTRAINT materials_task_project_tenant_fk
  FOREIGN KEY (task_id, project_id, tenant_id) REFERENCES tasks(id, project_id, tenant_id) ON DELETE CASCADE;
ALTER TABLE materials ADD CONSTRAINT materials_creator_membership_fk
  FOREIGN KEY (created_by_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE evidences ADD CONSTRAINT evidences_task_project_tenant_fk
  FOREIGN KEY (task_id, project_id, tenant_id) REFERENCES tasks(id, project_id, tenant_id) ON DELETE CASCADE;
ALTER TABLE evidences ADD CONSTRAINT evidences_uploader_membership_fk
  FOREIGN KEY (uploaded_by, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE financial_transactions ADD CONSTRAINT transactions_project_tenant_fk
  FOREIGN KEY (project_id, tenant_id) REFERENCES projects(id, tenant_id) ON DELETE CASCADE;
ALTER TABLE financial_transactions ADD CONSTRAINT transactions_contractor_membership_fk
  FOREIGN KEY (contractor_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE payrolls ADD CONSTRAINT payrolls_project_tenant_fk
  FOREIGN KEY (project_id, tenant_id) REFERENCES projects(id, tenant_id) ON DELETE CASCADE;
ALTER TABLE payrolls ADD CONSTRAINT payrolls_collaborator_tenant_fk
  FOREIGN KEY (collaborator_id, tenant_id) REFERENCES collaborators(id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE ai_room_simulations ADD CONSTRAINT simulations_project_tenant_fk
  FOREIGN KEY (project_id, tenant_id) REFERENCES projects(id, tenant_id) ON DELETE CASCADE;
ALTER TABLE ai_room_simulations ADD CONSTRAINT simulations_material_tenant_fk
  FOREIGN KEY (material_id, tenant_id) REFERENCES materials(id, tenant_id) ON DELETE RESTRICT;
ALTER TABLE ai_room_simulations ADD CONSTRAINT simulations_requester_membership_fk
  FOREIGN KEY (requested_by_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT;

CREATE TABLE project_memberships (
  id VARCHAR(80) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id, tenant_id),
  FOREIGN KEY (project_id, tenant_id) REFERENCES projects(id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT
);

INSERT INTO project_memberships (id, tenant_id, project_id, user_id, status)
SELECT
  'pm_' || substr(md5(project.id || ':' || member.user_id), 1, 32),
  project.tenant_id,
  project.id,
  member.user_id,
  'ACTIVE'
FROM projects AS project
CROSS JOIN LATERAL (VALUES (project.client_id), (project.contractor_id)) AS member(user_id)
ON CONFLICT (project_id, user_id, tenant_id) DO NOTHING;

CREATE INDEX tenant_memberships_user_status_idx ON tenant_memberships(user_id, status, tenant_id);
CREATE INDEX project_memberships_user_status_idx ON project_memberships(user_id, status, tenant_id, project_id);
CREATE INDEX projects_tenant_created_idx ON projects(tenant_id, created_at DESC);

CREATE TABLE audit_events (
  id VARCHAR(80) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id VARCHAR(50),
  actor_user_id VARCHAR(50) NOT NULL,
  actor_wallet_address VARCHAR(42),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('CLIENT', 'CONTRACTOR', 'ENGINEER', 'FOREMAN', 'DESIGNER')),
  event_type VARCHAR(120) NOT NULL CHECK (event_type <> ''),
  resource_type VARCHAR(120) NOT NULL CHECK (resource_type <> ''),
  resource_id VARCHAR(120) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id VARCHAR(120),
  idempotency_key VARCHAR(180),
  source VARCHAR(80) NOT NULL DEFAULT 'USER_ACTION',
  external_event_id VARCHAR(180),
  document_hash VARCHAR(128),
  metadata_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (actor_wallet_address IS NULL OR actor_wallet_address = lower(actor_wallet_address)),
  FOREIGN KEY (project_id, tenant_id) REFERENCES projects(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_user_id, tenant_id) REFERENCES tenant_memberships(user_id, tenant_id) ON DELETE RESTRICT,
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (source, external_event_id)
);

CREATE INDEX audit_events_tenant_recorded_idx ON audit_events(tenant_id, recorded_at DESC);
CREATE INDEX audit_events_project_recorded_idx ON audit_events(project_id, recorded_at DESC);

CREATE FUNCTION app_private.request_user_id()
RETURNS VARCHAR(50)
LANGUAGE SQL STABLE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::VARCHAR(50)
$$;

CREATE FUNCTION app_private.request_tenant_id()
RETURNS VARCHAR(80)
LANGUAGE SQL STABLE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::VARCHAR(80)
$$;

CREATE FUNCTION app_private.reject_audit_event_mutation()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only; record a compensating event instead.'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION app_private.reject_audit_event_mutation();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE epics FORCE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials FORCE ROW LEVEL SECURITY;
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidences FORCE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_room_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_room_simulations FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON users FOR SELECT TO obraflow_runtime
  USING (id = app_private.request_user_id());
CREATE POLICY tenants_active_member_select ON tenants FOR SELECT TO obraflow_runtime
  USING (
    id = app_private.request_tenant_id()
    AND status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      WHERE membership.tenant_id = tenants.id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
    )
  );
CREATE POLICY tenant_memberships_self_select ON tenant_memberships FOR SELECT TO obraflow_runtime
  USING (
    user_id = app_private.request_user_id()
    AND tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM users account
      WHERE account.id = tenant_memberships.user_id
        AND account.account_status = 'ACTIVE'
    )
  );
CREATE POLICY project_memberships_self_select ON project_memberships FOR SELECT TO obraflow_runtime
  USING (
    user_id = app_private.request_user_id()
    AND tenant_id = app_private.request_tenant_id()
  );

CREATE POLICY projects_active_project_member_select ON projects FOR SELECT TO obraflow_runtime
  USING (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = projects.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      WHERE membership.tenant_id = projects.tenant_id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM project_memberships project_membership
      WHERE project_membership.tenant_id = projects.tenant_id
        AND project_membership.project_id = projects.id
        AND project_membership.user_id = app_private.request_user_id()
        AND project_membership.status = 'ACTIVE'
    )
  );

CREATE POLICY collaborators_active_tenant_member_select ON collaborators FOR SELECT TO obraflow_runtime
  USING (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = collaborators.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      WHERE membership.tenant_id = collaborators.tenant_id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
    )
  );

CREATE POLICY epics_active_project_member_select ON epics FOR SELECT TO obraflow_runtime
  USING (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = epics.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      JOIN project_memberships project_membership
        ON project_membership.tenant_id = membership.tenant_id
       AND project_membership.user_id = membership.user_id
      WHERE membership.tenant_id = epics.tenant_id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
        AND project_membership.project_id = epics.project_id
        AND project_membership.status = 'ACTIVE'
    )
  );

CREATE POLICY tasks_active_project_member_select ON tasks FOR SELECT TO obraflow_runtime
  USING (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = tasks.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      JOIN project_memberships project_membership
        ON project_membership.tenant_id = membership.tenant_id
       AND project_membership.user_id = membership.user_id
      WHERE membership.tenant_id = tasks.tenant_id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
        AND project_membership.project_id = tasks.project_id
        AND project_membership.status = 'ACTIVE'
    )
  );

CREATE POLICY materials_active_project_member_select ON materials FOR SELECT TO obraflow_runtime
  USING (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = materials.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      JOIN project_memberships project_membership
        ON project_membership.tenant_id = membership.tenant_id
       AND project_membership.user_id = membership.user_id
      WHERE membership.tenant_id = materials.tenant_id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
        AND project_membership.project_id = materials.project_id
        AND project_membership.status = 'ACTIVE'
    )
  );

CREATE POLICY evidences_active_project_member_select ON evidences FOR SELECT TO obraflow_runtime
  USING (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = evidences.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      JOIN project_memberships project_membership
        ON project_membership.tenant_id = membership.tenant_id
       AND project_membership.user_id = membership.user_id
      WHERE membership.tenant_id = evidences.tenant_id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
        AND project_membership.project_id = evidences.project_id
        AND project_membership.status = 'ACTIVE'
    )
  );

CREATE POLICY audit_events_project_select ON audit_events FOR SELECT TO obraflow_runtime
  USING (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = audit_events.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      WHERE membership.tenant_id = audit_events.tenant_id
        AND membership.user_id = app_private.request_user_id()
        AND membership.status = 'ACTIVE'
    )
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_memberships project_membership
        WHERE project_membership.tenant_id = audit_events.tenant_id
          AND project_membership.project_id = audit_events.project_id
          AND project_membership.user_id = app_private.request_user_id()
          AND project_membership.status = 'ACTIVE'
      )
    )
  );
CREATE POLICY audit_events_actor_insert ON audit_events FOR INSERT TO obraflow_runtime
  WITH CHECK (
    tenant_id = app_private.request_tenant_id()
    AND EXISTS (
      SELECT 1 FROM tenants tenant
      WHERE tenant.id = audit_events.tenant_id AND tenant.status = 'ACTIVE'
    )
    AND actor_user_id = app_private.request_user_id()
    AND EXISTS (
      SELECT 1 FROM tenant_memberships membership
      WHERE membership.tenant_id = audit_events.tenant_id
        AND membership.user_id = audit_events.actor_user_id
        AND membership.role = audit_events.actor_role
        AND membership.status = 'ACTIVE'
    )
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_memberships project_membership
        WHERE project_membership.tenant_id = audit_events.tenant_id
          AND project_membership.project_id = audit_events.project_id
          AND project_membership.user_id = audit_events.actor_user_id
          AND project_membership.status = 'ACTIVE'
      )
    )
  );

GRANT USAGE ON SCHEMA public, app_private TO obraflow_runtime;
GRANT EXECUTE ON FUNCTION app_private.request_user_id() TO obraflow_runtime;
GRANT EXECUTE ON FUNCTION app_private.request_tenant_id() TO obraflow_runtime;
GRANT SELECT ON users, tenants, tenant_memberships, project_memberships,
  role_permissions, projects, epics, tasks, materials, evidences TO obraflow_runtime;
GRANT SELECT (id, tenant_id, contractor_id, name, role_function, remuneration_rate, active)
  ON collaborators TO obraflow_runtime;
GRANT SELECT, INSERT ON audit_events TO obraflow_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM PUBLIC;

COMMENT ON COLUMN users.role IS
  'Legacy compatibility only. Never use for authorization; use active tenant_memberships.role.';
COMMENT ON TABLE schema_migrations IS
  'Migration ledger managed by scripts/db/migrate.js; do not edit manually.';
