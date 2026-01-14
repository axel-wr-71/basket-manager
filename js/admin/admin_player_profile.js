// js/admin/admin_player_profile.js
import { supabaseClient } from '../auth.js';

// --- ZAAWANSOWANY ALGORYTM GENEROWANIA TWARZY SVG ---
function generatePlayerSVG(config) {
    if (!config) config = { skin: 1, eyes: 0, nose: 0, mouth: 0, hair: 0, beard: 0 };
    
    const skinColors = ['#FFDBAC', '#F1C27D', '#E0AC69', '#8D5524', '#C68642', '#71492E', '#442E1F'];
    const skin = skinColors[config.skin] || skinColors[1];
    const hairColor = "#1a1a1a";

    const eyes = [
        `<g transform="translate(33,45)"><path d="M-8 0 Q0 -6 8 0 Q0 6 -8 0" fill="white" stroke="#333" stroke-width="0.5"/><circle cx="0" cy="0" r="2.5" fill="#333"/><circle cx="1" cy="-1" r="0.8" fill="white"/></g>
         <g transform="translate(67,45)"><path d="M-8 0 Q0 -6 8 0 Q0 6 -8 0" fill="white" stroke="#333" stroke-width="0.5"/><circle cx="0" cy="0" r="2.5" fill="#333"/><circle cx="1" cy="-1" r="0.8" fill="white"/></g>`,
        `<g transform="translate(33,45)"><path d="M-8 0 Q0 -4 8 0" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round"/></g>
         <g transform="translate(67,45)"><path d="M-8 0 Q0 -4 8 0" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round"/></g>`
    ];

    const noses = [
        `<path d="M47 48 Q50 62 54 55" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linecap="round"/>`,
        `<path d="M45 58 Q50 63 55 58" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="1.5"/>`,
        `<path d="M48 45 L50 60 L44 60" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>`
    ];

    const mouths = [
        `<path d="M40 78 Q50 85 60 78" fill="none" stroke="#844" stroke-width="2.5" stroke-linecap="round"/>`,
        `<path d="M42 80 L58 80" fill="none" stroke="#844" stroke-width="2" stroke-linecap="round"/>`,
        `<path d="M44 77 Q50 72 56 77" fill="none" stroke="#844" stroke-width="2" stroke-linecap="round"/>`
    ];

    const hairs = [
        '', 
        `<path d="M25 40 Q25 5 50 5 Q75 5 75 40 Q50 32 25 40" fill="${hairColor}"/>`, 
        `<path d="M22 40 Q20 -5 50 -5 Q80 -5 78 40 L80 45 Q50 25 20 45 Z" fill="${hairColor}"/>`, 
        `<circle cx="50" cy="25" r="28" fill="${hairColor}" fill-opacity="0.9"/>`, 
        `<path d="M25 35 L30 10 M40 30 L45 5 M55 30 L60 5 M70 35 L75 10" stroke="${hairColor}" stroke-width="5" stroke-linecap="round"/>` 
    ];

    return `
        <svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
            <defs>
                <radialGradient id="skinGrad" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stop-color="${skin}" />
                    <stop offset="100%" stop-color="${skin}" stop-opacity="0.85" />
                </radialGradient>
            </defs>
            <path d="M40 85 L40 100 Q50 105 60 100 L60 85" fill="${skin}" opacity="0.9"/>
            <path d="M25 40 Q25 10 50 10 Q75 10 75 40 L75 70 Q75 95 50 95 Q25 95 25 70 Z" fill="url(#skinGrad)" stroke="rgba(0,0,0,0.1)"/>
            ${eyes[config.eyes] || eyes[0]}
            ${noses[config.nose] || noses[0]}
            ${mouths[config.mouth] || mouths[0]}
            ${hairs[config.hair] || ''}
            <path d="M25 70 Q50 85 75 70" fill="none" stroke="black" opacity="0.05" stroke-width="4"/>
        </svg>
    `;
}

export function renderPlayerProfile(p) {
    const profileContainer = document.getElementById('player-profile-view');
    const mainView = document.getElementById('admin-main-view');
    if (!profileContainer || !mainView) return;

    // Definicja umiejętności z pełnymi nazwami i skrótami (zgodnie z Twoją bazą)
    const skillList = [
        { key: "skill_2pt", label: "Rzuty za 2 punkty (2PT)" },
        { key: "skill_3pt", label: "Rzuty za 3 punkty (3PT)" },
        { key: "skill_dunk", label: "Wsady (DNK)" },
        { key: "skill_passing", label: "Podania (PAS)" },
        { key: "skill_1on1_off", label: "Atak 1 na 1 (1v1O)" },
        { key: "skill_dribbling", label: "Drybling (DRI)" },
        { key: "skill_rebound", label: "Zbiórki (REB)" },
        { key: "skill_block", label: "Bloki (BLK)" },
        { key: "skill_steal", label: "Przechwyty (STL)" },
        { key: "skill_1on1_def", label: "Obrona 1 na 1 (1v1D)" },
        { key: "skill_ft", label: "Rzuty wolne (FT)" },
        { key: "skill_stamina", label: "Kondycja (STA)" }
    ];

    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    const salaryFormatted = (p.salary || 0).toLocaleString('pl-PL') + " $";
    
    // Logika koloru dla Potencjału
    const potValue = p.potential || 0;
    let potColor = "#95a5a6"; // Domyślny szary
    if (potValue >= 80) potColor = "#f1c40f"; // Gold (Elite)
    else if (potValue >= 60) potColor = "#3498db"; // Blue (Starter)
    else if (potValue >= 40) potColor = "#2ecc71"; // Green (Role Player)

    profileContainer.innerHTML = `
        <div class="profile-header-nav" style="margin-bottom: 20px;">
            <button class="btn" onclick="hidePlayerProfile()" style="background:#444;">← POWRÓT DO BAZY</button>
        </div>

        <div class="modern-profile-card" style="display: flex; flex-direction: column; gap: 25px; background: #1a1a1a; padding: 30px; border-radius: 20px; color: white; border: 1px solid #333;">
            
            <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                <div class="avatar-column" style="flex: 0 0 200px;">
                    <div id="svg-container" style="width:200px; height:220px; background:#222; border-radius:15px; border: 2px solid #333; overflow:hidden;">
                        ${generatePlayerSVG(p.face_config)}
                    </div>
                    <button class="btn" onclick='openAvatarEditor(${JSON.stringify(p)})' style="width:100%; margin-top:10px; font-size: 0.8em; background:#333;">EDYTUJ WYGLĄD</button>
                </div>

                <div class="bio-column" style="flex: 1; min-width: 300px;">
                    <h1 style="margin: 0 0 15px 0; font-size: 2.2em; color: #f39c12;">${getFlagEmoji(p.country)} ${fullName}</h1>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="bio-item"><strong>KLUB:</strong> <span style="color:#bbb;">${p.teams?.team_name || 'Wolny Agent'}</span></div>
                        <div class="bio-item"><strong>POZYCJA:</strong> <span style="color:orange; font-weight:bold;">${p.position || 'N/A'}</span></div>
                        <div class="bio-item"><strong>WIEK:</strong> <span style="color:#bbb;">${p.age} lat</span></div>
                        <div class="bio-item"><strong>WZROST:</strong> <span style="color:#bbb;">${p.height || '---'} cm</span></div>
                        <div class="bio-item"><strong>PENSJA:</strong> <span style="color:#2ecc71;">${salaryFormatted}</span></div>
                        <div class="bio-item"><strong>NARODOWOŚĆ:</strong> <span style="color:#bbb;">${p.country}</span></div>
                    </div>
                </div>

                <div class="potential-column" style="flex: 0 0 250px; background: #222; padding: 20px; border-radius: 15px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <span style="font-size: 0.8em; color: gray; letter-spacing: 2px; font-weight: bold;">POTENCJAŁ</span>
                    <div style="font-size: 3.5em; font-weight: 900; color: ${potColor}; margin: 10px 0;">${potValue}</div>
                    <div style="font-weight: bold; color: white; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">${p.potential_name || 'Prospect'}</div>
                    <div style="width: 100%; background: #444; height: 8px; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${potValue}%; height: 100%; background: ${potColor}; box-shadow: 0 0 10px ${potColor}88;"></div>
                    </div>
                </div>
            </div>

            <div class="skills-section" style="background: #222; padding: 25px; border-radius: 15px;">
                <h3 style="margin: 0 0 20px 0; border-bottom: 1px solid #333; padding-bottom: 10px; color: #f39c12;">PARAMETRY ZAWODNIKA</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: x 40px; row-gap: 15px;">
                    ${skillList.map(s => renderSkillBar(s, p)).join('')}
                </div>
            </div>
        </div>

        <div id="avatar-editor-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; justify-content:center; align-items:center;">
            <div style="background:#1e1e1e; padding:30px; border-radius:15px; max-width:600px; width:95%; display:flex; gap:25px; border: 1px solid #444;">
                <div id="editor-preview-container" style="width:200px; height:220px; background:#111; border-radius:10px;"></div>
                <div style="flex:1; color: white;">
                    <h3 style="margin-top:0;">KREATOR WYGLĄDU</h3>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <label style="font-size:0.8em; color:gray;">Kolor Skóry:</label><input type="range" id="f-skin" min="0" max="6" oninput="updateFacePreview()">
                        <label style="font-size:0.8em; color:gray;">Fryzura:</label><input type="range" id="f-hair" min="0" max="4" oninput="updateFacePreview()">
                        <label style="font-size:0.8em; color:gray;">Oczy:</label><input type="range" id="f-eyes" min="0" max="1" oninput="updateFacePreview()">
                        <label style="font-size:0.8em; color:gray;">Nos:</label><input type="range" id="f-nose" min="0" max="2" oninput="updateFacePreview()">
                        <label style="font-size:0.8em; color:gray;">Usta:</label><input type="range" id="f-mouth" min="0" max="2" oninput="updateFacePreview()">
                    </div>
                    <div style="margin-top:20px; display:flex; gap:10px;">
                        <button onclick="saveFaceConfig()" style="flex:1; padding:10px; background:#2ecc71; border:none; color:white; border-radius:5px; cursor:pointer;">ZAPISZ</button>
                        <button onclick="closeAvatarEditor()" style="flex:1; padding:10px; background:#e74c3c; border:none; color:white; border-radius:5px; cursor:pointer;">ANULUJ</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSkillBar(s, p) {
    const val = p[s.key] || 0;
    const percent = (val / 20) * 100;
    
    // Dynamizacja koloru paska skilla (1-20)
    let barColor = "#e74c3c"; // Słaby (czerwony)
    if (val >= 15) barColor = "#f1c40f"; // Świetny (złoty)
    else if (val >= 10) barColor = "#2ecc71"; // Dobry (zielony)
    else if (val >= 6) barColor = "#3498db"; // Przeciętny (niebieski)

    return `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 5px;">
            <span style="flex: 1; font-size: 0.85em; color: #ccc;">${s.label}</span>
            <div style="flex: 1.5; background: #333; height: 10px; border-radius: 5px; overflow: hidden; position: relative;">
                <div style="width: ${percent}%; height: 100%; background: ${barColor}; border-radius: 5px;"></div>
            </div>
            <span style="flex: 0 0 30px; text-align: right; font-weight: bold; color: ${barColor};">${val}</span>
        </div>
    `;
}

function getFlagEmoji(country) {
    const flags = { "Poland": "🇵🇱", "USA": "🇺🇸", "Spain": "🇪🇸", "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹", "Greece": "🇬🇷", "Lithuania": "🇱🇹" };
    return flags[country] || "🏳️";
}

let currentEditingPlayerId = null;

window.openAvatarEditor = (p) => {
    currentEditingPlayerId = p.id;
    const config = p.face_config || { skin: 1, eyes: 0, nose: 0, mouth: 0, hair: 0 };
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
    const { error } = await supabaseClient.from('players').update({ face_config: config }).eq('id', currentEditingPlayerId);
    if (!error) {
        document.getElementById('svg-container').innerHTML = generatePlayerSVG(config);
        closeAvatarEditor();
    } else {
        alert("Błąd: " + error.message);
    }
};

window.closeAvatarEditor = () => { document.getElementById('avatar-editor-modal').style.display = 'none'; };
window.hidePlayerProfile = () => {
    document.getElementById('player-profile-view').style.display = 'none';
    document.getElementById('admin-main-view').style.display = 'block';
};
