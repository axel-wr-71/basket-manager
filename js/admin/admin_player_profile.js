// js/admin/admin_player_profile.js

export function renderPlayerProfile(p) {
    const profileContainer = document.getElementById('player-profile-view');
    const mainView = document.getElementById('admin-main-view');
    
    mainView.style.display = 'none';
    profileContainer.style.display = 'block';

    // Definicja skrótów umiejętności
    const skills = [
        { key: "jump_shot", label: "RzW" }, { key: "jump_range", label: "ZR" },
        { key: "outside_defense", label: "ObO" }, { key: "handling", label: "Koz" },
        { key: "driving", label: "1/1" }, { key: "passing", label: "Pod" },
        { key: "inside_shot", label: "RzB" }, { key: "inside_defense", label: "ObK" },
        { key: "rebounding", label: "Zb" }, { key: "shot_blocking", label: "Blk" },
        { key: "stamina", label: "Kon" }, { key: "free_throw", label: "RzO" }
    ];

    const potentialLevel = p.potential_id || 1;
    const salary = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.salary || 0);
    const displayName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Zawodnik ${p.id.substring(0,5)}`;

    profileContainer.innerHTML = `
        <div class="profile-header-nav" style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;">
            <button class="btn-back" onclick="hidePlayerProfile()">← POWRÓT DO BAZY</button>
            <div class="admin-badge">TRYB ADMINISTRATORA</div>
        </div>

        <div class="modern-profile-card">
            <div class="profile-main-info" style="display:flex; gap:40px; margin-bottom:40px; flex-wrap: wrap;">
                <div class="avatar-wrapper">
                    <img src="${p.avatar_url || generateMaleAvatar(p.id)}" id="main-profile-img" class="player-img-pro">
                    <div class="pos-badge">${p.position || p.pos || 'N/A'}</div>
                    <button class="btn-edit-avatar" onclick="openAvatarEditor('${p.id}')">⚙️ EDYTUJ WYGLĄD</button>
                </div>
                
                <div class="bio-container" style="flex:1; min-width: 300px;">
                    <h1 style="margin:0 0 15px 0; font-size:32px; color: #1a237e;">${displayName}</h1>
                    <div class="bio-grid-modern">
                        <div class="bio-item"><strong>KLUB:</strong> <span>${p.teams?.team_name || 'Wolny Agent'}</span></div>
                        <div class="bio-item"><strong>WIEK:</strong> <span>${p.age} lat</span></div>
                        <div class="bio-item"><strong>WZROST:</strong> <span>${p.height || 201} cm</span></div>
                        <div class="bio-item"><strong>PENSJA:</strong> <span>${salary}</span></div>
                        <div class="bio-item"><strong>DRAFT:</strong> <span>${p.draft_pick ? `#${p.draft_pick} (${p.draft_year})` : 'Niedraftowany'}</span></div>
                        <div class="bio-item"><strong>ID:</strong> <span style="font-family: monospace; font-size: 11px;">${p.id}</span></div>
                    </div>
                    
                    <div class="potential-container-modern">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span class="pot-label">POTENCJAŁ ROZWOJOWY</span>
                            <span class="pot-value">Tier ${potentialLevel}/10</span>
                        </div>
                        <div class="pot-bar-wrapper">
                            <div class="pot-bar-fill" style="width: ${(potentialLevel/10)*100}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="skills-layout">
                <div class="skills-grid-clean">
                    ${skills.map(s => `
                        <div class="skill-row-new">
                            <span class="s-label">${s.label}</span>
                            <div class="s-bar-bg"><div class="s-bar-fill" style="width:${((p[s.key] || 0)/20)*100}%"></div></div>
                            <span class="s-value">${p[s.key] || 0}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="chart-box-modern">
                    <div class="radar-placeholder">
                        <div class="radar-circle"></div>
                        <div class="radar-label">ANALIZA CECH</div>
                    </div>
                </div>
            </div>
        </div>

        <div id="avatar-editor-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content">
                <h3>KREATOR WYGLĄDU</h3>
                <div class="editor-layout">
                    <div class="preview-side">
                        <img id="editor-preview" src="" class="player-img-pro">
                    </div>
                    <div class="controls-side">
                        <div class="control-group">
                            <label>Fryzura:</label>
                            <select id="edit-top" class="admin-input" onchange="updateAvatarPreview()">
                                <option value="shortHair">Krótkie klasyczne</option>
                                <option value="shaggy">Dłuższe nieład</option>
                                <option value="shaggyMullet">Styl retro (Mullet)</option>
                                <option value="dreads">Dredy</option>
                                <option value="frizzle">Kręcone</option>
                                <option value="sides">Wygalane boki</option>
                                <option value="noHair">Łysy</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label>Zarost:</label>
                            <select id="edit-beard" class="admin-input" onchange="updateAvatarPreview()">
                                <option value="0">Gładko ogolony</option>
                                <option value="20">Lekki zarost</option>
                                <option value="50">Średni zarost</option>
                                <option value="100">Pełna broda</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label>Kolor skóry:</label>
                            <select id="edit-skin" class="admin-input" onchange="updateAvatarPreview()">
                                <option value="edb98a">Jasna</option>
                                <option value="f8d25c">Oliwkowa</option>
                                <option value="ae5d29">Ciemna</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-save" onclick="saveAvatar('${p.id}')">ZAPISZ ZMIANY</button>
                    <button class="btn-cancel" onclick="closeAvatarEditor()">ANULUJ</button>
                </div>
            </div>
        </div>
    `;
}

function generateMaleAvatar(id) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}&top=shortHair&facialHairProbability=30&accessoriesProbability=0&clothingColor=1a237e`;
}

window.openAvatarEditor = (playerId) => {
    document.getElementById('avatar-editor-modal').style.display = 'flex';
    document.getElementById('editor-preview').src = document.getElementById('main-profile-img').src;
};

window.closeAvatarEditor = () => {
    document.getElementById('avatar-editor-modal').style.display = 'none';
};

window.updateAvatarPreview = () => {
    const top = document.getElementById('edit-top').value;
    const beard = document.getElementById('edit-beard').value;
    const skin = document.getElementById('edit-skin').value;
    const preview = document.getElementById('editor-preview');
    
    const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?top=${top}&facialHairProbability=${beard}&skinColor=${skin}&accessoriesProbability=0&clothingColor=1a237e`;
    preview.src = newUrl;
};

window.saveAvatar = async (playerId) => {
    const newUrl = document.getElementById('editor-preview').src;
    
    const { error } = await supabase
        .from('players')
        .update({ avatar_url: newUrl })
        .eq('id', playerId);

    if (error) {
        alert("Błąd zapisu: " + error.message);
    } else {
        document.getElementById('main-profile-img').src = newUrl;
        alert("Wygląd zawodnika został zaktualizowany!");
        closeAvatarEditor();
    }
};
