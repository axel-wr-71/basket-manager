async function loadRoster(teamId) {
    const { data: players, error } = await _supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('id', { ascending: true });

    if (error) {
        console.error("Błąd ładowania składu:", error);
        return;
    }

    const container = document.getElementById('main-content');
    container.innerHTML = `
        <div class="roster-header">
            <h2 data-i18n="your_team">Twoja Drużyna</h2>
            <div class="team-stats-summary">
                <span>Total Players: ${players.length}</span>
            </div>
        </div>
        <div class="roster-grid" id="roster-grid"></div>
    `;
    
    const grid = document.getElementById('roster-grid');

    players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        // Dynamiczna flaga na podstawie kraju
        const flag = player.country === 'Poland' ? '🇵🇱' : '🇺🇸';

        card.innerHTML = `
            <div class="card-top">
                <img src="${player.avatar_url}" class="player-avatar" alt="Face">
                <div class="player-main-info">
                    <span class="player-name">${player.name} ${flag}</span>
                    <span class="player-meta">${player.age} yrs | ${player.height} cm</span>
                </div>
            </div>
            
            <div class="skills-grid">
                <div class="skill-item">
                    <label data-i18n="skill_js">JS</label>
                    <div class="skill-value ${getValueClass(player.jump_shot)}">${player.jump_shot}</div>
                </div>
                <div class="skill-item">
                    <label data-i18n="skill_jr">JR</label>
                    <div class="skill-value ${getValueClass(player.jump_range)}">${player.jump_range}</div>
                </div>
                <div class="skill-item">
                    <label data-i18n="skill_od">OD</label>
                    <div class="skill-value ${getValueClass(player.outside_defense)}">${player.outside_defense}</div>
                </div>
                <div class="skill-item">
                    <label data-i18n="skill_is">IS</label>
                    <div class="skill-value ${getValueClass(player.inside_shot)}">${player.inside_shot}</div>
                </div>
                <div class="skill-item">
                    <label data-i18n="skill_id">ID</label>
                    <div class="skill-value ${getValueClass(player.inside_defense)}">${player.inside_defense}</div>
                </div>
                <div class="skill-item">
                    <label data-i18n="skill_ps">PS</label>
                    <div class="skill-value ${getValueClass(player.passing)}">${player.passing}</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    applyTranslations();
}

// Funkcja kolorująca skille (1-20)
function getValueClass(val) {
    if (val >= 15) return 'skill-legendary'; // Złoty
    if (val >= 10) return 'skill-good';      // Zielony
    if (val >= 5) return 'skill-average';    // Pomarańczowy
    return 'skill-poor';                     // Szary
}
