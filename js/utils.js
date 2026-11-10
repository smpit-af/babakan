// ============================================================
// APP.JS — SMP IT AL-FATHONAH
// Landing Page + Dashboard Logic
// ============================================================
const SUPABASE_URL = 'https://jmzloygmuwzixdkenkph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptemxveWdtdXd6aXhka2Vua3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDkzMzUsImV4cCI6MjA5MDA4NTMzNX0.GuIRC_1CkGG4B578tFcKLRiAA96MWDppFA-U_dfZF40';

let supabaseClient = null;
let currentUser = null;
let currentRole = null;

try {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) { console.warn('Supabase init error:', e); }

// ============================================================
// ROLE CONFIG
// ============================================================
var ROLE_LABELS = {
    'admin': 'Administrator',
    'kurikulum': 'Kurikulum',
    'kepala_sekolah': 'Kepala Sekolah',
    'kesiswaan': 'Kesiswaan',
    'wali_kelas': 'Wali Kelas',
    'operator_sekolah': 'Operator Sekolah',
    'guru_mapel': 'Guru Mapel',
    'bendahara': 'Bendahara',
    'siswa': 'Siswa',
    'menunggu_persetujuan': 'Menunggu Persetujuan',
    'nonaktif': 'Nonaktif'
};

var ASSIGNABLE_ROLES = [
    { value: 'admin', label: 'Administrator' },
    { value: 'kurikulum', label: 'Kurikulum' },
    { value: 'kepala_sekolah', label: 'Kepala Sekolah' },
    { value: 'kesiswaan', label: 'Kesiswaan' },
    { value: 'wali_kelas', label: 'Wali Kelas' },
    { value: 'operator_sekolah', label: 'Operator Sekolah' },
    { value: 'guru_mapel', label: 'Guru Mapel' },
    { value: 'bendahara', label: 'Bendahara' },
    { value: 'siswa', label: 'Siswa' }
];

function getRoleLabel(role) { return ROLE_LABELS[role] || role; }
function getInitials(name) { if (!name) return '?'; return name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase(); }
function buildRoleOptions() {
    return '<option value="">Pilih Role...</option>' + ASSIGNABLE_ROLES.map(function (r) {
        return '<option value="' + r.value + '">' + r.label + '</option>';
    }).join('');
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.innerHTML = '<div class="toast-icon">' + (icons[type] || icons.info) + '</div>' +
        '<div class="toast-content"><span class="toast-message">' + message + '</span></div>' +
        '<button class="toast-close" onclick="this.parentElement.remove()">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('toast-show'); });
    var timeout = setTimeout(function () { dismissToast(toast); }, 4500);
    toast.addEventListener('mouseenter', function () { clearTimeout(timeout); });
    toast.addEventListener('mouseleave', function () { timeout = setTimeout(function () { dismissToast(toast); }, 2000); });
}
function dismissToast(t) { t.classList.add('toast-hide'); t.addEventListener('animationend', function () { t.remove(); }); }

// ============================================================
// GOOGLE DRIVE UPLOADER VIA GOOGLE APPS SCRIPT
// ============================================================
var _cachedGasUrl = null;

async function _getGasUrl() {
    if (_cachedGasUrl) return _cachedGasUrl;
    // Coba ambil dari input field di DOM (sudah dimuat saat halaman soal asesmen dibuka)
    var inputEl = document.getElementById('gasUrlInput');
    if (inputEl && inputEl.value && inputEl.value.trim()) {
        _cachedGasUrl = inputEl.value.trim();
        return _cachedGasUrl;
    }
    // Fallback: ambil dari database
    if (supabaseClient) {
        try {
            var { data } = await supabaseClient.from('system_settings').select('value').eq('key', 'gas_web_app_url').maybeSingle();
            if (data && data.value) {
                _cachedGasUrl = data.value;
                return _cachedGasUrl;
            }
        } catch (e) { console.warn('Gagal memuat GAS URL:', e); }
    }
    throw new Error('URL Google Apps Script belum dikonfigurasi. Buka menu Buat Soal Asesmen > Konfigurasi untuk mengisi URL.');
}

/**
 * Upload file gambar ke Google Drive via Google Apps Script.
 * @param {File|Blob} file - File gambar yang akan diupload
 * @param {string} folder - Nama subfolder di Google Drive (siswa, guru, berita, eskul, sarpras, hero, soal, galeri, forum)
 * @returns {Promise<string>} URL thumbnail gambar dari Google Drive
 */
async function uploadToGoogleDrive(file, folder) {
    var gasUrl = await _getGasUrl();

    // Konversi file ke base64
    var base64 = await new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            // Ambil bagian base64 saja (hilangkan prefix "data:image/...;base64,")
            var result = reader.result;
            var base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = function () { reject(new Error('Gagal membaca file.')); };
        reader.readAsDataURL(file);
    });

    // Kirim ke Google Apps Script
    var res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'upload_image',
            folder: folder || 'lainnya',
            fileName: (folder || 'img') + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '.' + (file.type === 'image/png' ? 'png' : 'jpg'),
            mimeType: file.type || 'image/jpeg',
            base64: base64
        })
    });

    var data = await res.json();
    if (data.status !== 'success') {
        throw new Error(data.message || 'Gagal upload ke Google Drive');
    }
    return data.url;
}

// Backward compatibility alias — agar kode lama yang memanggil uploadToImgBB tetap berfungsi
async function uploadToImgBB(file) {
    return await uploadToGoogleDrive(file, 'lainnya');
}

// ============================================================
// VALIDASI & KESESUAIAN JENJANG KELAS SISWA VS ASESMEN
// ============================================================
function extractJenjang(val) {
    if (!val) return null;
    var str = String(val).toUpperCase().trim();
    if (/\bVII\b|KELAS\s*VII\b/i.test(str)) return 7;
    if (/\bVIII\b|KELAS\s*VIII\b/i.test(str)) return 8;
    if (/\bIX\b|KELAS\s*IX\b/i.test(str)) return 9;
    var m = str.match(/\b([789])\b/) || str.match(/([789])/);
    if (m) return parseInt(m[1], 10);
    return null;
}

function isKelasMatch(siswaKelasNama, siswaTingkat, asesmenKelas) {
    if (!asesmenKelas) return true;
    var sJenjang = extractJenjang(siswaTingkat) || extractJenjang(siswaKelasNama);
    var aJenjang = extractJenjang(asesmenKelas);

    // Jika jenjang asesmen terdeteksi tapi jenjang siswa tidak → TOLAK (strict)
    if (aJenjang && !sJenjang) {
        return false;
    }

    // Jika beda jenjang (misal siswa kelas 9 vs asesmen kelas 7) → PASTI TOLAK
    if (sJenjang && aJenjang && sJenjang !== aJenjang) {
        return false;
    }

    var cleanSiswa = String(siswaKelasNama || '').toUpperCase().replace(/[\s\-_]/g, '');
    var cleanAsm = String(asesmenKelas || '').toUpperCase().replace(/[\s\-_]/g, '');

    // Jika sama persis
    if (cleanSiswa && cleanAsm && cleanSiswa === cleanAsm) return true;

    // Jika asesmen untuk seluruh jenjang (misal "Kelas 7", "7", "Semua Kelas 7")
    if (sJenjang && (cleanAsm === String(sJenjang) || cleanAsm === ('KELAS' + sJenjang) || cleanAsm === ('SEMUAKELAS' + sJenjang) || cleanAsm === ('TINGKAT' + sJenjang))) {
        return true;
    }

    // Jika asesmen menargetkan kelas khusus (misal asesmen 7A vs siswa 7B)
    var asmSub = cleanAsm.match(/([789])([A-Z]+)/);
    var siswaSub = cleanSiswa.match(/([789])([A-Z]+)/);
    if (asmSub && siswaSub) {
        if (asmSub[1] === siswaSub[1] && asmSub[2] !== siswaSub[2]) {
            return false;
        }
    }

    // Strict fallback: hanya izinkan jika jenjang sama dan sudah terverifikasi
    if (sJenjang && aJenjang) return sJenjang === aJenjang;

    // Jika tidak ada jenjang di kedua sisi, tolak (fail-safe)
    return false;
}

// Dapatkan data siswa yang sedang login dari Data Induk Siswa secara akurat
async function getLoggedStudentInfo() {
    if (!currentUser || !supabaseClient) return null;
    try {
        var sData = null;

        // 1. Ambil berdasarkan user_id akun login
        if (currentUser.id) {
            const { data } = await supabaseClient
                .from('siswa')
                .select('id, nama_lengkap, email, kelas_id, master_kelas(id, nama_kelas, tingkat)')
                .eq('user_id', currentUser.id)
                .maybeSingle();
            if (data) sData = data;
        }

        // 2. Fallback berdasarkan email jika user_id belum tertaut
        if (!sData && currentUser.email) {
            const { data } = await supabaseClient
                .from('siswa')
                .select('id, nama_lengkap, email, kelas_id, master_kelas(id, nama_kelas, tingkat)')
                .eq('email', currentUser.email)
                .maybeSingle();
            if (data) {
                sData = data;
                // Auto tautkan user_id ke data siswa
                supabaseClient.from('siswa').update({ user_id: currentUser.id }).eq('id', sData.id).then();
            }
        }

        // 3. Fallback berdasarkan nama_lengkap
        if (!sData && currentUser.name) {
            const { data } = await supabaseClient
                .from('siswa')
                .select('id, nama_lengkap, email, kelas_id, master_kelas(id, nama_kelas, tingkat)')
                .ilike('nama_lengkap', currentUser.name.trim())
                .maybeSingle();
            if (data) {
                sData = data;
                supabaseClient.from('siswa').update({ user_id: currentUser.id }).eq('id', sData.id).then();
            }
        }

        // Pastikan nama_kelas dan tingkat terisi meskipun join relasi master_kelas kosong
        if (sData) {
            var sKelas = sData.master_kelas ? sData.master_kelas.nama_kelas : '';
            var sTingkat = sData.master_kelas ? sData.master_kelas.tingkat : '';
            if ((!sKelas || !sTingkat) && sData.kelas_id && typeof masterKelasList !== 'undefined' && masterKelasList) {
                var mk = masterKelasList.find(function(k) { return k.id === sData.kelas_id; });
                if (mk) {
                    sData.master_kelas = {
                        id: mk.id,
                        nama_kelas: mk.nama_kelas,
                        tingkat: mk.tingkat
                    };
                }
            }
        }

        return sData;
    } catch (e) {
        console.warn('getLoggedStudentInfo error:', e);
        return null;
    }
}

// ============================================================
// GLOBAL LOADER OVERLAY
// ============================================================
function showGlobalLoader(text) {
    var loader = document.getElementById('globalLoader');
    if (loader) {
        var textEl = document.getElementById('globalLoaderText');
        if (textEl) textEl.innerHTML = text || 'Sedang memproses...';
        loader.classList.add('active');
        if (window.lucide) lucide.createIcons();
    }
}

// ============================================================
// API KEY MODAL LOGIC
// ============================================================
function closeApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('inputApiKeyBaru');
    if (input) input.value = '';
}

function sanitizeGroqModel(model, provider) {
    if (!model || typeof model !== 'string') {
        return (provider === 'groq') ? 'qwen/qwen3.8-27b' : 'gemini-3.5-flash-lite';
    }
    var clean = model.trim();
    if (clean.toLowerCase().includes('gemini')) {
        // Auto-migrate model lama (1.5 / 2.5) ke 3.5 yang aktif
        if (clean.includes('1.5') || clean.includes('2.5') || clean === 'gemini-flash-latest') {
            return 'gemini-3.5-flash-lite';
        }
        return clean;
    }
    if (
        clean.toLowerCase().includes('compound') ||
        clean.toLowerCase().includes('llama-3') ||
        clean.toLowerCase().includes('mixtral') ||
        clean.toLowerCase().includes('gemma') ||
        clean === 'llama-3.3-70b-versatile' ||
        clean === 'llama-3.1-8b-instant' ||
        clean === 'llama-3.1-70b-versatile'
    ) {
        return 'qwen/qwen3.8-27b';
    }
    if (!clean) return (provider === 'groq') ? 'qwen/qwen3.8-27b' : 'gemini-3.5-flash-lite';
    return clean;
}

function onAiProviderChange() {
    var providerSelect = document.getElementById('aiProviderSelect');
    var provider = providerSelect ? providerSelect.value : 'gemini';
    var labelKey = document.getElementById('aiApiKeyLabel');
    var inputKey = document.getElementById('aiApiKeyInput');
    var inputModel = document.getElementById('aiModelInput');
    var helpKey = document.getElementById('aiApiKeyHelp');

    if (provider === 'gemini') {
        if (labelKey) labelKey.innerHTML = 'Google Gemini API Key <span style="color:#ef4444">*</span>';
        if (inputKey) inputKey.placeholder = 'AIzaSy...';
        if (helpKey) helpKey.innerHTML = 'Dapatkan API Key gratis (Kuota 1 Juta Token/Menit) di <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#8b5cf6;font-weight:600;text-decoration:underline;">aistudio.google.com/app/apikey</a>';
        if (inputModel && (!inputModel.value || !inputModel.value.includes('gemini'))) {
            inputModel.value = 'gemini-3.5-flash-lite';
        }
    } else {
        if (labelKey) labelKey.innerHTML = 'Groq API Key (LLaMA & Qwen) <span style="color:#ef4444">*</span>';
        if (inputKey) inputKey.placeholder = 'gsk_...';
        if (helpKey) helpKey.innerHTML = 'Dapatkan API Key di <a href="https://console.groq.com/keys" target="_blank" style="color:#8b5cf6;font-weight:600;text-decoration:underline;">console.groq.com/keys</a>';
        if (inputModel && (!inputModel.value || inputModel.value.includes('gemini'))) {
            inputModel.value = 'qwen/qwen3.8-27b';
        }
    }
}

async function saveApiKeyBaru() {
    const inputKey = document.getElementById('aiApiKeyInput') || document.getElementById('inputApiKeyBaru');
    const inputModel = document.getElementById('aiModelInput');
    const providerSelect = document.getElementById('aiProviderSelect');
    if (!inputKey) return;
    const newKey = inputKey.value.trim();
    if (!newKey) {
        if (typeof showToast === 'function') showToast("API Key tidak boleh kosong!", "error");
        else alert("API Key tidak boleh kosong!");
        return;
    }

    // Deteksi provider otomatis berdasarkan prefix key
    let provider = providerSelect ? providerSelect.value : 'gemini';
    if (newKey.startsWith('AIza') || newKey.startsWith('AQ.')) {
        provider = 'gemini';
        if (providerSelect) providerSelect.value = 'gemini';
    } else if (newKey.startsWith('gsk_')) {
        provider = 'groq';
        if (providerSelect) providerSelect.value = 'groq';
    }

    const rawModel = inputModel ? inputModel.value.trim() : (provider === 'gemini' ? 'gemini-1.5-flash' : 'qwen/qwen3.8-27b');
    const newModel = sanitizeGroqModel(rawModel, provider);

    if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan Konfigurasi AI...');
    try {
        if (supabaseClient) {
            await supabaseClient.from('system_settings').upsert({ key: 'ai_provider', value: provider });
            await supabaseClient.from('system_settings').upsert({ key: 'groq_api_key', value: newKey });
            await supabaseClient.from('system_settings').upsert({ key: 'groq_model', value: newModel });
            await supabaseClient.from('system_settings').upsert({ key: 'ai_api_key', value: newKey });
            await supabaseClient.from('system_settings').upsert({ key: 'ai_model', value: newModel });
        }
    } catch (e) { console.warn('Gagal menyimpan AI config ke DB:', e); }
    if (typeof hideGlobalLoader === 'function') hideGlobalLoader();

    localStorage.setItem('AI_PROVIDER', provider);
    localStorage.setItem('GROQ_API_KEY', newKey);
    localStorage.setItem('GROQ_MODEL', newModel);
    localStorage.setItem('AI_API_KEY', newKey);
    localStorage.setItem('AI_MODEL', newModel);
    if (inputModel) inputModel.value = newModel;
    closeApiKeyModal();
    var provName = (provider === 'gemini') ? 'Google Gemini' : 'Groq Cloud';
    if (typeof showToast === 'function') showToast("Konfigurasi AI (" + provName + " - " + newModel + ") berhasil disimpan.", "success");
    else alert("Konfigurasi AI (" + provName + " - " + newModel + ") berhasil disimpan.");
}

async function loadAIConfig() {
    var providerSelect = document.getElementById('aiProviderSelect');
    var inputKey = document.getElementById('aiApiKeyInput');
    var inputModel = document.getElementById('aiModelInput');
    if (!inputKey) return;
    try {
        if (supabaseClient) {
            const { data: dataProv } = await supabaseClient.from('system_settings').select('value').eq('key', 'ai_provider').maybeSingle();
            const { data: dataKey } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_api_key').maybeSingle();
            const { data: dataModel } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_model').maybeSingle();
            
            let keyVal = (dataKey && dataKey.value) ? dataKey.value : (localStorage.getItem('GROQ_API_KEY') || '');
            let rawModel = (dataModel && dataModel.value) ? dataModel.value : (localStorage.getItem('GROQ_MODEL') || 'gemini-3.5-flash-lite');
            let provider = (dataProv && dataProv.value) ? dataProv.value : (localStorage.getItem('AI_PROVIDER') || ((keyVal.startsWith('AIza') || keyVal.startsWith('AQ.')) ? 'gemini' : (keyVal.startsWith('gsk_') ? 'groq' : 'gemini')));

            if (providerSelect) providerSelect.value = provider;
            inputKey.value = keyVal;
            
            let cleanModel = sanitizeGroqModel(rawModel, provider);
            if (inputModel) inputModel.value = cleanModel;
            onAiProviderChange();
        }
    } catch (e) {
        console.warn('Gagal memuat Konfigurasi AI:', e);
    }
}

function hideGlobalLoader() {
    var loader = document.getElementById('globalLoader');
    if (loader) loader.classList.remove('active');
}

// ============================================================
// CUSTOM NOTIFICATION MODAL
// ============================================================
function showNotifModal(title, message, type) {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    if (!overlay) return;

    var iconSvgs = {
        success: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 9"/></svg>',
        error: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    var colorMap = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    var bgMap = { success: 'rgba(34,197,94,.1)', error: 'rgba(239,68,68,.1)', warning: 'rgba(245,158,11,.1)', info: 'rgba(59,130,246,.1)' };

    iconEl.innerHTML = iconSvgs[type] || iconSvgs.info;
    iconEl.style.background = bgMap[type] || bgMap.info;
    titleEl.textContent = title;
    titleEl.style.color = colorMap[type] || colorMap.info;
    msgEl.innerHTML = message;
    actionsEl.innerHTML = '<button class="btn btn-primary" onclick="closeNotifModal()" style="min-width:120px;">OK</button>';

    overlay.classList.add('active');
}

function closeNotifModal() {
    var overlay = document.getElementById('notifModal');
    if (overlay) overlay.classList.remove('active');
}

function showCustomConfirm(title, message, confirmText, onConfirm) {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    if (!overlay) { if (confirm(message)) onConfirm(); return; }

    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    iconEl.style.background = 'rgba(245,158,11,.1)';
    titleEl.textContent = title;
    titleEl.style.color = '#f59e0b';
    msgEl.innerHTML = message;
    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()" style="min-width:100px;">Batal</button>' +
        '<button class="btn btn-danger" id="notifConfirmBtn" style="min-width:100px;">' + confirmText + '</button>';

    overlay.classList.add('active');

    document.getElementById('notifConfirmBtn').onclick = function () {
        closeNotifModal();
        if (typeof onConfirm === 'function') onConfirm();
    };
}

function showCustomPrompt(title, message, placeholder, defaultValue, onConfirm) {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    if (!overlay) { var val = prompt(message, defaultValue || ''); if (val) onConfirm(val); return; }

    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    iconEl.style.background = 'rgba(59,130,246,.1)';
    titleEl.textContent = title;
    titleEl.style.color = '#3b82f6';
    msgEl.innerHTML = message + '<div style="margin-top:1rem;"><input type="text" id="customPromptInput" class="form-input" placeholder="' + (placeholder || '') + '" value="' + (defaultValue || '') + '" style="width:100%;font-size:1rem;" /></div>';
    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()" style="min-width:100px;">Batal</button>' +
        '<button class="btn btn-primary" id="notifConfirmBtn" style="min-width:100px;">Simpan</button>';

    overlay.classList.add('active');
    setTimeout(function () { var inp = document.getElementById('customPromptInput'); if (inp) { inp.focus(); inp.select(); } }, 200);

    document.getElementById('notifConfirmBtn').onclick = function () {
        var val = (document.getElementById('customPromptInput') || {}).value;
        if (!val || !val.trim()) { showToast('Nama tidak boleh kosong.', 'warning'); return; }
        closeNotifModal();
        if (typeof onConfirm === 'function') onConfirm(val.trim());
    };

    // Allow Enter key to submit
    var inp = document.getElementById('customPromptInput');
    if (inp) inp.onkeydown = function (e) { if (e.key === 'Enter') document.getElementById('notifConfirmBtn').click(); };
}

// ============================================================
// AUTH (Login/Register — Landing Page)
// ============================================================
var isRegisterMode = false;

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    isRegisterMode = !isRegisterMode;
    var nameGroup = document.getElementById('loginNameGroup');
    var titleText = document.getElementById('modalTitleText');
    var subtitleText = document.getElementById('modalSubtitleText');
    var btnText = document.getElementById('loginBtnText');
    var toggleText = document.getElementById('authToggleText');
    var toggleLink = document.getElementById('authToggleLink');
    var forgotContainer = document.getElementById('forgotPasswordContainer');
    if (isRegisterMode) {
        if (nameGroup) nameGroup.style.display = 'block';
        if (titleText) titleText.textContent = 'Daftar Akun';
        if (subtitleText) subtitleText.textContent = 'Buat akun baru untuk akses sistem';
        if (btnText) btnText.textContent = 'Daftar';
        if (toggleText) toggleText.textContent = 'Sudah punya akun? ';
        if (toggleLink) toggleLink.textContent = 'Login';
        if (forgotContainer) forgotContainer.style.display = 'none';
    } else {
        if (nameGroup) nameGroup.style.display = 'none';
        if (titleText) titleText.textContent = 'Login';
        if (subtitleText) subtitleText.textContent = 'Masuk ke sistem akademik sekolah';
        if (btnText) btnText.textContent = 'Masuk';
        if (toggleText) toggleText.textContent = 'Belum punya akun? ';
        if (toggleLink) toggleLink.textContent = 'Daftar Akun Baru';
        if (forgotContainer) forgotContainer.style.display = 'block';
    }
}

function shakeLoginModal() {
    var m = document.querySelector('#loginModal .modal');
    if (!m) return;
    m.classList.add('modal-shake');
    setTimeout(function () { m.classList.remove('modal-shake'); }, 600);
}

// ===========================================
// LUPA KATA SANDI (KODE SANDI & RESET LANGSUNG)
// ===========================================
var _FORGOT_SECRET_CODE = '20253892';

function toggleFieldVisibility(inputId, btnEl) {
    var input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (btnEl) btnEl.innerHTML = '<i data-lucide="eye-off" style="width:16px;height:16px;"></i>';
    } else {
        input.type = 'password';
        if (btnEl) btnEl.innerHTML = '<i data-lucide="eye" style="width:16px;height:16px;"></i>';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openForgotPasswordModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    closeLoginModal();

    var emailInput = document.getElementById('forgotEmail');
    var codeInput = document.getElementById('forgotSecretCode');
    var passInput = document.getElementById('forgotNewPassword');
    var confirmInput = document.getElementById('forgotConfirmPassword');

    // Autofill email jika user sudah ketik di modal login
    var loginEmail = document.getElementById('loginEmail');
    if (emailInput) {
        emailInput.value = (loginEmail && loginEmail.value) ? loginEmail.value.trim() : '';
    }
    if (codeInput) codeInput.value = '';
    if (passInput) passInput.value = '';
    if (confirmInput) confirmInput.value = '';

    var m = document.getElementById('forgotPasswordModal');
    if (m) m.classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(function () {
        if (emailInput && !emailInput.value) {
            emailInput.focus();
        } else if (codeInput) {
            codeInput.focus();
        }
    }, 150);
}

function closeForgotPasswordModal() {
    var m = document.getElementById('forgotPasswordModal');
    if (m) m.classList.remove('active');
}

async function handleResetPasswordSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var emailInput = document.getElementById('forgotEmail');
    var codeInput = document.getElementById('forgotSecretCode');
    var passInput = document.getElementById('forgotNewPassword');
    var confirmInput = document.getElementById('forgotConfirmPassword');

    var email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    var code = codeInput ? codeInput.value.trim() : '';
    var newPassword = passInput ? passInput.value : '';
    var confirmPassword = confirmInput ? confirmInput.value : '';

    if (!email) {
        showNotifModal('Data Belum Lengkap', 'Silakan masukkan email terdaftar akun Anda.', 'error');
        if (emailInput) emailInput.focus();
        return;
    }

    // Format email check sederhana
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotifModal('Format Email Salah', 'Format email yang dimasukkan tidak valid. Pastikan penulisan email sudah benar.', 'error');
        if (emailInput) emailInput.focus();
        return;
    }

    if (!code) {
        showNotifModal('Data Belum Lengkap', 'Silakan masukkan kode sandi otorisasi.', 'error');
        if (codeInput) codeInput.focus();
        return;
    }

    // Verifikasi kode sandi otorisasi (20253892)
    if (code !== _FORGOT_SECRET_CODE) {
        showNotifModal(
            'Kode Sandi Tidak Sesuai',
            'Kode sandi keamanan yang Anda masukkan salah.<br><br>Silakan hubungi administrator sekolah untuk mendapatkan kode sandi yang benar.',
            'error'
        );
        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
        }
        return;
    }

    // Validasi panjang kata sandi baru
    if (!newPassword || newPassword.length < 6) {
        showNotifModal('Kata Sandi Terlalu Pendek', 'Kata sandi baru minimal harus <strong>6 karakter</strong> demi keamanan akun.', 'error');
        if (passInput) passInput.focus();
        return;
    }

    // Validasi kecocokan konfirmasi kata sandi
    if (newPassword !== confirmPassword) {
        showNotifModal('Konfirmasi Sandi Berbeda', 'Konfirmasi kata sandi tidak cocok. Pastikan pengetikan kata sandi baru dan konfirmasi sama persis.', 'error');
        if (confirmInput) confirmInput.focus();
        return;
    }

    var btn = document.getElementById('btnForgotSubmit');
    var btnText = document.getElementById('btnForgotSubmitText');
    var spinner = document.getElementById('forgotSubmitSpinner');

    try {
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.style.display = 'inline-block';
        if (btn) btn.disabled = true;

        var { data, error } = await supabaseClient.rpc('reset_user_password_by_email', {
            target_email: email,
            new_password: newPassword
        });

        if (error) {
            // Deteksi jika fungsi database belum dipasang di Supabase
            var msg = error.message || '';
            if (msg.includes('not found') || msg.includes('does not exist') || error.code === '42883' || error.code === 'PGRST202') {
                showNotifModal(
                    'Setup Database Diperlukan',
                    'Fungsi <code>reset_user_password_by_email</code> belum dipasang di Supabase.<br><br>Silakan jalankan script SQL di Supabase SQL Editor sesuai panduan.',
                    'warning'
                );
                return;
            }
            throw error;
        }

        // Jika fungsi mengembalikan JSONB status { success: false, ... }
        if (data && data.success === false) {
            showNotifModal(
                'Email Tidak Ditemukan',
                'Email <strong>' + email + '</strong> tidak terdaftar dalam database pengguna sekolah. Pastikan Anda memasukkan email yang benar.',
                'error'
            );
            return;
        }

        // Berhasil!
        showNotifModal(
            'Sandi Berhasil Diperbarui! 🎉',
            'Kata sandi untuk akun <strong>' + email + '</strong> berhasil diganti.<br><br>Silakan masuk menggunakan kata sandi baru Anda.',
            'success'
        );

        closeForgotPasswordModal();

        // Buka modal login dan otomatis isikan email
        setTimeout(function () {
            openLoginModal();
            var loginEmail = document.getElementById('loginEmail');
            if (loginEmail) loginEmail.value = email;
            var loginPass = document.getElementById('loginPassword');
            if (loginPass) {
                loginPass.value = '';
                loginPass.focus();
            }
        }, 1200);

    } catch (err) {
        console.error('Reset password error:', err);
        showNotifModal('Gagal Mengatur Ulang Sandi', err.message || 'Terjadi kesalahan pada sistem. Silakan coba beberapa saat lagi.', 'error');
    } finally {
        if (btnText) btnText.style.display = 'inline-flex';
        if (spinner) spinner.style.display = 'none';
        if (btn) btn.disabled = false;
    }
}


async function handleAuthSubmit(e) {
    if (e) e.preventDefault();
    var email = document.getElementById('loginEmail');
    var password = document.getElementById('loginPassword');
    var nameInput = document.getElementById('loginName');
    var spinner = document.getElementById('loginSpinner');
    var btnText = document.getElementById('loginBtnText');
    var btn = document.getElementById('loginBtn');

    if (!email || !password || !email.value.trim() || !password.value) {
        showNotifModal('Data Belum Lengkap', 'Silakan masukkan <strong>email</strong> dan <strong>password</strong> Anda untuk melanjutkan.', 'warning');
        shakeLoginModal(); return;
    }
    if (password.value.length < 6) {
        showNotifModal('Password Terlalu Pendek', 'Password minimal harus <strong>6 karakter</strong>. Silakan coba lagi.', 'warning');
        shakeLoginModal(); return;
    }
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.style.display = 'none';
    if (btn) btn.disabled = true;

    try {
        if (!supabaseClient || !supabaseClient.auth) throw new Error('Supabase gagal dimuat. Periksa koneksi internet Anda atau matikan AdBlock.');

        if (isRegisterMode) {
            var fullName = nameInput ? nameInput.value.trim() : '';
            if (!fullName) {
                showNotifModal('Nama Belum Diisi', 'Silakan masukkan <strong>nama lengkap</strong> Anda.', 'warning');
                shakeLoginModal(); return;
            }
            const { data, error } = await supabaseClient.auth.signUp({
                email: email.value.trim(), password: password.value,
                options: { data: { full_name: fullName } }
            });
            if (error) throw error;
            showNotifModal('Pendaftaran Berhasil! 🎉', 'Akun <strong>' + fullName + '</strong> berhasil dibuat.<br><br>Akun Anda akan menunggu persetujuan admin sebelum dapat digunakan. Silakan coba login kembali nanti.', 'success');
            setTimeout(function () { toggleAuthMode(); }, 1500);
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email.value.trim(), password: password.value
            });
            if (error) {
                var msg = error.message || '';
                if (msg.includes('Invalid login credentials')) {
                    showNotifModal('Login Gagal', 'Email atau password yang Anda masukkan <strong>salah</strong>.<br><br>Jika Anda belum memiliki akun, silakan <strong>daftar akun baru</strong> terlebih dahulu.', 'error');
                } else if (msg.includes('Email not confirmed')) {
                    showNotifModal('Email Belum Dikonfirmasi', 'Akun Anda belum dikonfirmasi. Silakan hubungi <strong>Admin</strong> untuk mengaktifkan akun Anda.', 'warning');
                } else {
                    showNotifModal('Terjadi Kesalahan', msg, 'error');
                }
                shakeLoginModal(); return;
            }

            // Check profile & role
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles').select('role, full_name').eq('id', data.user.id).single();

            if (profileError || !profile) {
                await supabaseClient.auth.signOut();
                showNotifModal('Akun Tidak Ditemukan', 'Data profil Anda tidak ditemukan di sistem.<br><br>Silakan hubungi <strong>Admin</strong> atau <strong>daftar akun baru</strong>.', 'error');
                shakeLoginModal(); return;
            }
            if (profile.role === 'menunggu_persetujuan') {
                await supabaseClient.auth.signOut();
                showNotifModal('Menunggu Persetujuan', 'Akun Anda sudah terdaftar namun masih <strong>menunggu persetujuan</strong> dari Admin.<br><br>Silakan coba lagi nanti setelah akun Anda disetujui.', 'warning');
                shakeLoginModal(); return;
            }
            if (profile.role === 'nonaktif') {
                await supabaseClient.auth.signOut();
                showNotifModal('Akun Dinonaktifkan', 'Akun Anda telah <strong>dinonaktifkan</strong> oleh Admin.<br><br>Hubungi Admin jika Anda merasa ini adalah kesalahan.', 'error');
                shakeLoginModal(); return;
            }

            // Check Maintenance Mode
            if (profile.role !== 'admin' && profile.role !== 'kurikulum') {
                const { data: maint } = await supabaseClient.from('system_settings').select('value').eq('key', 'maintenance_mode').single();
                if (maint && maint.value === 'true') {
                    await supabaseClient.auth.signOut();
                    showNotifModal('Pemeliharaan Sistem', 'Maaf, server saat ini sedang dalam masa <strong>jeda pemeliharaan (maintenance)</strong> oleh Administrator.<br><br>Silakan coba login kembali beberapa saat lagi.', 'warning');
                    shakeLoginModal();
                    if (spinner) spinner.style.display = 'none';
                    if (btnText) btnText.style.display = 'inline';
                    if (btn) btn.disabled = false;
                    return;
                }
            }

            showToast('Login berhasil! Mengalihkan...', 'success');
            var modal = document.querySelector('#loginModal .modal');
            if (modal) modal.classList.add('modal-success');
            setTimeout(function () { window.location.href = 'dashboard.html'; }, 1200);
        }
    } catch (err) {
        var errMsg = err.message || 'Terjadi kesalahan';
        if (errMsg.includes('Invalid login')) {
            showNotifModal('Login Gagal', 'Email atau password <strong>salah</strong>. Jika belum punya akun, silakan daftar terlebih dahulu.', 'error');
        } else if (errMsg.includes('already registered')) {
            showNotifModal('Email Sudah Terdaftar', 'Email ini sudah digunakan. Silakan <strong>login</strong> atau gunakan email lain.', 'warning');
        } else {
            showNotifModal('Terjadi Kesalahan', errMsg, 'error');
        }
        shakeLoginModal();
    } finally {
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.display = 'inline';
        if (btn) btn.disabled = false;
    }
}

// ============================================================
// SPMB — Submit Pendaftaran (Landing Page)
// ============================================================
async function loadSPMBPublicConfig() {
    if (!supabaseClient) return;
    try {
        const { data: statusData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_is_active').maybeSingle();
        const { data: yearData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_academic_year').maybeSingle();

        const isClosed = (statusData && statusData.value === 'false');
        const yearTxt = (yearData && yearData.value) ? yearData.value : '2026/2027';

        // Update Text Tahun Ajaran
        var yearEls = document.querySelectorAll('.spmb-dynamic-year');
        yearEls.forEach(function (el) { el.innerText = yearTxt; });

        window.spmbIsClosedData = isClosed;
    } catch (e) { console.error('Error load public SPMB config:', e); }
}

async function submitSPMB(e) {
    if (e) e.preventDefault();

    try {
        const { data: statusData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_is_active').maybeSingle();
        if (statusData && statusData.value === 'false') {
            if (typeof showNotifModal === 'function') {
                showNotifModal('Pendaftaran Ditutup', 'Mohon maaf, penerimaan murid baru untuk saat ini telah ditutup. Silakan pantau terus informasi selanjutnya.', 'info');
            } else {
                alert('Maaf, Pendaftaran Murid Baru saat ini sedang ditutup.');
            }
            return;
        }
    } catch (err) { console.error(err); }

    var btn = document.getElementById('spmbBtn');
    var spinner = document.getElementById('spmbSpinner');
    var btnText = document.getElementById('spmbBtnText');

    var nama = (document.getElementById('spmbNama') || {}).value || '';
    var ortu = (document.getElementById('spmbOrtu') || {}).value || '';
    var nik = (document.getElementById('spmbNIK') || {}).value || '';
    var telepon = (document.getElementById('spmbTelepon') || {}).value || '';
    var sekolah = (document.getElementById('spmbSekolah') || {}).value || '';
    var alamat = (document.getElementById('spmbAlamat') || {}).value || '';

    if (!nama || !ortu || !nik || !telepon || !sekolah || !alamat) {
        showNotifModal('Data Belum Lengkap', 'Semua field wajib diisi untuk melanjutkan pendaftaran.', 'warning');
        return;
    }

    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.style.display = 'none';
    if (btn) btn.disabled = true;

    try {
        if (!supabaseClient) throw new Error('Supabase belum tersedia.');
        const { error } = await supabaseClient.from('pendaftaran_murid_baru').insert([{
            nama_lengkap: nama, nama_orang_tua: ortu, nik: nik,
            nomor_telepon: telepon, sekolah_asal: sekolah, alamat_lengkap: alamat, status: 'Menunggu'
        }]);
        if (error) throw error;
        showNotifModal('Pendaftaran Berhasil! 🎉', 'Terima kasih telah mendaftar di <strong>SMP IT Al-Fathonah</strong>.<br><br>Tim kami akan menghubungi Anda melalui nomor telepon yang terdaftar.', 'success');
        var form = document.getElementById('spmbForm');
        if (form) form.reset();
        if (typeof closeSPMBModal === 'function') closeSPMBModal();
    } catch (err) {
        showNotifModal('Gagal Mengirim', 'Terjadi kesalahan saat mengirim pendaftaran: <strong>' + (err.message || '') + '</strong>', 'error');
    } finally {
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.display = 'inline';
        if (btn) btn.disabled = false;
    }
}

// ============================================================
// BERITA PUBLIC — Landing Page
// ============================================================
function getDirectImageUrl(url) {
    if (!url) return '';
    var raw = String(url).trim();
    // Jika sudah berupa data URL base64 atau blob URL, langsung kembalikan
    if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

    // Tangkap file ID Google Drive dari berbagai format link
    var match = raw.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/);
    if (!match) {
        match = raw.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    }
    if (match && match[1]) {
        var fileId = match[1];
        // CDN Google User Content (lh3) adalah direct link paling stabil tanpa blokir referer
        return 'https://lh3.googleusercontent.com/d/' + fileId;
    }
    return raw;
}

async function loadBeritaPublic() {
    var section = document.getElementById('berita');
    var container = document.getElementById('beritaContainer');
    if (!container || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('berita').select('*')
            .eq('is_published', true)
            .is('archived_at', null)
            .order('tanggal', { ascending: false }).limit(6);
        if (error) throw error;

        if (!data || data.length === 0) {
            // Jika kosong, sembunyikan section berita atau tampilkan pesan kosong
            if (section) section.style.display = 'none';
            return;
        }

        // Tampilkan kembali jika sempat disembunyikan
        if (section) section.style.display = 'flex';

        container.innerHTML = data.map(function (b, i) {
            var img = getDirectImageUrl(b.gambar_url) || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=260&fit=crop';
            var tanggal = b.tanggal ? new Date(b.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            var delay = i > 0 ? ' animate-delay-' + Math.min(i, 4) : '';
            return '<div class="berita-card reveal' + delay + '"><div class="berita-img"><img src="' + img + '" alt="' + (b.judul || '') + '" />' +
                '<div class="berita-date"><i data-lucide="calendar" style="width:14px;height:14px"></i> ' + tanggal + '</div></div>' +
                '<div class="berita-body"><h4>' + (b.judul || '') + '</h4><p>' + (b.ringkasan || '') + '</p></div></div>';
        }).join('');
        if (window.lucide) lucide.createIcons();
        if (window._revealObserver) container.querySelectorAll('.reveal').forEach(function (el) { window._revealObserver.observe(el); });
    } catch (err) { console.warn('loadBeritaPublic error:', err.message); }
}

// Ticker Pengumuman Landing Page
async function loadPengumumanTicker() {
    const tickerEl = document.getElementById('newsTicker');
    const contentEl = document.getElementById('tickerContent');
    if (!tickerEl || !contentEl) return;

    // Tunggu Supabase siap jika diperlukan
    if (!supabaseClient) {
        for (let i = 0; i < 15; i++) {
            if (window.supabase && window.supabase.createClient) {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                if (supabaseClient) break;
            }
            await new Promise(r => setTimeout(r, 200));
        }
    }

    if (!supabaseClient) {
        tickerEl.style.display = 'none';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('pengumuman')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tickerEl.style.display = 'none';
            document.body.classList.remove('has-ticker');
            return;
        }

        tickerEl.style.display = 'block';
        document.body.classList.add('has-ticker');

        const tickerText = data.map(p => {
            const icon = p.prioritas === 'Urgent' ? '🔴' : p.prioritas === 'Penting' ? '🟡' : '🔵';
            return `<span class="ticker-icon">${icon}</span> ${p.judul || ''}: ${p.isi || ''}`;
        }).join(' &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp; ');

        contentEl.innerHTML = `${tickerText} &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp; ${tickerText} &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp; ${tickerText}`;
    } catch (err) {
        console.warn('loadPengumumanTicker error:', err.message);
        tickerEl.style.display = 'none';
        document.body.classList.remove('has-ticker');
    }
}

async function loadEskulPublic() {
    var section = document.getElementById('eskul');
    var container = document.getElementById('eskulContainer');
    if (!container || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('ekstrakurikuler').select('*').order('created_at', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        if (section) section.style.display = 'flex';

        container.innerHTML = data.map(function (b, i) {
            var img = getDirectImageUrl(b.gambar_url) || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=260&fit=crop';
            var delay = i > 0 ? ' animate-delay-' + Math.min(i, 4) : '';
            return '<div class="sarana-card reveal' + delay + '"><div class="sarana-img"><img src="' + img + '" alt="' + (b.nama_ekskul || '') + '" /></div>' +
                '<div class="sarana-label">' + (b.nama_ekskul || '') + '</div></div>';
        }).join('');
        if (window._revealObserver) container.querySelectorAll('.reveal').forEach(function (el) { window._revealObserver.observe(el); });
    } catch (err) { console.warn('loadEskulPublic error:', err.message); }
}

async function loadSarprasPublic() {
    var section = document.getElementById('sarana');
    var container = document.getElementById('sarprasContainer');
    if (!container || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('sarana_prasarana').select('*').order('created_at', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        if (section) section.style.display = 'flex';

        container.innerHTML = data.map(function (b, i) {
            var img = getDirectImageUrl(b.gambar_url) || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=260&fit=crop';
            var delay = i > 0 ? ' animate-delay-' + Math.min(i, 4) : '';
            return '<div class="sarana-card reveal' + delay + '"><div class="sarana-img"><img src="' + img + '" alt="' + (b.nama || '') + '" /></div>' +
                '<div class="sarana-label">' + (b.nama || '') + '</div></div>';
        }).join('');
        if (window._revealObserver) container.querySelectorAll('.reveal').forEach(function (el) { window._revealObserver.observe(el); });
    } catch (err) { console.warn('loadSarprasPublic error:', err.message); }
}

// ============================================================
// ============================================================
//

// ============================================================
// HELPER HORIZONTAL TABLE SCROLL & DUAL SYNC SCROLLBAR
// ============================================================
function scrollTableHorizontally(containerId, offset) {
    var el = document.getElementById(containerId);
    if (!el) {
        el = document.querySelector('#' + containerId) || document.querySelector('.table-freeze-container');
    }
    if (!el) return;

    var maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    
    // Sinkronkan target scroll agar multi-klik tombol bergulir lancar
    if (typeof el._targetScrollLeft !== 'number' || isNaN(el._targetScrollLeft)) {
        el._targetScrollLeft = el.scrollLeft;
    }
    if (Math.abs(el._targetScrollLeft - el.scrollLeft) > Math.abs(offset) * 1.5) {
        el._targetScrollLeft = el.scrollLeft;
    }
    
    el._targetScrollLeft = Math.min(maxScroll, Math.max(0, el._targetScrollLeft + offset));

    try {
        el.scrollTo({ left: el._targetScrollLeft, behavior: 'smooth' });
    } catch (e) {
        el.scrollLeft = el._targetScrollLeft;
    }
}

function initTableScrollSync(containerId, topScrollId, dummyId) {
    var container = document.getElementById(containerId);
    var topScroll = document.getElementById(topScrollId);
    var dummy = document.getElementById(dummyId);
    if (!container || !topScroll || !dummy) return;

    var syncWidth = function () {
        if (container.scrollWidth > container.clientWidth) {
            dummy.style.width = container.scrollWidth + 'px';
        } else {
            dummy.style.width = '100%';
        }
    };

    if (!container._scrollSyncInitialized) {
        container._scrollSyncInitialized = true;
        var activeScroller = null;
        var resetTimer = null;

        var onContainerScroll = function () {
            if (activeScroller === 'top') return;
            activeScroller = 'container';
            var maxContainer = container.scrollWidth - container.clientWidth;
            var maxTop = topScroll.scrollWidth - topScroll.clientWidth;
            if (maxContainer > 0 && maxTop > 0) {
                topScroll.scrollLeft = (container.scrollLeft / maxContainer) * maxTop;
            } else {
                topScroll.scrollLeft = container.scrollLeft;
            }
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { activeScroller = null; }, 120);
        };

        var onTopScroll = function () {
            if (activeScroller === 'container') return;
            activeScroller = 'top';
            var maxContainer = container.scrollWidth - container.clientWidth;
            var maxTop = topScroll.scrollWidth - topScroll.clientWidth;
            if (maxContainer > 0 && maxTop > 0) {
                container.scrollLeft = (topScroll.scrollLeft / maxTop) * maxContainer;
            } else {
                container.scrollLeft = topScroll.scrollLeft;
            }
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { activeScroller = null; }, 120);
        };

        container.addEventListener('scroll', onContainerScroll, { passive: true });
        topScroll.addEventListener('scroll', onTopScroll, { passive: true });
        window.addEventListener('resize', syncWidth);
    }

    syncWidth();
}
