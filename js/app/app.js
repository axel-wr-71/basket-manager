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

export async function initApp(forceRefresh = false) {
    if (!forceRefresh && cachedTeam && cachedPlayers && cachedProfile) {
        return { team: cachedTeam, players: cachedPlayers, profile: cachedProfile };
    }

    try {
        await checkLeagueEvents();

        // Safari Fix: Sprawdzamy sesję zamiast getUser, co jest szybsze przy starcie
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session || !session.user) {
            console.warn("Brak aktywnej sesji, próba pobrania usera...");
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error("Błąd autoryzacji - zaloguj się ponownie.");
        }

        const user = session ? session.user : (await supabaseClient.auth.getUser()).data.user;

        // 1. Pobieramy profil
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) throw new Error("Nie znaleziono profilu użytkownika.");
        
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

        cachedProfile = profile;
        cachedTeam = team;
        cachedPlayers = players;
        
        window.userTeamId = team.id;
        window.currentManager = profile;

        updateUIHeader(profile);
        return { team, players, profile };

    } catch (err) {
        console.error("[APP INIT ERROR]", err.message);
        // Jeśli to błąd autoryzacji, nie blokujmy renderowania błędów
        const container = document.getElementById('app-main-view');
        if (container) container.innerHTML = `<div style="color:white; padding:20px;">Sesja wygasła lub błąd: ${err.message}</div>`;
        return null;
    }
}

function updateUIHeader(profile) {
    const teamNameEl = document.getElementById('display-team-name');
    const leagueNameEl = document.getElementById('display-league-name');
    if (teamNameEl) teamNameEl.innerText = profile.team_name || "Manager";
    if (leagueNameEl) leagueNameEl.innerText = profile.league_name || "EBL Professional";
}

function clearAllContainers() {
    const containers = ['roster-view-container', 'market-container', 'finances-container', 'training-container', 'app-main-view'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

// Widoki
window.showRoster = async (forceRefresh = false) => {
    const data = await initApp(forceRefresh);
    if (data) {
        clearAllContainers();
        renderRosterView(data.team, data.players);
    }
};

window.showMarket = async () => {
    const data = await initApp(true);
    if (data) {
        clearAllContainers();
        renderMarketView(data.team);
    }
};

window.showTraining = async (forceRefresh = false) => {
    const data = await initApp(forceRefresh);
    if (data) {
        clearAllContainers();
        renderTrainingDashboard(data.team, data.players);
    }
};

window.switchTab = async (tabName) => {
    console.log("[Safari Debug] Przełączanie na:", tabName);
    
    // Klasy active dla przycisków
    document.querySelectorAll('.btn-tab').forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'm-roster' || tabName === 'roster') await window.showRoster();
    if (tabName === 'm-market' || tabName === 'market') await window.showMarket();
    if (tabName === 'm-training' || tabName === 'training') await window.showTraining();
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    window.showRoster(); 
});
