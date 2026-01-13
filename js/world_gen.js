// Kontener: Generator Świata i Populacji Zawodników
async function initWorld() {
    const confirmed = confirm("Czy na pewno chcesz wygenerować ligę i 60 nowych zawodników? Obecne dane (jeśli są) mogą zostać nadpisane.");
    if(!confirmed) return;

    // Definicja startowych drużyn
    const startingTeams = [
        { name: "Warsaw Eagles", city: "Warszawa" },
        { name: "Cracow Bulls", city: "Kraków" },
        { name: "Wrocław Sharks", city: "Wrocław" },
        { name: "Poznań Stars", city: "Poznań" },
        { name: "Gdańsk Sailors", city: "Gdańsk" }
    ];

    console.log("Rozpoczynam generowanie świata...");

    for (const t of startingTeams) {
        // 1. Dodaj drużynę do bazy
        const { data: teamData, error: tError } = await _supabase.from('teams').insert([{
            team_name: t.name,
            country: "Polska",
            balance: 1000000
        }]).select();

        if (tError) {
            console.error("Błąd przy tworzeniu drużyny:", tError);
            continue;
        }

        const teamId = teamData[0].id;

        // 2. Wygeneruj 12 zawodników dla tej drużyny
        for (let i = 0; i < 12; i++) {
            const newPlayer = generatePlayer(teamId);
            await _supabase.from('players').insert([newPlayer]);
        }
    }

    alert("Świat wygenerowany pomyślnie! Zawodnicy otrzymali unikalne profile i twarze.");
    location.reload();
}

function generatePlayer(teamId) {
    const names = ["Adam", "Piotr", "Marek", "Jan", "Kamil", "Łukasz", "Michał", "Robert", "Tomek", "Krzysztof"];
    const surnames = ["Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Lewandowski", "Zieliński"];
    
    const fullName = names[Math.floor(Math.random()*names.length)] + " " + surnames[Math.floor(Math.random()*surnames.length)];
    
    // GENERATOR AWATARA (DiceBear)
    // Tworzymy unikalny "seed" na podstawie nazwiska i losowej liczby
    const avatarSeed = fullName.replace(/\s/g, '') + Math.floor(Math.random()*1000);
    // Używamy stylu 'avataaars' - bardzo zbliżony do klimatu BuzzerBeatera
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    return {
        team_id: teamId,
        name: fullName,
        age: 18 + Math.floor(Math.random() * 15),
        height: 180 + Math.floor(Math.random() * 40),
        avatar_url: avatarUrl, // Link do wygenerowanej twarzy
        // Atrybuty (skala 1-20 jak w BB)
        jump_shot: 3 + Math.floor(Math.random() * 7),
        jump_range: 3 + Math.floor(Math.random() * 7),
        outside_defense: 3 + Math.floor(Math.random() * 7),
        handling: 3 + Math.floor(Math.random() * 7),
        driving: 3 + Math.floor(Math.random() * 7),
        passing: 3 + Math.floor(Math.random() * 7),
        inside_shot: 3 + Math.floor(Math.random() * 7),
        inside_defense: 3 + Math.floor(Math.random() * 7),
        rebounding: 3 + Math.floor(Math.random() * 7),
        shot_blocking: 3 + Math.floor(Math.random() * 7),
        stamina: 5,
        free_throw: 5
    };
}
