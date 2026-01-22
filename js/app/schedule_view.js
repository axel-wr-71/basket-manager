// js/app/schedule_view.js
import { supabaseClient } from '../auth.js';

export const ScheduleView = {
    /**
     * Pomocnicza funkcja tłumacząca dni i formatująca skróty
     */
    translateDay(dayStr, short = false) {
        const daysMap = {
            'MONDAY': 'Poniedziałek',
            'TUESDAY': 'Wtorek',
            'WEDNESDAY': 'Środa',
            'THURSDAY': 'Czwartek',
            'FRIDAY': 'Piątek',
            'SATURDAY': 'Sobota',
            'SUNDAY': 'Niedziela'
        };
        const val = daysMap[dayStr] || dayStr;
        return short ? val.substring(0, 3) : val;
    },

    /**
     * Główny render widoku terminarza
     */
    async render(containerId, teamId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `<div style="padding: 50px; text-align: center; color: #888;">Ładowanie Twojego terminarza...</div>`;

        let currentWeek = window.gameState?.currentWeek ?? 0;

        try {
            const schedule = await this.fetchTeamSchedule(teamId);
            
            if (!schedule || schedule.length === 0) {
                container.innerHTML = `
                    <div style="padding: 100px 20px; text-align: center; background: #fff; border-radius: 12px; margin: 20px; border: 1px dashed #ccc;">
                        <img src="https://cdn-icons-png.flaticon.com/512/4076/4076402.png" width="64" style="opacity: 0.3; margin-bottom: 20px;">
                        <div style="color: #212529; font-weight: 700; font-size: 1.1rem;">Brak meczów w bazie danych.</div>
                        <div style="color: #6c757d; font-size: 0.9rem; margin-top: 5px;">Upewnij się, że terminarz na Sezon 1 został wygenerowany.</div>
                    </div>`;
                return;
            }

            container.innerHTML = `
                <div class="schedule-view-wrapper" style="padding: 20px; background: #fdfdfd; font-family: 'Inter', sans-serif;">
                    
                    <div id="week-strip-container" style="margin-bottom: 25px;"></div>

                    <div style="display: grid; grid-template-columns: 320px 1fr 300px; gap: 25px; align-items: start;">
                        
                        <aside>
                            <div id="next-match-widget" style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 20px;"></div>
                            <div id="last-match-widget" style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);"></div>
                        </aside>

                        <main style="background: #fff; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden;">
                            <div style="padding: 15px 20px; border-bottom: 1px solid #eee; background: #fafafa;">
                                <h2 style="margin: 0; font-size: 0.9rem; font-weight: 800; color: #333; text-transform: uppercase; letter-spacing: 1px;">Pełny Terminarz Sezonu</h2>
                            </div>
                            <div id="schedule-table-container"></div>
                        </main>

                        <aside id="cup-section-placeholder" style="background: #f8f9fa; border: 2px dashed #e0e0e0; border-radius: 12px; height: 100%; min-height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #adb5bd;">
                             <h2 style="transform: rotate(-5deg); font-weight: 900; font-size: 2rem; opacity: 0.5;">SEKCJA PUCHAR</h2>
                        </aside>

                    </div>
                </div>
            `;

            this.renderWeekStrip(currentWeek);
            this.renderNextMatch(schedule, currentWeek);
            this.renderLastMatch(schedule, currentWeek);
            this.renderTable(schedule, teamId);

        } catch (err) {
            console.error(err);
            container.innerHTML = `<div style="color: red; padding: 20px;">Error: ${err.message}</div>`;
        }
    },

    renderWeekStrip(currentWeek) {
        const container = document.getElementById('week-strip-container');
        const days = [
            { n: 'PON', a: 'TRENING', c: '#6c757d' },
            { n: 'WT', a: 'LIGA', c: '#fd7e14' },
            { n: 'ŚR', a: 'PUCHAR', c: '#007bff' },
            { n: 'CZW', a: 'LIGA', c: '#fd7e14' },
            { n: 'PT', a: 'TRENING', c: '#6c757d' },
            { n: 'SOB', a: 'LIGA', c: '#fd7e14' },
            { n: 'ND', a: 'FINANSE', c: '#28a745' }
        ];

        container.innerHTML = `
            <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                    <span style="font-weight: 800; font-size: 0.85rem; color: #212529;">SYSTEM ROZGRYWEK • TYDZIEŃ ${currentWeek} / 10</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
                    ${days.map(d => `
                        <div style="text-align: center; padding: 10px; background: #fcfcfc; border-radius: 8px; border-bottom: 4px solid ${d.c}22;">
                            <div style="font-size: 0.7rem; font-weight: 900; color: #333;">${d.n}</div>
                            <div style="font-size: 0.6rem; font-weight: 700; color: ${d.c}; margin-top: 2px;">${d.a}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderNextMatch(schedule, week) {
        const next = schedule.find(m => m.status === 'SCHEDULED') || schedule[0];
        const container = document.getElementById('next-match-widget');
        
        container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; font-size: 0.75rem; color: #fd7e14; text-transform: uppercase; letter-spacing: 1px;">Najbliższy mecz</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="text-align: center; flex: 1;">
                    <div style="width: 44px; height: 44px; background: #eee; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; color: #999;">${next.home_team.team_name[0]}</div>
                    <div style="font-size: 0.75rem; font-weight: 700; line-height: 1.2;">${next.home_team.team_name}</div>
                </div>
                <div style="font-style: italic; font-weight: 900; color: #fd7e14; font-size: 1.1rem; padding: 0 10px;">VS</div>
                <div style="text-align: center; flex: 1;">
                    <div style="width: 44px; height: 44px; background: #eee; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; color: #999;">${next.away_team.team_name[0]}</div>
                    <div style="font-size: 0.75rem; font-weight: 700; line-height: 1.2;">${next.away_team.team_name}</div>
                </div>
            </div>
            <div style="background: #000; color: #fff; padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.8rem; font-weight: 600;">Tydzień ${next.week} • ${this.translateDay(next.day_of_week)}</div>
                <div style="margin-top: 5px; font-size: 0.65rem; background: #fd7e14; display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 800;">${next.match_type.toUpperCase()}</div>
            </div>
        `;
    },

    renderLastMatch(schedule, week) {
        const played = [...schedule].reverse().find(m => m.status === 'COMPLETED');
        const container = document.getElementById('last-match-widget');
        if (!played) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 1px;">Ostatni mecz</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                 <span style="font-size: 0.75rem; font-weight: 600;">${played.home_team.team_name}</span>
                 <span style="font-size: 0.75rem; font-weight: 600;">${played.away_team.team_name}</span>
            </div>
            <div style="font-size: 1.8rem; font-weight: 900; text-align: center; letter-spacing: 4px; color: #212529;">
                ${played.score_home} : ${played.score_away}
            </div>
        `;
    },

    renderTable(schedule, teamId) {
        const container = document.getElementById('schedule-table-container');
        
        container.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                <thead style="background: #fff; border-bottom: 2px solid #eee;">
                    <tr>
                        <th style="padding: 12px 20px; text-align: left; color: #999; font-weight: 800; text-transform: uppercase; width: 50px;">Wk</th>
                        <th style="padding: 12px 20px; text-align: left; color: #999; font-weight: 800; text-transform: uppercase; width: 80px;">Dzień</th>
                        <th style="padding: 12px 20px; text-align: left; color: #999; font-weight: 800; text-transform: uppercase;">Mecz</th>
                        <th style="padding: 12px 20px; text-align: center; color: #999; font-weight: 800; text-transform: uppercase; width: 100px;">Wynik</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedule.map(m => {
                        const isHome = m.home_team_id === teamId;
                        let typeTag = 'LIG';
                        if (m.match_type === 'Sparing') typeTag = 'SPR';
                        if (m.match_type === 'Puchar') typeTag = 'PUCH';

                        return `
                            <tr style="border-bottom: 1px solid #f9f9f9; transition: all 0.2s;">
                                <td style="padding: 12px 20px; font-weight: 800; color: #ccc;">${m.week}</td>
                                <td style="padding: 12px 20px; color: #666; font-weight: 600;">${this.translateDay(m.day_of_week, true).toUpperCase()}</td>
                                <td style="padding: 12px 20px;">
                                    <div style="display: flex; align-items: center;">
                                        <span style="${isHome ? 'color: #fd7e14; font-weight: 800;' : 'color: #333; font-weight: 500;'}">${m.home_team.team_name}</span>
                                        <span style="margin: 0 8px; color: #ddd; font-weight: 300;">vs</span>
                                        <span style="${!isHome ? 'color: #fd7e14; font-weight: 800;' : 'color: #333; font-weight: 500;'}">${m.away_team.team_name}</span>
                                        <span style="margin-left: 10px; font-size: 0.6rem; background: ${typeTag === 'PUCH' ? '#e7f1ff' : '#f0f0f0'}; color: ${typeTag === 'PUCH' ? '#007bff' : '#aaa'}; padding: 2px 5px; border-radius: 3px; font-weight: 800;">${typeTag}</span>
                                    </div>
                                </td>
                                <td style="padding: 12px 20px; text-align: center; font-weight: 800; color: #333;">
                                    ${m.score_home !== null ? `${m.score_home} : ${m.score_away}` : '<span style="color: #ddd;">-- : --</span>'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    async fetchTeamSchedule(teamId) {
        if (!teamId) return [];
        
        // Pobieramy wszystkie mecze (Liga + Puchar), w których uczestniczy zespół
        const { data, error } = await supabaseClient
            .from('matches')
            .select(`
                id, week, day_of_week, match_type, status, score_home, score_away,
                home_team_id, away_team_id, match_date,
                home_team:home_team_id ( team_name ),
                away_team:away_team_id ( team_name )
            `)
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('week', { ascending: true })
            .order('match_date', { ascending: true });
        
        if (error) {
            console.error("[ScheduleView] Error fetching schedule:", error);
            throw error;
        }
        return data;
    }
};
