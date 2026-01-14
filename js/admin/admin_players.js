// js/admin/admin_players.js
import { supabaseClient } from '../auth.js';
import { renderPlayerProfile } from './admin_player_profile.js';

export async function renderAdminPlayers() {
    const container = document.getElementById('admin-players-table-container');
    if (!container) return;

    const { data: leagues, error: lError } = await supabaseClient
        .from('leagues')
        .select('country, name')
        .order('country', { ascending: true });

    if (lError) return console.error("Błąd pobierania lig:", lError);

    const uniqueCountries = [...new Set(leagues.map(l => l.country))];
    window.allLeaguesData = leagues;

    container.innerHTML = `
        <div id="admin-main-view">
            <div class="admin-section">
                <h4>Wyszukiwarka Zawodników (ADMIN)</h4>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 20px;">
                    <div>
                        <label class="admin-label">NARODOWOŚĆ:</label>
                        <select id="filter-country" class="admin-input" onchange="updateLeagueFilter(this.value)">
                            <option value="">Wszystkie kraje</option>
                            ${uniqueCountries.map(c => `<option value="${c}">${getFlagEmoji(c)} ${c}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="admin-label">LIGA:</label>
                        <select id="filter-league" class="admin-input">
                            <option value="">Wybierz kraj najpierw</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 15px; align-items: center; padding-bottom: 10px;">
                        <label style="color: white; font-size: 0.85em; cursor: pointer;">
                            <input type="checkbox" id="filter-free-agent"> Wolny agent
                        </label>
                        <label style="color: white; font-size: 0.85em; cursor: pointer;">
                            <input type="checkbox" id="filter-retirement"> Emerytura (+35)
                        </label>
                    </div>

                    <button class="btn" onclick="searchPlayers()" style="height: 38px;">SZUKAJ</button>
                </div>
            </div>
            <div id="search-results-container"></div>
        </div>
        <div id="player-profile-view" style="display:none;"></div>
    `;

    setTimeout(() => { window.searchPlayers(); }, 100);
}

window.updateLeagueFilter = (selectedCountry) => {
    const leagueSelect = document.getElementById('filter-league');
    if (!selectedCountry) {
        leagueSelect.innerHTML = '<option value="">Wybierz kraj najpierw</option>';
        return;
    }
    const filtered = window.allLeaguesData.filter(l => l.country === selectedCountry);
    leagueSelect.innerHTML = `<option value="">Wszystkie ligi</option>` + 
        filtered.map(l => `<option value="${l.name}">${l.name}</option>`).join('');
};

window.searchPlayers = async () => {
    const resultsContainer = document.getElementById('search-results-container');
    const country = document.getElementById('filter-country').value;
    const league = document.getElementById('filter-league').value;
    const isFreeAgent = document.getElementById('filter-free-agent').checked;
    const isRetirement = document.getElementById('filter-retirement').checked;

    resultsContainer.innerHTML = "<div class='loading'>Pobieranie danych...</div>";

    let query = supabaseClient.from('players').select(`*, teams (team_name, league_name)`);
    
    if (country) query = query.eq('country', country);
    
    if (isFreeAgent || isRetirement) {
        query = query.is('team_id', null);
    }
    if (isRetirement) {
        query = query.gte('age', 35);
    }

    const { data: players, error } = await query;
    if (error) {
        resultsContainer.innerHTML = `<p style="color:red">Błąd: ${error.message}</p>`;
        return;
    }

    let filtered = league ? players.filter(p => p.teams?.league_name === league) : players;

    if (filtered.length === 0) {
        resultsContainer.innerHTML = "<p>Brak zawodników spełniających kryteria.</p>";
        return;
    }

    resultsContainer.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ZAWODNIK</th><th>KLUB</th><th>WIEK</th><th>POZ</th>
                    <th>PENSJA</th><th>POT.</th>
                    <th>2PT</th><th>3PT</th><th>DNK</th><th>PAS</th><th>1v1O</th><th>DRI</th>
                    <th>REB</th><th>BLK</th><th>STL</th><th>1v1D</th><th>FT</th><th>STA</th>
                    <th>AKCJA</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(p => {
                    const pData = JSON.stringify(p).replace(/'/g, "&apos;");
                    const salaryFormatted = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.salary || 0);
                    
                    return `
                    <tr>
                        <td style="text-align:left;"><strong>${p.first_name || ''} ${p.last_name || ''}</strong></td>
                        <td style="text-align:left;">${p.teams?.team_name || '<span style="color:gray; font-style:italic;">Wolny agent</span>'}</td>
                        <td>${p.age}</td>
                        <td style="color:orange; font-weight:bold;">${p.position || '??'}</td>
                        <td style="color: #2ecc71; font-size: 0.85em;">${salaryFormatted}</td>
                        <td style="font-weight:bold; font-size: 0.85em;">${p.potential_name || p.potential || '-'}</td>
                        <td>${p.skill_2pt}</td><td>${p.skill_3pt}</td><td>${p.skill_dunk}</td>
                        <td>${p.skill_passing}</td><td>${p.skill_1on1_off}</td><td>${p.skill_dribbling}</td>
                        <td>${p.skill_rebound}</td><td>${p.skill_block}</td><td>${p.skill_steal}</td>
                        <td>${p.skill_1on1_def}</td><td>${p.skill_ft}</td><td>${p.skill_stamina}</td>
                        <td><button class="btn-show" onclick='showDetails(${pData})'>PROFIL</button></td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
};

window.showDetails = (p) => { 
    const mainView = document.getElementById('admin-main-view');
    const profileView = document.getElementById('player-profile-view');
    if (mainView && profileView) {
        mainView.style.display = 'none';
        profileView.style.display = 'block';
        renderPlayerProfile(p); 
    }
};

window.hidePlayerDetails = () => {
    const mainView = document.getElementById('admin-main-view');
    const profileView = document.getElementById('player-profile-view');
    if (mainView && profileView) {
        mainView.style.display = 'block';
        profileView.style.display = 'none';
    }
};

function getFlagEmoji(country) {
    const flags = { 
        "Poland": "🇵🇱", "USA": "🇺🇸", "Spain": "🇪🇸", "France": "🇫🇷", 
        "Germany": "🇩🇪", "Italy": "🇮🇹", "Greece": "🇬🇷", "Lithuania": "🇱🇹", "Belgium": "🇧🇪"
    };
    return flags[country] || "🏳️";
}
