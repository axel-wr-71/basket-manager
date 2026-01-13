// js/draft.js

/**
 * 1. LOGIKA LOTERII (NBA STYLE)
 * Funkcja losuje kolejność drużyn na podstawie bilansu i wag
 */
async function runLeagueLottery(leagueId) {
    // 1. Pobierz zespoły z danej ligi
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

    // 2. Sortuj od najgorszego bilansu (najmniej wygranych na górze)
    const sortedTeams = teams.sort((a, b) => (a.wins - a.losses) - (b.wins - b.losses));

    // 3. Przypisz szanse (losy) - Top 14 najgorszych drużyn bierze udział w loterii
    const weights = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];
    let lotteryPool = [];

    sortedTeams.forEach((team, index) => {
        let tickets = weights[index] || 1; 
        for (let i = 0; i < tickets; i++) {
            lotteryPool.push({ id: team.id, name: team.team_name });
        }
    });

    // 4. Losujemy TOP 4 (kolejność picków 1-4)
    let finalOrder = [];
    for (let i = 0; i < 4; i++) {
        if (lotteryPool.length === 0) break;
        const winnerIndex = Math.floor(Math.random() * lotteryPool.length);
        const winner = lotteryPool[winnerIndex];
        finalOrder.push(winner);
        // Usuwamy wszystkie losy wygranego zespołu z puli
        lotteryPool = lotteryPool.filter(t => t.id !== winner.id);
    }

    // 5. Reszta (miejsca 5-20) idzie tradycyjnie wg bilansu
    sortedTeams.forEach(team => {
        if (!finalOrder.find(t => t.id === team.id)) {
            finalOrder.push({ id: team.id, name: team.team_name });
        }
    });

    return finalOrder; 
}

/**
 * 2. SKRYPT PREZENTACJI (STUDIO)
 * Zarządza interfejsem "kopert" i animacją
 */
let currentDraftOrder = [];
let revealIndex = 0;

async function startLotteryShow() {
    const screen = document.getElementById('draft-lottery-screen');
    const resultsContainer = document.getElementById('lottery-results');
    
    if (!screen || !resultsContainer) return;

    // Pokaż ekran studia
    screen.style.display = 'block';
    resultsContainer.innerHTML = '<p style="grid-column: 1/-1">Maszyna losująca startuje...</p>';
    
    // Uruchomienie Twojej logiki (domyślnie dla ligi 'PLK')
    currentDraftOrder = await runLeagueLottery('PLK'); 
    
    if (currentDraftOrder.length === 0) {
        resultsContainer.innerHTML = '<p style="color:red">Błąd: Nie znaleziono drużyn w lidze PLK!</p>';
        return;
    }

    // Resetowanie widoku kopert
    resultsContainer.innerHTML = '';
    // Zaczynamy od końca (Pick #20), żeby budować napięcie do #1
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

// Funkcja wywoływana przez przycisk w index.html
function revealNextPick() {
    if (revealIndex < 0) {
        document.getElementById('lottery-status').innerText = "Kolejność Draftu została ustalona!";
        alert("Loteria zakończona!");
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

        // Budowanie napięcia przed Top 4
        if (revealIndex === 4) {
            document.getElementById('lottery-status').innerText = "Zaraz poznamy TOP 4 Loterii!";
            document.getElementById('lottery-status').style.color = "#ff6d00";
        } else {
            document.getElementById('lottery-status').innerText = `Odkryto: ${team.name}`;
        }
    }

    revealIndex--;
}

// Inicjalizacja przycisków
document.addEventListener('DOMContentLoaded', () => {
    const nextBtn = document.getElementById('next-pick-btn');
    if (nextBtn) {
        nextBtn.onclick = revealNextPick;
    }
});
