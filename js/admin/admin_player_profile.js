// js/admin/admin_player_profile.js
import { supabaseClient } from '../auth.js';

// --- ALGORYTM GENEROWANIA TWARZY SVG (Styl Hattrick) ---
function generatePlayerSVG(config) {
    if (!config) config = { skin: 0, eyes: 0, nose: 0, mouth: 0, hair: 0, beard: 0 };
    
    const colors = ['#FFDBAC', '#F1C27D', '#E0AC69', '#8D5524', '#C68642', '#71492E', '#442E1F'];
    const skinColor = colors[config.skin] || colors[0];

    const eyesStyles = [
        '<circle cx="35" cy="45" r="3" fill="black"/><circle cx="65" cy="45" r="3" fill="black"/>', // Kropki
        '<ellipse cx="35" cy="45" rx="4" ry="2" fill="black"/><ellipse cx="65" cy="45" rx="4" ry="2" fill="black"/>', // Elipsy
        '<path d="M30 45 L40 45 M60 45 L70 45" stroke="black" stroke-width="2"/>', // Kreski
        '<path d="M30 46 Q35 40 40 46 M60 46 Q65 40 70 46" fill="none" stroke="black" stroke-width="2"/>' // Łuki
    ];

    const noseStyles = [
        '<path d="M50 45 L50 55 L45 55" fill="none" stroke="black" stroke-width="2"/>', // L-kształt
        '<path d="M48 55 Q50 60 52 55" fill="none" stroke="black" stroke-width="2"/>', // Mały
        '<path d="M47 50 Q50 40 53 50" fill="none" stroke="black" stroke-width="2"/>', // Garbaty
        '<circle cx="50" cy="55" r="2" fill="black"/>' // Kropka
    ];

    const mouthStyles = [
        '<path d="M40 70 Q50 80 60 70" fill="none" stroke="black" stroke-width="2"/>', // Uśmiech
        '<path d="M42 75 L58 75" fill="none" stroke="black" stroke-width="2"/>', // Płaskie
        '<path d="M45 75 Q50 70 55 75" fill="none" stroke="black" stroke-width="2"/>', // Smutny
        '<circle cx="50" cy="75" r="4" fill="none" stroke="black" stroke-width="2"/>' // Zdziwiony
    ];

    const hairStyles = [
        '', // Łysy
        '<path d="M20 40 Q50 5 80 40" fill="brown" stroke="black"/>', // Klasyczne
        '<path d="M20 35 Q50 -5 80 35 L80 45 Q50 15 20 45 Z" fill="black"/>', // Wysokie
        '<rect x="25" y="10" width="50" height="15" rx="5" fill="#552200"/>', // Jeżyk
        '<circle cx="50" cy="25" r="20" fill="#221100"/>' // Afro
    ];

    return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; border-radius:8px;">
            <rect width="100" height="100" fill="#f0f0f0"/>
            <path d="M25 40 Q25 15 50 15 Q75 15 75 40 L75 70 Q75 85 50 85 Q25 85 25 70 Z" fill="${skinColor}" stroke="#333" stroke-width="1"/>
            ${eyesStyles[config.eyes] || eyesStyles[0]}
            ${noseStyles[config.nose] || noseStyles[0]}
            ${mouthStyles[config.mouth] || mouthStyles[0]}
            ${hairStyles[config.hair] || ''}
        </svg>
    `;
}

export function renderPlayerProfile(p) {
    const profileContainer = document.getElementById('player-profile-view');
    const mainView = document.getElementById('admin-main-view');
    
    if (!profileContainer || !mainView) return;

    mainView.style.display = 'none';
    profileContainer.style.display = 'block';

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
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();

    profileContainer.innerHTML = `
        <div class="profile-header-nav" style="margin-bottom: 20px;">
            <button class="btn-back" onclick="hidePlayerProfile()">← POWRÓT DO BAZY</button>
        </div>

        <div class="modern-profile-card">
            <div class="profile-main-info">
                <div class="avatar-column">
                    <div class="avatar-wrapper" id="svg-container" style="width:180px; height:180px; border:3px solid #ddd; background:#fff;">
                        ${generatePlayerSVG(p.face_config)}
                    </div>
                    <button class="btn-edit-avatar-new" onclick='openAvatarEditor(${JSON.stringify(p)})'>⚙️ EDYTUJ WYGLĄD</button>
                </div>
                
                <div class="bio-container">
                    <h1 class="player-title">
                        ${getFlagEmoji(p.country)} ${fullName}
                    </h1>
                    
                    <div class="bio-grid-modern">
                        <div class="bio-item"><strong>KLUB</strong><span>${p.teams ? p.teams.team_name : 'Wolny Agent'}</span></div>
                        <div class="bio-item"><strong>POZYCJA</strong><span>${p.position || 'N/A'}</span></div>
                        <div class="bio-item"><strong>WIEK</strong><span>${p.age} lat</span></div>
                        <div class="bio-item"><strong>WZROST</strong><span>${p.height || 200} cm</span></div>
                        <div class="bio-item"><strong>PENSJA</strong><span>${salaryFormatted}</span></div>
                        <div class="bio-item"><strong>DRAFT</strong><span>${p.draft_pick ? `#${p.draft_pick}` : 'N/A'}</span></div>
                    </div>
                    
                    <div class="potential-section">
                        <div class="pot-header"><span>POTENCJAŁ</span><span>Tier ${potentialLevel}/10</span></div>
                        <div class="pot-bar-wrapper"><div class="pot-bar-fill" style="width: ${(potentialLevel/10)*100}%"></div></div>
                    </div>
                </div>
            </div>

            <div class="skills-container-new">
                <h2 class="skills-title">UMIEJĘTNOŚCI</h2>
                <div class="skills-split-view">
                    <div class="skill-column">${mainSkills.slice(0, 5).map(s => renderSkillBar(s, p)).join('')}</div>
                    <div class="skill-column">${mainSkills.slice(5, 10).map(s => renderSkillBar(s, p)).join('')}</div>
                </div>
                <div class="skills-physical-row">${physicalSkills.map(s => renderSkillBar(s, p)).join('')}</div>
            </div>
        </div>

        <div id="avatar-editor-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
            <div class="modal-content" style="background:#fff; padding:30px; border-radius:12px; max-width:500px; width:90%;">
                <h3>KREATOR WYGLĄDU (SVG)</h3>
                <div style="display:flex; gap:20px;">
                    <div id="editor-preview-container" style="width:150px; height:150px; border:2px solid #ccc;"></div>
                    <div class="controls-side" style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <label>Kolor Skóry:</label>
                        <input type="range" id="f-skin" min="0" max="6" oninput="updateFacePreview()">
                        <label>Fryzura:</label>
                        <input type="range" id="f-hair" min="0" max="4" oninput="updateFacePreview()">
                        <label>Oczy:</label>
                        <input type="range" id="f-eyes" min="0" max="3" oninput="updateFacePreview()">
                        <label>Nos:</label>
                        <input type="range" id="f-nose" min="0" max="3" oninput="updateFacePreview()">
                        <label>Usta:</label>
                        <input type="range" id="f-mouth" min="0" max="3" oninput="updateFacePreview()">
                    </div>
                </div>
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button class="btn-save" onclick="saveFaceConfig()" style="flex:1; padding:10px; background:green; color:white; border:none; cursor:pointer;">ZAPISZ</button>
                    <button class="btn-cancel" onclick="closeAvatarEditor()" style="flex:1; padding:10px; background:#666; color:white; border:none; cursor:pointer;">ANULUJ</button>
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
    const flags = { "Poland": "🇵🇱", "USA": "🇺🇸", "Spain": "🇪🇸", "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹" };
    return flags[country] || "🏳️";
}

// --- LOGIKA OBSŁUGI EDYTORA ---
let currentEditingPlayerId = null;

window.openAvatarEditor = (p) => {
    currentEditingPlayerId = p.id;
    const config = p.face_config || { skin: 0, eyes: 0, nose: 0, mouth: 0, hair: 0 };
    
    document.getElementById('avatar-editor-modal').style.display = 'flex';
    document.getElementById('f-skin').value = config.skin;
    document.getElementById('f-hair').value = config.hair;
    document.getElementById('f-eyes').value = config.eyes;
    document.getElementById('f-nose').value = config.nose;
    document.getElementById('f-mouth').value = config.mouth;
    
    updateFacePreview();
};

window.updateFacePreview = () => {
    const config = {
        skin: parseInt(document.getElementById('f-skin').value),
        hair: parseInt(document.getElementById('f-hair').value),
        eyes: parseInt(document.getElementById('f-eyes').value),
        nose: parseInt(document.getElementById('f-nose').value),
        mouth: parseInt(document.getElementById('f-mouth').value)
    };
    document.getElementById('editor-preview-container').innerHTML = generatePlayerSVG(config);
};

window.saveFaceConfig = async () => {
    const config = {
        skin: parseInt(document.getElementById('f-skin').value),
        hair: parseInt(document.getElementById('f-hair').value),
        eyes: parseInt(document.getElementById('f-eyes').value),
        nose: parseInt(document.getElementById('f-nose').value),
        mouth: parseInt(document.getElementById('f-mouth').value)
    };

    const { error } = await supabaseClient
        .from('players')
        .update({ face_config: config })
        .eq('id', currentEditingPlayerId);

    if (!error) {
        document.getElementById('svg-container').innerHTML = generatePlayerSVG(config);
        closeAvatarEditor();
        alert("Wygląd zawodnika został zapisany!");
    } else {
        alert("Błąd: " + error.message);
    }
};

window.closeAvatarEditor = () => {
    document.getElementById('avatar-editor-modal').style.display = 'none';
};

window.hidePlayerProfile = () => {
    document.getElementById('player-profile-view').style.display = 'none';
    document.getElementById('admin-main-view').style.display = 'block';
};
