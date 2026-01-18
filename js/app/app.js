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
 * Pobiera zalogowanego użytkownika z obsługą retry dla Safari
 */
async function getAuthenticatedUser() {
    let { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        await new Promise(res => setTimeout(res, 300));
        const retry = await supabaseClient.auth.getUser();
        user = retry.data.user;
    }
    return user;
}

/**
 * Główna funkcja inicjalizująca aplikację
 */
async function initApp(force = false) {
    if (!force && cachedTeam && cachedPlayers) {
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };
    }

    try {
        await checkLeagueEvents();
        const user = await getAuthenticatedUser();
        if (!user) throw new Error("Błąd autoryzacji");

        // 1. Pobierz profil managera
        const { data: profile, error: profErr } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (profErr) throw profErr;

        // 2. Pobierz dane drużyny
        const { data: team, error: teamErr } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('id', profile.team_id)
            .single();
        if (teamErr) throw teamErr;

        // 3. Pobierz zawodników z relacją potencjału (NAPRAWIONE)
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select(`
                *,
                potential_definitions:potential (
                    id,
                    label,
                    color_hex,
                    emoji,
                    min_value
                )
            `)
            .eq('team_id', team.id);

        if (playersError) throw playersError;

        // Kaching danych
        cachedProfile = profile;
        cachedTeam = team;
        cachedPlayers = players;
        
        window.userTeamId = team.id;
        window.currentManager = profile;

        updateUIHeader(profile);
        return { team, players, profile };

    } catch (err) {
        console.error("[APP INIT ERROR]", err.message);
        return null;
    }
}

function updateUIHeader(profile) {
    const tName = document.getElementById('display-team-name');
    const lName = document.getElementById('display-league-name');
    if (tName) tName.innerText = profile.team_name || "Manager";
    if (lName) lName.innerText = profile.league_name || "EBL Professional";
}

function clearAllContainers() {
    ['roster-view-container', 'market-container', 'finances-container', 'training-container', 'app-main-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

/**
 * Globalne funkcje nawigacji
 */
window.showRoster = async (force = false) => {
    const data = await initApp(force);
    if (data) {
        clearAllContainers();
        renderRosterView(data.team, data.players);
    }
};

window.switchTab = async (tabName) => {
    // Prosta nawigacja między modułami
    if (tabName.includes('roster')) {
        await window.showRoster();
    } else if (tabName.includes('training')) {
        const data = await initApp();
        clearAllContainers();
        renderTrainingDashboard(data.players);
    }
    // Tutaj możesz dodać kolejne taby (market, finances)
};

// Start aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => window.showRoster());
