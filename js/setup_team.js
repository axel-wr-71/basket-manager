async function checkUserTeam() {
    const user = (await _supabase.auth.getUser()).data.user;
    if (!user) return;

    // Szukamy drużyny przypisanej do ID zalogowanego managera
    const { data: team, error } = await _supabase
        .from('teams')
        .select('*')
        .eq('manager_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 to błąd "nie znaleziono"
        console.error("Błąd sprawdzania drużyny:", error);
        return;
    }

    if (!team) {
        showTeamCreationForm();
    } else {
        // Jeśli ma drużynę, ładujemy roster
        loadRoster(team.id);
    }
}

function showTeamCreationForm() {
    const container = document.getElementById('main-content');
    container.innerHTML = `
        <div class="auth-card" style="max-width: 500px;">
            <h2 data-i18n="create_team_header">Witaj Trenerze! Nazwij swój klub</h2>
            <input type="text" id="new-team-name" placeholder="Nazwa drużyny (np. Warsaw Kings)">
            <select id="new-team-country">
                <option value="Poland">Polska 🇵🇱</option>
                <option value="USA">USA 🇺🇸</option>
            </select>
            <button class="btn" onclick="createNewTeam()" data-i18n="btn_start_career">ROZPOCZNIJ KARIERĘ</button>
        </div>
    `;
    applyTranslations();
}

async function createNewTeam() {
    const user = (await _supabase.auth.getUser()).data.user;
    const teamName = document.getElementById('new-team-name').value;
    const country = document.getElementById('new-team-country').value;

    if (!teamName) return alert("Podaj nazwę drużyny!");

    // 1. Tworzymy drużynę w bazie
    const { data: team, error: teamError } = await _supabase
        .from('teams')
        .insert([{
            team_name: teamName,
            country: country,
            manager_id: user.id,
            balance: 500000
        }])
        .select()
        .single();

    if (teamError) return alert("Błąd: " + teamError.message);

    // 2. Draft: Pobieramy 12 wolnych zawodników (team_id is null)
    const { data: draftPlayers, error: fetchError } = await _supabase
        .from('players')
        .select('id')
        .is('team_id', null)
        .limit(12);

    if (fetchError || draftPlayers.length < 12) {
        return alert("Błąd: Brak zawodników w puli draftu! Admin musi najpierw wygenerować świat.");
    }

    // 3. Przypisujemy ich do nowej drużyny
    const playerIds = draftPlayers.map(p => p.id);
    const { error: updateError } = await _supabase
        .from('players')
        .update({ team_id: team.id })
        .in('id', playerIds);

    if (updateError) return alert("Błąd draftu: " + updateError.message);

    alert("Drużyna utworzona! Powodzenia w lidze.");
    location.reload();
}
