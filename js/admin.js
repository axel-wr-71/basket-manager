// js/admin.js

/**
 * Główna funkcja renderująca sekcję filtrów
 */
async function renderAdminPlayers() {
    const container = document.getElementById('admin-players-table-container');
    if (!container) return;

    const { data: leagues, error } = await supabase
        .from('leagues')
        .select('country_name, league_name')
        .order('country_name', { ascending: true });

    if (error) {
        console.error("Błąd pobierania lig:", error);
        return;
    }

    const uniqueCountries = [...new Set(leagues.map(l => l.country_name))];
    window.allLeaguesData = leagues;

    container.innerHTML = `
        <div id="admin-main-view">
            <div class="admin-filters-card">
                <h4 style="margin-top:0;">Filtrowanie Bazy Zawodników (ADMIN)</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
                    <div>
                        <label class="admin-label">SEZON:</label>
                        <select id="filter-season" class="admin-input" style="min-width: 80px;">
                            <option value="">Wszystkie</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                    <div>
                        <label class="admin-label">NARODOWOŚĆ:</label>
                        <select id="filter-country" class="admin-input" onchange="updateLeagueFilter(this.value)" style="min-width: 150px;">
                            <option value="">Wszystkie kraje</option>
                            ${uniqueCountries.map(c => `<option value="${c}">${getFlagEmoji(c)} ${c}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="admin-label">LIGA:</label>
                        <select id="filter-league" class="admin-input" style="min-width: 150px;">
                            <option value="">Wybierz kraj najpierw</option>
                        </select>
                    </div>
                    <button class="btn" onclick="searchPlayers()" style="width: auto; padding: 10px 20px;">SZUKAJ</button>
                </div>
            </div>
            <div id="search-results-container">
                <p style="text-align: center; padding: 30px; color: #666;">Ustaw filtry i kliknij SZUKAJ.</p>
            </div>
        </div>
        <div id="player-profile-view" style="display:none;"></div>
    `;
}

function updateLeagueFilter(selectedCountry) {
    const leagueSelect = document.getElementById('filter-league');
    if (!selectedCountry) {
        leagueSelect.innerHTML = '<option value="">Wybierz kraj najpierw</option>';
        return;
    }
    const filteredLeagues = window.allLeaguesData.filter(l => l.country_name === selectedCountry);
    leagueSelect.innerHTML = `
        <option value="">Wszystkie ligi</option>
        ${filteredLeagues.map(l => `<option value="${l.league_name}">${l.league_name}</option>`).join('')}
    `;
}

async function searchPlayers() {
    const resultsContainer = document.getElementById('search-results-container');
    const country = document.getElementById('filter-country').value;
    const league = document.getElementById('filter-league').value;

    resultsContainer.innerHTML = "<div class='loading'>Pobieranie danych...</div>";

    let query = supabase.from('players').select(`*, teams (team_name, league_name)`);
    if (country) query = query.eq('country', country);

    const { data: players, error } = await query;
    if (error) {
        resultsContainer.innerHTML = `<p style="color:red">Błąd: ${error.message}</p>`;
        return;
    }

    let filtered = players;
    if (league) filtered = players.filter(p => p.teams && p.teams.league_name === league);

    if (filtered.length === 0) {
        resultsContainer.innerHTML = "<p>Brak wyników.</p>";
        return;
    }

    let html = `
        <table class="admin-table" style="font-size: 11px;">
            <thead>
                <tr>
                    <th>Zawodnik</th>
                    <th>Wiek</th>
                    <th>Poz</th>
                    <th title="Jump Shot">JS</th>
                    <th title="Jump Range">JR</th>
                    <th title="Outside Def.">OD</th>
                    <th title="Handling">HA</th>
                    <th title="Driving">DR</th>
                    <th title="Passing">PA</th>
                    <th title="Inside Shot">IS</th>
                    <th title="Inside Def.">ID</th>
                    <th title="Rebounding">RE</th>
                    <th title="Shot Blocking">BL</th>
                    <th title="Stamina">ST</th>
                    <th title="Free Throw">FT</th>
                    <th>Akcja</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(p => `
                    <tr>
                        <td><strong>${p.first_name} ${p.last_name}</strong></td>
                        <td>${p.age}</td>
                        <td style="font-weight:bold">${p.position}</td>
                        <td>${p.jump_shot}</td>
                        <td>${p.jump_range}</td>
                        <td>${p.outside_defense}</td>
                        <td>${p.handling}</td>
                        <td>${p.driving}</td>
                        <td>${p.passing}</td>
                        <td>${p.inside_shot}</td>
                        <td>${p.inside_defense}</td>
                        <td>${p.rebounding}</td>
                        <td>${p.shot_blocking}</td>
                        <td>${p.stamina}</td>
                        <td>${p.free_throw}</td>
                        <td>
                            <button class="btn" style="padding: 4px 8px; font-size: 10px;" onclick='showPlayerProfile(${JSON.stringify(p)})'>POKAŻ</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    resultsContainer.innerHTML = html;
}

/**
 * Widok profilu zawodnika na wzór BuzzerBeater
 */
function showPlayerProfile(p) {
    document.getElementById('admin-main-view').style.display = 'none';
    const profileView = document.getElementById('player-profile-view');
    profileView.style.display = 'block';

    profileView.innerHTML = `
        <button class="btn" onclick="hidePlayerProfile()" style="width:auto; margin-bottom:20px; background:#666;">← POWRÓT DO LISTY</button>
        
        <div style="background: white; border: 1px solid #ccc; padding: 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #f58426; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin:0;">${getFlagEmoji(p.country)} ${p.first_name} ${p.last_name} (${p.id.substring(0,8)})</h2>
                <h3 style="margin:0; color:#444;">${p.position}</h3>
            </div>

            <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; text-align: center; background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <img src="${p.avatar_url}" style="width: 150px; border: 3px solid #ddd; border-radius: 10px; background: white;">
                    <div style="text-align: left; margin-top: 15px; line-height: 1.8;">
                        <div><strong>Właściciel:</strong> ${p.teams ? p.teams.team_name : 'Wolny Agent'}</div>
                        <div><strong>Wiek:</strong> ${p.age}</div>
                        <div><strong>Wzrost:</strong> ${p.height} cm</div>
                        <div><strong>Potencjał:</strong> <span style="color:#e65100; font-weight:bold;">Tier ${p.potential_id}</span></div>
                    </div>
                </div>

                <div style="flex: 2; min-width: 300px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${renderSkillRow("Rzut z wyskoku (JS)", p.jump_shot)}
                        ${renderSkillRow("Zasięg rzutu (JR)", p.jump_range)}
                        ${renderSkillRow("Obr. na obwodzie (OD)", p.outside_defense)}
                        ${renderSkillRow("Kozłowanie (HA)", p.handling)}
                        ${renderSkillRow("Jeden na jeden (DR)", p.driving)}
                        ${renderSkillRow("Podania (PA)", p.passing)}
                        ${renderSkillRow("Rzut z bliska (IS)", p.inside_shot)}
                        ${renderSkillRow("Obr. pod koszem (ID)", p.inside_defense)}
                        ${renderSkillRow("Zbieranie (RE)", p.rebounding)}
                        ${renderSkillRow("Blokowanie (BL)", p.shot_blocking)}
                        ${renderSkillRow("Kondycja (ST)", p.stamina)}
                        ${renderSkillRow("Rzuty osobiste (FT)", p.free_throw)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSkillRow(label, value) {
    const skillNames = ["tragiczny", "okropny", "słaby", "przeciętny", "solidny", "sprawny", "porządny", "świetny", "imponujący", "wybitny", "doskonały", "niesamowity", "zjawiskowy", "cudowny"];
    const skillName = skillNames[value] || "legendarny";
    
    return `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 5px 0;">
            <span style="color: #555;">${label}:</span>
            <span style="font-weight:bold;">${skillName} (${value})</span>
        </div>
    `;
}

function hidePlayerProfile() {
    document.getElementById('player-profile-view').style.display = 'none';
    document.getElementById('admin-main-view').style.display = 'block';
}

function getFlagEmoji(country) {
    const flags = { "Poland": "🇵🇱", "Spain": "🇪🇸", "France": "🇫🇷", "Italy": "🇮🇹", "USA": "🇺🇸" };
    return flags[country] || "🏳️";
}
