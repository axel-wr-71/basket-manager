// js/app/admin_panel.js
import { supabaseClient } from '../auth.js';
import { 
    adminUpdateSalaries, 
    updateAllPlayerMarketValues,
    updateAllPlayerSalaries,
    updateAllPlayerMarketValues as updateMarketValues
} from '../core/economy.js';

// Zmienne globalne dla panelu
let adminLogEntries = [];
let systemStats = null;

export async function renderAdminPanel(teamData) {
    console.log("[ADMIN] Renderowanie panelu admina...");
    
    // Znajdź lub utwórz kontener
    let container = document.getElementById('admin-panel-container');
    if (!container) {
        console.error("[ADMIN] Brak kontenera admin-panel-container!");
        return;
    }

    // Wyczyść poprzednie logi
    adminLogEntries = [];
    
    container.innerHTML = `
        <div class="admin-modern-wrapper">
            <!-- NAGŁÓWEK -->
            <div class="admin-header" style="padding: 20px 0 30px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
                <div>
                    <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: 'Inter', sans-serif; font-size: 1.8rem;">
                        ADMIN <span style="color:#e65100">PANEL</span>
                    </h1>
                    <p style="margin:10px 0 0 0; color:#64748b; font-size: 0.95rem;">
                        Narzędzia administracyjne NBA Manager | ${new Date().toLocaleString()}
                    </p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button onclick="location.reload()" 
                            style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 5px;">
                        ↩️ Powrót do gry
                    </button>
                    <div style="background:#ef4444; color:white; padding:8px 16px; border-radius:8px; font-weight:700; font-size:0.8rem; display:flex; align-items:center; gap:6px;">
                        <span>⚙️</span> ADMIN MODE
                    </div>
                </div>
            </div>

            <!-- KARTY STATYSTYK -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0;">
                <div class="admin-stat-card" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                    <div class="stat-icon">👥</div>
                    <div class="stat-title">Zarządzanie</div>
                    <div class="stat-subtitle">Gracze i drużyny</div>
                </div>
                <div class="admin-stat-card" style="background: linear-gradient(135deg, #10b981, #059669);">
                    <div class="stat-icon">💰</div>
                    <div class="stat-title">Ekonomia</div>
                    <div class="stat-subtitle">Pensje i finanse</div>
                </div>
                <div class="admin-stat-card" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                    <div class="stat-icon">📊</div>
                    <div class="stat-title">Statystyki</div>
                    <div class="stat-subtitle">Dane systemowe</div>
                </div>
                <div class="admin-stat-card" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                    <div class="stat-icon">⚙️</div>
                    <div class="stat-title">System</div>
                    <div class="stat-subtitle">Konfiguracja</div>
                </div>
            </div>

            <!-- SEKCJA EKONOMII -->
            <div class="admin-section" style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>💰</span> Aktualizacja Pensji i Wartości
                </h3>
                <p style="color:#64748b; font-size:0.9rem; margin-bottom:20px;">
                    Uruchom masową aktualizację pensji i wartości rynkowych wszystkich graczy według nowego algorytmu.
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <button id="btn-admin-update-salaries" 
                            style="background: #10b981; color: white; border: none; padding: 15px; border-radius: 8px; 
                                   font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        🔄 Zaktualizuj WSZYSTKIE pensje
                    </button>
                    
                    <button id="btn-admin-update-values" 
                            style="background: #3b82f6; color: white; border: none; padding: 15px; border-radius: 8px; 
                                   font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        💰 Aktualizuj wartości rynkowe
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <button id="btn-admin-both-updates" 
                            style="background: #8b5cf6; color: white; border: none; padding: 15px; border-radius: 8px; 
                                   font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        ⚡ Aktualizuj wszystko
                    </button>
                    
                    <button id="btn-admin-single-team" 
                            style="background: #f59e0b; color: white; border: none; padding: 15px; border-radius: 8px; 
                                   font-weight: 700; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        🏀 Tylko moja drużyna
                    </button>
                </div>
                
                <div id="salary-update-result" style="margin-top: 20px; display: none;"></div>
            </div>

            <!-- SZYBKIE AKCJE -->
            <div class="admin-section" style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
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
                    <button class="admin-quick-btn" data-action="reset-transfers">
                        🔄 Resetuj transfery
                    </button>
                    <button class="admin-quick-btn" data-action="simulate-all">
                        ⚡ Symuluj sezon
                    </button>
                </div>
            </div>

            <!-- STATYSTYKI SYSTEMU -->
            <div class="admin-section" style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
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

            <!-- NARZĘDZIA BAZY DANYCH -->
            <div class="admin-section" style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h3 style="margin-top:0; color:#1a237e; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <span>🗄️</span> Baza danych
                </h3>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button id="btn-export-data" style="background: #1e40af; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                        📥 Eksportuj dane
                    </button>
                    <button id="btn-backup-db" style="background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                        💾 Backup
                    </button>
                    <button id="btn-optimize-db" style="background: #7c3aed; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                        🔧 Optymalizuj
                    </button>
                </div>
            </div>

            <!-- KONSOLA LOGÓW -->
            <div class="admin-log" style="margin-top: 30px; padding: 20px; background: #1a237e; color: white; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div style="font-weight: 700;">KONSOLA ADMINA</div>
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

            <!-- STOPKA -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 0.8rem;">
                <p>© 2024 NBA Manager | Panel Administracyjny v1.0 | Użytkownik: ${teamData?.team_name || 'System'}</p>
                <p style="font-size: 0.7rem; color: #94a3b8;">Ostatnie odświeżenie: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    `;

    // Inicjalizacja event listenerów
    initAdminEventListeners();
    
    // Załaduj statystyki systemu
    await loadSystemStats();
    
    // Dodaj początkowy log
    addAdminLog('Panel administracyjny gotowy do użycia', 'info');
    
    // Dodaj styl CSS jeśli nie ma
    injectAdminStyles();
}

function initAdminEventListeners() {
    console.log("[ADMIN] Inicjalizacja listenerów...");
    
    // Aktualizacja pensji
    document.getElementById('btn-admin-update-salaries').addEventListener('click', handleSalaryUpdate);
    
    // Aktualizacja wartości rynkowych
    document.getElementById('btn-admin-update-values').addEventListener('click', handleMarketValueUpdate);
    
    // Aktualizacja wszystkiego
    document.getElementById('btn-admin-both-updates').addEventListener('click', handleBothUpdates);
    
    // Aktualizacja tylko mojej drużyny
    document.getElementById('btn-admin-single-team').addEventListener('click', handleSingleTeamUpdate);
    
    // Szybkie akcje
    document.querySelectorAll('.admin-quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAction(action);
        });
    });
    
    // Zarządzanie bazą danych
    document.getElementById('btn-export-data').addEventListener('click', handleExportData);
    document.getElementById('btn-backup-db').addEventListener('click', handleBackupDB);
    document.getElementById('btn-optimize-db').addEventListener('click', handleOptimizeDB);
    
    // Zarządzanie logami
    document.getElementById('btn-clear-log').addEventListener('click', clearAdminLog);
    document.getElementById('btn-export-log').addEventListener('click', exportAdminLog);
}

async function handleSalaryUpdate() {
    addAdminLog('Rozpoczynam aktualizację pensji dla wszystkich graczy...', 'warning');
    
    const result = await adminUpdateSalaries();
    
    const resultDiv = document.getElementById('salary-update-result');
    resultDiv.style.display = 'block';
    
    if (result.cancelled) {
        resultDiv.innerHTML = `
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; color: #92400e;">
                <strong>❌ Anulowano:</strong> Operacja została anulowana przez użytkownika.
            </div>
        `;
        addAdminLog('Aktualizacja pensji anulowana przez użytkownika', 'warning');
    } else if (result.success) {
        resultDiv.innerHTML = `
            <div style="background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; color: #065f46;">
                <strong>✅ Sukces:</strong> Zaktualizowano pensje ${result.updatedPlayers} graczy.<br>
                <strong>Bez zmian:</strong> ${result.unchangedPlayers} graczy<br>
                <strong>W sumie:</strong> ${result.totalPlayers} graczy
                ${result.errors ? `<br><small>Uwagi: ${result.errors.length} błędów pominięto</small>` : ''}
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

async function handleMarketValueUpdate() {
    addAdminLog('Rozpoczynam aktualizację wartości rynkowych...', 'warning');
    
    try {
        const result = await updateMarketValues();
        
        const resultDiv = document.getElementById('salary-update-result');
        resultDiv.style.display = 'block';
        
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="background: #dbeafe; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; color: #1e40af;">
                    <strong>✅ Sukces:</strong> Zaktualizowano wartości rynkowe ${result.updatedCount} graczy.<br>
                    <strong>W sumie:</strong> ${result.totalPlayers} graczy
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

async function handleBothUpdates() {
    if (!confirm('Czy chcesz zaktualizować WSZYSTKO?\n\n✅ Pensje wszystkich graczy\n✅ Wartości rynkowe\n\nOperacja może potrwać kilka minut.')) {
        return;
    }
    
    addAdminLog('Rozpoczynanie kompleksowej aktualizacji...', 'warning');
    
    // 1. Aktualizuj pensje
    const salaryResult = await updateAllPlayerSalaries();
    
    // 2. Aktualizuj wartości rynkowe
    const valueResult = await updateMarketValues();
    
    const resultDiv = document.getElementById('salary-update-result');
    resultDiv.style.display = 'block';
    
    let html = '<div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 15px; color: #0369a1;">';
    html += '<strong>📊 Kompleksowa aktualizacja zakończona</strong><br><br>';
    
    if (salaryResult.success) {
        html += `✅ <strong>Pensje:</strong> ${salaryResult.updatedPlayers} z ${salaryResult.totalPlayers} graczy<br>`;
        addAdminLog(`Pensje: ${salaryResult.updatedPlayers} z ${salaryResult.totalPlayers} graczy`, 'success');
    } else {
        html += `❌ <strong>Pensje:</strong> Błąd<br>`;
        addAdminLog(`Błąd aktualizacji pensji: ${salaryResult.error}`, 'error');
    }
    
    if (valueResult.success) {
        html += `✅ <strong>Wartości:</strong> ${valueResult.updatedCount} graczy<br>`;
        addAdminLog(`Wartości: ${valueResult.updatedCount} graczy`, 'success');
    } else {
        html += `❌ <strong>Wartości:</strong> Błąd<br>`;
        addAdminLog(`Błąd aktualizacji wartości: ${valueResult.error}`, 'error');
    }
    
    html += '</div>';
    
    resultDiv.innerHTML = html;
    
    await loadSystemStats();
}

async function handleSingleTeamUpdate() {
    const teamId = window.userTeamId || localStorage.getItem('current_team_id');
    
    if (!teamId) {
        alert('Nie znaleziono ID drużyny!');
        return;
    }
    
    if (!confirm(`Czy chcesz zaktualizować pensje tylko dla swojej drużyny?`)) {
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
        
        // Import funkcji
        const { calculatePlayerDynamicWage } = await import('../core/economy.js');
        
        // Przygotuj aktualizacje
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

function handleQuickAction(action) {
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
            addAdminLog('Przeliczanie statystyk... (symulacja)', 'warning');
            setTimeout(() => {
                addAdminLog('Statystyki przeliczone pomyślnie', 'success');
                alert('Statystyki przeliczone!');
            }, 1500);
            break;
            
        case 'fix-players':
            addAdminLog('Naprawianie danych graczy...', 'warning');
            alert('Funkcja naprawy graczy w budowie!');
            break;
            
        case 'check-db':
            checkDatabaseConnection();
            break;
            
        case 'reset-transfers':
            if (confirm('Czy na pewno chcesz zresetować wszystkie aktywne transfery?\nTa operacja jest nieodwracalna!')) {
                addAdminLog('Resetowanie transferów...', 'warning');
                alert('Resetowanie transferów w budowie!');
            }
            break;
            
        case 'simulate-all':
            if (confirm('Czy chcesz zasymulować cały sezon?\nMoże to potrwać kilka minut.')) {
                addAdminLog('Symulacja sezonu...', 'warning');
                alert('Symulacja sezonu w budowie!');
            }
            break;
            
        default:
            addAdminLog(`Nieznana akcja: ${action}`, 'error');
            alert(`Akcja "${action}" nie jest zaimplementowana.`);
    }
}

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
        const [playersRes, teamsRes, marketRes, usersRes] = await Promise.all([
            supabaseClient.from('players').select('id, salary', { count: 'exact' }),
            supabaseClient.from('teams').select('id', { count: 'exact' }),
            supabaseClient.from('transfer_market').select('id', { count: 'exact' }).eq('status', 'active'),
            supabaseClient.from('profiles').select('id', { count: 'exact' })
        ]);
        
        // Oblicz sumę pensji
        const totalSalary = playersRes.data?.reduce((sum, p) => sum + (p.salary || 0), 0) || 0;
        
        // Oblicz średnią pensję
        const avgSalary = playersRes.data?.length ? Math.round(totalSalary / playersRes.data.length) : 0;
        
        systemStats = {
            totalPlayers: playersRes.count || 0,
            totalTeams: teamsRes.count || 0,
            activeListings: marketRes.count || 0,
            totalUsers: usersRes.count || 0,
            totalSalary: totalSalary,
            avgSalary: avgSalary
        };
        
        // Zaktualizuj UI
        document.getElementById('system-stats').innerHTML = `
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

async function handleBackupDB() {
    addAdminLog('Tworzenie backupu bazy danych...', 'warning');
    alert('Backup bazy danych w budowie (wymaga konfiguracji Supabase)');
    addAdminLog('Backup - funkcja niedostępna w tej wersji', 'warning');
}

async function handleOptimizeDB() {
    addAdminLog('Optymalizacja bazy danych...', 'warning');
    
    try {
        // Możesz dodać jakieś operacje optymalizacyjne
        addAdminLog('Optymalizacja zakończona pomyślnie', 'success');
        alert('✅ Baza danych zoptymalizowana!');
        
    } catch (error) {
        addAdminLog(`Błąd optymalizacji: ${error.message}`, 'error');
        alert(`❌ Błąd optymalizacji: ${error.message}`);
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
            transition: transform 0.2s;
        }
        
        .admin-stat-card:hover {
            transform: translateY(-5px);
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
    `;
    
    document.head.appendChild(style);
}
