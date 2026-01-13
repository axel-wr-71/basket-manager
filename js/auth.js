// Plik: js/auth.js

const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function signIn() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    
    if(!e || !p) {
        alert(currentLang === 'pl' ? "Wypełnij wszystkie pola!" : "Fill all fields!");
        return;
    }

    const { error } = await _supabase.auth.signInWithPassword({email:e, password:p});
    if(error) {
        alert(currentLang === 'pl' ? "Błąd logowania: " + error.message : "Login error: " + error.message);
    } else {
        checkUser();
    }
}

async function signUp() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    
    if(!e || !p) {
        alert(currentLang === 'pl' ? "Wypełnij wszystkie pola!" : "Fill all fields!");
        return;
    }

    const { error } = await _supabase.auth.signUp({email:e, password:p});
    if(error) {
        alert(currentLang === 'pl' ? "Błąd rejestracji: " + error.message : "Signup error: " + error.message);
    } else {
        alert(currentLang === 'pl' ? "Konto stworzone! Sprawdź e-mail." : "Account created! Check your email.");
    }
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('game-app');
    const admin = document.getElementById('admin-panel');

    if(user) {
        // Logika dla zalogowanego użytkownika
        landing.style.display = 'none';
        app.style.display = 'block';
        document.getElementById('user-display').innerText = user.email;
        
        // Pokazuje panel admina tylko dla konkretnego adresu
        if(user.email === 'strubbe23@gmail.com') {
            admin.style.display = 'block';
        } else {
            admin.style.display = 'none';
        }
    } else {
        // Logika dla niezalogowanego (ekran startowy)
        landing.style.display = 'block';
        app.style.display = 'none';
    }
}

async function logout() { 
    await _supabase.auth.signOut(); 
    // Po wylogowaniu czyścimy wszystko i przeładowujemy stronę
    location.reload(); 
}

// Uruchomienie sprawdzenia przy starcie
checkUser();
