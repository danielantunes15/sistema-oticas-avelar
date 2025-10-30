// js/consultorio.js - Sistema Completo de Gestão de Consultório
class ConsultorioManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.agendamento = {
            tipos_consulta: [
                'consulta_oftalmologica',
                'exame_precoce',
                'adaptacao_lente_contato', 
                'controle_pos_operatorio',
                'teste_visao',
                'consulta_retorno',
                'emergencia'
            ],
            recursos: ['consultorio_1', 'consultorio_2', 'aparelho_tonometria', 'aparelho_campo_visual']
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAgendamentos();
        this.loadProfissionais();
        this.carregarCalendario();
    }

    bindEvents() {
        setTimeout(() => {
            const btnNovoAgendamento = document.getElementById('btn-novo-agendamento');
            const btnConfigHorarios = document.getElementById('btn-config-horarios');
            const filtroData = document.getElementById('filtro-data-agendamentos');

            if (btnNovoAgendamento) btnNovoAgendamento.addEventListener('click', () => this.showFormAgendamento());
            if (btnConfigHorarios) btnConfigHorarios.addEventListener('click', () this.showConfigHorarios());
            if (filtroData) filtroData.addEventListener('change', (e) => this.filtrarAgendamentosData(e.target.value));
        }, 100);
    }

    async loadAgendamentos() {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            const { data: agendamentos, error } = await this.supabase
                .from('agendamentos')
                .select(`
                    *,
                    clientes(nome, telefone),
                    profissionais(nome, especialidade)
                `)
                .gte('data', hoje)
                .order('data')
                .order('hora');

            if (error) throw error;
            this.renderAgendamentosTable(agendamentos);

        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            showError('Erro ao carregar agendamentos: ' + error.message);
        }
    }

    renderAgendamentosTable(agendamentos) {
        const tbody = document.getElementById('agendamentos-body');
        if (!tbody) return;

        if (agendamentos && agendamentos.length > 0) {
            tbody.innerHTML = agendamentos.map(agenda => `
                <tr class="agendamento-row" data-status="${agenda.status}">
                    <td>
                        <div class="agendamento-info">
                            <strong>${agenda.clientes.nome}</strong>
                            <div class="agendamento-detalhes">
                                <small>${agenda.profissionais.nome} | ${this.getTipoConsultaLabel(agenda.tipo_consulta)}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="data-hora">
                            <strong>${new Date(agenda.data).toLocaleDateString('pt-BR')}</strong>
                            <div class="hora">${agenda.hora}</div>
                        </div>
                    </td>
                    <td>${agenda.duracao || 30} min</td>
                    <td>
                        <span class="status-agendamento ${agenda.status}">
                            ${this.getStatusAgendamentoLabel(agenda.status)}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-success btn-sm" onclick="consultorioManager.confirmarAgendamento('${agenda.id}')" 
                                    ${agenda.status !== 'agendado' ? 'disabled' : ''}>
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="consultorioManager.reagendar('${agenda.id}')">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="consultorioManager.cancelarAgendamento('${agenda.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn btn-info btn-sm" onclick="consultorioManager.verDetalhesAgendamento('${agenda.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Nenhum agendamento para hoje</td>
                </tr>
            `;
        }
    }

    async loadProfissionais() {
        try {
            const { data: profissionais, error } = await this.supabase
                .from('profissionais')
                .select('*')
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;
            this.profissionais = profissionais;

        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
        }
    }

    carregarCalendario() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        // Em uma implementação real, usaria FullCalendar ou similar
        // Aqui é uma versão simplificada
        this.atualizarVisaoCalendario();
    }

    showFormAgendamento(agendamento = null) {
        const modalContent = `
            <div class="modal-header">
                <h3>${agendamento ? 'Editar' : 'Novo'} Agendamento</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-agendamento">
                    <input type="hidden" id="agendamento-id" value="${agendamento?.id || ''}">
                    
                    <div class="form-section">
                        <h4>👤 Dados do Paciente</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="agendamento-cliente-id">Paciente *</label>
                                <select id="agendamento-cliente-id" required>
                                    <option value="">Selecione um paciente...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="agendamento-telefone">Telefone</label>
                                <input type="tel" id="agendamento-telefone" value="${agendamento?.telefone_contato || ''}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>🕐 Data e Horário</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="agendamento-data">Data *</label>
                                <input type="date" id="agendamento-data" value="${agendamento?.data || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="agendamento-hora">Hora *</label>
                                <select id="agendamento-hora" required>
                                    <option value="">Selecione um horário...</option>
                                    ${this.gerarOpcoesHorario()}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>👨‍⚕️ Profissional e Serviço</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="agendamento-profissional-id">Profissional *</label>
                                <select id="agendamento-profissional-id" required>
                                    <option value="">Selecione um profissional...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="agendamento-tipo-consulta">Tipo de Consulta *</label>
                                <select id="agendamento-tipo-consulta" required>
                                    <option value="">Selecione...</option>
                                    ${this.agendamento.tipos_consulta.map(tipo => `
                                        <option value="${tipo}" ${agendamento?.tipo_consulta === tipo ? 'selected' : ''}>
                                            ${this.getTipoConsultaLabel(tipo)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="agendamento-duracao">Duração (minutos)</label>
                                <input type="number" id="agendamento-duracao" value="${agendamento?.duracao || 30}" min="15" max="120" step="15">
                            </div>
                            <div class="form-group">
                                <label for="agendamento-recurso">Recurso Necessário</label>
                                <select id="agendamento-recurso">
                                    <option value="">Nenhum específico</option>
                                    ${this.agendamento.recursos.map(recurso => `
                                        <option value="${recurso}" ${agendamento?.recurso === recurso ? 'selected' : ''}>
                                            ${this.formatarRecurso(recurso)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>📝 Observações</h4>
                        <div class="form-group">
                            <label for="agendamento-observacoes">Observações</label>
                            <textarea id="agendamento-observacoes" rows="3" placeholder="Sintomas, histórico, observações importantes...">${agendamento?.observacoes || ''}</textarea>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="consultorioManager.salvarAgendamento()">Salvar Agendamento</button>
            </div>
        `;

        showModal(modalContent);
        this.loadClientesSelect(agendamento?.cliente_id);
        this.loadProfissionaisSelect(agendamento?.profissional_id);
        
        // Configurar verificação de disponibilidade
        const dataInput = document.getElementById('agendamento-data');
        const horaSelect = document.getElementById('agendamento-hora');
        const profissionalSelect = document.getElementById('agendamento-profissional-id');
        
        if (dataInput && horaSelect && profissionalSelect) {
            dataInput.addEventListener('change', () => this.verificarDisponibilidade());
            horaSelect.addEventListener('change', () => this.verificarDisponibilidade());
            profissionalSelect.addEventListener('change', () => this.verificarDisponibilidade());
        }
    }

    async loadClientesSelect(clienteSelecionado = null) {
        try {
            const { data: clientes, error } = await this.supabase
                .from('clientes')
                .select('id, nome, telefone')
                .order('nome');

            if (error) throw error;

            const select = document.getElementById('agendamento-cliente-id');
            if (select) {
                select.innerHTML = `
                    <option value="">Selecione um paciente...</option>
                    ${clientes.map(cliente => `
                        <option value="${cliente.id}" ${cliente.id === clienteSelecionado ? 'selected' : ''}
                                data-telefone="${cliente.telefone || ''}">
                            ${cliente.nome} ${cliente.telefone ? `- ${cliente.telefone}` : ''}
                        </option>
                    `).join('')}
                `;

                // Preencher telefone automaticamente
                select.addEventListener('change', (e) => {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const telefone = selectedOption.getAttribute('data-telefone');
                    if (telefone) {
                        document.getElementById('agendamento-telefone').value = telefone;
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    loadProfissionaisSelect(profissionalSelecionado = null) {
        const select = document.getElementById('agendamento-profissional-id');
        if (!select || !this.profissionais) return;

        select.innerHTML = `
            <option value="">Selecione um profissional...</option>
            ${this.profissionais.map(prof => `
                <option value="${prof.id}" ${prof.id === profissionalSelecionado ? 'selected' : ''}>
                    ${prof.nome} - ${prof.especialidade}
                </option>
            `).join('')}
        `;
    }

    gerarOpcoesHorario() {
        const horarios = [];
        for (let hora = 8; hora <= 18; hora++) {
            for (let minuto = 0; minuto < 60; minuto += 30) {
                const horaStr = hora.toString().padStart(2, '0');
                const minutoStr = minuto.toString().padStart(2, '0');
                horarios.push(`${horaStr}:${minutoStr}`);
            }
        }
        return horarios.map(horario => `<option value="${horario}">${horario}</option>`).join('');
    }

    async verificarDisponibilidade() {
        const data = document.getElementById('agendamento-data').value;
        const hora = document.getElementById('agendamento-hora').value;
        const profissionalId = document.getElementById('agendamento-profissional-id').value;

        if (!data || !hora || !profissionalId) return;

        try {
            const { data: agendamentosConflitantes, error } = await this.supabase
                .from('agendamentos')
                .select('*')
                .eq('data', data)
                .eq('hora', hora)
                .eq('profissional_id', profissionalId)
                .neq('status', 'cancelado');

            if (error) throw error;

            const disponibilidadeDiv = document.getElementById('disponibilidade-status') || 
                                     this.criarElementoDisponibilidade();

            if (agendamentosConflitantes && agendamentosConflitantes.length > 0) {
                disponibilidadeDiv.innerHTML = `
                    <div class="disponibilidade-indisponivel">
                        <i class="fas fa-times-circle"></i>
                        Horário indisponível para este profissional
                    </div>
                `;
            } else {
                disponibilidadeDiv.innerHTML = `
                    <div class="disponibilidade-disponivel">
                        <i class="fas fa-check-circle"></i>
                        Horário disponível
                    </div>
                `;
            }

        } catch (error) {
            console.error('Erro ao verificar disponibilidade:', error);
        }
    }

    criarElementoDisponibilidade() {
        const form = document.getElementById('form-agendamento');
        const disponibilidadeDiv = document.createElement('div');
        disponibilidadeDiv.id = 'disponibilidade-status';
        disponibilidadeDiv.style.marginBottom = '15px';
        
        const horaSection = document.querySelector('.form-section:nth-child(2)');
        horaSection.appendChild(disponibilidadeDiv);
        
        return disponibilidadeDiv;
    }

    async salvarAgendamento() {
        const form = document.getElementById('form-agendamento');
        if (!form) return;

        const agendamentoData = {
            cliente_id: document.getElementById('agendamento-cliente-id').value,
            profissional_id: document.getElementById('agendamento-profissional-id').value,
            data: document.getElementById('agendamento-data').value,
            hora: document.getElementById('agendamento-hora').value,
            tipo_consulta: document.getElementById('agendamento-tipo-consulta').value,
            duracao: parseInt(document.getElementById('agendamento-duracao').value) || 30,
            recurso: document.getElementById('agendamento-recurso').value || null,
            telefone_contato: document.getElementById('agendamento-telefone').value,
            observacoes: document.getElementById('agendamento-observacoes').value,
            status: 'agendado'
        };

        const agendamentoId = document.getElementById('agendamento-id').value;

        try {
            let error;
            if (agendamentoId) {
                const { data, error: updateError } = await this.supabase
                    .from('agendamentos')
                    .update(agendamentoData)
                    .eq('id', agendamentoId);
                error = updateError;
            } else {
                const { data, error: insertError } = await this.supabase
                    .from('agendamentos')
                    .insert([agendamentoData]);
                error = insertError;
            }

            if (error) throw error;

            showSuccess('Agendamento salvo com sucesso!');
            document.querySelector('.modal').remove();
            this.loadAgendamentos();

        } catch (error) {
            console.error('Erro ao salvar agendamento:', error);
            showError('Erro ao salvar agendamento: ' + error.message);
        }
    }

    async confirmarAgendamento(agendamentoId) {
        try {
            const { error } = await this.supabase
                .from('agendamentos')
                .update({ status: 'confirmado' })
                .eq('id', agendamentoId);

            if (error) throw error;

            showSuccess('Agendamento confirmado!');
            this.loadAgendamentos();

        } catch (error) {
            console.error('Erro ao confirmar agendamento:', error);
            showError('Erro ao confirmar agendamento');
        }
    }

    async cancelarAgendamento(agendamentoId) {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

        try {
            const { error } = await this.supabase
                .from('agendamentos')
                .update({ 
                    status: 'cancelado',
                    observacoes: 'Cancelado em ' + new Date().toLocaleDateString('pt-BR')
                })
                .eq('id', agendamentoId);

            if (error) throw error;

            showSuccess('Agendamento cancelado!');
            this.loadAgendamentos();

        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            showError('Erro ao cancelar agendamento');
        }
    }

    async reagendar(agendamentoId) {
        try {
            const { data: agendamento, error } = await this.supabase
                .from('agendamentos')
                .select('*')
                .eq('id', agendamentoId)
                .single();

            if (error) throw error;
            this.showFormAgendamento(agendamento);

        } catch (error) {
            console.error('Erro ao carregar agendamento:', error);
            showError('Erro ao carregar dados do agendamento');
        }
    }

    async verDetalhesAgendamento(agendamentoId) {
        try {
            const { data: agendamento, error } = await this.supabase
                .from('agendamentos')
                .select(`
                    *,
                    clientes(nome, telefone, email, data_nascimento),
                    profissionais(nome, especialidade, registro_profissional)
                `)
                .eq('id', agendamentoId)
                .single();

            if (error) throw error;

            const modalContent = `
                <div class="modal-header">
                    <h3>📅 Detalhes do Agendamento</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="agendamento-detalhes-completo">
                        <div class="detalhes-section">
                            <h4>Informações do Agendamento</h4>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Paciente:</label>
                                    <span>${agendamento.clientes.nome}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Data e Hora:</label>
                                    <span>${new Date(agendamento.data).toLocaleDateString('pt-BR')} às ${agendamento.hora}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Profissional:</label>
                                    <span>${agendamento.profissionais.nome}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Tipo de Consulta:</label>
                                    <span>${this.getTipoConsultaLabel(agendamento.tipo_consulta)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detalhes-section">
                            <h4>Contato do Paciente</h4>
                            <div class="detalhes-grid">
                                <div class="detalhe-item">
                                    <label>Telefone:</label>
                                    <span>${agendamento.clientes.telefone || 'Não informado'}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>E-mail:</label>
                                    <span>${agendamento.clientes.email || 'Não informado'}</span>
                                </div>
                                <div class="detalhe-item">
                                    <label>Idade:</label>
                                    <span>${this.calcularIdade(agendamento.clientes.data_nascimento)} anos</span>
                                </div>
                            </div>
                        </div>

                        ${agendamento.observacoes ? `
                        <div class="detalhes-section">
                            <h4>Observações</h4>
                            <p>${agendamento.observacoes}</p>
                        </div>
                        ` : ''}

                        <div class="detalhes-section">
                            <h4>Ações</h4>
                            <div class="acoes-agendamento">
                                <button class="btn btn-success" onclick="consultorioManager.confirmarAgendamento('${agendamento.id}')" 
                                        ${agendamento.status !== 'agendado' ? 'disabled' : ''}>
                                    <i class="fas fa-check"></i> Confirmar
                                </button>
                                <button class="btn btn-warning" onclick="consultorioManager.reagendar('${agendamento.id}')">
                                    <i class="fas fa-calendar-alt"></i> Reagendar
                                </button>
                                <button class="btn btn-danger" onclick="consultorioManager.cancelarAgendamento('${agendamento.id}')">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Erro ao carregar detalhes do agendamento:', error);
            showError('Erro ao carregar detalhes do agendamento');
        }
    }

    showConfigHorarios() {
        const modalContent = `
            <div class="modal-header">
                <h3>⚙️ Configuração de Horários</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="config-horarios">
                    <h4>Horário de Funcionamento</h4>
                    <div class="form-section">
                        ${['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(dia => `
                            <div class="dia-config">
                                <label>${dia}:</label>
                                <div class="horarios-dia">
                                    <input type="time" value="08:00">
                                    <span>às</span>
                                    <input type="time" value="18:00">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${dia === 'Sábado' ? '' : 'checked'}> Funciona
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <h4>Intervalos</h4>
                    <div class="form-section">
                        <div class="form-group">
                            <label>Duração Padrão das Consultas (minutos):</label>
                            <input type="number" value="30" min="15" max="120" step="15">
                        </div>
                        <div class="form-group">
                            <label>Intervalo entre Consultas (minutos):</label>
                            <input type="number" value="15" min="0" max="60" step="5">
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="consultorioManager.salvarConfigHorarios()">Salvar Configurações</button>
            </div>
        `;

        showModal(modalContent);
    }

    salvarConfigHorarios() {
        showSuccess('Configurações de horários salvas com sucesso!');
        document.querySelector('.modal').remove();
    }

    filtrarAgendamentosData(data) {
        // Implementação simplificada - em produção, faria nova consulta ao banco
        const rows = document.querySelectorAll('.agendamento-row');
        const dataFiltro = data ? new Date(data) : new Date();

        rows.forEach(row => {
            const dataCell = row.querySelector('.data-hora strong');
            if (dataCell) {
                const dataAgendamento = new Date(dataCell.textContent.split('/').reverse().join('-'));
                if (!data || dataAgendamento.toDateString() === dataFiltro.toDateString()) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    }

    atualizarVisaoCalendario() {
        const calendarContainer = document.getElementById('calendar');
        if (!calendarContainer) return;

        // Versão simplificada do calendário
        calendarContainer.innerHTML = `
            <div class="calendario-simplificado">
                <div class="calendario-header">
                    <button class="btn btn-sm btn-outline"><i class="fas fa-chevron-left"></i></button>
                    <h4>${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4>
                    <button class="btn btn-sm btn-outline"><i class="fas fa-chevron-right"></i></button>
                </div>
                <div class="calendario-grid">
                    ${this.gerarGradeCalendario()}
                </div>
            </div>
        `;
    }

    gerarGradeCalendario() {
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        let grade = '';
        for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
            const temAgendamento = Math.random() > 0.7; // Simulado
            
            grade += `
                <div class="dia-calendario ${dia === hoje.getDate() ? 'hoje' : ''} ${temAgendamento ? 'com-agendamento' : ''}">
                    <span class="numero-dia">${dia}</span>
                    ${temAgendamento ? '<div class="marcador-agendamento"></div>' : ''}
                </div>
            `;
        }
        
        return grade;
    }

    // Métodos auxiliares
    getTipoConsultaLabel(tipo) {
        const labels = {
            'consulta_oftalmologica': 'Consulta Oftalmológica',
            'exame_precoce': 'Exame de Precoce',
            'adaptacao_lente_contato': 'Adaptação Lente de Contato',
            'controle_pos_operatorio': 'Controle Pós-Operatório',
            'teste_visao': 'Teste de Visão',
            'consulta_retorno': 'Consulta de Retorno',
            'emergencia': 'Emergência'
        };
        return labels[tipo] || tipo;
    }

    getStatusAgendamentoLabel(status) {
        const labels = {
            'agendado': 'Agendado',
            'confirmado': 'Confirmado',
            'realizado': 'Realizado',
            'cancelado': 'Cancelado',
            'faltou': 'Faltou'
        };
        return labels[status] || status;
    }

    formatarRecurso(recurso) {
        return recurso.split('_')
            .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
            .join(' ');
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
}

// Inicializar quando o módulo for carregado
let consultorioManager = null;

function initConsultorio() {
    consultorioManager = new ConsultorioManager();
    window.consultorioManager = consultorioManager;
}