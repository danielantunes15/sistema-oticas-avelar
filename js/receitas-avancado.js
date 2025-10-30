// js/receitas-avancado.js - Sistema Completo de Receitas Oftalmológicas
class ReceitasAvancadoManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.camposReceita = {
            paciente: ['idade', 'ocupacao', 'uso_previo', 'historico_ocular', 'medicamentos_uso'],
            od: ['esferico', 'cilindrico', 'eixo', 'adicao', 'dnp', 'altura', 'prisma', 'base'],
            oe: ['esferico', 'cilindrico', 'eixo', 'adicao', 'dnp', 'altura', 'prisma', 'base'],
            lentes_indicadas: ['tipo_lente', 'tratamento', 'filtro', 'material', 'design'],
            observacoes: ['adaptacao', 'controles', 'recomendacoes']
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadReceitas();
        this.loadClientes();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovaReceita = document.getElementById('btn-nova-receita-avancada');
            const btnImportarAparelho = document.getElementById('btn-importar-aparelho');
            const btnGerarReceita = document.getElementById('btn-gerar-receita');

            if (btnNovaReceita) btnNovaReceita.addEventListener('click', () => this.showFormReceita());
            if (btnImportarAparelho) btnImportarAparelho.addEventListener('click', () => this.importarDadosAparelho());
            if (btnGerarReceita) btnGerarReceita.addEventListener('click', () => this.gerarReceitaAutomatica());
        }, 100);
    }

    async loadReceitas() {
        try {
            const { data: receitas, error } = await this.supabase
                .from('receitas')
                .select(`
                    *,
                    clientes(nome, data_nascimento),
                    vendas(numero_venda)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            this.renderReceitasTable(receitas);

        } catch (error) {
            console.error('Erro ao carregar receitas:', error);
            showError('Erro ao carregar receitas: ' + error.message);
        }
    }

    renderReceitasTable(receitas) {
        const tbody = document.getElementById('receitas-avancadas-body');
        if (!tbody) return;

        if (receitas && receitas.length > 0) {
            tbody.innerHTML = receitas.map(receita => `
                <tr>
                    <td>
                        <strong>${receita.clientes.nome}</strong>
                        <div class="receita-info">
                            <small>${this.calcularIdade(receita.clientes.data_nascimento)} anos | 
                            ${receita.medico_nome || 'Sem médico'} | 
                            ${new Date(receita.data_receita).toLocaleDateString('pt-BR')}</small>
                        </div>
                    </td>
                    <td>
                        <div class="grau-resumido">
                            <strong>OD:</strong> ${this.formatarGrau(receita.od_esferico)} ${this.formatarCilindrico(receita.od_cilindrico)} ${receita.od_eixo || ''}°
                            ${receita.od_adicao ? `Add: ${receita.od_adicao}` : ''}
                        </div>
                        <div class="grau-resumido">
                            <strong>OE:</strong> ${this.formatarGrau(receita.oe_esferico)} ${this.formatarCilindrico(receita.oe_cilindrico)} ${receita.oe_eixo || ''}°
                            ${receita.oe_adicao ? `Add: ${receita.oe_adicao}` : ''}
                        </div>
                    </td>
                    <td>
                        ${receita.data_validade ? new Date(receita.data_validade).toLocaleDateString('pt-BR') : '-'}
                        ${this.isReceitaVencida(receita.data_validade) ? 
                          '<span class="vencida-badge">Vencida</span>' : 
                          '<span class="valida-badge">Válida</span>'}
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-primary btn-sm" onclick="receitasAvancadoManager.editarReceita('${receita.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="receitasAvancadoManager.usarEmVenda('${receita.id}')">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                            <button class="btn btn-info btn-sm" onclick="receitasAvancadoManager.visualizarCompleta('${receita.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="receitasAvancadoManager.renovarReceita('${receita.id}')">
                                <i class="fas fa-redo"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Nenhuma receita cadastrada</td>
                </tr>
            `;
        }
    }

    showFormReceita(receita = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${receita ? 'Editar' : 'Nova'} Receita Oftalmológica</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                <form id="form-receita-avancada">
                    <input type="hidden" id="receita-id" value="${receita?.id || ''}">
                    
                    <!-- Dados do Paciente -->
                    <div class="form-section">
                        <h4>👤 Dados do Paciente</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-cliente-id">Paciente *</label>
                                <select id="receita-cliente-id" required>
                                    <option value="">Selecione um paciente...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="receita-idade">Idade</label>
                                <input type="number" id="receita-idade" value="${receita?.idade || ''}" min="0" max="120">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-ocupacao">Ocupação</label>
                                <input type="text" id="receita-ocupacao" value="${receita?.ocupacao || ''}" 
                                       placeholder="Ex: Estudante, Motorista, Costureira...">
                            </div>
                            <div class="form-group">
                                <label for="receita-uso-previo">Uso Prévio de Óculos</label>
                                <select id="receita-uso-previo">
                                    <option value="">Selecione...</option>
                                    <option value="primeiro_uso" ${receita?.uso_previo === 'primeiro_uso' ? 'selected' : ''}>Primeiro Uso</option>
                                    <option value="troca_grau" ${receita?.uso_previo === 'troca_grau' ? 'selected' : ''}>Troca de Grau</option>
                                    <option value="atualizacao" ${receita?.uso_previo === 'atualizacao' ? 'selected' : ''}>Atualização</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Dados do Médico -->
                    <div class="form-section">
                        <h4>👨‍⚕️ Dados do Médico</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-medico-nome">Nome do Médico</label>
                                <input type="text" id="receita-medico-nome" value="${receita?.medico_nome || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-medico-crm">CRM</label>
                                <input type="text" id="receita-medico-crm" value="${receita?.medico_crm || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-data">Data da Receita</label>
                                <input type="date" id="receita-data" value="${receita?.data_receita || new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label for="receita-validade">Data Validade</label>
                                <input type="date" id="receita-validade" value="${receita?.data_validade || ''}">
                            </div>
                        </div>
                    </div>

                    <!-- Prescrição OD -->
                    <div class="form-section">
                        <h4>👁️ Olho Direito (OD)</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-od-esferico">Esférico</label>
                                <input type="number" id="receita-od-esferico" step="0.25" value="${receita?.od_esferico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-od-cilindrico">Cilíndrico</label>
                                <input type="number" id="receita-od-cilindrico" step="0.25" value="${receita?.od_cilindrico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-od-eixo">Eixo</label>
                                <input type="number" id="receita-od-eixo" min="0" max="180" value="${receita?.od_eixo || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-od-adicao">Adição</label>
                                <input type="number" id="receita-od-adicao" step="0.25" value="${receita?.od_adicao || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-od-dnp">DNP</label>
                                <input type="number" id="receita-od-dnp" step="0.5" value="${receita?.od_dnp || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-od-altura">Altura</label>
                                <input type="number" id="receita-od-altura" step="0.5" value="${receita?.od_altura || ''}">
                            </div>
                        </div>
                    </div>

                    <!-- Prescrição OE -->
                    <div class="form-section">
                        <h4>👁️ Olho Esquerdo (OE)</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-oe-esferico">Esférico</label>
                                <input type="number" id="receita-oe-esferico" step="0.25" value="${receita?.oe_esferico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-oe-cilindrico">Cilíndrico</label>
                                <input type="number" id="receita-oe-cilindrico" step="0.25" value="${receita?.oe_cilindrico || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-oe-eixo">Eixo</label>
                                <input type="number" id="receita-oe-eixo" min="0" max="180" value="${receita?.oe_eixo || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-oe-adicao">Adição</label>
                                <input type="number" id="receita-oe-adicao" step="0.25" value="${receita?.oe_adicao || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-oe-dnp">DNP</label>
                                <input type="number" id="receita-oe-dnp" step="0.5" value="${receita?.oe_dnp || ''}">
                            </div>
                            <div class="form-group">
                                <label for="receita-oe-altura">Altura</label>
                                <input type="number" id="receita-oe-altura" step="0.5" value="${receita?.oe_altura || ''}">
                            </div>
                        </div>
                    </div>

                    <!-- Lentes Indicadas -->
                    <div class="form-section">
                        <h4>🔍 Lentes Indicadas</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="receita-tipo-lente">Tipo de Lente</label>
                                <select id="receita-tipo-lente">
                                    <option value="">Selecione...</option>
                                    <option value="monofocal" ${receita?.tipo_lente === 'monofocal' ? 'selected' : ''}>Monofocal</option>
                                    <option value="bifocal" ${receita?.tipo_lente === 'bifocal' ? 'selected' : ''}>Bifocal</option>
                                    <option value="multifocal" ${receita?.tipo_lente === 'multifocal' ? 'selected' : ''}>Multifocal</option>
                                    <option value="ocupacional" ${receita?.tipo_lente === 'ocupacional' ? 'selected' : ''}>Ocupacional</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="receita-tratamento">Tratamento</label>
                                <select id="receita-tratamento">
                                    <option value="">Selecione...</option>
                                    <option value="anti_reflexo" ${receita?.tratamento === 'anti_reflexo' ? 'selected' : ''}>Anti-Reflexo</option>
                                    <option value="antirrisco" ${receita?.tratamento === 'antirrisco' ? 'selected' : ''}>Antirrisco</option>
                                    <option value="fotossensivel" ${receita?.tratamento === 'fotossensivel' ? 'selected' : ''}>Fotossensível</option>
                                    <option value="filtro_azul" ${receita?.tratamento === 'filtro_azul' ? 'selected' : ''}>Filtro Azul</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Observações -->
                    <div class="form-section">
                        <h4>📝 Observações</h4>
                        <div class="form-group">
                            <label for="receita-observacoes">Observações e Recomendações</label>
                            <textarea id="receita-observacoes" rows="4">${receita?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-warning" onclick="receitasAvancadoManager.importarDadosAparelho()">
                    <i class="fas fa-download"></i> Importar do Aparelho
                </button>
                <button class="btn btn-primary" onclick="receitasAvancadoManager.salvarReceita()">Salvar Receita</button>
            </div>
        `;

        showModal(modalContent);
        this.loadClientesSelect(receita?.cliente_id);
    }

    async loadClientes() {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('id, nome, data_nascimento')
                .order('nome');

            if (error) throw error;
            this.clientes = clientes;

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    loadClientesSelect(clienteSelecionado = null) {
        const select = document.getElementById('receita-cliente-id');
        if (!select || !this.clientes) return;

        select.innerHTML = `
            <option value="">Selecione um paciente...</option>
            ${this.clientes.map(cliente => `
                <option value="${cliente.id}" ${cliente.id === clienteSelecionado ? 'selected' : ''}>
                    ${cliente.nome} (${this.calcularIdade(cliente.data_nascimento)} anos)
                </option>
            `).join('')}
        `;

        // Atualizar idade automaticamente quando selecionar cliente
        select.addEventListener('change', (e) => {
            const clienteId = e.target.value;
            const cliente = this.clientes.find(c => c.id === clienteId);
            if (cliente && cliente.data_nascimento) {
                document.getElementById('receita-idade').value = this.calcularIdade(cliente.data_nascimento);
            }
        });
    }

    async salvarReceita() {
        const form = document.getElementById('form-receita-avancada');
        if (!form) return;

        const receitaData = {
            cliente_id: document.getElementById('receita-cliente-id').value,
            idade: document.getElementById('receita-idade').value ? parseInt(document.getElementById('receita-idade').value) : null,
            ocupacao: document.getElementById('receita-ocupacao').value,
            uso_previo: document.getElementById('receita-uso-previo').value,
            
            // Dados médico
            medico_nome: document.getElementById('receita-medico-nome').value,
            medico_crm: document.getElementById('receita-medico-crm').value,
            data_receita: document.getElementById('receita-data').value,
            data_validade: document.getElementById('receita-validade').value,
            
            // OD
            od_esferico: document.getElementById('receita-od-esferico').value ? parseFloat(document.getElementById('receita-od-esferico').value) : null,
            od_cilindrico: document.getElementById('receita-od-cilindrico').value ? parseFloat(document.getElementById('receita-od-cilindrico').value) : null,
            od_eixo: document.getElementById('receita-od-eixo').value ? parseInt(document.getElementById('receita-od-eixo').value) : null,
            od_adicao: document.getElementById('receita-od-adicao').value ? parseFloat(document.getElementById('receita-od-adicao').value) : null,
            od_dnp: document.getElementById('receita-od-dnp').value ? parseFloat(document.getElementById('receita-od-dnp').value) : null,
            od_altura: document.getElementById('receita-od-altura').value ? parseFloat(document.getElementById('receita-od-altura').value) : null,
            
            // OE
            oe_esferico: document.getElementById('receita-oe-esferico').value ? parseFloat(document.getElementById('receita-oe-esferico').value) : null,
            oe_cilindrico: document.getElementById('receita-oe-cilindrico').value ? parseFloat(document.getElementById('receita-oe-cilindrico').value) : null,
            oe_eixo: document.getElementById('receita-oe-eixo').value ? parseInt(document.getElementById('receita-oe-eixo').value) : null,
            oe_adicao: document.getElementById('receita-oe-adicao').value ? parseFloat(document.getElementById('receita-oe-adicao').value) : null,
            oe_dnp: document.getElementById('receita-oe-dnp').value ? parseFloat(document.getElementById('receita-oe-dnp').value) : null,
            oe_altura: document.getElementById('receita-oe-altura').value ? parseFloat(document.getElementById('receita-oe-altura').value) : null,
            
            // Lentes
            tipo_lente: document.getElementById('receita-tipo-lente').value,
            tratamento: document.getElementById('receita-tratamento').value,
            
            observacoes: document.getElementById('receita-observacoes').value
        };

        const receitaId = document.getElementById('receita-id').value;

        try {
            let error;
            if (receitaId) {
                const { data, error: updateError } = await this.supabase
                    .from('receitas')
                    .update(receitaData)
                    .eq('id', receitaId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('receitas')
                    .insert([receitaData]);
                error = insertError;
            }

            if (error) throw error;

            showSuccess('Receita salva com sucesso!');
            document.querySelector('.modal').remove();
            this.loadReceitas();

        } catch (error) {
            console.error('Erro ao salvar receita:', error);
            showError('Erro ao salvar receita: ' + error.message);
        }
    }

    async editarReceita(receitaId) {
        try {
            const { data: receita, error } = await this.supabase
                .from('receitas')
                .select('*')
                .eq('id', receitaId)
                .single();

            if (error) throw error;
            this.showFormReceita(receita);

        } catch (error) {
            console.error('Erro ao carregar receita:', error);
            showError('Erro ao carregar dados da receita');
        }
    }

    async visualizarCompleta(receitaId) {
        try {
            const { data: receita, error } = await this.supabase
                .from('receitas')
                .select(`
                    *,
                    clientes(nome, data_nascimento, telefone, email)
                `)
                .eq('id', receitaId)
                .single();

            if (error) throw error;

            const modalContent = `
                <div class="modal-header">
                    <h3>📄 Receita Oftalmológica Completa</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="receita-completa">
                        <!-- Cabeçalho -->
                        <div class="receita-header">
                            <h4>Óticas Avelar</h4>
                            <p>Receita Oftalmológica</p>
                        </div>

                        <!-- Dados Paciente -->
                        <div class="receita-section">
                            <h5>Dados do Paciente</h5>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Nome:</label>
                                    <span>${receita.clientes.nome}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Idade:</label>
                                    <span>${receita.idade || this.calcularIdade(receita.clientes.data_nascimento)} anos</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Ocupação:</label>
                                    <span>${receita.ocupacao || 'Não informado'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Prescrição -->
                        <div class="receita-section">
                            <h5>Prescrição Oftalmológica</h5>
                            <div class="prescricao-grid">
                                <div class="olho-prescricao">
                                    <h6>Olho Direito (OD)</h6>
                                    <div class="graus">
                                        <div>Esférico: <strong>${this.formatarGrau(receita.od_esferico)}</strong></div>
                                        <div>Cilíndrico: <strong>${this.formatarGrau(receita.od_cilindrico)}</strong></div>
                                        <div>Eixo: <strong>${receita.od_eixo || ''}°</strong></div>
                                        <div>Adição: <strong>${receita.od_adicao || ''}</strong></div>
                                        <div>DNP: <strong>${receita.od_dnp || ''} mm</strong></div>
                                    </div>
                                </div>
                                <div class="olho-prescricao">
                                    <h6>Olho Esquerdo (OE)</h6>
                                    <div class="graus">
                                        <div>Esférico: <strong>${this.formatarGrau(receita.oe_esferico)}</strong></div>
                                        <div>Cilíndrico: <strong>${this.formatarGrau(receita.oe_cilindrico)}</strong></div>
                                        <div>Eixo: <strong>${receita.oe_eixo || ''}°</strong></div>
                                        <div>Adição: <strong>${receita.oe_adicao || ''}</strong></div>
                                        <div>DNP: <strong>${receita.oe_dnp || ''} mm</strong></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Lentes Indicadas -->
                        ${receita.tipo_lente ? `
                        <div class="receita-section">
                            <h5>Lentes Indicadas</h5>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Tipo:</label>
                                    <span>${this.formatarTipoLente(receita.tipo_lente)}</span>
                                </div>
                                ${receita.tratamento ? `
                                <div class="detalhe-item">
                                    <label>Tratamento:</label>
                                    <span>${this.formatarTratamento(receita.tratamento)}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Observações -->
                        ${receita.observacoes ? `
                        <div class="receita-section">
                            <h5>Observações</h5>
                            <p>${receita.observacoes}</p>
                        </div>
                        ` : ''}

                        <!-- Rodapé -->
                        <div class="receita-footer">
                            <div class="medico-info">
                                <p><strong>Médico:</strong> ${receita.medico_nome || 'Não informado'}</p>
                                ${receita.medico_crm ? `<p><strong>CRM:</strong> ${receita.medico_crm}</p>` : ''}
                            </div>
                            <div class="datas-info">
                                <p><strong>Data:</strong> ${new Date(receita.data_receita).toLocaleDateString('pt-BR')}</p>
                                ${receita.data_validade ? `
                                <p><strong>Validade:</strong> ${new Date(receita.data_validade).toLocaleDateString('pt-BR')}</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                    <button class="btn btn-success" onclick="receitasAvancadoManager.usarEmVenda('${receita.id}')">
                        <i class="fas fa-shopping-cart"></i> Usar em Venda
                    </button>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar receita:', error);
            showError('Erro ao carregar receita completa');
        }
    }

    async usarEmVenda(receitaId) {
        // Navegar para o módulo de vendas com a receita pré-selecionada
        window.dashboard.loadModule('vendas');
        showSuccess('Receita selecionada! Agora você pode adicionar produtos à venda.');
        
        // Aqui você pode implementar a lógica para passar a receita para o módulo de vendas
        setTimeout(() => {
            if (window.vendasManager) {
                window.vendasManager.receitaSelecionada = receitaId;
            }
        }, 500);
    }

    async renovarReceita(receitaId) {
        try {
            const { data: receitaAntiga, error } = await this.supabase
                .from('receitas')
                .select('*')
                .eq('id', receitaId)
                .single();

            if (error) throw error;

            // Criar nova receita com dados da antiga
            const novaReceita = {
                ...receitaAntiga,
                id: undefined,
                data_receita: new Date().toISOString().split('T')[0],
                data_validade: this.calcularNovaValidade(),
                observacoes: `Renovação da receita anterior de ${new Date(receitaAntiga.data_receita).toLocaleDateString('pt-BR')}. ${receitaAntiga.observacoes || ''}`
            };

            this.showFormReceita(novaReceita);

        } catch (error) {
            console.error('Erro ao renovar receita:', error);
            showError('Erro ao renovar receita');
        }
    }

    importarDadosAparelho() {
        const modalContent = `
            <div class="modal-header">
                <h3>📟 Importar Dados do Aparelho</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="importacao-aparelho">
                    <p>Selecione o tipo de aparelho para importação automática:</p>
                    
                    <div class="form-group">
                        <label for="tipo-aparelho">Tipo de Aparelho</label>
                        <select id="tipo-aparelho">
                            <option value="">Selecione...</option>
                            <option value="autorrefrator">Autorrefrator</option>
                            <option value="lensmeter">Lensmeter</option>
                            <option value="keratometer">Keratometer</option>
                            <option value="manual">Inserção Manual</option>
                        </select>
                    </div>

                    <div id="campos-importacao"></div>

                    <div class="upload-area">
                        <p>Ou faça upload do arquivo de exportação:</p>
                        <input type="file" id="arquivo-aparelho" accept=".txt,.csv,.pdf">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="receitasAvancadoManager.processarImportacao()">Importar Dados</button>
            </div>
        `;

        showModal(modalContent);

        // Configurar campos dinâmicos
        const selectAparelho = document.getElementById('tipo-aparelho');
        selectAparelho.addEventListener('change', (e) => this.mostrarCamposImportacao(e.target.value));
    }

    mostrarCamposImportacao(tipoAparelho) {
        const container = document.getElementById('campos-importacao');
        if (!container) return;

        const campos = {
            'autorrefrator': ['od_esferico', 'od_cilindrico', 'od_eixo', 'oe_esferico', 'oe_cilindrico', 'oe_eixo', 'dnp'],
            'lensmeter': ['od_esferico', 'od_cilindrico', 'od_eixo', 'oe_esferico', 'oe_cilindrico', 'oe_eixo'],
            'keratometer': ['curva_corneana_od', 'curva_corneana_oe'],
            'manual': ['od_esferico', 'od_cilindrico', 'od_eixo', 'oe_esferico', 'oe_cilindrico', 'oe_eixo', 'adicao', 'dnp']
        };

        const camposTipo = campos[tipoAparelho] || [];

        if (camposTipo.length > 0) {
            container.innerHTML = `
                <div class="form-section">
                    <h5>Dados do ${tipoAparelho}</h5>
                    <div class="form-row">
                        ${camposTipo.map(campo => `
                            <div class="form-group">
                                <label for="import-${campo}">${this.formatarLabel(campo)}</label>
                                <input type="text" id="import-${campo}" placeholder="Valor...">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<p>Selecione um tipo de aparelho para ver os campos.</p>';
        }
    }

    processarImportacao() {
        const tipoAparelho = document.getElementById('tipo-aparelho').value;
        
        if (!tipoAparelho) {
            showError('Selecione o tipo de aparelho!');
            return;
        }

        // Coletar dados dos campos de importação
        const dadosImportados = {};
        const campos = document.querySelectorAll('#campos-importacao input');
        
        campos.forEach(input => {
            const campo = input.id.replace('import-', '');
            if (input.value) {
                dadosImportados[campo] = input.value;
            }
        });

        // Preencher o formulário principal com os dados importados
        this.preencherFormularioComDados(dadosImportados);
        
        showSuccess('Dados importados com sucesso!');
        document.querySelector('.modal').remove();
    }

    preencherFormularioComDados(dados) {
        Object.keys(dados).forEach(campo => {
            const element = document.getElementById(`receita-${campo}`);
            if (element) {
                element.value = dados[campo];
            }
        });
    }

    gerarReceitaAutomatica() {
        showSuccess('Funcionalidade de geração automática em desenvolvimento!');
    }

    // Métodos auxiliares
    formatarGrau(grau) {
        if (!grau) return '-';
        return grau > 0 ? `+${grau}` : grau.toString();
    }

    formatarCilindrico(cilindrico) {
        if (!cilindrico) return '';
        return cilindrico > 0 ? `+${cilindrico}` : cilindrico.toString();
    }

    calcularIdade(dataNascimento) {
        if (!dataNascimento) return 'N/A';
        const nascimento = new Date(dataNascimento);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    }

    isReceitaVencida(dataValidade) {
        if (!dataValidade) return false;
        return new Date(dataValidade) < new Date();
    }

    calcularNovaValidade() {
        const hoje = new Date();
        const novaValidade = new Date(hoje);
        novaValidade.setFullYear(hoje.getFullYear() + 1);
        return novaValidade.toISOString().split('T')[0];
    }

    formatarTipoLente(tipo) {
        const tipos = {
            'monofocal': 'Monofocal',
            'bifocal': 'Bifocal',
            'multifocal': 'Multifocal',
            'ocupacional': 'Ocupacional'
        };
        return tipos[tipo] || tipo;
    }

    formatarTratamento(tratamento) {
        const tratamentos = {
            'anti_reflexo': 'Anti-Reflexo',
            'antirrisco': 'Antirrisco',
            'fotossensivel': 'Fotossensível',
            'filtro_azul': 'Filtro Azul'
        };
        return tratamentos[tratamento] || tratamento;
    }

    formatarLabel(campo) {
        return campo.split('_')
            .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
            .join(' ');
    }
}

// Inicializar quando o módulo for carregado
let receitasAvancadoManager = null;

function initReceitasAvancado() {
    receitasAvancadoManager = new ReceitasAvancadoManager();
    window.receitasAvancadoManager = receitasAvancadoManager;
}