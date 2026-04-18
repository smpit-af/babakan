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

        currentUser = { id: session.user.id, email: session.user.email, name: profile.full_name };
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
                '<button onclick="stopSimulasi()" style="margin-left:15px;padding:4px 14px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.3);">Berhenti & Kembali ke Admin</button>';
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

        // Load data for admin/kurikulum
        if (['admin', 'kurikulum'].includes(currentRole)) {
            loadStats();
            renderPendingAccounts();
            renderActiveAccounts();
            renderInactiveAccounts();
            loadBeritaAdmin();
            if (typeof loadSPMBConfigDashboard === 'function') loadSPMBConfigDashboard();
            loadSPMBData();
            loadActiveYear();
            loadMasterKelas();
            loadGuruData();
            loadSiswaData();
            loadAlumniData();
            loadMutasiData();
            loadPengumumanAdmin();
        }

        // Load pengumuman, galeri, + siswa for dashboard (all roles)
        loadDashboardPengumuman();
        loadGaleriBeranda();
        if (['admin', 'kurikulum'].includes(currentRole)) {
            loadDashGuru();
            loadDashSiswa();
        }

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

    // Akademik & Asesmen
    var isAkademik = ['admin', 'kurikulum', 'kesiswaan', 'wali_kelas', 'guru_mapel', 'operator_sekolah'].includes(role);
    document.querySelectorAll('.role-akademik').forEach(function (el) {
        el.style.display = isAkademik ? '' : 'none';
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

    // Non Siswa
    var isNonSiswa = role !== 'siswa';
    document.querySelectorAll('.role-non-siswa').forEach(function (el) {
        el.style.display = isNonSiswa ? '' : 'none';
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
    if (sectionId === 'sectionTahunKelas') { loadActiveYear(); loadMasterKelas(); loadMasterMapel(); }
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
    if (sectionId === 'sectionJurnalMengajar') { loadMasterKelas(); loadMasterMapel(); loadActiveYear(); loadJurnalMengajar(); }
    if (sectionId === 'sectionLaporanJurnal') { loadLaporanJurnal(); }
    if (sectionId === 'sectionPenilaian') { 
        (async function() {
            await loadActiveYear();
            await loadMasterKelas();
            await loadMasterMapel();
            var lbl = document.getElementById('lblActiveYear');
            if (lbl && document.getElementById('filterPenilaianTahun')) {
                document.getElementById('filterPenilaianTahun').value = lbl.textContent;
            }
            populateKelasDropdown('filterPenilaianKelas', '');
            populateMapelIdDropdown('filterPenilaianMapel', '');
        })();
    }
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
    if (sectionId === 'sectionBuatSoal') { loadAsesmenConfig(); loadMasterKelas(); loadMasterMapel(); loadActiveYear(); loadAsesmenList(); }
    if (sectionId === 'sectionArsipAsesmen') { loadMasterKelas(); loadMasterMapel(); loadActiveYear(); populateArsipFilters(); loadArsipAsesmen(); }
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
    document.getElementById('beritaGambar').value = data ? (data.gambar_url || '') : '';
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
        gambar_url: document.getElementById('beritaGambar').value.trim() || null,
        tanggal: document.getElementById('beritaTanggal').value || new Date().toISOString().split('T')[0],
        is_published: document.getElementById('beritaPublished').value === 'true'
    };
    if (!payload.judul) { showToast('Judul wajib diisi!', 'warning'); return; }

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
            return;
        }
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
                '<td><a href="' + imgURL + '" target="_blank" style="color:var(--primary);text-decoration:none;"><i data-lucide="external-link" style="width:14px;height:14px"></i> Lihat Gambar</a></td>' +
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
    document.getElementById('eskulGambar').value = data ? data.gambar_url : '';
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
        gambar_url: document.getElementById('eskulGambar').value.trim(),
        updated_at: new Date().toISOString()
    };
    if (!payload.nama_ekskul || !payload.gambar_url) { showToast('Nama dan URL Gambar wajib diisi!', 'warning'); return; }

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
                '<td><a href="' + imgURL + '" target="_blank" style="color:var(--primary);text-decoration:none;"><i data-lucide="external-link" style="width:14px;height:14px"></i> Lihat Gambar</a></td>' +
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
    document.getElementById('sarprasGambar').value = data ? data.gambar_url : '';
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
        gambar_url: document.getElementById('sarprasGambar').value.trim(),
        updated_at: new Date().toISOString()
    };
    if (!payload.nama || !payload.gambar_url) { showToast('Nama dan URL Gambar wajib diisi!', 'warning'); return; }

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
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas)').not('status', 'in', '("Lulus","Pindah")').order('nama_lengkap');
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-light)">Belum ada data siswa.</td></tr>';
            if (countEl) countEl.textContent = '0 siswa';
            return;
        }
        if (countEl) countEl.textContent = data.length + ' siswa';
        tbody.innerHTML = data.map(function(s, i) {
            var kelas = s.master_kelas ? s.master_kelas.nama_kelas : '-';
            var statusBadge = s.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;font-size:.75rem;">Aktif</span>' :
                s.status === 'Pindahan' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;">Pindahan</span>' :
                '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;font-size:.75rem;">' + (s.status||'-') + '</span>';
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:500;">' + (s.nama_lengkap||'-') + '</td>' +
                '<td>' + (s.jenis_kelamin||'-') + '</td>' +
                '<td>' + kelas + '</td>' +
                '<td>' + (s.nisn||'-') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '</tr>';
        }).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
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
            return '<tr><td style="font-weight:600">' + (u.full_name || '-') +
                (isMe ? ' <span class="badge badge-blue" style="font-size:.65rem;">Anda</span>' : '') +
                '</td><td>' + (u.email || '-') + '</td><td><span class="badge badge-blue">' + getRoleLabel(u.role) + '</span></td>' +
                '<td><div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
                (isMe ? '<span style="font-size:.8rem;color:var(--text-light)">—</span>' :
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
    try {
        const { error } = await supabaseClient.from('profiles').update({ role: rs.value }).eq('id', userId);
        if (error) throw error;
        showToast('Akun berhasil disetujui!', 'success');
        renderPendingAccounts(); renderActiveAccounts(); loadStats();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deactivateUser(userId, name) {
    showCustomConfirm('Nonaktifkan Akun?', 'Akun <strong>"' + name + '"</strong> akan dinonaktifkan dan tidak bisa login.', 'Ya, Nonaktifkan', async function () {
        try {
            const { error } = await supabaseClient.from('profiles').update({ role: 'nonaktif' }).eq('id', userId);
            if (error) throw error;
            showToast('Akun "' + name + '" dinonaktifkan.', 'success');
            renderActiveAccounts(); renderInactiveAccounts(); loadStats();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function reactivateUser(userId, name) {
    showCustomConfirm('Aktifkan Kembali?', 'Akun <strong>"' + name + '"</strong> akan dipindahkan ke daftar menunggu persetujuan.', 'Ya, Aktifkan', async function () {
        try {
            const { error } = await supabaseClient.from('profiles').update({ role: 'menunggu_persetujuan' }).eq('id', userId);
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

async function gantiTahunDanNaikKelas() {
    showCustomConfirm('Kenaikan Kelas Otomatis?', '<strong>PERINGATAN!</strong> Proses ini akan:<br>1. Siswa Kelas 9 → Status diubah menjadi <strong>Lulus</strong> (masuk Alumni)<br>2. Siswa Kelas 7 & 8 → Naik 1 tingkat (7A→8A, 8B→9B)<br><br>Proses ini <strong>tidak dapat dibatalkan</strong>. Pastikan Anda telah memperbarui Tahun Pelajaran terlebih dahulu.', 'Ya, Proses Sekarang', async function() {
        try {
            const { error } = await supabaseClient.rpc('promote_students_next_year');
            if (error) throw error;
            showToast('Kenaikan kelas berhasil diproses!', 'success');
            loadSiswaData();
            loadAlumniData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
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
            var kkmVal = k.kkm ? '<strong>' + k.kkm + '</strong>' : '<span style="color:var(--text-light)">-</span>';
            return '<tr><td>' + (i+1) + '</td><td>' + k.nama_kelas + '</td><td>' + k.tingkat + '</td>' +
                '<td style="text-align:center;">' + kkmVal + '</td>' +
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
    document.getElementById('formKelasKkm').value = '';
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
    document.getElementById('formKelasKkm').value = k.kkm || '';
    document.getElementById('kelasModalTitle').textContent = 'Edit Kelas';
    document.getElementById('kelasModal').classList.add('active');
}

async function saveKelas() {
    var id = document.getElementById('formKelasId').value;
    var nama = document.getElementById('formKelasNama').value.trim();
    var tingkat = parseInt(document.getElementById('formKelasTingkat').value);
    var kkm = document.getElementById('formKelasKkm').value ? parseInt(document.getElementById('formKelasKkm').value) : null;
    if (!nama) { showToast('Nama kelas wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('master_kelas').update({ nama_kelas: nama, tingkat: tingkat, kkm: kkm }).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('master_kelas').insert([{ nama_kelas: nama, tingkat: tingkat, kkm: kkm }]);
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

function previewProfilGuruFoto(input) {
    var preview = document.getElementById('profilGuruFotoPreview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function loadProfilGuru() {
    if (!currentUser) return;
    // Populate mapel dropdown
    populateMapelDropdown('profilGuruMapel', '');

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
            if (data.foto_url) {
                var preview = document.getElementById('profilGuruFotoPreview');
                if (preview) preview.innerHTML = '<img src="' + data.foto_url + '" style="width:100%;height:100%;object-fit:cover;">';
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

        // Handle photo upload
        var fileInput = document.getElementById('profilGuruFoto');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            var file = fileInput.files[0];
            if (file.size > 2 * 1024 * 1024) {
                hideGlobalLoader();
                showToast('Ukuran foto melebihi 2MB!', 'warning');
                return;
            }
            var fileName = 'guru-foto/' + currentUser.id + '_' + Date.now() + '.' + file.name.split('.').pop();
            var { error: uploadError } = await supabaseClient.storage
                .from('guru-foto')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });
            if (uploadError) throw uploadError;
            var publicUrlResult = supabaseClient.storage.from('guru-foto').getPublicUrl(fileName);
            obj.foto_url = publicUrlResult.data.publicUrl;
        }

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
        loadProfilGuru();
    } catch(e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
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

function openGuruModal() {
    document.getElementById('formGuruId').value = '';
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
    document.getElementById('guruModal').classList.add('active');
}
function closeGuruModal() { document.getElementById('guruModal').classList.remove('active'); }

function editGuru(id) {
    var g = guruList.find(function(x) { return x.id === id; });
    if (!g) return;
    document.getElementById('formGuruId').value = g.id;
    document.getElementById('formGuruNama').value = g.nama_lengkap || '';
    document.getElementById('formGuruJK').value = g.jenis_kelamin || '';
    document.getElementById('formGuruJabatan').value = g.jabatan || '';
    document.getElementById('formGuruJabatanTambahan').value = g.jabatan_tambahan || '';
    document.getElementById('formGuruNIK').value = g.nik || '';
    document.getElementById('formGuruHP').value = g.nomor_hp || '';
    document.getElementById('formGuruEmail').value = g.email || '';
    populateMapelDropdown('formGuruMapel', g.mata_pelajaran || '');
    populateMapelDropdown('formGuruMapel2', g.mata_pelajaran_2 || '');
    populateMapelDropdown('formGuruMapel3', g.mata_pelajaran_3 || '');
    document.getElementById('formGuruSertifikasi').value = g.sertifikasi || '';
    document.getElementById('formGuruAlamat').value = g.alamat || '';
    document.getElementById('formGuruStatus').value = g.status || 'Aktif';
    document.getElementById('guruModalTitle').textContent = 'Edit Guru';
    document.getElementById('guruModal').classList.add('active');
}

async function saveGuru() {
    var id = document.getElementById('formGuruId').value;
    var obj = {
        nama_lengkap: document.getElementById('formGuruNama').value.trim(),
        jenis_kelamin: document.getElementById('formGuruJK').value || null,
        jabatan: document.getElementById('formGuruJabatan').value.trim() || null,
        jabatan_tambahan: document.getElementById('formGuruJabatanTambahan').value.trim() || null,
        nik: document.getElementById('formGuruNIK').value.trim() || null,
        nomor_hp: document.getElementById('formGuruHP').value.trim() || null,
        email: document.getElementById('formGuruEmail').value.trim() || null,
        mata_pelajaran: document.getElementById('formGuruMapel').value.trim() || null,
        mata_pelajaran_2: document.getElementById('formGuruMapel2').value.trim() || null,
        mata_pelajaran_3: document.getElementById('formGuruMapel3').value.trim() || null,
        sertifikasi: document.getElementById('formGuruSertifikasi').value || null,
        alamat: document.getElementById('formGuruAlamat').value.trim() || null,
        status: document.getElementById('formGuruStatus').value
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
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas, tingkat)').not('status', 'in', '("Lulus","Pindah")').order('nama_lengkap');
        if (error) throw error;
        siswaList = data || [];
        var tbody = document.getElementById('siswaTableBody');
        if (!tbody) return;
        if (siswaList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data siswa.</td></tr>';
            return;
        }
        tbody.innerHTML = siswaList.map(function(s, i) {
            var kelasNama = s.master_kelas ? s.master_kelas.nama_kelas : '-';
            var statusBadge = s.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Aktif</span>' : s.status === 'Pindahan' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Pindahan</span>' : '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">' + (s.status||'-') + '</span>';
            return '<tr><td>' + (i+1) + '</td><td>' + (s.asal_sekolah||'-') + '</td><td>' + (s.nama_lengkap||'-') + '</td><td>' + (s.jenis_kelamin||'-') + '</td><td>' + kelasNama + '</td><td>' + (s.nisn||'-') + '</td><td>' + (s.nama_wali_murid||'-') + '</td><td>' + (s.jenis_kelamin_wm||'-') + '</td><td>' + (s.nik_wali||'-') + '</td><td>' + (s.nomor_hp||'-') + '</td><td>' + (s.email||'-') + '</td><td>' + (s.alamat||'-') + '</td><td>' + statusBadge + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editSiswa(\'' + s.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteSiswa(\'' + s.id + '\',\'' + (s.nama_lengkap||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal muat siswa: ' + e.message, 'error'); }
}

function openSiswaModal() {
    document.getElementById('formSiswaId').value = '';
    document.getElementById('formSiswaNama').value = '';
    document.getElementById('formSiswaJK').value = '';
    document.getElementById('formSiswaNISN').value = '';
    document.getElementById('formSiswaAsal').value = '';
    document.getElementById('formSiswaWali').value = '';
    document.getElementById('formSiswaJKWM').value = '';
    document.getElementById('formSiswaNIKWali').value = '';
    document.getElementById('formSiswaHP').value = '';
    document.getElementById('formSiswaEmail').value = '';
    document.getElementById('formSiswaAlamat').value = '';
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
    document.getElementById('formSiswaWali').value = s.nama_wali_murid || '';
    document.getElementById('formSiswaJKWM').value = s.jenis_kelamin_wm || '';
    document.getElementById('formSiswaNIKWali').value = s.nik_wali || '';
    document.getElementById('formSiswaHP').value = s.nomor_hp || '';
    document.getElementById('formSiswaEmail').value = s.email || '';
    document.getElementById('formSiswaAlamat').value = s.alamat || '';
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
        nama_wali_murid: document.getElementById('formSiswaWali').value.trim() || null,
        jenis_kelamin_wm: document.getElementById('formSiswaJKWM').value || null,
        nik_wali: document.getElementById('formSiswaNIKWali').value.trim() || null,
        nomor_hp: document.getElementById('formSiswaHP').value.trim() || null,
        email: document.getElementById('formSiswaEmail').value.trim() || null,
        alamat: document.getElementById('formSiswaAlamat').value.trim() || null
    };
    if (!obj.nama_lengkap) { showToast('Nama siswa wajib diisi!', 'warning'); return; }
    try {
        if (id) {
            const { error } = await supabaseClient.from('siswa').update(obj).eq('id', id);
            if (error) throw error;
        } else {
            obj.status = 'Aktif';
            const { error } = await supabaseClient.from('siswa').insert([obj]);
            if (error) throw error;
        }
        showToast('Data siswa berhasil disimpan!', 'success');
        closeSiswaModal();
        loadSiswaData();
    } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
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
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data alumni.</td></tr>';
            return;
        }
        tbody.innerHTML = alumniList.map(function(a, i) {
            var sekolahTujuan = a.sekolah_tujuan || '<em style="color:var(--text-light)">Belum diisi</em>';
            return '<tr><td>' + (i+1) + '</td><td>' + (a.asal_sekolah||'-') + '</td><td>' + (a.nama_lengkap||'-') + '</td><td>' + (a.jenis_kelamin||'-') + '</td><td>' + (a.nisn||'-') + '</td><td>' + (a.nama_wali_murid||'-') + '</td><td>' + (a.nomor_hp||'-') + '</td><td>' + (a.alamat||'-') + '</td><td>' + sekolahTujuan + '</td>' +
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
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data mutasi siswa.</td></tr>';
            return;
        }
        tbody.innerHTML = mutasiList.map(function(m, i) {
            var kelasNama = m.master_kelas ? m.master_kelas.nama_kelas : '-';
            var tglMutasi = m.tanggal_mutasi ? new Date(m.tanggal_mutasi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var tipeBadge = m.tipe_mutasi === 'Masuk'
                ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">▼ Masuk</span>'
                : '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">▲ Keluar</span>';
            return '<tr>' +
                '<td>' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (m.nama_lengkap||'-') + '</td>' +
                '<td>' + (m.jenis_kelamin||'-') + '</td>' +
                '<td>' + kelasNama + '</td>' +
                '<td>' + (m.nisn||'-') + '</td>' +
                '<td>' + tipeBadge + '</td>' +
                '<td>' + (m.sekolah_asal||'-') + '</td>' +
                '<td>' + (m.sekolah_tujuan||'-') + '</td>' +
                '<td>' + tglMutasi + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (m.keterangan||'-') + '</td>' +
                '<td style="text-align:center;"><button class="btn-icon btn-icon-red" onclick="deleteMutasi(\'' + m.id + '\',\'' + (m.nama_lengkap||'').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td>' +
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
    document.getElementById('formMutasiMasukWali').value = '';
    document.getElementById('formMutasiMasukJKWM').value = '';
    document.getElementById('formMutasiMasukNIKWali').value = '';
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
    var wali = document.getElementById('formMutasiMasukWali').value.trim() || null;
    var jkWm = document.getElementById('formMutasiMasukJKWM').value || null;
    var nikWali = document.getElementById('formMutasiMasukNIKWali').value.trim() || null;
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
            nama_wali_murid: wali,
            jenis_kelamin_wm: jkWm,
            nik_wali: nikWali,
            nomor_hp: hp,
            email: email,
            alamat: alamat,
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
            nama_wali_murid: wali,
            nomor_hp: hp,
            alamat: alamat
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
                nama_wali_murid: siswa.nama_wali_murid,
                nomor_hp: siswa.nomor_hp,
                alamat: siswa.alamat
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
    showCustomConfirm('Hapus Data Mutasi?', 'Data mutasi <strong>"' + nama + '"</strong> akan dihapus dari rekap.<br><br><em>Catatan: Data di Data Induk Siswa tidak akan terpengaruh.</em>', 'Ya, Hapus', async function() {
        try {
            const { error } = await supabaseClient.from('mutasi_siswa').delete().eq('id', id);
            if (error) throw error;
            showToast('Data mutasi dihapus!', 'success');
            loadMutasiData();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
    });
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
// PERJALANAN DINAS
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
        const { data, error } = await supabaseClient.from('bank_soal').select('*, master_kelas(nama_kelas, tingkat)').order('created_at', { ascending: false });
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">' +
            (bankSoalList.length === 0 ? 'Belum ada data bank soal.' : 'Tidak ada soal yang cocok dengan filter.') + '</td></tr>';
        if (window.lucide) lucide.createIcons();
        return;
    }

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
        return '<tr><td>' + (i+1) + '</td><td>' + b.mapel + '</td><td>' + kelasNama + '</td><td>' + semesterBadge + '</td><td>' + tipeBadge + '</td><td>' + linkBadge + '</td><td>' + b.tahun_pelajaran + '</td>' +
            '<td style="text-align:center;white-space:nowrap;">' +
            '<button class="btn btn-sm" style="background:#10b981;color:#fff;padding:4px 6px;" onclick="downloadBankSoalFile(\'' + safeUrl + '\',\'' + dlName.replace(/'/g, "\\'") + '\')" title="Download"><i data-lucide="download" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-warning" onclick="editBankSoal(\'' + b.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-danger" onclick="deleteBankSoal(\'' + b.id + '\',\'' + b.mapel.replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
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
}// ============================================================
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
            return '<tr><td>' + (i+1) + '</td><td>' + date + '</td><td>' + isAnon + '</td><td>' + k.pesan + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-danger" onclick="deleteKritik(\'' + k.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) { showToast('Gagal memuat kritik & saran', 'error'); }
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
    
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Mencari data siswa...</td></tr>';
    btnSimpan.style.display = 'none';
    
    try {
        // 1. Dapatkan KKM dari master_kelas
        var kelasObj = masterKelasList.find(function(k) { return k.id === filterKelas; });
        var kkm = kelasObj && kelasObj.kkm ? kelasObj.kkm : 0;
        penilaianState.currentKkm = kkm;
        
        // 2. Dapatkan Daftar Siswa di Kelas Ini
        const { data: siswaData, error: errSiswa } = await supabaseClient.from('siswa').select('id, nama_lengkap').eq('kelas_id', filterKelas).order('nama_lengkap');
        if (errSiswa) throw errSiswa;
        if (!siswaData || siswaData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada siswa di kelas ini.</td></tr>';
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
        
        // 4. Render Tabel
        var kkmBadge = kkm > 0 ? kkm : '<span style="color:var(--danger)">Belum diatur</span>';
        var kelasNama = kelasObj ? kelasObj.nama_kelas : '-';
        
        tbody.innerHTML = siswaData.map(function(s, i) {
            var nsts = nilaiDict[s.id] && nilaiDict[s.id].nilai_sts !== null ? nilaiDict[s.id].nilai_sts : '';
            var nsas = nilaiDict[s.id] && nilaiDict[s.id].nilai_sas !== null ? nilaiDict[s.id].nilai_sas : '';
            var nsaj = nilaiDict[s.id] && nilaiDict[s.id].nilai_saj !== null ? nilaiDict[s.id].nilai_saj : '';
            var nsat = nilaiDict[s.id] && nilaiDict[s.id].nilai_sat !== null ? nilaiDict[s.id].nilai_sat : '';
            
            return '<tr class="tr-penilaian" data-siswa="' + s.id + '">' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + s.nama_lengkap + '</td>' +
                '<td style="color:var(--text-light);font-size:0.85rem;">' + kelasNama + '</td>' +
                '<td style="text-align:center;font-weight:bold;">' + kkmBadge + '</td>' +
                '<td style="text-align:center;"><input type="number" class="form-input val-sts" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsts + '" min="0" max="100" placeholder="0" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" /></td>' +
                '<td style="text-align:center;"><input type="number" class="form-input val-sas" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsas + '" min="0" max="100" placeholder="0" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" /></td>' +
                '<td style="text-align:center;"><input type="number" class="form-input val-saj" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsaj + '" min="0" max="100" placeholder="0" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" /></td>' +
                '<td style="text-align:center;"><input type="number" class="form-input val-sat" style="padding:4px 8px;text-align:center;width:70px;margin:0 auto;" value="' + nsat + '" min="0" max="100" placeholder="0" onkeyup="calcRowStatus(this)" onchange="calcRowStatus(this)" /></td>' +
                '<td class="td-rata" style="text-align:center;font-weight:bold;font-size:0.9rem;">-</td>' +
                '<td class="td-ket" style="text-align:center;font-size:0.8rem;">-</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-outline" onclick="openRiwayatNilai(\'' + s.id + '\',\'' + s.nama_lengkap.replace(/\'/g, "\\\'" ) + '\')" title="Lihat Riwayat"><i data-lucide="history" style="width:14px;height:14px"></i></button></td>' +
                '</tr>';
        }).join('');
        
        // Initial status calculation
        tbody.querySelectorAll('.val-sts').forEach(function(el) { calcRowStatus(el); });
        
        btnSimpan.style.display = 'inline-flex';
        
    } catch(e) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger)">Terjadi Kesalahan: ' + e.message + '</td></tr>'; }
}

function calcRowStatus(el) {
    var tr = el.closest('tr');
    var inputSts = tr.querySelector('.val-sts').value;
    var inputSas = tr.querySelector('.val-sas').value;
    var inputSaj = tr.querySelector('.val-saj').value;
    var inputSat = tr.querySelector('.val-sat').value;
    var tdRata = tr.querySelector('.td-rata');
    var tdKet = tr.querySelector('.td-ket');
    
    if (inputSts === '' && inputSas === '' && inputSaj === '' && inputSat === '') {
        tdRata.innerHTML = '<span style="color:var(--text-light)">-</span>';
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
    
    if (penilaianState.currentKkm <= 0) {
        tdKet.innerHTML = '<span style="color:var(--text-light);font-size:0.75rem;">KKM Blm Diatur</span>';
        return;
    }
    
    if (avg >= penilaianState.currentKkm) {
        tdRata.querySelector('span').style.color = '#22c55e';
        tdKet.innerHTML = '<span class="badge badge-green" style="font-size:0.75rem;">Lulus</span>';
    } else {
        tdRata.querySelector('span').style.color = '#ef4444';
        tdKet.innerHTML = '<span class="badge badge-red" style="font-size:0.75rem;">Belum Lulus</span>';
    }
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
        
        // Kelompokkan per tahun pelajaran
        var groups = {};
        data.forEach(function(n) {
            var key = n.tahun_pelajaran;
            if (!groups[key]) groups[key] = [];
            groups[key].push(n);
        });
        
        var html = '';
        Object.keys(groups).forEach(function(tahun) {
            var items = groups[tahun];
            html += '<div style="margin-bottom:1.5rem;">' +
                '<h4 style="margin-bottom:0.5rem;color:var(--primary);">📅 T.P. ' + tahun + '</h4>' +
                '<div style="overflow-x:auto;"><table class="dash-table" style="font-size:0.85rem;"><thead><tr>' +
                '<th>Semester</th><th>Kelas</th><th>Mapel</th><th style="text-align:center;">STS</th><th style="text-align:center;">SAS</th><th style="text-align:center;">SAJ</th><th style="text-align:center;">SAT</th>' +
                '</tr></thead><tbody>';
            items.forEach(function(n) {
                var kelasNama = n.master_kelas ? n.master_kelas.nama_kelas : '-';
                var mapelNama = n.master_mapel ? n.master_mapel.nama_mapel : '-';
                html += '<tr>' +
                    '<td>' + n.semester + '</td>' +
                    '<td>' + kelasNama + '</td>' +
                    '<td>' + mapelNama + '</td>' +
                    '<td style="text-align:center;font-weight:bold;">' + (n.nilai_sts !== null ? n.nilai_sts : '-') + '</td>' +
                    '<td style="text-align:center;font-weight:bold;">' + (n.nilai_sas !== null ? n.nilai_sas : '-') + '</td>' +
                    '<td style="text-align:center;font-weight:bold;">' + (n.nilai_saj !== null ? n.nilai_saj : '-') + '</td>' +
                    '<td style="text-align:center;font-weight:bold;">' + (n.nilai_sat !== null ? n.nilai_sat : '-') + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div></div>';
        });
        
        content.innerHTML = html;
    } catch(e) {
        content.innerHTML = '<p style="color:var(--danger);text-align:center;">Gagal memuat riwayat: ' + e.message + '</p>';
    }
}

function closeRiwayatNilai() {
    document.getElementById('riwayatNilaiModal').classList.remove('active');
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
        var kkm = kelasObj && kelasObj.kkm ? kelasObj.kkm : 0;
        
        var mapelObj = masterMapelList.find(function(m) { return m.id === filterMapel; });
        var mapelNama = mapelObj ? mapelObj.nama_mapel : '-';
        
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
    var kkm = kelasObj && kelasObj.kkm ? kelasObj.kkm : '-';
    var mapelObj = masterMapelList.find(function(m) { return m.id === filterMapel; });
    var mapelNama = mapelObj ? mapelObj.nama_mapel : '-';
    
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
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('asesmen').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        asesmenList = (data || []).filter(function(a) { return !a.archived_at; });
        if (countEl) countEl.textContent = asesmenList.length + ' asesmen';
        if (asesmenList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada asesmen. Klik "Buat Asesmen Baru" untuk mulai.</td></tr>';
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
            var aksiHtml = '';
            if (a.status === 'draft') {
                aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="editAsesmenDraft(\'' + a.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="deleteAsesmen(\'' + a.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
            } else {
                aksiHtml = '<button class="btn-icon btn-icon-amber" onclick="archiveAsesmen(\'' + a.id + '\')" title="Arsipkan"><i data-lucide="archive" style="width:14px;height:14px"></i></button>' +
                    '<button class="btn-icon btn-icon-red" onclick="deleteAsesmen(\'' + a.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
            }
            return '<tr>' +
                '<td style="text-align:center;">' + (i+1) + '</td>' +
                '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                '<td>' + (a.kelas || '-') + '</td>' +
                '<td>' + (a.tipe_ujian || '-') + '</td>' +
                '<td style="text-align:center;">' + jumlahSoal + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + linkHtml + '</td>' +
                '<td><div style="display:flex;gap:.4rem;justify-content:center;">' + aksiHtml + '</div></td>' +
                '</tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

// --- Open Builder (new or edit) ---
async function openAsesmenBuilder(existingId) {
    document.getElementById('asesmenBuilderArea').style.display = 'block';
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

async function editAsesmenDraft(id) {
    await openAsesmenBuilder(id);
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
        var fileName = 'soal_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        var { data, error } = await supabaseClient.storage.from('soal-images').upload(fileName, file, { upsert: true });
        if (error) throw error;
        
        var { data: urlData } = supabaseClient.storage.from('soal-images').getPublicUrl(fileName);
        var publicUrl = urlData.publicUrl;
        
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
            html += '<div class="soal-kunci-row" style="margin-top:0.5rem;background:#f8fafc;padding:0.75rem;border-radius:6px;border:1px dashed #cbd5e1;"><label style="font-weight:600;margin-bottom:0.5rem;display:block;color:var(--text);"><i data-lucide="key" style="width:14px;height:14px;color:#0ea5e9;"></i> Kata Kunci Essay (Opsional):</label>';
            
            var rawKunciStr = s.kunci || '';
            var isOrLogic = rawKunciStr.indexOf('[OR]') === 0;
            var cleanKunciStr = isOrLogic ? rawKunciStr.substring(4) : rawKunciStr;
            
            html += `<select class="form-input soal-metode-essay" style="margin-bottom: 0.8rem; font-size: 0.85rem;" onchange="collectSoalFromDOM()">
                        <option value="AND" ${!isOrLogic ? 'selected' : ''}>Metode: Poin Parsial (Siswa wajib memuat SEMUA kata kunci)</option>
                        <option value="OR" ${isOrLogic ? 'selected' : ''}>Metode: Benar Salah / Sinonim (Cukup muat SALAH SATU = Nilai Penuh)</option>
                     </select>`;
            
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
async function saveDraftAsesmen(autoCloseBuilder) {
    collectSoalFromDOM();
    var judul = (document.getElementById('builderJudul') || {}).value || '';
    var tipe = (document.getElementById('builderTipe') || {}).value || 'STS';
    var mapel = (document.getElementById('builderMapel') || {}).value || '';
    var kelas = (document.getElementById('builderKelas') || {}).value || '';
    var waktu = (document.getElementById('builderWaktu') || {}).value || '';
    var tanggal = (document.getElementById('builderTanggal') || {}).value || '';
    var bobotPG = parseInt((document.getElementById('builderBobotPG') || {}).value) || 0;
    var bobotEssay = parseInt((document.getElementById('builderBobotEssay') || {}).value) || 0;
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
        if (autoCloseBuilder !== false) {
            closeAsesmenBuilder();
        }
        resetAsesmenForms();
        loadAsesmenList();
    } catch(e) { showToast('Gagal menyimpan draft: ' + e.message, 'error'); } 
    finally { hideGlobalLoader(); }
}

// --- Delete Asesmen ---
async function deleteAsesmen(id) {
    showCustomConfirm('Hapus Asesmen?', 'Asesmen ini akan <strong>dihapus permanen</strong> dari Dashboard, termasuk file Form dan Sheet-nya di Google Drive. Lanjutkan?', 'Ya, Hapus', async function() {
        showGlobalLoader('Menghapus Asesmen...');
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

            // Delete soal from Supabase first (cascade should handle, but just in case)
            await supabaseClient.from('asesmen_soal').delete().eq('asesmen_id', id);
            // Delete asesmen from Supabase
            await supabaseClient.from('asesmen').delete().eq('id', id);
            showToast('Asesmen beserta wujud file-nya berhasil dihapus!', 'success');
            closeAsesmenBuilder();
            loadAsesmenList();
        } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
        finally { hideGlobalLoader(); }
    });
}

// ============================================================
// AUTO GENERATE ASESMEN VIA TEKS (SMART PARSER)
// ============================================================

async function openAutoGenerateForm() {
    var area = document.getElementById('asesmenAutoGenerateArea');
    if (area.style.display === 'block') { closeAutoGenerateArea(); return; }
    area.style.display = 'block';
    
    await loadMasterMapel();
    await loadMasterKelas();

    // Populate dropdowns auto mapel
    populateMapelNameDropdown('autoMapel', '');
    populateKelasNameDropdown('autoKelas', '');

    // Auto-fill Tahun Pelajaran dari master data (readonly)
    var lblYear = document.getElementById('lblActiveYear');
    var autoTahun = document.getElementById('autoTahun');
    if (lblYear && autoTahun) {
        var yearVal = lblYear.textContent;
        autoTahun.value = (yearVal && yearVal !== 'Belum diatur') ? yearVal : '';
    }
    
    document.getElementById('autoStatusLabel').innerHTML = '';
    document.getElementById('autoJudul').focus();
    // Tutup builder manual jika terbuka
    document.getElementById('asesmenBuilderArea').style.display = 'none';
}

function closeAutoGenerateArea() {
    document.getElementById('asesmenAutoGenerateArea').style.display = 'none';
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

    // 2. Bersihkan area auto generate
    var autoIds = ['autoJudul', 'autoMapel', 'autoKelas', 'autoWaktu', 'autoTanggal', 'autoTextarea'];
    autoIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var aTipe = document.getElementById('autoTipe'); if(aTipe) aTipe.value = 'PH';
    var aPG = document.getElementById('autoBobotPG'); if(aPG) aPG.value = '2';
    var aEssay = document.getElementById('autoBobotEssay'); if(aEssay) aEssay.value = '0';
    var aStatus = document.getElementById('autoStatusLabel'); if(aStatus) aStatus.innerHTML = '';
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

function previewAutoGenerate() {
    var text = document.getElementById('autoTextarea').value;
    var rawList = parseTextToSoalList(text);
    
    if (rawList.length === 0) {
        document.getElementById('autoStatusLabel').innerHTML = '<span style="color:var(--danger)">Gagal membaca soal. Pastikan naskah diawali format angka, misal: 1. Naskah...</span>';
        return false;
    }
    
    var countPG = rawList.filter(s => s.tipe === 'pg').length;
    var countEssay = rawList.filter(s => s.tipe === 'essay').length;
    
    document.getElementById('autoStatusLabel').innerHTML = 
        '<span style="color:var(--success)">✅ Membaca ' + rawList.length + ' soal (' + countPG + ' PG, ' + countEssay + ' Essay)</span>';
        
    asesmenBuilderSoalList = rawList;
    renderSoalCards();
    
    // Tampilkan manual builder untuk preview
    document.getElementById('asesmenBuilderArea').style.display = 'block';

    // Populate dropdowns for builder before setting values
    populateMapelNameDropdown('builderMapel', '');
    populateKelasNameDropdown('builderKelas', '');

    document.getElementById('builderJudul').value = document.getElementById('autoJudul').value;
    document.getElementById('builderTipe').value = document.getElementById('autoTipe').value;
    document.getElementById('builderMapel').value = document.getElementById('autoMapel').value;
    document.getElementById('builderKelas').value = document.getElementById('autoKelas').value;
    
    var autoThn = document.getElementById('autoTahun');
    if (autoThn) document.getElementById('builderTahun').value = autoThn.value;
    
    document.getElementById('builderBobotPG').value = document.getElementById('autoBobotPG').value;
    document.getElementById('builderBobotEssay').value = document.getElementById('autoBobotEssay').value;
    document.getElementById('builderWaktu').value = document.getElementById('autoWaktu').value;
    document.getElementById('builderTanggal').value = document.getElementById('autoTanggal').value;
    
    document.getElementById('builderAsesmenId').value = ''; // pastikan id kosong sbg rancangan baru
    return true;
}

function submitAutoGenerate() {
    var stat = previewAutoGenerate(); 
    if (stat) {
        // Cek mapel dkk
        var jdl = document.getElementById('autoJudul').value;
        if (!jdl.trim()) { showToast('Isi judul asesmen!', 'warning'); return; }
        
        showCustomConfirm(
            '[AUTO GENERATE] Terbitkan Langsung?',
            'Anda sudah melihat pratinjaunya di form bawah.' +
            '<br>Sistem akan otomatis menge-save data ini dan menerbitkannya ke Google Form.<br>Lanjutkan?',
            'Ya, Terbitkan & Tutup Auto-Area',
            function() {
                closeAutoGenerateArea();
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
            
            var aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="restoreArsipAsesmen(\'' + a.id + '\')" title="Kembalikan ke Aktif"><i data-lucide="undo-2" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteArsipAsesmen(\'' + a.id + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
            
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

    showGlobalLoader('Mengunggah ' + files.length + ' Foto... Mohon jangan tutup halaman!');
    
    try {
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var ext = file.name.split('.').pop().toLowerCase();
            var fileName = 'gal_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.' + ext;
            
            // Upload to storage
            var { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('galeri-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });
                
            if (uploadError) throw uploadError;
            
            var publicUrlResult = supabaseClient.storage.from('galeri-images').getPublicUrl(fileName);
            var publicUrl = publicUrlResult.data.publicUrl;
            
            // Insert to array
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
    showCustomConfirm('Hapus Foto Permanen?', 'Foto akan dihapus permanen dari Supabase Storage dan Database. Lanjutkan?', 'Ya, Hapus', async function() {
        showGlobalLoader('Menghapus foto...');
        try {
            // Delete from storage
            if (url) {
                var fileName = url.split('/galeri-images/').pop();
                if (fileName) {
                    await supabaseClient.storage.from('galeri-images').remove([fileName]);
                }
            }
            
            // Delete from database
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

