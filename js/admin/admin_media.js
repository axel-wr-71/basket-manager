// js/admin/admin_media.js
import { supabaseClient } from '../auth.js'; 
import { applySiteSettings } from '../site_styles.js';

export async function renderMediaSettings() {
    const container = document.getElementById('admin-media-manager-container');
    if (!container) return;

    const { data: settings } = await supabaseClient.from('site_settings').select('*');
    const s = {};
    if (settings) settings.forEach(item => s[item.key] = item.value);

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="admin-card" style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h4>Grafiki Główne (Upload)</h4>
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Tło Landing Page:</label>
                <input type="file" id="upload-bg" accept="image/*" style="margin-bottom:10px;">
                <div id="preview-bg" style="margin-bottom:15px;">
                    ${s.landing_bg ? `<img src="${s.landing_bg}" style="height:60px; border: 1px solid #ccc; border-radius:4px;">` : '<small>Brak wgranego tła</small>'}
                </div>
                <hr style="border:0; border-top:1px solid #eee; margin: 15px 0;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Logo Gry:</label>
                <input type="file" id="upload-logo" accept="image/*" style="margin-bottom:10px;">
                <div id="preview-logo">
                    ${s.game_logo ? `<img src="${s.game_logo}" style="height:60px; border: 1px solid #ccc; border-radius:4px;">` : '<small>Brak wgranego logo</small>'}
                </div>
                <button class="btn" onclick="handleUploadMainMedia()" style="width:100%; background: #2e7d32; color:white; margin-top:20px; font-weight:bold;">Wyślij i Zapisz Grafiki</button>
            </div>
            <div class="admin-card" style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h4>Galeria (Upload)</h4>
                <label>Zdjęcie 1:</label> <input type="file" id="up-gal-1" accept="image/*" style="margin-bottom:10px; display:block;">
                <label>Zdjęcie 2:</label> <input type="file" id="up-gal-2" accept="image/*" style="margin-bottom:10px; display:block;">
                <label>Zdjęcie 3:</label> <input type="file" id="up-gal-3" accept="image/*" style="margin-bottom:20px; display:block;">
                <button class="btn" onclick="handleUploadGallery()" style="width:100%; background: #2e7d32; color:white; font-weight:bold;">Wyślij Galerię</button>
            </div>
        </div>
    `;
}

async function uploadAndGetURL(fileInputId, fileNamePrefix) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files[0]) return null;

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${fileNamePrefix}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error } = await supabaseClient.storage.from('media').upload(filePath, file);
    if (error) throw error;

    const { data: urlData } = supabaseClient.storage.from('media').getPublicUrl(filePath);
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
            const { error } = await supabaseClient.from('site_settings').upsert(updates);
            if (error) throw error;
            await applySiteSettings();
            alert("Zaktualizowano!");
            renderMediaSettings();
        }
    } catch (err) { alert(err.message); }
};

window.handleUploadGallery = async () => {
    try {
        const updates = [];
        const g1 = await uploadAndGetURL('up-gal-1', 'gal1');
        const g2 = await uploadAndGetURL('up-gal-2', 'gal2');
        const g3 = await uploadAndGetURL('up-gal-3', 'gal3');
        if (g1) updates.push({ key: 'gal_1', value: g1 });
        if (g2) updates.push({ key: 'gal_2', value: g2 });
        if (g3) updates.push({ key: 'gal_3', value: g3 });

        if (updates.length > 0) {
            const { error } = await supabaseClient.from('site_settings').upsert(updates);
            if (error) throw error;
            await applySiteSettings();
            alert("Galeria zaktualizowana!");
            renderMediaSettings();
        }
    } catch (err) { alert(err.message); }
};
