// js/lentes-contato.js - Sistema Completo de Lentes de Contato
class LentesContatoManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.parametros = {
            tipos: ['gelatinosa', 'rigida', 'hibrida', 'escleral'],
            modalidades: ['descarte_diario', 'quinzenal', 'mensal', 'trimestral', 'anual'],
            cuidados: ['solucao_multipropose', 'peroxido', 'estojos', 'lubrificantes']
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadLentesContato();
        this.loadControlesPacientes();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovaLC = document.getElementById('btn-nova-lente-contato');
            const btnControlePaciente = document.getElementById('btn-novo-controle');
            const btnRelatorioLC = document.getElementById('btn-relatorio-lentes-contato');

            if (btnNovaLC) btnNovaLC.addEventListener('click', () => this.showFormLenteContato());
            if (btnControlePaciente) btnControlePaciente.addEventListener('click', () => this.showFormControlePaciente());
            if (btnRelatorioLC) btnRelatorioLC.addEventListener('click', () => this.gerarRelatorioLentesContato());
        }, 100);
    }

    async loadLentesContato() {
        try {
            const { data: lentes, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('categoria', 'lente_contato')
                .order('marca')
                .order('nome');

            if (error) throw error;
            this.renderLentesContatoTable(lentes);

        } catch (error) {
            console.error('Erro ao carregar lentes de contato:', error);
            showError('Erro ao carregar lentes de contato: ' + error.message);
        }
    }

    renderLentesContatoTable(lentes) {
        const tbody = document.getElementById('lentes-contato-body');
        if (!tbody) return;

        if (lentes && lentes.length > 0) {
            tbody.innerHTML = lentes.map(lente => `
                <tr>
                    <td>
                        <div class="lente-info">
                            <strong>${lente.nome}</strong>
                            <div class="lente-detalhes">
                                <small>${lente.marca} | ${lente.curva_base || 'N/A'} | ${lente.diametro || 'N/A'}</small>
                            </div>
                        </div>
                    </td>
                    <td>${this.getTipoLenteLabel(lente.tipo_substituicao)}</td>
                    <td>
                        <span class="estoque-lc ${lente.estoque_atual <= lente.estoque_minimo ? 'critico' : 'normal'}">
                            ${lente.estoque_atual}
                        </span>
                    </td>
                    <td>R$ ${lente.preco_venda?.toFixed(2) || '0.00'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-primary btn-sm" onclick="lentesContatoManager.editarLenteContato('${lente.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-info btn-sm" onclick="lentesContatoManager.verDetalhesLC('${lente.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="lentesContatoManager.venderLC('${lente.id}')">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="lentesContatoManager.controlarValidade('${lente.id}')">
                                <i class="fas fa-calendar-check"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhuma lente de contato cadastrada</td>
                </tr>
            `;
        }
    }

    async loadControlesPacientes() {
        try {
            const { data: controles, error } = await this.supabase
                .from('controles_lentes_contato')
                .select(`
                    *,
                    clientes(nome),
                    produtos(nome, marca)
                `)
                .order('data_proximo_controle', { ascending: true })
                .limit(20);

            if (error) throw error;
            this.renderControlesTable(controles);

        } catch (error) {
            console.error('Erro ao carregar controles:', error);
        }
    }

    renderControlesTable(controles) {
        const tbody = document.getElementById('controles-lc-body');
        if (!tbody) return;

        if (controles && controles.length > 0) {
            tbody.innerHTML = controles.map(controle => `
                <tr class="${this.isControleAtrasado(controle) ? 'controle-atrasado' : ''}">
                    <td>
                        <strong>${controle.clientes.nome}</strong>
                        <div class="controle-info">
                            <small>${controle.produtos.nome} | ${controle.produtos.marca}</small>
                        </div>
                    </td>
                    <td>${new Date(controle.data_ultima_compra).toLocaleDateString('pt-BR')}</td>
                    <td>${new Date(controle.data_proximo_controle).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <span class="status-controle ${controle.status}">
                            ${this.getStatusControleLabel(controle.status)}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-success btn-sm" onclick="lentesContatoManager.realizarControle('${controle.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="lentesContatoManager.reagendarControle('${controle.id}')">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhum controle agendado</td>
                </tr>
            `;
        }
    }

    showFormLenteContato(lente = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${lente ? 'Editar' : 'Nova'} Lente de Contato</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <form id="form-lente-contato">
                    <input type="hidden" id="lente-id" value="${lente?.id || ''}">
                    
                    <div class="form-section">
                        <h4>📋 Informações Básicas</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-nome">Nome do Produto *</label>
                                <input type="text" id="lente-nome" value="${lente?.nome || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="lente-marca">Marca *</label>
                                <input type="text" id="lente-marca" value="${lente?.marca || ''}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-sku">SKU *</label>
                                <input type="text" id="lente-sku" value="${lente?.sku || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="lente-tipo">Tipo de Lente *</label>
                                <select id="lente-tipo" required>
                                    <option value="">Selecione...</option>
                                    ${this.parametros.tipos.map(tipo => `
                                        <option value="${tipo}" ${lente?.tipo_lente === tipo ? 'selected' : ''}>
                                            ${this.getTipoLenteLabel(tipo)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>🔧 Especificações Técnicas</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-curva-base">Curva Base (BC)</label>
                                <input type="number" id="lente-curva-base" step="0.1" value="${lente?.curva_base || ''}" 
                                       placeholder="Ex: 8.4, 8.6, 8.8">
                            </div>
                            <div class="form-group">
                                <label for="lente-diametro">Diâmetro (DIA)</label>
                                <input type="number" id="lente-diametro" step="0.1" value="${lente?.diametro || ''}" 
                                       placeholder="Ex: 14.0, 14.2, 14.4">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-material">Material</label>
                                <input type="text" id="lente-material" value="${lente?.material || ''}" 
                                       placeholder="Ex: Hidrogel, Silicone Hidrogel">
                            </div>
                            <div class="form-group">
                                <label for="lente-conteudo-agua">Conteúdo de Água (%)</label>
                                <input type="number" id="lente-conteudo-agua" value="${lente?.conteudo_agua || ''}" min="0" max="100">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-substituicao">Substituição *</label>
                                <select id="lente-substituicao" required>
                                    <option value="">Selecione...</option>
                                    ${this.parametros.modalidades.map(modalidade => `
                                        <option value="${modalidade}" ${lente?.tipo_substituicao === modalidade ? 'selected' : ''}>
                                            ${this.getModalidadeLabel(modalidade)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="lente-transmissibilidade">Transmissibilidade (Dk/t)</label>
                                <input type="number" id="lente-transmissibilidade" step="0.1" value="${lente?.transmissibilidade || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>👁️ Graus Disponíveis</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-grau-min">Grau Mínimo (Esférico)</label>
                                <input type="number" id="lente-grau-min" step="0.25" value="${lente?.grau_minimo || ''}">
                            </div>
                            <div class="form-group">
                                <label for="lente-grau-max">Grau Máximo (Esférico)</label>
                                <input type="number" id="lente-grau-max" step="0.25" value="${lente?.grau_maximo || ''}">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-cilindro-min">Cilindro Mínimo</label>
                                <input type="number" id="lente-cilindro-min" step="0.25" value="${lente?.cilindro_minimo || ''}">
                            </div>
                            <div class="form-group">
                                <label for="lente-cilindro-max">Cilindro Máximo</label>
                                <input type="number" id="lente-cilindro-max" step="0.25" value="${lente?.cilindro_maximo || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>💰 Informações Comerciais</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-preco-custo">Preço de Custo</label>
                                <input type="number" id="lente-preco-custo" step="0.01" value="${lente?.preco_custo || 0}">
                            </div>
                            <div class="form-group">
                                <label for="lente-preco-venda">Preço de Venda</label>
                                <input type="number" id="lente-preco-venda" step="0.01" value="${lente?.preco_venda || 0}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>📦 Controle de Estoque</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-estoque-atual">Estoque Atual</label>
                                <input type="number" id="lente-estoque-atual" value="${lente?.estoque_atual || 0}">
                            </div>
                            <div class="form-group">
                                <label for="lente-estoque-minimo">Estoque Mínimo</label>
                                <input type="number" id="lente-estoque-minimo" value="${lente?.estoque_minimo || 0}">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="lente-validade">Validade (meses)</label>
                                <input type="number" id="lente-validade" value="${lente?.validade_meses || 24}" min="1" max="60">
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="lente-observacoes">Observações</label>
                        <textarea id="lente-observacoes" rows="3">${lente?.observacoes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="lentesContatoManager.salvarLenteContato()">Salvar Lente</button>
            </div>
        `;

        showModal(modalContent);
    }

    async salvarLenteContato() {
        const form = document.getElementById('form-lente-contato');
        if (!form) return;

        const lenteData = {
            nome: document.getElementById('lente-nome').value,
            marca: document.getElementById('lente-marca').value,
            sku: document.getElementById('lente-sku').value,
            categoria: 'lente_contato',
            tipo_lente: document.getElementById('lente-tipo').value,
            curva_base: document.getElementById('lente-curva-base').value || null,
            diametro: document.getElementById('lente-diametro').value || null,
            material: document.getElementById('lente-material').value || null,
            conteudo_agua: document.getElementById('lente-conteudo-agua').value ? parseInt(document.getElementById('lente-conteudo-agua').value) : null,
            tipo_substituicao: document.getElementById('lente-substituicao').value,
            transmissibilidade: document.getElementById('lente-transmissibilidade').value || null,
            grau_minimo: document.getElementById('lente-grau-min').value ? parseFloat(document.getElementById('lente-grau-min').value) : null,
            grau_maximo: document.getElementById('lente-grau-max').value ? parseFloat(document.getElementById('lente-grau-max').value) : null,
            cilindro_minimo: document.getElementById('lente-cilindro-min').value ? parseFloat(document.getElementById('lente-cilindro-min').value) : null,
            cilindro_maximo: document.getElementById('lente-cilindro-max').value ? parseFloat(document.getElementById('lente-cilindro-max').value) : null,
            preco_custo: parseFloat(document.getElementById('lente-preco-custo').value) || 0,
            preco_venda: parseFloat(document.getElementById('lente-preco-venda').value) || 0,
            estoque_atual: parseInt(document.getElementById('lente-estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('lente-estoque-minimo').value) || 0,
            validade_meses: parseInt(document.getElementById('lente-validade').value) || 24,
            observacoes: document.getElementById('lente-observacoes').value || null,
            ativo: true
        };

        const lenteId = document.getElementById('lente-id').value;

        try {
            let error;
            if (lenteId) {
                const { data, error: updateError } = await this.supabase
                    .from('produtos')
                    .update(lenteData)
                    .eq('id', lenteId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('produtos')
                    .insert([lenteData]);
                error = insertError;
            }

            if (error) throw error;

            showSuccess('Lente de contato salva com sucesso!');
            document.querySelector('.modal').remove();
            this.loadLentesContato();

        } catch (error) {
            console.error('Erro ao salvar lente de contato:', error);
            showError('Erro ao salvar lente de contato: ' + error.message);
        }
    }

    async editarLenteContato(lenteId) {
        try {
            const { data: lente, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('id', lenteId)
                .single();

            if (error) throw error;
            this.showFormLenteContato(lente);

        } catch (error) {
            console.error('Erro ao carregar lente de contato:', error);
            showError('Erro ao carregar dados da lente de contato');
        }
    }

    async verDetalhesLC(lenteId) {
        try {
            const { data: lente, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('id', lenteId)
                .single();

            if (error) throw error;

            const modalContent = `
                <div class="modal-header">
                    <h3>👁️ ${lente.nome}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="lente-detalhes-completo">
                        <div class="detalhes-section">
                            <h4>Informações do Produto</h4>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Marca:</label>
                                    <span>${lente.marca}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>SKU:</label>
                                    <span>${lente.sku}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Tipo:</label>
                                    <span>${this.getTipoLenteLabel(lente.tipo_lente)}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Substituição:</label>
                                    <span>${this.getModalidadeLabel(lente.tipo_substituicao)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detalhes-section">
                            <h4>Especificações Técnicas</h4>
                            <div class="detalhes-grid">
                                ${lente.curva_base ? `
                                <div class="detalhe-item">
                                    <label>Curva Base:</label>
                                    <span>${lente.curva_base}</span>
                                </div>
                                ` : ''}
                                ${lente.diametro ? `
                                <div class="detalhe-item">
                                    <label>Diâmetro:</label>
                                    <span>${lente.diametro}</span>
                                </div>
                                ` : ''}
                                ${lente.material ? `
                                <div class="detalhe-item">
                                    <label>Material:</label>
                                    <span>${lente.material}</span>
                                </div>
                                ` : ''}
                                ${lente.conteudo_agua ? `
                                <div class="detalhe-item">
                                    <label>Conteúdo de Água:</label>
                                    <span>${lente.conteudo_agua}%</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <div class="detalhes-section">
                            <h4>Graus Disponíveis</h4>
                            <div class="detalhes-grid">
                                ${lente.grau_minimo || lente.grau_maximo ? `
                                <div class="detalhe-item">
                                    <label>Esférico:</label>
                                    <span>${lente.grau_minimo || ''} a ${lente.grau_maximo || ''}</span>
                                </div>
                                ` : ''}
                                ${lente.cilindro_minimo || lente.cilindro_maximo ? `
                                <div class="detalhe-item">
                                    <label>Cilíndrico:</label>
                                    <span>${lente.cilindro_minimo || ''} a ${lente.cilindro_maximo || ''}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <div class="detalhes-section">
                            <h4>Informações Comerciais</h4>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Preço de Venda:</label>
                                    <span>R$ ${lente.preco_venda?.toFixed(2)}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Estoque:</label>
                                    <span class="${lente.estoque_atual <= lente.estoque_minimo ? 'estoque-critico' : 'estoque-normal'}">
                                        ${lente.estoque_atual} unidades
                                    </span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Validade:</label>
                                    <span>${lente.validade_meses} meses</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="lentesContatoManager.editarLenteContato('${lente.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-success" onclick="lentesContatoManager.venderLC('${lente.id}')">
                        <i class="fas fa-shopping-cart"></i> Vender
                    </button>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar detalhes da lente:', error);
            showError('Erro ao carregar detalhes da lente de contato');
        }
    }

    venderLC(lenteId) {
        showSuccess(`Redirecionando para venda da lente ${lenteId}`);
        // Em implementação completa, redirecionaria para o PDV com a lente pré-selecionada
    }

    async controlarValidade(lenteId) {
        try {
            const { data: lente, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('id', lenteId)
                .single();

            if (error) throw error;

            const modalContent = `
                <div class="modal-header">
                    <h3>📅 Controle de Validade - ${lente.nome}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="controle-validade">
                        <div class="info-validade">
                            <p><strong>Validade do Produto:</strong> ${lente.validade_meses} meses</p>
                            <p><strong>Estoque Atual:</strong> ${lente.estoque_atual} unidades</p>
                        </div>

                        <form id="form-controle-validade">
                            <input type="hidden" id="controle-lente-id" value="${lente.id}">
                            
                            <div class="form-group">
                                <label for="controle-lote">Número do Lote</label>
                                <input type="text" id="controle-lote" required>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="controle-data-fabricacao">Data de Fabricação</label>
                                    <input type="date" id="controle-data-fabricacao" required>
                                </div>
                                <div class="form-group">
                                    <label for="controle-data-validade">Data de Validade</label>
                                    <input type="date" id="controle-data-validade" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="controle-quantidade">Quantidade no Lote</label>
                                <input type="number" id="controle-quantidade" value="${lente.estoque_atual}" min="1" required>
                            </div>

                            <div class="form-group">
                                <label for="controle-observacoes">Observações</label>
                                <textarea id="controle-observacoes" rows="3" placeholder="Observações sobre o lote..."></textarea>
                            </div>
                        </form>

                        <div class="alerta-validade" id="alerta-validade"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="lentesContatoManager.registrarControleValidade()">Registrar Controle</button>
                </div>
            `;

            showModal(modalContent);

            // Configurar cálculo automático da validade
            const dataFabricacaoInput = document.getElementById('controle-data-fabricacao');
            const dataValidadeInput = document.getElementById('controle-data-validade');
            
            dataFabricacaoInput.addEventListener('change', () => {
                if (dataFabricacaoInput.value) {
                    const fabricacao = new Date(dataFabricacaoInput.value);
                    const validade = new Date(fabricacao);
                    validade.setMonth(validade.getMonth() + lente.validade_meses);
                    dataValidadeInput.value = validade.toISOString().split('T')[0];
                    this.verificarAlertaValidade(validade);
                }
            });

        } catch (error) {
            console.error('Erro ao carregar lente:', error);
            showError('Erro ao carregar dados da lente');
        }
    }

    verificarAlertaValidade(dataValidade) {
        const alertaDiv = document.getElementById('alerta-validade');
        const hoje = new Date();
        const diferencaMs = dataValidade - hoje;
        const diferencaDias = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));

        if (diferencaDias < 0) {
            alertaDiv.innerHTML = `
                <div class="alerta-vencido">
                    <i class="fas fa-exclamation-triangle"></i>
                    LOTE VENCIDO! ${Math.abs(diferencaDias)} dias de atraso
                </div>
            `;
        } else if (diferencaDias < 30) {
            alertaDiv.innerHTML = `
                <div class="alerta-proximo">
                    <i class="fas fa-exclamation-circle"></i>
                    Vence em ${diferencaDias} dias
                </div>
            `;
        } else {
            alertaDiv.innerHTML = `
                <div class="alerta-ok">
                    <i class="fas fa-check-circle"></i>
                    Validade OK - Vence em ${diferencaDias} dias
                </div>
            `;
        }
    }

    async registrarControleValidade() {
        const lenteId = document.getElementById('controle-lente-id').value;
        const lote = document.getElementById('controle-lote').value;
        const dataFabricacao = document.getElementById('controle-data-fabricacao').value;
        const dataValidade = document.getElementById('controle-data-validade').value;
        const quantidade = parseInt(document.getElementById('controle-quantidade').value);
        const observacoes = document.getElementById('controle-observacoes').value;

        try {
            const { error } = await this.supabase
                .from('controles_validade_lc')
                .insert([{
                    produto_id: lenteId,
                    numero_lote: lote,
                    data_fabricacao: dataFabricacao,
                    data_validade: dataValidade,
                    quantidade_lote: quantidade,
                    observacoes: observacoes,
                    data_controle: new Date().toISOString()
                }]);

            if (error) throw error;

            showSuccess('Controle de validade registrado com sucesso!');
            document.querySelector('.modal').remove();

        } catch (error) {
            console.error('Erro ao registrar controle:', error);
            showError('Erro ao registrar controle de validade: ' + error.message);
        }
    }

    showFormControlePaciente(controle = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>👤 ${controle ? 'Editar' : 'Novo'} Controle de Paciente</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-controle-paciente">
                    <input type="hidden" id="controle-id" value="${controle?.id || ''}">
                    
                    <div class="form-section">
                        <h4>Paciente e Produto</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="controle-cliente-id">Paciente *</label>
                                <select id="controle-cliente-id" required>
                                    <option value="">Selecione um paciente...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="controle-produto-id">Lente de Contato *</label>
                                <select id="controle-produto-id" required>
                                    <option value="">Selecione uma lente...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Datas do Controle</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="controle-data-ultima-compra">Última Compra</label>
                                <input type="date" id="controle-data-ultima-compra" value="${controle?.data_ultima_compra || ''}">
                            </div>
                            <div class="form-group">
                                <label for="controle-data-proximo">Próximo Controle *</label>
                                <input type="date" id="controle-data-proximo" value="${controle?.data_proximo_controle || ''}" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Informações do Uso</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="controle-frequencia">Frequência de Uso</label>
                                <select id="controle-frequencia">
                                    <option value="">Selecione...</option>
                                    <option value="diario" ${controle?.frequencia_uso === 'diario' ? 'selected' : ''}>Diário</option>
                                    <option value="alternado" ${controle?.frequencia_uso === 'alternado' ? 'selected' : ''}>Dias Alternados</option>
                                    <option value="fim_semana" ${controle?.frequencia_uso === 'fim_semana' ? 'selected' : ''}>Finais de Semana</option>
                                    <option value="eventos" ${controle?.frequencia_uso === 'eventos' ? 'selected' : ''}>Apenas Eventos</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="controle-horas-dia">Horas por Dia</label>
                                <input type="number" id="controle-horas-dia" value="${controle?.horas_uso_diario || ''}" min="1" max="24">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Cuidados e Observações</h4>
                        <div class="form-group">
                            <label for="controle-solucao-uso">Solução de Limpeza</label>
                            <input type="text" id="controle-solucao-uso" value="${controle?.solucao_limpeza || ''}" 
                                   placeholder="Marca da solução utilizada...">
                        </div>

                        <div class="form-group">
                            <label for="controle-observacoes">Observações</label>
                            <textarea id="controle-observacoes" rows="3" placeholder="Queixas, adaptação, observações...">${controle?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="lentesContatoManager.salvarControlePaciente()">Salvar Controle</button>
            </div>
        `;

        showModal(modalContent);
        this.loadClientesControle(controle?.cliente_id);
        this.loadLentesContatoSelect(controle?.produto_id);
    }

    async loadClientesControle(clienteSelecionado = null) {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('id, nome')
                .order('nome');

            if (error) throw error;

            const select = document.getElementById('controle-cliente-id');
            if (select) {
                select.innerHTML = `
                    <option value="">Selecione um paciente...</option>
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

    async loadLentesContatoSelect(produtoSelecionado = null) {
        try {
            const { data: lentes, error } = await this.supabase
                .from('produtos')
                .select('id, nome, marca')
                .eq('categoria', 'lente_contato')
                .eq('ativo', true)
                .order('marca')
                .order('nome');

            if (error) throw error;

            const select = document.getElementById('controle-produto-id');
            if (select) {
                select.innerHTML = `
                    <option value="">Selecione uma lente...</option>
                    ${lentes.map(lente => `
                        <option value="${lente.id}" ${lente.id === produtoSelecionado ? 'selected' : ''}>
                            ${lente.marca} - ${lente.nome}
                        </option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar lentes:', error);
        }
    }

    async salvarControlePaciente() {
        const form = document.getElementById('form-controle-paciente');
        if (!form) return;

        const controleData = {
            cliente_id: document.getElementById('controle-cliente-id').value,
            produto_id: document.getElementById('controle-produto-id').value,
            data_ultima_compra: document.getElementById('controle-data-ultima-compra').value || null,
            data_proximo_controle: document.getElementById('controle-data-proximo').value,
            frequencia_uso: document.getElementById('controle-frequencia').value || null,
            horas_uso_diario: document.getElementById('controle-horas-dia').value ? parseInt(document.getElementById('controle-horas-dia').value) : null,
            solucao_limpeza: document.getElementById('controle-solucao-uso').value || null,
            observacoes: document.getElementById('controle-observacoes').value || null,
            status: 'agendado'
        };

        const controleId = document.getElementById('controle-id').value;

        try {
            let error;
            if (controleId) {
                const { data, error: updateError } = await this.supabase
                    .from('controles_lentes_contato')
                    .update(controleData)
                    .eq('id', controleId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('controles_lentes_contato')
                    .insert([controleData]);
                error = insertError;
            }

            if (error) throw error;

            showSuccess('Controle de paciente salvo com sucesso!');
            document.querySelector('.modal').remove();
            this.loadControlesPacientes();

        } catch (error) {
            console.error('Erro ao salvar controle:', error);
            showError('Erro ao salvar controle de paciente: ' + error.message);
        }
    }

    async realizarControle(controleId) {
        try {
            const { error } = await this.supabase
                .from('controles_lentes_contato')
                .update({ 
                    status: 'realizado',
                    data_ultimo_controle: new Date().toISOString()
                })
                .eq('id', controleId);

            if (error) throw error;

            showSuccess('Controle realizado com sucesso!');
            this.loadControlesPacientes();

        } catch (error) {
            console.error('Erro ao realizar controle:', error);
            showError('Erro ao realizar controle');
        }
    }

    async reagendarControle(controleId) {
        try {
            const { data: controle, error } = await this.supabase
                .from('controles_lentes_contato')
                .select('*')
                .eq('id', controleId)
                .single();

            if (error) throw error;
            this.showFormControlePaciente(controle);

        } catch (error) {
            console.error('Erro ao carregar controle:', error);
            showError('Erro ao carregar dados do controle');
        }
    }

    async gerarRelatorioLentesContato() {
        try {
            const { data: lentes, error } = await this.supabase
                .from('produtos')
                .select('*')
                .eq('categoria', 'lente_contato')
                .eq('ativo', true);

            if (error) throw error;

            const { data: vendas, error: errorVendas } = await this.supabase
                .from('venda_itens')
                .select('*')
                .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

            if (errorVendas) throw errorVendas;

            const relatorio = this.analisarDadosLentesContato(lentes, vendas);
            this.mostrarRelatorioLentesContato(relatorio);

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            showError('Erro ao gerar relatório de lentes de contato');
        }
    }

    analisarDadosLentesContato(lentes, vendas) {
        const vendasLC = vendas.filter(v => 
            lentes.some(l => l.id === v.produto_id)
        );

        return {
            total_lentes: lentes.length,
            lentes_estoque_baixo: lentes.filter(l => l.estoque_atual <= l.estoque_minimo).length,
            total_vendas_mes: vendasLC.length,
            faturamento_mes: vendasLC.reduce((sum, v) => sum + (v.subtotal || 0), 0),
            lentes_mais_vendidas: this.identificarLentesMaisVendidas(vendasLC, lentes),
            tipos_mais_populares: this.analisarTiposPopulares(lentes, vendasLC)
        };
    }

    mostrarRelatorioLentesContato(relatorio) {
        const modalContent = `
            <div class="modal-header">
                <h3>📊 Relatório de Lentes de Contato</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="relatorio-lentes-contato">
                    <div class="metricas-grid">
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.total_lentes}</div>
                            <div class="metrica-label">Total de Lentes</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.lentes_estoque_baixo}</div>
                            <div class="metrica-label">Estoque Baixo</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.total_vendas_mes}</div>
                            <div class="metrica-label">Vendas Mês</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">R$ ${relatorio.faturamento_mes.toFixed(2)}</div>
                            <div class="metrica-label">Faturamento</div>
                        </div>
                    </div>

                    <div class="analise-detalhada">
                        <h4>🏆 Lentes Mais Vendidas</h4>
                        <div class="lentes-mais-vendidas">
                            ${relatorio.lentes_mais_vendidas.slice(0, 5).map(lente => `
                                <div class="lente-vendida">
                                    <strong>${lente.nome}</strong>
                                    <span class="vendas-count">${lente.vendas} vendas</span>
                                </div>
                            `).join('')}
                        </div>

                        <h4>📈 Tipos Mais Populares</h4>
                        <div class="tipos-populares">
                            ${Object.entries(relatorio.tipos_mais_populares).map(([tipo, quantidade]) => `
                                <div class="tipo-item">
                                    <span class="tipo-nome">${this.getModalidadeLabel(tipo)}</span>
                                    <span class="tipo-quantidade">${quantidade}</span>
                                </div>
                            `).join('')}
                        </div>
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

    // Métodos auxiliares
    getTipoLenteLabel(tipo) {
        const labels = {
            'gelatinosa': 'Gelatinosa',
            'rigida': 'Rígida',
            'hibrida': 'Híbrida',
            'escleral': 'Escleral'
        };
        return labels[tipo] || tipo;
    }

    getModalidadeLabel(modalidade) {
        const labels = {
            'descarte_diario': 'Descarte Diário',
            'quinzenal': 'Quinzenal',
            'mensal': 'Mensal',
            'trimestral': 'Trimestral',
            'anual': 'Anual'
        };
        return labels[modalidade] || modalidade;
    }

    getStatusControleLabel(status) {
        const labels = {
            'agendado': 'Agendado',
            'realizado': 'Realizado',
            'cancelado': 'Cancelado',
            'reagendado': 'Reagendado'
        };
        return labels[status] || status;
    }

    isControleAtrasado(controle) {
        if (!controle.data_proximo_controle) return false;
        return new Date(controle.data_proximo_controle) < new Date() && controle.status === 'agendado';
    }

    identificarLentesMaisVendidas(vendas, lentes) {
        const vendasPorLente = {};
        
        vendas.forEach(venda => {
            const lenteId = venda.produto_id;
            vendasPorLente[lenteId] = (vendasPorLente[lenteId] || 0) + (venda.quantidade || 1);
        });

        return Object.entries(vendasPorLente)
            .map(([lenteId, vendas]) => {
                const lente = lentes.find(l => l.id === lenteId);
                return lente ? { ...lente, vendas } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.vendas - a.vendas);
    }

    analisarTiposPopulares(lentes, vendas) {
        const tipos = {};
        
        vendas.forEach(venda => {
            const lente = lentes.find(l => l.id === venda.produto_id);
            if (lente && lente.tipo_substituicao) {
                tipos[lente.tipo_substituicao] = (tipos[lente.tipo_substituicao] || 0) + 1;
            }
        });

        return tipos;
    }
}

// Inicializar quando o módulo for carregado
let lentesContatoManager = null;

function initLentesContato() {
    lentesContatoManager = new LentesContatoManager();
    window.lentesContatoManager = lentesContatoManager;
}