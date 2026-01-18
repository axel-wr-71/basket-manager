// js/app/app.js
import { supabaseClient } from '../auth.js';
import { checkLeagueEvents } from '../core/league_clock.js';
import { renderTrainingDashboard } from './training_view.js';
import { renderRosterView } from './roster_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';

let cachedTeam = null;
let cachedPlayers = null;
let cachedProfile = null;

/**
 * Pobiera zalogowanego użytkownika z obsługą retry dla Safari na MacBooku.
 */
async function getAuthenticatedUser() {
    let { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        // Safari potrzebuje chwili na odczyt ciasteczek sesyjnych
        await new Promise(res => setTimeout(res, 500));
        const retry = await supabaseClient.auth.getUser();
        user = retry.data.user;
    }
    return user;
}

/**
 * GŁÓWNA FUNKCJA INICJALIZUJĄCA - EXPORT JEST NIEZBĘDNY DLA EKRANU LOGOWANIA
 * Rozwiązuje błędy: SyntaxError, Błąd autoryzacji oraz literówki w zmiennych.
 */
export async function initApp(force = false) {
    if (!force && cachedTeam && cachedPlayers && cachedProfile) {
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };
    }

    try {
        await checkLeagueEvents();
        const user = await getAuthenticatedUser();
        
        if (!user) {
            console.error("[APP] Brak aktywnej sesji użytkownika.");
            return null;
        }

        // 1. Pobieranie profilu managera
        const { data: profile, error: profErr } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (profErr) throw profErr;

        // 2. Pobieranie danych drużyny
        const { data: team, error: teamErr } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('id', profile.team_id)
            .single();
            
        if (teamErr) throw teamErr;

        // 3. Pobieranie zawodników z relacją potencjału
        // Używamy JAWNEGO wskazania relacji fk_potential_definition
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select(`
                *,
                potential_definitions!fk_potential_definition (
                    id, 
                    label, 
                    color_hex, 
                    emoji, 
                    min_value
                )
            `)
            .eq('team_id', team.id);

        // NAPRAWA BŁĘDU: Używamy playersError zamiast nieistniejącego plErr
        if (playersError) {
            console.error("[DATABASE ERROR] Błąd pobierania zawodników:", playersError.message);
            throw playersError;
        }

        // Cache'owanie danych dla wydajności
        cachedProfile = profile; 
        cachedTeam = team; 
        cachedPlayers = players;

        // Globalne zmienne dla akcji i innych komponentów
        window.userTeamId = team.id;
        window.currentManager = profile;

        updateUIHeader(profile);
        return { team, players, profile };

    } catch (err) {
        console.error("[APP INIT ERROR] Szczegóły:", err.message);
        return null;
    }
}

/**
 * Aktualizacja elementów nagłówka UI
 */
function updateUIHeader(profile) {
    const tName = document.getElementById('display-team-name');
    const lName = document.getElementById('display-league-name');
    if (tName) tName.innerText = profile.team_name || "Manager";
    if (lName) lName.innerText = profile.league_name || "EBL Professional";
}

/**
 * Czyszczenie kontenerów widoków przed renderowaniem
 */
function clearAllContainers() {
    const ids = [
        'roster-view-container', 
        'market-container', 
        'finances-container', 
        'training-container', 
        'app-main-view'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

/**
 * Globalna funkcja wyświetlania Rostera
 */
window.showRoster = async (force = false) => {
    const data = await initApp(force);
    if (data && data.players) {
        clearAllContainers();
        renderRosterView(data.team, data.players);
    } else {
        console.warn("[UI] Nie można załadować rostera: brak danych.");
    }
};

/**
 * Router zakładek aplikacji
 */
window.switchTab = async (tabName) => {
    const data = await initApp();
    if (!data) return;

    clearAllContainers();

    if (tabName.includes('roster')) {
        renderRosterView(data.team, data.players);
    } else if (tabName.includes('market')) {
        renderMarketView(data.team, data.players);
    } else if (tabName.includes('finances')) {
        renderFinancesView(data.team, data.players);
    } else if (tabName.includes('training')) {
        renderTrainingDashboard(data.players);
    }
};

// Start aplikacji po załadowaniu drzewa DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("[APP] System gotowy.");
    window.showRoster();
});
