// db.js - Conexão PostgreSQL

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/gestao_custos',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('error', (err) => {
    console.error('❌ Erro na pool PostgreSQL:', err);
});

pool.on('connect', () => {
    console.log('✅ Conectado ao PostgreSQL');
});

// Query com timeout
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`📊 Query executada em ${duration}ms`);
        return result;
    } catch (err) {
        console.error('❌ Erro na query:', err);
        throw err;
    }
}

module.exports = { pool, query };
