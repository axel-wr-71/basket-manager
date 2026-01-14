// js/admin/admin_media.js
import { supabase } from '../auth.js'; 

export async function renderMediaSettings() {
    const container = document.getElementById('admin-media-manager-container');
    if (!container) return;

    // Pobieramy aktualne dane, aby wyświetlić podgląd
    const { data: settings } = await supabase.from('site_settings').select('*');
    const s = {};
    if (settings) settings.forEach(item => s[item.key] = item.value);

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="admin-card" style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
                <h4>Grafiki Główne (Upload)</h4>
                
                <label>Tło Landing Page:</label>
                <input type="file" id="upload-bg" accept="image/*" style="margin-bottom:10px;">
                <div id="preview-bg">${s.landing_bg ? `<img src="${s.landing_bg}" style="height:50px; border-radius:4px;">` : ''}</div>
                <hr>
                
                <label>Logo Gry:</label>
                <input type="file" id="upload-logo" accept="image/*" style="margin-bottom:10px;">
                <div id="preview-logo">${s.game_logo ? `<img src="${s.game_logo}" style="height:50px; border-radius:4px;">` : ''}</div>
                
                <button class="btn" onclick="handleUploadMainMedia()" style="width:100%; background: #2e7d32; color:white; margin-top:15px;">Wyślij i Zapisz Grafiki</button>
            </div>

            <div class="admin-card" style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
                <h4>Galeria (Upload)</h4>
                <label>Zdjęcie 1:</label> <input type="file" id="up-gal-1" accept="image/*" style="margin-bottom:5px;">
                <label>Zdjęcie 2:</label> <input type="file" id="up-gal-2" accept="image/*" style="margin-bottom:5px;">
                <label>Zdjęcie 3:</label> <input type="file" id="up-gal-3" accept="image/*" style="margin-bottom:10px;">
                
                <button class="btn" onclick="handleUploadGallery()" style="width:100%; background: #2e7d32; color:white;">Wyślij Galerię</button>
            </div>
        </div>
    `;
}

// Funkcja pomocnicza do wysyłania pliku i pobierania URL
async function uploadAndGetURL(fileInputId, fileNamePrefix) {
    const file = document.getElementById(fileInputId).files[0];
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${fileNamePrefix}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `public/${fileName}`;

    // 1. Wysyłka do Storage
    const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file);

    if (error) throw error;

    // 2. Pobranie Publicznego URL
    const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

window.handleUploadMainMedia = async () => {
    try {
        const bgUrl = await uploadAndGetURL('upload-bg', 'bg');
        const logoUrl = await uploadAndGetURL('upload-logo', 'logo');

        const updates = [];
        if (bgUrl) updates.push({ key: 'landing_bg', value: bgUrl });
        if (logoUrl) updates.push({ key: 'game_logo', value: logoUrl });

        if (updates.length > 0) {
            await supabase.from('site_settings').upsert(updates);
            alert("Grafiki wysłane i zapisane!");
            renderMediaSettings(); // Odśwież podgląd
        }
    } catch (err) {
        alert("Błąd: " + err.message);
    }
};

window.handleUploadGallery = async () => {
    try {
        const g1 = await uploadAndGetURL('up-gal-1', 'gal1');
        const g2 = await uploadAndGetURL('up-gal-2', 'gal2');
        const g3 = await uploadAndGetURL('up-gal-3', 'gal3');

        const updates = [];
        if (g1) updates.push({ key: 'gal_1', value: g1 });
        if (g2) updates.push({ key: 'gal_2', value: g2 });
        if (g3) updates.push({ key: 'gal_3', value: g3 });

        if (updates.length > 0) {
            await supabase.from('site_settings').upsert(updates);
            alert("Galeria zaktualizowana!");
            renderMediaSettings();
        }
    } catch (err) {
        alert("Błąd uploadu: " + err.message);
    }
};
