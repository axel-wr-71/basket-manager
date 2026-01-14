// js/world_gen.js

/**
 * SEKCJA: GENEROWANIE ŚWIATA
 * Tworzy strukturę: Ligi -> Drużyny -> Zawodnicy
 */
async function initWorld() {
    const confirmed = confirm(currentLang === 'pl' 
        ? "Czy na pewno chcesz zresetować świat? Zostaną utworzone nowe drużyny we wszystkich krajach." 
        : "Are you sure you want to reset the world? New teams will be created in all countries.");
    
    if (!confirmed) return;

    try {
        console.log("Pobieranie definicji lig...");
        // 1. Pobierz wszystkie ligi z tabeli leagues
        const { data: leagues, error: leagueError } = await supabase
            .from('leagues')
            .select('*');

        if (leagueError) throw leagueError;

        console.log(`Znaleziono ${leagues.length} lig. Generowanie drużyn...`);

        // 2. Dla każdej ligi wygeneruj 12 drużyn
        for (const league of leagues) {
            const teamsToInsert = [];
            for (let i = 1; i <= 12; i++) {
                teamsToInsert.push({
                    team_name: `Klub ${league.country_name} #${i} (${league.sub_tier})`,
                    country_name: league.country_name,
                    league_name: league.league_name,
                    league_id: league.id, // Zakładając, że masz kolumnę league_id w teams
                    balance: 1000000,
                    owner_id: null // Drużyny botów nie mają właściciela
                });
            }
            
            const { error: teamError } = await supabase.from('teams').insert(teamsToInsert);
            if (teamError) console.error(`Błąd tworzenia drużyn dla ${league.country_name}:`, teamError);
        }

        // 3. Generuj pulę zawodników do draftu
        await generateDraftPool();

        alert(currentLang === 'pl' 
            ? "Świat został pomyślnie wygenerowany!" 
            : "World successfully generated!");

    } catch (err) {
        console.error("Błąd krytyczny generowania świata:", err);
        alert("Błąd: " + err.message);
    }
}

/**
 * Generowanie puli zawodników (Draft Pool)
 */
async function generateDraftPool() {
    console.log("Generowanie zawodników do draftu...");

    const playersToInsert = [];
    for (let i = 0; i < 60; i++) {
        playersToInsert.push(generatePlayer(null)); // null = wolny agent (draft pool)
    }

    const { error } = await supabase.from('players').insert(playersToInsert);
    
    if (error) {
        console.error("Błąd zapisu graczy:", error);
    }
}

/**
 * Funkcja pomocnicza: Obliczanie pozycji na podstawie umiejętności
 */
function calculatePosition(s) {
    if (s.handling >= s.inside_defense + 3 && s.passing >= s.rebounding) return 'PG';
    if (s.jump_shot >= s.inside_shot + 2 && s.jump_range >= 6) return 'SG';
    if (s.rebounding >= s.jump_shot + 3 && s.inside_defense >= s.outside_defense) return 'C';
    if (s.inside_shot >= s.jump_range + 3 && s.rebounding >= 7) return 'PF';
    return 'SF';
}

/**
 * Funkcja pomocnicza: Losowanie potencjału (1-10)
 */
function drawPotential() {
    const rand = Math.random() * 100;
    if (rand > 99) return 10;
    if (rand > 96) return 9;
    if (rand > 91) return 8;
    if (rand > 84) return 7;
    if (rand > 74) return 6;
    if (rand > 60) return 5;
    if (rand > 45) return 4;
    if (rand > 25) return 3;
    if (rand > 10) return 2;
    return 1;
}

/**
 * Generuje pojedynczego zawodnika
 */
function generatePlayer(teamId) {
    const firstNames = ["Adam", "Piotr", "Marek", "Jan", "Kamil", "Michał", "Robert", "Lukas", "Mateo", "Marco", "Nikola", "Jonas"];
    const lastNames = ["Nowak", "Kowalski", "Zieliński", "Szymański", "Ivanov", "García", "Smith", "Müller", "Popović"];
    
    const fullName = firstNames[Math.floor(Math.random()*firstNames.length)] + " " + lastNames[Math.floor(Math.random()*lastNames.length)];
    const avatarSeed = Math.random().toString(36).substring(7);
    
    const skills = {
        jump_shot: 3 + Math.floor(Math.random() * 8),
        jump_range: 2 + Math.floor(Math.random() * 7),
        outside_defense: 3 + Math.floor(Math.random() * 7),
        handling: 3 + Math.floor(Math.random() * 8),
        driving: 3 + Math.floor(Math.random() * 7),
        passing: 3 + Math.floor(Math.random() * 7),
        inside_shot: 3 + Math.floor(Math.random() * 8),
        inside_defense: 3 + Math.floor(Math.random() * 8),
        rebounding: 3 + Math.floor(Math.random() * 8),
        shot_blocking: 2 + Math.floor(Math.random() * 7)
    };

    const position = calculatePosition(skills);
    const potential = drawPotential();

    return {
        team_id: teamId, 
        first_name: fullName.split(' ')[0],
        last_name: fullName.split(' ')[1],
        country: "Poland", // Można rozbudować o losowanie kraju
        age: 18 + Math.floor(Math.random() * 2),
        height: 185 + Math.floor(Math.random() * 30),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`,
        position: position,
        potential_id: potential,
        overall_rating: Math.floor(Object.values(skills).reduce((a, b) => a + b) / 10 * 10), // Prosty OVR
        ...skills,
        stamina: 5,
        free_throw: 5
    };
}

/**
 * MEDIA ADMINA (LOGO / HERO)
 */
function adminUpdateMedia() {
    const img1 = document.getElementById('hero-img-1-url')?.value;
    const img2 = document.getElementById('hero-img-2-url')?.value;
    const newLogo = document.getElementById('logo-url-input')?.value;

    const heroElements = document.querySelectorAll('.hero-img');
    const logoElement = document.getElementById('main-logo-img');

    if (img1 && heroElements[0]) {
        heroElements[0].src = img1;
        localStorage.setItem('ebl_hero_1', img1);
    }
    if (img2 && heroElements[1]) {
        heroElements[1].src = img2;
        localStorage.setItem('ebl_hero_2', img2);
    }
    if (newLogo && logoElement) {
        logoElement.src = newLogo;
        localStorage.setItem('ebl_logo', newLogo);
    }
    alert("Zaktualizowano media!");
}

function loadSavedMedia() {
    const saved1 = localStorage.getItem('ebl_hero_1');
    const saved2 = localStorage.getItem('ebl_hero_2');
    const savedLogo = localStorage.getItem('ebl_logo');
    
    const heroElements = document.querySelectorAll('.hero-img');
    const logoElement = document.getElementById('main-logo-img');
    
    if (saved1 && heroElements[0]) heroElements[0].src = saved1;
    if (saved2 && heroElements[1]) heroElements[1].src = saved2;
    if (savedLogo && logoElement) logoElement.src = savedLogo;
}

document.addEventListener('DOMContentLoaded', loadSavedMedia);
