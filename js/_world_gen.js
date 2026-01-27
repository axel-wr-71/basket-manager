// js/world_gen.js

async function initWorld() {
    const confirmed = confirm(currentLang === 'pl' 
        ? "Czy na pewno chcesz zresetować świat? Zostaną utworzone nowe drużyny we wszystkich krajach." 
        : "Are you sure you want to reset the world?");
    
    if (!confirmed) return;

    try {
        console.log("Pobieranie definicji lig...");
        const { data: leagues, error: leagueError } = await supabase
            .from('leagues')
            .select('*');

        if (leagueError) throw leagueError;

        console.log("Generowanie drużyn...");

        for (const league of leagues) {
            const teamsToInsert = [];
            for (let i = 1; i <= 12; i++) {
                teamsToInsert.push({
                    team_name: `Klub ${league.country_name} #${i}`,
                    country: league.country_name, // Dopasowane do Twojej kolumny 'country'
                    league_name: league.league_name, // Dopasowane do Twojej kolumny 'league_name'
                    balance: 1000000, // Twoja kolumna int8
                    wins: 0,
                    losses: 0,
                    owner_id: null
                });
            }
            
            const { error: teamError } = await supabase.from('teams').insert(teamsToInsert);
            if (teamError) console.error(`Błąd w ${league.country_name}:`, teamError);
        }

        await generateDraftPool();
        alert("Świat wygenerowany pomyślnie!");

    } catch (err) {
        console.error("Błąd:", err);
        alert("Wystąpił błąd: " + err.message);
    }
}

// Reszta funkcji (generateDraftPool, generatePlayer, etc.) pozostaje bez zmian jak w poprzedniej wiadomości.
// Pamiętaj tylko, by w generatePlayer używać właściwych nazw pól (first_name, last_name, overall_rating).
