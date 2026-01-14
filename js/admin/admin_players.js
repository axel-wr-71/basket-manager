import { renderPlayerProfile } from './admin_player_profile.js';

export async function renderAdminPlayers() {
    const container = document.getElementById('admin-players-table-container');
    if (!container) return;

    // Pobieramy kraje i ligi do filtrów
    const { data: leagues, error: lError } = await supabase
        .from('leagues')
        .select('country_name, league_name')
        .order('country_name', { ascending: true });

    if (lError) {
        console.error("Błąd pobierania lig:", lError);
        return;
    }

    const uniqueCountries = [...new Set(leagues.map(l => l.country_name))];
    window.allLeaguesData = leagues;

    container.innerHTML = `
        <div id="admin-main-view">
            <div class="admin-section">
                <h4 style="margin-top:0;">Wyszukiwarka Zawodników (ADMIN)</h4>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 20px;">
                    <div>
                        <label class="admin-label">NARODOWOŚĆ:</label>
                        <select id="filter-country" class="admin-input" onchange="updateLeagueFilter(this.value)" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                            <option value="">Wszystkie kraje</option>
                            ${uniqueCountries.map(c => `<option value="${c}">${getFlagEmoji(c)} ${c}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="admin-label">LIGA:</label>
                        <select id="filter-league" class="admin-input" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                            <option value="">Wybierz kraj najpierw</option>
                        </select>
                    </div>
                    <button class="btn" onclick="searchPlayers()" style="width: auto; height: 38px;">SZUKAJ</button>
                </div>
            </div>
            <div id="search-results-container">
                </div>
        </div>
        <div id="player-profile-view" style="display:none;"></div>
    `;
}

// Funkcja aktualizacji listy lig po wyborze kraju
window.updateLeagueFilter = (selectedCountry) => {
    const leagueSelect = document.getElementById('filter-league');
    if (!selectedCountry) {
        leagueSelect.innerHTML = '<option value="">Wybierz kraj najpierw</option>';
        return;
    }
    const filtered = window.allLeaguesData.filter(l => l.country_name === selectedCountry);
    leagueSelect.innerHTML = `<option value="">Wszystkie ligi</option>` + 
        filtered.map(l => `<option value="${l.league_name}">${l.league_name}</option>`).join('');
};

// Główna funkcja szukania i renderowania tabeli
window.searchPlayers = async () => {
    const resultsContainer = document.getElementById('search-results-container');
    const country = document.getElementById('filter-country').value;
    const league = document.getElementById('filter-league').value;

    resultsContainer.innerHTML = "<div class='loading'>Pobieranie danych...</div>";

    // Zapytanie do Supabase
    let query = supabase.from('players').select(`*, teams (team_name, league_name)`);
    if (country) query = query.eq('country', country);

    const { data: players, error } = await query;
    if (error) {
        resultsContainer.innerHTML = `<p style="color:red">Błąd: ${error.message}</p>`;
        return;
    }

    // Filtrowanie po lidze (po stronie klienta, bo relacja teams jest zagnieżdżona)
    let filtered = league ? players.filter(p => p.teams?.league_name === league) : players;

    if (filtered.length === 0) {
        resultsContainer.innerHTML = "<p>Brak zawodników spełniających kryteria.</p>";
        return;
    }

    resultsContainer.innerHTML = `
        <div class="admin-section" style="margin-top:20px;">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th style="text-align:left;">ZAWODNIK</th>
                        <th style="text-align:left;">KLUB</th>
                        <th>WIEK</th>
                        <th>POZ</th>
                        <th class="skill-cell">JS</th>
                        <th class="skill-cell">JR</th>
                        <th class="skill-cell">OD</th>
                        <th class="skill-cell">HA</th>
                        <th class="skill-cell">DR</th>
                        <th class="skill-cell">PA</th>
                        <th class="skill-cell">IS</th>
                        <th class="skill-cell">ID</th>
                        <th class="skill-cell">RE</th>
                        <th class="skill-cell">BL</th>
                        <th class="skill-cell">ST</th>
                        <th class="skill-cell">FT</th>
                        <th>AKCJA</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => {
                        const displayName = (p.first_name || p.last_name) 
                            ? `${p.first_name || ''} ${p.last_name || ''}`.trim() 
                            : `Zawodnik ${p.id.substring(0,5)}`;
                        
                        const teamName = p.teams?.team_name || "Wolny agent";

                        return `
                        <tr>
                            <td style="text-align:left;"><strong>${displayName}</strong></td>
                            <td style="text-align:left; font-size: 12px; color: #666;">${teamName}</td>
                            <td>${p.age}</td>
                            <td style="font-weight:bold; color: var(--nba-orange);">${p.position || '??'}</td>
                            <td class="skill-cell">${p.jump_shot}</td>
                            <td class="skill-cell">${p.jump_range}</td>
                            <td class="skill-cell">${p.outside_defense}</td>
                            <td class="skill-cell">${p.handling}</td>
                            <td class="skill-cell">${p.driving}</td>
                            <td class="skill-cell">${p.passing}</td>
                            <td class="skill-cell">${p.inside_shot}</td>
                            <td class="skill-cell">${p.inside_defense}</td>
                            <td class="skill-cell">${p.rebounding}</td>
                            <td class="skill-cell">${p.shot_blocking}</td>
                            <td class="skill-cell">${p.stamina}</td>
                            <td class="skill-cell">${p.free_throw}</td>
                            <td>
                                <button class="btn-show" onclick='showDetails(${JSON.stringify(p)})'>PROFIL</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
};

// Funkcje nawigacji
window.showDetails = (p) => {
    renderPlayerProfile(p);
};

window.hidePlayerProfile = () => {
    document.getElementById('player-profile-view').style.display = 'none';
    document.getElementById('admin-main-view').style.display = 'block';
};

// Pomocnik flag
function getFlagEmoji(country) {
    const flags = { "Poland": "🇵🇱", "USA": "🇺🇸", "Spain": "🇪🇸", "France": "🇫🇷", "Germany": "🇩🇪" };
    return flags[country] || "🏳️";
}
