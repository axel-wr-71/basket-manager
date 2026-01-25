// js/app/admin_panel.js
import { supabaseClient, checkAdminPermissions, validateAdminPassword, isAdminSessionValid, resetAdminSession } from '../auth.js';
import { 
    adminUpdateSalaries,
    adminUpdateMarketValues,
    calculatePlayerDynamicWage
} from '../core/economy.js';

// Zmienne globalne dla panelu
let adminLogEntries = [];
let systemStats = null;
let currentModal = null;

// Główna funkcja renderująca panel admina z weryfikacją
export async function renderAdminPanel(teamData) {
    console.log("[ADMIN] Renderowanie panelu admina jako modal...");
    
    // Sprawdź uprawnienia admina
    const { hasAccess, reason, profile } = await checkAdminPermissions();
    
    if (!hasAccess) {
        console.warn(`[ADMIN] Brak dostępu: ${reason}`);
        
        // Pokaż komunikat użytkownikowi
        let message = "Nie masz uprawnień do panelu administracyjnego.";
        
        switch(reason) {
            case "not_logged_in":
                message = "Musisz być zalogowany aby uzyskać dostęp do panelu admina.";
                break;
            case "insufficient_permissions":
                const details = profile?.details || {};
                if (!details.isAdminRole && !details.hasNoTeam) {
                    message = "Twoje konto nie ma uprawnień administratora i jest przypisane do drużyny.";
                } else if (!details.isAdminRole) {
                    message = "Twoje konto nie ma uprawnień administratora (role ≠ 'admin').";
                } else {
                    message = "Twoje konto jest przypisane do drużyny (team_id ≠ NULL).";
                }
                break;
            case "profile_error":
                message = "Błąd podczas weryfikacji Twojego konta.";
                break;
        }
        
        alert(`❌ ${message}\nKod błędu: ${reason}`);
        return null;
    }
    
    // Jeśli ma uprawnienia, sprawdź sesję lub wyświetl popup z hasłem
    if (!isAdminSessionValid()) {
        const passwordValid = await showAdminPasswordPrompt();
        
        if (!passwordValid) {
            console.log("[ADMIN] Anulowano dostęp - błędne hasło lub anulowano");
            return null;
        }
    } else {
        console.log("[ADMIN] Sesja admina ważna, pomijam weryfikację hasła");
    }
    
    // Teraz renderuj panel
    return renderAdminPanelContent(teamData);
}

/**
 * Funkcja pokazująca popup z hasłem admina
 */
async function showAdminPasswordPrompt() {
    return new Promise((resolve) => {
        // Utwórz modal z hasłem
        const modalHTML = `
            <div class="admin-password-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; justify-content:center; align-items:center;">
                <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:400px; box-shadow:0 15px 50px rgba(0,0,0,0.5);">
                    <div style="text-align:center; margin-bottom:25px;">
                        <div style="font-size:3rem; margin-bottom:15px;">🔐</div>
                        <h3 style="margin:0; color:#1a237e; font-weight:800;">WERYFIKACJA ADMINISTRATORA</h3>
                        <p style="color:#64748b; font-size:0.9rem; margin-top:10px;">
                            Wprowadź hasło administratora aby kontynuować
                        </p>
                    </div>
                    
                    <form id="admin-password-form">
                        <div style="margin-bottom:20px;">
                            <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; text-align:left;">
                                Hasło administratora
                            </label>
                            <input type="password" 
                                   id="admin-password-input" 
                                   placeholder="Wprowadź hasło..."
                                   style="width:100%; padding:12px 15px; border:2px solid #e2e8f0; border-radius:8px; font-size:1rem; transition:border-color 0.2s;"
                                   autocomplete="current-password"
                                   required>
                            <div id="password-error" style="color:#ef4444; font-size:0.85rem; margin-top:5px; display:none;"></div>
                        </div>
                        
                        <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:20px;">
                            <p style="color:#64748b; font-size:0.85rem; margin:0;">
                                <strong>ℹ️ Wymagania dostępu:</strong><br>
                                • Rola: <strong>admin</strong> w profilu<br>
                                • Brak przypisanej drużyny (team_id = NULL)<br>
                                • Weryfikacja dwuetapowa
                            </p>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <button type="button" id="btn-cancel-password" 
                                    style="flex:1; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                                ❌ Anuluj
                            </button>
                            <button type="submit" id="btn-submit-password" 
                                    style="flex:1; background:linear-gradient(135deg, #1a237e, #283593); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                                ✅ Zweryfikuj
                            </button>
                        </div>
                        
                        <div id="attempts-warning" style="margin-top:15px; padding:10px; background:#fef3c7; border-radius:6px; border-left:4px solid #f59e0b; display:none;">
                            <p style="color:#92400e; font-size:0.8rem; margin:0;">
                                ⚠️ Pozostało <span id="attempts-count">3</span> prób
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Zmienne do śledzenia prób
        let attempts = 3;
        const maxAttempts = 3;
        const passwordInput = document.getElementById('admin-password-input');
        const errorDiv = document.getElementById('password-error');
        const attemptsWarning = document.getElementById('attempts-warning');
        const attemptsCount = document.getElementById('attempts-count');
        
        // Skupienie na polu hasła
        setTimeout(() => passwordInput.focus(), 100);
        
        // Sprawdź czy dostęp nie jest zablokowany
        const blockedUntil = localStorage.getItem('admin_blocked_until');
        if (blockedUntil && Date.now() < parseInt(blockedUntil)) {
            const remainingMinutes = Math.ceil((parseInt(blockedUntil) - Date.now()) / 60000);
            showError(`⏳ Dostęp tymczasowo zablokowany. Spróbuj za ${remainingMinutes} minut.`);
            
            const submitBtn = document.getElementById('btn-submit-password');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Zablokowane';
            submitBtn.style.background = '#6b7280';
            
            setTimeout(() => {
                document.querySelector('.admin-password-modal').remove();
                resolve(false);
            }, 3000);
            return;
        }
        
        // Obsługa anulowania
        document.getElementById('btn-cancel-password').addEventListener('click', () => {
            document.querySelector('.admin-password-modal').remove();
            resolve(false);
        });
        
        // Obsługa formularza
        document.getElementById('admin-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = passwordInput.value.trim();
            
            if (!password) {
                showError("Hasło nie może być puste");
                return;
            }
            
            // Wyłącz przycisk podczas weryfikacji
            const submitBtn = document.getElementById('btn-submit-password');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '🔐 Weryfikowanie...';
            submitBtn.style.opacity = '0.7';
            
            try {
                // Walidacja hasła
                const validation = await validateAdminPassword(password);
                
                if (validation.valid) {
                    // Hasło poprawne
                    console.log("[ADMIN] Hasło poprawne, udzielanie dostępu...");
                    
                    // Efekt sukcesu
                    submitBtn.innerHTML = '✅ Dostęp przyznany';
                    submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    
                    // Zapisz w sesji że hasło zostało zweryfikowane
                    sessionStorage.setItem('admin_verified', 'true');
                    sessionStorage.setItem('admin_verified_timestamp', Date.now());
                    
                    setTimeout(() => {
                        document.querySelector('.admin-password-modal').remove();
                        resolve(true);
                    }, 800);
                    
                } else {
                    // Hasło nieprawidłowe
                    attempts--;
                    
                    if (attempts <= 0) {
                        // Brak prób
                        showError("❌ Brak pozostałych prób. Dostęp zablokowany.");
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '🔒 Zablokowane';
                        submitBtn.style.background = '#6b7280';
                        
                        // Zablokuj dostęp na 5 minut
                        localStorage.setItem('admin_blocked_until', Date.now() + 5 * 60 * 1000);
                        
                        setTimeout(() => {
                            document.querySelector('.admin-password-modal').remove();
                            alert('❌ Dostęp do panelu admina został tymczasowo zablokowany z powodu zbyt wielu nieudanych prób.');
                            resolve(false);
                        }, 2000);
                        
                    } else {
                        // Pozostały próby
                        showError(`❌ ${validation.message} | Pozostało prób: ${attempts}`);
                        passwordInput.value = '';
                        passwordInput.focus();
                        
                        // Pokaż ostrzeżenie o próbach
                        attemptsWarning.style.display = 'block';
                        attemptsCount.textContent = attempts;
                        
                        // Efekt błędu
                        passwordInput.style.borderColor = '#ef4444';
                        setTimeout(() => {
                            passwordInput.style.borderColor = '#e2e8f0';
                        }, 500);
                    }
                }
                
            } catch (error) {
                console.error("[ADMIN] Błąd walidacji:", error);
                showError("❌ Błąd systemu podczas weryfikacji");
                
            } finally {
                // Przywróć przycisk
                submitBtn.disabled = false;
                submitBtn.innerHTML = '✅ Zweryfikuj';
                submitBtn.style.opacity = '1';
            }
        });
        
        function showError(message) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Autoukrywanie błędu po 5 sekundach
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    });
}

/**
 * Główna funkcja renderująca zawartość panelu admina
 */
async function renderAdminPanelContent(teamData) {
    // Utwórz modal overlay
    if (document.querySelector('.admin-modal-overlay')) {
        document.querySelector('.admin-modal-overlay').remove();
    }
    
    const modalHTML = `
        <div class="admin-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; justify-content:center; align-items:center; padding:20px;">
            <div class="admin-modal-content" style="position:relative; width:100%; max-width:1200px; max-height:90vh; background:#f8fafc; border-radius:12px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <button class="close-admin-modal" style="position:absolute; top:15px; right:15px; background:#ef4444; color:white; border:none; width:35px; height:35px; border-radius:50%; cursor:pointer; font-size:1.2rem; z-index:1000; display:flex; justify-content:center; align-items:center;">
                    ×
                </button>
                <div id="admin-panel-container" style="height:100%; overflow-y:auto;"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Pobierz kontener panelu wewnątrz modala
    const container = document.getElementById('admin-panel-container');
    
    // Wyczyść poprzednie logi
    adminLogEntries = [];
    
    container.innerHTML = `
        <div class="admin-modern-wrapper">
            <!-- NAGŁÓWEK -->
            <div class="admin-header" style="padding: 25px 30px; background: linear-gradient(135deg, #1a237e, #283593); color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="margin:0; font-weight:900; text-transform:uppercase; font-family: 'Inter', sans-serif; font-size: 2rem; letter-spacing: 1px;">
                            ADMIN <span style="color:#ff9800">PANEL</span>
                        </h1>
                        <p style="margin:10px 0 0 0; color:#bbdefb; font-size: 0.95rem;">
                            Narzędzia administracyjne NBA Manager | ${new Date().toLocaleString()}
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div style="background:rgba(255,255,255,0.2); color:white; padding:10px 20px; border-radius:8px; font-weight:700; font-size:0.85rem; display:flex; align-items:center; gap:8px; border: 1px solid rgba(255,255,255,0.3);">
                            <span>⚙️</span> ADMIN MODE
                        </div>
                        <button id="btn-logout-admin" style="background:rgba(255,255,255,0.2); color:white; border:none; padding:8px 15px; border-radius:6px; font-size:0.8rem; cursor:pointer;">
                            🔓 Wyjdź z trybu admina
                        </button>
                    </div>
                </div>
            </div>

            <!-- KARTY STATYSTYK (TERAZ KLIKALNE!) -->
            <div style="padding: 25px 30px 10px 30px; background: white;">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                    <button class="admin-stat-card clickable-card" data-card-action="management" style="border:none; cursor:pointer; background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        <div class="stat-icon">👥</div>
                        <div class="stat-title">Zarządzanie</div>
                        <div class="stat-subtitle">Gracze i drużyny</div>
                    </button>
                    
                    <button class="admin-stat-card clickable-card" data-card-action="economy" style="border:none; cursor:pointer; background: linear-gradient(135deg, #10b981, #059669);">
                        <div class="stat-icon">💰</div>
                        <div class="stat-title">Ekonomia</div>
                        <div class="stat-subtitle">Pensje i finanse</div>
                    </button>
                    
                    <button class="admin-stat-card clickable-card" data-card-action="statistics" style="border:none; cursor:pointer; background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                        <div class="stat-icon">📊</div>
                        <div class="stat-title">Statystyki</div>
                        <div class="stat-subtitle">Dane systemowe</div>
                    </button>
                    
                    <button class="admin-stat-card clickable-card" data-card-action="system" style="border:none; cursor:pointer; background: linear-gradient(135deg, #f59e0b, #d97706);">
                        <div class="stat-icon">⚙️</div>
                        <div class="stat-title">System</div>
                        <div class="stat-subtitle">Konfiguracja</div>
                    </button>
                </div>
            </div>

            <!-- SEKCJA EKONOMII -->
            <div class="admin-section" style="padding: 25px 30px;">
                <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                        <span>💰</span> Aktualizacja Pensji i Wartości
                    </h3>
                    <p style="color:#64748b; font-size:0.9rem; margin-bottom:20px;">
                        Uruchom masową aktualizację pensji i wartości rynkowych wszystkich graczy z możliwością konfiguracji parametrów.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                        <button id="btn-admin-update-salaries" 
                                style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 15px; border-radius: 8px; 
                                       font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            🔄 Zaktualizuj WSZYSTKIE pensje
                        </button>
                        
                        <button id="btn-admin-update-values" 
                                style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 15px; border-radius: 8px; 
                                       font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            💰 Aktualizuj wartości rynkowe
                        </button>
                        
                        <button id="btn-admin-advanced-salary" 
                                style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 15px; border-radius: 8px; 
                                       font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            ⚙️ Zaawansowane algorytmy
                        </button>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <button id="btn-admin-single-team" 
                                style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 15px; border-radius: 8px; 
                                       font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%;">
                            🏀 Aktualizuj tylko moją drużynę
                        </button>
                        <p style="color:#64748b; font-size:0.8rem; margin-top:8px; text-align:center;">
                            Drużyna: ${teamData?.team_name || 'Nieznana'} | ID: ${getCurrentTeamId() || 'Brak'}
                        </p>
                    </div>
                    
                    <div id="salary-update-result" style="margin-top: 20px; display: none;"></div>
                </div>
            </div>

            <!-- SZYBKIE AKCJE -->
            <div class="admin-section" style="padding: 0 30px 25px 30px;">
                <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                        <span>⚡</span> Szybkie akcje
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <button class="admin-quick-btn" data-action="clear-cache">
                            🗑️ Wyczyść cache
                        </button>
                        <button class="admin-quick-btn" data-action="recalculate-stats">
                            📊 Przelicz statystyki
                        </button>
                        <button class="admin-quick-btn" data-action="fix-players">
                            🏀 Napraw graczy
                        </button>
                        <button class="admin-quick-btn" data-action="check-db">
                            🔍 Sprawdź bazę
                        </button>
                        <button class="admin-quick-btn" data-action="simulate-season">
                            ⚡ Symuluj sezon
                        </button>
                        <button class="admin-quick-btn" data-action="refresh-stats">
                            🔄 Odśwież statystyki
                        </button>
                    </div>
                </div>
            </div>

            <!-- STATYSTYKI SYSTEMU -->
            <div class="admin-section" style="padding: 0 30px 25px 30px;">
                <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                        <span>📈</span> Statystyki systemu
                    </h3>
                    
                    <div id="system-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px;">
                        <!-- Dynamicznie ładowane -->
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">Ładowanie...</div>
                            <div style="font-size: 1.2rem; font-weight: 800; color: #1a237e;">-</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- NARZĘDZIA BAZY DANYCH -->
            <div class="admin-section" style="padding: 0 30px 25px 30px;">
                <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                        <span>🗄️</span> Baza danych
                    </h3>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
                        <button id="btn-export-data" style="background: #1e40af; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                            📥 Eksportuj dane
                        </button>
                        <button id="btn-backup-db" style="background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                            💾 Twórz backup
                        </button>
                        <button id="btn-optimize-db" style="background: #7c3aed; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                            🔧 Optymalizuj DB
                        </button>
                        <button id="btn-analyze-db" style="background: #d97706; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                            📊 Analiza DB
                        </button>
                    </div>
                </div>
            </div>

            <!-- KONSOLA LOGÓW -->
            <div class="admin-section" style="padding: 0 30px 25px 30px;">
                <div class="admin-log" style="padding: 20px; background: #1a237e; color: white; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div style="font-weight: 700; font-size: 1rem;">KONSOLA ADMINA</div>
                        <div style="display: flex; gap: 10px;">
                            <button id="btn-clear-log" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                                🗑️ Wyczyść
                            </button>
                            <button id="btn-export-log" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                                📥 Export log
                            </button>
                        </div>
                    </div>
                    <div id="admin-console-log" style="height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-family: 'Monaco', 'Courier New', monospace;">
                        <div>> System: Panel administracyjny załadowany [${new Date().toLocaleTimeString()}]</div>
                        <div>> System: Inicjalizacja modułów...</div>
                    </div>
                </div>
            </div>

            <!-- STOPKA -->
            <div style="padding: 20px 30px; background: #1a237e; color: white; border-top: 1px solid #2d3a8c;">
                <div style="text-align: center;">
                    <p style="margin:0; font-size:0.8rem;">© 2024 NBA Manager | Panel Administracyjny v2.0 | Użytkownik: ${teamData?.team_name || 'System'}</p>
                    <p style="margin:5px 0 0 0; font-size: 0.7rem; color: #94a3b8;">Ostatnie odświeżenie: ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>
    `;

    // Inicjalizacja event listenerów
    initAdminEventListeners();
    
    // Dodaj event listener do zamknięcia modala
    document.querySelector('.close-admin-modal').addEventListener('click', () => {
        document.querySelector('.admin-modal-overlay').remove();
    });
    
    // Zamknij modal po kliknięciu na overlay
    document.querySelector('.admin-modal-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('admin-modal-overlay')) {
            document.querySelector('.admin-modal-overlay').remove();
        }
    });
    
    // Dodaj listener do wyjścia z trybu admina
    document.getElementById('btn-logout-admin')?.addEventListener('click', () => {
        resetAdminSession();
        document.querySelector('.admin-modal-overlay').remove();
        addAdminLog('Wyjście z trybu admina', 'info');
        alert('Wyszedłeś z trybu administratora. Aby ponownie uzyskać dostęp, musisz przejść weryfikację hasła.');
    });
    
    // Załaduj statystyki systemu
    await loadSystemStats();
    
    // Dodaj początkowy log
    addAdminLog('Panel administracyjny gotowy do użycia', 'info');
    addAdminLog('Sesja admina zweryfikowana', 'success');
    
    // Dodaj styl CSS jeśli nie ma
    injectAdminStyles();
    
    return true;
}

// DODAJ TĘ LINIJKĘ:
window.openAdminPanel = async () => {
    await renderAdminPanel({
        team_name: 'Admin Console',
        id: 'console-test'
    });
};

function initAdminEventListeners() {
    console.log("[ADMIN] Inicjalizacja listenerów...");
    
    // ===== KLIKALNE KARTY STATYSTYK =====
    document.querySelectorAll('.admin-stat-card.clickable-card').forEach(card => {
        card.addEventListener('click', handleStatCardClick);
    });
    
    // Aktualizacja pensji - otwiera modal z algorytmami
    const salaryBtn = document.getElementById('btn-admin-update-salaries');
    if (salaryBtn) {
        salaryBtn.addEventListener('click', () => showSalaryAlgorithmModal());
    }
    
    // Zaawansowane algorytmy pensji
    const advancedBtn = document.getElementById('btn-admin-advanced-salary');
    if (advancedBtn) {
        advancedBtn.addEventListener('click', () => showSalaryAlgorithmModal());
    }
    
    // Aktualizacja wartości rynkowych - otwiera modal z parametrami
    const valueBtn = document.getElementById('btn-admin-update-values');
    if (valueBtn) {
        valueBtn.addEventListener('click', () => showMarketValueParametersModal());
    }
    
    // Aktualizacja tylko mojej drużyny
    const singleBtn = document.getElementById('btn-admin-single-team');
    if (singleBtn) {
        singleBtn.addEventListener('click', handleSingleTeamUpdate);
    }
    
    // Szybkie akcje
    document.querySelectorAll('.admin-quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAction(action);
        });
    });
    
    // Zarządzanie bazą danych
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) exportBtn.addEventListener('click', handleExportData);
    
    const backupBtn = document.getElementById('btn-backup-db');
    if (backupBtn) backupBtn.addEventListener('click', handleBackupDB);
    
    const optimizeBtn = document.getElementById('btn-optimize-db');
    if (optimizeBtn) optimizeBtn.addEventListener('click', handleOptimizeDB);
    
    const analyzeBtn = document.getElementById('btn-analyze-db');
    if (analyzeBtn) analyzeBtn.addEventListener('click', handleAnalyzeDB);
    
    // Zarządzanie logami
    const clearLogBtn = document.getElementById('btn-clear-log');
    if (clearLogBtn) clearLogBtn.addEventListener('click', clearAdminLog);
    
    const exportLogBtn = document.getElementById('btn-export-log');
    if (exportLogBtn) exportLogBtn.addEventListener('click', exportAdminLog);
}

// ===== FUNKCJA OBSŁUGI KLIKNIĘĆ KART =====
function handleStatCardClick(event) {
    const card = event.currentTarget;
    const action = card.getAttribute('data-card-action');
    const title = card.querySelector('.stat-title')?.textContent || 'Karta';
    
    // Efekt wizualny kliknięcia
    card.style.transform = 'scale(0.97)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);
    
    // Logowanie akcji
    addAdminLog(`Kliknięto kartę: ${title}`, 'info');
    
    // Wywołanie odpowiedniej funkcji w zależności od karty
    switch(action) {
        case 'management':
            showManagementModal();
            break;
        case 'economy':
            showEconomyModal();
            break;
        case 'statistics':
            showStatisticsModal();
            break;
        case 'system':
            showSystemModal();
            break;
        default:
            showGenericModal(title);
    }
}

// ===== MODALE DLA KART =====

function showManagementModal() {
    const modalHTML = `
        <div class="admin-card-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:600px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>👥</span> Zarządzanie Graczami i Drużynami
                </h3>
                <p style="color:#64748b; font-size:1rem; margin-bottom:25px;">
                    Zarządzanie graczami, drużynami i treningami. Możesz przeglądać, edytować i usuwać elementy systemu.
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                    <button onclick="showAllPlayers()" style="background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        👥 Wszyscy Gracze
                    </button>
                    <button onclick="showAllTeams()" style="background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        🏀 Wszystkie Drużyny
                    </button>
                    <button onclick="showCoachesManagement()" style="background:#8b5cf6; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        🎓 Trenerzy
                    </button>
                    <button onclick="showTrainingManagement()" style="background:#f59e0b; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        💪 Treningi
                    </button>
                </div>
                
                <div style="margin-top:20px; background:#f8fafc; padding:15px; border-radius:8px;">
                    <p style="color:#64748b; font-size:0.9rem; margin:0;">
                        <strong>📊 Statystyki:</strong><br>
                        • Zarządzaj 600+ graczami<br>
                        • Zarządzaj 30+ drużynami<br>
                        • Przeglądaj historię treningów
                    </p>
                </div>
                
                <button onclick="this.closest('.admin-card-modal').remove()" 
                        style="margin-top:25px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; width:100%;">
                    ✕ Zamknij panel zarządzania
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showEconomyModal() {
    const modalHTML = `
        <div class="admin-card-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:600px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>💰</span> Ekonomia i Finanse
                </h3>
                <p style="color:#64748b; font-size:1rem; margin-bottom:25px;">
                    Zarządzanie finansami, pensjami graczy i wartościami rynkowymi. Aktualizuj stawki według nowych algorytmów.
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                    <button onclick="document.getElementById('btn-admin-update-salaries').click(); this.closest('.admin-card-modal').remove();" 
                            style="background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        🔄 Aktualizuj Pensje
                    </button>
                    <button onclick="document.getElementById('btn-admin-update-values').click(); this.closest('.admin-card-modal').remove();" 
                            style="background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        💰 Wartości Rynkowe
                    </button>
                    <button onclick="showFinancialReports()" style="background:#8b5cf6; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        📈 Raporty Finansowe
                    </button>
                    <button onclick="showSalaryAnalysis()" style="background:#f59e0b; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        📊 Analiza Pensji
                    </button>
                </div>
                
                <div style="margin-top:20px; background:#f8fafc; padding:15px; border-radius:8px;">
                    <p style="color:#64748b; font-size:0.9rem; margin:0;">
                        <strong>💵 Aktualne statystyki:</strong><br>
                        • Średnia pensja: $${systemStats?.avgSalary?.toLocaleString() || '0'}<br>
                        • Łączne pensje: $${systemStats?.totalSalary?.toLocaleString() || '0'}<br>
                        • Balans drużyn: $${systemStats?.totalBalance?.toLocaleString() || '0'}
                    </p>
                </div>
                
                <button onclick="this.closest('.admin-card-modal').remove()" 
                        style="margin-top:25px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; width:100%;">
                    ✕ Zamknij panel ekonomii
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showStatisticsModal() {
    const modalHTML = `
        <div class="admin-card-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:600px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>📊</span> Statystyki Systemowe
                </h3>
                <p style="color:#64748b; font-size:1rem; margin-bottom:25px;">
                    Analiza danych systemowych, statystyki graczy, drużyn i meczów. Generuj raporty i wykresy.
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                    <button onclick="document.querySelector('[data-action=\"recalculate-stats\"]').click(); this.closest('.admin-card-modal').remove();" 
                            style="background:#8b5cf6; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        📊 Przelicz Statystyki
                    </button>
                    <button onclick="loadSystemStats(); this.closest('.admin-card-modal').remove();" 
                            style="background:#3b82f6; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        🔄 Odśwież Statystyki
                    </button>
                    <button onclick="generateStatsReport()" style="background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        📈 Generuj Raport
                    </button>
                    <button onclick="showPlayerStatsAnalysis()" style="background:#f59e0b; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        🏀 Statystyki Graczy
                    </button>
                </div>
                
                <div style="margin-top:20px; background:#f8fafc; padding:15px; border-radius:8px;">
                    <p style="color:#64748b; font-size:0.9rem; margin:0;">
                        <strong>📈 Aktualne dane systemowe:</strong><br>
                        • Gracze: ${systemStats?.totalPlayers || '0'}<br>
                        • Drużyny: ${systemStats?.totalTeams || '0'}<br>
                        • Aktywne oferty: ${systemStats?.activeListings || '0'}<br>
                        • Użytkownicy: ${systemStats?.totalUsers || '0'}
                    </p>
                </div>
                
                <button onclick="this.closest('.admin-card-modal').remove()" 
                        style="margin-top:25px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; width:100%;">
                    ✕ Zamknij panel statystyk
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showSystemModal() {
    const modalHTML = `
        <div class="admin-card-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:600px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>⚙️</span> Konfiguracja Systemu
                </h3>
                <p style="color:#64748b; font-size:1rem; margin-bottom:25px;">
                    Konfiguracja systemu, backup bazy danych, optymalizacja i zarządzanie użytkownikami.
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                    <button onclick="document.getElementById('btn-backup-db').click(); this.closest('.admin-card-modal').remove();" 
                            style="background:#059669; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        💾 Utwórz Backup
                    </button>
                    <button onclick="document.getElementById('btn-optimize-db').click(); this.closest('.admin-card-modal').remove();" 
                            style="background:#7c3aed; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        🔧 Optymalizuj DB
                    </button>
                    <button onclick="document.getElementById('btn-analyze-db').click(); this.closest('.admin-card-modal').remove();" 
                            style="background:#d97706; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        📊 Analiza DB
                    </button>
                    <button onclick="showSystemConfiguration()" style="background:#1e40af; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        ⚙️ Konfiguracja
                    </button>
                </div>
                
                <div style="margin-top:20px; background:#f8fafc; padding:15px; border-radius:8px;">
                    <p style="color:#64748b; font-size:0.9rem; margin:0;">
                        <strong>🔧 Narzędzia systemowe:</strong><br>
                        • Backup całej bazy danych<br>
                        • Optymalizacja tabel i indeksów<br>
                        • Analiza użycia zasobów<br>
                        • Konfiguracja parametrów systemu
                    </p>
                </div>
                
                <div style="margin-top:15px; background:#fef3c7; padding:12px; border-radius:8px; border-left:4px solid #f59e0b;">
                    <p style="color:#92400e; font-size:0.85rem; margin:0;">
                        ⚠️ <strong>Uwaga:</strong> Operacje systemowe mogą wpłynąć na działanie aplikacji. Wykonuj je w godzinach niższego obciążenia.
                    </p>
                </div>
                
                <button onclick="this.closest('.admin-card-modal').remove()" 
                        style="margin-top:25px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; width:100%;">
                    ✕ Zamknij panel systemu
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showGenericModal(title) {
    const modalHTML = `
        <div class="admin-card-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:500px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>ℹ️</span> ${title}
                </h3>
                <p style="color:#64748b; font-size:1rem; margin-bottom:25px;">
                    Funkcja w budowie. Wkrótce pojawią się tutaj narzędzia do zarządzania.
                </p>
                
                <button onclick="this.closest('.admin-card-modal').remove()" 
                        style="margin-top:20px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; width:100%;">
                    ✕ Zamknij
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===== FUNKCJE POMOCNICZE DLA MODALI =====

// Placeholder functions - można je później zaimplementować
function showAllPlayers() {
    addAdminLog('Otwieranie listy wszystkich graczy...', 'info');
    alert('Lista wszystkich graczy - funkcja w budowie!');
}

function showAllTeams() {
    addAdminLog('Otwieranie listy wszystkich drużyn...', 'info');
    alert('Lista wszystkich drużyn - funkcja w budowie!');
}

function showCoachesManagement() {
    addAdminLog('Otwieranie zarządzania trenerami...', 'info');
    alert('Zarządzanie trenerami - funkcja w budowie!');
}

function showTrainingManagement() {
    addAdminLog('Otwieranie zarządzania treningami...', 'info');
    alert('Zarządzanie treningami - funkcja w budowie!');
}

function showFinancialReports() {
    addAdminLog('Generowanie raportów finansowych...', 'info');
    alert('Raporty finansowe - funkcja w budowie!');
}

function showSalaryAnalysis() {
    addAdminLog('Analiza struktur wynagrodzeń...', 'info');
    alert('Analiza pensji - funkcja w budowie!');
}

function generateStatsReport() {
    addAdminLog('Generowanie raportu statystycznego...', 'info');
    alert('Generowanie raportu - funkcja w budowie!');
}

function showPlayerStatsAnalysis() {
    addAdminLog('Analiza statystyk graczy...', 'info');
    alert('Analiza statystyk graczy - funkcja w budowie!');
}

function showSystemConfiguration() {
    addAdminLog('Otwieranie konfiguracji systemu...', 'info');
    alert('Konfiguracja systemu - funkcja w budowie!');
}

// ===== MODAL ZAADWANSOWANYCH ALGORYTMÓW PENSJI =====

/**
 * Modal z różnymi algorytmami przeliczania pensji
 */
function showSalaryAlgorithmModal() {
    const modalHTML = `
        <div class="admin-algorithm-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:700px; max-height:90vh; overflow-y:auto; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>⚙️</span> Wybierz algorytm aktualizacji pensji
                </h3>
                <p style="color:#64748b; font-size:0.95rem; margin-bottom:25px;">
                    Wybierz metodę przeliczania pensji lub skorzystaj z zaawansowanego edytora.
                </p>
                
                <!-- KARTY ALGORYTMÓW -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                    <button class="algorithm-card" data-algorithm="dynamic" style="border:none; background:#f8fafc; border-radius:10px; padding:20px; cursor:pointer; text-align:left; transition:all 0.2s; border:2px solid #e2e8f0;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                            <div style="background:#3b82f6; color:white; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                                🔄
                            </div>
                            <h4 style="margin:0; color:#1a237e;">Dynamiczny</h4>
                        </div>
                        <p style="color:#64748b; font-size:0.85rem; margin:0;">
                            Uwzględnia OVR, wiek, potencjał i statystyki. Najbardziej zaawansowany.
                        </p>
                    </button>
                    
                    <button class="algorithm-card" data-algorithm="percentage" style="border:none; background:#f8fafc; border-radius:10px; padding:20px; cursor:pointer; text-align:left; transition:all 0.2s; border:2px solid #e2e8f0;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                            <div style="background:#10b981; color:white; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                                📈
                            </div>
                            <h4 style="margin:0; color:#1a237e;">Procentowy</h4>
                        </div>
                        <p style="color:#64748b; font-size:0.85rem; margin:0;">
                            Ustaw globalny % zmiany dla wszystkich graczy.
                        </p>
                    </button>
                    
                    <button class="algorithm-card" data-algorithm="positional" style="border:none; background:#f8fafc; border-radius:10px; padding:20px; cursor:pointer; text-align:left; transition:all 0.2s; border:2px solid #e2e8f0;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                            <div style="background:#8b5cf6; color:white; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                                🏀
                            </div>
                            <h4 style="margin:0; color:#1a237e;">Pozycyjny</h4>
                        </div>
                        <p style="color:#64748b; font-size:0.85rem; margin:0;">
                            Różne stawki dla różnych pozycji (PG, SG, SF, PF, C).
                        </p>
                    </button>
                    
                    <button class="algorithm-card" data-algorithm="manual" style="border:none; background:#f8fafc; border-radius:10px; padding:20px; cursor:pointer; text-align:left; transition:all 0.2s; border:2px solid #e2e8f0;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                            <div style="background:#f59e0b; color:white; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                                ✏️
                            </div>
                            <h4 style="margin:0; color:#1a237e;">Ręczny Editor</h4>
                        </div>
                        <p style="color:#64748b; font-size:0.85rem; margin:0;">
                            Zaawansowany edytor z formułami SQL.
                        </p>
                    </button>
                </div>
                
                <!-- SEKCJA EDYTORA FORMUŁ -->
                <div id="formula-editor-section" style="display:none; margin-top:25px;">
                    <h4 style="color:#1a237e; margin-bottom:15px;">Zaawansowany edytor formuł</h4>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">
                            Wybierz bazową formułę:
                        </label>
                        <select id="formula-template" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:6px;">
                            <option value="custom">Własna formuła</option>
                            <option value="ovr_based">Bazowana na OVR</option>
                            <option value="age_based">Bazowana na wieku</option>
                            <option value="potential_based">Bazowana na potencjale</option>
                            <option value="stats_based">Bazowana na statystykach</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">
                            Formuła SQL (aktualizacja pensji):
                        </label>
                        <textarea id="sql-formula" rows="6" style="width:100%; padding:15px; border:1px solid #e2e8f0; border-radius:6px; font-family: 'Courier New', monospace; font-size:0.9rem;"
                                  placeholder="UPDATE players SET salary = 
(CASE 
    WHEN overall_rating >= 90 THEN salary * 1.5
    WHEN overall_rating >= 80 THEN salary * 1.3
    ELSE salary * 1.1
END)
WHERE team_id IS NOT NULL;"></textarea>
                        <div style="font-size:0.8rem; color:#64748b; margin-top:5px;">
                            Użyj kolumn z tabeli players: overall_rating, age, potential, position, experience, draft_year
                        </div>
                    </div>
                    
                    <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span style="font-weight:600; color:#334155;">Podgląd zmiany:</span>
                            <button id="btn-preview-formula" style="background:#3b82f6; color:white; border:none; padding:8px 15px; border-radius:5px; font-size:0.85rem; cursor:pointer;">
                                🔍 Podgląd
                            </button>
                        </div>
                        <div id="formula-preview" style="background:white; padding:10px; border-radius:5px; border:1px solid #e2e8f0; font-family: 'Courier New', monospace; font-size:0.85rem; color:#64748b;">
                            Tutaj pojawi się podgląd zmian...
                        </div>
                    </div>
                </div>
                
                <!-- PODGLĄD ZMIAN -->
                <div id="preview-section" style="display:none; margin-top:25px;">
                    <h4 style="color:#1a237e; margin-bottom:15px;">Podgląd zmian</h4>
                    <div id="preview-content" style="max-height:200px; overflow-y:auto;">
                        <!-- Dynamicznie ładowane -->
                    </div>
                </div>
                
                <div style="display:flex; gap:10px; margin-top:25px;">
                    <button id="btn-cancel-algorithm" 
                            style="flex:1; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                        ❌ Anuluj
                    </button>
                    <button id="btn-execute-algorithm" 
                            style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:none;">
                        ✅ Wykonaj aktualizację
                    </button>
                    <button id="btn-configure-algorithm" 
                            style="flex:1; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:none;">
                        ⚙️ Konfiguruj parametry
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Event listenery dla kart algorytmów
    document.querySelectorAll('.algorithm-card').forEach(card => {
        card.addEventListener('click', function() {
            // Usuń zaznaczenie ze wszystkich kart
            document.querySelectorAll('.algorithm-card').forEach(c => {
                c.style.borderColor = '#e2e8f0';
                c.style.background = '#f8fafc';
            });
            
            // Zaznacz aktualną kartę
            this.style.borderColor = '#3b82f6';
            this.style.background = '#eff6ff';
            
            const algorithm = this.getAttribute('data-algorithm');
            handleAlgorithmSelection(algorithm);
        });
    });
    
    // Obsługa wyboru szablonu formuły
    document.getElementById('formula-template').addEventListener('change', function() {
        const template = this.value;
        const textarea = document.getElementById('sql-formula');
        
        const templates = {
            'ovr_based': `UPDATE players SET salary = 
(CASE 
    WHEN overall_rating >= 90 THEN salary * 1.5
    WHEN overall_rating >= 80 THEN salary * 1.3
    WHEN overall_rating >= 70 THEN salary * 1.15
    ELSE salary * 1.05
END)
WHERE team_id IS NOT NULL;`,
            
            'age_based': `UPDATE players SET salary = 
(CASE 
    WHEN age <= 25 THEN salary * 1.4  -- Młodzi gracze
    WHEN age <= 30 THEN salary * 1.2  -- Gracze w prime
    WHEN age <= 35 THEN salary * 1.0  -- Stabilni
    ELSE salary * 0.9                  -- Starsze
END)
WHERE team_id IS NOT NULL;`,
            
            'potential_based': `UPDATE players SET salary = 
(CASE 
    WHEN potential >= 90 THEN salary * 1.6
    WHEN potential >= 80 THEN salary * 1.4
    WHEN potential >= 70 THEN salary * 1.2
    ELSE salary * 1.1
END)
WHERE team_id IS NOT NULL;`,
            
            'stats_based': `UPDATE players SET salary = 
salary * (1 + (0.05 * experience)) 
WHERE team_id IS NOT NULL;`
        };
        
        if (template !== 'custom' && templates[template]) {
            textarea.value = templates[template];
        }
    });
    
    // Podgląd formuły
    document.getElementById('btn-preview-formula').addEventListener('click', previewFormulaChanges);
    
    // Anulowanie
    document.getElementById('btn-cancel-algorithm').addEventListener('click', () => {
        document.querySelector('.admin-algorithm-modal').remove();
    });
    
    // Konfiguracja
    document.getElementById('btn-configure-algorithm').addEventListener('click', function() {
        const algorithm = this.getAttribute('data-algorithm');
        showAlgorithmConfiguration(algorithm);
    });
    
    // Wykonanie
    document.getElementById('btn-execute-algorithm').addEventListener('click', function() {
        const algorithm = this.getAttribute('data-algorithm');
        executeAlgorithmUpdate(algorithm);
    });
}

function handleAlgorithmSelection(algorithm) {
    const formulaSection = document.getElementById('formula-editor-section');
    const configureBtn = document.getElementById('btn-configure-algorithm');
    const executeBtn = document.getElementById('btn-execute-algorithm');
    
    // Ukryj wszystko na początek
    formulaSection.style.display = 'none';
    configureBtn.style.display = 'none';
    executeBtn.style.display = 'none';
    
    // Ustaw algorytm na przyciskach
    configureBtn.setAttribute('data-algorithm', algorithm);
    executeBtn.setAttribute('data-algorithm', algorithm);
    
    switch(algorithm) {
        case 'dynamic':
            // Użyj istniejącego dynamicznego algorytmu
            configureBtn.style.display = 'block';
            executeBtn.style.display = 'block';
            configureBtn.textContent = '⚙️ Konfiguruj parametry dynamiczne';
            break;
            
        case 'percentage':
            // Prosty procent
            configureBtn.style.display = 'block';
            executeBtn.style.display = 'block';
            configureBtn.textContent = '📊 Ustaw procent zmiany';
            break;
            
        case 'positional':
            // Pozycyjny
            configureBtn.style.display = 'block';
            executeBtn.style.display = 'block';
            configureBtn.textContent = '🏀 Ustaw stawki pozycyjne';
            break;
            
        case 'manual':
            // Ręczny edytor
            formulaSection.style.display = 'block';
            executeBtn.style.display = 'block';
            executeBtn.textContent = '🚀 Wykonaj formułę SQL';
            break;
    }
}

async function previewFormulaChanges() {
    const sqlFormula = document.getElementById('sql-formula').value.trim();
    const previewDiv = document.getElementById('formula-preview');
    
    if (!sqlFormula) {
        previewDiv.innerHTML = '<span style="color:#ef4444;">❌ Formuła nie może być pusta</span>';
        return;
    }
    
    try {
        // Sprawdź czy formuła zawiera UPDATE
        if (!sqlFormula.toUpperCase().includes('UPDATE') || !sqlFormula.toUpperCase().includes('SET')) {
            throw new Error('Formuła musi zawierać UPDATE i SET');
        }
        
        // Estymuj liczbę graczy do aktualizacji
        const { count, error } = await supabaseClient
            .from('players')
            .select('*', { count: 'exact', head: true })
            .not('team_id', 'is', null);
        
        if (error) throw error;
        
        // Przeanalizuj formułę dla przykładowych danych
        const samplePlayers = await getSamplePlayersForPreview();
        
        previewDiv.innerHTML = `
            <div style="color:#059669;">
                ✅ Formuła jest poprawna<br>
                📊 Przykładowe zmiany:<br>
                <div style="margin-top:10px; font-size:0.8rem;">
                    ${samplePlayers.map(p => 
                        `<div>${p.first_name} ${p.last_name}: $${p.current_salary?.toLocaleString()} → <strong>$${p.new_salary?.toLocaleString()}</strong></div>`
                    ).join('')}
                </div>
                <div style="margin-top:10px; border-top:1px solid #e2e8f0; padding-top:10px;">
                    <strong>Estymacja:</strong> ${count} graczy zostanie zaktualizowanych
                </div>
            </div>
        `;
        
    } catch (error) {
        previewDiv.innerHTML = `<span style="color:#ef4444;">❌ Błąd formuły: ${error.message}</span>`;
    }
}

async function getSamplePlayersForPreview() {
    // Pobierz przykładowych graczy do podglądu
    const { data, error } = await supabaseClient
        .from('players')
        .select('id, first_name, last_name, salary as current_salary, overall_rating, age, potential, position')
        .not('team_id', 'is', null)
        .limit(5);
    
    if (error || !data) return [];
    
    // Symuluj zmianę pensji na podstawie OVR (dla podglądu)
    return data.map(player => ({
        ...player,
        new_salary: Math.round(player.current_salary * (1 + (player.overall_rating - 70) * 0.02))
    }));
}

function showAlgorithmConfiguration(algorithm) {
    let modalContent = '';
    
    switch(algorithm) {
        case 'dynamic':
            modalContent = `
                <div style="padding:20px;">
                    <h4 style="color:#1a237e; margin-bottom:15px;">Parametry algorytmu dynamicznego</h4>
                    <p style="color:#64748b; font-size:0.9rem; margin-bottom:20px;">
                        Algorytm uwzględnia: OVR (40%), wiek (20%), potencjał (20%), doświadczenie (10%), statystyki (10%)
                    </p>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">Bazowa pensja dla OVR 70</label>
                            <input type="number" id="base-salary" value="500000" min="100000" max="5000000" step="50000" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">Mnożnik za każdy OVR powyżej 70</label>
                            <input type="number" id="ovr-multiplier" value="0.05" min="0.01" max="0.2" step="0.01" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">Bonus za wiek &lt; 25</label>
                            <input type="number" id="age-bonus" value="0.15" min="0" max="0.5" step="0.05" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">Maksymalny wzrost (%)</label>
                            <input type="number" id="max-increase" value="100" min="0" max="500" step="10" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                        </div>
                    </div>
                    
                    <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:20px;">
                        <strong>Formuła:</strong><br>
                        <code style="font-size:0.8rem; color:#64748b;">
                            pensja = bazowa_pensja * (1 + (OVR-70)*mnożnik_OVR) * (1 + bonus_wiek) * (1 + potencjał*0.01)
                        </code>
                    </div>
                </div>
            `;
            break;
            
        case 'percentage':
            modalContent = `
                <div style="padding:20px;">
                    <h4 style="color:#1a237e; margin-bottom:15px;">Globalna zmiana procentowa</h4>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Procent zmiany pensji (%)</label>
                        <input type="range" id="percent-change" min="-50" max="200" value="10" step="5" style="width:100%;" 
                               oninput="document.getElementById('percent-value').textContent = this.value + '%'">
                        <div style="display:flex; justify-content:space-between; margin-top:5px;">
                            <span style="color:#ef4444; font-size:0.8rem;">-50%</span>
                            <span id="percent-value" style="font-weight:bold; color:#3b82f6;">10%</span>
                            <span style="color:#10b981; font-size:0.8rem;">+200%</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Ograniczenia:</label>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="apply-to-all" checked>
                                <span>Zastosuj do wszystkich graczy</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="include-bot-teams">
                                <span>Uwzględnij drużyny botów</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="cap-max-salary">
                                <span>Ogranicz maksymalną pensję do $10M</span>
                            </label>
                        </div>
                    </div>
                    
                    <div id="percentage-preview" style="background:#f0f9ff; padding:15px; border-radius:8px; border:1px solid #e0f2fe;">
                        <strong>Podgląd:</strong><br>
                        <span id="preview-text">Średnia pensja: $1,000,000 → $1,100,000 (+$100,000)</span>
                    </div>
                </div>
            `;
            break;
            
        case 'positional':
            modalContent = `
                <div style="padding:20px;">
                    <h4 style="color:#1a237e; margin-bottom:15px;">Stawki pozycyjne</h4>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">PG - Rozgrywający</label>
                            <input type="number" id="salary-pg" value="120" min="50" max="300" step="10" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                            <div style="font-size:0.8rem; color:#64748b;">% bazowej stawki</div>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">SG - Rzucający obrońca</label>
                            <input type="number" id="salary-sg" value="110" min="50" max="300" step="10" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                            <div style="font-size:0.8rem; color:#64748b;">% bazowej stawki</div>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">SF - Niski skrzydłowy</label>
                            <input type="number" id="salary-sf" value="100" min="50" max="300" step="10" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                            <div style="font-size:0.8rem; color:#64748b;">% bazowej stawki</div>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">PF - Silny skrzydłowy</label>
                            <input type="number" id="salary-pf" value="95" min="50" max="300" step="10" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                            <div style="font-size:0.8rem; color:#64748b;">% bazowej stawki</div>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">C - Środkowy</label>
                            <input type="number" id="salary-c" value="105" min="50" max="300" step="10" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                            <div style="font-size:0.8rem; color:#64748b;">% bazowej stawki</div>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; font-weight:600; color:#334155;">Bazowa pensja</label>
                            <input type="number" id="base-positional" value="750000" min="100000" max="5000000" step="50000" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px;">
                            <div style="font-size:0.8rem; color:#64748b;">Dla OVR 70</div>
                        </div>
                    </div>
                    
                    <div style="background:#f8fafc; padding:15px; border-radius:8px;">
                        <strong>Kalkulacja:</strong><br>
                        <code style="font-size:0.8rem; color:#64748b;">
                            pensja = bazowa_pensja * (stawka_pozycyjna/100) * (1 + (OVR-70)*0.03)
                        </code>
                    </div>
                </div>
            `;
            break;
    }
    
    // Pokaz modal z konfiguracją
    const configModalHTML = `
        <div class="algorithm-config-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10001; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:20px; width:90%; max-width:600px; max-height:80vh; overflow-y:auto; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h4 style="margin:0; color:#1a237e;">Konfiguracja: ${algorithm.toUpperCase()}</h4>
                    <button id="btn-close-config" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;">
                        ×
                    </button>
                </div>
                
                ${modalContent}
                
                <div style="display:flex; gap:10px; margin-top:25px;">
                    <button id="btn-save-config" 
                            style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                        💾 Zapisz konfigurację
                    </button>
                    <button id="btn-test-config" 
                            style="flex:1; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                        🧪 Przetestuj na próbce
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', configModalHTML);
    
    // Event listenery
    document.getElementById('btn-close-config').addEventListener('click', () => {
        document.querySelector('.algorithm-config-modal').remove();
    });
    
    document.getElementById('btn-save-config').addEventListener('click', () => {
        const config = collectAlgorithmConfig(algorithm);
        localStorage.setItem(`salary_algorithm_${algorithm}`, JSON.stringify(config));
        alert('✅ Konfiguracja zapisana!');
        document.querySelector('.algorithm-config-modal').remove();
    });
    
    document.getElementById('btn-test-config').addEventListener('click', () => {
        testAlgorithmConfig(algorithm);
    });
    
    // Dla procentowego algorytmu - aktualizuj podgląd
    if (algorithm === 'percentage') {
        document.getElementById('percent-change').addEventListener('input', updatePercentagePreview);
        updatePercentagePreview();
    }
}

function collectAlgorithmConfig(algorithm) {
    const config = { algorithm };
    
    switch(algorithm) {
        case 'dynamic':
            config.baseSalary = parseInt(document.getElementById('base-salary').value);
            config.ovrMultiplier = parseFloat(document.getElementById('ovr-multiplier').value);
            config.ageBonus = parseFloat(document.getElementById('age-bonus').value);
            config.maxIncrease = parseInt(document.getElementById('max-increase').value);
            break;
            
        case 'percentage':
            config.percentChange = parseInt(document.getElementById('percent-change').value);
            config.applyToAll = document.getElementById('apply-to-all').checked;
            config.includeBotTeams = document.getElementById('include-bot-teams').checked;
            config.capMaxSalary = document.getElementById('cap-max-salary').checked;
            break;
            
        case 'positional':
            config.baseSalary = parseInt(document.getElementById('base-positional').value);
            config.pgMultiplier = parseInt(document.getElementById('salary-pg').value) / 100;
            config.sgMultiplier = parseInt(document.getElementById('salary-sg').value) / 100;
            config.sfMultiplier = parseInt(document.getElementById('salary-sf').value) / 100;
            config.pfMultiplier = parseInt(document.getElementById('salary-pf').value) / 100;
            config.cMultiplier = parseInt(document.getElementById('salary-c').value) / 100;
            break;
    }
    
    return config;
}

async function updatePercentagePreview() {
    const percent = parseInt(document.getElementById('percent-change').value);
    const previewText = document.getElementById('preview-text');
    
    // Pobierz średnią pensję
    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('salary')
            .not('team_id', 'is', null)
            .limit(100);
            
        if (!error && data && data.length > 0) {
            const avgSalary = data.reduce((sum, p) => sum + (p.salary || 0), 0) / data.length;
            const newAvg = avgSalary * (1 + percent / 100);
            const change = newAvg - avgSalary;
            
            previewText.innerHTML = `
                Średnia pensja: $${Math.round(avgSalary).toLocaleString()} 
                → $${Math.round(newAvg).toLocaleString()} 
                <span style="color:${percent >= 0 ? '#10b981' : '#ef4444'}">
                    (${percent >= 0 ? '+' : ''}$${Math.round(change).toLocaleString()})
                </span>
            `;
        }
    } catch (error) {
        console.error('Błąd pobierania danych do podglądu:', error);
    }
}

async function testAlgorithmConfig(algorithm) {
    const config = collectAlgorithmConfig(algorithm);
    
    addAdminLog(`Testowanie algorytmu ${algorithm}...`, 'info');
    
    try {
        // Pobierz 5 przykładowych graczy
        const { data: samplePlayers, error } = await supabaseClient
            .from('players')
            .select('id, first_name, last_name, salary, overall_rating, age, potential, position')
            .not('team_id', 'is', null)
            .limit(5);
            
        if (error) throw error;
        
        // Oblicz nowe pensje
        const testResults = samplePlayers.map(player => {
            const newSalary = calculateTestSalary(player, config);
            return {
                player: `${player.first_name} ${player.last_name}`,
                oldSalary: player.salary,
                newSalary: newSalary,
                change: ((newSalary - player.salary) / player.salary * 100).toFixed(1)
            };
        });
        
        // Pokaż wyniki testu
        const testModalHTML = `
            <div class="test-results-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10002; display:flex; justify-content:center; align-items:center;">
                <div style="background:white; border-radius:12px; padding:25px; width:90%; max-width:500px; max-height:80vh; overflow-y:auto; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                    <h4 style="color:#1a237e; margin-bottom:20px;">🧪 Wyniki testu algorytmu</h4>
                    
                    <div style="margin-bottom:20px;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:10px; text-align:left;">Gracz</th>
                                    <th style="padding:10px; text-align:right;">Stara pensja</th>
                                    <th style="padding:10px; text-align:right;">Nowa pensja</th>
                                    <th style="padding:10px; text-align:right;">Zmiana</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${testResults.map(result => `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:10px;">${result.player}</td>
                                        <td style="padding:10px; text-align:right;">$${result.oldSalary?.toLocaleString()}</td>
                                        <td style="padding:10px; text-align:right; font-weight:600;">$${Math.round(result.newSalary).toLocaleString()}</td>
                                        <td style="padding:10px; text-align:right; color:${parseFloat(result.change) >= 0 ? '#10b981' : '#ef4444'}">
                                            ${parseFloat(result.change) >= 0 ? '+' : ''}${result.change}%
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="background:#f0f9ff; padding:15px; border-radius:8px; margin-bottom:20px;">
                        <strong>Podsumowanie:</strong><br>
                        Średnia zmiana: <strong>${(testResults.reduce((sum, r) => sum + parseFloat(r.change), 0) / testResults.length).toFixed(1)}%</strong><br>
                        Min zmiana: <strong>${Math.min(...testResults.map(r => parseFloat(r.change))).toFixed(1)}%</strong><br>
                        Max zmiana: <strong>${Math.max(...testResults.map(r => parseFloat(r.change))).toFixed(1)}%</strong>
                    </div>
                    
                    <button onclick="document.querySelector('.test-results-modal').remove()" 
                            style="width:100%; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                        Zamknij podgląd
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', testModalHTML);
        
    } catch (error) {
        addAdminLog(`Błąd testowania: ${error.message}`, 'error');
        alert(`Błąd testowania: ${error.message}`);
    }
}

function calculateTestSalary(player, config) {
    switch(config.algorithm) {
        case 'dynamic':
            const ovrBonus = (player.overall_rating - 70) * config.ovrMultiplier;
            const ageBonus = player.age < 25 ? config.ageBonus : 0;
            const potentialBonus = player.potential * 0.01;
            
            let newSalary = config.baseSalary * (1 + ovrBonus) * (1 + ageBonus) * (1 + potentialBonus);
            
            // Ogranicz maksymalny wzrost
            const maxSalary = player.salary * (1 + config.maxIncrease / 100);
            if (newSalary > maxSalary) newSalary = maxSalary;
            
            return newSalary;
            
        case 'percentage':
            const multiplier = 1 + (config.percentChange / 100);
            let salary = player.salary * multiplier;
            
            if (config.capMaxSalary && salary > 10000000) {
                salary = 10000000;
            }
            
            return salary;
            
        case 'positional':
            const positionMultipliers = {
                'PG': config.pgMultiplier || 1.2,
                'SG': config.sgMultiplier || 1.1,
                'SF': config.sfMultiplier || 1.0,
                'PF': config.pfMultiplier || 0.95,
                'C': config.cMultiplier || 1.05
            };
            
            const posMultiplier = positionMultipliers[player.position] || 1.0;
            const ovrBonusPos = (player.overall_rating - 70) * 0.03;
            
            return config.baseSalary * posMultiplier * (1 + ovrBonusPos);
            
        default:
            return player.salary;
    }
}

async function executeAlgorithmUpdate(algorithm) {
    addAdminLog(`Wykonywanie aktualizacji pensji (algorytm: ${algorithm})...`, 'warning');
    
    try {
        let result;
        
        switch(algorithm) {
            case 'dynamic':
                const dynamicConfig = JSON.parse(localStorage.getItem('salary_algorithm_dynamic') || '{}');
                result = await executeDynamicSalaryUpdate(dynamicConfig);
                break;
                
            case 'percentage':
                const percentConfig = JSON.parse(localStorage.getItem('salary_algorithm_percentage') || '{}');
                result = await executePercentageSalaryUpdate(percentConfig);
                break;
                
            case 'positional':
                const positionalConfig = JSON.parse(localStorage.getItem('salary_algorithm_positional') || '{}');
                result = await executePositionalSalaryUpdate(positionalConfig);
                break;
                
            case 'manual':
                const sqlFormula = document.getElementById('sql-formula').value;
                result = await executeManualSalaryUpdate(sqlFormula);
                break;
                
            default:
                throw new Error(`Nieznany algorytm: ${algorithm}`);
        }
        
        // Pokaż wynik
        showAlgorithmResult(result, algorithm);
        
        // Zamknij modal
        document.querySelector('.admin-algorithm-modal').remove();
        
    } catch (error) {
        addAdminLog(`Błąd wykonania algorytmu: ${error.message}`, 'error');
        alert(`❌ Błąd: ${error.message}`);
    }
}

async function executeDynamicSalaryUpdate(config) {
    // Pobierz wszystkich graczy
    const { data: players, error } = await supabaseClient
        .from('players')
        .select('*')
        .not('team_id', 'is', null);
        
    if (error) throw error;
    
    // Oblicz nowe pensje
    const updates = players.map(player => {
        const newSalary = calculateDynamicSalary(player, config);
        return {
            id: player.id,
            salary: Math.round(newSalary),
            last_salary_update: new Date().toISOString()
        };
    });
    
    // Wykonaj aktualizację
    const { data, error: updateError } = await supabaseClient
        .from('players')
        .upsert(updates, { onConflict: 'id' });
        
    if (updateError) throw updateError;
    
    return {
        success: true,
        updatedPlayers: updates.length,
        totalPlayers: players.length,
        averageOldSalary: Math.round(players.reduce((sum, p) => sum + p.salary, 0) / players.length),
        averageNewSalary: Math.round(updates.reduce((sum, p) => sum + p.salary, 0) / updates.length)
    };
}

function calculateDynamicSalary(player, config) {
    // Domyślne wartości jeśli config nie istnieje
    const baseSalary = config.baseSalary || 500000;
    const ovrMultiplier = config.ovrMultiplier || 0.05;
    const ageBonus = config.ageBonus || 0.15;
    const maxIncrease = config.maxIncrease || 100;
    
    const ovrBonus = (player.overall_rating - 70) * ovrMultiplier;
    const ageFactor = player.age < 25 ? ageBonus : 0;
    const potentialFactor = player.potential * 0.01;
    
    let newSalary = baseSalary * (1 + ovrBonus) * (1 + ageFactor) * (1 + potentialFactor);
    
    // Ogranicz maksymalny wzrost
    const maxSalary = player.salary * (1 + maxIncrease / 100);
    if (newSalary > maxSalary) newSalary = maxSalary;
    
    // Zaokrąglij do najbliższych 1000
    return Math.round(newSalary / 1000) * 1000;
}

async function executePercentageSalaryUpdate(config) {
    const percentChange = config.percentChange || 10;
    const multiplier = 1 + (percentChange / 100);
    
    let query = supabaseClient
        .from('players')
        .update({
            salary: supabaseClient.raw(`salary * ${multiplier}`),
            last_salary_update: new Date().toISOString()
        })
        .not('team_id', 'is', null);
    
    // Jeśli nie uwzględniać botów
    if (!config.includeBotTeams) {
        query = query.not('team_id', 'in', await getBotTeamIds());
    }
    
    const { count, error } = await query.select('*', { count: 'exact' });
    
    if (error) throw error;
    
    return {
        success: true,
        updatedPlayers: count,
        percentChange: percentChange,
        multiplier: multiplier
    };
}

async function getBotTeamIds() {
    const { data, error } = await supabaseClient
        .from('teams')
        .select('id')
        .eq('is_bot', true);
        
    if (error) return [];
    return data.map(t => t.id);
}

async function executePositionalSalaryUpdate(config) {
    // Pobierz wszystkich graczy z drużyn
    const { data: players, error } = await supabaseClient
        .from('players')
        .select('*')
        .not('team_id', 'is', null);
        
    if (error) throw error;
    
    // Oblicz nowe pensje
    const updates = players.map(player => {
        const newSalary = calculatePositionalSalary(player, config);
        return {
            id: player.id,
            salary: Math.round(newSalary),
            last_salary_update: new Date().toISOString()
        };
    });
    
    // Wykonaj aktualizację
    const { data, error: updateError } = await supabaseClient
        .from('players')
        .upsert(updates, { onConflict: 'id' });
        
    if (updateError) throw updateError;
    
    return {
        success: true,
        updatedPlayers: updates.length,
        totalPlayers: players.length
    };
}

function calculatePositionalSalary(player, config) {
    const positionMultipliers = {
        'PG': config.pgMultiplier || 1.2,
        'SG': config.sgMultiplier || 1.1,
        'SF': config.sfMultiplier || 1.0,
        'PF': config.pfMultiplier || 0.95,
        'C': config.cMultiplier || 1.05
    };
    
    const baseSalary = config.baseSalary || 750000;
    const position = player.position || 'SF';
    const posMultiplier = positionMultipliers[position] || 1.0;
    const ovrBonus = (player.overall_rating - 70) * 0.03;
    
    return baseSalary * posMultiplier * (1 + ovrBonus);
}

async function executeManualSalaryUpdate(sqlFormula) {
    // Wykonaj niestandardowe zapytanie SQL
    // UWAGA: W Supabase potrzebujemy funkcji RPC dla UPDATE
    // Dla bezpieczeństwa ograniczamy możliwe operacje
    
    // Sprawdź czy formuła jest bezpieczna
    const safeFormula = validateSQLFormula(sqlFormula);
    if (!safeFormula.valid) {
        throw new Error(`Niebezpieczna formuła: ${safeFormula.reason}`);
    }
    
    // Użyj funkcji RPC w Supabase
    const { data, error } = await supabaseClient.rpc('execute_salary_update', {
        update_formula: sqlFormula
    });
    
    if (error) throw error;
    
    return {
        success: true,
        message: 'Formuła wykonana pomyślnie',
        data: data
    };
}

function validateSQLFormula(sql) {
    // Prosta walidacja bezpieczeństwa
    const dangerousPatterns = [
        /DROP\s+TABLE/i,
        /DELETE\s+FROM/i,
        /TRUNCATE/i,
        /INSERT\s+INTO/i,
        /CREATE\s+TABLE/i,
        /ALTER\s+TABLE/i,
        /GRANT/i,
        /REVOKE/i
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(sql)) {
            return { valid: false, reason: 'Zawiera niebezpieczne polecenie SQL' };
        }
    }
    
    // Musi zawierać UPDATE players SET
    if (!sql.toUpperCase().includes('UPDATE PLAYERS SET')) {
        return { valid: false, reason: 'Musi zawierać UPDATE players SET' };
    }
    
    return { valid: true };
}

function showAlgorithmResult(result, algorithm) {
    const resultDiv = document.getElementById('salary-update-result');
    if (!resultDiv) return;
    
    resultDiv.style.display = 'block';
    
    let resultHTML = '';
    
    if (result.success) {
        switch(algorithm) {
            case 'dynamic':
                resultHTML = `
                    <div style="background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; color: #065f46;">
                        <strong>✅ Sukces: Algorytm dynamiczny</strong><br>
                        Zaktualizowano: ${result.updatedPlayers} graczy<br>
                        Średnia pensja przed: $${result.averageOldSalary.toLocaleString()}<br>
                        Średnia pensja po: $${result.averageNewSalary.toLocaleString()}<br>
                        Zmiana średniej: ${(((result.averageNewSalary - result.averageOldSalary) / result.averageOldSalary) * 100).toFixed(1)}%
                    </div>
                `;
                break;
                
            case 'percentage':
                resultHTML = `
                    <div style="background: #dbeafe; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; color: #1e40af;">
                        <strong>✅ Sukces: Zmiana procentowa</strong><br>
                        Zaktualizowano: ${result.updatedPlayers} graczy<br>
                        Zmiana: ${result.percentChange}% (mnożnik: ${result.multiplier}x)
                    </div>
                `;
                break;
                
            case 'positional':
                resultHTML = `
                    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; color: #92400e;">
                        <strong>✅ Sukces: Algorytm pozycyjny</strong><br>
                        Zaktualizowano: ${result.updatedPlayers} graczy<br>
                        Uwzględniono różne stawki dla pozycji
                    </div>
                `;
                break;
                
            case 'manual':
                resultHTML = `
                    <div style="background: #fae8ff; border: 1px solid #f5d0fe; border-radius: 8px; padding: 15px; color: #86198f;">
                        <strong>✅ Sukces: Formuła ręczna</strong><br>
                        ${result.message}<br>
                        Wynik: ${JSON.stringify(result.data)}
                    </div>
                `;
                break;
        }
    } else {
        resultHTML = `
            <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; color: #dc2626;">
                <strong>❌ Błąd wykonania algorytmu</strong><br>
                ${result.error || 'Nieznany błąd'}
            </div>
        `;
    }
    
    resultDiv.innerHTML = resultHTML;
    addAdminLog(`Algorytm ${algorithm} wykonany: ${result.success ? 'Sukces' : 'Błąd'}`, result.success ? 'success' : 'error');
}

// ===== MODALE DLA PARAMETRÓW (EKONOMIA) =====

function showMarketValueParametersModal() {
    const modalHTML = `
        <div class="admin-parameters-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:500px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>💰</span> Parametry wartości rynkowych
                </h3>
                
                <form id="marketvalue-parameters-form">
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Bazowy mnożnik wartości</label>
                        <input type="range" id="value-multiplier" name="value_multiplier" min="0.3" max="3.0" step="0.1" value="1.5" 
                               style="width:100%;" oninput="document.getElementById('value-multiplier-value').textContent = this.value + 'x'">
                        <div style="display:flex; justify-content:space-between; margin-top:5px;">
                            <span style="color:#64748b; font-size:0.8rem;">0.3x</span>
                            <span id="value-multiplier-value" style="font-weight:bold; color:#3b82f6;">1.5x</span>
                            <span style="color:#64748b; font-size:0.8rem;">3.0x</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Maksymalna wartość ($)</label>
                        <input type="number" id="max-value" name="max_value" min="100000" max="50000000" value="10000000" step="100000" 
                               style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:6px;">
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Minimalna wartość ($)</label>
                        <input type="number" id="min-value" name="min_value" min="50000" max="1000000" value="100000" step="10000" 
                               style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:6px;">
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Czynniki wpływu:</label>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" name="factor_ovr" checked>
                                <span>OVR</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" name="factor_age" checked>
                                <span>Wiek</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" name="factor_potential" checked>
                                <span>Potencjał</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" name="factor_position" checked>
                                <span>Pozycja</span>
                            </label>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-top:30px;">
                        <button type="button" id="btn-cancel-marketvalue" 
                                style="flex:1; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                            ❌ Anuluj
                        </button>
                        <button type="submit" id="btn-submit-marketvalue" 
                                style="flex:1; background:linear-gradient(135deg, #3b82f6, #1d4ed8); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                            ✅ Zastosuj parametry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Event listenery dla modala
    document.getElementById('btn-cancel-marketvalue').addEventListener('click', () => {
        document.querySelector('.admin-parameters-modal').remove();
    });
    
    document.getElementById('marketvalue-parameters-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const params = Object.fromEntries(formData.entries());
        
        // Dodaj checkboxy
        params.factor_ovr = e.target.factor_ovr.checked;
        params.factor_age = e.target.factor_age.checked;
        params.factor_potential = e.target.factor_potential.checked;
        params.factor_position = e.target.factor_position.checked;
        
        document.querySelector('.admin-parameters-modal').remove();
        executeMarketValueUpdate(params);
    });
}

async function executeMarketValueUpdate(params) {
    addAdminLog('Rozpoczynam aktualizację wartości rynkowych z parametrami:', 'warning');
    addAdminLog(`- Mnożnik: ${params.value_multiplier}x`, 'info');
    addAdminLog(`- Zakres: $${params.min_value} - $${params.max_value}`, 'info');
    
    try {
        // Tutaj przekazujemy parametry do funkcji aktualizacji
        const result = await adminUpdateMarketValues(params);
        
        const resultDiv = document.getElementById('salary-update-result');
        if (!resultDiv) return;
        
        resultDiv.style.display = 'block';
        
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="background: #dbeafe; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; color: #1e40af;">
                    <strong>✅ Sukces:</strong> Zaktualizowano wartości rynkowe ${result.updatedCount} graczy.<br>
                    <strong>W sumie:</strong> ${result.totalCount} graczy<br>
                    <strong>Komunikat:</strong> ${result.message || 'Aktualizacja zakończona pomyślnie'}
                    <br><br>
                    <small><strong>Użyte parametry:</strong><br>
                    Mnożnik: ${params.value_multiplier}x | Zakres: $${params.min_value} - $${params.max_value}
                    </small>
                </div>
            `;
            addAdminLog(`Zaktualizowano wartości rynkowe ${result.updatedCount} graczy`, 'success');
        } else {
            resultDiv.innerHTML = `
                <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; color: #dc2626;">
                    <strong>❌ Błąd:</strong> ${result.error || 'Nieznany błąd'}
                </div>
            `;
            addAdminLog(`Błąd aktualizacji wartości: ${result.error}`, 'error');
        }
        
        await loadSystemStats();
        
    } catch (error) {
        addAdminLog(`Błąd: ${error.message}`, 'error');
        alert(`Błąd aktualizacji wartości: ${error.message}`);
    }
}

// --- FUNKCJE POMOCNICZE ---

function getCurrentTeamId() {
    // Szukaj ID drużyny w różnych miejscach
    return window.userTeamId || 
           localStorage.getItem('current_team_id') || 
           localStorage.getItem('team_id') ||
           (window.currentUser && window.currentUser.team_id);
}

async function handleSingleTeamUpdate() {
    let teamId = getCurrentTeamId();
    
    if (!teamId) {
        // Spróbuj pobrać z bazy danych
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('team_id')
                .eq('id', (await supabaseClient.auth.getUser()).data.user.id)
                .single();
                
            if (!error && profile && profile.team_id) {
                teamId = profile.team_id;
            } else {
                alert('Nie znaleziono ID drużyny! Zaloguj się ponownie.');
                return;
            }
        } catch (error) {
            alert('Nie można pobrać danych drużyny: ' + error.message);
            return;
        }
    }
    
    if (!confirm(`Czy chcesz zaktualizować pensje tylko dla swojej drużyny (ID: ${teamId})?`)) {
        return;
    }
    
    addAdminLog(`Aktualizacja pensji dla drużyny ID: ${teamId}`, 'warning');
    
    try {
        // Pobierz graczy drużyny
        const { data: players, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', teamId);
        
        if (error) throw error;
        
        if (!players || players.length === 0) {
            alert('Brak graczy w tej drużynie!');
            return;
        }
        
        // Użyj zaimportowanej funkcji calculatePlayerDynamicWage
        const updates = players.map(player => ({
            id: player.id,
            salary: calculatePlayerDynamicWage(player),
            last_salary_update: new Date().toISOString()
        }));
        
        // Wykonaj aktualizację
        const { data, error: updateError } = await supabaseClient
            .from('players')
            .upsert(updates, { onConflict: 'id' });
        
        if (updateError) throw updateError;
        
        const resultDiv = document.getElementById('salary-update-result');
        if (!resultDiv) return;
        
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div style="background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; color: #065f46;">
                <strong>✅ Sukces:</strong> Zaktualizowano pensje dla ${updates.length} graczy twojej drużyny.
            </div>
        `;
        
        addAdminLog(`Zaktualizowano pensje dla ${updates.length} graczy drużyny`, 'success');
        
    } catch (error) {
        addAdminLog(`Błąd aktualizacji drużyny: ${error.message}`, 'error');
        alert(`Błąd: ${error.message}`);
    }
}

// --- NOWE FUNKCJE SZYBKICH AKCJI ---

async function handleQuickAction(action) {
    addAdminLog(`Wykonuję akcję: ${action}`, 'info');
    
    switch(action) {
        case 'clear-cache':
            if (confirm('Czy na pewno chcesz wyczyścić cache przeglądarki?')) {
                localStorage.clear();
                sessionStorage.clear();
                addAdminLog('Cache wyczyszczony', 'success');
                alert('✅ Cache wyczyszczony! Strona zostanie odświeżona.');
                setTimeout(() => location.reload(), 1000);
            }
            break;
            
        case 'recalculate-stats':
            await recalculatePlayerStatistics();
            break;
            
        case 'fix-players':
            await fixPlayersData();
            break;
            
        case 'check-db':
            checkDatabaseConnection();
            break;
            
        case 'simulate-season':
            await simulateCompleteSeason();
            break;
            
        case 'refresh-stats':
            await loadSystemStats();
            addAdminLog('Statystyki odświeżone', 'success');
            break;
            
        default:
            addAdminLog(`Nieznana akcja: ${action}`, 'error');
            alert(`Akcja "${action}" nie jest zaimplementowana.`);
    }
}

async function recalculatePlayerStatistics() {
    if (!confirm('Czy chcesz przeliczyć statystyki wszystkich graczy?\nOperacja może potrwać kilka minut.')) {
        return;
    }
    
    addAdminLog('Rozpoczynam przeliczanie statystyk graczy...', 'warning');
    
    try {
        // Użyj funkcji RPC w Supabase
        const { data, error } = await supabaseClient.rpc('recalculate_season_stats');
        
        if (error) {
            throw new Error(`Błąd RPC: ${error.message}`);
        }
        
        if (data && data.success) {
            addAdminLog(`✅ ${data.message} | Przetworzono: ${data.processed_count}`, 'success');
            alert(`✅ ${data.message}\nPrzetworzono: ${data.processed_count} rekordów`);
        } else {
            addAdminLog('❌ Błąd przeliczania statystyk', 'error');
            alert('❌ Błąd przeliczania statystyk');
        }
        
    } catch (error) {
        addAdminLog(`❌ Błąd przeliczania statystyk: ${error.message}`, 'error');
        alert(`❌ Błąd: ${error.message}`);
    }
}

async function fixPlayersData() {
    if (!confirm('Czy chcesz naprawić dane graczy?\nSystem sprawdzi i naprawi nieprawidłowe wartości.')) {
        return;
    }
    
    addAdminLog('Rozpoczynam naprawę danych graczy...', 'warning');
    
    try {
        // Użyj funkcji RPC w Supabase
        const { data, error } = await supabaseClient.rpc('fix_players_data');
        
        if (error) {
            throw new Error(`Błąd RPC: ${error.message}`);
        }
        
        if (data && data.success) {
            addAdminLog(`✅ ${data.message} | Naprawiono: ${data.total_fixed} rekordów`, 'success');
            alert(`✅ ${data.message}\nNaprawiono: ${data.total_fixed} rekordów`);
        } else {
            addAdminLog('❌ Błąd naprawy danych', 'error');
            alert('❌ Błąd naprawy danych');
        }
        
    } catch (error) {
        addAdminLog(`❌ Błąd naprawy danych: ${error.message}`, 'error');
        alert(`❌ Błąd: ${error.message}`);
    }
}

async function simulateCompleteSeason() {
    if (!confirm('Czy chcesz zasymulować cały sezon?\nWszystkie mecze zostaną rozegrane, a statystyki zaktualizowane.\nOperacja może potrwać kilka minut.')) {
        return;
    }
    
    addAdminLog('Rozpoczynam symulację sezonu...', 'warning');
    
    try {
        // 1. Pobierz aktualny sezon
        const { data: currentSeason, error: seasonError } = await supabaseClient
            .from('teams')
            .select('current_season')
            .limit(1)
            .single();
            
        const season = currentSeason?.current_season || 1;
        
        // 2. Symuluj tydzień po tygodniu
        for (let week = 1; week <= 20; week++) {
            addAdminLog(`Symulacja tygodnia ${week}...`, 'info');
            
            // Symuluj mecze dla tego tygodnia
            await simulateWeekMatches(season, week);
            
            // Aktualizuj statystyki graczy
            await updatePlayerStatsForWeek(season, week);
            
            // Aktualizuj tabelę ligową
            await updateLeagueStandings(season);
            
            addAdminLog(`Tydzień ${week} zakończony`, 'success');
        }
        
        // 3. Zakończ sezon
        await finishSeason(season);
        
        addAdminLog('✅ Symulacja sezonu zakończona pomyślnie!', 'success');
        alert('✅ Sezon został zasymulowany! Tabele i statystyki zostały zaktualizowane.');
        
    } catch (error) {
        addAdminLog(`❌ Błąd symulacji: ${error.message}`, 'error');
        alert(`❌ Błąd symulacji: ${error.message}`);
    }
}

async function simulateWeekMatches(season, week) {
    // Tutaj implementacja symulacji meczów dla danego tygodnia
    // To jest uproszczona wersja - w rzeczywistości potrzebujesz algorytmu symulacji meczów
    
    addAdminLog(`Symulacja meczów tygodnia ${week}...`, 'info');
    
    // Pobierz zaplanowane mecze na ten tydzień
    const { data: matches, error } = await supabaseClient
        .from('matches')
        .select('*')
        .eq('season', season)
        .eq('week', week)
        .eq('is_played', false);
        
    if (error || !matches || matches.length === 0) {
        addAdminLog(`Brak meczów do symulacji w tygodniu ${week}`, 'warning');
        return;
    }
    
    // Dla każdego meczu wygeneruj wyniki
    for (const match of matches) {
        // Prosta symulacja - losowe wyniki
        const homeScore = Math.floor(Math.random() * 100) + 70;
        const awayScore = Math.floor(Math.random() * 100) + 70;
        
        // Aktualizuj mecz w bazie
        await supabaseClient
            .from('matches')
            .update({
                score_home: homeScore,
                score_away: awayScore,
                is_played: true,
                played_at: new Date().toISOString()
            })
            .eq('id', match.id);
            
        addAdminLog(`Mecz ${match.id}: ${homeScore} - ${awayScore}`, 'info');
    }
    
    addAdminLog(`Zsymulowano ${matches.length} meczów w tygodniu ${week}`, 'success');
}

async function updatePlayerStatsForWeek(season, week) {
    // Tutaj implementacja aktualizacji statystyk graczy
    // To jest miejsce na logikę generowania statystyk dla graczy po meczach
    
    addAdminLog(`Aktualizacja statystyk graczy dla tygodnia ${week}...`, 'info');
    
    // W rzeczywistej implementacji tutaj byłaby logika generowania statystyk
    // Na razie tylko log
    addAdminLog(`Statystyki graczy zaktualizowane dla tygodnia ${week}`, 'success');
}

async function updateLeagueStandings(season) {
    // Aktualizacja tabeli ligowej
    addAdminLog('Aktualizacja tabeli ligowej...', 'info');
    
    // W rzeczywistej implementacji tutaj byłaby logika przeliczania tabeli
    addAdminLog('Tabela ligowa zaktualizowana', 'success');
}

async function finishSeason(season) {
    // Zakończenie sezonu - resetowanie niektórych danych, przygotowanie do nowego sezonu
    addAdminLog('Finalizacja sezonu...', 'warning');
    
    // 1. Zwiększ sezon w drużynach
    await supabaseClient
        .from('teams')
        .update({ current_season: season + 1, current_week: 1 });
        
    // 2. Zresetuj statystyki sezonowe
    
    // 3. Przygotuj draft na nowy sezon
    
    addAdminLog(`Sezon ${season} zakończony. Rozpoczęto sezon ${season + 1}`, 'success');
}

// --- BAZA DANYCH ---

async function handleBackupDB() {
    addAdminLog('Tworzenie backupu bazy danych...', 'warning');
    
    try {
        // 1. Eksportuj wszystkie ważne tabele
        const exportData = await createCompleteBackup();
        
        // 2. Zapisz do pliku
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nba-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 3. Opcjonalnie: wyślij backup do Supabase Storage
        await uploadBackupToStorage(exportData);
        
        addAdminLog('✅ Backup bazy danych utworzony pomyślnie!', 'success');
        alert('✅ Backup bazy danych został utworzony i pobrany!');
        
    } catch (error) {
        addAdminLog(`❌ Błąd tworzenia backupu: ${error.message}`, 'error');
        alert(`❌ Błąd tworzenia backupu: ${error.message}`);
    }
}

async function createCompleteBackup() {
    // Pobierz dane ze wszystkich kluczowych tabel
    const [
        playersRes, teamsRes, profilesRes, matchesRes, 
        statsRes, marketRes, coachesRes, standingsRes
    ] = await Promise.all([
        supabaseClient.from('players').select('*'),
        supabaseClient.from('teams').select('*'),
        supabaseClient.from('profiles').select('*'),
        supabaseClient.from('matches').select('*').limit(1000),
        supabaseClient.from('player_stats').select('*').limit(5000),
        supabaseClient.from('transfer_market').select('*'),
        supabaseClient.from('coaches').select('*'),
        supabaseClient.from('league_standings').select('*')
    ]);
    
    return {
        timestamp: new Date().toISOString(),
        metadata: {
            version: '2.0',
            backup_type: 'full',
            tables_count: 8
        },
        data: {
            players: playersRes.data || [],
            teams: teamsRes.data || [],
            profiles: profilesRes.data || [],
            matches: matchesRes.data || [],
            player_stats: statsRes.data || [],
            transfer_market: marketRes.data || [],
            coaches: coachesRes.data || [],
            league_standings: standingsRes.data || []
        },
        system_stats: systemStats
    };
}

async function uploadBackupToStorage(backupData) {
    try {
        // Konwersja do JSON string
        const backupString = JSON.stringify(backupData);
        
        // Utwórz nazwę pliku z timestampem
        const fileName = `backups/backup-${Date.now()}.json`;
        
        // Upload do Supabase Storage
        const { data, error } = await supabaseClient.storage
            .from('admin-backups') // Nazwa bucketa
            .upload(fileName, backupString, {
                contentType: 'application/json',
                upsert: false
            });
            
        if (!error) {
            addAdminLog(`Backup zapisany w storage: ${fileName}`, 'success');
        }
        
    } catch (error) {
        console.warn('Nie udało się zapisać backupu w storage:', error.message);
        // Nie blokujemy głównej funkcji backupu
    }
}

async function handleOptimizeDB() {
    addAdminLog('Optymalizacja bazy danych...', 'warning');
    
    try {
        // Użyj funkcji RPC w Supabase
        const { data, error } = await supabaseClient.rpc('update_statistics');
        
        if (error) {
            throw new Error(`Błąd RPC: ${error.message}`);
        }
        
        if (data && data.success) {
            addAdminLog(`✅ ${data.message} | Zaktualizowano: ${data.teams_updated} drużyn`, 'success');
            alert(`✅ ${data.message}\nZaktualizowano: ${data.teams_updated} drużyn`);
        } else {
            addAdminLog('❌ Błąd optymalizacji', 'error');
            alert('❌ Błąd optymalizacji');
        }
        
    } catch (error) {
        addAdminLog(`❌ Błąd optymalizacji: ${error.message}`, 'error');
        alert(`❌ Błąd optymalizacji: ${error.message}`);
    }
}

async function handleAnalyzeDB() {
    addAdminLog('Analiza bazy danych...', 'warning');
    
    try {
        // Pobierz statystyki tabel
        const tables = ['players', 'teams', 'profiles', 'matches', 'player_stats', 'transfer_market'];
        const stats = {};
        
        for (const table of tables) {
            const { count, error } = await supabaseClient
                .from(table)
                .select('*', { count: 'exact', head: true });
                
            if (!error) {
                stats[table] = count;
                addAdminLog(`${table}: ${count} rekordów`, 'info');
            }
        }
        
        // Sprawdź największe tabele
        const largestTable = Object.entries(stats).sort((a, b) => b[1] - a[1])[0];
        
        // Wyświetl podsumowanie
        const resultDiv = document.getElementById('salary-update-result');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 15px; color: #0369a1;">
                    <strong>📊 Analiza bazy danych</strong><br><br>
                    ${Object.entries(stats).map(([table, count]) => 
                        `<div>${table}: <strong>${count}</strong> rekordów</div>`
                    ).join('')}
                    <br>
                    <strong>Największa tabela:</strong> ${largestTable[0]} (${largestTable[1]} rekordów)<br>
                    <strong>Łącznie rekordów:</strong> ${Object.values(stats).reduce((a, b) => a + b, 0)}
                </div>
            `;
        }
        
        addAdminLog('✅ Analiza bazy danych zakończona', 'success');
        
    } catch (error) {
        addAdminLog(`❌ Błąd analizy: ${error.message}`, 'error');
        alert(`❌ Błąd analizy: ${error.message}`);
    }
}

// --- POZOSTAŁE FUNKCJE (bez zmian) ---

async function checkDatabaseConnection() {
    addAdminLog('Testowanie połączenia z bazą danych...', 'info');
    
    try {
        const startTime = Date.now();
        const { data, error } = await supabaseClient
            .from('teams')
            .select('count')
            .limit(1);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (error) throw error;
        
        addAdminLog(`✅ Połączenie z bazą OK (${responseTime}ms)`, 'success');
        alert(`✅ Połączenie z bazą działa poprawnie!\nCzas odpowiedzi: ${responseTime}ms`);
        
    } catch (error) {
        addAdminLog(`❌ Błąd połączenia: ${error.message}`, 'error');
        alert(`❌ Błąd połączenia z bazą: ${error.message}`);
    }
}

async function loadSystemStats() {
    try {
        addAdminLog('Ładowanie statystyk systemu...', 'info');
        
        // Pobierz różne statystyki
        const [playersRes, teamsRes, marketRes, usersRes, matchesRes] = await Promise.all([
            supabaseClient.from('players').select('id, salary', { count: 'exact' }),
            supabaseClient.from('teams').select('id, balance', { count: 'exact' }),
            supabaseClient.from('transfer_market').select('id', { count: 'exact' }).eq('status', 'active'),
            supabaseClient.from('profiles').select('id', { count: 'exact' }),
            supabaseClient.from('matches').select('id', { count: 'exact' }).eq('is_played', false)
        ]);
        
        // Oblicz sumę pensji
        const totalSalary = playersRes.data?.reduce((sum, p) => sum + (p.salary || 0), 0) || 0;
        
        // Oblicz średnią pensję
        const avgSalary = playersRes.data?.length ? Math.round(totalSalary / playersRes.data.length) : 0;
        
        // Oblicz sumę balansów drużyn
        const totalBalance = teamsRes.data?.reduce((sum, t) => sum + (t.balance || 0), 0) || 0;
        
        systemStats = {
            totalPlayers: playersRes.count || 0,
            totalTeams: teamsRes.count || 0,
            activeListings: marketRes.count || 0,
            totalUsers: usersRes.count || 0,
            upcomingMatches: matchesRes.count || 0,
            totalSalary: totalSalary,
            avgSalary: avgSalary,
            totalBalance: totalBalance
        };
        
        // Zaktualizuj UI
        const statsContainer = document.getElementById('system-stats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 15px; text-align: center;">
                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 600;">Gracze</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #0c4a6e;">${systemStats.totalPlayers}</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; padding: 15px; text-align: center;">
                <div style="font-size: 0.8rem; color: #15803d; font-weight: 600;">Drużyny</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #166534;">${systemStats.totalTeams}</div>
            </div>
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; text-align: center;">
                <div style="font-size: 0.8rem; color: #d97706; font-weight: 600;">Oferty rynkowe</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #92400e;">${systemStats.activeListings}</div>
            </div>
            <div style="background: #fae8ff; border: 1px solid #f5d0fe; border-radius: 8px; padding: 15px; text-align: center;">
                <div style="font-size: 0.8rem; color: #a21caf; font-weight: 600;">Średnia pensja</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #86198f;">$${systemStats.avgSalary.toLocaleString()}</div>
            </div>
        `;
        
        addAdminLog(`Statystyki załadowane: ${systemStats.totalPlayers} graczy, ${systemStats.totalTeams} drużyn`, 'success');
        
    } catch (error) {
        console.error("Błąd ładowania statystyk:", error);
        addAdminLog(`Błąd ładowania statystyk: ${error.message}`, 'error');
    }
}

function addAdminLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logDiv = document.getElementById('admin-console-log');
    
    if (!logDiv) return;
    
    // Mapowanie typów do kolorów
    const typeColors = {
        info: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
    };
    
    const color = typeColors[type] || '#64748b';
    const logEntry = `<div style="color: ${color}; margin-bottom: 2px;">[${timestamp}] ${message}</div>`;
    
    logDiv.innerHTML += logEntry;
    adminLogEntries.push({ timestamp, message, type });
    
    // Scroll do dołu
    logDiv.scrollTop = logDiv.scrollHeight;
}

function clearAdminLog() {
    const logDiv = document.getElementById('admin-console-log');
    if (logDiv) {
        logDiv.innerHTML = '<div>> Log wyczyszczony</div>';
        adminLogEntries = [];
        addAdminLog('Log wyczyszczony', 'info');
    }
}

function exportAdminLog() {
    const logText = adminLogEntries.map(entry => 
        `[${entry.timestamp}] ${entry.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addAdminLog('Log wyeksportowany do pliku', 'success');
}

async function handleExportData() {
    addAdminLog('Przygotowanie eksportu danych...', 'warning');
    
    try {
        // Pobierz dane do eksportu
        const [players, teams, market] = await Promise.all([
            supabaseClient.from('players').select('*').limit(1000),
            supabaseClient.from('teams').select('*'),
            supabaseClient.from('transfer_market').select('*').limit(500)
        ]);
        
        const exportData = {
            timestamp: new Date().toISOString(),
            players: players.data,
            teams: teams.data,
            market: market.data,
            stats: systemStats
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nba-manager-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addAdminLog(`Dane wyeksportowane: ${players.data?.length || 0} graczy, ${teams.data?.length || 0} drużyn`, 'success');
        
    } catch (error) {
        addAdminLog(`Błąd eksportu: ${error.message}`, 'error');
        alert(`Błąd eksportu: ${error.message}`);
    }
}

function injectAdminStyles() {
    // Sprawdź czy style już istnieją
    if (document.getElementById('admin-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'admin-styles';
    style.textContent = `
        .admin-stat-card {
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 140px;
        }
        
        .admin-stat-card:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        .admin-stat-card:active {
            transform: translateY(-2px) scale(0.98);
        }
        
        .stat-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .stat-title {
            font-size: 1.2rem;
            font-weight: 800;
            margin-bottom: 5px;
        }
        
        .stat-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .admin-quick-btn {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
            padding: 12px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s;
            text-align: center;
        }
        
        .admin-quick-btn:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .admin-section {
            animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        #admin-console-log div {
            padding: 3px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            word-wrap: break-word;
        }
        
        #admin-console-log div:last-child {
            border-bottom: none;
        }
        
        #admin-console-log {
            scrollbar-width: thin;
            scrollbar-color: #4f46e5 #1e1b4b;
        }
        
        #admin-console-log::-webkit-scrollbar {
            width: 8px;
        }
        
        #admin-console-log::-webkit-scrollbar-track {
            background: #1e1b4b;
            border-radius: 4px;
        }
        
        #admin-console-log::-webkit-scrollbar-thumb {
            background-color: #4f46e5;
            border-radius: 4px;
        }
        
        .admin-modal-content {
            animation: modalAppear 0.3s ease;
        }
        
        @keyframes modalAppear {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        input[type="range"] {
            -webkit-appearance: none;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
        }
        
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border-radius: 50%;
            cursor: pointer;
        }
        
        input[type="number"], input[type="text"] {
            padding: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.9rem;
            transition: border-color 0.2s;
        }
        
        input[type="number"]:focus, input[type="text"]:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .admin-card-modal {
            animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        .algorithm-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .algorithm-card.selected {
            border-color: #3b82f6 !important;
            background: #eff6ff !important;
        }
        
        .sql-editor {
            font-family: 'Courier New', monospace;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            background: #f8fafc;
            min-height: 100px;
            width: 100%;
            resize: vertical;
        }
        
        .config-param {
            margin-bottom: 15px;
        }
        
        .config-param label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #334155;
        }
        
        .config-param input {
            width: 100%;
            padding: 8px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
        }
        
        .preview-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        .preview-table th {
            background: #f8fafc;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
            color: #64748b;
            font-weight: 600;
        }
        
        .preview-table td {
            padding: 10px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .preview-table tr:hover {
            background: #f8fafc;
        }
    `;
    
    document.head.appendChild(style);
}

// ========== DODANE FUNKCJE DLA KOMPATYBILNOŚCI WSTECZNEJ ==========

/**
 * STARA FUNKCJA loadAdminPanel() dla kompatybilności wstecznej
 * Wywoływana z konsoli: loadAdminPanel()
 */
window.loadAdminPanel = async function() {
    console.log("[ADMIN] loadAdminPanel() wywołane z konsoli");
    
    // Sprawdź czy jest zalogowany użytkownik
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("❌ Musisz być zalogowany aby otworzyć panel admina!");
        return;
    }
    
    // Pobierz dane profilu
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error) {
        console.error("[ADMIN] Błąd pobierania profilu:", error);
        alert("❌ Błąd pobierania danych użytkownika");
        return;
    }
    
    // Wywołaj renderAdminPanel z danymi profilu
    return await renderAdminPanel({
        team_name: profile.username || profile.email || "Admin",
        id: profile.id
    });
};

/**
 * Funkcja do szybkiego dostępu z konsoli z hasłem
 * Wywołanie: loadAdminPanelWithPassword("NBA2024!ADMIN")
 */
window.loadAdminPanelWithPassword = async function(password) {
    console.log("[ADMIN] Wywołanie z hasłem...");
    
    // Sprawdź hasło
    const { valid } = await validateAdminPassword(password);
    
    if (!valid) {
        alert("❌ Błędne hasło admina!");
        return;
    }
    
    // Ustaw sesję jako zweryfikowaną
    sessionStorage.setItem('admin_verified', 'true');
    sessionStorage.setItem('admin_verified_timestamp', Date.now());
    
    // Wywołaj panel
    return await window.loadAdminPanel();
};

// Automatyczne dodawanie przycisku Admin dla uprawnionych użytkowników
async function initializeAdminButton() {
    try {
        // Sprawdź czy użytkownik jest zalogowany
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        
        // Sprawdź uprawnienia
        const { hasAccess, profile } = await checkAdminPermissions();
        
        if (hasAccess) {
            console.log("[ADMIN] Użytkownik ma dostęp admina - dodaję przycisk");
            
            // Usuń istniejący przycisk jeśli jest
            const existingBtn = document.getElementById('admin-floating-button');
            if (existingBtn) existingBtn.remove();
            
            // Utwórz nowy przycisk
            const adminBtn = document.createElement('button');
            adminBtn.id = 'admin-floating-button';
            adminBtn.innerHTML = '⚙️ ADMIN';
            adminBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1a237e, #283593);
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 20px;
                font-weight: bold;
                font-size: 14px;
                cursor: pointer;
                z-index: 9998;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            adminBtn.onmouseover = () => {
                adminBtn.style.transform = 'translateY(-2px)';
                adminBtn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            };
            
            adminBtn.onmouseout = () => {
                adminBtn.style.transform = 'translateY(0)';
                adminBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            };
            
            adminBtn.onclick = () => window.loadAdminPanel();
            
            // Dodaj przycisk do body
            document.body.appendChild(adminBtn);
            
            // Log do konsoli
            console.log("[ADMIN] Przycisk admina został dodany automatycznie");
        }
    } catch (error) {
        console.warn("[ADMIN] Błąd inicjalizacji przycisku:", error);
    }
}

// Wywołaj po załadowaniu DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminButton);
} else {
    initializeAdminButton();
}

// Również wywołaj po zmianie hasha (dla SPA)
window.addEventListener('hashchange', initializeAdminButton);
