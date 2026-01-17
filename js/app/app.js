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
 * Główna funkcja inicjująca dane - ZAKTUALIZOWANA
 */
export async function initApp(forceRefresh = false) {
    if (!forceRefresh && cachedTeam && cachedPlayers && cachedProfile) {
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };
    }

    try {
        await checkLeagueEvents();
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error("Błąd autoryzacji");

        // 1. Pobieramy profil, aby wyciągnąć team_id (Kragujevac Hoops)
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) throw new Error("Nie znaleziono profilu użytkownika.");
        if (!profile.team_id) throw new Error("Twoje konto nie ma przypisanej drużyny w profilu.");

        // 2. Pobieramy dane zespołu na podstawie team_id z profilu
        const { data: team, error: teamError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('id', profile.team_id)
            .single();

        if (teamError || !team) throw new Error("Nie można załadować danych drużyny z tabeli teams.");

        // 3. Pobieramy zawodników tego zespołu
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', team.id);

        if (playersError) throw playersError;

        // Aktualizacja cache i globalnych zmiennych
        cachedProfile = profile;
        cachedTeam = team;
        cachedPlayers = players;
        window.userTeamId = team.id;
        window.currentManager = profile;

        // Aktualizacja UI nagłówka
        updateUIHeader(profile);

        return { team, players, profile };
    } catch (err) {
        console.error("[APP INIT ERROR]", err.message);
        renderError(err.message);
        return null;
    }
}

/**
 * Aktualizuje nazwy w interfejsie
 */
function updateUIHeader(profile) {
    const teamNameEl = document.getElementById('display-team-name');
    if (teamNameEl) teamNameEl.innerText = profile.team_name || "Brak nazwy";
    
    const leagueNameEl = document.getElementById('display-league-name');
    if (leagueNameEl) leagueNameEl.innerText = profile.league_name || "Brak ligi";
}

/**
 * Czyści kontenery widoków
 */
function clearAllContainers() {
    // Lista wszystkich kontenerów z Twoich 5 modułów
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

// --- FUNKCJE WYŚWIETLANIA WIDOKÓW ---

export async function showRoster(forceRefresh = false) {
    const data = await initApp(forceRefresh);
    if (data) {
        clearAllContainers();
        // Upewnij się, że masz kontener o id 'roster-view-container' w index.html
        renderRosterView(data.team, data.players);
    }
}

export async function showTraining(forceRefresh = false) {
    const data = await initApp(forceRefresh);
    if (data) {
        clearAllContainers();
        renderTrainingDashboard(data.team, data.players);
    }
}

export async function showMarket() {
    const data = await initApp(true);
    if (data) {
        clearAllContainers();
        renderMarketView(data.team);
    }
}

export async function showFinances() {
    const data = await initApp(true);
    if (data) {
        clearAllContainers();
        renderFinancesView(data.team);
    }
}

/**
 * Obsługa nawigacji (menu)
 */
window.switchTab = async (tabName) => {
    console.log("[APP] Przełączanie na:", tabName);
    
    // Obsługa widoków managera
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
            // Obsługa widoków admina (jeśli switchTab jest współdzielony)
            const adminTabs = ['admin-tab-gen', 'admin-tab-players', 'admin-tab-leagues', 'admin-tab-media'];
            if (adminTabs.includes(tabName)) {
                window.showAdminTab(tabName);
            } else {
                console.warn("Nieznana zakładka:", tabName);
            }
    }
};

/**
 * Funkcja pomocnicza do błędów
 */
function renderError(message) {
    const container = document.getElementById('app-main-view') || document.body;
    container.innerHTML = `
        <div style="color: #ff4444; padding: 20px; text-align: center; background: #1a1a1a; border-radius: 15px; border: 1px solid #333; margin: 20px;">
            <h3 style="margin-top:0; color: #fff;">Błąd Modułu Managera</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="background:#444; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; margin-top:10px;">Spróbuj ponownie</button>
        </div>
    `;
}

window.refreshCurrentView = (viewName) => {
    if (viewName === 'roster') showRoster(true);
    if (viewName === 'training') showTraining(true);
};
