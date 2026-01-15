// js/app/app.js
import { supabaseClient } from '../auth.js';
import { checkLeagueEvents } from '../core/league_clock.js';
import { renderTrainingDashboard } from './training_view.js';

/**
 * Główna funkcja inicjująca aplikację managera.
 * Pobiera dane zespołu i zawodników, a następnie renderuje widok.
 */
export async function initApp() {
    console.log("[APP] Inicjalizacja danych dla Managera...");

    try {
        // 1. Sprawdź, czy nadszedł czas na automatyczny trening/mecz (Plan B)
        await checkLeagueEvents();

        // 2. Pobierz zalogowanego użytkownika
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error("Błąd autoryzacji użytkownika");

        // 3. Pobierz drużynę należącą do tego użytkownika
        const { data: team, error: teamError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        if (teamError || !team) {
            console.error("Nie znaleziono drużyny dla tego użytkownika.");
            throw new Error("Musisz posiadać drużynę, aby zarządzać treningiem.");
        }

        // 4. Pobierz listę zawodników tej drużyny
        const { data: players, error: playersError } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', team.id);

        if (playersError) throw new Error("Błąd podczas pobierania zawodników");

        // 5. Ustaw globalne ID drużyny (potrzebne do funkcji zapisu w training_view.js)
        window.userTeamId = team.id;

        // 6. Przekaż dane do widoku i wyrenderuj go
        renderTrainingDashboard(team, players);

    } catch (err) {
        console.error("[APP ERROR]", err.message);
        const container = document.getElementById('app-main-view');
        if (container) {
            container.innerHTML = `
                <div style="color: #ff4444; padding: 40px; text-align: center; background: #111; border-radius: 20px;">
                    <h3>Coś poszło nie tak...</h3>
                    <p>${err.message}</p>
                    <p style="font-size: 0.8em; color: #555;">Upewnij się, że masz przypisaną drużynę w bazie danych (tabela teams, kolumna owner_id).</p>
                </div>
            `;
        }
    }
}
