// js/fornecedores.js - Sistema Completo de Gestão de Fornecedores
class FornecedoresManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.categoriasFornecedores = [
            'fabricante_armacoes',
            'laboratorio_lentes', 
            'distribuidor_lentes_contato',
            'equipamentos_oftalmicos',
            'produtos_limpeza',
            'acessorios',
            'solucoes_lentes_contato',
            'servicos_terceirizados'
        ];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFornecedores();
        this.loadAvaliacoes();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovoFornecedor = document.getElementById('btn-novo-fornecedor');
            const btnRelatorioFornecedores = document.getElementById('btn-relatorio-fornecedores');
            const filtroCategoria = document.getElementById('filtro-categoria-fornecedor');

            if (btnNovoFornecedor) btnNovoFornecedor.addEventListener('click', () => this.showFormFornecedor());
            if (btnRelatorioFornecedores) btnRelatorioFornecedores.addEventListener('click', () => this.gerarRelatorioFornecedores());
            if (filtroCategoria) filtroCategoria.addEventListener('change', (e) => this.filtrarFornecedores(e.target.value));
        }, 100);
    }

    async loadFornecedores() {
        try {
            const { data: fornecedores, error } = await this.supabase
                .from('fornecedores')
                .select(`
                    *,
                    compras(total),
                    avaliacoes_fornecedor(nota)
                `)
                .order('nome');

            if (error) throw error;
            this.renderFornecedoresTable(fornecedores);

        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            showError('Erro ao carregar fornecedores: ' + error.message);
        }
    }

    renderFornecedoresTable(fornecedores) {
        const tbody = document.getElementById('fornecedores-body');
        if (!tbody) return;

        if (fornecedores && fornecedores.length > 0) {
            tbody.innerHTML = fornecedores.map(fornecedor => `
                <tr>
                    <td>
                        <div class="fornecedor-info">
                            <strong>${fornecedor.nome}</strong>
                            <div class="fornecedor-detalhes">
                                <small>${this.getCategoriaLabel(fornecedor.categoria)} | 
                                ${fornecedor.contato_nome || 'Sem contato'} | 
                                ${fornecedor.cidade || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td>${this.getCategoriaLabel(fornecedor.categoria)}</td>
                    <td>
                        <div class="avaliacao-fornecedor">
                            ${this.renderStars(this.calcularMediaAvaliacao(fornecedor.avaliacoes_fornecedor))}
                            <span class="nota-media">${this.calcularMediaAvaliacao(fornecedor.avaliacoes_fornecedor).toFixed(1)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-fornecedor ${fornecedor.ativo ? 'ativo' : 'inativo'}">
                            ${fornecedor.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-primary btn-sm" onclick="fornecedoresManager.editarFornecedor('${fornecedor.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-info btn-sm" onclick="fornecedoresManager.verDetalhesFornecedor('${fornecedor.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="fornecedoresManager.avaliarFornecedor('${fornecedor.id}')">
                                <i class="fas fa-star"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="fornecedoresManager.novaCompra('${fornecedor.id}')">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhum fornecedor cadastrado</td>
                </tr>
            `;
        }
    }

    showFormFornecedor(fornecedor = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${fornecedor ? 'Editar' : 'Novo'} Fornecedor</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <form id="form-fornecedor">
                    <input type="hidden" id="fornecedor-id" value="${fornecedor?.id || ''}">
                    
                    <div class="form-section">
                        <h4>🏢 Informações da Empresa</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-nome">Nome/Razão Social *</label>
                                <input type="text" id="fornecedor-nome" value="${fornecedor?.nome || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-categoria">Categoria *</label>
                                <select id="fornecedor-categoria" required>
                                    <option value="">Selecione...</option>
                                    ${this.categoriasFornecedores.map(cat => `
                                        <option value="${cat}" ${fornecedor?.categoria === cat ? 'selected' : ''}>
                                            ${this.getCategoriaLabel(cat)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-cnpj">CNPJ</label>
                                <input type="text" id="fornecedor-cnpj" value="${fornecedor?.cnpj || ''}" 
                                       placeholder="00.000.000/0000-00">
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-ie">Inscrição Estadual</label>
                                <input type="text" id="fornecedor-ie" value="${fornecedor?.inscricao_estadual || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>📞 Contato</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-contato-nome">Nome do Contato</label>
                                <input type="text" id="fornecedor-contato-nome" value="${fornecedor?.contato_nome || ''}">
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-telefone">Telefone *</label>
                                <input type="tel" id="fornecedor-telefone" value="${fornecedor?.telefone || ''}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-email">E-mail</label>
                                <input type="email" id="fornecedor-email" value="${fornecedor?.email || ''}">
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-site">Site</label>
                                <input type="url" id="fornecedor-site" value="${fornecedor?.site || ''}" placeholder="https://...">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>📍 Endereço</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-cep">CEP</label>
                                <input type="text" id="fornecedor-cep" value="${fornecedor?.cep || ''}" 
                                       placeholder="00000-000">
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-endereco">Endereço</label>
                                <input type="text" id="fornecedor-endereco" value="${fornecedor?.endereco || ''}">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-cidade">Cidade</label>
                                <input type="text" id="fornecedor-cidade" value="${fornecedor?.cidade || ''}">
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-estado">Estado</label>
                                <select id="fornecedor-estado">
                                    <option value="">Selecione...</option>
                                    ${this.getEstadosBrasil().map(estado => `
                                        <option value="${estado.sigla}" ${fornecedor?.estado === estado.sigla ? 'selected' : ''}>
                                            ${estado.nome}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>💰 Condições Comerciais</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-prazo-entrega">Prazo de Entrega (dias)</label>
                                <input type="number" id="fornecedor-prazo-entrega" value="${fornecedor?.prazo_entrega_medio || 0}" min="0">
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-condicao-pagamento">Condição de Pagamento</label>
                                <input type="text" id="fornecedor-condicao-pagamento" value="${fornecedor?.condicao_pagamento || ''}" 
                                       placeholder="Ex: 30/60/90 dias">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="fornecedor-frete">Política de Frete</label>
                                <select id="fornecedor-frete">
                                    <option value="">Selecione...</option>
                                    <option value="cif" ${fornecedor?.politica_frete === 'cif' ? 'selected' : ''}>CIF</option>
                                    <option value="fob" ${fornecedor?.politica_frete === 'fob' ? 'selected' : ''}>FOB</option>
                                    <option value="gratis" ${fornecedor?.politica_frete === 'gratis' ? 'selected' : ''}>Grátis</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="fornecedor-valor-minimo">Valor Mínimo Pedido</label>
                                <input type="number" id="fornecedor-valor-minimo" step="0.01" value="${fornecedor?.valor_minimo_pedido || 0}">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="fornecedor-observacoes">Observações</label>
                        <textarea id="fornecedor-observacoes" rows="3">${fornecedor?.observacoes || ''}</textarea>
                    </div>

                    <div class="form-check">
                        <input type="checkbox" id="fornecedor-ativo" ${fornecedor?.ativo !== false ? 'checked' : ''}>
                        <label for="fornecedor-ativo">Fornecedor ativo</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="fornecedoresManager.salvarFornecedor()">Salvar Fornecedor</button>
            </div>
        `;

        showModal(modalContent);

        // Configurar busca de CEP
        const cepInput = document.getElementById('fornecedor-cep');
        if (cepInput) {
            cepInput.addEventListener('blur', () => this.buscarCEP(cepInput.value));
        }
    }

    async salvarFornecedor() {
        const form = document.getElementById('form-fornecedor');
        if (!form) return;

        const fornecedorData = {
            nome: document.getElementById('fornecedor-nome').value,
            categoria: document.getElementById('fornecedor-categoria').value,
            cnpj: document.getElementById('fornecedor-cnpj').value || null,
            inscricao_estadual: document.getElementById('fornecedor-ie').value || null,
            contato_nome: document.getElementById('fornecedor-contato-nome').value || null,
            telefone: document.getElementById('fornecedor-telefone').value,
            email: document.getElementById('fornecedor-email').value || null,
            site: document.getElementById('fornecedor-site').value || null,
            cep: document.getElementById('fornecedor-cep').value || null,
            endereco: document.getElementById('fornecedor-endereco').value || null,
            cidade: document.getElementById('fornecedor-cidade').value || null,
            estado: document.getElementById('fornecedor-estado').value || null,
            prazo_entrega_medio: parseInt(document.getElementById('fornecedor-prazo-entrega').value) || null,
            condicao_pagamento: document.getElementById('fornecedor-condicao-pagamento').value || null,
            politica_frete: document.getElementById('fornecedor-frete').value || null,
            valor_minimo_pedido: parseFloat(document.getElementById('fornecedor-valor-minimo').value) || null,
            observacoes: document.getElementById('fornecedor-observacoes').value || null,
            ativo: document.getElementById('fornecedor-ativo').checked
        };

        const fornecedorId = document.getElementById('fornecedor-id').value;

        try {
            let error;
            if (fornecedorId) {
                const { data, error: updateError } = await this.supabase
                    .from('fornecedores')
                    .update(fornecedorData)
                    .eq('id', fornecedorId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('fornecedores')
                    .insert([fornecedorData]);
                error = insertError;
            }

            if (error) throw error;

            showSuccess('Fornecedor salvo com sucesso!');
            document.querySelector('.modal').remove();
            this.loadFornecedores();

        } catch (error) {
            console.error('Erro ao salvar fornecedor:', error);
            showError('Erro ao salvar fornecedor: ' + error.message);
        }
    }

    async editarFornecedor(fornecedorId) {
        try {
            const { data: fornecedor, error } = await this.supabase
                .from('fornecedores')
                .select('*')
                .eq('id', fornecedorId)
                .single();

            if (error) throw error;
            this.showFormFornecedor(fornecedor);

        } catch (error) {
            console.error('Erro ao carregar fornecedor:', error);
            showError('Erro ao carregar dados do fornecedor');
        }
    }

    async verDetalhesFornecedor(fornecedorId) {
        try {
            const { data: fornecedor, error } = await this.supabase
                .from('fornecedores')
                .select(`
                    *,
                    compras(data_compra, total, status),
                    avaliacoes_fornecedor(nota, comentario, data_avaliacao)
                `)
                .eq('id', fornecedorId)
                .single();

            if (error) throw error;

            const metricas = await this.calcularMetricasFornecedor(fornecedorId);

            const modalContent = `
                <div class="modal-header">
                    <h3>🏢 ${fornecedor.nome}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="fornecedor-detalhes-completo">
                        <!-- Informações Básicas -->
                        <div class="detalhes-section">
                            <h4>Informações da Empresa</h4>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Categoria:</label>
                                    <span>${this.getCategoriaLabel(fornecedor.categoria)}</span>
                                </div>
                                ${fornecedor.cnpj ? `
                                <div class="detalhe-item">
                                    <label>CNPJ:</label>
                                    <span>${fornecedor.cnpj}</span>
                                </div>
                                ` : ''}
                                <div class="detalhe-item">
                                    <label>Status:</label>
                                    <span class="status-fornecedor ${fornecedor.ativo ? 'ativo' : 'inativo'}">
                                        ${fornecedor.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Contato -->
                        <div class="detalhes-section">
                            <h4>Contato</h4>
                            <div class="detalhes-grid">
                                ${fornecedor.contato_nome ? `
                                <div class="detalhe-item">
                                    <label>Contato:</label>
                                    <span>${fornecedor.contato_nome}</span>
                                </div>
                                ` : ''}
                                <div class="detalhe-item">
                                    <label>Telefone:</label>
                                    <span>${fornecedor.telefone}</span>
                                </div>
                                ${fornecedor.email ? `
                                <div class="detalhe-item">
                                    <label>E-mail:</label>
                                    <span>${fornecedor.email}</span>
                                </div>
                                ` : ''}
                                ${fornecedor.site ? `
                                <div class="detalhe-item">
                                    <label>Site:</label>
                                    <span><a href="${fornecedor.site}" target="_blank">${fornecedor.site}</a></span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Métricas -->
                        <div class="detalhes-section">
                            <h4>📊 Métricas de Desempenho</h4>
                            <div class="metricas-fornecedor">
                                <div class="metrica-card">
                                    <div class="metrica-valor">${metricas.tempo_entrega_medio}</div>
                                    <div class="metrica-label">Dias para Entrega</div>
                                </div>
                                <div class="metrica-card">
                                    <div class="metrica-valor">${metricas.qualidade_produtos}/5</div>
                                    <div class="metrica-label">Qualidade</div>
                                </div>
                                <div class="metrica-card">
                                    <div class="metrica-valor">${metricas.suporte_tecnico}/5</div>
                                    <div class="metrica-label">Suporte</div>
                                </div>
                                <div class="metrica-card">
                                    <div class="metrica-valor">${metricas.total_compras}</div>
                                    <div class="metrica-label">Compras</div>
                                </div>
                            </div>
                        </div>

                        <!-- Avaliações -->
                        ${fornecedor.avaliacoes_fornecedor && fornecedor.avaliacoes_fornecedor.length > 0 ? `
                        <div class="detalhes-section">
                            <h4>⭐ Avaliações</h4>
                            <div class="avaliacoes-lista">
                                ${fornecedor.avaliacoes_fornecedor.map(avaliacao => `
                                    <div class="avaliacao-item">
                                        <div class="avaliacao-header">
                                            ${this.renderStars(avaliacao.nota)}
                                            <span class="avaliacao-data">${new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        ${avaliacao.comentario ? `
                                        <div class="avaliacao-comentario">${avaliacao.comentario}</div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Histórico de Compras -->
                        ${fornecedor.compras && fornecedor.compras.length > 0 ? `
                        <div class="detalhes-section">
                            <h4>🛒 Últimas Compras</h4>
                            <div class="compras-lista">
                                ${fornecedor.compras.slice(0, 5).map(compra => `
                                    <div class="compra-item">
                                        <div class="compra-data">${new Date(compra.data_compra).toLocaleDateString('pt-BR')}</div>
                                        <div class="compra-valor">R$ ${compra.total?.toFixed(2)}</div>
                                        <div class="compra-status ${compra.status}">${compra.status}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="fornecedoresManager.editarFornecedor('${fornecedor.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-warning" onclick="fornecedoresManager.avaliarFornecedor('${fornecedor.id}')">
                        <i class="fas fa-star"></i> Avaliar
                    </button>
                    <button class="btn btn-success" onclick="fornecedoresManager.novaCompra('${fornecedor.id}')">
                        <i class="fas fa-shopping-cart"></i> Nova Compra
                    </button>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar detalhes do fornecedor:', error);
            showError('Erro ao carregar detalhes do fornecedor');
        }
    }

    async avaliarFornecedor(fornecedorId) {
        const modalContent = `
            <div class="modal-header">
                <h3>⭐ Avaliar Fornecedor</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-avaliacao-fornecedor">
                    <input type="hidden" id="avaliacao-fornecedor-id" value="${fornecedorId}">
                    
                    <div class="form-group">
                        <label>Avaliação Geral</label>
                        <div class="rating-stars" id="rating-stars">
                            ${[1, 2, 3, 4, 5].map(star => `
                                <span class="star" data-rating="${star}">★</span>
                            `).join('')}
                        </div>
                        <input type="hidden" id="avaliacao-nota" value="0">
                    </div>

                    <div class="form-group">
                        <label for="avaliacao-criterio-qualidade">Qualidade dos Produtos</label>
                        <select id="avaliacao-criterio-qualidade">
                            <option value="5">Excelente</option>
                            <option value="4">Boa</option>
                            <option value="3">Regular</option>
                            <option value="2">Ruim</option>
                            <option value="1">Péssima</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="avaliacao-criterio-entrega">Prazo de Entrega</label>
                        <select id="avaliacao-criterio-entrega">
                            <option value="5">Sempre no prazo</option>
                            <option value="4">Quase sempre no prazo</option>
                            <option value="3">Às vezes atrasa</option>
                            <option value="2">Frequentemente atrasa</option>
                            <option value="1">Sempre atrasa</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="avaliacao-criterio-atendimento">Atendimento</label>
                        <select id="avaliacao-criterio-atendimento">
                            <option value="5">Excelente</option>
                            <option value="4">Bom</option>
                            <option value="3">Regular</option>
                            <option value="2">Ruim</option>
                            <option value="1">Péssimo</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="avaliacao-comentario">Comentários</label>
                        <textarea id="avaliacao-comentario" rows="3" placeholder="Compartilhe sua experiência com este fornecedor..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="fornecedoresManager.salvarAvaliacao()">Salvar Avaliação</button>
            </div>
        `;

        showModal(modalContent);

        // Configurar estrelas interativas
        const stars = document.querySelectorAll('.star');
        const notaInput = document.getElementById('avaliacao-nota');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                notaInput.value = rating;
                
                stars.forEach(s => {
                    if (parseInt(s.getAttribute('data-rating')) <= rating) {
                        s.classList.add('selected');
                    } else {
                        s.classList.remove('selected');
                    }
                });
            });
        });
    }

    async salvarAvaliacao() {
        const fornecedorId = document.getElementById('avaliacao-fornecedor-id').value;
        const nota = parseInt(document.getElementById('avaliacao-nota').value);
        const qualidade = parseInt(document.getElementById('avaliacao-criterio-qualidade').value);
        const entrega = parseInt(document.getElementById('avaliacao-criterio-entrega').value);
        const atendimento = parseInt(document.getElementById('avaliacao-criterio-atendimento').value);
        const comentario = document.getElementById('avaliacao-comentario').value;

        if (nota === 0) {
            showError('Por favor, selecione uma avaliação geral!');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('avaliacoes_fornecedor')
                .insert([{
                    fornecedor_id: fornecedorId,
                    nota: nota,
                    criterio_qualidade: qualidade,
                    criterio_entrega: entrega,
                    criterio_atendimento: atendimento,
                    comentario: comentario,
                    data_avaliacao: new Date().toISOString()
                }]);

            if (error) throw error;

            showSuccess('Avaliação salva com sucesso!');
            document.querySelector('.modal').remove();
            this.loadFornecedores();

        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
            showError('Erro ao salvar avaliação: ' + error.message);
        }
    }

    novaCompra(fornecedorId) {
        showSuccess(`Redirecionando para módulo de compras com fornecedor ${fornecedorId}`);
        // Em implementação completa, redirecionaria para o módulo de compras
    }

    async calcularMetricasFornecedor(fornecedorId) {
        // Métricas simuladas - em produção, calcularia com dados reais
        return {
            tempo_entrega_medio: Math.floor(Math.random() * 10) + 5,
            qualidade_produtos: (Math.random() * 2 + 3).toFixed(1),
            suporte_tecnico: (Math.random() * 2 + 3).toFixed(1),
            total_compras: Math.floor(Math.random() * 50) + 5
        };
    }

    async loadAvaliacoes() {
        // Carregar avaliações para cálculo de médias
    }

    async gerarRelatorioFornecedores() {
        try {
            const { data: fornecedores, error } = await this.supabase
                .from('fornecedores')
                .select(`
                    *,
                    avaliacoes_fornecedor(nota),
                    compras(total, data_compra)
                `)
                .eq('ativo', true);

            if (error) throw error;

            const relatorio = this.analisarDesempenhoFornecedores(fornecedores);
            this.mostrarRelatorioFornecedores(relatorio);

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            showError('Erro ao gerar relatório de fornecedores');
        }
    }

    analisarDesempenhoFornecedores(fornecedores) {
        return {
            total_fornecedores: fornecedores.length,
            fornecedores_ativos: fornecedores.filter(f => f.ativo).length,
            media_avaliacao_geral: this.calcularMediaGeral(fornecedores),
            melhor_fornecedor: this.identificarMelhorFornecedor(fornecedores),
            fornecedores_problema: this.identificarFornecedoresProblema(fornecedores),
            distribuicao_categorias: this.analisarDistribuicaoCategorias(fornecedores)
        };
    }

    mostrarRelatorioFornecedores(relatorio) {
        const modalContent = `
            <div class="modal-header">
                <h3>📊 Relatório de Fornecedores</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="relatorio-fornecedores">
                    <div class="metricas-grid">
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.total_fornecedores}</div>
                            <div class="metrica-label">Total de Fornecedores</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.fornecedores_ativos}</div>
                            <div class="metrica-label">Fornecedores Ativos</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.media_avaliacao_geral.toFixed(1)}/5</div>
                            <div class="metrica-label">Avaliação Média</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.fornecedores_problema.length}</div>
                            <div class="metrica-label">Com Problemas</div>
                        </div>
                    </div>

                    <div class="analise-detalhada">
                        <h4>🏆 Melhor Fornecedor</h4>
                        ${relatorio.melhor_fornecedor ? `
                        <div class="melhor-fornecedor">
                            <strong>${relatorio.melhor_fornecedor.nome}</strong>
                            <div class="avaliacao">${this.renderStars(relatorio.melhor_fornecedor.media_avaliacao)}</div>
                            <span class="categoria">${this.getCategoriaLabel(relatorio.melhor_fornecedor.categoria)}</span>
                        </div>
                        ` : '<p>Nenhum fornecedor com avaliação suficiente</p>'}

                        <h4>📈 Distribuição por Categoria</h4>
                        <div class="distribuicao-categorias">
                            ${Object.entries(relatorio.distribuicao_categorias).map(([categoria, quantidade]) => `
                                <div class="categoria-item">
                                    <span class="categoria-nome">${this.getCategoriaLabel(categoria)}</span>
                                    <span class="categoria-quantidade">${quantidade}</span>
                                </div>
                            `).join('')}
                        </div>

                        ${relatorio.fornecedores_problema.length > 0 ? `
                        <h4>⚠️ Fornecedores com Problemas</h4>
                        <div class="fornecedores-problema">
                            ${relatorio.fornecedores_problema.map(fornecedor => `
                                <div class="fornecedor-problema">
                                    <strong>${fornecedor.nome}</strong>
                                    <span class="problema">${fornecedor.problema}</span>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="window.print()">
                    <i class="fas fa-print"></i> Imprimir Relatório
                </button>
            </div>
        `;

        showModal(modalContent);
    }

    filtrarFornecedores(categoria) {
        const rows = document.querySelectorAll('#fornecedores-body tr');
        
        rows.forEach(row => {
            const categoriaCell = row.cells[1];
            if (categoria === 'todos' || categoriaCell.textContent === this.getCategoriaLabel(categoria)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Métodos auxiliares
    getCategoriaLabel(categoria) {
        const labels = {
            'fabricante_armacoes': 'Fabricante de Armações',
            'laboratorio_lentes': 'Laboratório de Lentes',
            'distribuidor_lentes_contato': 'Distribuidor Lentes Contato',
            'equipamentos_oftalmicos': 'Equipamentos Oftálmicos',
            'produtos_limpeza': 'Produtos de Limpeza',
            'acessorios': 'Acessórios',
            'solucoes_lentes_contato': 'Soluções Lentes Contato',
            'servicos_terceirizados': 'Serviços Terceirizados'
        };
        return labels[categoria] || categoria;
    }

    renderStars(nota) {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(nota)) {
                stars.push('<span class="star filled">★</span>');
            } else if (i === Math.ceil(nota) && nota % 1 > 0) {
                stars.push('<span class="star half">★</span>');
            } else {
                stars.push('<span class="star">★</span>');
            }
        }
        return stars.join('');
    }

    calcularMediaAvaliacao(avaliacoes) {
        if (!avaliacoes || avaliacoes.length === 0) return 0;
        const soma = avaliacoes.reduce((total, av) => total + av.nota, 0);
        return soma / avaliacoes.length;
    }

    getEstadosBrasil() {
        return [
            { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
            { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
            { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
            { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
            { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
            { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
            { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
            { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
            { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
        ];
    }

    async buscarCEP(cep) {
        if (!cep || cep.length !== 9) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('fornecedor-endereco').value = data.logradouro;
                document.getElementById('fornecedor-cidade').value = data.localidade;
                document.getElementById('fornecedor-estado').value = data.uf;
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        }
    }

    calcularMediaGeral(fornecedores) {
        const avaliacoes = fornecedores.flatMap(f => f.avaliacoes_fornecedor || []);
        if (avaliacoes.length === 0) return 0;
        return avaliacoes.reduce((sum, av) => sum + av.nota, 0) / avaliacoes.length;
    }

    identificarMelhorFornecedor(fornecedores) {
        const fornecedoresComAvaliacao = fornecedores.filter(f => 
            f.avaliacoes_fornecedor && f.avaliacoes_fornecedor.length >= 3
        );

        if (fornecedoresComAvaliacao.length === 0) return null;

        return fornecedoresComAvaliacao.reduce((melhor, atual) => {
            const mediaAtual = this.calcularMediaAvaliacao(atual.avaliacoes_fornecedor);
            const mediaMelhor = this.calcularMediaAvaliacao(melhor.avaliacoes_fornecedor);
            return mediaAtual > mediaMelhor ? atual : melhor;
        });
    }

    identificarFornecedoresProblema(fornecedores) {
        // Lógica simplificada para identificar fornecedores com problemas
        return fornecedores.filter(f => {
            const media = this.calcularMediaAvaliacao(f.avaliacoes_fornecedor);
            return media < 3 && f.avaliacoes_fornecedor && f.avaliacoes_fornecedor.length >= 2;
        }).map(f => ({
            nome: f.nome,
            problema: 'Avaliação baixa'
        }));
    }

    analisarDistribuicaoCategorias(fornecedores) {
        const distribuicao = {};
        fornecedores.forEach(f => {
            distribuicao[f.categoria] = (distribuicao[f.categoria] || 0) + 1;
        });
        return distribuicao;
    }
}

// Inicializar quando o módulo for carregado
let fornecedoresManager = null;

function initFornecedores() {
    fornecedoresManager = new FornecedoresManager();
    window.fornecedoresManager = fornecedoresManager;
}