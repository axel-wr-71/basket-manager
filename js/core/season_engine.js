// js/core/season_engine.js

/**
 * Główny silnik parowania drużyn
 * Realizuje zasadę: 18 meczów wewnątrz konferencji + 10 meczów między konferencjami
 */
export function pairTeamsForSeason(teams) {
    const west = teams.filter(t => t.conference === 'WEST');
    const east = teams.filter(t => t.conference === 'EAST');
    let allLeagueMatches = [];

    // --- 1. MECZE WEWNĄTRZ KONFERENCJI (18 meczów na zespół) ---
    // Każdy z każdym (dom i wyjazd)
    allLeagueMatches.push(...generateRoundRobin(west, true));
    allLeagueMatches.push(...generateRoundRobin(east, true));

    // --- 2. MECZE MIĘDZY KONFERENCJAMI (10 meczów na zespół) ---
    // Każdy z WEST gra 1 mecz z każdym z EAST
    const interConferenceMatches = [];
    west.forEach((wTeam, wIdx) => {
        east.forEach((eTeam, eIdx) => {
            // Logika balansu dom/wyjazd (5 dom, 5 wyjazd)
            if ((wIdx + eIdx) % 2 === 0) {
                interConferenceMatches.push({ home_id: wTeam.id, away_id: eTeam.id, type: 'LEAGUE' });
            } else {
                interConferenceMatches.push({ home_id: eTeam.id, away_id: wTeam.id, type: 'LEAGUE' });
            }
        });
    });
    allLeagueMatches.push(...interConferenceMatches);

    // Mieszamy mecze, aby terminarz nie był przewidywalny
    return shuffleArray(allLeagueMatches);
}

function generateRoundRobin(teams, homeAndAway) {
    let matches = [];
    const n = teams.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            matches.push({ home_id: teams[i].id, away_id: teams[j].id, type: 'LEAGUE' });
            if (homeAndAway) {
                matches.push({ home_id: teams[j].id, away_id: teams[i].id, type: 'LEAGUE' });
            }
        }
    }
    return matches;
}

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}
