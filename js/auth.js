// js/auth.js

const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';

// Inicjalizacja klienta Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const supabaseClient = _supabase;
window.supabase = _supabase;

// Globalne dane potencjałów
window.POTENTIAL_MAP = [];

/**
 * Pobiera definicje potencjałów z bazy
 */
async function fetchPotentialDefinitions() {
    try {
        const { data, error } = await _supabase
            .from('potential_definitions')
            .select('*')
            .order('min_value', { ascending: false });

        if (error) throw error;
        window.POTENTIAL_MAP = data || [];
        console.log("[AUTH] Potencjały załadowane:", window.POTENTIAL_MAP.length);
    } catch (err) {
        console.error("[AUTH] Błąd tabeli potential_definitions:", err);
        // Fallback, aby aplikacja działała nawet bez bazy
        window.POTENTIAL_MAP = [{ min_value: 0, label: 'Player', color_hex: '#94a3b8', emoji: '👤' }];
    }
}

/**
 * Pobiera dane potencjału dla konkretnej wartości (zabezpieczona)
 */
window.getPotentialData = (val) => {
    const p = parseInt(val) || 0;
    const map = window.POTENTIAL_MAP || [];
    
    // Jeśli mapa jest pusta, zwróć domyślne dane
    if (map.length === 0) {
        return { label: 'Prospect', color: '#94a3b8', icon: '👤' };
    }

    const def = map.find(d => p >= d.min_value);
    
    if (def) {
        return {
            label: def.label,
            color: def.color_hex,
            icon: def.emoji || '🏀'
        };
    }
    return { label: 'Prospect', color: '#94a3b8', icon: '📋' };
};

/**
 * Funkcja logowania
 */
async function signIn() {
    const e = document.getElementById('email')?.value;
    const p = document.getElementById('password')?.value;
    
    if (!e || !p) {
        alert("Wypełnij pola email i hasło!");
        return;
    }

    try {
        const { error } = await _supabase.auth.signInWithPassword({ email: e, password: p });
        if (error) throw error;
        await checkUser();
    } catch (error) {
        alert("Błąd logowania: " + error.message);
    }
}

/**
 * Funkcja rejestracji
 */
async function signUp() {
    const e = document.getElementById('email')?.value;
    const p = document.getElementById('password')?.value;
    
    if (!e || !p) {
        alert("Wypełnij pola email i hasło!");
        return;
    }

    try {
        const { error } = await _supabase.auth.signUp({ email: e, password: p });
        if (error) throw error;
        alert("Konto stworzone! Sprawdź pocztę e-mail, aby potwierdzić rejestrację.");
    } catch (error) {
        alert("Błąd rejestracji: " + error.message);
    }
}

/**
 * Sprawdzanie sesji i inicjalizacja widoku
 */
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('game-app');
    const userDisplay = document.getElementById('user-info-display');

    if (user) {
        // Najpierw pobierz dane o potencjałach
        await fetchPotentialDefinitions();

        if (landing) landing.style.display = 'none';
        if (app) app.style.display = 'block';

        const isAdmin = (user.email === 'strubbe23@gmail.com');
        const role = isAdmin ? 'admin' : 'manager';

        try {
            let { data: teamData, error: fErr } = await _supabase
                .from('teams')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (!teamData && !fErr && !isAdmin) {
                // Automatyczne tworzenie drużyny dla nowych graczy
                const { data: newTeam } = await _supabase
                    .from('teams')
                    .insert([{ 
                        owner_id: user.id, 
                        team_name: `Team ${user.email.split('@')[0]}`,
                        balance: 500000
                    }])
                    .select().single();
                teamData = newTeam;
            }

            if (userDisplay) {
                const statusName = isAdmin ? "Admin" : (teamData ? teamData.team_name : "Manager");
                userDisplay.innerText = `${user.email} (${statusName})`;
            }

            // Start głównego UI
            if (typeof window.setupUI === 'function') {
                window.setupUI(role);
            }

        } catch (e) { 
            console.error("[AUTH] Błąd podczas inicjalizacji użytkownika:", e); 
        }
    } else {
        if (landing) landing.style.display = 'block';
        if (app) app.style.display = 'none';
    }
}

async function logout() { 
    await _supabase.auth.signOut(); 
    location.reload(); 
}

// Udostępnienie funkcji globalnych dla HTML
window.signIn = signIn;
window.signUp = signUp;
window.logout = logout;
window.signOut = logout;
window.checkUser = checkUser;

// Pierwsze sprawdzenie przy starcie
document.addEventListener('DOMContentLoaded', () => {
    checkUser();
});
