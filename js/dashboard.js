// js/dashboard.js - Sistema "Core" de Roteamento e Módulos
class DashboardManager {
    constructor() {
        this.currentModule = 'dashboard';
        this.supabase = window.supabaseClient;
        this.loadedScripts = new Set(); // Controla scripts já carregados

        // Mapeamento de módulos para seus respectivos arquivos HTML (em partials/) e JS (em js/)
        this.moduleConfig = {
            'dashboard': { html: 'partials/dashboard.html', js: 'js/dashboard-module.js', init: 'initDashboardModule' },
            'clientes': { html: 'partials/clientes.html', js: 'js/clientes.js', init: 'initClientes' },
            'vendas': { html: 'partials/vendas.html', js: 'js/vendas.js', init: 'initVendas' },
            'estoque': { html: 'partials/estoque.html', js: 'js/estoque.js', init: 'initEstoque' },
            'financeiro': { html: 'partials/financeiro.html', js: 'js/financeiro.js', init: 'initFinanceiro' },
            'receitas': { html: 'partials/receitas.html', js: 'js/receitas.js', init: 'initReceitas' },
            'laboratorio': { html: 'partials/laboratorio.html', js: 'js/laboratorio-completo.js', init: 'initLaboratorioCompleto' },
            'relatorios': { html: 'partials/relatorios.html', js: 'js/relatorios.js', init: 'initRelatorios' },
            
            // Módulos adicionados
            'produtos_especializados': { html: 'partials/produtos_especializados.html', js: 'js/produtos-especializado.js', init: 'initProdutosEspecializado' },
            'ordens_servico': { html: 'partials/ordens_servico.html', js: 'js/laboratorio-completo.js', init: 'initLaboratorioCompleto' }, // Reutiliza JS
            'etapas_os': { html: 'partials/etapas_os.html', js: 'js/laboratorio-completo.js', init: 'initLaboratorioCompleto' }, // Reutiliza JS
            
            // INÍCIO NOVOS MÓDULOS
            'orcamentos': { html: 'partials/orcamentos.html', js: 'js/orcamentos.js', init: 'initOrcamentos' },
            'cadastros': { html: 'partials/cadastros.html', js: 'js/cadastros.js', init: 'initCadastros' }
            // FIM NOVOS MÓDULOS
            
            // (Adicione outros JS se necessário)
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadModule('dashboard'); // Carrega o dashboard inicial
    }

    bindEvents() {
        const navItems = document.querySelectorAll('.nav-item');
        const menuToggle = document.querySelector('.menu-toggle');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e);
            });
        });

        // Lógica do Sidebar (movida de volta para cá)
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
    }

    handleNavigation(event) {
        const navItem = event.currentTarget;
        const moduleName = navItem.getAttribute('data-module');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        navItem.classList.add('active');
        
        this.loadModule(moduleName);
    }

    async loadModule(moduleName) {
        if (!this.moduleConfig[moduleName]) {
            console.error(`Módulo "${moduleName}" não configurado.`);
            this.showError(`Módulo "${moduleName}" não encontrado.`);
            return;
        }

        this.currentModule = moduleName;
        
        try {
            this.showLoading();
            
            const config = this.moduleConfig[moduleName];

            // 1. Carregar o HTML
            const content = await this.fetchModuleHTML(config.html);
            document.getElementById('module-content').innerHTML = content;
            
            // 2. Carregar o Script (se não foi carregado antes)
            await this.loadModuleScript(config.js);

            // 3. Inicializar o módulo (chama a função init...() específica)
            if (config.init && typeof window[config.init] === 'function') {
                window[config.init]();
            } else if (config.js) {
                console.warn(`Função de inicialização ${config.init} não encontrada para ${moduleName}.`);
            }
            
            this.updatePageTitle(moduleName);
            
        } catch (error) {
            console.error('Erro ao carregar módulo:', error);
            this.showError(`Erro ao carregar módulo ${moduleName}`);
        }
    }

    async fetchModuleHTML(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Arquivo não encontrado: ${path}`);
            }
            return response.text();
        } catch (error) {
            console.error(`Erro ao carregar view HTML:`, error);
            return `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Falha ao carregar a visualização ${path}.</div>`;
        }
    }

    async loadModuleScript(path) {
        if (!path || this.loadedScripts.has(path)) {
            // Se o script não existe (só HTML) ou já foi carregado, não faz nada
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            
            script.onload = () => {
                console.log(`Script ${path} carregado.`);
                this.loadedScripts.add(path);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`Falha ao carregar script: ${path}`);
                reject(new Error(`Falha ao carregar script: ${path}`));
            };
            
            document.body.appendChild(script);
        });
    }

    showLoading() {
        const moduleContent = document.getElementById('module-content');
        if (moduleContent) {
            moduleContent.innerHTML = '<div class="loading">Carregando...</div>';
        }
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
        // Títulos para o <title> da página
        const titles = {
            'dashboard': 'Dashboard',
            'clientes': 'Clientes',
            'vendas': 'Vendas',
            'estoque': 'Estoque',
            'financeiro': 'Financeiro',
            'receitas': 'Receitas',
            'laboratorio': 'Laboratório',
            'produtos_especializados': 'Produtos',
            'ordens_servico': 'Ordens de Serviço',
            'etapas_os': 'Etapas O.S.',
            'orcamentos': 'Orçamentos',
            'cadastros': 'Cadastros',
            'relatorios': 'Relatórios'
        };
        const title = titles[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
        document.title = `${title} - Óticas Avelar`;
    }
}

// Inicialização segura do dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar para garantir que o Supabase está carregado
    setTimeout(() => {
        if (!window.supabaseClient) {
            console.error("Falha ao inicializar o Supabase!");
            return;
        }
        window.dashboard = new DashboardManager();
    }, 100);
});


// Funções globais para uso nos módulos (Modal Helpers)
window.showSuccess = function(message) {
    alert('✅ ' + (message || "Operação realizada com sucesso!"));
};

window.showError = function(message) {
    alert('❌ ' + (message || "Ocorreu um erro."));
};

window.showModal = function(content) {
    // Remove qualquer modal antigo
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar no fundo escuro
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Adiciona funcionalidade ao btn-close (se existir no 'content')
    const btnClose = modal.querySelector('.btn-close');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    return modal;
};