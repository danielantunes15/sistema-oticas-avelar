// js/garantias.js - Sistema Completo de Garantias e Assistência
class GarantiasManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.tiposGarantia = {
            'armacao': ['6_meses', '12_meses', 'vitalicia'],
            'lente': ['6_meses', '12_meses', '24_meses'],
            'servico': ['30_dias', '90_dias'],
            'lente_contato': ['fabricante']
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadGarantias();
        this.loadEstatisticasGarantias();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovaGarantia = document.getElementById('btn-nova-garantia');
            const btnRelatorioGarantias = document.getElementById('btn-relatorio-garantias');
            const filtroStatus = document.getElementById('filtro-status-garantia');

            if (btnNovaGarantia) btnNovaGarantia.addEventListener('click', () => this.showFormGarantia());
            if (btnRelatorioGarantias) btnRelatorioGarantias.addEventListener('click', () => this.gerarRelatorioGarantias());
            if (filtroStatus) filtroStatus.addEventListener('change', (e) => this.filtrarGarantias(e.target.value));
        }, 100);
    }

    async loadGarantias() {
        try {
            const { data: garantias, error } = await this.supabase
                .from('garantias')
                .select(`
                    *,
                    clientes(nome, telefone),
                    vendas(numero_venda),
                    produtos(nome, marca)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            this.renderGarantiasTable(garantias);

        } catch (error) {
            console.error('Erro ao carregar garantias:', error);
            showError('Erro ao carregar garantias: ' + error.message);
        }
    }

    renderGarantiasTable(garantias) {
        const tbody = document.getElementById('garantias-body');
        if (!tbody) return;

        if (garantias && garantias.length > 0) {
            tbody.innerHTML = garantias.map(garantia => `
                <tr class="${this.isGarantiaVencida(garantia) ? 'garantia-vencida' : ''}">
                    <td>
                        <div class="garantia-info">
                            <strong>${garantia.clientes.nome}</strong>
                            <div class="garantia-detalhes">
                                <small>${garantia.produtos.nome} | Venda #${garantia.vendas.numero_venda}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="tipo-garantia ${garantia.tipo_produto}">
                            ${this.getTipoGarantiaLabel(garantia.tipo_garantia)}
                        </span>
                    </td>
                    <td>
                        <div class="periodo-garantia">
                            <div>Início: ${new Date(garantia.data_inicio).toLocaleDateString('pt-BR')}</div>
                            <div>Fim: ${new Date(garantia.data_fim).toLocaleDateString('pt-BR')}</div>
                        </div>
                    </td>
                    <td>
                        <span class="status-garantia ${garantia.status}">
                            ${this.getStatusGarantiaLabel(garantia.status)}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-info btn-sm" onclick="garantiasManager.verDetalhesGarantia('${garantia.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="garantiasManager.registrarOcorrencia('${garantia.id}')">
                                <i class="fas fa-tools"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="garantiasManager.estenderGarantia('${garantia.id}')">
                                <i class="fas fa-calendar-plus"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhuma garantia registrada</td>
                </tr>
            `;
        }
    }

    async loadEstatisticasGarantias() {
        try {
            const { data: garantias, error } = await this.supabase
                .from('garantias')
                .select('*');

            if (error) throw error;

            const estatisticas = this.calcularEstatisticasGarantias(garantias);
            this.renderEstatisticas(estatisticas);

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    renderEstatisticas(estatisticas) {
        const container = document.getElementById('estatisticas-garantias');
        if (!container) return;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #2196F3;">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${estatisticas.total_garantias}</h3>
                        <p>Total de Garantias</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #4CAF50;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${estatisticas.ativas}</h3>
                        <p>Garantias Ativas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #FF9800;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${estatisticas.vencidas}</h3>
                        <p>Garantias Vencidas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #F44336;">
                        <i class="fas fa-tools"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${estatisticas.ocorrencias_mes}</h3>
                        <p>Ocorrências Mês</p>
                    </div>
                </div>
            </div>
        `;
    }

    showFormGarantia(garantia = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>🛡️ ${garantia ? 'Editar' : 'Nova'} Garantia</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <form id="form-garantia">
                    <input type="hidden" id="garantia-id" value="${garantia?.id || ''}">
                    
                    <div class="form-section">
                        <h4>📋 Informações da Venda</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="garantia-venda-id">Venda *</label>
                                <select id="garantia-venda-id" required>
                                    <option value="">Selecione uma venda...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="garantia-cliente-id">Cliente *</label>
                                <select id="garantia-cliente-id" required>
                                    <option value="">Selecione um cliente...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>🔧 Produto e Garantia</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="garantia-produto-id">Produto *</label>
                                <select id="garantia-produto-id" required>
                                    <option value="">Selecione um produto...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="garantia-tipo-produto">Tipo de Produto *</label>
                                <select id="garantia-tipo-produto" required>
                                    <option value="">Selecione...</option>
                                    <option value="armacao" ${garantia?.tipo_produto === 'armacao' ? 'selected' : ''}>Armação</option>
                                    <option value="lente" ${garantia?.tipo_produto === 'lente' ? 'selected' : ''}>Lente</option>
                                    <option value="lente_contato" ${garantia?.tipo_produto === 'lente_contato' ? 'selected' : ''}>Lente de Contato</option>
                                    <option value="servico" ${garantia?.tipo_produto === 'servico' ? 'selected' : ''}>Serviço</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="garantia-tipo">Tipo de Garantia *</label>
                                <select id="garantia-tipo" required>
                                    <option value="">Selecione...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="garantia-duracao">Duração (meses)</label>
                                <input type="number" id="garantia-duracao" value="${garantia?.duracao_meses || ''}" min="1" max="120">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>⏰ Período da Garantia</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="garantia-data-inicio">Data de Início *</label>
                                <input type="date" id="garantia-data-inicio" value="${garantia?.data_inicio || new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-group">
                                <label for="garantia-data-fim">Data de Término *</label>
                                <input type="date" id="garantia-data-fim" value="${garantia?.data_fim || ''}" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>📝 Termos e Condições</h4>
                        <div class="form-group">
                            <label for="garantia-termos">Termos da Garantia</label>
                            <textarea id="garantia-termos" rows="4">${garantia?.termos || this.gerarTermosPadrao()}</textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>🔍 Cobertura</h4>
                        <div class="cobertura-garantia">
                            <div class="form-check">
                                <input type="checkbox" id="garantia-cobre-quebras" ${garantia?.cobre_quebras ? 'checked' : ''}>
                                <label for="garantia-cobre-quebras">Cobre quebras</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="garantia-cobre-riscos" ${garantia?.cobre_riscos ? 'checked' : ''}>
                                <label for="garantia-cobre-riscos">Cobre riscos</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="garantia-cobre-defeitos" ${garantia?.cobre_defeitos ? 'checked' : ''}>
                                <label for="garantia-cobre-defeitos">Cobre defeitos de fabricação</label>
                            </div>
                            <div class="form-check">
                                <input type="checkbox" id="garantia-cobre-ajustes" ${garantia?.cobre_ajustes ? 'checked' : ''}>
                                <label for="garantia-cobre-ajustes">Cobre ajustes</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="garantia-observacoes">Observações</label>
                        <textarea id="garantia-observacoes" rows="3">${garantia?.observacoes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="garantiasManager.salvarGarantia()">Salvar Garantia</button>
            </div>
        `;

        showModal(modalContent);
        this.loadVendasSelect(garantia?.venda_id);
        this.loadClientesSelect(garantia?.cliente_id);
        this.loadProdutosSelect(garantia?.produto_id);
        
        // Configurar tipos de garantia dinâmicos
        const tipoProdutoSelect = document.getElementById('garantia-tipo-produto');
        const tipoGarantiaSelect = document.getElementById('garantia-tipo');
        
        tipoProdutoSelect.addEventListener('change', (e) => {
            this.carregarTiposGarantia(e.target.value, garantia?.tipo_garantia);
        });

        // Carregar tipos iniciais se já tiver tipo de produto
        if (garantia?.tipo_produto) {
            this.carregarTiposGarantia(garantia.tipo_produto, garantia.tipo_garantia);
        }

        // Configurar cálculo automático da data de término
        const dataInicioInput = document.getElementById('garantia-data-inicio');
        const dataFimInput = document.getElementById('garantia-data-fim');
        const duracaoInput = document.getElementById('garantia-duracao');
        
        dataInicioInput.addEventListener('change', () => this.calcularDataFim());
        duracaoInput.addEventListener('change', () => this.calcularDataFim());
    }

    async loadVendasSelect(vendaSelecionada = null) {
        try {
            const { data: vendas, error } = await this.supabase
                .from('vendas')
                .select('id, numero_venda, clientes(nome)')
                .order('numero_venda', { ascending: false })
                .limit(100);

            if (error) throw error;

            const select = document.getElementById('garantia-venda-id');
            if (select) {
                select.innerHTML = `
                    <option value="">Selecione uma venda...</option>
                    ${vendas.map(venda => `
                        <option value="${venda.id}" ${venda.id === vendaSelecionada ? 'selected' : ''}>
                            Venda #${venda.numero_venda} - ${venda.clientes?.nome || 'Cliente'}
                        </option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
        }
    }

    async loadClientesSelect(clienteSelecionado = null) {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('id, nome')
                .order('nome');

            if (error) throw error;

            const select = document.getElementById('garantia-cliente-id');
            if (select) {
                select.innerHTML = `
                    <option value="">Selecione um cliente...</option>
                    ${clientes.map(cliente => `
                        <option value="${cliente.id}" ${cliente.id === clienteSelecionado ? 'selected' : ''}>
                            ${cliente.nome}
                        </option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    async loadProdutosSelect(produtoSelecionado = null) {
        try {
            const { data: produtos, error } = await this.supabase
                .from('produtos')
                .select('id, nome, marca, categoria')
                .eq('ativo', true)
                .order('marca')
                .order('nome');

            if (error) throw error;

            const select = document.getElementById('garantia-produto-id');
            if (select) {
                select.innerHTML = `
                    <option value="">Selecione um produto...</option>
                    ${produtos.map(produto => `
                        <option value="${produto.id}" ${produto.id === produtoSelecionado ? 'selected' : ''}>
                            ${produto.marca} - ${produto.nome} (${this.getCategoriaLabel(produto.categoria)})
                        </option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    carregarTiposGarantia(tipoProduto, tipoSelecionado = null) {
        const select = document.getElementById('garantia-tipo');
        const tipos = this.tiposGarantia[tipoProduto] || [];

        select.innerHTML = `
            <option value="">Selecione...</option>
            ${tipos.map(tipo => `
                <option value="${tipo}" ${tipo === tipoSelecionado ? 'selected' : ''}>
                    ${this.getTipoGarantiaLabel(tipo)}
                </option>
            `).join('')}
        `;

        // Configurar duração padrão baseada no tipo
        if (tipos.length > 0 && !tipoSelecion