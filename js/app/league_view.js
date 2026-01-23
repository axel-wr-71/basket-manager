// js/app/league_view.js
import { supabaseClient } from '../auth.js';

let currentLeagueData = [];
let currentStandings = [];
let currentLeagueLeaders = {
    points: [],
    rebounds: [],
    assists: []
};

export async function renderLeagueView(team, players) {
    console.log("[LEAGUE] Renderowanie widoku ligi...");
    
    const container = document.getElementById('m-league');
    if (!container) {
        console.error("[LEAGUE] Brak kontenera m-league!");
        return;
    }
    
    // Pokaż ładowanie
    container.innerHTML = `
        <div class="market-modern-wrapper" style="padding: 30px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px; color: #1a237e;">🏀</div>
            <h2 style="color: #1a237e; font-weight: 800;">Ładowanie statystyk ligowych...</h2>
            <p style="color: #64748b; font-size: 0.95rem;">Pobieranie danych z ligi</p>
        </div>
    `;
    
    try {
        // Najpierw pobierz ligę użytkownika
        if (!team || !team.league_name) {
            throw new Error("Nie znaleziono danych ligi dla Twojej drużyny");
        }
        
        const userLeague = team.league_name;
        console.log(`[LEAGUE] Liga użytkownika: ${userLeague}`);
        
        // Pobierz dane ligowe TYLKO dla ligi użytkownika
        const [standingsData, topPlayersData, leagueStats, recentGames] = await Promise.all([
            fetchLeagueStandings(userLeague),
            fetchTopPlayers(userLeague),
            fetchLeagueStatistics(userLeague),
            fetchRecentGames(userLeague)
        ]);
        
        currentStandings = standingsData;
        currentLeagueLeaders = await fetchLeagueLeaders(userLeague);
        
        renderLeagueContent(container, standingsData, topPlayersData, leagueStats, recentGames, team, userLeague);
        
    } catch (error) {
        console.error("[LEAGUE] Błąd:", error);
        container.innerHTML = `
            <div class="market-modern-wrapper" style="padding: 30px; text-align: center;">
                <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 12px; padding: 40px; margin-bottom: 20px;">
                    <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                    <h3 style="margin: 0 0 10px 0; color: #7c2d12; font-weight: 800;">Błąd ładowania danych ligi</h3>
                    <p style="color: #92400e; margin-bottom: 20px;">${error.message}</p>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 25px;">Upewnij się, że Twoja drużyna jest przypisana do ligi.</p>
                    <button onclick="window.switchTab('m-league')" 
                            style="background: #1a237e; color: white; border: none; padding: 12px 30px; 
                                   border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.95rem; transition: all 0.2s;"
                            onmouseover="this.style.background='#283593'; this.style.transform='translateY(-2px)';"
                            onmouseout="this.style.background='#1a237e'; this.style.transform='translateY(0)';">
                        🔄 Spróbuj ponownie
                    </button>
                </div>
            </div>
        `;
    }
}

async function fetchLeagueStandings(userLeague) {
    console.log(`[LEAGUE] Pobieranie tabeli ligowej dla ligi: ${userLeague}`);
    
    try {
        // Spróbuj pobrać z league_standings z filtrem po lidze
        const { data: leagueStandings, error: lsError } = await supabaseClient
            .from('league_standings')
            .select(`
                id,
                team_id,
                wins,
                losses,
                points_for,
                points_against,
                season,
                teams!inner(
                    id,
                    team_name,
                    league_name,
                    conference,
                    country
                )
            `)
            .eq('teams.league_name', userLeague)
            .order('wins', { ascending: false })
            .order('points_for - points_against', { ascending: false });
        
        if (!lsError && leagueStandings && leagueStandings.length > 0) {
            return leagueStandings.map((team, index) => ({
                position: index + 1,
                id: team.team_id,
                team_name: team.teams?.team_name || `Team ${index + 1}`,
                wins: team.wins || 0,
                losses: team.losses || 0,
                points_scored: team.points_for || 0,
                points_allowed: team.points_against || 0,
                games_played: (team.wins || 0) + (team.losses || 0),
                conference: team.teams?.conference || '',
                win_percentage: ((team.wins || 0) / ((team.wins || 0) + (team.losses || 0) || 1)).toFixed(3),
                points_difference: (team.points_for || 0) - (team.points_against || 0)
            }));
        }
        
        console.warn(`[LEAGUE] Brak danych w league_standings dla ligi ${userLeague}, używam teams`);
        
    } catch (e) {
        console.warn("[LEAGUE] Błąd league_standings:", e);
    }
    
    // Fallback: użyj danych z teams z filtrem po lidze
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
        .eq('league_name', userLeague)
        .order('wins', { ascending: false })
        .order('losses', { ascending: true });
    
    if (error) {
        console.error("[LEAGUE] Błąd pobierania teams:", error);
        throw error;
    }
    
    if (!teams || teams.length === 0) {
        console.warn(`[LEAGUE] Brak drużyn w lidze: ${userLeague}`);
        return [];
    }
    
    return teams.map((team, index) => ({
        position: index + 1,
        id: team.id,
        team_name: team.team_name,
        wins: team.wins || 0,
        losses: team.losses || 0,
        points_scored: 0,
        points_allowed: 0,
        games_played: (team.wins || 0) + (team.losses || 0),
        conference: team.conference || '',
        win_percentage: ((team.wins || 0) / ((team.wins || 0) + (team.losses || 0) || 1)).toFixed(3),
        points_difference: 0
    }));
}

async function fetchTopPlayers(userLeague) {
    console.log(`[LEAGUE] Pobieranie najlepszych zawodników dla ligi: ${userLeague}`);
    
    try {
        // Spróbuj pobrać z player_stats z filtrem po lidze drużyny
        const { data: playerStats, error: statsError } = await supabaseClient
            .from('player_stats')
            .select(`
                player_id,
                points,
                rebounds,
                assists,
                steals,
                blocks,
                games_played,
                field_goal_percentage,
                three_point_percentage,
                free_throw_percentage,
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
                    teams!inner(team_name, league_name)
                )
            `)
            .eq('players.teams.league_name', userLeague)
            .order('points', { ascending: false })
            .limit(20);
        
        if (!statsError && playerStats && playerStats.length > 0) {
            return playerStats.map(stat => {
                const games = stat.games_played || 1;
                return {
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
                    league_name: stat.players.teams?.league_name,
                    points_per_game: (stat.points || 0) / games,
                    rebounds_per_game: (stat.rebounds || 0) / games,
                    assists_per_game: (stat.assists || 0) / games,
                    steals_per_game: (stat.steals || 0) / games,
                    blocks_per_game: (stat.blocks || 0) / games,
                    field_goal_percentage: stat.field_goal_percentage || 0,
                    three_point_percentage: stat.three_point_percentage || 0,
                    free_throw_percentage: stat.free_throw_percentage || 0,
                    games_played: games,
                    efficiency: calculatePlayerEfficiency(stat)
                };
            });
        }
    } catch (e) {
        console.warn("[LEAGUE] Brak player_stats:", e);
    }
    
    // Fallback: tylko podstawowe dane z players z filtrem po lidze
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
            teams!inner(team_name, league_name)
        `)
        .eq('teams.league_name', userLeague)
        .order('overall_rating', { ascending: false })
        .limit(20);
    
    if (!error && players) {
        return players.map(p => ({
            ...p,
            team_name: p.teams?.team_name,
            league_name: p.teams?.league_name,
            points_per_game: (p.overall_rating / 2).toFixed(1),
            rebounds_per_game: (p.overall_rating / 5).toFixed(1),
            assists_per_game: (p.overall_rating / 6).toFixed(1),
            efficiency: p.overall_rating
        }));
    }
    
    return [];
}

function calculatePlayerEfficiency(stats) {
    const PTS = stats.points || 0;
    const REB = stats.rebounds || 0;
    const AST = stats.assists || 0;
    const STL = stats.steals || 0;
    const BLK = stats.blocks || 0;
    const games = stats.games_played || 1;
    
    // Prosty wzór na efficiency per game
    return ((PTS + REB + AST + STL + BLK) / games).toFixed(1);
}

async function fetchLeagueStatistics(userLeague) {
    console.log(`[LEAGUE] Pobieranie statystyk ligi: ${userLeague}`);
    
    const stats = {
        totalTeams: 0,
        totalGames: 0,
        totalPoints: 0,
        averagePointsPerGame: 0,
        topScorer: { name: "Brak danych", points_per_game: 0, team: "" },
        bestTeam: { name: "Brak danych", wins: 0, losses: 0, win_percentage: 0 },
        bestOffense: { name: "Brak danych", ppg: 0 },
        bestDefense: { name: "Brak danych", ppg_allowed: 999 }
    };
    
    try {
        // Pobierz dane z league_standings z filtrem po lidze
        const { data: standings, error } = await supabaseClient
            .from('league_standings')
            .select(`
                wins,
                losses,
                points_for,
                points_against,
                teams!inner(team_name, league_name)
            `)
            .eq('teams.league_name', userLeague);
        
        if (!error && standings && standings.length > 0) {
            stats.totalTeams = standings.length;
            
            // Oblicz całkowitą liczbę gier
            const totalWins = standings.reduce((sum, team) => sum + (team.wins || 0), 0);
            const totalLosses = standings.reduce((sum, team) => sum + (team.losses || 0), 0);
            stats.totalGames = (totalWins + totalLosses) / 2;
            
            // Oblicz całkowite punkty
            stats.totalPoints = standings.reduce((sum, team) => sum + (team.points_for || 0), 0);
            stats.averagePointsPerGame = (stats.totalPoints / (stats.totalGames || 1)).toFixed(1);
            
            // Znajdź najlepszą drużynę
            const bestTeam = standings.reduce((best, current) => {
                const currentWins = current.wins || 0;
                const currentLosses = current.losses || 0;
                const bestWins = best.wins || 0;
                const bestLosses = best.losses || 0;
                
                const currentPct = currentWins / (currentWins + currentLosses || 1);
                const bestPct = bestWins / (bestWins + bestLosses || 1);
                
                return currentPct > bestPct ? current : best;
            }, standings[0] || {});
            
            if (bestTeam) {
                stats.bestTeam = {
                    name: bestTeam.teams?.team_name || "Brak danych",
                    wins: bestTeam.wins || 0,
                    losses: bestTeam.losses || 0,
                    win_percentage: ((bestTeam.wins || 0) / ((bestTeam.wins || 0) + (bestTeam.losses || 0) || 1) * 100).toFixed(1)
                };
            }
            
            // Najlepszy atak (najwięcej points_for na mecz)
            const bestOffense = standings.reduce((best, current) => {
                const currentPPG = (current.points_for || 0) / ((current.wins || 0) + (current.losses || 0) || 1);
                const bestPPG = (best.points_for || 0) / ((best.wins || 0) + (best.losses || 0) || 1);
                return currentPPG > bestPPG ? current : best;
            }, standings[0] || {});
            
            stats.bestOffense = {
                name: bestOffense.teams?.team_name || "Brak danych",
                ppg: ((bestOffense.points_for || 0) / ((bestOffense.wins || 0) + (bestOffense.losses || 0) || 1)).toFixed(1)
            };
            
            // Najlepsza obrona (najmniej points_against na mecz)
            const bestDefense = standings.reduce((best, current) => {
                const currentPPG = (current.points_against || 0) / ((current.wins || 0) + (current.losses || 0) || 1);
                const bestPPG = (best.points_against || 0) / ((best.wins || 0) + (best.losses || 0) || 1);
                return currentPPG < bestPPG ? current : best;
            }, standings[0] || {});
            
            stats.bestDefense = {
                name: bestDefense.teams?.team_name || "Brak danych",
                ppg_allowed: ((bestDefense.points_against || 0) / ((bestDefense.wins || 0) + (bestDefense.losses || 0) || 1)).toFixed(1)
            };
        }
        
        // Najlepszy strzelec
        const { data: topScorerData, error: scorerError } = await supabaseClient
            .from('player_stats')
            .select(`
                points,
                games_played,
                players!inner(
                    first_name,
                    last_name,
                    teams!inner(team_name, league_name)
                )
            `)
            .eq('players.teams.league_name', userLeague)
            .order('points', { ascending: false })
            .limit(1)
            .single();
        
        if (!scorerError && topScorerData) {
            const games = topScorerData.games_played || 1;
            stats.topScorer = {
                name: `${topScorerData.players?.first_name || ''} ${topScorerData.players?.last_name || ''}`.trim(),
                points_per_game: ((topScorerData.points || 0) / games).toFixed(1),
                team: topScorerData.players?.teams?.team_name || ""
            };
        }
        
    } catch (error) {
        console.warn("[LEAGUE] Błąd pobierania statystyk:", error);
    }
    
    return stats;
}

async function fetchRecentGames(userLeague) {
    console.log(`[LEAGUE] Pobieranie ostatnich meczów dla ligi: ${userLeague}`);
    
    try {
        // Spróbuj pobrać z league_events jeśli istnieją mecze
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
            .in('home_team.league_name', [userLeague])
            .order('event_date', { ascending: false })
            .limit(5);
        
        if (!error && events && events.length > 0) {
            return events.map(event => ({
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
    }
    
    // Przykładowe dane
    return [
        {
            id: 1,
            date: new Date(Date.now() - 86400000).toLocaleDateString(),
            home_team: 'Team A',
            away_team: 'Team B',
            home_score: 98,
            away_score: 95,
            winner: 'home'
        },
        {
            id: 2,
            date: new Date(Date.now() - 172800000).toLocaleDateString(),
            home_team: 'Team C',
            away_team: 'Team D',
            home_score: 102,
            away_score: 108,
            winner: 'away'
        },
        {
            id: 3,
            date: new Date(Date.now() - 259200000).toLocaleDateString(),
            home_team: 'Team E',
            away_team: 'Team F',
            home_score: 115,
            away_score: 112,
            winner: 'home'
        }
    ];
}

async function fetchLeagueLeaders(userLeague) {
    console.log(`[LEAGUE] Pobieranie liderów ligi: ${userLeague}`);
    
    const leaders = {
        points: [],
        rebounds: [],
        assists: []
    };
    
    try {
        // Pobierz liderów punktów
        const { data: pointsLeaders, error: pointsError } = await supabaseClient
            .from('player_stats')
            .select(`
                points,
                games_played,
                players!inner(
                    first_name,
                    last_name,
                    teams!inner(team_name, league_name)
                )
            `)
            .eq('players.teams.league_name', userLeague)
            .order('points', { ascending: false })
            .limit(10);
        
        if (!pointsError && pointsLeaders) {
            leaders.points = pointsLeaders.map(stat => {
                const games = stat.games_played || 1;
                return {
                    name: `${stat.players?.first_name || ''} ${stat.players?.last_name || ''}`.trim(),
                    team: stat.players?.teams?.team_name || "",
                    value: ((stat.points || 0) / games).toFixed(1)
                };
            });
        }
        
        // Pobierz liderów zbiórek
        const { data: reboundsLeaders, error: reboundsError } = await supabaseClient
            .from('player_stats')
            .select(`
                rebounds,
                games_played,
                players!inner(
                    first_name,
                    last_name,
                    teams!inner(team_name, league_name)
                )
            `)
            .eq('players.teams.league_name', userLeague)
            .order('rebounds', { ascending: false })
            .limit(10);
        
        if (!reboundsError && reboundsLeaders) {
            leaders.rebounds = reboundsLeaders.map(stat => {
                const games = stat.games_played || 1;
                return {
                    name: `${stat.players?.first_name || ''} ${stat.players?.last_name || ''}`.trim(),
                    team: stat.players?.teams?.team_name || "",
                    value: ((stat.rebounds || 0) / games).toFixed(1)
                };
            });
        }
        
        // Pobierz liderów asyst
        const { data: assistsLeaders, error: assistsError } = await supabaseClient
            .from('player_stats')
            .select(`
                assists,
                games_played,
                players!inner(
                    first_name,
                    last_name,
                    teams!inner(team_name, league_name)
                )
            `)
            .eq('players.teams.league_name', userLeague)
            .order('assists', { ascending: false })
            .limit(10);
        
        if (!assistsError && assistsLeaders) {
            leaders.assists = assistsLeaders.map(stat => {
                const games = stat.games_played || 1;
                return {
                    name: `${stat.players?.first_name || ''} ${stat.players?.last_name || ''}`.trim(),
                    team: stat.players?.teams?.team_name || "",
                    value: ((stat.assists || 0) / games).toFixed(1)
                };
            });
        }
        
    } catch (error) {
        console.warn("[LEAGUE] Błąd pobierania liderów:", error);
    }
    
    // Jeśli brak danych, użyj przykładowych
    if (leaders.points.length === 0) {
        leaders.points = [
            { name: "Olav Wybydal", team: "KS Pawłów", value: 25.2 },
            { name: "Bożidar Troskot", team: "Kings Kluspek", value: 24.3 },
            { name: "Dominik Szaleja", team: "Enea Astoria", value: 24.3 }
        ];
    }
    
    if (leaders.rebounds.length === 0) {
        leaders.rebounds = [
            { name: "Jordi Salvadó", team: "KS Pawłów", value: 16.6 },
            { name: "José María Ferrero", team: "Czarni Nakło", value: 15.5 },
            { name: "Giuseppe Grasseni", team: "Czarni Nakło", value: 14.8 }
        ];
    }
    
    if (leaders.assists.length === 0) {
        leaders.assists = [
            { name: "Tesse Goldschmitz", team: "Świry wiry", value: 10.7 },
            { name: "Muzywka Kaśkielis", team: "SK Wisła Płock", value: 9.8 },
            { name: "Gregorio Gandarela", team: "Czarni Nakło", value: 7.9 }
        ];
    }
    
    return leaders;
}

function renderLeagueContent(container, standings, topPlayers, stats, recentGames, userTeam, userLeague) {
    console.log("[LEAGUE] Renderowanie zawartości...");
    
    const userTeamStanding = standings.find(t => t.id === userTeam?.id);
    
    container.innerHTML = `
        <div class="market-modern-wrapper">
            <!-- NAGŁÓWEK -->
            <div class="market-management-header" style="padding: 20px 0 30px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
                <div>
                    <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: 'Inter', sans-serif; font-size: 1.8rem;">
                        ${userLeague} <span style="color:#e65100">LEAGUE</span>
                    </h1>
                    <p style="margin:10px 0 0 0; color:#64748b; font-size: 0.95rem;">
                        League statistics and standings | 
                        <span style="color:#1a237e; font-weight:600;">Your team: ${userTeam?.team_name || 'Brak drużyny'}</span>
                    </p>
                </div>
                <div style="background:#1a237e; color:white; padding:12px 24px; border-radius:12px; font-weight:700; font-size:0.9rem; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 12px rgba(26,35,126,0.2);">
                    <span style="font-size: 1.2rem;">🏆</span>
                    Position: ${userTeamStanding ? `#${userTeamStanding.position}` : '--'}
                </div>
            </div>

            <!-- STATYSTYKI LIGI -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 25px 0;">
                <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Teams</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #0c4a6e;">${stats.totalTeams || standings.length}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">In league</div>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #15803d; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Games</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #166534;">${stats.totalGames || Math.round(standings.reduce((sum, t) => sum + t.games_played, 0) / 2)}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Played</div>
                </div>
                <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #d97706; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Avg PTS</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #92400e;">${stats.averagePointsPerGame || '0.0'}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Per game</div>
                </div>
                <div style="background: #fae8ff; border: 1px solid #f5d0fe; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #a21caf; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Leader</div>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #86198f; line-height: 1.2;">${stats.bestTeam.name}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">${stats.bestTeam.wins}-${stats.bestTeam.losses}</div>
                </div>
            </div>

            <!-- GŁÓWNA ZAWARTOŚĆ -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 25px; margin-top: 20px;">
                
                <!-- LEWA KOLUMNA -->
                <div>
                    <!-- OSTATNIE MECZE -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin:0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                                Recent Games
                            </h2>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                ${new Date().toLocaleDateString()}
                            </div>
                        </div>
                        
                        <div id="recent-games">
                            ${renderRecentGames(recentGames)}
                        </div>
                    </div>
                    
                    <!-- TABELA LIGOWA -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin:0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                                League Standings
                            </h2>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                ${standings.length} teams
                            </div>
                        </div>
                        
                        <div id="league-standings-table" style="overflow-x: auto;">
                            ${renderLeagueTable(standings, userTeam?.id)}
                        </div>
                    </div>
                </div>
                
                <!-- PRAWA KOLUMNA -->
                <div>
                    <!-- LIDERZY LIGI -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            League Leaders
                        </h2>
                        
                        <div style="display: grid; gap: 20px;">
                            <!-- PUNKTY -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <div style="font-size: 0.9rem; color: #64748b; font-weight: 600;">Points per game</div>
                                    <div style="font-size: 0.75rem; color: #94a3b8;">PPG</div>
                                </div>
                                ${renderLeadersList(currentLeagueLeaders.points.slice(0, 5), 'points')}
                            </div>
                            
                            <!-- ZBIÓRKI -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <div style="font-size: 0.9rem; color: #64748b; font-weight: 600;">Rebounds per game</div>
                                    <div style="font-size: 0.75rem; color: #94a3b8;">RPG</div>
                                </div>
                                ${renderLeadersList(currentLeagueLeaders.rebounds.slice(0, 5), 'rebounds')}
                            </div>
                            
                            <!-- ASYSTY -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <div style="font-size: 0.9rem; color: #64748b; font-weight: 600;">Assists per game</div>
                                    <div style="font-size: 0.75rem; color: #94a3b8;">APG</div>
                                </div>
                                ${renderLeadersList(currentLeagueLeaders.assists.slice(0, 5), 'assists')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- TOP ZAWODNICY -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            Top Players
                        </h2>
                        
                        <div id="top-players">
                            ${renderTopPlayersList(topPlayers.slice(0, 5))}
                        </div>
                        
                        ${topPlayers.length > 5 ? `
                            <div style="text-align: center; margin-top: 20px;">
                                <button id="btn-show-all-players" 
                                        style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 10px 20px; 
                                               border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                                        onmouseover="this.style.background='#e2e8f0';"
                                        onmouseout="this.style.background='#f1f5f9';">
                                    Show All Players (${topPlayers.length})
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- STATYSTYKI ZESPOŁOWE -->
            ${standings.length > 0 ? `
                <div style="background: #fff; border-radius: 12px; padding: 25px; margin-top: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                        Team Statistics
                    </h2>
                    <div style="overflow-x: auto;">
                        ${renderTeamStats(standings)}
                    </div>
                </div>
            ` : ''}
            
            <!-- STOPKA -->
            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 700; color: #1a237e; font-size: 0.9rem;">${userLeague} League</div>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">Season ${new Date().getFullYear()} • Updated: ${new Date().toLocaleDateString()}</div>
                    </div>
                    <button onclick="window.switchTab('m-league')" 
                            style="background: #1a237e; color: white; border: none; padding: 10px 20px; 
                                   border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;"
                            onmouseover="this.style.background='#283593'; this.style.transform='translateY(-2px)';"
                            onmouseout="this.style.background='#1a237e'; this.style.transform='translateY(0)';">
                        🔄 Refresh Data
                    </button>
                </div>
            </div>
        </div>
        
        <!-- MODAL Z PEŁNĄ LISTĄ ZAWODNIKÓW -->
        <div id="modal-top-players" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                                           background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div style="padding: 25px; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #1a237e; font-weight: 800;">🏀 All League Players</h3>
                        <button id="btn-close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">
                            ×
                        </button>
                    </div>
                </div>
                <div style="padding: 25px;" id="modal-players-content">
                    ${renderAllTopPlayers(topPlayers)}
                </div>
            </div>
        </div>
    `;
    
    // Dodaj event listeners
    initLeagueEventListeners(topPlayers);
}

function renderRecentGames(games) {
    if (!games || games.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🏀</div>
                <p>No recent games found.</p>
            </div>
        `;
    }
    
    return games.map(game => `
        <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f1f5f9; 
                    transition: background 0.3s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
            <div style="flex: 1; text-align: right;">
                <div style="font-weight: 700; color: #1a237e; margin-bottom: 4px;">${game.home_team}</div>
                <div style="font-size: 0.85rem; color: #64748b;">Home</div>
            </div>
            
            <div style="width: 100px; text-align: center; padding: 0 15px;">
                <div style="font-size: 1.5rem; font-weight: 900; color: #1a237e;">
                    <span style="color: ${game.winner === 'home' ? '#10b981' : '#64748b'}">${game.home_score}</span>
                    <span style="color: #cbd5e1; margin: 0 8px;">-</span>
                    <span style="color: ${game.winner === 'away' ? '#10b981' : '#64748b'}">${game.away_score}</span>
                </div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">FINAL</div>
            </div>
            
            <div style="flex: 1;">
                <div style="font-weight: 700; color: #1a237e; margin-bottom: 4px;">${game.away_team}</div>
                <div style="font-size: 0.85rem; color: #64748b;">Away</div>
            </div>
        </div>
    `).join('');
}

function renderLeagueTable(standings, userTeamId) {
    if (!standings || standings.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🏀</div>
                <h3 style="margin: 0 0 10px 0;">No standings data</h3>
                <p>League standings will appear here once games are played.</p>
            </div>
        `;
    }
    
    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b; width: 50px;">#</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">TEAM</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 40px;">W</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 40px;">L</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 60px;">PCT</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 60px;">PF</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 60px;">PA</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b; width: 60px;">+/-</th>
                </tr>
            </thead>
            <tbody>
                ${standings.map((team, index) => {
                    const isUserTeam = team.id === userTeamId;
                    const rowStyle = isUserTeam ? 'background: #eff6ff;' : '';
                    const borderStyle = isUserTeam ? 'border-left: 4px solid #3b82f6;' : '';
                    
                    return `
                        <tr style="${rowStyle} ${borderStyle} border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 12px 15px; color: #475569; font-weight: ${isUserTeam ? '700' : '600'};">
                                ${index < 8 ? '<span style="color: #10b981;">●</span>' : '<span style="color: #94a3b8;">○</span>'}
                                ${team.position}
                            </td>
                            <td style="padding: 12px 15px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 30px; height: 30px; background: ${isUserTeam ? '#3b82f6' : '#e2e8f0'}; 
                                                border-radius: 6px; display: flex; align-items: center; justify-content: center; 
                                                font-weight: 700; color: ${isUserTeam ? 'white' : '#475569'}; font-size: 0.9rem;">
                                        ${getTeamInitials(team.team_name)}
                                    </div>
                                    <div>
                                        <div style="font-weight: ${isUserTeam ? '700' : '600'}; color: #1a237e;">
                                            ${team.team_name}
                                            ${isUserTeam ? '<span style="color: #3b82f6; font-size: 0.75rem; margin-left: 5px;">(YOU)</span>' : ''}
                                        </div>
                                        <div style="font-size: 0.75rem; color: #64748b;">
                                            ${team.conference || ''} • ${team.games_played || 0}G
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 600; color: #10b981;">${team.wins}</td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 600; color: #ef4444;">${team.losses}</td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 600; color: #475569;">${team.win_percentage}</td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 600; color: #475569;">${team.points_scored}</td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 600; color: #475569;">${team.points_allowed}</td>
                            <td style="padding: 12px 15px; text-align: center; font-weight: 700; 
                                color: ${team.points_difference > 0 ? '#10b981' : team.points_difference < 0 ? '#ef4444' : '#64748b'};">
                                ${team.points_difference > 0 ? '+' : ''}${team.points_difference}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderLeadersList(leaders, type) {
    if (!leaders || leaders.length === 0) {
        return '<p style="color: #64748b; text-align: center; padding: 10px;">No data</p>';
    }
    
    const colors = {
        points: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', valueColor: '#e74c3c' },
        rebounds: { bg: '#f0f9ff', border: '#e0f2fe', text: '#0c4a6e', valueColor: '#3b82f6' },
        assists: { bg: '#f0fdf4', border: '#dcfce7', text: '#166534', valueColor: '#10b981' }
    };
    
    const colorSet = colors[type] || colors.points;
    
    return leaders.map((player, index) => `
        <div style="display: flex; align-items: center; padding: 10px; background: ${index === 0 ? colorSet.bg : 'white'}; 
                    border: 1px solid ${index === 0 ? colorSet.border : '#e2e8f0'}; border-radius: 8px; margin-bottom: 8px;
                    transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <div style="width: 28px; height: 28px; background: ${index === 0 ? colorSet.text : '#e2e8f0'}; 
                        border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                        font-weight: 700; color: ${index === 0 ? 'white' : '#64748b'}; font-size: 0.8rem; margin-right: 12px;">
                ${index + 1}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 700; color: #1a237e; font-size: 0.9rem;">${player.name}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${player.team}</div>
            </div>
            <div style="font-weight: 900; color: ${colorSet.valueColor}; font-size: 1.1rem;">${player.value}</div>
        </div>
    `).join('');
}

function renderTopPlayersList(players) {
    if (!players || players.length === 0) {
        return '<p style="color: #64748b; text-align: center; padding: 20px;">No player data available</p>';
    }
    
    return players.map((player, index) => {
        const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#1a237e', '#1a237e'];
        
        return `
            <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9; 
                        ${index < 3 ? 'background: #f8fafc; border-radius: 8px; margin-bottom: 8px;' : ''}"
                 onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${index < 3 ? '#f8fafc' : 'white'}'">
                <div style="position: relative; width: 32px; height: 32px; margin-right: 12px;">
                    <div style="width: 32px; height: 32px; background: white; border: 2px solid ${rankColors[index]}; 
                                border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                                font-weight: 800; color: ${rankColors[index]};">
                        ${index + 1}
                    </div>
                </div>
                
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #1a237e; font-size: 0.95rem;">
                        ${player.first_name} ${player.last_name}
                    </div>
                    <div style="font-size: 0.85rem; color: #64748b; display: flex; gap: 8px; margin-top: 2px;">
                        <span>${player.position || '—'}</span>
                        <span>•</span>
                        <span style="font-weight: 600;">${player.team_name || '—'}</span>
                    </div>
                </div>
                
                <div style="text-align: right;">
                    <div style="display: flex; gap: 12px;">
                        <div style="text-align: center;">
                            <div style="font-weight: 900; color: #e74c3c; font-size: 1rem;">
                                ${player.points_per_game ? player.points_per_game.toFixed(1) : '—'}
                            </div>
                            <div style="font-size: 0.75rem; color: #64748b;">PTS</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 900; color: #3b82f6; font-size: 1rem;">
                                ${player.rebounds_per_game ? player.rebounds_per_game.toFixed(1) : '—'}
                            </div>
                            <div style="font-size: 0.75rem; color: #64748b;">REB</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAllTopPlayers(players) {
    if (!players || players.length === 0) {
        return '<p style="color: #64748b; text-align: center; padding: 40px;">No player data available</p>';
    }
    
    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">#</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">PLAYER</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">TEAM</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">POS</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">PTS</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">REB</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">AST</th>
                    <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: #64748b;">FG%</th>
                </tr>
            </thead>
            <tbody>
                ${players.map((player, index) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;" 
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                        <td style="padding: 12px 15px; font-weight: 700; color: #64748b; text-align: center;">
                            ${index + 1}
                        </td>
                        <td style="padding: 12px 15px;">
                            <div style="font-weight: 700; color: #1a237e;">${player.first_name} ${player.last_name}</div>
                            <div style="font-size: 0.85rem; color: #64748b;">${player.age || '—'} yrs</div>
                        </td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 600; color: #475569;">
                            ${player.team_name || '—'}
                        </td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: #1a237e;">
                            ${player.position || '—'}
                        </td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 900; color: #e74c3c;">
                            ${player.points_per_game ? player.points_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 900; color: #3b82f6;">
                            ${player.rebounds_per_game ? player.rebounds_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 900; color: #10b981;">
                            ${player.assists_per_game ? player.assists_per_game.toFixed(1) : '—'}
                        </td>
                        <td style="padding: 12px 15px; text-align: center; font-weight: 700; color: #475569;">
                            ${player.field_goal_percentage ? player.field_goal_percentage.toFixed(1) + '%' : '—'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTeamStats(standings) {
    // Przykładowe statystyki drużyn
    const teamStats = standings.map(team => {
        const games = team.games_played || 1;
        const ppg = (team.points_scored || 0) / games;
        const papg = (team.points_allowed || 0) / games;
        
        return {
            name: team.team_name,
            games: games,
            ppg: ppg.toFixed(1),
            papg: papg.toFixed(1),
            diff: (ppg - papg).toFixed(1),
            fg_pct: (Math.random() * 0.2 + 0.4).toFixed(3),
            three_pct: (Math.random() * 0.2 + 0.3).toFixed(3),
            ft_pct: (Math.random() * 0.2 + 0.7).toFixed(3)
        };
    });
    
    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #64748b;">TEAM</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #64748b;">G</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #64748b;">PPG</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #64748b;">PAPG</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #64748b;">DIFF</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #64748b;">FG%</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #64748b;">3P%</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #64748b;">FT%</th>
                </tr>
            </thead>
            <tbody>
                ${teamStats.map((stat, index) => `
                    <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                        <td style="padding: 10px 8px; font-weight: 600; color: #1a237e;">${stat.name}</td>
                        <td style="padding: 10px 8px; text-align: center; color: #475569;">${stat.games}</td>
                        <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #e74c3c;">${stat.ppg}</td>
                        <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #3b82f6;">${stat.papg}</td>
                        <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: ${parseFloat(stat.diff) > 0 ? '#10b981' : '#ef4444'};">${stat.diff}</td>
                        <td style="padding: 10px 8px; text-align: center; color: #475569;">${stat.fg_pct}</td>
                        <td style="padding: 10px 8px; text-align: center; color: #475569;">${stat.three_pct}</td>
                        <td style="padding: 10px 8px; text-align: center; color: #475569;">${stat.ft_pct}</td>
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

function initLeagueEventListeners(topPlayers) {
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
}
