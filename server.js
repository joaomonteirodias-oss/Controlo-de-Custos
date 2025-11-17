// server.js - Backend Node.js + Express + PostgreSQL

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ============= PROJECTS =============
app.post('/api/projects', async (req, res) => {
    try {
        const { nome, obraNumero, dono, arquiteto, empresaNome, empresaNIF, empresaMorada, clienteNome, clienteNIF, clienteMorada, vendaInicial, custoInicial } = req.body;
        
        const result = await pool.query(
            `INSERT INTO projects (nome, obra_numero, dono, arquiteto, empresa_nome, empresa_nif, empresa_morada, cliente_nome, cliente_nif, cliente_morada, venda_inicial, custo_inicial, custo_previsto_atual)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
             RETURNING *`,
            [nome, obraNumero, dono, arquiteto, empresaNome, empresaNIF, empresaMorada, clienteNome, clienteNIF, clienteMorada, vendaInicial, custoInicial]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { vendaInicial, custoInicial } = req.body;
        const result = await pool.query(
            `UPDATE projects SET venda_inicial = $1, custo_inicial = $2, custo_previsto_atual = $2 WHERE id = $3 RETURNING *`,
            [vendaInicial, custoInicial, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============= REORÇAMENTOS (NOVO) =============
app.post('/api/reorcamentos', async (req, res) => {
    try {
        const { projectId, data, descricao, vendaAdicional, custoAdicional, motivo } = req.body;
        
        // 1️⃣ Inserir reorçamento
        await pool.query(
            `INSERT INTO reorcamentos (project_id, data, descricao, venda_adicional, custo_adicional, motivo)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [projectId, data, descricao, vendaAdicional, custoAdicional, motivo]
        );
        
        // 2️⃣ Actualizar custo_previsto_atual no projecto
        const projectResult = await pool.query(
            `SELECT custo_previsto_atual FROM projects WHERE id = $1`,
            [projectId]
        );
        
        const novoCustomPrevisto = projectResult.rows[0].custo_previsto_atual + custoAdicional;
        
        const updateResult = await pool.query(
            `UPDATE projects SET custo_previsto_atual = $1 WHERE id = $2 RETURNING *`,
            [novoCustomPrevisto, projectId]
        );
        
        res.json({
            message: 'Reorçamento criado com sucesso',
            novoCustoPrevisto: novoCustomPrevisto,
            project: updateResult.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reorcamentos/:projectId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM reorcamentos WHERE project_id = $1 ORDER BY data DESC`,
            [req.params.projectId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============= SUPPLIERS =============
app.post('/api/suppliers', async (req, res) => {
    try {
        const { projectId, nome, nif, contacto, categoria, valorContrato } = req.body;
        const result = await pool.query(
            `INSERT INTO suppliers (project_id, nome, nif, contacto, categoria, valor_contrato)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [projectId, nome, nif, contacto, categoria, valorContrato]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/suppliers/:projectId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM suppliers WHERE project_id = $1 ORDER BY nome',
            [req.params.projectId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============= ENCOMENDAS =============
app.post('/api/encomendas', async (req, res) => {
    try {
        const { projectId, numero, data, fornecedorId, local, formaEntrega, dataEntrega, contacto, telemovel, artigos, descontoPerc, descontoEuro, totalSemIVA, valorIVA, totalComIVA, observacoes } = req.body;
        
        const result = await pool.query(
            `INSERT INTO encomendas (project_id, numero, data, fornecedor_id, local, forma_entrega, data_entrega, contacto, telemovel, artigos, desconto_perc, desconto_euro, total_sem_iva, valor_iva, total_com_iva, observacoes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [projectId, numero, data, fornecedorId, local, formaEntrega, dataEntrega, contacto, telemovel, JSON.stringify(artigos), descontoPerc, descontoEuro, totalSemIVA, valorIVA, totalComIVA, observacoes]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/encomendas/:projectId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM encomendas WHERE project_id = $1 ORDER BY data DESC',
            [req.params.projectId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============= COST INVOICES =============
app.post('/api/cost-invoices', async (req, res) => {
    try {
        const { projectId, data, numero, descricao, categoria, fornecedorId, semIVA, comIVA, notas } = req.body;
        
        const result = await pool.query(
            `INSERT INTO cost_invoices (project_id, data, numero, descricao, categoria, fornecedor_id, sem_iva, com_iva, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [projectId, data, numero, descricao, categoria, fornecedorId, semIVA, comIVA, notas]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cost-invoices/:projectId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM cost_invoices WHERE project_id = $1 ORDER BY data DESC',
            [req.params.projectId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============= SALES INVOICES =============
app.post('/api/sales-invoices', async (req, res) => {
    try {
        const { projectId, numero, data, descricao, tipo, semIVA, comIVA, notas } = req.body;
        
        const result = await pool.query(
            `INSERT INTO sales_invoices (project_id, numero, data, descricao, tipo, sem_iva, com_iva, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [projectId, numero, data, descricao, tipo, semIVA, comIVA, notas]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales-invoices/:projectId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM sales_invoices WHERE project_id = $1 ORDER BY data DESC',
            [req.params.projectId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============= PRODUCTION =============
app.post('/api/production', async (req, res) => {
    try {
        const { projectId, mes, producaoContratual, producaoAdicional } = req.body;
        
        const result = await pool.query(
            `INSERT INTO production_values (project_id, mes, producao_contratual, producao_adicional)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [projectId, mes, producaoContratual, producaoAdicional]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Backend rodando em porta ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
});

module.exports = app;
