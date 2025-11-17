-- schema.sql - PostgreSQL Database Schema

-- ============= PROJECTS =============
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    obra_numero VARCHAR(10) NOT NULL,
    dono VARCHAR(255),
    arquiteto VARCHAR(255),
    empresa_nome VARCHAR(255) NOT NULL,
    empresa_nif VARCHAR(20),
    empresa_morada TEXT,
    cliente_nome VARCHAR(255),
    cliente_nif VARCHAR(20),
    cliente_morada TEXT,
    venda_inicial DECIMAL(15,2),
    custo_inicial DECIMAL(15,2),
    custo_previsto_atual DECIMAL(15,2),  -- ✅ ACTUALIZADO por reorçamentos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============= REORÇAMENTOS (NOVO) =============
CREATE TABLE reorcamentos (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    venda_adicional DECIMAL(15,2) DEFAULT 0,
    custo_adicional DECIMAL(15,2) NOT NULL,  -- ✅ ISTO ACTUALIZA custo_previsto_atual
    motivo TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ TRIGGER: Actualizar custo_previsto_atual ao inserir reorçamento
CREATE OR REPLACE FUNCTION update_custo_previsto()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects 
    SET custo_previsto_atual = custo_previsto_atual + NEW.custo_adicional
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reorcamento_update_custo
AFTER INSERT ON reorcamentos
FOR EACH ROW
EXECUTE FUNCTION update_custo_previsto();

-- ============= SUPPLIERS =============
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    nif VARCHAR(20),
    contacto VARCHAR(255),
    categoria VARCHAR(100),
    valor_contrato DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============= ENCOMENDAS =============
CREATE TABLE encomendas (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    numero VARCHAR(50) NOT NULL,
    data DATE NOT NULL,
    fornecedor_id INT REFERENCES suppliers(id),
    local VARCHAR(255),
    forma_entrega VARCHAR(100),
    data_entrega DATE,
    contacto VARCHAR(255),
    telemovel VARCHAR(20),
    artigos JSONB,  -- Array de {descricao, quantidade, unidade, precoUnitario, desconto, precoComDesconto, total}
    desconto_perc DECIMAL(5,2),
    desconto_euro DECIMAL(15,2),
    total_sem_iva DECIMAL(15,2),
    valor_iva DECIMAL(15,2),
    total_com_iva DECIMAL(15,2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============= COST INVOICES =============
CREATE TABLE cost_invoices (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    numero VARCHAR(50) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    fornecedor_id INT REFERENCES suppliers(id),
    sem_iva DECIMAL(15,2),
    com_iva DECIMAL(15,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============= SALES INVOICES =============
CREATE TABLE sales_invoices (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    numero VARCHAR(50) NOT NULL,
    data DATE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    sem_iva DECIMAL(15,2),
    com_iva DECIMAL(15,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============= PRODUCTION VALUES =============
CREATE TABLE production_values (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mes VARCHAR(7) NOT NULL,  -- YYYY-MM
    producao_contratual DECIMAL(15,2),
    producao_adicional DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============= INDEXES (Performance) =============
CREATE INDEX idx_reorcamentos_project ON reorcamentos(project_id);
CREATE INDEX idx_suppliers_project ON suppliers(project_id);
CREATE INDEX idx_encomendas_project ON encomendas(project_id);
CREATE INDEX idx_encomendas_fornecedor ON encomendas(fornecedor_id);
CREATE INDEX idx_cost_invoices_project ON cost_invoices(project_id);
CREATE INDEX idx_sales_invoices_project ON sales_invoices(project_id);
CREATE INDEX idx_production_project ON production_values(project_id);

-- ============= VIEWS (Dashboards) =============

-- View: Resumo Projecto
CREATE VIEW vw_project_summary AS
SELECT 
    p.id,
    p.nome,
    p.obra_numero,
    p.venda_inicial,
    p.custo_inicial,
    p.custo_previsto_atual,
    (p.venda_inicial - p.custo_previsto_atual) AS margem,
    ((p.venda_inicial - p.custo_previsto_atual) / p.venda_inicial * 100) AS margem_perc,
    (SELECT COALESCE(SUM(valor_contrato), 0) FROM suppliers WHERE project_id = p.id) AS total_fornecedores,
    (SELECT COALESCE(COUNT(*), 0) FROM encomendas WHERE project_id = p.id) AS num_encomendas,
    (SELECT COALESCE(COUNT(*), 0) FROM reorcamentos WHERE project_id = p.id) AS num_reorcamentos
FROM projects p;

-- View: Reorçamentos Histórico
CREATE VIEW vw_reorcamentos_historico AS
SELECT 
    r.project_id,
    r.data,
    r.descricao,
    r.custo_adicional,
    (SELECT custo_inicial FROM projects WHERE id = r.project_id) + 
    (SELECT COALESCE(SUM(custo_adicional), 0) FROM reorcamentos r2 
     WHERE r2.project_id = r.project_id AND r2.data <= r.data) AS custo_previsto_em_data
FROM reorcamentos r
ORDER BY r.project_id, r.data;
