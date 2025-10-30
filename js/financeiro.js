// financeiro.js - Gestão Financeira Completa
class FinanceiroManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadMovimentacoes();
        this.loadResumoFinanceiro();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovaMovimentacao = document.getElementById('btn-nova-movimentacao');
            const filtroTipo = document.getElementById('filtro-tipo');
            const filtroStatus = document.getElementById('filtro-status');

            if (btnNovaMovimentacao) btnNovaMovimentacao.addEventListener('click', () => this.showFormMovimentacao());
            if (filtroTipo) filtroTipo.addEventListener('change', (e) => this.filtrarMovimentacoes());
            if (filtroStatus) filtroStatus.addEventListener('change', (e) => this.filtrarMovimentacoes());
        }, 100);
    }

    async loadMovimentacoes() {
        try {
            const { data: movimentacoes, error } = await this.supabase
                .from('financeiro_movimentacoes')
                .select(`
                    *,
                    vendas(numero_venda),
                    clientes(nome)
                `)
                .order('data_vencimento', { ascending: true })
                .limit(100);

            if (error) throw error;
            this.renderMovimentacoesTable(movimentacoes);

        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            this.showError('Erro ao carregar dados financeiros: ' + error.message);
        }
    }

    renderMovimentacoesTable(movimentacoes) {
        const tbody = document.getElementById('financeiro-table-body');
        if (!tbody) return;

        if (movimentacoes && movimentacoes.length > 0) {
            tbody.innerHTML = movimentacoes.map(mov => `
                <tr class="${mov.status === 'vencido' ? 'movimentacao-vencida' : ''}">
                    <td>
                        <div class="movimentacao-descricao">
                            <strong>${mov.descricao}</strong>
                            ${mov.vendas ? `<div class="movimentacao-venda">Venda #${mov.vendas.numero_venda}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="movimentacao-tipo ${mov.tipo}">
                            ${mov.tipo === 'receita' ? '📈 Receita' : '📉 Despesa'}
                        </span>
                    </td>
                    <td>${mov.categoria}</td>
                    <td>
                        <strong class="${mov.tipo === 'receita' ? 'text-success' : 'text-danger'}">
                            R$ ${mov.valor.toFixed(2)}
                        </strong>
                    </td>
                    <td>${mov.data_vencimento ? new Date(mov.data_vencimento).toLocaleDateString('pt-BR') : '-'}</td>
                    <td>${mov.data_pagamento ? new Date(mov.data_pagamento).toLocaleDateString('pt-BR') : '-'}</td>
                    <td>
                        <span class="status-badge ${mov.status}">
                            ${this.getStatusText(mov.status)}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="financeiroManager.marcarComoPago('${mov.id}')" 
                                ${mov.status === 'pago' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="financeiroManager.editarMovimentacao('${mov.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Nenhuma movimentação encontrada</td>
                </tr>
            `;
        }
    }

    async loadResumoFinanceiro() {
        try {
            const hoje = new Date().toISOString().split('T')[0];
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

            // Contas a receber
            const { data: contasReceber, error: errorReceber } = await this.supabase
                .from('financeiro_movimentacoes')
                .select('valor')
                .eq('tipo', 'receita')
                .eq('status', 'pendente')
                .gte('data_vencimento', hoje);

            // Contas a pagar
            const { data: contasPagar, error: errorPagar } = await this.supabase
                .from('financeiro_movimentacoes')
                .select('valor')
                .eq('tipo', 'despesa')
                .eq('status', 'pendente')
                .gte('data_vencimento', hoje);

            const totalReceitas = receitas?.reduce((sum, item) => sum + item.valor, 0) || 0;
            const totalDespesas = despesas?.reduce((sum, item) => sum + item.valor, 0) || 0;
            const totalContasReceber = contasReceber?.reduce((sum, item) => sum + item.valor, 0) || 0;
            const totalContasPagar = contasPagar?.reduce((sum, item) => sum + item.valor, 0) || 0;
            const saldoMes = totalReceitas - totalDespesas;

            this.updateResumoFinanceiro({
                totalReceitas,
                totalDespesas,
                saldoMes,
                totalContasReceber,
                totalContasPagar
            });

        } catch (error) {
            console.error('Erro ao carregar resumo financeiro:', error);
        }
    }

    updateResumoFinanceiro(resumo) {
        const elements = {
            'total-receitas': `R$ ${resumo.totalReceitas.toFixed(2)}`,
            'total-despesas': `R$ ${resumo.totalDespesas.toFixed(2)}`,
            'saldo-mes': `R$ ${resumo.saldoMes.toFixed(2)}`,
            'contas-receber': `R$ ${resumo.totalContasReceber.toFixed(2)}`,
            'contas-pagar': `R$ ${resumo.totalContasPagar.toFixed(2)}`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                
                // Adicionar classes de cor
                if (id === 'saldo-mes') {
                    element.className = resumo.saldoMes >= 0 ? 'text-success' : 'text-danger';
                }
            }
        });
    }

    showFormMovimentacao(movimentacao = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${movimentacao ? 'Editar' : 'Nova'} Movimentação</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-movimentacao">
                    <input type="hidden" id="movimentacao-id" value="${movimentacao?.id || ''}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="movimentacao-tipo">Tipo *</label>
                            <select id="movimentacao-tipo" required>
                                <option value="receita" ${movimentacao?.tipo === 'receita' ? 'selected' : ''}>Receita</option>
                                <option value="despesa" ${movimentacao?.tipo === 'despesa' ? 'selected' : ''}>Despesa</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="movimentacao-categoria">Categoria *</label>
                            <select id="movimentacao-categoria" required>
                                <option value="">Selecione...</option>
                                <option value="venda" ${movimentacao?.categoria === 'venda' ? 'selected' : ''}>Venda</option>
                                <option value="servico" ${movimentacao?.categoria === 'servico' ? 'selected' : ''}>Serviço</option>
                                <option value="aluguel" ${movimentacao?.categoria === 'aluguel' ? 'selected' : ''}>Aluguel</option>
                                <option value="salario" ${movimentacao?.categoria === 'salario' ? 'selected' : ''}>Salário</option>
                                <option value="fornecedor" ${movimentacao?.categoria === 'fornecedor' ? 'selected' : ''}>Fornecedor</option>
                                <option value="outro" ${movimentacao?.categoria === 'outro' ? 'selected' : ''}>Outro</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="movimentacao-descricao">Descrição *</label>
                        <input type="text" id="movimentacao-descricao" value="${movimentacao?.descricao || ''}" required>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="movimentacao-valor">Valor *</label>
                            <input type="number" id="movimentacao-valor" step="0.01" value="${movimentacao?.valor || 0}" required>
                        </div>
                        <div class="form-group">
                            <label for="movimentacao-vencimento">Data Vencimento</label>
                            <input type="date" id="movimentacao-vencimento" value="${movimentacao?.data_vencimento || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="movimentacao-observacoes">Observações</label>
                        <textarea id="movimentacao-observacoes" rows="3">${movimentacao?.observacoes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="financeiroManager.salvarMovimentacao()">Salvar Movimentação</button>
            </div>
        `;

        this.showModal(modalContent);
    }

    async salvarMovimentacao() {
        const form = document.getElementById('form-movimentacao');
        if (!form) return;

        const movimentacaoData = {
            tipo: document.getElementById('movimentacao-tipo').value,
            categoria: document.getElementById('movimentacao-categoria').value,
            descricao: document.getElementById('movimentacao-descricao').value,
            valor: parseFloat(document.getElementById('movimentacao-valor').value) || 0,
            data_vencimento: document.getElementById('movimentacao-vencimento').value || null,
            observacoes: document.getElementById('movimentacao-observacoes').value,
            status: 'pendente'
        };

        const movimentacaoId = document.getElementById('movimentacao-id').value;

        try {
            let error;
            if (movimentacaoId) {
                const { data, error: updateError } = await this.supabase
                    .from('financeiro_movimentacoes')
                    .update(movimentacaoData)
                    .eq('id', movimentacaoId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('financeiro_movimentacoes')
                    .insert([movimentacaoData]);
                error = insertError;
            }

            if (error) throw error;

            this.showSuccess('Movimentação salva com sucesso!');
            document.querySelector('.modal').remove();
            this.loadMovimentacoes();
            this.loadResumoFinanceiro();

        } catch (error) {
            console.error('Erro ao salvar movimentação:', error);
            this.showError('Erro ao salvar movimentação: ' + error.message);
        }
    }

    async marcarComoPago(movimentacaoId) {
        try {
            const { error } = await this.supabase
                .from('financeiro_movimentacoes')
                .update({
                    status: 'pago',
                    data_pagamento: new Date().toISOString().split('T')[0]
                })
                .eq('id', movimentacaoId);

            if (error) throw error;

            this.showSuccess('Movimentação marcada como paga!');
            this.loadMovimentacoes();
            this.loadResumoFinanceiro();

        } catch (error) {
            console.error('Erro ao marcar como pago:', error);
            this.showError('Erro ao atualizar movimentação: ' + error.message);
        }
    }

    async editarMovimentacao(movimentacaoId) {
        try {
            const { data: movimentacao, error } = await this.supabase
                .from('financeiro_movimentacoes')
                .select('*')
                .eq('id', movimentacaoId)
                .single();

            if (error) throw error;
            this.showFormMovimentacao(movimentacao);

        } catch (error) {
            console.error('Erro ao carregar movimentação:', error);
            this.showError('Erro ao carregar dados da movimentação');
        }
    }

    filtrarMovimentacoes() {
        const tipo = document.getElementById('filtro-tipo')?.value;
        const status = document.getElementById('filtro-status')?.value;
        
        // Implementar filtro client-side ou nova consulta ao banco
        console.log('Filtrando por:', { tipo, status });
        // Para implementação completa, faria uma nova consulta ao Supabase com os filtros
    }

    getStatusText(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'pago': 'Pago',
            'vencido': 'Vencido'
        };
        return statusMap[status] || status;
    }

    showModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                ${content}
            </div>
        `;
        document.body.appendChild(modal);
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

// Inicializar quando o módulo for carregado
let financeiroManager = null;

function initFinanceiro() {
    financeiroManager = new FinanceiroManager();
    window.financeiroManager = financeiroManager;
}