// js/admin/admin_player_profile.js

export function renderPlayerProfile(p) {
    const profileContainer = document.getElementById('player-profile-view');
    const mainView = document.getElementById('admin-main-view');
    
    mainView.style.display = 'none';
    profileContainer.style.display = 'block';

    const mainSkills = [
        { key: "jump_shot", label: "JS" }, { key: "jump_range", label: "JR" },
        { key: "outside_defense", label: "OD" }, { key: "handling", label: "HA" },
        { key: "driving", label: "DR" }, { key: "passing", label: "PA" },
        { key: "inside_shot", label: "IS" }, { key: "inside_defense", label: "ID" },
        { key: "rebounding", label: "RE" }, { key: "shot_blocking", label: "BL" }
    ];

    const physicalSkills = [
        { key: "stamina", label: "ST" }, { key: "free_throw", label: "FT" }
    ];

    const salaryFormatted = (p.salary || 0).toLocaleString('pl-PL') + " $";
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Zawodnik ${p.id.substring(0,5)}`;

    profileContainer.innerHTML = `
        <button class="btn-back" onclick="hidePlayerProfile()" style="margin-bottom:20px;">← POWRÓT DO BAZY</button>

        <div class="modern-profile-card">
            <div class="profile-main-info">
                <div class="avatar-column">
                    <img src="${p.avatar_url || generateMaleAvatar(p.id)}" id="main-profile-img" class="player-img-pro">
                    <button class="btn-edit-avatar-new" onclick="openAvatarEditor('${p.id}')">⚙️ EDYTUJ WYGLĄD</button>
                </div>
                
                <div class="bio-container">
                    <h1 class="player-title">${getFlagEmoji(p.country)} ${fullName}</h1>
                    <div class="bio-grid-modern">
                        <div class="bio-item"><strong>KLUB</strong><span>${p.teams ? `<a href="#" class="team-link">${p.teams.team_name}</a>` : 'Wolny Agent'}</span></div>
                        <div class="bio-item"><strong>POZYCJA</strong><span>${p.position || 'N/A'}</span></div>
                        <div class="bio-item"><strong>WIEK</strong><span>${p.age} lat</span></div>
                        <div class="bio-item"><strong>WZROST</strong><span>${p.height || 200} cm</span></div>
                        <div class="bio-item"><strong>PENSJA</strong><span>${salaryFormatted}</span></div>
                        <div class="bio-item"><strong>DRAFT</strong><span>${p.draft_pick ? `#${p.draft_pick} (${p.draft_year})` : 'Niedraftowany'}</span></div>
                    </div>
                    
                    <div class="potential-section">
                        <div class="pot-header"><span>POTENCJAŁ</span><span>Tier ${p.potential_id || 1}/10</span></div>
                        <div class="pot-bar-wrapper"><div class="pot-bar-fill" style="width: ${(p.potential_id/10)*100}%"></div></div>
                    </div>
                </div>
            </div>

            <div class="skills-section">
                <h2 class="skills-title">UMIEJĘTNOŚCI</h2>
                <div class="skills-split-view">
                    <div class="skill-column">${mainSkills.slice(0, 5).map(s => renderSkillBar(s, p)).join('')}</div>
                    <div class="skill-column">${mainSkills.slice(5, 10).map(s => renderSkillBar(s, p)).join('')}</div>
                </div>
                <div class="skills-physical-row">
                    ${physicalSkills.map(s => renderSkillBar(s, p)).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderSkillBar(s, p) {
    const val = p[s.key] || 0;
    return `
        <div class="skill-row-new">
            <span class="s-label">${s.label}</span>
            <div class="s-bar-bg"><div class="s-bar-fill" style="width:${(val/20)*100}%"></div></div>
            <span class="s-value">${val}</span>
        </div>`;
}

function getFlagEmoji(country) {
    const flags = { "Poland": "🇵🇱", "USA": "🇺🇸", "Spain": "🇪🇸" };
    return flags[country] || "🏳️";
}
