// auth.js - Sistema de Autenticação Corrigido
class AuthManager {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        // Aguardar o Supabase estar pronto
        await this.waitForSupabase();
        this.bindEvents();
        await this.checkAuthState();
    }

    async waitForSupabase() {
        // Esperar até que o Supabase esteja disponível
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                this.handleLogin(e);
            });
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            this.showDashboard(data.user);
            
        } catch (error) {
            this.showError('Erro no login: ' + error.message);
        }
    }

    async checkAuthState() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.showDashboard(session.user);
            }
        } catch (error) {
            console.log('Nenhuma sessão ativa');
        }
    }

    showDashboard(user) {
        const loginScreen = document.getElementById('login-screen');
        const dashboardScreen = document.getElementById('dashboard-screen');
        const userName = document.getElementById('user-name');
        
        if (userName) {
            userName.textContent = user.email || 'Usuário';
        }
        
        if (loginScreen && dashboardScreen) {
            loginScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
        }
        
        // Inicializar dashboard após mostrar a tela
        setTimeout(() => {
            if (window.dashboard) {
                window.dashboard.init();
            }
        }, 100);
    }

    showError(message) {
        alert(message); // Você pode substituir por um toast mais elegante
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
});