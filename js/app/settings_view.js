import { supabaseClient } from '../auth.js';

/**
 * Renderuje widok ustawień w formie popupu
 */
export function renderSettingsView() {
    // Sprawdź, czy modal już istnieje
    let modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadSettingsData();
        return;
    }

    // Tworzymy strukturę modalu
    modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 700px; max-height: 85vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>⚙️ Ustawienia</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-form" style="padding: 0;">
                <div class="settings-tabs">
                    <div class="settings-tab active" data-tab="account">Konto</div>
                    <div class="settings-tab" data-tab="team">Drużyna</div>
                    <div class="settings-tab" data-tab="menu">Menu</div>
                    <div class="settings-tab" data-tab="privacy">Prywatność</div>
                    <div class="settings-tab" data-tab="gameplay">Rozgrywka</div>
                </div>
                <div class="settings-content">
                    <!-- Konto -->
                    <div id="tab-account" class="settings-tab-content active">
                        <h3>Ustawienia konta</h3>
                        <form id="form-email">
                            <div class="form-group">
                                <label>Aktualny email</label>
                                <input type="email" id="current-email" disabled>
                            </div>
                            <div class="form-group">
                                <label>Nowy email</label>
                                <input type="email" id="new-email" placeholder="Wprowadź nowy email">
                                <small>Po zmianie otrzymasz email weryfikacyjny</small>
                            </div>
                            <div class="form-group">
                                <label>Potwierdź hasłem</label>
                                <input type="password" id="email-password" placeholder="Wprowadź aktualne hasło">
                            </div>
                            <button type="submit" class="btn-submit">Zmień email</button>
                        </form>
                        
                        <div class="form-divider"></div>
                        
                        <h3>Zmień hasło</h3>
                        <form id="form-password">
                            <div class="form-group">
                                <label>Aktualne hasło</label>
                                <input type="password" id="current-password" placeholder="Wprowadź aktualne hasło">
                            </div>
                            <div class="form-group">
                                <label>Nowe hasło</label>
                                <input type="password" id="new-password" placeholder="Wprowadź nowe hasło">
                            </div>
                            <div class="form-group">
                                <label>Potwierdź nowe hasło</label>
                                <input type="password" id="confirm-password" placeholder="Powtórz nowe hasło">
                            </div>
                            <button type="submit" class="btn-submit">Zmień hasło</button>
                        </form>
                    </div>
                    
                    <!-- Drużyna -->
                    <div id="tab-team" class="settings-tab-content">
                        <h3>Ustawienia drużyny</h3>
                        <div class="team-info-card" style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                            <p><strong>🏆 Drużyna:</strong> <span id="team-name-display"></span></p>
                            <p><strong>🏟️ Arena:</strong> <span id="arena-name-display"></span></p>
                            <p><strong>💰 Budżet:</strong> <span id="team-budget-display"></span> €</p>
                            <p><strong>📅 Sezon:</strong> <span id="team-season-display"></span></p>
                        </div>
                        
                        <form id="form-team-name">
                            <div class="form-group">
                                <label>Zmiana nazwy drużyny</label>
                                <input type="text" id="team-name-input" placeholder="Wprowadź nową nazwę drużyny">
                                <small id="team-change-info" style="color: #64748b;">Możesz zmienić nazwę drużyny raz na sezon</small>
                            </div>
                            <button type="submit" class="btn-submit">Zapisz nazwę drużyny</button>
                        </form>
                    </div>
                    
                    <!-- Menu -->
                    <div id="tab-menu" class="settings-tab-content">
                        <h3>Dostosuj menu</h3>
                        <p style="color: #64748b; margin-bottom: 20px;">
                            Przeciągnij i upuść elementy aby zmienić kolejność widoków w menu.
                        </p>
                        
                        <div id="menu-order-container" style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 15px;">
                            <ul id="menu-order-list" class="sortable-list">
                                <!-- Dynamicznie wypełniane -->
                            </ul>
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button id="save-menu-order" class="btn-submit" style="flex: 1;">Zapisz kolejność</button>
                            <button id="reset-menu-order" class="btn-secondary" style="flex: 1;">Przywróć domyślną</button>
                        </div>
                        
                        <div class="form-divider"></div>
                        
                        <h3>Statystyki w menu</h3>
                        <div class="form-group" style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="show-menu-stats">
                            <label for="show-menu-stats" style="margin-bottom: 0;">Pokaż statystyki w kafelkach menu</label>
                        </div>
                    </div>
                    
                    <!-- Prywatność -->
                    <div id="tab-privacy" class="settings-tab-content">
                        <h3>Prywatność i zgody</h3>
                        <form id="form-consents">
                            <div class="form-group" style="background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #e0f2fe;">
                                <h4 style="margin-top: 0; color: #0369a1;">📧 Komunikacja</h4>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <input type="checkbox" id="newsletter-consent">
                                    <label for="newsletter-consent" style="margin-bottom: 0;">Subskrybuj newsletter EBL</label>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="checkbox" id="match-notifications">
                                    <label for="match-notifications" style="margin-bottom: 0;">Powiadomienia o meczach</label>
                                </div>
                                <small style="color: #64748b; display: block; margin-top: 10px;">
                                    Otrzymuj powiadomienia o ważnych wydarzeniach w grze
                                </small>
                            </div>
                            
                            <div class="form-group" style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fee2e2; margin-top: 20px;">
                                <h4 style="margin-top: 0; color: #dc2626;">🔒 Prywatność</h4>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                    <input type="checkbox" id="public-profile">
                                    <label for="public-profile" style="margin-bottom: 0;">Profil publiczny</label>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="checkbox" id="show-in-leaderboards">
                                    <label for="show-in-leaderboards" style="margin-bottom: 0;">Pokazuj w rankingach</label>
                                </div>
                                <small style="color: #64748b; display: block; margin-top: 10px;">
                                    Kontroluj swoją widoczność dla innych graczy
                                </small>
                            </div>
                            
                            <div class="form-group" style="margin-top: 20px;">
                                <label>Preferowany język</label>
                                <select id="language-preference">
                                    <option value="pl">🇵🇱 Polski</option>
                                    <option value="en">🇺🇸 English</option>
                                    <option value="de">🇩🇪 Deutsch</option>
                                    <option value="es">🇪🇸 Español</option>
                                </select>
                            </div>
                            
                            <button type="submit" class="btn-submit">Zapisz preferencje</button>
                        </form>
                    </div>
                    
                    <!-- Rozgrywka -->
                    <div id="tab-gameplay" class="settings-tab-content">
                        <h3>Ustawienia rozgrywki</h3>
                        
                        <div class="form-group">
                            <label>Tryb wyświetlania statystyk</label>
                            <select id="stats-display-mode">
                                <option value="detailed">Szczegółowy</option>
                                <option value="compact">Kompaktowy</option>
                                <option value="advanced">Zaawansowany</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Domyślny widok składu</label>
                            <select id="default-roster-view">
                                <option value="grid">Kafelki</option>
                                <option value="list">Lista</option>
                                <option value="stats">Statystyki</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <h4>Powiadomienia w grze</h4>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <input type="checkbox" id="notify-transfers" checked>
                                <label for="notify-transfers" style="margin-bottom: 0;">Transfery zawodników</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <input type="checkbox" id="notify-injuries" checked>
                                <label for="notify-injuries" style="margin-bottom: 0;">Kontuzje zawodników</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <input type="checkbox" id="notify-finances" checked>
                                <label for="notify-finances" style="margin-bottom: 0;">Alerty finansowe</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="notify-matches" checked>
                                <label for="notify-matches" style="margin-bottom: 0;">Wyniki meczów</label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <h4>Automatyzacja</h4>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <input type="checkbox" id="auto-substitutions">
                                <label for="auto-substitutions" style="margin-bottom: 0;">Automatyczne zmiany w meczu</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="auto-contract-renewals">
                                <label for="auto-contract-renewals" style="margin-bottom: 0;">Automatyczne przedłużenia kontraktów</label>
                            </div>
                        </div>
                        
                        <button id="save-gameplay-settings" class="btn-submit">Zapisz ustawienia</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Inicjalizacja tabów
    const tabs = modal.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.settings-tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // Zamknięcie modala
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Załaduj dane
    loadSettingsData();
}

/**
 * Ładuje dane ustawień
 */
async function loadSettingsData() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    try {
        // Pobierz dane użytkownika
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*, team_id')
            .eq('id', user.id)
            .single();

        // Pobierz dane drużyny
        const { data: team } = await supabaseClient
            .from('teams')
            .select('*, arenas(name)')
            .eq('id', profile.team_id)
            .single();

        // Ustaw wartości formularzy
        document.getElementById('current-email').value = user.email;
        document.getElementById('team-name-display').textContent = team?.team_name || 'Brak danych';
        document.getElementById('arena-name-display').textContent = team?.arenas?.name || 'Brak danych';
        document.getElementById('team-budget-display').textContent = team?.budget?.toLocaleString('pl-PL') || '0';
        document.getElementById('team-season-display').textContent = window.gameState.currentWeek || '1';
        document.getElementById('team-name-input').value = team?.team_name || '';

        // Sprawdź kiedy ostatnio zmieniano nazwę drużyny
        const lastChange = team?.last_name_change;
        if (lastChange) {
            const now = new Date();
            const lastChangeDate = new Date(lastChange);
            const seasonStart = new Date(now.getFullYear(), 0, 1); // 1 stycznia bieżącego roku
            if (lastChangeDate >= seasonStart) {
                document.getElementById('team-change-info').textContent = 
                    '✋ Nazwa drużyny została już zmieniona w tym sezonie. Następna zmiana możliwa w nowym sezonie.';
                document.getElementById('team-change-info').style.color = '#ef4444';
                document.getElementById('form-team-name').querySelector('button').disabled = true;
            }
        }

        // Załaduj ustawienia menu
        loadMenuOrder();

        // Załaduj zgody
        loadConsents(profile);

        // Załaduj ustawienia rozgrywki
        loadGameplaySettings();

    } catch (error) {
        console.error('Error loading settings:', error);
        showMessage('Wystąpił błąd podczas ładowania ustawień', 'error');
    }
}

/**
 * Ładuje listę modułów do przeciągania
 */
async function loadMenuOrder() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    try {
        // Pobierz moduły użytkownika z user_dashboard_settings
        const { data: settings } = await supabaseClient
            .from('user_dashboard_settings')
            .select('*, app_modules(*)')
            .eq('user_id', user.id)
            .order('order_index', { ascending: true });

        // Pobierz wszystkie dostępne moduły (bez admina)
        const { data: allModules } = await supabaseClient
            .from('app_modules')
            .select('*')
            .eq('is_active', true)
            .neq('module_key', 'm-admin')
            .order('default_order', { ascending: true });

        const container = document.getElementById('menu-order-list');
        container.innerHTML = '';

        // Jeśli użytkownik ma ustawienia, użyj ich, w przeciwnym razie użyj domyślnych
        let modulesToDisplay = [];
        if (settings && settings.length > 0) {
            modulesToDisplay = settings.map(s => s.app_modules).filter(m => m);
        } else if (allModules) {
            modulesToDisplay = allModules;
        }

        modulesToDisplay.forEach(module => {
            const li = document.createElement('li');
            li.dataset.id = module.id;
            li.dataset.key = module.module_key;
            li.innerHTML = `
                <span class="drag-handle">☰</span>
                <span class="module-icon">${module.icon || '📊'}</span>
                <span class="module-name">${module.display_name}</span>
                <span class="module-stats">${getModuleStats(module.module_key)}</span>
            `;
            container.appendChild(li);
        });

        // Inicjalizacja SortableJS
        if (typeof Sortable !== 'undefined') {
            new Sortable(container, {
                handle: '.drag-handle',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag'
            });
        }

    } catch (error) {
        console.error('Error loading menu order:', error);
    }
}

/**
 * Pobiera statystyki modułu
 */
function getModuleStats(moduleKey) {
    const stats = {
        'm-roster': window.gameState.players?.length || 0,
        'm-training': '💪',
        'm-market': '💰',
        'm-media': '📰',
        'm-finances': window.gameState.team?.budget ? '€' : '💰',
        'm-arena': '🏟️',
        'm-myclub': '🏀',
        'm-schedule': '📅',
        'm-league': '🏆',
        'm-nationalcup': window.gameState.nationalCupData ? '🏆' : '',
        'm-staff': '👥'
    };
    
    return stats[moduleKey] || '';
}

/**
 * Ładuje zgody użytkownika
 */
async function loadConsents(profile) {
    document.getElementById('newsletter-consent').checked = profile?.newsletter_consent || false;
    document.getElementById('match-notifications').checked = profile?.match_notifications || true;
    document.getElementById('public-profile').checked = profile?.public_profile || false;
    document.getElementById('show-in-leaderboards').checked = profile?.show_in_leaderboards || true;
    document.getElementById('language-preference').value = profile?.language || 'pl';
}

/**
 * Ładuje ustawienia rozgrywki
 */
async function loadGameplaySettings() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    try {
        const { data: settings } = await supabaseClient
            .from('user_game_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (settings) {
            document.getElementById('stats-display-mode').value = settings.stats_display_mode || 'detailed';
            document.getElementById('default-roster-view').value = settings.default_roster_view || 'grid';
            document.getElementById('notify-transfers').checked = settings.notify_transfers ?? true;
            document.getElementById('notify-injuries').checked = settings.notify_injuries ?? true;
            document.getElementById('notify-finances').checked = settings.notify_finances ?? true;
            document.getElementById('notify-matches').checked = settings.notify_matches ?? true;
            document.getElementById('auto-substitutions').checked = settings.auto_substitutions ?? false;
            document.getElementById('auto-contract-renewals').checked = settings.auto_contract_renewals ?? false;
            document.getElementById('show-menu-stats').checked = settings.show_menu_stats ?? true;
        }
    } catch (error) {
        console.error('Error loading gameplay settings:', error);
    }
}

/**
 * Obsługa zmiany emaila
 */
document.addEventListener('submit', async function(e) {
    if (e.target.id === 'form-email') {
        e.preventDefault();
        await updateEmail();
    }
    if (e.target.id === 'form-password') {
        e.preventDefault();
        await updatePassword();
    }
    if (e.target.id === 'form-team-name') {
        e.preventDefault();
        await updateTeamName();
    }
    if (e.target.id === 'form-consents') {
        e.preventDefault();
        await updateConsents();
    }
});

/**
 * Obsługa przycisków menu
 */
document.addEventListener('click', async function(e) {
    if (e.target.id === 'save-menu-order') {
        await saveMenuOrder();
    }
    if (e.target.id === 'reset-menu-order') {
        await resetMenuOrder();
    }
    if (e.target.id === 'save-gameplay-settings') {
        await saveGameplaySettings();
    }
});

/**
 * Aktualizuje email użytkownika
 */
async function updateEmail() {
    const newEmail = document.getElementById('new-email').value;
    const password = document.getElementById('email-password').value;

    if (!newEmail || !password) {
        showMessage('Wypełnij wszystkie pola', 'error');
        return;
    }

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // Najpierw sprawdź hasło
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (signInError) {
            showMessage('Nieprawidłowe hasło', 'error');
            return;
        }

        // Zmiana emaila
        const { error } = await supabaseClient.auth.updateUser({
            email: newEmail
        });

        if (error) throw error;

        showMessage('Email został zmieniony. Sprawdź nowy adres email aby potwierdzić zmianę.', 'success');
        document.getElementById('new-email').value = '';
        document.getElementById('email-password').value = '';

    } catch (error) {
        console.error('Error updating email:', error);
        showMessage('Wystąpił błąd podczas zmiany emaila: ' + error.message, 'error');
    }
}

/**
 * Aktualizuje hasło użytkownika
 */
async function updatePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showMessage('Nowe hasła nie są identyczne', 'error');
        return;
    }

    if (newPassword.length < 8) {
        showMessage('Hasło musi mieć co najmniej 8 znaków', 'error');
        return;
    }

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // Sprawdź aktualne hasło
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (signInError) {
            showMessage('Nieprawidłowe aktualne hasło', 'error');
            return;
        }

        // Zmiana hasła
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showMessage('Hasło zostało zmienione pomyślnie', 'success');
        document.getElementById('form-password').reset();

    } catch (error) {
        console.error('Error updating password:', error);
        showMessage('Wystąpił błąd podczas zmiany hasła: ' + error.message, 'error');
    }
}

/**
 * Aktualizuje nazwę drużyny
 */
async function updateTeamName() {
    const teamName = document.getElementById('team-name-input').value;
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!teamName.trim()) {
        showMessage('Wprowadź nazwę drużyny', 'error');
        return;
    }

    try {
        // Sprawdź czy można zmienić nazwę w tym sezonie
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('team_id')
            .eq('id', user.id)
            .single();

        const { data: team } = await supabaseClient
            .from('teams')
            .select('last_name_change')
            .eq('id', profile.team_id)
            .single();

        if (team?.last_name_change) {
            const now = new Date();
            const lastChange = new Date(team.last_name_change);
            const seasonStart = new Date(now.getFullYear(), 0, 1);
            if (lastChange >= seasonStart) {
                showMessage('Nie możesz zmienić nazwy drużyny więcej niż raz w sezonie', 'error');
                return;
            }
        }

        // Aktualizuj nazwę drużyny
        const { error } = await supabaseClient
            .from('teams')
            .update({ 
                team_name: teamName,
                last_name_change: new Date().toISOString()
            })
            .eq('id', profile.team_id);

        if (error) throw error;

        // Aktualizuj gameState
        window.gameState.team.team_name = teamName;
        
        // Aktualizuj UI
        document.querySelectorAll('#display-team-name, .team-info b').forEach(el => {
            el.textContent = teamName;
        });

        showMessage('Nazwa drużyny została zmieniona pomyślnie', 'success');

    } catch (error) {
        console.error('Error updating team name:', error);
        showMessage('Wystąpił błąd podczas zmiany nazwy drużyny', 'error');
    }
}

/**
 * Zapisuje kolejność menu
 */
async function saveMenuOrder() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const items = document.querySelectorAll('#menu-order-list li');
    const updates = [];

    for (let i = 0; i < items.length; i++) {
        const moduleId = items[i].dataset.id;
        updates.push({
            user_id: user.id,
            module_id: moduleId,
            order_index: i
        });
    }

    try {
        // Usuń stare ustawienia
        const { error: deleteError } = await supabaseClient
            .from('user_dashboard_settings')
            .delete()
            .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Wstaw nowe ustawienia
        const { error: insertError } = await supabaseClient
            .from('user_dashboard_settings')
            .insert(updates);

        if (insertError) throw insertError;

        showMessage('Kolejność menu została zapisana', 'success');
        
        // Przeładuj nawigację
        if (typeof window.loadDynamicNavigation === 'function') {
            window.loadDynamicNavigation();
        }

    } catch (error) {
        console.error('Error saving menu order:', error);
        showMessage('Wystąpił błąd podczas zapisywania kolejności menu', 'error');
    }
}

/**
 * Resetuje kolejność menu do domyślnej
 */
async function resetMenuOrder() {
    if (!confirm('Czy na pewno chcesz przywrócić domyślną kolejność menu?')) {
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    try {
        // Usuń ustawienia użytkownika
        const { error } = await supabaseClient
            .from('user_dashboard_settings')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;

        // Przeładuj menu
        await loadMenuOrder();
        showMessage('Przywrócono domyślną kolejność menu', 'success');
        
        // Przeładuj nawigację
        if (typeof window.loadDynamicNavigation === 'function') {
            window.loadDynamicNavigation();
        }

    } catch (error) {
        console.error('Error resetting menu order:', error);
        showMessage('Wystąpił błąd podczas resetowania menu', 'error');
    }
}

/**
 * Aktualizuje zgody użytkownika
 */
async function updateConsents() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const updates = {
        newsletter_consent: document.getElementById('newsletter-consent').checked,
        match_notifications: document.getElementById('match-notifications').checked,
        public_profile: document.getElementById('public-profile').checked,
        show_in_leaderboards: document.getElementById('show-in-leaderboards').checked,
        language: document.getElementById('language-preference').value,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;

        showMessage('Preferencje zostały zapisane', 'success');

    } catch (error) {
        console.error('Error updating consents:', error);
        showMessage('Wystąpił błąd podczas zapisywania preferencji', 'error');
    }
}

/**
 * Zapisuje ustawienia rozgrywki
 */
async function saveGameplaySettings() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const settings = {
        user_id: user.id,
        stats_display_mode: document.getElementById('stats-display-mode').value,
        default_roster_view: document.getElementById('default-roster-view').value,
        notify_transfers: document.getElementById('notify-transfers').checked,
        notify_injuries: document.getElementById('notify-injuries').checked,
        notify_finances: document.getElementById('notify-finances').checked,
        notify_matches: document.getElementById('notify-matches').checked,
        auto_substitutions: document.getElementById('auto-substitutions').checked,
        auto_contract_renewals: document.getElementById('auto-contract-renewals').checked,
        show_menu_stats: document.getElementById('show-menu-stats').checked,
        updated_at: new Date().toISOString()
    };

    try {
        // Sprawdź czy ustawienia już istnieją
        const { data: existing } = await supabaseClient
            .from('user_game_settings')
            .select('id')
            .eq('user_id', user.id)
            .single();

        let error;
        if (existing) {
            // Aktualizuj istniejące
            ({ error } = await supabaseClient
                .from('user_game_settings')
                .update(settings)
                .eq('user_id', user.id));
        } else {
            // Wstaw nowe
            ({ error } = await supabaseClient
                .from('user_game_settings')
                .insert(settings));
        }

        if (error) throw error;

        showMessage('Ustawienia rozgrywki zostały zapisane', 'success');

    } catch (error) {
        console.error('Error saving gameplay settings:', error);
        showMessage('Wystąpił błąd podczas zapisywania ustawień', 'error');
    }
}

/**
 * Wyświetla komunikat
 */
function showMessage(text, type) {
    // Sprawdź czy już istnieje komunikat
    let messageEl = document.getElementById('settings-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'settings-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(messageEl);
    }

    messageEl.textContent = text;
    messageEl.style.background = type === 'success' ? '#10b981' : '#ef4444';

    // Ukryj po 5 sekundach
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 5000);
}

// Dodaj style CSS
const style = document.createElement('style');
style.textContent = `
    .form-divider {
        height: 1px;
        background: #e5e7eb;
        margin: 30px 0;
    }
    
    .sortable-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .sortable-list li {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        background: white;
        border: 1px solid #e5e7eb;
        margin-bottom: 8px;
        border-radius: 8px;
        cursor: move;
        transition: all 0.2s;
    }
    
    .sortable-list li:hover {
        background: #f8fafc;
        transform: translateX(2px);
    }
    
    .drag-handle {
        margin-right: 12px;
        cursor: move;
        color: #94a3b8;
        font-size: 1.2rem;
    }
    
    .module-icon {
        margin-right: 12px;
        font-size: 1.2rem;
        width: 24px;
        text-align: center;
    }
    
    .module-name {
        flex: 1;
        font-weight: 500;
        color: #1a237e;
    }
    
    .module-stats {
        background: #f1f5f9;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.8rem;
        color: #64748b;
    }
    
    .sortable-ghost {
        opacity: 0.4;
        background: #f1f5f9;
    }
    
    .sortable-chosen {
        background: #e0f2fe;
        border-color: #38bdf8;
    }
    
    .btn-secondary {
        padding: 12px 20px;
        background: white;
        color: #64748b;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-secondary:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
