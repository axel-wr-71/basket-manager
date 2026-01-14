// js/admin.js

/**
 * Główna funkcja renderująca sekcję filtrów (widok początkowy)
 * Dane zawodników nie są pobierane automatycznie - czekają na "Szukaj".
 */
async function renderAdminPlayers() {
    const container = document.getElementById('admin-players-table-container');
    if (!container) return;

    // Pobieramy kraje i ligi z bazy, aby wypełnić filtry
    const { data: leagues, error } = await supabase
        .from('leagues')
        .select('country_name, league_name')
        .order('country_name', { ascending: true });

    if (error) {
        console.error("Błąd pobierania lig do filtrów:", error);
        return;
    }

    // Wyciągamy unikalne kraje do selecta narodowości
    const uniqueCountries = [...new Set(leagues.map(l => l.country_name))];
    window.allLeaguesData = leagues; // Zapisujemy globalnie do filtrowania dynamicznego

    container.innerHTML = `
        <div class="admin-filters-card" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #dee2e6;">
            <h4 style="margin-top:0;">Filtrowanie Bazy Zawodników</h4>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;">
                
                <div>
                    <label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 5px;">SEZON:</label>
                    <select id="filter-season" class="admin-input" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc; min-width: 120px;">
                        <option value="">Wszystkie</option>
                        <option value="2026">Sezon 2026</option>
                        <option value="2025">Sezon 2025</option>
                    </select>
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 5px;">NARODOWOŚĆ:</label>
                    <select id="filter-country" class="admin-input" onchange="updateLeagueFilter(this.value)" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc; min-width: 180px;">
                        <option value="">Wszystkie kraje</option>
                        ${uniqueCountries.map(c => `<option value="${c}">${getFlagEmoji(c)} ${c}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 5px;">LIGA:</label>
                    <select id="filter-league" class="admin-input" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc; min-width: 200px;">
                        <option value="">Wybierz kraj najpierw</option>
                    </select>
                </div>

                <button class="btn" onclick="searchPlayers()" style="background: #e65100; color: white; border: none; padding: 9px 25px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    SZUKAJ
                </button>
            </div>
        </div>
        <div id="search-results-container">
            <div style="text-align: center; color: #6c757d; padding: 50px; border: 2px dashed #dee2e6; border-radius: 8px;">
                <p style="font-size: 1.1rem; margin: 0;">Ustaw filtry i kliknij przycisk <strong>SZUKAJ</strong>, aby wyświetlić listę zawodników.</p>
            </div>
        </div>
    `;
}

/**
 * Aktualizuje listę lig w zależności od wybranego kraju
 */
function updateLeagueFilter(selectedCountry) {
    const leagueSelect = document.getElementById('filter-league');
    if (!selectedCountry) {
        leagueSelect.innerHTML = '<option value="">Wybierz kraj najpierw</option>';
        return;
    }

    const filteredLeagues = window.allLeaguesData.filter(l => l.country_name === selectedCountry);
    leagueSelect.innerHTML = `
        <option value="">Wszystkie ligi (${selectedCountry})</option>
        ${filteredLeagues.map(l => `<option value="${l.league_name}">${l.league_name}</option>`).join('')}
    `;
}

/**
 * Pobiera dane z bazy na podstawie wybranych filtrów
 */
async function searchPlayers() {
    const resultsContainer = document.getElementById('search-results-container');
    const country = document.getElementById('filter-country').value;
    const league = document.getElementById('filter-league').value;
    const season = document.getElementById('filter-season').value;

    resultsContainer.innerHTML = "<div class='loading'>Wyszukiwanie zawodników...</div>";

    // Budujemy zapytanie do Supabase
    let query = supabase
        .from('players')
        .select(`
            *,
            teams (
                team_name,
                country,
                league_name
            )
        `);

    // Logika filtrów
    if (country) {
        query = query.eq('country', country);
    }
    
    // Sortowanie alfabetyczne (ponieważ OVR może nie istnieć w każdej tabeli)
    query = query.order('last_name', { ascending: true });

    const { data: players, error } = await query;

    if (error) {
        resultsContainer.innerHTML = `<div style="color:red; padding:20px;">Błąd wyszukiwania: ${error.message}</div>`;
        return;
    }

    // Filtrowanie po lidze odbywa się po stronie klienta (ze względu na strukturę relacji teams)
    let filteredPlayers = players;
    if (league) {
        filteredPlayers = players.filter(p => p.teams && p.teams.league_name === league);
    }
    
    // Opcjonalne filtrowanie po sezonie (jeśli masz kolumnę created_at lub season w tabeli players)
    if (season && filteredPlayers.length > 0) {
        // Przykład filtrowania po roku dołączenia, jeśli brak dedykowanej kolumny season
        filteredPlayers = filteredPlayers.filter(p => p.created_at && p.created_at.includes(season));
    }

    if (filteredPlayers.length === 0) {
        resultsContainer.innerHTML = "<div style='text-align:center; padding:30px;'>Brak zawodników spełniających podane kryteria.</div>";
        return;
    }

    // Renderowanie tabeli wynikowej
    let html = `
        <div style="margin-bottom: 10px; font-size: 14px;">Znaleziono: <strong>${filteredPlayers.length}</strong> zawodników</div>
        <table class="admin-table">
            <thead>
                <tr>
                    <th>OVR</th>
                    <th>Zawodnik</th>
                    <th>Wiek</th>
                    <th>Poz</th>
                    <th>Narodowość</th>
                    <th>Liga</th>
                    <th>Klub</th>
                </tr>
            </thead>
            <tbody>
                ${filteredPlayers.map(p => {
                    const t = p.teams || {};
                    return `
                    <tr>
                        <td style="font-weight:bold; text-align:center; background:#f0f0f0;">${p.overall_rating || '-'}</td>
                        <td><strong>${p.first_name} ${p.last_name}</strong></td>
                        <td>${p.age}</td>
                        <td>${p.position}</td>
                        <td>${getFlagEmoji(p.country)} ${p.country}</td>
                        <td>${t.league_name || '-'}</td>
                        <td style="color: ${t.team_name ? 'black' : '#d32f2f'}; font-weight: ${t.team_name ? 'normal' : 'bold'};">
                            ${t.team_name || 'WOLNY AGENT'}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
    resultsContainer.innerHTML = html;
}

/**
 * Widok Ustawień Ligi
 */
async function renderLeagueSettings() {
    const container = document.getElementById('admin-league-config-container');
    if (!container) return;

    container.innerHTML = "<p>Pobieranie struktur...</p>";

    const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*')
        .order('country_name', { ascending: true })
        .order('tier', { ascending: true });

    if (error) {
        container.innerHTML = `<p style="color:red">${error.message}</p>`;
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Kraj</th>
                    <th>Nazwa Ligi</th>
                    <th>Poziom</th>
                    <th>Podgrupa</th>
                </tr>
            </thead>
            <tbody>
                ${leagues.map(l => `
                    <tr>
                        <td>${getFlagEmoji(l.country_name)} ${l.country_name}</td>
                        <td><strong>${l.league_name}</strong></td>
                        <td>Poziom ${l.tier}</td>
                        <td>${l.sub_tier}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

/**
 * Mapowanie flag krajów
 */
function getFlagEmoji(country) {
    const flags = {
        "Poland": "🇵🇱", "Spain": "🇪🇸", "France": "🇫🇷", "Italy": "🇮🇹", 
        "Germany": "🇩🇪", "Greece": "🇬🇷", "Turkey": "🇹🇷", "Serbia": "🇷🇸", 
        "Lithuania": "🇱🇹", "USA": "🇺🇸", "Polska": "🇵🇱", "Hiszpania": "🇪🇸"
    };
    return flags[country] || "🏳️";
}
