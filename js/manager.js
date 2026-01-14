// js/manager.js

/**
 * Główna zmienna przechowująca dane klubu zalogowanego managera
 */
let currentManagerTeam = null;

/**
 * Funkcja inicjująca dane managera po zalogowaniu
 */
async function initManagerData() {
    console.log("Inicjalizacja danych managera...");
    
    // Pobieramy użytkownika (poprawiona metoda Supabase v2)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
        console.error("Brak zalogowanego użytkownika.");
        return;
    }

    // 1. Szukamy zespołu przypisanego do owner_id
    let { data: team, error: fetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

    // 2. Jeśli nie znaleziono zespołu, tworzymy go automatycznie (aby uniknąć pustego widoku)
    if (!team) {
        console.log("Manager nie ma zespołu. Tworzenie nowego klubu...");
        const { data: newTeam, error: createError } = await supabase
            .from('teams')
            .insert([{
                owner_id: user.id,
                team_name: `Klub ${user.email.split('@')[0]}`,
                balance: 1000000,
                league_name: 'PLK'
            }])
            .select()
            .single();

        if (createError) {
            console.error("Błąd tworzenia zespołu:", createError);
            return;
        }
        team = newTeam;
    }

    currentManagerTeam = team;
    console.log("Aktywny zespół managera:", currentManagerTeam.team_name);
    
    // Aktualizacja nazwy w UI
    const teamTitle = document.getElementById('team-name-display');
    if (teamTitle) teamTitle.innerText = team.team_name;
}

/**
 * 1. ZAKŁADKA: ZAWODNICY (ROSTER)
 */
async function renderRoster() {
    if (!currentManagerTeam) await initManagerData();
    if (!currentManagerTeam) return;

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

    if (!players || players.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; border: 2px dashed #ccc; border-radius: 10px;">
                <p style="font-size: 1.2rem; color: #666;">Twój skład jest obecnie pusty.</p>
                <p>Przejdź do zakładki <strong>RYNEK</strong> lub czekaj na <strong>DRAFT</strong>, aby pozyskać graczy.</p>
            </div>`;
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
 * 2. ZAKŁADKA: RYNEK TRANSFEROWY
 */
async function renderTransferMarket() {
    if (!currentManagerTeam) await initManagerData();
    if (!currentManagerTeam) return;
    
    const container = document.getElementById('transfer-market-container');
    container.innerHTML = "<p>Przeszukiwanie rynku...</p>";

    const { data: players, error } = await supabase
        .from('players')
        .select(`*, teams (team_name)`)
        .order('overall_rating', { ascending: false })
        .limit(50);

    if (error) return container.innerHTML = "<p>Błąd pobierania rynku.</p>";

    let html = `
        <div style="margin-bottom: 15px; background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 5px solid #2196f3;">
            <strong style="font-size: 1.1rem;">Twój budżet: ${currentManagerTeam.balance.toLocaleString()} $</strong>
        </div>
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Gracz</th>
                    <th>OVR</th>
                    <th>Obecny Klub</th>
                    <th>Cena</th>
                    <th>Akcja</th>
                </tr>
            </thead>
            <tbody>
                ${players.map(p => {
                    const isMyPlayer = p.team_id === currentManagerTeam.id;
                    const price = p.price || (p.overall_rating * 15000); 
                    
                    return `
                    <tr>
                        <td>${p.first_name} ${p.last_name} (${p.position})</td>
                        <td>${p.overall_rating}</td>
                        <td>${p.teams ? p.teams.team_name : '<span style="color:gray">Wolny Agent</span>'}</td>
                        <td>${price.toLocaleString()} $</td>
                        <td>
                            ${isMyPlayer ? 
                                '<button class="btn" disabled style="background:#ccc; cursor:default">TWÓJ GRACZ</button>' : 
                                `<button class="btn" style="background:#2e7d32" onclick="processTransfer('${p.id}', ${price})">KUP</button>`
                            }
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

/**
 * LOGIKA ZAKUPU ZAWODNIKA
 */
async function processTransfer(playerId, price) {
    if (currentManagerTeam.balance < price) {
        alert("Błąd: Nie masz wystarczających środków!");
        return;
    }

    if (!confirm(`Czy chcesz wydać ${price.toLocaleString()} $ na tego zawodnika?`)) return;

    // 1. Odejmij balans
    const newBalance = currentManagerTeam.balance - price;
    const { error: teamErr } = await supabase
        .from('teams')
        .update({ balance: newBalance })
        .eq('id', currentManagerTeam.id);

    if (teamErr) return alert("Błąd płatności.");

    // 2. Zmień team_id zawodnika
    const { error: playerErr } = await supabase
        .from('players')
        .update({ team_id: currentManagerTeam.id })
        .eq('id', playerId);

    if (playerErr) return alert("Błąd transferu zawodnika.");

    // 3. Sukces
    currentManagerTeam.balance = newBalance;
    alert("Gratulacje! Zawodnik podpisał kontrakt.");
    renderTransferMarket();
}

/**
 * 3. ZAKŁADKA: FINANSE
 */
async function renderFinances() {
    if (!currentManagerTeam) await initManagerData();
    if (!currentManagerTeam) return;

    const container = document.getElementById('finances-container');
    
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
                <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">Wkrótce...</p>
                <small>Suma pensji zawodników i personelu</small>
            </div>
        </div>
    `;
}

/**
 * 4. ZAKŁADKA: DRAFT (WIDOK DLA MANAGERA)
 */
async function renderDraftBoard() {
    const container = document.getElementById('draft-board-container');
    container.innerHTML = "<p>Ładowanie kolejności draftu...</p>";

    const { data: picks, error } = await supabase
        .from('draft_picks')
        .select(`pick_number, teams (team_name)`)
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
                        <strong>#${p.pick_number}</strong> ${p.teams ? p.teams.team_name : 'Brak'}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    container.innerHTML = html;
}
