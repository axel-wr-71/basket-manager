// js/admin/admin_player_profile.js
import { supabaseClient } from '../auth.js';

// --- SILNIK GRAFICZNY NBA LAYERED SVG ---
function generateNBAFaceSVG(config) {
    if (!config) config = { skin: 1, eyes: 0, nose: 0, mouth: 0, hair: 0, beard: 0, access: 0 };
    
    // Paleta barw
    const skins = ['#FFDBAC', '#F1C27D', '#E0AC69', '#BD9778', '#8D5524', '#5E3C1E', '#3B2219'];
    const hairColors = ['#000000', '#221100', '#442200', '#664422'];
    const s = skins[config.skin] || skins[1];
    const h = hairColors[0]; // Na razie czarne włosy dla stylu NBA

    // Definicje kształtów (Paths)
    const eyes = [
        `<g transform="translate(32,45)"><ellipse cx="0" cy="0" rx="6" ry="3" fill="white"/><circle cx="1" cy="0" r="2.5" fill="black"/></g>
         <g transform="translate(68,45)"><ellipse cx="0" cy="0" rx="6" ry="3" fill="white"/><circle cx="-1" cy="0" r="2.5" fill="black"/></g>`, // Standard
        `<g transform="translate(32,45)"><path d="M-7,0 Q0,-5 7,0" fill="none" stroke="black" stroke-width="2.5"/></g>
         <g transform="translate(68,45)"><path d="M-7,0 Q0,-5 7,0" fill="none" stroke="black" stroke-width="2.5"/></g>`, // Skupione
        `<circle cx="33" cy="45" r="3" fill="black"/><circle cx="67" cy="45" r="3" fill="black"/>` // Minimalistyczne
    ];

    const hair = [
        '', // Łysy
        `<path d="M25,40 Q25,5 50,5 Q75,5 75,40 Q50,30 25,40" fill="${h}"/>`, // Krótkie / Buzzcut
        `<path d="M20,40 Q20,-10 50,-10 Q80,-10 80,40 L80,45 Q50,20 20,45 Z" fill="${h}"/>`, // High Top Fade
        `<circle cx="50" cy="30" r="30" fill="${h}" opacity="0.9"/>`, // Afro
        `<path d="M25,35 L30,5 L40,5 L35,35 M45,30 L50,0 L60,0 L55,30 M65,35 L70,5 L80,5 L75,35" fill="${h}" stroke="black" stroke-width="1"/>` // Krótkie dredy
    ];

    const beards = [
        '', // Brak
        `<path d="M30,75 Q50,95 70,75 L70,70 Q50,85 30,70 Z" fill="black" opacity="0.6"/>`, // Zarost 3-dniowy
        `<path d="M30,70 Q50,105 70,70 Q50,90 30,70" fill="black"/>`, // Pełna broda
        `<path d="M45,78 Q50,85 55,78" fill="none" stroke="black" stroke-width="3"/>`, // Kozia bródka
        `<path d="M40,70 Q50,75 60,70" fill="none" stroke="black" stroke-width="4" opacity="0.8"/>` // Wąsy
    ];

    return `
        <svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
            <defs>
                <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:${s};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${s};stop-opacity:0.8" />
                </radialGradient>
            </defs>
            <rect x="40" y="80" width="20" height="20" fill="${s}" stroke="rgba(0,0,0,0.1)"/>
            <path d="M25,40 Q25,10 50,10 Q75,10 75,40 L75,70 Q75,95 50,95 Q25,95 25,70 Z" fill="url(#grad1)" stroke="#333" stroke-width="0.5"/>
            ${eyes[config.eyes] || eyes[0]}
            <path d="M47,55 Q50,62 53,55" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="2"/> <path d="M42,80 Q50,85 58,80" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="2.5"/> ${beards[config.beard] || ''}
            ${hair[config.hair] || ''}
        </svg>
    `;
}

export function renderPlayerProfile(p) {
    const profileContainer = document.getElementById('player-profile-view');
    const mainView = document.getElementById('admin-main-view');
    if (!profileContainer || !mainView) return;

    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    const config = p.face_config || { skin: 1, hair: 1, eyes: 0, beard: 0 };

    profileContainer.innerHTML = `
        <div class="profile-header-nav" style="margin-bottom: 20px;">
            <button class="btn-back" onclick="hidePlayerProfile()">← POWRÓT DO BAZY</button>
        </div>

        <div class="modern-profile-card">
            <div class="profile-main-info">
                <div class="avatar-column">
                    <div id="main-svg-wrapper" class="avatar-wrapper" style="width:180px; height:200px; background:#e9ecef; border-radius:12px; border:4px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        ${generateNBAFaceSVG(config)}
                    </div>
                    <button class="btn-edit-avatar-new" style="margin-top:15px; width:100%; cursor:pointer; padding:10px; border-radius:8px; border:none; background:var(--nba-orange); color:white; font-weight:bold;" 
                            onclick='openNBAEditor(${JSON.stringify(p)})'>⚙️ EDYTUJ WYGLĄD</button>
                </div>
                
                <div class="bio-container" style="flex:1; padding-left:20px;">
                    <h1 class="player-title" style="margin:0 0 15px 0; font-size:28px;">${getFlagEmoji(p.country)} ${fullName}</h1>
                    <div class="bio-grid-modern" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div class="bio-item"><strong>WIEK</strong> <span>${p.age} lat</span></div>
                        <div class="bio-item"><strong>WZROST</strong> <span>${p.height || 200} cm</span></div>
                        <div class="bio-item"><strong>POZYCJA</strong> <span>${p.position}</span></div>
                        <div class="bio-item"><strong>PENSJA</strong> <span>${(p.salary || 0).toLocaleString()} $</span></div>
                    </div>
                </div>
            </div>
            <div class="skills-container-new" style="margin-top:30px; background:#f4f4f4; padding:20px; border-radius:12px;">
                 <h3 style="margin-top:0;">STATYSTYKI ZAWODNIKA</h3>
                 <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                    <div>${renderSkill("RzW", p.jump_shot)}${renderSkill("ZR", p.jump_range)}${renderSkill("ObO", p.outside_defense)}</div>
                    <div>${renderSkill("Koz", p.handling)}${renderSkill("Pod", p.passing)}${renderSkill("Zb", p.rebounding)}</div>
                 </div>
            </div>
        </div>

        <div id="nba-editor-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; justify-content:center; align-items:center;">
            <div class="modal-content" style="background:white; padding:30px; border-radius:15px; display:flex; gap:30px; max-width:700px; width:95%;">
                <div id="editor-preview" style="width:250px; height:280px; background:#eee; border-radius:10px;"></div>
                <div style="flex:1;">
                    <h3 style="margin-top:0;">KREATOR ZAWODNIKA</h3>
                    <div class="edit-row" style="margin-bottom:15px;">
                        <label style="display:block; font-size:12px; font-weight:bold;">KOLOR SKÓRY</label>
                        <input type="range" id="e-skin" min="0" max="6" style="width:100%" oninput="syncNBAEditor()">
                    </div>
                    <div class="edit-row" style="margin-bottom:15px;">
                        <label style="display:block; font-size:12px; font-weight:bold;">FRYZURA</label>
                        <input type="range" id="e-hair" min="0" max="4" style="width:100%" oninput="syncNBAEditor()">
                    </div>
                    <div class="edit-row" style="margin-bottom:15px;">
                        <label style="display:block; font-size:12px; font-weight:bold;">ZAROST</label>
                        <input type="range" id="e-beard" min="0" max="4" style="width:100%" oninput="syncNBAEditor()">
                    </div>
                    <div class="edit-row" style="margin-bottom:15px;">
                        <label style="display:block; font-size:12px; font-weight:bold;">OCZY</label>
                        <input type="range" id="e-eyes" min="0" max="2" style="width:100%" oninput="syncNBAEditor()">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button onclick="saveNBAFace()" style="flex:1; padding:12px; background:#28a745; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">ZAPISZ</button>
                        <button onclick="closeNBAEditor()" style="flex:1; padding:12px; background:#6c757d; color:white; border:none; border-radius:5px; cursor:pointer;">ANULUJ</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSkill(label, val) {
    const pct = (val / 20) * 100;
    return `<div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px;"><span>${label}</span><span>
