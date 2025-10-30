// js/produtos-especializado.js - Cadastro Completo para Ótica
class ProdutosEspecializadoManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.camposEspecificos = {
            'armacao': ['ponte', 'aro', 'haste', 'calibre', 'dm', 'material', 'tipo_lente', 'genero', 'faixa_etaria'],
            'lente': ['tipo_lente', 'tratamento', 'fotossensivel', 'filtro_azul', 'indice_refracao', 'material', 'design', 'protecao_uv'],
            'lente_contato': ['curva_base', 'diametro', 'raio', 'tipo_substituicao', 'material', 'conteudo_agua', 'transmissibilidade'],
            'acessorio': ['tipo_acessorio', 'compatibilidade', 'material', 'funcao'],
            'solucao': ['tipo_solucao', 'composicao', 'volume', 'indicacao']
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProdutos();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovoProduto = document.getElementById('btn-novo-produto-especializado');
            const categoriaSelect = document.getElementById('produto-categoria');
            const formProduto = document.getElementById('form-produto-especializado');

            if (btnNovoProduto) btnNovoProduto.addEventListener('click', () => this.showFormProduto());
            if (categoriaSelect) categoriaSelect.addEventListener('change', (e) => this.mostrarCamposEspecificos(e.target.value));
            if (formProduto) formProduto.addEventListener('submit', (e) => this.salvarProduto(e));
        }, 100);
    }

    async loadProdutos() {
        try {
            const { data: produtos, error } = await this.supabase
                .from('produtos')
                .select('*')
                .order('categoria')
                .order('nome');

            if (error) throw error;
            this.renderProdutosTable(produtos);

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.showError('Erro ao carregar produtos: ' + error.message);
        }
    }

    renderProdutosTable(produtos) {
        const tbody = document.getElementById('produtos-especializados-body');
        if (!tbody) return;

        if (produtos && produtos.length > 0) {
            tbody.innerHTML = produtos.map(produto => `
                <tr data-categoria="${produto.categoria}">
                    <td>
                        <strong>${produto.nome}</strong>
                        <div class="produto-detalhes">
                            <small>SKU: ${produto.sku} | ${produto.marca} | ${this.getCategoriaLabel(produto.categoria)}</small>
                        </div>
                    </td>
                    <td>${this.getCategoriaLabel(produto.categoria)}</td>
                    <td>
                        <span class="estoque-badge ${produto.estoque_atual <= produto.estoque_minimo ? 'critico' : 'normal'}">
                            ${produto.estoque_atual}
                        </span>
                    </td>
                    <td>R$ ${produto.preco_venda?.toFixed(2) || '0.00'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="produtosEspecializadoManager.editarProduto('${produto.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="produtosEspecializadoManager.verDetalhes('${produto.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="produtosEspecializadoManager.ajustarEstoque('${produto.id}')">
                            <i class="fas fa-boxes"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhum produto cadastrado</td>
                </tr>
            `;
        }
    }

    showFormProduto(produto = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${produto ? 'Editar' : 'Novo'} Produto - Ótica</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <form id="form-produto-especializado">
                    <input type="hidden" id="produto-id" value="${produto?.id || ''}">
                    
                    <div class="form-section">
                        <h4>📋 Informações Básicas</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="produto-categoria">Categoria *</label>
                                <select id="produto-categoria" required>
                                    <option value="">Selecione...</option>
                                    <option value="armacao" ${produto?.categoria === 'armacao' ? 'selected' : ''}>Armação</option>
                                    <option value="lente" ${produto?.categoria === 'lente' ? 'selected' : ''}>Lente</option>
                                    <option value="lente_contato" ${produto?.categoria === 'lente_contato' ? 'selected' : ''}>Lente de Contato</option>
                                    <option value="acessorio" ${produto?.categoria === 'acessorio' ? 'selected' : ''}>Acessório</option>
                                    <option value="solucao" ${produto?.categoria === 'solucao' ? 'selected' : ''}>Solução</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="produto-sku">SKU *</label>
                                <input type="text" id="produto-sku" value="${produto?.sku || ''}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="produto-nome">Nome do Produto *</label>
                                <input type="text" id="produto-nome" value="${produto?.nome || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="produto-marca">Marca *</label>
                                <input type="text" id="produto-marca" value="${produto?.marca || ''}" required>
                            </div>
                        </div>
                    </div>

                    <!-- Campos Específicos Dinâmicos -->
                    <div id="campos-especificos"></div>

                    <div class="form-section">
                        <h4>💰 Informações Financeiras</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="produto-preco-custo">Preço de Custo</label>
                                <input type="number" id="produto-preco-custo" step="0.01" value="${produto?.preco_custo || 0}">
                            </div>
                            <div class="form-group">
                                <label for="produto-preco-venda">Preço de Venda</label>
                                <input type="number" id="produto-preco-venda" step="0.01" value="${produto?.preco_venda || 0}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>📦 Controle de Estoque</h4>
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
                    </div>

                    <div class="form-group">
                        <label for="produto-observacoes">Observações</label>
                        <textarea id="produto-observacoes" rows="3">${produto?.observacoes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="produtosEspecializadoManager.salvarProduto()">Salvar Produto</button>
            </div>
        `;

        showModal(modalContent);

        // Configurar campos específicos
        const categoriaSelect = document.getElementById('produto-categoria');
        if (categoriaSelect) {
            categoriaSelect.addEventListener('change', (e) => this.mostrarCamposEspecificos(e.target.value, produto));
            // Mostrar campos iniciais se já tiver categoria
            if (produto?.categoria) {
                this.mostrarCamposEspecificos(produto.categoria, produto);
            }
        }
    }

    mostrarCamposEspecificos(categoria, produto = null) {
        const container = document.getElementById('campos-especificos');
        if (!container) return;

        const campos = this.camposEspecificos[categoria] || [];
        
        if (campos.length > 0) {
            container.innerHTML = `
                <div class="form-section">
                    <h4>🔧 Especificações Técnicas - ${this.getCategoriaLabel(categoria)}</h4>
                    <div class="form-row">
                        ${campos.map(campo => `
                            <div class="form-group">
                                <label for="produto-${campo}">${this.formatarLabel(campo)}</label>
                                <input type="text" id="produto-${campo}" 
                                       value="${produto?.[campo] || ''}" 
                                       placeholder="${this.getPlaceholder(campo, categoria)}">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    }

    async salvarProduto() {
        const form = document.getElementById('form-produto-especializado');
        if (!form) return;

        const categoria = document.getElementById('produto-categoria').value;
        const camposEspecificos = this.camposEspecificos[categoria] || [];

        // Dados básicos
        const produtoData = {
            sku: document.getElementById('produto-sku').value,
            nome: document.getElementById('produto-nome').value,
            categoria: categoria,
            marca: document.getElementById('produto-marca').value,
            preco_custo: parseFloat(document.getElementById('produto-preco-custo').value) || 0,
            preco_venda: parseFloat(document.getElementById('produto-preco-venda').value) || 0,
            estoque_atual: parseInt(document.getElementById('produto-estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('produto-estoque-minimo').value) || 0,
            observacoes: document.getElementById('produto-observacoes').value,
            ativo: true
        };

        // Adicionar campos específicos
        camposEspecificos.forEach(campo => {
            const valor = document.getElementById(`produto-${campo}`)?.value;
            if (valor) produtoData[campo] = valor;
        });

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

            showSuccess('Produto salvo com sucesso!');
            document.querySelector('.modal').remove();
            this.loadProdutos();

        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            showError('Erro ao salvar produto: ' + error.message);
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
            showError('Erro ao carregar dados do produto');
        }
    }

    async verDetalhes(produtoId) {
        try {
            const { data: produto, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('id', produtoId)
                .single();

            if (error) throw error;

            const modalContent = `
                <div class="modal-header">
                    <h3>Detalhes do Produto</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="produto-detalhes-completo">
                        <h4>${produto.nome}</h4>
                        <div class="detalhes-grid">
                            <div class="detalhe-item">
                                <label>SKU:</label>
                                <span>${produto.sku}</span>
                            </div>
                            <div class="detalhe-item">
                                <label>Categoria:</label>
                                <span>${this.getCategoriaLabel(produto.categoria)}</span>
                            </div>
                            <div class="detalhe-item">
                                <label>Marca:</label>
                                <span>${produto.marca}</span>
                            </div>
                            <div class="detalhe-item">
                                <label>Preço Venda:</label>
                                <span>R$ ${produto.preco_venda?.toFixed(2)}</span>
                            </div>
                            <div class="detalhe-item">
                                <label>Estoque:</label>
                                <span class="${produto.estoque_atual <= produto.estoque_minimo ? 'estoque-critico' : 'estoque-normal'}">
                                    ${produto.estoque_atual} unidades
                                </span>
                            </div>
                        </div>
                        
                        ${this.gerarDetalhesEspecificos(produto)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="produtosEspecializadoManager.editarProduto('${produto.id}')">
                        Editar Produto
                    </button>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            showError('Erro ao carregar detalhes do produto');
        }
    }

    gerarDetalhesEspecificos(produto) {
        const campos = this.camposEspecificos[produto.categoria] || [];
        const camposPreenchidos = campos.filter(campo => produto[campo]);

        if (camposPreenchidos.length === 0) return '';

        return `
            <div class="especificacoes-tecnicas">
                <h5>Especificações Técnicas</h5>
                <div class="detalhes-grid">
                    ${camposPreenchidos.map(campo => `
                        <div class="detalhe-item">
                            <label>${this.formatarLabel(campo)}:</label>
                            <span>${produto[campo]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async ajustarEstoque(produtoId) {
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
                    <div class="estoque-atual">
                        <p>Estoque Atual: <strong>${produto.estoque_atual}</strong></p>
                        <p>Estoque Mínimo: <strong>${produto.estoque_minimo}</strong></p>
                    </div>
                    
                    <form id="form-ajuste-estoque">
                        <input type="hidden" id="ajuste-produto-id" value="${produto.id}">
                        
                        <div class="form-group">
                            <label for="ajuste-tipo">Tipo de Ajuste</label>
                            <select id="ajuste-tipo">
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                                <option value="ajuste">Ajuste para valor específico</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="ajuste-quantidade">Quantidade</label>
                            <input type="number" id="ajuste-quantidade" value="0" min="0" required>
                        </div>

                        <div class="form-group">
                            <label for="ajuste-motivo">Motivo</label>
                            <input type="text" id="ajuste-motivo" placeholder="Ex: Inventário, Devolução, Perda..." required>
                        </div>

                        <div class="form-group">
                            <label for="ajuste-observacoes">Observações</label>
                            <textarea id="ajuste-observacoes" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="produtosEspecializadoManager.executarAjusteEstoque()">Aplicar Ajuste</button>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar produto:', error);
            showError('Erro ao carregar dados do produto');
        }
    }

    async executarAjusteEstoque() {
        const produtoId = document.getElementById('ajuste-produto-id').value;
        const tipo = document.getElementById('ajuste-tipo').value;
        const quantidade = parseInt(document.getElementById('ajuste-quantidade').value);
        const motivo = document.getElementById('ajuste-motivo').value;
        const observacoes = document.getElementById('ajuste-observacoes').value;

        if (!quantidade || quantidade < 0) {
            showError('Informe uma quantidade válida!');
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

            showSuccess('Estoque ajustado com sucesso!');
            document.querySelector('.modal').remove();
            this.loadProdutos();

        } catch (error) {
            console.error('Erro ao ajustar estoque:', error);
            showError('Erro ao ajustar estoque: ' + error.message);
        }
    }

    // Métodos auxiliares
    getCategoriaLabel(categoria) {
        const labels = {
            'armacao': 'Armação',
            'lente': 'Lente',
            'lente_contato': 'Lente de Contato',
            'acessorio': 'Acessório',
            'solucao': 'Solução'
        };
        return labels[categoria] || categoria;
    }

    formatarLabel(campo) {
        return campo.split('_')
            .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
            .join(' ');
    }

    getPlaceholder(campo, categoria) {
        const placeholders = {
            'armacao': {
                'ponte': 'Ex: 18, 20, 22',
                'aro': 'Ex: 50, 52, 54',
                'haste': 'Ex: 140, 145, 150',
                'material': 'Ex: Acetato, Metal, TR90'
            },
            'lente': {
                'indice_refracao': 'Ex: 1.50, 1.60, 1.67',
                'material': 'Ex: Resina, Policarbonato',
                'protecao_uv': 'Ex: UV400'
            },
            'lente_contato': {
                'curva_base': 'Ex: 8.4, 8.6, 8.8',
                'diametro': 'Ex: 14.0, 14.2, 14.4'
            }
        };
        
        return placeholders[categoria]?.[campo] || '';
    }
}

// Inicializar quando o módulo for carregado
let produtosEspecializadoManager = null;

function initProdutosEspecializado() {
    produtosEspecializadoManager = new ProdutosEspecializadoManager();
    window.produtosEspecializadoManager = produtosEspecializadoManager;
}