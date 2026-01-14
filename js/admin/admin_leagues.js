// js/admin/admin_leagues.js
import { supabaseClient } from '../auth.js';

export async function renderLeagueSettings() {
    // Celujemy w kontener dla lig
    const container = document.getElementById('admin-league-config-container');
    const mainView = document.getElementById('admin-main-view');
    
    if (!container) return;

    // Przełączanie widoków
    if (mainView) mainView.style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = "<div class='loading'>Ładowanie struktur ligowych...</div>";

    // Pobieramy ligi wraz z liczbą przypisanych drużyn
    const { data: leagues, error } = await supabaseClient
        .from('leagues')
        .select(`
            *,
            teams:teams(count)
        `)
        .order('country', { ascending: true })
        .order('level', { ascending: true });

    if (error) {
        container.innerHTML = `<p style="color:red">Błąd: ${error.message}</p>`;
        return;
    }

    // Grupowanie danych po krajach dla lepszej czytelności
    const countries = [...new Set(leagues.map(l => l.country))];

    container.innerHTML = `
        <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h2>⚙️ STRUKTURA I USTAWIENIA LIGI</h2>
            <button class="btn-back" onclick="hideLeagueSettings()" style="padding: 10px 20px; cursor: pointer; background: #666; color: white; border: none; border-radius: 5px;">← POWRÓT</button>
        </div>

        <div class="leagues-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
            ${countries.map(country => {
                const countryLeagues = leagues.filter(l => l.country === country);
                return `
                <div class="country-card" style="background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid var(--nba-orange, #f57c00); display: flex; align-items: center; gap: 10px;">
                        ${getFlag(country)} ${country.toUpperCase()}
                    </h3>
                    
                    <div class="leagues-list">
                        ${countryLeagues.map(league => `
                            <div class="league-item" style="padding: 10px 0; border-bottom: 1px solid #eee;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="font-weight: bold; color: #333;">${league.sub_level}</span> 
                                        <span style="font-size: 0.9em; color: #666;">${league.name.replace(country, '').trim()}</span>
                                    </div>
                                    <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 10px; font-size: 0.8em; font-weight: bold;">
                                        ${league.teams[0].count} / 20 DRUŻYN
                                    </span>
                                </div>
                                <div style="font-size: 0.75em; color: #888; margin-top: 4px;">
                                    System: 10 EAST / 10 WEST
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn-manage" style="width: 100%; margin-top: 15px; padding: 8px; border: 1px solid #ccc; border-radius: 6px; background: #fdfdfd; cursor: pointer; transition: 0.2s;" 
                            onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fdfdfd'"
                            onclick="alert('Zarządzanie drużynami ${country} w przygotowaniu')">
                        ZARZĄDZAJ KLUBAMI
                    </button>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

// Funkcja pomocnicza dla flag
function getFlag(country) {
    const flags = { 
        "Poland": "🇵🇱", "USA": "🇺🇸", "Spain": "🇪🇸", "France": "🇫🇷", "Germany": "🇩🇪", 
        "Italy": "🇮🇹", "Greece": "🇬🇷", "Lithuania": "🇱🇹", "Serbia": "🇷🇸", "Belgium": "🇧🇪" 
    };
    return flags[country] || "🏳️";
}

// Globalna funkcja powrotu
window.hideLeagueSettings = () => {
    document.getElementById('admin-league-config-container').style.display = 'none';
    const mainView = document.getElementById('admin-main-view');
    if (mainView) mainView.style.display = 'block';
};
