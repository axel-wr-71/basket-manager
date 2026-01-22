// js/app/schedule_view.js
import { supabaseClient } from '../auth.js';

export const ScheduleView = {
    /**
     * Główny render widoku terminarza
     */
    async render(containerId, teamId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[ScheduleView] Nie znaleziono kontenera: ${containerId}`);
            return;
        }

        // Czyścimy kontener i pokazujemy loader
        container.innerHTML = `<div class="loading-state" style="padding: 20px; color: #888;">Ładowanie terminarza...</div>`;

        // Pobieramy aktualny tydzień z globalnego stanu gry lub bazy
        let currentWeek = window.gameState?.currentWeek;
        
        if (!currentWeek) {
            const { data: config } = await supabaseClient
                .from('game_config')
                .select('value')
                .eq('key', 'current_week')
                .single();
            currentWeek = config ? parseInt(config.value) : 1;
        }

        try {
            const schedule = await this.fetchTeamSchedule(teamId);
            
            if (!schedule || schedule.length === 0) {
                container.innerHTML = `
                    <div class="schedule-wrapper" style="padding: 20px;">
                        <div class="schedule-card" style="background: #1a1a1a; padding: 20px; border-radius: 8px; text-align: center;">
                            Brak zaplanowanych meczów w bazie danych dla Twojej drużyny.
                        </div>
                    </div>`;
                return;
            }

            // Główna struktura po pobraniu danych
            container.innerHTML = `
                <div class="schedule-wrapper" style="padding: 20px; color: #fff; font-family: 'Inter', sans-serif;">
                    <header id="week-strip" class="schedule-card" style="background: #111; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #222;"></header>
                    <div class="schedule-grid" style="display: grid; grid-template-columns: 350px 1fr; gap: 20px;">
                        <aside id="next-match-focus" class="schedule-card" style="background: #111; padding: 20px; border-radius: 12px; border: 1px solid #222;"></aside>
                        <main id="full-season-list" class="schedule-card" style="background: #111; padding: 20px; border-radius: 12px; border: 1px solid #222;"></main>
                    </div>
                </div>
            `;

            this.renderWeekStrip(currentWeek);
            this.renderNextMatch(schedule, currentWeek);
            this.renderFullList(schedule);

        } catch (err) {
            console.error("[ScheduleView] Błąd renderowania:", err);
            container.innerHTML = `<div class="error-state" style="padding: 20px; color: #ff4500;">Błąd podczas ładowania danych terminarza.</div>`;
        }
    },

    renderWeekStrip(week) {
        const container = document.getElementById('week-strip');
        if (!container) return;

        const days = [
            { name: 'PON', activity: 'Trening', type: 'training' },
            { name: 'WT', activity: 'Liga', type: 'match' },
            { name: 'ŚR', activity: 'Puchar', type: 'cup' },
            { name: 'CZW', activity: 'Liga', type: 'match' },
            { name: 'PT', activity: 'Trening', type: 'training' },
            { name: 'SOB', activity: 'Liga', type: 'match' },
            { name: 'ND', activity: 'Finanse', type: 'admin' }
        ];

        container.innerHTML = `
            <div class="strip-header" style="font-size: 0.7rem; color: #666; letter-spacing: 1px; margin-bottom: 12px; font-weight: bold;">PROGRESS SEZONU • TYDZIEŃ ${week} / 15</div>
            <div class="strip-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
                ${days.map(d => `
                    <div class="strip-slot" style="background: #1a1a1a; padding: 10px; border-radius: 8px; text-align: center; border-bottom: 3px solid ${d.type === 'match' ? '#ff4500' : '#333'}">
                        <span class="day" style="display: block; font-weight: bold; font-size: 0.8rem; color: #fff;">${d.name}</span>
                        <span class="act" style="font-size: 0.6rem; color: #888; text-transform: uppercase;">${d.activity}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderNextMatch(schedule, week) {
        const container = document.getElementById('next-match-focus');
        if (!container) return;

        const next = schedule.find(m => m.week >= week && m.status === 'SCHEDULED');

        if (!next) {
            container.innerHTML = `<div class="no-games" style="color: #666; text-align: center; padding: 20px;">Brak nadchodzących meczów.</div>`;
            return;
        }

        container.innerHTML = `
            <div class="card-label" style="color: #ff4500; font-weight: bold; font-size: 0.7rem; margin-bottom: 20px; letter-spacing: 1px;">NASTĘPNY PRZECIWNIK</div>
            <div class="focus-card" style="text-align: center;">
                <div class="focus-vs" style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 25px;">
                    <div class="team">
                        <div style="width: 60px; height: 60px; background: #222; border: 1px solid #333; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #444;">LOGO</div>
                        <span style="font-size: 1rem; font-weight: bold; display: block;">${next.home_team?.name || 'DOM'}</span>
                    </div>
                    <div class="vs-badge" style="font-style: italic; font-weight: 900; color: #ff4500; font-size: 1.2rem;">VS</div>
                    <div class="team">
                        <div style="width: 60px; height: 60px; background: #222; border: 1px solid #333; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #444;">LOGO</div>
                        <span style="font-size: 1rem; font-weight: bold; display: block;">${next.away_team?.name || 'WYJAZD'}</span>
                    </div>
                </div>
                <div class="focus-details" style="background: #000; padding: 15px; border-radius: 8px; border: 1px solid #1a1a1a;">
                    <p style="margin: 0; font-size: 0.85rem; color: #ccc;">Tydzień ${next.week} • ${next.day_of_week}</p>
                    <span style="display: inline-block; background: #ff4500; color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 0.65rem; margin-top: 8px; font-weight: bold; text-transform: uppercase;">${next.match_type}</span>
                </div>
            </div>
        `;
    },

    renderFullList(schedule) {
        const container = document.getElementById('full-season-list');
        if (!container) return;
        
        container.innerHTML = `
            <div class="card-label" style="color: #666; font-weight: bold; font-size: 0.7rem; margin-bottom: 15px; letter-spacing: 1px;">TERMINARZ SEZONU (28 MECZÓW)</div>
            <div class="schedule-table-wrapper" style="max-height: 500px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #333 #111;">
                <table class="schedule-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid #222; text-align: left; color: #444; font-size: 0.7rem; text-transform: uppercase;">
                            <th style="padding: 12px 10px;">WK</th>
                            <th style="padding: 12px 10px;">DZIEŃ</th>
                            <th style="padding: 12px 10px;">MECZ</th>
                            <th style="padding: 12px 10px; text-align: center;">WYNIK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedule.map(m => `
                            <tr style="border-bottom: 1px solid #1a1a1a; transition: background 0.2s; ${m.status === 'PLAYED' ? 'opacity: 0.4;' : ''}" onmouseover="this.style.background='#161616'" onmouseout="this.style.background='transparent'">
                                <td style="padding: 12px 10px; color: #666;">${m.week}</td>
                                <td style="padding: 12px 10px; color: #888;">${m.day_of_week.substring(0,3)}</td>
                                <td style="padding: 12px 10px; font-weight: 500;">
                                    ${m.home_team?.name} <span style="color: #444; margin: 0 5px;">vs</span> ${m.away_team?.name}
                                </td>
                                <td style="padding: 12px 10px; font-weight: bold; color: #ff4500; text-align: center; font-family: 'Courier New', monospace;">
                                    ${m.score_home !== null ? `${m.score_home}:${m.score_away}` : '—'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async fetchTeamSchedule(teamId) {
        console.log("[ScheduleView] Pobieram mecze dla teamId:", teamId);
        
        // Zoptymalizowane zapytanie wykorzystujące relacje Foreign Key (Krok 1 SQL)
        // Używamy jawnej nazwy tabeli w select, aby uniknąć błędów aliasowania teams_1
        const { data, error } = await supabaseClient
            .from('matches')
            .select(`
                *,
                home_team:home_team_id ( name ),
                away_team:away_team_id ( name )
            `)
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('week', { ascending: true });
        
        if (error) {
            console.error("[ScheduleView] Błąd Supabase:", error);
            return [];
        }
        return data || [];
    }
};
