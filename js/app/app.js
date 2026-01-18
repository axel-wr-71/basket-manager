// js/app/app.js
import { supabaseClient } from '../auth.js';
import { checkLeagueEvents } from '../core/league_clock.js';
import { renderTrainingDashboard } from './training_view.js';
import { renderRosterView } from './roster_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';

// Cache na dane
let cachedTeam = null;
let cachedPlayers = null;
let cachedProfile = null;

/**
 * Główna funkcja inicjująca dane
 */
export async function initApp(forceRefresh = false) {
    if (!forceRefresh && cachedTeam && cachedPlayers && cachedProfile) {
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };
    }

    try {
        // Sprawdzamy eventy ligowe (np. starzenie się zawodników)
        await checkLeagueEvents();

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error("Błąd autoryzacji");

        // 1. Pobieramy profil managera
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) throw new Error("Nie znaleziono profilu użytkownika.");
        if (!profile.team_id) throw new Error("Twoje konto nie ma przypisanej drużyny.");

        // 2. Pobieramy dane zespołu
        const { data: team, error: teamError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('id', profile.team_id)
            .single();

        if (teamError || !team) throw new Error("Nie można załadować danych drużyny.");

        // 3. Pobieramy zawodników
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', team.id);

        if (playersError) throw playersError;

        // Aktualizacja cache
        cachedProfile = profile;
        cachedTeam = team;
        cachedPlayers = players;
        
        // Zmienne globalne pomocne przy debugowaniu w Safari
        window.userTeamId = team.id;
        window.currentManager = profile;

        updateUIHeader(profile);

        return { team, players, profile };
    } catch (err) {
        console.error("[APP INIT ERROR]", err.message);
        renderError(err.message);
        return null;
    }
}

/**
 * Aktualizuje nagłówek (Nazwa Drużyny / Liga)
 */
function updateUIHeader(profile) {
    const teamNameEl = document.getElementById('display-team-name');
    const leagueNameEl = document.getElementById('display-league-name');
    
    if (teamNameEl) teamNameEl.innerText = profile.team_name || "Manager";
    if (leagueNameEl) leagueNameEl.innerText = profile.league_name || "EBL Professional";
}

/**
 * Czyści wszystkie kontenery przed załadowaniem nowego widoku
 */
function clearAllContainers() {
    const containers = [
        'roster-view-container', 
        'app-main-view', 
        'market-container', 
        'finances-container',
        'training-container'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

// --- FUNKCJE WIDOKÓW (EKSPORTOWANE DO WINDOW) ---

export const showRoster = async (forceRefresh = false) => {
    try {
        const data = await initApp(forceRefresh);
        if (data) {
            clearAllContainers();
            // renderRosterView pochodzi z importu roster_view.js
            await renderRosterView(data.team, data.players);
        }
    } catch (e) {
        console.error("Błąd widoku składu:", e);
    }
};

export const showTraining = async (forceRefresh = false) => {
    try {
        const data = await initApp(forceRefresh);
        if (data) {
            clearAllContainers();
            await renderTrainingDashboard(data.team, data.players);
        }
    } catch (e) {
        console.error("Błąd widoku treningu:", e);
    }
};

export const showMarket = async () => {
    try {
        const data = await initApp(true);
        if (data) {
            clearAllContainers();
            await renderMarketView(data.team);
        }
    } catch (e) {
        console.error("Błąd widoku rynku:", e);
    }
};

export const showFinances = async () => {
    try {
        const data = await initApp(true);
        if (data) {
            clearAllContainers();
            await renderFinancesView(data.team);
        }
    } catch (e) {
        console.error("Błąd widoku finansów:", e);
    }
};

/**
 * Główny Switcher Zakładek
 */
window.switchTab = async (tabName) => {
    console.log("[Safari Debug] Przełączanie na:", tabName);
    
    // Obsługa aktywnych klas przycisków
    document.querySelectorAll('.btn-tab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[onclick*="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Obsługa logiki widoków
    switch(tabName) {
        case 'm-roster':
        case 'roster':
            await showRoster();
            break;
        case 'm-training':
        case 'training':
            await showTraining();
            break;
        case 'm-market':
        case 'market':
            await showMarket();
            break;
        case 'm-finances':
        case 'finances':
            await showFinances();
            break;
        default:
            // Obsługa widoków administracyjnych
            if (tabName.startsWith('admin-')) {
                if (window.showAdminTab) window.showAdminTab(tabName);
            }
    }
};

function renderError(message) {
    const container = document.getElementById('app-main-view') || document.body;
    container.innerHTML = `
        <div style="color: #ff4444; padding: 30px; text-align: center; background: rgba(255,0,0,0.1); border-radius: 20px; border: 1px solid rgba(255,0,0,0.2); margin: 20px;">
            <h3 style="color: #fff;">Błąd systemu</h3>
            <p style="opacity: 0.8;">${message}</p>
            <button onclick="location.reload()" style="background:#fff; color:#000; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:700; margin-top:15px;">Odśwież stronę</button>
        </div>
    `;
}

// Rejestracja funkcji w window dla MacBook/Safari
window.showRoster = showRoster;
window.showTraining = showTraining;
window.showMarket = showMarket;
window.showFinances = showFinances;
window.initApp = initApp;

// Auto-inicjalizacja przy starcie
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
