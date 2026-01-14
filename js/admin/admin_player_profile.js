export function renderPlayerProfile(p) {
    const profileContainer = document.getElementById('player-profile-view');
    const mainView = document.getElementById('admin-main-view');
    
    if (!profileContainer || !mainView) return;

    mainView.style.display = 'none';
    profileContainer.style.display = 'block';

    // Kategorie umiejętności - Twoje polskie nazwy skrócone
    const mainSkills = [
        { key: "jump_shot", label: "RzW" }, { key: "jump_range", label: "ZR" },
        { key: "outside_defense", label: "ObO" }, { key: "handling", label: "Koz" },
        { key: "driving", label: "1/1" }, { key: "passing", label: "Pod" },
        { key: "inside_shot", label: "RzB" }, { key: "inside_defense", label: "ObK" },
        { key: "rebounding", label: "Zb" }, { key: "shot_blocking", label: "Blk" }
    ];

    const physicalSkills = [
        { key: "stamina", label: "Kon" }, { key: "free_throw", label: "RzO" }
    ];

    const potentialLevel = p.potential_id || 1;
    const salaryFormatted = (p.salary || 0).toLocaleString('pl-PL') + " $";
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Zawodnik ${p.id.substring(0,5)}`;

    // Logika klubu z linkiem
    const teamDisplay = p.teams 
        ? `<a href="#" onclick="alert('Widok klubu w budowie')" class="team-link">${p.teams.team_name}</a>` 
        : 'Wolny Agent';

    profileContainer.innerHTML = `
        <div class="profile-header-nav" style="margin-bottom: 20px;">
            <button class="btn-back" onclick="hidePlayerProfile()">← POWRÓT DO BAZY</button>
        </div>

        <div class="modern-profile-card">
            <div class="profile-main-info">
                <div class="avatar-column">
                    <div class="avatar-wrapper">
                        <img src="${p.avatar_url || generateMaleAvatar(p.id)}" id="main-profile-img" class="player-img-pro">
                    </div>
                    <button class="btn-edit-avatar-new" onclick="openAvatarEditor('${p.id}')">⚙️ EDYTUJ WYGLĄD</button>
                </div>
                
                <div class="bio-container">
                    <h1 class="player-title">
                        ${getFlagEmoji(p.country)} ${fullName}
                    </h1>
                    
                    <div class="bio-grid-modern">
                        <div class="bio-item"><strong>KLUB</strong><span>${teamDisplay}</span></div>
                        <div class="bio-item"><strong>POZYCJA</strong><span>${p.position || 'N/A'}</span></div>
                        <div class="bio-item"><strong>WIEK</strong><span>${p.age} lat</span></div>
                        <div class="bio-item"><strong>WZROST</strong><span>${p.height || 200} cm</span></div>
                        <div class="bio-item"><strong>PENSJA</strong><span>${salaryFormatted}</span></div>
                        <div class="bio-item"><strong>DRAFT</strong><span>${p.draft_pick ? `#${p.draft_pick} (${p.draft_year})` : 'Niedraftowany'}</span></div>
                    </div>
                    
                    <div class="potential-section">
                        <div class="pot-header">
                            <span>POTENCJAŁ</span>
                            <span>Tier ${potentialLevel}/10</span>
                        </div>
                        <div class="pot-bar-wrapper">
                            <div class="pot-bar-fill" style="width: ${(potentialLevel/10)*100}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="skills-container-new">
                <h2 class="skills-title">UMIEJĘTNOŚCI</h2>
                
                <div class="skills-split-view">
                    <div class="skill-column">
                        ${mainSkills.slice(0, 5).map(s => renderSkillBar(s, p)).join('')}
                    </div>
                    <div class="skill-column">
                        ${mainSkills.slice(5, 10).map(s => renderSkillBar(s, p)).join('')}
                    </div>
                </div>

                <div class="skills-physical-row">
                    ${physicalSkills.map(s => renderSkillBar(s, p)).join('')}
                </div>
            </div>
        </div>

        <div id="avatar-editor-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content">
                <h3>KREATOR WYGLĄDU</h3>
                <div class="editor-layout">
                    <div class="preview-side"><img id="editor-preview" src="" class="player-img-pro"></div>
                    <div class="controls-side">
                        <label>Fryzura:</label>
                        <select id="edit-top" class="admin-input" onchange="updateAvatarPreview()">
                            <option value="shortHair">Krótkie</option>
                            <option value="shaggy">Dłuższe</option>
                            <option value="dreads">Dredy</option>
                        </select>
                        <label>Zarost:</label>
                        <select id="edit-beard" class="admin-input" onchange="updateAvatarPreview()">
                            <option value="0">Brak</option>
                            <option value="50">Średni</option>
                            <option value="100">Pełna broda</option>
                        </select>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-save" onclick="saveAvatar('${p.id}')">ZAPISZ</button>
                    <button class="btn-cancel" onclick="closeAvatarEditor()">ANULUJ</button>
                </div>
            </div>
        </div>
    `;
}

function renderSkillBar(s, p) {
    const val = p[s.key] || 0;
    const percent = (val / 20) * 100;
    return `
        <div class="skill-row-new">
            <span class="s-label">${s.label}</span>
            <div class="s-bar-bg"><div class="s-bar-fill" style="width:${percent}%"></div></div>
            <span class="s-value">${val}</span>
        </div>
    `;
}

function getFlagEmoji(country) {
    const flags = { 
        "Poland": "🇵🇱", "USA": "🇺🇸", "Spain": "🇪🇸", 
        "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹" 
    };
    return flags[country] || "🏳️";
}

function generateMaleAvatar(id) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}&top=shortHair&facialHairProbability=30&clothingColor=1a237e`;
}

// Funkcje globalne do obsługi edytora i powrotu
window.hidePlayerProfile = () => {
    document.getElementById('player-profile-view').style.display = 'none';
    document.getElementById('admin-main-view').style.display = 'block';
};

window.openAvatarEditor = (id) => { 
    document.getElementById('avatar-editor-modal').style.display = 'flex'; 
    const currentImg = document.getElementById('main-profile-img').src;
    document.getElementById('editor-preview').src = currentImg;
};

window.closeAvatarEditor = () => { 
    document.getElementById('avatar-editor-modal').style.display = 'none'; 
};

window.updateAvatarPreview = () => {
    const top = document.getElementById('edit-top').value;
    const beard = document.getElementById('edit-beard').value;
    const seed = Math.random(); // Prosty sposób na odświeżenie podglądu
    document.getElementById('editor-preview').src = `https://api.dicebear.com/7.x/avataaars/svg?top=${top}&facialHairProbability=${beard}&clothingColor=1a237e`;
};

window.saveAvatar = async (id) => {
    const url = document.getElementById('editor-preview').src;
    // Zakładamy, że supabase jest dostępne globalnie
    const { error } = await supabase.from('players').update({ avatar_url: url }).eq('id', id);
    if (!error) { 
        document.getElementById('main-profile-img').src = url; 
        closeAvatarEditor(); 
        alert("Awatar zapisany pomyślnie!");
    } else {
        alert("Błąd zapisu: " + error.message);
    }
};
