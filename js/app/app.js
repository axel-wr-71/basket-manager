// js/app/app.js
import { supabaseClient } from '../auth.js';
import { checkLeagueEvents } from '../core/league_clock.js';
import { renderTrainingDashboard } from './training_view.js';
import { renderRosterView } from './roster_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';

// Cache na dane, aby aplikacja działała szybciej przy przełączaniu zakładek
let cachedTeam = null;
let cachedPlayers = null;

/**
 * Główna funkcja inicjująca dane.
 * Wywoływana raz przy wejściu do panelu managera.
 */
export async function initApp() {
    console.log("[APP] Pobieranie świeżych danych z bazy...");

    try {
        await checkLeagueEvents();

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error("Błąd autoryzacji użytkownika");

        const { data: team, error: teamError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        if (teamError || !team) {
            throw new Error("Musisz posiadać drużynę, aby zarządzać klubem.");
        }

        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', team.id);

        if (playersError) throw new Error("Błąd podczas pobierania zawodników");

        // Zapisujemy do cache i globalnego ID
        cachedTeam = team;
        cachedPlayers = players;
        window.userTeamId = team.id;

        return { team, players };

    } catch (err) {
        renderError(err.message);
        return null;
    }
}

/**
 * Czyści kontenery, aby uniknąć nakładania się widoków
 */
function clearAllContainers() {
    const containers = [
        'roster-view-container',
        'app-main-view',      // Trening
        'market-container',
        'finances-container'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

/**
 * Wyświetla widok zawodników (Roster)
 */
export async function showRoster() {
    if (!cachedTeam || !cachedPlayers) {
        const data = await initApp();
        if (!data) return;
    }
    clearAllContainers();
    renderRosterView(cachedTeam, cachedPlayers);
}

/**
 * Wyświetla widok treningu
 */
export async function showTraining() {
    if (!cachedTeam || !cachedPlayers) {
        const data = await initApp();
        if (!data) return;
    }
    clearAllContainers();
    renderTrainingDashboard(cachedTeam, cachedPlayers);
}

/**
 * Wyświetla widok rynku transferowego
 */
export async function showMarket() {
    if (!cachedTeam) {
        const data = await initApp();
        if (!data) return;
    }
    clearAllContainers();
    renderMarketView(cachedTeam);
}

/**
 * Wyświetla widok finansów
 */
export async function showFinances() {
    if (!cachedTeam) {
        const data = await initApp();
        if (!data) return;
    }
    clearAllContainers();
    renderFinancesView(cachedTeam);
}

/**
 * Funkcja pomocnicza do błędów
 */
function renderError(message) {
    console.error("[APP ERROR]", message);
    const container = document.getElementById('app-main-view');
    if (container) {
        container.innerHTML = `
            <div style="color: #ff4444; padding: 40px; text-align: center; background: #fff; border-radius: 20px; border: 1px solid #ddd;">
                <h3>Coś poszło nie tak...</h3>
                <p>${message}</p>
                <p style="font-size: 0.8em; color: #999;">Sprawdź połączenie z bazą lub uprawnienia właściciela drużyny.</p>
            </div>
        `;
    }
}
