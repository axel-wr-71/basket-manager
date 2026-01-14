// js/admin/admin_players.js
import { supabaseClient } from '../auth.js';
import { renderPlayerProfile } from './admin_player_profile.js';

// Zmienne do obsługi stron
let currentPage = 1;
const itemsPerPage = 50;
let currentFilteredData = [];

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
                <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 20px;">
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
                    
                    <div style="display: flex; gap: 20px; align-items: center; border-left: 1px solid #444; padding-left: 20px;">
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <span style="color: gray; font-size: 0.7em; font-weight: bold; text-transform: uppercase;">Status Kontraktu</span>
                            <label style="color: white; font-size: 0.85em; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" id="filter-free-agent"> Wolny agent
                            </label>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <span style="color: gray; font-size: 0.7em; font-weight: bold; text-transform: uppercase;">Etap Kariery</span>
                            <label style="color: white; font-size: 0.85em; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" id="filter-retirement"> Emerytura (+35)
                            </label>
                        </div>
                    </div>

                    <button class="btn" onclick="searchPlayers(true)" style="height: 38px; min-width: 120px; background: #f39c12; color: black; font-weight: bold;">SZUKAJ</button>
                </div>
            </div>
            
            <div id="search-results-container"></div>
            
            <div id="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 20px; padding-bottom: 30px;"></div>
        </div>
        <div id="player-profile-view" style="display:none;"></div>
    `;

    setTimeout(() => { window.searchPlayers(true); }, 100);
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

window.searchPlayers = async (isNewSearch = true) => {
    if (isNewSearch) currentPage = 1;
    
    const resultsContainer = document.getElementById('search-results-container');
    const paginationContainer = document.getElementById('pagination-controls');
    
    const country = document.getElementById('filter-country').value;
    const league = document.getElementById('filter-league').value;
    const isFreeAgent = document.getElementById('filter-free-agent').checked;
    const isRetirement = document.getElementById('filter-retirement').checked;

    resultsContainer.innerHTML = "<div class='loading'>Analizowanie bazy danych...</div>";
    paginationContainer.innerHTML = "";

    let query = supabaseClient.from('players').select(`*, teams (team_name, league_name)`);
    
    if (country) query = query.eq('country', country);
    if (isFreeAgent || isRetirement) query = query.is('team_id', null);
    if (isRetirement) query = query.gte('age', 35);

    const { data: players, error } = await query;
    if (error) {
        resultsContainer.innerHTML = `<p style="color:red">Błąd: ${error.message}</p>`;
        return;
    }

    // Filtracja ligi po stronie klienta (ze względu na relację)
    currentFilteredData = league ? players.filter(p => p.teams?.league_name === league) : players;

    if (currentFilteredData.length === 0) {
        resultsContainer.innerHTML = "<p style='text-align:center; padding: 40px; color: gray;'>Brak zawodników spełniających kryteria.</p>";
        return;
    }

    renderTablePage();
};

function renderTablePage() {
    const resultsContainer = document.getElementById('search-results-container');
    const totalPages = Math.ceil(currentFilteredData.length / itemsPerPage);
    
    // Wycinanie kawałka danych dla aktualnej strony
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = currentFilteredData.slice(start, end);

    resultsContainer.innerHTML = `
        <div style="margin-bottom: 10px; color: gray; font-size: 0.8em;">Pokazano ${start + 1}-${Math.min(end, currentFilteredData.length)} z ${currentFilteredData.length} zawodników</div>
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
                ${pageData.map(p => {
                    const pData = JSON.stringify(p).replace(/'/g, "&apos;");
                    const salaryFormatted = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.salary || 0);
                    return `
                    <tr>
                        <td style="text-align:left;"><strong>${p.first_name || ''} ${p.last_name || ''}</strong></td>
                        <td style="text-align:left;">${p.teams?.team_name || '<span style="color:#777; font-style:italic;">Wolny agent</span>'}</td>
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

    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const paginationContainer = document.getElementById('pagination-controls');
    if (totalPages <= 1) return;

    paginationContainer.innerHTML = `
        <button class="btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.3"' : ''}>← Poprzednia</button>
        <span style="color: white; font-weight: bold;">Strona ${currentPage} z ${totalPages}</span>
        <button class="btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:0.3"' : ''}>Następna →</button>
    `;
}

window.changePage = (newPage) => {
    currentPage = newPage;
    renderTablePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
