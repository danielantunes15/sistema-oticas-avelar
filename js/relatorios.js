// relatorios.js - Relatórios Avançados
class RelatoriosManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.init();
    }

    init() {
        this.bindEvents();
        this.carregarRelatorioVendas();
    }

    bindEvents() {
        setTimeout(() => {
            const btnGerarRelatorio = document.getElementById('btn-gerar-relatorio');
            const filtroDataInicio = document.getElementById('filtro-data-inicio');
            const filtroDataFim = document.getElementById('filtro-data-fim');

            if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', () => this.gerarRelatorio());
            
            // Definir datas padrão (mês atual)
            const hoje = new Date();
            const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

            if (filtroDataInicio) filtroDataInicio.value = primeiroDiaMes.toISOString().split('T')[0];
            if (filtroDataFim) filtroDataFim.value = ultimoDiaMes.toISOString().split('T')[0];

        }, 100);
    }

    async carregarRelatorioVendas() {
        await Promise.all([
            this.carregarVendasPorPeriodo(),
            this.carregarProdutosMaisVendidos(),
            this.carregarMetricasFinanceiras()
        ]);
    }

    async carregarVendasPorPeriodo() {
        try {
            const dataInicio = document.getElementById('filtro-data-inicio')?.value;
            const dataFim = document.getElementById('filtro-data-fim')?.value;

            let query = this.supabase
                .from('vendas')
                .select('*')
                .eq('status', 'concluida');

            if (dataInicio) {
                query = query.gte('created_at', dataInicio);
            }
            if (dataFim) {
                query = query.lte('created_at', dataFim + ' 23:59:59');
            }

            const { data: vendas, error } = await query;

            if (error) throw error;
            this.exibirVendasPorPeriodo(vendas);

        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
        }
    }

    exibirVendasPorPeriodo(vendas) {
        const container = document.getElementById('vendas-periodo');
        if (!container) return;

        const totalVendas = vendas?.length || 0;
        const totalFaturado = vendas?.reduce((sum, venda) => sum + (venda.total || 0), 0) || 0;
        const ticketMedio = totalVendas > 0 ? totalFaturado / totalVendas : 0;

        container.innerHTML = `
            <div class="metricas-grid">
                <div class="metrica-card">
                    <div class="metrica-valor">${totalVendas}</div>
                    <div class="metrica-label">Total de Vendas</div>
                </div>
                <div class="metrica-card">
                    <div class="metrica-valor">R$ ${totalFaturado.toFixed(2)}</div>
                    <div class="metrica-label">Faturamento Total</div>
                </div>
                <div class="metrica-card">
                    <div class="metrica-valor">R$ ${ticketMedio.toFixed(2)}</div>
                    <div class="metrica-label">Ticket Médio</div>
                </div>
            </div>
        `;

        // Gerar gráfico de vendas por dia
        this.gerarGraficoVendas(vendas);
    }

    gerarGraficoVendas(vendas) {
        const ctx = document.getElementById('grafico-vendas');
        if (!ctx) return;

        // Agrupar vendas por dia
        const vendasPorDia = {};
        vendas?.forEach(venda => {
            const data = new Date(venda.created_at).toLocaleDateString('pt-BR');
            vendasPorDia[data] = (vendasPorDia[data] || 0) + 1;
        });

        const labels = Object.keys(vendasPorDia);
        const data = Object.values(vendasPorDia);

        // Usando Chart.js se disponível
        if (window.Chart) {
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Vendas por Dia',
                        data: data,
                        borderColor: '#d32f2f',
                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Evolução de Vendas'
                        }
                    }
                }
            });
        }
    }

    async carregarProdutosMaisVendidos() {
        try {
            const { data: itens, error } = await this.supabase
                .from('venda_itens')
                .select(`
                    quantidade,
                    produtos(nome, preco_venda)
                `)
                .limit(50);

            if (error) throw error;

            // Agrupar produtos por quantidade vendida
            const produtosVendidos = {};
            itens?.forEach(item => {
                const nome = item.produtos.nome;
                if (!produtosVendidos[nome]) {
                    produtosVendidos[nome] = {
                        quantidade: 0,
                        total: 0
                    };
                }
                produtosVendidos[nome].quantidade += item.quantidade;
                produtosVendidos[nome].total += item.subtotal;
            });

            this.exibirProdutosMaisVendidos(produtosVendidos);

        } catch (error) {
            console.error('Erro ao carregar produtos vendidos:', error);
        }
    }

    exibirProdutosMaisVendidos(produtos) {
        const container = document.getElementById('produtos-mais-vendidos');
        if (!container) return;

        const produtosOrdenados = Object.entries(produtos)
            .sort(([, a], [, b]) => b.quantidade - a.quantidade)
            .slice(0, 10);

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Total Vendido</th>
                    </tr>
                </thead>
                <tbody>
                    ${produtosOrdenados.map(([nome, dados]) => `
                        <tr>
                            <td>${nome}</td>
                            <td>${dados.quantidade}</td>
                            <td>R$ ${dados.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async carregarMetricasFinanceiras() {
        try {
            const mesAtual = new Date().getMonth() + 1;
            const anoAtual = new Date().getFullYear();

            // Receitas do mês
            const { data: receitas, error: errorReceitas } = await this.supabase
                .from('financeiro_movimentacoes')
                .select('valor')
                .eq('tipo', 'receita')
                .eq('status', 'pago')
                .gte('data_pagamento', `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01`)
                .lte('data_pagamento', `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-31`);

            // Despesas do mês
            const { data: despesas, error: errorDespesas } = await this.supabase
                .from('financeiro_movimentacoes')
                .select('valor')
                .eq('tipo', 'despesa')
                .eq('status', 'pago')
                .gte('data_pagamento', `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01`)
                .lte('data_pagamento', `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-31`);

            const totalReceitas = receitas?.reduce((sum, item) => sum + item.valor, 0) || 0;
            const totalDespesas = despesas?.reduce((sum, item) => sum + item.valor, 0) || 0;
            const lucro = totalReceitas - totalDespesas;
            const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;

            this.exibirMetricasFinanceiras({
                totalReceitas,
                totalDespesas,
                lucro,
                margem
            });

        } catch (error) {
            console.error('Erro ao carregar métricas financeiras:', error);
        }
    }

    exibirMetricasFinanceiras(metricas) {
        const container = document.getElementById('metricas-financeiras');
        if (!container) return;

        container.innerHTML = `
            <div class="metricas-grid">
                <div class="metrica-card">
                    <div class="metrica-valor text-success">R$ ${metricas.totalReceitas.toFixed(2)}</div>
                    <div class="metrica-label">Receitas</div>
                </div>
                <div class="metrica-card">
                    <div class="metrica-valor text-danger">R$ ${metricas.totalDespesas.toFixed(2)}</div>
                    <div class="metrica-label">Despesas</div>
                </div>
                <div class="metrica-card">
                    <div class="metrica-valor ${metricas.lucro >= 0 ? 'text-success' : 'text-danger'}">
                        R$ ${metricas.lucro.toFixed(2)}
                    </div>
                    <div class="metrica-label">Lucro</div>
                </div>
                <div class="metrica-card">
                    <div class="metrica-valor ${metricas.margem >= 0 ? 'text-success' : 'text-danger'}">
                        ${metricas.margem.toFixed(1)}%
                    </div>
                    <div class="metrica-label">Margem</div>
                </div>
            </div>
        `;
    }

    async gerarRelatorio() {
        // Recarregar todos os relatórios com os filtros aplicados
        await this.carregarRelatorioVendas();
        this.showSuccess('Relatório atualizado com sucesso!');
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }
}

// Inicializar quando o módulo for carregado
let relatoriosManager = null;

function initRelatorios() {
    relatoriosManager = new RelatoriosManager();
    window.relatoriosManager = relatoriosManager;
}