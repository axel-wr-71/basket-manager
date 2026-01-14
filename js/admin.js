// js/admin.js

/**
 * Widok bazy wszystkich zawodników dla Admina
 */
async function renderAdminPlayers() {
    const container = document.getElementById('admin-players-table-container');
    if (!container) return;

    container.innerHTML = "<p>Ładowanie bazy wszystkich zawodników...</p>";

    // Pobieramy zawodników wraz z nazwami ich klubów (JOIN)
    const { data: players, error } = await supabase
        .from('players')
        .select(`
            *,
            teams (
                team_name,
                country_name,
                league_name
            )
        `)
        .order('overall_rating', { ascending: false });

    if (error) {
        container.innerHTML = "<p>Błąd pobierania danych: " + error.message + "</p>";
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>OVR</th>
                    <th>Imię i Nazwisko</th>
                    <th>Pozycja</th>
                    <th>Kraj</th>
                    <th>Liga</th>
                    <th>Klub</th>
                    <th>Wiek</th>
                </tr>
            </thead>
            <tbody>
                ${players.map(p => `
                    <tr>
                        <td style="font-weight:bold; background:#fff9c4; text-align:center;">${p.overall_rating}</td>
                        <td>${p.first_name} ${p.last_name}</td>
                        <td>${p.position}</td>
                        <td>${p.teams ? p.teams.country_name : '-'}</td>
                        <td>${p.teams ? p.teams.league_name : '-'}</td>
                        <td>${p.teams ? p.teams.team_name : '<span style="color:red">Wolny Agent</span>'}</td>
                        <td>${p.age}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

/**
 * Widok ustawień lig (lista 10 krajów)
 */
async function renderLeagueSettings() {
    const container = document.getElementById('admin-league-config-container');
    if (!container) return;

    container.innerHTML = "<p>Pobieranie struktur ligowych...</p>";

    const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .order('country_name', { ascending: true })
        .order('tier', { ascending: true });

    if (error) {
        container.innerHTML = "<p>Błąd: " + error.message + "</p>";
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Kraj</th>
                    <th>Nazwa Ligi</th>
                    <th>Tier</th>
                    <th>Podział (Sub-tier)</th>
                </tr>
            </thead>
            <tbody>
                ${leagues.map(l => `
                    <tr>
                        <td>${l.country_name}</td>
                        <td><strong>${l.league_name}</strong></td>
                        <td>${l.tier}</td>
                        <td>${l.sub_tier}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

// Pozostałe Twoje funkcje edycji (Game Config) mogą zostać tutaj...
