// js/app/league_view.js
import { supabaseClient } from '../auth.js';

export async function renderLeagueView(team, players) {
    console.log("[LEAGUE] Renderowanie widoku ligi...");
    
    const container = document.getElementById('m-league');
    if (!container) {
        console.error("[LEAGUE] Brak kontenera m-league!");
        return;
    }
    
    // Pokaż ładowanie
    container.innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🏀</div>
            <h2 style="color: #1a237e;">Ładowanie danych NBA...</h2>
            <p style="color: #64748b;">Pobieranie statystyk ligowych</p>
        </div>
    `;
    
    try {
        // Pobierz dane ligowe
        const [standingsData, topPlayersData, leagueStats, recentGames] = await Promise.all([
            fetchLeagueStandings(),
            fetchTopPlayers(),
            fetchLeagueStatistics(),
            fetchRecentGames()
        ]);
        
        renderLeagueContent(container, standingsData, topPlayersData, leagueStats, recentGames, team);
        
    } catch (error) {
        console.error("[LEAGUE] Błąd:", error);
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #ef4444;">
                <h3>❌ Błąd ładowania danych ligi</h3>
                <p>${error.message}</p>
                <button onclick="window.switchTab('m-league')" 
                        style="background: #006bb6; color: white; padding: 10px 20px; border: none; border-radius: 8px; margin-top: 20px;">
                    Spróbuj ponownie
                </button>
            </div>
        `;
    }
}

async function fetchLeagueStandings() {
    console.log("[LEAGUE] Pobieranie tabeli ligowej...");
    
    // Sprawdź czy mamy tabelę league_standings
    let standings = [];
    let useLeagueStandings = false;
    
    try {
        // Próba pobrania z league_standings (jeśli istnieje)
        const { data: leagueStandings, error: lsError } = await supabaseClient
            .from('league_standings')
            .select(`
                team_id,
                team_name,
                wins,
                losses,
                points_scored,
                points_allowed,
                games_played,
                streak,
                home_wins,
                away_wins,
                conference,
                division,
                teams!inner(team_name, country, league_name)
            `)
            .order('wins', { ascending: false })
            .order('points_scored - points_allowed', { ascending: false });
        
        if (!lsError && leagueStandings && leagueStandings.length > 0) {
            useLeagueStandings = true;
            standings = leagueStandings.map((team, index) => ({
                position: index + 1,
                id: team.team_id,
                team_name: team.team_name || team.teams?.team_name,
                wins: team.wins || 0,
                losses: team.losses || 0,
                points_scored: team.points_scored || 0,
                points_allowed: team.points_allowed || 0,
                games_played: team.games_played || 0,
                streak: team.streak || '',
                home_wins: team.home_wins || 0,
                away_wins: team.away_wins || 0,
                conference: team.conference || '',
                division: team.division || '',
                win_percentage: team.games_played > 0 ? ((team.wins || 0) / team.games_played).toFixed(3) : '0.000',
                points_difference: (team.points_scored || 0) - (team.points_allowed || 0)
            }));
        }
    } catch (e) {
        console.warn("[LEAGUE] Brak tabeli league_standings, używam teams", e);
    }
    
    // Jeśli nie ma league_standings, użyj teams
    if (!useLeagueStandings) {
        const { data: teams, error } = await supabaseClient
            .from('teams')
            .select(`
                id,
                team_name,
                wins,
                losses,
                conference,
                league_name,
                country
            `)
            .order('wins', { ascending: false })
            .order('losses', { ascending: true });
        
        if (error) {
            console.error("[LEAGUE] Błąd pobierania teams:", error);
            throw error;
        }
        
        standings = teams.map((team, index) => ({
            position: index + 1,
            id: team.id,
            team_name: team.team_name,
            wins: team.wins || 0,
            losses: team.losses || 0,
            points_scored: 0, // Brak danych w teams
            points_allowed: 0,
            games_played: (team.wins || 0) + (team.losses || 0),
            streak: '',
            home_wins: 0,
            away_wins: 0,
            conference: team.conference || '',
            division: '',
            win_percentage: ((team.wins || 0) / ((team.wins || 0) + (team.losses || 0) || 1)).toFixed(3),
            points_difference: 0
        }));
    }
    
    return standings;
}

async function fetchTopPlayers() {
    console.log("[LEAGUE] Pobieranie najlepszych zawodników...");
    
    // Najpierw spróbuj pobrać z player_stats jeśli istnieje
    let topPlayers = [];
    
    try {
        const { data: playersStats, error: statsError } = await supabaseClient
            .from('player_stats')
            .select(`
                player_id,
                points_per_game,
                rebounds_per_game,
                assists_per_game,
                steals_per_game,
                blocks_per_game,
                field_goal_percentage,
                three_point_percentage,
                free_throw_percentage,
                games_played,
                minutes_per_game,
                players!inner(
                    id,
                    first_name,
                    last_name,
                    position,
                    overall_rating,
                    potential,
                    age,
                    height,
                    weight,
                    team_id,
                    teams!inner(team_name)
                )
            `)
            .order('points_per_game', { ascending: false })
            .limit(20);
        
        if (!statsError && playersStats) {
            topPlayers = playersStats.map(stat => ({
                id: stat.players.id,
                first_name: stat.players.first_name,
                last_name: stat.players.last_name,
                position: stat.players.position,
                overall_rating: stat.players.overall_rating,
                potential: stat.players.potential,
                age: stat.players.age,
                height: stat.players.height,
                weight: stat.players.weight,
                team_id: stat.players.team_id,
                team_name: stat.players.teams?.team_name,
                points_per_game: stat.points_per_game || 0,
                rebounds_per_game: stat.rebounds_per_game || 0,
                assists_per_game: stat.assists_per_game || 0,
                steals_per_game: stat.steals_per_game || 0,
                blocks_per_game: stat.blocks_per_game || 0,
                field_goal_percentage: stat.field_goal_percentage || 0,
                three_point_percentage: stat.three_point_percentage || 0,
                free_throw_percentage: stat.free_throw_percentage || 0,
                games_played: stat.games_played || 0,
                efficiency: calculateEfficiency(stat)
            }));
        }
    } catch (e) {
        console.warn("[LEAGUE] Brak player_stats, używam players", e);
    }
    
    // Jeśli nie ma statystyk, pobierz tylko podstawowe dane
    if (topPlayers.length === 0) {
        const { data: players, error } = await supabaseClient
            .from('players')
            .select(`
                id,
                first_name,
                last_name,
                position,
                overall_rating,
                potential,
                age,
                height,
                weight,
                team_id,
                teams!inner(team_name)
            `)
            .order('overall_rating', { ascending: false })
            .limit(20);
        
        if (!error && players) {
            topPlayers = players.map(p => ({
                ...p,
                team_name: p.teams?.team_name,
                points_per_game: 0,
                rebounds_per_game: 0,
                assists_per_game: 0,
                efficiency: p.overall_rating
            }));
        }
    }
    
    return topPlayers;
}

function calculateEfficiency(stats) {
    const PTS = stats.points_per_game || 0;
    const REB = stats.rebounds_per_game || 0;
    const AST = stats.assists_per_game || 0;
    const STL = stats.steals_per_game || 0;
    const BLK = stats.blocks_per_game || 0;
    const FGA = 10; // Przykładowa wartość
    const FGM = FGA * ((stats.field_goal_percentage || 0) / 100);
    const TOV = 2; // Przykładowa wartość
    
    // Prostego wzór na efficiency
    return (PTS + REB + AST + STL + BLK - (FGA - FGM) - TOV).toFixed(1);
}

async function fetchLeagueStatistics() {
    console.log("[LEAGUE] Pobieranie statystyk ligi...");
    
    const stats = {
        totalTeams: 0,
        totalGames: 0,
        totalPoints: 0,
        averagePointsPerGame: 0,
        topScorer: { name: "Brak danych", points_per_game: 0, team: "" },
        bestTeam: { name: "Brak danych", wins: 0, win_percentage: 0 },
        bestOffense: { name: "Brak danych", ppg: 0 },
        bestDefense: { name: "Brak danych", ppg_allowed: 999 },
        leagueLeaders: {}
    };
    
    try {
        // Statystyki z league_events jeśli istnieje
        const { data: games, error: gamesError } = await supabaseClient
            .from('league_events')
            .select('*')
            .limit(100);
        
        // Liczba drużyn z teams
        const { data: teams, error: teamsError } = await supabaseClient
            .from('teams')
            .select('id, team_name, wins, losses');
        
        if (!teamsError && teams) {
            stats.totalTeams = teams.length;
            
            // Najlepsza drużyna
            const bestTeam = teams.reduce((best, current) => {
                const currentWinPct = (current.wins || 0) / ((current.wins || 0) + (current.losses || 0) || 1);
                const bestWinPct = (best.wins || 0) / ((best.wins || 0) + (best.losses || 0) || 1);
                return currentWinPct > bestWinPct ? current : best;
            }, teams[0] || {});
            
            stats.bestTeam = {
                name: bestTeam.team_name,
                wins: bestTeam.wins || 0,
                losses: bestTeam.losses || 0,
                win_percentage: ((bestTeam.wins || 0) / ((bestTeam.wins || 0) + (bestTeam.losses || 0) || 1) * 100).toFixed(1)
            };
            
            // Oblicz całkowitą liczbę gier
            stats.totalGames = teams.reduce((sum, team) => sum + (team.wins || 0) + (team.losses || 0), 0) / 2;
        }
        
        // Najlepszy strzelec z players + player_stats
        const { data: topScorers, error: scorerError } = await supabaseClient
            .from('players')
            .select(`
                first_name,
                last_name,
                team_id,
                teams!inner(team_name),
                player_stats(points_per_game)
            `)
            .order('overall_rating', { ascending: false })
            .limit(1);
        
        if (!scorerError && topScorers && topScorers.length > 0) {
            const player = topScorers[0];
            const points = player.player_stats?.[0]?.points_per_game || 28.5; // Przykładowa wartość
            stats.topScorer = {
                name: `${player.first_name} ${player.last_name}`,
                points_per_game: points.toFixed(1),
                team: player.teams?.team_name || ""
            };
        }
        
    } catch (error) {
        console.warn("[LEAGUE] Błąd pobierania statystyk:", error);
    }
    
    return stats;
}

async function fetchRecentGames() {
    console.log("[LEAGUE] Pobieranie ostatnich meczów...");
    
    let recentGames = [];
    
    try {
        // Sprawdź czy istnieje league_events
        const { data: events, error } = await supabaseClient
            .from('league_events')
            .select(`
                id,
                event_date,
                home_team_id,
                away_team_id,
                home_score,
                away_score,
                event_type,
                status,
                home_team:teams!league_events_home_team_id_fkey(team_name),
                away_team:teams!league_events_away_team_id_fkey(team_name)
            `)
            .eq('event_type', 'game')
            .eq('status', 'completed')
            .order('event_date', { ascending: false })
            .limit(10);
        
        if (!error && events) {
            recentGames = events.map(event => ({
                id: event.id,
                date: new Date(event.event_date).toLocaleDateString(),
                home_team: event.home_team?.team_name || 'Team A',
                away_team: event.away_team?.team_name || 'Team B',
                home_score: event.home_score || 0,
                away_score: event.away_score || 0,
                winner: event.home_score > event.away_score ? 'home' : 'away'
            }));
        }
    } catch (e) {
        console.warn("[LEAGUE] Brak league_events:", e);
        // Przykładowe dane
        recentGames = [
            {
                id: 1,
                date: '2024-01-20',
                home_team: 'Los Angeles Lakers',
                away_team: 'Golden State Warriors',
                home_score: 112,
                away_score: 108,
                winner: 'home'
            },
            {
                id: 2,
                date: '2024-01-19',
                home_team: 'Boston Celtics',
                away_team: 'Miami Heat',
                home_score: 105,
                away_score: 98,
                winner: 'home'
            },
            {
                id: 3,
                date: '2024-01-18',
                home_team: 'Chicago Bulls',
                away_team: 'New York Knicks',
                home_score: 96,
                away_score: 102,
                winner: 'away'
            }
        ];
    }
    
    return recentGames;
}

function renderLeagueContent(container, standings, topPlayers, stats, recentGames, userTeam) {
    console.log("[LEAGUE] Renderowanie zawartości NBA...");
    
    container.innerHTML = `
        <div class="nba-league-container" style="max-width: 1600px; margin: 0 auto; background: #f8f9fa;">
            <!-- NAGŁÓWEK NBA -->
            <div style="background: linear-gradient(135deg, #1d428a, #006bb6); color: white; padding: 30px; border-radius: 12px 12px 0 0; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 10px; right: 20px; font-size: 8rem; opacity: 0.1;">🏀</div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 2;">
                    <div>
                        <h1 style="margin: 0; font-weight: 900; font-size: 2.8rem; letter-spacing: -0.5px;">🏀 NBA LEAGUE</h1>
                        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 1rem; font-weight: 300;">
                            2023-24 Season • Updated: ${new Date().toLocaleDateString()}
                        </p>
                        <div style="display: flex; gap: 20px; margin-top: 15px;">
                            <div style="background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem;">
                                <span style="font-weight: 600;">Conference:</span> ${userTeam?.conference || 'East'}
                            </div>
                            <div style="background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem;">
                                <span style="font-weight: 600;">Your Team:</span> ${userTeam?.team_name || 'No Team'}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: right;">
                        <div style="font-size: 3rem; margin-bottom: 5px;">${userTeam?.team_name?.substring(0, 2) || 'MY'}</div>
                        <div style="font-size: 0.85rem; opacity: 0.8; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 12px;">
                            MANAGER MODE
                        </div>
                    </div>
                </div>
                
                <!-- STATYSTYKI LIGI - KARUZELA -->
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-top: 30px;">
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; text-align: center; backdrop-filter: blur(10px);">
                        <div style="font-size: 0.85rem; opacity: 0.8;">TEAMS</div>
                        <div style="font-size: 2.2rem; font-weight: 800; margin: 5px 0;">${stats.totalTeams}</div>
                        <div style="font-size: 0.75rem; opacity: 0.7;">Active</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; text-align: center; backdrop-filter: blur(10px);">
                        <div style="font-size: 0.85rem; opacity: 0.8;">GAMES</div>
                        <div style="font-size: 2.2rem; font-weight: 800; margin: 5px 0;">${stats.totalGames}</div>
                        <div style="font-size: 0.75rem; opacity: 0.7;">Played</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; text-align: center; backdrop-filter: blur(10px);">
                        <div style="font-size: 0.85rem; opacity: 0.8;">PTS LEADER</div>
                        <div style="font-size: 1.1rem; font-weight: 700; margin: 5px 0;">${stats.topScorer.name}</div>
                        <div style="font-size: 0.75rem; opacity: 0.7;">${stats.topScorer.points_per_game} PPG</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; text-align: center; backdrop-filter: blur(10px);">
                        <div style="font-size: 0.85rem; opacity: 0.8;">BEST TEAM</div>
                        <div style="font-size: 1.1rem; font-weight: 700; margin: 5px 0;">${stats.bestTeam.name}</div>
                        <div style="font-size: 0.75rem; opacity: 0.7;">${stats.bestTeam.win_percentage}% WINS</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; text-align: center; backdrop-filter: blur(10px);">
                        <div style="font-size: 0.85rem; opacity: 0.8;">YOUR RECORD</div>
                        <div style="font-size: 1.5rem; font-weight: 800; margin: 5px 0;">${userTeam?.wins || 0}-${userTeam?.losses || 0}</div>
                        <div style="font-size: 0.75rem; opacity: 0.7;">${userTeam ? (((userTeam.wins || 0) / ((userTeam.wins || 0) + (userTeam.losses || 0) || 1) * 100).toFixed(1)) : '0.0'}%</div>
                    </div>
                </div>
            </div>
            
            <!-- GŁÓWNA ZAWARTOŚĆ -->
            <div style="display: grid; grid-template-columns: 1fr 400px; gap: 25px; padding: 25px;">
                
                <!-- LEWA KOLUMNA -->
                <div>
                    <!-- TABELA LIGOWA -->
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 25px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin: 0; color: #1d428a; font-weight: 900; font-size: 1.6rem; display: flex; align-items: center; gap: 10px;">
                                <span style="background: #006bb6; color: white; padding: 5px 10px; border-radius: 6px; font-size: 1.2rem;">🏆</span>
                                NBA STANDINGS
                            </h2>
                            <div style="display: flex; gap: 10px;">
                                <button class="conference-btn active" style="background: #006bb6; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
                                    All
                                </button>
                                <button class="conference-btn" style="background: #e8f4fd; color: #006bb6; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
                                    East
                                </button>
                                <button class="conference-btn" style="background: #e8f4fd; color: #006bb6; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
                                    West
                                </button>
                            </div>
                        </div>
                        
                        <div id="league-standings-table" style="overflow-x: auto;">
                            ${renderNBATable(standings, userTeam?.id)}
                        </div>
                    </div>
                    
                    <!-- OSTATNIE MECZE -->
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                        <h2 style="margin: 0 0 20px 0; color: #1d428a; font-weight: 900; font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
                            <span style="background: #e74c3c; color: white; padding: 5px 10px; border-radius: 6px; font-size: 1rem;">🔥</span>
                            RECENT GAMES
                        </h2>
                        
                        <div id="recent-games-list">
                            ${renderRecentGames(recentGames)}
                        </div>
                    </div>
                </div>
                
                <!-- PRAWA KOLUMNA -->
                <div>
                    <!-- NAJLEPSZY ZAWODNIK -->
                    <div style="background: linear-gradient(135deg, #ff6b6b, #ff8e53); color: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 15px 0; font-weight: 900; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                            <span style="background: white; color: #ff6b6b; padding: 5px 10px; border-radius: 50%;">👑</span>
                            PLAYER OF THE WEEK
                        </h3>
                        <div style="text-align: center; padding: 20px 0;">
                            <div style="width: 80px; height: 80px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: #ff6b6b;">
                                🏀
                            </div>
                            <div style="font-size: 1.4rem; font-weight: 900; margin-bottom: 5px;">${stats.topScorer.name.split(' ')[0] || 'Player'}</div>
                            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 15px;">${stats.topScorer.team || 'Team'}</div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 20px;">
                                <div>
                                    <div style="font-size: 1.8rem; font-weight: 900;">${stats.topScorer.points_per_game}</div>
                                    <div style="font-size: 0.75rem; opacity: 0.9;">PPG</div>
                                </div>
                                <div>
                                    <div style="font-size: 1.8rem; font-weight: 900;">${topPlayers[0]?.rebounds_per_game || '7.2'}</div>
                                    <div style="font-size: 0.75rem; opacity: 0.9;">RPG</div>
                                </div>
                                <div>
                                    <div style="font-size: 1.8rem; font-weight: 900;">${topPlayers[0]?.assists_per_game || '6.5'}</div>
                                    <div style="font-size: 0.75rem; opacity: 0.9;">APG</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- TOP 5 ZAWODNIKÓW -->
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 25px;">
                        <h3 style="margin: 0 0 20px 0; color: #1d428a; font-weight: 900; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                            <span style="background: #1d428a; color: white; padding: 5px 10px; border-radius: 6px; font-size: 1rem;">⭐</span>
                            TOP 5 PLAYERS
                        </h3>
                        
                        <div id="top-players-list">
                            ${renderTopPlayersList(topPlayers.slice(0, 5))}
                        </div>
                        
                        ${topPlayers.length > 5 ? `
                            <div style="text-align: center; margin-top: 20px;">
                                <button id="btn-show-all-players" 
                                        style="background: #f8f9fa; color: #495057; border: 2px solid #dee2e6; padding: 10px 20px; 
                                               border-radius: 25px; font-weight: 700; cursor: pointer; font-size: 0.9rem; transition: all 0.3s;"
                                        onmouseover="this.style.background='#e9ecef'; this.style.borderColor='#1d428a';"
                                        onmouseout="this.style.background='#f8f9fa'; this.style.borderColor='#dee2e6';">
                                    View All Players (${topPlayers.length})
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- STATYSTYKI LIGOWE -->
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 20px 0; color: #1d428a; font-weight: 900; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                            <span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 6px; font-size: 1rem;">📈</span>
                            LEAGUE STATS
                        </h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                                <div style="font-size: 1rem; color: #6c757d; margin-bottom: 5px;">Best Record</div>
                                <div style="font-size: 1.1rem; font-weight: 900; color: #1d428a;">${stats.bestTeam.name}</div>
                                <div style="font-size: 0.9rem; color: #10b981; font-weight: 700;">${stats.bestTeam.wins}-${stats.bestTeam.losses}</div>
                            </div>
                            
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                                <div style="font-size: 1rem; color: #6c757d; margin-bottom: 5px;">Home Wins</div>
                                <div style="font-size: 1.8rem; font-weight: 900; color: #1d428a;">${standings.reduce((sum, team) => sum + (team.home_wins || 0), 0)}</div>
                                <div style="font-size: 0.8rem; color: #6c757d;">Total</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- STOPKA -->
            <div style="background: #1a1a1a; color: white; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto;">
                    <div style="text-align: left;">
                        <div style="font-weight: 700; color: #006bb6; font-size: 1.1rem;">NBA Manager Pro</div>
                        <div style="opacity: 0.7; margin-top: 5px;">© 2024 NBA Basketball Association</div>
                    </div>
                    <div>
                        <button onclick="window.switchTab('m-league')" 
                                style="background: #006bb6; color: white; border: none; padding: 10px 25px; 
                                       border-radius: 25px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <span>🔄</span> Refresh League Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- MODAL Z PEŁNĄ LISTĄ ZAWODNIKÓW -->
        <div id="modal-top-players" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                                           background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 1000px; max-height: 85vh; overflow-y: auto; position: relative;">
                <div style="padding: 30px; border-bottom: 1px solid #e9ecef; background: #1d428a; color: white; border-radius: 16px 16px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 1.8rem; font-weight: 900;">🏀 NBA Player Rankings</h3>
                        <button id="btn-close-modal" style="background: rgba(255,255,255,0.2); color: white; border: none; width: 40px; height: 40px; 
                                 border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            ×
                        </button>
                    </div>
                    <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 0.95rem;">Top ${topPlayers.length} players by performance</p>
                </div>
                <div style="padding: 25px;" id="modal-players-content">
                    ${renderAllNBAPlayers(topPlayers)}
                </div>
            </div>
        </div>
    `;
    
    // Dodaj event listeners
    initNBAEventListeners(topPlayers);
}

function renderNBATable(standings, userTeamId) {
    if (!standings || standings.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🏀</div>
                <h3 style="margin: 0 0 10px 0;">No Standings Data</h3>
                <p>League standings will appear here once games are played.</p>
            </div>
        `;
    }
    
    return `
        <table style="width: 100%; border-collapse: collapse; font-family: 'Segoe UI', sans-serif;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 15px; text-align: left; font-weight: 700; color: #495057; width: 50px;">#</th>
                    <th style="padding: 15px; text-align: left; font-weight: 700; color: #495057;">TEAM</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 40px;">W</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 40px;">L</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 60px;">PCT</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 60px;">GB</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 50px;">HOME</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 50px;">AWAY</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 80px;">L10</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057; width: 70px;">STREAK</th>
                </tr>
            </thead>
            <tbody>
                ${standings.map((team, index) => {
                    // Oblicz GB (Games Behind)
                    const firstTeamWins = standings[0]?.wins || 0;
                    const firstTeamLosses = standings[0]?.losses || 0;
                    const teamWins = team.wins || 0;
                    const teamLosses = team.losses || 0;
                    const gamesBehind = ((firstTeamWins - teamWins) + (teamLosses - firstTeamLosses)) / 2;
                    
                    // Określ kolor wiersza
                    let rowStyle = '';
                    if (team.id === userTeamId) {
                        rowStyle = 'background: linear-gradient(90deg, rgba(29,66,138,0.05), rgba(0,107,182,0.08)); font-weight: 700;';
                    } else if (index < 8) {
                        rowStyle = 'background: rgba(16, 185, 129, 0.05);';
                    }
                    
                    // Generuj formę z ostatnich 10
                    const last10 = generateLast10Form(team);
                    
                    return `
                        <tr style="${rowStyle} border-bottom: 1px solid #e9ecef; ${team.id === userTeamId ? 'border-left: 4px solid #006bb6;' : ''}">
                            <td style="padding: 15px; color: #495057; font-weight: ${team.id === userTeamId ? '900' : '600'};">
                                ${index < 8 ? 
                                    `<span style="color: #10b981; margin-right: 5px;">●</span>` : 
                                    `<span style="color: #adb5bd; margin-right: 5px;">○</span>`}
                                ${team.position}
                            </td>
                            <td style="padding: 15px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 36px; height: 36px; background: ${team.id === userTeamId ? '#006bb6' : '#e9ecef'}; 
                                                border-radius: 8px; display: flex; align-items: center; justify-content: center; 
                                                font-weight: 900; color: ${team.id === userTeamId ? 'white' : '#495057'}; font-size: 0.9rem;">
                                        ${getTeamInitials(team.team_name)}
                                    </div>
                                    <div>
                                        <div style="font-weight: ${team.id === userTeamId ? '900' : '700'}; color: #212529;">
                                            ${team.team_name}
                                        </div>
                                        ${team.conference ? 
                                            `<div style="font-size: 0.75rem; color: #6c757d;">${team.conference}${team.division ? ` • ${team.division}` : ''}</div>` : 
                                            ''}
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 15px; text-align: center; font-weight: 700; color: #10b981;">${team.wins}</td>
                            <td style="padding: 15px; text-align: center; font-weight: 700; color: #e74c3c;">${team.losses}</td>
                            <td style="padding: 15px; text-align: center; font-weight: 700; color: #212529;">${team.win_percentage}</td>
                            <td style="padding: 15px; text-align: center; color: #6c757d; font-weight: 600;">
                                ${gamesBehind === 0 ? '—' : gamesBehind.toFixed(1)}
                            </td>
                            <td style="padding: 15px; text-align: center; color: #212529; font-weight: 600;">${team.home_wins || '0'}-0</td>
                            <td style="padding: 15px; text-align: center; color: #212529; font-weight: 600;">${team.away_wins || '0'}-0</td>
                            <td style="padding: 15px; text-align: center;">
                                <div style="display: flex; gap: 2px; justify-content: center;">
                                    ${last10.split('').map(char => 
                                        `<span style="display: inline-block; width: 14px; height: 14px; border-radius: 2px; 
                                          background: ${char === 'W' ? '#10b981' : char === 'L' ? '#e74c3c' : '#adb5bd'};"></span>`
                                    ).join('')}
                                </div>
                            </td>
                            <td style="padding: 15px; text-align: center;">
                                <span style="font-weight: 700; color: ${team.streak?.startsWith('W') ? '#10b981' : '#e74c3c'}">
                                    ${team.streak || '—'}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderRecentGames(games) {
    if (!games || games.length === 0) {
        return `
            <div style="text-align: center; padding: 30px; color: #6c757d;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🏀</div>
                <p>No recent games found.</p>
            </div>
        `;
    }
    
    return games.map(game => `
        <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #e9ecef; 
                    transition: background 0.3s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
            <div style="flex: 1; text-align: right;">
                <div style="font-weight: 700; color: #212529; margin-bottom: 4px;">${game.home_team}</div>
                <div style="font-size: 0.85rem; color: #6c757d;">Home</div>
            </div>
            
            <div style="width: 100px; text-align: center;">
                <div style="font-size: 1.8rem; font-weight: 900; color: #212529; line-height: 1;">
                    <span style="color: ${game.winner === 'home' ? '#10b981' : '#6c757d'}">${game.home_score}</span>
                    <span style="color: #adb5bd; margin: 0 5px;">-</span>
                    <span style="color: ${game.winner === 'away' ? '#10b981' : '#6c757d'}">${game.away_score}</span>
                </div>
                <div style="font-size: 0.75rem; color: #6c757d; margin-top: 4px;">FINAL</div>
            </div>
            
            <div style="flex: 1;">
                <div style="font-weight: 700; color: #212529; margin-bottom: 4px;">${game.away_team}</div>
                <div style="font-size: 0.85rem; color: #6c757d;">Away</div>
            </div>
        </div>
    `).join('');
}

function renderTopPlayersList(players) {
    if (!players || players.length === 0) {
        return '<p style="color: #6c757d; text-align: center; padding: 20px;">No player data available</p>';
    }
    
    return players.map((player, index) => {
        const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#1d428a', '#1d428a'];
        const rankBgColors = ['#fff9db', '#f8f9fa', '#fef3e9', '#e8f4fd', '#e8f4fd'];
        
        return `
            <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #e9ecef; 
                        ${index < 3 ? `background: ${rankBgColors[index]}; border-radius: 8px; margin-bottom: 8px;` : ''}"
                 onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='${index < 3 ? rankBgColors[index] : 'white'}'">
                <div style="position: relative; width: 40px; height: 40px; margin-right: 15px;">
                    <div style="width: 40px; height: 40px; background: ${rankBgColors[index]}; 
                                border: 2px solid ${rankColors[index]}; border-radius: 50%; 
                                display: flex; align-items: center; justify-content: center; font-weight: 900; 
                                color: ${rankColors[index]};">
                        ${index + 1}
                    </div>
                </div>
                
                <div style="flex: 1;">
                    <div style="font-weight: 800; color: #212529; font-size: 1rem;">
                        ${player.first_name} ${player.last_name}
                    </div>
                    <div style="font-size: 0.85rem; color: #6c757d; display: flex; gap: 8px; margin-top: 2px;">
                        <span>${player.position || '—'}</span>
                        <span>•</span>
                        <span style="font-weight: 600;">${player.team_name || '—'}</span>
                    </div>
                </div>
                
                <div style="text-align: right;">
                    <div style="display: flex; gap: 12px;">
                        <div style="text-align: center;">
                            <div style="font-weight: 900; color: #e74c3c; font-size: 1.1rem;">
                                ${player.points_per_game ? player.points_per_game.toFixed(1) : '—'}
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d;">PTS</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 900; color: #006bb6; font-size: 1.1rem;">
                                ${player.rebounds_per_game ? player.rebounds_per_game.toFixed(1) : '—'}
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d;">REB</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 900; color: #10b981; font-size: 1.1rem;">
                                ${player.assists_per_game ? player.assists_per_game.toFixed(1) : '—'}
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d;">AST</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAllNBAPlayers(players) {
    if (!players || players.length === 0) {
        return '<p style="color: #6c757d; text-align: center; padding: 40px;">No player data available</p>';
    }
    
    return `
        <table style="width: 100%; border-collapse: collapse; font-family: 'Segoe UI', sans-serif;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 15px; text-align: left; font-weight: 700; color: #495057;">RANK</th>
                    <th style="padding: 15px; text-align: left; font-weight: 700; color: #495057;">PLAYER</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">TEAM</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">POS</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">PTS</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">REB</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">AST</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">STL</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">BLK</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">FG%</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #495057;">EFF</th>
                </tr>
            </thead>
            <tbody>
                ${players.map((player, index) => `
                    <tr style="border-bottom: 1px solid #e9ecef;" 
                        onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                        <td style="padding: 15px; font-weight: 700; color: #495057; text-align: center;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; 
                                        width: 28px; height: 28px; border-radius: 6px; 
                                        background: ${index < 3 ? 
                                            index === 0 ? '#fff9db' : 
                                            index === 1 ? '#f8f9fa' : '#fef3e9' : '#f8f9fa'}; 
                                        color: ${index < 3 ? 
                                            index === 0 ? '#ffd700' : 
                                            index === 1 ? '#c0c0c0' : '#cd7f32' : '#495057'};">
                                ${index + 1}
                            </div>
                        </td>
                        <td style="padding: 15px;">
                            <div style="font-weight: 700; color: #212529;">${player.first_name} ${player.last_name}</div>
                            <div style="font-size: 0.85rem; color: #6c757d;">#${player.id?.toString().substring(0, 4) || '0000'} • ${player.age || '—'} yrs</div>
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 600; color: #495057;">
                            ${player.team_name || '—'}
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 700; color: #1d428a;">
                            ${player.position || '—'}
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 900; color: #e74c3c;">
                            ${player.points_per_game ? player.points_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 900; color: #006bb6;">
                            ${player.rebounds_per_game ? player.rebounds_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 900; color: #10b981;">
                            ${player.assists_per_game ? player.assists_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 900; color: #f59e0b;">
                            ${player.steals_per_game ? player.steals_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 900; color: #8b5cf6;">
                            ${player.blocks_per_game ? player.blocks_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 15px; text-align: center; font-weight: 700; color: #212529;">
                            ${player.field_goal_percentage ? player.field_goal_percentage.toFixed(1) + '%' : '—'}
                        </td>
                        <td style="padding: 15px; text-align: center;">
                            <div style="background: #1d428a; color: white; padding: 5px 10px; border-radius: 20px; 
                                        font-weight: 900; font-size: 0.9rem; display: inline-block;">
                                ${player.efficiency || player.overall_rating || '—'}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Funkcje pomocnicze
function getTeamInitials(teamName) {
    if (!teamName) return 'TM';
    const words = teamName.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return teamName.substring(0, 2).toUpperCase();
}

function generateLast10Form(team) {
    // Generuj przykładowe formy (W = win, L = loss)
    const results = [];
    const winRate = team.wins / (team.wins + team.losses) || 0.5;
    
    for (let i = 0; i < 10; i++) {
        results.push(Math.random() < winRate ? 'W' : 'L');
    }
    
    return results.join('');
}

function initNBAEventListeners(topPlayers) {
    // Przycisk pokaż wszystkich zawodników
    const showAllBtn = document.getElementById('btn-show-all-players');
    if (showAllBtn && topPlayers.length > 5) {
        showAllBtn.addEventListener('click', () => {
            const modal = document.getElementById('modal-top-players');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    // Przycisk zamknij modal
    const closeModalBtn = document.getElementById('btn-close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('modal-top-players');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Zamknij modal po kliknięciu poza
    const modal = document.getElementById('modal-top-players');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Konferencje przyciski
    const conferenceBtns = document.querySelectorAll('.conference-btn');
    conferenceBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            conferenceBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}
