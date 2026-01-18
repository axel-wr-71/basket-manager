// js/app/app.js
import { supabaseClient } from '../auth.js';
import { checkLeagueEvents } from '../core/league_clock.js';
import { renderTrainingDashboard } from './training_view.js';
import { renderRosterView } from './roster_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';

/**
 * Pobieranie sesji z wymuszonym odświeżeniem dla Safari
 */
async function getAuthenticatedUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) return user;
    
    // Drugi stopień - sesja z cookie
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.user || null;
}

/**
 * GŁÓWNA INICJALIZACJA
 */
export async function initApp() {
    try {
        console.log("[APP] Start inicjalizacji...");
        await checkLeagueEvents();
        
        const user = await getAuthenticatedUser();
        if (!user) {
            console.error("[APP] Błąd: Brak sesji.");
            return null;
        }

        // 1. Profil
        const { data: profile } = await supabaseClient
            .from('profiles').select('*').eq('id', user.id).single();

        // 2. Drużyna
        const { data: team } = await supabaseClient
            .from('teams').select('*').eq('id', profile.team_id).single();

        // 3. Zawodnicy - Tu jest Twoje 12 osób z logów
        console.log(`[APP] Pobieranie zawodników dla: ${team?.name}`);
        const { data: players, error: plErr } = await supabaseClient
            .from('players')
            .select(`
                *,
                potential_definitions!fk_potential_definition (
                    id, label, color_hex, emoji, min_value
                )
            `)
            .eq('team_id', team.id);

        if (plErr) throw plErr;

        // Globalne przypisania dla akcji w widokach
        window.userTeamId = team.id;
        window.currentManager = profile;

        updateUIHeader(profile);
        
        // KLUCZOWE: Zwracamy obiekt z danymi bezpośrednio
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
    if (lName) lName.innerText = profile.league_name || "Serbia Super League";
}

window.showRoster = async () => {
    console.log("[UI] Próba wyświetlenia rostera...");
    const data = await initApp();
    
    // Sprawdzamy czy data i players fizycznie istnieją
    if (data && data.players && data.players.length > 0) {
        console.log(`[UI] Renderowanie ${data.players.length} zawodników.`);
        
        // Czyścimy kontenery przed renderem
        const container = document.getElementById('roster-view-container');
        if (container) container.innerHTML = ''; 
        
        renderRosterView(data.team, data.players);
    } else {
        console.error("[UI] Błąd: initApp zwrócił puste dane zawodników.");
    }
};

window.switchTab = async (tabName) => {
    const data = await initApp();
    if (!data) return;

    if (tabName.includes('roster')) renderRosterView(data.team, data.players);
    else if (tabName.includes('market')) renderMarketView(data.team, data.players);
    else if (tabName.includes('finances')) renderFinancesView(data.team, data.players);
    else if (tabName.includes('training')) renderTrainingDashboard(data.players);
};

document.addEventListener('DOMContentLoaded', () => window.showRoster());
