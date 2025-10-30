// dashboard.js - Sistema Completo Óticas Avelar
class DashboardManager {
    constructor() {
        this.currentModule = 'dashboard';
        this.supabase = window.supabaseClient;
        this.modules = {
            'dashboard': 'Dashboard',
            'clientes': 'Clientes',
            'vendas': 'Vendas',
            'estoque': 'Estoque',
            'financeiro': 'Financeiro',
            'receitas': 'Receitas',
            'laboratorio': 'Laboratório',
            'relatorios': 'Relatórios'
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDashboard();
        this.loadRealTimeData();
    }

    bindEvents() {
        const navItems = document.querySelectorAll('.nav-item');
        const menuToggle = document.querySelector('.menu-toggle');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e);
            });
        });

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
    }

    async loadRealTimeData() {
        await this.loadDashboardStats();
    }

    async loadDashboardStats() {
        try {
            const [vendasHoje, totalClientes, estoqueBaixo, faturamentoMes] = await Promise.all([
                this.getVendasHoje(),
                this.getTotalClientes(),
                this.getEstoqueBaixo(),
                this.getFaturamentoMes()
            ]);

            this.updateStatsDisplay({
                vendasHoje,
                totalClientes,
                estoqueBaixo,
                faturamentoMes
            });

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async getVendasHoje() {
        const hoje = new Date().toISOString().split('T')[0];
        const { count, error } = await this.supabase
            .from('vendas')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', hoje);
        
        return error ? 0 : count;
    }

    async getTotalClientes() {
        const { count, error } = await this.supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true });
        
        return error ? 0 : count;
    }

    async getEstoqueBaixo() {
        const { count, error } = await this.supabase
            .from('produtos')
            .select('*', { count: 'exact', head: true })
            .lt('estoque_atual', 5)
            .eq('ativo', true);
        
        return error ? 0 : count;
    }

    async getFaturamentoMes() {
        const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        const { data, error } = await this.supabase
            .from('vendas')
            .select('total')
            .gte('created_at', primeiroDiaMes)
            .eq('status', 'concluida');
        
        if (error) return 0;
        
        return data.reduce((sum, venda) => sum + (venda.total || 0), 0);
    }

    updateStatsDisplay(stats) {
        const elements = {
            'vendas-hoje': stats.vendasHoje,
            'clientes-total': stats.totalClientes,
            'estoque-baixo': stats.estoqueBaixo,
            'faturamento-mes': `R$ ${stats.faturamentoMes.toFixed(2)}`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    handleNavigation(event) {
        const navItem = event.currentTarget;
        const module = navItem.getAttribute('data-module');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        navItem.classList.add('active');
        
        this.loadModule(module);
    }

    async loadModule(moduleName) {
        this.currentModule = moduleName;
        
        try {
            this.showLoading();
            
            const content = await this.getModuleContent(moduleName);
            document.getElementById('module-content').innerHTML = content;
            
            this.updatePageTitle(moduleName);
            await this.initializeModule(moduleName);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Erro ao carregar módulo:', error);
            this.showError('Erro ao carregar módulo');
        }
    }

    async getModuleContent(moduleName) {
        const modules = {
            'dashboard': () => this.getDashboardHTML(),
            'clientes': () => this.getClientesHTML(),
            'vendas': () => this.getVendasHTML(),
            'estoque': () => this.getEstoqueHTML(),
            'financeiro': () => this.getFinanceiroHTML(),
            'receitas': () => this.getReceitasHTML(),
            'relatorios': () => this.getRelatoriosHTML(),
            'laboratorio': () => this.getLaboratorioHTML()
        };

        return modules[moduleName] ? await modules[moduleName]() : this.getModuleFallbackHTML(moduleName);
    }

    getDashboardHTML() {
        return `
            <div class="dashboard-header">
                <h2>Bem-vindo ao Sistema Óticas Avelar</h2>
                <p>Painel de controle e métricas do negócio</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="vendas-hoje">0</h3>
                        <p>Vendas Hoje</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="clientes-total">0</h3>
                        <p>Total Clientes</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-boxes"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="estoque-baixo">0</h3>
                        <p>Estoque Baixo</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="faturamento-mes">R$ 0</h3>
                        <p>Faturamento Mês</p>
                    </div>
                </div>
            </div>

            <div class="quick-actions">
                <button class="quick-btn" onclick="dashboard.loadModule('vendas')">
                    <i class="fas fa-cash-register"></i>
                    <span>Nova Venda (PDV)</span>
                </button>
                <button class="quick-btn" onclick="dashboard.loadModule('clientes')">
                    <i class="fas fa-user-plus"></i>
                    <span>Cadastrar Cliente</span>
                </button>
                <button class="quick-btn" onclick="dashboard.loadModule('estoque')">
                    <i class="fas fa-box-open"></i>
                    <span>Gerenciar Estoque</span>
                </button>
                <button class="quick-btn" onclick="dashboard.loadModule('receitas')">
                    <i class="fas fa-file-medical"></i>
                    <span>Cadastrar Receita</span>
                </button>
            </div>

            <div class="content-row" style="margin-top: 30px;">
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>📊 Vendas Recentes</h3>
                        </div>
                        <div class="card-body">
                            <div id="vendas-recentes-list">
                                <div class="loading">Carregando vendas...</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>⚠️ Alertas de Estoque</h3>
                        </div>
                        <div class="card-body">
                            <div id="alertas-estoque-list">
                                <div class="loading">Carregando alertas...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getClientesHTML() {
        return `
            <div class="module-header">
                <h2>👥 Gerenciamento de Clientes</h2>
                <p>Cadastro e controle de clientes da ótica</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Lista de Clientes</h3>
                    <div class="header-actions">
                        <input type="text" id="btn-buscar-cliente" placeholder="Buscar cliente..." 
                               style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px;">
                        <button class="btn btn-primary" id="btn-novo-cliente">
                            <i class="fas fa-plus"></i> Novo Cliente
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CPF</th>
                                    <th>E-mail</th>
                                    <th>Telefone</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="clientes-table-body">
                                <tr>
                                    <td colspan="5" class="text-center">Carregando clientes...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    getVendasHTML() {
        return `
            <div class="module-header">
                <h2>🛍️ Sistema de Vendas (PDV)</h2>
                <p>Ponto de Venda - Óticas Avelar</p>
            </div>

            <div class="pdv-container">
                <div class="pdv-layout">
                    <!-- Painel de Produtos -->
                    <div class="pdv-painel-produtos">
                        <div class="painel-header">
                            <h3>Produtos</h3>
                            <div class="busca-produto">
                                <input type="text" id="busca-produto" placeholder="Buscar produto...">
                            </div>
                        </div>
                        <div id="resultados-busca" class="resultados-busca">
                            <div class="empty-state">Digite para buscar produtos</div>
                        </div>
                    </div>

                    <!-- Carrinho de Vendas -->
                    <div class="pdv-carrinho">
                        <div class="carrinho-header">
                            <h3>Carrinho de Vendas</h3>
                            <button class="btn btn-success" id="btn-finalizar-venda">
                                <i class="fas fa-check"></i> Finalizar Venda
                            </button>
                        </div>
                        
                        <div id="carrinho-itens" class="carrinho-itens">
                            <div class="empty-state">Carrinho vazio</div>
                        </div>
                        
                        <div class="carrinho-total">
                            <strong>Total: <span id="total-venda">R$ 0,00</span></strong>
                        </div>

                        <div class="carrinho-acoes">
                            <button class="btn btn-primary" id="btn-add-produto">
                                <i class="fas fa-plus"></i> Adicionar Produto
                            </button>
                            <button class="btn btn-warning" onclick="vendasManager.limparCarrinho()">
                                <i class="fas fa-trash"></i> Limpar Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEstoqueHTML() {
        return `
            <div class="module-header">
                <h2>📦 Controle de Estoque</h2>
                <p>Gerenciamento de produtos e inventário</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Produtos em Estoque</h3>
                    <div class="header-actions">
                        <select id="filtro-categoria" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px;">
                            <option value="todos">Todas Categorias</option>
                            <option value="armacao">Armações</option>
                            <option value="lente">Lentes</option>
                            <option value="acessorio">Acessórios</option>
                        </select>
                        <button class="btn btn-warning" id="btn-ajustar-estoque">
                            <i class="fas fa-cogs"></i> Ajustar Estoque
                        </button>
                        <button class="btn btn-primary" id="btn-novo-produto">
                            <i class="fas fa-plus"></i> Novo Produto
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="produtos">Produtos</button>
                        <button class="tab-btn" data-tab="movimentacoes">Movimentações</button>
                    </div>

                    <div class="tab-content">
                        <div id="tab-produtos" class="tab-pane active">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Produto</th>
                                            <th>Categoria</th>
                                            <th>Estoque</th>
                                            <th>Estoque Mín.</th>
                                            <th>Preço Custo</th>
                                            <th>Preço Venda</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="estoque-table-body">
                                        <tr>
                                            <td colspan="7" class="text-center">Carregando produtos...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div id="tab-movimentacoes" class="tab-pane">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Produto</th>
                                            <th>Tipo</th>
                                            <th>Quantidade</th>
                                            <th>Saldo</th>
                                            <th>Motivo</th>
                                            <th>Data</th>
                                        </tr>
                                    </thead>
                                    <tbody id="movimentacoes-table-body">
                                        <tr>
                                            <td colspan="6" class="text-center">Carregando movimentações...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFinanceiroHTML() {
        return `
            <div class="module-header">
                <h2>💰 Gestão Financeira</h2>
                <p>Controle de receitas, despesas e fluxo de caixa</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #4CAF50;">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="total-receitas">R$ 0</h3>
                        <p>Total Receitas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #f44336;">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="total-despesas">R$ 0</h3>
                        <p>Total Despesas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #2196F3;">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="saldo-mes">R$ 0</h3>
                        <p>Saldo do Mês</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #FF9800;">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="contas-receber">R$ 0</h3>
                        <p>Contas a Receber</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Movimentações Financeiras</h3>
                    <div class="header-actions">
                        <select id="filtro-tipo" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px;">
                            <option value="todos">Todos os Tipos</option>
                            <option value="receita">Receitas</option>
                            <option value="despesa">Despesas</option>
                        </select>
                        <select id="filtro-status" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px;">
                            <option value="todos">Todos Status</option>
                            <option value="pendente">Pendentes</option>
                            <option value="pago">Pagas</option>
                            <option value="vencido">Vencidas</option>
                        </select>
                        <button class="btn btn-primary" id="btn-nova-movimentacao">
                            <i class="fas fa-plus"></i> Nova Movimentação
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Tipo</th>
                                    <th>Categoria</th>
                                    <th>Valor</th>
                                    <th>Vencimento</th>
                                    <th>Pagamento</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="financeiro-table-body">
                                <tr>
                                    <td colspan="8" class="text-center">Carregando movimentações...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    getReceitasHTML() {
        return `
            <div class="module-header">
                <h2>👓 Controle de Receitas Oftalmológicas</h2>
                <p>Cadastro e gerenciamento de receitas médicas</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Receitas Cadastradas</h3>
                    <div class="header-actions">
                        <select id="filtro-cliente" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px;">
                            <option value="todos">Todos os Clientes</option>
                        </select>
                        <button class="btn btn-primary" id="btn-nova-receita">
                            <i class="fas fa-plus"></i> Nova Receita
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Grau</th>
                                    <th>Médico</th>
                                    <th>Validade</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="receitas-table-body">
                                <tr>
                                    <td colspan="5" class="text-center">Carregando receitas...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    getRelatoriosHTML() {
        return `
            <div class="module-header">
                <h2>📊 Relatórios e Analytics</h2>
                <p>Relatórios avançados e métricas do negócio</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Filtros do Relatório</h3>
                    <div class="header-actions">
                        <input type="date" id="filtro-data-inicio" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px;">
                        <input type="date" id="filtro-data-fim" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px;">
                        <button class="btn btn-primary" id="btn-gerar-relatorio">
                            <i class="fas fa-chart-bar"></i> Gerar Relatório
                        </button>
                    </div>
                </div>
            </div>

            <div class="content-row">
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>📈 Vendas por Período</h3>
                        </div>
                        <div class="card-body">
                            <div id="vendas-periodo">
                                <div class="loading">Carregando dados de vendas...</div>
                            </div>
                            <canvas id="grafico-vendas" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>💰 Métricas Financeiras</h3>
                        </div>
                        <div class="card-body">
                            <div id="metricas-financeiras">
                                <div class="loading">Carregando métricas...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 20px;">
                <div class="card-header">
                    <h3>🏆 Produtos Mais Vendidos</h3>
                </div>
                <div class="card-body">
                    <div id="produtos-mais-vendidos">
                        <div class="loading">Carregando produtos mais vendidos...</div>
                    </div>
                </div>
            </div>
        `;
    }

    getLaboratorioHTML() {
        return `
            <div class="module-header">
                <h2>🔬 Laboratório</h2>
                <p>Controle de produção e serviços do laboratório</p>
            </div>

            <div class="card">
                <div class="card-body">
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-microscope" style="font-size: 4rem; color: #2196F3; margin-bottom: 20px;"></i>
                        <h3 style="color: #424242; margin-bottom: 15px;">Módulo em Desenvolvimento</h3>
                        <p style="color: #666; margin-bottom: 25px; max-width: 500px; margin-left: auto; margin-right: auto;">
                            O módulo de Laboratório está sendo desenvolvido e em breve estará disponível 
                            com controle completo de ordens de serviço, montagem de lentes e rastreamento de produção.
                        </p>
                        <div class="quick-actions">
                            <button class="quick-btn" onclick="dashboard.loadModule('vendas')">
                                <i class="fas fa-cash-register"></i>
                                <span>Ir para Vendas</span>
                            </button>
                            <button class="quick-btn" onclick="dashboard.loadModule('estoque')">
                                <i class="fas fa-boxes"></i>
                                <span>Ver Estoque</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getModuleFallbackHTML(moduleName) {
        const moduleTitles = {
            'clientes': '👥 Gerenciamento de Clientes',
            'vendas': '🛍️ Sistema de Vendas',
            'estoque': '📦 Controle de Estoque',
            'financeiro': '💰 Gestão Financeira',
            'receitas': '👓 Controle de Receitas',
            'laboratorio': '🔬 Laboratório',
            'relatorios': '📊 Relatórios e Analytics'
        };

        return `
            <div class="module-header">
                <h2>${moduleTitles[moduleName] || moduleName}</h2>
                <p>Módulo em desenvolvimento</p>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="module-placeholder">
                        <i class="fas fa-tools"></i>
                        <h3>Módulo em Construção</h3>
                        <p>Esta funcionalidade estará disponível em breve.</p>
                        <button class="btn btn-primary" onclick="dashboard.loadModule('dashboard')">
                            Voltar ao Dashboard
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async initializeModule(moduleName) {
        const moduleInitializers = {
            'dashboard': () => this.initializeDashboard(),
            'clientes': () => this.initializeClientes(),
            'vendas': () => this.initializeVendas(),
            'estoque': () => this.initializeEstoque(),
            'financeiro': () => this.initializeFinanceiro(),
            'receitas': () => this.initializeReceitas(),
            'relatorios': () => this.initializeRelatorios()
        };

        if (moduleInitializers[moduleName]) {
            await moduleInitializers[moduleName]();
        }
    }

    async initializeDashboard() {
        await this.loadVendasRecentes();
        await this.loadAlertasEstoque();
    }

    async loadVendasRecentes() {
        try {
            const { data: vendas, error } = await this.supabase
                .from('vendas')
                .select(`
                    *,
                    clientes(nome)
                `)
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
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Nenhuma venda recente</div>';
            }

        } catch (error) {
            console.error('Erro ao carregar vendas recentes:', error);
        }
    }

    async loadAlertasEstoque() {
        try {
            const { data: produtos, error } = await this.supabase
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
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Estoque em níveis normais</div>';
            }

        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
        }
    }

    async initializeClientes() {
        // Carregar script de clientes se existir
        if (typeof initClientes === 'function') {
            initClientes();
        } else {
            // Fallback básico
            console.log('Módulo de clientes carregado');
        }
    }

    async initializeVendas() {
        if (typeof initVendas === 'function') {
            initVendas();
        } else {
            console.log('Módulo de vendas carregado');
        }
    }

    async initializeEstoque() {
        if (typeof initEstoque === 'function') {
            initEstoque();
        } else {
            console.log('Módulo de estoque carregado');
            
            // Configurar tabs básicas
            setTimeout(() => {
                const tabBtns = document.querySelectorAll('.tab-btn');
                tabBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tabId = btn.getAttribute('data-tab');
                        
                        // Remover active de todas as tabs
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                        
                        // Adicionar active à tab clicada
                        btn.classList.add('active');
                        document.getElementById(`tab-${tabId}`).classList.add('active');
                    });
                });
            }, 100);
        }
    }

    async initializeFinanceiro() {
        if (typeof initFinanceiro === 'function') {
            initFinanceiro();
        } else {
            console.log('Módulo financeiro carregado');
        }
    }

    async initializeReceitas() {
        if (typeof initReceitas === 'function') {
            initReceitas();
        } else {
            console.log('Módulo de receitas carregado');
        }
    }

    async initializeRelatorios() {
        if (typeof initRelatorios === 'function') {
            initRelatorios();
        } else {
            console.log('Módulo de relatórios carregado');
        }
    }

    loadDashboard() {
        this.loadModule('dashboard');
    }

    showLoading() {
        const moduleContent = document.getElementById('module-content');
        if (moduleContent) {
            moduleContent.innerHTML = '<div class="loading">Carregando...</div>';
        }
    }

    hideLoading() {
        // Loading é automaticamente substituído pelo conteúdo
    }

    showError(message) {
        const moduleContent = document.getElementById('module-content');
        if (moduleContent) {
            moduleContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${message}</span>
                    <button class="btn btn-primary" onclick="dashboard.loadModule('dashboard')">
                        Voltar ao Dashboard
                    </button>
                </div>
            `;
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    updatePageTitle(moduleName) {
        const title = this.modules[moduleName] || 'Óticas Avelar';
        document.title = `${title} - Óticas Avelar`;
    }

    // Método para atualizar o dashboard quando dados mudarem
    refreshDashboard() {
        if (this.currentModule === 'dashboard') {
            this.loadDashboardStats();
            this.loadVendasRecentes();
            this.loadAlertasEstoque();
        }
    }
}

// Inicialização segura do dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que o Supabase está carregado
    setTimeout(() => {
        window.dashboard = new DashboardManager();
        
        // Configurar auto-refresh a cada 30 segundos
        setInterval(() => {
            if (window.dashboard) {
                window.dashboard.refreshDashboard();
            }
        }, 30000);
        
    }, 100);
});

// Funções globais para uso nos módulos
window.showSuccess = function(message) {
    alert('✅ ' + message);
};

window.showError = function(message) {
    alert('❌ ' + message);
};

window.showModal = function(content) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
};