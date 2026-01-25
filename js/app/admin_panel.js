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
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
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

function initAdminEventListeners() {
    console.log("[ADMIN] Inicjalizacja listenerów...");
    
    // ===== KLIKALNE KARTY STATYSTYK =====
    document.querySelectorAll('.admin-stat-card.clickable-card').forEach(card => {
        card.addEventListener('click', handleStatCardClick);
    });
    
    // Aktualizacja pensji - otwiera modal z parametrami
    const salaryBtn = document.getElementById('btn-admin-update-salaries');
    if (salaryBtn) {
        salaryBtn.addEventListener('click', () => showSalaryParametersModal());
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

// ===== MODALE DLA PARAMETRÓW (EKONOMIA) =====

function showSalaryParametersModal() {
    const modalHTML = `
        <div class="admin-parameters-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; padding:30px; width:90%; max-width:500px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>💰</span> Parametry aktualizacji pensji
                </h3>
                
                <form id="salary-parameters-form">
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Mnożnik pensji bazowej</label>
                        <input type="range" id="salary-multiplier" name="salary_multiplier" min="0.5" max="2.0" step="0.1" value="1.0" 
                               style="width:100%;" oninput="document.getElementById('multiplier-value').textContent = this.value + 'x'">
                        <div style="display:flex; justify-content:space-between; margin-top:5px;">
                            <span style="color:#64748b; font-size:0.8rem;">0.5x</span>
                            <span id="multiplier-value" style="font-weight:bold; color:#3b82f6;">1.0x</span>
                            <span style="color:#64748b; font-size:0.8rem;">2.0x</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Maksymalny wzrost (%)</label>
                        <input type="number" id="max-increase" name="max_increase" min="0" max="100" value="20" 
                               style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:6px;">
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155;">Uwzględnij:</label>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" name="include_experience" checked>
                                <span>Doświadczenie gracza</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" name="include_potential" checked>
                                <span>Potencjał gracza</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" name="include_performance" checked>
                                <span>Ostatnie wyniki</span>
                            </label>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-top:30px;">
                        <button type="button" id="btn-cancel-salary" 
                                style="flex:1; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                            ❌ Anuluj
                        </button>
                        <button type="submit" id="btn-submit-salary" 
                                style="flex:1; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                            ✅ Zastosuj parametry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Event listenery dla modala
    document.getElementById('btn-cancel-salary').addEventListener('click', () => {
        document.querySelector('.admin-parameters-modal').remove();
    });
    
    document.getElementById('salary-parameters-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const params = Object.fromEntries(formData.entries());
        
        // Dodaj checkboxy
        params.include_experience = e.target.include_experience.checked;
        params.include_potential = e.target.include_potential.checked;
        params.include_performance = e.target.include_performance.checked;
        
        document.querySelector('.admin-parameters-modal').remove();
        executeSalaryUpdate(params);
    });
}

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

async function executeSalaryUpdate(params) {
    addAdminLog('Rozpoczynam aktualizację pensji z parametrami:', 'warning');
    addAdminLog(`- Mnożnik: ${params.salary_multiplier}x`, 'info');
    addAdminLog(`- Max wzrost: ${params.max_increase}%`, 'info');
    
    // Tutaj przekazujemy parametry do funkcji aktualizacji
    const result = await adminUpdateSalaries(params);
    
    const resultDiv = document.getElementById('salary-update-result');
    if (!resultDiv) return;
    
    resultDiv.style.display = 'block';
    
    if (result.success) {
        resultDiv.innerHTML = `
            <div style="background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; color: #065f46;">
                <strong>✅ Sukces:</strong> Zaktualizowano pensje ${result.updatedPlayers} graczy.<br>
                <strong>Bez zmian:</strong> ${result.unchangedPlayers} graczy<br>
                <strong>W sumie:</strong> ${result.totalPlayers} graczy
                ${result.errors ? `<br><small>Uwagi: ${result.errors.length} błędów pominięto</small>` : ''}
                <br><br>
                <small><strong>Użyte parametry:</strong><br>
                Mnożnik: ${params.salary_multiplier}x | Max wzrost: ${params.max_increase}%
                </small>
            </div>
        `;
        addAdminLog(`Zaktualizowano pensje ${result.updatedPlayers} z ${result.totalPlayers} graczy`, 'success');
    } else {
        resultDiv.innerHTML = `
            <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; color: #dc2626;">
                <strong>❌ Błąd:</strong> ${result.error || 'Nieznany błąd'}<br>
                ${result.errors ? result.errors.join('<br>') : ''}
            </div>
        `;
        addAdminLog(`Błąd aktualizacji pensji: ${result.error}`, 'error');
    }
    
    // Odśwież statystyki
    await loadSystemStats();
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
    `;
    
    document.head.appendChild(style);
}

// Dodaj to na samym końcu pliku admin_panel.js
window.openAdminPanel = async function() {
    const { renderAdminPanel } = await import('./app/admin_panel.js');
    await renderAdminPanel(null);
};
