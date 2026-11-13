-- ============================================================================
-- ObraFlow legacy baseline (PostgreSQL / Neon DB).
-- This preserves the original prototype schema for a deterministic upgrade.
-- Authorization in this legacy model is not secure: users.role is global.
-- Migration 0002 moves access to tenant/project memberships and enables RLS.
-- ============================================================================

-- 1. TIPOS ENUM DECLARATIVOS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'CLIENT', 'CONTRACTOR', 'ENGINEER', 'FOREMAN', 'DESIGNER', 'ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM (
        'QUOTE_REQUESTED', 'AI_ANALYZING', 'BUDGET_READY', 'APPROVED',
        'CONTRACT_SIGNED', 'IN_PROGRESS', 'COMPLETED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE epic_status AS ENUM (
        'LOCKED', 'IN_PROGRESS', 'COMPLETED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_category AS ENUM (
        'EXECUTION', 'MATERIAL_PURCHASE', 'MATERIAL_RECEIVING', 'INSPECTION', 'ADMINISTRATIVE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE kanban_status AS ENUM (
        'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE material_group AS ENUM (
        'STRUCTURAL', 'FINISHINGS', 'LIGHTING', 'PLUMBING', 'DRYWALL'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE receiver_party AS ENUM (
        'CLIENT', 'CONTRACTOR'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM (
        'PENDING', 'DELIVERED_INSPECTED', 'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'PAYABLE', 'RECEIVABLE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_category AS ENUM (
        'MATERIAL', 'FREIGHT', 'PAYROLL', 'RECEIVING_FEE', 'CLIENT_INSTALLMENT', 'AI_PROTOTYPING', 'AI_CONSULTING'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'PENDING', 'PAID', 'OVERDUE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE simulation_status AS ENUM (
        'READY', 'APPROVED_BY_CLIENT', 'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABELAS DO MER.MD

-- Entidade 1: USERS (Multi-tenant e atores do sistema)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    thirdweb_id VARCHAR(100) UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'CLIENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entidade 2: PROJECTS (Canteiros e Obras)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(300) NOT NULL,
    client_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    contractor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status project_status NOT NULL DEFAULT 'QUOTE_REQUESTED',
    scope_pdf_url TEXT,
    contract_pdf_url TEXT,
    contract_signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    area_m2 NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    budget_estimated NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    scope_description TEXT,
    doc_pdf_name VARCHAR(255),
    doc_spreadsheet_name VARCHAR(255),
    doc_txt_name VARCHAR(255),
    ai_analysis_summary TEXT,
    ai_confidence_score NUMERIC(5, 4),
    contract_accepted_by_client BOOLEAN NOT NULL DEFAULT FALSE,
    eap_approved_by_contractor BOOLEAN NOT NULL DEFAULT FALSE
);

-- Entidade 3: EPICS (Macroetapas / Master Pipeline)
CREATE TABLE IF NOT EXISTS epics (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    order_index INT NOT NULL DEFAULT 1,
    status epic_status NOT NULL DEFAULT 'LOCKED',
    requires_materials_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    contractor_approved BOOLEAN NOT NULL DEFAULT FALSE
);

-- Entidade 4: COLLABORATORS (Equipe do Empreiteiro)
CREATE TABLE IF NOT EXISTS collaborators (
    id VARCHAR(50) PRIMARY KEY,
    contractor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    role_function VARCHAR(100) NOT NULL,
    remuneration_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_info VARCHAR(200) NOT NULL, -- Chave PIX ou dados bancários
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Entidade 5: TASKS (Microtarefas do Kanban Polimórfico)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    epic_id VARCHAR(50) NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
    assigned_collaborator_id VARCHAR(50) REFERENCES collaborators(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category task_category NOT NULL DEFAULT 'EXECUTION',
    kanban_status kanban_status NOT NULL DEFAULT 'TODO',
    cost_labor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_date TIMESTAMPTZ NOT NULL,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    contractor_approved BOOLEAN NOT NULL DEFAULT FALSE
);

-- Entidade 6: MATERIALS (Insumos da EAP, Fretes e Recebimento)
CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_by_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    material_group material_group NOT NULL DEFAULT 'FINISHINGS',
    unit VARCHAR(20) NOT NULL DEFAULT 'un',
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    freight_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    receiving_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    receiver_responsible receiver_party NOT NULL DEFAULT 'CONTRACTOR',
    received_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    purchased BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_status delivery_status NOT NULL DEFAULT 'PENDING',
    purchase_deadline TIMESTAMPTZ,
    estimated_delivery TIMESTAMPTZ
);

-- Entidade 7: EVIDENCES (Cláusula Pétrea: Evidências Fotográficas)
CREATE TABLE IF NOT EXISTS evidences (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'EXECUTION_PHOTO',
    photo_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entidade 8: FINANCIAL_TRANSACTIONS (Extrato de Caixa da Obra)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contractor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    category transaction_category NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ
);

-- Entidade 9: PAYROLLS (Folha de Pagamento PIX de Colaboradores)
CREATE TABLE IF NOT EXISTS payrolls (
    id VARCHAR(50) PRIMARY KEY,
    collaborator_id VARCHAR(50) NOT NULL REFERENCES collaborators(id) ON DELETE RESTRICT,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    reference_period VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ
);

-- Entidade 10: AI_ROOM_SIMULATIONS (Estúdio Antes x Depois da Designer)
CREATE TABLE IF NOT EXISTS ai_room_simulations (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_id VARCHAR(50) REFERENCES materials(id) ON DELETE SET NULL,
    requested_by_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    room_name VARCHAR(150) NOT NULL,
    target_element VARCHAR(100) NOT NULL,
    original_photo_url TEXT NOT NULL,
    generated_photo_url TEXT NOT NULL,
    consulting_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status simulation_status NOT NULL DEFAULT 'READY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ÍNDICES DE PERFORMANCE E CONSULTA
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_epics_project_order ON epics(project_id, order_index);

CREATE INDEX IF NOT EXISTS idx_tasks_epic_id ON tasks(epic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_kanban_status ON tasks(kanban_status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

CREATE INDEX IF NOT EXISTS idx_materials_task_id ON materials(task_id);
CREATE INDEX IF NOT EXISTS idx_materials_delivery_status ON materials(delivery_status);

CREATE INDEX IF NOT EXISTS idx_evidences_task_id ON evidences(task_id);

CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON financial_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON financial_transactions(type, status);

CREATE INDEX IF NOT EXISTS idx_payrolls_project_id ON payrolls(project_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_collaborator_id ON payrolls(collaborator_id);

CREATE INDEX IF NOT EXISTS idx_simulations_project_id ON ai_room_simulations(project_id);
