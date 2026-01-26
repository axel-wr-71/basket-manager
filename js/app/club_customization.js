// js/app/club_customization.js
import { supabaseClient } from '../auth.js';

/**
 * Komponent personalizacji klubu
 */
export async function renderClubCustomization(team, players) {
    console.log("[CLUB CUSTOMIZATION] Renderowanie personalizacji...");
    
    try {
        // Pobierz dane personalizacji
        const customization = await fetchClubCustomization(team.id) || {};
        
        return `
            <div class="customization-container">
                <!-- NAGŁÓWEK -->
                <div class="customization-header">
                    <h2><span class="icon">🎨</span> Personalizacja Klubu</h2>
                    <p>Dostosuj wygląd i identyfikację wizualną swojego klubu</p>
                </div>
                
                <!-- PODGLĄD IDENTYFIKACJI -->
                <div class="identity-preview-section">
                    <h3>Podgląd identyfikacji</h3>
                    <div class="identity-preview">
                        ${renderIdentityPreview(team, customization)}
                    </div>
                </div>
                
                <!-- LOGO KLUBU -->
                <div class="logo-customization">
                    <h3><span class="icon">🖼️</span> Logo klubu</h3>
                    ${renderLogoCustomization(team, customization)}
                </div>
                
                <!-- BARWY KLUBU -->
                <div class="colors-customization">
                    <h3><span class="icon">🎨</span> Barwy klubu</h3>
                    ${renderColorsCustomization(customization)}
                </div>
                
                <!-- DODATKOWE OPCJE -->
                <div class="advanced-customization">
                    <h3><span class="icon">⚙️</span> Zaawansowane opcje</h3>
                    ${renderAdvancedCustomization(team, customization)}
                </div>
                
                <!-- PRZYCISKI AKCJI -->
                <div class="customization-actions">
                    <button class="btn-save" onclick="saveCustomization('${team.id}')">
                        💾 Zapisz zmiany
                    </button>
                    <button class="btn-reset" onclick="resetCustomization('${team.id}')">
                        🔄 Resetuj do domyślnych
                    </button>
                </div>
            </div>
            
            <style>
                .customization-container {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .customization-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e2e8f0;
                }
                
                .customization-header h2 {
                    color: #1a237e;
                    font-size: 1.8rem;
                    font-weight: 900;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }
                
                .customization-header p {
                    color: #64748b;
                    font-size: 1rem;
                }
                
                .identity-preview-section, .logo-customization, 
                .colors-customization, .advanced-customization {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 15px rgba(0,0,0,0.08);
                }
                
                h3 {
                    color: #1a237e;
                    margin-bottom: 20px;
                    font-size: 1.2rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                }
                
                h3 .icon {
                    margin-right: 10px;
                }
                
                .identity-preview {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 30px;
                    align-items: center;
                }
                
                .logo-preview-container {
                    text-align: center;
                }
                
                .logo-display {
                    width: 200px;
                    height: 200px;
                    margin: 0 auto 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 5px solid #e2e8f0;
                    overflow: hidden;
                }
                
                .logo-display img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .team-info-preview {
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 10px;
                    border: 2px solid #e2e8f0;
                }
                
                .team-name-preview {
                    font-size: 2rem;
                    font-weight: 900;
                    color: ${customization.primary_color || '#1a237e'};
                    margin-bottom: 10px;
                    text-align: center;
                }
                
                .team-motto-preview {
                    font-size: 1.1rem;
                    color: #64748b;
                    font-style: italic;
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .colors-preview {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 15px;
                }
                
                .color-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    border: 2px solid #e2e8f0;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                
                .color-box:hover {
                    transform: scale(1.1);
                }
                
                .logo-upload-section {
                    text-align: center;
                    margin-top: 20px;
                }
                
                .upload-area {
                    border: 2px dashed #cbd5e1;
                    border-radius: 10px;
                    padding: 40px;
                    margin-bottom: 20px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .upload-area:hover {
                    border-color: #e65100;
                    background: #fff7ed;
                }
                
                .upload-icon {
                    font-size: 3rem;
                    margin-bottom: 15px;
                    color: #94a3b8;
                }
                
                .upload-text {
                    color: #64748b;
                    margin-bottom: 5px;
                    font-weight: 600;
                }
                
                .upload-subtext {
                    color: #94a3b8;
                    font-size: 0.9rem;
                }
                
                .color-picker-section {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }
                
                .color-picker {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                
                .color-label {
                    display: block;
                    margin-bottom: 10px;
                    font-weight: 600;
                    color: #1a237e;
                }
                
                .color-input-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .color-input {
                    width: 60px;
                    height: 40px;
                    border: 2px solid #e2e8f0;
                    border-radius: 6px;
                    cursor: pointer;
                }
                
                .color-value {
                    font-family: monospace;
                    padding: 10px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    min-width: 120px;
                }
                
                .advanced-options {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .option-group {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                
                .option-label {
                    display: block;
                    margin-bottom: 10px;
                    font-weight: 600;
                    color: #1a237e;
                }
                
                .text-input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 1rem;
                    transition: border-color 0.3s;
                }
                
                .text-input:focus {
                    outline: none;
                    border-color: #e65100;
                }
                
                .textarea-input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 1rem;
                    min-height: 100px;
                    resize: vertical;
                }
                
                .customization-actions {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 40px;
                    padding-top: 30px;
                    border-top: 2px solid #e2e8f0;
                }
                
                .btn-save, .btn-reset {
                    padding: 15px 40px;
                    border: none;
                    border-radius: 10px;
                    font-size: 1.1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .btn-save {
                    background: #e65100;
                    color: white;
                }
                
                .btn-save:hover {
                    background: #ea580c;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(230, 81, 0, 0.3);
                }
                
                .btn-reset {
                    background: #f1f5f9;
                    color: #475569;
                    border: 2px solid #e2e8f0;
                }
                
                .btn-reset:hover {
                    background: #e2e8f0;
                    transform: translateY(-2px);
                }
                
                .color-presets {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
                    gap: 10px;
                    margin-top: 15px;
                }
                
                .color-preset {
                    width: 40px;
                    height: 40px;
                    border-radius: 6px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s;
                }
                
                .color-preset:hover {
                    transform: scale(1.1);
                    border-color: #1a237e;
                }
                
                .preset-label {
                    font-size: 0.8rem;
                    text-align: center;
                    margin-top: 5px;
                    color: #64748b;
                }
            </style>
        `;
        
    } catch (error) {
        console.error("[CLUB CUSTOMIZATION] Błąd:", error);
        return `
            <div style="padding: 50px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                <h3 style="color: #7c2d12;">Błąd ładowania personalizacji</h3>
                <p style="color: #92400e;">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Renderuje podgląd identyfikacji
 */
function renderIdentityPreview(team, customization) {
    const primaryColor = customization.primary_color || '#1a237e';
    const secondaryColor = customization.secondary_color || '#e65100';
    
    return `
        <div class="logo-preview-container">
            <div class="logo-display">
                ${customization.logo_url ? 
                    `<img src="${customization.logo_url}" alt="Logo ${team.team_name}">` :
                    `<span style="font-size: 4rem; color: ${primaryColor};">🏀</span>`
                }
            </div>
            <button class="btn-change-logo" onclick="changeLogo('${team.id}')">
                🖼️ Zmień logo
            </button>
        </div>
        
        <div class="team-info-preview">
            <div class="team-name-preview" style="color: ${primaryColor}">
                ${team.team_name}
            </div>
            
            <div class="team-motto-preview">
                ${customization.motto || 'Twoja motywacja pojawi się tutaj...'}
            </div>
            
            <div style="margin-bottom: 20px;">
                <div style="font-weight: 600; color: #1a237e; margin-bottom: 10px;">Barwy klubu:</div>
                <div class="colors-preview">
                    <div class="color-box" style="background: ${primaryColor};" 
                         onclick="pickColor('primary')"></div>
                    <div class="color-box" style="background: ${secondaryColor};" 
                         onclick="pickColor('secondary')"></div>
                </div>
            </div>
            
            <div style="font-size: 0.9rem; color: #64748b; text-align: center;">
                Podgląd w czasie rzeczywistym
            </div>
        </div>
    `;
}

/**
 * Renderuje opcje logo
 */
function renderLogoCustomization(team, customization) {
    return `
        <div class="logo-upload-section">
            <div class="upload-area" onclick="openLogoUpload()">
                <div class="upload-icon">🖼️</div>
                <div class="upload-text">Kliknij aby przesłać nowe logo</div>
                <div class="upload-subtext">PNG, JPG, SVG • Max 5MB</div>
            </div>
            
            <div style="margin-top: 20px;">
                <div style="font-weight: 600; color: #1a237e; margin-bottom: 10px;">Gotowe szablony:</div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button class="logo-template" onclick="applyLogoTemplate('basketball')">
                        🏀
                    </button>
                    <button class="logo-template" onclick="applyLogoTemplate('shield')">
                        🛡️
                    </button>
                    <button class="logo-template" onclick="applyLogoTemplate('crown')">
                        👑
                    </button>
                    <button class="logo-template" onclick="applyLogoTemplate('fire')">
                        🔥
                    </button>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 10px;">
            <div style="font-weight: 600; color: #0369a1; margin-bottom: 10px;">
                💡 Wskazówka:
            </div>
            <div style="color: #64748b; font-size: 0.9rem;">
                Idealne logo to kwadrat o wymiarach 500x500px. Używaj wyraźnych kontrastów dla lepszej widoczności.
            </div>
        </div>
    `;
}

/**
 * Renderuje opcje kolorów
 */
function renderColorsCustomization(customization) {
    const primaryColor = customization.primary_color || '#1a237e';
    const secondaryColor = customization.secondary_color || '#e65100';
    
    const colorPresets = [
        { name: 'Classic', primary: '#1a237e', secondary: '#e65100' },
        { name: 'Modern', primary: '#0f172a', secondary: '#06b6d4' },
        { name: 'Vibrant', primary: '#7c3aed', secondary: '#f59e0b' },
        { name: 'Nature', primary: '#059669', secondary: '#ea580c' },
        { name: 'Elegant', primary: '#374151', secondary: '#d1d5db' },
        { name: 'Bold', primary: '#dc2626', secondary: '#1e40af' },
        { name: 'Fresh', primary: '#10b981', secondary: '#3b82f6' },
        { name: 'Royal', primary: '#7e22ce', secondary: '#fbbf24' }
    ];
    
    return `
        <div class="color-picker-section">
            <div class="color-picker">
                <label class="color-label">Kolor podstawowy</label>
                <div class="color-input-group">
                    <input type="color" id="primary-color" value="${primaryColor}" 
                           class="color-input" onchange="updateColorPreview('primary', this.value)">
                    <input type="text" id="primary-value" value="${primaryColor}" 
                           class="color-value" readonly>
                </div>
            </div>
            
            <div class="color-picker">
                <label class="color-label">Kolor drugorzędny</label>
                <div class="color-input-group">
                    <input type="color" id="secondary-color" value="${secondaryColor}" 
                           class="color-input" onchange="updateColorPreview('secondary', this.value)">
                    <input type="text" id="secondary-value" value="${secondaryColor}" 
                           class="color-value" readonly>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 30px;">
            <div style="font-weight: 600; color: #1a237e; margin-bottom: 15px;">Gotowe palety kolorów:</div>
            <div class="color-presets">
                ${colorPresets.map(preset => `
                    <div>
                        <div class="color-preset" 
                             style="background: linear-gradient(135deg, ${preset.primary} 50%, ${preset.secondary} 50%);"
                             onclick="applyColorPreset('${preset.primary}', '${preset.secondary}')"
                             title="${preset.name}"></div>
                        <div class="preset-label">${preset.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Renderuje zaawansowane opcje
 */
function renderAdvancedCustomization(team, customization) {
    return `
        <div class="advanced-options">
            <div class="option-group">
                <label class="option-label">Motto klubu</label>
                <textarea id="club-motto" class="textarea-input" 
                          placeholder="Wpisz motto swojego klubu..." 
                          maxlength="120">${customization.motto || ''}</textarea>
                <div style="text-align: right; margin-top: 5px; color: #94a3b8; font-size: 0.8rem;">
                    <span id="motto-counter">${(customization.motto || '').length}</span>/120 znaków
                </div>
            </div>
            
            <div class="option-group">
                <label class="option-label">Tło banera</label>
                <input type="text" id="banner-url" class="text-input" 
                       placeholder="https://example.com/banner.jpg"
                       value="${customization.banner_url || ''}">
                <div style="margin-top: 10px; font-size: 0.8rem; color: #64748b;">
                    Wklej URL do obrazka banera (rekomendowane: 1920x400px)
                </div>
            </div>
        </div>
    `;
}

/**
 * Pobiera personalizację klubu
 */
async function fetchClubCustomization(teamId) {
    const { data, error } = await supabaseClient
        .from('club_customization')
        .select('*')
        .eq('team_id', teamId)
        .single();
    
    if (error) return null;
    return data;
}

/**
 * Globalne funkcje dla personalizacji
 */
window.changeLogo = function(teamId) {
    document.getElementById('logo-upload').click();
};

window.openLogoUpload = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = 'logo-upload';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Tutaj logika uploadu
            alert(`Wybrano plik: ${file.name}`);
        }
    };
    
    input.click();
};

window.applyLogoTemplate = function(template) {
    const templates = {
        'basketball': '🏀',
        'shield': '🛡️',
        'crown': '👑',
        'fire': '🔥'
    };
    
    alert(`Zastosowano szablon: ${template}`);
};

window.updateColorPreview = function(type, color) {
    const element = type === 'primary' ? 
        document.querySelector('.team-name-preview') : 
        document.querySelectorAll('.color-box')[1];
    
    element.style.color = color;
    document.getElementById(`${type}-value`).value = color;
};

window.applyColorPreset = function(primary, secondary) {
    document.getElementById('primary-color').value = primary;
    document.getElementById('secondary-color').value = secondary;
    document.getElementById('primary-value').value = primary;
    document.getElementById('secondary-value').value = secondary;
    
    // Aktualizuj podgląd
    document.querySelector('.team-name-preview').style.color = primary;
    document.querySelectorAll('.color-box')[0].style.background = primary;
    document.querySelectorAll('.color-box')[1].style.background = secondary;
};

window.saveCustomization = async function(teamId) {
    alert('Zapisano zmiany personalizacji!');
    // Tutaj logika zapisu do bazy
};

window.resetCustomization = function(teamId) {
    if (confirm('Czy na pewno chcesz zresetować wszystkie ustawienia do domyślnych?')) {
        alert('Personalizacja zresetowana!');
    }
};
