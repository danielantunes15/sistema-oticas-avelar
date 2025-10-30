// receitas.js - Controle de Receitas Oftalmológicas
class ReceitasManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadReceitas();
        this.loadClientes();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovaReceita = document.getElementById('btn-nova-receita');
            const filtroCliente = document.getElementById('filtro-cliente');

            if (btnNovaReceita) btnNovaReceita.addEventListener('click', () => this.showFormReceita());
            if (filtroCliente) filtroCliente.addEventListener('change', (e) => this.filtrarReceitas(e.target.value));
        }, 100);
    }

    async loadReceitas() {
        try {
            const { data: receitas, error } = await this.supabase
                .from('receitas')
                .select(`
                    *,
                    clientes(nome, cpf)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            this.renderReceitasTable(receitas);

        } catch (error) {
            console.error('Erro ao carregar receitas:', error);
            this.showError('Erro ao carregar receitas: ' + error.message);
        }
    }

    async loadClientes() {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('id, nome')
                .order('nome');

            if (error) throw error;
            this.popularSelectClientes(clientes);

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    popularSelectClientes(clientes) {
        const select = document.getElementById('filtro-cliente');
        const selectForm = document.getElementById('receita-cliente-id');

        if (select && clientes) {
            select.innerHTML = `
                <option value="todos">Todos os Clientes</option>
                ${clientes.map(cliente => `
                    <option value="${cliente.id}">${cliente.nome}</option>
                `).join('')}
            `;
        }

        if (selectForm && clientes) {
            selectForm.innerHTML = `
                <option value="">Selecione um cliente...</option>
                ${clientes.map(cliente => `
                    <option value="${cliente.id}">${cliente.nome}</option>
                `).join('')}
            `;
        }
    }

    renderReceitasTable(receitas) {
        const tbody = document.getElementById('receitas-table-body');
        if (!tbody) return;

        if (receitas && receitas.length > 0) {
            tbody.innerHTML = receitas.map(receita => `
                <tr>
                    <td>
                        <strong>${receita.clientes.nome}</strong>
                        <div class="receita-info">
                            <small>CPF: ${receita.clientes.cpf || 'N/A'} | 
                            Data: ${new Date(receita.data_receita).toLocaleDateString('pt-BR')}</small>
                        </div>
                    </td>
                    <td>
                        <div class="receita-grau">
                            <strong>OD:</strong> ${this.formatarGrau(receita.od_esferico)} ${this.formatarCilindrico(receita.od_cilindrico)} ${receita.od_eixo || ''}°
                            ${receita.od_adicao ? `Add: ${receita.od_adicao}` : ''}
                        </div>
                        <div class="receita-grau">
                            <strong>OE:</strong> ${this.formatarGrau(receita.oe_esferico)} ${this.formatarCilindrico(receita.oe_cilindrico)} ${receita.oe_eixo || ''}°
                            ${receita.oe_adicao ? `Add: ${receita.oe_adicao}` : ''}
                        </div>
                    </td>
                    <td>${receita.medico_nome || '-'}</td>
                    <td>
                        ${receita.data_validade ? new Date(receita.data_validade).toLocaleDateString('pt-BR') : '-'}
                        ${this.isReceitaVencida(receita.data_validade) ? '<span class="vencida-badge">Vencida</span>' : ''}
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="receitasManager.editarReceita('${receita.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-success btn-sm" onclick="receitasManager.usarReceitaVenda('${receita.id}')">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="receitasManager.visualizarReceita('${receita.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhuma receita cadastrada</td>
                </tr>
            `;
        }
    }

    formatarGrau(grau) {
        if (!grau) return '-';
        return grau > 0 ? `+${grau}` : grau.toString();
    }

    formatarCilindrico(cilindrico) {
        if (!cilindrico) return '';
        return cilindrico > 0 ? `+${cilindrico}` : cilindrico.toString();
    }

    isReceitaVencida(dataValidade) {
        if (!dataValidade) return false;
        return new Date(dataValidade) < new Date();
    }

    showFormReceita(receita = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${receita ? 'Editar' : 'Nova'} Receita Oftalmológica</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <form id="form-receita">
                    <input type="hidden" id="receita-id" value="${receita?.id || ''}">
                    
                    <div class="form-group">
                        <label for="receita-cliente-id">Cliente *</label>
                        <select id="receita-cliente-id" required>
                            <option value="">Selecione um cliente...</option>
                        </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="receita-medico-nome">Médico</label>
                            <input type="text" id="receita-medico-nome" value="${receita?.medico_nome || ''}">
                        </div>
                        <div class="form-group">
                            <label for="receita-medico-crm">CRM</label>
                            <input type="text" id="receita-medico-crm" value="${receita?.medico_crm || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="receita-data">Data da Receita</label>
                            <input type="date" id="receita-data" value="${receita?.data_receita || new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label for="receita-validade">Data Validade</label>
                            <input type="date" id="receita-validade" value="${receita?.data_validade || ''}">
                        </div>
                    </div>

                    <div class="receita-section">
                        <h4>👁️ Olho Direito (OD)</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-od-esferico">Esférico</label>
                                <input type="number" id="receita-od-esferico" step="0.25" value="${receita?.od_esferico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-od-cilindrico">Cilíndrico</label>
                                <input type="number" id="receita-od-cilindrico" step="0.25" value="${receita?.od_cilindrico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-od-eixo">Eixo</label>
                                <input type="number" id="receita-od-eixo" min="0" max="180" value="${receita?.od_eixo || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-od-adicao">Adição</label>
                                <input type="number" id="receita-od-adicao" step="0.25" value="${receita?.od_adicao || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-od-dp">DP</label>
                                <input type="number" id="receita-od-dp" step="0.5" value="${receita?.od_dp || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="receita-section">
                        <h4>👁️ Olho Esquerdo (OE)</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-oe-esferico">Esférico</label>
                                <input type="number" id="receita-oe-esferico" step="0.25" value="${receita?.oe_esferico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-oe-cilindrico">Cilíndrico</label>
                                <input type="number" id="receita-oe-cilindrico" step="0.25" value="${receita?.oe_cilindrico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-oe-eixo">Eixo</label>
                                <input type="number" id="receita-oe-eixo" min="0" max="180" value="${receita?.oe_eixo || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-oe-adicao">Adição</label>
                                <input type="number" id="receita-oe-adicao" step="0.25" value="${receita?.oe_adicao || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-oe-dp">DP</label>
                                <input type="number" id="receita-oe-dp" step="0.5" value="${receita?.oe_dp || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="receita-observacoes">Observações</label>
                        <textarea id="receita-observacoes" rows="3">${receita?.observacoes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="receitasManager.salvarReceita()">Salvar Receita</button>
            </div>
        `;

        this.showModal(modalContent);
        this.loadClientes(); // Recarregar clientes para o select
    }

    async salvarReceita() {
        const form = document.getElementById('form-receita');
        if (!form) return;

        const receitaData = {
            cliente_id: document.getElementById('receita-cliente-id').value,
            medico_nome: document.getElementById('receita-medico-nome').value,
            medico_crm: document.getElementById('receita-medico-crm').value,
            data_receita: document.getElementById('receita-data').value,
            data_validade: document.getElementById('receita-validade').value,
            
            // OD
            od_esferico: document.getElementById('receita-od-esferico').value ? parseFloat(document.getElementById('receita-od-esferico').value) : null,
            od_cilindrico: document.getElementById('receita-od-cilindrico').value ? parseFloat(document.getElementById('receita-od-cilindrico').value) : null,
            od_eixo: document.getElementById('receita-od-eixo').value ? parseInt(document.getElementById('receita-od-eixo').value) : null,
            od_adicao: document.getElementById('receita-od-adicao').value ? parseFloat(document.getElementById('receita-od-adicao').value) : null,
            od_dp: document.getElementById('receita-od-dp').value ? parseFloat(document.getElementById('receita-od-dp').value) : null,
            
            // OE
            oe_esferico: document.getElementById('receita-oe-esferico').value ? parseFloat(document.getElementById('receita-oe-esferico').value) : null,
            oe_cilindrico: document.getElementById('receita-oe-cilindrico').value ? parseFloat(document.getElementById('receita-oe-cilindrico').value) : null,
            oe_eixo: document.getElementById('receita-oe-eixo').value ? parseInt(document.getElementById('receita-oe-eixo').value) : null,
            oe_adicao: document.getElementById('receita-oe-adicao').value ? parseFloat(document.getElementById('receita-oe-adicao').value) : null,
            oe_dp: document.getElementById('receita-oe-dp').value ? parseFloat(document.getElementById('receita-oe-dp').value) : null,
            
            observacoes: document.getElementById('receita-observacoes').value
        };

        const receitaId = document.getElementById('receita-id').value;

        try {
            let error;
            if (receitaId) {
                const { data, error: updateError } = await this.supabase
                    .from('receitas')
                    .update(receitaData)
                    .eq('id', receitaId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('receitas')
                    .insert([receitaData]);
                error = insertError;
            }

            if (error) throw error;

            this.showSuccess('Receita salva com sucesso!');
            document.querySelector('.modal').remove();
            this.loadReceitas();

        } catch (error) {
            console.error('Erro ao salvar receita:', error);
            this.showError('Erro ao salvar receita: ' + error.message);
        }
    }

    async editarReceita(receitaId) {
        try {
            const { data: receita, error } = await this.supabase
                .from('receitas')
                .select('*')
                .eq('id', receitaId)
                .single();

            if (error) throw error;
            this.showFormReceita(receita);

        } catch (error) {
            console.error('Erro ao carregar receita:', error);
            this.showError('Erro ao carregar dados da receita');
        }
    }

    visualizarReceita(receitaId) {
        // Implementar visualização detalhada da receita
        this.showSuccess('Visualização de receita em desenvolvimento');
    }

    usarReceitaVenda(receitaId) {
        // Navegar para o módulo de vendas com a receita pré-selecionada
        window.dashboard.loadModule('vendas');
        this.showSuccess('Agora você pode usar esta receita em uma venda');
    }

    filtrarReceitas(clienteId) {
        if (clienteId === 'todos') {
            this.loadReceitas();
            return;
        }

        // Filtrar receitas por cliente
        const tbody = document.getElementById('receitas-table-body');
        const rows = tbody.getElementsByTagName('tr');

        for (let row of rows) {
            // Esta é uma implementação básica - em produção, faria uma nova consulta ao banco
            row.style.display = '';
        }
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
let receitasManager = null;

function initReceitas() {
    receitasManager = new ReceitasManager();
    window.receitasManager = receitasManager;
}