// js/admin/admin_player_profile.js

export function renderPlayerProfile(p) {
    const profileContainer = document.getElementById('player-profile-view');
    const mainView = document.getElementById('admin-main-view');
    
    mainView.style.display = 'none';
    profileContainer.style.display = 'block';

    const skills = [
        { key: "jump_shot", label: "RzW" }, { key: "jump_range", label: "ZR" },
        { key: "outside_defense", label: "ObO" }, { key: "handling", label: "Koz" },
        { key: "driving", label: "1/1" }, { key: "passing", label: "Pod" },
        { key: "inside_shot", label: "RzB" }, { key: "inside_defense", label: "ObK" },
        { key: "rebounding", label: "Zb" }, { key: "shot_blocking", label: "Blk" },
        { key: "stamina", label: "Kon" }, { key: "free_throw", label: "RzO" }
    ];

    // Nowoczesna prezentacja potencjału (Paski/Baterie)
    const potentialStars = '⭐'.repeat(p.potential_id || 1);
    const salary = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'USD' }).format(p.salary || 0);

    profileContainer.innerHTML = `
        <div class="profile-header-nav">
            <button class="btn btn-secondary" onclick="hidePlayerProfile()">← POWRÓT DO LISTY</button>
            <div class="admin-actions">
                <button class="btn btn-admin" onclick="openAvatarEditor('${p.id}')">EDYTUJ AVATAR</button>
            </div>
        </div>

        <div class="modern-profile-card">
            <div class="profile-main-info">
                <div class="avatar-container" id="player-avatar-${p.id}">
                    <img src="${p.avatar_url || generateMaleAvatar(p.id)}" class="player-img-pro">
                </div>
                <div class="bio-container">
                    <h1>${p.first_name} ${p.last_name}</h1>
                    <div class="bio-grid">
                        <span><strong>Klub:</strong> ${p.teams?.team_name || 'Wolny Agent'}</span>
                        <span><strong>Wiek:</strong> ${p.age} lat</span>
                        <span><strong>Wzrost:</strong> ${p.height} cm</span>
                        <span><strong>Pensja:</strong> ${salary}</span>
                        <span><strong>Draft:</strong> ${p.draft_pick ? `#${p.draft_pick} (${p.draft_year})` : 'Niedraftowany'}</span>
                    </div>
                    <div class="potential-badge">
                        POTENCJAŁ: <span class="stars">${potentialStars}</span> 
                        <small>(Tier ${p.potential_id})</small>
                    </div>
                </div>
            </div>

            <div class="skills-section">
                <div class="skills-grid">
                    ${skills.map(s => `
                        <div class="skill-item">
                            <span class="skill-label">${s.label}</span>
                            <div class="skill-bar-bg">
                                <div class="skill-bar-fill" style="width: ${(p[s.key]/20)*100}%"></div>
                            </div>
                            <span class="skill-value">${p[s.key]}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="chart-container-modern">
                    <canvas id="playerChart"></canvas>
                </div>
            </div>
        </div>
    `;

    initChart(p, skills);
}

function generateMaleAvatar(id) {
    // Generowanie bardziej profesjonalnego, męskiego awatara (DiceBear Avataaars z parametrami)
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}&topProbability=100&accessoriesProbability=10&facialHairProbability=40&clothingColor=2555ff&skinColor=edb98a,f8d25c&top=shortHair,shaggy,shaggyMullet,frizzle,dreads`;
}

function initChart(p, skills) {
    // Tutaj można zaimplementować prosty wykres Canvas (wycentrowany i mniejszy)
    // Na potrzeby MVP użyjemy stylizowanych divów w CSS, aby uniknąć ciężkich bibliotek
}

window.openAvatarEditor = (playerId) => {
    alert("Otwieranie edytora awatara dla: " + playerId + ". System pozwoli na wybór koloru skóry, włosów i zarostu.");
};
