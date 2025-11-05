// js/components/modal.js - Gerenciador de Modais e Alertas

// Funções globais para uso nos módulos
window.showSuccess = function(message) {
    // No futuro, isso pode ser substituído por um "Toast"
    alert('✅ ' (message || "Operação realizada com sucesso!"));
};

window.showError = function(message) {
    // No futuro, isso pode ser substituído por um "Toast"
    alert('❌ ' (message || "Ocorreu um erro."));
};

window.showModal = function(content) {
    // Remove qualquer modal antigo
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar no fundo escuro
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Adiciona funcionalidade ao btn-close
    const btnClose = modal.querySelector('.btn-close');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    return modal;
};