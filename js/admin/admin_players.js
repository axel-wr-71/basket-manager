// js/admin/admin_players.js

export async function renderAdminPlayers() {
    const container = document.getElementById('admin-players-table-container');
    if (!container) return;

    const { data: leagues } = await supabase
        .from('leagues')
        .select('country_name, league_name')
        .order('country_name', { ascending: true });

    const uniqueCountries = [...new Set(leagues.map(l => l.country_name))];
    window.allLeaguesData = leagues;

    container.innerHTML = `
        <div id="admin-main-view">
            <div class="admin-filters-card">
                <h4 style="margin-top:0;">Filtrowanie Bazy (ADMIN)</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
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
                    <button class="btn" onclick="searchPlayers()" style="width: auto;">SZUKAJ</button>
                </div>
            </div>
            <div id="search-results-container"></div>
        </div>
        <div id="player-profile-view" style="display:none; background: #f4f4f4; padding: 20px; border-radius: 8px;"></div>
    `;
}

// Globalne funkcje pomocnicze
window.updateLeagueFilter = (selectedCountry) => {
    const leagueSelect = document.getElementById('filter-league');
    const filtered = window.allLeaguesData.filter(l => l.country_name === selectedCountry);
    leagueSelect.innerHTML = `<option value="">Wszystkie ligi</option>` + 
        filtered.map(l => `<option value="${l.league_name}">${l.league_name}</option>`).join('');
};

window.searchPlayers = async () => {
    const resultsContainer = document.getElementById('search-results-container');
    const country = document.getElementById('filter-country').value;
    const league = document.getElementById('filter-league').value;

    resultsContainer.innerHTML = "<div class='loading'>Pobieranie...</div>";

    // Pobieramy dane zawodników wraz z relacją do drużyn
    let query = supabase.from('players').select(`*, teams (team_name, league_name)`);
    if (country) query = query.eq('country', country);

    const { data: players, error } = await query;
    if (error) {
        resultsContainer.innerHTML = `<p style="color:red">Błąd bazy: ${error.message}</p>`;
        return;
    }

    let filtered = league ? players.filter(p => p.teams?.league_name === league) : players;

    let html = `
        <table class="admin-table player-list-table">
            <thead>
                <tr>
                    <th style="text-align:left;">ZAWODNIK</th>
                    <th style="text-align:center;">WIEK</th>
                    <th style="text-align:center;">POZ</th>
                    <th style="text-align:center;">JS</th><th style="text-align:center;">JR</th>
                    <th style="text-align:center;">OD</th><th style="text-align:center;">HA</th>
                    <th style="text-align:center;">DR</th><th style="text-align:center;">PA</th>
                    <th style="text-align:center;">IS</th><th style="text-align:center;">ID</th>
                    <th style="text-align:center;">RE</th><th style="text-align:center;">BL</th>
                    <th style="text-align:center;">ST</th><th style="text-align:center;">FT</th>
                    <th style="text-align:center;">AKCJA</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(p => `
                    <tr>
                        <td style="text-align:left;"><strong>${p.first_name || 'Gracz'} ${p.last_name || p.id.substring(0,5)}</strong></td>
                        <td style="text-align:center;">${p.age || '--'}</td>
                        <td style="text-align:center; font-weight:bold; color: #e65100;">${p.position || '??'}</td>
                        <td class="skill-cell" style="text-align:center;">${p.jump_shot}</td>
                        <td class="skill-cell" style="text-align:center;">${p.jump_range}</td>
                        <td class="skill-cell" style="text-align:center;">${p.outside_defense}</td>
                        <td class="skill-cell" style="text-align:center;">${p.handling}</td>
                        <td class="skill-cell" style="text-align:center;">${p.driving}</td>
                        <td class="skill-cell" style="text-align:center;">${p.passing}</td>
                        <td class="skill-cell" style="text-align:center;">${p.inside_shot}</td>
                        <td class="skill-cell" style="text-align:center;">${p.inside_defense}</td>
                        <td class="skill-cell" style="text-align:center;">${p.rebounding}</td>
                        <td class="skill-cell" style="text-align:center;">${p.shot_blocking}</td>
                        <td class="skill-cell" style="text-align:center;">${p.stamina}</td>
                        <td class="skill-cell" style="text-align:center;">${p.free_throw}</td>
                        <td style="text-align:center;"><button class="btn show-btn" onclick='showPlayerProfile(${JSON.stringify(p)})'>POKAŻ</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    resultsContainer.innerHTML = html;
};

window.showPlayerProfile = (p) => {
    document.getElementById('admin-main-view').style.display = 'none';
    const profile = document.getElementById('player-profile-view');
    profile.style.display = 'block';

    const skills = [
        { l: "RzW", v: p.jump_shot }, { l: "ZR", v: p.jump_range }, { l: "ObO", v: p.outside_defense },
        { l: "Koz", v: p.handling }, { l: "1/1", v: p.driving }, { l: "Pod", v: p.passing },
        { l: "RzB", v: p.inside_shot }, { l: "ObK", v: p.inside_defense }, { l: "Zb", v: p.rebounding },
        { l: "Blk", v: p.shot_blocking }, { l: "Kon", v: p.stamina }, { l: "RzO", v: p.free_throw }
    ];

    profile.innerHTML = `
        <button class="btn" onclick="hidePlayerProfile()" style="width:auto; background:#666; margin-bottom:15px;">← POWRÓT</button>
        <div style="background:white; border: 1px solid #ccc; padding: 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <div style="background:#ddd; padding:5px 10px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f58426;">
                <h2 style="margin:0; font-size:18px;">${getFlagEmoji(p.country)} ${p.first_name} ${p.last_name} (${p.id.substring(0,8)})</h2>
                <strong style="color:#444;">${p.position}</strong>
            </div>

            <div style="display: flex; gap: 20px; margin-top: 15px;">
                <div style="flex: 1; text-align: center;">
                    <div style="width:120px; height:150px; background:#eee; margin:0 auto; border:1px solid #ccc; display:flex; align-items:center; justify-content:center;">
                        ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%;">` : `👤`}
                    </div>
                    <div style="text-align:left; font-size:12px; margin-top:10px; line-height:1.6;">
                        <div><strong>Właściciel:</strong> ${p.teams ? p.teams.team_name : 'Wolny Agent'}</div>
                        <div><strong>Wiek:</strong> ${p.age}</div>
                        <div><strong>Wzrost:</strong> ${p.height || '198'} cm</div>
                        <div><strong>Potencjał:</strong> <span style="color:red;">Tier ${p.potential_id}</span></div>
                    </div>
                </div>

                <div style="flex: 2; display: grid; grid-template-columns: 1fr 1fr; gap: x; font-size: 13px;">
                    ${skills.map(s => renderSkillRow(s.l, s.v)).join('')}
                </div>
            </div>

            <div style="margin-top:20px; border-top: 1px solid #eee; padding-top:15px;">
                <div style="display: flex; align-items: flex-end; height: 100px; gap: 5px; background: #fafafa; padding: 10px; border-left: 2px solid #555; border-bottom: 2px solid #555;">
                    ${skills.map(s => `
                        <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:5px;">
                            <div style="width:100%; background:#1a237e; height:${s.v * 5}px; border:1px solid #000;"></div>
                            <span style="font-size:9px; font-weight:bold;">${s.l}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

function renderSkillRow(label, value) {
    const names = ["tragiczny", "okropny", "słaby", "przeciętny", "solidny", "sprawny", "porządny", "świetny", "imponujący", "wybitny", "doskonały", "niesamowity", "zjawiskowy", "cudowny"];
    const skillName = names[value] || "legendarny";
    return `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f0f0f0; padding:3px 5px;">
            <span>${label}:</span>
            <span style="font-weight:bold; color:#1a237e;">${skillName} (${value})</span>
        </div>
    `;
}

window.hidePlayerProfile = () => {
    document.getElementById('player-profile-view').style.display = 'none';
    document.getElementById('admin-main-view').style.display = 'block';
};

function getFlagEmoji(country) {
    const flags = { "Poland": "🇵🇱", "Spain": "🇪🇸", "France": "🇫🇷", "USA": "🇺🇸" };
    return flags[country] || "🏳️";
}
