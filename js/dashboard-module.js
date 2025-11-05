// js/dashboard-module.js
// Esta função será chamada pelo dashboard.js principal

function initDashboardModule() {
    console.log("Inicializando módulo Dashboard (Estatísticas)");
    
    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("Supabase não encontrado!");
        return;
    }

    // Funções de busca de dados
    async function getVendasHoje() {
        const hoje = new Date().toISOString().split('T')[0];
        const { count, error } = await supabase
            .from('vendas')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', hoje);
        return error ? 0 : count;
    }

    async function getTotalClientes() {
        const { count, error } = await supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true });
        return error ? 0 : count;
    }

    async function getEstoqueBaixo() {
        const { count, error } = await supabase
            .from('produtos')
            .select('*', { count: 'exact', head: true })
            .lt('estoque_atual', 5)
            .eq('ativo', true);
        return error ? 0 : count;
    }

    async function getFaturamentoMes() {
        const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('vendas')
            .select('total')
            .gte('created_at', primeiroDiaMes)
            .eq('status', 'concluida');
        if (error) return 0;
        return data.reduce((sum, venda) => sum + (venda.total || 0), 0);
    }

    function updateStatsDisplay(stats) {
        const elements = {
            'vendas-hoje': stats.vendasHoje,
            'clientes-total': stats.totalClientes,
            'estoque-baixo': stats.estoqueBaixo,
            'faturamento-mes': `R$ ${stats.faturamentoMes.toFixed(2)}`
        };
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    async function loadDashboardStats() {
        try {
            const [vendasHoje, totalClientes, estoqueBaixo, faturamentoMes] = await Promise.all([
                getVendasHoje(),
                getTotalClientes(),
                getEstoqueBaixo(),
                getFaturamentoMes()
            ]);
            updateStatsDisplay({ vendasHoje, totalClientes, estoqueBaixo, faturamentoMes });
        } catch (error) {
            console.error('Erro ao carregar estatísticas do dashboard:', error);
        }
    }

    async function loadVendasRecentes() {
        try {
            const { data: vendas, error } = await supabase
                .from('vendas')
                .select(`*, clientes(nome)`)
                .order('created_at', { ascending: false })
                .limit(5);
            const container = document.getElementById('vendas-recentes-list');
            if (!container) return;
            if (error) throw error;

            if (vendas && vendas.length > 0) {
                container.innerHTML = vendas.map(venda => `
                    <div class="venda-item" style="padding: 10px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${venda.clientes?.nome || 'Cliente'}</strong>
                                <div style="color: #666; font-size: 0.9em;">R$ ${venda.total?.toFixed(2)}</div>
                            </div>
                            <span class="status-badge" style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
                                ${venda.status}
                            </span>
                        </div>
                    </div>`).join('');
            } else {
                container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Nenhuma venda recente</div>';
            }
        } catch (error) {
            console.error('Erro ao carregar vendas recentes:', error);
        }
    }

    async function loadAlertasEstoque() {
        try {
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('*')
                .lt('estoque_atual', 5)
                .eq('ativo', true)
                .order('estoque_atual')
                .limit(5);
            const container = document.getElementById('alertas-estoque-list');
            if (!container) return;
            if (error) throw error;

            if (produtos && produtos.length > 0) {
                container.innerHTML = produtos.map(produto => `
                    <div class="alerta-item" style="padding: 10px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${produto.nome}</strong>
                                <div style="color: #666; font-size: 0.9em;">Estoque: ${produto.estoque_atual}</div>
                            </div>
                            <span class="alerta-level" style="background: ${produto.estoque_atual < 2 ? '#f44336' : '#ff9800'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
                                ${produto.estoque_atual < 2 ? 'CRÍTICO' : 'BAIXO'}
                            </span>
                        </div>
                    </div>`).join('');
            } else {
                container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Estoque em níveis normais</div>';
            }
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
        }
    }

    // Executar as funções de carregamento
    loadDashboardStats();
    loadVendasRecentes();
    loadAlertasEstoque();
}