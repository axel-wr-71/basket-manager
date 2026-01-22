// js/app/schedule_view.js
import { supabaseClient } from '../auth.js';
import { LeagueClock } from '../core/league_clock.js';

export const ScheduleView = {
    /**
     * Formatowanie daty na przyjazny format
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Formatowanie daty krótkiej (YYYY-MM-DD)
     */
    formatShortDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toISOString().split('T')[0];
    },

    /**
     * Mapowanie dni tygodnia z pełnych nazw na skróty i formatowanie
     */
    formatDayOfWeek(dayStr) {
        const daysMap = {
            'MONDAY': 'Monday',
            'TUESDAY': 'Tuesday', 
            'WEDNESDAY': 'Wednesday',
            'THURSDAY': 'Thursday',
            'FRIDAY': 'Friday',
            'SATURDAY': 'Saturday',
            'SUNDAY': 'Sunday'
        };
        const fullName = daysMap[dayStr?.toUpperCase()] || dayStr;
        return {
            full: fullName,
            short: fullName.substring(0, 3).toUpperCase()
        };
    },

    /**
     * Mapowanie typów meczów (pełne nazwy)
     */
    formatMatchType(type) {
        const typesMap = {
            'Liga': 'League',
            'Puchar': 'Cup',
            'Sparing': 'Friendly',
            'Playoff': 'Playoff',
            'ALL-STAR': 'All-Star',
            'DRAFT': 'Draft'
        };
        return typesMap[type] || type;
    },

    /**
     * Pobierz kolor dla typu meczu
     */
    getMatchTypeColor(type) {
        const colors = {
            'Liga': '#fd7e14',
            'League': '#fd7e14',
            'Puchar': '#007bff',
            'Cup': '#007bff',
            'Sparing': '#28a745',
            'Friendly': '#28a745',
            'Playoff': '#dc3545',
            'ALL-STAR': '#ffc107',
            'DRAFT': '#6f42c1'
        };
        return colors[type] || '#6c757d';
    },

    /**
     * Główny render widoku terminarza
     */
    async render(containerId, teamId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `<div style="padding: 50px; text-align: center; color: #888;">Ładowanie Twojego terminarza...</div>`;

        try {
            // Pobierz aktualny tydzień
            const currentWeek = await this.getCurrentWeek();
            const totalWeeks = 16; // Z dokumentacji
            
            // Pobierz terminarz drużyny
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

            // Główny HTML zgodny z UX z obrazków
            container.innerHTML = `
                <div class="schedule-view-wrapper" style="background: #fff; font-family: 'Inter', sans-serif; min-height: 100vh;">
                    
                    <!-- NAGŁÓWEK GŁÓWNY - zgodny z UX -->
                    <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px 20px 20px; border-bottom: 4px solid #fd7e14;">
                        <div style="max-width: 1200px; margin: 0 auto;">
                            <h1 style="margin: 0 0 5px 0; font-size: 1.8rem; font-weight: 900; color: white; display: flex; align-items: center; gap: 10px;">
                                ELITE BUZZER LEAGUE
                            </h1>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                <div>
                                    <h2 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: #ffc107; text-transform: uppercase;">
                                        SCHEDULE & MATCHES
                                    </h2>
                                    <div style="color: #adb5bd; font-size: 0.9rem; margin-top: 5px;">
                                        Manage your team's lineup and view match results throughout the season
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- GŁÓWNA ZAWARTOŚĆ -->
                    <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
                        
                        <!-- PANEL TYGODNIA - zgodny z UX -->
                        <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                                <span style="font-weight: 800; font-size: 1rem; color: #212529;">SYSTEM ROZGRYWEK • TYDZIEŃ ${currentWeek} / ${totalWeeks}</span>
                                <span style="font-size: 0.85rem; color: #6c757d; font-weight: 600;">
                                    ${LeagueClock.getWeekDescription(currentWeek)}
                                </span>
                            </div>
                            <div id="week-days-container" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                                <!-- Kafelki dni będą wstawione przez renderWeekDays -->
                            </div>
                        </div>
                        
                        <!-- TRZY KOLUMNY -->
                        <div style="display: grid; grid-template-columns: 300px 1fr 300px; gap: 20px; align-items: start;">
                            
                            <!-- LEWA KOLUMNA: NASTĘPNY MECZ -->
                            <aside>
                                <div id="next-match-widget" style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                                <div style="margin-top: 20px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                    <h3 style="margin: 0 0 15px 0; font-size: 0.85rem; color: #495057; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e9ecef; padding-bottom: 10px;">
                                        Last 3 Matches
                                    </h3>
                                    <div id="last-matches-list"></div>
                                </div>
                            </aside>
                            
                            <!-- ŚRODKOWA KOLUMNA: PEŁNY TERMINARZ -->
                            <main>
                                <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                    <div style="padding: 20px; border-bottom: 1px solid #e0e0e0; background: #f8f9fa;">
                                        <h2 style="margin: 0; font-size: 1rem; font-weight: 800; color: #212529; text-transform: uppercase; letter-spacing: 1px;">
                                            Full Season Schedule
                                        </h2>
                                        <div style="font-size: 0.85rem; color: #6c757d; margin-top: 5px;">
                                            ${schedule.length} matches total • Click Set Lineup to prepare for upcoming games
                                        </div>
                                    </div>
                                    <div id="schedule-table-container" style="overflow-x: auto;"></div>
                                </div>
                            </main>
                            
                            <!-- PRAWA KOLUMNA: PUSTA (zgodnie z UX z obrazka) -->
                            <aside>
                                <div style="background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; height: 100%; min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6c757d; padding: 30px;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;">🏆</div>
                                        <div style="font-weight: 700; font-size: 1rem; margin-bottom: 10px; color: #495057;">Cup Tournament</div>
                                        <div style="font-size: 0.85rem;">View upcoming cup matches in the main schedule</div>
                                    </div>
                                </div>
                            </aside>
                            
                        </div>
                    </div>
                </div>
            `;

            // Renderuj komponenty
            this.renderWeekDays(currentWeek);
            this.renderNextMatch(schedule, teamId);
            this.renderLastMatches(schedule, teamId);
            this.renderTable(schedule, teamId);

        } catch (err) {
            console.error(err);
            container.innerHTML = `
                <div style="padding: 50px; text-align: center; color: #dc3545; background: #fff; border-radius: 12px; border: 1px solid #f8d7da; margin: 20px;">
                    <div style="font-size: 1.5rem; margin-bottom: 15px;">❌</div>
                    <div style="font-weight: 700; margin-bottom: 10px;">Error loading schedule</div>
                    <div style="color: #6c757d; font-size: 0.9rem;">${err.message}</div>
                </div>
            `;
        }
    },

    /**
     * Renderowanie kafelków dni tygodnia
     */
    renderWeekDays(currentWeek) {
        const container = document.getElementById('week-days-container');
        const weekActivities = LeagueClock.getWeekActivities(currentWeek);
        
        if (!container) return;
        
        container.innerHTML = weekActivities.map(day => {
            const dayInfo = this.formatDayOfWeek(day.day);
            return `
                <div style="text-align: center; padding: 12px 6px; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0;">
                    <div style="font-size: 0.75rem; font-weight: 800; color: #333; margin-bottom: 4px; letter-spacing: 0.5px;">
                        ${dayInfo.short}
                    </div>
                    <div style="font-size: 0.7rem; font-weight: 700; color: ${day.color}; padding: 4px 2px; background: ${day.color}10; border-radius: 4px; border: 1px solid ${day.color}20;">
                        ${day.activity}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Renderowanie następnego meczu
     */
    renderNextMatch(schedule, teamId) {
        const nextMatch = schedule.find(m => m.status === 'SCHEDULED' || !m.is_played) || schedule[0];
        const container = document.getElementById('next-match-widget');
        
        if (!nextMatch) {
            container.innerHTML = `
                <h3 style="margin: 0 0 15px 0; font-size: 0.85rem; color: #fd7e14; text-transform: uppercase; letter-spacing: 1px;">
                    Next Match
                </h3>
                <div style="text-align: center; padding: 30px 0; color: #6c757d;">
                    No upcoming matches
                </div>
            `;
            return;
        }
        
        const isHome = nextMatch.home_team_id === teamId;
        const opponent = isHome ? nextMatch.away_team : nextMatch.home_team;
        const dayInfo = this.formatDayOfWeek(nextMatch.day_of_week);
        const matchDate = this.formatDate(nextMatch.match_date);
        const matchType = this.formatMatchType(nextMatch.match_type);
        const typeColor = this.getMatchTypeColor(nextMatch.match_type);
        
        container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; font-size: 0.85rem; color: #fd7e14; text-transform: uppercase; letter-spacing: 1px;">
                Next Match
            </h3>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 2rem; font-weight: 900; color: #6c757d; margin-bottom: 10px; letter-spacing: 2px;">VS</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #212529; margin-bottom: 5px;">
                    ${opponent.team_name || 'Opponent'}
                </div>
                <div style="font-size: 0.9rem; font-weight: 700; color: #fd7e14;">
                    ${isHome ? 'Chalkida United' : 'Away Game'}
                </div>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 6px; padding: 15px; margin-bottom: 20px; border-left: 4px solid ${typeColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: #495057;">Week</div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #212529;">${nextMatch.week}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: #495057;">Day</div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #212529;">${dayInfo.full}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: #495057;">Date</div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #212529;">${this.formatShortDate(nextMatch.match_date)}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: #495057;">Type</div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: ${typeColor};">${matchType}</div>
                </div>
            </div>
            
            <button id="next-match-lineup-btn" data-match-id="${nextMatch.id}" 
                style="width: 100%; background: #28a745; color: white; border: none; padding: 12px; border-radius: 6px; 
                       font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; 
                       display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 1.1rem;">⚙️</span> Set Lineup for Next Match
            </button>
        `;
        
        // Event listener dla przycisku
        document.getElementById('next-match-lineup-btn')?.addEventListener('click', (e) => {
            const matchId = e.target.dataset.matchId;
            this.handleSetLineup(matchId);
        });
    },

    /**
     * Renderowanie ostatnich meczów
     */
    renderLastMatches(schedule, teamId) {
        const container = document.getElementById('last-matches-list');
        const lastMatches = schedule
            .filter(m => m.is_played || m.status === 'COMPLETED' || (m.score_home !== null && m.score_away !== null))
            .slice(-3)
            .reverse();
        
        if (lastMatches.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 20px; color: #6c757d;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">⚽</div>
                    <div style="font-weight: 600; font-size: 0.9rem;">No matches played yet</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = lastMatches.map(match => {
            const isHome = match.home_team_id === teamId;
            const result = isHome ? 
                `${match.score_home || 0}-${match.score_away || 0}` : 
                `${match.score_away || 0}-${match.score_home || 0}`;
            const won = isHome ? 
                ((match.score_home || 0) > (match.score_away || 0)) : 
                ((match.score_away || 0) > (match.score_home || 0));
            const opponent = isHome ? match.away_team : match.home_team;
            const matchDate = this.formatShortDate(match.match_date);
            const typeColor = this.getMatchTypeColor(match.match_type);
            
            return `
                <div style="background: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: ${won ? '#28a745' : '#dc3545'}; 
                              background: ${won ? '#d4edda' : '#f8d7da'}; padding: 3px 8px; border-radius: 4px;">
                            ${won ? 'W' : 'L'} ${result}
                        </div>
                        <div style="font-size: 0.75rem; color: ${typeColor}; font-weight: 600; 
                              background: ${typeColor}10; padding: 2px 8px; border-radius: 10px; border: 1px solid ${typeColor}20;">
                            ${match.match_type}
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; font-weight: 600; color: #495057; margin-bottom: 5px;">
                        ${isHome ? 'vs' : '@'} ${opponent.team_name || 'Opponent'}
                    </div>
                    <div style="font-size: 0.75rem; color: #6c757d;">
                        Week ${match.week} • ${matchDate}
                    </div>
                    <button class="view-result-btn" data-match-id="${match.id}" 
                        style="width: 100%; margin-top: 10px; background: #6c757d; color: white; border: none; 
                               padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                        View Result
                    </button>
                </div>
            `;
        }).join('');
        
        // Event listeners dla przycisków
        document.querySelectorAll('.view-result-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = e.target.dataset.matchId;
                this.handleViewResult(matchId);
            });
        });
    },

    /**
     * Renderowanie tabeli terminarza
     */
    renderTable(schedule, teamId) {
        const container = document.getElementById('schedule-table-container');
        
        container.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <tr>
                        <th style="padding: 15px 20px; text-align: left; color: #495057; font-weight: 700; width: 100px;">Date</th>
                        <th style="padding: 15px 20px; text-align: left; color: #495057; font-weight: 700; width: 70px;">Week</th>
                        <th style="padding: 15px 20px; text-align: left; color: #495057; font-weight: 700; width: 100px;">Day</th>
                        <th style="padding: 15px 20px; text-align: left; color: #495057; font-weight: 700;">Match</th>
                        <th style="padding: 15px 20px; text-align: left; color: #495057; font-weight: 700; width: 90px;">Type</th>
                        <th style="padding: 15px 20px; text-align: center; color: #495057; font-weight: 700; width: 150px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedule.map(match => {
                        const isHome = match.home_team_id === teamId;
                        const isPlayed = match.is_played || match.status === 'COMPLETED' || (match.score_home !== null && match.score_away !== null);
                        const isFuture = !isPlayed && (match.status === 'SCHEDULED' || match.status === null);
                        const matchDate = this.formatShortDate(match.match_date);
                        const dayInfo = this.formatDayOfWeek(match.day_of_week);
                        const matchType = this.formatMatchType(match.match_type);
                        const typeColor = this.getMatchTypeColor(match.match_type);
                        
                        return `
                            <tr style="border-bottom: 1px solid #e9ecef; transition: background 0.2s; 
                                background: ${isPlayed ? '#f8f9fa' : 'white'};">
                                <td style="padding: 15px 20px; color: #495057; font-weight: 500; font-size: 0.85rem;">
                                    ${matchDate}
                                </td>
                                <td style="padding: 15px 20px; font-weight: 700; color: #212529; font-size: 0.85rem;">
                                    ${match.week}
                                </td>
                                <td style="padding: 15px 20px; color: #6c757d; font-weight: 600; font-size: 0.85rem;">
                                    ${dayInfo.full}
                                </td>
                                <td style="padding: 15px 20px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="${isHome ? 'color: #fd7e14; font-weight: 700;' : 'color: #495057; font-weight: 500;'} 
                                              font-size: 0.85rem;">
                                            ${match.home_team.team_name || 'Home'}
                                        </span>
                                        <span style="color: #adb5bd; font-weight: 300;">vs</span>
                                        <span style="${!isHome ? 'color: #fd7e14; font-weight: 700;' : 'color: #495057; font-weight: 500;'} 
                                              font-size: 0.85rem;">
                                            ${match.away_team.team_name || 'Away'}
                                        </span>
                                    </div>
                                </td>
                                <td style="padding: 15px 20px;">
                                    <span style="font-size: 0.8rem; font-weight: 700; color: ${typeColor}; 
                                          padding: 4px 8px; background: ${typeColor}10; border-radius: 4px; 
                                          border: 1px solid ${typeColor}20;">
                                        ${matchType}
                                    </span>
                                </td>
                                <td style="padding: 15px 20px; text-align: center;">
                                    ${isFuture ? `
                                        <button class="set-lineup-btn" data-match-id="${match.id}" 
                                            style="background: #007bff; color: white; border: none; padding: 6px 12px; 
                                                   border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; 
                                                   transition: all 0.2s;">
                                            Set Lineup
                                        </button>
                                    ` : isPlayed ? `
                                        <button class="view-result-btn" data-match-id="${match.id}" 
                                            style="background: #28a745; color: white; border: none; padding: 6px 12px; 
                                                   border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; 
                                                   transition: all 0.2s;">
                                            Result
                                        </button>
                                    ` : '<span style="color: #adb5bd; font-size: 0.85rem;">-</span>'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        // Dodaj event listeners do przycisków
        this.addButtonEventListeners();
    },

    /**
     * Dodawanie event listenerów do przycisków
     */
    addButtonEventListeners() {
        document.querySelectorAll('.set-lineup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = e.target.dataset.matchId;
                this.handleSetLineup(matchId);
            });
        });
        
        document.querySelectorAll('.view-result-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = e.target.dataset.matchId;
                this.handleViewResult(matchId);
            });
        });
    },

    /**
     * Obsługa kliknięcia "Set Lineup"
     */
    handleSetLineup(matchId) {
        console.log(`Setting lineup for match ${matchId}`);
        alert(`Set Lineup clicked for match ${matchId}\n(To be implemented)`);
    },

    /**
     * Obsługa kliknięcia "Result"
     */
    handleViewResult(matchId) {
        console.log(`Viewing result for match ${matchId}`);
        alert(`View Result clicked for match ${matchId}\n(To be implemented)`);
    },

    /**
     * Pobieranie aktualnego tygodnia
     */
    async getCurrentWeek() {
        try {
            const { data, error } = await supabaseClient
                .from('game_config')
                .select('value')
                .eq('key', 'current_week')
                .single();
            
            if (error) throw error;
            return data ? parseInt(data.value) : 0;
        } catch (err) {
            console.error("[ScheduleView] Error getting current week:", err);
            return 0;
        }
    },

    /**
     * Pobieranie terminarza z Supabase
     */
    async fetchTeamSchedule(teamId) {
        if (!teamId) return [];
        
        const { data, error } = await supabaseClient
            .from('matches')
            .select(`
                id, 
                week, 
                day_of_week, 
                match_type, 
                status, 
                score_home, 
                score_away,
                home_team_id, 
                away_team_id, 
                match_date,
                played_at,
                is_played,
                league_id,
                home_team:home_team_id ( team_name ),
                away_team:away_team_id ( team_name )
            `)
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('match_date', { ascending: true })
            .order('week', { ascending: true });
        
        if (error) {
            console.error("[ScheduleView] Error fetching schedule:", error);
            throw error;
        }
        return data;
    }
};
