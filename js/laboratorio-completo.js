// js/laboratorio-completo.js - Sistema Completo de Laboratório
class LaboratorioCompletoManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.etapasProducao = [
            'recebimento', 'analise', 'desmontagem', 'surfassagem',
            'montagem', 'polimento', 'limpeza', 'controle_qualidade', 'pronto'
        ];
        
        this.maquinas = [
            'gerador', 'surfas', 'polidor', 'furadeira', 'torno', 'lixadeira', 'ultrassom'
        ];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadOrdensServico();
        this.loadMaquinasStatus();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovaOS = document.getElementById('btn-nova-os');
            const btnRelatorioProdutividade = document.getElementById('btn-relatorio-produtividade');
            const filtroStatus = document.getElementById('filtro-status-os');

            if (btnNovaOS) btnNovaOS.addEventListener('click', () => this.showFormOrdemServico());
            if (btnRelatorioProdutividade) btnRelatorioProdutividade.addEventListener('click', () => this.gerarRelatorioProdutividade());
            if (filtroStatus) filtroStatus.addEventListener('change', (e) => this.filtrarOrdensServico(e.target.value));
        }, 100);
    }

    async loadOrdensServico() {
        try {
            const { data: ordens, error } = await this.supabase
                .from('ordens_servico')
                .select(`
                    *,
                    clientes(nome, telefone),
                    vendas(numero_venda),
                    receitas(od_esferico, od_cilindrico, oe_esferico, oe_cilindrico)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            
            // Renderiza a tabela se o elemento estiver presente (página Ordens de Serviço)
            const isTableView = document.getElementById('ordens-servico-body');
            if (isTableView) {
                this.renderOrdensServicoTable(ordens);
            }
            
            // Renderiza o Kanban se o elemento estiver presente (página Etapas O.S.)
            const isKanbanView = document.getElementById('kanban-os');
            if (isKanbanView) {
                this.renderKanbanOS(ordens);
            }

        } catch (error) {
            console.error('Erro ao carregar ordens de serviço:', error);
            showError('Erro ao carregar ordens de serviço: ' + error.message);
        }
    }

    renderOrdensServicoTable(ordens) {
        const tbody = document.getElementById('ordens-servico-body');
        if (!tbody) return;

        if (ordens && ordens.length > 0) {
            tbody.innerHTML = ordens.map(os => `
                <tr class="os-row" data-status="${os.status}">
                    <td>
                        <strong>OS #${os.numero_os}</strong>
                        <div class="os-info">
                            <small>Cliente: ${os.clientes.nome} | Venda: #${os.vendas?.numero_venda || 'N/A'}</small>
                        </div>
                    </td>
                    <td>
                        <span class="servico-tipo">${this.getTipoServicoLabel(os.tipo_servico)}</span>
                        <div class="servico-detalhes">
                            <small>${os.observacoes_tecnicas?.substring(0, 50)}${os.observacoes_tecnicas?.length > 50 ? '...' : ''}</small>
                        </div>
                    </td>
                    <td>
                        <div class="progresso-os">
                            <div class="etapas-progresso">
                                ${this.etapasProducao.map(etapa => `
                                    <span class="etapa ${this.getEtapaStatus(os, etapa)}" 
                                          title="${this.getEtapaLabel(etapa)}">
                                        ${this.getEtapaIcon(etapa)}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="prazo ${this.isPrazoAtrasado(os) ? 'atrasado' : 'normal'}">
                            ${os.prazo_entrega ? new Date(os.prazo_entrega).toLocaleDateString('pt-BR') : 'Não definido'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${os.status}">
                            ${this.getStatusLabel(os.status)}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-primary btn-sm" onclick="laboratorioCompletoManager.editarOS('${os.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-info btn-sm" onclick="laboratorioCompletoManager.verDetalhesOS('${os.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="laboratorioCompletoManager.avancarEtapa('${os.id}')">
                                <i class="fas fa-forward"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Nenhuma ordem de serviço cadastrada</td>
                </tr>
            `;
        }
    }

    showFormOrdemServico(ordemServico = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${ordemServico ? 'Editar' : 'Nova'} Ordem de Serviço</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <form id="form-ordem-servico">
                    <input type="hidden" id="os-id" value="${ordemServico?.id || ''}">
                    
                    <div class="form-section">
                        <h4>📋 Informações da OS</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="os-venda-id">Venda Relacionada</label>
                                <select id="os-venda-id">
                                    <option value="">Selecione uma venda...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="os-cliente-id">Cliente</label>
                                <select id="os-cliente-id" required>
                                    <option value="">Selecione um cliente...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>🔧 Tipo de Serviço</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="os-tipo-servico">Tipo de Serviço *</label>
                                <select id="os-tipo-servico" required>
                                    <option value="">Selecione...</option>
                                    <option value="montagem_armacao" ${ordemServico?.tipo_servico === 'montagem_armacao' ? 'selected' : ''}>Montagem de Armação</option>
                                    <option value="troca_lentes" ${ordemServico?.tipo_servico === 'troca_lentes' ? 'selected' : ''}>Troca de Lentes</option>
                                    <option value="ajuste_armacao" ${ordemServico?.tipo_servico === 'ajuste_armacao' ? 'selected' : ''}>Ajuste de Armação</option>
                                    <option value="reparo" ${ordemServico?.tipo_servico === 'reparo' ? 'selected' : ''}>Reparo</option>
                                    <option value="limpeza_profunda" ${ordemServico?.tipo_servico === 'limpeza_profunda' ? 'selected' : ''}>Limpeza Profunda</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="os-urgencia">Urgência</label>
                                <select id="os-urgencia">
                                    <option value="normal" ${ordemServico?.urgencia === 'normal' ? 'selected' : ''}>Normal</option>
                                    <option value="urgente" ${ordemServico?.urgencia === 'urgente' ? 'selected' : ''}>Urgente</option>
                                    <option value="prioritario" ${ordemServico?.urgencia === 'prioritario' ? 'selected' : ''}>Prioritário</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>📝 Especificações Técnicas</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="os-armacao">Armação</label>
                                <input type="text" id="os-armacao" value="${ordemServico?.armacao || ''}" 
                                       placeholder="Modelo, cor, material...">
                            </div>
                            <div class="form-group">
                                <label for="os-lentes">Lentes</label>
                                <input type="text" id="os-lentes" value="${ordemServico?.lentes || ''}" 
                                       placeholder="Tipo, tratamento, material...">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="os-observacoes-tecnicas">Observações Técnicas</label>
                            <textarea id="os-observacoes-tecnicas" rows="4" 
                                      placeholder="Detalhes técnicos, medidas especiais, observações do técnico...">${ordemServico?.observacoes_tecnicas || ''}</textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>⏰ Prazo e Responsável</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="os-prazo-entrega">Prazo de Entrega</label>
                                <input type="date" id="os-prazo-entrega" value="${ordemServico?.prazo_entrega || ''}">
                            </div>
                            <div class="form-group">
                                <label for="os-tecnico-responsavel">Técnico Responsável</label>
                                <input type="text" id="os-tecnico-responsavel" value="${ordemServico?.tecnico_responsavel || ''}" 
                                       placeholder="Nome do técnico...">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>💰 Informações Financeiras</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="os-custo-servico">Custo do Serviço</label>
                                <input type="number" id="os-custo-servico" step="0.01" value="${ordemServico?.custo_servico || 0}">
                            </div>
                            <div class="form-group">
                                <label for="os-valor-servico">Valor do Serviço</label>
                                <input type="number" id="os-valor-servico" step="0.01" value="${ordemServico?.valor_servico || 0}">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="laboratorioCompletoManager.salvarOrdemServico()">Salvar OS</button>
            </div>
        `;

        showModal(modalContent);
        this.loadClientesSelect(ordemServico?.cliente_id);
        this.loadVendasSelect(ordemServico?.venda_id);
    }

    async loadClientesSelect(clienteSelecionado = null) {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('id, nome')
                .order('nome');

            if (error) throw error;

            const select = document.getElementById('os-cliente-id');
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

    async loadVendasSelect(vendaSelecionada = null) {
        try {
            const { data: vendas, error } = await this.supabase
                .from('vendas')
                .select('id, numero_venda, clientes(nome)')
                .order('numero_venda', { ascending: false })
                .limit(100);

            if (error) throw error;

            const select = document.getElementById('os-venda-id');
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

    async salvarOrdemServico() {
        const form = document.getElementById('form-ordem-servico');
        if (!form) return;

        const osData = {
            venda_id: document.getElementById('os-venda-id').value || null,
            cliente_id: document.getElementById('os-cliente-id').value,
            tipo_servico: document.getElementById('os-tipo-servico').value,
            urgencia: document.getElementById('os-urgencia').value,
            armao: document.getElementById('os-armacao').value,
            lentes: document.getElementById('os-lentes').value,
            observacoes_tecnicas: document.getElementById('os-observacoes-tecnicas').value,
            prazo_entrega: document.getElementById('os-prazo-entrega').value || null,
            tecnico_responsavel: document.getElementById('os-tecnico-responsavel').value,
            custo_servico: parseFloat(document.getElementById('os-custo-servico').value) || 0,
            valor_servico: parseFloat(document.getElementById('os-valor-servico').value) || 0,
            status: 'recebimento'
        };

        const osId = document.getElementById('os-id').value;

        try {
            let error;
            if (osId) {
                const { data, error: updateError } = await this.supabase
                    .from('ordens_servico')
                    .update(osData)
                    .eq('id', osId);
                error = updateError;
            } else {
                // Gerar número da OS
                const { count } = await this.supabase
                    .from('ordens_servico')
                    .select('*', { count: 'exact', head: true });

                osData.numero_os = (count + 1).toString().padStart(4, '0');
                
                const { data, error: insertError } = await this.supabase
                    .from('ordens_servico')
                    .insert([osData]);
                error = insertError;
            }

            if (error) throw error;

            showSuccess('Ordem de serviço salva com sucesso!');
            document.querySelector('.modal').remove();
            this.loadOrdensServico();

        } catch (error) {
            console.error('Erro ao salvar ordem de serviço:', error);
            showError('Erro ao salvar ordem de serviço: ' + error.message);
        }
    }

    async editarOS(osId) {
        try {
            const { data: ordemServico, error } = await this.supabase
                .from('ordens_servico')
                .select('*')
                .eq('id', osId)
                .single();

            if (error) throw error;
            this.showFormOrdemServico(ordemServico);

        } catch (error) {
            console.error('Erro ao carregar ordem de serviço:', error);
            showError('Erro ao carregar dados da OS');
        }
    }

    async verDetalhesOS(osId) {
        try {
            const { data: ordemServico, error } = await this.supabase
                .from('ordens_servico')
                .select(`
                    *,
                    clientes(nome, telefone, email),
                    vendas(numero_venda, total),
                    receitas(od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo)
                `)
                .eq('id', osId)
                .single();

            if (error) throw error;

            const modalContent = `
                <div class="modal-header">
                    <h3>📋 Ordem de Serviço #${ordemServico.numero_os}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="os-detalhes-completo">
                        <div class="detalhes-section">
                            <h4>Informações Gerais</h4>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Cliente:</label>
                                    <span>${ordemServico.clientes.nome}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Venda:</label>
                                    <span>#${ordemServico.vendas?.numero_venda || 'N/A'}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Tipo de Serviço:</label>
                                    <span>${this.getTipoServicoLabel(ordemServico.tipo_servico)}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Urgência:</label>
                                    <span class="urgencia-${ordemServico.urgencia}">${ordemServico.urgencia}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detalhes-section">
                            <h4>Andamento da Produção</h4>
                            <div class="progresso-detalhado">
                                ${this.etapasProducao.map(etapa => `
                                    <div class="etapa-detalhe ${this.getEtapaStatus(ordemServico, etapa)}">
                                        <div class="etapa-icon">${this.getEtapaIcon(etapa)}</div>
                                        <div class="etapa-info">
                                            <div class="etapa-nome">${this.getEtapaLabel(etapa)}</div>
                                            <div class="etapa-status">${this.getEtapaStatusText(ordemServico, etapa)}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="detalhes-section">
                            <h4>Especificações Técnicas</h4>
                            <div class="detalhes-grid">
                                ${ordemServico.armacao ? `
                                <div class="detalhe-item">
                                    <label>Armação:</label>
                                    <span>${ordemServico.armacao}</span>
                                </div>
                                ` : ''}
                                ${ordemServico.lentes ? `
                                <div class="detalhe-item">
                                    <label>Lentes:</label>
                                    <span>${ordemServico.lentes}</span>
                                </div>
                                ` : ''}
                                ${ordemServico.tecnico_responsavel ? `
                                <div class="detalhe-item">
                                    <label>Técnico:</label>
                                    <span>${ordemServico.tecnico_responsavel}</span>
                                </div>
                                ` : ''}
                            </div>
                            ${ordemServico.observacoes_tecnicas ? `
                            <div class="observacoes-tecnicas">
                                <label>Observações Técnicas:</label>
                                <p>${ordemServico.observacoes_tecnicas}</p>
                            </div>
                            ` : ''}
                        </div>

                        ${ordemServico.receitas ? `
                        <div class="detalhes-section">
                            <h4>Receita Oftalmológica</h4>
                            <div class="prescricao-grid">
                                <div class="olho-prescricao">
                                    <h6>OD</h6>
                                    <div class="graus">
                                        <div>Esférico: <strong>${this.formatarGrau(ordemServico.receitas.od_esferico)}</strong></div>
                                        <div>Cilíndrico: <strong>${this.formatarGrau(ordemServico.receitas.od_cilindrico)}</strong></div>
                                        <div>Eixo: <strong>${ordemServico.receitas.od_eixo || ''}°</strong></div>
                                    </div>
                                </div>
                                <div class="olho-prescricao">
                                    <h6>OE</h6>
                                    <div class="graus">
                                        <div>Esférico: <strong>${this.formatarGrau(ordemServico.receitas.oe_esferico)}</strong></div>
                                        <div>Cilíndrico: <strong>${this.formatarGrau(ordemServico.receitas.oe_cilindrico)}</strong></div>
                                        <div>Eixo: <strong>${ordemServico.receitas.oe_eixo || ''}°</strong></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <div class="detalhes-section">
                            <h4>Informações Financeiras</h4>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Custo do Serviço:</label>
                                    <span>R$ ${ordemServico.custo_servico?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Valor do Serviço:</label>
                                    <span>R$ ${ordemServico.valor_servico?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Lucro:</label>
                                    <span class="${(ordemServico.valor_servico - ordemServico.custo_servico) >= 0 ? 'lucro-positivo' : 'lucro-negativo'}">
                                        R$ ${((ordemServico.valor_servico || 0) - (ordemServico.custo_servico || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="laboratorioCompletoManager.editarOS('${ordemServico.id}')">
                        <i class="fas fa-edit"></i> Editar OS
                    </button>
                    <button class="btn btn-success" onclick="laboratorioCompletoManager.avancarEtapa('${ordemServico.id}')">
                        <i class="fas fa-forward"></i> Avançar Etapa
                    </button>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar detalhes da OS:', error);
            showError('Erro ao carregar detalhes da ordem de serviço');
        }
    }

    async avancarEtapa(osId) {
        try {
            const { data: ordemServico, error } = await this.supabase
                .from('ordens_servico')
                .select('status')
                .eq('id', osId)
                .single();

            if (error) throw error;

            const etapaAtualIndex = this.etapasProducao.indexOf(ordemServico.status);
            const proximaEtapa = this.etapasProducao[etapaAtualIndex + 1];

            if (!proximaEtapa) {
                showError('Esta OS já está na etapa final!');
                return;
            }

            const { error: updateError } = await this.supabase
                .from('ordens_servico')
                .update({ 
                    status: proximaEtapa,
                    data_ultima_atualizacao: new Date().toISOString()
                })
                .eq('id', osId);

            if (updateError) throw updateError;

            showSuccess(`OS avançada para etapa: ${this.getEtapaLabel(proximaEtapa)}`);
            this.loadOrdensServico();

        } catch (error) {
            console.error('Erro ao avançar etapa:', error);
            showError('Erro ao avançar etapa da OS');
        }
    }

    async loadMaquinasStatus() {
        try {
            // Simular status das máquinas (em produção real, viria de IoT ou sistema)
            const statusMaquinas = this.maquinas.map(maquina => ({
                nome: maquina,
                status: Math.random() > 0.1 ? 'operacional' : 'manutencao',
                ultima_manutencao: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                proxima_manutencao: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
            }));

            this.renderMaquinasStatus(statusMaquinas);

        } catch (error) {
            console.error('Erro ao carregar status das máquinas:', error);
        }
    }

    renderMaquinasStatus(maquinas) {
        const container = document.getElementById('status-maquinas');
        if (!container) return;

        container.innerHTML = `
            <div class="maquinas-grid">
                ${maquinas.map(maquina => `
                    <div class="maquina-card ${maquina.status}">
                        <div class="maquina-icon">
                            <i class="fas fa-cog"></i>
                        </div>
                        <div class="maquina-info">
                            <h5>${this.formatarNomeMaquina(maquina.nome)}</h5>
                            <span class="status ${maquina.status}">${maquina.status === 'operacional' ? 'Operacional' : 'Manutenção'}</span>
                            <div class="maquina-detalhes">
                                <small>Última manutenção: ${new Date(maquina.ultima_manutencao).toLocaleDateString('pt-BR')}</small>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async gerarRelatorioProdutividade() {
        try {
            const { data: ordens, error } = await this.supabase
                .from('ordens_servico')
                .select('*')
                .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

            if (error) throw error;

            const relatorio = this.calcularMetricasProdutividade(ordens);
            this.mostrarRelatorioProdutividade(relatorio);

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            showError('Erro ao gerar relatório de produtividade');
        }
    }

    calcularMetricasProdutividade(ordens) {
        const hoje = new Date();
        const mesAtual = ordens.filter(os => new Date(os.created_at).getMonth() === hoje.getMonth());
        const concluidas = ordens.filter(os => os.status === 'pronto');
        const atrasadas = ordens.filter(os => this.isPrazoAtrasado(os));

        return {
            totalOrdens: ordens.length,
            ordensMes: mesAtual.length,
            taxaConclusao: ordens.length > 0 ? (concluidas.length / ordens.length) * 100 : 0,
            tempoMedio: this.calcularTempoMedioProducao(ordens),
            ordensAtrasadas: atrasadas.length,
            eficiencia: this.calcularEficiencia(ordens)
        };
    }

    mostrarRelatorioProdutividade(relatorio) {
        const modalContent = `
            <div class="modal-header">
                <h3>📊 Relatório de Produtividade do Laboratório</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="relatorio-produtividade">
                    <div class="metricas-grid">
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.totalOrdens}</div>
                            <div class="metrica-label">Total de OS</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.ordensMes}</div>
                            <div class="metrica-label">OS este Mês</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.taxaConclusao.toFixed(1)}%</div>
                            <div class="metrica-label">Taxa de Conclusão</div>
                        </div>
                        <div class="metrica-card">
                            <div class="metrica-valor">${relatorio.ordensAtrasadas}</div>
                            <div class="metrica-label">OS Atrasadas</div>
                        </div>
                    </div>

                    <div class="detalhes-relatorio">
                        <h4>Detalhes de Performance</h4>
                        <div class="detalhes-grid">
                            <div class="detalhe-item">
                                <label>Tempo Médio de Produção:</label>
                                <span>${relatorio.tempoMedio}</span>
                            </div>
                            <div class="detalhe-item">
                                <label>Eficiência do Laboratório:</label>
                                <span>${relatorio.eficiencia.toFixed(1)}%</span>
                            </div>
                            <div class="detalhe-item">
                                <label>Taxa de Atraso:</label>
                                <span>${((relatorio.ordensAtrasadas / relatorio.totalOrdens) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    <div class="recomendacoes">
                        <h4>💡 Recomendações</h4>
                        <ul>
                            ${relatorio.ordensAtrasadas > 0 ? '<li>❌ Revisar prazos das OS atrasadas</li>' : ''}
                            ${relatorio.taxaConclusao < 80 ? '<li>⚠️  Melhorar eficiência na conclusão</li>' : ''}
                            ${relatorio.eficiencia < 70 ? '<li>🔧 Otimizar processos de produção</li>' : ''}
                            ${relatorio.ordensAtrasadas === 0 && relatorio.taxaConclusao > 90 ? '<li>✅ Excelente performance!</li>' : ''}
                        </ul>
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

    filtrarOrdensServico(status) {
        const rows = document.querySelectorAll('.os-row');
        
        rows.forEach(row => {
            if (status === 'todos' || row.getAttribute('data-status') === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // --- INÍCIO: NOVOS MÉTODOS KANBAN ---

    // NOVO: Método para renderizar a visualização Kanban
    renderKanbanOS(ordens) {
        const container = document.getElementById('kanban-os');
        if (!container) return;

        // Limpa o estado de "carregando"
        container.innerHTML = '';
        
        const ordensPorEtapa = this.groupOrdensByEtapa(ordens);

        // Configura o grid para o Kanban
        container.style.display = 'grid';
        container.style.gridTemplateColumns = `repeat(${this.etapasProducao.length}, minmax(280px, 1fr))`;
        container.style.gap = '15px';

        this.etapasProducao.forEach(etapa => {
            const ordensNaEtapa = ordensPorEtapa[etapa] || [];
            
            const etapaHTML = `
                <div class="kanban-col" style="min-width: 280px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-top: 5px solid ${this.getEtapaColor(etapa)};">
                    <div class="kanban-header" style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <h5 style="margin: 0; color: ${this.getEtapaColor(etapa)}; font-size: 1.1em;">${this.getEtapaIcon(etapa)} ${this.getEtapaLabel(etapa)}</h5>
                        <small style="background: #eee; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${ordensNaEtapa.length} OS</small>
                    </div>
                    <div class="kanban-body" id="kanban-body-${etapa}" style="padding: 10px; overflow-y: auto; max-height: 60vh;">
                        ${ordensNaEtapa.length > 0 ? ordensNaEtapa.map(os => this.renderKanbanItem(os)).join('') : 
                            '<div style="color: #666; text-align: center; padding: 10px; font-size: 0.9em;">Nenhuma OS nesta etapa.</div>'}
                    </div>
                </div>
            `;
            container.innerHTML += etapaHTML;
        });
    }

    // NOVO: Método auxiliar para agrupar ordens por etapa
    groupOrdensByEtapa(ordens) {
        return ordens.reduce((acc, os) => {
            // Garante que o status 'pronto' vá para a última coluna do Kanban
            const statusKey = os.status === 'pronto' ? 'pronto' : os.status;
            (acc[statusKey] = acc[statusKey] || []).push(os);
            return acc;
        }, {});
    }
    
    // NOVO: Método auxiliar para renderizar um item do Kanban
    renderKanbanItem(os) {
        return `
            <div class="kanban-item" data-os-id="${os.id}" style="padding: 10px; margin-bottom: 8px; background: #fff5f5; border-left: 3px solid ${this.getEtapaColor(os.status)}; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer;">
                <strong style="display: block;">OS #${os.numero_os}</strong>
                <small style="display: block; color: #333; margin-bottom: 5px;">Cliente: ${os.clientes.nome}</small>
                <small style="color: ${this.isPrazoAtrasado(os) ? '#d32f2f' : '#666'}; font-weight: ${this.isPrazoAtrasado(os) ? 'bold' : 'normal'};">
                    <i class="fas fa-clock"></i> Prazo: ${os.prazo_entrega ? new Date(os.prazo_entrega).toLocaleDateString('pt-BR') : 'N/A'}
                </small>
                <div style="margin-top: 8px; display: flex; justify-content: space-between; border-top: 1px dashed #eee; padding-top: 5px;">
                    <button class="btn btn-sm btn-info" onclick="laboratorioCompletoManager.verDetalhesOS('${os.id}')" style="padding: 3px 8px; font-size: 0.7em;">Detalhes</button>
                    ${os.status !== 'pronto' ? `<button class="btn btn-sm btn-primary" onclick="laboratorioCompletoManager.avancarEtapa('${os.id}')" style="padding: 3px 8px; font-size: 0.7em;">Avançar</button>` : `<span style="font-size: 0.7em; color: ${this.getEtapaColor(os.status)}; font-weight: bold;">PRONTA</span>`}
                </div>
            </div>
        `;
    }
    
    // NOVO: Método auxiliar para cor das etapas (para o Kanban)
    getEtapaColor(etapa) {
        const colors = {
            'recebimento': '#2196F3', // Azul (Info)
            'analise': '#FF9800',     // Laranja (Warning)
            'desmontagem': '#9C27B0', // Roxo
            'surfassagem': '#795548', // Marrom
            'montagem': '#4CAF50',    // Verde (Success)
            'polimento': '#00BCD4',   // Ciano
            'limpeza': '#3F51B5',     // Indigo
            'controle_qualidade': '#FFEB3B', // Amarelo
            'pronto': '#d32f2f'       // Vermelho (Pronto para Entrega)
        };
        return colors[etapa] || '#607D8B';
    }

    // --- FIM: NOVOS MÉTODOS KANBAN ---

    // Métodos auxiliares
    getTipoServicoLabel(tipo) {
        const tipos = {
            'montagem_armacao': 'Montagem de Armação',
            'troca_lentes': 'Troca de Lentes',
            'ajuste_armacao': 'Ajuste de Armação',
            'reparo': 'Reparo',
            'limpeza_profunda': 'Limpeza Profunda'
        };
        return tipos[tipo] || tipo;
    }

    getEtapaStatus(ordemServico, etapa) {
        const etapaIndex = this.etapasProducao.indexOf(etapa);
        const statusIndex = this.etapasProducao.indexOf(ordemServico.status);
        
        if (etapaIndex < statusIndex) return 'concluida';
        if (etapaIndex === statusIndex) return 'atual';
        return 'pendente';
    }

    getEtapaLabel(etapa) {
        const labels = {
            'recebimento': 'Recebimento',
            'analise': 'Análise',
            'desmontagem': 'Desmontagem',
            'surfassagem': 'Surfassagem',
            'montagem': 'Montagem',
            'polimento': 'Polimento',
            'limpeza': 'Limpeza',
            'controle_qualidade': 'Controle de Qualidade',
            'pronto': 'Pronto'
        };
        return labels[etapa] || etapa;
    }

    getEtapaIcon(etapa) {
        const icons = {
            'recebimento': '📥',
            'analise': '🔍',
            'desmontagem': '🔧',
            'surfassagem': '⚙️',
            'montagem': '🛠️',
            'polimento': '✨',
            'limpeza': '🧼',
            'controle_qualidade': '✅',
            'pronto': '🎯'
        };
        return icons[etapa] || '📋';
    }

    getEtapaStatusText(ordemServico, etapa) {
        const status = this.getEtapaStatus(ordemServico, etapa);
        const textos = {
            'concluida': 'Concluída',
            'atual': 'Em andamento',
            'pendente': 'Pendente'
        };
        return textos[status];
    }

    getStatusLabel(status) {
        const labels = {
            'recebimento': 'Recebida',
            'analise': 'Em Análise',
            'desmontagem': 'Desmontagem',
            'surfassagem': 'Surfassagem',
            'montagem': 'Montagem',
            'polimento': 'Polimento',
            'limpeza': 'Limpeza',
            'controle_qualidade': 'Controle Qualidade',
            'pronto': 'Pronta'
        };
        return labels[status] || status;
    }

    isPrazoAtrasado(ordemServico) {
        if (!ordemServico.prazo_entrega) return false;
        return new Date(ordemServico.prazo_entrega) < new Date() && ordemServico.status !== 'pronto';
    }

    formatarGrau(grau) {
        if (!grau) return '-';
        return grau > 0 ? `+${grau}` : grau.toString();
    }

    formatarNomeMaquina(nome) {
        return nome.split('_')
            .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
            .join(' ');
    }

    calcularTempoMedioProducao(ordens) {
        const concluidas = ordens.filter(os => os.status === 'pronto' && os.created_at && os.data_ultima_atualizacao);
        if (concluidas.length === 0) return 'N/A';

        const totalTempo = concluidas.reduce((sum, os) => {
            const inicio = new Date(os.created_at);
            const fim = new Date(os.data_ultima_atualizacao);
            return sum + (fim - inicio);
        }, 0);

        const tempoMedioMs = totalTempo / concluidas.length;
        const dias = Math.floor(tempoMedioMs / (1000 * 60 * 60 * 24));
        const horas = Math.floor((tempoMedioMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        return `${dias}d ${horas}h`;
    }

    calcularEficiencia(ordens) {
        const concluidasNoPrazo = ordens.filter(os => 
            os.status === 'pronto' && !this.isPrazoAtrasado(os)
        ).length;

        return ordens.length > 0 ? (concluidasNoPrazo / ordens.length) * 100 : 0;
    }
}

// Inicializar quando o módulo for carregado
let laboratorioCompletoManager = null;

function initLaboratorioCompleto() {
    laboratorioCompletoManager = new LaboratorioCompletoManager();
    window.laboratorioCompletoManager = laboratorioCompletoManager;
}