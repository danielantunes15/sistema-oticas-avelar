// supabase.js - Configuração simplificada (sem auth obrigatória)
class SupabaseConfig {
    constructor() {
        this.supabaseUrl = 'https://pbyfvyszmjgrvzbrwafl.supabase.co';
        this.anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBieWZ2eXN6bWpncnZ6YnJ3YWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NTM5MTMsImV4cCI6MjA3NzQyOTkxM30.0bPCtr4s4Bsg3mzmAOJhB8Mfei0K5br5S9NMZlvyzXs';
        this.client = null;
        this.init();
    }

    init() {
        try {
            if (typeof supabase === 'undefined') {
                console.log('Supabase SDK carregando...');
                return;
            }

            this.client = supabase.createClient(this.supabaseUrl, this.anonKey);
            console.log('✅ Supabase conectado (modo público)');
            
        } catch (error) {
            console.log('⚠️ Supabase em modo offline - funcionalidades locais');
        }
    }

    getClient() {
        return this.client;
    }
}

// Inicializar de forma segura
let supabaseInstance = null;

function initializeSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = new SupabaseConfig();
    }
    return supabaseInstance.getClient();
}

// Tornar disponível globalmente
window.supabaseClient = initializeSupabase();