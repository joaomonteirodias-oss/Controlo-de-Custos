// MUDANÇAS NO FRONTEND (app.js)

// ✅ 1. REMOVER REFERÊNCIA PLACER
// Procurar e substituir TODAS as ocorrências:
// ❌ "PLACER" → ✅ "" (vazio) ou nome da empresa

// Exemplo no header:
const headerHTML = `
<header style="background: white; border-bottom: 3px solid #3F4242; padding: 15px 40px;">
    <div>
        <h1 style="margin: 0; font-size: 24px; color: #3F4242;">📊 Gestão de Custos</h1>
        <p style="margin: 5px 0; color: #B0A19D;">Obra: <span id="projectObraDisplay">--</span></p>
    </div>
</header>
`;

// ============= ✅ 2. REORÇAMENTOS (NOVO) =============

// ✅ SEPARAR: Contratos Adicionais vs Reorçamentos

// TABELA 1: Contratos Adicionais (Apenas lista)
function renderAdditionalContracts() {
    const tbody = document.querySelector('#additionalTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!appData.additionalContracts || appData.additionalContracts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">Sem contratos adicionais</td></tr>';
        return;
    }
    
    appData.additionalContracts.forEach(c => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${c.nome}</td>
            <td>€ ${formatNumber(c.venda)}</td>
            <td>€ ${formatNumber(c.custo)}</td>
            <td>
                <button class="btn-secondary" onclick="editAdditional(${c.id})">Editar</button>
                <button class="btn-danger" onclick="deleteAdditional(${c.id})">Eliminar</button>
            </td>
        `;
    });
}

// TABELA 2: Reorçamentos (COM histórico + CONTRATUAL)
async function renderReorcamentos() {
    const tbody = document.querySelector('#reorcamentosTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // ✅ 1. LINHA: CONTRATUAL
    const vendaInicial = appData.project.vendaInicial || 0;
    const custoInicial = appData.project.custoInicial || 0;
    const margemInicial = vendaInicial > 0 ? ((vendaInicial - custoInicial) / vendaInicial * 100) : 0;
    
    const contratoRow = tbody.insertRow();
    contratoRow.style.background = '#f0f4ff';
    contratoRow.style.fontWeight = 'bold';
    contratoRow.innerHTML = `
        <td style="padding: 12px;">CONTRATUAL (Inicial)</td>
        <td style="padding: 12px; text-align: right;">€ ${formatNumber(vendaInicial)}</td>
        <td style="padding: 12px; text-align: right;">€ ${formatNumber(custoInicial)}</td>
        <td style="padding: 12px; text-align: right; color: ${margemInicial >= 0 ? '#75C594' : '#F15C6C'};">${margemInicial.toFixed(2)}%</td>
    `;
    
    // ✅ 2. LINHAS: REORÇAMENTOS (acumulados)
    try {
        const response = await fetch(\`\${API_URL}/reorcamentos/\${appData.projectId}\`);
        const reorcamentos = await response.json();
        
        if (reorcamentos && reorcamentos.length > 0) {
            let vendaAcumulada = vendaInicial;
            let custoAcumulado = custoInicial;
            
            reorcamentos.forEach((r, index) => {
                vendaAcumulada += r.venda_adicional || 0;
                custoAcumulado += r.custo_adicional || 0;
                
                const margem = vendaAcumulada > 0 ? ((vendaAcumulada - custoAcumulado) / vendaAcumulada * 100) : 0;
                
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td style="padding: 12px;">${r.data} - ${r.descricao}</td>
                    <td style="padding: 12px; text-align: right;">€ ${formatNumber(vendaAcumulada)}</td>
                    <td style="padding: 12px; text-align: right;">€ ${formatNumber(custoAcumulado)}</td>
                    <td style="padding: 12px; text-align: right; color: ${margem >= 0 ? '#75C594' : '#F15C6C'}; font-weight: bold;">${margem.toFixed(2)}%</td>
                `;
            });
        }
    } catch (err) {
        console.error('Erro ao carregar reorçamentos:', err);
    }
}

// ============= ✅ 3. CARD CUSTOS PREVISTOS (ACTUALIZA) =============

async function updateCostosPrevistos() {
    try {
        const response = await fetch(\`\${API_URL}/projects/\${appData.projectId}\`);
        const project = await response.json();
        
        // ✅ MOSTRAR CUSTO PREVISTO ACTUALIZADO
        const cardElement = document.getElementById('suppliersCustoPrevisto');
        if (cardElement) {
            cardElement.textContent = '€ ' + formatNumber(project.custo_previsto_atual);
            console.log('✅ Card actualizado:', project.custo_previsto_atual);
        }
    } catch (err) {
        console.error('Erro ao actualizar card:', err);
    }
}

// ============= CRIAR REORÇAMENTO =============

async function saveReorcamento() {
    const data = document.getElementById('reorcamentoData').value;
    const descricao = document.getElementById('reorcamentoDescricao').value.trim();
    const vendaAdicional = parseFloat(document.getElementById('reorcamentoVendaAdicional').value) || 0;
    const custoAdicional = parseFloat(document.getElementById('reorcamentoCustoAdicional').value) || 0;
    const motivo = document.getElementById('reorcamentoMotivo').value.trim();
    
    if (!data || !descricao || custoAdicional <= 0) {
        alert('Preencha os campos obrigatórios!');
        return;
    }
    
    try {
        const response = await fetch(\`\${API_URL}/reorcamentos\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: appData.projectId,
                data,
                descricao,
                vendaAdicional,
                custoAdicional,
                motivo
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Reorçamento criado');
            console.log('💰 Novo custo previsto:', result.novoCustoPrevisto);
            
            // ✅ ACTUALIZAR TUDO
            await renderReorcamentos();
            await updateCostosPrevistos();
            
            clearReorcamentoForm();
            alert('✅ Reorçamento guardado! Custo previsto actualizado.');
        } else {
            alert('❌ Erro: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao guardar reorçamento:', err);
        alert('❌ Erro ao guardar reorçamento');
    }
}

function clearReorcamentoForm() {
    document.getElementById('reorcamentoData').value = '';
    document.getElementById('reorcamentoDescricao').value = '';
    document.getElementById('reorcamentoVendaAdicional').value = '';
    document.getElementById('reorcamentoCustoAdicional').value = '';
    document.getElementById('reorcamentoMotivo').value = '';
}

// ============= INICIALIZAR =============

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Ao carregar projecto
async function loadProject(projectId) {
    appData.projectId = projectId;
    
    try {
        const response = await fetch(\`\${API_URL}/projects/\${projectId}\`);
        const project = await response.json();
        
        appData.project = {
            name: project.nome,
            obraNumero: project.obra_numero,
            vendaInicial: project.venda_inicial,
            custoInicial: project.custo_inicial,
            custoPrevisto: project.custo_previsto_atual
        };
        
        // Actualizar UI
        updateProjectTitle();
        await renderReorcamentos();
        await updateCostosPrevistos();
        
    } catch (err) {
        console.error('Erro ao carregar projecto:', err);
    }
}

// Ao adicionar reorçamento
// ✅ Automaticamente chama updateCostosPrevistos()
// ✅ Card actualiza com novo valor
// ✅ Tabela reorçamentos mostra novo item

