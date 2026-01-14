// js/manager.js

/**
 * Główna zmienna przechowująca dane klubu zalogowanego managera
 */
let currentManagerTeam = null;

/**
 * Funkcja inicjująca dane managera po zalogowaniu
 */
async function initManagerData() {
    const user = supabase.auth.user();
    if (!user) return;

    // Pobierz dane zespołu, gdzie owner_id zgadza się z ID zalogowanego usera
    const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .single();

    if (error || !team) {
        console.warn("Nie znaleziono przypisanego zespołu dla tego managera.");
        return;
    }

    currentManagerTeam = team;
    
    // Zaktualizuj nazwę zespołu w nagłówku
    const teamTitle = document.getElementById('team-name-display');
    if (teamTitle) teamTitle.innerText = team.team_name;
}

/**
 * 1. ZAKŁADKA: ZAWODNICY (ROSTER)
 */
async function renderRoster() {
    if (!currentManagerTeam) await initManagerData();
    
    const container = document.getElementById('roster-container');
    container.innerHTML = "<p>Pobieranie składu...</p>";

    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', currentManagerTeam.id)
        .order('overall_rating', { ascending: false });

    if (error) {
        container.innerHTML = "<p>Błąd ładowania składu.</p>";
        return;
    }

    if (players.length === 0) {
        container.innerHTML = "<p>Twój skład jest obecnie pusty. Czekaj na Draft!</p>";
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Poz.</th>
                    <th>Imię i Nazwisko</th>
                    <th>Wiek</th>
                    <th>OVR</th>
                    <th>Pensja</th>
                </tr>
            </thead>
            <tbody>
                ${players.map(p => `
                    <tr>
                        <td><strong>${p.position}</strong></td>
                        <td>${p.first_name} ${p.last_name}</td>
                        <td>${p.age}</td>
                        <td style="background: #f0f4c3; font-weight: bold; text-align: center;">${p.overall_rating}</td>
                        <td>${(p.salary || 50000).toLocaleString()} $</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

/**
 * 2. ZAKŁADKA: FINANSE
 */
async function renderFinances() {
    if (!currentManagerTeam) await initManagerData();

    const container = document.getElementById('finances-container');
    
    // Pobierz najświeższy balans bezpośrednio z bazy
    const { data: team } = await supabase
        .from('teams')
        .select('balance')
        .eq('id', currentManagerTeam.id)
        .single();

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; border: 2px solid #2e7d32;">
                <h4 style="margin:0; color: #1b5e20;">Dostępne środki</h4>
                <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${team.balance.toLocaleString()} $</p>
                <small>Budżet na transfery i pensje</small>
            </div>
            <div style="background: #fff3e0; padding: 20px; border-radius: 10px; border: 2px solid #ef6c00;">
                <h4 style="margin:0; color: #e65100;">Tygodniowe koszty</h4>
                <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">Obliczanie...</p>
                <small>Suma pensji zawodników i personelu</small>
            </div>
        </div>
    `;
}

/**
 * 3. ZAKŁADKA: DRAFT (WIDOK DLA MANAGERA)
 */
async function renderDraftBoard() {
    const container = document.getElementById('draft-board-container');
    container.innerHTML = "<p>Ładowanie kolejności draftu...</p>";

    const { data: picks, error } = await supabase
        .from('draft_picks')
        .select(`
            pick_number,
            teams!current_owner_id (team_name)
        `)
        .eq('league_name', 'PLK')
        .order('pick_number', { ascending: true });

    if (error || !picks || picks.length === 0) {
        container.innerHTML = "<p>Kolejność draftu nie została jeszcze ustalona przez Admina.</p>";
        return;
    }

    let html = `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <h4>Oficjalna Kolejność Draftu</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                ${picks.map(p => `
                    <div style="padding: 10px; background: white; border: 1px solid #ddd; border-left: 4px solid #1a237e;">
                        <strong>#${p.pick_number}</strong> ${p.teams.team_name}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    container.innerHTML = html;
}
