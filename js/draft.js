// js/draft.js

/**
 * 1. LOGIKA LOTERII (NBA STYLE)
 * Funkcja losuje kolejność drużyn na podstawie bilansu i wag
 */
async function runLeagueLottery(leagueId) {
    const { data: teams, error } = await _supabase
        .from('teams')
        .select('*')
        .eq('league_name', leagueId);

    if (error) {
        console.error("Błąd pobierania drużyn:", error);
        return [];
    }

    if (!teams || teams.length === 0) {
        console.warn("Brak drużyn w lidze:", leagueId);
        return [];
    }

    // Sortowanie: najmniej wygranych na górze
    const sortedTeams = teams.sort((a, b) => (a.wins - a.losses) - (b.wins - b.losses));

    // Wagi szans dla Top 14
    const weights = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];
    let lotteryPool = [];

    sortedTeams.forEach((team, index) => {
        let tickets = weights[index] || 1; 
        for (let i = 0; i < tickets; i++) {
            lotteryPool.push({ id: team.id, name: team.team_name });
        }
    });

    // Losowanie TOP 4
    let finalOrder = [];
    for (let i = 0; i < 4; i++) {
        if (lotteryPool.length === 0) break;
        const winnerIndex = Math.floor(Math.random() * lotteryPool.length);
        const winner = lotteryPool[winnerIndex];
        finalOrder.push(winner);
        lotteryPool = lotteryPool.filter(t => t.id !== winner.id);
    }

    // Reszta miejsc wg bilansu
    sortedTeams.forEach(team => {
        if (!finalOrder.find(t => t.id === team.id)) {
            finalOrder.push({ id: team.id, name: team.team_name });
        }
    });

    return finalOrder; 
}

/**
 * 2. SKRYPT PREZENTACJI (STUDIO)
 */
let currentDraftOrder = [];
let revealIndex = 0;

async function startLotteryShow() {
    const screen = document.getElementById('draft-lottery-screen');
    const resultsContainer = document.getElementById('lottery-results');
    
    if (!screen || !resultsContainer) return;

    screen.style.display = 'block';
    resultsContainer.innerHTML = '<p style="grid-column: 1/-1">Maszyna losująca startuje...</p>';
    
    currentDraftOrder = await runLeagueLottery('PLK'); 
    
    if (currentDraftOrder.length === 0) {
        resultsContainer.innerHTML = '<p style="color:red">Błąd: Nie znaleziono drużyn w lidze PLK!</p>';
        return;
    }

    resultsContainer.innerHTML = '';
    revealIndex = currentDraftOrder.length - 1; 

    currentDraftOrder.forEach((_, i) => {
        resultsContainer.innerHTML += `
            <div id="env-${i}" class="envelope">
                <span style="font-size: 0.8rem; opacity: 0.6;">PICK</span><br>
                #${i + 1}
            </div>`;
    });

    document.getElementById('lottery-status').innerText = "Wszystkie koperty przygotowane. Zaczynamy odkrywanie od końca!";
    document.getElementById('lottery-status').style.color = "white";
}

function revealNextPick() {
    if (revealIndex < 0) {
        document.getElementById('lottery-status').innerText = "Kolejność Draftu została ustalona!";
        // Po zakończeniu pokazujemy przycisk zapisu (możesz go dodać w HTML)
        if(!document.getElementById('save-draft-btn')) {
            const saveBtn = document.createElement('button');
            saveBtn.id = 'save-draft-btn';
            saveBtn.className = 'btn';
            saveBtn.style.backgroundColor = '#2e7d32';
            saveBtn.innerText = 'ZAPISZ WYNIKI W BAZIE';
            saveBtn.onclick = finalizeDraftInDB;
            document.querySelector('.lottery-container').appendChild(saveBtn);
        }
        return;
    }

    const team = currentDraftOrder[revealIndex];
    const env = document.getElementById(`env-${revealIndex}`);
    
    if (env) {
        env.classList.add('revealed');
        env.innerHTML = `
            <span style="font-size: 10px; color: #e65100;">PICK #${revealIndex + 1}</span><br>
            <div style="font-weight: bold; font-size: 14px;">${team.name}</div>
        `;

        if (revealIndex === 4) {
            document.getElementById('lottery-status').innerText = "Zaraz poznamy TOP 4 Loterii!";
            document.getElementById('lottery-status').style.color = "#ff6d00";
        } else {
            document.getElementById('lottery-status').innerText = `Odkryto: ${team.name}`;
        }
    }
    revealIndex--;
}

/**
 * 3. ZAPIS WYNIKÓW DO BAZY
 */
async function finalizeDraftInDB() {
    if (currentDraftOrder.length === 0) return;

    const confirmed = confirm("Czy zapisać tę kolejność w bazie danych?");
    if (!confirmed) return;

    const picksToInsert = currentDraftOrder.map((team, index) => ({
        league_name: 'PLK',
        season: 1,
        pick_number: index + 1,
        current_owner_id: team.id,
        original_owner_id: team.id
    }));

    const { error } = await _supabase.from('draft_picks').insert(picksToInsert);
    
    if (error) {
        alert("Błąd zapisu: " + error.message);
    } else {
        alert("Kolejność została pomyślnie zapisana!");
        document.getElementById('draft-lottery-screen').style.display = 'none';
    }
}

/**
 * 4. TRANSFER ZAWODNIKA ZA PIENIĄDZE
 * Obsługuje zakup zawodnika: sprawdza balans, odejmuje środki i zmienia klub
 */
async function buyPlayer(playerId, buyerTeamId, price) {
    // 1. Pobierz dane kupującego (balans) i zawodnika (obecny klub)
    const { data: buyerTeam } = await _supabase.from('teams').select('balance').eq('id', buyerTeamId).single();
    const { data: player } = await _supabase.from('players').select('team_id').eq('id', playerId).single();

    if (!buyerTeam || buyerTeam.balance < price) {
        alert("Błąd: Klub nie ma wystarczających funduszy na ten transfer!");
        return;
    }

    const sellerTeamId = player.team_id;

    // 2. Aktualizacja balansu kupującego
    await _supabase.from('teams').update({ balance: buyerTeam.balance - price }).eq('id', buyerTeamId);

    // 3. Jeśli zawodnik miał klub, dodaj pieniądze sprzedającemu
    if (sellerTeamId) {
        const { data: sellerTeam } = await _supabase.from('teams').select('balance').eq('id', sellerTeamId).single();
        if (sellerTeam) {
            await _supabase.from('teams').update({ balance: sellerTeam.balance + price }).eq('id', sellerTeamId);
        }
    }

    // 4. Zmiana przynależności zawodnika
    const { error } = await _supabase.from('players').update({ team_id: buyerTeamId }).eq('id', playerId);

    if (error) {
        alert("Błąd transferu: " + error.message);
    } else {
        alert("Transfer sfinalizowany pomyślnie!");
        if(typeof fetchRoster === "function") fetchRoster(); // Odśwież skład jeśli funkcja istnieje
    }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
    const nextBtn = document.getElementById('next-pick-btn');
    if (nextBtn) {
        nextBtn.onclick = revealNextPick;
    }
});
