// js/orcamentos.js - Sistema de Orçamentos
class OrcamentosManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.carrinho = [];
        this.clienteSelecionadoId = null;
        this.totalOrcamento = 0;
        this.produtos = [];
        this.clientes = [];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadClientes();
        await this.loadProdutos();
        this.atualizarOrcamentoDisplay();
    }

    bindEvents() {
        setTimeout(() => {
            const btnSalvar = document.getElementById('btn-salvar-orcamento');
            const buscaProduto = document.getElementById('busca-produto-orcamento');
            const selectCliente = document.getElementById('orcamento-cliente-id');

            if (btnSalvar) btnSalvar.addEventListener('click', () => this.salvarOrcamento());
            if (buscaProduto) buscaProduto.addEventListener('input', (e) => this.buscarProdutos(e.target.value));
            if (selectCliente) selectCliente.addEventListener('change', (e) => {
                this.clienteSelecionadoId = e.target.value;
            });
        }, 100);
    }

    async loadProdutos() {
        try {
            const { data: produtos, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('ativo', true)
                .order('nome');
            if (error) throw error;
            this.produtos = produtos || [];
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    async loadClientes() {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('id, nome')
                .order('nome');
            if (error) throw error;
            this.clientes = clientes || [];
            
            const select = document.getElementById('orcamento-cliente-id');
            if (select) {
                select.innerHTML = '<option value="">Selecione um cliente...</option>';
                select.innerHTML += this.clientes.map(cliente => 
                    `<option value="${cliente.id}">${cliente.nome}</option>`
                ).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    buscarProdutos(termo) {
        const container = document.getElementById('resultados-busca-orcamento');
        if (!container) return;

        if (!termo) {
            container.innerHTML = '<div class="empty-state">Digite para buscar produtos</div>';
            return;
        }

        const termoBusca = termo.toLowerCase();
        const resultados = this.produtos.filter(p => 
            p.nome.toLowerCase().includes(termoBusca) || 
            (p.marca && p.marca.toLowerCase().includes(termoBusca)) ||
            (p.sku && p.sku.toLowerCase().includes(termoBusca))
        ).slice(0, 10); // Limita a 10 resultados

        if (resultados.length > 0) {
            container.innerHTML = resultados.map(produto => `
                <div class="produto-item" onclick="orcamentosManager.adicionarAoOrcamento('${produto.id}')">
                    <div class="produto-info">
                        <strong>${produto.nome}</strong>
                        <div class="produto-detalhes">
                            <span>${produto.marca || ''} - ${produto.cor || ''}</span>
                            <span class="produto-preco">R$ ${produto.preco_venda.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">Nenhum produto encontrado</div>';
        }
    }

    adicionarAoOrcamento(produtoId) {
        const produto = this.produtos.find(p => p.id === produtoId);
        if (!produto) return;

        const itemExistente = this.carrinho.find(item => item.produto_id === produtoId);
        
        if (itemExistente) {
            itemExistente.quantidade += 1;
            itemExistente.subtotal = itemExistente.quantidade * itemExistente.preco_unitario;
        } else {
            this.carrinho.push({
                produto_id: produto.id,
                nome: produto.nome,
                preco_unitario: produto.preco_venda,
                quantidade: 1,
                subtotal: produto.preco_venda
            });
        }
        this.atualizarOrcamentoDisplay();
    }

    removerDoOrcamento(index) {
        this.carrinho.splice(index, 1);
        this.atualizarOrcamentoDisplay();
    }

    atualizarQuantidade(index, novaQuantidade) {
        if (novaQuantidade < 1) {
            this.removerDoOrcamento(index);
            return;
        }
        const item = this.carrinho[index];
        item.quantidade = novaQuantidade;
        item.subtotal = item.quantidade * item.preco_unitario;
        this.atualizarOrcamentoDisplay();
    }

    atualizarOrcamentoDisplay() {
        this.totalOrcamento = this.carrinho.reduce((total, item) => total + item.subtotal, 0);
        
        const carrinhoContainer = document.getElementById('orcamento-itens');
        const totalElement = document.getElementById('total-orcamento');

        if (carrinhoContainer) {
            if (this.carrinho.length > 0) {
                carrinhoContainer.innerHTML = this.carrinho.map((item, index) => `
                    <div class="carrinho-item">
                        <div class="item-info">
                            <strong>${item.nome}</strong>
                            <div class="item-preco">R$ ${item.preco_unitario.toFixed(2)}</div>
                        </div>
                        <div class="item-controles">
                            <button class="btn-qtd" onclick="orcamentosManager.atualizarQuantidade(${index}, ${item.quantidade - 1})">-</button>
                            <span class="item-quantidade">${item.quantidade}</span>
                            <button class="btn-qtd" onclick="orcamentosManager.atualizarQuantidade(${index}, ${item.quantidade + 1})">+</button>
                            <button class="btn-remover" onclick="orcamentosManager.removerDoOrcamento(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="item-subtotal">
                            R$ ${item.subtotal.toFixed(2)}
                        </div>
                    </div>
                `).join('');
            } else {
                carrinhoContainer.innerHTML = '<div class="empty-state">Nenhum item adicionado</div>';
            }
        }

        if (totalElement) {
            totalElement.textContent = `R$ ${this.totalOrcamento.toFixed(2)}`;
        }
    }

    async salvarOrcamento() {
        if (this.carrinho.length === 0) {
            showError('Adicione produtos ao orçamento!');
            return;
        }
        if (!this.clienteSelecionadoId) {
            showError('Selecione um cliente para o orçamento!');
            return;
        }

        try {
            // 1. Criar o orçamento (assumindo tabela 'orcamentos')
            const { data: orcamento, error: orcamentoError } = await this.supabase
                .from('orcamentos')
                .insert([{
                    cliente_id: this.clienteSelecionadoId,
                    total: this.totalOrcamento,
                    status: 'pendente', // 'pendente', 'aprovado', 'rejeitado'
                    data_validade: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Validade de 7 dias
                }])
                .select()
                .single();

            if (orcamentoError) throw orcamentoError;

            // 2. Criar os itens do orçamento (assumindo tabela 'orcamento_itens')
            const itensOrcamento = this.carrinho.map(item => ({
                orcamento_id: orcamento.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                subtotal: item.subtotal
            }));

            const { error: itensError } = await this.supabase
                .from('orcamento_itens')
                .insert(itensOrcamento);

            if (itensError) throw itensError;

            showSuccess(`Orçamento #${orcamento.id} salvo com sucesso!`);
            this.limparOrcamento();

        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            showError('Erro ao salvar orçamento: ' + error.message);
        }
    }

    limparOrcamento() {
        this.carrinho = [];
        this.clienteSelecionadoId = null;
        this.totalOrcamento = 0;
        document.getElementById('orcamento-cliente-id').value = "";
        this.atualizarOrcamentoDisplay();
    }
}

// Inicializador
function initOrcamentos() {
    window.orcamentosManager = new OrcamentosManager();
}