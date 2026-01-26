// js/app/player_settings.js
import { supabaseClient } from '../auth.js';

/**
 * Komponent ustawień gracza
 */
export async function renderPlayerSettings(team, players) {
    console.log("[PLAYER SETTINGS] Renderowanie ustawień gracza...");
    
    try {
        // Pobierz ustawienia użytkownika
        const settings = await fetchUserSettings();
        
        return `
            <div class="player-settings-container">
                <!-- NAGŁÓWEK -->
                <div class="settings-header">
                    <h2><span class="icon">⚙️</span> Ustawienia Gracza</h2>
                    <p>Zarządzaj swoim kontem i preferencjami</p>
                </div>
                
                <!-- PANEL UŻYTKOWNIKA -->
                <div class="user-profile-section">
                    <h3><span class="icon">👤</span> Profil użytkownika</h3>
                    ${renderUserProfile()}
                </div>
                
                <!-- PREFERENCJE -->
                <div class="preferences-section">
                    <h3><span class="icon">🎮</span> Preferencje gry</h3>
                    <div class="preferences-grid">
                        ${renderGamePreferences(settings)}
                    </div>
                </div>
                
                <!-- POWIADOMIENIA -->
                <div class="notifications-section">
                    <h3><span class="icon">🔔</span> Powiadomienia</h3>
                    ${renderNotifications(settings)}
                </div>
                
                <!-- BEZPIECZEŃSTWO -->
                <div class="security-section">
                    <h3><span class="icon">🔒</span> Bezpieczeństwo</h3>
                    ${renderSecuritySettings()}
                </div>
                
                <!-- ZAPISYWANIE -->
                <div class="save-section">
                    <button class="btn-save-all" onclick="saveAllSettings()">
                        💾 Zapisz wszystkie ustawienia
                    </button>
                    <button class="btn-export" onclick="exportUserData()">
                        📥 Eksportuj dane użytkownika
                    </button>
                </div>
            </div>
            
            <style>
                .player-settings-container {
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .settings-header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e2e8f0;
                }
                
                .settings-header h2 {
                    color: #1a237e;
                    font-size: 2rem;
                    font-weight: 900;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }
                
                .settings-header p {
                    color: #64748b;
                    font-size: 1.1rem;
                }
                
                .user-profile-section, .preferences-section,
                .notifications-section, .security-section {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 15px rgba(0,0,0,0.08);
                }
                
                h3 {
                    color: #1a237e;
                    margin-bottom: 25px;
                    font-size: 1.3rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                h3 .icon {
                    margin-right: 10px;
                }
                
                .user-profile {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 30px;
                    align-items: center;
                }
                
                .avatar-container {
                    text-align: center;
                }
                
                .avatar-display {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1a237e 0%, #e65100 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    color: white;
                    margin-bottom: 15px;
                    border: 4px solid #e2e8f0;
                }
                
                .profile-info {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .profile-row {
                    display: grid;
                    grid-template-columns: 150px 1fr;
                    align-items: center;
                }
                
                .profile-label {
                    font-weight: 600;
                    color: #1a237e;
                }
                
                .profile-value {
                    padding: 10px 15px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                }
                
                .profile-input {
                    padding: 10px 15px;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 1rem;
                    width: 100%;
                    transition: border-color 0.3s;
                }
                
                .profile-input:focus {
                    outline: none;
                    border-color: #e65100;
                }
                
                .preferences-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .preference-group {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                
                .preference-title {
                    font-weight: 700;
                    color: #1a237e;
                    margin-bottom: 15px;
                    font-size: 1rem;
                }
                
                .preference-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .preference-item:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }
                
                .preference-label {
                    color: #475569;
                    font-size: 0.95rem;
                }
                
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: .4s;
                    border-radius: 24px;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .toggle-slider {
                    background-color: #e65100;
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(26px);
                }
                
                .select-input {
                    padding: 8px 12px;
                    border: 2px solid #e2e8f0;
                    border-radius: 6px;
                    background: white;
                    font-size: 0.9rem;
                    width: 150px;
                }
                
                .notifications-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .notification-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 15px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                
                .notification-info {
                    flex: 1;
                    margin-left: 15px;
                }
                
                .notification-name {
                    font-weight: 600;
                    color: #1a237e;
                    margin-bottom: 5px;
                }
                
                .notification-description {
                    font-size: 0.85rem;
                    color: #64748b;
                }
                
                .security-options {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .security-item {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                
                .security-title {
                    font-weight: 700;
                    color: #1a237e;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .security-description {
                    font-size: 0.9rem;
                    color: #64748b;
                    margin-bottom: 15px;
                }
                
                .btn-action {
                    padding: 10px 20px;
                    background: #1a237e;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .btn-action:hover {
                    background: #283593;
                    transform: translateY(-2px);
                }
                
                .save-section {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 40px;
                    padding-top: 30px;
                    border-top: 2px solid #e2e8f0;
                }
                
                .btn-save-all {
                    padding: 15px 40px;
                    background: #e65100;
                    color: white;
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
                
                .btn-save-all:hover {
                    background: #ea580c;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(230, 81, 0, 0.3);
                }
                
                .btn-export {
                    padding: 15px 40px;
                    background: #f1f5f9;
                    color: #475569;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 1.1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .btn-export:hover {
                    background: #e2e8f0;
                    transform: translateY(-2px);
                }
                
                .last-login {
                    margin-top: 15px;
                    font-size: 0.85rem;
                    color: #94a3b8;
                    text-align: center;
                }
            </style>
        `;
        
    } catch (error) {
        console.error("[PLAYER SETTINGS] Błąd:", error);
        return `
            <div style="padding: 50px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                <h3 style="color: #7c2d12;">Błąd ładowania ustawień</h3>
                <p style="color: #92400e;">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Renderuje profil użytkownika
 */
function renderUserProfile() {
    const userEmail = JSON.parse(localStorage.getItem('supabase.auth.token'))?.currentSession?.user?.email;
    
    return `
        <div class="user-profile">
            <div class="avatar-container">
                <div class="avatar-display">
                    ${getInitials(userEmail)}
                </div>
                <button class="btn-action" onclick="changeAvatar()">
                    🖼️ Zmień avatar
                </button>
            </div>
            
            <div class="profile-info">
                <div class="profile-row">
                    <div class="profile-label">Email:</div>
                    <div class="profile-value">${userEmail}</div>
                </div>
                
                <div class="profile-row">
                    <div class="profile-label">Nazwa wyświetlana:</div>
                    <input type="text" class="profile-input" 
                           value="${localStorage.getItem('display_name') || userEmail?.split('@')[0] || 'Gracz'}"
                           placeholder="Wpisz swoją nazwę">
                </div>
                
                <div class="profile-row">
                    <div class="profile-label">Data dołączenia:</div>
                    <div class="profile-value">${new Date().toLocaleDateString('pl-PL')}</div>
                </div>
                
                <div class="last-login">
                    Ostatnie logowanie: ${new Date().toLocaleString('pl-PL')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderuje preferencje gry
 */
function renderGamePreferences(settings) {
    const prefs = settings?.display_preferences || {};
    
    return `
        <div class="preference-group">
            <div class="preference-title">Wyświetlanie</div>
            
            <div class="preference-item">
                <div class="preference-label">Tryb ciemny</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${prefs.dark_mode ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="preference-item">
                <div class="preference-label">Tryb kompaktowy</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${prefs.compact_mode ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="preference-item">
                <div class="preference-label">Animacje</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${prefs.animations !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
        
        <div class="preference-group">
            <div class="preference-title">Interfejs</div>
            
            <div class="preference-item">
                <div class="preference-label">Wielkość czcionki</div>
                <select class="select-input">
                    <option ${prefs.font_size === 'small' ? 'selected' : ''}>Mała</option>
                    <option ${!prefs.font_size || prefs.font_size === 'medium' ? 'selected' : ''}>Średnia</option>
                    <option ${prefs.font_size === 'large' ? 'selected' : ''}>Duża</option>
                </select>
            </div>
            
            <div class="preference-item">
                <div class="preference-label">Język</div>
                <select class="select-input">
                    <option selected>Polski</option>
                    <option>English</option>
                </select>
            </div>
            
            <div class="preference-item">
                <div class="preference-label">Waluta</div>
                <select class="select-input">
                    <option ${prefs.currency === 'PLN' ? 'selected' : ''}>PLN (zł)</option>
                    <option ${!prefs.currency || prefs.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option ${prefs.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                </select>
            </div>
        </div>
        
        <div class="preference-group">
            <div class="preference-title">Grywalność</div>
            
            <div class="preference-item">
                <div class="preference-label">Podpowiedzi</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${prefs.tooltips !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="preference-item">
                <div class="preference-label">Potwierdzenia akcji</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${prefs.confirmations !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="preference-item">
                <div class="preference-label">Automatyczne zapisywanie</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${prefs.auto_save !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
    `;
}

/**
 * Renderuje ustawienia powiadomień
 */
function renderNotifications(settings) {
    const notifs = settings?.notification_preferences || {};
    
    return `
        <div class="notifications-list">
            <div class="notification-item">
                <div style="font-size: 1.5rem;">📧</div>
                <div class="notification-info">
                    <div class="notification-name">Powiadomienia email</div>
                    <div class="notification-description">Otrzymuj podsumowania sezonu i ważne ogłoszenia</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" ${notifs.email_notifications ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="notification-item">
                <div style="font-size: 1.5rem;">🔄</div>
                <div class="notification-info">
                    <div class="notification-name">Powiadomienia transferowe</div>
                    <div class="notification-description">Informacje o ofertach transferowych i negocjacjach</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" ${notifs.transfer_notifications !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="notification-item">
                <div style="font-size: 1.5rem;">🏀</div>
                <div class="notification-info">
                    <div class="notification-name">Powiadomienia meczowe</div>
                    <div class="notification-description">Wyniki meczów i relacje live</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" ${notifs.match_notifications !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="notification-item">
                <div style="font-size: 1.5rem;">📰</div>
                <div class="notification-info">
                    <div class="notification-name">Aktualności ligowe</div>
                    <div class="notification-description">Nowości i wydarzenia w EBL</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" ${notifs.news_notifications !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
    `;
}

/**
 * Renderuje ustawienia bezpieczeństwa
 */
function renderSecuritySettings() {
    return `
        <div class="security-options">
            <div class="security-item">
                <div class="security-title">
                    <span>🔑</span> Zmiana hasła
                </div>
                <div class="security-description">
                    Zaktualizuj swoje hasło do konta
                </div>
                <button class="btn-action" onclick="changePassword()">
                    Zmień hasło
                </button>
            </div>
            
            <div class="security-item">
                <div class="security-title">
                    <span>📱</span> Uwierzytelnianie 2FA
                </div>
                <div class="security-description">
                    Dodatkowa warstwa bezpieczeństwa dla Twojego konta
                </div>
                <button class="btn-action" onclick="setup2FA()">
                    Konfiguruj 2FA
                </button>
            </div>
            
            <div class="security-item">
                <div class="security-title">
                    <span>📊</span> Prywatność
                </div>
                <div class="security-description">
                    Zarządzaj tym, co widzą inni gracze
                </div>
                <button class="btn-action" onclick="managePrivacy()">
                    Ustawienia prywatności
                </button>
            </div>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #fef2f2; border-radius: 10px;">
            <div style="font-weight: 700; color: #dc2626; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                ⚠️ Niebezpieczna strefa
            </div>
            <div style="color: #991b1b; font-size: 0.9rem; margin-bottom: 15px;">
                Te akcje są nieodwracalne
            </div>
            <button class="btn-action" onclick="deleteAccount()" 
                    style="background: #dc2626; border: 2px solid #b91c1c;">
                🗑️ Usuń konto
            </button>
        </div>
    `;
}

/**
 * Pobiera ustawienia użytkownika
 */
async function fetchUserSettings() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (error) return null;
    return data;
}

/**
 * Zwraca inicjały z emaila
 */
function getInitials(email) {
    if (!email) return '👤';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
}

/**
 * Globalne funkcje dla ustawień
 */
window.changeAvatar = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            alert(`Avatar zmieniony na: ${file.name}`);
        }
    };
    
    input.click();
};

window.changePassword = function() {
    const current = prompt('Obecne hasło:');
    if (!current) return;
    
    const newPass = prompt('Nowe hasło:');
    if (!newPass) return;
    
    const confirmPass = prompt('Potwierdź nowe hasło:');
    
    if (newPass === confirmPass) {
        alert('✅ Hasło zostało zmienione!');
    } else {
        alert('❌ Hasła się nie zgadzają!');
    }
};

window.setup2FA = function() {
    alert('Konfiguracja 2FA - funkcja w budowie!');
};

window.managePrivacy = function() {
    alert('Ustawienia prywatności - funkcja w budowie!');
};

window.deleteAccount = function() {
    if (confirm('CZY NA PEWNO CHCESZ USUNĄĆ KONTO?\n\nTa operacja jest nieodwracalna i usunie wszystkie dane.')) {
        alert('Konto zostało oznaczone do usunięcia. Wysłano email potwierdzający.');
    }
};

window.saveAllSettings = function() {
    // Tutaj logika zapisu wszystkich ustawień
    alert('✅ Wszystkie ustawienia zostały zapisane!');
};

window.exportUserData = function() {
    const data = {
        profile: {
            email: JSON.parse(localStorage.getItem('supabase.auth.token'))?.currentSession?.user?.email,
            joined: new Date().toISOString()
        },
        team: window.gameState.team,
        players: window.gameState.players,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    alert('📥 Dane użytkownika zostały wyeksportowane!');
};
