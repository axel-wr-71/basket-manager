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
 * EKSPERCKA OBSŁUGA SESJI DLA SAFARI
 * Czeka na usera, dopóki Supabase nie zwróci poprawnej sesji.
 */
async function getStableUser() {
    for (let i = 0; i < 10; i++) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) return user;
        await new Promise(r => setTimeout(r, 300)); // Polling co 300ms
    }
    return null;
}

/**
 * GŁÓWNA FUNKCJA INICJALIZUJĄCA
 */
export async function initApp(force = false) {
    if (!force && cachedTeam && cachedPlayers && cachedProfile) {
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };
    }

    try {
        console.log("[APP] Start inicjalizacji...");
        await checkLeagueEvents();
        
        const user = await getStableUser();
        if (!user) {
            console.error("[APP] Krytyczny błąd: Brak sesji użytkownika po próbach.");
            return null;
        }

        // 1. Pobieranie profilu
        const { data: profile, error: profErr } = await supabaseClient
            .from('profiles').select('*').eq('id', user.id).single();
        if (profErr) throw profErr;

        // 2. Pobieranie drużyny (Sprawdzamy team_id z profilu)
        if (!profile.team_id) {
            console.error("[APP] Profil nie ma przypisanego team_id.");
            return null;
        }

        const { data: team, error: teamErr } = await supabaseClient
            .from('teams').select('*').eq('id', profile.team_id).single();
        if (teamErr) throw teamErr;

        // 3. Pobieranie zawodników - Jawny JOIN z kategorią potencjału
        console.log("[APP] Pobieranie zawodników dla zespołu:", team.name || team.team_name);
        
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select(`
                *,
                potential_definitions!fk_potential_definition (
                    id, label, color_hex, emoji, min_value
                )
            `)
            .eq('team_id', team.id);

        if (playersError) {
            console.warn("[APP] Błąd relacji potencjału, ładuję dane bez definicji:", playersError.message);
            const { data: fallbackPlayers } = await supabaseClient
                .from('players').select('*').eq('team_id', team.id);
            cachedPlayers = fallbackPlayers || [];
        } else {
            cachedPlayers = players;
        }

        // Cache'owanie danych
        cachedProfile = profile; 
        cachedTeam = team; 

        // Globalne zmienne pomocnicze
        window.userTeamId = team.id;
        window.currentManager = profile;

        updateUIHeader(profile);
        console.log("[APP] System gotowy. Liczba zawodników:", cachedPlayers.length);
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };

    } catch (err) {
        console.error("[APP CRITICAL ERROR]", err.message);
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
    const ids = ['roster-view-container', 'market-container', 'finances-container', 'training-container', 'app-main-view'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

window.showRoster = async (force = false) => {
    const data = await initApp(force);
    if (data && data.players) {
        clearAllContainers();
        renderRosterView(data.team, data.players);
    } else {
        console.warn("[UI] Brak danych do wyświetlenia rostera.");
    }
};

window.switchTab = async (tabName) => {
    const data = await initApp();
    if (!data) return;
    clearAllContainers();
    if (tabName.includes('roster')) renderRosterView(data.team, data.players);
    else if (tabName.includes('market')) renderMarketView(data.team, data.players);
    else if (tabName.includes('finances')) renderFinancesView(data.team, data.players);
    else if (tabName.includes('training')) renderTrainingDashboard(data.players);
};

// Start aplikacji przy załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    window.showRoster();
});
