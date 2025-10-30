// clientes.js - Gerenciamento Completo de Clientes
class ClientesManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentCliente = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadClientes();
    }

    bindEvents() {
        // Eventos serão vinculados quando o HTML for carregado
        setTimeout(() => {
            const btnNovo = document.getElementById('btn-novo-cliente');
            const formCliente = document.getElementById('form-cliente');
            const btnBuscar = document.getElementById('btn-buscar-cliente');

            if (btnNovo) btnNovo.addEventListener('click', () => this.showFormCliente());
            if (formCliente) formCliente.addEventListener('submit', (e) => this.salvarCliente(e));
            if (btnBuscar) btnBuscar.addEventListener('input', (e) => this.buscarClientes(e.target.value));
        }, 100);
    }

    async loadClientes() {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('*')
                .order('nome')
                .limit(100);

            if (error) throw error;
            this.renderClientesTable(clientes);

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            this.showError('Erro ao carregar clientes: ' + error.message);
        }
    }

    renderClientesTable(clientes) {
        const tbody = document.getElementById('clientes-table-body');
        if (!tbody) return;

        if (clientes && clientes.length > 0) {
            tbody.innerHTML = clientes.map(cliente => `
                <tr>
                    <td>${cliente.nome}</td>
                    <td>${cliente.cpf || '-'}</td>
                    <td>${cliente.email || '-'}</td>
                    <td>${cliente.telefone || '-'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="clientesManager.editarCliente('${cliente.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="clientesManager.verReceitas('${cliente.id}')">
                            <i class="fas fa-file-medical"></i>
                        </button>
                        <button class="btn btn-success btn-sm" onclick="clientesManager.novaVendaCliente('${cliente.id}')">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhum cliente cadastrado</td>
                </tr>
            `;
        }
    }

    showFormCliente(cliente = null) {
        this.currentCliente = cliente;
        
        const modalContent = `
            <div class="modal-header">
                <h3>${cliente ? 'Editar' : 'Novo'} Cliente</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-cliente-detalhes">
                    <input type="hidden" id="cliente-id" value="${cliente?.id || ''}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="cliente-nome">Nome Completo *</label>
                            <input type="text" id="cliente-nome" value="${cliente?.nome || ''}" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="cliente-cpf">CPF</label>
                            <input type="text" id="cliente-cpf" value="${cliente?.cpf || ''}">
                        </div>
                        <div class="form-group">
                            <label for="cliente-nascimento">Data Nascimento</label>
                            <input type="date" id="cliente-nascimento" value="${cliente?.data_nascimento || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="cliente-email">E-mail</label>
                            <input type="email" id="cliente-email" value="${cliente?.email || ''}">
                        </div>
                        <div class="form-group">
                            <label for="cliente-telefone">Telefone</label>
                            <input type="tel" id="cliente-telefone" value="${cliente?.telefone || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="cliente-observacoes">Observações</label>
                        <textarea id="cliente-observacoes" rows="3">${cliente?.observacoes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="clientesManager.salvarClienteForm()">Salvar Cliente</button>
            </div>
        `;

        this.showModal(modalContent);
    }

    async salvarClienteForm() {
        const form = document.getElementById('form-cliente-detalhes');
        if (!form) return;

        const clienteData = {
            nome: document.getElementById('cliente-nome').value,
            cpf: document.getElementById('cliente-cpf').value,
            email: document.getElementById('cliente-email').value,
            telefone: document.getElementById('cliente-telefone').value,
            data_nascimento: document.getElementById('cliente-nascimento').value || null,
            observacoes: document.getElementById('cliente-observacoes').value
        };

        const clienteId = document.getElementById('cliente-id').value;

        try {
            let error;
            if (clienteId) {
                // Atualizar cliente existente
                const { data, error: updateError } = await this.supabase
                    .from('clientes')
                    .update(clienteData)
                    .eq('id', clienteId);
                error = updateError;
            } else {
                // Criar novo cliente
                const { data, error: insertError } = await this.supabase
                    .from('clientes')
                    .insert([clienteData]);
                error = insertError;
            }

            if (error) throw error;

            this.showSuccess('Cliente salvo com sucesso!');
            document.querySelector('.modal').remove();
            this.loadClientes();

        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            this.showError('Erro ao salvar cliente: ' + error.message);
        }
    }

    async editarCliente(clienteId) {
        try {
            const { data: cliente, error } = await this.supabase
                .from('clientes')
                .select('*')
                .eq('id', clienteId)
                .single();

            if (error) throw error;
            this.showFormCliente(cliente);

        } catch (error) {
            console.error('Erro ao carregar cliente:', error);
            this.showError('Erro ao carregar dados do cliente');
        }
    }

    async buscarClientes(termo) {
        if (!termo) {
            this.loadClientes();
            return;
        }

        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('*')
                .or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%,email.ilike.%${termo}%`)
                .order('nome')
                .limit(50);

            if (error) throw error;
            this.renderClientesTable(clientes);

        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        }
    }

    verReceitas(clienteId) {
        window.dashboard.loadModule('receitas');
        // Poderia passar o clienteId para filtrar as receitas
    }

    novaVendaCliente(clienteId) {
        window.dashboard.loadModule('vendas');
        // Poderia pré-selecionar o cliente na venda
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
        alert('✅ ' + message); // Em produção, use um toast melhor
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

// Inicializar quando o módulo for carregado
let clientesManager = null;

function initClientes() {
    clientesManager = new ClientesManager();
    window.clientesManager = clientesManager;
}