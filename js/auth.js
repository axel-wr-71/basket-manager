// js/auth.js
const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
export const supabaseClient = _supabase;
window.supabase = _supabase;

import { initApp, switchTab } from './app/app.js';
import { initContentManager, showTerms, showPrivacy } from './content-manager.js';

window.POTENTIAL_MAP = [];

// Globalne zmienne dla modalów
let registerModal, loginModal;
let contentManager = null; // Dodano zmienną contentManager

/**
 * Nowe funkcje autoryzacji admina
 */

/**
 * Sprawdza uprawnienia admina
 */
export async function checkAdminPermissions() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            console.log("[AUTH] Brak zalogowanego użytkownika");
            return { hasAccess: false, reason: "not_logged_in" };
        }
        
        // Pobierz profil użytkownika
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('role, team_id, username, email')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error("[AUTH] Błąd pobierania profilu:", error);
            return { hasAccess: false, reason: "profile_error", error: error.message };
        }
        
        // Sprawdź warunki admina
        const isAdminRole = profile.role === 'admin';
        const hasNoTeam = profile.team_id === null;
        
        console.log(`[AUTH] Sprawdzanie admina: role=${profile.role}, team_id=${profile.team_id}`);
        console.log(`[AUTH] Warunki: isAdminRole=${isAdminRole}, hasNoTeam=${hasNoTeam}`);
        
        if (isAdminRole && hasNoTeam) {
            return { 
                hasAccess: true, 
                user: user, 
                profile: profile,
                reason: "admin_access_granted"
            };
        } else {
            return { 
                hasAccess: false, 
                reason: "insufficient_permissions",
                details: {
                    isAdminRole,
                    hasNoTeam
                }
            };
        }
        
    } catch (error) {
        console.error("[AUTH] Błąd sprawdzania uprawnień:", error);
        return { hasAccess: false, reason: "system_error", error: error.message };
    }
}

/**
 * Walidacja hasła admina
 */
export async function validateAdminPassword(password) {
    try {
        // Hasło w zmiennych środowiskowych
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;
        
        if (!adminPassword) {
            console.warn("[AUTH] Brak hasła admina w zmiennych środowiskowych, używam domyślnego");
            // Dla testów - w produkcji zawsze używaj zmiennych środowiskowych!
            const defaultPassword = "admin123secure"; // TYLKO DO TESTOW!
            return { 
                valid: password === defaultPassword, 
                message: password === defaultPassword ? "Hasło poprawne" : "Nieprawidłowe hasło" 
            };
        }
        
        if (password === adminPassword) {
            return { valid: true, message: "Hasło poprawne" };
        } else {
            return { valid: false, message: "Nieprawidłowe hasło" };
        }
        
    } catch (error) {
        console.error("[AUTH] Błąd walidacji hasła:", error);
        return { valid: false, message: "Błąd systemu podczas walidacji" };
    }
}

/**
 * Funkcje pomocnicze dla sesji admina
 */
export function isAdminSessionValid() {
    const verified = sessionStorage.getItem('admin_verified');
    const timestamp = sessionStorage.getItem('admin_verified_timestamp');
    
    if (!verified || !timestamp) {
        return false;
    }
    
    const sessionAge = Date.now() - parseInt(timestamp);
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minut
    
    return sessionAge < SESSION_DURATION;
}

export function resetAdminSession() {
    sessionStorage.removeItem('admin_verified');
    sessionStorage.removeItem('admin_verified_timestamp');
    localStorage.removeItem('admin_blocked_until');
}

/**
 * Inicjalizacja Content Managera
 */
async function initContent() {
    contentManager = await initContentManager(_supabase, {
        preload: true,
        preloadKeys: ['terms_of_service', 'privacy_policy']
    });
    
    // Aktualizuj funkcje globalne
    window.showTerms = () => contentManager.showTerms();
    window.showPrivacy = () => contentManager.showPrivacy();
}

/**
 * FUNKCJA NAPRAWIAJĄCA NAZWĘ DRUŻYNY W PRAWYM GÓRNYM ROGU
 */
async function fetchManagerTeam(userId) {
    try {
        const { data: profile, error: profileError } = await _supabase
            .from('profiles')
            .select('team_id')
            .eq('id', userId)
            .single();

        if (profileError || !profile?.team_id) {
            console.warn("[AUTH] Użytkownik nie ma przypisanego team_id w profilu.");
            return;
        }

        const { data: team, error: teamError } = await _supabase
            .from('teams')
            .select('team_name, league_name')
            .eq('id', profile.team_id)
            .single();

        if (teamError) throw teamError;

        if (team) {
            // Safari/MacBook selectors
            const headerTeamName = document.getElementById('display-team-name');
            const headerLeagueName = document.getElementById('display-league-name');

            if (headerTeamName) headerTeamName.textContent = team.team_name;
            if (headerLeagueName) headerLeagueName.textContent = team.league_name;
            
            console.log("[AUTH] Nagłówek zaktualizowany pomyślnie:", team.team_name);
        }
    } catch (err) {
        console.warn("[AUTH] Błąd podczas pobierania danych do nagłówka:", err.message);
    }
}

async function fetchPotentialDefinitions() {
    try {
        const { data, error } = await _supabase
            .from('potential_definitions')
            .select('*')
            .order('min_value', { ascending: false });
        if (error) throw error;
        window.POTENTIAL_MAP = data || [];
        console.log("[AUTH] Potencjały załadowane:", window.POTENTIAL_MAP.length);
    } catch (err) {
        console.error("Błąd potencjałów:", err);
        window.POTENTIAL_MAP = [{ min_value: 0, label: 'Player', color_hex: '#94a3b8', emoji: '👤' }];
    }
}

/**
 * Inicjalizacja systemu modalów
 */
function initAuthModals() {
    registerModal = document.getElementById('registerModal');
    loginModal = document.getElementById('loginModal');
    
    if (!registerModal || !loginModal) {
        console.warn('[AUTH] Modale nie znalezione w DOM - prawdopodobnie użytkownik jest zalogowany');
        return;
    }
    
    bindAuthEvents();
}

/**
 * Podpięcie event listenerów do modalów
 */
function bindAuthEvents() {
    // Przyciski na stronie głównej
    const signupBtn = document.getElementById('btn-signup-action');
    const loginBtn = document.getElementById('btn-login-action');
    
    if (signupBtn) {
        signupBtn.removeEventListener('click', oldSignUp); // Usuń starego listenera
        signupBtn.addEventListener('click', showRegisterModal);
    }
    
    if (loginBtn) {
        loginBtn.removeEventListener('click', oldSignIn); // Usuń starego listenera
        loginBtn.addEventListener('click', showLoginModal);
    }
    
    // Zamknięcie modalów
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', hideAllModals);
    });
    
    // Kliknięcie poza modalem
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideAllModals();
        });
    });
    
    // Przełączanie między modalami
    const switchToLogin = document.getElementById('switch-to-login');
    const switchToRegister = document.getElementById('switch-to-register');
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }
    
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterModal();
        });
    }
    
    // Formularz rejestracji
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Formularz logowania
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Klawisz Escape zamyka modale
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideAllModals();
    });
}

/**
 * Pokazuje modal rejestracji
 */
export function showRegisterModal() {
    hideAllModals();
    if (registerModal) {
        registerModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Ustaw focus na pierwsze pole
        setTimeout(() => {
            const emailInput = document.getElementById('register-email');
            if (emailInput) emailInput.focus();
        }, 100);
    }
}

/**
 * Pokazuje modal logowania
 */
export function showLoginModal() {
    hideAllModals();
    if (loginModal) {
        loginModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const emailInput = document.getElementById('login-email');
            if (emailInput) emailInput.focus();
        }, 100);
    }
}

/**
 * Ukrywa wszystkie modale
 */
function hideAllModals() {
    if (registerModal) registerModal.classList.add('hidden');
    if (loginModal) loginModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/**
 * Znajduje losową drużynę-bota w najniższej lidze
 */
async function findBotTeamForNewUser() {
    try {
        // Szukamy drużyn oznaczonych jako boty i dostępne dla nowych użytkowników
        let query = supabaseClient
            .from('teams')
            .select('*')
            .eq('is_bot', true)
            .eq('available_for_new_user', true)
            .is('owner_id', null);  // Używamy owner_id!
        
        // Spróbuj znaleźć drużynę w najniższej lidze (najwyższy level)
        try {
            const { data: lowestLeague } = await supabaseClient
                .from('leagues')
                .select('id')
                .order('level', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (lowestLeague) {
                query = query.eq('league_id', lowestLeague.id);
            }
        } catch (leagueError) {
            console.log('[AUTH] Nie znaleziono lig, szukamy dowolnej bot-drużyny');
        }
        
        // Losowe pobranie jednej drużyny
        query = query.limit(1);
        
        const { data: teams, error } = await query;
        
        if (error) throw error;
        if (!teams || teams.length === 0) {
            // Fallback: jakakolwiek drużyna bez właściciela
            const { data: fallbackTeams } = await supabaseClient
                .from('teams')
                .select('*')
                .is('owner_id', null)
                .limit(1);
            
            if (!fallbackTeams || fallbackTeams.length === 0) {
                throw new Error('Brak dostępnych drużyn do przypisania');
            }
            
            return fallbackTeams[0];
        }
        
        return teams[0];
        
    } catch (error) {
        console.error('Error finding bot team:', error);
        return null;
    }
}

/**
 * Obsługa rejestracji użytkownika
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const username = document.getElementById('register-username').value.trim();
    const teamName = document.getElementById('register-teamname').value.trim();
    const country = document.getElementById('register-country').value;
    const termsAccepted = document.getElementById('register-terms').checked;
    const newsletter = document.getElementById('register-newsletter')?.checked || false;
    
    // Walidacja
    if (!validateRegisterForm(email, password, passwordConfirm, username, teamName, country, termsAccepted)) {
        return;
    }
    
    // Przycisk ładowania
    const submitBtn = e.target.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('#register-btn-text');
    const loading = submitBtn.querySelector('#register-loading');
    
    if (btnText) btnText.style.display = 'none';
    if (loading) loading.style.display = 'flex';
    submitBtn.disabled = true;
    
    try {
        // 1. Rejestracja w Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                    newsletter_subscribed: newsletter
                }
            }
        });
        
        if (authError) throw authError;
        
        const userId = authData.user.id;
        
        // 2. Znajdź losową drużynę-bota
        const botTeam = await findBotTeamForNewUser();
        if (!botTeam) {
            throw new Error('Brak dostępnych drużyn do przypisania. Spróbuj ponownie później.');
        }
        
        // 3. Zaktualizuj drużynę (przypisz użytkownika i zmień nazwę)
        const { error: teamUpdateError } = await supabaseClient
            .from('teams')
            .update({
                owner_id: userId,           // owner_id, nie user_id!
                team_name: teamName,
                country_code: country,
                is_bot: false,
                available_for_new_user: false
            })
            .eq('id', botTeam.id);
            
        if (teamUpdateError) throw teamUpdateError;
        
        // 4. Utwórz profil użytkownika (DODANO: email)
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([{
                id: userId,
                email: email, // DODANO: Email do profilu
                username: username,
                team_id: botTeam.id,
                role: 'manager',
                newsletter_subscribed: newsletter,
                terms_accepted: termsAccepted,
                terms_accepted_at: new Date().toISOString()
            }]);
            
        if (profileError) throw profileError;
        
        // 5. Sukces!
        showMessage('register-message', 
            '✅ Registration successful! Check your email to confirm your account.', 
            'success'
        );
        
        // Wyczyść formularz
        e.target.reset();
        
        // Automatyczne logowanie po 3 sekundach
        setTimeout(async () => {
            hideAllModals();
            // Spróbuj automatycznie zalogować
            const { error: loginError } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            if (!loginError) {
                window.location.reload();
            }
        }, 3000);
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('register-message', getErrorMessage(error), 'error');
    } finally {
        // Przywróć przycisk
        if (btnText) btnText.style.display = 'block';
        if (loading) loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

/**
 * Sprawdza złożoność hasła
 */
function validatePasswordComplexity(password) {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return {
        isValid: hasLowerCase && hasUpperCase && hasNumbers,
        hasLowerCase,
        hasUpperCase,
        hasNumbers
    };
}

/**
 * Walidacja formularza rejestracji
 */
function validateRegisterForm(email, password, passwordConfirm, username, teamName, country, termsAccepted) {
    const messageEl = document.getElementById('register-message');
    
    // Reset message
    messageEl.textContent = '';
    messageEl.className = 'form-message hidden';
    
    // Sprawdź czy wszystkie pola są wypełnione
    if (!email || !password || !passwordConfirm || !username || !teamName || !country) {
        showMessage('register-message', 'Please fill in all required fields', 'error');
        return false;
    }
    
    // Walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('register-message', 'Please enter a valid email address', 'error');
        return false;
    }
    
    // Długość hasła
    if (password.length < 8) {
        showMessage('register-message', 'Password must be at least 8 characters long', 'error');
        return false;
    }
    
    // Złożoność hasła
    const passwordCheck = validatePasswordComplexity(password);
    if (!passwordCheck.isValid) {
        let requirements = [];
        if (!passwordCheck.hasLowerCase) requirements.push('lowercase letter (a-z)');
        if (!passwordCheck.hasUpperCase) requirements.push('uppercase letter (A-Z)');
        if (!passwordCheck.hasNumbers) requirements.push('number (0-9)');
        
        showMessage('register-message', 
            `Password must contain at least one: ${requirements.join(', ')}`, 
            'error'
        );
        return false;
    }
    
    // Sprawdzenie zgodności haseł
    if (password !== passwordConfirm) {
        showMessage('register-message', 'Passwords do not match', 'error');
        return false;
    }
    
    // Nazwa użytkownika
    if (username.length < 3) {
        showMessage('register-message', 'Username must be at least 3 characters', 'error');
        return false;
    }
    
    // Nazwa drużyny
    if (teamName.length < 3) {
        showMessage('register-message', 'Team name must be at least 3 characters', 'error');
        return false;
    }
    
    // Zgody
    if (!termsAccepted) {
        showMessage('register-message', 'You must accept the Terms of Service and Privacy Policy', 'error');
        return false;
    }
    
    return true;
}

/**
 * Obsługa logowania w modal
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Sukces - zamknij modal
        hideAllModals();
        
        // Sprawdź użytkownika (to zaktualizuje UI)
        await checkUser();
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('login-message', getErrorMessage(error), 'error');
    }
}

/**
 * Przyjazne komunikaty błędów
 */
function getErrorMessage(error) {
    const messages = {
        'User already registered': 'User with this email already exists',
        'Email not confirmed': 'Please confirm your email before logging in',
        'Invalid login credentials': 'Invalid email or password',
        'Password should be at least 6 characters': 'Password must be at least 6 characters',
        'Password should be at least 8 characters': 'Password must be at least 8 characters',
        'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789': 
            'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    };
    
    return messages[error.message] || error.message || 'An unexpected error occurred';
}

/**
 * Pokazuje komunikat w modalach
 */
function showMessage(elementId, text, type) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = text;
    element.className = `form-message ${type}`;
    element.classList.remove('hidden');
    
    // Ukryj po 5 sekundach (oprócz sukcesu w rejestracji)
    if (type !== 'success' || elementId === 'login-message') {
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
}

// Zachowaj stare funkcje dla kompatybilności wstecznej
async function oldSignIn() {
    const e = document.getElementById('email')?.value;
    const p = document.getElementById('password')?.value;
    console.log("[AUTH] Próba logowania (stara metoda)...");
    const { error } = await _supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) {
        alert("Error: " + error.message);
    } else {
        await checkUser();
    }
}

async function oldSignUp() {
    const e = document.getElementById('email')?.value;
    const p = document.getElementById('password')?.value;
    const { error } = await _supabase.auth.signUp({ email: e, password: p });
    if (error) alert("Registration error: " + error.message);
    else alert("Account created! You can now log in.");
}

/**
 * Zaktualizowana funkcja setupUI - eliminuje migotanie
 */
export const setupUI = async (role) => {
    console.log("[AUTH] setupUI dla roli:", role);
    const landingPage = document.getElementById('landing-page');
    const gameApp = document.getElementById('game-app');
    const managerNav = document.getElementById('manager-nav');

    // Usuwamy klasy blokujące widoczność (Anti-Flicker)
    if (landingPage) {
        landingPage.style.display = 'none';
        landingPage.classList.add('auth-state-pending');
    }
    
    if (gameApp) {
        gameApp.style.display = 'block';
        gameApp.classList.remove('auth-state-pending');
    }

    if (role === 'manager') {
        if (managerNav) managerNav.style.display = 'flex';
        await initApp();
        await switchTab('m-roster');
    }
};
window.setupUI = setupUI;

/**
 * NOWA FUNKCJA: showLogin
 * Bezpieczne pokazanie ekranu logowania bez migania
 */
window.showLogin = function() {
    const landingPage = document.getElementById('landing-page');
    const gameApp = document.getElementById('game-app');
    
    if (gameApp) {
        gameApp.style.display = 'none';
        gameApp.classList.add('auth-state-pending');
    }
    if (landingPage) {
        landingPage.style.display = 'flex';
        landingPage.classList.remove('auth-state-pending');
    }
    
    // Inicjalizuj modale gdy pokazujemy stronę logowania
    setTimeout(initAuthModals, 100);
};

export async function checkUser() {
    // Sprawdzamy sesję
    const { data: { session } } = await _supabase.auth.getSession();
    const user = session?.user;
    
    if (user) {
        await fetchPotentialDefinitions();
        
        let { data: profile } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile) {
            const { data: newProfile } = await _supabase
                .from('profiles')
                .insert([{ 
                    id: user.id, 
                    email: user.email, // DODANO: Email przy tworzeniu profilu
                    role: 'manager' 
                }])
                .select().single();
            profile = newProfile;
        }

        await fetchManagerTeam(user.id);
        await setupUI(profile?.role || 'manager');
    } else {
        // Wywołujemy bezpieczne pokazanie logowania
        window.showLogin();
    }
}
window.checkUser = checkUser;

// Nowe funkcje signIn i signUp dla kompatybilności
export const signIn = showLoginModal;
export const signUp = showRegisterModal;

export const logout = async () => { 
    await _supabase.auth.signOut(); 
    location.reload(); 
};
window.logout = logout;

// Nasłuchiwanie zmian stanu (kluczowe dla Safari przy odświeżaniu)
_supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') checkUser();
    if (event === 'SIGNED_OUT') window.showLogin();
});

// Inicjalizacja przy załadowaniu strony
document.addEventListener('DOMContentLoaded', async () => {
    await initContent(); // Dodano inicjalizację content managera
    checkUser();
    // Inicjalizuj modale z opóźnieniem, aby DOM miał czas na załadowanie
    setTimeout(initAuthModals, 500);
});
