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

        // Listener for Password Recovery Redirect
        supabaseClient.auth.onAuthStateChange(function (event, session) {
            if (event === 'PASSWORD_RECOVERY') {
                setTimeout(function () {
                    // Tutup modal lain bila ada yang terbuka
                    var lm = document.getElementById('loginModal');
                    if (lm) lm.classList.remove('active');

                    var rm = document.getElementById('resetPasswordModal');
                    if (rm) rm.classList.add('active');
                }, 500);
            }
        });
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

async function saveApiKeyBaru() {
    const inputKey = document.getElementById('aiApiKeyInput') || document.getElementById('inputApiKeyBaru');
    const inputModel = document.getElementById('aiModelInput');
    if (!inputKey) return;
    const newKey = inputKey.value.trim();
    const newModel = inputModel ? inputModel.value.trim() : 'llama-3.1-8b-instant';
    
    if (newKey) {
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan Konfigurasi AI...');
        try {
            if (supabaseClient) {
                await supabaseClient.from('system_settings').upsert({ key: 'groq_api_key', value: newKey });
                await supabaseClient.from('system_settings').upsert({ key: 'groq_model', value: newModel });
            }
        } catch (e) { console.warn('Gagal menyimpan AI config ke DB:', e); }
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();

        localStorage.setItem('GROQ_API_KEY', newKey);
        localStorage.setItem('GROQ_MODEL', newModel);
        closeApiKeyModal(); // Keep if modal still used somewhere
        if (typeof showToast === 'function') showToast("Konfigurasi AI berhasil disimpan dan diperbarui.", "success");
        else alert("Konfigurasi AI berhasil disimpan dan diperbarui.");
    } else {
        if (typeof showToast === 'function') showToast("API Key tidak boleh kosong!", "error");
        else alert("API Key tidak boleh kosong!");
    }
}

async function loadAIConfig() {
    var inputKey = document.getElementById('aiApiKeyInput');
    var inputModel = document.getElementById('aiModelInput');
    if (!inputKey) return;
    try {
        if (supabaseClient) {
            const { data: dataKey } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_api_key').maybeSingle();
            if (dataKey && dataKey.value) {
                inputKey.value = dataKey.value;
            } else {
                inputKey.value = localStorage.getItem('GROQ_API_KEY') || '';
            }
            
            const { data: dataModel } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_model').maybeSingle();
            if (dataModel && dataModel.value) {
                if (inputModel) inputModel.value = dataModel.value;
            } else {
                if (inputModel) inputModel.value = localStorage.getItem('GROQ_MODEL') || 'llama-3.1-8b-instant';
            }
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
// LUPA KATA SANDI (PASSWORD RESET) 
// ===========================================
function openForgotPasswordModal(e) {
    if (e) e.preventDefault();
    closeLoginModal();
    document.getElementById('forgotPasswordModal').classList.add('active');
}

function closeForgotPasswordModal() {
    var m = document.getElementById('forgotPasswordModal');
    if (m) m.classList.remove('active');
}

async function handleForgotPasswordSubmit() {
    var email = document.getElementById('forgotEmail').value.trim();
    if (!email) {
        showNotifModal('Data Tidak Lengkap', 'Silakan masukkan email terdaftar Anda.', 'error');
        return;
    }

    var btnText = document.getElementById('btnForgotText');
    var spinner = document.getElementById('forgotSpinner');
    var btn = document.getElementById('btnForgot');

    try {
        btnText.style.display = 'none';
        spinner.style.display = 'inline-block';
        btn.disabled = true;

        var { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname + '#pemulihan'
        });

        if (error) throw error;

        showNotifModal('Tautan Terkirim! 🎉', 'Tautan untuk mengatur ulang kata sandi telah dikirim ke <strong>' + email + '</strong>.<br><br>Silakan periksa kotak masuk atau folder spam Anda.', 'success');
        closeForgotPasswordModal();

    } catch (error) {
        showNotifModal('Pengiriman Gagal', error.message || 'Gagal mengirim tautan. Pastikan email terdaftar atau coba lagi nanti.', 'error');
    } finally {
        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
        btn.disabled = false;
    }
}

async function handleResetPasswordSubmit() {
    var newPassword = document.getElementById('newPassword').value;
    if (newPassword.length < 6) {
        showNotifModal('Gagal', 'Kata sandi minimal harus <strong>6 karakter</strong>.', 'error');
        return;
    }

    var btnText = document.getElementById('btnResetText');
    var spinner = document.getElementById('resetSpinner');
    var btn = document.getElementById('btnResetPassword');

    try {
        btnText.style.display = 'none';
        spinner.style.display = 'inline-block';
        btn.disabled = true;

        var { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showNotifModal('Sukses Berubah', 'Kata sandi Anda berhasil diperbarui.<br>Silakan masuk menggunakan kata sandi baru Anda.', 'success');
        document.getElementById('resetPasswordModal').classList.remove('active');

        await supabaseClient.auth.signOut(); // logout sesi recovery
        setTimeout(function () { openLoginModal(); }, 1500);

    } catch (error) {
        showNotifModal('Gagal Menyimpan', error.message || 'Terjadi kesalahan saat memproses ganti sandi.', 'error');
    } finally {
        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
        btn.disabled = false;
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
    var match = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([^\/&?]+)/);
    if (match && match[1]) {
        // Thumbnail API paling tangguh untuk me-render gambar publik dari Google Drive
        return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1000';
    }
    return url;
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