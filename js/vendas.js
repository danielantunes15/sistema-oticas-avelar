// vendas.js - Sistema de PDV Completo
class VendasManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.carrinho = [];
        this.clienteSelecionado = null;
        this.totalVenda = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProdutos();
        this.atualizarCarrinho();
    }

    bindEvents() {
        setTimeout(() => {
            const btnAddProduto = document.getElementById('btn-add-produto');
            const btnFinalizarVenda = document.getElementById('btn-finalizar-venda');
            const buscaProduto = document.getElementById('busca-produto');

            if (btnAddProduto) btnAddProduto.addEventListener('click', () => this.showSelecaoProduto());
            if (btnFinalizarVenda) btnFinalizarVenda.addEventListener('click', () => this.finalizarVenda());
            if (buscaProduto) buscaProduto.addEventListener('input', (e) => this.buscarProdutos(e.target.value));
        }, 100);
    }

    async loadProdutos() {
        try {
            const { data: produtos, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('ativo', true)
                .gt('estoque_atual', 0)
                .order('nome');

            if (error) throw error;
            this.produtos = produtos || [];

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    async buscarProdutos(termo) {
        if (!termo) return;

        try {
            const { data: produtos, error } = await this.supabase
                .from('produtos')
                .select('*')
                .or(`nome.ilike.%${termo}%,sku.ilike.%${termo}%,marca.ilike.%${termo}%`)
                .eq('ativo', true)
                .limit(10);

            if (error) throw error;
            this.mostrarResultadosBusca(produtos);

        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        }
    }

    mostrarResultadosBusca(produtos) {
        const container = document.getElementById('resultados-busca');
        if (!container) return;

        if (produtos && produtos.length > 0) {
            container.innerHTML = produtos.map(produto => `
                <div class="produto-item" onclick="vendasManager.adicionarAoCarrinho('${produto.id}')">
                    <div class="produto-info">
                        <strong>${produto.nome}</strong>
                        <div class="produto-detalhes">
                            <span>${produto.marca} - ${produto.cor || ''}</span>
                            <span class="produto-preco">R$ ${produto.preco_venda.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="produto-estoque">
                        Estoque: ${produto.estoque_atual}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">Nenhum produto encontrado</div>';
        }
    }

    adicionarAoCarrinho(produtoId) {
        const produto = this.produtos.find(p => p.id === produtoId);
        if (!produto) return;

        const itemExistente = this.carrinho.find(item => item.produto_id === produtoId);
        
        if (itemExistente) {
            if (itemExistente.quantidade >= produto.estoque_atual) {
                this.showError('Estoque insuficiente!');
                return;
            }
            itemExistente.quantidade += 1;
            itemExistente.subtotal = itemExistente.quantidade * itemExistente.preco_unitario;
        } else {
            this.carrinho.push({
                produto_id: produto.id,
                nome: produto.nome,
                preco_unitario: produto.preco_venda,
                quantidade: 1,
                subtotal: produto.preco_venda,
                estoque_disponivel: produto.estoque_atual
            });
        }

        this.atualizarCarrinho();
        this.fecharSelecaoProduto();
    }

    removerDoCarrinho(index) {
        this.carrinho.splice(index, 1);
        this.atualizarCarrinho();
    }

    atualizarQuantidade(index, novaQuantidade) {
        if (novaQuantidade < 1) {
            this.removerDoCarrinho(index);
            return;
        }

        const item = this.carrinho[index];
        if (novaQuantidade > item.estoque_disponivel) {
            this.showError('Quantidade maior que estoque disponível!');
            return;
        }

        item.quantidade = novaQuantidade;
        item.subtotal = item.quantidade * item.preco_unitario;
        this.atualizarCarrinho();
    }

    atualizarCarrinho() {
        this.totalVenda = this.carrinho.reduce((total, item) => total + item.subtotal, 0);
        
        // Atualizar display do carrinho
        const carrinhoContainer = document.getElementById('carrinho-itens');
        const totalElement = document.getElementById('total-venda');

        if (carrinhoContainer) {
            if (this.carrinho.length > 0) {
                carrinhoContainer.innerHTML = this.carrinho.map((item, index) => `
                    <div class="carrinho-item">
                        <div class="item-info">
                            <strong>${item.nome}</strong>
                            <div class="item-preco">R$ ${item.preco_unitario.toFixed(2)}</div>
                        </div>
                        <div class="item-controles">
                            <button class="btn-qtd" onclick="vendasManager.atualizarQuantidade(${index}, ${item.quantidade - 1})">-</button>
                            <span class="item-quantidade">${item.quantidade}</span>
                            <button class="btn-qtd" onclick="vendasManager.atualizarQuantidade(${index}, ${item.quantidade + 1})">+</button>
                            <button class="btn-remover" onclick="vendasManager.removerDoCarrinho(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="item-subtotal">
                            R$ ${item.subtotal.toFixed(2)}
                        </div>
                    </div>
                `).join('');
            } else {
                carrinhoContainer.innerHTML = '<div class="empty-state">Carrinho vazio</div>';
            }
        }

        if (totalElement) {
            totalElement.textContent = `R$ ${this.totalVenda.toFixed(2)}`;
        }
    }

    async finalizarVenda() {
        if (this.carrinho.length === 0) {
            this.showError('Adicione produtos ao carrinho!');
            return;
        }

        try {
            // Criar venda
            const { data: venda, error: vendaError } = await this.supabase
                .from('vendas')
                .insert([{
                    cliente_id: this.clienteSelecionado?.id || null,
                    subtotal: this.totalVenda,
                    desconto: 0,
                    total: this.totalVenda,
                    forma_pagamento: 'dinheiro',
                    status: 'concluida'
                }])
                .select()
                .single();

            if (vendaError) throw vendaError;

            // Criar itens da venda
            const itensVenda = this.carrinho.map(item => ({
                venda_id: venda.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                subtotal: item.subtotal
            }));

            const { error: itensError } = await this.supabase
                .from('venda_itens')
                .insert(itensVenda);

            if (itensError) throw itensError;

            // Atualizar estoque
            for (const item of this.carrinho) {
                await this.atualizarEstoque(item.produto_id, -item.quantidade, 'venda', venda.id);
            }

            this.showSuccess(`Venda #${venda.numero_venda} finalizada com sucesso!`);
            this.limparCarrinho();

        } catch (error) {
            console.error('Erro ao finalizar venda:', error);
            this.showError('Erro ao finalizar venda: ' + error.message);
        }
    }

    async atualizarEstoque(produtoId, quantidade, motivo, referencia = null) {
        try {
            // Obter estoque atual
            const { data: produto, error } = await this.supabase
                .from('produtos')
                .select('estoque_atual')
                .eq('id', produtoId)
                .single();

            if (error) throw error;

            const novoEstoque = produto.estoque_atual + quantidade;

            // Atualizar produto
            const { error: updateError } = await this.supabase
                .from('produtos')
                .update({ estoque_atual: novoEstoque })
                .eq('id', produtoId);

            if (updateError) throw updateError;

            // Registrar movimentação
            const { error: movError } = await this.supabase
                .from('estoque_movimentacoes')
                .insert([{
                    produto_id: produtoId,
                    tipo: quantidade > 0 ? 'entrada' : 'saida',
                    quantidade: Math.abs(quantidade),
                    saldo_anterior: produto.estoque_atual,
                    saldo_atual: novoEstoque,
                    motivo: motivo,
                    observacoes: referencia ? `Venda #${referencia}` : null
                }]);

            if (movError) throw movError;

        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            throw error;
        }
    }

    limparCarrinho() {
        this.carrinho = [];
        this.clienteSelecionado = null;
        this.totalVenda = 0;
        this.atualizarCarrinho();
    }

    showSelecaoProduto() {
        const modalContent = `
            <div class="modal-header">
                <h3>Selecionar Produto</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <input type="text" id="busca-produto-modal" placeholder="Buscar produto..." 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                <div id="resultados-busca-modal" style="max-height: 400px; overflow-y: auto; margin-top: 15px;"></div>
            </div>
        `;

        this.showModal(modalContent);

        // Configurar busca
        const buscaInput = document.getElementById('busca-produto-modal');
        buscaInput.addEventListener('input', (e) => {
            this.buscarProdutosParaModal(e.target.value);
        });
    }

    async buscarProdutosParaModal(termo) {
        try {
            const { data: produtos, error } = await this.supabase
                .from('produtos')
                .select('*')
                .or(`nome.ilike.%${termo}%,sku.ilike.%${termo}%`)
                .eq('ativo', true)
                .gt('estoque_atual', 0)
                .limit(20);

            if (error) throw error;

            const container = document.getElementById('resultados-busca-modal');
            if (container) {
                if (produtos && produtos.length > 0) {
                    container.innerHTML = produtos.map(produto => `
                        <div class="produto-item-modal" onclick="vendasManager.adicionarAoCarrinho('${produto.id}')">
                            <div class="produto-info">
                                <strong>${produto.nome}</strong>
                                <div class="produto-detalhes">
                                    <span>${produto.marca} • ${produto.cor || 'N/A'} • Estoque: ${produto.estoque_atual}</span>
                                    <span class="produto-preco">R$ ${produto.preco_venda.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<div class="empty-state">Nenhum produto encontrado</div>';
                }
            }

        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        }
    }

    fecharSelecaoProduto() {
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
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
let vendasManager = null;

function initVendas() {
    vendasManager = new VendasManager();
    window.vendasManager = vendasManager;
}