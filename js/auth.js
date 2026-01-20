// js/auth.js
const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
export const supabaseClient = _supabase;
window.supabase = _supabase;

import { initApp, switchTab } from './app/app.js';

window.POTENTIAL_MAP = [];

/**
 * FUNKCJA NAPRAWIAJĄCA NAZWĘ DRUŻYNY W PRAWYM GÓRNYM ROGU
 */
async function fetchManagerTeam(userId) {
    try {
        const { data: profile, error: profileError } = await _supabase
            .from('profiles')
            .select('team_id')
            .eq('id', userId)
            .single();

        if (profileError || !profile?.team_id) {
            console.warn("[AUTH] Użytkownik nie ma przypisanego team_id w profilu.");
            return;
        }

        const { data: team, error: teamError } = await _supabase
            .from('teams')
            .select('team_name, league_name')
            .eq('id', profile.team_id)
            .single();

        if (teamError) throw teamError;

        if (team) {
            // Safari/MacBook selectors
            const headerTeamName = document.getElementById('display-team-name');
            const headerLeagueName = document.getElementById('display-league-name');

            if (headerTeamName) headerTeamName.textContent = team.team_name;
            if (headerLeagueName) headerLeagueName.textContent = team.league_name;
            
            console.log("[AUTH] Nagłówek zaktualizowany pomyślnie:", team.team_name);
        }
    } catch (err) {
        console.warn("[AUTH] Błąd podczas pobierania danych do nagłówka:", err.message);
    }
}

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
        console.error("Błąd potencjałów:", err);
        window.POTENTIAL_MAP = [{ min_value: 0, label: 'Player', color_hex: '#94a3b8', emoji: '👤' }];
    }
}

/**
 * Zaktualizowana funkcja setupUI - eliminuje migotanie
 */
export const setupUI = async (role) => {
    console.log("[AUTH] setupUI dla roli:", role);
    const landingPage = document.getElementById('landing-page');
    const gameApp = document.getElementById('game-app');
    const managerNav = document.getElementById('manager-nav');

    // Usuwamy klasy blokujące widoczność (Anti-Flicker)
    if (landingPage) {
        landingPage.style.display = 'none';
        landingPage.classList.add('auth-state-pending');
    }
    
    if (gameApp) {
        gameApp.style.display = 'block';
        gameApp.classList.remove('auth-state-pending');
    }

    if (role === 'manager') {
        if (managerNav) managerNav.style.display = 'flex';
        await initApp();
        await switchTab('m-roster');
    }
};
window.setupUI = setupUI;

/**
 * NOWA FUNKCJA: showLogin
 * Bezpieczne pokazanie ekranu logowania bez migania
 */
window.showLogin = function() {
    const landingPage = document.getElementById('landing-page');
    const gameApp = document.getElementById('game-app');
    
    if (gameApp) {
        gameApp.style.display = 'none';
        gameApp.classList.add('auth-state-pending');
    }
    if (landingPage) {
        landingPage.style.display = 'flex';
        landingPage.classList.remove('auth-state-pending');
    }
};

export async function checkUser() {
    // Sprawdzamy sesję
    const { data: { session } } = await _supabase.auth.getSession();
    const user = session?.user;
    
    if (user) {
        await fetchPotentialDefinitions();
        
        let { data: profile } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile) {
            const { data: newProfile } = await _supabase
                .from('profiles')
                .insert([{ id: user.id, email: user.email, role: 'manager' }])
                .select().single();
            profile = newProfile;
        }

        await fetchManagerTeam(user.id);
        await setupUI(profile?.role || 'manager');
    } else {
        // Wywołujemy bezpieczne pokazanie logowania
        window.showLogin();
    }
}
window.checkUser = checkUser;

export const signIn = async () => {
    const e = document.getElementById('email')?.value;
    const p = document.getElementById('password')?.value;
    console.log("[AUTH] Próba logowania...");
    const { error } = await _supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) {
        alert("Błąd: " + error.message);
    } else {
        await checkUser();
    }
};
window.signIn = signIn;

export const signUp = async () => {
    const e = document.getElementById('email')?.value;
    const p = document.getElementById('password')?.value;
    const { error } = await _supabase.auth.signUp({ email: e, password: p });
    if (error) alert("Błąd rejestracji: " + error.message);
    else alert("Konto założone! Możesz się zalogować.");
};
window.signUp = signUp;

export const logout = async () => { 
    await _supabase.auth.signOut(); 
    location.reload(); 
};
window.logout = logout;

// Nasłuchiwanie zmian stanu (kluczowe dla Safari przy odświeżaniu)
_supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') checkUser();
    if (event === 'SIGNED_OUT') window.showLogin();
});

document.addEventListener('DOMContentLoaded', () => checkUser());
