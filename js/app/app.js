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

async function getAuthenticatedUser() {
    let { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        await new Promise(res => setTimeout(res, 300));
        const retry = await supabaseClient.auth.getUser();
        user = retry.data.user;
    }
    return user;
}

export async function initApp(forceRefresh = false) {
    if (!forceRefresh && cachedTeam && cachedPlayers && cachedProfile) {
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };
    }

    try {
        await checkLeagueEvents();
        const user = await getAuthenticatedUser();
        if (!user) throw new Error("Błąd autoryzacji");

        const { data: profile } = await supabaseClient
            .from('profiles').select('*').eq('id', user.id).single();

        const { data: team } = await supabaseClient
            .from('teams').select('*').eq('id', profile.team_id).single();

        // KLUCZOWE: Zapytanie dopasowane do Twojego wyniku SQL
       // js/app/app.js - KLUCZOWA POPRAWKA
async function fetchPlayerData(myTeamId) {
    const { data, error } = await supabase
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
        .eq('team_id', myTeamId);

    if (error) {
        console.error("Błąd pobierania:", error);
        return [];
    }
    return data;
}
        if (plErr) throw plErr;

        cachedProfile = profile; cachedTeam = team; cachedPlayers = players;
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

window.showRoster = async (force = false) => {
    const data = await initApp(force);
    if (data) {
        clearAllContainers();
        renderRosterView(data.team, data.players);
    }
};

window.switchTab = async (tabName) => {
    if (tabName.includes('roster')) await window.showRoster();
    // ... reszta logiki switchTab pozostaje bez zmian
};

document.addEventListener('DOMContentLoaded', () => window.showRoster());
