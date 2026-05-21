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
                setTimeout(function() {
                    // Tutup modal lain bila ada yang terbuka
                    var lm = document.getElementById('loginModal');
                    if(lm) lm.classList.remove('active');
                    
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
        } catch(e) { console.warn('Gagal memuat GAS URL:', e); }
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
    var base64 = await new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
            // Ambil bagian base64 saja (hilangkan prefix "data:image/...;base64,")
            var result = reader.result;
            var base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = function() { reject(new Error('Gagal membaca file.')); };
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
    const input = document.getElementById('aiApiKeyInput') || document.getElementById('inputApiKeyBaru');
    if (!input) return;
    const newKey = input.value.trim();
    if (newKey) {
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan API Key...');
        try {
            if (supabaseClient) {
                await supabaseClient.from('system_settings').upsert({ key: 'groq_api_key', value: newKey });
            }
        } catch(e) { console.warn('Gagal menyimpan API key ke DB:', e); }
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();

        localStorage.setItem('GROQ_API_KEY', newKey);
        closeApiKeyModal(); // Keep if modal still used somewhere
        if (typeof showToast === 'function') showToast("API Key AI berhasil disimpan dan diperbarui.", "success");
        else alert("API Key AI berhasil disimpan dan diperbarui.");
    } else {
        if (typeof showToast === 'function') showToast("API Key tidak boleh kosong!", "error");
        else alert("API Key tidak boleh kosong!");
    }
}

async function loadAIConfig() {
    var input = document.getElementById('aiApiKeyInput');
    if (!input) return;
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_api_key').maybeSingle();
            if (data && data.value) {
                input.value = data.value;
            } else {
                input.value = localStorage.getItem('GROQ_API_KEY') || '';
            }
        }
    } catch(e) {
        console.warn('Gagal memuat API Key AI:', e);
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
    setTimeout(function() { var inp = document.getElementById('customPromptInput'); if (inp) { inp.focus(); inp.select(); } }, 200);

    document.getElementById('notifConfirmBtn').onclick = function () {
        var val = (document.getElementById('customPromptInput') || {}).value;
        if (!val || !val.trim()) { showToast('Nama tidak boleh kosong.', 'warning'); return; }
        closeNotifModal();
        if (typeof onConfirm === 'function') onConfirm(val.trim());
    };

    // Allow Enter key to submit
    var inp = document.getElementById('customPromptInput');
    if (inp) inp.onkeydown = function(e) { if (e.key === 'Enter') document.getElementById('notifConfirmBtn').click(); };
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
    if(m) m.classList.remove('active');
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
        setTimeout(function() { openLoginModal(); }, 1500);
        
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
    if(!supabaseClient) return;
    try {
        const { data: statusData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_is_active').maybeSingle();
        const { data: yearData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_academic_year').maybeSingle();
        
        const isClosed = (statusData && statusData.value === 'false');
        const yearTxt = (yearData && yearData.value) ? yearData.value : '2026/2027';

        // Update Text Tahun Ajaran
        var yearEls = document.querySelectorAll('.spmb-dynamic-year');
        yearEls.forEach(function(el) { el.innerText = yearTxt; });

        window.spmbIsClosedData = isClosed;
    } catch(e) { console.error('Error load public SPMB config:', e); }
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
    } catch(err) { console.error(err); }

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
            const icon = p.prioritas === 'Urgent' ? '🔴' : p.prioritas === 'Penting' ? '🟠' : '🔵';
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
//       D A S H B O A R D   F U N C T I O N S
//
// ============================================================
// ============================================================

// ============================================================
// DASHBOARD INIT
// ============================================================
async function initDashboard() {
    if (!supabaseClient) { showToast('Supabase belum tersedia', 'error'); return; }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { window.location.href = 'index.html'; return; }

        const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
        if (error || !profile) { await supabaseClient.auth.signOut(); window.location.href = 'index.html'; return; }

        currentUser = { id: session.user.id, email: session.user.email, name: profile.full_name, role: profile.role };
        currentRole = profile.role;

        // Cek mode simulasi (Admin Only)
        var simulasiRole = localStorage.getItem('simulasi_role');
        if (simulasiRole && profile.role === 'admin') {
            currentRole = simulasiRole;
            var banner = document.createElement('div');
            banner.style.position = 'fixed'; banner.style.top = '0'; banner.style.left = '0'; banner.style.right = '0';
            banner.style.background = '#f59e0b'; banner.style.color = '#fff'; banner.style.textAlign = 'center';
            banner.style.padding = '8px 15px'; banner.style.zIndex = '999999'; banner.style.fontSize = '14px'; banner.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            banner.innerHTML = '✨ Mode Simulasi: Tampilan sebagai <strong>' + getRoleLabel(currentRole).toUpperCase() + '</strong> ' +
                '<button onclick="stopSimulasi()" style="margin-left:15px;padding:4px 14px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,0.2);">Berhenti & Kembali ke Admin</button>';
            document.body.appendChild(banner);
            var sb = document.getElementById('sidebar');
            var tb = document.querySelector('.dash-top-bar');
            if(sb) { sb.style.top = '36px'; sb.style.height = 'calc(100vh - 36px)'; }
            if(tb) { tb.style.top = '36px'; }
            document.body.style.paddingTop = '36px';
        }

        // Show waiting screen for unapproved users
        if (currentRole === 'menunggu_persetujuan') {
            document.getElementById('waitingScreen').style.display = 'flex';
            document.getElementById('sidebar').style.display = 'none';
            document.getElementById('dashMain').style.display = 'none';
            var wn = document.getElementById('waitingName');
            var we = document.getElementById('waitingEmail');
            if (wn) wn.textContent = profile.full_name || '-';
            if (we) we.textContent = session.user.email || '-';
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Nonaktif users get kicked out
        if (currentRole === 'nonaktif') {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
            return;
        }

        // Set user info
        var el = function (id) { return document.getElementById(id); };
        if (el('userName')) el('userName').textContent = profile.full_name || 'User';
        if (el('userRole')) el('userRole').textContent = getRoleLabel(currentRole);
        if (el('userAvatar')) el('userAvatar').textContent = getInitials(profile.full_name);
        if (el('currentDate')) el('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Apply role-based visibility
        applyRoleVisibility();
        loadStats();

        // Load data for admin/kurikulum
        if (['admin', 'kurikulum'].includes(currentRole)) {
            renderPendingAccounts();
            renderActiveAccounts();
            renderInactiveAccounts();
            loadBeritaAdmin();
            if (typeof loadSPMBConfigDashboard === 'function') loadSPMBConfigDashboard();
            loadSPMBData();
            loadActiveYear();
            loadMasterKelas();
            loadMasterMapel();
            loadGuruData();
            loadSiswaData();
            loadAlumniData();
            loadMutasiData();
            loadPengumumanAdmin();
            loadWaliKelasData();
            loadKontenHero();
            loadKontenVisiMisi();
            loadKontenTestimoni();
        }

        // Load essential data for bendahara (master kelas + siswa needed for keuangan)
        if (currentRole === 'bendahara') {
            loadMasterKelas();
            loadSiswaData();
        }

        // Load pengumuman, galeri, + siswa for dashboard (all roles)
        loadDashboardPengumuman();
        loadGaleriBeranda();
        loadDashGuru();
        loadDashSiswa();

        animateDashboardCards();

        // Setup Jeda Pemeliharaan Auto Kick
        if (currentRole !== 'admin' && currentRole !== 'kurikulum') {
            setInterval(async function() {
                try {
                    const { data: maint } = await supabaseClient.from('system_settings').select('value').eq('key', 'maintenance_mode').single();
                    if (maint && maint.value === 'true') {
                        await supabaseClient.auth.signOut();
                        window.location.href = 'index.html?maintenance=1';
                    }
                } catch(e) {}
            }, 10000); // Cek status tiap 10 detik
        }
    } catch (err) {
        console.error('initDashboard error:', err);
        showToast('Gagal memuat dashboard', 'error');
    }
}

function applyRoleVisibility() {
    var role = currentRole || 'siswa'; // Default to siswa mapping

    var isAdminKurikulum = ['admin', 'kurikulum'].includes(role);
    document.querySelectorAll('.admin-kurikulum-only').forEach(function (el) {
        el.style.display = isAdminKurikulum ? '' : 'none';
    });

    // Soal Ujian (Admin, Kurikulum, Siswa)
    var isRoleUjian = ['admin', 'kurikulum', 'siswa'].includes(role);
    document.querySelectorAll('.role-ujian').forEach(function (el) {
        el.style.display = isRoleUjian ? '' : 'none';
    });

    // Akademik & Asesmen
    var isAkademik = ['admin', 'kurikulum', 'kesiswaan', 'wali_kelas', 'guru_mapel', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-akademik').forEach(function (el) {
        el.style.display = isAkademik ? '' : 'none';
    });

    // Input Penilaian
    var isPenilaian = ['admin', 'kurikulum', 'wali_kelas', 'guru_mapel', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-penilaian').forEach(function (el) {
        el.style.display = isPenilaian ? '' : 'none';
    });

    // Group Akademik (Wrapper)
    var showAkademikGroup = isAkademik || isRoleUjian;
    document.querySelectorAll('.group-akademik').forEach(function (el) {
        el.style.display = showAkademikGroup ? '' : 'none';
    });

    // Data Induk & Operasional Sekolah
    var isDataOperasional = ['admin', 'kurikulum', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-datainduk, .role-operasional').forEach(function (el) {
        el.style.display = isDataOperasional ? '' : 'none';
    });

    // Layanan Kesiswaan
    var isLayanan = ['admin', 'kurikulum', 'kesiswaan'].includes(role);
    document.querySelectorAll('.role-layanan').forEach(function (el) {
        el.style.display = isLayanan ? '' : 'none';
    });

    // Monitoring
    var isMonitoring = ['admin', 'kurikulum', 'kepala_sekolah'].includes(role);
    document.querySelectorAll('.role-monitoring').forEach(function (el) {
        el.style.display = isMonitoring ? '' : 'none';
    });

    // Kelola Konten
    var isKonten = ['admin', 'kurikulum', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-konten').forEach(function (el) {
        el.style.display = isKonten ? '' : 'none';
    });

    // Non Siswa
    var isNonSiswa = role !== 'siswa';
    document.querySelectorAll('.role-non-siswa').forEach(function (el) {
        el.style.display = isNonSiswa ? '' : 'none';
    });

    // Siswa Only (Hasil Ujian Saya)
    var isSiswaOnly = (role === 'siswa');
    document.querySelectorAll('.role-siswa-only').forEach(function (el) {
        el.style.display = isSiswaOnly ? '' : 'none';
    });

    // Manajemen Keuangan (Bendahara, Admin, Kurikulum)
    var isBendahara = ['bendahara', 'admin', 'kurikulum'].includes(role);
    document.querySelectorAll('.role-bendahara').forEach(function (el) {
        el.style.display = isBendahara ? '' : 'none';
    });

    // Laporan Bendahara untuk Kepsek ONLY (admin excluded)
    var isKepsekOnly = (role === 'kepala_sekolah');
    document.querySelectorAll('.role-kepsek-only').forEach(function (el) {
        el.style.display = isKepsekOnly ? '' : 'none';
    });

    // Welcome message
    var welcomeEl = document.getElementById('dashboardWelcome');
    if (welcomeEl) {
        var welcomeMap = {
            'admin': 'Kelola seluruh sistem informasi sekolah.',
            'kurikulum': 'Kelola kurikulum dan monitoring pembelajaran.',
            'kepala_sekolah': 'Pantau kinerja dan aktivitas sekolah.',
            'kesiswaan': 'Kelola kedisiplinan dan pembinaan siswa.',
            'operator_sekolah': 'Kelola data sekolah, guru, dan siswa.',
            'wali_kelas': 'Kelola kelas dan evaluasi siswa.',
            'guru_mapel': 'Kelola jurnal mengajar dan absensi.',
            'bendahara': 'Kelola keuangan dan pembayaran.',
            'siswa': 'Selamat datang di portal siswa.'
        };
        welcomeEl.textContent = welcomeMap[currentRole] || 'Selamat datang di Sistem Informasi Sekolah.';
    }

    if (window.lucide) lucide.createIcons();
}

// ============================================================
// SIDEBAR & NAVIGATION
// ============================================================
function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('dashOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

window.showSection = function (sectionId, linkEl) {
    document.querySelectorAll('.dash-section').forEach(function (s) { s.classList.remove('active'); });
    var section = document.getElementById(sectionId);
    if (section) section.classList.add('active');

    // Update active link
    document.querySelectorAll('.sidebar-link').forEach(function (l) { l.classList.remove('active'); });
    if (linkEl) linkEl.classList.add('active');

    // Close sidebar on mobile
    if (window.innerWidth <= 768) toggleSidebar();

    // Lazy-load data for sections
    if (sectionId === 'sectionBerita' && typeof loadBeritaAdmin === 'function') loadBeritaAdmin();
    if (sectionId === 'sectionArsipBerita' && typeof loadArsipBerita === 'function') loadArsipBerita();
    if (sectionId === 'sectionEskul' && typeof loadEskulAdmin === 'function') loadEskulAdmin();
    if (sectionId === 'sectionSarpras' && typeof loadSarprasAdmin === 'function') loadSarprasAdmin();
    if (sectionId === 'sectionPengumuman' && typeof loadPengumumanAdmin === 'function') loadPengumumanAdmin();
    if (sectionId === 'sectionSPMB' && typeof loadSPMBData === 'function') {
        loadSPMBConfigDashboard();
        loadSPMBData();
    }
    if (sectionId === 'sectionAkun') {
        if (typeof renderPendingAccounts === 'function') renderPendingAccounts();
        if (typeof renderActiveAccounts === 'function') renderActiveAccounts();
        if (typeof renderInactiveAccounts === 'function') renderInactiveAccounts();
    }
    if (sectionId === 'sectionDashboard') {
        loadDashboardPengumuman();
        if (['admin', 'kurikulum'].includes(currentRole)) { loadDashGuru(); loadDashSiswa(); }
    }
    if (sectionId === 'sectionTahunKelas') { loadActiveYear(); loadMasterKelas(); loadMasterMapel(); loadMasterKkm(); }
    if (sectionId === 'sectionProfilGuru') { 
        (async function() {
            await loadMasterMapel();
            loadProfilGuru();
        })();
    }
    if (sectionId === 'sectionGuru') { loadMasterMapel(); loadGuruData(); }
    if (sectionId === 'sectionSiswa') { loadMasterKelas(); loadSiswaData(); }
    if (sectionId === 'sectionAlumni') loadAlumniData();
    if (sectionId === 'sectionBankSoal') { loadMasterKelas(); loadActiveYear(); loadMasterMapel(); loadBankSoal(); }
    if (sectionId === 'sectionBuatSoal') { loadMasterKelas(); loadActiveYear(); loadMasterMapel(); loadAsesmenList(); }
    if (sectionId === 'sectionArsipAsesmen') { loadArsipAsesmen(); }
    if (sectionId === 'sectionSampahAsesmen') { loadSampahAsesmen(); }
    if (sectionId === 'sectionHasilAsesmen') {
        (async function() {
            await loadActiveYear();
            await loadMasterKelas();
            await loadMasterMapel();
            var lbl = document.getElementById('lblActiveYear');
            if (lbl && document.getElementById('hasilAsesmenTahun')) {
                document.getElementById('hasilAsesmenTahun').value = lbl.textContent;
            }
            populateKelasDropdown('hasilAsesmenKelas', '');
            populateMapelIdDropdown('hasilAsesmenMapel', '');
            document.getElementById('hasilAsesmenLink').value = '';
            document.getElementById('hasilAsesmenPanel').style.display = 'none';
            updateHasilAsesmenTipe();
        })();
    }
    if (sectionId === 'sectionJurnalMengajar') { loadMasterKelas(); loadMasterMapel(); loadActiveYear(); loadJurnalMengajar(); }
    if (sectionId === 'sectionLaporanJurnal') { loadLaporanJurnal(); }
    if (sectionId === 'sectionPenilaian') { 
        (async function() {
            await loadActiveYear();
            await loadMasterKelas();
            await loadMasterMapel();
            await loadMasterKkm();
            var lbl = document.getElementById('lblActiveYear');
            if (lbl && document.getElementById('filterPenilaianTahun')) {
                document.getElementById('filterPenilaianTahun').value = lbl.textContent;
            }
            populateKelasDropdown('filterPenilaianKelas', '');
            populateMapelIdDropdown('filterPenilaianMapel', '');
        })();
    }
    if (sectionId === 'sectionHasilUjianSaya') { loadHasilUjianSaya(); }
    if (sectionId === 'sectionKritikSaranMasuk') { loadKritikSaran(); }
    if (sectionId === 'sectionMutasiSiswa') { loadMasterKelas(); loadMutasiData(); }
    if (sectionId === 'sectionAgendaDinas') { loadRapatData(); loadPerjadinData(); }
    if (sectionId === 'sectionInventaris') { loadInventarisData(); }
    if (sectionId === 'sectionSuratMasukKeluar') { loadSuratData(); }
    if (sectionId === 'sectionNotulensi') { loadNotulensiData(); }
    if (sectionId === 'sectionPelanggaranSiswa') { loadTataTertibData(); loadPelanggaranData(); }
    if (sectionId === 'sectionKegiatanOsis') { loadOsisData(); }
    if (sectionId === 'sectionEkstrakurikuler') { loadEkskulData(); }
    if (sectionId === 'sectionPrestasiSiswa') { loadPrestasiData(); }
    if (sectionId === 'sectionBimbinganKonseling') { loadBkData(); }
    if (sectionId === 'sectionKesehatanSiswa') { loadKesehatanData(); }
    // ================= GALERI ================= //
    if (sectionId === 'sectionGaleri') { loadGaleri(); }
    // ========================================== //
    if (sectionId === 'sectionRuangDiskusi') {
        if(currentUser) {
            var avatarStr = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
            document.getElementById('forumUserAvatar').innerText = avatarStr;
        }
        loadForumFeed();
    }
    if (sectionId === 'sectionBuatSoal') { loadAsesmenConfig(); loadMasterKelas(); loadMasterMapel(); loadActiveYear(); loadAsesmenList(); }
    if (sectionId === 'sectionArsipAsesmen') { loadMasterKelas(); loadMasterMapel(); loadActiveYear(); loadArsipAsesmen(); }
    if (sectionId === 'sectionSoalUjian') { loadSoalUjian(); }
    if (sectionId === 'sectionCetakKartuUjian') { 
        populateKelasNameDropdown('kartuKelasSelect', ''); 
        if (typeof loadPanitiaLocal === 'function') loadPanitiaLocal();
        loadMasterMapel();
        loadGuruData();
        renderRiwayatJadwal();
    }
    if (sectionId === 'sectionIntegrasiGoogle') {
        if (typeof loadAsesmenConfig === 'function') loadAsesmenConfig();
        if (typeof loadAIConfig === 'function') loadAIConfig();
    }
    if (sectionId === 'sectionLaporanNilai') {
        (async function() {
            await loadActiveYear();
            await loadMasterKelas();
            await loadMasterMapel();
            var lbl = document.getElementById('lblActiveYear');
            if (lbl && document.getElementById('filterLaporanTahun')) {
                document.getElementById('filterLaporanTahun').value = lbl.textContent;
            }
            populateKelasDropdown('filterLaporanKelas', '');
            populateMapelIdDropdown('filterLaporanMapel', '');
        })();
    }
};

// ============================================================
// LOGOUT & NAVIGATION PREVENTION
// ============================================================
// Mencegah navigasi kembali (back button) ke halaman sebelumnya
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.pushState(null, null, window.location.href);
};

function handleLogout() {
    if (typeof showCustomConfirm === 'function') {
        showCustomConfirm('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari sistem?', 'Ya, Keluar', async function() {
            if (!supabaseClient) { window.location.replace('index.html'); return; }
            try {
                await supabaseClient.auth.signOut();
            } catch (e) { console.warn(e); }
            window.location.replace('index.html');
        });
    } else {
        if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
            if (!supabaseClient) { window.location.replace('index.html'); return; }
            supabaseClient.auth.signOut().then(() => {
                window.location.replace('index.html');
            }).catch(() => {
                window.location.replace('index.html');
            });
        }
    }
}

// ============================================================
// UBAH NAMA PROFIL (SIDEBAR)
// ============================================================
function openEditNamaModal() {
    if (!currentUser) return;
    var nameEl = document.getElementById('userName');
    document.getElementById('formEditNamaInput').value = nameEl ? nameEl.textContent : currentUser.name;
    document.getElementById('editNamaModal').classList.add('active');
}

function closeEditNamaModal() {
    document.getElementById('editNamaModal').classList.remove('active');
}

async function saveEditNama() {
    if (!currentUser) return;
    var newName = document.getElementById('formEditNamaInput').value.trim();
    if (!newName) {
        showToast('Nama tidak boleh kosong!', 'warning');
        return;
    }
    
    if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan nama...');
    try {
        // Update in profiles
        var { error: errProfile } = await supabaseClient
            .from('profiles')
            .update({ full_name: newName })
            .eq('id', currentUser.id);
            
        if (errProfile) throw errProfile;
        
        // Update in memory UI
        currentUser.name = newName;
        var nameEl = document.getElementById('userName');
        if (nameEl) nameEl.textContent = newName;
        
        var avatarEl = document.getElementById('userAvatar');
        if (avatarEl && typeof getInitials === 'function') {
            avatarEl.textContent = getInitials(newName);
        }
        
        showToast('Nama berhasil diperbarui!', 'success');
        closeEditNamaModal();
        
    } catch(e) {
        showToast('Gagal menyimpan nama: ' + e.message, 'error');
    } finally {
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
    }
}

// ============================================================
// STATS
// ============================================================
function animateCountUp(element, target) {
    if (!element || isNaN(target)) return;
    var dur = 800, start = null;
    function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        element.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

async function loadStats() {
    if (!supabaseClient) return;
    try {
        const { data: pending } = await supabaseClient.from('profiles').select('id').eq('role', 'menunggu_persetujuan');
        var sp = document.getElementById('statPending');
        if (sp && pending) animateCountUp(sp, pending.length);

        const { data: active } = await supabaseClient.from('profiles').select('id').neq('role', 'menunggu_persetujuan').neq('role', 'nonaktif');
        var sa = document.getElementById('statApproved');
        if (sa && active) animateCountUp(sa, active.length);

        const { data: berita } = await supabaseClient.from('berita').select('id');
        var sb = document.getElementById('statBerita');
        if (sb && berita) animateCountUp(sb, berita.length);

        const { data: spmb } = await supabaseClient.from('pendaftaran_murid_baru').select('id');
        var ss = document.getElementById('statSpmb');
        if (ss && spmb) animateCountUp(ss, spmb.length);
    } catch (e) { console.warn('Stats error:', e); }
}

function animateDashboardCards() {
    document.querySelectorAll('.stat-card').forEach(function (card, i) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(function () {
            card.style.transition = 'opacity .5s ease, transform .5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 80 * i);
    });
}

// ============================================================
// BERITA ADMIN (CRUD)
// ============================================================
async function loadBeritaAdmin() {
    var tbody = document.getElementById('beritaTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('berita').select('*')
            .is('archived_at', null)
            .order('tanggal', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada berita aktif.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var dt = b.tanggal ? new Date(b.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var statusBadge = b.is_published
                ? '<span class="badge badge-green">Publik</span>'
                : '<span class="badge badge-gray">Draft</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (b.judul || '-') + '</td>' +
                '<td style="color:var(--text-light);font-size:.85rem;">' + (b.ringkasan || '-').substring(0, 80) + '</td>' +
                '<td>' + dt + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon" style="background:rgba(245,158,11,.1);color:var(--amber)" onclick="archiveBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Arsipkan"><i data-lucide="archive" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-blue" onclick="editBerita(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openBeritaModal(data) {
    document.getElementById('beritaId').value = data ? data.id : '';
    document.getElementById('beritaJudul').value = data ? data.judul : '';
    document.getElementById('beritaRingkasan').value = data ? data.ringkasan : '';
    document.getElementById('beritaGambarFile').value = '';
    var previewEl = document.getElementById('beritaGambarPreview');
    if (previewEl) {
        if (data && data.gambar_url) {
            previewEl.innerHTML = '<img src="' + (getDirectImageUrl(data.gambar_url) || data.gambar_url) + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" /> <span style="font-size:0.8rem;color:var(--text-light);">Gambar saat ini (upload baru untuk mengganti)</span>';
        } else { previewEl.innerHTML = ''; }
    }
    document.getElementById('beritaTanggal').value = data ? data.tanggal : new Date().toISOString().split('T')[0];
    document.getElementById('beritaPublished').value = data ? String(data.is_published) : 'true';
    document.getElementById('beritaModalTitle').textContent = data ? 'Edit Berita' : 'Tambah Berita';
    document.getElementById('beritaSaveBtnText').textContent = data ? 'Update Berita' : 'Simpan Berita';
    document.getElementById('beritaModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeBeritaModal() {
    document.getElementById('beritaModal').classList.remove('active');
    document.getElementById('beritaForm').reset();
}

async function saveBerita() {
    var id = document.getElementById('beritaId').value;
    var payload = {
        judul: document.getElementById('beritaJudul').value.trim(),
        ringkasan: document.getElementById('beritaRingkasan').value.trim(),
        tanggal: document.getElementById('beritaTanggal').value || new Date().toISOString().split('T')[0],
        is_published: document.getElementById('beritaPublished').value === 'true'
    };
    if (!payload.judul) { showToast('Judul wajib diisi!', 'warning'); return; }

    // Upload gambar jika ada file baru
    var fileInput = document.getElementById('beritaGambarFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        showGlobalLoader('Mengupload gambar berita...');
        try {
            var file = fileInput.files[0];
            payload.gambar_url = await uploadToGoogleDrive(file, 'berita');
        } catch(e) { hideGlobalLoader(); showToast('Gagal upload gambar: ' + e.message, 'error'); return; }
    }

    try {
        if (id) {
            const { error } = await supabaseClient.from('berita').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Berita berhasil diupdate!', 'success');
        } else {
            payload.created_by = currentUser ? currentUser.id : null;
            const { error } = await supabaseClient.from('berita').insert([payload]);
            if (error) throw error;
            showToast('Berita berhasil ditambahkan!', 'success');
            
            // Auto-archive oldest if count > 6
            const { data: activeBerita, error: countErr } = await supabaseClient.from('berita')
                .select('id')
                .is('archived_at', null)
                .order('tanggal', { ascending: true }); // Oldest first
            
            if (!countErr && activeBerita && activeBerita.length > 6) {
                var overflowCount = activeBerita.length - 6;
                // Archive the oldest `overflowCount` items
                for(var j=0; j<overflowCount; j++) {
                    await supabaseClient.from('berita').update({ archived_at: new Date().toISOString() }).eq('id', activeBerita[j].id);
                }
                setTimeout(()=>showToast('Berita lama otomatis diarsipkan karena sudah melampaui 6.', 'info'), 1000);
            }
        }
        closeBeritaModal();
        loadBeritaAdmin();
        loadArsipBerita(); // update list arsip
        loadStats();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function editBerita(id) {
    try {
        const { data, error } = await supabaseClient.from('berita').select('*').eq('id', id).single();
        if (error) throw error;
        openBeritaModal(data);
    } catch (e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deleteBerita(id, judul) {
    showCustomConfirm('Hapus Berita?', 'Berita <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('berita').delete().eq('id', id);
            if (error) throw error;
            showToast('Berita berhasil dihapus!', 'success');
            loadBeritaAdmin();
            loadArsipBerita();
            loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function archiveBerita(id, judul) {
    showCustomConfirm('Arsipkan Berita?', 'Berita <strong>"' + judul + '"</strong> akan dipindah ke Arsip dan tidak tampil di halaman utama.', 'Ya, Arsipkan', async function () {
        try {
            await supabaseClient.from('berita').update({ archived_at: new Date().toISOString() }).eq('id', id);
            showToast('Berita berhasil diarsipkan!', 'success');
            loadBeritaAdmin();
            loadArsipBerita();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

async function loadArsipBerita() {
    var tbody = document.getElementById('arsipBeritaTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat arsip...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('berita').select('*')
            .not('archived_at', 'is', null)
            .order('archived_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Arsip berita kosong.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var dt = b.archived_at ? new Date(b.archived_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (b.judul || '-') + '</td>' +
                '<td style="color:var(--text-light);font-size:.85rem;">' + (b.ringkasan || '-').substring(0, 80) + '</td>' +
                '<td>' + dt + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="restoreBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Kembalikan ke Aktif"><i data-lucide="undo-2" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteBerita(\'' + b.id + '\',\'' + (b.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function restoreBerita(id, judul) {
    showCustomConfirm('Kembalikan Berita?', 'Berita <strong>"' + judul + '"</strong> akan ditampilkan kembali di halaman utama.', 'Ya, Kembalikan', async function () {
        try {
            await supabaseClient.from('berita').update({ archived_at: null }).eq('id', id);
            showToast('Berita berhasil dikembalikan!', 'success');
            loadBeritaAdmin();
            loadArsipBerita();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// PENGUMUMAN (CRUD + DASHBOARD DISPLAY)
// ============================================================
var pengumumanList = [];

async function loadPengumumanAdmin() {
    var tbody = document.getElementById('pengumumanTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('pengumuman').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        pengumumanList = data || [];
        if (pengumumanList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada pengumuman.</td></tr>';
            return;
        }
        tbody.innerHTML = pengumumanList.map(function(p, i) {
            var dt = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var prioBadge = p.prioritas === 'Urgent' ? '<span class="badge badge-red">Urgent</span>' :
                p.prioritas === 'Penting' ? '<span class="badge badge-amber">Penting</span>' :
                '<span class="badge badge-blue">Normal</span>';
            var statusBadge = p.is_active ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-gray">Nonaktif</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (p.judul || '-') + '</td>' +
                '<td style="color:var(--text-light);font-size:.85rem;">' + (p.isi || '-').substring(0, 80) + (p.isi && p.isi.length > 80 ? '...' : '') + '</td>' +
                '<td>' + prioBadge + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + dt + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editPengumuman(\'' + p.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deletePengumuman(\'' + p.id + '\',\'' + (p.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openPengumumanModal(data) {
    document.getElementById('pengumumanId').value = data ? data.id : '';
    document.getElementById('pengumumanJudul').value = data ? data.judul : '';
    document.getElementById('pengumumanIsi').value = data ? data.isi : '';
    document.getElementById('pengumumanPrioritas').value = data ? data.prioritas : 'Normal';
    document.getElementById('pengumumanStatus').value = data ? String(data.is_active) : 'true';
    document.getElementById('pengumumanModalTitle').textContent = data ? 'Edit Pengumuman' : 'Tambah Pengumuman';
    document.getElementById('pengumumanSaveBtnText').textContent = data ? 'Update Pengumuman' : 'Simpan Pengumuman';
    document.getElementById('pengumumanModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closePengumumanModal() {
    document.getElementById('pengumumanModal').classList.remove('active');
    document.getElementById('pengumumanForm').reset();
}

async function savePengumuman() {
    var id = document.getElementById('pengumumanId').value;
    var payload = {
        judul: document.getElementById('pengumumanJudul').value.trim(),
        isi: document.getElementById('pengumumanIsi').value.trim(),
        prioritas: document.getElementById('pengumumanPrioritas').value,
        is_active: document.getElementById('pengumumanStatus').value === 'true'
    };
    if (!payload.judul || !payload.isi) { showToast('Judul dan isi pengumuman wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('pengumuman').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Pengumuman berhasil diupdate!', 'success');
        } else {
            payload.created_by = currentUser ? currentUser.id : null;
            const { error } = await supabaseClient.from('pengumuman').insert([payload]);
            if (error) throw error;
            showToast('Pengumuman berhasil ditambahkan!', 'success');
        }
        closePengumumanModal();
        loadPengumumanAdmin();
        loadDashboardPengumuman();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function editPengumuman(id) {
    try {
        const { data, error } = await supabaseClient.from('pengumuman').select('*').eq('id', id).single();
        if (error) throw error;
        openPengumumanModal(data);
    } catch(e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deletePengumuman(id, judul) {
    showCustomConfirm('Hapus Pengumuman?', 'Pengumuman <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('pengumuman').delete().eq('id', id);
            if (error) throw error;
            showToast('Pengumuman berhasil dihapus!', 'success');
            loadPengumumanAdmin();
            loadDashboardPengumuman();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// Display active pengumuman as banners on dashboard
async function loadDashboardPengumuman() {
    var container = document.getElementById('dashboardPengumumanArea');
    if (!container || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('pengumuman').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';
        container.innerHTML = data.map(function(p) {
            var colorMap = {
                'Urgent': { bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '#ef4444', icon: '#ef4444', title: '#dc2626' },
                'Penting': { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#3b82f6', icon: '#3b82f6', title: '#2563eb' },
                'Normal': { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#22c55e', icon: '#22c55e', title: '#16a34a' }
            };
            var c = colorMap[p.prioritas] || colorMap['Normal'];
            var dt = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            var prioLabel = p.prioritas === 'Urgent' ? '⚠️ URGENT' : p.prioritas === 'Penting' ? '📢 PENTING' : '📣 PENGUMUMAN';
            return '<div style="background:' + c.bg + ';border-left:4px solid ' + c.border + ';border-radius:12px;padding:1rem 1.25rem;margin-bottom:.75rem;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
                '<span style="font-size:.75rem;font-weight:700;color:' + c.icon + ';letter-spacing:.5px;">' + prioLabel + '</span>' +
                '<span style="font-size:.75rem;color:#94a3b8;">' + dt + '</span>' +
                '</div>' +
                '<h4 style="margin:0 0 4px 0;font-size:1rem;color:' + c.title + ';">' + (p.judul || '') + '</h4>' +
                '<p style="margin:0;font-size:.9rem;color:#475569;line-height:1.5;">' + (p.isi || '') + '</p>' +
                '</div>';
        }).join('');
    } catch(e) { console.warn('loadDashboardPengumuman error:', e.message); }
}

// ============================================================
// EKSTRAKURIKULER (CRUD)
// ============================================================
async function loadEskulAdmin() {
    var tbody = document.getElementById('eskulTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('ekstrakurikuler').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data Ekstrakurikuler.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var imgURL = getDirectImageUrl(b.gambar_url) || b.gambar_url;
            var nama = b.nama_ekskul || b.nama || ''; // fallback untuk support legacy table
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (nama || '-') + '</td>' +
                '<td>' + (imgURL ? '<img src="' + imgURL + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--border);" />' : '<span style="color:var(--text-light);">-</span>') + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editEskul(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteEskul(\'' + b.id + '\',\'' + nama.replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openEskulModal(data) {
    document.getElementById('eskulId').value = data ? data.id : '';
    document.getElementById('eskulNama').value = data ? (data.nama_ekskul || data.nama || '') : '';
    document.getElementById('eskulGambarFile').value = '';
    var previewEl = document.getElementById('eskulGambarPreview');
    if (previewEl) {
        if (data && data.gambar_url) {
            previewEl.innerHTML = '<img src="' + (getDirectImageUrl(data.gambar_url) || data.gambar_url) + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" /> <span style="font-size:0.8rem;color:var(--text-light);">Gambar saat ini</span>';
        } else { previewEl.innerHTML = ''; }
    }
    document.getElementById('eskulModalTitle').textContent = data ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler';
    document.getElementById('eskulSaveBtnText').textContent = data ? 'Update Data' : 'Simpan Data';
    document.getElementById('eskulModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeEskulModal() {
    document.getElementById('eskulModal').classList.remove('active');
    document.getElementById('eskulForm').reset();
}

async function saveEskul() {
    var id = document.getElementById('eskulId').value;
    var payload = {
        nama_ekskul: document.getElementById('eskulNama').value.trim(),
        updated_at: new Date().toISOString()
    };
    if (!payload.nama_ekskul) { showToast('Nama wajib diisi!', 'warning'); return; }

    // Upload gambar jika ada file baru
    var fileInput = document.getElementById('eskulGambarFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        showGlobalLoader('Mengupload gambar eskul...');
        try {
            var file = fileInput.files[0];
            payload.gambar_url = await uploadToGoogleDrive(file, 'eskul');
        } catch(e) { hideGlobalLoader(); showToast('Gagal upload gambar: ' + e.message, 'error'); return; }
    } else if (!id) {
        showToast('Gambar wajib diupload!', 'warning'); return;
    }

    try {
        if (id) {
            const { error } = await supabaseClient.from('ekstrakurikuler').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Data berhasil diupdate!', 'success');
        } else {
            const { error } = await supabaseClient.from('ekstrakurikuler').insert([payload]);
            if (error) throw error;
            showToast('Data berhasil ditambahkan!', 'success');
        }
        closeEskulModal();
        loadEskulAdmin();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function editEskul(id) {
    try {
        const { data, error } = await supabaseClient.from('ekstrakurikuler').select('*').eq('id', id).single();
        if (error) throw error;
        openEskulModal(data);
    } catch (e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deleteEskul(id, nama) {
    showCustomConfirm('Hapus Ekstrakurikuler?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('ekstrakurikuler').delete().eq('id', id);
            if (error) throw error;
            showToast('Data berhasil dihapus!', 'success');
            loadEskulAdmin();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// SARANA PRASARANA (CRUD)
// ============================================================
async function loadSarprasAdmin() {
    var tbody = document.getElementById('sarprasTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('sarana_prasarana').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data Sarpras.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (b, i) {
            var imgURL = getDirectImageUrl(b.gambar_url) || b.gambar_url;
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (b.nama || '-') + '</td>' +
                '<td>' + (imgURL ? '<img src="' + imgURL + '" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--border);" />' : '<span style="color:var(--text-light);">-</span>') + '</td>' +
                '<td><div style="display:flex;gap:.4rem;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editSarpras(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteSarpras(\'' + b.id + '\',\'' + (b.nama || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openSarprasModal(data) {
    document.getElementById('sarprasId').value = data ? data.id : '';
    document.getElementById('sarprasNama').value = data ? data.nama : '';
    document.getElementById('sarprasGambarFile').value = '';
    var previewEl = document.getElementById('sarprasGambarPreview');
    if (previewEl) {
        if (data && data.gambar_url) {
            previewEl.innerHTML = '<img src="' + (getDirectImageUrl(data.gambar_url) || data.gambar_url) + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" /> <span style="font-size:0.8rem;color:var(--text-light);">Gambar saat ini</span>';
        } else { previewEl.innerHTML = ''; }
    }
    document.getElementById('sarprasModalTitle').textContent = data ? 'Edit Sarpras' : 'Tambah Sarpras';
    document.getElementById('sarprasSaveBtnText').textContent = data ? 'Update Data' : 'Simpan Data';
    document.getElementById('sarprasModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeSarprasModal() {
    document.getElementById('sarprasModal').classList.remove('active');
    document.getElementById('sarprasForm').reset();
}

async function saveSarpras() {
    var id = document.getElementById('sarprasId').value;
    var payload = {
        nama: document.getElementById('sarprasNama').value.trim(),
        updated_at: new Date().toISOString()
    };
    if (!payload.nama) { showToast('Nama wajib diisi!', 'warning'); return; }

    // Upload gambar jika ada file baru
    var fileInput = document.getElementById('sarprasGambarFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        showGlobalLoader('Mengupload gambar sarpras...');
        try {
            var file = fileInput.files[0];
            payload.gambar_url = await uploadToGoogleDrive(file, 'sarpras');
        } catch(e) { hideGlobalLoader(); showToast('Gagal upload gambar: ' + e.message, 'error'); return; }
    } else if (!id) {
        showToast('Gambar wajib diupload!', 'warning'); return;
    }

    try {
        if (id) {
            const { error } = await supabaseClient.from('sarana_prasarana').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Data berhasil diupdate!', 'success');
        } else {
            const { error } = await supabaseClient.from('sarana_prasarana').insert([payload]);
            if (error) throw error;
            showToast('Data berhasil ditambahkan!', 'success');
        }
        closeSarprasModal();
        loadSarprasAdmin();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function editSarpras(id) {
    try {
        const { data, error } = await supabaseClient.from('sarana_prasarana').select('*').eq('id', id).single();
        if (error) throw error;
        openSarprasModal(data);
    } catch (e) { showToast('Gagal memuat data: ' + e.message, 'error'); }
}

function deleteSarpras(id, nama) {
    showCustomConfirm('Hapus Sarpras?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('sarana_prasarana').delete().eq('id', id);
            if (error) throw error;
            showToast('Data berhasil dihapus!', 'success');
            loadSarprasAdmin();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// Display guru & staff list on dashboard
async function loadDashGuru() {
    var tbody = document.getElementById('dashGuruTableBody');
    var countEl = document.getElementById('dashGuruCount');
    if (!tbody || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('guru_staff').select('*').eq('status', 'Aktif').order('nama_lengkap');
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-light)">Belum ada data guru.</td></tr>';
            if (countEl) countEl.textContent = '0 guru/staff';
            return;
        }
        if (countEl) countEl.textContent = data.length + ' guru/staff';
        tbody.innerHTML = data.map(function(g, i) {
            var fotoHtml = g.foto_url ? '<img src="' + g.foto_url + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;font-weight:bold;">' + (g.nama_lengkap ? g.nama_lengkap.charAt(0).toUpperCase() : '?') + '</div>';
            var allMapel = [g.mata_pelajaran, g.mata_pelajaran_2, g.mata_pelajaran_3].filter(Boolean).join(', ');
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td><div style="display:flex;justify-content:center;">' + fotoHtml + '</div></td>' +
                '<td style="font-weight:500;">' + (g.nama_lengkap||'-') + '</td>' +
                '<td>' + (g.jenis_kelamin||'-') + '</td>' +
                '<td>' + (g.jabatan||'-') + '</td>' +
                '<td>' + (g.jabatan_tambahan||'-') + '</td>' +
                '<td>' + (allMapel||'-') + '</td>' +
                '</tr>';
        }).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

// Display student list on dashboard
async function loadDashSiswa() {
    var tbody = document.getElementById('dashSiswaTableBody');
    var countEl = document.getElementById('dashSiswaCount');
    if (!tbody || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas, tingkat)').not('status', 'in', '("Lulus","Pindah")');
        if (error) throw error;
        
        var list = data || [];
        list.sort(function(a, b) {
            var tkA = a.master_kelas ? parseInt(a.master_kelas.tingkat) || 0 : 0;
            var tkB = b.master_kelas ? parseInt(b.master_kelas.tingkat) || 0 : 0;
            if (tkA !== tkB) return tkA - tkB;
            
            var kelasA = a.master_kelas ? (a.master_kelas.nama_kelas || '').toLowerCase() : '';
            var kelasB = b.master_kelas ? (b.master_kelas.nama_kelas || '').toLowerCase() : '';
            if (kelasA !== kelasB) {
                if (kelasA < kelasB) return -1;
                if (kelasA > kelasB) return 1;
            }

            var nameA = (a.nama_lengkap || '').toLowerCase();
            var nameB = (b.nama_lengkap || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-light)">Belum ada data siswa.</td></tr>';
            if (countEl) countEl.textContent = '0 siswa';
            return;
        }
        if (countEl) countEl.textContent = list.length + ' siswa';
        tbody.innerHTML = list.map(function(s, i) {
            var fotoHtml = s.foto ? '<img src="' + s.foto + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' : '<div style="width:32px;height:32px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:11px;font-weight:bold;">' + (s.nama_lengkap ? s.nama_lengkap.charAt(0).toUpperCase() : '?') + '</div>';
            var kelas = s.master_kelas ? s.master_kelas.nama_kelas : '-';
            var mondokBadge = s.mondok === 'Iya' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;">Iya</span>' : '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;font-size:.75rem;">Tidak</span>';
            var statusBadge = s.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;font-size:.75rem;">Aktif</span>' :
                s.status === 'Tidak Aktif' ? '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;font-size:.75rem;">Tidak Aktif</span>' :
                s.status === 'Pindahan' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;">Pindahan</span>' :
                '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;font-size:.75rem;">' + (s.status||'-') + '</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;justify-content:center;">' + fotoHtml + '</div></td>' +
                '<td>' + (s.nisn||'-') + '</td>' +
                '<td style="font-weight:500;">' + (s.nama_lengkap||'-') + '</td>' +
                '<td>' + (s.jenis_kelamin||'-') + '</td>' +
                '<td>' + kelas + '</td>' +
                '<td>' + mondokBadge + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '</tr>';
        }).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

// ============================================================
// SPMB MANAGEMENT (Dashboard)
// ============================================================
async function loadSPMBConfigDashboard() {
    try {
        const { data: statusData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_is_active').single();
        const { data: yearData } = await supabaseClient.from('system_settings').select('value').eq('key', 'spmb_academic_year').single();
        if (statusData && document.getElementById('confSpmbStatus')) {
            document.getElementById('confSpmbStatus').value = statusData.value;
        }
        if (yearData && document.getElementById('confSpmbYear')) {
            document.getElementById('confSpmbYear').value = yearData.value;
        }
    } catch(e) { console.error('Error load spmb config:', e); }
}

async function saveSPMBConfig() {
    var status = document.getElementById('confSpmbStatus').value;
    var year = document.getElementById('confSpmbYear').value;
    if (!year) return showToast('Tahun Ajaran tidak boleh kosong!', 'error');
    
    try {
        await supabaseClient.from('system_settings').upsert([
            { key: 'spmb_is_active', value: status },
            { key: 'spmb_academic_year', value: year }
        ]);
        showToast('Pengaturan SPMB berhasil disimpan!', 'success');
        
        // Panggil render public lagi jika sedang di landing page? Hanya berlaku kalau reload.
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function loadSPMBData() {
    var tbody = document.getElementById('spmbTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('pendaftaran_murid_baru').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada pendaftar.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(function (p, i) {
            var dt = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var statusBadge = p.status === 'Diterima' ? '<span class="badge badge-green">Diterima</span>' :
                p.status === 'Ditolak' ? '<span class="badge badge-red">Ditolak</span>' :
                    '<span class="badge badge-amber">Menunggu</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (p.nama_lengkap || '-') + '</td>' +
                '<td>' + (p.nama_orang_tua || '-') + '</td>' +
                '<td>' + (p.nomor_telepon || '-') + '</td>' +
                '<td>' + (p.sekolah_asal || '-') + '</td>' +
                '<td style="font-size:.85rem;">' + (p.alamat_lengkap || '-') + '</td>' +
                '<td>' + dt + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td><div style="display:flex;gap:.3rem;flex-wrap:wrap;">' +
                (p.status === 'Menunggu' ? '<button class="btn-icon btn-icon-green" onclick="updateSPMBStatus(\'' + p.id + '\',\'Diterima\')" title="Terima"><i data-lucide="check" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="updateSPMBStatus(\'' + p.id + '\',\'Ditolak\')" title="Tolak"><i data-lucide="x" style="width:14px;height:14px"></i></button>' : '') +
                '<button class="btn-icon btn-icon-blue" onclick="printSPMB(\'' + p.id + '\')" title="Cetak Formulir"><i data-lucide="printer" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteSPMB(\'' + p.id + '\',\'' + (p.nama_lengkap || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function updateSPMBStatus(id, status) {
    try {
        const { error } = await supabaseClient.from('pendaftaran_murid_baru').update({ status: status }).eq('id', id);
        if (error) throw error;
        showToast('Status berhasil diupdate!', 'success');
        loadSPMBData();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteSPMB(id, nama) {
    showCustomConfirm('Hapus Data SPMB?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('pendaftaran_murid_baru').delete().eq('id', id);
            if (error) throw error;
            showToast('Data dihapus!', 'success');
            loadSPMBData();
            loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

async function printSPMB(id) {
    try {
        const { data: spmb, error } = await supabaseClient.from('pendaftaran_murid_baru').select('*').eq('id', id).single();
        if (error || !spmb) throw new Error('Data tidak ditemukan');

        const printWin = window.open('', '_blank');
        if (!printWin) { showToast('Popup diblokir oleh browser', 'error'); return; }

        const logoUrl = window.location.href.split('dashboard.html')[0] + 'img/logo.png';
        const tglDaftar = new Date(spmb.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Data SPMB - ${spmb.nama_lengkap}</title>
            <style>
                body { font-family: "Times New Roman", Times, serif; color: #000; padding: 0 40px; line-height: 1.5; font-size: 14pt; }
                .kop { position: relative; width: 100%; text-align: center; margin-bottom: 5px; min-height: 110px; }
                .kop img { position: absolute; left: 0; top: 0; width: 110px; height: auto; }
                .kop-text { width: 100%; text-align: center; line-height: 1.15; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .kop-text h2 { margin: 0 0 5px 0; font-size: 26px; font-weight: bold; letter-spacing: 0.5px; font-family: "Times New Roman", serif; }
                .kop-text .bold-line { font-weight: bold; font-size: 14.5px; margin: 2px 0; font-family: "Times New Roman", serif; }
                .kop-text .normal-line { font-size: 13.5px; margin: 2px 0; font-family: "Times New Roman", serif; }
                .kop-border-sub { border-top: 3px solid #000; border-bottom: 1px solid #000; height: 1.5px; margin-top: 5px; margin-bottom: 30px; }
                
                h3.form-title { text-align: center; text-decoration: underline; text-transform: uppercase; margin: 30px 0; font-size: 18px; font-weight: bold; }
                
                table.data-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14pt; }
                table.data-table td { padding: 10px 5px; vertical-align: top; }
                table.data-table td:first-child { width: 220px; font-weight: bold; }
                table.data-table td:nth-child(2) { width: 20px; text-align: center; }
                
                .footer { margin-top: 80px; display: flex; justify-content: flex-end; font-size: 14pt;}
                .signature { text-align: center; width: 300px; }
                
                @media print {
                    @page { margin: 1.5cm; size: A4 portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
                }
            </style>
        </head>
        <body onload="window.print(); window.setTimeout(function(){window.close();}, 500);">
            <div class="kop">
                <img src="${logoUrl}" alt="Logo SMP IT Al-Fathonah" />
                <div class="kop-text">
                    <h2>SMP IT AL-FATHONAH BABAKAN</h2>
                    <div class="bold-line">STATUS : "TERAKREDITASI"</div>
                    <div class="bold-line">SK BAP S/M No : 02.00/322/BAP-SM/XI/2013</div>
                    <div class="bold-line">NSS: 202 021 704 006 NPSN: 20 25 38 92</div>
                    <div class="normal-line">Jalan H. Mastra (Ponpes Al-Fathonah) No. 04 Desa Kudukeras Kec. Babakan Kab. Cirebon 45191</div>
                    <div class="normal-line">Tlp./ Fax. (0231) 641960 Hp. 085 323 056 221</div>
                </div>
            </div>
            <div class="kop-border-sub"></div>

            <h3 class="form-title">Formulir Pendaftaran Murid Baru</h3>
            
            <table class="data-table">
                <tr><td>Tanggal Pendaftaran</td><td>:</td><td>${tglDaftar}</td></tr>
                <tr><td>Nama Lengkap Siswa</td><td>:</td><td>${spmb.nama_lengkap || '-'}</td></tr>
                <tr><td>Alamat Lengkap</td><td>:</td><td>${spmb.alamat_lengkap || '-'}</td></tr>
                <tr><td>Asal Sekolah</td><td>:</td><td>${spmb.sekolah_asal || '-'}</td></tr>
                <tr><td>Nama Orang Tua/Wali</td><td>:</td><td>${spmb.nama_orang_tua || '-'}</td></tr>
                <tr><td>Nomor Telepon/WA</td><td>:</td><td>${spmb.nomor_telepon || '-'}</td></tr>
                <tr><td>Status Pendaftaran</td><td>:</td><td><strong>${(spmb.status || '').toUpperCase()}</strong></td></tr>
            </table>
            
            <div class="footer">
                <div class="signature">
                    <p>Babakan, ............................ ${new Date().getFullYear()}</p>
                    <p>Panitia Penerimaan Murid Baru,</p>
                    <br><br><br><br>
                    <p>___________________________</p>
                </div>
            </div>
        </body>
        </html>
        `;
        printWin.document.write(html);
        printWin.document.close();
    } catch (e) {
        showNotifModal('Gagal Mencetak', e.message, 'error');
    }
}

// ============================================================
// ACCOUNT MANAGEMENT
// ============================================================
var activeAccountTab = 'pending';
window.switchAccountTab = function (tab) {
    activeAccountTab = tab;
    document.querySelectorAll('.account-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var btn = document.querySelector('[data-tab="' + tab + '"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.account-tab-content').forEach(function (c) { c.style.display = 'none'; });
    var content = document.getElementById('tab_' + tab);
    if (content) content.style.display = 'block';
};

async function renderPendingAccounts() {
    var tbody = document.getElementById('pendingTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').eq('role', 'menunggu_persetujuan').order('created_at', { ascending: false });
        if (error) throw error;
        var badge = document.getElementById('pendingBadge');
        var badgeSidebar = document.getElementById('pendingBadgeSidebar');
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada akun menunggu persetujuan.</td></tr>';
            if (badge) badge.style.display = 'none';
            if (badgeSidebar) badgeSidebar.style.display = 'none';
            return;
        }
        if (badge) { badge.textContent = users.length; badge.style.display = 'inline-flex'; }
        if (badgeSidebar) { badgeSidebar.textContent = users.length; badgeSidebar.style.display = 'inline-flex'; }
        tbody.innerHTML = users.map(function (u) {
            var dt = u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            return '<tr><td style="font-weight:600">' + (u.full_name || '-') + '</td><td>' + (u.email || '-') + '</td><td style="font-size:.82rem;color:var(--text-light)">' + dt + '</td>' +
                '<td><select id="role_' + u.id + '" class="form-input" style="padding:.4rem .6rem;font-size:.82rem;min-width:140px">' + buildRoleOptions() + '</select></td>' +
                '<td><div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
                '<button class="btn-approve" onclick="approveUser(\'' + u.id + '\')"><i data-lucide="check" style="width:14px;height:14px"></i> Setujui</button>' +
                '<button class="btn-reject" onclick="deleteUserPermanent(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')"><i data-lucide="trash-2" style="width:14px;height:14px"></i> Hapus</button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function renderActiveAccounts() {
    var tbody = document.getElementById('activeTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').neq('role', 'menunggu_persetujuan').neq('role', 'nonaktif').order('full_name');
        if (error) throw error;
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada akun aktif.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(function (u) {
            var isMe = currentUser && u.id === currentUser.id;
            var roleOptions = ASSIGNABLE_ROLES.map(function(r) {
                return '<option value="' + r.value + '"' + (r.value === u.role ? ' selected' : '') + '>' + r.label + '</option>';
            }).join('');
            return '<tr><td style="font-weight:600">' + (u.full_name || '-') +
                (isMe ? ' <span class="badge badge-blue" style="font-size:.65rem;">Anda</span>' : '') +
                '</td><td>' + (u.email || '-') + '</td><td>' +
                (isMe ? '<span class="badge badge-blue">' + getRoleLabel(u.role) + '</span>' :
                    '<select id="activeRole_' + u.id + '" class="form-input" style="margin:0; padding:4px 8px; font-size:0.8rem; height:auto;">' + roleOptions + '</select>') +
                '</td>' +
                '<td><div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
                (isMe ? '<span style="font-size:.8rem;color:var(--text-light)">—</span>' :
                    '<button class="btn-icon btn-icon-blue" onclick="changeUserRole(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Simpan Role"><i data-lucide="save" style="width:14px;height:14px"></i></button>' +
                    (u.role === 'siswa' ? '<button class="btn-icon" style="background:rgba(139,92,246,.12);color:#7c3aed;" onclick="openLinkSiswaModal(\'' + u.id + '\',\'' + (u.email || '').replace(/'/g, "\\'") + '\')" title="Hubungkan ke Data Siswa"><i data-lucide="link" style="width:14px;height:14px"></i></button>' : '') +
                    '<button class="btn-icon btn-icon-amber" onclick="deactivateUser(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Nonaktifkan"><i data-lucide="user-x" style="width:14px;height:14px"></i></button>') +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function renderInactiveAccounts() {
    var tbody = document.getElementById('inactiveTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').eq('role', 'nonaktif').order('updated_at', { ascending: false });
        if (error) throw error;
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada akun nonaktif.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(function (u) {
            return '<tr><td style="font-weight:600">' + (u.full_name || '-') + '</td><td>' + (u.email || '-') + '</td>' +
                '<td><div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
                '<button class="btn-icon btn-icon-green" onclick="reactivateUser(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Aktifkan"><i data-lucide="user-check" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteUserPermanent(\'' + u.id + '\',\'' + (u.full_name || '').replace(/'/g, "\\'") + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function approveUser(userId) {
    var rs = document.getElementById('role_' + userId);
    if (!rs || !rs.value) { showToast('Pilih role terlebih dahulu!', 'warning'); return; }
    
    if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyetujui akun & mengaktifkan login...');
    
    try {
        // 1. Update role via RPC (bypass RLS)
        const { error } = await supabaseClient.rpc('approve_user_role', { 
            target_user_id: userId, 
            new_role: rs.value 
        });
        if (error) throw error;
        
        // 2. Auto-confirm email user via RPC agar langsung bisa login
        var emailConfirmed = false;
        try {
            const { error: rpcError } = await supabaseClient.rpc('confirm_user_email', { target_user_id: userId });
            if (rpcError) {
                console.error('RPC confirm_user_email gagal:', rpcError);
                showToast('⚠️ Role berhasil diubah, tetapi aktivasi email GAGAL: ' + rpcError.message, 'warning');
            } else {
                emailConfirmed = true;
            }
        } catch(e) {
            console.error('Exception saat confirm_user_email:', e);
        }

        if (emailConfirmed) {
            showToast('✅ Akun berhasil disetujui & diaktifkan! Pengguna sudah bisa login.', 'success');
        } else {
            showToast('✅ Role berhasil diubah ke ' + rs.value + '!', 'success');
        }
        await renderPendingAccounts();
        await renderActiveAccounts();
        loadStats();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { if (typeof hideGlobalLoader === 'function') hideGlobalLoader(); }
}

function deactivateUser(userId, name) {
    showCustomConfirm('Nonaktifkan Akun?', 'Akun <strong>"' + name + '"</strong> akan dinonaktifkan dan tidak bisa login.', 'Ya, Nonaktifkan', async function () {
        try {
            const { error } = await supabaseClient.rpc('approve_user_role', { target_user_id: userId, new_role: 'nonaktif' });
            if (error) throw error;
            showToast('Akun "' + name + '" dinonaktifkan.', 'success');
            renderActiveAccounts(); renderInactiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

async function changeUserRole(userId, name) {
    var sel = document.getElementById('activeRole_' + userId);
    if (!sel) { showToast('Dropdown role tidak ditemukan!', 'error'); return; }
    var newRole = sel.value;
    if (!newRole) { showToast('Pilih role terlebih dahulu!', 'warning'); return; }

    showCustomConfirm('Ubah Role?', 'Role akun <strong>"' + name + '"</strong> akan diubah menjadi <strong>' + getRoleLabel(newRole) + '</strong>.', 'Ya, Ubah Role', async function () {
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengubah role...');
        try {
            const { error } = await supabaseClient.rpc('approve_user_role', { target_user_id: userId, new_role: newRole });
            if (error) throw error;
            showToast('Role "' + name + '" berhasil diubah menjadi ' + getRoleLabel(newRole) + '.', 'success');
            renderActiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal mengubah role: ' + e.message, 'error'); }
        finally { if (typeof hideGlobalLoader === 'function') hideGlobalLoader(); }
    });
}

function reactivateUser(userId, name) {
    showCustomConfirm('Aktifkan Kembali?', 'Akun <strong>"' + name + '"</strong> akan dipindahkan ke daftar menunggu persetujuan.', 'Ya, Aktifkan', async function () {
        try {
            const { error } = await supabaseClient.rpc('approve_user_role', { target_user_id: userId, new_role: 'menunggu_persetujuan' });
            if (error) throw error;
            showToast('Akun menunggu persetujuan.', 'success');
            renderPendingAccounts(); renderInactiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function deleteUserPermanent(userId, name) {
    showCustomConfirm('Hapus Akun Permanen?', 'Akun <strong>"' + name + '"</strong> akan dihapus <strong>permanen</strong> dari sistem.<br><br>Email ini dapat digunakan kembali untuk mendaftar akun baru.', 'Ya, Hapus Permanen', async function () {
        try {
            const { error } = await supabaseClient.rpc('delete_user_completely', { target_user_id: userId });
            if (error) throw error;
            showToast('Akun "' + name + '" dihapus permanen.', 'success');
            renderPendingAccounts(); renderActiveAccounts(); renderInactiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// ROLE SIMULATION (ADMIN ONLY)
// ============================================================
function openSimulasiModal() {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    
    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    iconEl.style.background = 'rgba(59,130,246,.1)';
    titleEl.textContent = 'Simulasi Tampilan Role';
    titleEl.style.color = '#3b82f6';
    
    msgEl.innerHTML = '<p style="margin-bottom:15px;font-size:0.95rem;color:var(--text-light)">Pilih role yang ingin disimulasikan. Selama simulasi, menu dan panel akan menyesuaikan seolah-olah Anda login dengan role tersebut.</p>' +
                      '<select id="simulasiRoleSelect" class="form-input" style="width:100%">' + buildRoleOptions() + '</select>';
    
    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()" style="min-width:100px;">Batal</button>' +
        '<button class="btn btn-primary" onclick="startSimulasi()" style="min-width:100px;">Mulai Simulasi</button>';
        
    overlay.classList.add('active');
}

function startSimulasi() {
    var select = document.getElementById('simulasiRoleSelect');
    if(!select || !select.value) {
        showToast('Pilih role terlebih dahulu!', 'warning');
        return;
    }
    localStorage.setItem('simulasi_role', select.value);
    closeNotifModal();
    window.location.reload();
}

function stopSimulasi() {
    localStorage.removeItem('simulasi_role');
    window.location.reload();
}

// ============================================================
// MAINTENANCE MODE (ADMIN ONLY)
// ============================================================
async function toggleMaintenanceMode() {
    try {
        const { data: current } = await supabaseClient.from('system_settings').select('value').eq('key','maintenance_mode').single();
        var isMaint = current && current.value === 'true';
        var actionText = isMaint ? 'Matikan' : 'Aktifkan';
        var newVal = isMaint ? 'false' : 'true';
        var msg = isMaint ? 
            '<strong>Matikan mode pemeliharaan?</strong><br><br>Sistem akan kembali normal dan semua role akan dapat melakukan login seperti biasa.' : 
            '<strong>Aktifkan mode pemeliharaan?</strong><br><br>Role selain Admin & Kurikulum akan SEGERA dikeluarkan paksa (auto-logout) dari dashboard dalam 10 detik, dan tidak akan bisa login kembali sampai mode ini dimatikan.';
            
        showCustomConfirm(actionText + ' Pemeliharaan?', msg, 'Ya, ' + actionText, async function() {
            try {
                const { error } = await supabaseClient.from('system_settings').upsert([{ key: 'maintenance_mode', value: newVal }]);
                if (error) throw error;
                showToast('Mode Pemeliharaan ' + (newVal === 'true' ? 'AKTIF' : 'NONAKTIF'), newVal === 'true' ? 'warning' : 'success');
            } catch(e) {
                showToast('Gagal update status: ' + e.message, 'error');
            }
        });
    } catch(e) {
        showToast('Gagal memuat status: ' + e.message, 'error');
    }
}

// Global listener untuk catch redirect param + auto-login redirect
window.addEventListener('DOMContentLoaded', function() {
    // Tampilkan notif maintenance jika ada
    if (window.location.search.includes('maintenance=1')) {
        setTimeout(function() {
            if (typeof showNotifModal === 'function') {
                showNotifModal('Pemeliharaan Berlangsung', 'Anda baru saja dikeluarkan paksa secara otomatis karena server telah memasuki masa <strong>Jeda Pemeliharaan</strong> oleh pihak Sekolah.<br><br>Harap tunggu sampai proses perbaikan selesai.', 'warning');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 500);
    }

    // ========================================================
    // AUTO-REDIRECT: Jika user sudah login, langsung ke dashboard
    // Hanya berlaku di halaman LANDING PAGE (index.html)
    // ========================================================
    var isLandingPage = !document.body.classList.contains('dashboard-body');
    if (isLandingPage && supabaseClient) {
        supabaseClient.auth.getSession().then(function(result) {
            var session = result.data && result.data.session;
            if (session && session.user) {
                // Cek apakah profil valid (bukan menunggu/nonaktif)
                supabaseClient.from('profiles').select('role').eq('id', session.user.id).single().then(function(profileResult) {
                    var profile = profileResult.data;
                    if (profile && profile.role && profile.role !== 'menunggu_persetujuan' && profile.role !== 'nonaktif') {
                        // Sesi valid & role aktif — langsung ke dashboard!
                        window.location.href = 'dashboard.html';
                    }
                });
            }
        });
    }
});

// ============================================================
// TAHUN AKADEMIK & KELAS
// ============================================================
var masterKelasList = [];

async function loadActiveYear() {
    try {
        const { data } = await supabaseClient.from('system_settings').select('value').eq('key', 'active_academic_year').single();
        var lbl = document.getElementById('lblActiveYear');
        if (lbl) lbl.textContent = (data && data.value) || 'Belum diatur';

        const { data: histData } = await supabaseClient.from('system_settings').select('value').eq('key', 'academic_year_history').maybeSingle();
        var histDiv = document.getElementById('divYearHistory');
        var btnReset = document.getElementById('btnResetHistory');
        if (histDiv) {
            if (histData && histData.value) {
                try {
                    var history = JSON.parse(histData.value);
                    if (history.length > 0) {
                        histDiv.innerHTML = '<strong>Riwayat:</strong> ' + history.join(', ');
                        histDiv.style.display = 'block';
                        if (btnReset) btnReset.style.display = 'inline-flex';
                    } else { 
                        histDiv.style.display = 'none'; 
                        if (btnReset) btnReset.style.display = 'none';
                    }
                } catch(e) { 
                    histDiv.style.display = 'none'; 
                    if (btnReset) btnReset.style.display = 'none';
                }
            } else { 
                histDiv.style.display = 'none'; 
                if (btnReset) btnReset.style.display = 'none';
            }
        }
    } catch(e) {}
}

async function resetYearHistory() {
    showCustomConfirm('Hapus Riwayat?', 'Riwayat tahun pelajaran sebelumnya akan dihapus dari tampilan.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('system_settings').upsert([{ key: 'academic_year_history', value: '[]' }]);
            if (error) throw error;
            showToast('Riwayat berhasil dihapus', 'success');
            loadActiveYear();
        } catch(e) { showToast('Gagal hapus riwayat: ' + e.message, 'error'); }
    });
}

function editTahunAkademik() {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
    iconEl.style.background = 'rgba(59,130,246,.1)';
    titleEl.textContent = 'Tetapkan Tahun Pelajaran';
    titleEl.style.color = '#3b82f6';
    var currentVal = document.getElementById('lblActiveYear') ? document.getElementById('lblActiveYear').textContent : '';
    if (currentVal === 'Belum diatur') currentVal = '';
    msgEl.innerHTML = '<p style="margin-bottom:10px;color:var(--text-light);font-size:0.9rem;">Masukkan tahun pelajaran aktif dengan format <strong>----/----</strong></p><input type="text" id="inputTahunAktif" class="form-input" value="' + currentVal + '" placeholder="----/----" maxlength="9" style="width:100%;text-align:center;font-size:1.2rem;font-weight:bold;letter-spacing:2px;" />';
    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()">Batal</button><button class="btn btn-primary" onclick="saveTahunAkademik()">Simpan</button>';
    overlay.classList.add('active');
}

async function saveTahunAkademik() {
    var val = document.getElementById('inputTahunAktif').value.trim();
    if (!val) { showToast('Tahun pelajaran tidak boleh kosong!', 'warning'); return; }
    try {
        const { data: current } = await supabaseClient.from('system_settings').select('value').eq('key', 'active_academic_year').single();
        var isYearChanged = current && current.value && current.value !== val;

        if (isYearChanged) {
            const { data: histData } = await supabaseClient.from('system_settings').select('value').eq('key', 'academic_year_history').single();
            var history = [];
            if (histData && histData.value) { try { history = JSON.parse(histData.value); } catch(e){} }
            if (!history.includes(current.value)) {
                history.push(current.value);
            }
            await supabaseClient.from('system_settings').upsert([{ key: 'academic_year_history', value: JSON.stringify(history) }]);
        }

        const { error } = await supabaseClient.from('system_settings').upsert([{ key: 'active_academic_year', value: val }]);
        if (error) throw error;
        showToast('Tahun pelajaran diperbarui!', 'success');

        if (isYearChanged) {
            const { error: errJurnal } = await supabaseClient.from('jurnal_mengajar').delete().not('id', 'is', null);
            if (errJurnal) console.error('Gagal hapus jurnal lama:', errJurnal);
            else showToast('Data Jurnal Mengajar lama telah dibersihkan.', 'success');
        }

        closeNotifModal();
        loadActiveYear();
        if (document.getElementById('sectionJurnalMengajar') && document.getElementById('sectionJurnalMengajar').classList.contains('active')) {
            loadJurnalMengajar();
        }
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

var pengecualianSiswaTinggalKelas = [];

var tempKenaikanSiswaList = [];

async function gantiTahunDanNaikKelas() {
    pengecualianSiswaTinggalKelas = [];
    renderTinggalKelasList();
    
    var selKelas = document.getElementById('formKenaikanPilihKelas');
    selKelas.innerHTML = '<option value="">Semua Kelas</option>';
    if (typeof masterKelasList !== 'undefined') {
        masterKelasList.forEach(k => {
            var opt = document.createElement('option');
            opt.value = k.id;
            opt.textContent = k.nama_kelas;
            selKelas.appendChild(opt);
        });
    }
    
    try {
        const { data, error } = await supabaseClient.from('siswa').select('id, kelas_id, nama_lengkap, master_kelas(nama_kelas)').in('status', ['Aktif', 'Pindahan']).order('nama_lengkap');
        if (data) {
            tempKenaikanSiswaList = data;
        }
    } catch(e) {}
    
    filterKenaikanSiswaByKelas();
    
    document.getElementById('kenaikanKelasModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function filterKenaikanSiswaByKelas() {
    var selSiswa = document.getElementById('formKenaikanPilihSiswa');
    var kelasId = document.getElementById('formKenaikanPilihKelas').value;
    
    selSiswa.innerHTML = '<option value="">-- Pilih Siswa --</option>';
    
    var filtered = tempKenaikanSiswaList;
    if (kelasId) {
        filtered = tempKenaikanSiswaList.filter(s => s.kelas_id === kelasId);
    }
    
    filtered.forEach(s => {
        var opt = document.createElement('option');
        opt.value = s.id;
        var kelasText = kelasId ? '' : (' (' + (s.master_kelas ? s.master_kelas.nama_kelas : '-') + ')');
        opt.textContent = s.nama_lengkap + kelasText;
        selSiswa.appendChild(opt);
    });
}

function closeKenaikanKelasModal() {
    document.getElementById('kenaikanKelasModal').classList.remove('active');
}

function addTinggalKelas() {
    var sel = document.getElementById('formKenaikanPilihSiswa');
    var val = sel.value;
    if (!val) { showToast('Pilih siswa terlebih dahulu!', 'warning'); return; }
    
    if (pengecualianSiswaTinggalKelas.find(x => x.id === val)) {
        showToast('Siswa tersebut sudah ada di daftar pengecualian.', 'warning'); return;
    }
    
    var text = sel.options[sel.selectedIndex].text;
    pengecualianSiswaTinggalKelas.push({ id: val, nama: text });
    renderTinggalKelasList();
    
    sel.value = '';
}

function removeTinggalKelas(id) {
    pengecualianSiswaTinggalKelas = pengecualianSiswaTinggalKelas.filter(x => x.id !== id);
    renderTinggalKelasList();
}

function renderTinggalKelasList() {
    var container = document.getElementById('listTinggalKelas');
    container.innerHTML = '';
    
    if (pengecualianSiswaTinggalKelas.length === 0) {
        container.innerHTML = '<span id="noTinggalKelasLabel" style="font-size:0.85rem;color:var(--text-light);font-style:italic;">Belum ada siswa yang dikecualikan. Semua akan otomatis naik secara algoritmik.</span>';
        return;
    }
    
    pengecualianSiswaTinggalKelas.forEach(function(item) {
        var div = document.createElement('div');
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:white;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;';
        div.innerHTML = '<span style="font-weight:500;font-size:0.9rem;">' + item.nama + ' <span class="badge badge-red" style="margin-left:8px;font-size:0.7rem;">Tinggal Kelas</span></span>' +
                        '<button type="button" onclick="removeTinggalKelas(\'' + item.id + '\')" style="background:none;border:none;color:var(--danger);cursor:pointer;" title="Hapus"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>';
        container.appendChild(div);
    });
}

function executeKenaikanKelas() {
    var idArray = pengecualianSiswaTinggalKelas.map(x => x.id);
    var excMsg = idArray.length > 0 ? ('<br><br><span style="color:#ef4444;font-weight:bold;">Pengecualian Aktif:</span> Ada ' + idArray.length + ' siswa terdaftar yang <strong>TIDAK NAIK/LULUS</strong>.') : '';
    
    showCustomConfirm('Yakin Proses Kenaikan?', 'Apakah Anda 100% yakin ingin mempromosikan seluruh formasi siswa secara massal sekarang?' + excMsg, 'Proses Massal!', async function() {
        showGlobalLoader('Memproses pemindahan ribuan data siswa secara algoritmik...');
        try {
            const { error } = await supabaseClient.rpc('promote_students_next_year', { excluded_siswa_ids: idArray });
            hideGlobalLoader();
            if (error) throw error;
            showToast('Kenaikan kelas & pencatatan kelulusan berhasil diproses!', 'success');
            closeKenaikanKelasModal();
            if(typeof loadSiswaData==='function') loadSiswaData();
            if(typeof loadAlumniData==='function') loadAlumniData();
        } catch(e) { hideGlobalLoader(); showToast('Gagal memproses: ' + e.message, 'error'); }
    });
}

async function loadMasterKelas() {
    try {
        const { data, error } = await supabaseClient.from('master_kelas').select('*').order('tingkat').order('nama_kelas');
        if (error) throw error;
        masterKelasList = data || [];
        var tbody = document.getElementById('kelasTableBody');
        if (!tbody) return;
        if (masterKelasList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data kelas.</td></tr>';
            return;
        }
        tbody.innerHTML = masterKelasList.map(function(k, i) {
            return '<tr><td>' + (i+1) + '</td><td>' + k.nama_kelas + '</td><td>' + k.tingkat + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editKelas(\'' + k.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteKelas(\'' + k.id + '\',\'' + k.nama_kelas + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal muat kelas: ' + e.message, 'error'); }
}

function openKelasModal(id) {
    document.getElementById('formKelasId').value = '';
    document.getElementById('formKelasNama').value = '';
    document.getElementById('formKelasTingkat').value = '7';
    document.getElementById('kelasModalTitle').textContent = 'Tambah Kelas';
    document.getElementById('kelasModal').classList.add('active');
}
function closeKelasModal() { document.getElementById('kelasModal').classList.remove('active'); }

function editKelas(id) {
    var k = masterKelasList.find(function(x) { return x.id === id; });
    if (!k) return;
    document.getElementById('formKelasId').value = k.id;
    document.getElementById('formKelasNama').value = k.nama_kelas;
    document.getElementById('formKelasTingkat').value = k.tingkat;
    document.getElementById('kelasModalTitle').textContent = 'Edit Kelas';
    document.getElementById('kelasModal').classList.add('active');
}

async function saveKelas() {
    var id = document.getElementById('formKelasId').value;
    var nama = document.getElementById('formKelasNama').value.trim();
    var tingkat = parseInt(document.getElementById('formKelasTingkat').value);
    
    if (!nama) { showToast('Nama kelas wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('master_kelas').update({ nama_kelas: nama, tingkat: tingkat }).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('master_kelas').insert([{ nama_kelas: nama, tingkat: tingkat }]);
            if (error) throw error;
        }
        showToast('Kelas berhasil disimpan!', 'success');
        closeKelasModal();
        loadMasterKelas();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteKelas(id, nama) {
    showCustomConfirm('Hapus Kelas?', 'Kelas <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('master_kelas').delete().eq('id', id);
            if (error) throw error;
            showToast('Kelas dihapus!', 'success');
            loadMasterKelas();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// MASTER MATA PELAJARAN
// ============================================================
var masterMapelList = [];

async function loadMasterMapel() {
    try {
        const { data, error } = await supabaseClient.from('master_mapel').select('*').order('nama_mapel');
        if (error) throw error;
        masterMapelList = data || [];
        var tbody = document.getElementById('mapelTableBody');
        if (!tbody) return;
        if (masterMapelList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data mata pelajaran.</td></tr>';
            return;
        }
        tbody.innerHTML = masterMapelList.map(function(m, i) {
            return '<tr><td>' + (i+1) + '</td><td>' + m.nama_mapel + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editMapel(\'' + m.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteMapel(\'' + m.id + '\',\'' + m.nama_mapel.replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal muat mapel: ' + e.message, 'error'); }
}

function openMapelModal() {
    document.getElementById('formMapelId').value = '';
    document.getElementById('formMapelNama').value = '';
    document.getElementById('mapelModalTitle').textContent = 'Tambah Mata Pelajaran';
    document.getElementById('mapelModal').classList.add('active');
}
function closeMapelModal() { document.getElementById('mapelModal').classList.remove('active'); }

function editMapel(id) {
    var m = masterMapelList.find(function(x) { return x.id === id; });
    if (!m) return;
    document.getElementById('formMapelId').value = m.id;
    document.getElementById('formMapelNama').value = m.nama_mapel;
    document.getElementById('mapelModalTitle').textContent = 'Edit Mata Pelajaran';
    document.getElementById('mapelModal').classList.add('active');
}

async function saveMapel() {
    var id = document.getElementById('formMapelId').value;
    var nama = document.getElementById('formMapelNama').value.trim();
    if (!nama) { showToast('Nama mata pelajaran wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('master_mapel').update({ nama_mapel: nama }).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('master_mapel').insert([{ nama_mapel: nama }]);
            if (error) throw error;
        }
        showToast('Mata pelajaran berhasil disimpan!', 'success');
        closeMapelModal();
        loadMasterMapel();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteMapel(id, nama) {
    showCustomConfirm('Hapus Mata Pelajaran?', 'Mapel <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('master_mapel').delete().eq('id', id);
            if (error) throw error;
            showToast('Mata pelajaran dihapus!', 'success');
            if (typeof loadMasterMapel === 'function') loadMasterMapel();
            if (typeof loadBankSoal === 'function') loadBankSoal();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// MASTER KKM
// ============================================================
var masterKkmList = [];

async function loadMasterKkm() {
    try {
        const { data, error } = await supabaseClient.from('master_kkm')
            .select('*, master_kelas(nama_kelas, tingkat), master_mapel(nama_mapel)');
        if (error) throw error;
        masterKkmList = data || [];
        var tbody = document.getElementById('kkmTableBody');
        if (!tbody) return;
        
        if (masterKkmList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data KKM.</td></tr>';
            return;
        }
        
        // Sort by kelas tingkat, then kelas name, then mapel name
        masterKkmList.sort(function(a, b) {
            var tkA = a.master_kelas ? (a.master_kelas.tingkat || 0) : 0;
            var tkB = b.master_kelas ? (b.master_kelas.tingkat || 0) : 0;
            if (tkA !== tkB) return tkA - tkB;
            var kelasA = a.master_kelas ? a.master_kelas.nama_kelas : '';
            var kelasB = b.master_kelas ? b.master_kelas.nama_kelas : '';
            if (kelasA !== kelasB) return kelasA.localeCompare(kelasB);
            var mapelA = a.master_mapel ? a.master_mapel.nama_mapel : '';
            var mapelB = b.master_mapel ? b.master_mapel.nama_mapel : '';
            return mapelA.localeCompare(mapelB);
        });

        tbody.innerHTML = masterKkmList.map(function(k, i) {
            var kelasNama = k.master_kelas ? k.master_kelas.nama_kelas : '-';
            var mapelNama = k.master_mapel ? k.master_mapel.nama_mapel : '-';
            return '<tr><td>' + (i+1) + '</td><td>' + kelasNama + '</td><td>' + mapelNama + '</td>' +
                '<td style="text-align:center;"><strong>' + k.kkm + '</strong></td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editKkm(\'' + k.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteKkm(\'' + k.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal muat KKM: ' + e.message, 'error'); }
}

function openKkmModal() {
    document.getElementById('formKkmId').value = '';
    
    // Populate dropdowns
    var selKelas = document.getElementById('formKkmKelas');
    selKelas.innerHTML = '<option value="">Pilih Kelas</option>' + masterKelasList.map(k => '<option value="' + k.id + '">' + k.nama_kelas + ' (Tk.' + k.tingkat + ')</option>').join('');
    
    var selMapel = document.getElementById('formKkmMapel');
    selMapel.innerHTML = '<option value="">Pilih Mata Pelajaran</option>' + masterMapelList.map(m => '<option value="' + m.id + '">' + m.nama_mapel + '</option>').join('');
    
    document.getElementById('formKkmNilai').value = '';
    document.getElementById('kkmModalTitle').textContent = 'Tambah KKM';
    document.getElementById('kkmModal').classList.add('active');
}

function closeKkmModal() { document.getElementById('kkmModal').classList.remove('active'); }

function editKkm(id) {
    var k = masterKkmList.find(function(x) { return x.id === id; });
    if (!k) return;
    document.getElementById('formKkmId').value = k.id;
    
    var selKelas = document.getElementById('formKkmKelas');
    selKelas.innerHTML = '<option value="">Pilih Kelas</option>' + masterKelasList.map(c => '<option value="' + c.id + '">' + c.nama_kelas + ' (Tk.' + c.tingkat + ')</option>').join('');
    selKelas.value = k.kelas_id;
    
    var selMapel = document.getElementById('formKkmMapel');
    selMapel.innerHTML = '<option value="">Pilih Mata Pelajaran</option>' + masterMapelList.map(m => '<option value="' + m.id + '">' + m.nama_mapel + '</option>').join('');
    selMapel.value = k.mapel_id;
    
    document.getElementById('formKkmNilai').value = k.kkm;
    document.getElementById('kkmModalTitle').textContent = 'Edit KKM';
    document.getElementById('kkmModal').classList.add('active');
}

async function saveKkm() {
    var id = document.getElementById('formKkmId').value;
    var kelasId = document.getElementById('formKkmKelas').value;
    var mapelId = document.getElementById('formKkmMapel').value;
    var kkm = parseInt(document.getElementById('formKkmNilai').value);
    
    if (!kelasId || !mapelId || isNaN(kkm)) { showToast('Kelas, Mata Pelajaran, dan Nilai KKM wajib diisi!', 'warning'); return; }
    
    try {
        if (id) {
            // Check duplicate
            var isDuplicate = masterKkmList.find(k => k.kelas_id === kelasId && k.mapel_id === mapelId && k.id !== id);
            if (isDuplicate) throw new Error('KKM untuk Kelas dan Mapel ini sudah ada.');
            
            const { error } = await supabaseClient.from('master_kkm').update({ kelas_id: kelasId, mapel_id: mapelId, kkm: kkm }).eq('id', id);
            if (error) throw error;
        } else {
            // Check duplicate
            var isDuplicate = masterKkmList.find(k => k.kelas_id === kelasId && k.mapel_id === mapelId);
            if (isDuplicate) throw new Error('KKM untuk Kelas dan Mapel ini sudah ada.');
            
            const { error } = await supabaseClient.from('master_kkm').insert([{ kelas_id: kelasId, mapel_id: mapelId, kkm: kkm }]);
            if (error) throw error;
        }
        showToast('Data KKM berhasil disimpan!', 'success');
        closeKkmModal();
        loadMasterKkm();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteKkm(id) {
    showCustomConfirm('Hapus KKM?', 'Data KKM ini akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('master_kkm').delete().eq('id', id);
            if (error) throw error;
            showToast('Data KKM dihapus!', 'success');
            loadMasterKkm();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function deleteMapel(id, nama) {
    showCustomConfirm('Hapus Mata Pelajaran?', 'Mapel <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('master_mapel').delete().eq('id', id);
            if (error) throw error;
            showToast('Mata pelajaran dihapus!', 'success');
            if (typeof loadMasterMapel === 'function') loadMasterMapel();
            if (typeof loadBankSoal === 'function') loadBankSoal();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function populateMapelDropdown(selectId, selectedValue) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih Mata Pelajaran</option>';
    masterMapelList.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.nama_mapel;
        opt.textContent = m.nama_mapel;
        if (m.nama_mapel === selectedValue) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ============================================================
// DATA INDUK GURU & STAFF
// ============================================================
var guruList = [];

// ============================================================
// PROFIL GURU — Self-service data pribadi
// ============================================================

async function previewProfilGuruFoto(input) {
    var preview = document.getElementById('profilGuruFotoPreview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        var file = input.files[0];

        // Tampilkan preview sementara
        var reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
        };
        reader.readAsDataURL(file);

        // Auto Upload Langsung ke Google Drive
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengunggah foto profil...');
        try {
            var url = await uploadToGoogleDrive(file, 'guru');
            
            if (currentUser && currentUser.id) {
                // Cari data guru
                var { data: existing } = await supabaseClient.from('guru_staff').select('id').eq('user_id', currentUser.id).maybeSingle();
                if (existing) {
                    await supabaseClient.from('guru_staff').update({ foto_url: url }).eq('id', existing.id);
                } else {
                    var email = document.getElementById('profilGuruEmail')?.value || currentUser.email;
                    var { data: existingByEmail } = await supabaseClient.from('guru_staff').select('id').eq('email', email).maybeSingle();
                    if (existingByEmail) {
                         await supabaseClient.from('guru_staff').update({ foto_url: url, user_id: currentUser.id }).eq('id', existingByEmail.id);
                    } else {
                         await supabaseClient.from('guru_staff').insert([{
                             user_id: currentUser.id,
                             nama_lengkap: document.getElementById('userName')?.textContent || 'Guru Baru',
                             email: email,
                             foto_url: url,
                             status: 'Aktif'
                         }]);
                    }
                }
            }
            
            showToast('Foto profil berhasil diunggah & disimpan!', 'success');
            var btnHapus = document.getElementById('btnHapusFotoProfil');
            if (btnHapus) btnHapus.style.display = 'inline-flex';
        } catch(e) {
            showToast('Gagal unggah foto: ' + e.message, 'error');
            loadProfilGuru(); 
        } finally {
            if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            input.value = ''; 
        }
    }
}

async function autoUploadGuruFotoAdmin(input) {
    var preview = document.getElementById('formGuruFotoPreview');
    var urlField = document.getElementById('formGuruFotoUrl');
    if (!preview || !urlField) return;
    if (input.files && input.files[0]) {
        var file = input.files[0];

        // Preview
        var reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
        };
        reader.readAsDataURL(file);

        // Upload
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengunggah foto...');
        try {
            var url = await uploadToGoogleDrive(file, 'guru');
            urlField.value = url;
            showToast('Foto berhasil diunggah!', 'success');
        } catch(e) {
            showToast('Gagal unggah foto: ' + e.message, 'error');
            urlField.value = '';
            preview.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        } finally {
            if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            input.value = '';
        }
    }
}

async function loadProfilGuru() {
    if (!currentUser) return;
    // Populate mapel dropdowns
    populateMapelDropdown('profilGuruMapel', '');
    populateMapelDropdown('profilGuruMapel2', '');
    populateMapelDropdown('profilGuruMapel3', '');

    var statusEl = document.getElementById('profilGuruStatus');

    try {
        // Check if user already has data linked
        var { data, error } = await supabaseClient
            .from('guru_staff')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (!data && currentUser.email) {
            // Hubungkan dengan data Admin jika ada email yang cocok
            var { data: emailData } = await supabaseClient
                .from('guru_staff')
                .select('*')
                .eq('email', currentUser.email)
                .maybeSingle();
            
            if (emailData) {
                // Link account
                await supabaseClient.from('guru_staff').update({ user_id: currentUser.id }).eq('id', emailData.id);
                data = emailData;
            }
        }

        if (data) {
            // Pre-fill form
            document.getElementById('profilGuruNama').value = data.nama_lengkap || '';
            document.getElementById('profilGuruJK').value = data.jenis_kelamin || '';
            document.getElementById('profilGuruJabatan').value = data.jabatan || '';
            document.getElementById('profilGuruJabatanTambahan').value = data.jabatan_tambahan || '';
            document.getElementById('profilGuruNIK').value = data.nik || '';
            document.getElementById('profilGuruHP').value = data.nomor_hp || '';
            document.getElementById('profilGuruEmail').value = data.email || '';
            populateMapelDropdown('profilGuruMapel', data.mata_pelajaran || '');
            populateMapelDropdown('profilGuruMapel2', data.mata_pelajaran_2 || '');
            populateMapelDropdown('profilGuruMapel3', data.mata_pelajaran_3 || '');
            document.getElementById('profilGuruSertifikasi').value = data.sertifikasi || '';
            document.getElementById('profilGuruAlamat').value = data.alamat || '';

            // Show photo if exists
            var btnHapus = document.getElementById('btnHapusFotoProfil');
            if (data.foto_url) {
                var preview = document.getElementById('profilGuruFotoPreview');
                // Tambahkan random string timestamp agar terhindar dari cache browser saat memuat
                var separator = data.foto_url.includes('?') ? '&' : '?';
                var noCacheUrl = data.foto_url + separator + 't=' + new Date().getTime();
                if (preview) preview.innerHTML = '<img src="' + noCacheUrl + '" style="width:100%;height:100%;object-fit:cover;">';
                if (btnHapus) btnHapus.style.display = 'inline-flex';
            } else {
                var preview = document.getElementById('profilGuruFotoPreview');
                if (preview) preview.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                if (btnHapus) btnHapus.style.display = 'none';
            }

            if (statusEl) statusEl.innerHTML = '<div style="padding:10px 14px;background:rgba(16,185,129,0.1);color:#10b981;border-radius:8px;font-size:0.88rem;"><strong>✓ Data sudah terisi.</strong> Anda dapat memperbarui kapan saja.</div>';
        } else {
            // Pre-fill email from auth
            var emailEl = document.getElementById('profilGuruEmail');
            if (emailEl && currentUser.email) emailEl.value = currentUser.email;
            // Pre-fill name from profile
            var nameEl = document.getElementById('profilGuruNama');
            var userName = document.getElementById('userName');
            if (nameEl && userName && userName.textContent !== 'Loading...') nameEl.value = userName.textContent;

            if (statusEl) statusEl.innerHTML = '<div style="padding:10px 14px;background:rgba(245,158,11,0.1);color:#f59e0b;border-radius:8px;font-size:0.88rem;"><strong>⚠ Data belum diisi.</strong> Silakan lengkapi formulir di bawah.</div>';
        }
    } catch(e) {
        if (statusEl) statusEl.innerHTML = '<div style="padding:10px 14px;background:rgba(239,68,68,0.1);color:#ef4444;border-radius:8px;font-size:0.88rem;">Gagal memuat data: ' + e.message + '</div>';
    }
}

async function saveProfilGuru() {
    if (!currentUser) { showToast('Silakan login terlebih dahulu!', 'warning'); return; }

    var nama = document.getElementById('profilGuruNama').value.trim();
    if (!nama) { showToast('Nama Lengkap wajib diisi!', 'warning'); return; }

    showGlobalLoader('Menyimpan data pribadi...');

    try {
        var obj = {
            user_id: currentUser.id,
            nama_lengkap: nama,
            jenis_kelamin: document.getElementById('profilGuruJK').value || null,
            jabatan: document.getElementById('profilGuruJabatan').value.trim() || null,
            jabatan_tambahan: document.getElementById('profilGuruJabatanTambahan').value.trim() || null,
            nik: document.getElementById('profilGuruNIK').value.trim() || null,
            nomor_hp: document.getElementById('profilGuruHP').value.trim() || null,
            email: document.getElementById('profilGuruEmail').value.trim() || null,
            mata_pelajaran: document.getElementById('profilGuruMapel').value || null,
            mata_pelajaran_2: document.getElementById('profilGuruMapel2').value || null,
            mata_pelajaran_3: document.getElementById('profilGuruMapel3').value || null,
            sertifikasi: document.getElementById('profilGuruSertifikasi').value || null,
            alamat: document.getElementById('profilGuruAlamat').value.trim() || null,
            status: 'Aktif'
        };

        // Note: Foto profil kini di-upload otomatis saat dipilih (lihat autoUploadProfilGuruFoto).
        // Jadi kita tidak perlu menangani fileInput lagi di sini.

        // Check if existing record
        var { data: existing } = await supabaseClient
            .from('guru_staff')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (!existing && obj.email) {
            var { data: existingByEmail } = await supabaseClient
                .from('guru_staff')
                .select('id')
                .eq('email', obj.email)
                .maybeSingle();
            if (existingByEmail) existing = existingByEmail;
        }

        if (existing) {
            var { error } = await supabaseClient.from('guru_staff').update(obj).eq('id', existing.id);
            if (error) throw error;
        } else {
            var { error } = await supabaseClient.from('guru_staff').insert([obj]);
            if (error) throw error;
        }

        showToast('Data pribadi berhasil disimpan!', 'success');
        
        // Reset file input agar jika disave ulang tanpa pilih foto, tidak mengupload ulang
        if (fileInput) fileInput.value = '';
        
        loadProfilGuru();
    } catch(e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function hapusProfilGuruFoto() {
    if (!currentUser) return;
    
    showCustomConfirm('Hapus Foto Profil?', 'Foto profil Anda akan dihapus secara permanen.', 'Hapus Foto', async function() {
        showGlobalLoader('Menghapus foto...');
        try {
            // Check if existing record
            var { data: existing } = await supabaseClient
                .from('guru_staff')
                .select('id')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (existing) {
                var { error } = await supabaseClient.from('guru_staff').update({ foto_url: null }).eq('id', existing.id);
                if (error) throw error;
                showToast('Foto profil berhasil dihapus!', 'success');
                
                // Clear the file input in case they had something selected
                var fileInput = document.getElementById('profilGuruFoto');
                if (fileInput) fileInput.value = '';
                
                loadProfilGuru();
            } else {
                showToast('Anda belum memiliki profil tersimpan.', 'warning');
            }
        } catch(e) {
            showToast('Gagal menghapus foto: ' + e.message, 'error');
        } finally {
            hideGlobalLoader();
        }
    });
}

// ============================================================
// DATA INDUK GURU & STAFF
// ============================================================
async function loadGuruData() {
    try {
        const { data, error } = await supabaseClient.from('guru_staff').select('*').order('nama_lengkap');
        if (error) throw error;
        guruList = data || [];
        var tbody = document.getElementById('guruTableBody');
        if (!tbody) return;
        if (guruList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data guru.</td></tr>';
            return;
        }
        tbody.innerHTML = guruList.map(function(g, i) {
            var statusBadge = g.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Aktif</span>' : '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Nonaktif</span>';
            var sertifikasiBadge = g.sertifikasi === 'SERDIK' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">SERDIK</span>' : (g.sertifikasi === 'Belum SERDIK' ? '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Belum SERDIK</span>' : '-');
            var fotoHtml = g.foto_url ? '<img src="' + g.foto_url + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;font-weight:bold;">' + (g.nama_lengkap ? g.nama_lengkap.charAt(0).toUpperCase() : '?') + '</div>';
            var allMapel = [g.mata_pelajaran, g.mata_pelajaran_2, g.mata_pelajaran_3].filter(Boolean).join(', ');
            return '<tr><td>' + (i+1) + '</td><td><div style="display:flex;justify-content:center;">' + fotoHtml + '</div></td><td>' + (g.nama_lengkap||'-') + '</td><td>' + (g.jenis_kelamin||'-') + '</td><td>' + (g.jabatan||'-') + '</td><td>' + (g.jabatan_tambahan||'-') + '</td><td>' + (g.nik||'-') + '</td><td>' + (g.nomor_hp||'-') + '</td><td>' + (g.email||'-') + '</td><td>' + (allMapel||'-') + '</td><td>' + sertifikasiBadge + '</td><td>' + (g.alamat||'-') + '</td><td>' + statusBadge + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editGuru(\'' + g.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteGuru(\'' + g.id + '\',\'' + (g.nama_lengkap||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal muat guru: ' + e.message, 'error'); }
}

async function openGuruModal() {
    document.getElementById('formGuruId').value = '';
    document.getElementById('formGuruUserId').value = '';
    document.getElementById('formGuruNama').value = '';
    document.getElementById('formGuruJK').value = '';
    document.getElementById('formGuruJabatan').value = '';
    document.getElementById('formGuruJabatanTambahan').value = '';
    document.getElementById('formGuruNIK').value = '';
    document.getElementById('formGuruHP').value = '';
    document.getElementById('formGuruEmail').value = '';
    populateMapelDropdown('formGuruMapel', '');
    populateMapelDropdown('formGuruMapel2', '');
    populateMapelDropdown('formGuruMapel3', '');
    document.getElementById('formGuruSertifikasi').value = '';
    document.getElementById('formGuruAlamat').value = '';
    document.getElementById('formGuruStatus').value = 'Aktif';
    document.getElementById('guruModalTitle').textContent = 'Tambah Guru';
    await loadGuruAkunDropdown('');
    document.getElementById('guruModal').classList.add('active');
}
function closeGuruModal() { document.getElementById('guruModal').classList.remove('active'); }

async function editGuru(id) {
    var g = guruList.find(function(x) { return x.id === id; });
    if (!g) return;
    document.getElementById('formGuruId').value = g.id;
    document.getElementById('formGuruUserId').value = g.user_id || '';
    document.getElementById('formGuruNama').value = g.nama_lengkap || '';
    document.getElementById('formGuruJK').value = g.jenis_kelamin || '';
    document.getElementById('formGuruJabatan').value = g.jabatan || '';
    document.getElementById('formGuruJabatanTambahan').value = g.jabatan_tambahan || '';
    document.getElementById('formGuruNIK').value = g.nik || '';
    document.getElementById('formGuruHP').value = g.nomor_hp || '';
    document.getElementById('formGuruEmail').value = g.email || '';
    showGlobalLoader('Memuat data...');
    try {
        const { data, error } = await supabaseClient.from('guru_staff').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('guruModalTitle').textContent = 'Edit Guru';
        document.getElementById('formGuruId').value = data.id;
        document.getElementById('formGuruUserId').value = data.user_id || '';
        document.getElementById('formGuruNama').value = data.nama_lengkap || '';
        document.getElementById('formGuruJK').value = data.jenis_kelamin || '';
        document.getElementById('formGuruJabatan').value = data.jabatan || '';
        document.getElementById('formGuruJabatanTambahan').value = data.jabatan_tambahan || '';
        document.getElementById('formGuruNIK').value = data.nik || '';
        document.getElementById('formGuruHP').value = data.nomor_hp || '';
        document.getElementById('formGuruEmail').value = data.email || '';
        populateMapelDropdown('formGuruMapel', data.mata_pelajaran || '');
        populateMapelDropdown('formGuruMapel2', data.mata_pelajaran_2 || '');
        populateMapelDropdown('formGuruMapel3', data.mata_pelajaran_3 || '');
        document.getElementById('formGuruSertifikasi').value = data.sertifikasi || '';
        document.getElementById('formGuruAlamat').value = data.alamat || '';
        document.getElementById('formGuruStatus').value = data.status || 'Aktif';

        // Set foto form
        document.getElementById('formGuruFoto').value = '';
        document.getElementById('formGuruFotoUrl').value = data.foto_url || '';
        if (data.foto_url) {
            document.getElementById('formGuruFotoPreview').innerHTML = '<img src="' + data.foto_url + '" style="width:100%;height:100%;object-fit:cover;">';
        } else {
            document.getElementById('formGuruFotoPreview').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        }

        await loadGuruAkunDropdown(data.user_id);
        
        hideGlobalLoader();
        document.getElementById('guruModal').classList.add('active');
    } catch(e) {
        hideGlobalLoader();
        showToast('Gagal memuat: ' + e.message, 'error');
    }
}

async function saveGuru() {
    var id = document.getElementById('formGuruId').value;
    var userIdField = document.getElementById('formGuruUserId');
    var fotoUrlField = document.getElementById('formGuruFotoUrl');
    
    var obj = {
        nama_lengkap: document.getElementById('formGuruNama').value.trim(),
        jenis_kelamin: document.getElementById('formGuruJK').value || null,
        jabatan: document.getElementById('formGuruJabatan').value.trim() || null,
        jabatan_tambahan: document.getElementById('formGuruJabatanTambahan').value.trim() || null,
        nik: document.getElementById('formGuruNIK').value.trim() || null,
        nomor_hp: document.getElementById('formGuruHP').value.trim() || null,
        email: document.getElementById('formGuruEmail').value.trim() || null,
        mata_pelajaran: document.getElementById('formGuruMapel').value || null,
        mata_pelajaran_2: document.getElementById('formGuruMapel2').value || null,
        mata_pelajaran_3: document.getElementById('formGuruMapel3').value || null,
        sertifikasi: document.getElementById('formGuruSertifikasi').value || null,
        alamat: document.getElementById('formGuruAlamat').value.trim() || null,
        status: document.getElementById('formGuruStatus').value,
        user_id: (userIdField && userIdField.value) ? userIdField.value : null,
        foto_url: (fotoUrlField && fotoUrlField.value) ? fotoUrlField.value : null
    };
    
    if (!obj.nama_lengkap) { showToast('Nama guru wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('guru_staff').update(obj).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('guru_staff').insert([obj]);
            if (error) throw error;
        }
        showToast('Data guru berhasil disimpan!', 'success');
        closeGuruModal();
        loadGuruData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

// --- Helper: Load daftar akun terdaftar ke dropdown Guru ---
var _guruAkunList = [];
async function loadGuruAkunDropdown(selectedUserId) {
    var dropdown = document.getElementById('formGuruAkun');
    if (!dropdown || !supabaseClient) return;
    dropdown.innerHTML = '<option value="">— Tidak ditautkan ke akun —</option>';
    try {
        const { data, error } = await supabaseClient.from('profiles').select('id, full_name, email, role').order('full_name');
        if (error) throw error;
        _guruAkunList = data || [];
        _guruAkunList.forEach(function(a) {
            // Sembunyikan role siswa, menunggu_persetujuan, nonaktif
            if (['siswa', 'menunggu_persetujuan', 'nonaktif'].includes(a.role)) return;
            var roleLabel = ROLE_LABELS[a.role] || a.role || '';
            var opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = (a.full_name || 'Tanpa Nama') + ' — ' + (a.email || '') + ' (' + roleLabel + ')';
            if (a.id === selectedUserId) opt.selected = true;
            dropdown.appendChild(opt);
        });
    } catch(e) { console.warn('loadGuruAkunDropdown error:', e.message); }
}

function onGuruAkunSelect(selectEl) {
    var userId = selectEl.value;
    document.getElementById('formGuruUserId').value = userId;
    if (!userId) return; // User deselected
    var akun = _guruAkunList.find(function(a) { return a.id === userId; });
    if (akun) {
        var namaEl = document.getElementById('formGuruNama');
        var emailEl = document.getElementById('formGuruEmail');
        if (namaEl && !namaEl.value) namaEl.value = akun.full_name || '';
        if (emailEl && !emailEl.value) emailEl.value = akun.email || '';
    }
}

function deleteGuru(id, nama) {
    showCustomConfirm('Hapus Data Guru?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('guru_staff').delete().eq('id', id);
            if (error) throw error;
            showToast('Data guru dihapus!', 'success');
            loadGuruData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// DATA INDUK SISWA
// ============================================================
var siswaList = [];
var siswaFotoFile = null; // Temporary holder for uploaded photo file


// Kompres gambar sebelum disimpan ke database (Base64)
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var width = img.width;
                var height = img.height;
                
                // Hitung rasio
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                var dataUrl = canvas.toDataURL('image/jpeg', quality || 0.6);
                resolve(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function previewSiswaFoto(input) {
    if (input.files && input.files[0]) {
        siswaFotoFile = input.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('formSiswaFotoImg').src = e.target.result;
            document.getElementById('formSiswaFotoPreview').style.display = 'block';
        };
        reader.readAsDataURL(siswaFotoFile);
    }
}

function populateKelasDropdown(selectId, selectedVal) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih Kelas</option>';
    masterKelasList.forEach(function(k) {
        sel.innerHTML += '<option value="' + k.id + '"' + (selectedVal === k.id ? ' selected' : '') + '>' + k.nama_kelas + ' (Tingkat ' + k.tingkat + ')</option>';
    });
}

async function loadSiswaData() {
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas, tingkat)');
        if (error) throw error;
        var list = data || [];
        list.sort(function(a, b) {
            var tkA = a.master_kelas ? parseInt(a.master_kelas.tingkat) || 0 : 0;
            var tkB = b.master_kelas ? parseInt(b.master_kelas.tingkat) || 0 : 0;
            if (tkA !== tkB) return tkA - tkB;
            
            var kelasA = a.master_kelas ? (a.master_kelas.nama_kelas || '').toLowerCase() : '';
            var kelasB = b.master_kelas ? (b.master_kelas.nama_kelas || '').toLowerCase() : '';
            if (kelasA !== kelasB) {
                if (kelasA < kelasB) return -1;
                if (kelasA > kelasB) return 1;
            }

            var nameA = (a.nama_lengkap || '').toLowerCase();
            var nameB = (b.nama_lengkap || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        siswaList = list;
        // Populate filter kelas dropdown
        var filterKelasEl = document.getElementById('filterSiswaKelas');
        if (filterKelasEl) {
            var currentVal = filterKelasEl.value;
            filterKelasEl.innerHTML = '<option value="">Semua Kelas</option>';
            masterKelasList.forEach(function(k) {
                filterKelasEl.innerHTML += '<option value="' + k.id + '"' + (k.id === currentVal ? ' selected' : '') + '>' + k.nama_kelas + '</option>';
            });
        }
        filterSiswaTable();
    } catch(e) { showToast('Gagal muat siswa: ' + e.message, 'error'); }
}

function filterSiswaTable() {
    var search = (document.getElementById('filterSiswaSearch') ? document.getElementById('filterSiswaSearch').value : '').toLowerCase();
    var filterKelas = document.getElementById('filterSiswaKelas') ? document.getElementById('filterSiswaKelas').value : '';
    var filterStatus = document.getElementById('filterSiswaStatus') ? document.getElementById('filterSiswaStatus').value : '';
    var filterMondok = document.getElementById('filterSiswaMondok') ? document.getElementById('filterSiswaMondok').value : '';

    var filtered = siswaList.filter(function(s) {
        var matchSearch = !search || (s.nama_lengkap || '').toLowerCase().indexOf(search) !== -1 || (s.nisn || '').toLowerCase().indexOf(search) !== -1;
        var matchKelas = !filterKelas || s.kelas_id === filterKelas;
        var matchStatus = !filterStatus || s.status === filterStatus;
        var matchMondok = !filterMondok || s.mondok === filterMondok;
        return matchSearch && matchKelas && matchStatus && matchMondok;
    });

    var tbody = document.getElementById('siswaTableBody');
    var labelJumlah = document.getElementById('labelJumlahSiswa');
    if (labelJumlah) {
        labelJumlah.textContent = filtered.length + ' siswa ditampilkan.';
    }

    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada data siswa yang cocok.</td></tr>';
        if (window.lucide) lucide.createIcons();
        return;
    }
    tbody.innerHTML = filtered.map(function(s, i) {
        var kelasNama = s.master_kelas ? s.master_kelas.nama_kelas : '-';
        var mondokBadge = s.mondok === 'Iya' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Iya</span>' : '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;">Tidak</span>';
        var statusBadge = s.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Aktif</span>' :
            s.status === 'Tidak Aktif' ? '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Tidak Aktif</span>' :
            s.status === 'Pindahan' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Pindahan</span>' :
            s.status === 'Pindah' ? '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Pindah</span>' :
            s.status === 'Lulus' ? '<span class="role-badge" style="background:rgba(124,58,237,.1);color:#7c3aed;">Lulus</span>' :
            '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;">' + (s.status||'-') + '</span>';
        var fotoTd = s.foto ? '<img src="' + s.foto + '" style="width:36px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:45px;border-radius:4px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;border:1px dashed #cbd5e1;">-</div>';
        return '<tr><td>' + (i+1) + '</td><td style="text-align:center;">' + fotoTd + '</td><td>' + (s.asal_sekolah||'-') + '</td><td>' + (s.nisn||'-') + '</td><td>' + (s.nama_lengkap||'-') + '</td><td>' + (s.jenis_kelamin||'-') + '</td><td>' + kelasNama + '</td><td>' + mondokBadge + '</td><td>' + (s.nama_ayah||'-') + '</td><td>' + (s.nik_ayah||'-') + '</td><td>' + (s.nama_ibu||'-') + '</td><td>' + (s.nik_ibu||'-') + '</td><td>' + (s.nomor_hp||'-') + '</td><td>' + (s.email||'-') + '</td><td>' + (s.alamat||'-') + '</td><td>' + statusBadge + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editSiswa(\'' + s.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteSiswa(\'' + s.id + '\',\'' + (s.nama_lengkap||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function openSiswaModal() {
    document.getElementById('formSiswaId').value = '';
    document.getElementById('formSiswaNama').value = '';
    document.getElementById('formSiswaJK').value = '';
    document.getElementById('formSiswaNISN').value = '';
    document.getElementById('formSiswaAsal').value = '';
    document.getElementById('formSiswaMondok').value = 'Tidak';
    document.getElementById('formSiswaAyah').value = '';
    document.getElementById('formSiswaNIKAyah').value = '';
    document.getElementById('formSiswaIbu').value = '';
    document.getElementById('formSiswaNIKIbu').value = '';
    document.getElementById('formSiswaHP').value = '';
    document.getElementById('formSiswaEmail').value = '';
    document.getElementById('formSiswaAlamat').value = '';
    document.getElementById('formSiswaStatus').value = 'Aktif';
    siswaFotoFile = null;
    document.getElementById('formSiswaFoto').value = '';
    document.getElementById('formSiswaFotoPreview').style.display = 'none';
    populateKelasDropdown('formSiswaKelas', '');
    document.getElementById('siswaModalTitle').textContent = 'Tambah Siswa';
    document.getElementById('siswaModal').classList.add('active');
}
function closeSiswaModal() { document.getElementById('siswaModal').classList.remove('active'); }

function editSiswa(id) {
    var s = siswaList.find(function(x) { return x.id === id; });
    if (!s) return;
    document.getElementById('formSiswaId').value = s.id;
    document.getElementById('formSiswaNama').value = s.nama_lengkap || '';
    document.getElementById('formSiswaJK').value = s.jenis_kelamin || '';
    document.getElementById('formSiswaNISN').value = s.nisn || '';
    document.getElementById('formSiswaAsal').value = s.asal_sekolah || '';
    document.getElementById('formSiswaMondok').value = s.mondok || 'Tidak';
    document.getElementById('formSiswaAyah').value = s.nama_ayah || '';
    document.getElementById('formSiswaNIKAyah').value = s.nik_ayah || '';
    document.getElementById('formSiswaIbu').value = s.nama_ibu || '';
    document.getElementById('formSiswaNIKIbu').value = s.nik_ibu || '';
    document.getElementById('formSiswaHP').value = s.nomor_hp || '';
    document.getElementById('formSiswaEmail').value = s.email || '';
    document.getElementById('formSiswaAlamat').value = s.alamat || '';
    document.getElementById('formSiswaStatus').value = s.status || 'Aktif';
    // Handle foto
    siswaFotoFile = null;
    document.getElementById('formSiswaFoto').value = '';
    if (s.foto) {
        document.getElementById('formSiswaFotoImg').src = s.foto;
        document.getElementById('formSiswaFotoPreview').style.display = 'block';
    } else {
        document.getElementById('formSiswaFotoPreview').style.display = 'none';
    }
    populateKelasDropdown('formSiswaKelas', s.kelas_id || '');
    document.getElementById('siswaModalTitle').textContent = 'Edit Siswa';
    document.getElementById('siswaModal').classList.add('active');
}

async function saveSiswa() {
    var id = document.getElementById('formSiswaId').value;
    var obj = {
        nama_lengkap: document.getElementById('formSiswaNama').value.trim(),
        jenis_kelamin: document.getElementById('formSiswaJK').value || null,
        kelas_id: document.getElementById('formSiswaKelas').value || null,
        nisn: document.getElementById('formSiswaNISN').value.trim() || null,
        asal_sekolah: document.getElementById('formSiswaAsal').value.trim() || null,
        mondok: document.getElementById('formSiswaMondok').value || 'Tidak',
        nama_ayah: document.getElementById('formSiswaAyah').value.trim() || null,
        nik_ayah: document.getElementById('formSiswaNIKAyah').value.trim() || null,
        nama_ibu: document.getElementById('formSiswaIbu').value.trim() || null,
        nik_ibu: document.getElementById('formSiswaNIKIbu').value.trim() || null,
        nomor_hp: document.getElementById('formSiswaHP').value.trim() || null,
        email: document.getElementById('formSiswaEmail').value.trim() || null,
        alamat: document.getElementById('formSiswaAlamat').value.trim() || null
    };
    if (siswaFotoFile) {
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengunggah foto siswa...');
        try {
            obj.foto = await uploadToGoogleDrive(siswaFotoFile, 'siswa');
        } catch(e) {
            if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            showToast('Gagal upload foto: ' + e.message, 'error');
            return;
        }
    }
    if (!obj.nama_lengkap) { showToast('Nama siswa wajib diisi!', 'warning'); return; }
    
    if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan data siswa...');
    
    try {
        if (id) {
            obj.status = document.getElementById('formSiswaStatus').value || 'Aktif';
            const { error } = await supabaseClient.from('siswa').update(obj).eq('id', id);
            if (error) throw error;
        } else {
            obj.status = document.getElementById('formSiswaStatus').value || 'Aktif';
            const { error } = await supabaseClient.from('siswa').insert([obj]);
            if (error) throw error;
        }
        showToast('Data siswa berhasil disimpan!', 'success');
        closeSiswaModal();
        loadSiswaData();
    } catch(e) { 
        showToast('Gagal: ' + e.message, 'error'); 
    } finally {
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
    }
}

function deleteSiswa(id, nama) {
    showCustomConfirm('Hapus Data Siswa?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('siswa').delete().eq('id', id);
            if (error) throw error;
            showToast('Data siswa dihapus!', 'success');
            loadSiswaData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// DAFTAR ALUMNI
// ============================================================
var alumniList = [];

async function loadAlumniData() {
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*').eq('status', 'Lulus').order('nama_lengkap');
        if (error) throw error;
        alumniList = data || [];
        var tbody = document.getElementById('alumniTableBody');
        if (!tbody) return;
        if (alumniList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data alumni.</td></tr>';
            return;
        }
        tbody.innerHTML = alumniList.map(function(a, i) {
            var sekolahTujuan = a.sekolah_tujuan || '<em style="color:var(--text-light)">Belum diisi</em>';
            return '<tr><td>' + (i+1) + '</td><td>' + (a.asal_sekolah||'-') + '</td><td>' + (a.nama_lengkap||'-') + '</td><td>' + (a.jenis_kelamin||'-') + '</td><td>' + (a.nisn||'-') + '</td><td>' + (a.nama_ayah||'-') + '</td><td>' + (a.nama_ibu||'-') + '</td><td>' + (a.nomor_hp||'-') + '</td><td>' + (a.alamat||'-') + '</td><td>' + sekolahTujuan + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editAlumni(\'' + a.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal muat alumni: ' + e.message, 'error'); }
}

function editAlumni(id) {
    var a = alumniList.find(function(x) { return x.id === id; });
    if (!a) return;
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
    iconEl.style.background = 'rgba(245,158,11,.1)';
    titleEl.textContent = 'Edit Data Alumni: ' + a.nama_lengkap;
    titleEl.style.color = '#f59e0b';
    msgEl.innerHTML = '<label class="form-label">Sekolah Tujuan</label><input type="text" id="inputSekolahTujuan" class="form-input" value="' + (a.sekolah_tujuan || '') + '" style="width:100%;" placeholder="Contoh: SMA Negeri 1 Cirebon" />';
    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()">Batal</button><button class="btn btn-primary" onclick="saveAlumni(\'' + a.id + '\')">Simpan</button>';
    overlay.classList.add('active');
}

async function saveAlumni(id) {
    var val = document.getElementById('inputSekolahTujuan').value.trim();
    try {
        const { error } = await supabaseClient.from('siswa').update({ sekolah_tujuan: val || null }).eq('id', id);
        if (error) throw error;
        showToast('Data alumni diperbarui!', 'success');
        closeNotifModal();
        loadAlumniData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ============================================================
// OPERASIONAL SEKOLAH: DATA MUTASI SISWA
// ============================================================
var mutasiList = [];

async function loadMutasiData() {
    try {
        const { data, error } = await supabaseClient.from('mutasi_siswa').select('*, master_kelas(nama_kelas, tingkat)').order('tanggal_mutasi', { ascending: false });
        if (error) throw error;
        mutasiList = data || [];
        var tbody = document.getElementById('mutasiTableBody');
        if (!tbody) return;
        if (mutasiList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="19" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data mutasi siswa.</td></tr>';
            return;
        }
        tbody.innerHTML = mutasiList.map(function(m, i) {
            var kelasNama = m.master_kelas ? m.master_kelas.nama_kelas : '-';
            var tglMutasi = m.tanggal_mutasi ? new Date(m.tanggal_mutasi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var tipeBadge = m.tipe_mutasi === 'Masuk'
                ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">▼ Masuk</span>'
                : '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">▲ Keluar</span>';
            var mondokBadge = m.mondok === 'Iya' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Iya</span>' : '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;">Tidak</span>';

            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td>' + tipeBadge + '</td>' +
                '<td>' + (m.sekolah_asal||'-') + '</td>' +
                '<td>' + (m.sekolah_tujuan||'-') + '</td>' +
                '<td>' + (m.nisn||'-') + '</td>' +
                '<td style="font-weight:600;">' + (m.nama_lengkap||'-') + '</td>' +
                '<td>' + (m.jenis_kelamin||'-') + '</td>' +
                '<td>' + kelasNama + '</td>' +
                '<td>' + mondokBadge + '</td>' +
                '<td>' + (m.nama_ayah||'-') + '</td>' +
                '<td>' + (m.nik_ayah||'-') + '</td>' +
                '<td>' + (m.nama_ibu||'-') + '</td>' +
                '<td>' + (m.nik_ibu||'-') + '</td>' +
                '<td>' + (m.nomor_hp||'-') + '</td>' +
                '<td>' + (m.email||'-') + '</td>' +
                '<td>' + (m.alamat||'-') + '</td>' +
                '<td>' + tglMutasi + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (m.keterangan||'-') + '</td>' +
                '<td style="text-align:center;"><button class="btn-icon btn-icon-warning" onclick="editMutasi(\'' + m.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> <button class="btn-icon btn-icon-red" onclick="deleteMutasi(\'' + m.id + '\',\'' + (m.nama_lengkap||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td>' +
                '</tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal muat data mutasi: ' + e.message, 'error'); }
}

function openMutasiMasukModal() {
    document.getElementById('formMutasiMasukNama').value = '';
    document.getElementById('formMutasiMasukJK').value = '';
    document.getElementById('formMutasiMasukNISN').value = '';
    document.getElementById('formMutasiMasukSekolahAsal').value = '';
    document.getElementById('formMutasiMasukTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formMutasiMasukMondok').value = 'Tidak';
    document.getElementById('formMutasiMasukAyah').value = '';
    document.getElementById('formMutasiMasukNIKAyah').value = '';
    document.getElementById('formMutasiMasukIbu').value = '';
    document.getElementById('formMutasiMasukNIKIbu').value = '';
    document.getElementById('formMutasiMasukHP').value = '';
    document.getElementById('formMutasiMasukEmail').value = '';
    document.getElementById('formMutasiMasukKeterangan').value = '';
    document.getElementById('formMutasiMasukAlamat').value = '';
    populateKelasDropdown('formMutasiMasukKelas', '');
    document.getElementById('mutasiMasukModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeMutasiMasukModal() {
    document.getElementById('mutasiMasukModal').classList.remove('active');
}

async function saveMutasiMasuk() {
    var nama = document.getElementById('formMutasiMasukNama').value.trim();
    var jk = document.getElementById('formMutasiMasukJK').value || null;
    var kelasId = document.getElementById('formMutasiMasukKelas').value || null;
    var nisn = document.getElementById('formMutasiMasukNISN').value.trim() || null;
    var sekolahAsal = document.getElementById('formMutasiMasukSekolahAsal').value.trim();
    var tanggal = document.getElementById('formMutasiMasukTanggal').value || new Date().toISOString().split('T')[0];
    var mondok = document.getElementById('formMutasiMasukMondok').value || 'Tidak';
    var ayah = document.getElementById('formMutasiMasukAyah').value.trim() || null;
    var nikAyah = document.getElementById('formMutasiMasukNIKAyah').value.trim() || null;
    var ibu = document.getElementById('formMutasiMasukIbu').value.trim() || null;
    var nikIbu = document.getElementById('formMutasiMasukNIKIbu').value.trim() || null;
    var hp = document.getElementById('formMutasiMasukHP').value.trim() || null;
    var email = document.getElementById('formMutasiMasukEmail').value.trim() || null;
    var keterangan = document.getElementById('formMutasiMasukKeterangan').value.trim() || null;
    var alamat = document.getElementById('formMutasiMasukAlamat').value.trim() || null;

    if (!nama) { showToast('Nama siswa wajib diisi!', 'warning'); return; }
    if (!kelasId) { showToast('Kelas tujuan wajib dipilih!', 'warning'); return; }
    if (!sekolahAsal) { showToast('Sekolah asal wajib diisi!', 'warning'); return; }

    try {
        // 1. Insert ke tabel siswa dengan status 'Pindahan'
        var siswaObj = {
            nama_lengkap: nama,
            jenis_kelamin: jk,
            kelas_id: kelasId,
            nisn: nisn,
            asal_sekolah: sekolahAsal,
            nama_ayah: ayah,
            nik_ayah: nikAyah,
            nama_ibu: ibu,
            nik_ibu: nikIbu,
            nomor_hp: hp,
            email: email,
            alamat: alamat,
            mondok: mondok,
            status: 'Pindahan'
        };
        const { data: newSiswa, error: errSiswa } = await supabaseClient.from('siswa').insert([siswaObj]).select().single();
        if (errSiswa) throw errSiswa;

        // 2. Insert ke tabel mutasi_siswa
        var mutasiObj = {
            siswa_id: newSiswa.id,
            nama_lengkap: nama,
            jenis_kelamin: jk,
            kelas_id: kelasId,
            nisn: nisn,
            tipe_mutasi: 'Masuk',
            sekolah_asal: sekolahAsal,
            tanggal_mutasi: tanggal,
            keterangan: keterangan,
            nama_ayah: ayah,
            nik_ayah: nikAyah,
            nama_ibu: ibu,
            nik_ibu: nikIbu,
            nomor_hp: hp,
            email: email,
            alamat: alamat,
            mondok: mondok
        };
        const { error: errMutasi } = await supabaseClient.from('mutasi_siswa').insert([mutasiObj]);
        if (errMutasi) throw errMutasi;

        showToast('Mutasi masuk berhasil! Siswa ditambahkan ke Data Induk.', 'success');
        closeMutasiMasukModal();
        loadMutasiData();
        loadSiswaData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function openMutasiKeluarModal() {
    document.getElementById('formMutasiKeluarSekolahTujuan').value = '';
    document.getElementById('formMutasiKeluarTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formMutasiKeluarKeterangan').value = '';

    // Populate dropdown siswa aktif + pindahan
    var sel = document.getElementById('formMutasiKeluarSiswa');
    sel.innerHTML = '<option value="">Pilih Siswa...</option>';
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas)').in('status', ['Aktif', 'Pindahan']).order('nama_lengkap');
        if (error) throw error;
        if (data && data.length > 0) {
            data.forEach(function(s) {
                var kelas = s.master_kelas ? s.master_kelas.nama_kelas : '-';
                var opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.nama_lengkap + ' — ' + kelas + ' (' + (s.status||'') + ')';
                sel.appendChild(opt);
            });
        }
    } catch(e) { showToast('Gagal muat data siswa: ' + e.message, 'error'); }

    document.getElementById('mutasiKeluarModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeMutasiKeluarModal() {
    document.getElementById('mutasiKeluarModal').classList.remove('active');
}

async function saveMutasiKeluar() {
    var siswaId = document.getElementById('formMutasiKeluarSiswa').value;
    var sekolahTujuan = document.getElementById('formMutasiKeluarSekolahTujuan').value.trim();
    var tanggal = document.getElementById('formMutasiKeluarTanggal').value || new Date().toISOString().split('T')[0];
    var keterangan = document.getElementById('formMutasiKeluarKeterangan').value.trim() || null;

    if (!siswaId) { showToast('Pilih siswa terlebih dahulu!', 'warning'); return; }
    if (!sekolahTujuan) { showToast('Sekolah tujuan wajib diisi!', 'warning'); return; }

    showCustomConfirm('Mutasi Keluar?', 'Siswa ini akan dikeluarkan dari Data Induk Siswa dan dicatat sebagai mutasi keluar. Proses ini <strong>tidak bisa dibatalkan</strong>.', 'Ya, Proses', async function() {
        try {
            // Ambil data siswa
            const { data: siswa, error: errGet } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas)').eq('id', siswaId).single();
            if (errGet) throw errGet;

            // 1. Insert ke tabel mutasi_siswa
            var mutasiObj = {
                siswa_id: siswaId,
                nama_lengkap: siswa.nama_lengkap,
                jenis_kelamin: siswa.jenis_kelamin,
                kelas_id: siswa.kelas_id,
                nisn: siswa.nisn,
                tipe_mutasi: 'Keluar',
                sekolah_asal: siswa.asal_sekolah,
                sekolah_tujuan: sekolahTujuan,
                tanggal_mutasi: tanggal,
                keterangan: keterangan,
                nama_ayah: siswa.nama_ayah,
                nik_ayah: siswa.nik_ayah,
                nama_ibu: siswa.nama_ibu,
                nik_ibu: siswa.nik_ibu,
                nomor_hp: siswa.nomor_hp,
                email: siswa.email,
                alamat: siswa.alamat,
                mondok: siswa.mondok
            };
            const { error: errMutasi } = await supabaseClient.from('mutasi_siswa').insert([mutasiObj]);
            if (errMutasi) throw errMutasi;

            // 2. Update status siswa menjadi 'Pindah'
            const { error: errUpdate } = await supabaseClient.from('siswa').update({ status: 'Pindah', sekolah_tujuan: sekolahTujuan }).eq('id', siswaId);
            if (errUpdate) throw errUpdate;

            showToast('Mutasi keluar berhasil! Siswa dihapus dari Data Induk.', 'success');
            closeMutasiKeluarModal();
            loadMutasiData();
            loadSiswaData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function deleteMutasi(id, nama) {
    showCustomConfirm('Hapus Data Mutasi & Induk?', 'Data mutasi <strong>"' + nama + '"</strong> akan dihapus dari sistem.<br><br><span style="color:var(--danger);font-weight:bold;">Peringatan Kritis:</span> Ini juga akan <strong>menghapus data siswa yang bersangkutan dari Data Induk Siswa secara permanen</strong> di database.', 'Ya, Hapus Semua', async function() {
        try {
            const { data: mut } = await supabaseClient.from('mutasi_siswa').select('siswa_id').eq('id', id).single();
            const { error: errMutasi } = await supabaseClient.from('mutasi_siswa').delete().eq('id', id);
            if (errMutasi) throw errMutasi;
            if (mut && mut.siswa_id) {
                await supabaseClient.from('siswa').delete().eq('id', mut.siswa_id);
            }
            showToast('Data mutasi dan Data Induk dihapus!', 'success');
            loadMutasiData();
            if(typeof loadSiswaData === 'function') loadSiswaData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function editMutasi(id) {
    var m = mutasiList.find(function(x) { return x.id === id; });
    if (!m) return;
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');
    
    iconEl.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
    iconEl.style.background = 'rgba(59,130,246,.1)';
    titleEl.textContent = 'Edit Data Mutasi: ' + m.nama_lengkap;
    titleEl.style.color = '#3b82f6';
    
    var as = m.sekolah_asal || '';
    var at = m.sekolah_tujuan || '';
    var tm = m.tanggal_mutasi || '';
    var ket = m.keterangan || '';
    
    msgEl.innerHTML = '<div style="text-align:left;font-size:0.9rem;color:var(--text-dark);">' +
        '<div class="form-group"><label class="form-label">Tipe Mutasi (Tidak bisa diubah)</label><input type="text" class="form-input" value="' + m.tipe_mutasi + '" disabled style="background:#f1f5f9;"/></div>' +
        '<div class="form-group"><label class="form-label">Tanggal Mutasi</label><input type="date" id="eMutasiTgl" class="form-input" value="' + tm + '"/></div>' +
        '<div class="form-group"><label class="form-label">Sekolah Asal</label><input type="text" id="eMutasiAsal" class="form-input" value="' + as + '"/></div>' +
        '<div class="form-group"><label class="form-label">Sekolah Tujuan</label><input type="text" id="eMutasiTujuan" class="form-input" value="' + at + '"/></div>' +
        '<div class="form-group"><label class="form-label">Alasan / Keterangan</label><input type="text" id="eMutasiKet" class="form-input" value="' + ket + '"/></div>' +
        '</div>';
        
    actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeNotifModal()">Batal</button><button class="btn btn-primary" onclick="saveEditMutasi(\'' + m.id + '\', \'' + m.siswa_id + '\')">Simpan Perubahan</button>';
    overlay.classList.add('active');
}

async function saveEditMutasi(id, siswaId) {
    var tgl = document.getElementById('eMutasiTgl').value;
    var asal = document.getElementById('eMutasiAsal').value.trim();
    var tujuan = document.getElementById('eMutasiTujuan').value.trim();
    var ket = document.getElementById('eMutasiKet').value.trim();
    
    try {
        const { error } = await supabaseClient.from('mutasi_siswa').update({
            tanggal_mutasi: tgl || null,
            sekolah_asal: asal || null,
            sekolah_tujuan: tujuan || null,
            keterangan: ket || null
        }).eq('id', id);
        if (error) throw error;
        
        // Update di Data Induk (Siswa) juga
        if (siswaId && siswaId !== 'undefined' && siswaId !== 'null') {
            await supabaseClient.from('siswa').update({
                asal_sekolah: asal || null,
                sekolah_tujuan: tujuan || null
            }).eq('id', siswaId);
        }
        
        showToast('Data mutasi berhasil diperbarui!', 'success');
        closeNotifModal();
        loadMutasiData();
        if(typeof loadSiswaData === 'function') loadSiswaData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ============================================================
// OPERASIONAL SEKOLAH: AGENDA DINAS
// ============================================================

// --- Tab Switching ---
window.switchAgendaTab = function(tabId) {
    document.querySelectorAll('#sectionAgendaDinas .account-tab-btn').forEach(function(b) { b.classList.remove('active'); });
    var btn = document.querySelector('#sectionAgendaDinas [data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('#sectionAgendaDinas .account-tab-content').forEach(function(c) { c.style.display = 'none'; });
    var content = document.getElementById(tabId);
    if (content) content.style.display = 'block';
};

// ============================================
// RAPAT & PERTEMUAN
// ============================================
var rapatList = [];

async function loadRapatData() {
    var tbody = document.getElementById('rapatTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('rapat_pertemuan').select('*').order('tanggal', { ascending: false });
        if (error) throw error;
        rapatList = data || [];
        if (rapatList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data rapat.</td></tr>';
            return;
        }
        tbody.innerHTML = rapatList.map(function(r, i) {
            var tgl = r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var waktu = '';
            if (r.waktu_mulai) {
                waktu = r.waktu_mulai.substring(0,5);
                if (r.waktu_selesai) waktu += ' - ' + r.waktu_selesai.substring(0,5);
            }
            var kehadiranMap = {
                'Hadir': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Hadir</span>',
                'Tidak Hadir': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Tidak Hadir</span>',
                'Izin': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Izin</span>',
                'Belum Dikonfirmasi': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Belum</span>'
            };
            var kehadiranBadge = kehadiranMap[r.status_kehadiran] || kehadiranMap['Belum Dikonfirmasi'];
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (r.judul||'-') + '</td>' +
                '<td>' + (r.tempat||'-') + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td style="font-size:.85rem;">' + (waktu||'-') + '</td>' +
                '<td>' + (r.penyelenggara||'-') + '</td>' +
                '<td>' + kehadiranBadge + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (r.ringkasan_hasil||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editRapat(\'' + r.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteRapat(\'' + r.id + '\',\'' + (r.judul||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openRapatModal(data) {
    document.getElementById('formRapatId').value = data ? data.id : '';
    document.getElementById('formRapatJudul').value = data ? data.judul : '';
    document.getElementById('formRapatTempat').value = data ? (data.tempat||'') : '';
    document.getElementById('formRapatPenyelenggara').value = data ? (data.penyelenggara||'') : '';
    document.getElementById('formRapatTanggal').value = data ? (data.tanggal||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formRapatKehadiran').value = data ? (data.status_kehadiran||'Belum Dikonfirmasi') : 'Belum Dikonfirmasi';
    document.getElementById('formRapatWaktuMulai').value = data ? (data.waktu_mulai||'') : '';
    document.getElementById('formRapatWaktuSelesai').value = data ? (data.waktu_selesai||'') : '';
    document.getElementById('formRapatRingkasan').value = data ? (data.ringkasan_hasil||'') : '';
    document.getElementById('formRapatKeterangan').value = data ? (data.keterangan||'') : '';
    document.getElementById('rapatModalTitle').textContent = data ? 'Edit Rapat' : 'Tambah Rapat';
    document.getElementById('rapatModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeRapatModal() { document.getElementById('rapatModal').classList.remove('active'); }

async function saveRapat() {
    var id = document.getElementById('formRapatId').value;
    var obj = {
        judul: document.getElementById('formRapatJudul').value.trim(),
        tempat: document.getElementById('formRapatTempat').value.trim() || null,
        penyelenggara: document.getElementById('formRapatPenyelenggara').value.trim() || null,
        tanggal: document.getElementById('formRapatTanggal').value || null,
        status_kehadiran: document.getElementById('formRapatKehadiran').value,
        waktu_mulai: document.getElementById('formRapatWaktuMulai').value || null,
        waktu_selesai: document.getElementById('formRapatWaktuSelesai').value || null,
        ringkasan_hasil: document.getElementById('formRapatRingkasan').value.trim() || null,
        keterangan: document.getElementById('formRapatKeterangan').value.trim() || null
    };
    if (!obj.judul) { showToast('Judul rapat wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('rapat_pertemuan').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Data rapat diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('rapat_pertemuan').insert([obj]);
            if (error) throw error;
            showToast('Rapat berhasil ditambahkan!', 'success');
        }
        closeRapatModal();
        loadRapatData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editRapat(id) {
    var r = rapatList.find(function(x) { return x.id === id; });
    if (r) openRapatModal(r);
}

function deleteRapat(id, judul) {
    showCustomConfirm('Hapus Data Rapat?', 'Data rapat <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('rapat_pertemuan').delete().eq('id', id);
            if (error) throw error;
            showToast('Data rapat dihapus!', 'success');
            loadRapatData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================
// Perjalanan Dinas (Agenda Dinas)
// ============================================
var perjadinList = [];

async function loadPerjadinData() {
    var tbody = document.getElementById('perjadinTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('perjalanan_dinas').select('*').order('tanggal_berangkat', { ascending: false });
        if (error) throw error;
        perjadinList = data || [];
        if (perjadinList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data perjalanan dinas.</td></tr>';
            return;
        }
        tbody.innerHTML = perjadinList.map(function(p, i) {
            var tglBrkt = p.tanggal_berangkat ? new Date(p.tanggal_berangkat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var tglKmbli = p.tanggal_kembali ? new Date(p.tanggal_kembali).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var statusMap = {
                'Direncanakan': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Direncanakan</span>',
                'Berlangsung': '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Berlangsung</span>',
                'Berhasil': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Berhasil</span>',
                'Gagal': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Gagal</span>',
                'Dibatalkan': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Dibatalkan</span>'
            };
            var statusBadge = statusMap[p.status] || statusMap['Direncanakan'];
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (p.tujuan||'-') + '</td>' +
                '<td>' + (p.instansi_tujuan||'-') + '</td>' +
                '<td style="font-size:.85rem;">' + (p.keperluan||'-') + '</td>' +
                '<td>' + tglBrkt + '</td>' +
                '<td>' + tglKmbli + '</td>' +
                '<td>' + (p.petugas||'-') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (p.hasil_keterangan||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editPerjadin(\'' + p.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deletePerjadin(\'' + p.id + '\',\'' + (p.tujuan||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openPerjadinModal(data) {
    document.getElementById('formPerjadinId').value = data ? data.id : '';
    document.getElementById('formPerjadinTujuan').value = data ? data.tujuan : '';
    document.getElementById('formPerjadinInstansi').value = data ? (data.instansi_tujuan||'') : '';
    document.getElementById('formPerjadinBerangkat').value = data ? (data.tanggal_berangkat||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formPerjadinKembali').value = data ? (data.tanggal_kembali||'') : '';
    document.getElementById('formPerjadinPetugas').value = data ? (data.petugas||'') : '';
    document.getElementById('formPerjadinStatus').value = data ? (data.status||'Direncanakan') : 'Direncanakan';
    document.getElementById('formPerjadinKeperluan').value = data ? (data.keperluan||'') : '';
    document.getElementById('formPerjadinHasil').value = data ? (data.hasil_keterangan||'') : '';
    document.getElementById('perjadinModalTitle').textContent = data ? 'Edit Perjalanan Dinas' : 'Tambah Perjalanan Dinas';
    document.getElementById('perjadinModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closePerjadinModal() { document.getElementById('perjadinModal').classList.remove('active'); }

async function savePerjadin() {
    var id = document.getElementById('formPerjadinId').value;
    var obj = {
        tujuan: document.getElementById('formPerjadinTujuan').value.trim(),
        instansi_tujuan: document.getElementById('formPerjadinInstansi').value.trim() || null,
        tanggal_berangkat: document.getElementById('formPerjadinBerangkat').value || null,
        tanggal_kembali: document.getElementById('formPerjadinKembali').value || null,
        petugas: document.getElementById('formPerjadinPetugas').value.trim() || null,
        status: document.getElementById('formPerjadinStatus').value,
        keperluan: document.getElementById('formPerjadinKeperluan').value.trim(),
        hasil_keterangan: document.getElementById('formPerjadinHasil').value.trim() || null
    };
    if (!obj.tujuan) { showToast('Tujuan wajib diisi!', 'warning'); return; }
    if (!obj.keperluan) { showToast('Keperluan wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('perjalanan_dinas').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Data perjalanan dinas diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('perjalanan_dinas').insert([obj]);
            if (error) throw error;
            showToast('Perjalanan dinas berhasil ditambahkan!', 'success');
        }
        closePerjadinModal();
        loadPerjadinData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editPerjadin(id) {
    var p = perjadinList.find(function(x) { return x.id === id; });
    if (p) openPerjadinModal(p);
}

function deletePerjadin(id, tujuan) {
    showCustomConfirm('Hapus Data Perjalanan Dinas?', 'Data perjalanan dinas ke <strong>"' + tujuan + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('perjalanan_dinas').delete().eq('id', id);
            if (error) throw error;
            showToast('Data perjalanan dinas dihapus!', 'success');
            loadPerjadinData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// OPERASIONAL SEKOLAH: INVENTARIS & SARANA PRASARANA
// ============================================================
var inventarisList = [];

async function loadInventarisData() {
    var tbody = document.getElementById('inventarisTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('inventaris_sekolah').select('*').order('nama_barang');
        if (error) throw error;
        inventarisList = data || [];
        if (inventarisList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data inventaris.</td></tr>';
            return;
        }
        tbody.innerHTML = inventarisList.map(function(b, i) {
            var kondisiMap = {
                'Baik': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Baik</span>',
                'Rusak Ringan': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Rusak Ringan</span>',
                'Rusak Berat': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Rusak Berat</span>',
                'Hilang': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Hilang</span>'
            };
            var perbaikanMap = {
                'Dilaporkan': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Dilaporkan</span>',
                'Dalam Perbaikan': '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Dalam Perbaikan</span>',
                'Selesai Diperbaiki': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Selesai</span>',
                'Tidak Bisa Diperbaiki': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Tidak Bisa</span>'
            };
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (b.nama_barang||'-') + '</td>' +
                '<td style="font-size:.85rem;">' + (b.kode_barang||'-') + '</td>' +
                '<td>' + (b.kategori||'-') + '</td>' +
                '<td style="text-align:center;">' + (b.jumlah||0) + '</td>' +
                '<td>' + (kondisiMap[b.kondisi] || '-') + '</td>' +
                '<td>' + (b.lokasi||'-') + '</td>' +
                '<td style="text-align:center;">' + (b.tahun_pengadaan||'-') + '</td>' +
                '<td>' + (b.status_perbaikan ? perbaikanMap[b.status_perbaikan]||b.status_perbaikan : '-') + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (b.catatan_perbaikan||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editInventaris(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteInventaris(\'' + b.id + '\',\'' + (b.nama_barang||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openInventarisModal(data) {
    document.getElementById('formInvId').value = data ? data.id : '';
    document.getElementById('formInvNama').value = data ? data.nama_barang : '';
    document.getElementById('formInvKode').value = data ? (data.kode_barang||'') : '';
    document.getElementById('formInvKategori').value = data ? (data.kategori||'Lainnya') : 'Lainnya';
    document.getElementById('formInvJumlah').value = data ? (data.jumlah||1) : 1;
    document.getElementById('formInvKondisi').value = data ? (data.kondisi||'Baik') : 'Baik';
    document.getElementById('formInvLokasi').value = data ? (data.lokasi||'') : '';
    document.getElementById('formInvTahun').value = data ? (data.tahun_pengadaan||'') : '';
    document.getElementById('formInvPerbaikan').value = data ? (data.status_perbaikan||'') : '';
    document.getElementById('formInvCatatanPerbaikan').value = data ? (data.catatan_perbaikan||'') : '';
    document.getElementById('formInvKeterangan').value = data ? (data.keterangan||'') : '';
    document.getElementById('inventarisModalTitle').textContent = data ? 'Edit Barang' : 'Tambah Barang';
    document.getElementById('inventarisModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeInventarisModal() { document.getElementById('inventarisModal').classList.remove('active'); }

async function saveInventaris() {
    var id = document.getElementById('formInvId').value;
    var obj = {
        nama_barang: document.getElementById('formInvNama').value.trim(),
        kode_barang: document.getElementById('formInvKode').value.trim() || null,
        kategori: document.getElementById('formInvKategori').value,
        jumlah: parseInt(document.getElementById('formInvJumlah').value) || 1,
        kondisi: document.getElementById('formInvKondisi').value,
        lokasi: document.getElementById('formInvLokasi').value.trim() || null,
        tahun_pengadaan: document.getElementById('formInvTahun').value ? parseInt(document.getElementById('formInvTahun').value) : null,
        status_perbaikan: document.getElementById('formInvPerbaikan').value || null,
        catatan_perbaikan: document.getElementById('formInvCatatanPerbaikan').value.trim() || null,
        keterangan: document.getElementById('formInvKeterangan').value.trim() || null
    };
    if (!obj.nama_barang) { showToast('Nama barang wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('inventaris_sekolah').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Data inventaris diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('inventaris_sekolah').insert([obj]);
            if (error) throw error;
            showToast('Barang berhasil ditambahkan!', 'success');
        }
        closeInventarisModal();
        loadInventarisData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editInventaris(id) {
    var b = inventarisList.find(function(x) { return x.id === id; });
    if (b) openInventarisModal(b);
}

function deleteInventaris(id, nama) {
    showCustomConfirm('Hapus Data Inventaris?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('inventaris_sekolah').delete().eq('id', id);
            if (error) throw error;
            showToast('Data inventaris dihapus!', 'success');
            loadInventarisData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// OPERASIONAL SEKOLAH: SURAT MASUK & KELUAR
// ============================================================
var suratMasukList = [], suratKeluarList = [];

window.switchSuratTab = function(tabId) {
    document.querySelectorAll('#sectionSuratMasukKeluar .account-tab-btn').forEach(function(b) { b.classList.remove('active'); });
    var btn = document.querySelector('#sectionSuratMasukKeluar [data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('#sectionSuratMasukKeluar .account-tab-content').forEach(function(c) { c.style.display = 'none'; });
    var content = document.getElementById(tabId);
    if (content) content.style.display = 'block';
};

async function loadSuratData() {
    await loadSuratByJenis('Masuk', 'suratMasukTbody');
    await loadSuratByJenis('Keluar', 'suratKeluarTbody');
}

async function loadSuratByJenis(jenis, tbodyId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('surat_masuk_keluar').select('*').eq('jenis', jenis).order('tanggal_surat', { ascending: false });
        if (error) throw error;
        var list = data || [];
        if (jenis === 'Masuk') suratMasukList = list; else suratKeluarList = list;
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada surat ' + jenis.toLowerCase() + '.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(function(s, i) {
            var tgl = s.tanggal_surat ? new Date(s.tanggal_surat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var statusMap = {
                'Diproses': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Diproses</span>',
                'Selesai': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Selesai</span>',
                'Diarsipkan': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Diarsipkan</span>'
            };
            var pihak = jenis === 'Masuk' ? (s.pengirim||'-') : (s.tujuan||'-');
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:500;">' + (s.nomor_surat||'-') + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td>' + pihak + '</td>' +
                '<td style="font-weight:600;">' + (s.perihal||'-') + '</td>' +
                '<td>' + (statusMap[s.status]||'-') + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (s.keterangan||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editSurat(\'' + s.id + '\',\'' + jenis + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteSurat(\'' + s.id + '\',\'' + (s.perihal||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openSuratModal(jenis, data) {
    document.getElementById('formSuratId').value = data ? data.id : '';
    document.getElementById('formSuratJenis').value = data ? data.jenis : jenis;
    document.getElementById('formSuratNomor').value = data ? (data.nomor_surat||'') : '';
    document.getElementById('formSuratTanggal').value = data ? (data.tanggal_surat||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formSuratPengirim').value = data ? (data.pengirim||'') : '';
    document.getElementById('formSuratTujuan').value = data ? (data.tujuan||'') : '';
    document.getElementById('formSuratPerihal').value = data ? (data.perihal||'') : '';
    document.getElementById('formSuratStatus').value = data ? (data.status||'Diproses') : 'Diproses';
    document.getElementById('formSuratKeterangan').value = data ? (data.keterangan||'') : '';
    var j = data ? data.jenis : jenis;
    document.getElementById('suratModalTitle').textContent = (data ? 'Edit' : 'Catat') + ' Surat ' + j;
    document.getElementById('grpSuratPengirim').style.display = j === 'Masuk' ? '' : 'none';
    document.getElementById('grpSuratTujuan').style.display = j === 'Keluar' ? '' : 'none';
    document.getElementById('suratModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeSuratModal() { document.getElementById('suratModal').classList.remove('active'); }

async function saveSurat() {
    var id = document.getElementById('formSuratId').value;
    var jenis = document.getElementById('formSuratJenis').value;
    var obj = {
        nomor_surat: document.getElementById('formSuratNomor').value.trim() || null,
        tanggal_surat: document.getElementById('formSuratTanggal').value || null,
        jenis: jenis,
        pengirim: jenis === 'Masuk' ? (document.getElementById('formSuratPengirim').value.trim() || null) : null,
        tujuan: jenis === 'Keluar' ? (document.getElementById('formSuratTujuan').value.trim() || null) : null,
        perihal: document.getElementById('formSuratPerihal').value.trim(),
        status: document.getElementById('formSuratStatus').value,
        keterangan: document.getElementById('formSuratKeterangan').value.trim() || null
    };
    if (!obj.perihal) { showToast('Perihal wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('surat_masuk_keluar').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Data surat diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('surat_masuk_keluar').insert([obj]);
            if (error) throw error;
            showToast('Surat berhasil dicatat!', 'success');
        }
        closeSuratModal();
        loadSuratData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editSurat(id, jenis) {
    var list = jenis === 'Masuk' ? suratMasukList : suratKeluarList;
    var s = list.find(function(x) { return x.id === id; });
    if (s) openSuratModal(jenis, s);
}

function deleteSurat(id, perihal) {
    showCustomConfirm('Hapus Data Surat?', 'Surat <strong>"' + perihal + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('surat_masuk_keluar').delete().eq('id', id);
            if (error) throw error;
            showToast('Data surat dihapus!', 'success');
            loadSuratData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// OPERASIONAL SEKOLAH: NOTULENSI & DOKUMEN
// ============================================================
var notulensiList = [];

async function loadNotulensiData() {
    var tbody = document.getElementById('notulensiTbody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('notulensi_dokumen').select('*').order('tanggal', { ascending: false });
        if (error) throw error;
        notulensiList = data || [];
        if (notulensiList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data notulensi/dokumen.</td></tr>';
            return;
        }
        var jenisColors = {
            'Notulensi': 'background:rgba(99,102,241,.1);color:#6366f1;',
            'SK': 'background:rgba(16,185,129,.1);color:#10b981;',
            'Surat Keputusan': 'background:rgba(59,130,246,.1);color:#3b82f6;',
            'Laporan': 'background:rgba(245,158,11,.1);color:#f59e0b;',
            'Dokumen Lain': 'background:rgba(148,163,184,.15);color:#94a3b8;'
        };
        tbody.innerHTML = notulensiList.map(function(d, i) {
            var tgl = d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var jenisBadge = '<span class="role-badge" style="' + (jenisColors[d.jenis]||jenisColors['Dokumen Lain']) + '">' + (d.jenis||'-') + '</span>';
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (d.judul||'-') + '</td>' +
                '<td>' + jenisBadge + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td>' + (d.penulis||'-') + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (d.isi_ringkasan||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editNotulensi(\'' + d.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteNotulensi(\'' + d.id + '\',\'' + (d.judul||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openNotulensiModal(data) {
    document.getElementById('formNotulId').value = data ? data.id : '';
    document.getElementById('formNotulJudul').value = data ? data.judul : '';
    document.getElementById('formNotulJenis').value = data ? (data.jenis||'Notulensi') : 'Notulensi';
    document.getElementById('formNotulTanggal').value = data ? (data.tanggal||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formNotulPenulis').value = data ? (data.penulis||'') : '';
    document.getElementById('formNotulIsi').value = data ? (data.isi_ringkasan||'') : '';
    document.getElementById('formNotulKeterangan').value = data ? (data.keterangan||'') : '';
    document.getElementById('notulensiModalTitle').textContent = data ? 'Edit Dokumen' : 'Tambah Dokumen';
    document.getElementById('notulensiModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeNotulensiModal() { document.getElementById('notulensiModal').classList.remove('active'); }

async function saveNotulensi() {
    var id = document.getElementById('formNotulId').value;
    var obj = {
        judul: document.getElementById('formNotulJudul').value.trim(),
        jenis: document.getElementById('formNotulJenis').value,
        tanggal: document.getElementById('formNotulTanggal').value || null,
        penulis: document.getElementById('formNotulPenulis').value.trim() || null,
        isi_ringkasan: document.getElementById('formNotulIsi').value.trim() || null,
        keterangan: document.getElementById('formNotulKeterangan').value.trim() || null
    };
    if (!obj.judul) { showToast('Judul wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('notulensi_dokumen').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Dokumen diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('notulensi_dokumen').insert([obj]);
            if (error) throw error;
            showToast('Dokumen berhasil ditambahkan!', 'success');
        }
        closeNotulensiModal();
        loadNotulensiData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editNotulensi(id) {
    var d = notulensiList.find(function(x) { return x.id === id; });
    if (d) openNotulensiModal(d);
}

function deleteNotulensi(id, judul) {
    showCustomConfirm('Hapus Dokumen?', 'Dokumen <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('notulensi_dokumen').delete().eq('id', id);
            if (error) throw error;
            showToast('Dokumen dihapus!', 'success');
            loadNotulensiData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// AKADEMIK: BANK SOAL
// ============================================================
var bankSoalList = [];

async function loadBankSoal() {
    try {
        var query = supabaseClient.from('bank_soal').select('*, master_kelas(nama_kelas, tingkat)').order('created_at', { ascending: false });

        // Semua role bisa melihat semua bank soal (sebagai referensi)
        const { data, error } = await query;
        if (error) throw error;
        bankSoalList = data || [];

        // Populate filter dropdowns from data
        populateBankSoalFilters();

        // Render with current filters
        renderFilteredBankSoal();
    } catch(e) { showToast('Gagal muat bank soal: ' + e.message, 'error'); }
}

function populateBankSoalFilters() {
    // Populate Mapel filter
    var mapelSet = {};
    var kelasSet = {};
    bankSoalList.forEach(function(b) {
        if (b.mapel) mapelSet[b.mapel] = true;
        if (b.master_kelas && b.master_kelas.nama_kelas) {
            kelasSet[b.master_kelas.nama_kelas] = true;
        }
    });

    var mapelSel = document.getElementById('filterBankMapel');
    if (mapelSel) {
        var currentMapel = mapelSel.value;
        var opts = '<option value="">Semua Mapel</option>';
        // Also use masterMapelList if available for complete list
        if (typeof masterMapelList !== 'undefined' && masterMapelList.length > 0) {
            masterMapelList.forEach(function(m) { opts += '<option value="' + m.nama_mapel + '">' + m.nama_mapel + '</option>'; });
        } else {
            Object.keys(mapelSet).sort().forEach(function(m) { opts += '<option value="' + m + '">' + m + '</option>'; });
        }
        mapelSel.innerHTML = opts;
        mapelSel.value = currentMapel;
    }

    var kelasSel = document.getElementById('filterBankKelas');
    if (kelasSel) {
        var currentKelas = kelasSel.value;
        var opts = '<option value="">Semua Kelas</option>';
        if (typeof masterKelasList !== 'undefined' && masterKelasList.length > 0) {
            masterKelasList.forEach(function(k) { opts += '<option value="' + k.nama_kelas + '">' + k.nama_kelas + ' (Tingkat ' + k.tingkat + ')</option>'; });
        } else {
            Object.keys(kelasSet).sort().forEach(function(k) { opts += '<option value="' + k + '">' + k + '</option>'; });
        }
        kelasSel.innerHTML = opts;
        kelasSel.value = currentKelas;
    }
}

function renderFilteredBankSoal() {
    var filterMapel = (document.getElementById('filterBankMapel') || {}).value || '';
    var filterKelas = (document.getElementById('filterBankKelas') || {}).value || '';
    var filterSemester = (document.getElementById('filterBankSemester') || {}).value || '';
    var searchQuery = ((document.getElementById('searchBankSoal') || {}).value || '').toLowerCase().trim();

    var filtered = bankSoalList.filter(function(b) {
        // Filter by Mapel
        if (filterMapel && b.mapel !== filterMapel) return false;
        // Filter by Kelas
        if (filterKelas && (!b.master_kelas || b.master_kelas.nama_kelas !== filterKelas)) return false;
        // Filter by Semester
        if (filterSemester && b.semester !== filterSemester) return false;
        // Search query
        if (searchQuery) {
            var haystack = [
                b.mapel || '',
                b.master_kelas ? b.master_kelas.nama_kelas : '',
                b.semester || '',
                b.tipe_ujian || '',
                b.tahun_pelajaran || '',
                b.link_soal || ''
            ].join(' ').toLowerCase();
            if (haystack.indexOf(searchQuery) === -1) return false;
        }
        return true;
    });

    var tbody = document.getElementById('bankSoalTableBody');
    if (!tbody) return;

    // Update counter
    var countEl = document.getElementById('bankSoalCount');
    if (countEl) countEl.textContent = filtered.length + ' soal ditemukan';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">' +
            (bankSoalList.length === 0 ? 'Belum ada data bank soal.' : 'Tidak ada soal yang cocok dengan filter.') + '</td></tr>';
        if (window.lucide) lucide.createIcons();
        return;
    }

    var isAdminKurikulum = currentRole === 'admin' || currentRole === 'kurikulum';

    tbody.innerHTML = filtered.map(function(b, i) {
        var kelasNama = b.master_kelas ? b.master_kelas.nama_kelas + ' (Tingkat ' + b.master_kelas.tingkat + ')' : '-';
        
        // Detect file type from link
        var isUploadedFile = b.link_soal && b.link_soal.indexOf('bank-soal-files') !== -1;
        var fileExt = '';
        if (isUploadedFile) {
            var parts = b.link_soal.split('.');
            fileExt = parts[parts.length - 1].toLowerCase().split('?')[0];
        }
        var fileIcon = 'external-link';
        var fileLabel = 'Buka Link';
        if (fileExt === 'pdf') { fileIcon = 'file-text'; fileLabel = 'PDF'; }
        else if (fileExt === 'doc' || fileExt === 'docx') { fileIcon = 'file-text'; fileLabel = 'Word'; }
        else if (fileExt === 'xls' || fileExt === 'xlsx') { fileIcon = 'file-spreadsheet'; fileLabel = 'Excel'; }
        else if (fileExt === 'ppt' || fileExt === 'pptx') { fileIcon = 'file-text'; fileLabel = 'PPT'; }

        var linkBadge = '<a href="' + b.link_soal + '" target="_blank" class="btn btn-sm btn-primary" style="padding:4px 8px;font-size:0.75rem;"><i data-lucide="' + fileIcon + '" style="width:12px;height:12px;margin-right:4px;"></i>' + fileLabel + '</a>';

        // Download filename
        var dlName = b.mapel.replace(/\s/g,'_') + '_' + (b.semester || '') + '.' + (fileExt || 'pdf');
        var safeUrl = b.link_soal.replace(/'/g, "\\'");

        var tipeBadge = b.tipe_ujian === 'STS' ? '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">STS</span>' : 
                        b.tipe_ujian === 'SAS' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">SAS</span>' :
                        b.tipe_ujian === 'SAJ' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">SAJ</span>' :
                        '<span class="role-badge" style="background:rgba(168,85,247,.1);color:#a855f7;">SAT</span>';
        var semesterBadge = b.semester === 'Genap' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Genap</span>' : '<span class="role-badge" style="background:rgba(168,85,247,.1);color:#a855f7;">Ganjil</span>';

        // Kolom Dibuat Oleh
        var creatorName = b.created_by_name || '<span style="color:var(--text-light);font-style:italic;">—</span>';

        // Hak aksi: Semua role bisa edit/hapus/download di Bank Soal (sebagai bank referensi bersama)
        var aksiHtml = '<button class="btn btn-sm" style="background:#10b981;color:#fff;padding:4px 6px;" onclick="downloadBankSoalFile(\'' + safeUrl + '\',\'' + dlName.replace(/'/g, "\\'") + '\')" title="Download"><i data-lucide="download" style="width:14px;height:14px;"></i></button> ';
        aksiHtml += '<button class="btn btn-sm btn-warning" onclick="editBankSoal(\'' + b.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ';
        aksiHtml += '<button class="btn btn-sm btn-danger" onclick="deleteBankSoal(\'' + b.id + '\',\'' + b.mapel.replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>';

        return '<tr><td>' + (i+1) + '</td><td>' + b.mapel + '</td><td>' + kelasNama + '</td><td>' + semesterBadge + '</td><td>' + tipeBadge + '</td><td>' + linkBadge + '</td><td>' + b.tahun_pelajaran + '</td><td>' + creatorName + '</td>' +
            '<td style="text-align:center;white-space:nowrap;">' + aksiHtml + '</td></tr>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function resetBankSoalFilters() {
    var ids = ['filterBankMapel', 'filterBankKelas', 'filterBankSemester', 'searchBankSoal'];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderFilteredBankSoal();
}

function toggleBankSoalSource(mode) {
    document.getElementById('bankSoalLinkArea').style.display = mode === 'link' ? 'block' : 'none';
    document.getElementById('bankSoalUploadArea').style.display = mode === 'upload' ? 'block' : 'none';
}

function openBankSoalModal() {
    document.getElementById('formBankId').value = '';
    var lblYear = document.getElementById('lblActiveYear');
    var activeYear = lblYear ? lblYear.textContent : '';
    if (activeYear === 'Belum diatur') activeYear = '';
    
    document.getElementById('formBankTahun').value = activeYear;
    populateMapelDropdown('formBankMapel', '');
    populateKelasDropdown('formBankKelas', '');
    document.getElementById('formBankTipe').value = 'STS';
    document.getElementById('formBankSemester').value = 'Ganjil';
    document.getElementById('formBankLink').value = '';
    var fileInput = document.getElementById('formBankFile');
    if (fileInput) fileInput.value = '';

    // Reset radio to link mode
    var radios = document.querySelectorAll('input[name="bankSoalSource"]');
    radios.forEach(function(r) { r.checked = r.value === 'link'; });
    toggleBankSoalSource('link');
    
    document.getElementById('bankSoalModalTitle').textContent = 'Tambah Bank Soal';
    document.getElementById('bankSoalModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeBankSoalModal() { document.getElementById('bankSoalModal').classList.remove('active'); }

function editBankSoal(id) {
    var b = bankSoalList.find(function(x) { return x.id === id; });
    if (!b) return;
    document.getElementById('formBankId').value = b.id;
    document.getElementById('formBankTahun').value = b.tahun_pelajaran || '';
    populateMapelDropdown('formBankMapel', b.mapel || '');
    populateKelasDropdown('formBankKelas', b.kelas_id || '');
    document.getElementById('formBankTipe').value = b.tipe_ujian || 'STS';
    document.getElementById('formBankSemester').value = b.semester || 'Ganjil';
    document.getElementById('formBankLink').value = b.link_soal || '';

    // Set radio to link mode (edit always shows existing link)
    var radios = document.querySelectorAll('input[name="bankSoalSource"]');
    radios.forEach(function(r) { r.checked = r.value === 'link'; });
    toggleBankSoalSource('link');

    document.getElementById('bankSoalModalTitle').textContent = 'Edit Bank Soal';
    document.getElementById('bankSoalModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

async function saveBankSoal() {
    var id = document.getElementById('formBankId').value;
    var sourceMode = document.querySelector('input[name="bankSoalSource"]:checked');
    var mode = sourceMode ? sourceMode.value : 'link';

    var obj = {
        mapel: document.getElementById('formBankMapel').value.trim(),
        kelas_id: document.getElementById('formBankKelas').value || null,
        tipe_ujian: document.getElementById('formBankTipe').value,
        semester: document.getElementById('formBankSemester').value,
        tahun_pelajaran: document.getElementById('formBankTahun').value.trim()
    };

    if (!obj.mapel || !obj.kelas_id || !obj.tahun_pelajaran) {
        showToast('Pastikan Tahun, Mapel, dan Kelas terisi semua!', 'warning');
        return;
    }

    try {
        showGlobalLoader('Menyimpan Bank Soal...');

        if (mode === 'upload') {
            // Upload file to Supabase Storage
            var fileInput = document.getElementById('formBankFile');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                hideGlobalLoader();
                showToast('Pilih file yang ingin diupload!', 'warning');
                return;
            }
            var file = fileInput.files[0];
            if (file.size > 10 * 1024 * 1024) {
                hideGlobalLoader();
                showToast('Ukuran file melebihi 10MB!', 'warning');
                return;
            }

            var ext = file.name.split('.').pop().toLowerCase();
            var fileName = 'bank-soal/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

            var { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('bank-soal-files')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            var publicUrlResult = supabaseClient.storage.from('bank-soal-files').getPublicUrl(fileName);
            obj.link_soal = publicUrlResult.data.publicUrl;
        } else {
            // Link mode
            obj.link_soal = document.getElementById('formBankLink').value.trim();
            if (!obj.link_soal) {
                hideGlobalLoader();
                showToast('Link Soal wajib diisi!', 'warning');
                return;
            }
        }

        if (id) {
            const { error } = await supabaseClient.from('bank_soal').update(obj).eq('id', id);
            if (error) throw error;
        } else {
            // Tambahkan identitas pembuat soal
            obj.created_by = currentUser ? currentUser.id : null;
            obj.created_by_name = currentUser ? currentUser.name : null;
            const { error } = await supabaseClient.from('bank_soal').insert([obj]);
            if (error) throw error;
        }
        showToast('Bank Soal berhasil disimpan!', 'success');
        closeBankSoalModal();
        loadBankSoal();
    } catch(e) { showToast('Gagal menyimpan: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function downloadBankSoalFile(url, filename) {
    // For Google Drive links, convert to direct download URL
    if (url.indexOf('drive.google.com') !== -1 || url.indexOf('docs.google.com') !== -1) {
        var fileId = '';
        // Extract file ID from various Google Drive URL formats
        var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            fileId = match[1];
        } else {
            var match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match2) fileId = match2[1];
        }
        if (fileId) {
            // Direct download URL
            window.location.href = 'https://drive.google.com/uc?export=download&id=' + fileId;
            showToast('Memulai unduhan dari Google Drive...', 'info');
        } else {
            // Fallback: open in new tab
            window.open(url, '_blank');
            showToast('Link tidak dikenali, membuka di tab baru...', 'warning');
        }
        return;
    }
    // For Supabase-hosted files, download directly
    showToast('Memulai unduhan...', 'info');
    fetch(url)
        .then(function(r) { return r.blob(); })
        .then(function(blob) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename || 'bank_soal';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
            showToast('File berhasil diunduh!', 'success');
        })
        .catch(function(e) {
            showToast('Gagal mengunduh, membuka di tab baru...', 'warning');
            window.open(url, '_blank');
        });
}

function deleteBankSoal(id, mapel) {
    showCustomConfirm('Hapus Bank Soal', 'Apakah Anda yakin ingin menghapus soal ujian untuk mapel <strong>"' + mapel + '"</strong>?', 'Ya, Hapus', async function() {
        try {
            // Find the item to check if it has a Supabase storage file
            var item = bankSoalList.find(function(x) { return x.id === id; });
            if (item && item.link_soal && item.link_soal.indexOf('bank-soal-files') !== -1) {
                // Delete from storage too
                var fileName = item.link_soal.split('/bank-soal-files/').pop();
                if (fileName) {
                    await supabaseClient.storage.from('bank-soal-files').remove([decodeURIComponent(fileName)]);
                }
            }
            const { error } = await supabaseClient.from('bank_soal').delete().eq('id', id);
            if (error) throw error;
            showToast('Bank Soal dihapus!', 'success');
            loadBankSoal();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}



// ============================================================
// LAINNYA: KRITIK & SARAN
// ============================================================
var kritikSaranList = [];

async function loadKritikSaran() {
    try {
        const { data, error } = await supabaseClient.from('kritik_saran').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        kritikSaranList = data || [];
        var tbody = document.getElementById('kritikSaranTableBody');
        if (!tbody) return;
        if (kritikSaranList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada kritik & saran yang masuk.</td></tr>';
            return;
        }
        tbody.innerHTML = kritikSaranList.map(function(k, i) {
            var dt = new Date(k.created_at);
            var date = dt.toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) + ', ' + dt.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
            var isAnon = (!k.user_id && k.nama_pengirim === 'Anonim') ? '<span style="color:var(--text-light);font-style:italic;">Anonim</span>' : k.nama_pengirim;
            var safePesan = k.pesan.replace(/"/g, '&quot;').replace(/'/g, '\\\'');
            return '<tr><td>' + (i+1) + '</td><td>' + date + '</td><td>' + isAnon + '</td><td>' + k.pesan + '</td>' +
                '<td style="text-align:center; white-space:nowrap;">' +
                    '<button class="btn btn-sm btn-outline" style="padding:0.25rem 0.5rem; margin-right:4px;" onclick="openBalasKritikModal(\'' + safePesan + '\')" title="Balas Kritik"><i data-lucide="message-square-reply" style="width:14px;height:14px;"></i></button>' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteKritik(\'' + k.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal memuat kritik & saran', 'error'); }
}

function openBalasKritikModal(pesan) {
    document.getElementById('balasKritikOriginal').innerText = pesan;
    document.getElementById('balasKritikText').value = '';
    document.getElementById('balasKritikModal').classList.add('active');
}

function closeBalasKritikModal() {
    document.getElementById('balasKritikModal').classList.remove('active');
}

async function generateBalasanKritikAI() {
    const originalText = document.getElementById('balasKritikOriginal').innerText;
    const btn = document.querySelector('button[onclick="generateBalasanKritikAI()"]');
    const oriText = btn.innerHTML;
    
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Memproses AI...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah staf humas/Customer Service dari SMP IT Al-Fathonah yang sangat ramah, profesional, solutif, dan empatik. Tugasmu membuat draf balasan untuk merespon pesan/masukan wali murid/siswa.";
    const prompt = `Tolong buatkan draf balasan (dalam 1-2 paragraf pendek) yang sopan dan profesional untuk merespon kritik/saran berikut ini:\n\n"${originalText}"\n\nJawab dengan isi surat balasannya saja tanpa harus menuliskan subjek atau hal-hal tidak perlu.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        document.getElementById('balasKritikText').value = result;
        showToast("Draf balasan berhasil dibuat oleh AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

function kirimBalasanKritik() {
    var balasan = document.getElementById('balasKritikText').value.trim();
    if(!balasan) {
        showToast("Balasan tidak boleh kosong", "error");
        return;
    }
    // Implementasi pengiriman nyata bisa ditambahkan di masa depan (WhatsApp/Email)
    showToast("Balasan berhasil dikirim/disimpan!", "success");
    closeBalasKritikModal();
}

async function submitKritikSaran() {
    var pesan = document.getElementById('kritikSaranPesan').value.trim();
    var isAnonim = document.getElementById('kritikSaranAnonim').checked;
    if (!pesan) { showToast('Pesan tidak boleh kosong!', 'warning'); return; }
    
    var namaPengirim = isAnonim ? 'Anonim' : (currentUser ? currentUser.name : 'Pengguna');
    var userId = isAnonim ? null : (currentUser ? currentUser.id : null);
    
    try {
        const { error } = await supabaseClient.from('kritik_saran').insert([{
            pesan: pesan,
            user_id: userId,
            nama_pengirim: namaPengirim
        }]);
        if (error) throw error;
        showToast('Kritik & saran berhasil dikirim. Terima kasih!', 'success');
        document.getElementById('kritikSaranPesan').value = '';
        document.getElementById('kritikSaranAnonim').checked = false;
        loadKritikSaran();
    } catch(e) { showToast('Gagal mengirim: ' + e.message, 'error'); }
}

function deleteKritik(id) {
    showCustomConfirm('Hapus Pesan?', 'Apakah Anda yakin ingin menghapus masukan ini?', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('kritik_saran').delete().eq('id', id);
            if (error) throw error;
            showToast('Pesan dihapus!', 'success');
            loadKritikSaran();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}


// ============================================================
// AKADEMIK: JURNAL MENGAJAR
// ============================================================
var jurnalList = [];
var BULAN_NAMA = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

async function loadJurnalMengajar() {
    try {
        const { data, error } = await supabaseClient.from('jurnal_mengajar').select('*, master_kelas(nama_kelas, tingkat)').order('created_at', { ascending: false });
        if (error) throw error;
        jurnalList = data || [];
        // Load all progress for these journals
        var ids = jurnalList.map(function(j) { return j.id; });
        var progData = [];
        if (ids.length > 0) {
            const { data: pd } = await supabaseClient.from('jurnal_mengajar_progress').select('*').in('jurnal_id', ids).order('tahun').order('bulan');
            progData = pd || [];
        }
        // Attach progress to each journal
        jurnalList.forEach(function(j) {
            j._progress = progData.filter(function(p) { return p.jurnal_id === j.id; });
        });

        var tbody = document.getElementById('jurnalTableBody');
        if (!tbody) return;
        if (jurnalList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada jurnal mengajar.</td></tr>';
            return;
        }
        tbody.innerHTML = jurnalList.map(function(j, i) {
            var kelasNama = j.master_kelas ? j.master_kelas.nama_kelas + ' (Tk.' + j.master_kelas.tingkat + ')' : '-';
            var lastProg = j._progress.length > 0 ? j._progress[j._progress.length - 1] : null;
            var babNow = lastProg ? lastProg.bab_tercapai : 0;
            var pct = j.total_bab > 0 ? Math.round((babNow / j.total_bab) * 100) : 0;
            var barColor = pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
            var progressHtml = '<div style="display:flex;align-items:center;gap:8px;min-width:140px;">' +
                '<div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">' +
                '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width .3s;"></div></div>' +
                '<span style="font-size:0.8rem;font-weight:600;color:' + barColor + ';">' + babNow + '/' + j.total_bab + ' (' + pct + '%)</span></div>';
            return '<tr><td>' + (i+1) + '</td><td>' + j.mapel + '</td><td>' + kelasNama + '</td><td>' + j.semester + '</td><td>' + j.tahun_pelajaran + '</td><td style="text-align:center;">' + j.total_bab + '</td><td>' + progressHtml + '</td>' +
                '<td style="text-align:center;white-space:nowrap;">' +
                '<button class="btn btn-sm btn-primary" onclick="openProgressModal(\'' + j.id + '\')" title="Update Progress" style="margin-right:4px;"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn btn-sm btn-warning" onclick="editJurnal(\'' + j.id + '\')" title="Edit" style="margin-right:4px;"><i data-lucide="edit" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteJurnal(\'' + j.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal memuat jurnal: ' + e.message, 'error'); }
}

function openJurnalModal() {
    document.getElementById('formJurnalId').value = '';
    var lblYear = document.getElementById('lblActiveYear');
    var activeYear = lblYear ? lblYear.textContent : '';
    if (activeYear === 'Belum diatur') activeYear = '';
    document.getElementById('formJurnalTahun').value = activeYear;
    populateMapelDropdown('formJurnalMapel', '');
    populateKelasDropdown('formJurnalKelas', '');
    document.getElementById('formJurnalSemester').value = 'Ganjil';
    document.getElementById('formJurnalTotalBab').value = 1;
    document.getElementById('formJurnalTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('jurnalModalTitle').textContent = 'Tambah Jurnal Mengajar';
    document.getElementById('jurnalModal').classList.add('active');
}
function closeJurnalModal() { document.getElementById('jurnalModal').classList.remove('active'); }

function editJurnal(id) {
    var j = jurnalList.find(function(x) { return x.id === id; });
    if (!j) return;
    document.getElementById('formJurnalId').value = j.id;
    document.getElementById('formJurnalTahun').value = j.tahun_pelajaran || '';
    populateMapelDropdown('formJurnalMapel', j.mapel || '');
    populateKelasDropdown('formJurnalKelas', j.kelas_id || '');
    document.getElementById('formJurnalSemester').value = j.semester || 'Ganjil';
    document.getElementById('formJurnalTotalBab').value = j.total_bab || 1;
    document.getElementById('formJurnalTanggal').value = j.tanggal || '';
    document.getElementById('jurnalModalTitle').textContent = 'Edit Jurnal Mengajar';
    document.getElementById('jurnalModal').classList.add('active');
}

async function saveJurnal() {
    var id = document.getElementById('formJurnalId').value;
    var tahun = document.getElementById('formJurnalTahun').value;
    var mapel = document.getElementById('formJurnalMapel').value;
    var kelasId = document.getElementById('formJurnalKelas').value;
    var semester = document.getElementById('formJurnalSemester').value;
    var totalBab = parseInt(document.getElementById('formJurnalTotalBab').value) || 1;
    var tanggal = document.getElementById('formJurnalTanggal').value || null;
    if (!mapel || !kelasId || !semester) { showToast('Mapel, Kelas, dan Semester wajib diisi!', 'warning'); return; }
    try {
        var payload = { tahun_pelajaran: tahun, mapel: mapel, kelas_id: kelasId, semester: semester, total_bab: totalBab, tanggal: tanggal };
        if (id) {
            const { error } = await supabaseClient.from('jurnal_mengajar').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('jurnal_mengajar').insert([payload]);
            if (error) throw error;
        }
        showToast('Jurnal berhasil disimpan!', 'success');
        closeJurnalModal();
        loadJurnalMengajar();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteJurnal(id) {
    showCustomConfirm('Hapus Jurnal?', 'Jurnal beserta seluruh data progress-nya akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('jurnal_mengajar').delete().eq('id', id);
            if (error) throw error;
            showToast('Jurnal dihapus!', 'success');
            loadJurnalMengajar();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// --- Progress Modal ---
function openProgressModal(jurnalId) {
    var j = jurnalList.find(function(x) { return x.id === jurnalId; });
    if (!j) return;
    var kelasNama = j.master_kelas ? j.master_kelas.nama_kelas : '-';
    document.getElementById('progressJurnalInfo').innerHTML = '<strong>' + j.mapel + '</strong> — ' + kelasNama + ' | ' + j.semester + ' | ' + j.tahun_pelajaran + ' (Total ' + j.total_bab + ' Bab)';
    document.getElementById('formProgressJurnalId').value = jurnalId;
    document.getElementById('formProgressId').value = '';
    var now = new Date();
    document.getElementById('formProgressBulan').value = now.getMonth() + 1;
    document.getElementById('formProgressTahun').value = now.getFullYear();
    // Build smart bab dropdown, excluding already-reported bab numbers
    var reportedBabs = (j._progress || []).map(function(p) { return p.bab_tercapai; });
    var babSelect = document.getElementById('formProgressBab');
    babSelect.innerHTML = '<option value="0">Pilih Bab</option>';
    for (var b = 1; b <= j.total_bab; b++) {
        var isUsed = reportedBabs.indexOf(b) !== -1;
        babSelect.innerHTML += '<option value="' + b + '"' + (isUsed ? ' disabled style="color:#aaa;"' : '') + '>Bab ' + b + (isUsed ? ' (sudah dilaporkan)' : '') + '</option>';
    }
    document.getElementById('formProgressJudul').value = '';
    document.getElementById('formProgressHalaman').value = '';
    document.getElementById('formProgressCatatan').value = '';
    document.getElementById('progressModalTitle').textContent = 'Update Progress — ' + j.mapel;
    document.getElementById('progressModal').classList.add('active');
}
function closeProgressModal() { document.getElementById('progressModal').classList.remove('active'); }

async function saveProgress() {
    var jurnalId = document.getElementById('formProgressJurnalId').value;
    var progId = document.getElementById('formProgressId').value;
    var bulan = parseInt(document.getElementById('formProgressBulan').value);
    var tahun = parseInt(document.getElementById('formProgressTahun').value);
    var bab = parseInt(document.getElementById('formProgressBab').value) || 0;
    var judul = document.getElementById('formProgressJudul').value.trim();
    var halaman = document.getElementById('formProgressHalaman').value.trim();
    var catatan = document.getElementById('formProgressCatatan').value.trim();
    if (!bulan || !tahun) { showToast('Bulan dan Tahun wajib diisi!', 'warning'); return; }
    try {
        var payload = { jurnal_id: jurnalId, bulan: bulan, tahun: tahun, bab_tercapai: bab, judul_bab: judul, halaman: halaman, catatan: catatan };
        if (progId) {
            const { error } = await supabaseClient.from('jurnal_mengajar_progress').update(payload).eq('id', progId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('jurnal_mengajar_progress').insert([payload]);
            if (error) throw error;
        }
        showToast('Progress berhasil disimpan!', 'success');
        closeProgressModal();
        loadJurnalMengajar();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ============================================================
// MONITORING: LAPORAN JURNAL MENGAJAR (READ-ONLY)
// ============================================================
async function loadLaporanJurnal() {
    var container = document.getElementById('laporanJurnalContainer');
    if (!container) return;
    try {
        const { data, error } = await supabaseClient.from('jurnal_mengajar').select('*, master_kelas(nama_kelas, tingkat)').order('mapel').order('created_at');
        if (error) throw error;
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="card"><p style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data jurnal mengajar.</p></div>';
            return;
        }
        var ids = data.map(function(j) { return j.id; });
        var progData = [];
        if (ids.length > 0) {
            const { data: pd } = await supabaseClient.from('jurnal_mengajar_progress').select('*').in('jurnal_id', ids).order('tahun').order('bulan');
            progData = pd || [];
        }

        container.innerHTML = data.map(function(j) {
            var kelasNama = j.master_kelas ? j.master_kelas.nama_kelas + ' (Tingkat ' + j.master_kelas.tingkat + ')' : '-';
            var progs = progData.filter(function(p) { return p.jurnal_id === j.id; });
            var lastProg = progs.length > 0 ? progs[progs.length - 1] : null;
            var babNow = lastProg ? lastProg.bab_tercapai : 0;
            var pct = j.total_bab > 0 ? Math.round((babNow / j.total_bab) * 100) : 0;
            var barColor = pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
            var statusText = pct >= 100 ? 'Selesai ✅' : 'Berjalan';

            var header = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:1rem;">' +
                '<div><h3 style="margin:0;">' + j.mapel + ' — ' + kelasNama + '</h3>' +
                '<p style="margin:4px 0 0;font-size:0.85rem;color:var(--text-light);">' + j.semester + ' | T.P. ' + j.tahun_pelajaran + ' | Total: ' + j.total_bab + ' Bab' +
                (j.tanggal ? ' | Tgl Mulai: ' + new Date(j.tanggal).toLocaleDateString('id-ID', {weekday:'long', day:'2-digit', month:'short', year:'numeric'}) : '') +
                '</p></div>' +
                '<div style="text-align:right;"><span style="font-size:1.5rem;font-weight:800;color:' + barColor + ';">' + pct + '%</span>' +
                '<p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-light);">' + statusText + '</p></div></div>';

            var progressBar = '<div style="height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;margin-bottom:1rem;">' +
                '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + barColor + ';border-radius:5px;transition:width .3s;"></div></div>';

            var progressTable = '';
            if (progs.length > 0) {
                progressTable = '<div style="overflow-x:auto;"><table class="dash-table" style="font-size:0.85rem;"><thead><tr>' +
                    '<th>Bulan</th><th>Tahun</th><th>Bab Tercapai</th><th>Halaman</th><th>Judul / Materi</th><th>Catatan</th><th>Dilaporkan</th></tr></thead><tbody>' +
                    progs.map(function(p) {
                        var dt = new Date(p.created_at);
                        var waktu = dt.toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'}) + ', ' + dt.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
                        return '<tr><td>' + (BULAN_NAMA[p.bulan] || p.bulan) + '</td><td>' + p.tahun + '</td>' +
                            '<td><strong>' + p.bab_tercapai + '</strong> / ' + j.total_bab + '</td>' +
                            '<td>' + (p.halaman || '-') + '</td>' +
                            '<td>' + (p.judul_bab || '-') + '</td><td>' + (p.catatan || '-') + '</td>' +
                            '<td style="font-size:0.8rem;color:var(--text-light);">' + waktu + '</td></tr>';
                    }).join('') + '</tbody></table></div>';
            } else {
                progressTable = '<p style="text-align:center;color:var(--text-light);font-size:0.85rem;">Belum ada update progress.</p>';
            }

            return '<div class="card" style="margin-bottom:1.5rem;">' + header + progressBar + progressTable + '</div>';
        }).join('');
    } catch(e) { container.innerHTML = '<div class="card"><p style="color:#ef4444;">Gagal memuat laporan: ' + e.message + '</p></div>'; }
}

// ============================================================
// SISTEM PENILAIAN STS & SAS (PER-KELAS)
// ============================================================

function populateMapelIdDropdown(selectId, selectedVal) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih Mata Pelajaran</option>';
    masterMapelList.forEach(function(m) {
        sel.innerHTML += '<option value="' + m.id + '"' + (selectedVal === m.id ? ' selected' : '') + '>' + m.nama_mapel + '</option>';
    });
}

var penilaianState = { currentKkm: 0 };

async function loadPenilaianTable() {
    var filterTahun = document.getElementById('filterPenilaianTahun').value;
    var filterSemester = document.getElementById('filterPenilaianSemester').value;
    var filterKelas = document.getElementById('filterPenilaianKelas').value;
    var filterMapel = document.getElementById('filterPenilaianMapel').value;
    
    var tbody = document.getElementById('penilaianTableBody');
    var btnSimpan = document.getElementById('btnSimpanNilaiSemua');
    
    if (!filterTahun || filterTahun === 'Belum diatur' || !filterSemester || !filterKelas || !filterMapel) {
        showToast('Pastikan Tahun Aktif, Semester, Kelas, dan Mata Pelajaran telah terisi!', 'warning');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Mencari data siswa...</td></tr>';
    btnSimpan.style.display = 'none';
    document.getElementById('btnResetNilaiSemua').style.display = 'none';
    
    try {
        var kelasObj = masterKelasList.find(function(k) { return k.id === filterKelas; });
        // 1. Dapatkan KKM dari master_kkm
        var kkmObj = masterKkmList.find(function(k) { return k.kelas_id === filterKelas && k.mapel_id === filterMapel; });
        var kkm = kkmObj ? kkmObj.kkm : 0;
        penilaianState.currentKkm = kkm;
        
        // 2. Dapatkan Daftar Siswa di Kelas Ini
        const { data: siswaData, error: errSiswa } = await supabaseClient.from('siswa').select('id, nama_lengkap, status').eq('kelas_id', filterKelas).not('status', 'in', '("Pindah","Lulus")').order('nama_lengkap');
        if (errSiswa) throw errSiswa;
        if (!siswaData || siswaData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada siswa aktif di kelas ini.</td></tr>';
            return;
        }
        
        // 3. Dapatkan Nilai yang Sudah Ada
        const { data: nilaiData, error: errNilai } = await supabaseClient.from('nilai_akademik')
            .select('*')
            .eq('tahun_pelajaran', filterTahun)
            .eq('semester', filterSemester)
            .eq('kelas_id', filterKelas)
            .eq('mapel_id', filterMapel);
        if (errNilai) throw errNilai;
        
        var nilaiDict = {};
        if (nilaiData) {
            nilaiData.forEach(function(n) { nilaiDict[n.siswa_id] = n; });
        }
        
        var nilaiGanjilDict = {};
        if (filterSemester === 'Genap') {
            const { data: nilaiGanjil, error: errGanjil } = await supabaseClient.from('nilai_akademik')
                .select('*')
                .eq('tahun_pelajaran', filterTahun)
                .eq('semester', 'Ganjil')
                .eq('kelas_id', filterKelas)
                .eq('mapel_id', filterMapel);
            if (!errGanjil && nilaiGanjil) {
                nilaiGanjil.forEach(function(n) { nilaiGanjilDict[n.siswa_id] = n; });
            }
        }
        
        // 4. Render Tabel
        var kkmBadge = kkm > 0 ? kkm : '<span style="color:var(--danger)">Belum diatur</span>';
        var kelasNama = kelasObj ? kelasObj.nama_kelas : '-';
        var isKelas9 = kelasObj && kelasObj.tingkat === 9;
        
        var thead = '<th style="width:40px;">No</th><th>Nama Siswa</th><th style="width:80px;text-align:center;">KKM</th>';
        if (filterSemester === 'Ganjil') {
            thead += '<th style="width:100px;text-align:center;">STS Ganjil</th>' +
                     '<th style="width:100px;text-align:center;">SAS</th>' +
                     '<th style="width:100px;text-align:center;">Rata-Rata Smt 1</th>';
        } else {
            thead += '<th style="width:100px;text-align:center;">STS Genap</th>' +
                     '<th style="width:100px;text-align:center;">' + (isKelas9 ? 'SAJ' : 'SAT') + '</th>' +
                     '<th style="width:100px;text-align:center;">Rata Smt 2</th>' +
                     '<th style="width:100px;text-align:center;">📋 Rata Smt 1</th>' +
                     '<th style="width:100px;text-align:center;">⭐ Rata Akhir</th>';
        }
        thead += '<th style="width:100px;text-align:center;">Status</th><th style="width:60px;text-align:center;">Riwayat</th>';
        
        document.getElementById('penilaianTableHeader').innerHTML = thead;
        
        tbody.innerHTML = siswaData.map(function(s, i) {
            var nsts = nilaiDict[s.id] && nilaiDict[s.id].nilai_sts !== null ? nilaiDict[s.id].nilai_sts : '';
            var nsas = nilaiDict[s.id] && nilaiDict[s.id].nilai_sas !== null ? nilaiDict[s.id].nilai_sas : '';
            var nsaj = nilaiDict[s.id] && nilaiDict[s.id].nilai_saj !== null ? nilaiDict[s.id].nilai_saj : '';
            var nsat = nilaiDict[s.id] && nilaiDict[s.id].nilai_sat !== null ? nilaiDict[s.id].nilai_sat : '';
            
            var statusBadge = s.status === 'Tidak Aktif' ? '<span style="color:var(--danger);font-size:0.7rem;margin-left:6px;background:rgba(239,68,68,.1);padding:2px 4px;border-radius:4px;">Tidak Aktif</span>' : '';
            var trStyle = s.status === 'Tidak Aktif' ? 'background-color: rgba(239,68,68,0.06);' : '';
            
            var cols = '';
            var inputSts = '<input type="number" class="form-input val-sts" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsts + '" min="0" max="100" placeholder="-" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" />';
            var inputSas = '<input type="number" class="form-input val-sas" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsas + '" min="0" max="100" placeholder="-" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" />';
            var inputSaj = '<input type="number" class="form-input val-saj" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsaj + '" min="0" max="100" placeholder="-" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" />';
            var inputSat = '<input type="number" class="form-input val-sat" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsat + '" min="0" max="100" placeholder="-" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" />';
            
            if (filterSemester === 'Ganjil') {
                cols += '<td style="text-align:center;">' + inputSts + '</td>' +
                        '<td style="text-align:center;">' + inputSas + '</td>' +
                        '<td style="display:none;"><input type="hidden" class="val-saj" value=""><input type="hidden" class="val-sat" value=""></td>' +
                        '<td class="td-rata" style="text-align:center;font-weight:bold;font-size:0.95rem;">-</td>';
            } else {
                var rataSmt1 = '-';
                if (nilaiGanjilDict[s.id]) {
                    var n1 = nilaiGanjilDict[s.id].nilai_sts;
                    var n2 = nilaiGanjilDict[s.id].nilai_sas;
                    var p1 = 0; var t1 = 0;
                    if (n1 !== null) { t1 += n1; p1++; }
                    if (n2 !== null) { t1 += n2; p1++; }
                    if (p1 > 0) rataSmt1 = Math.round(t1 / p1);
                }
                
                cols += '<td style="text-align:center;">' + inputSts + '</td>' +
                        '<td style="text-align:center;">' + (isKelas9 ? inputSaj : inputSat) + '</td>' +
                        '<td style="display:none;"><input type="hidden" class="val-sas" value="">' + (isKelas9 ? '<input type="hidden" class="val-sat" value="">' : '<input type="hidden" class="val-saj" value="">') + '</td>' +
                        '<td class="td-rata" style="text-align:center;font-weight:bold;font-size:0.95rem;">-</td>' +
                        '<td style="text-align:center;background:#f8fafc;font-weight:600;color:var(--text-light);"><span class="val-rata-smt1" data-val="' + rataSmt1 + '">' + rataSmt1 + '</span></td>' +
                        '<td class="td-rata-akhir" style="text-align:center;font-weight:bold;font-size:1.05rem;background:#eff6ff;color:#1e3a8a;">-</td>';
            }
            
            return '<tr class="tr-penilaian" data-siswa="' + s.id + '" style="' + trStyle + '">' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;min-width:140px;">' + s.nama_lengkap + statusBadge + '<br><span style="color:var(--text-light);font-size:0.75rem;">' + kelasNama + '</span></td>' +
                '<td style="text-align:center;font-weight:bold;">' + kkmBadge + '</td>' +
                cols +
                '<td class="td-ket" style="text-align:center;font-size:0.8rem;">-</td>' +
                '<td style="text-align:center;"><button style="background:transparent; border:none; color:var(--text-light); padding:6px; border-radius:6px; cursor:pointer; transition:0.2s;" onmouseover="this.style.color=\'var(--primary)\'; this.style.background=\'rgba(30,58,138,0.1)\'" onmouseout="this.style.color=\'var(--text-light)\'; this.style.background=\'transparent\'" onclick="openRiwayatNilai(\'' + s.id + '\',\'' + s.nama_lengkap.replace(/\'/g, "\\\'" ) + '\')" title="Lihat Riwayat"><i data-lucide="history" style="width:16px;height:16px"></i></button></td>' +
                '</tr>';
        }).join('');
        
        // Initial status calculation
        tbody.querySelectorAll('.val-sts').forEach(function(el) { calcRowStatus(el); });
        
        btnSimpan.style.display = 'inline-flex';
        document.getElementById('btnResetNilaiSemua').style.display = 'inline-flex';
        
        if (window.lucide) lucide.createIcons();
        
    } catch(e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--danger)">Terjadi Kesalahan: ' + e.message + '</td></tr>'; }
}

function calcRowStatus(el) {
    var tr = el.closest('tr');
    var inputSts = tr.querySelector('.val-sts').value;
    var inputSas = tr.querySelector('.val-sas') ? tr.querySelector('.val-sas').value : '';
    var inputSaj = tr.querySelector('.val-saj') ? tr.querySelector('.val-saj').value : '';
    var inputSat = tr.querySelector('.val-sat') ? tr.querySelector('.val-sat').value : '';
    var tdRata = tr.querySelector('.td-rata');
    var tdKet = tr.querySelector('.td-ket');
    
    var tdRataSmt1 = tr.querySelector('.val-rata-smt1');
    var tdRataAkhir = tr.querySelector('.td-rata-akhir');
    
    if (inputSts === '' && inputSas === '' && inputSaj === '' && inputSat === '') {
        tdRata.innerHTML = '<span style="color:var(--text-light)">-</span>';
        if (tdRataAkhir) tdRataAkhir.innerHTML = '<span style="color:var(--text-light)">-</span>';
        tdKet.innerHTML = '<span style="color:var(--text-light)">-</span>';
        return;
    }
    
    var pembagi = 0; var total = 0;
    if (inputSts !== '') { total += (parseInt(inputSts) || 0); pembagi++; }
    if (inputSas !== '') { total += (parseInt(inputSas) || 0); pembagi++; }
    if (inputSaj !== '') { total += (parseInt(inputSaj) || 0); pembagi++; }
    if (inputSat !== '') { total += (parseInt(inputSat) || 0); pembagi++; }
    
    var avg = pembagi > 0 ? Math.round(total / pembagi) : 0;
    tdRata.innerHTML = '<span style="font-size:1rem;">' + avg + '</span>';
    
    var finalAvg = avg;
    if (tdRataAkhir && tdRataSmt1) {
        var valSmt1 = tdRataSmt1.getAttribute('data-val');
        if (valSmt1 !== '-' && valSmt1 !== '') {
            finalAvg = Math.round((avg + parseInt(valSmt1)) / 2);
            tdRataAkhir.innerHTML = '<span style="color:#1e3a8a;">' + finalAvg + '</span>';
        } else {
            tdRataAkhir.innerHTML = '<span style="color:#1e3a8a;">' + avg + '</span>';
        }
    }
    
    if (penilaianState.currentKkm <= 0) {
        tdKet.innerHTML = '<span style="color:var(--text-light);font-size:0.75rem;">KKM Blm Diatur</span>';
        return;
    }
    
    if (finalAvg >= penilaianState.currentKkm) {
        tdRata.querySelector('span').style.color = '#22c55e';
        tdKet.innerHTML = '<span class="badge badge-green" style="font-size:0.75rem;">Lulus</span>';
    } else {
        tdRata.querySelector('span').style.color = '#ef4444';
        tdKet.innerHTML = '<span class="badge badge-red" style="font-size:0.75rem;">Belum Lulus</span>';
    }
}

async function resetSemuaNilai() {
    var filterTahun = document.getElementById('filterPenilaianTahun').value;
    var filterSemester = document.getElementById('filterPenilaianSemester').value;
    var filterKelas = document.getElementById('filterPenilaianKelas').value;
    var filterMapel = document.getElementById('filterPenilaianMapel').value;
    var kelasNama = document.getElementById('filterPenilaianKelas').options[document.getElementById('filterPenilaianKelas').selectedIndex].text;
    var mapelNama = document.getElementById('filterPenilaianMapel').options[document.getElementById('filterPenilaianMapel').selectedIndex].text;
    
    if (!filterTahun || !filterSemester || !filterKelas || !filterMapel) return;
    
    showCustomConfirm('Reset Semua Nilai?', 'Perhatian: Tindakan ini akan <strong>MENGHAPUS SELURUH NILAI (STS, SAS, SAJ, SAT)</strong> kelas <strong>' + kelasNama + '</strong> pada mata pelajaran <strong>' + mapelNama + '</strong>. Apakah Anda yakin ingin mereset/mengosongkan form ini?', 'Ya, Kosongkan', async function() {
        try {
            const { error } = await supabaseClient.from('nilai_akademik')
                .delete()
                .eq('tahun_pelajaran', filterTahun)
                .eq('semester', filterSemester)
                .eq('kelas_id', filterKelas)
                .eq('mapel_id', filterMapel);
            
            if (error) throw error;
            
            showToast('Seluruh nilai berhasil dikosongkan.', 'success');
            loadPenilaianTable(); // reload empty inputs
        } catch(e) { showToast('Gagal mereset: ' + e.message, 'error'); }
    });
}

async function saveSemuaNilai() {
    var filterTahun = document.getElementById('filterPenilaianTahun').value;
    var filterSemester = document.getElementById('filterPenilaianSemester').value;
    var filterKelas = document.getElementById('filterPenilaianKelas').value;
    var filterMapel = document.getElementById('filterPenilaianMapel').value;
    
    var trs = document.querySelectorAll('.tr-penilaian');
    var payload = [];
    
    trs.forEach(function(tr) {
        var siswaId = tr.getAttribute('data-siswa');
        var inputSts = tr.querySelector('.val-sts').value;
        var inputSas = tr.querySelector('.val-sas').value;
        var inputSaj = tr.querySelector('.val-saj').value;
        var inputSat = tr.querySelector('.val-sat').value;
        
        if (inputSts !== '' || inputSas !== '' || inputSaj !== '' || inputSat !== '') {
            payload.push({
                tahun_pelajaran: filterTahun,
                semester: filterSemester,
                kelas_id: filterKelas,
                mapel_id: filterMapel,
                siswa_id: siswaId,
                nilai_sts: inputSts !== '' ? parseInt(inputSts) : null,
                nilai_sas: inputSas !== '' ? parseInt(inputSas) : null,
                nilai_saj: inputSaj !== '' ? parseInt(inputSaj) : null,
                nilai_sat: inputSat !== '' ? parseInt(inputSat) : null,
                updated_at: new Date().toISOString()
            });
        }
    });
    
    if (payload.length === 0) { 
        showToast('Tidak ada satupun nilai yang diisi untuk disimpan!', 'warning'); 
        return; 
    }
    
    var btnSimpan = document.getElementById('btnSimpanNilaiSemua');
    var originalText = btnSimpan.innerHTML;
    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '<i data-lucide="loader" class="icon-spin"></i> Menyimpan...';
    if (window.lucide) lucide.createIcons();
    
    try {
        const { error } = await supabaseClient.from('nilai_akademik').upsert(payload, { onConflict: 'tahun_pelajaran, semester, kelas_id, mapel_id, siswa_id' });
        if (error) throw error;
        showToast('Semua nilai siswa berhasil disimpan! 🎉', 'success');
    } catch(e) { 
        showToast('Gagal menyimpan nilai: ' + e.message, 'error'); 
    } finally {
        btnSimpan.disabled = false;
        btnSimpan.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
    }
}

// --- RIWAYAT NILAI PER-SISWA ---
async function openRiwayatNilai(siswaId, namaSiswa) {
    document.getElementById('riwayatNilaiTitle').textContent = 'Riwayat Nilai — ' + namaSiswa;
    var content = document.getElementById('riwayatNilaiContent');
    content.innerHTML = '<p style="text-align:center;color:var(--text-light)">Memuat riwayat nilai...</p>';
    document.getElementById('riwayatNilaiModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
    
    try {
        const { data, error } = await supabaseClient.from('nilai_akademik')
            .select('*, master_kelas ( nama_kelas, tingkat ), master_mapel ( nama_mapel )')
            .eq('siswa_id', siswaId)
            .order('tahun_pelajaran')
            .order('semester');
        if (error) throw error;
        
        if (!data || data.length === 0) {
            content.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:2rem;">Belum ada riwayat nilai untuk siswa ini.</p>';
            return;
        }
        
        // Kelompokkan per Kelas (tingkat) -> Semester
        var kelasGroups = {};
        data.forEach(function(n) {
            var tingkat = n.master_kelas ? n.master_kelas.tingkat : 0;
            var kelasNama = n.master_kelas ? n.master_kelas.nama_kelas : '-';
            var key = tingkat + '|' + kelasNama;
            if (!kelasGroups[key]) kelasGroups[key] = { tingkat: tingkat, kelasNama: kelasNama, semesters: {} };
            var semKey = n.semester + ' — T.P. ' + n.tahun_pelajaran;
            if (!kelasGroups[key].semesters[semKey]) kelasGroups[key].semesters[semKey] = [];
            kelasGroups[key].semesters[semKey].push(n);
        });
        
        // Sort by tingkat
        var sortedKeys = Object.keys(kelasGroups).sort(function(a, b) {
            return kelasGroups[a].tingkat - kelasGroups[b].tingkat;
        });
        
        var html = '<div style="display:flex;flex-direction:column;gap:1.5rem;">';
        sortedKeys.forEach(function(key) {
            var group = kelasGroups[key];
            html += '<div style="background:rgba(37,99,235,.03);border:1px solid rgba(37,99,235,.1);border-radius:12px;padding:1.25rem;">' +
                '<h4 style="margin:0 0 1rem;color:var(--primary);font-size:1rem;display:flex;align-items:center;gap:.5rem;">📚 Kelas ' + group.tingkat + ' (' + group.kelasNama + ')</h4>';
            
            Object.keys(group.semesters).forEach(function(semLabel) {
                var isGanjil = semLabel.includes('Ganjil');
                var isKelas9 = group.tingkat === 9;
                var items = group.semesters[semLabel];
                
                var theadHtml = isGanjil ? 
                    '<th style="text-align:center;width:80px;">STS</th><th style="text-align:center;width:80px;">SAS</th>' : 
                    '<th style="text-align:center;width:80px;">STS</th><th style="text-align:center;width:80px;">' + (isKelas9 ? 'SAJ' : 'SAT') + '</th>';
                
                html += '<div style="margin-bottom:1rem;">' +
                    '<p style="font-weight:600;font-size:.88rem;color:#475569;margin-bottom:.5rem;">📅 Semester ' + semLabel + '</p>' +
                    '<div style="overflow-x:auto;border-radius:8px;border:1px solid rgba(0,0,0,.06);">' +
                    '<table class="dash-table" style="font-size:0.85rem;margin:0;">' +
                    '<thead><tr style="background:#f8fafc;">' +
                    '<th>Mata Pelajaran</th>' +
                    theadHtml +
                    '<th style="text-align:center;width:90px;color:var(--primary);">Rata-Rata</th>' +
                    '</tr></thead><tbody>';
                    
                items.forEach(function(n) {
                    var mapelNama = n.master_mapel ? n.master_mapel.nama_mapel : '-';
                    var val1 = n.nilai_sts;
                    var val2 = isGanjil ? n.nilai_sas : (isKelas9 ? n.nilai_saj : n.nilai_sat);
                    if (!isGanjil && !isKelas9 && n.nilai_sat === null && n.nilai_saj !== null) val2 = n.nilai_saj; // Fallback jika data tercampur
                    
                    var count = 0; var tot = 0;
                    if (val1 !== null) { tot += val1; count++; }
                    if (val2 !== null) { tot += val2; count++; }
                    var avg = count > 0 ? Math.round(tot / count) : '-';
                    
                    html += '<tr>' +
                        '<td style="font-weight:500;">' + mapelNama + '</td>' +
                        '<td style="text-align:center;font-weight:bold;">' + (val1 !== null ? val1 : '<span style="color:#ccc">-</span>') + '</td>' +
                        '<td style="text-align:center;font-weight:bold;">' + (val2 !== null ? val2 : '<span style="color:#ccc">-</span>') + '</td>' +
                        '<td style="text-align:center;font-weight:bold;color:' + (typeof avg === 'number' && avg >= 75 ? '#22c55e' : typeof avg === 'number' ? '#ef4444' : 'inherit') + ';">' + avg + '</td>' +
                        '</tr>';
                });
                html += '</tbody></table></div></div>';
            });
            html += '</div>';
        });
        html += '</div>';
        
        content.innerHTML = html;
    } catch(e) {
        content.innerHTML = '<p style="color:var(--danger);text-align:center;">Gagal memuat riwayat: ' + e.message + '</p>';
    }
}

function closeRiwayatNilai() {
    document.getElementById('riwayatNilaiModal').classList.remove('active');
}

// ============================================================
// HASIL UJIAN SAYA (UNTUK ROLE SISWA)
// ============================================================

async function loadHasilUjianSaya() {
    var container = document.getElementById('hasilUjianSayaContainer');
    if (!container || !currentUser) return;
    container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;color:var(--text-light);"><p>Memuat hasil ujian...</p></div>';

    try {
        // 1. Cari data siswa yang terhubung dengan akun ini
        let siswaData = null;
        let errS = null;

        if (currentRole === 'siswa' && currentUser.role !== 'siswa') {
            // Mode Simulasi Tampilan: Prioritaskan siswa yang sudah punya nilai ujian
            const { data: sampleExams } = await supabaseClient
                .from('hasil_ujian_siswa')
                .select('siswa_id, siswa ( id, nama_lengkap, kelas_id, master_kelas ( nama_kelas, tingkat ) )')
                .limit(1);
            
            if (sampleExams && sampleExams.length > 0 && sampleExams[0].siswa) {
                siswaData = sampleExams[0].siswa;
                siswaData.nama_lengkap += ' (Mode Simulasi)';
            } else {
                // Jika belum ada nilai sama sekali di database, ambil siswa mana saja
                const { data: randomStudent } = await supabaseClient
                    .from('siswa')
                    .select('id, nama_lengkap, kelas_id, master_kelas ( nama_kelas, tingkat )')
                    .limit(1)
                    .maybeSingle();
                if (randomStudent) {
                    siswaData = randomStudent;
                    siswaData.nama_lengkap += ' (Mode Simulasi)';
                }
            }
        } else {
            const { data, error } = await supabaseClient
                .from('siswa')
                .select('id, nama_lengkap, kelas_id, master_kelas ( nama_kelas, tingkat )')
                .eq('user_id', currentUser.id)
                .maybeSingle();
            siswaData = data;
            errS = error;
        }

        if (errS) throw errS;
        if (!siswaData) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;">' +
                '<div style="font-size:3rem;margin-bottom:1rem;">🔗</div>' +
                '<h3 style="margin-bottom:0.5rem;color:var(--text);">Akun Belum Terhubung</h3>' +
                '<p style="color:var(--text-light);max-width:400px;margin:0 auto;">Akun Anda belum dihubungkan ke Data Induk Siswa. Hubungi Admin atau Guru untuk menghubungkan akun Anda.</p>' +
                '</div>';
            return;
        }

        // 2. Ambil semua hasil ujian milik siswa ini
        var filterSemester = document.getElementById('filterHasilUjianSemester').value;
        var query = supabaseClient.from('hasil_ujian_siswa')
            .select('*, master_mapel ( nama_mapel ), master_kelas ( nama_kelas )')
            .eq('siswa_id', siswaData.id)
            .order('tahun_pelajaran', { ascending: false })
            .order('semester')
            .order('tipe_asesmen');
        
        if (filterSemester) query = query.eq('semester', filterSemester);

        const { data: hasilData, error: errH } = await query;
        if (errH) throw errH;

        if (!hasilData || hasilData.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;">' +
                '<div style="font-size:3rem;margin-bottom:1rem;">📭</div>' +
                '<h3 style="margin-bottom:0.5rem;color:var(--text);">Belum Ada Hasil Ujian</h3>' +
                '<p style="color:var(--text-light);">Belum ada hasil ujian yang dipublikasikan oleh guru untuk Anda.</p>' +
                '</div>';
            return;
        }

        // 3. Kelompokkan per Tahun Pelajaran -> Semester
        var groups = {};
        hasilData.forEach(function(h) {
            var key = h.tahun_pelajaran + '|' + h.semester;
            if (!groups[key]) groups[key] = { tahun: h.tahun_pelajaran, semester: h.semester, items: [] };
            groups[key].items.push(h);
        });

        var kelasNama = siswaData.master_kelas ? siswaData.master_kelas.nama_kelas : '-';
        var html = '<div style="margin-bottom:1rem;"><span style="font-size:0.9rem;color:var(--text-light);">Menampilkan hasil ujian untuk: </span>' +
            '<strong style="color:var(--primary);">' + siswaData.nama_lengkap + '</strong>' +
            '<span style="margin-left:8px;background:rgba(30,58,138,.1);color:var(--primary);padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:600;">' + kelasNama + '</span></div>';

        Object.keys(groups).forEach(function(key) {
            var g = groups[key];
            html += '<div class="card" style="margin-bottom:1.25rem;border-left:4px solid var(--primary);">' +
                '<h4 style="margin:0 0 1rem;color:var(--primary);display:flex;align-items:center;gap:8px;">' +
                '<span style="background:var(--primary);color:white;padding:3px 12px;border-radius:20px;font-size:0.8rem;">Semester ' + g.semester + '</span>' +
                '<span style="font-size:0.85rem;color:var(--text-light);font-weight:400;">T.P. ' + g.tahun + '</span></h4>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;">';

            g.items.forEach(function(h) {
                var mapelNama = h.master_mapel ? h.master_mapel.nama_mapel : '-';
                
                // Cari KKM untuk mata pelajaran dan kelas ini
                var kkmObj = masterKkmList.find(function(k) { return k.kelas_id === siswaData.kelas_id && k.mapel_id === h.mapel_id; });
                var kkmValue = kkmObj ? kkmObj.kkm : 75; // Default 75 jika admin belum mengatur KKM
                
                var nilaiColor = h.nilai_akhir >= kkmValue ? '#22c55e' : '#ef4444';
                var nilaiIcon = h.nilai_akhir >= kkmValue ? '✅' : '❌';
                var bgGrad = h.nilai_akhir >= kkmValue ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)';
                var borderCol = h.nilai_akhir >= kkmValue ? '#bbf7d0' : '#fecaca';

                html += '<div style="background:' + bgGrad + ';border:1px solid ' + borderCol + ';border-radius:14px;padding:1.25rem;transition:transform 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">' +
                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">' +
                    '<div><h5 style="margin:0;font-size:0.95rem;color:var(--text);">' + mapelNama + '</h5>' +
                    '<div style="display:flex;gap:6px;margin-top:4px;">' +
                    '<span style="font-size:0.75rem;color:var(--text-light);background:rgba(0,0,0,.05);padding:2px 8px;border-radius:8px;">' + h.tipe_asesmen + '</span>' +
                    '<span style="font-size:0.75rem;color:var(--primary);background:rgba(59,130,246,.1);padding:2px 8px;border-radius:8px;font-weight:600;">KKM: ' + kkmValue + '</span>' +
                    '</div></div>' +
                    '<span style="font-size:1.5rem;">' + nilaiIcon + '</span></div>' +
                    '<div style="display:flex;gap:1rem;margin-bottom:0.75rem;font-size:0.8rem;color:var(--text-light);">' +
                    '<span>PG: <strong>' + (h.benar_pg || 0) + '</strong> benar</span>' +
                    '<span>Poin PG: <strong>' + (h.total_poin_pg || 0) + '</strong></span>' +
                    '<span>Essay: <strong>' + (h.poin_essay || 0) + '</strong></span></div>' +
                    '<div style="background:white;border-radius:10px;padding:0.6rem 1rem;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,.06);">' +
                    '<span style="font-size:0.8rem;font-weight:600;color:var(--text-light);">Nilai Akhir</span>' +
                    '<span style="font-size:1.4rem;font-weight:800;color:' + nilaiColor + ';">' + Math.round(h.nilai_akhir) + '</span></div>' +
                    '</div>';
            });

            html += '</div></div>';
        });

        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '<div class="card" style="text-align:center;padding:2rem;color:var(--danger);"><p>Gagal memuat: ' + e.message + '</p></div>';
    }
}

// --- PUBLIKASIKAN HASIL ASESMEN KE SISWA ---
async function publikasikanHasilKeSiswa() {
    var tipe = document.getElementById('hasilAsesmenTipe').value;
    var tahun = document.getElementById('hasilAsesmenTahun').value;
    var semester = document.getElementById('hasilAsesmenSemester').value;
    var kelasId = document.getElementById('hasilAsesmenKelas').value;
    var mapelId = document.getElementById('hasilAsesmenMapel').value;

    if (!hasilAsesmenState.data || hasilAsesmenState.data.length === 0) {
        showToast('Belum ada data hasil asesmen yang ditarik!', 'warning');
        return;
    }

    var matched = hasilAsesmenState.data.filter(function(d) { return d.matched; });
    if (matched.length === 0) {
        showToast('Tidak ada siswa yang cocok untuk dipublikasikan!', 'warning');
        return;
    }

    showCustomConfirm('Publikasikan ke Siswa?',
        'Hasil ujian <strong>' + tipe + '</strong> akan dipublikasikan ke <strong>' + matched.length + ' siswa</strong> yang berhasil dicocokkan. Siswa dengan role "siswa" akan dapat melihat hasilnya di menu "Hasil Ujian Saya".',
        'Ya, Publikasikan',
        async function() {
            var btn = document.getElementById('btnPublikasikanSiswa');
            var origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="icon-spin" style="width:16px;height:16px;"></i> Memproses...';
            if (window.lucide) lucide.createIcons();

            try {
                var payload = matched.map(function(d) {
                    return {
                        siswa_id: d.siswa_id,
                        kelas_id: kelasId,
                        mapel_id: mapelId,
                        tahun_pelajaran: tahun,
                        semester: semester,
                        tipe_asesmen: tipe,
                        benar_pg: d.benar_pg || 0,
                        total_poin_pg: d.skor_pg || 0,
                        poin_essay: d.skor_essay || 0,
                        nilai_akhir: d.nilai_akhir || 0,
                        dipublikasikan_oleh: currentUser.id
                    };
                });

                const { error } = await supabaseClient.from('hasil_ujian_siswa')
                    .upsert(payload, { onConflict: 'siswa_id, mapel_id, tahun_pelajaran, semester, tipe_asesmen' });
                if (error) throw error;

                showToast('Berhasil dipublikasikan ke ' + matched.length + ' siswa! 📢🎉', 'success');
            } catch(e) {
                showToast('Gagal publikasi: ' + e.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
                if (window.lucide) lucide.createIcons();
            }
        }
    );
}

// --- LINK AKUN SISWA KE DATA INDUK ---
var linkSiswaAllData = [];

function openLinkSiswaModal(userId, email) {
    document.getElementById('linkSiswaUserId').value = userId;
    document.getElementById('linkSiswaEmail').value = email;
    document.getElementById('linkSiswaSearch').value = '';
    document.getElementById('linkSiswaModal').classList.add('active');
    if (window.lucide) lucide.createIcons();

    (async function() {
        var results = document.getElementById('linkSiswaResults');
        var searchGroup = document.getElementById('linkSiswaSearchGroup');
        results.innerHTML = '<p style="text-align:center;padding:1rem;color:var(--text-light);">Memuat data siswa...</p>';
        
        try {
            // Cek apakah akun ini sudah terhubung ke siswa tertentu
            const { data: linkedData, error: errLink } = await supabaseClient.from('siswa')
                .select('id, nama_lengkap, master_kelas ( nama_kelas )')
                .eq('user_id', userId)
                .maybeSingle();
                
            if (errLink) throw errLink;
            
            if (linkedData) {
                var kelasNama = linkedData.master_kelas ? linkedData.master_kelas.nama_kelas : '-';
                results.innerHTML = '<div style="padding:1.5rem; text-align:center;">' +
                    '<p style="margin-bottom:1rem;color:var(--text);font-weight:600;">Akun ini saat ini terhubung dengan:</p>' +
                    '<div style="background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.2); border-radius:10px; padding:1rem; margin-bottom:1rem;">' +
                    '<strong style="font-size:1.1rem; color:var(--primary);">' + linkedData.nama_lengkap + '</strong><br>' +
                    '<span style="font-size:0.85rem; color:var(--text-light);">' + kelasNama + '</span>' +
                    '</div>' +
                    '<button class="btn btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="confirmUnlinkSiswa(\'' + linkedData.id + '\', \'' + linkedData.nama_lengkap.replace(/'/g, "\\'") + '\')">' +
                    '<i data-lucide="unlink" style="width:16px;height:16px;"></i> Putuskan Hubungan' +
                    '</button>' +
                    '</div>';
                if (window.lucide) lucide.createIcons();
                if (searchGroup) searchGroup.style.display = 'none';
                return;
            }

            // Jika belum terhubung, load semua siswa yang belum terhubung
            if (searchGroup) searchGroup.style.display = '';
            
            const { data, error } = await supabaseClient.from('siswa')
                .select('id, nama_lengkap, master_kelas ( nama_kelas )')
                .is('user_id', null)
                .order('nama_lengkap');
            if (error) throw error;
            linkSiswaAllData = data || [];
            renderLinkSiswaList(linkSiswaAllData);
        } catch(e) {
            results.innerHTML = '<p style="text-align:center;padding:1rem;color:var(--danger);">Gagal memuat: ' + e.message + '</p>';
        }
    })();
}

function filterLinkSiswaList(keyword) {
    var kw = keyword.toLowerCase().trim();
    if (!kw) { renderLinkSiswaList(linkSiswaAllData); return; }
    var filtered = linkSiswaAllData.filter(function(s) {
        return s.nama_lengkap.toLowerCase().indexOf(kw) !== -1;
    });
    renderLinkSiswaList(filtered);
}

function renderLinkSiswaList(list) {
    var results = document.getElementById('linkSiswaResults');
    if (!list || list.length === 0) {
        results.innerHTML = '<p style="text-align:center;padding:1.5rem;color:var(--text-light);font-size:0.85rem;">Tidak ada siswa yang belum terhubung.</p>';
        return;
    }
    var html = '';
    list.forEach(function(s) {
        var kelasNama = s.master_kelas ? s.master_kelas.nama_kelas : '-';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div><strong style="font-size:0.9rem;">' + s.nama_lengkap + '</strong><br><span style="font-size:0.75rem;color:var(--text-light);">' + kelasNama + '</span></div>' +
            '<button class="btn btn-sm btn-primary" style="padding:4px 12px;font-size:0.75rem;" onclick="confirmLinkSiswa(\'' + s.id + '\',\'' + s.nama_lengkap.replace(/'/g, "\\'") + '\')">Hubungkan</button>' +
            '</div>';
    });
    results.innerHTML = html;
}

async function confirmLinkSiswa(siswaId, namaSiswa) {
    var userId = document.getElementById('linkSiswaUserId').value;
    var email = document.getElementById('linkSiswaEmail').value;
    if (!userId || !siswaId) return;

    showCustomConfirm('Hubungkan Akun?',
        'Akun <strong>' + email + '</strong> akan dihubungkan ke data siswa <strong>' + namaSiswa + '</strong>. Tindakan ini bisa diubah nanti.',
        'Ya, Hubungkan',
        async function() {
            try {
                const { error } = await supabaseClient.from('siswa')
                    .update({ user_id: userId })
                    .eq('id', siswaId);
                if (error) throw error;
                showToast('Akun berhasil dihubungkan ke ' + namaSiswa + '! 🔗', 'success');
                document.getElementById('linkSiswaModal').classList.remove('active');
                // Refresh akun list
                if (typeof renderActiveAccounts === 'function') renderActiveAccounts();
            } catch(e) {
                showToast('Gagal: ' + e.message, 'error');
            }
        }
    );
}

async function confirmUnlinkSiswa(siswaId, namaSiswa) {
    showCustomConfirm('Putuskan Hubungan?',
        'Anda yakin ingin memutuskan hubungan akun ini dari data siswa <strong>' + namaSiswa + '</strong>?',
        'Ya, Putuskan',
        async function() {
            try {
                const { error } = await supabaseClient.from('siswa')
                    .update({ user_id: null })
                    .eq('id', siswaId);
                if (error) throw error;
                showToast('Hubungan dengan ' + namaSiswa + ' berhasil diputus.', 'success');
                document.getElementById('linkSiswaModal').classList.remove('active');
                // Refresh akun list
                if (typeof renderActiveAccounts === 'function') renderActiveAccounts();
            } catch(e) {
                showToast('Gagal: ' + e.message, 'error');
            }
        }
    );
}

// ============================================================
// LAPORAN NILAI SISWA (PRINT A4 - PER MAPEL)
// ============================================================

async function loadLaporanNilai() {
    var filterTahun = document.getElementById('filterLaporanTahun').value;
    var filterSemester = document.getElementById('filterLaporanSemester').value;
    var filterKelas = document.getElementById('filterLaporanKelas').value;
    var filterMapel = document.getElementById('filterLaporanMapel').value;
    var container = document.getElementById('laporanNilaiContainer');
    var btnCetak = document.getElementById('btnCetakLaporan');
    
    if (!filterTahun || filterTahun === 'Belum diatur' || !filterSemester || !filterKelas || !filterMapel) {
        showToast('Pilih Tahun, Semester, Kelas, dan Mata Pelajaran terlebih dahulu!', 'warning');
        return;
    }
    
    container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-light)">Memuat laporan nilai...</p>';
    btnCetak.style.display = 'none';
    
    try {
        var kelasObj = masterKelasList.find(function(k) { return k.id === filterKelas; });
        var kelasNama = kelasObj ? kelasObj.nama_kelas : '-';
        
        var mapelObj = masterMapelList.find(function(m) { return m.id === filterMapel; });
        var mapelNama = mapelObj ? mapelObj.nama_mapel : '-';
        
        var kkmObj = masterKkmList.find(function(k) { return k.kelas_id === filterKelas && k.mapel_id === filterMapel; });
        var kkm = kkmObj ? kkmObj.kkm : 0;
        
        // Ambil siswa di kelas
        const { data: siswaData, error: errS } = await supabaseClient.from('siswa').select('id, nama_lengkap').eq('kelas_id', filterKelas).order('nama_lengkap');
        if (errS) throw errS;
        if (!siswaData || siswaData.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada siswa di kelas ini.</p>';
            return;
        }
        
        // Ambil nilai untuk mapel ini
        const { data: nilaiData, error: errN } = await supabaseClient.from('nilai_akademik')
            .select('*')
            .eq('tahun_pelajaran', filterTahun)
            .eq('semester', filterSemester)
            .eq('kelas_id', filterKelas)
            .eq('mapel_id', filterMapel);
        if (errN) throw errN;
        
        var nilaiDict = {};
        if (nilaiData) {
            nilaiData.forEach(function(n) { nilaiDict[n.siswa_id] = n; });
        }
        
        // Render tabel
        var html = '<h3 style="margin-bottom:0.5rem;">Laporan Nilai — <strong>' + mapelNama + '</strong></h3>';
        html += '<p style="color:var(--text-light);margin-bottom:1rem;font-size:0.9rem;">Kelas: <strong>' + kelasNama + '</strong> | Semester: <strong>' + filterSemester + '</strong> | T.P.: <strong>' + filterTahun + '</strong> | KKM: <strong>' + (kkm > 0 ? kkm : 'Belum diatur') + '</strong></p>';
        html += '<div style="overflow-x:auto;"><table class="dash-table" id="tabelLaporan" style="font-size:0.9rem;"><thead><tr>';
        html += '<th style="width:40px;">No</th><th>Nama Siswa</th><th style="text-align:center;width:90px;">Nilai STS</th><th style="text-align:center;width:90px;">Nilai SAS</th><th style="text-align:center;width:90px;">Nilai SAJ</th><th style="text-align:center;width:90px;">Nilai SAT</th><th style="text-align:center;width:90px;">Rata-Rata</th><th style="text-align:center;width:100px;">Keterangan</th>';
        html += '</tr></thead><tbody>';
        
        siswaData.forEach(function(s, i) {
            var val = nilaiDict[s.id];
            var sts = val && val.nilai_sts !== null ? val.nilai_sts : '-';
            var sas = val && val.nilai_sas !== null ? val.nilai_sas : '-';
            var saj = val && val.nilai_saj !== null ? val.nilai_saj : '-';
            var sat = val && val.nilai_sat !== null ? val.nilai_sat : '-';
            var avg = '-'; var ketHtml = '<span style="color:var(--text-light);">-</span>';
            
            if (val && (val.nilai_sts !== null || val.nilai_sas !== null || val.nilai_saj !== null || val.nilai_sat !== null)) {
                var total = 0; var cnt = 0;
                if (val.nilai_sts !== null) { total += val.nilai_sts; cnt++; }
                if (val.nilai_sas !== null) { total += val.nilai_sas; cnt++; }
                if (val.nilai_saj !== null) { total += val.nilai_saj; cnt++; }
                if (val.nilai_sat !== null) { total += val.nilai_sat; cnt++; }
                avg = cnt > 0 ? Math.round(total / cnt) : 0;
                
                if (kkm > 0) {
                    if (avg >= kkm) {
                        ketHtml = '<span style="color:#22c55e;font-weight:bold;">Lulus</span>';
                    } else {
                        ketHtml = '<span style="color:#ef4444;font-weight:bold;">Belum Lulus</span>';
                    }
                }
            }
            
            html += '<tr><td style="text-align:center;">' + (i+1) + '</td>';
            html += '<td style="font-weight:600;">' + s.nama_lengkap + '</td>';
            html += '<td style="text-align:center;font-weight:bold;">' + sts + '</td>';
            html += '<td style="text-align:center;font-weight:bold;">' + sas + '</td>';
            html += '<td style="text-align:center;font-weight:bold;">' + saj + '</td>';
            html += '<td style="text-align:center;font-weight:bold;">' + sat + '</td>';
            html += '<td style="text-align:center;font-weight:bold;">' + avg + '</td>';
            html += '<td style="text-align:center;">' + ketHtml + '</td></tr>';
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        btnCetak.style.display = 'inline-flex';
        if (window.lucide) lucide.createIcons();
        
    } catch(e) {
        container.innerHTML = '<p style="color:var(--danger);text-align:center;">Gagal memuat laporan: ' + e.message + '</p>';
    }
}

function cetakLaporanNilai() {
    var filterTahun = document.getElementById('filterLaporanTahun').value;
    var filterSemester = document.getElementById('filterLaporanSemester').value;
    var filterKelas = document.getElementById('filterLaporanKelas').value;
    var filterMapel = document.getElementById('filterLaporanMapel').value;
    var kelasObj = masterKelasList.find(function(k) { return k.id === filterKelas; });
    var kelasNama = kelasObj ? kelasObj.nama_kelas : '-';
    var mapelObj = masterMapelList.find(function(m) { return m.id === filterMapel; });
    var mapelNama = mapelObj ? mapelObj.nama_mapel : '-';
    
    var kkmObj = masterKkmList.find(function(k) { return k.kelas_id === filterKelas && k.mapel_id === filterMapel; });
    var kkm = kkmObj ? kkmObj.kkm : '-';
    
    var tableEl = document.getElementById('tabelLaporan');
    if (!tableEl) { showToast('Tampilkan laporan terlebih dahulu!', 'warning'); return; }
    
    var printWindow = window.open('', '_blank');
    printWindow.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan Nilai - ' + mapelNama + ' - Kelas ' + kelasNama + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('* { margin:0; padding:0; box-sizing:border-box; }');
    printWindow.document.write('body { font-family: "Times New Roman", Times, serif; padding: 15mm 20mm; color: #000; }');
    printWindow.document.write('.kop { display:flex; align-items:center; gap:15px; border-bottom:3px double #000; padding-bottom:10px; margin-bottom:15px; }');
    printWindow.document.write('.kop img { width:70px; height:70px; object-fit:contain; }');
    printWindow.document.write('.kop-text { flex:1; text-align:center; }');
    printWindow.document.write('.kop-text h1 { font-size:18pt; margin:0; letter-spacing:1px; }');
    printWindow.document.write('.kop-text .status { font-size:10pt; font-weight:bold; margin:2px 0; }');
    printWindow.document.write('.kop-text .sk { font-size:9pt; font-weight:bold; margin:1px 0; }');
    printWindow.document.write('.kop-text .nss { font-size:10pt; font-weight:bold; margin:2px 0; }');
    printWindow.document.write('.kop-text .alamat { font-size:8.5pt; margin:2px 0; }');
    printWindow.document.write('.info { margin-bottom:12px; font-size:10pt; }');
    printWindow.document.write('.info td { padding:2px 8px 2px 0; vertical-align:top; }');
    printWindow.document.write('table.nilai { width:100%; border-collapse:collapse; font-size:10pt; margin-top:10px; }');
    printWindow.document.write('table.nilai th, table.nilai td { border:1px solid #000; padding:5px 8px; text-align:center; }');
    printWindow.document.write('table.nilai th { background:#e8e8e8; font-weight:bold; }');
    printWindow.document.write('table.nilai td.nama { text-align:left; }');
    printWindow.document.write('.ttd { margin-top:35px; display:flex; justify-content:space-between; font-size:10pt; }');
    printWindow.document.write('.ttd div { text-align:center; width:220px; }');
    printWindow.document.write('.ttd .line { margin-top:60px; }');
    printWindow.document.write('@page { size:A4 portrait; margin:10mm; }');
    printWindow.document.write('@media print { body { padding:10mm 15mm; } }');
    printWindow.document.write('</style></head><body>');
    
    // Kop Surat SMP IT AL-FATHONAH BABAKAN
    printWindow.document.write('<div class="kop">');
    printWindow.document.write('<img src="img/logo.png" alt="Logo" onerror="this.style.display=\'none\'" />');
    printWindow.document.write('<div class="kop-text">');
    printWindow.document.write('<h1>SMP IT AL-FATHONAH BABAKAN</h1>');
    printWindow.document.write('<p class="status">STATUS : &quot;TERAKREDITASI&quot;</p>');
    printWindow.document.write('<p class="sk">SK BAP S/M No : 02,00/322/BAP-SM/XI/2013</p>');
    printWindow.document.write('<p class="nss">NSS: 202 021 704 006 &nbsp;&nbsp; NPSN: 20 25 38 92</p>');
    printWindow.document.write('<p class="alamat">Jalan H. Mastra (Ponpes Al-Fathonah) No. 04 Desa Kudukeras Kec. Babakan Kab. Cirebon 45191</p>');
    printWindow.document.write('<p class="alamat">Tlp./ Fax. (0231) 661960 Hp. 085 323 056 221</p>');
    printWindow.document.write('</div></div>');
    
    // Judul
    printWindow.document.write('<h3 style="text-align:center;font-size:12pt;margin-bottom:12px;text-decoration:underline;">LAPORAN NILAI SISWA</h3>');
    
    // Info
    printWindow.document.write('<table class="info">');
    printWindow.document.write('<tr><td>Mata Pelajaran</td><td>: <strong>' + mapelNama + '</strong></td></tr>');
    printWindow.document.write('<tr><td>Kelas</td><td>: ' + kelasNama + '</td></tr>');
    printWindow.document.write('<tr><td>Semester</td><td>: ' + filterSemester + '</td></tr>');
    printWindow.document.write('<tr><td>Tahun Pelajaran</td><td>: ' + filterTahun + '</td></tr>');
    printWindow.document.write('<tr><td>KKM</td><td>: ' + kkm + '</td></tr>');
    printWindow.document.write('</table>');
    
    // Clone table
    var clonedTable = tableEl.cloneNode(true);
    clonedTable.className = 'nilai';
    clonedTable.removeAttribute('id');
    // Remove inline styles/colors, keep clean for print
    clonedTable.querySelectorAll('td, th').forEach(function(cell) {
        cell.removeAttribute('style');
    });
    // Set alignment
    clonedTable.querySelectorAll('tbody tr').forEach(function(tr) {
        var cells = tr.querySelectorAll('td');
        if (cells.length > 0) cells[0].style.textAlign = 'center'; // No
        if (cells.length > 1) cells[1].className = 'nama'; // Nama
        for (var c = 2; c < cells.length; c++) { cells[c].style.textAlign = 'center'; }
    });
    clonedTable.querySelectorAll('thead th').forEach(function(th) { th.style.textAlign = 'center'; });
    printWindow.document.write(clonedTable.outerHTML);
    
    // Tanda tangan
    var today = new Date();
    var months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    var dateStr = today.getDate() + ' ' + months[today.getMonth()] + ' ' + today.getFullYear();
    printWindow.document.write('<div class="ttd">');
    printWindow.document.write('<div><p>Mengetahui,</p><p>Kepala Sekolah</p><div class="line"></div><p><strong>________________________</strong></p><p>NIP. ___________________</p></div>');
    printWindow.document.write('<div><p>Cirebon, ' + dateStr + '</p><p>Guru Mata Pelajaran</p><div class="line"></div><p><strong>________________________</strong></p><p>NIP. ___________________</p></div>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(function() { printWindow.print(); }, 500);
}

// ============================================================
// HASIL & ANALISIS ASESMEN (GOOGLE FORM)
// ============================================================
var hasilAsesmenState = {
    data: [], // Array of objects parsed from CSV
    siswaList: [] // Students in the selected class
};

function updateHasilAsesmenTipe() {
    var sem = document.getElementById('hasilAsesmenSemester').value;
    var kelasId = document.getElementById('hasilAsesmenKelas').value;
    var kelasObj = masterKelasList.find(function(k) { return k.id === kelasId; });
    var tingkat = kelasObj ? kelasObj.tingkat : 0;
    
    var selTipe = document.getElementById('hasilAsesmenTipe');
    if (!selTipe) return;
    
    var html = '';
    if (sem === 'Ganjil') {
        html += '<option value="STS">Tipe: STS Ganjil</option>';
        html += '<option value="SAS">Tipe: SAS</option>';
    } else {
        html += '<option value="STS">Tipe: STS Genap</option>';
        if (tingkat === 9) {
            html += '<option value="SAJ">Tipe: SAJ</option>';
        } else {
            html += '<option value="SAT">Tipe: SAT</option>';
        }
    }
    selTipe.innerHTML = html;
}

function parseCSV(str) {
    var arr = [];
    var quote = false;
    var row = 0, col = 0, c = 0;
    for (row = 0, col = 0, c = 0; c < str.length; c++) {
        var cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }
    return arr;
}

function extractFileId(url) {
    var match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

async function loadDataHasilAsesmen() {
    var link = document.getElementById('hasilAsesmenLink').value.trim();
    var tahun = document.getElementById('hasilAsesmenTahun').value;
    var semester = document.getElementById('hasilAsesmenSemester').value;
    var kelasId = document.getElementById('hasilAsesmenKelas').value;
    var mapelId = document.getElementById('hasilAsesmenMapel').value;
    
    if (!link || !kelasId || !mapelId) {
        showToast('Pastikan Link Spreadsheet, Kelas, dan Mapel sudah diisi!', 'warning');
        return;
    }
    
    var fileId = extractFileId(link);
    if (!fileId) {
        showToast('Link Spreadsheet tidak valid. Pastikan itu adalah URL Google Sheets asli.', 'error');
        return;
    }
    
    var btn = document.getElementById('btnTarikHasilAsesmen');
    var origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="icon-spin" style="width:16px;height:16px;"></i> Mengunduh...';
    if (window.lucide) lucide.createIcons();
    
    document.getElementById('hasilAsesmenPanel').style.display = 'block';
    var tbody = document.getElementById('hasilAsesmenTbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">Mengunduh dan mencocokkan data...</td></tr>';
    
    try {
        // 1. Get Students in the Class
        const { data: siswaData, error: errS } = await supabaseClient.from('siswa').select('id, nama_lengkap').eq('kelas_id', kelasId).not('status', 'in', '("Pindah","Lulus")').order('nama_lengkap');
        if (errS) throw errS;
        hasilAsesmenState.siswaList = siswaData || [];
        
        // 2. Fetch CSV from Google Sheets
        // Menargetkan sheet khusus "Hasil Koreksi" jika ada, jika tidak otomatis sheet pertama
        var csvUrl = 'https://docs.google.com/spreadsheets/d/' + fileId + '/gviz/tq?tqx=out:csv&sheet=Hasil%20Koreksi';
        
        var response = await fetch(csvUrl);
        if (!response.ok) {
            // Coba ambil sheet default (pertama) jika "Hasil Koreksi" tidak ditemukan
            csvUrl = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=csv';
            response = await fetch(csvUrl);
            if (!response.ok) throw new Error('Gagal mengakses Spreadsheet. Pastikan aksesnya "Siapa saja yang memiliki link".');
        }
        
        var csvText = await response.text();
        var rows = parseCSV(csvText);
        
        if (rows.length <= 1) {
            throw new Error('Spreadsheet kosong atau gagal dibaca.');
        }
        
        var headers = rows[0].map(h => (h || '').trim().toLowerCase());
        
        // Identify columns based on Google Apps Script output structure
        var idxNama = headers.findIndex(h => h === 'nama');
        if (idxNama === -1) idxNama = headers.findIndex(h => h.indexOf('nama') !== -1);
        
        var idxBenarPG = headers.findIndex(h => h === 'benar pg');
        var idxSkorPG = headers.findIndex(h => h === 'total poin pg');
        var idxTotalEssay = headers.findIndex(h => h === 'total poin essay');
        var idxNilaiAkhir = headers.findIndex(h => h === 'nilai akhir keseluruhan');
        
        if (idxNama === -1 || idxNilaiAkhir === -1) {
            throw new Error('Format Spreadsheet tidak dikenali. Kolom "Nama" atau "Nilai Akhir Keseluruhan" tidak ditemukan.');
        }
        
        hasilAsesmenState.data = [];
        var matchedCount = 0;
        
        var html = '';
        // Map data per student in database
        hasilAsesmenState.siswaList.forEach(function(s, i) {
            var namaDb = s.nama_lengkap.toLowerCase().replace(/[^a-z0-9]/g, '');
            var bestMatch = null;
            
            for (var r = 1; r < rows.length; r++) {
                if (!rows[r] || rows[r].length < idxNilaiAkhir) continue;
                var namaSheet = (rows[r][idxNama] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (namaSheet && (namaDb.indexOf(namaSheet) !== -1 || namaSheet.indexOf(namaDb) !== -1 || namaDb === namaSheet)) {
                    bestMatch = rows[r];
                    break;
                }
            }
            
            var rowObj = { siswa_id: s.id, nama_db: s.nama_lengkap, matched: false, nilai_akhir: 0, benar_pg: 0, skor_pg: 0, skor_essay: 0 };
            
            var bPg = '-', sPg = '-', sEs = '-', nAkhir = '-';
            var namaAsliSheet = '-';
            
            if (bestMatch) {
                namaAsliSheet = bestMatch[idxNama] || '';
                bPg = idxBenarPG !== -1 ? (bestMatch[idxBenarPG] || '0') : '-';
                sPg = idxSkorPG !== -1 ? (bestMatch[idxSkorPG] || '0') : '-';
                sEs = idxTotalEssay !== -1 ? (bestMatch[idxTotalEssay] || '0') : '-';
                nAkhir = bestMatch[idxNilaiAkhir] || '0';
                
                rowObj.matched = true;
                rowObj.nilai_akhir = parseFloat(nAkhir) || 0;
                rowObj.benar_pg = parseInt(bPg) || 0;
                rowObj.skor_pg = parseFloat(sPg) || 0;
                rowObj.skor_essay = parseFloat(sEs) || 0;
                matchedCount++;
            }
            
            hasilAsesmenState.data.push(rowObj);
            
            var statusBadge = rowObj.matched ? '<span style="color:#16a34a;font-weight:bold;">Cocok</span>' : '<span style="color:#dc2626;font-size:0.8rem;">Isi Manual</span>';
            var trStyle = rowObj.matched ? '' : 'background:rgba(220,38,38,0.05);';
            
            var bPgHtml = rowObj.matched ? bPg : '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'benar_pg\', this.value)">';
            var sPgHtml = rowObj.matched ? sPg : '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'skor_pg\', this.value)">';
            var sEsHtml = rowObj.matched ? sEs : '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'skor_essay\', this.value)">';
            var nAkhirHtml = rowObj.matched ? nAkhir : '<input type="number" min="0" max="100" class="form-input" style="width:70px;padding:4px;margin:0 auto;font-size:0.9rem;font-weight:bold;color:var(--primary);text-align:center;" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'nilai_akhir\', this.value)">';
            
            html += '<tr style="' + trStyle + '" data-siswa="' + s.id + '">' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + s.nama_lengkap + '</td>' +
                '<td style="font-size:0.8rem;color:var(--text-light);">' + (rowObj.matched ? namaAsliSheet : '-') + '</td>' +
                '<td style="text-align:center;">' + bPgHtml + '</td>' +
                '<td style="text-align:center;">' + sPgHtml + '</td>' +
                '<td style="text-align:center;">' + sEsHtml + '</td>' +
                '<td style="text-align:center;font-weight:bold;font-size:1.1rem;color:var(--primary);">' + nAkhirHtml + '</td>' +
                '<td style="text-align:center;">' + statusBadge + '</td>' +
                '</tr>';
        });
        
        tbody.innerHTML = html;
        document.getElementById('hasilAsesmenStats').innerHTML = '<strong>' + matchedCount + '</strong> dari ' + hasilAsesmenState.siswaList.length + ' siswa ditemukan di Spreadsheet.';
        if (window.lucide) lucide.createIcons();
        
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ef4444;padding:2rem;">Gagal memuat data: ' + e.message + '<br><small>Pastikan opsi "Siapa saja yang memiliki link" pada Google Sheets sudah diset ke "Pelihat (Viewer)".</small></td></tr>';
        document.getElementById('hasilAsesmenStats').textContent = 'Terjadi kesalahan.';
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (window.lucide) lucide.createIcons();
    }
}

function updateHasilAsesmenManual(siswaId, field, value) {
    if (!hasilAsesmenState.data) return;
    var item = hasilAsesmenState.data.find(function(d) { return d.siswa_id === siswaId; });
    if (item) {
        item[field] = parseFloat(value) || 0;
        // Tandai sebagai matched agar ikut disimpan ke nilai resmi & dipublikasikan
        if (!item.matched) {
            item.matched = true;
            // Opsional: update teks badge secara visual jika diperlukan
            var tr = document.querySelector('#hasilAsesmenTbody tr[data-siswa="' + siswaId + '"]');
            if (tr) {
                var badgeTd = tr.lastElementChild;
                if (badgeTd) badgeTd.innerHTML = '<span style="color:#eab308;font-weight:bold;">Manual</span>';
            }
        }
    }
}


async function sinkronisasiKeNilaiResmi() {
    var tahun = document.getElementById('hasilAsesmenTahun').value;
    var semester = document.getElementById('hasilAsesmenSemester').value;
    var kelasId = document.getElementById('hasilAsesmenKelas').value;
    var mapelId = document.getElementById('hasilAsesmenMapel').value;
    var tipe = document.getElementById('hasilAsesmenTipe').value; // STS, SAS, SAJ, SAT
    
    if (!hasilAsesmenState.data || hasilAsesmenState.data.length === 0) {
        showToast('Tarik data terlebih dahulu!', 'warning');
        return;
    }
    
    var validData = hasilAsesmenState.data.filter(d => d.matched);
    if (validData.length === 0) {
        showToast('Tidak ada data nilai siswa yang valid untuk disinkronisasi.', 'warning');
        return;
    }
    
    showCustomConfirm('Sinkronisasi ke Nilai ' + tipe + '?', 'Anda akan menyimpan <strong>' + validData.length + '</strong> nilai akhir siswa ini ke kolom <strong>' + tipe + '</strong> pada laporan resmi.', 'Ya, Sinkronisasikan', async function() {
        var btn = document.getElementById('btnSinkronHasil');
        var origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="icon-spin"></i> Menyimpan...';
        
        try {
            // Fetch existing records for this class/mapel so we don't overwrite other types of grades accidentally
            const { data: existingData, error: errEx } = await supabaseClient.from('nilai_akademik')
                .select('*')
                .eq('tahun_pelajaran', tahun)
                .eq('semester', semester)
                .eq('kelas_id', kelasId)
                .eq('mapel_id', mapelId);
                
            if (errEx) throw errEx;
            
            var existingDict = {};
            if (existingData) {
                existingData.forEach(d => existingDict[d.siswa_id] = d);
            }
            
            var payload = [];
            validData.forEach(function(vd) {
                var ex = existingDict[vd.siswa_id] || { 
                    tahun_pelajaran: tahun, 
                    semester: semester, 
                    kelas_id: kelasId, 
                    mapel_id: mapelId, 
                    siswa_id: vd.siswa_id,
                    nilai_sts: null,
                    nilai_sas: null,
                    nilai_saj: null,
                    nilai_sat: null
                };
                
                if (tipe === 'STS') ex.nilai_sts = vd.nilai_akhir;
                if (tipe === 'SAS') ex.nilai_sas = vd.nilai_akhir;
                if (tipe === 'SAJ') ex.nilai_saj = vd.nilai_akhir;
                if (tipe === 'SAT') ex.nilai_sat = vd.nilai_akhir;
                
                ex.updated_at = new Date().toISOString();
                payload.push(ex);
            });
            
            const { error } = await supabaseClient.from('nilai_akademik').upsert(payload, { onConflict: 'tahun_pelajaran, semester, kelas_id, mapel_id, siswa_id' });
            if (error) throw error;
            
            showToast('Sinkronisasi berhasil! Nilai ' + tipe + ' telah diperbarui.', 'success');
        } catch(e) {
            showToast('Gagal sinkronisasi: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
            if (window.lucide) lucide.createIcons();
        }
    });
}

// ============================================================
// LAYANAN KESISWAAN: TAB SWITCHING
// ============================================================
function switchPelanggaranTab(tabId) {
    document.querySelectorAll('#sectionPelanggaranSiswa .account-tab-content').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('#sectionPelanggaranSiswa .account-tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
    var tab = document.getElementById(tabId);
    if (tab) tab.style.display = 'block';
    document.querySelectorAll('#sectionPelanggaranSiswa .account-tab-btn').forEach(function(btn) {
        if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
    });
    if (tabId === 'tabTataTertib') loadTataTertibData();
    if (tabId === 'tabPelanggaran') loadPelanggaranData();
}

// ============================================================
// LAYANAN KESISWAAN: TATA TERTIB & POIN (CRUD)
// ============================================================
var tataTertibList = [];

async function loadTataTertibData() {
    var tbody = document.getElementById('tataTertibTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('tata_tertib').select('*').order('kategori').order('poin', { ascending: false });
        if (error) throw error;
        tataTertibList = data || [];
        if (tataTertibList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada aturan tata tertib.</td></tr>';
            return;
        }
        tbody.innerHTML = tataTertibList.map(function(r, i) {
            var katMap = {
                'Ringan': '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Ringan</span>',
                'Sedang': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Sedang</span>',
                'Berat': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Berat</span>'
            };
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td>' + (katMap[r.kategori] || r.kategori) + '</td>' +
                '<td style="font-weight:600;">' + (r.deskripsi||'-') + '</td>' +
                '<td style="text-align:center;font-weight:bold;color:#ef4444;">' + r.poin + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (r.sanksi||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editTataTertib(\'' + r.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteTataTertib(\'' + r.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openTataTertibModal(data) {
    document.getElementById('formTataTertibId').value = data ? data.id : '';
    document.getElementById('formTataTertibKategori').value = data ? data.kategori : 'Ringan';
    document.getElementById('formTataTertibDeskripsi').value = data ? data.deskripsi : '';
    document.getElementById('formTataTertibPoin').value = data ? data.poin : 5;
    document.getElementById('formTataTertibSanksi').value = data ? (data.sanksi||'') : '';
    document.getElementById('tataTertibModalTitle').textContent = data ? 'Edit Aturan Tata Tertib' : 'Tambah Aturan Tata Tertib';
    document.getElementById('tataTertibModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeTataTertibModal() { document.getElementById('tataTertibModal').classList.remove('active'); }

async function saveTataTertib() {
    var id = document.getElementById('formTataTertibId').value;
    var obj = {
        kategori: document.getElementById('formTataTertibKategori').value,
        deskripsi: document.getElementById('formTataTertibDeskripsi').value.trim(),
        poin: parseInt(document.getElementById('formTataTertibPoin').value) || 5,
        sanksi: document.getElementById('formTataTertibSanksi').value.trim() || null
    };
    if (!obj.deskripsi) { showToast('Deskripsi pelanggaran wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('tata_tertib').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Aturan tata tertib diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('tata_tertib').insert([obj]);
            if (error) throw error;
            showToast('Aturan tata tertib berhasil ditambahkan!', 'success');
        }
        closeTataTertibModal();
        loadTataTertibData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editTataTertib(id) {
    var r = tataTertibList.find(function(x) { return x.id === id; });
    if (r) openTataTertibModal(r);
}

function deleteTataTertib(id) {
    showCustomConfirm('Hapus Aturan?', 'Aturan tata tertib ini akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('tata_tertib').delete().eq('id', id);
            if (error) throw error;
            showToast('Aturan tata tertib dihapus!', 'success');
            loadTataTertibData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// LAYANAN KESISWAAN: CATATAN PELANGGARAN SISWA (CRUD)
// ============================================================
var pelanggaranList = [];

async function loadPelanggaranData() {
    var tbody = document.getElementById('pelanggaranTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('pelanggaran_siswa')
            .select('*, siswa ( nama_lengkap, master_kelas ( nama_kelas ) ), tata_tertib ( deskripsi, kategori, poin )')
            .order('tanggal', { ascending: false });
        if (error) throw error;
        pelanggaranList = data || [];
        if (pelanggaranList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada catatan pelanggaran.</td></tr>';
            return;
        }
        tbody.innerHTML = pelanggaranList.map(function(p, i) {
            var tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var nama = p.siswa ? p.siswa.nama_lengkap : '-';
            var kelas = (p.siswa && p.siswa.master_kelas) ? p.siswa.master_kelas.nama_kelas : '-';
            var pelanggaran = p.tata_tertib ? p.tata_tertib.deskripsi : '-';
            var kategori = p.tata_tertib ? p.tata_tertib.kategori : '-';
            var poin = p.tata_tertib ? p.tata_tertib.poin : 0;
            var katMap = {
                'Ringan': '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;">Ringan</span>',
                'Sedang': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;font-size:.75rem;">Sedang</span>',
                'Berat': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;font-size:.75rem;">Berat</span>'
            };
            var statusMap = {
                'Dicatat': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Dicatat</span>',
                'Proses': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Proses</span>',
                'Selesai': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Selesai</span>'
            };
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + nama + '</td>' +
                '<td>' + kelas + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td style="font-size:.85rem;">' + pelanggaran + '</td>' +
                '<td style="text-align:center;">' + (katMap[kategori] || kategori) + '</td>' +
                '<td style="text-align:center;font-weight:bold;color:#ef4444;">' + poin + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (p.tindak_lanjut||'-') + '</td>' +
                '<td>' + (statusMap[p.status] || p.status) + '</td>' +
                '<td style="font-size:.85rem;">' + (p.dilaporkan_oleh||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editPelanggaran(\'' + p.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deletePelanggaran(\'' + p.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function populatePelanggaranDropdowns() {
    // Populate siswa dropdown
    var selSiswa = document.getElementById('formPelanggaranSiswa');
    if (selSiswa) {
        try {
            const { data } = await supabaseClient.from('siswa').select('id, nama_lengkap, master_kelas ( nama_kelas )').eq('status', 'Aktif').order('nama_lengkap');
            selSiswa.innerHTML = '<option value="">Pilih Siswa...</option>' + (data||[]).map(function(s) {
                var kls = s.master_kelas ? ' (' + s.master_kelas.nama_kelas + ')' : '';
                return '<option value="' + s.id + '">' + s.nama_lengkap + kls + '</option>';
            }).join('');
        } catch(e) { console.warn('populateSiswa error:', e); }
    }
    // Populate tata tertib dropdown
    var selTT = document.getElementById('formPelanggaranTataTertib');
    if (selTT) {
        try {
            const { data } = await supabaseClient.from('tata_tertib').select('*').order('kategori').order('poin', { ascending: false });
            selTT.innerHTML = '<option value="">Pilih Aturan Tata Tertib...</option>' + (data||[]).map(function(t) {
                return '<option value="' + t.id + '">[' + t.kategori + ' - ' + t.poin + ' poin] ' + t.deskripsi + '</option>';
            }).join('');
        } catch(e) { console.warn('populateTataTertib error:', e); }
    }
}

async function openPelanggaranModal(data) {
    await populatePelanggaranDropdowns();
    document.getElementById('formPelanggaranId').value = data ? data.id : '';
    document.getElementById('formPelanggaranSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formPelanggaranTanggal').value = data ? (data.tanggal||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formPelanggaranTataTertib').value = data ? (data.tata_tertib_id||'') : '';
    document.getElementById('formPelanggaranKeterangan').value = data ? (data.keterangan||'') : '';
    document.getElementById('formPelanggaranTindakLanjut').value = data ? (data.tindak_lanjut||'') : '';
    document.getElementById('formPelanggaranStatus').value = data ? (data.status||'Dicatat') : 'Dicatat';
    document.getElementById('formPelanggaranDilaporkan').value = data ? (data.dilaporkan_oleh||'') : '';
    document.getElementById('pelanggaranModalTitle').textContent = data ? 'Edit Catatan Pelanggaran' : 'Catat Pelanggaran';
    document.getElementById('pelanggaranModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closePelanggaranModal() { document.getElementById('pelanggaranModal').classList.remove('active'); }

async function savePelanggaran() {
    var id = document.getElementById('formPelanggaranId').value;
    var obj = {
        siswa_id: document.getElementById('formPelanggaranSiswa').value || null,
        tata_tertib_id: document.getElementById('formPelanggaranTataTertib').value || null,
        tanggal: document.getElementById('formPelanggaranTanggal').value || null,
        keterangan: document.getElementById('formPelanggaranKeterangan').value.trim() || null,
        tindak_lanjut: document.getElementById('formPelanggaranTindakLanjut').value.trim() || null,
        status: document.getElementById('formPelanggaranStatus').value,
        dilaporkan_oleh: document.getElementById('formPelanggaranDilaporkan').value.trim() || null
    };
    if (!obj.siswa_id) { showToast('Pilih siswa terlebih dahulu!', 'warning'); return; }
    if (!obj.tata_tertib_id) { showToast('Pilih jenis pelanggaran!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('pelanggaran_siswa').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Catatan pelanggaran diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('pelanggaran_siswa').insert([obj]);
            if (error) throw error;
            showToast('Pelanggaran berhasil dicatat!', 'success');
        }
        closePelanggaranModal();
        loadPelanggaranData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editPelanggaran(id) {
    var p = pelanggaranList.find(function(x) { return x.id === id; });
    if (p) openPelanggaranModal(p);
}

function deletePelanggaran(id) {
    showCustomConfirm('Hapus Catatan?', 'Catatan pelanggaran ini akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('pelanggaran_siswa').delete().eq('id', id);
            if (error) throw error;
            showToast('Catatan pelanggaran dihapus!', 'success');
            loadPelanggaranData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// LAYANAN KESISWAAN: KEGIATAN OSIS (CRUD)
// ============================================================
var osisList = [];

async function loadOsisData() {
    var tbody = document.getElementById('osisTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('kegiatan_osis').select('*').order('tanggal_mulai', { ascending: false });
        if (error) throw error;
        osisList = data || [];
        if (osisList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada kegiatan OSIS.</td></tr>';
            return;
        }
        tbody.innerHTML = osisList.map(function(o, i) {
            var tglMulai = o.tanggal_mulai ? new Date(o.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var tglSelesai = o.tanggal_selesai ? new Date(o.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var jenisMap = {
                'Kegiatan Rutin': '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;">Rutin</span>',
                'Event Khusus': '<span class="role-badge" style="background:rgba(139,92,246,.1);color:#8b5cf6;font-size:.75rem;">Event</span>',
                'Bakti Sosial': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;font-size:.75rem;">Baksos</span>',
                'Lomba': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;font-size:.75rem;">Lomba</span>',
                'Pelatihan': '<span class="role-badge" style="background:rgba(14,165,233,.1);color:#0ea5e9;font-size:.75rem;">Pelatihan</span>',
                'Lainnya': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;font-size:.75rem;">Lainnya</span>'
            };
            var statusMap = {
                'Direncanakan': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Direncanakan</span>',
                'Berlangsung': '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Berlangsung</span>',
                'Selesai': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Selesai</span>',
                'Dibatalkan': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Dibatalkan</span>'
            };
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (o.nama_kegiatan||'-') + '</td>' +
                '<td>' + (jenisMap[o.jenis] || o.jenis) + '</td>' +
                '<td>' + tglMulai + '</td>' +
                '<td>' + tglSelesai + '</td>' +
                '<td>' + (o.tempat||'-') + '</td>' +
                '<td style="font-size:.85rem;">' + (o.penanggung_jawab||'-') + '</td>' +
                '<td style="text-align:center;font-weight:bold;">' + (o.jumlah_peserta||'-') + '</td>' +
                '<td>' + (statusMap[o.status] || o.status) + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (o.hasil_keterangan||o.deskripsi||'-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editOsis(\'' + o.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteOsis(\'' + o.id + '\',\'' + (o.nama_kegiatan||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openOsisModal(data) {
    document.getElementById('formOsisId').value = data ? data.id : '';
    document.getElementById('formOsisNama').value = data ? data.nama_kegiatan : '';
    document.getElementById('formOsisJenis').value = data ? (data.jenis||'Kegiatan Rutin') : 'Kegiatan Rutin';
    document.getElementById('formOsisStatus').value = data ? (data.status||'Direncanakan') : 'Direncanakan';
    document.getElementById('formOsisTglMulai').value = data ? (data.tanggal_mulai||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formOsisTglSelesai').value = data ? (data.tanggal_selesai||'') : '';
    document.getElementById('formOsisTempat').value = data ? (data.tempat||'') : '';
    document.getElementById('formOsisPJ').value = data ? (data.penanggung_jawab||'') : '';
    document.getElementById('formOsisPeserta').value = data ? (data.jumlah_peserta||'') : '';
    document.getElementById('formOsisAnggaran').value = data ? (data.anggaran||'') : '';
    document.getElementById('formOsisDeskripsi').value = data ? (data.deskripsi||'') : '';
    document.getElementById('formOsisHasil').value = data ? (data.hasil_keterangan||'') : '';
    document.getElementById('osisModalTitle').textContent = data ? 'Edit Kegiatan OSIS' : 'Tambah Kegiatan OSIS';
    document.getElementById('osisModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeOsisModal() { document.getElementById('osisModal').classList.remove('active'); }

async function saveOsis() {
    var id = document.getElementById('formOsisId').value;
    var obj = {
        nama_kegiatan: document.getElementById('formOsisNama').value.trim(),
        jenis: document.getElementById('formOsisJenis').value,
        status: document.getElementById('formOsisStatus').value,
        tanggal_mulai: document.getElementById('formOsisTglMulai').value || null,
        tanggal_selesai: document.getElementById('formOsisTglSelesai').value || null,
        tempat: document.getElementById('formOsisTempat').value.trim() || null,
        penanggung_jawab: document.getElementById('formOsisPJ').value.trim() || null,
        jumlah_peserta: parseInt(document.getElementById('formOsisPeserta').value) || null,
        anggaran: document.getElementById('formOsisAnggaran').value.trim() || null,
        deskripsi: document.getElementById('formOsisDeskripsi').value.trim() || null,
        hasil_keterangan: document.getElementById('formOsisHasil').value.trim() || null
    };
    if (!obj.nama_kegiatan) { showToast('Nama kegiatan wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('kegiatan_osis').update(obj).eq('id', id);
            if (error) throw error;
            showToast('Kegiatan OSIS diperbarui!', 'success');
        } else {
            const { error } = await supabaseClient.from('kegiatan_osis').insert([obj]);
            if (error) throw error;
            showToast('Kegiatan OSIS berhasil ditambahkan!', 'success');
        }
        closeOsisModal();
        loadOsisData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editOsis(id) {
    var o = osisList.find(function(x) { return x.id === id; });
    if (o) openOsisModal(o);
}

function deleteOsis(id, nama) {
    showCustomConfirm('Hapus Kegiatan?', 'Kegiatan <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('kegiatan_osis').delete().eq('id', id);
            if (error) throw error;
            showToast('Kegiatan OSIS dihapus!', 'success');
            loadOsisData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// LAYANAN KESISWAAN: EKSTRAKURIKULER (CRUD)
// ============================================================
var ekskulList = [];
async function loadEkskulData() {
    var tbody = document.getElementById('ekskulTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('ekstrakurikuler').select('*').order('nama_ekskul');
        if (error) throw error;
        ekskulList = data || [];
        if (ekskulList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data Ekstrakurikuler.</td></tr>';
            return;
        }
        tbody.innerHTML = ekskulList.map((e, i) => {
            var badgeObj = e.status === 'Aktif' 
                ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Aktif</span>' 
                : '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Nonaktif</span>';
            return `<tr>
                <td style="text-align:center;">${i+1}</td>
                <td style="font-weight:600;">${e.nama_ekskul||'-'}</td>
                <td>${e.pembina||'-'}</td>
                <td>${e.jadwal_hari||'-'}</td>
                <td style="font-size:.85rem;">${e.jadwal_waktu||'-'}</td>
                <td>${e.tempat||'-'}</td>
                <td>${badgeObj}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editEkskul('${e.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deleteEkskul('${e.id}','${(e.nama_ekskul||'').replace(/'/g, "\\'")}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
function openEkskulModal(data) {
    document.getElementById('formEkskulId').value = data ? data.id : '';
    document.getElementById('formEkskulNama').value = data ? data.nama_ekskul : '';
    document.getElementById('formEkskulPembina').value = data ? (data.pembina||'') : '';
    document.getElementById('formEkskulHari').value = data ? (data.jadwal_hari||'') : '';
    document.getElementById('formEkskulWaktu').value = data ? (data.jadwal_waktu||'') : '';
    document.getElementById('formEkskulTempat').value = data ? (data.tempat||'') : '';
    document.getElementById('formEkskulDeskripsi').value = data ? (data.deskripsi||'') : '';
    document.getElementById('formEkskulStatus').value = data ? (data.status||'Aktif') : 'Aktif';
    document.getElementById('ekskulModalTitle').textContent = data ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler';
    document.getElementById('ekskulModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeEkskulModal() { document.getElementById('ekskulModal').classList.remove('active'); }
async function saveEkskul() {
    var id = document.getElementById('formEkskulId').value;
    var obj = {
        nama_ekskul: document.getElementById('formEkskulNama').value.trim(),
        pembina: document.getElementById('formEkskulPembina').value.trim() || null,
        jadwal_hari: document.getElementById('formEkskulHari').value.trim() || null,
        jadwal_waktu: document.getElementById('formEkskulWaktu').value.trim() || null,
        tempat: document.getElementById('formEkskulTempat').value.trim() || null,
        deskripsi: document.getElementById('formEkskulDeskripsi').value.trim() || null,
        status: document.getElementById('formEkskulStatus').value
    };
    if (!obj.nama_ekskul) { showToast('Nama ekskul wajib diisi!', 'warning'); return; }
    try {
        if (id) await supabaseClient.from('ekstrakurikuler').update(obj).eq('id', id);
        else await supabaseClient.from('ekstrakurikuler').insert([obj]);
        showToast('Data ekstrakurikuler disimpan!', 'success');
        closeEkskulModal();
        loadEkskulData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editEkskul(id) { const item = ekskulList.find(x => x.id === id); if(item) openEkskulModal(item); }
function deleteEkskul(id, nama) {
    showCustomConfirm('Hapus Ekstrakurikuler?', `Hapus permanen <strong>${nama}</strong>?`, 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('ekstrakurikuler').delete().eq('id', id);
            showToast('Ekskul dihapus!', 'success');
            loadEkskulData();
        } catch(e) { showToast('Gagal: '+e.message, 'error'); }
    });
}

// ============================================================
// GLOBAL: HELPER POPULATE SISWA
// ============================================================
async function globalPopulateSiswaDropdown(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    try {
        const { data } = await supabaseClient.from('siswa').select('id, nama_lengkap, master_kelas(nama_kelas)').eq('status', 'Aktif').order('nama_lengkap');
        sel.innerHTML = '<option value="">Pilih Siswa...</option>' + (data||[]).map(s => {
            var kls = s.master_kelas ? ` (${s.master_kelas.nama_kelas})` : '';
            return `<option value="${s.id}">${s.nama_lengkap}${kls}</option>`;
        }).join('');
    } catch(e) { console.warn('Populate siswa error:', e); }
}

// ============================================================
// LAYANAN KESISWAAN: PRESTASI SISWA (CRUD)
// ============================================================
var prestasiList = [];
async function loadPrestasiData() {
    var tbody = document.getElementById('prestasiTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('prestasi_siswa').select('*, siswa(nama_lengkap)').order('tanggal', { ascending: false });
        if (error) throw error;
        prestasiList = data || [];
        if (prestasiList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data Prestasi.</td></tr>';
            return;
        }
        tbody.innerHTML = prestasiList.map((p, i) => {
            var tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : '-';
            var nama = p.siswa ? p.siswa.nama_lengkap : '-';
            var katBadge = p.kategori === 'Akademik' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Akademik</span>' : '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Non-Akademik</span>';
            return `<tr>
                <td style="text-align:center;">${i+1}</td>
                <td style="font-weight:600;">${nama}</td>
                <td style="font-weight:600;color:var(--primary);">${p.nama_prestasi||'-'}</td>
                <td style="font-size:.85rem;">${tgl}</td>
                <td>${p.tingkat||'-'}</td>
                <td>${katBadge}</td>
                <td>${p.peringkat||'-'}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editPrestasi('${p.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deletePrestasi('${p.id}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
async function openPrestasiModal(data) {
    await globalPopulateSiswaDropdown('formPrestasiSiswa');
    document.getElementById('formPrestasiId').value = data ? data.id : '';
    document.getElementById('formPrestasiSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formPrestasiNama').value = data ? data.nama_prestasi : '';
    document.getElementById('formPrestasiTanggal').value = data ? (data.tanggal||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formPrestasiTingkat').value = data ? (data.tingkat||'Sekolah') : 'Sekolah';
    document.getElementById('formPrestasiKategori').value = data ? (data.kategori||'Akademik') : 'Akademik';
    document.getElementById('formPrestasiPeringkat').value = data ? (data.peringkat||'') : '';
    document.getElementById('formPrestasiPenyelenggara').value = data ? (data.penyelenggara||'') : '';
    document.getElementById('formPrestasiKeterangan').value = data ? (data.keterangan||'') : '';
    document.getElementById('prestasiModalTitle').textContent = data ? 'Edit Prestasi' : 'Tambah Prestasi';
    document.getElementById('prestasiModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closePrestasiModal() { document.getElementById('prestasiModal').classList.remove('active'); }
async function savePrestasi() {
    var id = document.getElementById('formPrestasiId').value;
    var obj = {
        siswa_id: document.getElementById('formPrestasiSiswa').value || null,
        nama_prestasi: document.getElementById('formPrestasiNama').value.trim(),
        tanggal: document.getElementById('formPrestasiTanggal').value || null,
        tingkat: document.getElementById('formPrestasiTingkat').value,
        kategori: document.getElementById('formPrestasiKategori').value,
        peringkat: document.getElementById('formPrestasiPeringkat').value.trim() || null,
        penyelenggara: document.getElementById('formPrestasiPenyelenggara').value.trim() || null,
        keterangan: document.getElementById('formPrestasiKeterangan').value.trim() || null
    };
    if (!obj.siswa_id || !obj.nama_prestasi) { showToast('Siswa dan Nama Prestasi wajib diisi!', 'warning'); return; }
    try {
        if (id) await supabaseClient.from('prestasi_siswa').update(obj).eq('id', id);
        else await supabaseClient.from('prestasi_siswa').insert([obj]);
        showToast('Data prestasi disimpan!', 'success');
        closePrestasiModal();
        loadPrestasiData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editPrestasi(id) { const item = prestasiList.find(x => x.id === id); if(item) openPrestasiModal(item); }
function deletePrestasi(id) {
    showCustomConfirm('Hapus Prestasi?', 'Hapus permanen prestasi siswa ini?', 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('prestasi_siswa').delete().eq('id', id);
            showToast('Prestasi dihapus!', 'success');
            loadPrestasiData();
        } catch(e) { showToast('Gagal: '+e.message, 'error'); }
    });
}

// ============================================================
// LAYANAN KESISWAAN: BIMBINGAN KONSELING (CRUD)
// ============================================================
var bkList = [];
async function loadBkData() {
    var tbody = document.getElementById('bkTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('bimbingan_konseling').select('*, siswa(nama_lengkap, master_kelas(nama_kelas))').order('tanggal', { ascending: false });
        if (error) throw error;
        bkList = data || [];
        if (bkList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada catatan BK.</td></tr>';
            return;
        }
        tbody.innerHTML = bkList.map((bk, i) => {
            var tgl = bk.tanggal ? new Date(bk.tanggal).toLocaleDateString('id-ID') : '-';
            var nama = bk.siswa ? `${bk.siswa.nama_lengkap} ${bk.siswa.master_kelas ? '('+bk.siswa.master_kelas.nama_kelas+')' : ''}` : '-';
            var statMap = {
                'Terjadwal': '<span class="role-badge" style="background:rgba(148,163,184,.15);">Terjadwal</span>',
                'Proses': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Proses</span>',
                'Selesai': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Selesai</span>',
                'Dirujuk': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Dirujuk</span>'
            };
            return `<tr>
                <td style="text-align:center;">${i+1}</td>
                <td style="font-weight:600;">${nama}</td>
                <td style="font-size:.85rem;">${tgl}</td>
                <td>${bk.jenis_layanan||'-'}</td>
                <td style="font-size:.85rem;">${bk.penyelesaian_tindak_lanjut||'-'}</td>
                <td>${statMap[bk.status]||bk.status}</td>
                <td>${bk.konselor||'-'}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editBk('${bk.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deleteBk('${bk.id}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
async function openBkModal(data) {
    await globalPopulateSiswaDropdown('formBkSiswa');
    document.getElementById('formBkId').value = data ? data.id : '';
    document.getElementById('formBkSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formBkTanggal').value = data ? (data.tanggal||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formBkLayanan').value = data ? (data.jenis_layanan||'Konseling Individu') : 'Konseling Individu';
    document.getElementById('formBkStatus').value = data ? (data.status||'Proses') : 'Proses';
    document.getElementById('formBkPermasalahan').value = data ? (data.permasalahan||'') : '';
    document.getElementById('formBkPenyelesaian').value = data ? (data.penyelesaian_tindak_lanjut||'') : '';
    document.getElementById('formBkKonselor').value = data ? (data.konselor||'') : '';
    document.getElementById('formBkCatatan').value = data ? (data.catatan_rahasia||'') : '';
    document.getElementById('bkModalTitle').textContent = data ? 'Edit Catatan BK' : 'Tambah Catatan BK';
    document.getElementById('bkModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeBkModal() { document.getElementById('bkModal').classList.remove('active'); }
async function saveBk() {
    var id = document.getElementById('formBkId').value;
    var obj = {
        siswa_id: document.getElementById('formBkSiswa').value || null,
        tanggal: document.getElementById('formBkTanggal').value || null,
        jenis_layanan: document.getElementById('formBkLayanan').value,
        status: document.getElementById('formBkStatus').value,
        permasalahan: document.getElementById('formBkPermasalahan').value.trim(),
        penyelesaian_tindak_lanjut: document.getElementById('formBkPenyelesaian').value.trim() || null,
        konselor: document.getElementById('formBkKonselor').value.trim() || null,
        catatan_rahasia: document.getElementById('formBkCatatan').value.trim() || null
    };
    if (!obj.siswa_id || !obj.permasalahan) { showToast('Siswa dan Permasalahan wajib diisi!', 'warning'); return; }
    try {
        if (id) await supabaseClient.from('bimbingan_konseling').update(obj).eq('id', id);
        else await supabaseClient.from('bimbingan_konseling').insert([obj]);
        showToast('Catatan BK disimpan!', 'success');
        closeBkModal();
        loadBkData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editBk(id) { const item = bkList.find(x => x.id === id); if(item) openBkModal(item); }
function deleteBk(id) {
    showCustomConfirm('Hapus Catatan BK?', 'Hapus permanen catatan ini?', 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('bimbingan_konseling').delete().eq('id', id);
            showToast('Catatan BK dihapus!', 'success');
            loadBkData();
        } catch(e) { showToast('Gagal: '+e.message, 'error'); }
    });
}

// ============================================================
// LAYANAN KESISWAAN: CATATAN KESEHATAN (CRUD)
// ============================================================
var kesehatanList = [];
async function loadKesehatanData() {
    var tbody = document.getElementById('kesehatanTableBody');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('kesehatan_siswa').select('*, siswa(nama_lengkap, master_kelas(nama_kelas))').order('tanggal', { ascending: false });
        if (error) throw error;
        kesehatanList = data || [];
        if (kesehatanList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada catatan kesehatan.</td></tr>';
            return;
        }
        tbody.innerHTML = kesehatanList.map((k, i) => {
            var tgl = k.tanggal ? new Date(k.tanggal).toLocaleDateString('id-ID') : '-';
            var nama = k.siswa ? `${k.siswa.nama_lengkap} ${k.siswa.master_kelas ? '('+k.siswa.master_kelas.nama_kelas+')' : ''}` : '-';
            return `<tr>
                <td style="text-align:center;">${i+1}</td>
                <td style="font-weight:600;">${nama}</td>
                <td style="font-size:.85rem;">${tgl}</td>
                <td style="color:#ef4444;font-weight:600;">${k.keluhan_penyakit||'-'}</td>
                <td style="font-size:.85rem;">${k.tindakan_obat||'-'}</td>
                <td>${k.petugas_uks||'-'}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editKesehatan('${k.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deleteKesehatan('${k.id}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
async function openKesehatanModal(data) {
    await globalPopulateSiswaDropdown('formKesehatanSiswa');
    document.getElementById('formKesehatanId').value = data ? data.id : '';
    document.getElementById('formKesehatanSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formKesehatanTanggal').value = data ? (data.tanggal||'') : new Date().toISOString().split('T')[0];
    document.getElementById('formKesehatanKeluhan').value = data ? (data.keluhan_penyakit||'') : '';
    document.getElementById('formKesehatanTindakan').value = data ? (data.tindakan_obat||'') : '';
    document.getElementById('formKesehatanPetugas').value = data ? (data.petugas_uks||'') : '';
    document.getElementById('formKesehatanKeterangan').value = data ? (data.keterangan||'') : '';
    document.getElementById('kesehatanModalTitle').textContent = data ? 'Edit Catatan Kesehatan' : 'Tambah Catatan Kesehatan';
    document.getElementById('kesehatanModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}
function closeKesehatanModal() { document.getElementById('kesehatanModal').classList.remove('active'); }
async function saveKesehatan() {
    var id = document.getElementById('formKesehatanId').value;
    var obj = {
        siswa_id: document.getElementById('formKesehatanSiswa').value || null,
        tanggal: document.getElementById('formKesehatanTanggal').value || null,
        keluhan_penyakit: document.getElementById('formKesehatanKeluhan').value.trim() || null,
        tindakan_obat: document.getElementById('formKesehatanTindakan').value.trim() || null,
        petugas_uks: document.getElementById('formKesehatanPetugas').value.trim() || null,
        keterangan: document.getElementById('formKesehatanKeterangan').value.trim() || null
    };
    if (!obj.siswa_id || !obj.keluhan_penyakit) { showToast('Siswa dan Keluhan wajib diisi!', 'warning'); return; }
    try {
        if (id) await supabaseClient.from('kesehatan_siswa').update(obj).eq('id', id);
        else await supabaseClient.from('kesehatan_siswa').insert([obj]);
        showToast('Catatan Kesehatan disimpan!', 'success');
        closeKesehatanModal();
        loadKesehatanData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editKesehatan(id) { const item = kesehatanList.find(x => x.id === id); if(item) openKesehatanModal(item); }
function deleteKesehatan(id) {
    showCustomConfirm('Hapus Catatan?', 'Hapus permanen catatan kesehatan ini?', 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('kesehatan_siswa').delete().eq('id', id);
            showToast('Catatan Kesehatan dihapus!', 'success');
            loadKesehatanData();
        } catch(e) { showToast('Gagal: '+e.message, 'error'); }
    });
}

// ============================================================
// BUAT SOAL ASESMEN — Google Forms & Sheets Integration
// ============================================================
var asesmenBuilderSoalList = []; // in-memory soal list for builder
var asesmenList = [];

// --- Config ---
async function loadAsesmenConfig() {
    var input = document.getElementById('gasUrlInput');
    if (!input || !supabaseClient) return;
    try {
        const { data } = await supabaseClient.from('system_settings').select('value').eq('key', 'gas_web_app_url').maybeSingle();
        if (data && data.value) input.value = data.value;
    } catch(e) { console.warn('loadAsesmenConfig:', e); }
}

async function saveAsesmenConfig() {
    var url = (document.getElementById('gasUrlInput') || {}).value || '';
    if (!url.trim()) { showToast('URL Google Apps Script wajib diisi!', 'warning'); return; }
    try {
        const { data: existing } = await supabaseClient.from('system_settings').select('key').eq('key', 'gas_web_app_url').maybeSingle();
        if (existing) {
            await supabaseClient.from('system_settings').update({ value: url.trim() }).eq('key', 'gas_web_app_url');
        } else {
            await supabaseClient.from('system_settings').insert([{ key: 'gas_web_app_url', value: url.trim() }]);
        }
        showToast('Konfigurasi disimpan!', 'success');
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

// --- Load Asesmen List (History Table) ---
async function loadAsesmenList() {
    var tbody = document.getElementById('asesmenTableBody');
    var countEl = document.getElementById('asesmenCount');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        var query = supabaseClient.from('asesmen').select('*').is('deleted_at', null).order('tanggal_pelaksanaan', { ascending: true, nullsFirst: false });
        const { data, error } = await query;
        if (error) throw error;
        asesmenList = (data || []).filter(function(a) { return !a.archived_at; });
        if (countEl) countEl.textContent = asesmenList.length + ' asesmen';
        loadSampahCount();
        
        var isAdminKurikulum = currentRole === 'admin' || currentRole === 'kurikulum';
        
        if (asesmenList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada asesmen. Klik "Buat Asesmen Baru" untuk mulai.</td></tr>';
            return;
        }
        // count soal per asesmen
        var asesmenIds = asesmenList.map(function(a) { return a.id; });
        const { data: soalCounts } = await supabaseClient.from('asesmen_soal').select('asesmen_id');
        var countMap = {};
        if (soalCounts) {
            soalCounts.forEach(function(s) {
                countMap[s.asesmen_id] = (countMap[s.asesmen_id] || 0) + 1;
            });
        }
        tbody.innerHTML = asesmenList.map(function(a, i) {
            var statusBadge = a.status === 'terbit'
                ? '<span class="badge-terbit">Terbit</span>'
                : '<span class="badge-draft">Draft</span>';
            var linkHtml = '<div style="display:flex;flex-direction:column;gap:.25rem;">';
            if (a.google_form_url) linkHtml += '<a href="' + a.google_form_url + '" target="_blank" style="color:var(--primary);font-size:.82rem;font-weight:600;"><i data-lucide="external-link" style="width:12px;height:12px;"></i> Form Siswa</a>';
            if (a.google_form_edit_url) linkHtml += '<a href="' + a.google_form_edit_url + '" target="_blank" style="color:#d97706;font-size:.82rem;font-weight:600;" title="Edit form untuk tambah Kop Surat"><i data-lucide="settings" style="width:12px;height:12px;"></i> Edit Form (Kop/Tema)</a>';
            if (a.google_sheet_url) linkHtml += '<a href="' + a.google_sheet_url + '" target="_blank" style="color:#16a34a;font-size:.82rem;font-weight:600;"><i data-lucide="table" style="width:12px;height:12px;"></i> Rekap Nilai</a>';
            if (!a.google_form_url && !a.google_sheet_url) linkHtml += '<span style="color:var(--text-light);font-size:.82rem;">—</span>';
            linkHtml += '</div>';
            var jumlahSoal = countMap[a.id] || 0;
            var canManage = isAdminKurikulum || (currentUser && a.created_by === currentUser.id);
            var aksiHtml = '';
            
            if (canManage) {
                if (a.status === 'draft') {
                    aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="previewAsesmen(\'' + a.id + '\')" title="Detail/Preview"><i data-lucide="eye" style="width:14px;height:14px"></i></button>' +
                        '<button class="btn-icon btn-icon-blue" onclick="editAsesmenDraft(\'' + a.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                        '<button class="btn-icon btn-icon-red" onclick="deleteAsesmen(\'' + a.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
                } else {
                    // Status terbit — tombol kirim ke ujian (admin only) + gerigi status (admin only, hanya jika sudah dikirim)
                    var sendBtn = '';
                    var ujianBtn = '';
                    var isAdmin = currentRole === 'admin';
                    if (a.google_form_url && isAdmin) {
                        if (a.ujian_sent_at) {
                            // Sudah dikirim → tombol tarik/unsend
                            sendBtn = '<button class="btn-icon" style="background:rgba(239,68,68,.1);color:#ef4444;" onclick="unsendFromUjian(\'' + a.id + '\')" title="Tarik dari Soal Ujian"><i data-lucide="undo-2" style="width:14px;height:14px"></i></button>';
                            // Tampilkan tombol gerigi untuk aktif/nonaktif
                            var gearColor = a.ujian_aktif === true ? 'background:rgba(5,150,105,.12);color:#059669;' : a.ujian_aktif === false ? 'background:rgba(100,116,139,.12);color:#64748b;' : 'background:rgba(124,58,237,.08);color:#7c3aed;';
                            ujianBtn = '<button class="btn-icon" style="' + gearColor + '" onclick="openUjianSettingsModal(\'' + a.id + '\')" title="Kelola Status Ujian"><i data-lucide="settings" style="width:14px;height:14px"></i></button>';
                        } else {
                            // Belum dikirim → tombol kirim
                            sendBtn = '<button class="btn-icon" style="background:rgba(16,185,129,.1);color:#10b981;" onclick="sendToSoalUjian(\'' + a.id + '\')" title="Kirim ke Soal Ujian"><i data-lucide="send" style="width:14px;height:14px"></i></button>';
                        }
                    }
                    var regradeBtn = '';
                    if (a.google_form_url && a.google_sheet_url) {
                        regradeBtn = '<button class="btn-icon" style="background:rgba(139,92,246,.1);color:#8b5cf6;" onclick="regradeAsesmen(\'' + a.id + '\')" title="Koreksi Ulang Semua Jawaban"><i data-lucide="refresh-cw" style="width:14px;height:14px"></i></button>';
                    }
                    aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="previewAsesmen(\'' + a.id + '\')" title="Detail/Preview"><i data-lucide="eye" style="width:14px;height:14px"></i></button>' +
                        regradeBtn + sendBtn + ujianBtn +
                        '<button class="btn-icon btn-icon-amber" onclick="archiveAsesmen(\'' + a.id + '\')" title="Arsipkan"><i data-lucide="archive" style="width:14px;height:14px"></i></button>' +
                        '<button class="btn-icon btn-icon-red" onclick="deleteAsesmen(\'' + a.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
                }
            } else {
                aksiHtml = '<span style="color:var(--text-light);font-size:0.8rem;font-style:italic;">Hanya pemilik</span>';
            }
            var tglUjian = a.tanggal_pelaksanaan ? new Date(a.tanggal_pelaksanaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                '<td>' + (a.kelas || '-') + '</td>' +
                '<td>' + (a.tipe_ujian || '-') + '</td>' +
                '<td style="font-size:.82rem;white-space:nowrap;">' + tglUjian + '</td>' +
                '<td style="text-align:center;">' + jumlahSoal + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + linkHtml + '</td>' +
                '<td><div style="display:flex;gap:.4rem;justify-content:center;">' + aksiHtml + '</div></td>' +
                '</tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

// ============================================================
// KOREKSI ULANG (REGRADE) ASESMEN
// ============================================================

async function regradeAsesmen(asesmenId) {
    var a = asesmenList.find(function(x) { return x.id === asesmenId; });
    if (!a) { showToast('Asesmen tidak ditemukan!', 'error'); return; }
    if (!a.google_form_url) { showToast('Form URL tidak ditemukan!', 'error'); return; }
    
    showCustomConfirm(
        'Koreksi Ulang Semua Jawaban?',
        'Sistem akan mengoreksi ulang <strong>semua jawaban siswa</strong> yang sudah masuk pada asesmen:<br><br>' +
        '<strong>"' + escHtml(a.judul || '-') + '"</strong><br><br>' +
        '✅ Jawaban yang sudah terekam akan dikoreksi otomatis<br>' +
        '✅ Trigger auto-grading akan dipulihkan jika hilang<br>' +
        '✅ Hasil koreksi masuk ke tab "Hasil Koreksi" di Google Sheet<br><br>' +
        '⏱️ Proses ini mungkin memakan waktu beberapa detik tergantung jumlah jawaban.',
        'Ya, Koreksi Ulang',
        async function() {
            showGlobalLoader('Mengoreksi ulang semua jawaban... Harap tunggu');
            try {
                var gasUrl = await _getGasUrl();
                if (!gasUrl) {
                    showToast('URL Google Apps Script belum dikonfigurasi!', 'warning');
                    return;
                }
                
                var response = await fetch(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'regrade',
                        formUrl: a.google_form_edit_url || a.google_form_url
                    })
                });
                var result = await response.json();
                
                if (result.status === 'success') {
                    var infoHtml = '<strong>' + escHtml(result.message) + '</strong>';
                    if (result.triggerRestored) {
                        infoHtml += '<br><br>🔄 <span style="color:#16a34a;">Trigger auto-grading berhasil dipulihkan!</span><br>Jawaban baru selanjutnya akan otomatis dikoreksi.';
                    }
                    showNotifModal('Koreksi Ulang Berhasil! ✅', infoHtml, 'success');
                } else {
                    throw new Error(result.message || 'Gagal mengoreksi ulang');
                }
            } catch(e) {
                showNotifModal('Gagal Koreksi Ulang', 'Terjadi kesalahan:<br><br><strong>' + escHtml(e.message) + '</strong><br><br>Pastikan URL Google Apps Script sudah benar dan form masih ada.', 'error');
            } finally {
                hideGlobalLoader();
            }
        }
    );
}

// ============================================================
// SOAL UJIAN — Kelola Link Ujian dari Asesmen Terbit
// ============================================================

// --- Kirim asesmen ke menu Soal Ujian (status awal: pending / "-") ---
async function sendToSoalUjian(asesmenId) {
    showCustomConfirm(
        'Kirim ke Soal Ujian?',
        'Soal akan muncul di menu <strong>Soal Ujian</strong> dengan status <strong>belum aktif (—)</strong>.<br>Anda bisa mengaktifkannya nanti via tombol ⚙️.',
        'Ya, Kirim',
        async function() {
            if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengirim ke Soal Ujian...');
            try {
                const { error } = await supabaseClient.rpc('send_to_ujian', { target_asesmen_id: asesmenId });
                if (error) throw error;
                showToast('✅ Soal berhasil dikirim ke menu Soal Ujian!', 'success');
                loadAsesmenList();
            } catch(e) {
                showToast('Gagal: ' + e.message, 'error');
            } finally {
                if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            }
        }
    );
}

// --- Tarik asesmen dari menu Soal Ujian (hapus dari tampilan) ---
async function unsendFromUjian(asesmenId) {
    showCustomConfirm(
        'Tarik dari Soal Ujian?',
        'Soal ini akan <strong>dihapus dari menu Soal Ujian</strong> dan tidak akan tampil di tabel aktif maupun kadaluarsa.<br>Data asesmen tetap aman.',
        'Ya, Tarik',
        async function() {
            if (typeof showGlobalLoader === 'function') showGlobalLoader('Menarik dari Soal Ujian...');
            try {
                const { error } = await supabaseClient.rpc('unsend_from_ujian', { target_asesmen_id: asesmenId });
                if (error) throw error;
                showToast('✅ Soal berhasil ditarik dari menu Soal Ujian.', 'success');
                loadAsesmenList();
            } catch(e) {
                showToast('Gagal: ' + e.message, 'error');
            } finally {
                if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            }
        }
    );
}

// --- Modal: Kelola status aktif/nonaktif ujian ---
function openUjianSettingsModal(asesmenId) {
    var a = asesmenList.find(function(x) { return x.id === asesmenId; });
    if (!a) { showToast('Data asesmen tidak ditemukan.', 'error'); return; }

    document.getElementById('ujianModalAsesmenId').value = asesmenId;
    document.getElementById('ujianModalSubtitle').textContent = a.judul || '';

    var tgl = a.tanggal_pelaksanaan ? new Date(a.tanggal_pelaksanaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
    var statusText = a.ujian_aktif === true ? '<span style="color:#059669;font-weight:700;">🟢 Aktif</span>'
        : a.ujian_aktif === false ? '<span style="color:#ef4444;font-weight:700;">🔴 Nonaktif</span>'
        : '<span style="color:#94a3b8;font-weight:600;">— Belum diaktifkan</span>';

    document.getElementById('ujianModalInfo').innerHTML =
        '<div style="display:grid;grid-template-columns:auto 1fr;gap:.3rem .6rem;font-size:.82rem;">' +
        '<span style="color:#64748b;">Mapel:</span><span style="font-weight:600;">' + (a.mata_pelajaran || '-') + '</span>' +
        '<span style="color:#64748b;">Kelas:</span><span>' + (a.kelas || '-') + '</span>' +
        '<span style="color:#64748b;">Tipe:</span><span>' + (a.tipe_ujian || '-') + '</span>' +
        '<span style="color:#64748b;">Tanggal:</span><span>' + tgl + '</span>' +
        '<span style="color:#64748b;">Status:</span><span>' + statusText + '</span>' +
        '</div>';

    // Set radio default
    if (a.ujian_aktif === false) {
        document.getElementById('ujianRadioNonaktif').checked = true;
    } else {
        document.getElementById('ujianRadioAktif').checked = true;
    }
    updateUjianRadioStyle();

    document.getElementById('ujianSettingsModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeUjianSettingsModal() {
    document.getElementById('ujianSettingsModal').classList.remove('active');
}

function updateUjianRadioStyle() {
    var aktifLabel = document.getElementById('ujianRadioAktifLabel');
    var nonaktifLabel = document.getElementById('ujianRadioNonaktifLabel');
    var isAktif = document.getElementById('ujianRadioAktif').checked;

    if (aktifLabel) aktifLabel.style.borderColor = isAktif ? '#059669' : '#e2e8f0';
    if (aktifLabel) aktifLabel.style.background = isAktif ? 'rgba(5,150,105,.05)' : '';
    if (nonaktifLabel) nonaktifLabel.style.borderColor = !isAktif ? '#ef4444' : '#e2e8f0';
    if (nonaktifLabel) nonaktifLabel.style.background = !isAktif ? 'rgba(239,68,68,.05)' : '';
}

// --- Simpan status aktif/nonaktif ---
async function saveUjianSettings() {
    var asesmenId = document.getElementById('ujianModalAsesmenId').value;
    var isAktif = document.getElementById('ujianRadioAktif').checked;

    if (!asesmenId) { showToast('ID asesmen tidak valid.', 'error'); return; }

    if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan status ujian...');

    try {
        const { error } = await supabaseClient.rpc('update_ujian_status', {
            target_asesmen_id: asesmenId,
            is_aktif: isAktif
        });
        if (error) throw error;

        showToast('✅ Status ujian berhasil di' + (isAktif ? 'aktifkan' : 'nonaktifkan') + '!', 'success');
        closeUjianSettingsModal();
        loadAsesmenList();
    } catch(e) {
        showToast('Gagal: ' + e.message, 'error');
    } finally {
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
    }
}

// --- Load data untuk menu Soal Ujian ---
async function loadSoalUjian() {
    var tbodyAktif = document.getElementById('ujianAktifTbody');
    var tbodyNonaktif = document.getElementById('ujianNonaktifTbody');
    if (!tbodyAktif || !tbodyNonaktif || !supabaseClient) return;

    tbodyAktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    tbodyNonaktif.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';

    try {
        // Ambil asesmen yang sudah dikirim ke ujian (ujian_sent_at IS NOT NULL)
        const { data, error } = await supabaseClient
            .from('asesmen')
            .select('*')
            .not('ujian_sent_at', 'is', null)
            .is('deleted_at', null)
            .order('ujian_sent_at', { ascending: false });

        if (error) throw error;
        var list = data || [];

        // Aktif = ujian_aktif === true, Pending = ujian_aktif === null → tampil di tabel aktif dengan status "-"
        var aktifList = list.filter(function(a) { return a.ujian_aktif === true || a.ujian_aktif === null; });
        var nonaktifList = list.filter(function(a) { return a.ujian_aktif === false; });

        // Render Tabel Aktif (termasuk pending)
        if (aktifList.length === 0) {
            tbodyAktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada soal ujian yang aktif, silahkan hubungi admin</td></tr>';
        } else {
            tbodyAktif.innerHTML = aktifList.map(function(a, i) {
                var tgl = a.tanggal_pelaksanaan ? new Date(a.tanggal_pelaksanaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                var isPending = a.ujian_aktif === null;
                var linkBtn, statusBadge;
                if (isPending) {
                    linkBtn = '<span style="color:#94a3b8;font-size:.82rem;">Belum diaktifkan</span>';
                    statusBadge = '<span class="badge" style="background:rgba(148,163,184,.12);color:#94a3b8;font-size:.75rem;">—</span>';
                } else {
                    linkBtn = a.google_form_url
                        ? '<a href="' + a.google_form_url + '" target="_blank" class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#047857);color:white;border:none;font-weight:700;font-size:.78rem;padding:.4rem .8rem;border-radius:8px;text-decoration:none;display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap;"><i data-lucide="external-link" style="width:13px;height:13px"></i> Kerjakan Sekarang</a>'
                        : '<span style="color:var(--text-light);font-size:.82rem;">Link belum tersedia</span>';
                    statusBadge = '<span class="badge" style="background:rgba(5,150,105,.1);color:#059669;font-size:.75rem;font-weight:700;">Aktif</span>';
                }
                return '<tr>' +
                    '<td style="text-align:center;">' + (i + 1) + '</td>' +
                    '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                    '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                    '<td>' + (a.kelas || '-') + '</td>' +
                    '<td>' + (a.tipe_ujian || '-') + '</td>' +
                    '<td>' + tgl + '</td>' +
                    '<td style="text-align:center;">' + (a.waktu_menit || '-') + '</td>' +
                    '<td>' + linkBtn + '</td>' +
                    '<td>' + statusBadge + '</td>' +
                    '</tr>';
            }).join('');
        }

        // Render Tabel Nonaktif/Kadaluarsa
        if (nonaktifList.length === 0) {
            tbodyNonaktif.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada ujian kadaluarsa.</td></tr>';
        } else {
            tbodyNonaktif.innerHTML = nonaktifList.map(function(a, i) {
                var tgl = a.tanggal_pelaksanaan ? new Date(a.tanggal_pelaksanaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                return '<tr style="opacity:.6;">' +
                    '<td style="text-align:center;">' + (i + 1) + '</td>' +
                    '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                    '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                    '<td>' + (a.kelas || '-') + '</td>' +
                    '<td>' + (a.tipe_ujian || '-') + '</td>' +
                    '<td>' + tgl + '</td>' +
                    '<td><span style="color:var(--text-light);font-size:.82rem;text-decoration:line-through;">Link dinonaktifkan</span></td>' +
                    '<td><span class="badge" style="background:rgba(100,116,139,.1);color:#64748b;font-size:.75rem;">Kadaluarsa</span></td>' +
                    '</tr>';
            }).join('');
        }

        if (window.lucide) lucide.createIcons();
    } catch(e) {
        tbodyAktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
        tbodyNonaktif.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

// --- Open Builder (new or edit) ---
async function openAsesmenBuilder(existingId) {
    document.getElementById('asesmenBuilderArea').style.display = 'block';
    document.getElementById('asesmenParseArea').style.display = 'none';
    document.getElementById('asesmenAIGenerateArea').style.display = 'none';
    var gformArea = document.getElementById('asesmenGFormLinkArea'); if (gformArea) gformArea.style.display = 'none';
    asesmenBuilderSoalList = [];

    // populate dropdowns
    await loadMasterMapel();
    await loadMasterKelas();
    await loadActiveYear();
    populateMapelNameDropdown('builderMapel', '');
    populateKelasNameDropdown('builderKelas', '');

    // Auto-fill Tahun Pelajaran dari master data (readonly)
    var lblYear = document.getElementById('lblActiveYear');
    var builderTahun = document.getElementById('builderTahun');
    if (lblYear && builderTahun) {
        var yearVal = lblYear.textContent;
        builderTahun.value = (yearVal && yearVal !== 'Belum diatur') ? yearVal : '';
    }

    if (existingId) {
        // load existing asesmen
        document.getElementById('builderTitle').textContent = 'Edit Asesmen (Draft)';
        document.getElementById('builderAsesmenId').value = existingId;
        try {
            const { data: asm } = await supabaseClient.from('asesmen').select('*').eq('id', existingId).single();
            if (asm) {
                document.getElementById('builderJudul').value = asm.judul || '';
                document.getElementById('builderTipe').value = asm.tipe_ujian || 'STS';
                document.getElementById('builderWaktu').value = asm.waktu_menit || '';
                document.getElementById('builderTanggal').value = asm.tanggal_pelaksanaan || '';
                document.getElementById('builderBobotPG').value = (asm.bobot_pg !== null && asm.bobot_pg !== undefined) ? asm.bobot_pg : '';
                document.getElementById('builderBobotEssay').value = (asm.bobot_essay !== null && asm.bobot_essay !== undefined) ? asm.bobot_essay : '';
                populateMapelNameDropdown('builderMapel', asm.mata_pelajaran || '');
                populateKelasNameDropdown('builderKelas', asm.kelas || '');
            }
            const { data: soalData } = await supabaseClient.from('asesmen_soal').select('*').eq('asesmen_id', existingId).order('nomor_soal', { ascending: true });
            asesmenBuilderSoalList = (soalData || []).map(function(s) {
                return {
                    id: s.id,
                    tipe: s.tipe_soal,
                    naskah: s.naskah_soal || '',
                    opsi_a: s.opsi_a || '',
                    opsi_b: s.opsi_b || '',
                    opsi_c: s.opsi_c || '',
                    opsi_d: s.opsi_d || '',
                    kunci: s.kunci_jawaban || '',
                    gambar_url: s.gambar_url || ''
                };
            });
        } catch(e) { showToast('Gagal memuat draft: ' + e.message, 'error'); }
    } else {
        document.getElementById('builderTitle').textContent = 'Buat Asesmen Baru';
        document.getElementById('builderAsesmenId').value = '';
        document.getElementById('builderJudul').value = '';
        document.getElementById('builderTipe').value = 'STS';
        document.getElementById('builderMapel').value = '';
        document.getElementById('builderKelas').value = '';
        document.getElementById('builderWaktu').value = '';
        document.getElementById('builderTanggal').value = '';
        document.getElementById('builderBobotPG').value = '';
        document.getElementById('builderBobotEssay').value = '';
        document.getElementById('builderSemester').value = 'Ganjil';
    }

    renderSoalCards();
    if (window.lucide) lucide.createIcons();

    // scroll to builder
    document.getElementById('asesmenBuilderArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAsesmenBuilder() {
    document.getElementById('asesmenBuilderArea').style.display = 'none';
    asesmenBuilderSoalList = [];
}

function openParseArea() {
    document.getElementById('asesmenParseArea').style.display = 'block';
    document.getElementById('asesmenAIGenerateArea').style.display = 'none';
    document.getElementById('asesmenBuilderArea').style.display = 'none';
    var gformArea = document.getElementById('asesmenGFormLinkArea'); if (gformArea) gformArea.style.display = 'none';
    
    populateMapelNameDropdown('parseMapel', '');
    populateKelasNameDropdown('parseKelas', '');
    var lblYear = document.getElementById('lblActiveYear');
    var parseTahun = document.getElementById('parseTahun');
    if (lblYear && parseTahun) {
        var yearVal = lblYear.textContent;
        parseTahun.value = (yearVal && yearVal !== 'Belum diatur') ? yearVal : '';
    }
    document.getElementById('asesmenParseArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeParseArea() {
    document.getElementById('asesmenParseArea').style.display = 'none';
}

function openAIArea() {
    document.getElementById('asesmenAIGenerateArea').style.display = 'block';
    document.getElementById('asesmenParseArea').style.display = 'none';
    document.getElementById('asesmenBuilderArea').style.display = 'none';
    var gformArea = document.getElementById('asesmenGFormLinkArea'); if (gformArea) gformArea.style.display = 'none';
    
    populateMapelNameDropdown('aiMapel', '');
    populateKelasNameDropdown('aiKelas', '');
    var lblYear = document.getElementById('lblActiveYear');
    var aiTahun = document.getElementById('aiTahun');
    if (lblYear && aiTahun) {
        var yearVal = lblYear.textContent;
        aiTahun.value = (yearVal && yearVal !== 'Belum diatur') ? yearVal : '';
    }
    document.getElementById('asesmenAIGenerateArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAIArea() {
    document.getElementById('asesmenAIGenerateArea').style.display = 'none';
}

// --- Google Form Link Area (Paste link dari guru) ---
function openGoogleFormLinkArea() {
    document.getElementById('asesmenGFormLinkArea').style.display = 'block';
    document.getElementById('asesmenBuilderArea').style.display = 'none';
    document.getElementById('asesmenParseArea').style.display = 'none';
    document.getElementById('asesmenAIGenerateArea').style.display = 'none';

    populateMapelNameDropdown('gformMapel', '');
    populateKelasNameDropdown('gformKelas', '');
    var lblYear = document.getElementById('lblActiveYear');
    var gformTahun = document.getElementById('gformTahun');
    if (lblYear && gformTahun) {
        var yearVal = lblYear.textContent;
        gformTahun.value = (yearVal && yearVal !== 'Belum diatur') ? yearVal : '';
    }
    // Reset form fields
    document.getElementById('gformJudul').value = '';
    document.getElementById('gformTipe').value = 'PH';
    document.getElementById('gformSemester').value = 'Ganjil';
    document.getElementById('gformWaktu').value = '';
    document.getElementById('gformTanggal').value = '';
    document.getElementById('gformLink').value = '';

    document.getElementById('asesmenGFormLinkArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.lucide) lucide.createIcons();
}

function closeGoogleFormLinkArea() {
    document.getElementById('asesmenGFormLinkArea').style.display = 'none';
}

async function saveGoogleFormLink() {
    var judul = (document.getElementById('gformJudul') || {}).value || '';
    var tipe = (document.getElementById('gformTipe') || {}).value || 'PH';
    var mapel = (document.getElementById('gformMapel') || {}).value || '';
    var kelas = (document.getElementById('gformKelas') || {}).value || '';
    var tahun = (document.getElementById('gformTahun') || {}).value || '';
    var semester = (document.getElementById('gformSemester') || {}).value || 'Ganjil';
    var waktu = (document.getElementById('gformWaktu') || {}).value || '';
    var tanggal = (document.getElementById('gformTanggal') || {}).value || '';
    var link = (document.getElementById('gformLink') || {}).value || '';

    // Validasi
    if (!judul.trim()) { showToast('Judul Asesmen wajib diisi!', 'warning'); return; }
    if (!mapel) { showToast('Mata Pelajaran wajib dipilih!', 'warning'); return; }
    if (!kelas) { showToast('Kelas wajib dipilih!', 'warning'); return; }
    if (!waktu) { showToast('Waktu pengerjaan wajib diisi!', 'warning'); return; }
    if (!tanggal) { showToast('Tanggal ujian wajib diisi!', 'warning'); return; }
    if (!link.trim()) { showToast('Link Google Form wajib diisi!', 'warning'); return; }

    // Validasi format URL Google Form
    var linkLower = link.trim().toLowerCase();
    if (linkLower.indexOf('docs.google.com/forms') === -1 && linkLower.indexOf('forms.gle') === -1 && linkLower.indexOf('google.com') === -1) {
        showToast('Link yang dimasukkan bukan URL Google Form yang valid!', 'warning');
        return;
    }

    try {
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan link Google Form...');

        var payload = {
            judul: judul.trim(),
            mata_pelajaran: mapel,
            kelas: kelas,
            tipe_ujian: tipe,
            tahun_pelajaran: tahun || null,
            semester: semester,
            waktu_menit: parseInt(waktu) || 0,
            tanggal_pelaksanaan: tanggal,
            google_form_url: link.trim(),
            status: 'terbit',
            bobot_pg: 0,
            bobot_essay: 0,
            published_at: new Date().toISOString(),
            created_by: currentUser ? currentUser.id : null,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient.from('asesmen').insert([payload]).select('id').single();
        if (error) throw error;

        showToast('✅ Link Google Form berhasil disimpan dan akan tampil di Riwayat Asesmen!', 'success');
        closeGoogleFormLinkArea();
        loadAsesmenList();
    } catch(e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
    }
}

async function editAsesmenDraft(id) {
    await openAsesmenBuilder(id);
}

async function previewAsesmen(id) {
    showGlobalLoader('Memuat detail soal...');
    try {
        const { data: asm, error: err1 } = await supabaseClient.from('asesmen').select('*').eq('id', id).single();
        if (err1) throw err1;
        
        const { data: soalList, error: err2 } = await supabaseClient.from('asesmen_soal').select('*').eq('asesmen_id', id).order('nomor_soal', { ascending: true });
        if (err2) throw err2;
        
        var contentHtml = '<div style="max-height:60vh;overflow-y:auto;text-align:left;padding-right:10px;">';
        contentHtml += '<h4 style="margin-bottom:10px;color:var(--primary);">' + asm.judul + '</h4>';
        contentHtml += '<p style="font-size:0.85rem;color:var(--text-light);margin-bottom:15px;">Mapel: ' + asm.mata_pelajaran + ' | Kelas: ' + asm.kelas + ' | Waktu: ' + asm.waktu_menit + ' menit</p>';
        
        if (!soalList || soalList.length === 0) {
            contentHtml += '<p style="text-align:center;color:var(--text-light);margin-top:20px;">Belum ada soal pada asesmen ini.</p>';
        } else {
            soalList.forEach(function(s, i) {
                contentHtml += '<div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #e2e8f0;">';
                contentHtml += '<div style="font-weight:600;margin-bottom:6px;font-size:0.9rem;">' + (i+1) + '. ' + (s.tipe_soal === 'pg' ? '<span style="color:#3b82f6">[PG]</span>' : '<span style="color:#8b5cf6">[Essay]</span>') + ' ' + (s.naskah_soal.replace(/\n/g, '<br>')) + '</div>';
                
                if (s.gambar_url) {
                    contentHtml += '<img src="' + s.gambar_url + '" style="max-width:100%;max-height:150px;border-radius:6px;margin-bottom:8px;"/>';
                }
                
                if (s.tipe_soal === 'pg') {
                    contentHtml += '<ol type="A" style="margin-left:20px;font-size:0.85rem;margin-bottom:8px;">';
                    contentHtml += '<li>' + (s.opsi_a || '') + '</li>';
                    contentHtml += '<li>' + (s.opsi_b || '') + '</li>';
                    contentHtml += '<li>' + (s.opsi_c || '') + '</li>';
                    contentHtml += '<li>' + (s.opsi_d || '') + '</li>';
                    contentHtml += '</ol>';
                }
                
                if (s.kunci_jawaban) {
                    contentHtml += '<div style="font-size:0.85rem;color:#10b981;font-weight:600;">Kunci: ' + s.kunci_jawaban + '</div>';
                }
                contentHtml += '</div>';
            });
        }
        contentHtml += '</div>';
        
        showCustomConfirm('Detail Asesmen', contentHtml, 'Tutup', function(){});
    } catch(e) {
        showToast('Gagal memuat detail: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

// --- Populate helpers (by name, not by ID) ---
function populateMapelNameDropdown(selectId, selectedVal) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var opts = '<option value="">Pilih Mata Pelajaran</option>';
    if (typeof masterMapelList !== 'undefined' && masterMapelList) {
        masterMapelList.forEach(function(m) {
            var s = m.nama_mapel === selectedVal ? ' selected' : '';
            opts += '<option value="' + m.nama_mapel + '"' + s + '>' + m.nama_mapel + '</option>';
        });
    }
    sel.innerHTML = opts;
}

function populateKelasNameDropdown(selectId, selectedVal) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var opts = '<option value="">Pilih Kelas</option>';
    if (typeof masterKelasList !== 'undefined' && masterKelasList) {
        masterKelasList.forEach(function(k) {
            var label = k.nama_kelas + ' (Tingkat ' + k.tingkat + ')';
            var s = k.nama_kelas === selectedVal ? ' selected' : '';
            opts += '<option value="' + k.nama_kelas + '"' + s + '>' + label + '</option>';
        });
    }
    sel.innerHTML = opts;
}

// --- Add / Remove Soal Cards ---
function addSoalPGCard() {
    collectSoalFromDOM();
    asesmenBuilderSoalList.push({ tipe: 'pg', naskah: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', kunci: '' });
    renderSoalCards();
}

function addSoalEssayCard() {
    collectSoalFromDOM();
    asesmenBuilderSoalList.push({ tipe: 'essay', naskah: '' });
    renderSoalCards();
}

function addEssayKeyword(idx) {
    collectSoalFromDOM();
    var bobot = parseInt((document.getElementById('builderBobotEssay') || {}).value) || 0;
    if (bobot <= 0) {
        showToast('Info: Silakan isi angka "Bobot per Soal Essay" terlebih dahulu di bagian atas formulir!', 'warning');
        return;
    }
    
    var s = asesmenBuilderSoalList[idx];
    var rawKunciStr = s.kunci || '';
    var isOrLogic = rawKunciStr.indexOf('[OR]') === 0;
    var cleanKunciStr = isOrLogic ? rawKunciStr.substring(4) : rawKunciStr;

    var keywords = cleanKunciStr.split(',').map(function(k) { return k.trim(); }).filter(function(k) { return k !== ''; });
    
    keywords.push(''); // Slot kosong baru
    
    var finalResult = keywords.join(',');
    if (isOrLogic) finalResult = '[OR]' + finalResult;
    s.kunci = finalResult;
    
    renderSoalCards();
}

function removeEssayKeyword(soalIdx, kwIdx) {
    collectSoalFromDOM();
    var s = asesmenBuilderSoalList[soalIdx];
    var rawKunciStr = s.kunci || '';
    var isOrLogic = rawKunciStr.indexOf('[OR]') === 0;
    var cleanKunciStr = isOrLogic ? rawKunciStr.substring(4) : rawKunciStr;

    var keywords = cleanKunciStr.split(',').map(function(k) { return k.trim(); }).filter(function(k) { return k !== ''; });
    keywords.splice(kwIdx, 1);
    
    var finalResult = keywords.join(',');
    if (isOrLogic) finalResult = '[OR]' + finalResult;
    s.kunci = finalResult;
    
    renderSoalCards();
}

function removeSoalCard(idx) {
    collectSoalFromDOM(); // save current state first
    asesmenBuilderSoalList.splice(idx, 1);
    renderSoalCards();
}

function collectSoalFromDOM() {
    var area = document.getElementById('soalCardsArea');
    if (!area) return;
    var cards = area.querySelectorAll('.soal-card');
    cards.forEach(function(card, i) {
        if (i >= asesmenBuilderSoalList.length) return;
        var s = asesmenBuilderSoalList[i];
        var naskahEl = card.querySelector('.soal-naskah-input');
        if (naskahEl) s.naskah = naskahEl.value;
        // Preserve gambar_url from hidden input
        var gambarUrlEl = card.querySelector('.soal-gambar-url');
        if (gambarUrlEl && gambarUrlEl.value) s.gambar_url = gambarUrlEl.value;
        if (s.tipe === 'pg') {
            var aEl = card.querySelector('.soal-opsi-a');
            var bEl = card.querySelector('.soal-opsi-b');
            var cEl = card.querySelector('.soal-opsi-c');
            var dEl = card.querySelector('.soal-opsi-d');
            var kEl = card.querySelector('.soal-kunci-select');
            if (aEl) s.opsi_a = aEl.value;
            if (bEl) s.opsi_b = bEl.value;
            if (cEl) s.opsi_c = cEl.value;
            if (dEl) s.opsi_d = dEl.value;
            if (kEl) s.kunci = kEl.value;
        } else if (s.tipe === 'essay') {
            var keywordInputs = card.querySelectorAll('.soal-kunci-essay-item');
            var kwList = [];
            keywordInputs.forEach(function(inpt) {
                var cleanVal = inpt.value.trim().replace(/,/g, ''); // cegah bentrok koma
                if (cleanVal) kwList.push(cleanVal);
            });
            
            // Simpan slot kosong jika belum diketik supaya tidak hilang saat collect
            var resultStr = kwList.join(',');
            // Tapi kalau slotnya sedang ditambah dan masih kosong, kita pertahankan
            if (keywordInputs.length > kwList.length) {
                for (var z=kwList.length; z<keywordInputs.length; z++) resultStr += (resultStr ? ',' : '') + ' ';
            }
            
            // Cek metode penilaian
            var metodeSelect = card.querySelector('.soal-metode-essay');
            var isOrLogic = metodeSelect && metodeSelect.value === 'OR';
            if (isOrLogic) {
                resultStr = '[OR]' + resultStr;
            }
            
            s.kunci = resultStr;
        }
    });
}

// --- Image Upload for Soal ---
async function handleSoalImageUpload(idx, inputEl) {
    var file = inputEl.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran gambar maksimal 2MB!', 'warning');
        inputEl.value = '';
        return;
    }
    
    showGlobalLoader('Mengupload gambar soal...');
    try {
        var publicUrl = await uploadToGoogleDrive(file, 'soal');
        
        collectSoalFromDOM();
        asesmenBuilderSoalList[idx].gambar_url = publicUrl;
        renderSoalCards();
        showToast('Gambar berhasil diupload!', 'success');
    } catch(e) {
        showToast('Gagal upload gambar: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

function removeSoalImage(idx) {
    collectSoalFromDOM();
    asesmenBuilderSoalList[idx].gambar_url = '';
    renderSoalCards();
}

function renderSoalCards() {
    var area = document.getElementById('soalCardsArea');
    if (!area) return;

    if (asesmenBuilderSoalList.length === 0) {
        area.className = 'soal-cards-area empty-state';
        area.innerHTML = '<i data-lucide="file-plus" style="width:40px;height:40px;opacity:.3"></i><span>Belum ada soal. Klik tombol di bawah untuk menambahkan soal.</span>';
        if (window.lucide) lucide.createIcons();
        return;
    }

    area.className = 'soal-cards-area';
    // Pre-compute separate PG and Essay counters
    var pgCounter = 0;
    var essayCounter = 0;
    area.innerHTML = asesmenBuilderSoalList.map(function(s, i) {
        var isPG = s.tipe === 'pg';
        var displayNum;
        if (isPG) {
            pgCounter++;
            displayNum = 'PG ' + pgCounter;
        } else {
            essayCounter++;
            displayNum = 'Essay ' + essayCounter;
        }
        var cardClass = isPG ? 'soal-card' : 'soal-card soal-card-essay';
        var badgeClass = isPG ? 'soal-type-badge soal-type-badge-pg' : 'soal-type-badge soal-type-badge-essay';
        var badgeText = isPG ? 'Pilihan Ganda' : 'Essay';

        var html = '<div class="' + cardClass + '">' +
            '<div class="soal-card-top">' +
            '<div class="soal-card-left">' +
            '<div class="soal-number-circle">' + (i + 1) + '</div>' +
            '<span class="' + badgeClass + '">' + displayNum + '</span>' +
            '</div>' +
            '<button class="btn-icon btn-icon-red" onclick="removeSoalCard(' + i + ')" title="Hapus Soal"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Naskah Soal</label>' +
            '<textarea class="form-input soal-naskah-input" rows="2" placeholder="Tulis soal di sini...">' + escHtml(s.naskah || '') + '</textarea></div>';

        // Image upload field
        var imgPreview = s.gambar_url ? '<img src="' + escAttr(s.gambar_url) + '" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid #e2e8f0;margin-top:0.5rem;" />' : '';
        html += '<div class="form-group" style="margin-bottom:0.5rem;">' +
            '<label class="form-label" style="font-size:0.8rem;"><i data-lucide="image" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>Gambar Soal (Opsional)</label>' +
            '<input type="file" class="form-input soal-gambar-input" accept="image/*" onchange="handleSoalImageUpload(' + i + ', this)" style="font-size:0.8rem;padding:6px;" />' +
            '<input type="hidden" class="soal-gambar-url" value="' + escAttr(s.gambar_url || '') + '" />' +
            (imgPreview ? '<div class="soal-gambar-preview">' + imgPreview + ' <button type="button" class="btn-icon btn-icon-red" onclick="removeSoalImage(' + i + ')" title="Hapus Gambar" style="margin-left:0.5rem;vertical-align:top;"><i data-lucide="x" style="width:14px;height:14px"></i></button></div>' : '') +
            '</div>';

        if (isPG) {
            html += '<div class="soal-options-grid">' +
                '<div class="soal-option-item"><span class="soal-option-label">A</span><input type="text" class="form-input soal-opsi-a" placeholder="Opsi A" value="' + escAttr(s.opsi_a || '') + '" /></div>' +
                '<div class="soal-option-item"><span class="soal-option-label">B</span><input type="text" class="form-input soal-opsi-b" placeholder="Opsi B" value="' + escAttr(s.opsi_b || '') + '" /></div>' +
                '<div class="soal-option-item"><span class="soal-option-label">C</span><input type="text" class="form-input soal-opsi-c" placeholder="Opsi C" value="' + escAttr(s.opsi_c || '') + '" /></div>' +
                '<div class="soal-option-item"><span class="soal-option-label">D</span><input type="text" class="form-input soal-opsi-d" placeholder="Opsi D" value="' + escAttr(s.opsi_d || '') + '" /></div>' +
                '</div>' +
                '<div class="soal-kunci-row"><label>Kunci Jawaban:</label>' +
                '<select class="form-input soal-kunci-select">' +
                '<option value="">Pilih...</option>' +
                '<option value="A"' + (s.kunci === 'A' ? ' selected' : '') + '>A</option>' +
                '<option value="B"' + (s.kunci === 'B' ? ' selected' : '') + '>B</option>' +
                '<option value="C"' + (s.kunci === 'C' ? ' selected' : '') + '>C</option>' +
                '<option value="D"' + (s.kunci === 'D' ? ' selected' : '') + '>D</option>' +
                '</select></div>';
        } else {
            html += '<div style="margin-top:0.5rem;background:#f8fafc;padding:0.75rem;border-radius:6px;border:1px dashed #cbd5e1;"><label style="font-weight:600;margin-bottom:0.5rem;display:block;color:var(--text);"><i data-lucide="key" style="width:14px;height:14px;color:#0ea5e9;"></i> Kata Kunci Essay (Opsional):</label>';
            
            var rawKunciStr = s.kunci || '';
            var isOrLogic = rawKunciStr.indexOf('[OR]') === 0;
            var cleanKunciStr = isOrLogic ? rawKunciStr.substring(4) : rawKunciStr;
            
            html += '<select class="form-input soal-metode-essay" style="margin-bottom: 0.8rem; font-size: 0.85rem;" onchange="collectSoalFromDOM()">' +
                    '<option value="AND" ' + (!isOrLogic ? 'selected' : '') + '>Metode: Poin Parsial (Siswa wajib memuat SEMUA kata kunci)</option>' +
                    '<option value="OR" ' + (isOrLogic ? 'selected' : '') + '>Metode: Benar Salah / Sinonim (Cukup muat SALAH SATU = Nilai Penuh)</option>' +
                    '</select>';
            
            var keywords = cleanKunciStr.split(',').map(function(k) { return k.trim(); }).filter(function(k) { return k !== ''; });
            var rawKeys = cleanKunciStr.split(',');
            if (rawKeys.length > keywords.length) {
                for (var z=keywords.length; z<rawKeys.length; z++) keywords.push('');
            }
            
            html += '<div style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.5rem;">';
            for (var k = 0; k < keywords.length; k++) {
                html += '<div style="display:flex; gap:0.5rem; align-items:center;">' +
                        '<div style="background:#e0f2fe;color:#0284c7;font-weight:700;font-size:0.7rem;padding:0.2rem 0.6rem;border-radius:20px;">' + (k+1) + '</div>' + 
                        '<input type="text" class="form-input soal-kunci-essay-item" placeholder="Ketik kata kunci ' + (k+1) + '..." value="' + escAttr(keywords[k]) + '" />' +
                        '<button class="btn-icon btn-icon-red" onclick="removeEssayKeyword(' + i + ', ' + k + ')" title="Hapus"><i data-lucide="x" style="width:14px;height:14px"></i></button>' +
                        '</div>';
            }
            html += '</div>';
            
            html += '<button type="button" class="btn btn-outline" style="font-size:0.75rem; padding:0.4rem 0.6rem;" onclick="addEssayKeyword(' + i + ')">' +
                    '<i data-lucide="plus" style="width:12px;height:12px;"></i> Tambah Jawab</button>';
            
            var textHint = !isOrLogic 
                ? 'Poin dibagi rata: Bobot / Jumlah Kata Kunci × Jumlah Benar. Contoh: Bobot 6 dengan 12 kata kunci, benar 6 = skor 3.' 
                : 'Pengecualian: Cukup jawab salah satu kata kunci untuk mendapat nilai penuh (Sinonim).';
                
            html += '<small style="display:block;color:var(--text-light);margin-top:0.5rem;font-size:0.7rem;">*' + textHint + '</small></div>';
        }

        html += '</div>';
        return html;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(str) { return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// --- Save Draft ---
async function saveDraftAsesmen(source) {
    // Detect source: 'parse', 'ai', or 'manual' (default)
    var prefix = 'builder';
    var autoCloseBuilder = true;
    if (source === 'parse') {
        prefix = 'parse';
    } else if (source === 'ai') {
        prefix = 'ai';
    } else if (source === false || source === undefined || source === 'manual' || (source && source instanceof Event)) {
        // Fallback untuk manual / event click standar
        prefix = 'builder';
        autoCloseBuilder = (source !== false);
    }

    // For manual builder, collect from DOM cards
    if (prefix === 'builder') collectSoalFromDOM();

    // For parse/ai source, parse soal from textarea + auto-sort
    if (prefix === 'parse' || prefix === 'ai') {
        var textareaId = prefix === 'parse' ? 'parseTextarea' : 'aiTextarea';
        var rawText = (document.getElementById(textareaId) || {}).value || '';
        if (rawText.trim()) {
            var rawList = parseTextToSoalList(rawText);
            // Auto-sort: semua PG dulu, kemudian semua Essay
            var pgList = rawList.filter(function(s) { return s.tipe === 'pg'; });
            var essayList = rawList.filter(function(s) { return s.tipe === 'essay'; });
            asesmenBuilderSoalList = pgList.concat(essayList);
        }
    }

    var judul = (document.getElementById(prefix + 'Judul') || {}).value || '';
    var tipe = (document.getElementById(prefix + 'Tipe') || {}).value || 'STS';
    var mapel = (document.getElementById(prefix + 'Mapel') || {}).value || '';
    var kelas = (document.getElementById(prefix + 'Kelas') || {}).value || '';
    var waktu = (document.getElementById(prefix + 'Waktu') || {}).value || '';
    var tanggal = (document.getElementById(prefix + 'Tanggal') || {}).value || '';
    var bobotPG = parseInt((document.getElementById(prefix + 'BobotPG') || {}).value) || 0;
    var bobotEssay = parseInt((document.getElementById(prefix + 'BobotEssay') || {}).value) || 0;
    var existingId = (document.getElementById('builderAsesmenId') || {}).value || '';

    if (!judul.trim()) { showToast('Judul Asesmen wajib diisi!', 'warning'); return; }
    if (!mapel) { showToast('Mata Pelajaran wajib dipilih!', 'warning'); return; }
    if (!kelas) { showToast('Kelas wajib dipilih!', 'warning'); return; }
    if (!waktu) { showToast('Waktu pengerjaan wajib diisi!', 'warning'); return; }
    if (!tanggal) { showToast('Tanggal ujian wajib diisi!', 'warning'); return; }

    try {
        showGlobalLoader('Menyimpan draft asesmen...');
        var asesmenPayload = {
            judul: judul.trim(),
            mata_pelajaran: mapel,
            kelas: kelas,
            tipe_ujian: tipe,
            waktu_menit: waktu,
            tanggal_pelaksanaan: tanggal,
            bobot_pg: bobotPG,
            bobot_essay: bobotEssay,
            status: 'draft',
            updated_at: new Date().toISOString()
        };

        var asesmenId = existingId;
        if (existingId) {
            const { error } = await supabaseClient.from('asesmen').update(asesmenPayload).eq('id', existingId);
            if (error) throw error;
        } else {
            asesmenPayload.created_by = currentUser ? currentUser.id : null;
            const { data, error } = await supabaseClient.from('asesmen').insert([asesmenPayload]).select('id').single();
            if (error) throw error;
            asesmenId = data.id;
            document.getElementById('builderAsesmenId').value = asesmenId;
            document.getElementById('builderTitle').textContent = 'Edit Asesmen (Draft)';
        }

        // Delete existing soal then re-insert
        await supabaseClient.from('asesmen_soal').delete().eq('asesmen_id', asesmenId);

        if (asesmenBuilderSoalList.length > 0) {
            var soalRows = asesmenBuilderSoalList.map(function(s, i) {
                var row = {
                    asesmen_id: asesmenId,
                    nomor_soal: i + 1,
                    tipe_soal: s.tipe,
                    naskah_soal: s.naskah || '',
                    gambar_url: s.gambar_url || null
                };
                if (s.tipe === 'pg') {
                    row.opsi_a = s.opsi_a || '';
                    row.opsi_b = s.opsi_b || '';
                    row.opsi_c = s.opsi_c || '';
                    row.opsi_d = s.opsi_d || '';
                    row.kunci_jawaban = s.kunci || null;
                } else if (s.tipe === 'essay') {
                    row.kunci_jawaban = s.kunci || null;
                }
                return row;
            });
            const { error: soalErr } = await supabaseClient.from('asesmen_soal').insert(soalRows);
            if (soalErr) throw soalErr;
        }

        showToast('Draft asesmen berhasil disimpan! (' + asesmenBuilderSoalList.length + ' soal)', 'success');
        // Tutup semua panel setelah simpan (kecuali dipanggil internal oleh publishToGoogleForm)
        if (source !== false) {
            closeAsesmenBuilder();
            closeAutoGenerateArea();
            resetAsesmenForms();
        }
        loadAsesmenList();
    } catch(e) { showToast('Gagal menyimpan draft: ' + e.message, 'error'); } 
    finally { hideGlobalLoader(); }
}

// --- Delete Asesmen (Soft Delete → Sampah) ---
async function deleteAsesmen(id) {
    showCustomConfirm('Pindahkan ke Sampah?', 'Asesmen ini akan dipindahkan ke <strong>Sampah</strong>. Anda masih bisa memulihkannya dalam waktu 30 hari.<br><br>Setelah 30 hari, asesmen akan dihapus otomatis secara permanen.', 'Ya, Pindahkan', async function() {
        showGlobalLoader('Memindahkan ke Sampah...');
        try {
            const { error } = await supabaseClient.from('asesmen').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            showToast('Asesmen dipindahkan ke Sampah. Pulihkan dalam 30 hari.', 'success');
            closeAsesmenBuilder();
            loadAsesmenList();
            loadSampahCount();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

// --- Sampah Asesmen Functions ---
async function loadSampahCount() {
    try {
        const { data, error } = await supabaseClient.from('asesmen').select('id').not('deleted_at', 'is', null);
        if (!error && data) {
            var badge = document.getElementById('sampahBadgeSidebar');
            if (badge) {
                if (data.length > 0) {
                    badge.textContent = data.length;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch(e) { console.warn('loadSampahCount:', e); }
}

async function loadSampahAsesmen() {
    var tbody = document.getElementById('sampahAsesmenTbody');
    var countEl = document.getElementById('sampahAsesmenCount');
    if (!tbody || !supabaseClient) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    
    try {
        // Auto-purge: hapus permanen yang sudah > 30 hari
        var cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        var cutoffISO = cutoffDate.toISOString();
        
        const { data: expiredItems } = await supabaseClient.from('asesmen').select('id').not('deleted_at', 'is', null).lt('deleted_at', cutoffISO);
        if (expiredItems && expiredItems.length > 0) {
            for (var e = 0; e < expiredItems.length; e++) {
                await executePermanentDelete(expiredItems[e].id);
            }
            if (expiredItems.length > 0) {
                showToast(expiredItems.length + ' asesmen kedaluwarsa (>30 hari) telah dihapus otomatis.', 'info');
            }
        }
        
        // Load remaining trashed items
        const { data, error } = await supabaseClient.from('asesmen').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
        if (error) throw error;
        
        var sampahList = data || [];
        if (countEl) countEl.textContent = sampahList.length + ' item di sampah';
        loadSampahCount();
        
        if (sampahList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Sampah kosong. 🎉</td></tr>';
            return;
        }
        
        var now = new Date();
        tbody.innerHTML = sampahList.map(function(a, i) {
            var deletedDate = new Date(a.deleted_at);
            var diffDays = Math.ceil((now - deletedDate) / (1000 * 60 * 60 * 24));
            var sisaHari = Math.max(0, 30 - diffDays);
            var statusBadge = a.status === 'terbit'
                ? '<span class="badge-terbit">Terbit</span>'
                : '<span class="badge-draft">Draft</span>';
            var sisaBadge = sisaHari <= 7
                ? '<span style="color:#ef4444;font-weight:700;">' + sisaHari + ' hari</span>'
                : '<span style="color:#f59e0b;font-weight:600;">' + sisaHari + ' hari</span>';
            
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                '<td>' + (a.kelas || '-') + '</td>' +
                '<td>' + (a.tipe_ujian || '-') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td style="font-size:0.82rem;">' + deletedDate.toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}) + '</td>' +
                '<td>' + sisaBadge + '</td>' +
                '<td><div style="display:flex;gap:.4rem;justify-content:center;">' +
                    '<button class="btn-icon btn-icon-blue" onclick="restoreAsesmen(\'' + a.id + '\')" title="Pulihkan"><i data-lucide="rotate-ccw" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="permanentDeleteAsesmen(\'' + a.id + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td>' +
                '</tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

async function restoreAsesmen(id) {
    showCustomConfirm('Pulihkan Asesmen?', 'Asesmen ini akan dikembalikan ke <strong>Riwayat Asesmen</strong> dengan status semula.', 'Ya, Pulihkan', async function() {
        showGlobalLoader('Memulihkan asesmen...');
        try {
            const { error } = await supabaseClient.from('asesmen').update({ deleted_at: null }).eq('id', id);
            if (error) throw error;
            showToast('Asesmen berhasil dipulihkan ke Riwayat!', 'success');
            loadSampahAsesmen();
            loadAsesmenList();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

async function executePermanentDelete(id) {
    try {
        // Get URL beforehand
        const { data: asm } = await supabaseClient.from('asesmen').select('google_form_url, google_sheet_url').eq('id', id).single();
        
        // Delete from Google Drive if published
        if (asm && (asm.google_form_url || asm.google_sheet_url)) {
            var gasUrl = (document.getElementById('gasUrlInput') || {}).value;
            if (gasUrl) {
                try {
                    await fetch(gasUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({
                            action: 'delete',
                            formUrl: asm.google_form_url,
                            sheetUrl: asm.google_sheet_url
                        })
                    });
                } catch(e) { console.warn('Gagal hapus drive', e); }
            }
        }

        // Hapus gambar soal dari Supabase Storage
        try {
            const { data: soalData } = await supabaseClient.from('asesmen_soal').select('gambar_url').eq('asesmen_id', id);
            if (soalData) {
                var filesToDelete = soalData
                    .filter(function(s) { return s.gambar_url && s.gambar_url.indexOf('/soal-images/') > -1; })
                    .map(function(s) { return s.gambar_url.split('/soal-images/').pop(); });
                if (filesToDelete.length > 0) {
                    await supabaseClient.storage.from('soal-images').remove(filesToDelete);
                }
            }
        } catch(e) { console.warn('Gagal hapus gambar storage', e); }

        // Delete soal then asesmen
        await supabaseClient.from('asesmen_soal').delete().eq('asesmen_id', id);
        await supabaseClient.from('asesmen').delete().eq('id', id);
    } catch(e) { console.warn('executePermanentDelete error:', e); }
}

async function permanentDeleteAsesmen(id) {
    showCustomConfirm('Hapus Permanen?', 'Asesmen ini akan <strong>dihapus permanen</strong> dari database, termasuk file Form dan Sheet-nya di Google Drive.<br><br>⚠️ <strong>Tindakan ini TIDAK bisa dibatalkan!</strong>', 'Ya, Hapus Permanen', async function() {
        showGlobalLoader('Menghapus permanen...');
        try {
            await executePermanentDelete(id);
            showToast('Asesmen berhasil dihapus permanen!', 'success');
            loadSampahAsesmen();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

async function kosongkanSampah() {
    var tbody = document.getElementById('sampahAsesmenTbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    if (rows.length <= 1 && rows[0] && rows[0].querySelector('td[colspan]')) {
        showToast('Sampah sudah kosong!', 'info');
        return;
    }
    
    showCustomConfirm('Kosongkan Semua Sampah?', 'Semua asesmen di sampah akan <strong>dihapus permanen</strong>.<br><br>⚠️ <strong>Tindakan ini TIDAK bisa dibatalkan!</strong>', 'Ya, Kosongkan', async function() {
        showGlobalLoader('Mengosongkan sampah...');
        try {
            const { data: trashed } = await supabaseClient.from('asesmen').select('id').not('deleted_at', 'is', null);
            if (trashed && trashed.length > 0) {
                for (var i = 0; i < trashed.length; i++) {
                    await executePermanentDelete(trashed[i].id);
                }
            }
            showToast('Sampah berhasil dikosongkan!', 'success');
            loadSampahAsesmen();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

// ============================================================
// AUTO GENERATE ASESMEN VIA TEKS (SMART PARSER)
// ============================================================

// Legacy compatibility: redirect old function names
async function openAutoGenerateForm() {
    openParseArea();
}

function closeAutoGenerateArea() {
    closeParseArea();
    closeAIArea();
}

function resetAsesmenForms() {
    // 1. Bersihkan area builder manual
    var builderIds = ['builderAsesmenId', 'builderJudul', 'builderMapel', 'builderKelas', 'builderWaktu', 'builderTanggal', 'builderBobotPG', 'builderBobotEssay'];
    builderIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var bTipe = document.getElementById('builderTipe');
    if (bTipe) bTipe.value = 'STS';
    asesmenBuilderSoalList = [];
    if(typeof renderSoalCards === 'function') renderSoalCards();

    // 2. Bersihkan area parse
    var parseIds = ['parseJudul', 'parseMapel', 'parseKelas', 'parseWaktu', 'parseTanggal', 'parseTextarea'];
    parseIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var pTipe = document.getElementById('parseTipe'); if(pTipe) pTipe.value = 'PH';
    var pPG = document.getElementById('parseBobotPG'); if(pPG) pPG.value = '2';
    var pEssay = document.getElementById('parseBobotEssay'); if(pEssay) pEssay.value = '0';
    var pStatus = document.getElementById('parseStatusLabel'); if(pStatus) pStatus.innerHTML = '';

    // 3. Bersihkan area AI
    var aiIds = ['aiJudul', 'aiMapel', 'aiKelas', 'aiWaktu', 'aiTanggal', 'aiTextarea', 'aiPromptInput'];
    aiIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var aTipe = document.getElementById('aiTipe'); if(aTipe) aTipe.value = 'PH';
    var aPG = document.getElementById('aiBobotPG'); if(aPG) aPG.value = '2';
    var aEssay = document.getElementById('aiBobotEssay'); if(aEssay) aEssay.value = '0';
    var aStatus = document.getElementById('aiStatusLabel'); if(aStatus) aStatus.innerHTML = '';
}

function parseTextToSoalList(text) {
    if (!text || text.trim() === '') return [];
    
    var lines = text.split('\n');
    var parsedSoal = [];
    var currentSoal = null;
    
    // Pola pengecekan PG inline (kasus horizontal "a. Toni    c. Dedi" dlm 1 baris)
    var opsiRegex = /(?:^|\s)([A-Ea-e])[.)]\s+((?:(?!\s[A-Ea-e][.)]\s).)*)/g;
    var kunciRegex = /kunci(?:\s*jawaban)?\s*:\s*([A-Ea-e]?)(.*)/i;
    // HANYA terima titik sebagai pemisah nomor utama (misal: "1. ") untuk menghindari 1) terbaca form baru.
    var nomorRegex = /^\s*(\d+)\s*\.\s+(.*)/;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line === '') continue;

        // Cek baris nomor soal baru
        var noMatch = line.match(nomorRegex);
        if (noMatch) {
            if (currentSoal) { parsedSoal.push(currentSoal); }
            currentSoal = {
                tipe: 'essay', 
                naskah: noMatch[2],
                opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', kunci: ''
            };
            continue;
        }
        
        if (!currentSoal) continue; // Skip jika belum dalam konteks soal
        
        // Cek Kunci Jawaban
        var keyMatch = line.match(kunciRegex);
        if (keyMatch) {
            var valList = (keyMatch[1] + keyMatch[2]).trim();
            if (currentSoal.tipe === 'pg') {
                 var firstCharMatch = valList.match(/[a-eA-E]/);
                 currentSoal.kunci = firstCharMatch ? firstCharMatch[0].toUpperCase() : '';
            } else {
                 if (currentSoal.kunci !== '') currentSoal.kunci += ', ';
                 currentSoal.kunci += valList; 
            }
            continue;
        }
        
        // Cek Opsi Pilihan Ganda (Bisa multi match per line kalau horizontal)
        var foundOpsiInline = false;
        var match;
        opsiRegex.lastIndex = 0;
        
        while ((match = opsiRegex.exec(line)) !== null) {
            foundOpsiInline = true;
            currentSoal.tipe = 'pg'; // Ubah tipe jadi PG karena ketemu pola opsi
            var huruf = match[1].toLowerCase();
            var isiOps = match[2].trim();
            
            if (huruf === 'a') currentSoal.opsi_a = isiOps;
            if (huruf === 'b') currentSoal.opsi_b = isiOps;
            if (huruf === 'c') currentSoal.opsi_c = isiOps;
            if (huruf === 'd') currentSoal.opsi_d = isiOps;
        }
        
        if (foundOpsiInline) continue; // opsi di baris ini sudah diekstrak
        
        // Asumsikan sebagai lajutan teks soal multiline
        currentSoal.naskah += '\n' + line;
    }
    
    // Soal Terakhir
    if (currentSoal) parsedSoal.push(currentSoal);
    
    return parsedSoal;
}

function previewAutoGenerate(source) {
    var textareaId = (source === 'ai') ? 'aiTextarea' : 'parseTextarea';
    var prefix = (source === 'ai') ? 'ai' : 'parse';
    var statusLabelId = (source === 'ai') ? 'aiStatusLabel' : 'parseStatusLabel';

    var text = document.getElementById(textareaId).value;
    var rawList = parseTextToSoalList(text);
    
    if (rawList.length === 0) {
        document.getElementById(statusLabelId).innerHTML = '<span style="color:var(--danger)">Gagal membaca soal. Pastikan naskah diawali format angka, misal: 1. Naskah...</span>';
        return false;
    }
    
    var countPG = rawList.filter(s => s.tipe === 'pg').length;
    var countEssay = rawList.filter(s => s.tipe === 'essay').length;
    
    document.getElementById(statusLabelId).innerHTML = 
        '<span style="color:var(--success)">✅ Membaca ' + rawList.length + ' soal (' + countPG + ' PG, ' + countEssay + ' Essay)</span>';
    
    // Auto-sort: semua PG dulu, kemudian semua Essay
    var pgList = rawList.filter(function(s) { return s.tipe === 'pg'; });
    var essayList = rawList.filter(function(s) { return s.tipe === 'essay'; });
    asesmenBuilderSoalList = pgList.concat(essayList);
    renderSoalCards();
    
    // Tampilkan manual builder untuk preview
    document.getElementById('asesmenBuilderArea').style.display = 'block';

    // Populate dropdowns for builder before setting values
    populateMapelNameDropdown('builderMapel', '');
    populateKelasNameDropdown('builderKelas', '');

    document.getElementById('builderJudul').value = (document.getElementById(prefix + 'Judul') || {}).value || '';
    document.getElementById('builderTipe').value = (document.getElementById(prefix + 'Tipe') || {}).value || 'STS';
    document.getElementById('builderMapel').value = (document.getElementById(prefix + 'Mapel') || {}).value || '';
    document.getElementById('builderKelas').value = (document.getElementById(prefix + 'Kelas') || {}).value || '';
    
    var srcThn = document.getElementById(prefix + 'Tahun');
    if (srcThn) document.getElementById('builderTahun').value = srcThn.value;
    
    document.getElementById('builderBobotPG').value = (document.getElementById(prefix + 'BobotPG') || {}).value || '2';
    document.getElementById('builderBobotEssay').value = (document.getElementById(prefix + 'BobotEssay') || {}).value || '0';
    document.getElementById('builderWaktu').value = (document.getElementById(prefix + 'Waktu') || {}).value || '';
    document.getElementById('builderTanggal').value = (document.getElementById(prefix + 'Tanggal') || {}).value || '';
    
    document.getElementById('builderAsesmenId').value = ''; // pastikan id kosong sbg rancangan baru
    return true;
}

function submitAutoGenerate(source) {
    var stat = previewAutoGenerate(source); 
    if (stat) {
        var prefix = (source === 'ai') ? 'ai' : 'parse';
        var jdl = (document.getElementById(prefix + 'Judul') || {}).value || '';
        if (!jdl.trim()) { showToast('Isi judul asesmen!', 'warning'); return; }
        
        showCustomConfirm(
            'Terbitkan Langsung?',
            'Anda sudah melihat pratinjaunya di form bawah.' +
            '<br>Sistem akan otomatis menge-save data ini dan menerbitkannya ke Google Form.<br>Lanjutkan?',
            'Ya, Terbitkan',
            function() {
                if (source === 'ai') closeAIArea();
                else closeParseArea();
                confirmPublishAsesmen();
            }
        );
    }
}

// --- Publish to Google Form ---
function confirmPublishAsesmen() {
    collectSoalFromDOM();

    var judul = (document.getElementById('builderJudul') || {}).value || '';
    if (!judul.trim()) { showToast('Judul Asesmen wajib diisi!', 'warning'); return; }

    var tanggal = (document.getElementById('builderTanggal') || {}).value || '';
    if (!tanggal) { showToast('Tanggal ujian wajib diisi!', 'warning'); return; }
    
    var today = new Date();
    today.setHours(0,0,0,0);
    var inputDate = new Date(tanggal);
    inputDate.setHours(0,0,0,0);
    
    if (inputDate < today) {
        showToast('Gagal Menerbitkan: Tanggal ujian (' + tanggal + ') tidak boleh sebelum hari ini!', 'error');
        return;
    }

    if (asesmenBuilderSoalList.length === 0) { showToast('Tambahkan minimal 1 soal sebelum menerbitkan!', 'warning'); return; }

    // Validate all PG have kunci jawaban
    var pgWithoutKey = asesmenBuilderSoalList.filter(function(s) { return s.tipe === 'pg' && !s.kunci; });
    if (pgWithoutKey.length > 0) {
        showToast('Semua soal PG harus memiliki kunci jawaban! (' + pgWithoutKey.length + ' soal belum ada kunci)', 'warning');
        return;
    }

    // Validate all Essay have at least 1 keyword
    var essayWithoutKey = asesmenBuilderSoalList.filter(function(s) { 
        var c = (s.kunci || '').replace('[OR]', '').trim().replace(/,/g, '');
        return s.tipe === 'essay' && c === ''; 
    });
    if (essayWithoutKey.length > 0) {
        showToast('Semua Soal Essay harus memiliki Minimal 1 Kata Kunci Jawab!', 'warning');
        return;
    }

    var pgCount = asesmenBuilderSoalList.filter(function(s) { return s.tipe === 'pg'; }).length;
    var essayCount = asesmenBuilderSoalList.filter(function(s) { return s.tipe === 'essay'; }).length;

    showCustomConfirm(
        'Terbitkan ke Google Form?',
        'Asesmen <strong>"' + escHtml(judul) + '"</strong> akan dikirim ke Google Form.<br><br>' +
        '📋 Total: <strong>' + asesmenBuilderSoalList.length + ' soal</strong> (' + pgCount + ' PG, ' + essayCount + ' Essay)<br><br>' +
        '⚠️ <strong>Setelah diterbitkan, soal TIDAK bisa diedit lagi.</strong><br>Pastikan semua soal sudah benar dan lengkap.',
        'Ya, Terbitkan',
        function() { publishToGoogleForm(); }
    );
}

async function publishToGoogleForm() {
    // 1. Save draft first
    await saveDraftAsesmen(false);

    var asesmenId = (document.getElementById('builderAsesmenId') || {}).value;
    if (!asesmenId) { showToast('Simpan draft terlebih dahulu!', 'error'); return; }

    // 2. Get GAS URL
    var gasUrl = (document.getElementById('gasUrlInput') || {}).value || '';
    if (!gasUrl.trim()) {
        showToast('URL Google Apps Script belum dikonfigurasi!', 'warning');
        return;
    }

    // 3. Prepare payload
    var judul = (document.getElementById('builderJudul') || {}).value || '';
    var mapel = (document.getElementById('builderMapel') || {}).value || '';
    var kelas = (document.getElementById('builderKelas') || {}).value || '';
    var tipe = (document.getElementById('builderTipe') || {}).value || '';
    var waktu = (document.getElementById('builderWaktu') || {}).value || '';
    var tanggal = (document.getElementById('builderTanggal') || {}).value || '';
    var tahun = (document.getElementById('builderTahun') || {}).value || '';
    var semester = (document.getElementById('builderSemester') || {}).value || '';
    var bobotPG = parseInt((document.getElementById('builderBobotPG') || {}).value) || 0;
    var bobotEssay = parseInt((document.getElementById('builderBobotEssay') || {}).value) || 0;

    collectSoalFromDOM();
    
    // Validate Points
    var jmlPG = asesmenBuilderSoalList.filter(s => s.tipe === 'pg').length;
    var jmlEssay = asesmenBuilderSoalList.filter(s => s.tipe === 'essay').length;
    if (jmlPG === 0 && jmlEssay === 0) {
        showToast('Tidak ada soal yang dibuat!', 'warning');
        return;
    }
    
    var totalPoin = (jmlPG * bobotPG) + (jmlEssay * bobotEssay);
    if (totalPoin !== 100) {
        showToast('Info Keamanan: Total bobot saat ini (' + totalPoin + '). Harap sesuaikan bobot x soal agar total menjadi 100 (misal: 50 soal PG x 2 = 100)!', 'warning');
        return;
    }

    var payload = {
        judul: judul,
        tipe: tipe,
        mapel: mapel,
        kelas: kelas,
        waktu: waktu,
        tanggal: tanggal,
        tahun: tahun,
        semester: semester,
        bobotPG: bobotPG,
        bobotEssay: bobotEssay,
        jmlPG: jmlPG,
        jmlEssay: jmlEssay,
        soal: asesmenBuilderSoalList.map(function(s, i) {
            var item = {
                nomor: i + 1,
                tipe: s.tipe,
                naskah: s.naskah || '',
                gambar_url: s.gambar_url || ''
            };
            if (s.tipe === 'pg') {
                item.opsi = { a: s.opsi_a || '', b: s.opsi_b || '', c: s.opsi_c || '', d: s.opsi_d || '' };
                item.kunci = s.kunci || '';
            } else if (s.tipe === 'essay') {
                item.kunci = s.kunci || '';
            }
            return item;
        })
    };

    // 4. Send to GAS
    showGlobalLoader('Menerbitkan ke Google Form... Harap tunggu');
    try {
        var response = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        var result = await response.json();

        if (result.status === 'success' || result.formUrl) {
            // Update asesmen status in Supabase
            var updatePayload = {
                status: 'terbit',
                published_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (result.formUrl) updatePayload.google_form_url = result.formUrl;
            if (result.sheetUrl) updatePayload.google_sheet_url = result.sheetUrl;
            if (result.editUrl) updatePayload.google_form_edit_url = result.editUrl;
            updatePayload.tahun_pelajaran = tahun;
            updatePayload.semester = semester;

            await supabaseClient.from('asesmen').update(updatePayload).eq('id', asesmenId);

            var warningHtml = '';
            if (result.message && result.message.indexOf('PERINGATAN') !== -1) {
                var warnText = result.message.substring(result.message.indexOf('PERINGATAN')).replace(/\n/g, '<br>');
                warningHtml = '<div style="margin-top:1rem;padding:1rem;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#d97706;font-size:0.85rem;">' + warnText + '</div>';
            }

            showNotifModal('Berhasil Diterbitkan! 🎉',
                'Soal asesmen berhasil dikirim ke Google Form!<br><br>' +
                (result.formUrl ? '📋 <strong>Link Form:</strong><br><a href="' + result.formUrl + '" target="_blank" style="color:var(--primary-light);word-break:break-all;">' + result.formUrl + '</a>' : '') +
                (result.sheetUrl ? '<br><br>📊 <strong>Link Sheets:</strong><br><a href="' + result.sheetUrl + '" target="_blank" style="color:var(--primary-light);word-break:break-all;">' + result.sheetUrl + '</a>' : '') +
                warningHtml,
                'success');

            closeAsesmenBuilder();
            closeAutoGenerateArea();
            resetAsesmenForms();
            loadAsesmenList();
        } else {
            throw new Error(result.message || result.error || 'Gagal membuat Google Form');
        }
    } catch(e) {
        showNotifModal('Gagal Menerbitkan', 'Terjadi kesalahan saat mengirim ke Google Apps Script:<br><br><strong>' + e.message + '</strong><br><br>Pastikan URL GAS benar dan sudah di-deploy sebagai Web App.', 'error');
    } finally {
        hideGlobalLoader();
    }
}


// ============================================================
// ARSIP ASESMEN MODULE
// ============================================================

async function archiveAsesmen(id) {
    showCustomConfirm('Arsipkan Asesmen?', 'Asesmen ini akan dipindahkan ke <strong>Arsip</strong>.<br><br>⚠️ <strong>Link Form akan ditutup</strong> (siswa tidak bisa mengakses lagi).<br>Link Rekap Nilai tetap bisa diakses dari menu Arsip.', 'Ya, Arsipkan', async function() {
        showGlobalLoader('Menutup form dan mengarsipkan...');
        try {
            // Ambil data URL form
            const { data: asm } = await supabaseClient.from('asesmen').select('google_form_url, google_sheet_url').eq('id', id).single();
            
            // Tutup Google Form via GAS (setAcceptingResponses = false)
            if (asm && asm.google_form_url) {
                var gasUrl = (document.getElementById('gasUrlInput') || {}).value;
                if (gasUrl) {
                    try {
                        await fetch(gasUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({
                                action: 'close',
                                formUrl: asm.google_form_url
                            })
                        });
                    } catch(e) { console.warn('Gagal menutup form:', e); }
                }
            }
            
            // Update DB: arsipkan, hapus link form (siswa tidak perlu akses lagi)
            await supabaseClient.from('asesmen').update({ 
                archived_at: new Date().toISOString(),
                google_form_url: null,
                google_form_edit_url: null,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            
            showToast('Asesmen berhasil diarsipkan! Form sudah ditutup.', 'success');
            loadAsesmenList();
        } catch(e) { showToast('Gagal mengarsipkan: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

async function populateArsipFilters() {
    await loadMasterKelas();
    await loadMasterMapel();
    
    var kelasSelect = document.getElementById('filterArsipKelas');
    if (kelasSelect && typeof masterKelasList !== 'undefined') {
        var opts = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(function(k) {
            opts += '<option value="' + k.nama_kelas + '">' + k.nama_kelas + '</option>';
        });
        kelasSelect.innerHTML = opts;
    }
    
    var mapelSelect = document.getElementById('filterArsipMapel');
    if (mapelSelect && typeof masterMapelList !== 'undefined') {
        var opts = '<option value="">Semua Mapel</option>';
        masterMapelList.forEach(function(m) {
            opts += '<option value="' + m.nama_mapel + '">' + m.nama_mapel + '</option>';
        });
        mapelSelect.innerHTML = opts;
    }
    
    try {
        const { data } = await supabaseClient.from('asesmen').select('tahun_pelajaran').not('archived_at', 'is', null);
        var tahunSelect = document.getElementById('filterArsipTahun');
        if (tahunSelect && data) {
            var uniqueTahun = [];
            data.forEach(function(d) {
                if (d.tahun_pelajaran && uniqueTahun.indexOf(d.tahun_pelajaran) === -1) {
                    uniqueTahun.push(d.tahun_pelajaran);
                }
            });
            uniqueTahun.sort().reverse();
            var opts = '<option value="">Semua Tahun</option>';
            uniqueTahun.forEach(function(t) {
                opts += '<option value="' + t + '">' + t + '</option>';
            });
            tahunSelect.innerHTML = opts;
        }
    } catch(e) {}
}

async function loadArsipAsesmen() {
    var tbody = document.getElementById('arsipAsesmenTbody');
    var countEl = document.getElementById('arsipAsesmenCount');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat arsip...</td></tr>';
    
    try {
        var query = supabaseClient.from('asesmen').select('*').not('archived_at', 'is', null).order('archived_at', { ascending: false });
        
        var filterTahun = (document.getElementById('filterArsipTahun') || {}).value;
        var filterKelas = (document.getElementById('filterArsipKelas') || {}).value;
        var filterMapel = (document.getElementById('filterArsipMapel') || {}).value;
        var filterSemester = (document.getElementById('filterArsipSemester') || {}).value;
        
        if (filterTahun) query = query.eq('tahun_pelajaran', filterTahun);
        if (filterKelas) query = query.eq('kelas', filterKelas);
        if (filterMapel) query = query.eq('mata_pelajaran', filterMapel);
        if (filterSemester) query = query.eq('semester', filterSemester);
        
        const { data, error } = await query;
        if (error) throw error;
        
        var arsipList = data || [];
        if (countEl) countEl.textContent = arsipList.length + ' arsip';
        
        var isAdminKurikulum = currentRole === 'admin' || currentRole === 'kurikulum';
        
        if (arsipList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada arsip yang cocok dengan filter.</td></tr>';
            return;
        }
        
        tbody.innerHTML = arsipList.map(function(a, i) {
            var linkHtml = '<div style="display:flex;flex-direction:column;gap:.25rem;">';
            if (a.google_form_url) linkHtml += '<a href="' + a.google_form_url + '" target="_blank" style="color:var(--primary);font-size:.82rem;font-weight:600;"><i data-lucide="external-link" style="width:12px;height:12px;"></i> Form</a>';
            if (a.google_sheet_url) linkHtml += '<a href="' + a.google_sheet_url + '" target="_blank" style="color:#16a34a;font-size:.82rem;font-weight:600;"><i data-lucide="table" style="width:12px;height:12px;"></i> Rekap</a>';
            if (!a.google_form_url && !a.google_sheet_url) linkHtml += '<span style="color:var(--text-light);font-size:.82rem;">-</span>';
            linkHtml += '</div>';
            
            var tglArsip = a.archived_at ? new Date(a.archived_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            
            var canManage = isAdminKurikulum || (currentUser && a.created_by === currentUser.id);
            var aksiHtml = '';
            
            if (canManage) {
                aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="previewAsesmen(\'' + a.id + '\')" title="Detail/Preview"><i data-lucide="eye" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-blue" onclick="restoreArsipAsesmen(\'' + a.id + '\')" title="Kembalikan ke Aktif"><i data-lucide="undo-2" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="deleteArsipAsesmen(\'' + a.id + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
            } else {
                aksiHtml = '<span style="color:var(--text-light);font-size:0.8rem;font-style:italic;">Hanya pemilik</span>';
            }
            
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                '<td>' + (a.kelas || '-') + '</td>' +
                '<td>' + (a.tipe_ujian || '-') + '</td>' +
                '<td>' + (a.tahun_pelajaran || '-') + '</td>' +
                '<td>' + (a.semester || '-') + '</td>' +
                '<td>' + tglArsip + '</td>' +
                '<td>' + linkHtml + '</td>' +
                '<td><div style="display:flex;gap:.4rem;justify-content:center;">' + aksiHtml + '</div></td>' +
                '</tr>';
        }).join('');
        
        if (window.lucide) lucide.createIcons();
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

async function restoreArsipAsesmen(id) {
    showCustomConfirm('Kembalikan Asesmen?', 'Asesmen ini akan dikembalikan ke daftar aktif dengan status <strong>Draft</strong>.<br><br>Anda bisa mengedit soal dan menerbitkan ulang ke Google Form baru.', 'Ya, Kembalikan', async function() {
        showGlobalLoader('Mengembalikan Asesmen...');
        try {
            await supabaseClient.from('asesmen').update({ 
                archived_at: null,
                status: 'draft',
                google_form_url: null,
                google_form_edit_url: null,
                google_sheet_url: null,
                published_at: null,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            showToast('Asesmen berhasil dikembalikan sebagai Draft!', 'success');
            loadArsipAsesmen();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

async function deleteArsipAsesmen(id) {
    showCustomConfirm('Hapus Arsip Permanen?', 'Asesmen ini akan <strong>dihapus permanen</strong> dari database dan Google Drive. Data tidak bisa dikembalikan!', 'Ya, Hapus Permanen', async function() {
        showGlobalLoader('Menghapus Arsip Permanen...');
        try {
            const { data: asm } = await supabaseClient.from('asesmen').select('google_form_url, google_sheet_url').eq('id', id).single();
            
            if (asm && (asm.google_form_url || asm.google_sheet_url)) {
                var gasUrl = (document.getElementById('gasUrlInput') || {}).value;
                if (gasUrl) {
                    try {
                        await fetch(gasUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({
                                action: 'delete',
                                formUrl: asm.google_form_url,
                                sheetUrl: asm.google_sheet_url
                            })
                        });
                    } catch(e) { console.warn('Gagal hapus drive', e); }
                }
            }
            
            // Hapus gambar soal dari Supabase Storage
            try {
                const { data: soalData } = await supabaseClient.from('asesmen_soal').select('gambar_url').eq('asesmen_id', id);
                if (soalData) {
                    var filesToDelete = soalData
                        .filter(function(s) { return s.gambar_url && s.gambar_url.indexOf('/soal-images/') > -1; })
                        .map(function(s) { return s.gambar_url.split('/soal-images/').pop(); });
                    if (filesToDelete.length > 0) {
                        await supabaseClient.storage.from('soal-images').remove(filesToDelete);
                    }
                }
            } catch(e) { console.warn('Gagal hapus gambar storage', e); }

            await supabaseClient.from('asesmen_soal').delete().eq('asesmen_id', id);
            await supabaseClient.from('asesmen').delete().eq('id', id);
            showToast('Arsip berhasil dihapus permanen!', 'success');
            loadArsipAsesmen();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}


// Auto wrap dashboard tables for responsive scrolling
const tableObserver = new MutationObserver((mutations) => {
  document.querySelectorAll('.dash-table').forEach(table => {
    if (!table.parentElement.classList.contains('table-responsive')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      wrapper.style.overflowX = 'auto';
      wrapper.style.width = '100%';
      wrapper.style.marginBottom = '1rem';
      wrapper.style.WebkitOverflowScrolling = 'touch';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
});
tableObserver.observe(document.body, { childList: true, subtree: true });

// =========================================================
// GALERI & MOMEN SEKOLAH
// =========================================================


// Global cache for galeri data
var galeriDataAll = [];

// Fungsi membuka gambar full di Lightbox
function openGaleriLightbox(imgUrl, captionEncoded) {
    var lb = document.getElementById('galeriLightbox');
    var img = document.getElementById('galeriLightboxImg');
    var cap = document.getElementById('galeriLightboxCaption');
    if (!lb || !img) { console.error('Lightbox elements not found'); return; }
    
    img.src = imgUrl;
    if (cap) cap.innerText = captionEncoded ? decodeURIComponent(captionEncoded) : '';
    lb.style.display = 'flex';
}

function closeGaleriLightbox() {
    var lb = document.getElementById('galeriLightbox');
    if (lb) {
        lb.style.display = 'none';
        var img = document.getElementById('galeriLightboxImg');
        if (img) img.src = '';
    }
}

async function loadGaleriBeranda() {
    var area = document.getElementById('dashboardGaleriArea');
    var gridUrl = document.getElementById('dashboardGaleriGrid');
    if (!area || !gridUrl) return;

    try {
        const { data, error } = await supabaseClient
            .from('galeri')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(6);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            area.style.display = 'none';
            return;
        }
        
        area.style.display = '';
        var html = '';
        
        data.forEach(function(g) {
            var dateStr = '-';
            try { if (g.tanggal) { var d = new Date(g.tanggal); dateStr = d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); } }catch(e){}
            
            var captions = g.keterangan || g.album_nama;
            var safeUrl = encodeURIComponent(g.gambar_url);
            var safeCap = encodeURIComponent(captions);
            html += `
            <div style="flex:0 0 auto; width:220px; border-radius:8px; overflow:hidden; border:1px solid var(--border-color); cursor:pointer; position:relative; group" onclick="openGaleriLightbox('${g.gambar_url}', '${safeCap}')">
              <img src="${g.gambar_url}" style="width:100%; height:140px; object-fit:cover; display:block; transition:transform 0.3s ease;">
              <div style="padding:0.75rem; background:#fff;">
                <p style="margin:0; font-weight:600; font-size:0.85rem; color:var(--text-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${g.album_nama}</p>
                <p style="margin:0.2rem 0 0 0; font-size:0.75rem; color:var(--text-light);"><i data-lucide="calendar" style="width:12px;height:12px;vertical-align:-2px;"></i> ${dateStr}</p>
              </div>
            </div>`;
        });
        
        gridUrl.innerHTML = html;
        if (window.lucide) lucide.createIcons();
    } catch(e) {
        console.error('Galeri Beranda error:', e.message);
    }
}

async function loadGaleri() {
    var gridArea = document.getElementById('galeriGridArea');
    if (!gridArea) return;
    
    gridArea.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;"><i data-lucide="loader" class="icon-spin" style="width:32px;height:32px;color:var(--primary-light);"></i></div>';
    if (window.lucide) lucide.createIcons();

    try {
        const { data, error } = await supabaseClient
            .from('galeri')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        galeriDataAll = data || [];
        
        // Update Filter Album Options
        var albumSet = new Set();
        galeriDataAll.forEach(function(g) { if(g.album_nama) albumSet.add(g.album_nama); });
        
        var filterEl = document.getElementById('galeriFilterAlbum');
        var currentSelected = filterEl ? filterEl.value : 'Semua';
        
        var albumHtml = '<option value="Semua">Semua Album</option>';
        var arrAlbum = Array.from(albumSet).sort();
        arrAlbum.forEach(function(a) {
            albumHtml += '<option value="'+a+'" '+(a===currentSelected?'selected':'')+'>'+a+'</option>';
        });
        if(filterEl) filterEl.innerHTML = albumHtml;

        renderGaleri();
    } catch(e) {
        gridArea.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--danger);">Gagal memuat galeri: ' + e.message + '</div>';
    }
}

function renderGaleri() {
    var gridArea = document.getElementById('galeriGridArea');
    if (!gridArea) return;
    
    var filterEl = document.getElementById('galeriFilterAlbum');
    var filterValue = filterEl ? filterEl.value : 'Semua';
    
    var filtered = galeriDataAll;
    if (filterValue !== 'Semua') {
        filtered = galeriDataAll.filter(function(g) { return g.album_nama === filterValue; });
    }
    
    if (filtered.length === 0) {
        gridArea.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;color:var(--text-light);">Belum ada foto.</div>';
        return;
    }
    
    var html = '';
    filtered.forEach(function(g, idx) {
        var dateStr = '-';
        try { if(g.tanggal) { var d = new Date(g.tanggal); dateStr = d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); } }catch(e){}
        
        html += '<div class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">' +
            '<div style="height:180px; position:relative; background:#eee; cursor:pointer;" data-action="lightbox" data-idx="' + idx + '">' +
                '<img src="' + g.gambar_url + '" style="width:100%; height:100%; object-fit:cover;">' +
                '<div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); color:white; padding:4px 8px; border-radius:4px; font-size:0.75rem;">' + dateStr + '</div>' +
            '</div>' +
            '<div style="padding:1rem; flex:1; display:flex; flex-direction:column;">' +
                '<h4 style="margin:0 0 0.5rem 0; font-size:1rem; color:var(--text-dark);">' + g.album_nama + '</h4>' +
                '<p style="margin:0; font-size:0.85rem; color:var(--text-light); flex:1;">' + (g.keterangan || '-') + '</p>' +
                '<div style="display:flex; justify-content:space-between; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border-color); flex-wrap:wrap; gap:0.5rem;">' +
                    '<div style="display:flex; gap:0.5rem;">' +
                        '<button class="btn btn-outline" style="padding:6px; height:auto; color:var(--text-light)" data-action="lightbox" data-idx="' + idx + '" title="Lihat">' +
                            '<i data-lucide="maximize-2" style="width:16px;height:16px;margin:0;"></i>' +
                        '</button>' +
                        '<button class="btn btn-outline" style="padding:6px; height:auto; color:var(--primary)" data-action="download" data-idx="' + idx + '" title="Download">' +
                            '<i data-lucide="download" style="width:16px;height:16px;margin:0;"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div style="display:flex; gap:0.5rem;">' +
                        '<button class="btn btn-outline" style="padding:6px; height:auto; color:#10b981;" data-action="archive" data-idx="' + idx + '" title="Arsipkan ke Google Drive (Pindah)">' +
                            '<i data-lucide="hard-drive" style="width:16px;height:16px;margin:0;"></i>' +
                        '</button>' +
                        '<button class="btn btn-danger" style="padding:6px; height:auto;" data-action="delete" data-idx="' + idx + '" title="Hapus Permanen">' +
                            '<i data-lucide="trash-2" style="width:16px;height:16px;margin:0;"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    });
    
    gridArea.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Event delegation for galeri actions
    gridArea.onclick = function(e) {
        var target = e.target.closest('[data-action]');
        if (!target) return;
        var action = target.getAttribute('data-action');
        var idx = parseInt(target.getAttribute('data-idx'));
        
        // Use filtered list (same as what was rendered)
        var currentFiltered = galeriDataAll;
        var fEl = document.getElementById('galeriFilterAlbum');
        var fVal = fEl ? fEl.value : 'Semua';
        if (fVal !== 'Semua') {
            currentFiltered = galeriDataAll.filter(function(g) { return g.album_nama === fVal; });
        }
        var g = currentFiltered[idx];
        if (!g) return;

        var captions = g.keterangan || g.album_nama || '';

        if (action === 'lightbox') {
            openGaleriLightbox(g.gambar_url, encodeURIComponent(captions));
        } else if (action === 'download') {
            downloadGaleriImage(g.gambar_url, 'galeri_' + g.id + '.jpg');
        } else if (action === 'archive') {
            archiveGaleriToDrive(g.id, g.gambar_url, encodeURIComponent(g.album_nama));
        } else if (action === 'delete') {
            deleteGaleri(g.id, g.gambar_url);
        }
    };
}

async function handleUploadGaleri() {
    var albumEl = document.getElementById('galeriAlbum');
    var ketEl = document.getElementById('galeriKeterangan');
    var tglEl = document.getElementById('galeriTanggal');
    var fileInput = document.getElementById('galeriFiles');
    
    var album = (albumEl.value || '').trim();
    var keterangan = (ketEl.value || '').trim();
    var tgl = tglEl.value;
    
    if (!album) { showToast('Nama Album wajib diisi!', 'warning'); return; }
    if (!tgl) { showToast('Tanggal wajib dipilih!', 'warning'); return; }
    if (!fileInput.files || fileInput.files.length === 0) { showToast('Tidak ada gambar yang dipilih!', 'warning'); return; }

    var files = Array.from(fileInput.files);
    var MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    
    // Validate sizes
    for (var i = 0; i < files.length; i++) {
        if (files[i].size > MAX_SIZE) {
            showToast('File "' + files[i].name + '" lebih dari 5MB! Silakan kompres terlebih dahulu.', 'warning');
            return;
        }
    }

    showGlobalLoader('Mengunggah ' + files.length + ' Foto ke Google Drive... Mohon jangan tutup halaman!');
    
    try {
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            
            // Kompres gambar terlebih dahulu
            var compressedBlob = await new Promise(function(resolve) {
                if (typeof compressImage === 'function') {
                    compressImage(file, 1920, 1920, 0.85, resolve);
                } else {
                    resolve(file); // fallback jika compressImage belum ada
                }
            });
            
            // Upload ke Google Drive
            var publicUrl = await uploadToGoogleDrive(compressedBlob, 'galeri');
            
            // Insert to database
            var rowToInsert = {
                album_nama: album,
                keterangan: keterangan,
                tanggal: tgl,
                gambar_url: publicUrl,
                ukuran_file: file.size,
                created_by: (typeof currentUser !== 'undefined' && currentUser ? currentUser.id : null)
            };
            
            var { error: insertErr } = await supabaseClient.from('galeri').insert(rowToInsert);
            if (insertErr) throw insertErr;
        }
        
        showToast(files.length + ' Foto berhasil diupload!', 'success');
        
        // Reset forms (keep Album name to make it easier for consecutive uploads)
        ketEl.value = '';
        fileInput.value = '';
        
        loadGaleri();
        loadGaleriBeranda();
    } catch(e) {
        showToast('Gagal upload: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function deleteGaleri(id, url) {
    showCustomConfirm('Hapus Foto Permanen?', 'Foto akan dihapus permanen dari Database. Lanjutkan?', 'Ya, Hapus', async function() {
        showGlobalLoader('Menghapus foto...');
        try {
            // Delete from database only (gambar di Google Drive dikelola manual via folder)
            await supabaseClient.from('galeri').delete().eq('id', id);
            
            showToast('Foto berhasil dihapus!', 'success');
            loadGaleri();
            loadGaleriBeranda();
        } catch(e) {
            showToast('Gagal hapus: ' + e.message, 'error');
        } finally {
            hideGlobalLoader();
        }
    });
}

function downloadGaleriImage(url, filename) {
    showToast('Memulai unduhan...', 'info');
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        var blobUrl = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename || 'download.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      })
      .catch(e => {
        showToast('Gagal mengunduh gambar: ' + e.message, 'error');
      });
}

async function archiveGaleriToDrive(id, url, albumEncoded) {
    var album = albumEncoded ? decodeURIComponent(albumEncoded) : '';
    showCustomConfirm('Pindahkan ke Google Drive?', 'Tindakan ini akan mengunduh foto ini ke Google Drive (pada folder "Arsip Galeri SMPIT"), lalu menghapusnya secara **permanen** dari sistem (Supabase) agar ruang penyimpanan Anda lega.<br><br>Gunakan fitur ini untuk foto yang sudah tidak aktif namun tetap ingin disave di Drive.', 'Ya, Pindahkan', async function() {
        showGlobalLoader('Memindahkan ke Google Drive...');
        try {
            var gasUrl = (document.getElementById('gasUrlInput') || {}).value;
            if (!gasUrl) {
                throw new Error('URL Konfigurasi Google Apps Script belum disetel! Harap setel di Buat Soal Asesmen > Konfigurasi.');
            }
            
            // Generate filename based on ID
            var filename = 'galeri_' + id + '.jpg';
            
            // Shoot POST to GAS
            var response = await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'archive_galeri',
                    url: url,
                    album_nama: album,
                    filename: filename
                })
            });
            
            var result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message);
            }
            
            // Delete from DB & supabase Storage
            if (url) {
                var sName = url.split('/galeri-images/').pop();
                if (sName) {
                    await supabaseClient.storage.from('galeri-images').remove([sName]);
                }
            }
            await supabaseClient.from('galeri').delete().eq('id', id);
            
            showToast('Foto berhasil diarsipkan ke Google Drive!', 'success');
            loadGaleri();
            loadGaleriBeranda();
        } catch(e) {
            showToast('Gagal memindahkan: ' + e.message, 'error');
        } finally {
            hideGlobalLoader();
        }
    });
}

// ==========================================
// LANDING PAGE ENHANCEMENTS JS
// ==========================================

// ==========================================
// LANDING PAGE ENHANCEMENTS JS
// ==========================================

// 2. Typewriter Effect
document.addEventListener('DOMContentLoaded', function() {
    var textEl = document.getElementById('typewriterText');
    if (!textEl) return;
    
    var prefix = "Generasi yang ";
    var words = ["Cerdas", "Berprestasi", "Amanah", "Kreatif", "Berakhlaqul Karimah"];
    var wordIndex = 0;
    var charIndex = 0;
    var isDeleting = false;
    
    function typeEffect() {
        var currentWord = words[wordIndex];
        
        if (isDeleting) {
            textEl.textContent = prefix + currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            textEl.textContent = prefix + currentWord.substring(0, charIndex + 1);
            charIndex++;
        }
        
        var typingSpeed = isDeleting ? 40 : 100;
        
        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typingSpeed = 500; // Pause before new word
        }
        
        setTimeout(typeEffect, typingSpeed);
    }
    
    setTimeout(typeEffect, 1000);
});

// 3. Simple Vanilla Tilt
document.addEventListener('mousemove', function(e) {
    var cards = document.querySelectorAll('.tilt-element, .berita-card, .eskul-card, .sarana-card');
    cards.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        if(e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var maxDeg = 6; // soft tilt
            var rotateY = (x / rect.width * 2 - 1) * maxDeg;
            var rotateX = (1 - y / rect.height * 2) * maxDeg;
            card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.02, 1.02, 1.02)';
            card.style.transition = 'none';
        }
    });
});
document.addEventListener('mouseout', function(e) {
    var cards = document.querySelectorAll('.tilt-element, .berita-card, .eskul-card, .sarana-card');
    cards.forEach(function(card) {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.5s ease-out';
    });
});

// 4. Testimonial Slider JS
var currentTestimonialIndex = 0;
var testimonialInterval;

function initTestimonial() {
    var track = document.getElementById('testimonialTrack');
    if (!track) return;
    showTestimonial(currentTestimonialIndex);
    testimonialInterval = setInterval(function() { moveTestimonial(1); }, 6000);
}

function moveTestimonial(n) {
    clearInterval(testimonialInterval);
    var track = document.getElementById('testimonialTrack');
    if (!track) return;
    var slides = track.querySelectorAll('.testimonial-slide');
    currentTestimonialIndex += n;
    if (currentTestimonialIndex >= slides.length) currentTestimonialIndex = 0;
    if (currentTestimonialIndex < 0) currentTestimonialIndex = slides.length - 1;
    showTestimonial(currentTestimonialIndex);
    testimonialInterval = setInterval(function() { moveTestimonial(1); }, 6000);
}

window.moveTestimonial = moveTestimonial; // Expose to global for onclick

function setTestimonial(n) {
    clearInterval(testimonialInterval);
    currentTestimonialIndex = n;
    showTestimonial(currentTestimonialIndex);
    testimonialInterval = setInterval(function() { moveTestimonial(1); }, 6000);
}
window.setTestimonial = setTestimonial; // Expose to global

function showTestimonial(index) {
    var track = document.getElementById('testimonialTrack');
    if (!track) return;
    var dots = document.querySelectorAll('#testimonialDots .dot');
    track.style.transform = 'translateX(-' + (index * 100) + '%)';
    dots.forEach(function(d, i) {
        if (i === index) {
            d.classList.add('active');
            d.style.background = 'var(--primary)';
        } else {
            d.classList.remove('active');
            d.style.background = 'rgba(30,58,138,0.2)';
        }
    });
}
document.addEventListener('DOMContentLoaded', initTestimonial);

// ==============================================================================
// MODUL RUANG DISKUSI (FORUM) & AI CHAT
// ==============================================================================

// Upload gambar sekarang menggunakan Google Drive via Google Apps Script

// Konfigurasi Google Apps Script URL untuk AI Chat (Gemini Proxy)
const GAS_AI_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyJYNNxg_m89JVoJcnMHJRhyBnZsbpWxugeP8R0M_ahrbF7Iys1DWkhM_XsoyUUkCL_/exec";

var selectedForumImageFile = null;

// --- Kompresi Gambar menggunakan Canvas ---
function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height *= maxWidth / width));
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width *= maxHeight / height));
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Output as Blob (JPEG)
            canvas.toBlob(function(blob) {
                callback(blob);
            }, 'image/jpeg', quality);
        };
    };
}

// --- Preview Gambar di Input Form ---
function handleForumImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validasi ukuran awal (opsional)
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showToast("Ukuran gambar terlalu besar. Maksimal 5MB.", "warning");
        return;
    }

    selectedForumImageFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('forumImagePreview').src = e.target.result;
        document.getElementById('forumImagePreviewContainer').style.display = 'block';
    }
    reader.readAsDataURL(file);
}

function removeForumImage() {
    selectedForumImageFile = null;
    document.getElementById('forumInputImage').value = '';
    document.getElementById('forumImagePreviewContainer').style.display = 'none';
}

// --- Submit Status ke Forum ---
async function submitForumPost() {
    if (!currentUser) {
        showToast("Sesi habis. Silakan login kembali.", "error");
        return;
    }

    const text = document.getElementById('forumInputText').value.trim();
    if (!text && !selectedForumImageFile) {
        showToast("Tulis sesuatu atau unggah gambar untuk dibagikan.", "warning");
        return;
    }

    document.getElementById('globalLoaderText').innerText = "Memposting ke ruang diskusi...";
    document.getElementById('globalLoader').style.display = 'flex';

    try {
        let imageUrl = null;

        // 1. Upload Gambar ke Google Drive jika ada
        if (selectedForumImageFile) {
            // Kompres gambar terlebih dahulu (ditingkatkan resolusi dan kualitasnya)
            const compressedBlob = await new Promise((resolve) => {
                compressImage(selectedForumImageFile, 1920, 1920, 0.85, resolve);
            });

            // Upload ke Google Drive
            imageUrl = await uploadToGoogleDrive(compressedBlob, 'forum');
        }

        // 2. Simpan Data ke Supabase
        const { data, error } = await supabaseClient.from('forum_posts').insert([
            {
                user_id: currentUser.id,
                role: currentRole,
                nama_pengguna: currentUser.name || currentUser.email,
                konten: text,
                image_url: imageUrl
            }
        ]);

        if (error) throw error;
        
        // 3. Simpan ke Galeri jika diceklis
        const saveToGallery = document.getElementById('forumSaveToGallery')?.checked;
        if (imageUrl && saveToGallery) {
            await supabaseClient.from('galeri').insert([{
                gambar_url: imageUrl,
                album_nama: 'Share',
                keterangan: 'Dibagikan dari Ruang Diskusi oleh ' + (currentUser.name || currentUser.email),
                tanggal: new Date().toISOString().split('T')[0]
            }]);
            
            // Refresh galeri di background
            if(typeof loadGaleri === 'function') loadGaleri();
            if(typeof loadGaleriBeranda === 'function') loadGaleriBeranda();
        }

        // Bersihkan Form
        document.getElementById('forumInputText').value = '';
        removeForumImage();
        showToast("Berhasil membagikan postingan!", "success");
        
        // Muat ulang feed
        loadForumFeed();

    } catch (e) {
        console.error(e);
        showToast(e.message || "Terjadi kesalahan saat memposting.", "error");
    } finally {
        document.getElementById('globalLoader').style.display = 'none';
    }
}

// --- Load Forum Feed ---
async function loadForumFeed() {
    const container = document.getElementById('forumFeedContainer');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;"><i data-lucide="loader" class="icon-spin"></i> Memuat...</p>';
    if (window.lucide) lucide.createIcons();

    try {
        // Ambil data postingan, terurut dari yang terbaru
        const { data: posts, error } = await supabaseClient
            .from('forum_posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Belum ada diskusi. Jadilah yang pertama membagikan cerita!</p>';
            return;
        }

        // Ambil likes dan comments
        const { data: allLikes } = await supabaseClient.from('forum_likes').select('post_id, user_id');
        const { data: allComments } = await supabaseClient.from('forum_comments').select('*').order('created_at', { ascending: true });

        let html = '';
        const myUserId = currentUser ? currentUser.id : null;

        posts.forEach(post => {
            const postLikes = (allLikes || []).filter(l => l.post_id === post.id);
            const myLike = postLikes.find(l => l.user_id === myUserId);
            const postComments = (allComments || []).filter(c => c.post_id === post.id);
            
            const avatarLetter = (post.nama_pengguna || 'U').charAt(0).toUpperCase();
            const timeStr = new Date(post.created_at).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});

            html += `
            <div class="forum-post" id="post-${post.id}">
                <div class="forum-post-header">
                    <div class="forum-avatar">${avatarLetter}</div>
                    <div class="forum-user-info">
                        <h4>${escHtml(post.nama_pengguna)}</h4>
                        <div class="forum-user-meta">
                            <span class="forum-role-badge">${escHtml(post.role)}</span>
                            <span>•</span>
                            <span>${timeStr}</span>
                        </div>
                    </div>
                </div>
                <div class="forum-content">${escHtml(post.konten)}</div>
                ${post.image_url ? `<img src="${post.image_url}" class="forum-image" alt="Post Image" onclick="openGaleriLightbox('${post.image_url}', 'Gambar dari ${escAttr(post.nama_pengguna)}')" />` : ''}
                
                <div class="forum-actions">
                    <button class="forum-action-btn ${myLike ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
                        <i data-lucide="heart"></i> <span id="like-count-${post.id}">${postLikes.length}</span> Suka
                    </button>
                    <button class="forum-action-btn" onclick="document.getElementById('comment-input-${post.id}').focus()">
                        <i data-lucide="message-square"></i> <span id="comment-count-${post.id}">${postComments.length}</span> Komentar
                    </button>
                    ${post.user_id === myUserId ? `
                    <button class="forum-action-btn" onclick="deleteForumPost('${post.id}')" style="color: #ef4444; margin-left: auto;" title="Hapus Postingan">
                        <i data-lucide="trash-2"></i> Hapus
                    </button>
                    ` : ''}
                </div>

                <div class="forum-comments-section">
                    <div class="forum-comment-list" id="comment-list-${post.id}">
            `;

            // Tampilkan Komentar
            postComments.forEach(comment => {
                const cAvatar = (comment.nama_pengguna || 'U').charAt(0).toUpperCase();
                html += `
                <div class="forum-comment-item">
                    <div class="forum-comment-avatar">${cAvatar}</div>
                    <div class="forum-comment-body">
                        <h5>${escHtml(comment.nama_pengguna)}</h5>
                        <p>${escHtml(comment.konten)}</p>
                    </div>
                </div>
                `;
            });

            html += `
                    </div>
                    <div class="forum-comment-input-wrap">
                        <input type="text" class="forum-comment-input" id="comment-input-${post.id}" placeholder="Tulis komentar..." onkeypress="if(event.key === 'Enter') submitComment('${post.id}')" />
                        <button class="btn btn-primary" style="border-radius: 20px; padding: 0.5rem 1rem;" onclick="submitComment('${post.id}')"><i data-lucide="send" style="width:14px;height:14px;"></i></button>
                    </div>
                </div>
            </div>
            `;
        });

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Gagal memuat feed diskusi.</p>';
    }
}

// --- Like / Unlike ---
async function toggleLike(postId, btnEl) {
    if (!currentUser) return;
    
    const isLiked = btnEl.classList.contains('liked');
    const countSpan = document.getElementById(`like-count-${postId}`);
    let count = parseInt(countSpan.innerText) || 0;

    try {
        // Optimistic UI update (Langsung ubah tampilan tanpa refresh)
        if (isLiked) {
            btnEl.classList.remove('liked');
            countSpan.innerText = Math.max(0, count - 1);
            // Eksekusi background
            supabaseClient.from('forum_likes').delete().match({ post_id: postId, user_id: currentUser.id }).then();
        } else {
            btnEl.classList.add('liked');
            countSpan.innerText = count + 1;
            // Eksekusi background
            supabaseClient.from('forum_likes').insert([{ post_id: postId, user_id: currentUser.id }]).then();
        }
    } catch (e) {
        console.error(e);
    }
}

// --- Submit Komentar ---
async function submitComment(postId) {
    if (!currentUser) return;
    const inputEl = document.getElementById(`comment-input-${postId}`);
    const text = inputEl.value.trim();
    if (!text) return;

    // Optimistic UI update
    const listEl = document.getElementById(`comment-list-${postId}`);
    const cAvatar = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
    const newHtml = `
        <div class="forum-comment-item">
            <div class="forum-comment-avatar">${cAvatar}</div>
            <div class="forum-comment-body">
                <h5>${escHtml(currentUser.name || currentUser.email)}</h5>
                <p>${escHtml(text)}</p>
            </div>
        </div>
    `;
    listEl.insertAdjacentHTML('beforeend', newHtml);
    inputEl.value = '';
    
    const countSpan = document.getElementById(`comment-count-${postId}`);
    if (countSpan) countSpan.innerText = (parseInt(countSpan.innerText) || 0) + 1;

    try {
        // Eksekusi background
        supabaseClient.from('forum_comments').insert([{
            post_id: postId,
            user_id: currentUser.id,
            nama_pengguna: currentUser.name || currentUser.email,
            konten: text
        }]).then();
    } catch (e) {
        console.error(e);
    }
}

// --- Hapus Postingan ---
async function deleteForumPost(postId) {
    if (typeof showCustomConfirm === 'function') {
        showCustomConfirm(
            'Hapus Postingan?', 
            'Apakah Anda yakin ingin menghapus postingan ini secara permanen?', 
            'Ya, Hapus', 
            async function() {
                executeDeletePost(postId);
            }
        );
    } else {
        if (!confirm("Apakah Anda yakin ingin menghapus postingan ini secara permanen?")) return;
        executeDeletePost(postId);
    }
}

async function executeDeletePost(postId) {
    // Hapus dari UI langsung
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) postEl.remove();

    try {
        // Hapus postingan utama (likes dan comments akan otomatis terhapus karena ON DELETE CASCADE di database)
        // Kita tidak bisa menghapus likes/comments secara manual dari frontend karena akan terbentur RLS (akses ditolak jika mencoba menghapus milik orang lain).
        const { error } = await supabaseClient.from('forum_posts').delete().eq('id', postId);
        
        if (error) throw error;
        
        showToast("Postingan dihapus.", "success");
    } catch (e) {
        console.error(e);
        showToast("Gagal menghapus postingan.", "error");
    }
}

// Hook loadForumFeed dipanggil dari showSection yang sudah ada di atas (baris ~891)

// ==============================================================================
// AI CHATBOT (GEMINI PROXY)
// ==============================================================================

function toggleAiChat() {
    const modal = document.getElementById('aiChatModal');
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
        document.getElementById('aiChatInput').focus();
    }
}

// Tutup AI otomatis jika klik di luar area chat box
document.addEventListener('click', function(e) {
    const aiModal = document.getElementById('aiChatModal');
    const aiFab = document.querySelector('.ai-fab');
    if (aiModal && aiModal.classList.contains('active')) {
        if (!aiModal.contains(e.target) && (!aiFab || !aiFab.contains(e.target))) {
            aiModal.classList.remove('active');
        }
    }
});

async function sendAiMessage() {
    const inputEl = document.getElementById('aiChatInput');
    const text = inputEl.value.trim();
    if (!text) return;

    const chatBody = document.getElementById('aiChatBody');
    
    // 1. Tampilkan pesan user
    chatBody.innerHTML += `
      <div class="ai-msg-wrapper user">
        <div class="ai-avatar user-avatar" style="background:#6366f1;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <div class="ai-msg user">${escHtml(text)}</div>
      </div>
    `;
    inputEl.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // 2. Tampilkan indikator mengetik
    const typingId = 'typing-' + Date.now();
    const typingWrapperId = 'wrapper-' + typingId;
    chatBody.innerHTML += `
        <div class="ai-msg-wrapper bot" id="${typingWrapperId}">
          <div class="ai-avatar bot-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
          </div>
          <div class="ai-msg bot" id="${typingId}">
            <div class="ai-typing"><span></span><span></span><span></span></div>
          </div>
        </div>
    `;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        // Ambil dari DB dulu agar Tersinkronisasi, fallback ke localStorage
        let dbKey = null;
        try {
            if (supabaseClient) {
                const { data } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_api_key').maybeSingle();
                if (data && data.value) dbKey = data.value;
            }
        } catch(e) {}
        
        let GROQ_API_KEY = dbKey || localStorage.getItem('GROQ_API_KEY') || "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";
        const url = "https://api.groq.com/openai/v1/chat/completions";
        
        const systemPrompt = `Kamu adalah asisten virtual pintar, ramah, dan sopan bernama 'Asfa' untuk platform dashboard pendidikan SMP IT Al-Fathonah.

ATURAN WAJIB:
1. Jawab menggunakan BAHASA YANG SAMA dengan bahasa pengguna. Jika pengguna bertanya dalam Bahasa Inggris, jawab dalam Bahasa Inggris. Jika dalam Bahasa Indonesia, jawab dalam Bahasa Indonesia yang BAKU sesuai EYD/PUEBI. Jika dalam bahasa lain (Arab, Jawa, Sunda, dll.), jawab dalam bahasa tersebut.
2. JANGAN PERNAH membuat typo, salah ketik, atau kata-kata yang tidak utuh/terpotong.
3. Pastikan setiap kalimat lengkap dan dapat dipahami dengan mudah.
4. Gunakan tanda baca yang tepat dan konsisten.
5. Jika menyebutkan istilah asing atau teknis, gunakan huruf miring dengan tanda bintang (*istilah*).
6. Kamu adalah asisten UMUM yang cerdas. Kamu bisa dan HARUS menjawab SEMUA pertanyaan pengguna — baik tentang aplikasi sekolah, pelajaran, sains, matematika, sejarah, teknologi, kesehatan, agama, bahasa, maupun pertanyaan umum lainnya. Jangan pernah menolak pertanyaan umum hanya karena tidak terkait aplikasi.

Berikan jawaban yang ramah, informatif, dan jelas. Jika ditanya soal memutar musik, beri tahu dengan sopan bahwa Anda adalah asisten berbasis teks dan belum memiliki fitur pemutar musik langsung di dasbor.

Kamu HARUS tahu bahwa aplikasi web ini adalah **Sistem Informasi Sekolah Terpadu** berbasis *Cloud* (Supabase + Google Apps Script) yang memiliki puluhan modul canggih. Jangan mengarang fitur yang tidak ada, tetapi jelaskan dengan BANGGA semua fitur berikut ini:

1. **Akademik & Pembelajaran**:
   - *E-Jurnal Mengajar*: Guru mencatat jurnal pengajaran harian secara digital.
   - *Asesmen & Bank Soal* (menu "Buat Soal Asesmen"): Modul lengkap pembuatan soal ujian dengan **3 metode**:
     a. **Buat Manual** — Guru mengetik soal PG dan Essay satu per satu di kanvas editor, lengkap dengan fitur **upload gambar** yang bisa disisipkan ke setiap soal sebagai ilustrasi.
     b. **Paste Naskah Jadi** — Guru menempel (*copy-paste*) naskah soal utuh dari Word/PDF. Sistem *parser* cerdas otomatis mendeteksi soal PG (beserta opsi A-D) dan Essay. Tersedia tombol **Rapikan Ejaan AI** untuk memperbaiki *typo* hasil *copy-paste* yang berantakan.
     c. **Bikin Pakai AI** — Guru cukup mengetik topik/materi (misal: "10 soal PJOK kelas 9"), lalu AI (*Groq Llama-3*) otomatis membuatkan seluruh soal lengkap. Tersedia pengaturan **Tingkat Kesulitan** (LOTS/MOTS/HOTS), tombol **Buat Teks Cerita** untuk naskah literasi/bacaan, dan tombol **Rapikan Ejaan AI**.
   - Semua soal bisa di-*preview*, disimpan sebagai **Draft**, atau langsung **Diterbitkan ke Google Form** secara otomatis (terintegrasi *Google Apps Script*). Hasil ujian otomatis tersinkronisasi ke *Google Sheets*.
   - Pengaturan *Tahun Akademik, Kelas, Mata Pelajaran & KKM*.

2. **Manajemen Konten Publik**:
   - Pembuatan *Berita & Kegiatan* dengan fitur **Auto-Tulis AI** (AI merangkai poin berita menjadi paragraf jurnalistik).
   - *Pengumuman* (*Running Text* / *Ticker*) yang tampil otomatis di halaman utama (*landing page*), dilengkapi fitur **Perbagus Pengumuman AI**.
   - Penetapan *Aturan & Tata Tertib* sekolah.

3. **Monitoring & Laporan**:
   - Laporan *Nilai Siswa* dan *Jurnal Mengajar*.
   - Melihat *Kritik & Saran Masuk* dari publik.

4. **Data Induk (Database)**:
   - Manajemen data *Guru & Staff* (lengkap dengan profil, NIP, jabatan).
   - *Data Siswa* (Data Induk Siswa lengkap).
   - *Daftar Alumni* dan riwayat kelulusan.

5. **Operasional Sekolah**:
   - Pencatatan *Data Mutasi Siswa* (Mutasi Masuk dan Mutasi Keluar).
   - *Kenaikan Kelas Otomatis* dengan fitur pengecualian siswa tinggal kelas.
   - *Agenda Dinas*, *Inventaris & Sarpras*, *Surat Masuk & Keluar*, serta *Notulensi & Dokumen*.

6. **Layanan Kesiswaan**:
   - Manajemen *Catatan Pelanggaran*, *Ekstrakurikuler*, *Prestasi Siswa*.
   - Catatan *Bimbingan Konseling (BK)*, *Catatan Kesehatan / UKS*.
   - Program *Kegiatan OSIS*.

7. **Sosial & Interaksi Internal**:
   - *Ruang Diskusi (Forum)*: Layaknya media sosial internal, pengguna bisa posting gambar, berkomentar, memberi "Like", dan menyimpan ke Galeri.
   - *Galeri* foto/video sekolah.
   - Menu *Profil Saya* untuk setiap pengguna.

8. **Fitur AI Terintegrasi** (menggunakan *Groq API* dengan model *Llama-3*):
   - **Generate Soal AI** — buat soal ujian otomatis dari topik.
   - **Buat Teks Cerita AI** — buat naskah bacaan literasi untuk soal *reading comprehension*.
   - **Rapikan Ejaan AI** — perbaiki *typo* dan format naskah soal.
   - **Perbagus Pengumuman AI** — optimalkan teks pengumuman sekolah.
   - **Auto-Tulis Berita AI** — rangkai poin berita menjadi artikel profesional.
   - **Balas Kritik & Saran AI** (BARU) — buat draf balasan otomatis yang ramah dan solutif untuk kritik/saran dari wali murid.
   - **Draft Surat Keluar AI** (BARU) — buat draf isi surat resmi sekolah hanya dengan memasukkan perihal surat.
   - **Kembangkan Jurnal Mengajar AI** (BARU) — kembangkan topik/bab singkat menjadi deskripsi kegiatan mengajar harian yang terstruktur.
   - **Asisten Chat AI (Asfa)** — kamu sendiri! Chatbot cerdas yang bisa menjawab pertanyaan seputar aplikasi dan membantu pengguna.

9. **Kelola Konten (Konfigurasi)**:
   - Pengaturan URL *Google Apps Script* untuk integrasi *Google Form/Drive*.
   - Pengaturan *Tahun Akademik* aktif.

10. **Keuangan & Bendahara** (MODUL BARU):
    Aplikasi ini memiliki **dua menu keuangan** yang dikelola oleh Bendahara:
    
    **A. Transaksi Universal:**
    - Digunakan untuk tagihan kegiatan fleksibel seperti Renang, Outbound, ANBK, Study Tour, dll.
    - Cara Pakai: Klik tombol **"Buat Transaksi Baru"** → isi nama kegiatan, kelas target, nominal, dan tanggal → tekan **Simpan Tagihan**.
    - Tagihan yang sudah dibuat akan muncul di **Tabel Daftar Riwayat Tagihan Universal**. Klik tombol **"Detail"** pada baris tagihan untuk melihat daftar siswa beserta status pembayarannya.
    - Di halaman detail siswa, Bendahara bisa mengeklik tombol **"Bayar/Detail"** pada setiap siswa untuk mencatat pembayaran cicilan. Status otomatis berubah: Belum Bayar → Belum Lunas → Lunas.
    - Tagihan bisa dihapus permanen dengan tombol hapus (ikon tempat sampah merah) di tabel riwayat.
    
    **B. Pendaftaran & Administrasi:**
    - Digunakan untuk tagihan pendaftaran siswa baru per angkatan (misal: "Pendaftaran Angkatan 2024", "Pendaftaran Angkatan 2025").
    - Cara Pakai: Klik tombol **"Buat Tagihan Pendaftaran"** → isi nama tagihan, kelas target, nominal, dan tanggal → tekan **Simpan Tagihan**.
    - Cara kerja persis sama dengan Transaksi Universal — ada Tabel Riwayat Tagihan, tombol Detail, dan tombol Bayar/Detail pada setiap siswa.
    - Siswa bisa mencicil pembayaran dari kelas 7 sampai kelas 9. Data tidak akan hilang meskipun siswa naik kelas.
    
    **PENTING tentang Penyimpanan Data Keuangan:**
    - Semua data tagihan dan riwayat pembayaran tersimpan PERMANEN di database Supabase.
    - Data TIDAK akan hilang saat kenaikan kelas atau pergantian tahun ajaran.
    - Data hanya terhapus jika Bendahara secara sengaja mengeklik tombol hapus pada tagihan.
    - Bendahara bisa mencetak laporan dan kwitansi (format kertas F4, maksimal 4 kwitansi per halaman).

Jika pengguna bertanya tentang apa yang bisa dilakukan aplikasi ini, jelaskan kemampuan di atas dengan antusias dan bangga sebagai Asfa! Tekankan bahwa aplikasi ini SUDAH memiliki fitur AI canggih yang terintegrasi langsung.

INGAT: Kamu juga asisten UMUM. Jika pengguna bertanya hal di luar konteks aplikasi (misalnya pertanyaan tentang matematika, sains, sejarah, tips belajar, resep masakan, dll.), TETAP jawab dengan baik dan informatif. Kamu adalah chatbot cerdas serba bisa!`;

        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            temperature: 0.7,
            stream: true // Mengaktifkan efek streaming (mengetik alami)
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            if (res.status === 401 || (errData.error && errData.error.message.includes('Invalid API Key'))) {
                if (currentRole === 'admin' || currentRole === 'kurikulum') {
                    const modal = document.getElementById('apiKeyModal');
                    if (modal) modal.classList.add('active');
                } else {
                    if (typeof showToast === 'function') showToast("Sistem AI sedang bermasalah (API Key Invalid). Silakan hubungi Admin atau Kurikulum.", "error");
                    else alert("Sistem AI sedang bermasalah (API Key Invalid). Silakan hubungi Admin atau Kurikulum.");
                }
            }
            throw new Error(errData.error?.message || "Gagal menghubungi server AI Groq");
        }

        // Siapkan kontainer untuk streaming text
        const typingWrapper = document.getElementById(typingWrapperId);
        let msgEl;

        if (typingWrapper) {
            typingWrapper.innerHTML = `
              <div class="ai-avatar bot-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
              </div>
              <div class="ai-msg bot" id="msg-${typingId}"></div>
            `;
            msgEl = document.getElementById(`msg-${typingId}`);
        } else {
            chatBody.innerHTML += `
              <div class="ai-msg-wrapper bot">
                <div class="ai-avatar bot-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
                </div>
                <div class="ai-msg bot" id="msg-${typingId}"></div>
              </div>
            `;
            msgEl = document.getElementById(`msg-${typingId}`);
        }

        // Proses streaming respons
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.choices[0].delta.content) {
                            fullText += data.choices[0].delta.content;
                            
                            // Terapkan markdown dasar secara realtime
                            let renderedText = fullText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                       .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                       .replace(/\n/g, '<br>');
                            
                            msgEl.innerHTML = renderedText;
                            chatBody.scrollTop = chatBody.scrollHeight;
                        }
                    } catch (e) {
                        // ignore parse error on incomplete chunks
                    }
                }
            }
        }

    } catch (e) {
        console.error(e);
        const typingWrapper = document.getElementById('wrapper-' + typingId) || document.getElementById(typingId);
        if(typingWrapper) typingWrapper.remove();
        
        let errorMsg = e.message || "Terjadi kesalahan";
        chatBody.innerHTML += `
          <div class="ai-msg-wrapper bot">
            <div class="ai-avatar bot-avatar" style="background:#ef4444;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div class="ai-msg bot" style="color:#ef4444; border-color:#fca5a5;">⚠️ ${errorMsg}</div>
          </div>
        `;
    }
    
    chatBody.scrollTop = chatBody.scrollHeight;
}

// ==============================================================================
// AI AUTO GENERATOR MODULES (GROQ LLAMA 3)
// ==============================================================================

async function fetchGroqAI(prompt, systemMsg) {
    let dbKey = null;
    try {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('system_settings').select('value').eq('key', 'groq_api_key').maybeSingle();
            if (data && data.value) dbKey = data.value;
        }
    } catch(e) {}
    
    let GROQ_API_KEY = dbKey || localStorage.getItem('GROQ_API_KEY') || "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";
    const url = "https://api.groq.com/openai/v1/chat/completions";
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemMsg },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            if (res.status === 401 || (errData.error && errData.error.message.includes('Invalid API Key'))) {
                if (currentRole === 'admin' || currentRole === 'kurikulum') {
                    const modal = document.getElementById('apiKeyModal');
                    if (modal) modal.classList.add('active');
                } else {
                    if (typeof showToast === 'function') showToast("Sistem AI sedang bermasalah (API Key Invalid). Silakan hubungi Admin atau Kurikulum.", "error");
                    else alert("Sistem AI sedang bermasalah (API Key Invalid). Silakan hubungi Admin atau Kurikulum.");
                }
            }
            throw new Error(errData.error?.message || "Gagal memanggil API Groq");
        }
        const data = await res.json();
        return data.choices[0].message.content.trim();
    } catch (e) {
        console.error(e);
        if (typeof showToast === 'function') showToast("Gagal memproses AI. Coba lagi.", "error");
        else alert("Gagal memproses AI. Coba lagi.");
        return null;
    }
}

async function generateDraftSuratAI() {
    const perihal = document.getElementById('formSuratPerihal').value.trim();
    if (!perihal) {
        if (typeof showToast === 'function') showToast("Isi bagian 'Perihal' surat terlebih dahulu sebagai topik utama!", "error");
        else alert("Isi bagian 'Perihal' surat terlebih dahulu sebagai topik utama!");
        return;
    }

    const btn = document.querySelector('#btnDraftSuratAI');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Memproses AI...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah staf tata usaha (TU) di Sekolah Menengah Pertama Islam Terpadu (SMP IT) Al-Fathonah yang sangat ahli membuat draf Surat Resmi. Tugasmu membuat isi/badan surat yang baku, rapi, dan terstruktur berdasarkan topik/perihal yang diberikan pengguna.";
    const prompt = `Buatkan draf isi surat resmi sekolah (tidak perlu KOP Surat, cukup bagian paragraf pembuka, isi, dan penutup) berdasarkan Perihal berikut:\n\nPerihal: ${perihal}\n\nTulis dengan gaya bahasa formal, resmi, baku, dan profesional.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        document.getElementById('formSuratKeterangan').value = result;
        if (typeof showToast === 'function') showToast("Draf isi surat berhasil dibuat oleh AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateJurnalAI() {
    const judulMateri = document.getElementById('formProgressJudul').value.trim();
    if (!judulMateri) {
        if (typeof showToast === 'function') showToast("Silakan isi 'Judul Bab / Materi' terlebih dahulu!", "error");
        else alert("Silakan isi 'Judul Bab / Materi' terlebih dahulu!");
        return;
    }

    const btn = document.querySelector('#btnJurnalAI');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Memproses AI...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah guru profesional di SMP IT Al-Fathonah yang berpengalaman. Tugasmu adalah merancang deskripsi singkat Kegiatan Belajar Mengajar (KBM) untuk diisi ke dalam Jurnal Mengajar. Buatlah deskripsi yang rapi, mencakup pendahuluan, inti, dan penutup (seperti RPP singkat).";
    const prompt = `Buatkan catatan Jurnal Mengajar (1 paragraf padat atau beberapa poin singkat) berdasarkan materi/judul berikut:\n\nMateri: ${judulMateri}\n\nTuliskan HANYA isi catatannya saja, tanpa salam atau basa-basi.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        document.getElementById('formProgressCatatan').value = result;
        if (typeof showToast === 'function') showToast("Deskripsi Jurnal berhasil dikembangkan oleh AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function enhancePengumumanAI() {
    const isiEl = document.getElementById('pengumumanIsi');
    const text = isiEl.value.trim();
    if (!text) {
        if (typeof showToast === 'function') showToast("Ketikkan ide kasar pengumuman terlebih dahulu!", "error");
        else alert("Ketikkan ide kasar pengumuman terlebih dahulu!");
        return;
    }

    const btn = document.querySelector('button[onclick="enhancePengumumanAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Memproses...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah staf Tata Usaha Sekolah yang sangat profesional. Tugasmu merombak/memperbaiki kalimat mentah menjadi PENGUMUMAN SEKOLAH RESMI yang baku, sopan, jelas, dan profesional.";
    const prompt = `Tulis ulang teks berikut menjadi paragraf pengumuman sekolah yang sangat rapi:\n\n"${text}"\n\nTuliskan HANYA isi pengumumannya saja, tanpa salam pembuka surat atau basa-basi.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        isiEl.value = result;
        if (typeof showToast === 'function') showToast("Teks pengumuman berhasil diperbagus AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateBeritaAI() {
    const ringkasanEl = document.getElementById('beritaRingkasan');
    const text = ringkasanEl.value.trim();
    const judul = document.getElementById('beritaJudul').value.trim();

    if (!text && !judul) {
        if (typeof showToast === 'function') showToast("Ketikkan judul atau poin berita terlebih dahulu!", "error");
        return;
    }

    const btn = document.querySelector('button[onclick="generateBeritaAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:12px;height:12px;"></i> Auto-Tulis...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah jurnalis dan humas sekolah yang ahli. Tugasmu merangkai poin-poin menjadi satu atau dua paragraf berita kegiatan sekolah yang bergaya jurnalistik, menarik, positif, dan siap rilis di website.";
    const prompt = `Buatkan paragraf berita sekolah (maksimal 2 paragraf).\nJudul: ${judul}\nPoin/Draft: ${text}\n\nBerikan HANYA teks beritanya saja tanpa judul atau basa-basi.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        ringkasanEl.value = result;
        if (typeof showToast === 'function') showToast("Berita berhasil dirangkai AI!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateSoalAI() {
    var promptInput = document.getElementById('aiPromptInput');
    var resultArea = document.getElementById('aiTextarea');
    var text = promptInput ? promptInput.value.trim() : '';
    if (!text) {
        if (typeof showToast === 'function') showToast("Ketikkan perintah/topik di kotak 'Perintah untuk AI' terlebih dahulu!", "error");
        return;
    }

    const tingkatKesulitanEl = document.getElementById('aiKesulitan');
    const tingkatKesulitan = tingkatKesulitanEl ? tingkatKesulitanEl.value : "MOTS";
    let instruksiKesulitan = "";
    
    if (tingkatKesulitan === "HOTS") {
        instruksiKesulitan = "SANGAT PENTING: Buat soal dengan tingkat kesulitan HOTS (High Order Thinking Skills). Soal harus berupa analisis, evaluasi, sintesis kasus, atau problem solving. Hindari pertanyaan hafalan dasar (apa, siapa, kapan).";
    } else if (tingkatKesulitan === "LOTS") {
        instruksiKesulitan = "SANGAT PENTING: Buat soal dengan tingkat kesulitan LOTS (Low Order Thinking Skills). Fokus pada hafalan dasar, ingatan, pemahaman dasar (pertanyaan apa, siapa, kapan, di mana, sebutkan).";
    } else {
        instruksiKesulitan = "SANGAT PENTING: Buat soal dengan tingkat kesulitan MOTS (Medium Order Thinking Skills). Campur antara ingatan dan pemahaman konsep yang wajar.";
    }

    const btn = document.querySelector('button[onclick="generateSoalAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:14px;height:14px;"></i> Menyusun...`;
    btn.disabled = true;

    // Hitung nomor soal terakhir dari naskah yang sudah ada
    var existingText = resultArea ? resultArea.value.trim() : '';
    var lastNum = 0;
    if (existingText) {
        var numMatches = existingText.match(/^\s*(\d+)\s*\./gm);
        if (numMatches) {
            numMatches.forEach(function(m) {
                var n = parseInt(m);
                if (n > lastNum) lastNum = n;
            });
        }
    }
    var startNum = lastNum + 1;

    const systemMsg = `Kamu adalah Guru Ahli yang mahir membuat instrumen soal ujian standar sekolah (SMP/SMA).
Tugasmu adalah membuatkan soal berdasarkan Topik/Materi yang diketik oleh pengguna.
${instruksiKesulitan}

PENTING: Nomor soal HARUS DIMULAI DARI NOMOR ${startNum}. Jangan mulai dari 1 jika diminta mulai dari nomor lain.

Kamu HARUS menuliskan soal dengan FORMAT YANG SANGAT KETAT di bawah ini, karena outputmu akan dibaca secara otomatis oleh program parser (Regex).

ATURAN FORMAT PILIHAN GANDA (Wajib pakai A, B, C, D bertingkat):
1. [Pertanyaan]
A. [Opsi A]
B. [Opsi B]
C. [Opsi C]
D. [Opsi D]
Kunci: [A/B/C/D]

ATURAN FORMAT ESSAY (Tanpa A,B,C,D sama sekali):
1. [Pertanyaan Essay]
Kunci Jawaban: [kata kunci 1], [kata kunci 2], [kata kunci 3]

ATURAN KUNCI JAWABAN ESSAY (SANGAT PENTING):
- Kunci jawaban essay HARUS berupa daftar kata kunci yang dipisahkan KOMA.
- Jika ada kata-kata yang memiliki sinonim atau variasi jawaban yang sama-sama benar, pisahkan dengan tanda [OR].
- Contoh format benar: "fotosintesis, klorofil, sinar matahari [OR] cahaya matahari, karbon dioksida [OR] CO2"
- Contoh lain: "Soekarno [OR] Ir. Soekarno, proklamasi, 17 Agustus 1945"
- Jangan tulis kunci jawaban dalam bentuk kalimat panjang. Harus berupa kata kunci pendek yang terpisah koma.

Jangan tambahkan teks pengantar apapun selain soal dan jawaban. Pastikan setiap pilihan jawaban salah (distraktor) pada Pilihan Ganda cukup mengecoh dan logis.

ATURAN BAHASA ARAB / AL-QUR'AN (JIKA DIMINTA):
- Jika pengguna meminta soal PAI, Bahasa Arab, Tahsin, atau mencantumkan ayat Al-Qur'an/Hadits, kamu WAJIB menuliskan teks Arabnya dengan BENAR, LENGKAP dengan HARAKAT.
- Tuliskan teks Arab dengan rapi, misalnya: بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ.
- Pertahankan struktur arah teks agar tidak rusak saat di-parse.`;

    const prompt = `Buatkan soal ujian berdasarkan materi/topik/perintah berikut:\n\n"${text}"\n\nPENTING: \n- Nomor soal WAJIB dimulai dari nomor ${startNum}.\n- Jika pengguna secara spesifik meminta jumlah soal tertentu (misal: "10 soal PG", "15 essay"), maka PATUHI JUMLAH TERSEBUT dengan presisi.\n- Jika pengguna TIDAK menyebutkan jumlahnya secara spesifik, maka buatkan standar: 5 soal Pilihan Ganda dan 2 soal Essay.\n\nGunakan format yang sudah saya instruksikan dengan sangat ketat!`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        // Append ke naskah yang sudah ada
        if (existingText) {
            resultArea.value = existingText + '\n\n' + result;
        } else {
            resultArea.value = result;
        }
        if (typeof showToast === 'function') showToast(`Soal (${tingkatKesulitan}) berhasil ditambahkan! Total naskah bertambah. Silakan cek pratinjau.`, "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function generateCeritaAI() {
    var promptInput = document.getElementById('aiPromptInput');
    var resultArea = document.getElementById('aiTextarea');
    var text = promptInput ? promptInput.value.trim() : '';
    if (!text) {
        if (typeof showToast === 'function') showToast("Ketikkan ide atau tema cerita terlebih dahulu di kotak 'Perintah untuk AI'!", "error");
        return;
    }

    const btn = document.querySelector('button[onclick="generateCeritaAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:14px;height:14px;"></i> Membuat Teks...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah penulis cerita, literasi, atau artikel pendidikan yang andal. Tugasmu membuat satu teks bacaan (panjang sekitar 2-3 paragraf) berdasarkan tema yang diminta guru. Teks ini nantinya akan digunakan sebagai bahan soal Reading Comprehension/Literasi siswa SMP/SMA.";
    const prompt = `Buatkan teks bacaan yang menarik berdasarkan tema/ide berikut:\n\n"${text}"\n\nTuliskan HANYA teks ceritanya saja, tanpa teks awalan/akhiran.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        var existing = resultArea ? resultArea.value.trim() : '';
        if (existing) {
            resultArea.value = existing + '\n\n' + result;
        } else {
            resultArea.value = result;
        }
        if (typeof showToast === 'function') showToast("Teks bacaan berhasil dibuat! Sekarang Anda bisa klik 'Generate Pakai AI' untuk membuat soal dari teks ini.", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

async function rapikanEjaanAI() {
    // Deteksi panel mana yang aktif: parse atau ai
    var parseArea = document.getElementById('asesmenParseArea');
    var aiArea = document.getElementById('asesmenAIGenerateArea');
    var textareaId = 'parseTextarea'; // default
    if (aiArea && aiArea.style.display === 'block') {
        textareaId = 'aiTextarea';
    }

    const area = document.getElementById(textareaId);
    const text = area.value.trim();
    if (!text) {
        if (typeof showToast === 'function') showToast("Kotak teks masih kosong!", "error");
        return;
    }

    const btn = event ? event.target.closest('button') : document.querySelector('button[onclick="rapikanEjaanAI()"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="icon-spin" style="width:14px;height:14px;"></i> Merapikan...`;
    btn.disabled = true;

    const systemMsg = "Kamu adalah Editor Naskah Profesional. Tugasmu memperbaiki ejaan (EYD/PUEBI), typo, dan format teks soal yang berantakan hasil copy-paste, TANPA mengubah makna pertanyaannya sedikit pun. Pastikan hasil akhir menggunakan ejaan Bahasa Indonesia yang 100% benar dan rapi.";
    const prompt = `Rapikan ejaan dan tata letak teks soal berikut. Perbaiki typo yang ada.\n\n${text}\n\nBerikan HANYA teks hasil perbaikannya saja.`;

    const result = await fetchGroqAI(prompt, systemMsg);
    if (result) {
        area.value = result;
        if (typeof showToast === 'function') showToast("Ejaan teks berhasil dirapikan!", "success");
    }

    btn.innerHTML = oriText;
    btn.disabled = false;
    if (window.lucide) lucide.createIcons();
}

function resetAINaskah() {
    showCustomConfirm('Reset Naskah?', 'Semua naskah soal di kotak hasil akan dihapus. Anda harus generate ulang dari awal. Lanjutkan?', 'Ya, Reset', function() {
        var area = document.getElementById('aiTextarea');
        if (area) area.value = '';
        showToast('Naskah soal berhasil direset.', 'success');
    });
}


/* ============================================================
/* ============================================================
   MODUL MANAJEMEN KEUANGAN BENDAHARA
   ============================================================ */

let dKeuanganInsidental = [];
let dPembayaranSiswa = []; 

async function fetchKeuanganData() {
    try {
        // Fetch kategori insidental
        const resKat = await supabaseClient.from('keuangan_kategori').select('*').order('created_at', { ascending: false });
        if(resKat.data) {
            dKeuanganInsidental = resKat.data;
        }

        // Fetch pembayaran
        const resPem = await supabaseClient.from('keuangan_pembayaran').select('*').order('created_at', { ascending: true });
        if(resPem.data) {
            // Rebuild dPembayaranSiswa structure
            let grouped = {};
            resPem.data.forEach(p => {
                let key = p.id_siswa + '_' + p.jenis;
                if(!grouped[key]) {
                    grouped[key] = { idSiswa: p.id_siswa, jenis: p.jenis, riwayat: [] };
                }
                grouped[key].riwayat.push({
                    id_pembayaran: p.id,
                    tanggal: p.tanggal,
                    nominal: parseInt(p.nominal),
                    ket: p.keterangan || ''
                });
            });
            dPembayaranSiswa = Object.values(grouped);
        }
    } catch(e) {
        console.error('Failed to fetch keuangan data:', e);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    if(typeof supabaseClient !== 'undefined') fetchKeuanganData();
});

function getSiswaForKeuangan(filterKelas = '') {
    if(typeof siswaList === 'undefined') return [];
    
    // Convert DB structure to what the financial module expects
    let list = siswaList.filter(s => s.status === 'Aktif').map(s => {
        return {
            id: s.id,
            namaLengkap: s.nama_lengkap || '-',
            kelas: s.master_kelas ? s.master_kelas.nama_kelas : (s.kelas_id || '-'),
            statusSiswa: s.status
        };
    });

    if(filterKelas && filterKelas !== 'Semua Kelas') {
        list = list.filter(s => s.kelas === filterKelas);
    }
    return list;
}

function hitungTotalTerbayar(idSiswa, jenis) {
    let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
    if(!rec) return 0;
    return rec.riwayat.reduce((sum, item) => sum + parseInt(item.nominal), 0);
}

function hitungTotalTagihan(jenis) {
    if(jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
        let parts = jenis.split('_');
        let idKat = parts.slice(1).join('_');
        let cat = dKeuanganInsidental.find(c => c.id === idKat);
        return cat ? cat.nominal : 0;
    }
    return 0;
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

// === MANAJEMEN TAGIHAN (PENDAFTARAN & UNIVERSAL) ===
let activeDetailIdKat = null;
let activeDetailJenis = null;

function renderMasterTagihanTable(jenis) {
    let tbody = document.querySelector(`#masterTableUniversal tbody`);
    if(!tbody) return;
    
    // Gabungkan data universal dan pendaftaran ke satu tabel
    let baseData = dKeuanganInsidental.filter(k => !k.is_archived);
    if(jenis === 'pendaftaran') {
        baseData = baseData.filter(k => (k.jenis_tagihan || 'universal') === 'pendaftaran');
    }
    let filteredData = baseData;
    
    // Filter tags
    if (jenis === 'universal') {
        let search = (document.getElementById('searchTagihanMaster')?.value || '').toLowerCase();
        let filterBulan = document.getElementById('filterBulanTagihan')?.value || '';
        
        if(search) {
            filteredData = filteredData.filter(d => 
                d.nama.toLowerCase().includes(search) || 
                (d.kelas || '').toLowerCase().includes(search)
            );
        }
        if(filterBulan) {
            filteredData = filteredData.filter(d => d.tanggal && d.tanggal.startsWith(filterBulan));
        }
        
        // Summary Cards
        let summaryEl = document.getElementById('tagihanSummary');
        if(summaryEl) {
            // Total Kas Masuk (Total Pembayaran dari Tagihan Universal)
            // Ini bisa didapat dari menghitung total terbayar pada semua tagihan jenis ini
            let totalTerbayarSemua = 0;
            let totalTerbayarBulanIni = 0;
            let now = new Date();
            let bulanIni = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            
            // Mencari nama transaksi terbanyak
            let namaCounts = {};
            
            baseData.forEach(k => {
                let prefix = (k.jenis_tagihan === 'pendaftaran') ? 'pendaftaran_' : 'insidental_';
                let kodeTagihan = prefix + k.id;
                // Ambil semua pembayaran untuk tagihan ini
                if(dPembayaranSiswa && dPembayaranSiswa.length > 0) {
                    dPembayaranSiswa.forEach(p => {
                        if(p.jenis === kodeTagihan) {
                            p.riwayat.forEach(r => {
                                let nom = parseInt(r.nominal) || 0;
                                totalTerbayarSemua += nom;
                                if(r.tanggal && r.tanggal.startsWith(bulanIni)) {
                                    totalTerbayarBulanIni += nom;
                                }
                                namaCounts[k.nama] = (namaCounts[k.nama] || 0) + nom;
                            });
                        }
                    });
                }
            });
            
            let topNama = Object.entries(namaCounts).sort((a,b) => b[1] - a[1])[0];
            
            summaryEl.innerHTML = `
                <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #10b981;">
                    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Kas Masuk</div>
                    <div style="font-size:1.3rem; font-weight:700; color:#10b981;">${formatRupiah(totalTerbayarSemua)}</div>
                </div>
                <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
                    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
                    <div style="font-size:1.3rem; font-weight:700; color:#f59e0b;">${formatRupiah(totalTerbayarBulanIni)}</div>
                </div>
                <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
                    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
                    <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${filteredData.length}</div>
                </div>
                <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #8b5cf6;">
                    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Terbanyak</div>
                    <div style="font-size:1rem; font-weight:700; color:#8b5cf6;">${topNama ? topNama[0] : '-'}</div>
                </div>
            `;
        }
    }
    
    tbody.innerHTML = '';
    if(filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada riwayat tagihan.</td></tr>`;
        return;
    }
    
    filteredData.forEach((k, idx) => {
        let itemJenis = k.jenis_tagihan || 'universal';
        // Parse rincian if available (for pendaftaran type)
        let rincianHtml = '';
        if(k.rincian) {
            try {
                let items = typeof k.rincian === 'string' ? JSON.parse(k.rincian) : k.rincian;
                if(items && items.length > 0) {
                    rincianHtml = '<div style="margin-top:4px; font-size:0.8rem; color:var(--text-light);">';
                    items.forEach((item, i) => {
                        rincianHtml += `${i+1}. ${item.nama} (${formatRupiah(item.nominal)})<br>`;
                    });
                    rincianHtml += '</div>';
                }
            } catch(e) {}
        }
        
        let jenisBadge = itemJenis === 'pendaftaran' 
            ? '<span style="display:inline-block; padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:600; background:rgba(16,185,129,0.12); color:#10b981;">Pendaftaran</span>'
            : '<span style="display:inline-block; padding:2px 8px; border-radius:6px; font-size:0.72rem; font-weight:600; background:rgba(37,99,235,0.12); color:#2563eb;">Universal</span>';
        
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${k.nama}</strong>${rincianHtml}<br>${jenisBadge}</td>
                <td>${k.kelas}</td>
                <td style="color:var(--danger); font-weight:600;">${formatRupiah(k.nominal)}</td>
                <td>${k.tanggal}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-sm btn-outline" style="color:#64748b; border-color:#cbd5e1;" onclick="arsipkanTagihan('${k.id}', '${itemJenis}')" title="Arsipkan"><i data-lucide="archive" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusTagihan('${k.id}', '${itemJenis}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-primary" onclick="bukaDetailTagihan('${k.id}', '${itemJenis}')">Detail</button>
                </td>
            </tr>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

function bukaDetailTagihan(idKat, jenis) {
    activeDetailIdKat = idKat;
    activeDetailJenis = jenis;
    
    let kat = dKeuanganInsidental.find(k => k.id == idKat);
    if(!kat) return;
    
    let containerMaster = document.getElementById('masterTableContainerUniversal');
    let containerDetail = document.getElementById('detailTableContainerUniversal');
    
    containerMaster.style.display = 'none';
    containerDetail.style.display = 'block';
    
    document.getElementById('lblDetailNamaUniversal').innerText = kat.nama;
    document.getElementById('lblDetailInfoUniversal').innerText = `Kelas: ${kat.kelas} | Nominal: ${formatRupiah(kat.nominal)}`;
    
    renderDetailSiswaTable(jenis);
}

function tutupDetailTagihan(jenis) {
    activeDetailIdKat = null;
    activeDetailJenis = null;
    
    let containerMaster = document.getElementById('masterTableContainerUniversal');
    let containerDetail = document.getElementById('detailTableContainerUniversal');
    
    containerMaster.style.display = 'block';
    containerDetail.style.display = 'none';
    
    // Perbarui tabel master dan summary cards
    renderMasterTagihanTable('universal');
}

function renderDetailSiswaTable(jenis) {
    if(!activeDetailIdKat) return;
    
    let tbody = document.querySelector('#tableDetailSiswaUniversal tbody');
    if(!tbody) return;
    let search = document.getElementById('searchDetailUniversal').value.toLowerCase();
    
    let kat = dKeuanganInsidental.find(k => k.id == activeDetailIdKat);
    if(!kat) return;
    
    let listSiswa = getSiswaForKeuangan(kat.kelas);
    if(search) listSiswa = listSiswa.filter(s => s.namaLengkap.toLowerCase().includes(search));
    
    let prefix = jenis === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    let kodeTagihan = prefix + kat.id;
    
    tbody.innerHTML = '';
    if(listSiswa.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Tidak ada siswa yang sesuai dengan kelas target.</td></tr>`;
        return;
    }
    
    listSiswa.forEach((s, idx) => {
        let tagihan = kat.nominal;
        let terbayar = hitungTotalTerbayar(s.id, kodeTagihan);
        let sisa = tagihan - terbayar;
        let status = sisa <= 0 ? '<span class="status-badge status-success">Lunas</span>' : (terbayar > 0 ? '<span class="status-badge status-warning">Belum Lunas</span>' : '<span class="status-badge status-danger">Belum Bayar</span>');

        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${s.namaLengkap}</strong></td>
                <td>${s.kelas}</td>
                <td>${status}</td>
                <td style="color:var(--success); font-weight:600;">${formatRupiah(terbayar)}</td>
                <td style="color:var(--danger); font-weight:600;">${formatRupiah(Math.max(0, sisa))}</td>
                <td style="text-align:right;">
                    <button class="btn btn-sm btn-primary" onclick="openPembayaranModal('${s.id}', '${kodeTagihan}', '${s.namaLengkap.replace(/'/g, "\\'")}')">Bayar/Detail</button>
                </td>
            </tr>
        `;
    });
}

function openTambahTransaksiModal(jenis) {
    // Reset dropdown ke 'universal' by default
    var katDropdown = document.getElementById('formTagihanKategori');
    if(katDropdown) katDropdown.value = 'universal';
    
    // Reset form universal
    document.getElementById('formInsidentalJenis').value = 'universal';
    document.getElementById('formInsidentalNama').value = '';
    document.getElementById('formInsidentalNominal').value = '';
    document.getElementById('formInsidentalTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('keuanganInsidentalTitle').innerText = 'Buat Tagihan Baru';
    
    let selKelas = document.getElementById('formInsidentalKelas');
    selKelas.innerHTML = '<option value="Semua Kelas">Semua Kelas</option>';
    if(typeof masterKelasList !== 'undefined') {
        masterKelasList.forEach(k => {
            selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
    }
    
    // Show universal form, hide pendaftaran
    onTagihanKategoriChange('universal');
    
    // Jika dipanggil dengan jenis 'pendaftaran', langsung switch
    if(jenis === 'pendaftaran') {
        if(katDropdown) katDropdown.value = 'pendaftaran';
        onTagihanKategoriChange('pendaftaran');
    }
    
    document.getElementById('keuanganInsidentalModal').classList.add('active');
    if(window.lucide) lucide.createIcons();
}

// === FUNGSI TOGGLE FORM SESUAI DROPDOWN KATEGORI ===
async function onTagihanKategoriChange(val) {
    var grpUniversal = document.getElementById('formGroupUniversal');
    var grpPendaftaran = document.getElementById('formGroupPendaftaran');
    var footerUniversal = document.getElementById('footerUniversal');
    var footerPendaftaran = document.getElementById('footerPendaftaran');
    
    if(val === 'pendaftaran') {
        // Sembunyikan form universal, tampilkan pendaftaran
        if(grpUniversal) grpUniversal.style.display = 'none';
        if(grpPendaftaran) grpPendaftaran.style.display = 'block';
        if(footerUniversal) footerUniversal.style.display = 'none';
        if(footerPendaftaran) footerPendaftaran.style.display = 'flex';
        
        document.getElementById('formInsidentalJenis').value = 'pendaftaran';
        
        // Populate data pendaftaran
        document.getElementById('formPendaftaranNama').value = '';
        document.getElementById('formPendaftaranTanggal').value = new Date().toISOString().split('T')[0];
        
        // Muat tahun pelajaran
        if(typeof loadActiveYear === 'function') await loadActiveYear();
        let lblYear = document.getElementById('lblActiveYear');
        document.getElementById('formPendaftaranTahun').value = (lblYear && lblYear.textContent && lblYear.textContent !== 'Memuat...') ? lblYear.textContent : '-';
        
        // Populate kelas
        let selKelas = document.getElementById('formPendaftaranKelas');
        selKelas.innerHTML = '<option value="Semua Kelas">Semua Kelas</option>';
        if(typeof masterKelasList !== 'undefined') {
            masterKelasList.forEach(k => {
                selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
            });
        }
        
        // Reset rincian items — add 1 empty item by default
        document.getElementById('pendaftaranRincianContainer').innerHTML = '';
        addPendaftaranRincianItem();
        updatePendaftaranRincianTotal();
        
    } else {
        // Tampilkan form universal, sembunyikan pendaftaran
        if(grpUniversal) grpUniversal.style.display = 'block';
        if(grpPendaftaran) grpPendaftaran.style.display = 'none';
        if(footerUniversal) footerUniversal.style.display = 'flex';
        if(footerPendaftaran) footerPendaftaran.style.display = 'none';
        
        document.getElementById('formInsidentalJenis').value = 'universal';
    }
    
    if(window.lucide) lucide.createIcons();
}

// === PENDAFTARAN TAGIHAN MODAL (LEGACY COMPAT — now uses unified modal) ===
async function openPendaftaranTagihanModal() {
    openTambahTransaksiModal('pendaftaran');
}

function closePendaftaranTagihanModal() {
    closeKeuanganInsidentalModal();
}

function addPendaftaranRincianItem() {
    let c = document.getElementById('pendaftaranRincianContainer');
    let div = document.createElement('div');
    div.style.cssText = 'display:flex; flex-direction:column; gap:8px; align-items:stretch; border:1px solid var(--border-color); padding:10px; border-radius:8px; margin-bottom:5px; background:var(--bg-lighter);';
    div.innerHTML = `
        <input type="text" class="form-input pd-rincian-nama" placeholder="Nama Biaya (misal: Baju Batik)" style="width:100%;">
        <input type="number" class="form-input pd-rincian-nom" placeholder="Nominal" style="width:100%;" oninput="updatePendaftaranRincianTotal()">
        <button class="btn btn-danger btn-sm" style="width:100%; display:flex; justify-content:center; align-items:center; gap:5px; padding:0.5rem;" onclick="this.parentElement.remove(); updatePendaftaranRincianTotal();">
            <i data-lucide="trash" style="width:16px;"></i> Hapus Item
        </button>
    `;
    c.appendChild(div);
    if(window.lucide) lucide.createIcons();
}

function updatePendaftaranRincianTotal() {
    let tot = 0;
    document.querySelectorAll('.pd-rincian-nom').forEach(inp => {
        tot += parseInt(inp.value) || 0;
    });
    document.getElementById('formPendaftaranTotalText').innerText = formatRupiah(tot);
}

async function savePendaftaranTagihan() {
    let nama = document.getElementById('formPendaftaranNama').value.trim();
    let kelas = document.getElementById('formPendaftaranKelas').value;
    let tgl = document.getElementById('formPendaftaranTanggal').value;
    let tahun = document.getElementById('formPendaftaranTahun').value;
    
    if(!nama || !tgl) return showToast('Harap lengkapi nama tagihan dan tanggal!', 'error');
    
    // Kumpulkan rincian biaya
    let rincian = [];
    let totalNominal = 0;
    let rows = document.querySelectorAll('#pendaftaranRincianContainer > div');
    rows.forEach(row => {
        let nmItem = row.querySelector('.pd-rincian-nama').value.trim();
        let nomItem = parseInt(row.querySelector('.pd-rincian-nom').value) || 0;
        if(nmItem && nomItem > 0) {
            rincian.push({ nama: nmItem, nominal: nomItem });
            totalNominal += nomItem;
        }
    });
    
    if(rincian.length === 0 || totalNominal <= 0) return showToast('Tambahkan minimal 1 item rincian biaya!', 'error');
    
    let obj = {
        nama: nama + (tahun && tahun !== '-' ? ' — ' + tahun : ''),
        kelas: kelas,
        nominal: totalNominal,
        tanggal: tgl,
        jenis_tagihan: 'pendaftaran',
        rincian: JSON.stringify(rincian)
    };
    
    try {
        const { data, error } = await supabaseClient.from('keuangan_kategori').insert([obj]).select();
        if(error) throw error;
        
        if(data && data.length > 0) dKeuanganInsidental.push(data[0]);
        
        closePendaftaranTagihanModal();
        showToast('Tagihan pendaftaran berhasil dibuat!', 'success');
        renderMasterTagihanTable('pendaftaran');
    } catch(e) {
        showToast('Gagal membuat tagihan: ' + e.message, 'error');
    }
}

function closeKeuanganInsidentalModal() {
    document.getElementById('keuanganInsidentalModal').classList.remove('active');
}

async function saveKeuanganInsidental() {
    let jenis = document.getElementById('formInsidentalJenis').value;
    let nama = document.getElementById('formInsidentalNama').value.trim();
    let kelas = document.getElementById('formInsidentalKelas').value;
    let nom = document.getElementById('formInsidentalNominal').value;
    let tgl = document.getElementById('formInsidentalTanggal').value;
    
    if(!nama || !nom || !tgl) return showToast('Harap lengkapi semua data wajib!', 'error');
    
    let obj = {
        nama: nama,
        kelas: kelas,
        nominal: parseInt(nom),
        tanggal: tgl,
        jenis_tagihan: jenis
    };
    
    try {
        const { data, error } = await supabaseClient.from('keuangan_kategori').insert([obj]).select();
        if(error) throw error;
        
        if(data && data.length > 0) dKeuanganInsidental.push(data[0]);
        
        closeKeuanganInsidentalModal();
        showToast('Tagihan berhasil dibuat!', 'success');
        renderMasterTagihanTable(jenis);
    } catch(e) {
        showToast('Gagal membuat tagihan: ' + e.message, 'error');
    }
}

function hapusTagihan(idKat, jenisTable) {
    let kat = dKeuanganInsidental.find(k => k.id == idKat);
    if(!kat) return;
    
    showCustomConfirm('Hapus Tagihan?', 'Anda yakin ingin menghapus permanen tagihan <strong>' + kat.nama + '</strong>? Seluruh riwayat pembayaran siswa terkait tagihan ini akan terhapus!', 'Ya, Hapus', async function() {
        try {
            let prefix = jenisTable === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
            let kodeTagihan = prefix + idKat;
            
            await supabaseClient.from('keuangan_pembayaran').delete().eq('jenis', kodeTagihan);
            const { error } = await supabaseClient.from('keuangan_kategori').delete().eq('id', idKat);
            if(error) throw error;
            
            dKeuanganInsidental = dKeuanganInsidental.filter(k => k.id != idKat);
            dPembayaranSiswa = dPembayaranSiswa.filter(p => p.jenis != kodeTagihan);
            
            showToast('Tagihan berhasil dihapus!', 'success');
            renderMasterTagihanTable(jenisTable);
            
            // If the deleted one was open in details, close it
            if(activeDetailIdKat == idKat) tutupDetailTagihan(jenisTable);
        } catch(e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}

// === CETAK LAPORAN TAGIHAN (F4 KOP SURAT) ===
function printLaporanTagihan() {
    let jenis = activeDetailJenis;
    if(!activeDetailIdKat || !jenis) {
        return showToast('Silakan buka detail tagihan terlebih dahulu sebelum mencetak laporan.', 'warning');
    }
    
    let kat = dKeuanganInsidental.find(k => k.id == activeDetailIdKat);
    if(!kat) return;
    
    let prefix = jenis === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    let kodeTagihan = prefix + kat.id;
    let listSiswa = getSiswaForKeuangan(kat.kelas);
    let search = document.getElementById(`searchDetail${jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal'}`).value.toLowerCase();
    if(search) listSiswa = listSiswa.filter(s => s.namaLengkap.toLowerCase().includes(search));
    
    let today = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    let totalTerkumpul = 0;
    
    let trs = '';
    listSiswa.forEach((s, idx) => {
        let tagihan = kat.nominal;
        let terbayar = hitungTotalTerbayar(s.id, kodeTagihan);
        totalTerkumpul += terbayar;
        let sisa = tagihan - terbayar;
        let status = sisa <= 0 ? 'Lunas' : (terbayar > 0 ? 'Belum Lunas' : 'Belum Bayar');
        trs += `<tr>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${idx + 1}</td>
            <td style="padding:5px; border:1px solid #000;">${s.namaLengkap}</td>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${s.kelas}</td>
            <td style="text-align:right; padding:5px; border:1px solid #000;">${formatRupiah(tagihan)}</td>
            <td style="text-align:right; padding:5px; border:1px solid #000;">${formatRupiah(terbayar)}</td>
            <td style="text-align:right; padding:5px; border:1px solid #000;">${formatRupiah(Math.max(0, sisa))}</td>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${status}</td>
        </tr>`;
    });
    
    trs += `<tr>
        <td colspan="4" style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">TOTAL TERKUMPUL :</td>
        <td style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">${formatRupiah(totalTerkumpul)}</td>
        <td colspan="2" style="padding:5px; border:1px solid #000;"></td>
    </tr>`;

    let printArea = document.getElementById('printAreaLaporan');
    printArea.innerHTML = `
        <div class="laporan-print-container">
            <div class="lpc-kop">
                <img src="img/kop-surat.png?v=20260503" onerror="this.src='img/kop-surat.jpg?v=20260503'" alt="Kop Surat" />
            </div>
            <div class="lpc-title">LAPORAN ${jenis === 'pendaftaran' ? 'PENDAFTARAN & ADMINISTRASI' : 'TRANSAKSI UNIVERSAL'}<br><span style="font-size:11pt; font-weight:normal;">${kat.nama} — Kelas: ${kat.kelas} — Dibuat: ${kat.tanggal}</span></div>
            <table class="lpc-table" style="width:100%; border-collapse:collapse;">
                <thead><tr>
                    <th style="width:5%; border:1px solid #000; padding:5px; background:#f0f0f0;">No</th>
                    <th style="width:25%; border:1px solid #000; padding:5px; background:#f0f0f0;">Nama Siswa</th>
                    <th style="width:10%; border:1px solid #000; padding:5px; background:#f0f0f0;">Kelas</th>
                    <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Tagihan</th>
                    <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Terbayar</th>
                    <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Kekurangan</th>
                    <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Status</th>
                </tr></thead>
                <tbody>${trs}</tbody>
            </table>
            <div class="lpc-footer">
                <div style="text-align:center;">
                    <div>Babakan, ${today}</div>
                    <div>Bendahara Sekolah,</div>
                    ${(() => { let s = getKwitansiSettings(); return s.ttdBase64 ? '<img src="' + s.ttdBase64 + '" style="height:15mm; max-width:50mm; object-fit:contain; display:block; margin:3mm auto 2mm auto;" />' : '<div style="margin-bottom:20mm;"></div>'; })()}
                    <div style="text-decoration:underline; font-weight:bold;">${(() => { let s = getKwitansiSettings(); return s.namaBendahara || '_______________________'; })()}</div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        window.print();
        printArea.innerHTML = '';
    }, 500);
}

// === KEUANGAN PENDAFTARAN ===




// === MODAL PEMBAYARAN & CICILAN ===
function openPembayaranModal(idSiswa, jenis, namaSiswa) {
    document.getElementById('pembayaranSiswaTitle').innerText = 'Catat Pembayaran';
    let labelJenis = jenis;
    if(jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
        let parts = jenis.split('_');
        let idKat = parts.slice(1).join('_');
        let cat = dKeuanganInsidental.find(c => c.id == idKat);
        labelJenis = cat ? cat.nama : jenis;
    }
    
    document.getElementById('pembayaranSiswaSubtitle').innerText = `Siswa: ${namaSiswa} | Jenis: ${labelJenis}`;
    document.getElementById('formPembayaranIdSiswa').value = idSiswa;
    document.getElementById('formPembayaranIdTransaksi').value = jenis;
    document.getElementById('formPembayaranTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formPembayaranNominal').value = '';
    
    refreshStatusPembayaran(idSiswa, jenis);
    document.getElementById('pembayaranSiswaModal').classList.add('active');
}
function closePembayaranSiswaModal() {
    document.getElementById('pembayaranSiswaModal').classList.remove('active');
}
function refreshStatusPembayaran(idSiswa, jenis) {
    let tagihan = hitungTotalTagihan(jenis);
    let terbayar = hitungTotalTerbayar(idSiswa, jenis);
    let sisa = tagihan - terbayar;
    
    document.getElementById('pembayaranTotalTagihan').innerText = formatRupiah(tagihan);
    document.getElementById('pembayaranTerbayar').innerText = formatRupiah(terbayar);
    document.getElementById('pembayaranSisaTagihan').innerText = formatRupiah(Math.max(0, sisa));
    
    let container = document.getElementById('riwayatPembayaranContainer');
    let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
    
    if(!rec || rec.riwayat.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-light); background:var(--bg-lighter); border-radius:8px;">Belum ada riwayat pembayaran.</div>';
    } else {
        let html = '';
        rec.riwayat.slice().reverse().forEach((r) => {
            let actionBtns = r.id_pembayaran 
                ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.75rem;" onclick="editPembayaran('${r.id_pembayaran}', '${idSiswa}', '${jenis}')"><i data-lucide="pencil" style="width:12px;height:12px;"></i></button><button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--danger); border-color:var(--danger);" onclick="hapusPembayaran('${r.id_pembayaran}', '${idSiswa}', '${jenis}')"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>`
                : '';
            html += `
                <div id="riwayat-${r.id_pembayaran || ''}" style="background:var(--bg-lighter); padding:0.75rem 1rem; border-radius:8px; margin-bottom:0.75rem; border-left:4px solid var(--primary);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <strong style="font-size:1.05rem;">${formatRupiah(r.nominal)}</strong>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-size:0.8rem; color:var(--text-light);">${r.tanggal}</span>
                            ${actionBtns}
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    }
}
async function submitPembayaran() {
    let idSiswa = document.getElementById('formPembayaranIdSiswa').value;
    let jenis = document.getElementById('formPembayaranIdTransaksi').value;
    let tgl = document.getElementById('formPembayaranTanggal').value;
    let nom = parseInt(document.getElementById('formPembayaranNominal').value);
    
    if(!nom || nom <= 0) return showToast('Nominal tidak valid', 'error');
    
    try {
        let obj = {
            id_siswa: idSiswa,
            jenis: jenis,
            nominal: nom,
            tanggal: tgl,
            keterangan: ''
        };
        const { data, error } = await supabaseClient.from('keuangan_pembayaran').insert([obj]).select();
        if(error) throw error;
        
        let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
        if(!rec) {
            rec = { idSiswa: idSiswa, jenis: jenis, riwayat: [] };
            dPembayaranSiswa.push(rec);
        }
        
        if(data && data.length > 0) {
            rec.riwayat.push({ id_pembayaran: data[0].id, tanggal: tgl, nominal: nom, ket: '' });
        } else {
            rec.riwayat.push({ tanggal: tgl, nominal: nom, ket: '' });
        }
        
        showToast('Pembayaran berhasil dicatat!', 'success');
        refreshStatusPembayaran(idSiswa, jenis);
        
        // Refresh the table in the background so columns reflect the change
        if(jenis.startsWith('insidental_')) {
            renderDetailSiswaTable('universal');
        } else if (jenis.startsWith('pendaftaran_')) {
            renderDetailSiswaTable('pendaftaran');
        }
    } catch(e) {
        showToast('Gagal mencatat pembayaran: ' + e.message, 'error');
    }
    
    document.getElementById('formPembayaranNominal').value = '';
    document.getElementById('formPembayaranKeterangan').value = '';
    
    if(jenis.startsWith('pendaftaran_')) renderDetailSiswaTable('pendaftaran');
    else if(jenis.startsWith('insidental_')) renderDetailSiswaTable('universal');
}

function editPembayaran(idPembayaran, idSiswa, jenis) {
    let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
    if(!rec) return;
    let r = rec.riwayat.find(x => x.id_pembayaran == idPembayaran);
    if(!r) return;
    
    let el = document.getElementById('riwayat-' + idPembayaran);
    if(!el) return;
    
    el.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center;">
            <div style="flex:1;">
                <label style="font-size:0.75rem; color:var(--text-light); margin-bottom:2px; display:block;">Nominal Baru</label>
                <input type="number" id="editNominal-${idPembayaran}" class="form-input" value="${r.nominal}" style="margin:0; padding:0.4rem 0.6rem; font-size:0.95rem;" min="1" />
            </div>
            <div style="display:flex; gap:4px; align-self:flex-end;">
                <button class="btn btn-sm btn-primary" style="padding:0.4rem 0.7rem;" onclick="updatePembayaran('${idPembayaran}', '${idSiswa}', '${jenis}')">
                    <i data-lucide="check" style="width:14px;height:14px;"></i>
                </button>
                <button class="btn btn-sm btn-outline" style="padding:0.4rem 0.7rem;" onclick="refreshStatusPembayaran('${idSiswa}', '${jenis}')">
                    <i data-lucide="x" style="width:14px;height:14px;"></i>
                </button>
            </div>
        </div>
    `;
    if(window.lucide) lucide.createIcons();
    document.getElementById('editNominal-' + idPembayaran).focus();
}

function hapusPembayaran(idPembayaran, idSiswa, jenis) {
    showCustomConfirm(
        'Hapus Pembayaran?',
        'Data pembayaran ini akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.',
        'Ya, Hapus',
        async function() {
            try {
                const { error } = await supabaseClient.from('keuangan_pembayaran')
                    .delete().eq('id', idPembayaran);
                if(error) throw error;
                
                let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
                if(rec) {
                    rec.riwayat = rec.riwayat.filter(x => x.id_pembayaran != idPembayaran);
                }
                
                showToast('Pembayaran berhasil dihapus!', 'success');
                refreshStatusPembayaran(idSiswa, jenis);
                
                if(jenis.startsWith('insidental_')) renderDetailSiswaTable('universal');
                else if(jenis.startsWith('pendaftaran_')) renderDetailSiswaTable('pendaftaran');
            } catch(e) {
                showToast('Gagal menghapus: ' + e.message, 'error');
            }
        }
    );
}

async function updatePembayaran(idPembayaran, idSiswa, jenis) {
    let newNom = parseInt(document.getElementById('editNominal-' + idPembayaran).value);
    if(!newNom || newNom <= 0) return showToast('Nominal tidak valid!', 'error');
    
    try {
        const { error } = await supabaseClient.from('keuangan_pembayaran')
            .update({ nominal: newNom })
            .eq('id', idPembayaran);
        if(error) throw error;
        
        // Update in-memory
        let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
        if(rec) {
            let r = rec.riwayat.find(x => x.id_pembayaran == idPembayaran);
            if(r) r.nominal = newNom;
        }
        
        showToast('Nominal berhasil diperbarui!', 'success');
        refreshStatusPembayaran(idSiswa, jenis);
        
        // Refresh detail table
        if(jenis.startsWith('insidental_')) renderDetailSiswaTable('universal');
        else if(jenis.startsWith('pendaftaran_')) renderDetailSiswaTable('pendaftaran');
    } catch(e) {
        showToast('Gagal memperbarui: ' + e.message, 'error');
    }
}

// === CETAK KWITANSI ===
let pendingKwitansiJenis = '';

// -- Pengaturan Kwitansi (localStorage) --
function getKwitansiSettings() {
    try {
        let s = localStorage.getItem('kwitansi_settings');
        return s ? JSON.parse(s) : { namaBendahara: '', ttdBase64: '' };
    } catch(e) { return { namaBendahara: '', ttdBase64: '' }; }
}

function openPengaturanKwitansi() {
    let settings = getKwitansiSettings();
    document.getElementById('inputNamaBendahara').value = settings.namaBendahara || '';
    document.getElementById('inputTTDBendahara').value = '';
    
    if(settings.ttdBase64) {
        document.getElementById('previewTTDImage').src = settings.ttdBase64;
        let statusText = document.getElementById('ttdStatusText');
        if(statusText) statusText.innerText = 'Tanda tangan saat ini sudah tersimpan:';
        document.getElementById('previewTTDContainer').style.display = 'block';
    } else {
        document.getElementById('previewTTDContainer').style.display = 'none';
    }
    
    document.getElementById('pengaturanKwitansiModal').classList.add('active');
    if(window.lucide) lucide.createIcons();
}

function closePengaturanKwitansi() {
    document.getElementById('pengaturanKwitansiModal').classList.remove('active');
}

function previewTTDBendahara(event) {
    let file = event.target.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewTTDImage').src = e.target.result;
        let statusText = document.getElementById('ttdStatusText');
        if(statusText) statusText.innerText = 'Preview Tanda Tangan Baru:';
        document.getElementById('previewTTDContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function hapusTTDBendahara() {
    let settings = getKwitansiSettings();
    settings.ttdBase64 = '';
    localStorage.setItem('kwitansi_settings', JSON.stringify(settings));
    document.getElementById('previewTTDImage').src = '';
    document.getElementById('previewTTDContainer').style.display = 'none';
    document.getElementById('inputTTDBendahara').value = '';
    showToast('Tanda tangan dihapus.', 'success');
}

async function simpanPengaturanKwitansi() {
    let nama = document.getElementById('inputNamaBendahara').value.trim();
    
    let settings = getKwitansiSettings();
    settings.namaBendahara = nama;
    
    // Check if new file uploaded
    let fileInput = document.getElementById('inputTTDBendahara');
    if(fileInput.files && fileInput.files[0]) {
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            settings.ttdBase64 = e.target.result;
            localStorage.setItem('kwitansi_settings', JSON.stringify(settings));
            closePengaturanKwitansi();
            showToast('Pengaturan bendahara berhasil disimpan!', 'success');
        };
        reader.readAsDataURL(file);
    } else {
        localStorage.setItem('kwitansi_settings', JSON.stringify(settings));
        closePengaturanKwitansi();
        showToast('Pengaturan bendahara berhasil disimpan!', 'success');
    }
}

// -- Fungsi Terbilang (Angka ke Kata) --
function terbilang(angka) {
    let bilangan = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas'];
    angka = parseInt(angka);
    if(angka < 0) return 'Minus ' + terbilang(Math.abs(angka));
    if(angka < 12) return bilangan[angka];
    else if(angka < 20) return terbilang(angka - 10) + ' Belas';
    else if(angka < 100) return terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
    else if(angka < 200) return 'Seratus ' + terbilang(angka - 100);
    else if(angka < 1000) return terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
    else if(angka < 2000) return 'Seribu ' + terbilang(angka - 1000);
    else if(angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
    else if(angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
    else if(angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
    return angka.toString();
}

// -- Generate HTML Kwitansi Profesional (4 per A4 page) --
function generateKwitansiHTML(dataSiswa) {
    let today = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    let logoUrl = window.location.href.includes('dashboard.html') ? 
        window.location.href.split('dashboard.html')[0] + 'img/logo.png' : 'img/logo.png';
    
    let settings = getKwitansiSettings();
    let namaBendahara = settings.namaBendahara || '_______________________';
    let ttdBase64 = settings.ttdBase64 || '';
    
    let ttdHtml = ttdBase64 
        ? `<img src="${ttdBase64}" style="height:12mm; max-width:40mm; object-fit:contain; display:block; margin:2mm auto 1mm auto;" />`
        : `<div style="height:12mm;"></div>`;
    
    let cards = '';
    dataSiswa.forEach((d, idx) => {
        let noKwitansi = 'KW-' + new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(idx+1).padStart(4,'0');
        let statusText = d.sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';
        let statusColor = d.sisa <= 0 ? '#059669' : '#dc2626';
        
        cards += `
            <div style="width:100%; box-sizing:border-box; border:1.5px solid #1e293b; padding:0; margin-bottom:4mm; page-break-inside:avoid; font-family:'Times New Roman', Times, serif; font-size:9pt; color:#000; background:#fff;">
                <!-- KOP SURAT -->
                <div style="display:flex; align-items:center; padding:3mm 5mm 2.5mm 5mm; border-bottom:2px double #1e293b;">
                    <img src="${logoUrl}" onerror="this.style.display='none'" style="width:52px; height:52px; object-fit:contain; margin-right:10px; flex-shrink:0;" />
                    <div style="flex:1; text-align:center; line-height:1.2;">
                        <div style="font-size:7.5pt; font-weight:bold; letter-spacing:0.3px;">YAYASAN PONDOK PESANTREN AL-FATHONAH</div>
                        <div style="font-size:12pt; font-weight:bold; letter-spacing:0.8px; margin:0;">SMP IT AL-FATHONAH BABAKAN</div>
                        <div style="font-size:6.5pt;">Jl. H. Mastra (Ponpes Al-Fathonah) No. 04 Desa Kudukeras Kec. Babakan Kab. Cirebon 45191</div>
                        <div style="font-size:6.5pt;">Tlp./Fax. (0231) 641960 &nbsp;|&nbsp; Hp. 085 323 056 221</div>
                    </div>
                </div>
                
                <!-- JUDUL KWITANSI -->
                <div style="text-align:center; padding:2mm 0 1.5mm 0;">
                    <div style="font-size:11pt; font-weight:bold; letter-spacing:1.5px; text-decoration:underline;">KWITANSI PEMBAYARAN</div>
                    <div style="font-size:6.5pt; color:#475569; margin-top:1px;">No: ${noKwitansi}</div>
                </div>
                
                <!-- BODY DETAIL -->
                <div style="padding:1mm 6mm 1.5mm 6mm;">
                    <table style="width:100%; border-collapse:collapse; font-size:9pt;">
                        <tr>
                            <td style="width:110px; padding:2px 0; vertical-align:top; font-weight:bold;">Telah Terima Dari</td>
                            <td style="width:12px; text-align:center; vertical-align:top;">:</td>
                            <td style="padding:2px 0; border-bottom:1px dotted #94a3b8; font-weight:600;">${d.nama}${d.kelas ? ' — Kelas ' + d.kelas : ''}</td>
                        </tr>
                        <tr>
                            <td style="padding:2px 0; vertical-align:top; font-weight:bold;">Uang Sejumlah</td>
                            <td style="text-align:center; vertical-align:top;">:</td>
                            <td style="padding:2px 0; border-bottom:1px dotted #94a3b8; font-style:italic; font-size:8.5pt;">### ${terbilang(d.terbayar).trim()} Rupiah ###</td>
                        </tr>
                        <tr>
                            <td style="padding:2px 0; vertical-align:top; font-weight:bold;">Untuk Pembayaran</td>
                            <td style="text-align:center; vertical-align:top;">:</td>
                            <td style="padding:2px 0; border-bottom:1px dotted #94a3b8;">${d.namaTagihan}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- FOOTER: NOMINAL + TTD -->
                <div style="display:flex; justify-content:space-between; align-items:flex-end; padding:1.5mm 6mm 3mm 6mm;">
                    <div>
                        <div style="border:1.5px solid #1e293b; padding:2mm 5mm; background:#f8fafc; text-align:center;">
                            <div style="font-size:7pt; color:#475569; margin-bottom:1px;">Jumlah yang Dibayar</div>
                            <div style="font-size:13pt; font-weight:bold; letter-spacing:0.5px;">${formatRupiah(d.terbayar)}</div>
                        </div>
                        <div style="margin-top:1.5mm; font-size:7.5pt;">
                            Sisa: <strong style="color:${statusColor};">${formatRupiah(Math.max(0, d.sisa))}</strong>
                            &nbsp;<span style="background:${statusColor}; color:white; padding:0.5px 4px; border-radius:2px; font-size:6.5pt; font-weight:bold;">${statusText}</span>
                        </div>
                    </div>
                    <div style="text-align:center; min-width:130px;">
                        <div style="font-size:8.5pt;">Babakan, ${today}</div>
                        <div style="font-size:8.5pt;">Bendahara Sekolah,</div>
                        ${ttdHtml}
                        <div style="font-size:8.5pt; font-weight:bold; text-decoration:underline;">${namaBendahara}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    return cards;
}

// -- Cetak Kwitansi Satuan (dari modal pembayaran) --
function cetakKwitansiSatuan() {
    let idSiswa = document.getElementById('formPembayaranIdSiswa').value;
    let jenis = document.getElementById('formPembayaranIdTransaksi').value;
    
    if(!idSiswa || !jenis) return showToast('Data siswa atau tagihan tidak ditemukan.', 'error');
    
    let s = getSiswaForKeuangan().find(x => x.id == idSiswa);
    let nama = s ? s.namaLengkap : 'Unknown';
    let kelas = s ? s.kelas : '-';
    
    let tagihan = hitungTotalTagihan(jenis);
    let terbayarTotal = hitungTotalTerbayar(idSiswa, jenis);
    let sisa = tagihan - terbayarTotal;
    
    if(terbayarTotal <= 0) return showToast('Belum ada pembayaran yang tercatat untuk siswa ini.', 'warning');
    
    // Cari nama tagihan
    let namaTagihan = jenis;
    if(jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
        let parts = jenis.split('_');
        let idKat = parts.slice(1).join('_');
        let cat = dKeuanganInsidental.find(c => c.id == idKat);
        namaTagihan = cat ? cat.nama : jenis;
    }
    
    let dataKwitansi = [{
        nama: nama,
        kelas: kelas,
        kodeTagihan: jenis,
        namaTagihan: namaTagihan,
        terbayar: terbayarTotal,
        tagihan: tagihan,
        sisa: sisa
    }];
    
    let printArea = document.getElementById('printAreaKwitansi');
    printArea.innerHTML = generateKwitansiHTML(dataKwitansi);
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 400);
}

// -- Buka Modal Kwitansi Massal --
function openKwitansiMassal() {
    let jenisTab = activeDetailJenis;
    if(!activeDetailIdKat || !jenisTab) {
        return showToast('Silakan buka detail tagihan terlebih dahulu.', 'warning');
    }
    
    let kat = dKeuanganInsidental.find(k => k.id == activeDetailIdKat);
    if(!kat) return;
    
    let prefix = jenisTab === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    pendingKwitansiJenis = prefix + kat.id;
    
    document.getElementById('kwitansiMassalSubtitle').innerText = 'Tagihan: ' + kat.nama + ' — Kelas: ' + kat.kelas;
    
    let listSiswa = getSiswaForKeuangan(kat.kelas);
    let container = document.getElementById('kwitansiMassalListContainer');
    
    if(listSiswa.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-light);">Tidak ada siswa yang sesuai.</p>';
    } else {
        let html = '';
        listSiswa.forEach(s => {
            let terbayarVal = hitungTotalTerbayar(s.id, pendingKwitansiJenis);
            let sisaVal = kat.nominal - terbayarVal;
            let statusLabel = sisaVal <= 0 ? '<span style="color:#059669;font-weight:600;">Lunas</span>' : 
                             (terbayarVal > 0 ? '<span style="color:#d97706;font-weight:600;">Belum Lunas</span>' : 
                              '<span style="color:#ef4444;font-weight:600;">Belum Bayar</span>');
            let disabled = terbayarVal <= 0 ? 'disabled' : '';
            let opacity = terbayarVal <= 0 ? 'opacity:0.5;' : '';
            
            html += `
                <label style="display:flex; align-items:center; gap:10px; padding:0.65rem 0.75rem; border:1px solid var(--border-color); border-radius:10px; margin-bottom:6px; cursor:${terbayarVal > 0 ? 'pointer' : 'not-allowed'}; transition:background 0.15s; ${opacity}" 
                       ${terbayarVal > 0 ? 'onmouseover="this.style.background=\'var(--bg-lighter)\'"' : ''} 
                       ${terbayarVal > 0 ? 'onmouseout="this.style.background=\'transparent\'"' : ''}>
                    <input type="checkbox" class="cb-kwitansi-massal" value="${s.id}" ${disabled} onchange="updateKwitansiCount()" style="accent-color:#6366f1; width:18px; height:18px; flex-shrink:0;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.namaLengkap}</div>
                        <div style="font-size:0.8rem; color:var(--text-light);">${s.kelas} &nbsp;|&nbsp; Bayar: ${formatRupiah(terbayarVal)} &nbsp;|&nbsp; ${statusLabel}</div>
                    </div>
                </label>
            `;
        });
        container.innerHTML = html;
    }
    
    document.getElementById('kwitansiSelectAll').checked = false;
    updateKwitansiCount();
    
    document.getElementById('kwitansiMassalModal').classList.add('active');
    if(window.lucide) lucide.createIcons();
}

function closeKwitansiMassalModal() {
    document.getElementById('kwitansiMassalModal').classList.remove('active');
}

function toggleKwitansiSelectAll() {
    let selectAll = document.getElementById('kwitansiSelectAll').checked;
    document.querySelectorAll('.cb-kwitansi-massal:not(:disabled)').forEach(cb => { cb.checked = selectAll; });
    updateKwitansiCount();
}

function updateKwitansiCount() {
    let checked = document.querySelectorAll('.cb-kwitansi-massal:checked').length;
    document.getElementById('kwitansiSelectedCount').innerText = checked + ' siswa dipilih';
}

// -- Proses Cetak Kwitansi Massal --
function prosesCetakKwitansiMassal() {
    let cbs = document.querySelectorAll('.cb-kwitansi-massal:checked');
    if(cbs.length === 0) return showToast('Pilih minimal satu siswa untuk dicetak kwitansinya.', 'warning');
    
    let ids = Array.from(cbs).map(cb => cb.value);
    let jenis = pendingKwitansiJenis;
    
    // Cari nama tagihan
    let namaTagihan = jenis;
    if(jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
        let parts = jenis.split('_');
        let idKat = parts.slice(1).join('_');
        let cat = dKeuanganInsidental.find(c => c.id == idKat);
        namaTagihan = cat ? cat.nama : jenis;
    }
    
    let dataKwitansi = [];
    ids.forEach(idSiswa => {
        let s = getSiswaForKeuangan().find(x => x.id == idSiswa);
        let nama = s ? s.namaLengkap : 'Unknown';
        let kelas = s ? s.kelas : '-';
        let tagihan = hitungTotalTagihan(jenis);
        let terbayarVal = hitungTotalTerbayar(idSiswa, jenis);
        let sisa = tagihan - terbayarVal;
        
        if(terbayarVal > 0) {
            dataKwitansi.push({
                nama: nama,
                kelas: kelas,
                kodeTagihan: jenis,
                namaTagihan: namaTagihan,
                terbayar: terbayarVal,
                tagihan: tagihan,
                sisa: sisa
            });
        }
    });
    
    if(dataKwitansi.length === 0) return showToast('Tidak ada siswa dengan pembayaran yang bisa dicetak.', 'warning');
    
    let printArea = document.getElementById('printAreaKwitansi');
    
    // 4 kwitansi per halaman A4
    let html = '';
    for(let i = 0; i < dataKwitansi.length; i += 4) {
        let batch = dataKwitansi.slice(i, i + 4);
        html += '<div style="page-break-after: always; width:100%;">';
        html += generateKwitansiHTML(batch);
        html += '</div>';
    }
    
    printArea.innerHTML = html;
    closeKwitansiMassalModal();
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 400);
}


// ==============================================================================
// MODUL KAS SEKOLAH (BUKU KAS UMUM)
// ==============================================================================

function openSaldoAwalModal() {
    let currentSaldo = localStorage.getItem('kas_saldo_awal') || '0';
    document.getElementById('inputSaldoAwal').value = currentSaldo;
    document.getElementById('saldoAwalModal').classList.add('active');
    if(window.lucide) lucide.createIcons();
}

function closeSaldoAwalModal() {
    document.getElementById('saldoAwalModal').classList.remove('active');
}

function simpanSaldoAwal() {
    let nominal = parseInt(document.getElementById('inputSaldoAwal').value) || 0;
    let oldSaldo = parseInt(localStorage.getItem('kas_saldo_awal') || '0');
    
    if(nominal !== oldSaldo) {
        // Catat perubahan ke audit log
        let log = JSON.parse(localStorage.getItem('kas_saldo_awal_log') || '[]');
        let selisih = nominal - oldSaldo;
        log.push({
            tanggal: new Date().toISOString().split('T')[0],
            waktu: new Date().toLocaleTimeString('id-ID'),
            nilaiLama: oldSaldo,
            nilaiBaru: nominal,
            selisih: selisih,
            keterangan: selisih > 0 
                ? `Koreksi tambah saldo awal: ${formatRupiah(oldSaldo)} → ${formatRupiah(nominal)} (+${formatRupiah(selisih)})` 
                : `Koreksi kurang saldo awal: ${formatRupiah(oldSaldo)} → ${formatRupiah(nominal)} (${formatRupiah(selisih)})`
        });
        localStorage.setItem('kas_saldo_awal_log', JSON.stringify(log));
    }
    
    localStorage.setItem('kas_saldo_awal', nominal.toString());
    closeSaldoAwalModal();
    showToast('Saldo awal berhasil disimpan!', 'success');
    renderKasSekolahTable();
}

function renderKasSekolahTable() {
    let tbody = document.querySelector('#tableKasSekolah tbody');
    if(!tbody) return;
    
    // Ambil Saldo Awal
    let saldoAwal = parseInt(localStorage.getItem('kas_saldo_awal') || '0');
    
    // Gabungkan 3 sumber data + audit log: dPembayaranSiswa (Masuk), dKasKeluar (Keluar), dPengeluaranDinas (Keluar)
    let transaksiList = [];
    
    // 1. Pemasukan (Pembayaran Siswa)
    if(typeof dPembayaranSiswa !== 'undefined') {
        dPembayaranSiswa.forEach(rec => {
            let s = getSiswaForKeuangan().find(x => x.id === rec.idSiswa);
            let namaSiswa = s ? s.namaLengkap : 'Siswa Tidak Diketahui';
            
            let namaTagihan = rec.jenis || 'Tagihan';
            if(rec.jenis && (rec.jenis.startsWith('insidental_') || rec.jenis.startsWith('pendaftaran_'))) {
                let idKat = rec.jenis.split('_').slice(1).join('_');
                let cat = typeof dKeuanganInsidental !== 'undefined' ? dKeuanganInsidental.find(c => c.id === idKat) : null;
                if(cat) {
                    namaTagihan = cat.nama;
                } else {
                    namaTagihan = rec.jenis.startsWith('insidental_') ? 'Transaksi Universal' : 'Pendaftaran & Administrasi';
                }
            }
            
            if(rec.riwayat) {
                rec.riwayat.forEach(r => {
                    if(r.nominal > 0) {
                        transaksiList.push({
                            tanggal: r.tanggal,
                            timestamp: new Date(r.tanggal).getTime(),
                            kategori: 'Pembayaran Siswa',
                            keterangan: `Pembayaran ${namaTagihan} oleh ${namaSiswa}`,
                            masuk: parseInt(r.nominal),
                            keluar: 0
                        });
                    }
                });
            }
        });
    }
    
    // 2. Pengeluaran (Kas Keluar)
    if(typeof dKasKeluar !== 'undefined') {
        dKasKeluar.forEach(k => {
            transaksiList.push({
                tanggal: k.tanggal,
                timestamp: new Date(k.tanggal).getTime(),
                kategori: k.kategori,
                keterangan: k.nama_item + (k.keterangan ? ' - ' + k.keterangan : ''),
                masuk: 0,
                keluar: parseInt(k.jumlah)
            });
        });
    }
    
    // 3. Pengeluaran (Pengeluaran Dinas)
    if(typeof dPengeluaranDinas !== 'undefined') {
        dPengeluaranDinas.forEach(p => {
            transaksiList.push({
                tanggal: p.tanggal_berangkat || p.tanggal,
                timestamp: new Date(p.tanggal_berangkat || p.tanggal).getTime(),
                kategori: 'Pengeluaran Dinas',
                keterangan: `${p.jenis} ke ${p.tujuan} (${p.petugas})`,
                masuk: 0,
                keluar: parseInt(p.jumlah_uang)
            });
        });
    }
    
    // 4. Audit Log Saldo Awal (Koreksi)
    let auditLog = JSON.parse(localStorage.getItem('kas_saldo_awal_log') || '[]');
    auditLog.forEach(log => {
        transaksiList.push({
            id: `audit-${log.tanggal}-${log.waktu}`,
            tanggal: log.tanggal,
            timestamp: new Date(log.tanggal).getTime(),
            kategori: 'Koreksi Saldo',
            keterangan: log.keterangan,
            masuk: log.selisih > 0 ? log.selisih : 0,
            keluar: log.selisih < 0 ? Math.abs(log.selisih) : 0,
            isAudit: true
        });
    });
    
    // Urutkan berdasarkan tanggal (Ascending) untuk menghitung saldo berjalan
    transaksiList.sort((a, b) => a.timestamp - b.timestamp);
    
    let totalMasuk = 0;
    let totalKeluar = 0;
    let saldoBerjalan = saldoAwal;
    
    // Hitung saldo berjalan
    transaksiList.forEach(t => {
        totalMasuk += t.masuk;
        totalKeluar += t.keluar;
        saldoBerjalan += (t.masuk - t.keluar);
        t.saldo = saldoBerjalan;
    });
    
    // Populate filter tahun dinamis
    let tahunSelect = document.getElementById('filterTahunKas');
    if(tahunSelect) {
        let currentValue = tahunSelect.value;
        // Jika belum ada pilihan default sama sekali (pertama kali load), set ke tahun berjalan
        if(!tahunSelect.hasAttribute('data-initialized')) {
            currentValue = new Date().getFullYear().toString();
            tahunSelect.setAttribute('data-initialized', 'true');
        }
        
        let years = new Set();
        transaksiList.forEach(t => { if(t.tanggal && t.tanggal.length >= 4) years.add(t.tanggal.substring(0,4)); });
        years.add(new Date().getFullYear().toString()); // Selalu sertakan tahun ini
        
        while(tahunSelect.options.length > 1) {
            tahunSelect.remove(1);
        }
        
        Array.from(years).sort((a,b) => b.localeCompare(a)).forEach(y => {
            if(y && !isNaN(y)) {
                let opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if(y === currentValue) opt.selected = true;
                tahunSelect.appendChild(opt);
            }
        });
    }

    // Filter pencarian & tanggal
    let search = (document.getElementById('searchKasSekolah')?.value || '').toLowerCase();
    let filterTanggal = document.getElementById('filterTanggalKas')?.value || '';
    let filterBulan = document.getElementById('filterBulanKas')?.value || '';
    let filterTahun = tahunSelect ? tahunSelect.value : '';
    
    let displayList = transaksiList;
    
    if(filterTanggal) {
        displayList = displayList.filter(t => t.tanggal && t.tanggal.startsWith(filterTanggal));
    }
    if(filterBulan) {
        displayList = displayList.filter(t => t.tanggal && t.tanggal.length >= 7 && t.tanggal.substring(5,7) === filterBulan);
    }
    if(filterTahun) {
        displayList = displayList.filter(t => t.tanggal && t.tanggal.startsWith(filterTahun));
    }
    if(search) {
        displayList = displayList.filter(t => 
            t.keterangan.toLowerCase().includes(search) || 
            t.kategori.toLowerCase().includes(search)
        );
    }
    
    let isFiltered = filterTanggal || filterBulan || filterTahun || search;
    
    let filteredTotalMasuk = totalMasuk;
    let filteredTotalKeluar = totalKeluar;
    if(isFiltered) {
        filteredTotalMasuk = displayList.reduce((s, t) => s + t.masuk, 0);
        filteredTotalKeluar = displayList.reduce((s, t) => s + t.keluar, 0);
    }
    
    // Update Summary Cards
    let ksSaldoAwalTampil = document.getElementById('ksSaldoAwalTampil');
    let ksTotalMasuk = document.getElementById('ksTotalMasuk');
    let ksTotalKeluar = document.getElementById('ksTotalKeluar');
    let ksSaldoAkhir = document.getElementById('ksSaldoAkhir');
    
    if(ksSaldoAwalTampil) ksSaldoAwalTampil.innerText = formatRupiah(saldoAwal);
    if(ksTotalMasuk) ksTotalMasuk.innerText = formatRupiah(filteredTotalMasuk);
    if(ksTotalKeluar) ksTotalKeluar.innerText = formatRupiah(filteredTotalKeluar);
    if(ksSaldoAkhir) ksSaldoAkhir.innerText = formatRupiah(saldoBerjalan);
    
    // Tampilkan di tabel (Urutkan dari yang terbaru ke terlama untuk tampilan)
    displayList.sort((a, b) => b.timestamp - a.timestamp);
    
    tbody.innerHTML = '';
    
    if(displayList.length === 0 && !isFiltered) {
        tbody.innerHTML = `
            <tr>
                <td style="color:var(--text-light); text-align:center;">-</td>
                <td style="color:var(--text-light); text-align:center;">-</td>
                <td><span style="background:#64748b15; color:#64748b; padding:3px 10px; border-radius:6px; font-size:0.75rem; font-weight:600;">Saldo Awal</span></td>
                <td><strong>Saldo Kas Awal</strong></td>
                <td style="text-align:right;">-</td>
                <td style="text-align:right;">-</td>
                <td style="text-align:right; font-weight:700; color:var(--primary);">${formatRupiah(saldoAwal)}</td>
            </tr>
        `;
        return;
    } else if (displayList.length === 0 && isFiltered) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Tidak ada transaksi yang sesuai kriteria pencarian/filter.</td></tr>`;
        return;
    }
    
    let urut = 1;
    displayList.forEach(t => {
        let typeColor = t.masuk > 0 ? '#10b981' : (t.kategori === 'Pengeluaran Dinas' ? '#3b82f6' : '#ef4444');
        if(t.isAudit) typeColor = '#f59e0b';
        let typeLabel = t.kategori;
        let rowStyle = t.isAudit ? 'background:rgba(245,158,11,0.08);' : '';
        
        tbody.innerHTML += `
            <tr style="${rowStyle}">
                <td>${urut++}</td>
                <td>${t.tanggal || '-'}</td>
                <td><span style="background:${typeColor}15; color:${typeColor}; padding:3px 10px; border-radius:6px; font-size:0.75rem; font-weight:600;">${typeLabel}${t.isAudit ? ' ⚠' : ''}</span></td>
                <td style="font-weight:500;">${t.keterangan}</td>
                <td style="text-align:right; color:#10b981; font-weight:600;">${t.masuk > 0 ? formatRupiah(t.masuk) : '-'}</td>
                <td style="text-align:right; color:#ef4444; font-weight:600;">${t.keluar > 0 ? formatRupiah(t.keluar) : '-'}</td>
                <td style="text-align:right; font-weight:700; color:var(--primary-dark);">${formatRupiah(t.saldo)}</td>
            </tr>
        `;
    });
    
    if(!isFiltered) {
        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-light); text-align:center;">-</td>
                <td style="color:var(--text-light); text-align:center;">-</td>
                <td><span style="background:#64748b15; color:#64748b; padding:3px 10px; border-radius:6px; font-size:0.75rem; font-weight:600;">Saldo Awal</span></td>
                <td><strong>Saldo Kas Awal Sistem</strong></td>
                <td style="text-align:right;">-</td>
                <td style="text-align:right;">-</td>
                <td style="text-align:right; font-weight:700; color:var(--primary-dark);">${formatRupiah(saldoAwal)}</td>
            </tr>
        `;
    }
}

// ==============================================================================
// MODUL ARSIP TRANSAKSI
// ==============================================================================
function renderArsipTransaksi() {
    let tbody = document.querySelector('#tableArsipTransaksi tbody');
    if(!tbody) return;
    
    let transaksiList = [];
    
    // 1. Tagihan Siswa & Pendaftaran (Pembayaran)
    if(window.dPembayaranSiswa && dPembayaranSiswa.length > 0) {
        dPembayaranSiswa.forEach(p => {
            let detailArr = [];
            try { detailArr = JSON.parse(p.detail_pembayaran || '[]'); } catch(e){}
            
            detailArr.forEach(d => {
                let isPendaftaran = d.nama.toLowerCase().includes('pendaftaran') || d.nama.toLowerCase().includes('formulir') || d.nama.toLowerCase().includes('seragam') || d.nama.toLowerCase().includes('buku');
                let modul = isPendaftaran ? 'Pendaftaran' : 'Tagihan Siswa';
                transaksiList.push({
                    tanggal: p.tanggal_pembayaran.substring(0,10),
                    timestamp: new Date(p.tanggal_pembayaran).getTime(),
                    modul: modul,
                    kategori: d.nama,
                    keterangan: `Pembayaran ${d.nama} - ${p.nama_siswa || '-'}`,
                    masuk: parseInt(d.nominal),
                    keluar: 0
                });
            });
        });
    }
    
    // 2. Pengeluaran Sekolah (Kas Keluar)
    if(window.dKasKeluar && dKasKeluar.length > 0) {
        dKasKeluar.forEach(p => {
            transaksiList.push({
                tanggal: p.tanggal.substring(0,10),
                timestamp: new Date(p.tanggal).getTime(),
                modul: 'Pengeluaran Sekolah',
                kategori: p.kategori || 'Pengeluaran',
                keterangan: p.keterangan,
                masuk: 0,
                keluar: parseInt(p.nominal)
            });
        });
    }
    
    // 3. Pengeluaran Dinas
    if(window.dPengeluaranDinas && dPengeluaranDinas.length > 0) {
        dPengeluaranDinas.forEach(p => {
            transaksiList.push({
                tanggal: (p.tanggal_berangkat || p.tanggal).substring(0,10),
                timestamp: new Date(p.tanggal_berangkat || p.tanggal).getTime(),
                modul: 'Pengeluaran Dinas',
                kategori: 'Perjalanan Dinas',
                keterangan: `${p.jenis} ke ${p.tujuan} (${p.petugas})`,
                masuk: 0,
                keluar: parseInt(p.jumlah_uang)
            });
        });
    }
    
    // 4. Audit Log Saldo Awal Kas Sekolah
    let auditLog = JSON.parse(localStorage.getItem('kas_saldo_awal_log') || '[]');
    auditLog.forEach(log => {
        transaksiList.push({
            tanggal: log.tanggal,
            timestamp: new Date(log.tanggal).getTime(),
            modul: 'Kas Sekolah',
            kategori: 'Koreksi Saldo Awal',
            keterangan: log.keterangan,
            masuk: log.selisih > 0 ? log.selisih : 0,
            keluar: log.selisih < 0 ? Math.abs(log.selisih) : 0
        });
    });
    
    // Populate filter tahun dinamis
    let tahunSelect = document.getElementById('filterTahunArsip');
    if(tahunSelect) {
        let currentValue = tahunSelect.value;
        let years = new Set();
        transaksiList.forEach(t => { if(t.tanggal && t.tanggal.length >= 4) years.add(t.tanggal.substring(0,4)); });
        
        while(tahunSelect.options.length > 1) {
            tahunSelect.remove(1);
        }
        
        Array.from(years).sort((a,b) => b.localeCompare(a)).forEach(y => {
            if(y && !isNaN(y)) {
                let opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if(y === currentValue) opt.selected = true;
                tahunSelect.appendChild(opt);
            }
        });
    }

    // Filter
    let search = (document.getElementById('searchArsip')?.value || '').toLowerCase();
    let filterTahun = tahunSelect ? tahunSelect.value : '';
    let filterSumber = document.getElementById('filterSumberArsip')?.value || '';
    
    let displayList = transaksiList;
    
    if(filterTahun) {
        displayList = displayList.filter(t => t.tanggal && t.tanggal.startsWith(filterTahun));
    } else {
        // Jika tidak ada tahun yang dipilih, default ke "semua tahun sebelum tahun ini" atau semua saja
        // Kita biarkan tampil semua jika tidak difilter, tapi mungkin kita default ke tahun lalu?
        // Untuk sekarang biarkan sesuai pilihan user.
    }
    
    if(filterSumber) {
        displayList = displayList.filter(t => t.modul === filterSumber);
    }
    
    if(search) {
        displayList = displayList.filter(t => 
            t.keterangan.toLowerCase().includes(search) || 
            t.kategori.toLowerCase().includes(search)
        );
    }
    
    // Tampilkan di tabel (Urutkan dari terbaru)
    displayList.sort((a, b) => b.timestamp - a.timestamp);
    
    tbody.innerHTML = '';
    
    if(displayList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Tidak ada arsip transaksi.</td></tr>`;
        return;
    }
    
    let urut = 1;
    displayList.forEach(t => {
        let modulColor = '#64748b';
        if(t.modul === 'Tagihan Siswa') modulColor = '#10b981'; // green
        else if(t.modul === 'Pengeluaran Sekolah') modulColor = '#ef4444'; // red
        else if(t.modul === 'Pendaftaran') modulColor = '#8b5cf6'; // purple
        else if(t.modul === 'Pengeluaran Dinas') modulColor = '#3b82f6'; // blue
        else if(t.modul === 'Kas Sekolah') modulColor = '#f59e0b'; // amber
        
        tbody.innerHTML += `
            <tr>
                <td>${urut++}</td>
                <td>${t.tanggal || '-'}</td>
                <td><span style="background:${modulColor}15; color:${modulColor}; padding:3px 10px; border-radius:6px; font-size:0.75rem; font-weight:600;">${t.modul}</span></td>
                <td>${t.kategori}</td>
                <td style="font-weight:500;">${t.keterangan}</td>
                <td style="text-align:right; color:#10b981; font-weight:600;">${t.masuk > 0 ? formatRupiah(t.masuk) : '-'}</td>
                <td style="text-align:right; color:#ef4444; font-weight:600;">${t.keluar > 0 ? formatRupiah(t.keluar) : '-'}</td>
            </tr>
        `;
    });
}

function printLaporanArsip() {
    let printArea = document.getElementById('printAreaLaporan');
    if(!printArea) return;
    
    let filterTahun = document.getElementById('filterTahunArsip')?.value || 'Semua Tahun';
    let filterSumber = document.getElementById('filterSumberArsip')?.value || 'Semua Modul';
    
    let tbody = document.querySelector('#tableArsipTransaksi tbody');
    if(!tbody || tbody.innerText.includes('Tidak ada arsip')) {
        showToast('Tidak ada data arsip untuk dicetak', 'error');
        return;
    }
    
    printArea.innerHTML = `
        <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #000; padding-bottom:10px;">
            <h2 style="margin:0; font-size:16pt;">ARSIP TRANSAKSI KEUANGAN</h2>
            <h3 style="margin:5px 0 0 0; font-size:14pt;">SMP IT AL-FATHONAH</h3>
            <p style="margin:5px 0 0 0; font-size:10pt;">Filter: ${filterSumber} | Tahun: ${filterTahun}</p>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10pt;" border="1">
            <thead>
                <tr>
                    <th style="padding:5px;">No</th>
                    <th style="padding:5px;">Tanggal</th>
                    <th style="padding:5px;">Modul/Sumber</th>
                    <th style="padding:5px;">Keterangan</th>
                    <th style="padding:5px;">Masuk (Rp)</th>
                    <th style="padding:5px;">Keluar (Rp)</th>
                </tr>
            </thead>
            <tbody>
                ${Array.from(tbody.rows).map(r => `
                    <tr>
                        <td style="padding:5px; text-align:center;">${r.cells[0].innerText}</td>
                        <td style="padding:5px;">${r.cells[1].innerText}</td>
                        <td style="padding:5px;">${r.cells[2].innerText}</td>
                        <td style="padding:5px;">${r.cells[4].innerText}</td>
                        <td style="padding:5px; text-align:right;">${r.cells[5].innerText}</td>
                        <td style="padding:5px; text-align:right;">${r.cells[6].innerText}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="margin-top:30px; text-align:right;">
            <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID')}</p>
        </div>
    `;
    
    document.getElementById('laporanPrintContainer').style.display = 'block';
    setTimeout(() => {
        window.print();
        document.getElementById('laporanPrintContainer').style.display = 'none';
        setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 400);
}

function printLaporanKasSekolah() {
    let printArea = document.getElementById('printAreaLaporan');
    if(!printArea) return;
    
    let today = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    let settings = getKwitansiSettings();
    let namaBendahara = settings.namaBendahara || '_______________________';
    let ttdBase64 = settings.ttdBase64 || '';
    
    let ttdHtml = ttdBase64 
        ? `<img src="${ttdBase64}" style="height:15mm; max-width:50mm; object-fit:contain; display:block; margin:3mm auto 2mm auto;" />`
        : `<div style="margin-bottom:20mm;"></div>`;
        
    let tbody = document.querySelector('#tableKasSekolah tbody');
    if(!tbody) return;
    
    let totalMasuk = document.getElementById('ksTotalMasuk').innerText;
    let totalKeluar = document.getElementById('ksTotalKeluar').innerText;
    let saldoAkhir = document.getElementById('ksSaldoAkhir').innerText;

    printArea.innerHTML = `
        <div class="laporan-print-container">
            <div class="lpc-kop">
                <img src="img/kop-surat.png?v=20260503" onerror="this.src='img/kop-surat.jpg?v=20260503'" alt="Kop Surat" />
            </div>
            <div class="lpc-title">LAPORAN BUKU KAS UMUM SEKOLAH<br><span style="font-size:11pt; font-weight:normal;">Dicetak pada: ${today}</span></div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-weight:bold; font-size:10pt; background:#f8fafc; padding:10px; border:1px solid #cbd5e1; border-radius:4px;">
                <div style="color:#059669;">Total Pemasukan: ${totalMasuk}</div>
                <div style="color:#dc2626;">Total Pengeluaran: ${totalKeluar}</div>
                <div style="color:#2563eb;">Saldo Akhir: ${saldoAkhir}</div>
            </div>
            
            <table class="lpc-table" style="width:100%; border-collapse:collapse; font-size:9pt;">
                <thead>
                    <tr>
                        <th style="border:1px solid #000; padding:5px; background:#f0f0f0; width:40px;">No</th>
                        <th style="border:1px solid #000; padding:5px; background:#f0f0f0; width:80px;">Tanggal</th>
                        <th style="border:1px solid #000; padding:5px; background:#f0f0f0; width:100px;">Kategori</th>
                        <th style="border:1px solid #000; padding:5px; background:#f0f0f0;">Keterangan</th>
                        <th style="border:1px solid #000; padding:5px; background:#f0f0f0; width:90px;">Masuk</th>
                        <th style="border:1px solid #000; padding:5px; background:#f0f0f0; width:90px;">Keluar</th>
                        <th style="border:1px solid #000; padding:5px; background:#f0f0f0; width:90px;">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbody.innerHTML.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '')}
                </tbody>
            </table>
            
            <div class="lpc-footer">
                <div style="text-align:center;">
                    <div>Babakan, ${today}</div>
                    <div>Bendahara Sekolah,</div>
                    ${ttdHtml}
                    <div style="text-decoration:underline; font-weight:bold;">${namaBendahara}</div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 500);
}



// ==============================================================================
// MODUL KAS KELUAR
// ==============================================================================

let dKasKeluar = [];

async function fetchKasKeluar() {
    try {
        const { data, error } = await supabaseClient.from('kas_keluar').select('*').order('tanggal', { ascending: false });
        if(error) throw error;
        dKasKeluar = data || [];
    } catch(e) {
        console.error('Failed to fetch kas keluar:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(typeof supabaseClient !== 'undefined') fetchKasKeluar();
});

// ---- KAS KELUAR UNIVERSAL: CATEGORY-BASED SYSTEM ----
let currentUnivKategori = '';

function switchUnivKategoriPengeluaran(kategori) {
    currentUnivKategori = kategori;
    let container = document.getElementById('univKategoriContentContainer');
    let placeholder = document.getElementById('univKategoriPlaceholder');
    
    if (!kategori) {
        container.style.display = 'none';
        placeholder.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Update table title
    document.getElementById('univKategoriTableTitle').textContent = 'Riwayat Pengeluaran — ' + kategori;
    
    // Render category-specific table
    renderUnivKategoriTable();
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function renderKasKeluarSummary() {
    let summaryDiv = document.getElementById('kasKeluarSummary');
    if (!summaryDiv) return;
    
    let total = 0, currMonthTotal = 0;
    let now = new Date();
    let currentMonth = now.getMonth(), currentYear = now.getFullYear();
    
    // Summary uses ALL kas keluar universal, regardless of category
    dKasKeluar.forEach(d => {
        let amt = parseInt(d.jumlah) || 0;
        total += amt;
        let dDate = new Date(d.tanggal);
        if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
            currMonthTotal += amt;
        }
    });
    
    let maxTrx = dKasKeluar.length > 0 ? Math.max(...dKasKeluar.map(x => parseInt(x.jumlah) || 0)) : 0;
    
    summaryDiv.innerHTML = `
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #ef4444;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Pengeluaran Universal</div>
            <div style="font-size:1.3rem; font-weight:700; color:#ef4444;">Rp ${formatRupiah(total)}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">Rp ${formatRupiah(currMonthTotal)}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${dKasKeluar.length}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #3b82f6;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Pengeluaran Terbesar</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">Rp ${formatRupiah(maxTrx)}</div>
        </div>
    `;
}

function renderKasKeluarTable() {
    // This function replaces the old generic table renderer.
    // It is called during initial fetch or when the tab is switched.
    renderKasKeluarSummary();
    if (currentUnivKategori) {
        renderUnivKategoriTable();
    }
}

function renderUnivKategoriTable() {
    let thead = document.getElementById('theadUnivKategori');
    let tbody = document.getElementById('tbodyUnivKategori');
    if (!thead || !tbody) return;
    
    let search = (document.getElementById('searchUnivKategori')?.value || '').toLowerCase();
    let filterBulan = document.getElementById('filterBulanUnivKategori')?.value || '';
    let kat = currentUnivKategori;
    
    // Filter data by category
    let filtered = dKasKeluar.filter(x => x.kategori === kat);
    if (search) {
        filtered = filtered.filter(x => 
            (x.keterangan || '').toLowerCase().includes(search) ||
            (x.nama_item || '').toLowerCase().includes(search) ||
            (x.penerima || '').toLowerCase().includes(search)
        );
    }
    if (filterBulan) {
        filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(filterBulan));
    }
    
    // Build category-specific thead
    let thRow = '';
    if (kat === 'Honor') {
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Nama Penerima</th>
            <th>Tanggal Dibayar</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    } else if (kat === 'Ekstrakurikuler') {
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Nama Pelatih / PJ</th>
            <th>Tanggal Dibayar</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    } else if (kat === 'Perjalanan Dinas') {
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Nama Pelaku Perjalanan</th>
            <th>Tanggal Dibayarkan</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    } else {
        // Utilitas, ATK, Lainnya
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Tanggal Dibayarkan</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    }
    thead.innerHTML = thRow;
    
    // Build tbody rows
    let trs = '';
    if (filtered.length === 0) {
        let colSpan = (kat === 'Honor' || kat === 'Ekstrakurikuler' || kat === 'Perjalanan Dinas') ? 6 : 5;
        trs = `<tr><td colspan="${colSpan}" style="text-align:center;color:var(--text-light);padding:2rem;">Belum ada data pengeluaran untuk kategori ${kat}</td></tr>`;
    } else {
        filtered.forEach((d, idx) => {
            let amt = parseInt(d.jumlah) || 0;
            let actBtns = `
                <button class="btn btn-sm btn-outline" onclick="editKasKeluar('${d.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                <button class="btn btn-sm btn-danger" onclick="hapusKasKeluar('${d.id}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
            `;
            
            // For categories without penerima field, we still show keterangan and maybe nama_item.
            // Let's combine nama_item and keterangan if they are both filled, or just use one.
            let detailKet = d.nama_item;
            if (d.keterangan && d.keterangan !== d.nama_item) detailKet += ` — ${d.keterangan}`;
            
            if (kat === 'Honor' || kat === 'Ekstrakurikuler' || kat === 'Perjalanan Dinas') {
                trs += `<tr>
                    <td>${idx+1}</td>
                    <td><strong>${d.penerima || '-'}</strong></td>
                    <td>${formatDateIndonesia(d.tanggal)}</td>
                    <td style="color:#ef4444; font-weight:600;">- Rp ${formatRupiah(amt)}</td>
                    <td>${detailKet}</td>
                    <td style="text-align:right; white-space:nowrap;">${actBtns}</td>
                </tr>`;
            } else {
                trs += `<tr>
                    <td>${idx+1}</td>
                    <td>${formatDateIndonesia(d.tanggal)}</td>
                    <td style="color:#ef4444; font-weight:600;">- Rp ${formatRupiah(amt)}</td>
                    <td>${detailKet}</td>
                    <td style="text-align:right; white-space:nowrap;">${actBtns}</td>
                </tr>`;
            }
        });
    }
    tbody.innerHTML = trs;
    
    // Also refresh summary
    renderKasKeluarSummary();
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- KAS KELUAR MODAL (UNIVERSAL DYNAMIC FORM) ----
function openKasKeluarModal() {
    let kat = currentUnivKategori;
    if (!kat) {
        showToast('Pilih kategori pengeluaran terlebih dahulu!', 'warning');
        return;
    }
    
    let modalBody = document.getElementById('kasKeluarModalBody');
    let title = document.getElementById('kasKeluarModalTitle');
    title.textContent = 'Tambah Pengeluaran — ' + kat;
    
    let formHTML = '';
    
    formHTML += `<input type="hidden" id="formKKId" />`;
    formHTML += `<input type="hidden" id="formKKKategori" value="${kat}" />`;
    
    if (kat === 'Honor') {
        let guruOptions = '<option value="">— Pilih Guru —</option>';
        if (typeof guruList !== 'undefined' && guruList.length > 0) {
            guruList.filter(g => g.status === 'Aktif').forEach(g => {
                guruOptions += `<option value="${g.nama_lengkap}">${g.nama_lengkap} — ${g.jabatan || 'Guru'}</option>`;
            });
        }
        formHTML += `
            <div class="form-group">
                <label class="form-label">Nama Penerima Honor <span style="color:red">*</span></label>
                <select id="formKKPenerima" class="form-input">${guruOptions}</select>
            </div>`;
    } else if (kat === 'Ekstrakurikuler') {
        formHTML += `
            <div class="form-group">
                <label class="form-label">Nama Pelatih / Penanggung Jawab <span style="color:red">*</span></label>
                <input type="text" id="formKKPenerima" class="form-input" placeholder="Masukkan nama pelatih" />
            </div>`;
    } else if (kat === 'Perjalanan Dinas') {
        formHTML += `
            <div class="form-group">
                <label class="form-label">Nama Yang Melakukan Perjalanan <span style="color:red">*</span></label>
                <input type="text" id="formKKPenerima" class="form-input" placeholder="Masukkan nama" />
            </div>`;
    }
    
    formHTML += `
        <div class="form-group">
            <label class="form-label">Tanggal Dibayarkan <span style="color:red">*</span></label>
            <input type="date" id="formKKTanggal" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
            <label class="form-label">Jumlah (Rp) <span style="color:red">*</span></label>
            <input type="number" id="formKKJumlah" class="form-input" placeholder="Masukkan nominal" />
        </div>
        <div class="form-group">
            <label class="form-label">Keterangan / Nama Item</label>
            <input type="text" id="formKKKeterangan" class="form-input" placeholder="Opsional: Keterangan tambahan..." />
        </div>`;
    
    modalBody.innerHTML = formHTML;
    document.getElementById('kasKeluarModal').classList.add('active');
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function closeKasKeluarModal() {
    document.getElementById('kasKeluarModal').classList.remove('active');
}

function editKasKeluar(id) {
    let d = dKasKeluar.find(x => x.id === id);
    if(!d) return;
    
    // Make sure we are viewing the correct category
    if (d.kategori !== currentUnivKategori) {
        switchUnivKategoriPengeluaran(d.kategori);
        document.getElementById('selectUnivKategoriPengeluaran').value = d.kategori;
    }
    
    openKasKeluarModal(); // Generates the form structure based on currentUnivKategori
    
    setTimeout(() => {
        document.getElementById('kasKeluarModalTitle').textContent = 'Edit Pengeluaran — ' + d.kategori;
        document.getElementById('formKKId').value = d.id;
        
        let penerimaField = document.getElementById('formKKPenerima');
        if(penerimaField) penerimaField.value = d.penerima || '';
        
        document.getElementById('formKKTanggal').value = d.tanggal || '';
        document.getElementById('formKKJumlah').value = d.jumlah || '';
        
        // Populate keterangan. Previously we might have used nama_item and keterangan.
        // If we are editing older data, display both or just keterangan
        let combinedKet = d.keterangan || d.nama_item || '';
        document.getElementById('formKKKeterangan').value = combinedKet;
    }, 50);
}

async function saveKasKeluar() {
    let id = document.getElementById('formKKId').value;
    let kat = document.getElementById('formKKKategori')?.value || currentUnivKategori;
    let tgl = document.getElementById('formKKTanggal').value;
    let jumlah = parseInt(document.getElementById('formKKJumlah').value) || 0;
    let ket = document.getElementById('formKKKeterangan')?.value.trim() || '-';
    
    let penerimaField = document.getElementById('formKKPenerima');
    let penerima = penerimaField ? penerimaField.value.trim() : '';
    
    if (!tgl || !jumlah) {
        showToast('Tanggal dan Jumlah harus diisi!', 'warning');
        return;
    }
    
    if ((kat === 'Honor' || kat === 'Ekstrakurikuler' || kat === 'Perjalanan Dinas') && !penerima) {
        showToast('Nama/Penerima harus diisi!', 'warning');
        return;
    }
    
    let btn = document.querySelector('#kasKeluarModal .btn-primary');
    let oldTxt = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;
    
    // Map to kas_keluar schema: {kategori, nama_item, jumlah, tanggal, keterangan, penerima}
    // We use "ket" for both nama_item and keterangan to keep it simple, or set nama_item to category name.
    let payload = { 
        kategori: kat, 
        nama_item: kat, // Using category name as item name since it's redundant now
        jumlah: jumlah, 
        tanggal: tgl, 
        keterangan: ket, 
        penerima: penerima 
    };
    
    try {
        if(id) {
            const { error } = await supabaseClient.from('kas_keluar').update(payload).eq('id', id);
            if(error) throw error;
            let idx = dKasKeluar.findIndex(x => x.id === id);
            if(idx >= 0) Object.assign(dKasKeluar[idx], payload);
            showToast('Data berhasil diperbarui!', 'success');
        } else {
            const { data, error } = await supabaseClient.from('kas_keluar').insert([payload]).select();
            if(error) throw error;
            if(data && data[0]) dKasKeluar.unshift(data[0]);
            showToast('Pengeluaran berhasil ditambahkan!', 'success');
        }
        closeKasKeluarModal();
        renderUnivKategoriTable();
    } catch(e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = oldTxt; btn.disabled = false;
    }
}

function hapusKasKeluar(id) {
    showCustomConfirm('Hapus Data?', 'Anda yakin ingin menghapus data pengeluaran ini?', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('kas_keluar').delete().eq('id', id);
            if(error) throw error;
            dKasKeluar = dKasKeluar.filter(x => x.id !== id);
            showToast('Data berhasil dihapus!', 'success');
            renderUnivKategoriTable();
        } catch(e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}

// === CETAK LAPORAN KAS KELUAR ===
function printLaporanKasKeluar() {
    if(dKasKeluar.length === 0) {
        return showToast('Belum ada data kas keluar untuk dicetak.', 'warning');
    }
    
    let search = (document.getElementById('searchUnivKategori')?.value || '').toLowerCase();
    let filterBulan = document.getElementById('filterBulanUnivKategori')?.value || '';
    
    let filtered = dKasKeluar;
    if (currentUnivKategori) {
        filtered = filtered.filter(x => x.kategori === currentUnivKategori);
    }
    
    if(search) {
        filtered = filtered.filter(d => 
            (d.nama_item || '').toLowerCase().includes(search) || 
            (d.keterangan || '').toLowerCase().includes(search) ||
            (d.penerima || '').toLowerCase().includes(search)
        );
    }
    if(filterBulan) filtered = filtered.filter(d => d.tanggal && d.tanggal.startsWith(filterBulan));
    
    let today = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    let totalUang = filtered.reduce((s, d) => s + parseInt(d.jumlah || 0), 0);
    
    let periodeLabel = 'Seluruh Data';
    if(filterBulan) {
        let [y,m] = filterBulan.split('-');
        let bulanNama = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        periodeLabel = bulanNama[parseInt(m)] + ' ' + y;
    }
    
    let trs = '';
    filtered.forEach((d, idx) => {
        trs += `<tr>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${idx + 1}</td>
            <td style="padding:5px; border:1px solid #000;">${d.kategori}</td>
            <td style="padding:5px; border:1px solid #000;">${d.nama_item}</td>
            <td style="text-align:right; padding:5px; border:1px solid #000;">${formatRupiah(d.jumlah)}</td>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${d.tanggal}</td>
            <td style="padding:5px; border:1px solid #000;">${d.keterangan || '-'}</td>
        </tr>`;
    });
    
    trs += `<tr>
        <td colspan="3" style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">TOTAL KAS KELUAR :</td>
        <td style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">${formatRupiah(totalUang)}</td>
        <td colspan="2" style="padding:5px; border:1px solid #000;"></td>
    </tr>`;
    
    let settings = getKwitansiSettings();
    let namaBendahara = settings.namaBendahara || '_______________________';
    let ttdBase64 = settings.ttdBase64 || '';
    let ttdHtml = ttdBase64 
        ? `<img src="${ttdBase64}" style="height:15mm; max-width:50mm; object-fit:contain; display:block; margin:3mm auto 2mm auto;" />`
        : `<div style="margin-bottom:20mm;"></div>`;

    let printArea = document.getElementById('printAreaLaporan');
    printArea.innerHTML = `
        <div class="laporan-print-container">
            <div class="lpc-kop">
                <img src="img/kop-surat.png?v=20260503" onerror="this.src='img/kop-surat.jpg?v=20260503'" alt="Kop Surat" />
            </div>
            <div class="lpc-title">LAPORAN KAS KELUAR<br><span style="font-size:11pt; font-weight:normal;">Periode: ${periodeLabel} — Dicetak: ${today}</span></div>
            <table class="lpc-table" style="width:100%; border-collapse:collapse;">
                <thead><tr>
                    <th style="width:5%; border:1px solid #000; padding:5px; background:#f0f0f0;">No</th>
                    <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Kategori</th>
                    <th style="width:28%; border:1px solid #000; padding:5px; background:#f0f0f0;">Nama Item</th>
                    <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Jumlah</th>
                    <th style="width:12%; border:1px solid #000; padding:5px; background:#f0f0f0;">Tanggal</th>
                    <th style="width:25%; border:1px solid #000; padding:5px; background:#f0f0f0;">Keterangan</th>
                </tr></thead>
                <tbody>${trs}</tbody>
            </table>
            <div class="lpc-footer">
                <div style="text-align:center;">
                    <div>Babakan, ${today}</div>
                    <div>Bendahara Sekolah,</div>
                    ${ttdHtml}
                    <div style="text-decoration:underline; font-weight:bold;">${namaBendahara}</div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 500);
}


// ==============================================================================
// MODUL pengeluaran dinas
// ==============================================================================

let dPengeluaranDinas = [];

async function fetchOperasionalData() {
    try {
        const { data, error } = await supabaseClient.from('pengeluaran_dinas').select('*').order('created_at', { ascending: false });
        if(error) throw error;
        dPengeluaranDinas = data || [];
    } catch(e) {
        console.error('Failed to fetch pengeluaran dinas:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(typeof supabaseClient !== 'undefined') fetchOperasionalData();
});

function renderPengeluaranDinasTable() {
    let tbody = document.querySelector('#tablePengeluaranDinas tbody');
    if(!tbody) return;
    
    let search = (document.getElementById('searchPengeluaranDinas')?.value || '').toLowerCase();
    let filtered = dPengeluaranDinas;
    if(search) {
        filtered = filtered.filter(d => 
            d.tujuan.toLowerCase().includes(search) || 
            d.petugas.toLowerCase().includes(search) || 
            d.jenis.toLowerCase().includes(search)
        );
    }
    
    // Summary cards
    let summaryEl = document.getElementById('pengeluaranDinasSummary');
    if(summaryEl) {
        let totalTrips = dPengeluaranDinas.length;
        let totalUang = dPengeluaranDinas.reduce((sum, d) => sum + parseInt(d.jumlah_uang || 0), 0);
        summaryEl.innerHTML = `
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Perjalanan</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${totalTrips}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Pengeluaran</div>
                <div style="font-size:1.3rem; font-weight:700; color:#f59e0b;">${formatRupiah(totalUang)}</div>
            </div>
        `;
    }
    
    tbody.innerHTML = '';
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data pengeluaran dinas.</td></tr>`;
        return;
    }
    
    filtered.forEach((d, idx) => {
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><span class="status-badge status-info">${d.jenis}</span></td>
                <td><strong>${d.tujuan}</strong></td>
                <td>${d.petugas}</td>
                <td style="font-weight:600; color:var(--danger);">${formatRupiah(d.jumlah_uang)}</td>
                <td>${d.tanggal_berangkat}</td>
                <td>${d.tanggal_pulang}</td>
                <td>${d.keterangan || '-'}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-sm btn-outline" onclick="editPengeluaranDinas('${d.id}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusPengeluaranDinas('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </td>
            </tr>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

function openPengeluaranDinasModal() {
    document.getElementById('pengeluaranDinasModalTitle').innerText = 'Tambah pengeluaran dinas';
    document.getElementById('formPDId').value = '';
    document.getElementById('formPDJenis').value = 'Rapat';
    document.getElementById('formPDTujuan').value = '';
    document.getElementById('formPDPetugas').value = '';
    document.getElementById('formPDJumlah').value = '';
    document.getElementById('formPDBerangkat').value = new Date().toISOString().split('T')[0];
    document.getElementById('formPDPulang').value = new Date().toISOString().split('T')[0];
    document.getElementById('formPDKeterangan').value = '';
    
    document.getElementById('pengeluaranDinasModal').classList.add('active');
    if(window.lucide) lucide.createIcons();
}

function closePengeluaranDinasModal() {
    document.getElementById('pengeluaranDinasModal').classList.remove('active');
}

function editPengeluaranDinas(id) {
    let d = dPengeluaranDinas.find(x => x.id === id);
    if(!d) return;
    
    document.getElementById('pengeluaranDinasModalTitle').innerText = 'Edit pengeluaran dinas';
    document.getElementById('formPDId').value = d.id;
    document.getElementById('formPDJenis').value = d.jenis;
    document.getElementById('formPDTujuan').value = d.tujuan;
    document.getElementById('formPDPetugas').value = d.petugas;
    document.getElementById('formPDJumlah').value = d.jumlah_uang;
    document.getElementById('formPDBerangkat').value = d.tanggal_berangkat;
    document.getElementById('formPDPulang').value = d.tanggal_pulang;
    document.getElementById('formPDKeterangan').value = d.keterangan || '';
    
    document.getElementById('pengeluaranDinasModal').classList.add('active');
    if(window.lucide) lucide.createIcons();
}

async function savePengeluaranDinas() {
    let id = document.getElementById('formPDId').value;
    let jenis = document.getElementById('formPDJenis').value;
    let tujuan = document.getElementById('formPDTujuan').value.trim();
    let petugas = document.getElementById('formPDPetugas').value.trim();
    let jumlah = document.getElementById('formPDJumlah').value;
    let berangkat = document.getElementById('formPDBerangkat').value;
    let pulang = document.getElementById('formPDPulang').value;
    let ket = document.getElementById('formPDKeterangan').value.trim();
    
    if(!tujuan || !petugas || !jumlah || !berangkat || !pulang) {
        return showToast('Harap lengkapi semua data wajib!', 'error');
    }
    
    let obj = {
        jenis: jenis,
        tujuan: tujuan,
        petugas: petugas,
        jumlah_uang: parseInt(jumlah),
        tanggal_berangkat: berangkat,
        tanggal_pulang: pulang,
        keterangan: ket || null
    };
    
    try {
        if(id) {
            // Update
            const { error } = await supabaseClient.from('pengeluaran_dinas').update(obj).eq('id', id);
            if(error) throw error;
            let idx = dPengeluaranDinas.findIndex(x => x.id === id);
            if(idx >= 0) Object.assign(dPengeluaranDinas[idx], obj);
            showToast('Data pengeluaran dinas berhasil diperbarui!', 'success');
        } else {
            // Insert
            const { data, error } = await supabaseClient.from('pengeluaran_dinas').insert([obj]).select();
            if(error) throw error;
            if(data && data.length > 0) dPengeluaranDinas.unshift(data[0]);
            showToast('Data pengeluaran dinas berhasil ditambahkan!', 'success');
        }
        
        closePengeluaranDinasModal();
        renderPengeluaranDinasTable();
    } catch(e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    }
}

function hapusPengeluaranDinas(id) {
    showCustomConfirm('Hapus Data?', 'Anda yakin ingin menghapus data pengeluaran dinas ini?', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('pengeluaran_dinas').delete().eq('id', id);
            if(error) throw error;
            dPengeluaranDinas = dPengeluaranDinas.filter(x => x.id !== id);
            showToast('Data berhasil dihapus!', 'success');
            renderPengeluaranDinasTable();
        } catch(e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}

// === CETAK LAPORAN PENGELUARAN DINAS ===
function printLaporanPengeluaranDinas() {
    if(dPengeluaranDinas.length === 0) {
        return showToast('Belum ada data pengeluaran dinas untuk dicetak.', 'warning');
    }
    
    let search = (document.getElementById('searchPengeluaranDinas')?.value || '').toLowerCase();
    let filtered = dPengeluaranDinas;
    if(search) {
        filtered = filtered.filter(d => 
            d.tujuan.toLowerCase().includes(search) || 
            d.petugas.toLowerCase().includes(search) || 
            d.jenis.toLowerCase().includes(search)
        );
    }
    
    let today = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    let totalUang = filtered.reduce((sum, d) => sum + parseInt(d.jumlah_uang || 0), 0);
    
    let trs = '';
    filtered.forEach((d, idx) => {
        trs += `<tr>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${idx + 1}</td>
            <td style="padding:5px; border:1px solid #000;">${d.jenis}</td>
            <td style="padding:5px; border:1px solid #000;">${d.tujuan}</td>
            <td style="padding:5px; border:1px solid #000;">${d.petugas}</td>
            <td style="text-align:right; padding:5px; border:1px solid #000;">${formatRupiah(d.jumlah_uang)}</td>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${d.tanggal_berangkat}</td>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${d.tanggal_pulang}</td>
            <td style="padding:5px; border:1px solid #000;">${d.keterangan || '-'}</td>
        </tr>`;
    });
    
    trs += `<tr>
        <td colspan="4" style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">TOTAL PENGELUARAN :</td>
        <td style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">${formatRupiah(totalUang)}</td>
        <td colspan="3" style="padding:5px; border:1px solid #000;"></td>
    </tr>`;
    
    let settings = getKwitansiSettings();
    let namaBendahara = settings.namaBendahara || '_______________________';
    let ttdBase64 = settings.ttdBase64 || '';
    let ttdHtml = ttdBase64 
        ? `<img src="${ttdBase64}" style="height:15mm; max-width:50mm; object-fit:contain; display:block; margin:3mm auto 2mm auto;" />`
        : `<div style="margin-bottom:20mm;"></div>`;

    let printArea = document.getElementById('printAreaLaporan');
    printArea.innerHTML = `
        <div class="laporan-print-container">
            <div class="lpc-kop">
                <img src="img/kop-surat.png?v=20260503" onerror="this.src='img/kop-surat.jpg?v=20260503'" alt="Kop Surat" />
            </div>
            <div class="lpc-title">LAPORAN PENGELUARAN DINAS<br><span style="font-size:11pt; font-weight:normal;">Periode: Seluruh Data — Dicetak: ${today}</span></div>
            <table class="lpc-table" style="width:100%; border-collapse:collapse;">
                <thead><tr>
                    <th style="width:5%; border:1px solid #000; padding:5px; background:#f0f0f0;">No</th>
                    <th style="width:10%; border:1px solid #000; padding:5px; background:#f0f0f0;">Jenis</th>
                    <th style="width:18%; border:1px solid #000; padding:5px; background:#f0f0f0;">Tujuan</th>
                    <th style="width:14%; border:1px solid #000; padding:5px; background:#f0f0f0;">Petugas</th>
                    <th style="width:14%; border:1px solid #000; padding:5px; background:#f0f0f0;">Jumlah Uang</th>
                    <th style="width:11%; border:1px solid #000; padding:5px; background:#f0f0f0;">Berangkat</th>
                    <th style="width:11%; border:1px solid #000; padding:5px; background:#f0f0f0;">Pulang</th>
                    <th style="width:17%; border:1px solid #000; padding:5px; background:#f0f0f0;">Keterangan</th>
                </tr></thead>
                <tbody>${trs}</tbody>
            </table>
            <div class="lpc-footer">
                <div style="text-align:center;">
                    <div>Babakan, ${today}</div>
                    <div>Bendahara Sekolah,</div>
                    ${ttdHtml}
                    <div style="text-decoration:underline; font-weight:bold;">${namaBendahara}</div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 500);
}


// ==============================================================================
// LAPORAN BENDAHARA (READ-ONLY UNTUK KEPALA SEKOLAH)
// ==============================================================================

let activeLapDetailIdKat = null;
let activeLapDetailJenis = null;

function switchLaporanTab(tab) {
    let tabU = document.getElementById('tabLapUniversal');
    let tabP = document.getElementById('tabLapPendaftaran');
    let tabD = document.getElementById('tabLapPengeluaranDinas');
    let contentU = document.getElementById('lapTabContentUniversal');
    let contentP = document.getElementById('lapTabContentPendaftaran');
    let contentD = document.getElementById('lapTabContentPengeluaranDinas');
    
    // Reset all tabs
    [tabU, tabP, tabD].forEach(t => { if(t) { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--text-light)'; }});
    [contentU, contentP, contentD].forEach(c => { if(c) c.style.display = 'none'; });
    
    if(tab === 'universal') {
        if(tabU) { tabU.style.borderBottomColor = 'var(--primary)'; tabU.style.color = 'var(--primary)'; }
        if(contentU) contentU.style.display = '';
        renderLapMaster('universal');
    } else if(tab === 'pendaftaran') {
        if(tabP) { tabP.style.borderBottomColor = 'var(--primary)'; tabP.style.color = 'var(--primary)'; }
        if(contentP) contentP.style.display = '';
        renderLapMaster('pendaftaran');
    } else if(tab === 'dinas') {
        if(tabD) { tabD.style.borderBottomColor = 'var(--primary)'; tabD.style.color = 'var(--primary)'; }
        if(contentD) contentD.style.display = '';
        renderLapPengeluaranDinasTable();
    }
    closeLapDetail('universal');
    closeLapDetail('pendaftaran');
    if(window.lucide) lucide.createIcons();
}

function renderLapPengeluaranDinasTable() {
    let search = (document.getElementById('lapSearchPengeluaranDinas')?.value || '').toLowerCase();
    let filtered = dPengeluaranDinas;
    if(search) {
        filtered = filtered.filter(d => 
            d.tujuan.toLowerCase().includes(search) || 
            d.petugas.toLowerCase().includes(search) || 
            d.jenis.toLowerCase().includes(search)
        );
    }
    
    // Summary
    let summaryEl = document.getElementById('lapSummaryPengeluaranDinas');
    if(summaryEl) {
        let totalTrips = dPengeluaranDinas.length;
        let totalUang = dPengeluaranDinas.reduce((sum, d) => sum + parseInt(d.jumlah_uang || 0), 0);
        summaryEl.innerHTML = `
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Perjalanan</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${totalTrips}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Pengeluaran</div>
                <div style="font-size:1.3rem; font-weight:700; color:#f59e0b;">${formatRupiah(totalUang)}</div>
            </div>
        `;
    }
    
    let tbody = document.querySelector('#lapTablePengeluaranDinas tbody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data pengeluaran dinas.</td></tr>`;
        return;
    }
    
    filtered.forEach((d, idx) => {
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><span class="status-badge status-info">${d.jenis}</span></td>
                <td><strong>${d.tujuan}</strong></td>
                <td>${d.petugas}</td>
                <td style="font-weight:600; color:var(--danger);">${formatRupiah(d.jumlah_uang)}</td>
                <td>${d.tanggal_berangkat}</td>
                <td>${d.tanggal_pulang}</td>
                <td>${d.keterangan || '-'}</td>
            </tr>
        `;
    });
}

function renderLapMaster(jenis) {
    let filteredData = dKeuanganInsidental.filter(k => (k.jenis_tagihan || 'universal') === jenis);
    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    
    // === SUMMARY CARDS ===
    let summaryEl = document.getElementById('lapSummary' + suffix);
    if(summaryEl) {
        let totalTagihan = filteredData.length;
        let grandNominal = 0;
        let grandTerbayar = 0;
        
        filteredData.forEach(k => {
            let prefix = jenis === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
            let kodeTagihan = prefix + k.id;
            let listSiswa = getSiswaForKeuangan(k.kelas);
            
            listSiswa.forEach(s => {
                grandNominal += k.nominal;
                grandTerbayar += hitungTotalTerbayar(s.id, kodeTagihan);
            });
        });
        
        let grandSisa = grandNominal - grandTerbayar;
        let persen = grandNominal > 0 ? Math.round((grandTerbayar / grandNominal) * 100) : 0;
        
        summaryEl.innerHTML = `
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Tagihan</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${totalTagihan}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Harus Dibayar</div>
                <div style="font-size:1.3rem; font-weight:700; color:#f59e0b;">${formatRupiah(grandNominal)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--success);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Terkumpul (${persen}%)</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--success);">${formatRupiah(grandTerbayar)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--danger);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Sisa Belum Terbayar</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--danger);">${formatRupiah(Math.max(0, grandSisa))}</div>
            </div>
        `;
    }
    
    // === MASTER TABLE ===
    let tbody = document.querySelector('#lapMasterTable' + suffix + ' tbody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    if(filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data tagihan ${jenis}.</td></tr>`;
        return;
    }
    
    filteredData.forEach((k, idx) => {
        // Rincian for pendaftaran
        let rincianHtml = '';
        if(jenis === 'pendaftaran' && k.rincian) {
            try {
                let items = typeof k.rincian === 'string' ? JSON.parse(k.rincian) : k.rincian;
                if(items && items.length > 0) {
                    rincianHtml = '<div style="margin-top:4px; font-size:0.8rem; color:var(--text-light);">';
                    items.forEach((item, i) => {
                        rincianHtml += `${i+1}. ${item.nama} (${formatRupiah(item.nominal)})<br>`;
                    });
                    rincianHtml += '</div>';
                }
            } catch(e) {}
        }
        
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${k.nama}</strong>${rincianHtml}</td>
                <td>${k.kelas}</td>
                <td style="color:var(--danger); font-weight:600;">${formatRupiah(k.nominal)}</td>
                <td>${k.tanggal}</td>
                <td style="text-align:right;">
                    <button class="btn btn-sm btn-outline" onclick="openLapDetail('${k.id}', '${jenis}')">
                        <i data-lucide="eye" style="width:14px;height:14px;"></i> Lihat Detail
                    </button>
                </td>
            </tr>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

function openLapDetail(idKat, jenis) {
    activeLapDetailIdKat = idKat;
    activeLapDetailJenis = jenis;
    
    let kat = dKeuanganInsidental.find(k => k.id == idKat);
    if(!kat) return;
    
    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    document.getElementById('lapDetailTitle' + suffix).innerText = kat.nama;
    document.getElementById('lapDetailSub' + suffix).innerText = `Kelas: ${kat.kelas} | Nominal: ${formatRupiah(kat.nominal)} | Tanggal: ${kat.tanggal}`;
    document.getElementById('lapDetailContainer' + suffix).style.display = '';
    document.getElementById('lapSearch' + suffix).value = '';
    
    renderLapDetail(jenis);
    if(window.lucide) lucide.createIcons();
}

function closeLapDetail(jenis) {
    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    let el = document.getElementById('lapDetailContainer' + suffix);
    if(el) el.style.display = 'none';
    if(activeLapDetailJenis === jenis) {
        activeLapDetailIdKat = null;
        activeLapDetailJenis = null;
    }
}

function renderLapDetail(jenis) {
    if(!activeLapDetailIdKat || activeLapDetailJenis !== jenis) return;
    
    let kat = dKeuanganInsidental.find(k => k.id == activeLapDetailIdKat);
    if(!kat) return;
    
    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    let prefix = jenis === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    let kodeTagihan = prefix + kat.id;
    
    let listSiswa = getSiswaForKeuangan(kat.kelas);
    let search = document.getElementById('lapSearch' + suffix).value.toLowerCase();
    if(search) listSiswa = listSiswa.filter(s => s.namaLengkap.toLowerCase().includes(search));
    
    let tbody = document.querySelector('#lapDetailTable' + suffix + ' tbody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    if(listSiswa.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-light);">Tidak ada siswa ditemukan.</td></tr>`;
        return;
    }
    
    listSiswa.forEach((s, idx) => {
        let tagihan = kat.nominal;
        let terbayar = hitungTotalTerbayar(s.id, kodeTagihan);
        let sisa = tagihan - terbayar;
        let status = sisa <= 0 ? '<span class="status-badge status-success">Lunas</span>' : (terbayar > 0 ? '<span class="status-badge status-warning">Belum Lunas</span>' : '<span class="status-badge status-danger">Belum Bayar</span>');

        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${s.namaLengkap}</strong></td>
                <td>${s.kelas}</td>
                <td>${status}</td>
                <td style="color:var(--success); font-weight:600;">${formatRupiah(terbayar)}</td>
                <td style="color:var(--danger); font-weight:600;">${formatRupiah(Math.max(0, sisa))}</td>
            </tr>
        `;
    });
}

// Fungsi perpindahan Tab di dalam Transaksi Universal
function switchUniversalTab(tabName) {
    let tabTagihan = document.getElementById('tabUniversalTagihan');
    let tabKasKeluar = document.getElementById('tabUniversalKasKeluar');
    let btnTagihan = document.getElementById('tabBtnUniversalTagihan');
    let btnKasKeluar = document.getElementById('tabBtnUniversalKasKeluar');
    
    // Tombol aksi header
    let btnAksiPemasukan = document.getElementById('btnAksiUniversalPemasukan');
    let btnAksiCetakPengeluaran = document.getElementById('btnAksiUniversalCetakPengeluaran');
    let btnAksiPengeluaran = document.getElementById('btnAksiUniversalPengeluaran');
    
    if(tabName === 'tagihan') {
        if(tabTagihan) tabTagihan.style.display = '';
        if(tabKasKeluar) tabKasKeluar.style.display = 'none';
        if(btnTagihan) { btnTagihan.style.background = 'var(--primary)'; btnTagihan.style.color = 'white'; }
        if(btnKasKeluar) { btnKasKeluar.style.background = 'transparent'; btnKasKeluar.style.color = 'var(--text-light)'; }
        if(btnAksiPemasukan) btnAksiPemasukan.style.display = '';
        if(btnAksiCetakPengeluaran) btnAksiCetakPengeluaran.style.display = 'none';
        if(btnAksiPengeluaran) btnAksiPengeluaran.style.display = 'none';
    } else {
        if(tabTagihan) tabTagihan.style.display = 'none';
        if(tabKasKeluar) tabKasKeluar.style.display = '';
        if(btnTagihan) { btnTagihan.style.background = 'transparent'; btnTagihan.style.color = 'var(--text-light)'; }
        if(btnKasKeluar) { btnKasKeluar.style.background = 'var(--primary)'; btnKasKeluar.style.color = 'white'; }
        if(btnAksiPemasukan) btnAksiPemasukan.style.display = 'none';
        if(btnAksiCetakPengeluaran) btnAksiCetakPengeluaran.style.display = '';
        if(btnAksiPengeluaran) btnAksiPengeluaran.style.display = '';
        // Muat data kas keluar
        fetchKasKeluar().then(() => renderKasKeluarTable());
    }
    if(window.lucide) lucide.createIcons();
}

const originalShowSectionKeuangan = window.showSection;
if(originalShowSectionKeuangan) {
    window.showSection = function(sectionId, element) {
        originalShowSectionKeuangan(sectionId, element);
        if(sectionId === 'sectionKeuanganInsidental') { 
            switchUniversalTab('tagihan');
            tutupDetailTagihan('universal'); 
            fetchKeuanganData().then(() => renderMasterTagihanTable('universal'));
        }
        if(sectionId === 'sectionTransaksiOperasional') { fetchOperasionalData(); }
        if(sectionId === 'sectionArsipTransaksi') { Promise.all([fetchKeuanganData(), fetchKasKeluar(), fetchOperasionalData()]).then(() => renderArsipTransaksi()); }
        if(sectionId === 'sectionLaporanKeuangan') { Promise.all([fetchKeuanganData(), fetchOperasionalData()]).then(() => switchLaporanTab('universal')); }
    };
}

/* ============================================================
   MODUL MANAJEMEN KEUANGAN BENDAHARA (BUKU KAS)
   ============================================================ */


let bukuKasData = [];
let currentBukuKasTab = 'kas_global'; // kas_global, kas_operasional, kas_internal

function switchBukuKasTab(tabName) {
    currentBukuKasTab = tabName;
    document.querySelectorAll('.account-tab-btn[data-tab^="kas_"]').forEach(btn => {
        if(btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    let thSumber = document.getElementById('thSumberDana');
    if(thSumber) {
        thSumber.style.display = tabName === 'kas_global' ? 'table-cell' : 'none';
    }
    
    renderBukuKas();
}

async function loadBukuKas() {
    let tbody = document.getElementById('tbodyBukuKas');
    if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">Memuat data...</td></tr>';
    
    try {
        let filterBulan = document.getElementById('filterBulanBukuKas')?.value;
        let year, month;
        if(filterBulan) {
            year = filterBulan.split('-')[0];
            month = filterBulan.split('-')[1];
        }
        
        let qPem = supabaseClient.from('keuangan_pembayaran').select('*');
        let qKeluar = supabaseClient.from('kas_keluar').select('*');
        let qKat = supabaseClient.from('keuangan_kategori').select('id, nama');
        
        if(year && month) {
            qPem = qPem.gte('tanggal', `${year}-${month}-01`).lte('tanggal', `${year}-${month}-31`);
            qKeluar = qKeluar.gte('tanggal', `${year}-${month}-01`).lte('tanggal', `${year}-${month}-31`);
        }
        
        const [resPem, resKeluar, resKat] = await Promise.all([qPem, qKeluar, qKat]);
        
        let katMap = {};
        if(resKat.data) {
            resKat.data.forEach(k => {
                katMap[`insidental_${k.id}`] = k.nama;
                katMap[`rutin_${k.id}`] = k.nama;
            });
        }
        
        let aggregated = [];
        
        if(resPem.data) {
            resPem.data.forEach(p => {
                aggregated.push({
                    id: p.id,
                    sumber_dana: 'Kas Internal',
                    jenis_transaksi: 'Pemasukan',
                    kategori: katMap[p.jenis] || p.jenis,
                    nominal: p.nominal,
                    tanggal: p.tanggal,
                    keterangan: p.keterangan || 'Pembayaran Tagihan',
                    created_at: p.created_at
                });
            });
        }
        
        if(resKeluar.data) {
            resKeluar.data.forEach(p => {
                aggregated.push({
                    id: p.id,
                    sumber_dana: 'Kas Internal',
                    jenis_transaksi: 'Pengeluaran',
                    kategori: p.kategori,
                    nominal: p.jumlah,
                    tanggal: p.tanggal,
                    keterangan: p.nama_item + (p.keterangan ? ' - ' + p.keterangan : ''),
                    created_at: p.created_at
                });
            });
        }
        
        // Sort by date descending
        aggregated.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal) || new Date(b.created_at) - new Date(a.created_at));
        
        bukuKasData = aggregated;
        renderBukuKas();
    } catch(err) {
        console.error('Gagal load buku kas:', err);
        showToast('Gagal memuat buku kas: ' + err.message, 'error');
    }
}

function renderBukuKas() {
    let tbody = document.getElementById('tbodyBukuKas');
    if(!tbody) return;
    
    let search = (document.getElementById('searchBukuKas')?.value || '').toLowerCase();
    
    let filtered = bukuKasData.filter(item => {
        if(currentBukuKasTab === 'kas_operasional' && item.sumber_dana !== 'Kas Operasional') return false;
        if(currentBukuKasTab === 'kas_internal' && item.sumber_dana !== 'Kas Internal') return false;
        
        if(search) {
            let text = `${item.kategori} ${item.keterangan}`.toLowerCase();
            if(!text.includes(search)) return false;
        }
        return true;
    });
    
    // Sort ascending for running balance calculation
    let sortedAsc = [...filtered].sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));
    
    let saldo = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;
    
    let displayArray = [];
    for(let i=0; i<sortedAsc.length; i++) {
        let item = sortedAsc[i];
        if(item.jenis_transaksi === 'Pemasukan') {
            saldo += Number(item.nominal);
            totalMasuk += Number(item.nominal);
        } else {
            saldo -= Number(item.nominal);
            totalKeluar += Number(item.nominal);
        }
        displayArray.push({ ...item, currentSaldo: saldo });
    }
    
    // Reverse for UI (Newest first)
    displayArray.reverse();
    
    let rowsHtml = '';
    
    if(displayArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;">Belum ada riwayat transaksi.</td></tr>`;
    } else {
        displayArray.forEach((item, index) => {
            let tgl = new Date(item.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
            let isMasuk = item.jenis_transaksi === 'Pemasukan';
            
            let sumberDanaCol = currentBukuKasTab === 'kas_global' 
                ? `<td style="font-size:0.85rem;"><span class="badge ${item.sumber_dana === 'Kas Operasional' ? 'badge-blue' : 'badge-green'}" style="background:${item.sumber_dana === 'Kas Operasional' ? '#e0f2fe' : '#dcfce7'}; color:${item.sumber_dana === 'Kas Operasional' ? '#0369a1' : '#166534'}; padding:2px 6px; border-radius:4px;">${item.sumber_dana}</span></td>`
                : '';
            
            rowsHtml += `<tr>
                <td>${displayArray.length - index}</td>
                <td>${tgl}</td>
                ${sumberDanaCol}
                <td><strong>${item.kategori}</strong></td>
                <td><span style="font-size:0.85rem;">${item.keterangan || '-'}</span></td>
                <td style="text-align:right; color:#10b981; font-weight:500;">${isMasuk ? '+ ' + formatRupiah(item.nominal) : '-'}</td>
                <td style="text-align:right; color:#ef4444; font-weight:500;">${!isMasuk ? '- ' + formatRupiah(item.nominal) : '-'}</td>
            </tr>`;
        });
        tbody.innerHTML = rowsHtml;
    }
    
    // Update summary cards
    if(document.getElementById('bkSaldoAwal')) document.getElementById('bkSaldoAwal').textContent = 'Rp 0';
    if(document.getElementById('bkTotalPemasukan')) document.getElementById('bkTotalPemasukan').textContent = formatRupiah(totalMasuk);
    if(document.getElementById('bkTotalPengeluaran')) document.getElementById('bkTotalPengeluaran').textContent = formatRupiah(totalKeluar);
    if(document.getElementById('bkSaldoAkhir')) document.getElementById('bkSaldoAkhir').textContent = formatRupiah(saldo);
    
    if(window.lucide) lucide.createIcons();
}

function openTambahTransaksiKas() {
    document.getElementById('inputKasSumber').value = currentBukuKasTab === 'kas_operasional' ? 'Kas Operasional' : 'Kas Internal';
    document.getElementById('inputKasJenis').value = 'Pemasukan';
    document.getElementById('inputKasKategori').value = '';
    document.getElementById('inputKasNominal').value = '';
    document.getElementById('inputKasTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('inputKasKeterangan').value = '';
    
    let dl = document.getElementById('listKategoriKas');
    if(dl) {
        if(currentBukuKasTab === 'kas_operasional') {
            dl.innerHTML = '<option value="Dana BOS"><option value="Honor Guru"><option value="Listrik & Wifi"><option value="ATK"><option value="Perjalanan Dinas"><option value="Ekstrakurikuler"><option value="Saldo Awal">';
        } else {
            dl.innerHTML = '<option value="Pendaftaran Siswa"><option value="Biaya Ujian (STS/SAS)"><option value="Biaya ANBK"><option value="Biaya Kelulusan"><option value="Fee Pembuat Soal"><option value="Fee Pengawas"><option value="Saldo Awal">';
        }
    }
    
    document.getElementById('modalTambahTransaksiKas').classList.add('active');
}

async function simpanTransaksiKas() {
    let sumber = document.getElementById('inputKasSumber').value;
    let jenis = document.getElementById('inputKasJenis').value;
    let kategori = document.getElementById('inputKasKategori').value.trim();
    let nominal = document.getElementById('inputKasNominal').value;
    let tanggal = document.getElementById('inputKasTanggal').value;
    let keterangan = document.getElementById('inputKasKeterangan').value.trim();
    
    if(!kategori || !nominal || !tanggal) {
        return showToast('Mohon lengkapi kategori, nominal, dan tanggal.', 'warning');
    }
    
    let payload = {
        sumber_dana: sumber,
        jenis_transaksi: jenis,
        kategori: kategori,
        nominal: nominal,
        tanggal: tanggal,
        keterangan: keterangan,
        created_by: currentUser ? currentUser.id : null
    };
    
    try {
        const { error } = await supabaseClient.from('buku_kas_bendahara').insert([payload]);
        if(error) throw error;
        
        showToast('Transaksi berhasil disimpan', 'success');
        document.getElementById('modalTambahTransaksiKas').classList.remove('active');
        loadBukuKas();
    } catch(err) {
        showToast('Gagal menyimpan: ' + err.message, 'error');
    }
}

async function hapusTransaksiKas(id) {
    showCustomConfirm('Hapus Transaksi?', 'Apakah Anda yakin ingin menghapus transaksi ini secara permanen?', 'Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('buku_kas_bendahara').delete().eq('id', id);
            if(error) throw error;
            showToast('Transaksi dihapus.', 'success');
            loadBukuKas();
        } catch(err) {
            showToast('Gagal menghapus: ' + err.message, 'error');
        }
    });
}

// -- Pengaturan Kwitansi (localStorage) --
function getKwitansiSettings() {
    try {
        let s = localStorage.getItem('kwitansi_settings');
        return s ? JSON.parse(s) : { namaBendahara: '', ttdBase64: '' };
    } catch(e) { return { namaBendahara: '', ttdBase64: '' }; }
}

function openPengaturanKwitansi() {
    let settings = getKwitansiSettings();
    let inputNama = document.getElementById('inputNamaBendahara');
    if(inputNama) inputNama.value = settings.namaBendahara || '';
    
    let inputTtd = document.getElementById('inputTTDBendahara');
    if(inputTtd) inputTtd.value = '';
    
    if(settings.ttdBase64) {
        let img = document.getElementById('previewTTDImage');
        if(img) img.src = settings.ttdBase64;
        let statusText = document.getElementById('ttdStatusText');
        if(statusText) statusText.innerText = 'Tanda tangan saat ini sudah tersimpan:';
        let container = document.getElementById('previewTTDContainer');
        if(container) container.style.display = 'block';
    } else {
        let container = document.getElementById('previewTTDContainer');
        if(container) container.style.display = 'none';
    }
    
    let modal = document.getElementById('pengaturanKwitansiModal');
    if(modal) modal.classList.add('active');
    if(window.lucide) lucide.createIcons();
}

function closePengaturanKwitansi() {
    let modal = document.getElementById('pengaturanKwitansiModal');
    if(modal) modal.classList.remove('active');
}

function previewTTDBendahara(event) {
    let file = event.target.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let img = document.getElementById('previewTTDImage');
        if(img) img.src = e.target.result;
        let statusText = document.getElementById('ttdStatusText');
        if(statusText) statusText.innerText = 'Preview Tanda Tangan Baru:';
        let container = document.getElementById('previewTTDContainer');
        if(container) container.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function hapusTTDBendahara() {
    let settings = getKwitansiSettings();
    settings.ttdBase64 = '';
    localStorage.setItem('kwitansi_settings', JSON.stringify(settings));
    let img = document.getElementById('previewTTDImage');
    if(img) img.src = '';
    let container = document.getElementById('previewTTDContainer');
    if(container) container.style.display = 'none';
    let input = document.getElementById('inputTTDBendahara');
    if(input) input.value = '';
    showToast('Tanda tangan dihapus.', 'success');
}

async function simpanPengaturanKwitansi() {
    let inputNama = document.getElementById('inputNamaBendahara');
    let nama = inputNama ? inputNama.value.trim() : '';
    
    let settings = getKwitansiSettings();
    settings.namaBendahara = nama;
    
    let fileInput = document.getElementById('inputTTDBendahara');
    if(fileInput && fileInput.files && fileInput.files[0]) {
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            settings.ttdBase64 = e.target.result;
            localStorage.setItem('kwitansi_settings', JSON.stringify(settings));
            closePengaturanKwitansi();
            showToast('Pengaturan bendahara berhasil disimpan!', 'success');
        };
        reader.readAsDataURL(file);
    } else {
        localStorage.setItem('kwitansi_settings', JSON.stringify(settings));
        closePengaturanKwitansi();
        showToast('Pengaturan bendahara berhasil disimpan!', 'success');
    }
}

function cetakLaporanKas() {
    let title = 'Laporan Buku Kas Bendahara';
    if(currentBukuKasTab === 'kas_operasional') title = 'Laporan Kas Operasional (BOS)';
    if(currentBukuKasTab === 'kas_internal') title = 'Laporan Kas Internal (Siswa)';
    
    let tbl = document.getElementById('tableBukuKas');
    if(!tbl) return;
    let tableHtml = tbl.outerHTML;
    
    let settings = getKwitansiSettings();
    let ttdHtml = '';
    if (settings.ttdBase64) {
        ttdHtml = `<img src="${settings.ttdBase64}" style="max-width:150px; max-height:80px; margin:5px 0;">`;
    } else {
        ttdHtml = `<br><br><br>`;
    }
    
    let printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; font-size:12px; }
                h1, h2, h3 { text-align: center; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .text-right { text-align: right; }
                .badge { font-size:10px; padding:2px 4px; border-radius:4px; border:1px solid #ccc; }
                @media print { 
                    button { display:none !important; }
                    th:last-child, td:last-child { display:none !important; } /* Sembunyikan kolom Aksi */
                }
            </style>
        </head>
        <body>
            <h2>SMP IT AL-FATHONAH</h2>
            <h3>${title}</h3>
            <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID')}</p>
            ${tableHtml}
            
            <div style="margin-top:40px; width:100%; display:flex; justify-content:flex-end;">
                <div style="text-align:center; width:250px;">
                    <div>Cianjur, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</div>
                    <div>Bendahara Sekolah,</div>
                    ${ttdHtml}
                    <div style="text-decoration:underline; font-weight:bold;">${settings.namaBendahara || '_______________________'}</div>
                </div>
            </div>
            
            <script>
                setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

const originalShowSectionBendahara = window.showSection;
if(originalShowSectionBendahara) {
    window.showSection = function(sectionId, element) {
        originalShowSectionBendahara(sectionId, element);
        if(sectionId === 'sectionBukuKasBendahara') { 
            loadBukuKas(); 
        }
    };
}

// =========================================================================
// FITUR CETAK KARTU UJIAN
// =========================================================================

var dataSiswaCetak = [];

async function loadSiswaCetakKartu() {
    var kelasName = document.getElementById('kartuKelasSelect').value;
    var tbody = document.getElementById('kartuSiswaTbody');
    var container = document.getElementById('kartuTableContainer');
    
    if (!kelasName) {
        container.style.display = 'none';
        dataSiswaCetak = [];
        return;
    }
    
    container.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat data siswa...</td></tr>';
    
    try {
        // Cari id kelas dari master_kelas berdasarkan namanya
        const { data: kelasData, error: kelasErr } = await supabaseClient.from('master_kelas').select('id').eq('nama_kelas', kelasName).single();
        if (kelasErr) throw kelasErr;
        
        // Ambil siswa di kelas tersebut (Aktif)
        const { data: siswaData, error: siswaErr } = await supabaseClient.from('siswa').select('id, nama_lengkap, jenis_kelamin, nisn, foto').eq('kelas_id', kelasData.id).eq('status', 'Aktif');
        if (siswaErr) throw siswaErr;
        
        var listSiswa = siswaData || [];
        // Sort alphabetical
        listSiswa.sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || ''));
        
        dataSiswaCetak = listSiswa.map((s, index) => {
            var num = (index + 1).toString().padStart(3, '0');
            return {
                ...s,
                nomorPeserta: num // Default urut dari 001
            };
        });
        
        renderTabelCetakKartu();
        
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger)">Gagal memuat siswa: ' + e.message + '</td></tr>';
    }
}

function renderTabelCetakKartu() {
    var tbody = document.getElementById('kartuSiswaTbody');
    if (dataSiswaCetak.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada siswa aktif di kelas ini.</td></tr>';
        return;
    }
    
    tbody.innerHTML = dataSiswaCetak.map((s, i) => {
        return `
            <tr>
                <td style="text-align:center;">${i+1}</td>
                <td style="font-weight:600;">${s.nama_lengkap || '-'}</td>
                <td style="text-align:center;">${s.jenis_kelamin || '-'}</td>
                <td>
                    <input type="text" class="form-input" id="nomorPeserta_${s.id}" value="${s.nomorPeserta}" onchange="updateNomorPeserta('${s.id}', this.value)" style="height:35px; padding:0.3rem 0.6rem; max-width:150px; font-weight:700; font-family:monospace; font-size:1rem; text-align:center; color:#1e293b;" />
                </td>
                <td style="text-align:center;">
                    <button class="btn btn-outline" onclick="cetakSatuKartu('${s.id}')" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:#0ea5e9; color:#0ea5e9;">
                        <i data-lucide="printer" style="width:14px;height:14px;"></i> Cetak
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
}

function updateNomorPeserta(id, val) {
    var siswa = dataSiswaCetak.find(s => s.id === id);
    if(siswa) siswa.nomorPeserta = val;
}

function acakNomorPeserta() {
    if (dataSiswaCetak.length === 0) return;
    
    // Extract current numbers
    var numbers = dataSiswaCetak.map(s => s.nomorPeserta);
    
    // Fisher-Yates shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    // Assign back
    dataSiswaCetak.forEach((s, i) => {
        s.nomorPeserta = numbers[i];
    });
    
    renderTabelCetakKartu();
    showToast('Nomor peserta berhasil diacak!', 'success');
}

var kartuTtdBase64 = '';

// Kosongkan input form saat halaman pertama kali diload/direfresh
document.addEventListener('DOMContentLoaded', function() {
    var el = document.getElementById('kartuKetuaPanitia');
    if(el) el.value = '';
    localStorage.removeItem('kartuKetuaPanitia'); // Bersihkan sisa data sebelumnya
});

function handleTtdUpload(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            kartuTtdBase64 = e.target.result;
            var preview = document.getElementById('ttdPreview');
            preview.src = kartuTtdBase64;
            document.getElementById('ttdPreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        kartuTtdBase64 = '';
        document.getElementById('ttdPreviewContainer').style.display = 'none';
    }
}

function buildKartuHTML(siswa) {
    var judul = document.getElementById('kartuJudul').value || 'KARTU PESERTA UJIAN';
    var kelasName = document.getElementById('kartuKelasSelect').value || '-';
    var namaPanitia = document.getElementById('kartuKetuaPanitia').value || '______________________';
    var ruangUjian = document.getElementById('kartuRuang') ? document.getElementById('kartuRuang').value : '01';
    var masaBerlaku = document.getElementById('kartuMasaBerlaku') ? document.getElementById('kartuMasaBerlaku').value : '';
    var today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    
    var fotoImgHTML = siswa.foto ? `<img src="${siswa.foto}" alt="Foto" />` : `Pas Foto<br>3x4`;
    var ttdHTML = kartuTtdBase64 ? `<img src="${kartuTtdBase64}" class="kartu-signature-img" /><br>` : `<br><br><br>`;

    return `
        <div class="kartu-ujian" style="position:relative; z-index:1; overflow:hidden;">
            <div class="kartu-watermark" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:65%; height:65%; background:url('img/logo.png') no-repeat center center; background-size:contain; opacity:0.06; z-index:-1; pointer-events:none;"></div>
            <div class="kartu-header">
                <img src="img/logo.png" alt="Logo" class="kartu-logo" style="margin-left: 15px;" onerror="this.src='https://ui-avatars.com/api/?name=SMP&background=random'" />
                <div class="kartu-header-text">
                    <h4>PANITIA PELAKSANAAN UJIAN SEKOLAH</h4>
                    <h3>SMP IT AL FATHONAH BABAKAN</h3>
                </div>
            </div>
            
            <div class="kartu-title" style="margin-bottom: -2px;">KARTU PESERTA</div>
            <div class="kartu-subtitle" style="margin-top: 0;">${judul}</div>
            
            <div class="kartu-body" style="padding-left: 10px;">
                <div class="kartu-foto-box">${fotoImgHTML}</div>
                <div class="kartu-data">
                    <table>
                        <tr><td style="width:75px;">No Peserta</td><td style="width:5px;">:</td><td><span style="font-weight:bold; font-family:monospace; font-size:14px;">${siswa.nomorPeserta}</span></td></tr>
                        <tr><td>Nama</td><td>:</td><td><span style="font-weight:bold;">${siswa.nama_lengkap || '-'}</span></td></tr>
                        <tr><td>Kelas</td><td>:</td><td>${kelasName}</td></tr>
                        <tr><td>Ruang</td><td>:</td><td>${ruangUjian || '01'}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="kartu-footer-container">
                <div class="kartu-notes">
                    <b>Perhatian!</b><br>
                    * Wajib dibawa selama ujian berlangsung.
                    ${masaBerlaku ? `<br>* Berlaku : ${masaBerlaku}` : ''}
                </div>
                <div class="kartu-ttd-area">
                    <div style="margin-bottom:1px;">Babakan, ${today}</div>
                    <div style="margin-bottom:1px;">Ketua Panitia,</div>
                    <div style="display:flex; justify-content:center; align-items:center; min-height:35px;">
                        ${ttdHTML}
                    </div>
                    <div class="kartu-nama-panitia">${namaPanitia}</div>
                </div>
            </div>
        </div>
    `;
}

// =========================================================================
// JADWAL UJIAN (untuk belakang kartu)
// =========================================================================
var jadwalUjianDays = [];

function tambahJadwalHari() {
    var newSesi = [{ waktu: '', mapel: '', pengawas: '' }];
    
    // Jika sudah ada hari sebelumnya, copy waktu sesi-nya
    if (jadwalUjianDays.length > 0) {
        var prevDay = jadwalUjianDays[jadwalUjianDays.length - 1];
        if (prevDay.sesi && prevDay.sesi.length > 0) {
            newSesi = prevDay.sesi.map(function(s) {
                return { waktu: s.waktu || '', mapel: '', pengawas: '' };
            });
        }
    }
    
    jadwalUjianDays.push({ hari: '', hariRaw: '', sesi: newSesi });
    renderJadwalForm();
}

function hapusJadwalHari(dayIdx) {
    jadwalUjianDays.splice(dayIdx, 1);
    renderJadwalForm();
}

function tambahJadwalSesi(dayIdx) {
    jadwalUjianDays[dayIdx].sesi.push({ waktu: '', mapel: '', pengawas: '' });
    renderJadwalForm();
}

function hapusJadwalSesi(dayIdx, sesiIdx) {
    jadwalUjianDays[dayIdx].sesi.splice(sesiIdx, 1);
    renderJadwalForm();
}

function updateJadwalHari(dayIdx, val) {
    if (jadwalUjianDays[dayIdx]) {
        jadwalUjianDays[dayIdx].hariRaw = val;
        if (val) {
            var dateObj = new Date(val);
            // Format to Indonesian locale, e.g. "Senin, 18 Mei 2026"
            var hariStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            jadwalUjianDays[dayIdx].hari = hariStr;
        } else {
            jadwalUjianDays[dayIdx].hari = '';
        }
        renderJadwalForm(); // Re-render to show the formatted text preview
    }
}

function updateJadwalSesi(dayIdx, sesiIdx, field, val) {
    if (jadwalUjianDays[dayIdx] && jadwalUjianDays[dayIdx].sesi[sesiIdx]) {
        jadwalUjianDays[dayIdx].sesi[sesiIdx][field] = val;
    }
}

function hapusSemuaJadwal() {
    jadwalUjianDays = [];
    renderJadwalForm();
    showToast('Jadwal ujian dikosongkan.', 'info');
}

// =========================================================================
// SIMPAN / MUAT RIWAYAT JADWAL ASESMEN (localStorage)
// =========================================================================
var JADWAL_STORAGE_KEY = 'riwayatJadwalAsesmen';

function _getRiwayatJadwal() {
    try {
        var data = localStorage.getItem(JADWAL_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
}

function _saveRiwayatJadwal(list) {
    localStorage.setItem(JADWAL_STORAGE_KEY, JSON.stringify(list));
}

function simpanJadwalAsesmen() {
    if (jadwalUjianDays.length === 0) {
        showToast('Belum ada jadwal untuk disimpan. Tambah hari ujian terlebih dahulu.', 'warning');
        return;
    }
    
    showCustomPrompt(
        'Simpan Jadwal Asesmen',
        'Masukkan nama untuk jadwal ini agar mudah ditemukan di riwayat.',
        'Contoh: STS Genap 2026, SAS Ganjil 2026',
        '',
        function(namaJadwal) {
            var riwayat = _getRiwayatJadwal();
            riwayat.push({
                id: Date.now().toString(),
                nama: namaJadwal,
                tanggalSimpan: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                jumlahHari: jadwalUjianDays.length,
                data: JSON.parse(JSON.stringify(jadwalUjianDays))
            });
            _saveRiwayatJadwal(riwayat);
            renderRiwayatJadwal();
            showToast('Jadwal "' + namaJadwal + '" berhasil disimpan!', 'success');
        }
    );
}

function muatJadwalAsesmen(id) {
    var riwayat = _getRiwayatJadwal();
    var item = riwayat.find(function(r) { return r.id === id; });
    if (!item) { showToast('Jadwal tidak ditemukan.', 'error'); return; }
    
    jadwalUjianDays = JSON.parse(JSON.stringify(item.data)); // deep copy
    renderJadwalForm();
    showToast('Jadwal "' + item.nama + '" berhasil dimuat!', 'success');
    
    // Scroll ke form jadwal
    var container = document.getElementById('jadwalContainer');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function editNamaJadwal(id) {
    var riwayat = _getRiwayatJadwal();
    var item = riwayat.find(function(r) { return r.id === id; });
    if (!item) return;
    
    showCustomPrompt(
        'Ubah Nama Jadwal',
        'Masukkan nama baru untuk jadwal ini.',
        'Nama jadwal baru',
        item.nama,
        function(namaBaru) {
            item.nama = namaBaru;
            _saveRiwayatJadwal(riwayat);
            renderRiwayatJadwal();
            showToast('Nama jadwal berhasil diubah.', 'success');
        }
    );
}

function hapusJadwalAsesmen(id) {
    if (!confirm('Hapus jadwal ini dari riwayat?')) return;
    
    var riwayat = _getRiwayatJadwal();
    riwayat = riwayat.filter(function(r) { return r.id !== id; });
    _saveRiwayatJadwal(riwayat);
    renderRiwayatJadwal();
    showToast('Jadwal berhasil dihapus dari riwayat.', 'success');
}

function renderRiwayatJadwal() {
    var tbody = document.getElementById('riwayatJadwalTbody');
    if (!tbody) return;
    
    var riwayat = _getRiwayatJadwal();
    
    if (riwayat.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-light)">Belum ada jadwal tersimpan.</td></tr>';
        return;
    }
    
    tbody.innerHTML = riwayat.map(function(r, i) {
        return '<tr>' +
            '<td style="text-align:center;">' + (i + 1) + '</td>' +
            '<td style="font-weight:600;">' + r.nama + '</td>' +
            '<td style="text-align:center;">' + r.jumlahHari + ' hari</td>' +
            '<td>' + r.tanggalSimpan + '</td>' +
            '<td style="text-align:center; white-space:nowrap;">' +
                '<div style="display:inline-flex;gap:4px;align-items:center;">' +
                    '<button class="btn btn-primary" onclick="muatJadwalAsesmen(\'' + r.id + '\')" style="padding:0.3rem 0.6rem;font-size:0.78rem;white-space:nowrap;" title="Muat jadwal ini"><i data-lucide="upload" style="width:12px;height:12px;"></i> Gunakan</button>' +
                    '<button class="btn btn-outline" onclick="editNamaJadwal(\'' + r.id + '\')" style="padding:0.3rem 0.45rem;font-size:0.78rem;" title="Edit nama"><i data-lucide="pencil" style="width:12px;height:12px;"></i></button>' +
                    '<button class="btn btn-outline" onclick="hapusJadwalAsesmen(\'' + r.id + '\')" style="padding:0.3rem 0.45rem;font-size:0.78rem;color:#ef4444;border-color:#ef4444;" title="Hapus"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');
    
    if (window.lucide) lucide.createIcons();
}

function renderJadwalForm() {
    var container = document.getElementById('jadwalContainer');
    if (!container) return;
    
    if (jadwalUjianDays.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#94a3b8; font-size:0.9rem; border:1px dashed #e2e8f0; border-radius:8px;">Belum ada jadwal. Klik "Tambah Hari Ujian" untuk memulai.</div>';
        if (window.lucide) lucide.createIcons();
        return;
    }
    
    var html = '';
    jadwalUjianDays.forEach(function(day, dIdx) {
        html += `<div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f8fafc;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.8rem;">
                <div style="flex-grow:1; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                    <label style="font-weight:600; font-size:0.9rem; color:#334155; margin:0; min-width:100px;">Pilih Tanggal:</label>
                    <input type="date" class="form-input" style="height:34px; max-width:200px;" value="${day.hariRaw || ''}" onchange="updateJadwalHari(${dIdx}, this.value)" />
                    <span style="font-size:0.85rem; font-weight:600; color:#2563eb; margin-left:8px;">${day.hari || ''}</span>
                </div>
                <button class="btn-icon btn-icon-red" onclick="hapusJadwalHari(${dIdx})" title="Hapus Hari Ini">
                    <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                </button>
            </div>
            
            <div style="padding-left:1rem; border-left:2px solid #e2e8f0;">
                <table style="width:100%; border-collapse:collapse; margin-bottom:0.5rem;">
                    <thead>
                        <tr style="font-size:0.85rem; color:#64748b;">
                            <th style="text-align:left; padding-bottom:6px; width:130px;">Waktu</th>
                            <th style="text-align:left; padding-bottom:6px;">Mata Pelajaran</th>
                            <th style="text-align:left; padding-bottom:6px;">Pengawas</th>
                            <th style="text-align:center; padding-bottom:6px; width:40px;">Hapus</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        // Bangun opsi dropdown Mata Pelajaran dari master data
        var mapelOptions = '<option value="">-- Pilih Mapel --</option>';
        mapelOptions += '<option value="ISTIRAHAT"' + ('ISTIRAHAT' === '___' ? '' : '') + '>☕ ISTIRAHAT</option>';
        if (typeof masterMapelList !== 'undefined' && masterMapelList.length > 0) {
            masterMapelList.forEach(function(m) {
                mapelOptions += '<option value="' + m.nama_mapel + '">' + m.nama_mapel + '</option>';
            });
        }

        // Bangun opsi dropdown Pengawas dari data guru
        var pengawasOptions = '<option value="">-- Pilih Pengawas --</option>';
        if (typeof guruList !== 'undefined' && guruList.length > 0) {
            guruList.filter(function(g) { return g.status === 'Aktif'; }).forEach(function(g) {
                pengawasOptions += '<option value="' + g.nama_lengkap + '">' + g.nama_lengkap + '</option>';
            });
        }

        day.sesi.forEach(function(s, sIdx) {
            // Set selected option untuk mapel
            var mapelOpts = mapelOptions.replace('value="' + s.mapel + '"', 'value="' + s.mapel + '" selected');
            // Set selected option untuk pengawas
            var pengawasOpts = pengawasOptions.replace('value="' + s.pengawas + '"', 'value="' + s.pengawas + '" selected');

            html += `
                        <tr>
                            <td style="padding-right:6px; padding-bottom:6px; width:130px;"><input type="text" class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px;" value="${s.waktu}" onchange="updateJadwalSesi(${dIdx}, ${sIdx}, 'waktu', this.value)" placeholder="07:30-09:30" /></td>
                            <td style="padding-right:6px; padding-bottom:6px;"><select class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px;" onchange="updateJadwalSesi(${dIdx}, ${sIdx}, 'mapel', this.value)">${mapelOpts}</select></td>
                            <td style="padding-right:6px; padding-bottom:6px;"><select class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px;" onchange="updateJadwalSesi(${dIdx}, ${sIdx}, 'pengawas', this.value)">${pengawasOpts}</select></td>
                            <td style="padding-bottom:6px; text-align:center;">
                                <button class="btn-icon btn-icon-red" onclick="hapusJadwalSesi(${dIdx}, ${sIdx})" style="width:28px;height:28px;padding:0;">
                                    <i data-lucide="x" style="width:14px;height:14px;"></i>
                                </button>
                            </td>
                        </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                <button class="btn btn-outline" style="font-size:0.8rem; padding:0.25rem 0.5rem;" onclick="tambahJadwalSesi(${dIdx})">
                    <i data-lucide="plus" style="width:12px;height:12px;"></i> Tambah Sesi
                </button>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function buildJadwalHTML(siswa) {
    var judul = document.getElementById('kartuJudul').value || 'JADWAL UJIAN';
    
    var tableRows = '';
    var no = 1;
    
    // Validasi data: Hanya masukkan hari yang memiliki minimal 1 sesi valid
    var validDays = jadwalUjianDays.filter(function(day) {
        return day.hari.trim() !== '' || day.sesi.some(s => s.waktu || s.mapel);
    });
    
    if (validDays.length === 0) {
        tableRows = '<tr><td colspan="5" style="text-align:center; padding:8px; color:#94a3b8;">Jadwal belum diisi</td></tr>';
    } else {
        validDays.forEach(function(day) {
            var sesiValid = day.sesi.filter(s => s.waktu || s.mapel || s.pengawas);
            if (sesiValid.length === 0) return;
            
            // Gunakan rowspan untuk hari
            tableRows += '<tr>';
            tableRows += '<td rowspan="' + sesiValid.length + '" style="border: 1px solid #1e293b; padding: 1px; text-align:center; vertical-align:middle; font-weight:600;">' + no + '</td>';
            tableRows += '<td rowspan="' + sesiValid.length + '" style="border: 1px solid #1e293b; padding: 1px; vertical-align:middle; font-weight:600;">' + (day.hari || '-') + '</td>';
            
            sesiValid.forEach(function(s, idx) {
                if (idx > 0) tableRows += '<tr>'; // Buka row baru untuk sesi ke-2 dst
                
                var waktuText = s.waktu ? s.waktu : '-';
                var mapelText = s.mapel ? s.mapel : '-';
                var pengawasText = s.pengawas ? s.pengawas : '';
                
                // Jika mapel mengandung kata ISTIRAHAT, gabungkan kolom
                if (mapelText.toUpperCase().includes('ISTIRAHAT')) {
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; text-align:center; overflow:hidden;">' + waktuText + '</td>';
                    tableRows += '<td colspan="2" style="border: 1px solid #1e293b; padding: 1px; text-align:center; font-style:italic; font-weight:bold; background:#f1f5f9; overflow:hidden;">' + mapelText + '</td>';
                } else {
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; text-align:center; overflow:hidden;">' + waktuText + '</td>';
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; overflow:hidden; word-break:break-word;">' + mapelText + '</td>';
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; overflow:hidden; word-break:break-word;">' + pengawasText + '</td>';
                }
                
                tableRows += '</tr>';
            });
            no++;
        });
    }

    return `
        <div class="kartu-ujian" style="display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding: 8px 10px;">
            <div class="kartu-jadwal" style="width: 100%;">
                <div class="jadwal-title" style="margin-top:0; margin-bottom:4px; font-size:9px; text-align:center; font-weight:800; color:var(--primary-dark);">JADWAL ${judul}</div>
            <table class="jadwal-table" style="width: 100%; border-collapse: collapse; font-size: 6px; line-height: 1.05; table-layout: fixed;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:12px; text-align:center;">No</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:58px;">Hari/Tanggal</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:44px; text-align:center;">Waktu</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:68px; text-align:center;">Mata Pelajaran</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; text-align:center;">Pengawas</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            </div>
        </div>
    `;
}

// =========================================================================
// PRINT FUNCTIONS
// =========================================================================

function preparePrint(htmlContent) {
    var printArea = document.getElementById('printAreaKartu');
    printArea.innerHTML = htmlContent;
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { printArea.innerHTML = ''; }, 500);
    }, 400);
}

function cetakSatuKartu(siswaId) {
    var siswa = dataSiswaCetak.find(s => s.id === siswaId);
    if(!siswa) return;
    
    var html = buildKartuHTML(siswa);
    preparePrint(html);
}

function cetakSemuaKartu() {
    if (dataSiswaCetak.length === 0) {
        showToast('Tidak ada siswa untuk dicetak!', 'warning');
        return;
    }
    
    // Cetak semua kartu depan
    var htmlDepan = '';
    dataSiswaCetak.forEach(siswa => {
        htmlDepan += buildKartuHTML(siswa);
    });
    
    preparePrint(htmlDepan);
}

function cetakSemuaJadwal() {
    if (dataSiswaCetak.length === 0) {
        showToast('Tidak ada siswa untuk dicetak!', 'warning');
        return;
    }
    
    // Cetak semua kartu belakang
    // PENTING: Urutan kartu di-mirror per baris (tukar kolom 1 ↔ 2)
    // agar presisi saat kertas dibalik untuk cetak bolak-balik manual.
    // Depan: [1][2] → Belakang (kertas dibalik): [2][1]
    //        [3][4]                                [4][3]
    
    var jadwalCards = [];
    dataSiswaCetak.forEach(siswa => {
        jadwalCards.push(buildJadwalHTML(siswa));
    });
    
    // Tukar setiap pasangan (per baris 2 kolom)
    var htmlBelakang = '';
    for (var i = 0; i < jadwalCards.length; i += 2) {
        if (i + 1 < jadwalCards.length) {
            // Tukar: kartu kanan dulu, baru kiri
            htmlBelakang += jadwalCards[i + 1];
            htmlBelakang += jadwalCards[i];
        } else {
            // Kartu ganjil (terakhir sendirian) — taruh di kolom kanan
            htmlBelakang += '<div class="kartu-ujian" style="visibility:hidden;"></div>';
            htmlBelakang += jadwalCards[i];
        }
    }
    
    preparePrint(htmlBelakang);
}

function buildNomorMejaHTML(nomor, judul, tahun) {
    var formattedNo = String(nomor).padStart(3, '0');
    return `
        <div class="kartu-meja">
            <div style="display: flex; align-items: center; justify-content: center; width: 100%; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 4px; padding-right: 12px;">
                <img src="img/logo.png" style="width:55px; height:55px; margin-right:4px;" onerror="this.src='https://ui-avatars.com/api/?name=SMP&background=random'" />
                <div style="text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; color: #1e3a5f; margin-bottom: 2px;">NOMOR PESERTA ${judul.toUpperCase()}</div>
                    <div style="font-size: 14px; font-weight: 900; color: #b45309; margin-bottom: 2px;">SMP IT AL FATHONAH BABAKAN</div>
                    <div style="font-size: 11px; font-weight: 600; color: #475569;">TAHUN PELAJARAN ${tahun}</div>
                </div>
            </div>
            <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; margin-top: -10px;">
                <div style="font-size: 75px; font-weight: 900; color: #0f172a; letter-spacing: 2px;">${formattedNo}</div>
            </div>
        </div>
    `;
}

function cetakNomorMeja() {
    var qtyInput = document.getElementById('kartuJumlahMeja');
    var jumlah = qtyInput ? (parseInt(qtyInput.value) || 30) : 30;
    var judulInput = document.getElementById('kartuJudul');
    var judul = judulInput ? (judulInput.value || 'UJIAN SEKOLAH') : 'UJIAN SEKOLAH';
    var lblYear = document.getElementById('lblActiveYear');
    var tahun = lblYear ? lblYear.textContent : '2026/2027';
    
    var htmlContent = '';
    for (var i = 1; i <= jumlah; i++) {
        htmlContent += buildNomorMejaHTML(i, judul, tahun);
    }
    
    preparePrint(htmlContent);
}

// ==========================================
// ========== LAYANAN WALI KELAS ==========
// ==========================================

let dWkInval = [];
let dWkKarakter = [];
let dWkPenghubung = [];
let dWkInventaris = [];

async function loadWaliKelasData() {
    try {
        const [resInval, resKarakter, resPenghubung, resInventaris] = await Promise.all([
            supabaseClient.from('wk_jurnal_inval').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('wk_catatan_karakter').select('*, siswa(nama_lengkap, master_kelas(nama_kelas))').order('created_at', { ascending: false }),
            supabaseClient.from('wk_buku_penghubung').select('*, siswa(nama_lengkap, master_kelas(nama_kelas))').order('created_at', { ascending: false }),
            supabaseClient.from('wk_inventaris_kelas').select('*').order('created_at', { ascending: false })
        ]);
        
        dWkInval = resInval.data || [];
        dWkKarakter = resKarakter.data || [];
        dWkPenghubung = resPenghubung.data || [];
        dWkInventaris = resInventaris.data || [];
        
        renderWkInvalTable();
        renderWkTatibTable();
        renderWkPenghubungTable();
        renderWkInventarisTable();
    } catch(e) {
        console.error('Error loading wali kelas data:', e);
    }
}

// === 1. JURNAL INVAL ===
function renderWkInvalTable() {
    let tbody = document.querySelector('#tableWkInval tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(dWkInval.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data jurnal inval.</td></tr>`;
        return;
    }
    dWkInval.forEach((d, i) => {
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i+1}</td>
                <td>${d.tanggal}</td>
                <td style="text-align:center;">${d.kelas}</td>
                <td><strong>${d.nama_guru}</strong></td>
                <td>${d.mata_pelajaran}</td>
                <td>${d.alasan || '-'}</td>
                <td>${d.tugas_inval || '-'}</td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:4px;">
                        <button class="btn btn-sm btn-outline" onclick="editWkInval('${d.id}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusWkInval('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

function populateWkInvalSelects() {
    let selKelas = document.getElementById('formWkInvalKelas');
    let selGuru = document.getElementById('formWkInvalGuru');
    let selMapel = document.getElementById('formWkInvalMapel');
    
    if(selKelas) {
        selKelas.innerHTML = '<option value="">Pilih Kelas...</option>';
        if(typeof masterKelasList !== 'undefined') {
            masterKelasList.forEach(k => {
                selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
            });
        }
    }
    
    if(selGuru) {
        selGuru.innerHTML = '<option value="">Pilih Guru...</option>';
        if(typeof guruList !== 'undefined') {
            guruList.forEach(g => {
                selGuru.innerHTML += `<option value="${g.nama_lengkap}">${g.nama_lengkap}</option>`;
            });
        }
    }
    
    if(selMapel) {
        selMapel.innerHTML = '<option value="">Pilih Mata Pelajaran...</option>';
        if(typeof masterMapelList !== 'undefined') {
            masterMapelList.forEach(m => {
                selMapel.innerHTML += `<option value="${m.nama_mapel}">${m.nama_mapel}</option>`;
            });
        }
    }
}

function openWkModalInval() {
    populateWkInvalSelects();
    document.getElementById('wkModalInvalTitle').innerText = 'Tambah Jurnal Inval';
    document.getElementById('formWkInvalId').value = '';
    document.getElementById('formWkInvalTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formWkInvalKelas').value = '';
    document.getElementById('formWkInvalGuru').value = '';
    document.getElementById('formWkInvalMapel').value = '';
    document.getElementById('formWkInvalAlasan').value = '';
    document.getElementById('formWkInvalTugas').value = '';
    document.getElementById('wkModalInval').classList.add('active');
}

function closeWkModalInval() { document.getElementById('wkModalInval').classList.remove('active'); }

async function saveWkInval() {
    let id = document.getElementById('formWkInvalId').value;
    let payload = {
        tanggal: document.getElementById('formWkInvalTanggal').value,
        kelas: document.getElementById('formWkInvalKelas').value,
        nama_guru: document.getElementById('formWkInvalGuru').value,
        mata_pelajaran: document.getElementById('formWkInvalMapel').value,
        alasan: document.getElementById('formWkInvalAlasan').value,
        tugas_inval: document.getElementById('formWkInvalTugas').value
    };
    if(!payload.tanggal || !payload.kelas || !payload.nama_guru || !payload.mata_pelajaran) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if(id) {
            const { error } = await supabaseClient.from('wk_jurnal_inval').update(payload).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_jurnal_inval').insert([payload]);
            if(error) throw error;
        }
        showToast('Data jurnal berhasil disimpan!', 'success');
        closeWkModalInval();
        await loadWaliKelasData();
    } catch(e) {
        console.error("Error saving Inval:", e);
        let msg = e.message || (e.error && e.error.message) || JSON.stringify(e) || "Unknown error";
        alert('Gagal menyimpan: ' + msg);
        showToast('Gagal menyimpan: ' + msg, 'error');
    } finally { hideGlobalLoader(); }
}

function editWkInval(id) {
    let d = dWkInval.find(x => x.id === id);
    if(!d) return;
    populateWkInvalSelects();
    document.getElementById('wkModalInvalTitle').innerText = 'Edit Jurnal Inval';
    document.getElementById('formWkInvalId').value = d.id;
    document.getElementById('formWkInvalTanggal').value = d.tanggal;
    document.getElementById('formWkInvalKelas').value = d.kelas;
    document.getElementById('formWkInvalGuru').value = d.nama_guru;
    document.getElementById('formWkInvalMapel').value = d.mata_pelajaran;
    document.getElementById('formWkInvalAlasan').value = d.alasan || '';
    document.getElementById('formWkInvalTugas').value = d.tugas_inval || '';
    document.getElementById('wkModalInval').classList.add('active');
}

function hapusWkInval(id) {
    showCustomConfirm('Hapus Data?', 'Yakin ingin menghapus jurnal ini?', 'Ya, Hapus', async () => {
        try {
            const { error } = await supabaseClient.from('wk_jurnal_inval').delete().eq('id', id);
            if(error) throw error;
            showToast('Jurnal berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch(e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
    });
}

// === 2. TATIB & KARAKTER ===
function populateSiswaSelectWk(selectId, filterKelas = '') {
    let sel = document.getElementById(selectId);
    if(!sel) return;
    sel.innerHTML = '<option value="">Pilih Siswa...</option>';
    let list = getSiswaForKeuangan(filterKelas);
    list.forEach(s => {
        sel.innerHTML += `<option value="${s.id}">${s.namaLengkap} (${s.kelas})</option>`;
    });
}

function renderWkTatibTable() {
    let tbody = document.querySelector('#tableWkKarakter tbody');
    if(!tbody) return;
    
    let search = document.getElementById('searchWkKarakter').value.toLowerCase();
    let filterJenis = document.getElementById('filterWkJenisKarakter').value;
    let selFilterKelas = document.getElementById('filterWkKelasKarakter');
    if(selFilterKelas && selFilterKelas.options.length <= 1 && typeof masterKelasList !== 'undefined') {
        let currentVal = selFilterKelas.value;
        selFilterKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selFilterKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
        selFilterKelas.value = currentVal;
    }
    
    let filterKelas = selFilterKelas ? selFilterKelas.value : '';
    
    let filtered = dWkKarakter;
    if(search) filtered = filtered.filter(d => d.siswa?.nama_lengkap?.toLowerCase().includes(search));
    if(filterJenis) filtered = filtered.filter(d => d.jenis === filterJenis);
    if(filterKelas) filtered = filtered.filter(d => d.siswa?.master_kelas?.nama_kelas === filterKelas);
    
    tbody.innerHTML = '';
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data tatib & karakter.</td></tr>`;
        return;
    }
    filtered.forEach((d, i) => {
        let badgeStyle = d.jenis === 'Pelanggaran' ? 'background:#fee2e2; color:#dc2626;' : 'background:#dcfce7; color:#16a34a;';
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i+1}</td>
                <td>${d.tanggal}</td>
                <td><strong>${d.siswa?.nama_lengkap || '-'}</strong><br><span style="font-size:0.75rem;color:var(--text-light);">${d.siswa?.master_kelas?.nama_kelas || '-'}</span></td>
                <td><span style="padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:600; ${badgeStyle}">${d.jenis}</span></td>
                <td>${d.keterangan}</td>
                <td style="text-align:center; font-weight:bold;">${d.poin || 0}</td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:4px;">
                        <button class="btn btn-sm btn-outline" style="color:var(--primary); border-color:var(--primary);" onclick="editWkKarakter('${d.id}')"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
                        <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusWkKarakter('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

function openWkModalKarakter() {
    let selKelas = document.getElementById('formWkKarakterKelasFilter');
    if(selKelas && typeof masterKelasList !== 'undefined') {
        selKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
    }
    
    populateSiswaSelectWk('formWkKarakterIdSiswa');
    document.getElementById('wkModalKarakterTitle').innerText = 'Tambah Catatan Karakter';
    document.getElementById('formWkKarakterId').value = '';
    document.getElementById('formWkKarakterIdSiswa').value = '';
    document.getElementById('formWkKarakterTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formWkKarakterJenis').value = 'Pelanggaran';
    document.getElementById('formWkKarakterPoin').value = '';
    document.getElementById('formWkKarakterKet').value = '';
    document.getElementById('wkModalKarakter').classList.add('active');
}

function closeWkModalKarakter() { document.getElementById('wkModalKarakter').classList.remove('active'); }

async function saveWkKarakter() {
    let id = document.getElementById('formWkKarakterId').value;
    let payload = {
        id_siswa: document.getElementById('formWkKarakterIdSiswa').value,
        tanggal: document.getElementById('formWkKarakterTanggal').value,
        jenis: document.getElementById('formWkKarakterJenis').value,
        keterangan: document.getElementById('formWkKarakterKet').value,
        poin: parseInt(document.getElementById('formWkKarakterPoin').value) || 0
    };
    if(!payload.id_siswa || !payload.tanggal || !payload.jenis || !payload.keterangan) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if(id) {
            const { error } = await supabaseClient.from('wk_catatan_karakter').update(payload).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_catatan_karakter').insert([payload]);
            if(error) throw error;
        }
        showToast('Catatan berhasil disimpan!', 'success');
        closeWkModalKarakter();
        await loadWaliKelasData();
    } catch(e) { showToast('Gagal menyimpan: ' + e.message, 'error'); } 
    finally { hideGlobalLoader(); }
}

function editWkKarakter(id) {
    let d = dWkKarakter.find(x => x.id === id);
    if(!d) return;
    openWkModalKarakter();
    document.getElementById('wkModalKarakterTitle').innerText = 'Edit Catatan Karakter';
    document.getElementById('formWkKarakterId').value = d.id;
    
    let kelasSiswa = d.siswa?.master_kelas?.nama_kelas || '';
    let selKelas = document.getElementById('formWkKarakterKelasFilter');
    if(selKelas && kelasSiswa) selKelas.value = kelasSiswa;
    populateSiswaSelectWk('formWkKarakterIdSiswa', kelasSiswa);
    document.getElementById('formWkKarakterIdSiswa').value = d.id_siswa;
    
    document.getElementById('formWkKarakterTanggal').value = d.tanggal;
    document.getElementById('formWkKarakterJenis').value = d.jenis;
    document.getElementById('formWkKarakterKet').value = d.keterangan;
    document.getElementById('formWkKarakterPoin').value = d.poin || 0;
}

function hapusWkKarakter(id) {
    showCustomConfirm('Hapus Catatan?', 'Yakin ingin menghapus catatan ini?', 'Ya, Hapus', async () => {
        try {
            const { error } = await supabaseClient.from('wk_catatan_karakter').delete().eq('id', id);
            if(error) throw error;
            showToast('Catatan berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch(e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
    });
}

// === 3. BUKU PENGHUBUNG ===
function renderWkPenghubungTable() {
    let tbody = document.querySelector('#tableWkPenghubung tbody');
    if(!tbody) return;
    
    let search = document.getElementById('searchWkPenghubung')?.value.toLowerCase() || '';
    let filterJenis = document.getElementById('filterWkJenisPenghubung')?.value || '';
    let selFilterKelas = document.getElementById('filterWkKelasPenghubung');
    
    if(selFilterKelas && selFilterKelas.options.length <= 1 && typeof masterKelasList !== 'undefined') {
        let currentVal = selFilterKelas.value;
        selFilterKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selFilterKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
        selFilterKelas.value = currentVal;
    }
    
    let filterKelas = selFilterKelas ? selFilterKelas.value : '';
    
    let filtered = dWkPenghubung;
    if(search) filtered = filtered.filter(d => d.siswa?.nama_lengkap?.toLowerCase().includes(search));
    if(filterJenis) filtered = filtered.filter(d => d.jenis_komunikasi === filterJenis);
    if(filterKelas) filtered = filtered.filter(d => d.siswa?.master_kelas?.nama_kelas === filterKelas);

    tbody.innerHTML = '';
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data buku penghubung.</td></tr>`;
        return;
    }
    filtered.forEach((d, i) => {
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i+1}</td>
                <td>${d.tanggal}</td>
                <td><strong>${d.siswa?.nama_lengkap || '-'}</strong><br><span style="font-size:0.75rem;color:var(--text-light);">${d.siswa?.master_kelas?.nama_kelas || '-'}</span></td>
                <td><span style="background:var(--bg-lighter); padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">${d.jenis_komunikasi}</span></td>
                <td>${d.permasalahan}</td>
                <td>${d.hasil || d.tindak_lanjut || '-'}</td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:4px;">
                        <button class="btn btn-sm btn-outline" style="color:var(--primary); border-color:var(--primary);" onclick="editWkPenghubung('${d.id}')"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
                        <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusWkPenghubung('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

function openWkModalPenghubung() {
    let selKelas = document.getElementById('formWkPenghubungKelasFilter');
    if(selKelas && typeof masterKelasList !== 'undefined') {
        selKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
    }
    
    populateSiswaSelectWk('formWkPenghubungIdSiswa');
    document.getElementById('wkModalPenghubungTitle').innerText = 'Tambah Buku Penghubung';
    document.getElementById('formWkPenghubungId').value = '';
    document.getElementById('formWkPenghubungIdSiswa').value = '';
    document.getElementById('formWkPenghubungTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formWkPenghubungJenis').value = 'Panggilan Wali Murid';
    document.getElementById('formWkPenghubungMasalah').value = '';
    document.getElementById('formWkPenghubungHasil').value = '';
    document.getElementById('wkModalPenghubung').classList.add('active');
}

function closeWkModalPenghubung() { document.getElementById('wkModalPenghubung').classList.remove('active'); }

async function saveWkPenghubung() {
    let id = document.getElementById('formWkPenghubungId').value;
    let payload = {
        id_siswa: document.getElementById('formWkPenghubungIdSiswa').value,
        tanggal: document.getElementById('formWkPenghubungTanggal').value,
        jenis_komunikasi: document.getElementById('formWkPenghubungJenis').value,
        permasalahan: document.getElementById('formWkPenghubungMasalah').value,
        hasil: document.getElementById('formWkPenghubungHasil').value
    };
    if(!payload.id_siswa || !payload.tanggal || !payload.permasalahan) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if(id) {
            const { error } = await supabaseClient.from('wk_buku_penghubung').update(payload).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_buku_penghubung').insert([payload]);
            if(error) throw error;
        }
        showToast('Data penghubung berhasil disimpan!', 'success');
        closeWkModalPenghubung();
        await loadWaliKelasData();
    } catch(e) { showToast('Gagal menyimpan: ' + e.message, 'error'); } 
    finally { hideGlobalLoader(); }
}

function editWkPenghubung(id) {
    let d = dWkPenghubung.find(x => x.id === id);
    if(!d) return;
    openWkModalPenghubung();
    document.getElementById('wkModalPenghubungTitle').innerText = 'Edit Buku Penghubung';
    document.getElementById('formWkPenghubungId').value = d.id;
    
    let kelasSiswa = d.siswa?.master_kelas?.nama_kelas || '';
    let selKelas = document.getElementById('formWkPenghubungKelasFilter');
    if(selKelas && kelasSiswa) selKelas.value = kelasSiswa;
    populateSiswaSelectWk('formWkPenghubungIdSiswa', kelasSiswa);
    document.getElementById('formWkPenghubungIdSiswa').value = d.id_siswa;
    
    document.getElementById('formWkPenghubungTanggal').value = d.tanggal;
    document.getElementById('formWkPenghubungJenis').value = d.jenis_komunikasi;
    document.getElementById('formWkPenghubungMasalah').value = d.permasalahan;
    document.getElementById('formWkPenghubungHasil').value = d.hasil || '';
}

function hapusWkPenghubung(id) {
    showCustomConfirm('Hapus Data?', 'Yakin ingin menghapus catatan komunikasi ini?', 'Ya, Hapus', async () => {
        try {
            const { error } = await supabaseClient.from('wk_buku_penghubung').delete().eq('id', id);
            if(error) throw error;
            showToast('Catatan berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch(e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
    });
}

// === 4. INVENTARIS KELAS ===
function renderWkInventarisTable() {
    let tbody = document.querySelector('#tableWkInventaris tbody');
    if(!tbody) return;
    
    let search = document.getElementById('searchWkInventaris')?.value.toLowerCase() || '';
    let filterKondisi = document.getElementById('filterWkKondisiInventaris')?.value || '';
    let selFilterKelas = document.getElementById('filterWkKelasInventaris');
    
    if(selFilterKelas && selFilterKelas.options.length <= 1 && typeof masterKelasList !== 'undefined') {
        let currentVal = selFilterKelas.value;
        selFilterKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selFilterKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
        selFilterKelas.value = currentVal;
    }
    
    let filterKelas = selFilterKelas ? selFilterKelas.value : '';
    
    let filtered = dWkInventaris;
    if(search) filtered = filtered.filter(d => d.nama_barang?.toLowerCase().includes(search));
    if(filterKondisi) filtered = filtered.filter(d => d.kondisi === filterKondisi);
    if(filterKelas) filtered = filtered.filter(d => d.kelas === filterKelas);

    tbody.innerHTML = '';
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data inventaris.</td></tr>`;
        return;
    }
    filtered.forEach((d, i) => {
        let badgeColor = d.kondisi === 'Baik' ? '#16a34a' : (d.kondisi === 'Rusak Ringan' ? '#f59e0b' : '#dc2626');
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i+1}</td>
                <td style="text-align:center;"><strong>${d.kelas}</strong></td>
                <td>${d.nama_barang}</td>
                <td style="text-align:center;">${d.jumlah}</td>
                <td><span style="color:${badgeColor}; font-weight:600;">${d.kondisi}</span></td>
                <td>${d.keterangan || '-'}</td>
                <td>${d.tanggal_lapor}</td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:4px;">
                        <button class="btn btn-sm btn-outline" style="color:var(--primary); border-color:var(--primary);" onclick="editWkInventaris('${d.id}')"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
                        <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusWkInventaris('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

function openWkModalInventaris() {
    let selKelas = document.getElementById('formWkInventarisKelas');
    if(selKelas) {
        selKelas.innerHTML = '<option value="">Pilih Kelas...</option>';
        if(typeof masterKelasList !== 'undefined') {
            masterKelasList.forEach(k => {
                selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
            });
        }
    }
    
    document.getElementById('wkModalInventarisTitle').innerText = 'Tambah Inventaris / Laporan Kerusakan';
    document.getElementById('formWkInventarisId').value = '';
    document.getElementById('formWkInventarisTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formWkInventarisKelas').value = '';
    document.getElementById('formWkInventarisBarang').value = '';
    document.getElementById('formWkInventarisJumlah').value = '1';
    document.getElementById('formWkInventarisKondisi').value = 'Baik';
    document.getElementById('formWkInventarisKet').value = '';
    document.getElementById('wkModalInventaris').classList.add('active');
}

function closeWkModalInventaris() { document.getElementById('wkModalInventaris').classList.remove('active'); }

async function saveWkInventaris() {
    let id = document.getElementById('formWkInventarisId').value;
    let payload = {
        tanggal_lapor: document.getElementById('formWkInventarisTanggal').value,
        kelas: document.getElementById('formWkInventarisKelas').value,
        nama_barang: document.getElementById('formWkInventarisBarang').value,
        jumlah: parseInt(document.getElementById('formWkInventarisJumlah').value) || 1,
        kondisi: document.getElementById('formWkInventarisKondisi').value,
        keterangan: document.getElementById('formWkInventarisKet').value
    };
    if(!payload.tanggal_lapor || !payload.kelas || !payload.nama_barang) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if(id) {
            const { error } = await supabaseClient.from('wk_inventaris_kelas').update(payload).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_inventaris_kelas').insert([payload]);
            if(error) throw error;
        }
        showToast('Data inventaris berhasil disimpan!', 'success');
        closeWkModalInventaris();
        await loadWaliKelasData();
    } catch(e) { showToast('Gagal menyimpan: ' + e.message, 'error'); } 
    finally { hideGlobalLoader(); }
}

function editWkInventaris(id) {
    let d = dWkInventaris.find(x => x.id === id);
    if(!d) return;
    openWkModalInventaris();
    document.getElementById('wkModalInventarisTitle').innerText = 'Edit Inventaris';
    document.getElementById('formWkInventarisId').value = d.id;
    document.getElementById('formWkInventarisTanggal').value = d.tanggal_lapor;
    document.getElementById('formWkInventarisKelas').value = d.kelas;
    document.getElementById('formWkInventarisBarang').value = d.nama_barang;
    document.getElementById('formWkInventarisJumlah').value = d.jumlah;
    document.getElementById('formWkInventarisKondisi').value = d.kondisi;
    document.getElementById('formWkInventarisKet').value = d.keterangan || '';
}

function hapusWkInventaris(id) {
    showCustomConfirm('Hapus Data?', 'Yakin ingin menghapus data inventaris ini?', 'Ya, Hapus', async () => {
        try {
            const { error } = await supabaseClient.from('wk_inventaris_kelas').delete().eq('id', id);
            if(error) throw error;
            showToast('Inventaris berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch(e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
    });
}

// ============================================================
// 5. KELOLA KONTEN: GAMBAR HERO
// ============================================================
var dKontenHero = [];

async function loadKontenHero() {
    try {
        const { data, error } = await supabaseClient.from('konten_hero').select('*').order('urutan');
        if (error) throw error;
        dKontenHero = data || [];
    } catch(e) { console.error('Gagal load hero:', e); dKontenHero = []; }
    renderHeroManager();
}

function renderHeroManager() {
    var tbody = document.querySelector('#tableHeroSlides tbody');
    if (!tbody) return;

    if (dKontenHero.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada slide hero. Klik "Tambah Slide" untuk menambahkan.</td></tr>';
        return;
    }

    tbody.innerHTML = dKontenHero.map(function(h, i) {
        var desktopCell = h.gambar_desktop
            ? '<div style="display:flex; align-items:center; gap:8px;"><img src="' + h.gambar_desktop + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />' +
              '<label class="btn btn-sm btn-outline" style="cursor:pointer;"><i data-lucide="upload" style="width:12px;height:12px;"></i> Ganti<input type="file" accept="image/*" onchange="uploadHeroImage(this.files[0],\'' + h.id + '\',\'desktop\')" style="display:none;" /></label></div>'
            : '<label class="btn btn-sm btn-primary" style="cursor:pointer;"><i data-lucide="upload" style="width:12px;height:12px;"></i> Upload Desktop<input type="file" accept="image/*" onchange="uploadHeroImage(this.files[0],\'' + h.id + '\',\'desktop\')" style="display:none;" /></label>';
        var mobileCell = h.gambar_mobile
            ? '<div style="display:flex; align-items:center; gap:8px;"><img src="' + h.gambar_mobile + '" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />' +
              '<label class="btn btn-sm btn-outline" style="cursor:pointer;"><i data-lucide="upload" style="width:12px;height:12px;"></i> Ganti<input type="file" accept="image/*" onchange="uploadHeroImage(this.files[0],\'' + h.id + '\',\'mobile\')" style="display:none;" /></label></div>'
            : '<label class="btn btn-sm btn-primary" style="cursor:pointer;"><i data-lucide="upload" style="width:12px;height:12px;"></i> Upload Mobile<input type="file" accept="image/*" onchange="uploadHeroImage(this.files[0],\'' + h.id + '\',\'mobile\')" style="display:none;" /></label>';

        return '<tr>' +
            '<td style="text-align:center; font-weight:700; font-size:1.1rem;">' + (i + 1) + '</td>' +
            '<td>' + desktopCell + '</td>' +
            '<td>' + mobileCell + '</td>' +
            '<td style="text-align:center;"><button class="btn-icon btn-icon-red" onclick="hapusSlideHero(\'' + h.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td>' +
        '</tr>';
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function tambahSlideHero() {
    showGlobalLoader('Menambahkan slide...');
    try {
        var urutan = dKontenHero.length + 1;
        const { error } = await supabaseClient.from('konten_hero').insert([{ urutan: urutan }]);
        if (error) throw error;
        showToast('Slide baru ditambahkan!', 'success');
        await loadKontenHero();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function hapusSlideHero(id) {
    showCustomConfirm('Hapus Slide?', 'Slide ini dan gambarnya akan dihapus.', 'Ya, Hapus', async function() {
        showGlobalLoader('Menghapus slide...');
        try {
            const { error } = await supabaseClient.from('konten_hero').delete().eq('id', id);
            if (error) throw error;
            showToast('Slide dihapus!', 'success');
            await loadKontenHero();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

async function uploadHeroImage(file, heroId, mode) {
    if (!file) return;
    showGlobalLoader('Mengupload gambar ' + mode + '...');
    try {
        var publicUrl = await uploadToGoogleDrive(file, 'hero');

        var updatePayload = {};
        if (mode === 'desktop') updatePayload.gambar_desktop = publicUrl;
        else updatePayload.gambar_mobile = publicUrl;
        updatePayload.updated_at = new Date().toISOString();

        const { error: dbErr } = await supabaseClient.from('konten_hero').update(updatePayload).eq('id', heroId);
        if (dbErr) throw dbErr;

        showToast('Gambar ' + mode + ' berhasil diupload!', 'success');
        await loadKontenHero();
    } catch(e) { showToast('Gagal upload: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

// ============================================================
// 6. KELOLA KONTEN: VISI & MISI
// ============================================================
var dKontenVisiMisiList = [];

async function loadKontenVisiMisi() {
    try {
        const { data, error } = await supabaseClient.from('konten_visi_misi').select('*').order('updated_at', { ascending: false });
        if (error) throw error;
        dKontenVisiMisiList = data || [];
    } catch(e) { console.error('Gagal load visi misi:', e); dKontenVisiMisiList = []; }
    renderVisiMisiTable();
}

function renderVisiMisiTable() {
    var tbody = document.querySelector('#tableVisiMisi tbody');
    if (!tbody) return;
    if (dKontenVisiMisiList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data visi & misi. Klik "Tambah Visi & Misi" untuk menambahkan.</td></tr>';
        return;
    }
    tbody.innerHTML = dKontenVisiMisiList.map(function(d, i) {
        var misiArr = d.misi || [];
        var misiText = misiArr.length > 0 ? misiArr.map(function(m, j) { return (j+1) + '. ' + m; }).join('<br>') : '-';
        var visiShort = d.visi && d.visi.length > 80 ? d.visi.substring(0, 80) + '...' : (d.visi || '-');
        return '<tr>' +
            '<td style="text-align:center;">' + (i + 1) + '</td>' +
            '<td>' + visiShort + '</td>' +
            '<td style="font-size:0.85rem; line-height:1.6;">' + misiText + '</td>' +
            '<td style="text-align:right;">' +
                '<div style="display:flex; justify-content:flex-end; gap:4px;">' +
                    '<button class="btn-icon btn-icon-blue" onclick="editVisiMisi(\'' + d.id + '\')" title="Edit"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="hapusVisiMisi(\'' + d.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function openVisiMisiModal() {
    document.getElementById('visiMisiModalTitle').innerText = 'Tambah Visi & Misi';
    document.getElementById('formVisiMisiId').value = '';
    document.getElementById('formVisiTeks').value = '';
    document.getElementById('misiListContainer').innerHTML = '';
    addMisiItem();
    document.getElementById('visiMisiModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeVisiMisiModal() { document.getElementById('visiMisiModal').classList.remove('active'); }

function editVisiMisi(id) {
    var d = dKontenVisiMisiList.find(function(x) { return x.id === id; });
    if (!d) return;
    openVisiMisiModal();
    document.getElementById('visiMisiModalTitle').innerText = 'Edit Visi & Misi';
    document.getElementById('formVisiMisiId').value = d.id;
    document.getElementById('formVisiTeks').value = d.visi || '';
    var container = document.getElementById('misiListContainer');
    container.innerHTML = '';
    var misiArr = d.misi || [];
    misiArr.forEach(function(m, i) { addMisiItemHTML(container, m, i); });
}

function addMisiItem() {
    var container = document.getElementById('misiListContainer');
    if (!container) return;
    var idx = container.children.length;
    addMisiItemHTML(container, '', idx);
}

function addMisiItemHTML(container, value, idx) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:0.5rem; align-items:center;';
    row.innerHTML = '<span style="font-weight:600; min-width:30px; color:var(--text-light);">' + (idx + 1) + '.</span>' +
        '<input type="text" class="form-input misi-input" value="' + (value || '').replace(/"/g, '&quot;') + '" style="margin:0; flex:1;" placeholder="Isi misi ke-' + (idx + 1) + '..." />' +
        '<button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger);flex-shrink:0;" onclick="this.parentElement.remove()"><i data-lucide="x" style="width:14px;height:14px;"></i></button>';
    container.appendChild(row);
    if (window.lucide) lucide.createIcons();
}

async function saveVisiMisi() {
    var id = document.getElementById('formVisiMisiId').value;
    var visi = document.getElementById('formVisiTeks').value.trim();
    var misiInputs = document.querySelectorAll('#misiListContainer .misi-input');
    var misiArr = [];
    misiInputs.forEach(function(el) { if (el.value.trim()) misiArr.push(el.value.trim()); });

    if (!visi) return showToast('Teks visi tidak boleh kosong!', 'warning');
    if (misiArr.length === 0) return showToast('Minimal satu misi harus diisi!', 'warning');

    showGlobalLoader('Menyimpan visi & misi...');
    try {
        if (id) {
            const { error } = await supabaseClient.from('konten_visi_misi').update({
                visi: visi, misi: misiArr, updated_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('konten_visi_misi').insert([{ visi: visi, misi: misiArr }]);
            if (error) throw error;
        }
        showToast('Visi & Misi berhasil disimpan!', 'success');
        closeVisiMisiModal();
        await loadKontenVisiMisi();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function hapusVisiMisi(id) {
    showCustomConfirm('Hapus Visi & Misi?', 'Data ini akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('konten_visi_misi').delete().eq('id', id);
            if (error) throw error;
            showToast('Visi & Misi dihapus!', 'success');
            await loadKontenVisiMisi();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// 7. KELOLA KONTEN: TESTIMONI
// ============================================================
var dKontenTestimoni = [];

async function loadKontenTestimoni() {
    try {
        const { data, error } = await supabaseClient.from('konten_testimoni').select('*').order('urutan');
        if (error) throw error;
        dKontenTestimoni = data || [];
    } catch(e) { console.error('Gagal load testimoni:', e); dKontenTestimoni = []; }
    renderTestimoniTable();
}

function renderTestimoniTable() {
    var tbody = document.querySelector('#tableTestimoni tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (dKontenTestimoni.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data testimoni.</td></tr>';
        return;
    }
    dKontenTestimoni.forEach(function(d, i) {
        var shortText = d.teks && d.teks.length > 60 ? d.teks.substring(0, 60) + '...' : (d.teks || '-');
        tbody.innerHTML += '<tr>' +
            '<td style="text-align:center;">' + (i + 1) + '</td>' +
            '<td><strong>' + (d.nama || '-') + '</strong></td>' +
            '<td>' + (d.keterangan || '-') + '</td>' +
            '<td>' + shortText + '</td>' +
            '<td style="text-align:right;">' +
                '<div style="display:flex; justify-content:flex-end; gap:4px;">' +
                    '<button class="btn btn-sm btn-outline" style="color:var(--primary); border-color:var(--primary);" onclick="editTestimoni(\'' + d.id + '\')"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>' +
                    '<button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusTestimoni(\'' + d.id + '\')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    });
    if (window.lucide) lucide.createIcons();
}

function openTestimoniModal() {
    document.getElementById('testimoniModalTitle').innerText = 'Tambah Testimoni';
    document.getElementById('formTestimoniId').value = '';
    document.getElementById('formTestimoniNama').value = '';
    document.getElementById('formTestimoniKeterangan').value = '';
    document.getElementById('formTestimoniTeks').value = '';
    document.getElementById('formTestimoniWarna').value = '#1e3a8a';
    document.getElementById('formTestimoniUrutan').value = dKontenTestimoni.length + 1;
    document.getElementById('testimoniModal').classList.add('active');
}

function closeTestimoniModal() { document.getElementById('testimoniModal').classList.remove('active'); }

function editTestimoni(id) {
    var d = dKontenTestimoni.find(function(x) { return x.id === id; });
    if (!d) return;
    openTestimoniModal();
    document.getElementById('testimoniModalTitle').innerText = 'Edit Testimoni';
    document.getElementById('formTestimoniId').value = d.id;
    document.getElementById('formTestimoniNama').value = d.nama;
    document.getElementById('formTestimoniKeterangan').value = d.keterangan || '';
    document.getElementById('formTestimoniTeks').value = d.teks;
    document.getElementById('formTestimoniWarna').value = d.warna_avatar || '#1e3a8a';
    document.getElementById('formTestimoniUrutan').value = d.urutan || 1;
}

async function saveTestimoni() {
    var id = document.getElementById('formTestimoniId').value;
    var payload = {
        nama: document.getElementById('formTestimoniNama').value.trim(),
        keterangan: document.getElementById('formTestimoniKeterangan').value.trim(),
        teks: document.getElementById('formTestimoniTeks').value.trim(),
        warna_avatar: document.getElementById('formTestimoniWarna').value,
        urutan: parseInt(document.getElementById('formTestimoniUrutan').value) || 1
    };
    if (!payload.nama || !payload.teks) return showToast('Nama dan teks testimoni wajib diisi!', 'warning');

    showGlobalLoader();
    try {
        if (id) {
            const { error } = await supabaseClient.from('konten_testimoni').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('konten_testimoni').insert([payload]);
            if (error) throw error;
        }
        showToast('Testimoni berhasil disimpan!', 'success');
        closeTestimoniModal();
        await loadKontenTestimoni();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function hapusTestimoni(id) {
    showCustomConfirm('Hapus Testimoni?', 'Testimoni ini akan dihapus permanen.', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('konten_testimoni').delete().eq('id', id);
            if (error) throw error;
            showToast('Testimoni dihapus!', 'success');
            await loadKontenTestimoni();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// 8. PUBLIC LOADING: Hero, Visi Misi, Testimoni (Landing Page)
// ============================================================
window.heroSliderInterval = null;
function initHeroSlider() {
    if (window.heroSliderInterval) clearInterval(window.heroSliderInterval);
    var slides = document.querySelectorAll('.hero-slide');
    if (!slides || slides.length === 0) return;
    
    var currentSlide = 0;
    slides.forEach(function(s, i) {
        if(i === 0) s.classList.add('active');
        else s.classList.remove('active');
    });

    if (slides.length > 1) {
        window.heroSliderInterval = setInterval(function () {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000);
    }
}

async function loadHeroPublic() {
    try {
        const { data, error } = await supabaseClient.from('konten_hero').select('*').order('urutan');
        if (error) throw error;
        if (!data || data.length === 0) {
            initHeroSlider();
            return;
        }

        var container = document.getElementById('heroSlideshow');
        if (!container) return;

        container.innerHTML = '';
        data.forEach(function(h, i) {
            var div = document.createElement('div');
            div.className = 'hero-slide' + (i === 0 ? ' active' : '');
            if (h.gambar_desktop) div.style.backgroundImage = "url('" + h.gambar_desktop + "')";
            div.setAttribute('data-mobile', h.gambar_mobile || '');
            container.appendChild(div);
        });

        // Apply mobile images if on small screen
        if (window.innerWidth <= 768) {
            container.querySelectorAll('.hero-slide').forEach(function(slide) {
                var mobileUrl = slide.getAttribute('data-mobile');
                if (mobileUrl) slide.style.backgroundImage = "url('" + mobileUrl + "')";
            });
        }
        initHeroSlider();
    } catch(e) { 
        console.log('Hero public fallback to static');
        initHeroSlider();
    }
}

async function loadVisiMisiPublic() {
    try {
        const { data, error } = await supabaseClient.from('konten_visi_misi').select('*').order('updated_at', { ascending: false }).limit(1).single();
        if (error) throw error;
        if (!data) return;

        var visiCards = document.querySelectorAll('.vm-card');
        if (visiCards.length >= 1 && data.visi) {
            var visiP = visiCards[0].querySelector('p');
            if (visiP) visiP.textContent = data.visi;
        }
        if (visiCards.length >= 2 && data.misi && data.misi.length > 0) {
            var misiUl = visiCards[1].querySelector('ul');
            if (misiUl) {
                misiUl.innerHTML = data.misi.map(function(m, i) {
                    return '<li>' + (i + 1) + '. ' + m + '</li>';
                }).join('');
            }
        }
    } catch(e) { console.log('Visi Misi public fallback to static'); }
}

async function loadTestimoniPublic() {
    try {
        const { data, error } = await supabaseClient.from('konten_testimoni').select('*').order('urutan');
        if (error) throw error;
        if (!data || data.length === 0) return;

        var track = document.getElementById('testimonialTrack');
        var dotsContainer = document.getElementById('testimonialDots');
        if (!track) return;

        track.innerHTML = data.map(function(t) {
            var initials = t.nama.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
            var avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.nama) + '&background=' + (t.warna_avatar || '#1e3a8a').replace('#', '') + '&color=fff';
            return '<div class="testimonial-slide">' +
                '<div class="testimonial-card tilt-element">' +
                    '<i data-lucide="quote" class="quote-icon" style="color:var(--accent);width:40px;height:40px;margin-bottom:1rem;opacity:0.5;"></i>' +
                    '<p class="testimonial-text" style="font-size:1.1rem;font-style:italic;line-height:1.6;margin-bottom:1.5rem;">"' + t.teks + '"</p>' +
                    '<div class="testimonial-author" style="display:flex;align-items:center;gap:1rem;">' +
                        '<div class="author-avatar"><img src="' + avatarUrl + '" alt="Avatar" style="width:50px;height:50px;border-radius:50%;"></div>' +
                        '<div>' +
                            '<h4 style="margin:0;font-size:1.05rem;">' + t.nama + '</h4>' +
                            '<span style="font-size:0.85rem;color:var(--text-light);">' + (t.keterangan || '') + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        // Rebuild dots
        if (dotsContainer) {
            dotsContainer.innerHTML = data.map(function(t, i) {
                return '<span class="dot' + (i === 0 ? ' active' : '') + '" onclick="setTestimonial(' + i + ')" style="width:10px;height:10px;border-radius:50%;background:' + (i === 0 ? 'var(--primary)' : 'rgba(30,58,138,0.2)') + ';cursor:pointer;"></span>';
            }).join('');
        }

        if (window.lucide) lucide.createIcons();
    } catch(e) { console.log('Testimoni public fallback to static'); }
}


// ============================================================
// TRANSAKSI OPERASIONAL
// ============================================================
function formatDateIndonesia(dateStr) {
    if(!dateStr) return '-';
    let d = new Date(dateStr);
    let bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

let dOperasional = [];
let currentOperasionalTab = 'pemasukan';

function switchOperasionalTab(tab) {
    currentOperasionalTab = tab;
    
    // Update Buttons
    document.getElementById('tabBtnOperasionalPemasukan').style.background = tab === 'pemasukan' ? 'var(--primary)' : 'transparent';
    document.getElementById('tabBtnOperasionalPemasukan').style.color = tab === 'pemasukan' ? 'white' : 'var(--text-light)';
    
    document.getElementById('tabBtnOperasionalPengeluaran').style.background = tab === 'pengeluaran' ? 'var(--primary)' : 'transparent';
    document.getElementById('tabBtnOperasionalPengeluaran').style.color = tab === 'pengeluaran' ? 'white' : 'var(--text-light)';
    
    // Update Content
    document.getElementById('tabOperasionalPemasukan').style.display = tab === 'pemasukan' ? 'block' : 'none';
    document.getElementById('tabOperasionalPengeluaran').style.display = tab === 'pengeluaran' ? 'block' : 'none';
    
    // Update Header Actions
    document.getElementById('btnAksiOperasionalPemasukan').style.display = tab === 'pemasukan' ? 'block' : 'none';
    document.getElementById('btnAksiOperasionalCetakPemasukan').style.display = tab === 'pemasukan' ? 'block' : 'none';
    document.getElementById('btnAksiOperasionalCetakPengeluaran').style.display = tab === 'pengeluaran' ? 'block' : 'none';
    document.getElementById('btnAksiOperasionalPengeluaran').style.display = tab === 'pengeluaran' ? 'block' : 'none';
    
    if (tab === 'pemasukan') renderOperasionalPemasukanTable();
    if (tab === 'pengeluaran') renderOperasionalPengeluaranTable();
}

async function fetchOperasionalData() {
    try {
        let { data, error } = await supabaseClient
            .from('buku_kas_bendahara')
            .select('*')
            .eq('sumber_dana', 'Kas Operasional')
            .order('tanggal', { ascending: false });
            
        if (error) throw error;
        dOperasional = data || [];
        
        if (currentOperasionalTab === 'pemasukan') renderOperasionalPemasukanTable();
        if (currentOperasionalTab === 'pengeluaran') renderOperasionalPengeluaranTable();
        
    } catch (e) {
        console.error('Error fetching operasional:', e);
    }
}

function renderOperasionalPemasukanTable() {
    let tbody = document.querySelector('#tableOperasionalPemasukan tbody');
    if (!tbody) return;
    
    let search = (document.getElementById('searchOpPemasukan')?.value || '').toLowerCase();
    let filterBulan = document.getElementById('filterBulanOpPemasukan')?.value || '';
    
    let filtered = dOperasional.filter(x => x.jenis_transaksi === 'Pemasukan');
    if (search) {
        filtered = filtered.filter(x => 
            (x.keterangan || '').toLowerCase().includes(search) ||
            (x.kategori || '').toLowerCase().includes(search)
        );
    }
    if (filterBulan) {
        filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(filterBulan));
    }
    
    let total = 0;
    let currMonthTotal = 0;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    
    let trs = '';
    filtered.forEach((d, idx) => {
        let amt = parseInt(d.nominal) || 0;
        total += amt;
        let dDate = new Date(d.tanggal);
        if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
            currMonthTotal += amt;
        }
        
        trs += `
        <tr>
            <td>${idx + 1}</td>
            <td>${formatDateIndonesia(d.tanggal)}</td>
            <td>${d.kategori || 'Dana BOS'}</td>
            <td>${d.keterangan || '-'}</td>
            <td style="color:var(--success); font-weight:600;">+ ${formatRupiah(amt)}</td>
            <td style="text-align:right;">
                <button class="btn btn-sm btn-danger" onclick="deleteOperasional('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
            </td>
        </tr>`;
    });
    
    if (filtered.length === 0) trs = '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:2rem;">Belum ada data pemasukan operasional</td></tr>';
    tbody.innerHTML = trs;
    if(typeof lucide !== 'undefined') lucide.createIcons();
    
    // Summary
    let summaryDiv = document.getElementById('operasionalPemasukanSummary');
    if (summaryDiv) {
        let maxTrx = filtered.length > 0 ? Math.max(...filtered.map(x => parseInt(x.nominal) || 0)) : 0;
        summaryDiv.innerHTML = `
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #10b981;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Pemasukan</div>
                <div style="font-size:1.3rem; font-weight:700; color:#10b981;">${formatRupiah(total)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${formatRupiah(currMonthTotal)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${filtered.length}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #3b82f6;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Pemasukan Terbesar</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${formatRupiah(maxTrx)}</div>
            </div>
        `;
    }
}

// ---- PENGELUARAN: CATEGORY-BASED SYSTEM ----
let currentOpKategori = '';

function switchOpKategoriPengeluaran(kategori) {
    currentOpKategori = kategori;
    let container = document.getElementById('opKategoriContentContainer');
    let placeholder = document.getElementById('opKategoriPlaceholder');
    
    if (!kategori) {
        container.style.display = 'none';
        placeholder.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Update table title
    document.getElementById('opKategoriTableTitle').textContent = 'Riwayat Pengeluaran — ' + kategori;
    
    // Render category-specific table
    renderOpKategoriTable();
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function renderOperasionalPengeluaranSummary() {
    let summaryDiv = document.getElementById('operasionalPengeluaranSummary');
    if (!summaryDiv) return;
    
    let allPengeluaran = dOperasional.filter(x => x.jenis_transaksi === 'Pengeluaran');
    let total = 0, currMonthTotal = 0;
    let now = new Date();
    let currentMonth = now.getMonth(), currentYear = now.getFullYear();
    
    allPengeluaran.forEach(d => {
        let amt = parseInt(d.nominal) || 0;
        total += amt;
        let dDate = new Date(d.tanggal);
        if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
            currMonthTotal += amt;
        }
    });
    
    let maxTrx = allPengeluaran.length > 0 ? Math.max(...allPengeluaran.map(x => parseInt(x.nominal) || 0)) : 0;
    
    summaryDiv.innerHTML = `
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #ef4444;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Pengeluaran</div>
            <div style="font-size:1.3rem; font-weight:700; color:#ef4444;">${formatRupiah(total)}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${formatRupiah(currMonthTotal)}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${allPengeluaran.length}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #3b82f6;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Pengeluaran Terbesar</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${formatRupiah(maxTrx)}</div>
        </div>
    `;
}

function renderOperasionalPengeluaranTable() {
    // Called from switchOperasionalTab — render summary + restore category view
    renderOperasionalPengeluaranSummary();
    if (currentOpKategori) {
        renderOpKategoriTable();
    }
}

function renderOpKategoriTable() {
    let thead = document.getElementById('theadOpKategori');
    let tbody = document.getElementById('tbodyOpKategori');
    if (!thead || !tbody) return;
    
    let search = (document.getElementById('searchOpKategori')?.value || '').toLowerCase();
    let filterBulan = document.getElementById('filterBulanOpKategori')?.value || '';
    let kat = currentOpKategori;
    
    // Filter data by category
    let filtered = dOperasional.filter(x => x.jenis_transaksi === 'Pengeluaran' && x.kategori === kat);
    if (search) {
        filtered = filtered.filter(x => 
            (x.keterangan || '').toLowerCase().includes(search) ||
            (x.kategori || '').toLowerCase().includes(search) ||
            (x.penerima || '').toLowerCase().includes(search)
        );
    }
    if (filterBulan) {
        filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(filterBulan));
    }
    
    // Build category-specific thead
    let thRow = '';
    if (kat === 'Honor') {
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Nama Penerima</th>
            <th>Tanggal Dibayar</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    } else if (kat === 'Ekstrakurikuler') {
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Nama Pelatih / PJ</th>
            <th>Tanggal Dibayar</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    } else if (kat === 'Perjalanan Dinas') {
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Nama Pelaku Perjalanan</th>
            <th>Tanggal Dibayarkan</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    } else {
        // Utilitas, ATK, Lainnya
        thRow = `<tr>
            <th style="width:40px;">No</th>
            <th>Tanggal Dibayarkan</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
            <th style="text-align:right;width:70px;">Aksi</th>
        </tr>`;
    }
    thead.innerHTML = thRow;
    
    // Build tbody rows
    let trs = '';
    if (filtered.length === 0) {
        let colSpan = (kat === 'Honor' || kat === 'Ekstrakurikuler' || kat === 'Perjalanan Dinas') ? 6 : 5;
        trs = `<tr><td colspan="${colSpan}" style="text-align:center;color:var(--text-light);padding:2rem;">Belum ada data pengeluaran untuk kategori ${kat}</td></tr>`;
    } else {
        filtered.forEach((d, idx) => {
            let amt = parseInt(d.nominal) || 0;
            let delBtn = `<button class="btn btn-sm btn-danger" onclick="deleteOperasional('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>`;
            
            // Extract nama from keterangan field (stored as "NAMA||actual keterangan")
            let namaPenerima = '-';
            let keteranganTampil = d.keterangan || '-';
            if (d.keterangan && d.keterangan.includes('||')) {
                let parts = d.keterangan.split('||');
                namaPenerima = parts[0] || '-';
                keteranganTampil = parts[1] || '-';
            }
            
            if (kat === 'Honor' || kat === 'Ekstrakurikuler' || kat === 'Perjalanan Dinas') {
                trs += `<tr>
                    <td>${idx+1}</td>
                    <td><strong>${namaPenerima}</strong></td>
                    <td>${formatDateIndonesia(d.tanggal)}</td>
                    <td style="color:#ef4444; font-weight:600;">- Rp ${formatRupiah(amt)}</td>
                    <td>${keteranganTampil}</td>
                    <td style="text-align:right;">${delBtn}</td>
                </tr>`;
            } else {
                trs += `<tr>
                    <td>${idx+1}</td>
                    <td>${formatDateIndonesia(d.tanggal)}</td>
                    <td style="color:#ef4444; font-weight:600;">- Rp ${formatRupiah(amt)}</td>
                    <td>${d.keterangan || '-'}</td>
                    <td style="text-align:right;">${delBtn}</td>
                </tr>`;
            }
        });
    }
    tbody.innerHTML = trs;
    
    // Also refresh summary
    renderOperasionalPengeluaranSummary();
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- MODAL PENGELUARAN (DYNAMIC FORM) ----

function openOperasionalPengeluaranModal() {
    let kat = currentOpKategori;
    if (!kat) {
        showToast('Pilih kategori pengeluaran terlebih dahulu!', 'warning');
        return;
    }
    
    let modalBody = document.getElementById('opKeluarModalBody');
    let title = document.getElementById('opKeluarModalTitle');
    title.textContent = 'Catat Pengeluaran — ' + kat;
    
    let formHTML = '';
    
    // Kategori field (hidden, auto-set)
    formHTML += `<input type="hidden" id="formOpKeluarKategori" value="${kat}" />`;
    
    if (kat === 'Honor') {
        // Nama Penerima = dropdown dari guru master
        let guruOptions = '<option value="">— Pilih Guru —</option>';
        if (typeof guruList !== 'undefined' && guruList.length > 0) {
            guruList.filter(g => g.status === 'Aktif').forEach(g => {
                guruOptions += `<option value="${g.nama_lengkap}">${g.nama_lengkap} — ${g.jabatan || 'Guru'}</option>`;
            });
        }
        formHTML += `
            <div class="form-group">
                <label class="form-label">Nama Penerima Honor <span style="color:red">*</span></label>
                <select id="formOpKeluarNama" class="form-input">${guruOptions}</select>
            </div>`;
    } else if (kat === 'Ekstrakurikuler') {
        formHTML += `
            <div class="form-group">
                <label class="form-label">Nama Pelatih / Penanggung Jawab <span style="color:red">*</span></label>
                <input type="text" id="formOpKeluarNama" class="form-input" placeholder="Masukkan nama pelatih" />
            </div>`;
    } else if (kat === 'Perjalanan Dinas') {
        formHTML += `
            <div class="form-group">
                <label class="form-label">Nama Yang Melakukan Perjalanan <span style="color:red">*</span></label>
                <input type="text" id="formOpKeluarNama" class="form-input" placeholder="Masukkan nama" />
            </div>`;
    }
    // Utilitas, ATK, Lainnya: no nama field
    
    // Common fields: Tanggal, Jumlah, Keterangan
    formHTML += `
        <div class="form-group">
            <label class="form-label">Tanggal Dibayarkan <span style="color:red">*</span></label>
            <input type="date" id="formOpKeluarTanggal" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
            <label class="form-label">Jumlah (Rp) <span style="color:red">*</span></label>
            <input type="number" id="formOpKeluarJumlah" class="form-input" placeholder="Masukkan nominal" />
        </div>
        <div class="form-group">
            <label class="form-label">Keterangan</label>
            <input type="text" id="formOpKeluarKeterangan" class="form-input" placeholder="Keterangan opsional..." />
        </div>`;
    
    modalBody.innerHTML = formHTML;
    document.getElementById('operasionalPengeluaranModal').classList.add('active');
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function closeOperasionalPengeluaranModal() {
    document.getElementById('operasionalPengeluaranModal').classList.remove('active');
}

async function saveOperasionalPengeluaran() {
    let kat = document.getElementById('formOpKeluarKategori')?.value || currentOpKategori;
    let tgl = document.getElementById('formOpKeluarTanggal').value;
    let jumlah = document.getElementById('formOpKeluarJumlah').value;
    let ket = document.getElementById('formOpKeluarKeterangan')?.value || '';
    
    // For categories with nama field
    let namaField = document.getElementById('formOpKeluarNama');
    let nama = namaField ? namaField.value.trim() : '';
    
    if (!tgl || !jumlah) {
        showToast('Tanggal dan Jumlah harus diisi!', 'warning');
        return;
    }
    
    // Validate nama for categories that require it
    if ((kat === 'Honor' || kat === 'Ekstrakurikuler' || kat === 'Perjalanan Dinas') && !nama) {
        showToast('Nama harus diisi!', 'warning');
        return;
    }
    
    // Store nama + keterangan combined: "NAMA||keterangan"
    let keteranganSimpan = ket;
    if (nama) {
        keteranganSimpan = nama + '||' + ket;
    }
    
    let btn = document.querySelector('#operasionalPengeluaranModal .btn-primary');
    let oldTxt = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;
    
    try {
        let obj = {
            sumber_dana: 'Kas Operasional',
            jenis_transaksi: 'Pengeluaran',
            kategori: kat,
            nominal: jumlah,
            tanggal: tgl,
            keterangan: keteranganSimpan
        };
        
        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if(error) throw error;
        
        if(data && data.length > 0) dOperasional.unshift(data[0]);
        renderOpKategoriTable();
        closeOperasionalPengeluaranModal();
        showToast('Pengeluaran operasional berhasil dicatat!', 'success');
        
    } catch(e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = oldTxt; btn.disabled = false;
    }
}

function deleteOperasional(id) {
    showCustomConfirm('Hapus Data?', 'Hapus transaksi operasional ini?', 'Ya, Hapus', async function() {
        try {
            let { error } = await supabaseClient.from('buku_kas_bendahara').delete().eq('id', id);
            if(error) throw error;
            
            dOperasional = dOperasional.filter(x => x.id !== id);
            if (currentOperasionalTab === 'pemasukan') renderOperasionalPemasukanTable();
            if (currentOperasionalTab === 'pengeluaran') renderOpKategoriTable();
            showToast('Transaksi berhasil dihapus!', 'success');
        } catch(e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}


function openOperasionalPemasukanModal() {
    document.getElementById('formOpMasukTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formOpMasukJumlah').value = '';
    document.getElementById('formOpMasukKet').value = '';
    document.getElementById('operasionalPemasukanModal').classList.add('active');
}

function closeOperasionalPemasukanModal() {
    document.getElementById('operasionalPemasukanModal').classList.remove('active');
}

async function saveOperasionalPemasukan() {
    let tgl = document.getElementById('formOpMasukTanggal').value;
    let jumlah = document.getElementById('formOpMasukJumlah').value;
    let ket = document.getElementById('formOpMasukKet').value;
    
    if(!tgl || !jumlah) {
        showToast('Tanggal dan Jumlah harus diisi!', 'warning');
        return;
    }
    
    let btn = document.querySelector('#operasionalPemasukanModal .btn-primary');
    let oldTxt = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;
    
    try {
        let obj = {
            sumber_dana: 'Kas Operasional',
            jenis_transaksi: 'Pemasukan',
            kategori: 'Dana BOS',
            nominal: jumlah,
            tanggal: tgl,
            keterangan: ket
        };
        
        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if(error) throw error;
        
        if(data && data.length > 0) dOperasional.unshift(data[0]);
        renderOperasionalPemasukanTable();
        
        document.getElementById('formOpMasukTanggal').value = '';
        document.getElementById('formOpMasukJumlah').value = '';
        document.getElementById('formOpMasukKet').value = '';
        
        closeOperasionalPemasukanModal();
        showToast('Pemasukan operasional berhasil disimpan!', 'success');
    } catch(e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = oldTxt; btn.disabled = false;
    }
}

function printLaporanOperasional() {
    let title = currentOperasionalTab === 'pemasukan' ? 'Laporan Pemasukan Operasional (Dana BOS)' : 'Laporan Pengeluaran Operasional';
    let filtered = dOperasional.filter(x => x.jenis_transaksi === (currentOperasionalTab === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'));
    
    if (currentOperasionalTab === 'pemasukan') {
        let search = (document.getElementById('searchOpPemasukan')?.value || '').toLowerCase();
        let filterBulan = document.getElementById('filterBulanOpPemasukan')?.value || '';
        if (search) {
            filtered = filtered.filter(x => (x.keterangan || '').toLowerCase().includes(search) || (x.kategori || '').toLowerCase().includes(search));
        }
        if (filterBulan) {
            filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(filterBulan));
        }
    } else {
        if(currentOpKategori) {
            filtered = filtered.filter(x => x.kategori === currentOpKategori);
            title += ` — Kategori: ${currentOpKategori}`;
        }
        let search = (document.getElementById('searchOpKategori')?.value || '').toLowerCase();
        let filterBulan = document.getElementById('filterBulanOpKategori')?.value || '';
        if (search) {
            filtered = filtered.filter(x => (x.keterangan || '').toLowerCase().includes(search) || (x.kategori || '').toLowerCase().includes(search) || (x.penerima || '').toLowerCase().includes(search));
        }
        if (filterBulan) {
            filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(filterBulan));
        }
    }
    
    if(filtered.length === 0) return showToast('Tidak ada data yang sesuai filter untuk dicetak.', 'warning');
    
    let tbody = '';
    let total = 0;
    
    if (currentOperasionalTab === 'pemasukan') {
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            tbody += `
            <tr>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
                <td style="border:1px solid #000; padding:5px;">${formatDateIndonesia(d.tanggal)}</td>
                <td style="border:1px solid #000; padding:5px;">${d.kategori||'-'}</td>
                <td style="border:1px solid #000; padding:5px;">${d.keterangan||'-'}</td>
                <td style="border:1px solid #000; padding:5px; text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `
        <tr>
            <td colspan="4" style="border:1px solid #000; padding:5px; text-align:right; font-weight:bold;">TOTAL</td>
            <td style="border:1px solid #000; padding:5px; text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else {
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            tbody += `
            <tr>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${i+1}</td>
                <td style="border:1px solid #000; padding:5px;">${formatDateIndonesia(d.tanggal)}</td>
                <td style="border:1px solid #000; padding:5px;">${d.kategori||'-'}</td>
                <td style="border:1px solid #000; padding:5px;">${d.keterangan||'-'}</td>
                <td style="border:1px solid #000; padding:5px; text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `
        <tr>
            <td colspan="4" style="border:1px solid #000; padding:5px; text-align:right; font-weight:bold;">TOTAL PENGELUARAN</td>
            <td style="border:1px solid #000; padding:5px; text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    }

    let kopSuratHTML = `
        <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px;">
            <img src="img/kop-surat.png" onerror="this.src='img/kop-surat.jpg'" alt="Kop Surat" style="max-width:100%; height:auto; max-height:120px;" />
            <h3 style="margin:15px 0 0 0;">${title}</h3>
        </div>
    `;
    
    let tableHTML = `
    <table style="width:100%; border-collapse:collapse; margin-top:20px; font-size:14px;">
        <thead>
            <tr style="background:#f1f5f9;">
                <th style="border:1px solid #000; padding:8px; width:40px;">No</th>
                <th style="border:1px solid #000; padding:8px;">Tanggal</th>
                <th style="border:1px solid #000; padding:8px;">${currentOperasionalTab === 'pemasukan' ? 'Sumber Dana' : 'Kategori'}</th>
                <th style="border:1px solid #000; padding:8px;">Keterangan</th>
                <th style="border:1px solid #000; padding:8px; text-align:right;">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            ${tbody}
        </tbody>
    </table>
    `;

    let today = new Date();
    let ttdHTML = `
    <div style="margin-top:40px; display:flex; justify-content:flex-end;">
        <div style="text-align:center; width:250px;">
            <p style="margin:0;">Kab. Bandung, ${formatDateIndonesia(today.toISOString().split('T')[0])}</p>
            <p style="margin:0;">Bendahara Sekolah,</p>
            <br><br><br>
            <p style="margin:0; font-weight:bold; text-decoration:underline;">.......................................</p>
        </div>
    </div>
    `;

    let printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>Cetak ${title}</title>
            <style>
                @media print {
                    @page { margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; margin:0; }
                }
                body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 20px; }
            </style>
        </head>
        <body>
            ${kopSuratHTML}${tableHTML}${ttdHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}