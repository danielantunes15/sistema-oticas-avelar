// estoque.js - Controle Completo de Estoque
class EstoqueManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProdutos();
        this.loadMovimentacoes();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovoProduto = document.getElementById('btn-novo-produto');
            const btnAjustarEstoque = document.getElementById('btn-ajustar-estoque');
            const filtroCategoria = document.getElementById('filtro-categoria');

            if (btnNovoProduto) btnNovoProduto.addEventListener('click', () => this.showFormProduto());
            if (btnAjustarEstoque) btnAjustarEstoque.addEventListener('click', () => this.showAjusteEstoque());
            if (filtroCategoria) filtroCategoria.addEventListener('change', (e) => this.filtrarProdutos(e.target.value));
        }, 100);
    }

    async loadProdutos() {
        try {
            const { data: produtos, error } = await this.supabase
                .from('produtos')
                .select('*')
                .order('nome');

            if (error) throw error;
            this.renderProdutosTable(produtos);

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.showError('Erro ao carregar produtos: ' + error.message);
        }
    }

    renderProdutosTable(produtos) {
        const tbody = document.getElementById('estoque-table-body');
        if (!tbody) return;

        if (produtos && produtos.length > 0) {
            tbody.innerHTML = produtos.map(produto => `
                <tr class="${produto.estoque_atual < produto.estoque_minimo ? 'estoque-baixo' : ''}">
                    <td>
                        <strong>${produto.nome}</strong>
                        <div class="produto-info">
                            <small>SKU: ${produto.sku} | ${produto.marca} | ${produto.cor || 'N/A'}</small>
                        </div>
                    </td>
                    <td>${produto.categoria}</td>
                    <td>
                        <span class="estoque-quantidade ${produto.estoque_atual < produto.estoque_minimo ? 'critico' : ''}">
                            ${produto.estoque_atual}
                        </span>
                        ${produto.estoque_atual < produto.estoque_minimo ? 
                          '<span class="estoque-alerta">⚠️</span>' : ''}
                    </td>
                    <td>${produto.estoque_minimo}</td>
                    <td>R$ ${produto.preco_custo.toFixed(2)}</td>
                    <td>R$ ${produto.preco_venda.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="estoqueManager.editarProduto('${produto.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="estoqueManager.verMovimentacoes('${produto.id}')">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="estoqueManager.ajustarEstoqueProduto('${produto.id}')">
                            <i class="fas fa-cogs"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">Nenhum produto cadastrado</td>
                </tr>
            `;
        }
    }

    async loadMovimentacoes() {
        try {
            const { data: movimentacoes, error } = await this.supabase
                .from('estoque_movimentacoes')
                .select(`
                    *,
                    produtos(nome, sku)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            this.renderMovimentacoesTable(movimentacoes);

        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
        }
    }

    renderMovimentacoesTable(movimentacoes) {
        const tbody = document.getElementById('movimentacoes-table-body');
        if (!tbody) return;

        if (movimentacoes && movimentacoes.length > 0) {
            tbody.innerHTML = movimentacoes.map(mov => `
                <tr>
                    <td>
                        <strong>${mov.produtos.nome}</strong>
                        <div><small>SKU: ${mov.produtos.sku}</small></div>
                    </td>
                    <td>
                        <span class="movimentacao-tipo ${mov.tipo}">${mov.tipo.toUpperCase()}</span>
                    </td>
                    <td>${mov.quantidade}</td>
                    <td>${mov.saldo_anterior} → ${mov.saldo_atual}</td>
                    <td>${mov.motivo}</td>
                    <td>${new Date(mov.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Nenhuma movimentação registrada</td>
                </tr>
            `;
        }
    }

    showFormProduto(produto = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${produto ? 'Editar' : 'Novo'} Produto</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-produto">
                    <input type="hidden" id="produto-id" value="${produto?.id || ''}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="produto-sku">SKU *</label>
                            <input type="text" id="produto-sku" value="${produto?.sku || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="produto-nome">Nome *</label>
                            <input type="text" id="produto-nome" value="${produto?.nome || ''}" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="produto-categoria">Categoria</label>
                            <select id="produto-categoria">
                                <option value="armacao" ${produto?.categoria === 'armacao' ? 'selected' : ''}>Armação</option>
                                <option value="lente" ${produto?.categoria === 'lente' ? 'selected' : ''}>Lente</option>
                                <option value="acessorio" ${produto?.categoria === 'acessorio' ? 'selected' : ''}>Acessório</option>
                                <option value="solucao" ${produto?.categoria === 'solucao' ? 'selected' : ''}>Solução</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="produto-marca">Marca</label>
                            <input type="text" id="produto-marca" value="${produto?.marca || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="produto-cor">Cor</label>
                            <input type="text" id="produto-cor" value="${produto?.cor || ''}">
                        </div>
                        <div class="form-group">
                            <label for="produto-material">Material</label>
                            <input type="text" id="produto-material" value="${produto?.material || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="produto-preco-custo">Preço Custo</label>
                            <input type="number" id="produto-preco-custo" step="0.01" value="${produto?.preco_custo || 0}">
                        </div>
                        <div class="form-group">
                            <label for="produto-preco-venda">Preço Venda</label>
                            <input type="number" id="produto-preco-venda" step="0.01" value="${produto?.preco_venda || 0}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="produto-estoque-atual">Estoque Atual</label>
                            <input type="number" id="produto-estoque-atual" value="${produto?.estoque_atual || 0}">
                        </div>
                        <div class="form-group">
                            <label for="produto-estoque-minimo">Estoque Mínimo</label>
                            <input type="number" id="produto-estoque-minimo" value="${produto?.estoque_minimo || 0}">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="estoqueManager.salvarProduto()">Salvar Produto</button>
            </div>
        `;

        this.showModal(modalContent);
    }

    async salvarProduto() {
        const form = document.getElementById('form-produto');
        if (!form) return;

        const produtoData = {
            sku: document.getElementById('produto-sku').value,
            nome: document.getElementById('produto-nome').value,
            categoria: document.getElementById('produto-categoria').value,
            marca: document.getElementById('produto-marca').value,
            cor: document.getElementById('produto-cor').value,
            material: document.getElementById('produto-material').value,
            preco_custo: parseFloat(document.getElementById('produto-preco-custo').value) || 0,
            preco_venda: parseFloat(document.getElementById('produto-preco-venda').value) || 0,
            estoque_atual: parseInt(document.getElementById('produto-estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('produto-estoque-minimo').value) || 0,
            ativo: true
        };

        const produtoId = document.getElementById('produto-id').value;

        try {
            let error;
            if (produtoId) {
                const { data, error: updateError } = await this.supabase
                    .from('produtos')
                    .update(produtoData)
                    .eq('id', produtoId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('produtos')
                    .insert([produtoData]);
                error = insertError;
            }

            if (error) throw error;

            this.showSuccess('Produto salvo com sucesso!');
            document.querySelector('.modal').remove();
            this.loadProdutos();

        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            this.showError('Erro ao salvar produto: ' + error.message);
        }
    }

    async editarProduto(produtoId) {
        try {
            const { data: produto, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('id', produtoId)
                .single();

            if (error) throw error;
            this.showFormProduto(produto);

        } catch (error) {
            console.error('Erro ao carregar produto:', error);
            this.showError('Erro ao carregar dados do produto');
        }
    }

    async ajustarEstoqueProduto(produtoId) {
        try {
            const { data: produto, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('id', produtoId)
                .single();

            if (error) throw error;

            const modalContent = `
                <div class="modal-header">
                    <h3>Ajustar Estoque - ${produto.nome}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="estoque-info">
                        <p>Estoque Atual: <strong>${produto.estoque_atual}</strong></p>
                    </div>
                    
                    <form id="form-ajuste-estoque">
                        <input type="hidden" id="ajuste-produto-id" value="${produto.id}">
                        
                        <div class="form-group">
                            <label for="ajuste-tipo">Tipo de Ajuste</label>
                            <select id="ajuste-tipo">
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                                <option value="ajuste">Ajuste</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="ajuste-quantidade">Quantidade</label>
                            <input type="number" id="ajuste-quantidade" value="0" min="0" required>
                        </div>

                        <div class="form-group">
                            <label for="ajuste-motivo">Motivo</label>
                            <select id="ajuste-motivo">
                                <option value="inventario">Inventário</option>
                                <option value="ajuste">Ajuste</option>
                                <option value="devolucao">Devolução</option>
                                <option value="perda">Perda</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="ajuste-observacoes">Observações</label>
                            <textarea id="ajuste-observacoes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="estoqueManager.executarAjusteEstoque()">Aplicar Ajuste</button>
                </div>
            `;

            this.showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar produto:', error);
            this.showError('Erro ao carregar dados do produto');
        }
    }

    async executarAjusteEstoque() {
        const produtoId = document.getElementById('ajuste-produto-id').value;
        const tipo = document.getElementById('ajuste-tipo').value;
        const quantidade = parseInt(document.getElementById('ajuste-quantidade').value);
        const motivo = document.getElementById('ajuste-motivo').value;
        const observacoes = document.getElementById('ajuste-observacoes').value;

        if (!quantidade || quantidade < 0) {
            this.showError('Informe uma quantidade válida!');
            return;
        }

        try {
            // Obter estoque atual
            const { data: produto, error } = await this.supabase
                .from('produtos')
                .select('estoque_atual')
                .eq('id', produtoId)
                .single();

            if (error) throw error;

            let novaQuantidade = produto.estoque_atual;
            if (tipo === 'entrada') {
                novaQuantidade += quantidade;
            } else if (tipo === 'saida') {
                novaQuantidade -= quantidade;
            } else if (tipo === 'ajuste') {
                novaQuantidade = quantidade;
            }

            // Atualizar produto
            const { error: updateError } = await this.supabase
                .from('produtos')
                .update({ estoque_atual: novaQuantidade })
                .eq('id', produtoId);

            if (updateError) throw updateError;

            // Registrar movimentação
            const { error: movError } = await this.supabase
                .from('estoque_movimentacoes')
                .insert([{
                    produto_id: produtoId,
                    tipo: tipo,
                    quantidade: tipo === 'ajuste' ? Math.abs(novaQuantidade - produto.estoque_atual) : quantidade,
                    saldo_anterior: produto.estoque_atual,
                    saldo_atual: novaQuantidade,
                    motivo: motivo,
                    observacoes: observacoes
                }]);

            if (movError) throw movError;

            this.showSuccess('Estoque ajustado com sucesso!');
            document.querySelector('.modal').remove();
            this.loadProdutos();
            this.loadMovimentacoes();

        } catch (error) {
            console.error('Erro ao ajustar estoque:', error);
            this.showError('Erro ao ajustar estoque: ' + error.message);
        }
    }

    verMovimentacoes(produtoId) {
        // Focar na aba de movimentações e filtrar por produto
        const abaMovimentacoes = document.querySelector('[data-tab="movimentacoes"]');
        if (abaMovimentacoes) {
            abaMovimentacoes.click();
            // Poderia adicionar filtro específico para o produto
        }
    }

    filtrarProdutos(categoria) {
        const tbody = document.getElementById('estoque-table-body');
        const rows = tbody.getElementsByTagName('tr');

        for (let row of rows) {
            const categoriaCell = row.cells[1];
            if (categoria === 'todos' || categoriaCell.textContent === categoria) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
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
let estoqueManager = null;

function initEstoque() {
    estoqueManager = new EstoqueManager();
    window.estoqueManager = estoqueManager;
}