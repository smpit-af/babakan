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
        tbody.innerHTML = masterMapelList.map(function (m, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + m.nama_mapel + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editMapel(\'' + m.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteMapel(\'' + m.id + '\',\'' + m.nama_mapel.replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal muat mapel: ' + e.message, 'error'); }
}

function openMapelModal() {
    document.getElementById('formMapelId').value = '';
    document.getElementById('formMapelNama').value = '';
    document.getElementById('mapelModalTitle').textContent = 'Tambah Mata Pelajaran';
    document.getElementById('mapelModal').classList.add('active');
}
function closeMapelModal() { document.getElementById('mapelModal').classList.remove('active'); }

function editMapel(id) {
    var m = masterMapelList.find(function (x) { return x.id === id; });
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteMapel(id, nama) {
    showCustomConfirm('Hapus Mata Pelajaran?', 'Mapel <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('master_mapel').delete().eq('id', id);
            if (error) throw error;
            showToast('Mata pelajaran dihapus!', 'success');
            if (typeof loadMasterMapel === 'function') loadMasterMapel();
            if (typeof loadBankSoal === 'function') loadBankSoal();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        masterKkmList.sort(function (a, b) {
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

        tbody.innerHTML = masterKkmList.map(function (k, i) {
            var kelasNama = k.master_kelas ? k.master_kelas.nama_kelas : '-';
            var mapelNama = k.master_mapel ? k.master_mapel.nama_mapel : '-';
            return '<tr><td>' + (i + 1) + '</td><td>' + kelasNama + '</td><td>' + mapelNama + '</td>' +
                '<td style="text-align:center;"><strong>' + k.kkm + '</strong></td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editKkm(\'' + k.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteKkm(\'' + k.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal muat KKM: ' + e.message, 'error'); }
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
    var k = masterKkmList.find(function (x) { return x.id === id; });
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteKkm(id) {
    showCustomConfirm('Hapus KKM?', 'Data KKM ini akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('master_kkm').delete().eq('id', id);
            if (error) throw error;
            showToast('Data KKM dihapus!', 'success');
            loadMasterKkm();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function deleteMapel(id, nama) {
    showCustomConfirm('Hapus Mata Pelajaran?', 'Mapel <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('master_mapel').delete().eq('id', id);
            if (error) throw error;
            showToast('Mata pelajaran dihapus!', 'success');
            if (typeof loadMasterMapel === 'function') loadMasterMapel();
            if (typeof loadBankSoal === 'function') loadBankSoal();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function populateMapelDropdown(selectId, selectedValue) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih Mata Pelajaran</option>';
    masterMapelList.forEach(function (m) {
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
        reader.onload = function (e) {
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
        } catch (e) {
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
        reader.onload = function (e) {
            preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
        };
        reader.readAsDataURL(file);

        // Upload
        if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengunggah foto...');
        try {
            var url = await uploadToGoogleDrive(file, 'guru');
            urlField.value = url;
            showToast('Foto berhasil diunggah!', 'success');
        } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function hapusProfilGuruFoto() {
    if (!currentUser) return;

    showCustomConfirm('Hapus Foto Profil?', 'Foto profil Anda akan dihapus secara permanen.', 'Hapus Foto', async function () {
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
        } catch (e) {
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
        tbody.innerHTML = guruList.map(function (g, i) {
            var statusBadge = g.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Aktif</span>' : '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Nonaktif</span>';
            var sertifikasiBadge = g.sertifikasi === 'SERDIK' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">SERDIK</span>' : (g.sertifikasi === 'Belum SERDIK' ? '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Belum SERDIK</span>' : '-');
            var fotoHtml = g.foto_url ? '<img src="' + g.foto_url + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;font-weight:bold;">' + (g.nama_lengkap ? g.nama_lengkap.charAt(0).toUpperCase() : '?') + '</div>';
            var allMapel = [g.mata_pelajaran, g.mata_pelajaran_2, g.mata_pelajaran_3].filter(Boolean).join(', ');
            return '<tr><td>' + (i + 1) + '</td><td><div style="display:flex;justify-content:center;">' + fotoHtml + '</div></td><td>' + (g.nama_lengkap || '-') + '</td><td>' + (g.jenis_kelamin || '-') + '</td><td>' + (g.jabatan || '-') + '</td><td>' + (g.jabatan_tambahan || '-') + '</td><td>' + (g.nik || '-') + '</td><td>' + (g.nomor_hp || '-') + '</td><td>' + (g.email || '-') + '</td><td>' + (allMapel || '-') + '</td><td>' + sertifikasiBadge + '</td><td>' + (g.alamat || '-') + '</td><td>' + statusBadge + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editGuru(\'' + g.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteGuru(\'' + g.id + '\',\'' + (g.nama_lengkap || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal muat guru: ' + e.message, 'error'); }
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
    var g = guruList.find(function (x) { return x.id === id; });
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
    } catch (e) {
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        _guruAkunList.forEach(function (a) {
            // Sembunyikan role siswa, menunggu_persetujuan, nonaktif
            if (['siswa', 'menunggu_persetujuan', 'nonaktif'].includes(a.role)) return;
            var roleLabel = ROLE_LABELS[a.role] || a.role || '';
            var opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = (a.full_name || 'Tanpa Nama') + ' — ' + (a.email || '') + ' (' + roleLabel + ')';
            if (a.id === selectedUserId) opt.selected = true;
            dropdown.appendChild(opt);
        });
    } catch (e) { console.warn('loadGuruAkunDropdown error:', e.message); }
}

function onGuruAkunSelect(selectEl) {
    var userId = selectEl.value;
    document.getElementById('formGuruUserId').value = userId;
    if (!userId) return; // User deselected
    var akun = _guruAkunList.find(function (a) { return a.id === userId; });
    if (akun) {
        var namaEl = document.getElementById('formGuruNama');
        var emailEl = document.getElementById('formGuruEmail');
        if (namaEl && !namaEl.value) namaEl.value = akun.full_name || '';
        if (emailEl && !emailEl.value) emailEl.value = akun.email || '';
    }
}

function deleteGuru(id, nama) {
    showCustomConfirm('Hapus Data Guru?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('guru_staff').delete().eq('id', id);
            if (error) throw error;
            showToast('Data guru dihapus!', 'success');
            loadGuruData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// DATA INDUK SISWA
// ============================================================
var siswaList = [];
var siswaFotoFile = null; // Temporary holder for uploaded photo file


// Kompres gambar sebelum disimpan ke database (Base64)
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
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
        reader.onload = function (e) {
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
    masterKelasList.forEach(function (k) {
        sel.innerHTML += '<option value="' + k.id + '"' + (selectedVal === k.id ? ' selected' : '') + '>' + k.nama_kelas + ' (Tingkat ' + k.tingkat + ')</option>';
    });
}

async function loadSiswaData() {
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas, tingkat)');
        if (error) throw error;
        var list = data || [];
        list.sort(function (a, b) {
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
            masterKelasList.forEach(function (k) {
                filterKelasEl.innerHTML += '<option value="' + k.id + '"' + (k.id === currentVal ? ' selected' : '') + '>' + k.nama_kelas + '</option>';
            });
        }
        filterSiswaTable();
    } catch (e) { showToast('Gagal muat siswa: ' + e.message, 'error'); }
}

function filterSiswaTable() {
    var search = (document.getElementById('filterSiswaSearch') ? document.getElementById('filterSiswaSearch').value : '').toLowerCase();
    var filterKelas = document.getElementById('filterSiswaKelas') ? document.getElementById('filterSiswaKelas').value : '';
    var filterStatus = document.getElementById('filterSiswaStatus') ? document.getElementById('filterSiswaStatus').value : '';
    var filterMondok = document.getElementById('filterSiswaMondok') ? document.getElementById('filterSiswaMondok').value : '';

    var filtered = siswaList.filter(function (s) {
        // Hanya tampilkan yang bukan Lulus, Pindah, dan Dikeluarkan
        if (s.status === 'Lulus' || s.status === 'Pindah' || s.status === 'Dikeluarkan') {
            return false;
        }
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
    tbody.innerHTML = filtered.map(function (s, i) {
        var kelasNama = s.master_kelas ? s.master_kelas.nama_kelas : '-';
        var mondokBadge = s.mondok === 'Iya' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Iya</span>' : '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;">Tidak</span>';
        var statusBadge = s.status === 'Aktif' ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Aktif</span>' :
            s.status === 'Tidak Aktif' ? '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Tidak Aktif</span>' :
                s.status === 'Pindahan' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Pindahan</span>' :
                    s.status === 'Pindah' ? '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Pindah</span>' :
                        s.status === 'Lulus' ? '<span class="role-badge" style="background:rgba(124,58,237,.1);color:#7c3aed;">Lulus</span>' :
                            s.status === 'Dikeluarkan' ? '<span class="role-badge" style="background:rgba(153,27,27,.1);color:#991b1b;">Dikeluarkan</span>' :
                                '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;">' + (s.status || '-') + '</span>';
        var fotoTd = s.foto ? '<img src="' + s.foto + '" style="width:36px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:45px;border-radius:4px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;border:1px dashed #cbd5e1;">-</div>';
        return '<tr><td>' + (i + 1) + '</td><td style="text-align:center;">' + fotoTd + '</td><td>' + (s.nisn || '-') + '</td><td>' + (s.nama_lengkap || '-') + '</td><td>' + (s.jenis_kelamin || '-') + '</td><td>' + (s.agama || '-') + '</td><td>' + kelasNama + '</td><td>' + mondokBadge + '</td><td>' + (s.nama_ayah || '-') + '</td><td>' + (s.nama_ibu || '-') + '</td><td>' + (s.nomor_hp || '-') + '</td><td>' + (s.email || '-') + '</td><td>' + (s.alamat || '-') + '</td><td>' + statusBadge + '</td>' +
            '<td style="text-align:center; white-space:nowrap;">' +
            '<button class="btn btn-sm btn-outline" onclick="viewDetailSiswa(\'' + s.id + '\')" title="Detail" style="margin-right:2px;border-color:#3b82f6;color:#3b82f6;"><i data-lucide="eye" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-warning" onclick="editSiswa(\'' + s.id + '\')" title="Edit" style="margin-right:2px;"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-danger" onclick="deleteSiswa(\'' + s.id + '\',\'' + (s.nama_lengkap || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}

async function loadSiswaPindahData() {
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas, tingkat)');
        if (error) throw error;
        var list = data || [];
        list.sort(function (a, b) {
            var tkA = a.master_kelas ? parseInt(a.master_kelas.tingkat) || 0 : 0;
            var tkB = b.master_kelas ? parseInt(b.master_kelas.tingkat) || 0 : 0;
            if (tkA !== tkB) return tkA - tkB;
            var kelasA = a.master_kelas ? (a.master_kelas.nama_kelas || '').toLowerCase() : '';
            var kelasB = b.master_kelas ? (b.master_kelas.nama_kelas || '').toLowerCase() : '';
            if (kelasA !== kelasB) { if (kelasA < kelasB) return -1; if (kelasA > kelasB) return 1; }
            var nameA = (a.nama_lengkap || '').toLowerCase();
            var nameB = (b.nama_lengkap || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        siswaList = list;
        var filterKelasEl = document.getElementById('filterSiswaPindahKelas');
        if (filterKelasEl) {
            var currentVal = filterKelasEl.value;
            filterKelasEl.innerHTML = '<option value="">Semua Kelas</option>';
            masterKelasList.forEach(function (k) {
                filterKelasEl.innerHTML += '<option value="' + k.id + '"' + (k.id === currentVal ? ' selected' : '') + '>' + k.nama_kelas + '</option>';
            });
        }
        filterSiswaPindahTable();
    } catch (e) { showToast('Gagal muat siswa pindah: ' + e.message, 'error'); }
}

function filterSiswaPindahTable() {
    var search = (document.getElementById('filterSiswaPindahSearch') ? document.getElementById('filterSiswaPindahSearch').value : '').toLowerCase();
    var filterKelas = document.getElementById('filterSiswaPindahKelas') ? document.getElementById('filterSiswaPindahKelas').value : '';

    var filtered = siswaList.filter(function (s) {
        if (s.status !== 'Pindah') return false;
        var matchSearch = !search || (s.nama_lengkap || '').toLowerCase().indexOf(search) !== -1 || (s.nisn || '').toLowerCase().indexOf(search) !== -1;
        var matchKelas = !filterKelas || s.kelas_id === filterKelas;
        return matchSearch && matchKelas;
    });

    var tbody = document.getElementById('siswaPindahTableBody');
    var labelJumlah = document.getElementById('labelJumlahSiswaPindah');
    if (labelJumlah) labelJumlah.textContent = filtered.length + ' siswa ditampilkan.';
    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada data siswa pindah yang cocok.</td></tr>';
        if (window.lucide) lucide.createIcons();
        return;
    }
    tbody.innerHTML = filtered.map(function (s, i) {
        var kelasNama = s.master_kelas ? s.master_kelas.nama_kelas : '-';
        var mondokBadge = s.mondok === 'Iya' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Iya</span>' : '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;">Tidak</span>';
        var statusBadge = '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Pindah</span>';
        var fotoTd = s.foto ? '<img src="' + s.foto + '" style="width:36px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:45px;border-radius:4px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;border:1px dashed #cbd5e1;">-</div>';
        return '<tr><td>' + (i + 1) + '</td><td style="text-align:center;">' + fotoTd + '</td><td>' + (s.nisn || '-') + '</td><td>' + (s.nama_lengkap || '-') + '</td><td>' + (s.jenis_kelamin || '-') + '</td><td>' + (s.agama || '-') + '</td><td>' + kelasNama + '</td><td>' + mondokBadge + '</td><td>' + (s.nama_ayah || '-') + '</td><td>' + (s.nama_ibu || '-') + '</td><td>' + (s.nomor_hp || '-') + '</td><td>' + (s.email || '-') + '</td><td>' + (s.alamat || '-') + '</td><td>' + statusBadge + '</td>' +
            '<td style="text-align:center; white-space:nowrap;">' +
            '<button class="btn btn-sm btn-outline" onclick="viewDetailSiswa(\'' + s.id + '\')" title="Detail" style="margin-right:2px;border-color:#3b82f6;color:#3b82f6;"><i data-lucide="eye" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-warning" onclick="editSiswa(\'' + s.id + '\')" title="Edit" style="margin-right:2px;"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-danger" onclick="deleteSiswa(\'' + s.id + '\',\'' + (s.nama_lengkap || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}

async function loadSiswaDikeluarkanData() {
    try {
        const { data, error } = await supabaseClient.from('siswa').select('*, master_kelas(nama_kelas, tingkat)');
        if (error) throw error;
        var list = data || [];
        list.sort(function (a, b) {
            var tkA = a.master_kelas ? parseInt(a.master_kelas.tingkat) || 0 : 0;
            var tkB = b.master_kelas ? parseInt(b.master_kelas.tingkat) || 0 : 0;
            if (tkA !== tkB) return tkA - tkB;
            var kelasA = a.master_kelas ? (a.master_kelas.nama_kelas || '').toLowerCase() : '';
            var kelasB = b.master_kelas ? (b.master_kelas.nama_kelas || '').toLowerCase() : '';
            if (kelasA !== kelasB) { if (kelasA < kelasB) return -1; if (kelasA > kelasB) return 1; }
            var nameA = (a.nama_lengkap || '').toLowerCase();
            var nameB = (b.nama_lengkap || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        siswaList = list;
        var filterKelasEl = document.getElementById('filterSiswaDikeluarkanKelas');
        if (filterKelasEl) {
            var currentVal = filterKelasEl.value;
            filterKelasEl.innerHTML = '<option value="">Semua Kelas</option>';
            masterKelasList.forEach(function (k) {
                filterKelasEl.innerHTML += '<option value="' + k.id + '"' + (k.id === currentVal ? ' selected' : '') + '>' + k.nama_kelas + '</option>';
            });
        }
        filterSiswaDikeluarkanTable();
    } catch (e) { showToast('Gagal muat siswa dikeluarkan: ' + e.message, 'error'); }
}

function filterSiswaDikeluarkanTable() {
    var search = (document.getElementById('filterSiswaDikeluarkanSearch') ? document.getElementById('filterSiswaDikeluarkanSearch').value : '').toLowerCase();
    var filterKelas = document.getElementById('filterSiswaDikeluarkanKelas') ? document.getElementById('filterSiswaDikeluarkanKelas').value : '';

    var filtered = siswaList.filter(function (s) {
        if (s.status !== 'Dikeluarkan') return false;
        var matchSearch = !search || (s.nama_lengkap || '').toLowerCase().indexOf(search) !== -1 || (s.nisn || '').toLowerCase().indexOf(search) !== -1;
        var matchKelas = !filterKelas || s.kelas_id === filterKelas;
        return matchSearch && matchKelas;
    });

    var tbody = document.getElementById('siswaDikeluarkanTableBody');
    var labelJumlah = document.getElementById('labelJumlahSiswaDikeluarkan');
    if (labelJumlah) labelJumlah.textContent = filtered.length + ' siswa ditampilkan.';
    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada data siswa dikeluarkan yang cocok.</td></tr>';
        if (window.lucide) lucide.createIcons();
        return;
    }
    tbody.innerHTML = filtered.map(function (s, i) {
        var kelasNama = s.master_kelas ? s.master_kelas.nama_kelas : '-';
        var mondokBadge = s.mondok === 'Iya' ? '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Iya</span>' : '<span class="role-badge" style="background:rgba(100,116,139,.1);color:#64748b;">Tidak</span>';
        var statusBadge = '<span class="role-badge" style="background:rgba(153,27,27,.1);color:#991b1b;">Dikeluarkan</span>';
        var fotoTd = s.foto ? '<img src="' + s.foto + '" style="width:36px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;">' : '<div style="width:36px;height:45px;border-radius:4px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;border:1px dashed #cbd5e1;">-</div>';
        return '<tr><td>' + (i + 1) + '</td><td style="text-align:center;">' + fotoTd + '</td><td>' + (s.nisn || '-') + '</td><td>' + (s.nama_lengkap || '-') + '</td><td>' + (s.jenis_kelamin || '-') + '</td><td>' + (s.agama || '-') + '</td><td>' + kelasNama + '</td><td>' + mondokBadge + '</td><td>' + (s.nama_ayah || '-') + '</td><td>' + (s.nama_ibu || '-') + '</td><td>' + (s.nomor_hp || '-') + '</td><td>' + (s.email || '-') + '</td><td>' + (s.alamat || '-') + '</td><td>' + statusBadge + '</td>' +
            '<td style="text-align:center; white-space:nowrap;">' +
            '<button class="btn btn-sm btn-outline" onclick="viewDetailSiswa(\'' + s.id + '\')" title="Detail" style="margin-right:2px;border-color:#3b82f6;color:#3b82f6;"><i data-lucide="eye" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-warning" onclick="editSiswa(\'' + s.id + '\')" title="Edit" style="margin-right:2px;"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> ' +
            '<button class="btn btn-sm btn-danger" onclick="deleteSiswa(\'' + s.id + '\',\'' + (s.nama_lengkap || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td></tr>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function openSiswaModal() {
    document.getElementById('formSiswaId').value = '';
    document.getElementById('formSiswaNama').value = '';
    document.getElementById('formSiswaJK').value = '';
    document.getElementById('formSiswaNISN').value = '';
    document.getElementById('formSiswaNIK').value = '';
    document.getElementById('formSiswaKK').value = '';
    document.getElementById('formSiswaAgama').value = '';
    document.getElementById('formSiswaTempatLahir').value = '';
    document.getElementById('formSiswaTanggalLahir').value = '';
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

function viewDetailSiswa(id) {
    var s = siswaList.find(function (x) { return x.id === id; });
    if (!s) return;

    document.getElementById('detailSiswaNama').innerText = s.nama_lengkap || '-';
    document.getElementById('detailSiswaNISN').innerText = s.nisn || '-';
    document.getElementById('detailSiswaNIK').innerText = s.nik || '-';
    document.getElementById('detailSiswaKK').innerText = s.nomor_kk || '-';
    document.getElementById('detailSiswaJK').innerText = s.jenis_kelamin === 'L' ? 'Laki-laki' : s.jenis_kelamin === 'P' ? 'Perempuan' : '-';
    document.getElementById('detailSiswaAgama').innerText = s.agama || '-';
    document.getElementById('detailSiswaTempatLahir').innerText = s.tempat_lahir || '-';
    document.getElementById('detailSiswaTanggalLahir').innerText = s.tanggal_lahir || '-';
    document.getElementById('detailSiswaKelas').innerText = s.master_kelas ? s.master_kelas.nama_kelas : '-';
    document.getElementById('detailSiswaAsal').innerText = s.asal_sekolah || '-';
    document.getElementById('detailSiswaMondok').innerText = s.mondok || '-';
    document.getElementById('detailSiswaStatus').innerText = s.status || '-';
    document.getElementById('detailSiswaAyah').innerText = s.nama_ayah || '-';
    document.getElementById('detailSiswaNIKAyah').innerText = s.nik_ayah || '-';
    document.getElementById('detailSiswaIbu').innerText = s.nama_ibu || '-';
    document.getElementById('detailSiswaNIKIbu').innerText = s.nik_ibu || '-';
    document.getElementById('detailSiswaHP').innerText = s.nomor_hp || '-';
    document.getElementById('detailSiswaEmail').innerText = s.email || '-';
    document.getElementById('detailSiswaAlamat').innerText = s.alamat || '-';

    var imgEl = document.getElementById('detailSiswaFoto');
    var phEl = document.getElementById('detailSiswaFotoPlaceholder');
    if (s.foto) {
        imgEl.src = s.foto;
        imgEl.style.display = 'block';
        phEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        phEl.style.display = 'flex';
    }

    document.getElementById('detailSiswaModal').classList.add('active');
}

function closeDetailSiswaModal() {
    document.getElementById('detailSiswaModal').classList.remove('active');
}

function editSiswa(id) {
    var s = siswaList.find(function (x) { return x.id === id; });
    if (!s) return;
    document.getElementById('formSiswaId').value = s.id;
    document.getElementById('formSiswaNama').value = s.nama_lengkap || '';
    document.getElementById('formSiswaJK').value = s.jenis_kelamin || '';
    document.getElementById('formSiswaNISN').value = s.nisn || '';
    document.getElementById('formSiswaNIK').value = s.nik || '';
    document.getElementById('formSiswaKK').value = s.nomor_kk || '';
    document.getElementById('formSiswaAgama').value = s.agama || '';
    document.getElementById('formSiswaTempatLahir').value = s.tempat_lahir || '';
    document.getElementById('formSiswaTanggalLahir').value = s.tanggal_lahir || '';
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
        nik: document.getElementById('formSiswaNIK').value.trim() || null,
        nomor_kk: document.getElementById('formSiswaKK').value.trim() || null,
        agama: document.getElementById('formSiswaAgama').value.trim() || null,
        tempat_lahir: document.getElementById('formSiswaTempatLahir').value.trim() || null,
        tanggal_lahir: document.getElementById('formSiswaTanggalLahir').value || null,
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
        } catch (e) {
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
    } catch (e) {
        showToast('Gagal: ' + e.message, 'error');
    } finally {
        if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
    }
}

function deleteSiswa(id, nama) {
    showCustomConfirm('Hapus Data Siswa?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('siswa').delete().eq('id', id);
            if (error) throw error;
            showToast('Data siswa dihapus!', 'success');
            loadSiswaData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// IMPORT EXCEL SISWA
// ============================================================
function downloadTemplateExcelSiswa() {
    if (typeof XLSX === 'undefined') {
        showToast('Library Excel belum dimuat.', 'error');
        return;
    }
    // Header sesuai dengan form yang diminta
    var headers = [
        "Nama Lengkap", "Jenis Kelamin (L/P)", "NISN", "Tempat Lahir",
        "Tanggal Lahir (YYYY-MM-DD)", "NIK", "Agama", "Alamat",
        "Nomor HP", "Nama Ayah", "NIK Ayah", "Nama Ibu",
        "NIK Ibu", "Sekolah Asal", "Nomor KK", "Nama Kelas (misal: 7A)"
    ];

    // Contoh data dummy untuk baris 2
    var dummyData = [
        "Ahmad Dahlan", "L", "0012345678", "Jakarta",
        "2010-01-01", "3201234567890001", "Islam", "Jl. Merdeka No 1",
        "08123456789", "Budi", "3201234567890002", "Siti",
        "3201234567890003", "SDN 1 Babakan", "3201234567890000", "7A"
    ];

    var ws_data = [headers, dummyData];
    var ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Atur lebar kolom agar rapi
    var wscols = headers.map(h => ({ wch: h.length + 5 }));
    ws['!cols'] = wscols;

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
}

async function handleImportSiswaExcel(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (typeof showGlobalLoader === 'function') showGlobalLoader('Membaca file Excel...');

    var reader = new FileReader();
    reader.onload = async function (e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            var firstSheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheetName];
            var json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (json.length === 0) {
                if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
                showToast('File Excel kosong atau format salah.', 'error');
                return;
            }

            if (typeof showGlobalLoader === 'function') showGlobalLoader('Mencocokkan data kelas...');

            // Ambil mapping master kelas: nama_kelas -> id
            const { data: kelasData, error: errKelas } = await supabaseClient.from('master_kelas').select('id, nama_kelas');
            if (errKelas) throw errKelas;
            var kelasMap = {};
            if (kelasData) {
                kelasData.forEach(k => { kelasMap[k.nama_kelas.toUpperCase().trim()] = k.id; });
            }

            var rowsToInsert = [];

            json.forEach(row => {
                // Ambil nilai dari kolom berdasarkan header template (atau variasi string yang mungkin)
                var nama = row["Nama Lengkap"] || row["NAMA LENGKAP"] || "";
                if (!nama.trim()) return; // Skip baris jika nama kosong

                var jk = row["Jenis Kelamin (L/P)"] || row["JENIS KELAMIN"] || row["JK"] || "";
                jk = jk.toUpperCase().trim() === 'P' ? 'P' : 'L'; // Default L

                var namaKelas = (row["Nama Kelas (misal: 7A)"] || row["KELAS"] || row["NAMA KELAS"] || "").toString().toUpperCase().trim();
                var kelasId = kelasMap[namaKelas] || null;

                rowsToInsert.push({
                    nama_lengkap: nama.trim(),
                    jenis_kelamin: jk,
                    kelas_id: kelasId,
                    nisn: (row["NISN"] || "").toString().trim() || null,
                    tempat_lahir: (row["Tempat Lahir"] || row["TEMPAT LAHIR"] || "").toString().trim() || null,
                    tanggal_lahir: (row["Tanggal Lahir (YYYY-MM-DD)"] || row["TANGGAL LAHIR"] || "").toString().trim() || null,
                    nik: (row["NIK"] || "").toString().trim() || null,
                    agama: (row["Agama"] || row["AGAMA"] || "").toString().trim() || null,
                    alamat: (row["Alamat"] || row["ALAMAT"] || "").toString().trim() || null,
                    nomor_hp: (row["Nomor HP"] || row["NOMOR HP"] || "").toString().trim() || null,
                    nama_ayah: (row["Nama Ayah"] || row["NAMA AYAH"] || "").toString().trim() || null,
                    nik_ayah: (row["NIK Ayah"] || row["NIK AYAH"] || "").toString().trim() || null,
                    nama_ibu: (row["Nama Ibu"] || row["NAMA IBU"] || "").toString().trim() || null,
                    nik_ibu: (row["NIK Ibu"] || row["NIK IBU"] || "").toString().trim() || null,
                    asal_sekolah: (row["Sekolah Asal"] || row["SEKOLAH ASAL"] || row["ASAL SEKOLAH"] || "").toString().trim() || null,
                    nomor_kk: (row["Nomor KK"] || row["NOMOR KK"] || "").toString().trim() || null,
                    status: 'Aktif',
                    mondok: 'Tidak'
                });
            });

            if (rowsToInsert.length === 0) {
                if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
                showToast('Tidak ada data valid yang bisa diimport.', 'warning');
                return;
            }

            if (typeof showGlobalLoader === 'function') showGlobalLoader('Menyimpan ' + rowsToInsert.length + ' siswa ke database...');

            // Lakukan insert batch ke tabel siswa
            const { error: errInsert } = await supabaseClient.from('siswa').insert(rowsToInsert);
            if (errInsert) throw errInsert;

            if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            showToast(rowsToInsert.length + ' Data Siswa berhasil diimport!', 'success');

            // Refresh table
            loadSiswaData();

        } catch (e) {
            if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            showToast('Gagal memproses file: ' + e.message, 'error');
            console.error(e);
        } finally {
            // Reset input file agar bisa upload file yang sama jika gagal
            document.getElementById('importSiswaExcel').value = '';
        }
    };
    reader.readAsArrayBuffer(file);
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
        tbody.innerHTML = alumniList.map(function (a, i) {
            var sekolahTujuan = a.sekolah_tujuan || '<em style="color:var(--text-light)">Belum diisi</em>';
            return '<tr><td>' + (i + 1) + '</td><td>' + (a.asal_sekolah || '-') + '</td><td>' + (a.nama_lengkap || '-') + '</td><td>' + (a.jenis_kelamin || '-') + '</td><td>' + (a.nisn || '-') + '</td><td>' + (a.nama_ayah || '-') + '</td><td>' + (a.nama_ibu || '-') + '</td><td>' + (a.nomor_hp || '-') + '</td><td>' + (a.alamat || '-') + '</td><td>' + sekolahTujuan + '</td>' +
                '<td style="text-align:center;"><button class="btn btn-sm btn-warning" onclick="editAlumni(\'' + a.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal muat alumni: ' + e.message, 'error'); }
}

function editAlumni(id) {
    var a = alumniList.find(function (x) { return x.id === id; });
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
            tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data mutasi siswa.</td></tr>';
            return;
        }
        tbody.innerHTML = mutasiList.map(function (m, i) {
            var kelasNama = m.master_kelas ? m.master_kelas.nama_kelas : '-';
            var tglMutasi = m.tanggal_mutasi ? new Date(m.tanggal_mutasi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var tipeBadge = m.tipe_mutasi === 'Masuk'
                ? '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">▼ Masuk</span>'
                : '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">▲ Keluar</span>';

            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + tipeBadge + '</td>' +
                '<td>' + (m.nisn || '-') + '</td>' +
                '<td style="font-weight:600;">' + (m.nama_lengkap || '-') + '</td>' +
                '<td>' + (m.jenis_kelamin || '-') + '</td>' +
                '<td>' + (m.agama || '-') + '</td>' +
                '<td>' + kelasNama + '</td>' +
                '<td>' + (m.sekolah_asal || '-') + '</td>' +
                '<td>' + (m.sekolah_tujuan || '-') + '</td>' +
                '<td>' + (m.nama_ayah || '-') + '</td>' +
                '<td>' + (m.nama_ibu || '-') + '</td>' +
                '<td>' + (m.nomor_hp || '-') + '</td>' +
                '<td>' + (m.alamat || '-') + '</td>' +
                '<td>' + tglMutasi + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (m.keterangan || '-') + '</td>' +
                '<td style="text-align:center;"><button class="btn-icon btn-icon-warning" onclick="editMutasi(\'' + m.id + '\')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button> <button class="btn-icon btn-icon-red" onclick="deleteMutasi(\'' + m.id + '\',\'' + (m.nama_lengkap || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td>' +
                '</tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal muat data mutasi: ' + e.message, 'error'); }
}

function openMutasiMasukModal() {
    document.getElementById('formMutasiMasukNama').value = '';
    document.getElementById('formMutasiMasukJK').value = '';
    document.getElementById('formMutasiMasukNISN').value = '';
    document.getElementById('formMutasiMasukNIK').value = '';
    document.getElementById('formMutasiMasukKK').value = '';
    document.getElementById('formMutasiMasukAgama').value = '';
    document.getElementById('formMutasiMasukTempatLahir').value = '';
    document.getElementById('formMutasiMasukTanggalLahir').value = '';
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
    var nik = document.getElementById('formMutasiMasukNIK').value.trim() || null;
    var kk = document.getElementById('formMutasiMasukKK').value.trim() || null;
    var agama = document.getElementById('formMutasiMasukAgama').value.trim() || null;
    var tempatLahir = document.getElementById('formMutasiMasukTempatLahir').value.trim() || null;
    var tanggalLahir = document.getElementById('formMutasiMasukTanggalLahir').value || null;
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
            nik: nik,
            nomor_kk: kk,
            agama: agama,
            tempat_lahir: tempatLahir,
            tanggal_lahir: tanggalLahir,
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
            nik: nik,
            nomor_kk: kk,
            agama: agama,
            tempat_lahir: tempatLahir,
            tanggal_lahir: tanggalLahir,
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
            data.forEach(function (s) {
                var kelas = s.master_kelas ? s.master_kelas.nama_kelas : '-';
                var opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.nama_lengkap + ' — ' + kelas + ' (' + (s.status || '') + ')';
                sel.appendChild(opt);
            });
        }
    } catch (e) { showToast('Gagal muat data siswa: ' + e.message, 'error'); }

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

    showCustomConfirm('Mutasi Keluar?', 'Siswa ini akan dikeluarkan dari Data Induk Siswa dan dicatat sebagai mutasi keluar. Proses ini <strong>tidak bisa dibatalkan</strong>.', 'Ya, Proses', async function () {
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
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function deleteMutasi(id, nama) {
    showCustomConfirm('Hapus Data Mutasi & Induk?', 'Data mutasi <strong>"' + nama + '"</strong> akan dihapus dari sistem.<br><br><span style="color:var(--danger);font-weight:bold;">Peringatan Kritis:</span> Ini juga akan <strong>menghapus data siswa yang bersangkutan dari Data Induk Siswa secara permanen</strong> di database.', 'Ya, Hapus Semua', async function () {
        try {
            const { data: mut } = await supabaseClient.from('mutasi_siswa').select('siswa_id').eq('id', id).single();
            const { error: errMutasi } = await supabaseClient.from('mutasi_siswa').delete().eq('id', id);
            if (errMutasi) throw errMutasi;
            if (mut && mut.siswa_id) {
                await supabaseClient.from('siswa').delete().eq('id', mut.siswa_id);
            }
            showToast('Data mutasi dan Data Induk dihapus!', 'success');
            loadMutasiData();
            if (typeof loadSiswaData === 'function') loadSiswaData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

function editMutasi(id) {
    var m = mutasiList.find(function (x) { return x.id === id; });
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
        if (typeof loadSiswaData === 'function') loadSiswaData();
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ============================================================
// OPERASIONAL SEKOLAH: AGENDA DINAS
// ============================================================

// --- Tab Switching ---
window.switchAgendaTab = function (tabId) {
    document.querySelectorAll('#sectionAgendaDinas .account-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var btn = document.querySelector('#sectionAgendaDinas [data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('#sectionAgendaDinas .account-tab-content').forEach(function (c) { c.style.display = 'none'; });
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
        tbody.innerHTML = rapatList.map(function (r, i) {
            var tgl = r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var waktu = '';
            if (r.waktu_mulai) {
                waktu = r.waktu_mulai.substring(0, 5);
                if (r.waktu_selesai) waktu += ' - ' + r.waktu_selesai.substring(0, 5);
            }
            var kehadiranMap = {
                'Hadir': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Hadir</span>',
                'Tidak Hadir': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Tidak Hadir</span>',
                'Izin': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Izin</span>',
                'Belum Dikonfirmasi': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Belum</span>'
            };
            var kehadiranBadge = kehadiranMap[r.status_kehadiran] || kehadiranMap['Belum Dikonfirmasi'];
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (r.judul || '-') + '</td>' +
                '<td>' + (r.tempat || '-') + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td style="font-size:.85rem;">' + (waktu || '-') + '</td>' +
                '<td>' + (r.penyelenggara || '-') + '</td>' +
                '<td>' + kehadiranBadge + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (r.ringkasan_hasil || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editRapat(\'' + r.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteRapat(\'' + r.id + '\',\'' + (r.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openRapatModal(data) {
    document.getElementById('formRapatId').value = data ? data.id : '';
    document.getElementById('formRapatJudul').value = data ? data.judul : '';
    document.getElementById('formRapatTempat').value = data ? (data.tempat || '') : '';
    document.getElementById('formRapatPenyelenggara').value = data ? (data.penyelenggara || '') : '';
    document.getElementById('formRapatTanggal').value = data ? (data.tanggal || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formRapatKehadiran').value = data ? (data.status_kehadiran || 'Belum Dikonfirmasi') : 'Belum Dikonfirmasi';
    document.getElementById('formRapatWaktuMulai').value = data ? (data.waktu_mulai || '') : '';
    document.getElementById('formRapatWaktuSelesai').value = data ? (data.waktu_selesai || '') : '';
    document.getElementById('formRapatRingkasan').value = data ? (data.ringkasan_hasil || '') : '';
    document.getElementById('formRapatKeterangan').value = data ? (data.keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editRapat(id) {
    var r = rapatList.find(function (x) { return x.id === id; });
    if (r) openRapatModal(r);
}

function deleteRapat(id, judul) {
    showCustomConfirm('Hapus Data Rapat?', 'Data rapat <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('rapat_pertemuan').delete().eq('id', id);
            if (error) throw error;
            showToast('Data rapat dihapus!', 'success');
            loadRapatData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        tbody.innerHTML = perjadinList.map(function (p, i) {
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
                '<td>' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (p.tujuan || '-') + '</td>' +
                '<td>' + (p.instansi_tujuan || '-') + '</td>' +
                '<td style="font-size:.85rem;">' + (p.keperluan || '-') + '</td>' +
                '<td>' + tglBrkt + '</td>' +
                '<td>' + tglKmbli + '</td>' +
                '<td>' + (p.petugas || '-') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (p.hasil_keterangan || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editPerjadin(\'' + p.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deletePerjadin(\'' + p.id + '\',\'' + (p.tujuan || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openPerjadinModal(data) {
    document.getElementById('formPerjadinId').value = data ? data.id : '';
    document.getElementById('formPerjadinTujuan').value = data ? data.tujuan : '';
    document.getElementById('formPerjadinInstansi').value = data ? (data.instansi_tujuan || '') : '';
    document.getElementById('formPerjadinBerangkat').value = data ? (data.tanggal_berangkat || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formPerjadinKembali').value = data ? (data.tanggal_kembali || '') : '';
    document.getElementById('formPerjadinPetugas').value = data ? (data.petugas || '') : '';
    document.getElementById('formPerjadinStatus').value = data ? (data.status || 'Direncanakan') : 'Direncanakan';
    document.getElementById('formPerjadinKeperluan').value = data ? (data.keperluan || '') : '';
    document.getElementById('formPerjadinHasil').value = data ? (data.hasil_keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editPerjadin(id) {
    var p = perjadinList.find(function (x) { return x.id === id; });
    if (p) openPerjadinModal(p);
}

function deletePerjadin(id, tujuan) {
    showCustomConfirm('Hapus Data Perjalanan Dinas?', 'Data perjalanan dinas ke <strong>"' + tujuan + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('perjalanan_dinas').delete().eq('id', id);
            if (error) throw error;
            showToast('Data perjalanan dinas dihapus!', 'success');
            loadPerjadinData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        tbody.innerHTML = inventarisList.map(function (b, i) {
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
                '<td>' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (b.nama_barang || '-') + '</td>' +
                '<td style="font-size:.85rem;">' + (b.kode_barang || '-') + '</td>' +
                '<td>' + (b.kategori || '-') + '</td>' +
                '<td style="text-align:center;">' + (b.jumlah || 0) + '</td>' +
                '<td>' + (kondisiMap[b.kondisi] || '-') + '</td>' +
                '<td>' + (b.lokasi || '-') + '</td>' +
                '<td style="text-align:center;">' + (b.tahun_pengadaan || '-') + '</td>' +
                '<td>' + (b.status_perbaikan ? perbaikanMap[b.status_perbaikan] || b.status_perbaikan : '-') + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (b.catatan_perbaikan || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editInventaris(\'' + b.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteInventaris(\'' + b.id + '\',\'' + (b.nama_barang || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openInventarisModal(data) {
    document.getElementById('formInvId').value = data ? data.id : '';
    document.getElementById('formInvNama').value = data ? data.nama_barang : '';
    document.getElementById('formInvKode').value = data ? (data.kode_barang || '') : '';
    document.getElementById('formInvKategori').value = data ? (data.kategori || 'Lainnya') : 'Lainnya';
    document.getElementById('formInvJumlah').value = data ? (data.jumlah || 1) : 1;
    document.getElementById('formInvKondisi').value = data ? (data.kondisi || 'Baik') : 'Baik';
    document.getElementById('formInvLokasi').value = data ? (data.lokasi || '') : '';
    document.getElementById('formInvTahun').value = data ? (data.tahun_pengadaan || '') : '';
    document.getElementById('formInvPerbaikan').value = data ? (data.status_perbaikan || '') : '';
    document.getElementById('formInvCatatanPerbaikan').value = data ? (data.catatan_perbaikan || '') : '';
    document.getElementById('formInvKeterangan').value = data ? (data.keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editInventaris(id) {
    var b = inventarisList.find(function (x) { return x.id === id; });
    if (b) openInventarisModal(b);
}

function deleteInventaris(id, nama) {
    showCustomConfirm('Hapus Data Inventaris?', 'Data <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('inventaris_sekolah').delete().eq('id', id);
            if (error) throw error;
            showToast('Data inventaris dihapus!', 'success');
            loadInventarisData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// ============================================================
// OPERASIONAL SEKOLAH: SURAT MASUK & KELUAR
// ============================================================
var suratMasukList = [], suratKeluarList = [];

window.switchSuratTab = function (tabId) {
    document.querySelectorAll('#sectionSuratMasukKeluar .account-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    var btn = document.querySelector('#sectionSuratMasukKeluar [data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('#sectionSuratMasukKeluar .account-tab-content').forEach(function (c) { c.style.display = 'none'; });
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
        tbody.innerHTML = list.map(function (s, i) {
            var tgl = s.tanggal_surat ? new Date(s.tanggal_surat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var statusMap = {
                'Diproses': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Diproses</span>',
                'Selesai': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Selesai</span>',
                'Diarsipkan': '<span class="role-badge" style="background:rgba(148,163,184,.15);color:#94a3b8;">Diarsipkan</span>'
            };
            var pihak = jenis === 'Masuk' ? (s.pengirim || '-') : (s.tujuan || '-');
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td style="font-weight:500;">' + (s.nomor_surat || '-') + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td>' + pihak + '</td>' +
                '<td style="font-weight:600;">' + (s.perihal || '-') + '</td>' +
                '<td>' + (statusMap[s.status] || '-') + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (s.keterangan || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editSurat(\'' + s.id + '\',\'' + jenis + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteSurat(\'' + s.id + '\',\'' + (s.perihal || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openSuratModal(jenis, data) {
    document.getElementById('formSuratId').value = data ? data.id : '';
    document.getElementById('formSuratJenis').value = data ? data.jenis : jenis;
    document.getElementById('formSuratNomor').value = data ? (data.nomor_surat || '') : '';
    document.getElementById('formSuratTanggal').value = data ? (data.tanggal_surat || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formSuratPengirim').value = data ? (data.pengirim || '') : '';
    document.getElementById('formSuratTujuan').value = data ? (data.tujuan || '') : '';
    document.getElementById('formSuratPerihal').value = data ? (data.perihal || '') : '';
    document.getElementById('formSuratStatus').value = data ? (data.status || 'Diproses') : 'Diproses';
    document.getElementById('formSuratKeterangan').value = data ? (data.keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editSurat(id, jenis) {
    var list = jenis === 'Masuk' ? suratMasukList : suratKeluarList;
    var s = list.find(function (x) { return x.id === id; });
    if (s) openSuratModal(jenis, s);
}

function deleteSurat(id, perihal) {
    showCustomConfirm('Hapus Data Surat?', 'Surat <strong>"' + perihal + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('surat_masuk_keluar').delete().eq('id', id);
            if (error) throw error;
            showToast('Data surat dihapus!', 'success');
            loadSuratData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        tbody.innerHTML = notulensiList.map(function (d, i) {
            var tgl = d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            var jenisBadge = '<span class="role-badge" style="' + (jenisColors[d.jenis] || jenisColors['Dokumen Lain']) + '">' + (d.jenis || '-') + '</span>';
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (d.judul || '-') + '</td>' +
                '<td>' + jenisBadge + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td>' + (d.penulis || '-') + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (d.isi_ringkasan || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editNotulensi(\'' + d.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteNotulensi(\'' + d.id + '\',\'' + (d.judul || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openNotulensiModal(data) {
    document.getElementById('formNotulId').value = data ? data.id : '';
    document.getElementById('formNotulJudul').value = data ? data.judul : '';
    document.getElementById('formNotulJenis').value = data ? (data.jenis || 'Notulensi') : 'Notulensi';
    document.getElementById('formNotulTanggal').value = data ? (data.tanggal || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formNotulPenulis').value = data ? (data.penulis || '') : '';
    document.getElementById('formNotulIsi').value = data ? (data.isi_ringkasan || '') : '';
    document.getElementById('formNotulKeterangan').value = data ? (data.keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editNotulensi(id) {
    var d = notulensiList.find(function (x) { return x.id === id; });
    if (d) openNotulensiModal(d);
}

function deleteNotulensi(id, judul) {
    showCustomConfirm('Hapus Dokumen?', 'Dokumen <strong>"' + judul + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('notulensi_dokumen').delete().eq('id', id);
            if (error) throw error;
            showToast('Dokumen dihapus!', 'success');
            loadNotulensiData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
    } catch (e) { showToast('Gagal muat bank soal: ' + e.message, 'error'); }
}

function populateBankSoalFilters() {
    // Populate Mapel filter
    var mapelSet = {};
    var kelasSet = {};
    bankSoalList.forEach(function (b) {
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
            masterMapelList.forEach(function (m) { opts += '<option value="' + m.nama_mapel + '">' + m.nama_mapel + '</option>'; });
        } else {
            Object.keys(mapelSet).sort().forEach(function (m) { opts += '<option value="' + m + '">' + m + '</option>'; });
        }
        mapelSel.innerHTML = opts;
        mapelSel.value = currentMapel;
    }

    var kelasSel = document.getElementById('filterBankKelas');
    if (kelasSel) {
        var currentKelas = kelasSel.value;
        var opts = '<option value="">Semua Kelas</option>';
        if (typeof masterKelasList !== 'undefined' && masterKelasList.length > 0) {
            masterKelasList.forEach(function (k) { opts += '<option value="' + k.nama_kelas + '">' + k.nama_kelas + ' (Tingkat ' + k.tingkat + ')</option>'; });
        } else {
            Object.keys(kelasSet).sort().forEach(function (k) { opts += '<option value="' + k + '">' + k + '</option>'; });
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

    var filtered = bankSoalList.filter(function (b) {
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

    tbody.innerHTML = filtered.map(function (b, i) {
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
        var dlName = b.mapel.replace(/\s/g, '_') + '_' + (b.semester || '') + '.' + (fileExt || 'pdf');
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

        return '<tr><td>' + (i + 1) + '</td><td>' + b.mapel + '</td><td>' + kelasNama + '</td><td>' + semesterBadge + '</td><td>' + tipeBadge + '</td><td>' + linkBadge + '</td><td>' + b.tahun_pelajaran + '</td><td>' + creatorName + '</td>' +
            '<td style="text-align:center;white-space:nowrap;">' + aksiHtml + '</td></tr>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function resetBankSoalFilters() {
    var ids = ['filterBankMapel', 'filterBankKelas', 'filterBankSemester', 'searchBankSoal'];
    ids.forEach(function (id) {
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
    radios.forEach(function (r) { r.checked = r.value === 'link'; });
    toggleBankSoalSource('link');

    document.getElementById('bankSoalModalTitle').textContent = 'Tambah Bank Soal';
    document.getElementById('bankSoalModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeBankSoalModal() { document.getElementById('bankSoalModal').classList.remove('active'); }

function editBankSoal(id) {
    var b = bankSoalList.find(function (x) { return x.id === id; });
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
    radios.forEach(function (r) { r.checked = r.value === 'link'; });
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
    } catch (e) { showToast('Gagal menyimpan: ' + e.message, 'error'); }
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
        .then(function (r) { return r.blob(); })
        .then(function (blob) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename || 'bank_soal';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
            showToast('File berhasil diunduh!', 'success');
        })
        .catch(function (e) {
            showToast('Gagal mengunduh, membuka di tab baru...', 'warning');
            window.open(url, '_blank');
        });
}

function deleteBankSoal(id, mapel) {
    showCustomConfirm('Hapus Bank Soal', 'Apakah Anda yakin ingin menghapus soal ujian untuk mapel <strong>"' + mapel + '"</strong>?', 'Ya, Hapus', async function () {
        try {
            // Find the item to check if it has a Supabase storage file
            var item = bankSoalList.find(function (x) { return x.id === id; });
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
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        tbody.innerHTML = kritikSaranList.map(function (k, i) {
            var dt = new Date(k.created_at);
            var date = dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            var isAnon = (!k.user_id && k.nama_pengirim === 'Anonim') ? '<span style="color:var(--text-light);font-style:italic;">Anonim</span>' : k.nama_pengirim;
            var safePesan = k.pesan.replace(/"/g, '&quot;').replace(/'/g, '\\\'');
            return '<tr><td>' + (i + 1) + '</td><td>' + date + '</td><td>' + isAnon + '</td><td>' + k.pesan + '</td>' +
                '<td style="text-align:center; white-space:nowrap;">' +
                '<button class="btn btn-sm btn-outline" style="padding:0.25rem 0.5rem; margin-right:4px;" onclick="openBalasKritikModal(\'' + safePesan + '\')" title="Balas Kritik"><i data-lucide="message-square-reply" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteKritik(\'' + k.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal memuat kritik & saran', 'error'); }
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
    if (!balasan) {
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
    } catch (e) { showToast('Gagal mengirim: ' + e.message, 'error'); }
}

function deleteKritik(id) {
    showCustomConfirm('Hapus Pesan?', 'Apakah Anda yakin ingin menghapus masukan ini?', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('kritik_saran').delete().eq('id', id);
            if (error) throw error;
            showToast('Pesan dihapus!', 'success');
            loadKritikSaran();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}


// ============================================================
// AKADEMIK: JURNAL MENGAJAR
// ============================================================
var jurnalList = [];
var BULAN_NAMA = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

async function loadJurnalMengajar() {
    try {
        const { data, error } = await supabaseClient.from('jurnal_mengajar').select('*, master_kelas(nama_kelas, tingkat)').order('created_at', { ascending: false });
        if (error) throw error;
        jurnalList = data || [];
        // Load all progress for these journals
        var ids = jurnalList.map(function (j) { return j.id; });
        var progData = [];
        if (ids.length > 0) {
            const { data: pd } = await supabaseClient.from('jurnal_mengajar_progress').select('*').in('jurnal_id', ids).order('tahun').order('bulan');
            progData = pd || [];
        }
        // Attach progress to each journal
        jurnalList.forEach(function (j) {
            j._progress = progData.filter(function (p) { return p.jurnal_id === j.id; });
        });

        var tbody = document.getElementById('jurnalTableBody');
        if (!tbody) return;
        if (jurnalList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada jurnal mengajar.</td></tr>';
            return;
        }
        tbody.innerHTML = jurnalList.map(function (j, i) {
            var kelasNama = j.master_kelas ? j.master_kelas.nama_kelas + ' (Tk.' + j.master_kelas.tingkat + ')' : '-';
            var lastProg = j._progress.length > 0 ? j._progress[j._progress.length - 1] : null;
            var babNow = lastProg ? lastProg.bab_tercapai : 0;
            var pct = j.total_bab > 0 ? Math.round((babNow / j.total_bab) * 100) : 0;
            var barColor = pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
            var progressHtml = '<div style="display:flex;align-items:center;gap:8px;min-width:140px;">' +
                '<div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">' +
                '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width .3s;"></div></div>' +
                '<span style="font-size:0.8rem;font-weight:600;color:' + barColor + ';">' + babNow + '/' + j.total_bab + ' (' + pct + '%)</span></div>';
            return '<tr><td>' + (i + 1) + '</td><td>' + j.mapel + '</td><td>' + kelasNama + '</td><td>' + j.semester + '</td><td>' + j.tahun_pelajaran + '</td><td style="text-align:center;">' + j.total_bab + '</td><td>' + progressHtml + '</td>' +
                '<td style="text-align:center;white-space:nowrap;">' +
                '<button class="btn btn-sm btn-primary" onclick="openProgressModal(\'' + j.id + '\')" title="Update Progress" style="margin-right:4px;"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn btn-sm btn-warning" onclick="editJurnal(\'' + j.id + '\')" title="Edit" style="margin-right:4px;"><i data-lucide="edit" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteJurnal(\'' + j.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { showToast('Gagal memuat jurnal: ' + e.message, 'error'); }
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
    var j = jurnalList.find(function (x) { return x.id === id; });
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function deleteJurnal(id) {
    showCustomConfirm('Hapus Jurnal?', 'Jurnal beserta seluruh data progress-nya akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('jurnal_mengajar').delete().eq('id', id);
            if (error) throw error;
            showToast('Jurnal dihapus!', 'success');
            loadJurnalMengajar();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    });
}

// --- Progress Modal ---
function openProgressModal(jurnalId) {
    var j = jurnalList.find(function (x) { return x.id === jurnalId; });
    if (!j) return;
    var kelasNama = j.master_kelas ? j.master_kelas.nama_kelas : '-';
    document.getElementById('progressJurnalInfo').innerHTML = '<strong>' + j.mapel + '</strong> — ' + kelasNama + ' | ' + j.semester + ' | ' + j.tahun_pelajaran + ' (Total ' + j.total_bab + ' Bab)';
    document.getElementById('formProgressJurnalId').value = jurnalId;
    document.getElementById('formProgressId').value = '';
    var now = new Date();
    document.getElementById('formProgressBulan').value = now.getMonth() + 1;
    document.getElementById('formProgressTahun').value = now.getFullYear();
    // Build smart bab dropdown, excluding already-reported bab numbers
    var reportedBabs = (j._progress || []).map(function (p) { return p.bab_tercapai; });
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        var ids = data.map(function (j) { return j.id; });
        var progData = [];
        if (ids.length > 0) {
            const { data: pd } = await supabaseClient.from('jurnal_mengajar_progress').select('*').in('jurnal_id', ids).order('tahun').order('bulan');
            progData = pd || [];
        }

        container.innerHTML = data.map(function (j) {
            var kelasNama = j.master_kelas ? j.master_kelas.nama_kelas + ' (Tingkat ' + j.master_kelas.tingkat + ')' : '-';
            var progs = progData.filter(function (p) { return p.jurnal_id === j.id; });
            var lastProg = progs.length > 0 ? progs[progs.length - 1] : null;
            var babNow = lastProg ? lastProg.bab_tercapai : 0;
            var pct = j.total_bab > 0 ? Math.round((babNow / j.total_bab) * 100) : 0;
            var barColor = pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
            var statusText = pct >= 100 ? 'Selesai ✅' : 'Berjalan';

            var header = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:1rem;">' +
                '<div><h3 style="margin:0;">' + j.mapel + ' — ' + kelasNama + '</h3>' +
                '<p style="margin:4px 0 0;font-size:0.85rem;color:var(--text-light);">' + j.semester + ' | T.P. ' + j.tahun_pelajaran + ' | Total: ' + j.total_bab + ' Bab' +
                (j.tanggal ? ' | Tgl Mulai: ' + new Date(j.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : '') +
                '</p></div>' +
                '<div style="text-align:right;"><span style="font-size:1.5rem;font-weight:800;color:' + barColor + ';">' + pct + '%</span>' +
                '<p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-light);">' + statusText + '</p></div></div>';

            var progressBar = '<div style="height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;margin-bottom:1rem;">' +
                '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + barColor + ';border-radius:5px;transition:width .3s;"></div></div>';

            var progressTable = '';
            if (progs.length > 0) {
                progressTable = '<div style="overflow-x:auto;"><table class="dash-table" style="font-size:0.85rem;"><thead><tr>' +
                    '<th>Bulan</th><th>Tahun</th><th>Bab Tercapai</th><th>Halaman</th><th>Judul / Materi</th><th>Catatan</th><th>Dilaporkan</th></tr></thead><tbody>' +
                    progs.map(function (p) {
                        var dt = new Date(p.created_at);
                        var waktu = dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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
    } catch (e) { container.innerHTML = '<div class="card"><p style="color:#ef4444;">Gagal memuat laporan: ' + e.message + '</p></div>'; }
}

// ============================================================
// SISTEM PENILAIAN STS & SAS (PER-KELAS)
// ============================================================

function populateMapelIdDropdown(selectId, selectedVal) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih Mata Pelajaran</option>';
    masterMapelList.forEach(function (m) {
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
    var btnPub = document.getElementById('btnPublikasikanNilaiSemua');
    if (btnPub) btnPub.style.display = 'none';

    try {
        var kelasObj = masterKelasList.find(function (k) { return k.id === filterKelas; });
        // 1. Dapatkan KKM dari master_kkm
        var kkmObj = masterKkmList.find(function (k) { return k.kelas_id === filterKelas && k.mapel_id === filterMapel; });
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
            nilaiData.forEach(function (n) { nilaiDict[n.siswa_id] = n; });
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
                nilaiGanjil.forEach(function (n) { nilaiGanjilDict[n.siswa_id] = n; });
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
        thead += '<th style="width:100px;text-align:center;">Status</th><th style="width:90px;text-align:center;">Aksi</th>';

        document.getElementById('penilaianTableHeader').innerHTML = thead;

        tbody.innerHTML = siswaData.map(function (s, i) {
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
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;min-width:140px;">' + s.nama_lengkap + statusBadge + '<br><span style="color:var(--text-light);font-size:0.75rem;">' + kelasNama + '</span></td>' +
                '<td style="text-align:center;font-weight:bold;">' + kkmBadge + '</td>' +
                cols +
                '<td class="td-ket" style="text-align:center;font-size:0.8rem;">-</td>' +
                '<td style="text-align:center;">' +
                    '<button style="background:transparent; border:none; color:var(--text-light); padding:6px; border-radius:6px; cursor:pointer; transition:0.2s;" onmouseover="this.style.color=\'var(--primary)\'; this.style.background=\'rgba(30,58,138,0.1)\'" onmouseout="this.style.color=\'var(--text-light)\'; this.style.background=\'transparent\'" onclick="openRiwayatNilai(\'' + s.id + '\',\'' + s.nama_lengkap.replace(/\'/g, "\\\'") + '\')" title="Lihat Riwayat"><i data-lucide="history" style="width:16px;height:16px"></i></button>' +
                    '<button style="background:transparent; border:none; color:var(--text-light); padding:6px; border-radius:6px; cursor:pointer; transition:0.2s;" onmouseover="this.style.color=\'#2563eb\'; this.style.background=\'rgba(37,99,235,0.1)\'" onmouseout="this.style.color=\'var(--text-light)\'; this.style.background=\'transparent\'" onclick="publikasikanNilaiSiswa(\'' + s.id + '\', \'' + s.nama_lengkap.replace(/\'/g, "\\\'") + '\')" title="Kirim/Publikasikan Nilai ke Siswa"><i data-lucide="send" style="width:16px;height:16px"></i></button>' +
                '</td>' +
                '</tr>';
        }).join('');

        // Initial status calculation
        tbody.querySelectorAll('.val-sts').forEach(function (el) { calcRowStatus(el); });

        btnSimpan.style.display = 'inline-flex';
        document.getElementById('btnResetNilaiSemua').style.display = 'inline-flex';
        var btnPub = document.getElementById('btnPublikasikanNilaiSemua');
        if (btnPub) btnPub.style.display = 'inline-flex';

        if (window.lucide) lucide.createIcons();

    } catch (e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--danger)">Terjadi Kesalahan: ' + e.message + '</td></tr>'; }
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

    showCustomConfirm('Reset Semua Nilai?', 'Perhatian: Tindakan ini akan <strong>MENGHAPUS SELURUH NILAI (STS, SAS, SAJ, SAT)</strong> kelas <strong>' + kelasNama + '</strong> pada mata pelajaran <strong>' + mapelNama + '</strong>. Apakah Anda yakin ingin mereset/mengosongkan form ini?', 'Ya, Kosongkan', async function () {
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
        } catch (e) { showToast('Gagal mereset: ' + e.message, 'error'); }
    });
}

async function saveSemuaNilai() {
    var filterTahun = document.getElementById('filterPenilaianTahun').value;
    var filterSemester = document.getElementById('filterPenilaianSemester').value;
    var filterKelas = document.getElementById('filterPenilaianKelas').value;
    var filterMapel = document.getElementById('filterPenilaianMapel').value;

    var trs = document.querySelectorAll('.tr-penilaian');
    var payload = [];

    trs.forEach(function (tr) {
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
    } catch (e) {
        showToast('Gagal menyimpan nilai: ' + e.message, 'error');
    } finally {
        btnSimpan.disabled = false;
        btnSimpan.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
    }
}

async function publikasikanNilaiSiswa(siswaId, namaLengkap) {
    var tr = document.querySelector('.tr-penilaian[data-siswa="' + siswaId + '"]');
    if (!tr) return;
    
    var filterTahun = document.getElementById('filterPenilaianTahun').value;
    var filterSemester = document.getElementById('filterPenilaianSemester').value;
    var filterKelas = document.getElementById('filterPenilaianKelas').value;
    var filterMapel = document.getElementById('filterPenilaianMapel').value;

    var inputs = {
        'STS': tr.querySelector('.val-sts') ? tr.querySelector('.val-sts').value : '',
        'SAS': tr.querySelector('.val-sas') ? tr.querySelector('.val-sas').value : '',
        'SAJ': tr.querySelector('.val-saj') ? tr.querySelector('.val-saj').value : '',
        'SAT': tr.querySelector('.val-sat') ? tr.querySelector('.val-sat').value : ''
    };

    var payload = [];
    Object.keys(inputs).forEach(function(tipe) {
        if (inputs[tipe] && inputs[tipe] !== '') {
            payload.push({
                siswa_id: siswaId,
                kelas_id: filterKelas,
                mapel_id: filterMapel,
                tahun_pelajaran: filterTahun,
                semester: filterSemester,
                tipe_asesmen: tipe,
                benar_pg: 0,
                total_poin_pg: 0,
                poin_essay: 0,
                nilai_akhir: parseFloat(inputs[tipe]),
                dipublikasikan_oleh: currentUser.id
            });
        }
    });

    if (payload.length === 0) {
        showToast('Tidak ada nilai yang diisi untuk ' + namaLengkap + '!', 'warning');
        return;
    }

    showCustomConfirm('Kirim Nilai ke Siswa?', 'Anda akan mempublikasikan ' + payload.length + ' jenis nilai (' + payload.map(function(p){return p.tipe_asesmen}).join(', ') + ') ke dashboard <strong>' + namaLengkap + '</strong>.', 'Ya, Publikasikan', async function() {
        try {
            const { error } = await supabaseClient.from('hasil_ujian_siswa').upsert(payload, { onConflict: 'siswa_id, mapel_id, tahun_pelajaran, semester, tipe_asesmen' });
            if (error) throw error;
            showToast('Berhasil dipublikasikan ke siswa! 🎉', 'success');
        } catch(e) {
            showToast('Gagal mempublikasikan: ' + e.message, 'error');
        }
    });
}

async function publikasikanSemuaNilaiLaporan() {
    var filterTahun = document.getElementById('filterPenilaianTahun').value;
    var filterSemester = document.getElementById('filterPenilaianSemester').value;
    var filterKelas = document.getElementById('filterPenilaianKelas').value;
    var filterMapel = document.getElementById('filterPenilaianMapel').value;

    var trs = document.querySelectorAll('.tr-penilaian');
    var payload = [];
    var siswaCount = 0;

    trs.forEach(function (tr) {
        var siswaId = tr.getAttribute('data-siswa');
        var inputs = {
            'STS': tr.querySelector('.val-sts') ? tr.querySelector('.val-sts').value : '',
            'SAS': tr.querySelector('.val-sas') ? tr.querySelector('.val-sas').value : '',
            'SAJ': tr.querySelector('.val-saj') ? tr.querySelector('.val-saj').value : '',
            'SAT': tr.querySelector('.val-sat') ? tr.querySelector('.val-sat').value : ''
        };
        
        var hasValue = false;
        Object.keys(inputs).forEach(function(tipe) {
            if (inputs[tipe] && inputs[tipe] !== '') {
                hasValue = true;
                payload.push({
                    siswa_id: siswaId,
                    kelas_id: filterKelas,
                    mapel_id: filterMapel,
                    tahun_pelajaran: filterTahun,
                    semester: filterSemester,
                    tipe_asesmen: tipe,
                    benar_pg: 0,
                    total_poin_pg: 0,
                    poin_essay: 0,
                    nilai_akhir: parseFloat(inputs[tipe]),
                    dipublikasikan_oleh: currentUser.id
                });
            }
        });
        if (hasValue) siswaCount++;
    });

    if (payload.length === 0) {
        showToast('Tidak ada satupun nilai yang diisi untuk dipublikasikan!', 'warning');
        return;
    }

    showCustomConfirm('Publikasikan Semua Nilai?', 'Anda akan mempublikasikan nilai ke <strong>' + siswaCount + ' siswa</strong> sekaligus. Mereka dapat melihatnya di dashboard masing-masing.', 'Ya, Publikasikan Semua', async function() {
        var btn = document.getElementById('btnPublikasikanNilaiSemua');
        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="icon-spin" style="width:16px;height:16px;"></i> Memproses...';
        if (window.lucide) lucide.createIcons();

        try {
            const { error } = await supabaseClient.from('hasil_ujian_siswa').upsert(payload, { onConflict: 'siswa_id, mapel_id, tahun_pelajaran, semester, tipe_asesmen' });
            if (error) throw error;
            showToast('Berhasil mempublikasikan nilai ke ' + siswaCount + ' siswa! 🎉', 'success');
        } catch(e) {
            showToast('Gagal mempublikasikan: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (window.lucide) lucide.createIcons();
        }
    });
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
        data.forEach(function (n) {
            var tingkat = n.master_kelas ? n.master_kelas.tingkat : 0;
            var kelasNama = n.master_kelas ? n.master_kelas.nama_kelas : '-';
            var key = tingkat + '|' + kelasNama;
            if (!kelasGroups[key]) kelasGroups[key] = { tingkat: tingkat, kelasNama: kelasNama, semesters: {} };
            var semKey = n.semester + ' — T.P. ' + n.tahun_pelajaran;
            if (!kelasGroups[key].semesters[semKey]) kelasGroups[key].semesters[semKey] = [];
            kelasGroups[key].semesters[semKey].push(n);
        });

        // Sort by tingkat
        var sortedKeys = Object.keys(kelasGroups).sort(function (a, b) {
            return kelasGroups[a].tingkat - kelasGroups[b].tingkat;
        });

        var html = '<div style="display:flex;flex-direction:column;gap:1.5rem;">';
        sortedKeys.forEach(function (key) {
            var group = kelasGroups[key];
            html += '<div style="background:rgba(37,99,235,.03);border:1px solid rgba(37,99,235,.1);border-radius:12px;padding:1.25rem;">' +
                '<h4 style="margin:0 0 1rem;color:var(--primary);font-size:1rem;display:flex;align-items:center;gap:.5rem;">📚 Kelas ' + group.tingkat + ' (' + group.kelasNama + ')</h4>';

            Object.keys(group.semesters).forEach(function (semLabel) {
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

                items.forEach(function (n) {
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
    } catch (e) {
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

        // 2b. Also fetch CBT results
        var cbtQuery = supabaseClient.from('cbt_jawaban_siswa')
            .select('id, nilai, status, waktu_kumpul, sesi_ujian:sesi_id(asesmen_id, asesmen:asesmen_id(judul, mata_pelajaran, kelas, tipe_ujian, tahun_pelajaran, semester))')
            .eq('siswa_id', siswaData.id)
            .eq('status', 'selesai')
            .order('waktu_kumpul', { ascending: false });
        const { data: cbtData } = await cbtQuery;

        // Merge both into unified list
        var allResults = [];
        if (hasilData) {
            hasilData.forEach(function (h) {
                allResults.push({
                    source: 'form',
                    mapelNama: h.master_mapel ? h.master_mapel.nama_mapel : '-',
                    mapel_id: h.mapel_id,
                    tipe: h.tipe_asesmen || '-',
                    nilai: h.nilai_akhir,
                    tahun: h.tahun_pelajaran,
                    semester: h.semester,
                    benar_pg: h.benar_pg || 0,
                    total_poin_pg: h.total_poin_pg || 0,
                    poin_essay: h.poin_essay || 0
                });
            });
        }
        if (cbtData) {
            cbtData.forEach(function (c) {
                var asm = (c.sesi_ujian && c.sesi_ujian.asesmen) ? c.sesi_ujian.asesmen : {};
                allResults.push({
                    source: 'cbt',
                    mapelNama: asm.mata_pelajaran || '-',
                    mapel_id: null,
                    tipe: asm.tipe_ujian || '-',
                    nilai: c.nilai,
                    tahun: asm.tahun_pelajaran || '-',
                    semester: asm.semester || '-',
                    benar_pg: 0,
                    total_poin_pg: 0,
                    poin_essay: 0
                });
            });
        }

        if (allResults.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;">' +
                '<div style="font-size:3rem;margin-bottom:1rem;">📭</div>' +
                '<h3 style="margin-bottom:0.5rem;color:var(--text);">Belum Ada Hasil Ujian</h3>' +
                '<p style="color:var(--text-light);">Belum ada hasil ujian yang dipublikasikan oleh guru untuk Anda.</p>' +
                '</div>';
            return;
        }

        // 3. Kelompokkan per Tahun Pelajaran -> Semester
        var groups = {};
        allResults.forEach(function (h) {
            var key = (h.tahun || '-') + '|' + (h.semester || '-');
            if (!groups[key]) groups[key] = { tahun: h.tahun || '-', semester: h.semester || '-', items: [] };
            groups[key].items.push(h);
        });

        var kelasNama = siswaData.master_kelas ? siswaData.master_kelas.nama_kelas : '-';
        var html = '<div style="margin-bottom:1rem;"><span style="font-size:0.9rem;color:var(--text-light);">Menampilkan hasil ujian untuk: </span>' +
            '<strong style="color:var(--primary);">' + siswaData.nama_lengkap + '</strong>' +
            '<span style="margin-left:8px;background:rgba(30,58,138,.1);color:var(--primary);padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:600;">' + kelasNama + '</span></div>';

        Object.keys(groups).forEach(function (key) {
            var g = groups[key];
            html += '<div class="card" style="margin-bottom:1.25rem;border-left:4px solid var(--primary);">' +
                '<h4 style="margin:0 0 1rem;color:var(--primary);display:flex;align-items:center;gap:8px;">' +
                '<span style="background:var(--primary);color:white;padding:3px 12px;border-radius:20px;font-size:0.8rem;">Semester ' + g.semester + '</span>' +
                '<span style="font-size:0.85rem;color:var(--text-light);font-weight:400;">T.P. ' + g.tahun + '</span></h4>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;">';

            g.items.forEach(function (h) {
                var mapelNama = h.mapelNama;

                // Cari KKM untuk mata pelajaran dan kelas ini
                var kkmObj = null;
                if (h.mapel_id) {
                    kkmObj = masterKkmList.find(function (k) { return k.kelas_id === siswaData.kelas_id && k.mapel_id === h.mapel_id; });
                } else {
                    // For CBT, try to find by mapel name
                    var matchedMapel = masterMapelList.find(function(m) { return m.nama_mapel === h.mapelNama; });
                    if (matchedMapel) {
                        kkmObj = masterKkmList.find(function (k) { return k.kelas_id === siswaData.kelas_id && k.mapel_id === matchedMapel.id; });
                    }
                }
                var kkmValue = kkmObj ? kkmObj.kkm : 75;

                var nilaiNum = h.nilai != null ? Math.round(h.nilai) : 0;
                var nilaiColor = nilaiNum >= kkmValue ? '#22c55e' : '#ef4444';
                var nilaiIcon = nilaiNum >= kkmValue ? '✅' : '❌';
                var bgGrad = nilaiNum >= kkmValue ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)';
                var borderCol = nilaiNum >= kkmValue ? '#bbf7d0' : '#fecaca';

                // Source badge
                var sourceBadge = h.source === 'cbt'
                    ? '<span style="font-size:0.65rem;color:#3b82f6;background:rgba(59,130,246,.1);padding:2px 6px;border-radius:6px;font-weight:700;">CBT Native</span>'
                    : '<span style="font-size:0.65rem;color:#10b981;background:rgba(16,185,129,.1);padding:2px 6px;border-radius:6px;font-weight:700;">Google Form</span>';

                html += '<div style="background:' + bgGrad + ';border:1px solid ' + borderCol + ';border-radius:14px;padding:1.25rem;transition:transform 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">' +
                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">' +
                    '<div><h5 style="margin:0;font-size:0.95rem;color:var(--text);">' + mapelNama + '</h5>' +
                    '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">' +
                    '<span style="font-size:0.75rem;color:var(--text-light);background:rgba(0,0,0,.05);padding:2px 8px;border-radius:8px;">' + h.tipe + '</span>' +
                    '<span style="font-size:0.75rem;color:var(--primary);background:rgba(59,130,246,.1);padding:2px 8px;border-radius:8px;font-weight:600;">KKM: ' + kkmValue + '</span>' +
                    sourceBadge +
                    '</div></div>' +
                    '<span style="font-size:1.5rem;">' + nilaiIcon + '</span></div>' +
                    '<div style="background:white;border-radius:10px;padding:0.6rem 1rem;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,.06);">' +
                    '<span style="font-size:0.8rem;font-weight:600;color:var(--text-light);">Nilai Akhir</span>' +
                    '<span style="font-size:1.4rem;font-weight:800;color:' + nilaiColor + ';">' + nilaiNum + '</span></div>' +
                    '</div>';
            });

            html += '</div></div>';
        });

        container.innerHTML = html;
    } catch (e) {
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

    var matched = hasilAsesmenState.data.filter(function (d) { return d.matched; });
    if (matched.length === 0) {
        showToast('Tidak ada siswa yang cocok untuk dipublikasikan!', 'warning');
        return;
    }

    showCustomConfirm('Publikasikan ke Siswa?',
        'Hasil ujian <strong>' + tipe + '</strong> akan dipublikasikan ke <strong>' + matched.length + ' siswa</strong> yang berhasil dicocokkan. Siswa dengan role "siswa" akan dapat melihat hasilnya di menu "Hasil Ujian Saya".',
        'Ya, Publikasikan',
        async function () {
            var btn = document.getElementById('btnPublikasikanSiswa');
            var origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="icon-spin" style="width:16px;height:16px;"></i> Memproses...';
            if (window.lucide) lucide.createIcons();

            try {
                var payload = matched.map(function (d) {
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
            } catch (e) {
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

    (async function () {
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
        } catch (e) {
            results.innerHTML = '<p style="text-align:center;padding:1rem;color:var(--danger);">Gagal memuat: ' + e.message + '</p>';
        }
    })();
}

function filterLinkSiswaList(keyword) {
    var kw = keyword.toLowerCase().trim();
    if (!kw) { renderLinkSiswaList(linkSiswaAllData); return; }
    var filtered = linkSiswaAllData.filter(function (s) {
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
    list.forEach(function (s) {
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
        async function () {
            try {
                const { error } = await supabaseClient.from('siswa')
                    .update({ user_id: userId })
                    .eq('id', siswaId);
                if (error) throw error;
                showToast('Akun berhasil dihubungkan ke ' + namaSiswa + '! 🔗', 'success');
                document.getElementById('linkSiswaModal').classList.remove('active');
                // Refresh akun list
                if (typeof renderActiveAccounts === 'function') renderActiveAccounts();
            } catch (e) {
                showToast('Gagal: ' + e.message, 'error');
            }
        }
    );
}

async function confirmUnlinkSiswa(siswaId, namaSiswa) {
    showCustomConfirm('Putuskan Hubungan?',
        'Anda yakin ingin memutuskan hubungan akun ini dari data siswa <strong>' + namaSiswa + '</strong>?',
        'Ya, Putuskan',
        async function () {
            try {
                const { error } = await supabaseClient.from('siswa')
                    .update({ user_id: null })
                    .eq('id', siswaId);
                if (error) throw error;
                showToast('Hubungan dengan ' + namaSiswa + ' berhasil diputus.', 'success');
                document.getElementById('linkSiswaModal').classList.remove('active');
                // Refresh akun list
                if (typeof renderActiveAccounts === 'function') renderActiveAccounts();
            } catch (e) {
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
        var kelasObj = masterKelasList.find(function (k) { return k.id === filterKelas; });
        var kelasNama = kelasObj ? kelasObj.nama_kelas : '-';

        var mapelObj = masterMapelList.find(function (m) { return m.id === filterMapel; });
        var mapelNama = mapelObj ? mapelObj.nama_mapel : '-';

        var kkmObj = masterKkmList.find(function (k) { return k.kelas_id === filterKelas && k.mapel_id === filterMapel; });
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
            nilaiData.forEach(function (n) { nilaiDict[n.siswa_id] = n; });
        }

        // Render tabel
        var html = '<h3 style="margin-bottom:0.5rem;">Laporan Nilai — <strong>' + mapelNama + '</strong></h3>';
        html += '<p style="color:var(--text-light);margin-bottom:1rem;font-size:0.9rem;">Kelas: <strong>' + kelasNama + '</strong> | Semester: <strong>' + filterSemester + '</strong> | T.P.: <strong>' + filterTahun + '</strong> | KKM: <strong>' + (kkm > 0 ? kkm : 'Belum diatur') + '</strong></p>';
        html += '<div style="overflow-x:auto;"><table class="dash-table" id="tabelLaporan" style="font-size:0.9rem;"><thead><tr>';
        html += '<th style="width:40px;">No</th><th>Nama Siswa</th><th style="text-align:center;width:90px;">Nilai STS</th><th style="text-align:center;width:90px;">Nilai SAS</th><th style="text-align:center;width:90px;">Nilai SAJ</th><th style="text-align:center;width:90px;">Nilai SAT</th><th style="text-align:center;width:90px;">Rata-Rata</th><th style="text-align:center;width:100px;">Keterangan</th>';
        html += '</tr></thead><tbody>';

        siswaData.forEach(function (s, i) {
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

            html += '<tr><td style="text-align:center;">' + (i + 1) + '</td>';
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

    } catch (e) {
        container.innerHTML = '<p style="color:var(--danger);text-align:center;">Gagal memuat laporan: ' + e.message + '</p>';
    }
}

function cetakLaporanNilai() {
    var filterTahun = document.getElementById('filterLaporanTahun').value;
    var filterSemester = document.getElementById('filterLaporanSemester').value;
    var filterKelas = document.getElementById('filterLaporanKelas').value;
    var filterMapel = document.getElementById('filterLaporanMapel').value;
    var kelasObj = masterKelasList.find(function (k) { return k.id === filterKelas; });
    var kelasNama = kelasObj ? kelasObj.nama_kelas : '-';
    var mapelObj = masterMapelList.find(function (m) { return m.id === filterMapel; });
    var mapelNama = mapelObj ? mapelObj.nama_mapel : '-';

    var kkmObj = masterKkmList.find(function (k) { return k.kelas_id === filterKelas && k.mapel_id === filterMapel; });
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
    printWindow.document.write('.kop-text .alamat { font-size:8pt; margin:2px 0; }');
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
    clonedTable.querySelectorAll('td, th').forEach(function (cell) {
        cell.removeAttribute('style');
    });
    // Set alignment
    clonedTable.querySelectorAll('tbody tr').forEach(function (tr) {
        var cells = tr.querySelectorAll('td');
        if (cells.length > 0) cells[0].style.textAlign = 'center'; // No
        if (cells.length > 1) cells[1].className = 'nama'; // Nama
        for (var c = 2; c < cells.length; c++) { cells[c].style.textAlign = 'center'; }
    });
    clonedTable.querySelectorAll('thead th').forEach(function (th) { th.style.textAlign = 'center'; });
    printWindow.document.write(clonedTable.outerHTML);

    // Tanda tangan
    var today = new Date();
    var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var dateStr = today.getDate() + ' ' + months[today.getMonth()] + ' ' + today.getFullYear();
    printWindow.document.write('<div class="ttd">');
    printWindow.document.write('<div><p>Mengetahui,</p><p>Kepala Sekolah</p><div class="line"></div><p><strong>________________________</strong></p><p>NIP. ___________________</p></div>');
    printWindow.document.write('<div><p>Cirebon, ' + dateStr + '</p><p>Guru Mata Pelajaran</p><div class="line"></div><p><strong>________________________</strong></p><p>NIP. ___________________</p></div>');
    printWindow.document.write('</div>');

    printWindow.document.write('</body></html>');
    printWindow.document.close();

    setTimeout(function () { printWindow.print(); }, 500);
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
    var kelasObj = masterKelasList.find(function (k) { return k.id === kelasId; });
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
        var cc = str[c], nc = str[c + 1];
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
        // 1. Get Students in the Class (Hanya yang Aktif/Pindahan)
        const { data: siswaData, error: errS } = await supabaseClient.from('siswa').select('id, nama_lengkap, email').eq('kelas_id', kelasId).in('status', ['Aktif', 'Pindahan']).order('nama_lengkap');
        if (errS) throw errS;
        hasilAsesmenState.siswaList = siswaData || [];

        // 2. Fetch CSV from Google Sheets
        // Menargetkan sheet khusus "Hasil Koreksi" jika ada, jika tidak otomatis sheet pertama
        var csvText = '';
        var sheetSource = '';
        var fetchSuccess = false;
        var cacheBuster = '&_cb=' + Date.now();

        // Coba 1: Ambil sheet "Hasil Koreksi" via gviz API
        var possibleSheetNames = [
            'Hasil Koreksi',
            'hasil koreksi',
            'HASIL KOREKSI',
            'Hasil Koreksi ',
            'Hasil_Koreksi'
        ];

        for (var i = 0; i < possibleSheetNames.length; i++) {
            if (fetchSuccess) break;
            try {
                var sheetNameAttempt = possibleSheetNames[i];
                var csvUrl1 = 'https://docs.google.com/spreadsheets/d/' + fileId + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(sheetNameAttempt) + cacheBuster;
                var response1 = await fetch(csvUrl1);
                if (response1.ok) {
                    var text1 = await response1.text();
                    // gviz API mengembalikan 200 walaupun sheet tidak ada — responsnya berupa JS bukan CSV
                    // Deteksi: CSV asli dimulai dengan karakter " atau huruf, bukan 'google.visualization' atau '<!DOCTYPE'
                    if (text1 && !text1.trim().startsWith('google.visualization') && !text1.trim().startsWith('<!') && !text1.trim().startsWith('<html')) {
                        csvText = text1;
                        sheetSource = sheetNameAttempt;
                        fetchSuccess = true;
                    }
                }
            } catch (e1) { /* lanjut ke percobaan berikutnya */ }
        }

        // Coba 2: Export via gid (sheet kedua biasanya "Hasil Koreksi" di gid=1 dst)
        if (!fetchSuccess) {
            try {
                // Coba export sheet bernama "Hasil Koreksi" melalui export endpoint
                var csvUrl2 = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=csv&gid=0';
                // Kita coba beberapa gid karena "Hasil Koreksi" bisa di gid 1, 2, dst
                for (var gidAttempt = 0; gidAttempt <= 5 && !fetchSuccess; gidAttempt++) {
                    try {
                        var urlGid = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=csv&gid=' + gidAttempt + cacheBuster;
                        var respGid = await fetch(urlGid);
                        if (respGid.ok) {
                            var textGid = await respGid.text();
                            if (textGid && !textGid.trim().startsWith('<!') && !textGid.trim().startsWith('<html')) {
                                var firstLine = textGid.split('\n')[0].toLowerCase();
                                // Cek apakah sheet ini mengandung kolom "nilai akhir keseluruhan"
                                if (firstLine.indexOf('nilai akhir') !== -1) {
                                    csvText = textGid;
                                    sheetSource = 'Sheet gid=' + gidAttempt;
                                    fetchSuccess = true;
                                    break;
                                }
                            }
                        }
                    } catch (eg) { /* lanjut coba gid berikutnya */ }
                }
            } catch (e2) { /* lanjut ke fallback terakhir */ }
        }

        // Coba 3: Fallback — ambil sheet pertama dan coba parse
        if (!fetchSuccess) {
            try {
                var csvUrl3 = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=csv' + cacheBuster;
                var response3 = await fetch(csvUrl3);
                if (!response3.ok) throw new Error('HTTP ' + response3.status);
                var text3 = await response3.text();
                if (text3 && !text3.trim().startsWith('<!') && !text3.trim().startsWith('<html')) {
                    csvText = text3;
                    sheetSource = 'Sheet pertama (Form Responses)';
                    fetchSuccess = true;
                }
            } catch (e3) { /* gagal total */ }
        }

        if (!fetchSuccess || !csvText.trim()) {
            throw new Error('Gagal mengakses Spreadsheet. Pastikan:\n1. Link yang dimasukkan adalah URL Google Sheets yang benar.\n2. Opsi sharing sudah diset "Siapa saja yang memiliki link" → Pelihat (Viewer).\n3. Spreadsheet sudah memiliki data jawaban siswa (minimal 1 siswa sudah submit).');
        }

        var rows = parseCSV(csvText);

        if (rows.length <= 1) {
            // Sheet Hasil Koreksi ditemukan tapi kosong. Coba ambil sheet pertama (Form Responses)
            try {
                var response3 = await fetch('https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=csv&gid=0' + cacheBuster);
                if (response3.ok) {
                    var text3 = await response3.text();
                    var fallbackRows = parseCSV(text3);
                    if (fallbackRows.length > 1) {
                        rows = fallbackRows;
                        sheetSource = 'Fallback ke Sheet Form Responses (gid=0)';
                    } else {
                        throw new Error('Belum ada siswa yang mengumpulkan jawaban ujian.');
                    }
                }
            } catch(e) {
                throw new Error('Sheet "Hasil Koreksi" kosong dan gagal mengambil data alternatif. Pastikan minimal 1 siswa sudah mengirim jawaban melalui Google Form.');
            }
        }

        var headers = rows[0].map(h => (h || '').trim().toLowerCase());
        console.log('[Hasil Asesmen] Sheet source:', sheetSource);
        console.log('[Hasil Asesmen] Headers ditemukan:', headers);

        // Identify columns — gunakan pencarian fleksibel untuk mengakomodasi variasi nama kolom
        var idxNama = headers.findIndex(h => h === 'nama');
        if (idxNama === -1) idxNama = headers.findIndex(h => h === 'nama lengkap');
        if (idxNama === -1) idxNama = headers.findIndex(h => h.indexOf('nama') !== -1);

        var idxEmail = headers.findIndex(h => h === 'email address' || h === 'alamat email' || h === 'email');

        var idxBenarPG = headers.findIndex(h => h === 'benar pg');
        var idxSalahPG = headers.findIndex(h => h === 'salah pg');
        var idxSkorPG = headers.findIndex(h => h === 'total poin pg');
        var idxTotalEssay = headers.findIndex(h => h === 'total poin essay');
        var idxNilaiAkhir = headers.findIndex(h => h === 'nilai akhir keseluruhan');
        if (idxNilaiAkhir === -1) idxNilaiAkhir = headers.findIndex(h => h.indexOf('nilai akhir') !== -1);
        if (idxNilaiAkhir === -1) idxNilaiAkhir = headers.findIndex(h => h === 'skor' || h === 'score' || h === 'nilai');

        if (idxNama === -1) {
            throw new Error('Kolom "Nama" atau "Nama Lengkap" tidak ditemukan di Spreadsheet.');
        }

        // ==========================================
        // CARI FORM URL DARI SUPABASE (UNTUK REGRADE)
        // ==========================================
        var formUrlForRegrade = null;
        try {
            if (fileId) {
                const { data: asmByUrl } = await supabaseClient
                    .from('asesmen')
                    .select('id, google_form_url')
                    .ilike('google_sheet_url', '%' + fileId + '%')
                    .limit(1);
                if (asmByUrl && asmByUrl.length > 0 && asmByUrl[0].google_form_url) {
                    formUrlForRegrade = asmByUrl[0].google_form_url;
                }
            }
        } catch(eUrl) { console.warn('Gagal mencari form URL untuk regrade:', eUrl); }

        // ==========================================
        // AUTO-GRADING LOKAL (JIKA HASIL KOREKSI TIDAK ADA)
        // ==========================================
        var isLocalGrading = false;
        var kunciPGMap = {};
        var kunciEssayMap = {};
        var isOrLogicMap = {};
        var bobotPG = 2;
        var bobotEssay = 5;
        var columnSoalIndexMap = {};
        var localGradingFormUrl = null;
        var jmlEssayLokal = 0;

        if (idxNilaiAkhir === -1) {
            isLocalGrading = true;
            // Map index kolom soal (contoh: "soal 1. bentuk sederhana...")
            for (var c = 0; c < headers.length; c++) {
                var match = headers[c].match(/^soal\s*(\d+)\./);
                if (match) {
                    columnSoalIndexMap[parseInt(match[1])] = c;
                }
            }

            // Ambil Kunci Jawaban dari Supabase
            var tipe = document.getElementById('hasilAsesmenTipe').value;
            
            // Dapatkan nama mapel dari master_mapel
            const { data: dataMapel } = await supabaseClient.from('master_mapel').select('nama_mapel').eq('id', mapelId).single();
            if (!dataMapel) {
                throw new Error('Mata Pelajaran tidak ditemukan di sistem.');
            }
            var namaMapel = dataMapel.nama_mapel;

            var kelasObj = masterKelasList.find(function (k) { return k.id === kelasId; });
            var namaKelas = kelasObj ? kelasObj.nama_kelas : '';
            var tingkat = kelasObj ? kelasObj.tingkat : 0;
            
            let asesmenData = null;

            // 0. Paling Akurat: Cari berdasarkan URL Spreadsheet yang diinput user!
            if (fileId) {
                const { data: asmByUrl } = await supabaseClient
                    .from('asesmen')
                    .select('id, google_form_url')
                    .ilike('google_sheet_url', '%' + fileId + '%')
                    .limit(1);
                if (asmByUrl && asmByUrl.length > 0) {
                    asesmenData = asmByUrl;
                }
            }
            
            // 1. Jika gagal via URL, cari yang match persis parameter Mapel & Kelas
            if (!asesmenData) {
                const { data: exactData } = await supabaseClient
                    .from('asesmen')
                    .select('id, google_form_url')
                    .eq('mata_pelajaran', namaMapel)
                    .eq('kelas', namaKelas)
                    .eq('semester', semester)
                    .eq('tipe_ujian', tipe)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (exactData && exactData.length > 0) {
                    asesmenData = exactData;
                }
            }
            
            // 2. Fallback: Cari asesmen di kelas lain tapi satu tingkat
            if (!asesmenData && tingkat > 0) {
                    const { data: allAsesmen } = await supabaseClient
                        .from('asesmen')
                        .select('id, kelas, google_form_url')
                        .eq('mata_pelajaran', namaMapel)
                        .eq('semester', semester)
                        .eq('tipe_ujian', tipe)
                        .order('created_at', { ascending: false });
                        
                    if (allAsesmen && allAsesmen.length > 0) {
                        for (var i = 0; i < allAsesmen.length; i++) {
                            // Cek apakah string kelas di asesmen ini memiliki tingkat yang sama
                            var aClass = masterKelasList.find(function(k) { return k.nama_kelas === allAsesmen[i].kelas; });
                            if (aClass && aClass.tingkat === tingkat) {
                                asesmenData = [ { id: allAsesmen[i].id } ];
                                break;
                            }
                        }
                    }
                }

            if (!asesmenData || asesmenData.length === 0) {
                throw new Error('Sheet "Hasil Koreksi" tidak ditemukan ATAU belum di-generate oleh Google Apps Script.\n\nSistem mencoba melakukan Koreksi Otomatis secara lokal, namun gagal karena Kunci Jawaban (Master Soal) untuk Mapel, Tingkat Kelas, Semester, dan Tipe Ujian ini belum dibuat di menu Asesmen Builder.\n\nPastikan Anda sudah membuat Naskah Soal Ujian ini melalui menu "Buat Asesmen". Jika Anda membuat form ujian secara manual, sistem tidak memiliki Kunci Jawaban untuk mengoreksi.');
            }

            // Simpan google_form_url ke outer scope agar bisa diakses untuk regrade
            localGradingFormUrl = (asesmenData[0] && asesmenData[0].google_form_url) ? asesmenData[0].google_form_url : null;

            const { data: soalData } = await supabaseClient
                .from('asesmen_soal')
                .select('*')
                .eq('asesmen_id', asesmenData[0].id)
                .order('nomor_soal', { ascending: true });

            var globalBobotPG = asesmenData[0].bobot_pg || 2;
            var globalBobotEssay = asesmenData[0].bobot_essay || 5;

            if (soalData && soalData.length > 0) {
                soalData.forEach(soal => {
                    var kunciLower = (soal.kunci_jawaban || '').trim().toLowerCase();
                    if ((soal.tipe_soal || '').toUpperCase() === 'PG') {
                        kunciPGMap[soal.nomor_soal] = kunciLower.charAt(0);
                        bobotPG = parseFloat(soal.bobot) || globalBobotPG;
                    } else {
                        var isOrLogic = kunciLower.indexOf('[or]') === 0;
                        var cleanKey = isOrLogic ? kunciLower.substring(4) : kunciLower;
                        var kws = cleanKey.split(',').map(k => k.trim()).filter(k => k.length > 0);
                        kunciEssayMap[soal.nomor_soal] = kws;
                        isOrLogicMap[soal.nomor_soal] = isOrLogic;
                        bobotEssay = parseFloat(soal.bobot) || globalBobotEssay;
                    }
                });
            } else {
                throw new Error('Sheet "Hasil Koreksi" tidak ditemukan. Sistem mencoba Koreksi Otomatis lokal, namun Naskah Soal tidak memiliki butir soal yang tersimpan.');
            }
        }
        // ==========================================

        hasilAsesmenState.data = [];
        var matchedCount = 0;
        var html = '';

        var availableRows = [];
        for (var r = 1; r < rows.length; r++) {
            if (!rows[r]) continue;
            if (!isLocalGrading && rows[r].length < idxNilaiAkhir) continue;
            availableRows.push({ rowIndex: r, row: rows[r], claimedBy: null });
        }

        hasilAsesmenState.availableRows = availableRows;

        var siswaMatchMap = {};

        if (!hasilAsesmenState.manualOverrides) {
            hasilAsesmenState.manualOverrides = {};
        }

        // Pass 0: Manual Overrides
        hasilAsesmenState.siswaList.forEach(function (s) {
            var manualRowIdx = hasilAsesmenState.manualOverrides[s.id];
            if (manualRowIdx !== undefined && manualRowIdx !== null && manualRowIdx !== "-1" && manualRowIdx !== -1) {
                var item = availableRows.find(ar => ar.rowIndex === parseInt(manualRowIdx));
                if (item) {
                    item.claimedBy = s.id;
                    siswaMatchMap[s.id] = item.row;
                }
            }
        });

        // Pass 1: Prioritas Tertinggi (Email Match atau Exact Nama)
        hasilAsesmenState.siswaList.forEach(function (s) {
            var namaDb = s.nama_lengkap.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            var emailDb = (s.email || '').toLowerCase().trim();
            var namaDbNoSpace = namaDb.replace(/\s/g, '');

            for (var a = 0; a < availableRows.length; a++) {
                var item = availableRows[a];
                if (item.claimedBy) continue;
                
                var namaSheet = (item.row[idxNama] || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                var emailSheet = idxEmail !== -1 ? (item.row[idxEmail] || '').toLowerCase().trim() : '';
                var namaSheetNoSpace = namaSheet.replace(/\s/g, '');

                if ((emailDb && emailSheet && emailDb === emailSheet) || (namaSheetNoSpace && namaDbNoSpace === namaSheetNoSpace)) {
                    item.claimedBy = s.id;
                    siswaMatchMap[s.id] = item.row;
                    break;
                }
            }
        });

        // Pass 2: Substring Match
        hasilAsesmenState.siswaList.forEach(function (s) {
            if (siswaMatchMap[s.id]) return;
            var namaDb = s.nama_lengkap.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            var namaDbNoSpace = namaDb.replace(/\s/g, '');

            for (var a = 0; a < availableRows.length; a++) {
                var item = availableRows[a];
                if (item.claimedBy) continue;
                
                var namaSheet = (item.row[idxNama] || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                var namaSheetNoSpace = namaSheet.replace(/\s/g, '');

                // Hanya cek substring jika panjang nama minimal 4 karakter (menghindari false positive spt "al" match dgn "alan")
                if (namaSheetNoSpace.length >= 4 && (namaDbNoSpace.indexOf(namaSheetNoSpace) !== -1 || namaSheetNoSpace.indexOf(namaDbNoSpace) !== -1)) {
                    item.claimedBy = s.id;
                    siswaMatchMap[s.id] = item.row;
                    break;
                }
            }
        });

        // Pass 3: Fuzzy Word Match Berbasis Skor
        hasilAsesmenState.siswaList.forEach(function (s) {
            if (siswaMatchMap[s.id]) return;
            var dbWords = s.nama_lengkap.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/);
            
            var bestRowIdx = -1;
            var maxScore = 0;

            for (var a = 0; a < availableRows.length; a++) {
                var item = availableRows[a];
                if (item.claimedBy) continue;
                
                var namaSheet = (item.row[idxNama] || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                if (!namaSheet) continue;
                
                var sheetWords = namaSheet.split(/\s+/);
                var score = 0;

                for (var w = 0; w < sheetWords.length; w++) {
                    var word = sheetWords[w];
                    if (word.length < 3) continue;
                    
                    for (var dw = 0; dw < dbWords.length; dw++) {
                        if (dbWords[dw] === word) {
                            score += 10; break;
                        } else if (dbWords[dw].indexOf(word) === 0 || word.indexOf(dbWords[dw]) === 0) {
                            score += 5; break;
                        }
                    }
                }

                // Threshold skor minimal 5 (minimal 1 kata parsial cocok)
                if (score > maxScore && score >= 5) {
                    // Jika total kata di database banyak (>2), butuh skor lebih tinggi agar tidak salah ambil
                    if (dbWords.length > 2 && score < 10 && sheetWords.length <= 2) {
                        continue;
                    }
                    maxScore = score;
                    bestRowIdx = a;
                }
            }

            if (bestRowIdx !== -1) {
                availableRows[bestRowIdx].claimedBy = s.id;
                siswaMatchMap[s.id] = availableRows[bestRowIdx].row;
            }
        });

        hasilAsesmenState.siswaList.forEach(function (s, i) {
            var bestMatch = siswaMatchMap[s.id] || null;

            var rowObj = { siswa_id: s.id, nama_db: s.nama_lengkap, matched: false, nilai_akhir: 0, benar_pg: 0, skor_pg: 0, skor_essay: 0 };
            
            var bPg = 0, salahPg = 0, sPg = 0, bEs = 0, salahEs = 0, sEs = 0, nAkhir = 0;
            var namaAsliSheet = '-';
            var isMatchedThisStudent = false;

            if (bestMatch) {
                namaAsliSheet = bestMatch[idxNama] || '';
                isMatchedThisStudent = true;
                matchedCount++;

                if (isLocalGrading) {
                    // Lakukan koreksi lokal
                    for (var noSoal in columnSoalIndexMap) {
                        var colIdx = columnSoalIndexMap[noSoal];
                        var jawabanSiswa = (bestMatch[colIdx] || '').trim().toLowerCase();
                        
                        if (kunciPGMap[noSoal]) {
                            var kunciPG = kunciPGMap[noSoal];
                            var jwbPG = jawabanSiswa.charAt(0);
                            if (jwbPG === kunciPG) {
                                bPg++;
                                sPg += bobotPG;
                            } else {
                                salahPg++;
                            }
                        } else if (kunciEssayMap[noSoal]) {
                            var kws = kunciEssayMap[noSoal];
                            var isOr = isOrLogicMap[noSoal];
                            var matchKws = 0;
                            for (var w = 0; w < kws.length; w++) {
                                if (jawabanSiswa.indexOf(kws[w]) > -1) {
                                    matchKws++;
                                    if (isOr) break;
                                }
                            }
                            var skorSatuEssay = 0;
                            if (kws.length > 0) {
                                if (isOr) {
                                    skorSatuEssay = (matchKws > 0) ? bobotEssay : 0;
                                } else {
                                    skorSatuEssay = (matchKws / kws.length) * bobotEssay;
                                }
                            }
                            sEs += skorSatuEssay;
                            if (skorSatuEssay > 0) {
                                bEs++;
                            } else {
                                salahEs++;
                            }
                        }
                    }
                    nAkhir = sPg + sEs;

                } else {
                    // Mode normal, baca dari Hasil Koreksi
                    bPg = idxBenarPG !== -1 ? (parseInt(bestMatch[idxBenarPG]) || 0) : 0;
                    salahPg = idxSalahPG !== -1 ? (parseInt(bestMatch[idxSalahPG]) || 0) : 0;
                    sPg = idxSkorPG !== -1 ? (parseFloat(bestMatch[idxSkorPG]) || 0) : 0;
                    sEs = idxTotalEssay !== -1 ? (parseFloat(bestMatch[idxTotalEssay]) || 0) : 0;
                    nAkhir = parseFloat(bestMatch[idxNilaiAkhir]) || 0;
                    
                    // Jika ini dari sheet default Google Form yg hanya ada "Skor", jadikan skor itu sebagai Skor PG
                    if (idxSkorPG === -1 && idxNilaiAkhir !== -1 && idxTotalEssay === -1) {
                        sPg = nAkhir;
                    }
                    // Estimasi Essay benar/salah dari total poin jika tersedia
                    if (sEs > 0) bEs = 1; else salahEs = 1; 
                }

                rowObj.matched = true;
                rowObj.nilai_akhir = Math.round(nAkhir);
                rowObj.benar_pg = bPg;
                rowObj.skor_pg = Math.round(sPg);
                rowObj.skor_essay = Math.round(sEs);
            }

            hasilAsesmenState.data.push(rowObj);

            var statusBadge = rowObj.matched ? 
                (isLocalGrading ? '<span style="color:#0ea5e9;font-weight:bold;font-size:0.75rem;">Koreksi Lokal</span>' : '<span style="color:#16a34a;font-weight:bold;">Cocok</span>') 
                : '<span style="color:#dc2626;font-size:0.8rem;">Isi Manual</span>';
            var trStyle = rowObj.matched ? '' : 'background:rgba(220,38,38,0.05);';

            // Buat options untuk dropdown manual override
            var selectOptionsHtml = '<option value="-1">-- Tidak Ditemukan --</option>';
            if (hasilAsesmenState.availableRows) {
                hasilAsesmenState.availableRows.forEach(function(ar) {
                    var nama = ar.row[idxNama] || ('Baris ' + (ar.rowIndex + 1));
                    var email = idxEmail !== -1 && ar.row[idxEmail] ? (' - ' + ar.row[idxEmail]) : '';
                    var isSelected = (bestMatch && bestMatch === ar.row) ? 'selected' : '';
                    selectOptionsHtml += '<option value="' + ar.rowIndex + '" ' + isSelected + '>' + nama + email + '</option>';
                });
            }

            var akunDropdownHtml = '<select class="form-input" style="padding:4px; font-size:0.8rem; height:auto; min-width:140px; max-width:200px; margin:0;" onchange="overrideSiswaMatch(\'' + s.id + '\', this.value)">' + selectOptionsHtml + '</select>';

            // FORMAT HTML UNTUK MASING-MASING KOLOM (Semua Editable)
            var bPgHtml = '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;' + (rowObj.matched?'color:#16a34a;font-weight:bold;':'') + '" value="' + (rowObj.matched ? bPg : 0) + '" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'benar_pg\', this.value)">';
            var salahPgHtml = '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;' + (rowObj.matched?'color:#dc2626;font-weight:bold;':'') + '" value="' + (rowObj.matched ? salahPg : 0) + '" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'salah_pg\', this.value)">';
            var sPgHtml = '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;font-weight:bold;" value="' + (rowObj.matched ? Math.round(sPg) : 0) + '" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'skor_pg\', this.value)">';
            
            var bEsHtml = '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;' + (rowObj.matched?'color:#16a34a;font-weight:bold;':'') + '" value="' + (rowObj.matched ? bEs : 0) + '" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'benar_essay\', this.value)">';
            var salahEsHtml = '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;' + (rowObj.matched?'color:#dc2626;font-weight:bold;':'') + '" value="' + (rowObj.matched ? salahEs : 0) + '" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'salah_essay\', this.value)">';
            var sEsHtml = '<input type="number" min="0" class="form-input" style="width:55px;padding:4px;margin:0 auto;font-size:0.8rem;text-align:center;font-weight:bold;" value="' + (rowObj.matched ? Math.round(sEs) : 0) + '" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'skor_essay\', this.value)">';
            
            var nAkhirHtml = '<input type="number" min="0" max="100" class="form-input" style="width:70px;padding:4px;margin:0 auto;font-size:0.9rem;font-weight:bold;color:var(--primary);text-align:center;" value="' + (rowObj.matched ? Math.round(nAkhir) : 0) + '" onchange="updateHasilAsesmenManual(\'' + s.id + '\', \'nilai_akhir\', this.value)">';

            html += '<tr style="' + trStyle + '" data-siswa="' + s.id + '">' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + s.nama_lengkap + '</td>' +
                '<td>' + akunDropdownHtml + '</td>' +
                '<td style="text-align:center;">' + bPgHtml + '</td>' +
                '<td style="text-align:center;">' + salahPgHtml + '</td>' +
                '<td style="text-align:center;font-weight:bold;">' + sPgHtml + '</td>' +
                '<td style="text-align:center;">' + (isLocalGrading || idxTotalEssay !== -1 ? bEsHtml : '-') + '</td>' +
                '<td style="text-align:center;">' + (isLocalGrading || idxTotalEssay !== -1 ? salahEsHtml : '-') + '</td>' +
                '<td style="text-align:center;font-weight:bold;">' + sEsHtml + '</td>' +
                '<td style="text-align:center;font-weight:bold;font-size:1.1rem;color:var(--primary);">' + nAkhirHtml + '</td>' +
                '<td style="text-align:center;">' + statusBadge + '</td>' +
                '</tr>';
        });

        tbody.innerHTML = html;
        var infoStats = '<strong>' + matchedCount + '</strong> dari ' + hasilAsesmenState.siswaList.length + ' siswa ditemukan di Spreadsheet.';
        if (isLocalGrading) {
            infoStats += ' <span style="color:#0ea5e9;font-weight:600;margin-left:10px;"><i data-lucide="cpu" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Auto-Grading Lokal Aktif</span>';
        }

        // NOTE: Background regrade dihapus. Sinkronisasi sheet "Hasil Koreksi" HANYA dilakukan
        // melalui tombol "Sinkronkan Sheet" (triggerManualRegrade) untuk mencegah race condition
        // yang menyebabkan data di sheet tertimpa/hilang.
        document.getElementById('hasilAsesmenStats').innerHTML = infoStats;
        if (window.lucide) lucide.createIcons();

    } catch (e) {
        var errMsg = (e.message || e.toString()).replace(/\n/g, '<br>');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:left;color:#ef4444;padding:2rem;white-space:pre-line;font-size:0.85rem;line-height:1.6;">' + errMsg + '</td></tr>';
        document.getElementById('hasilAsesmenStats').textContent = 'Terjadi kesalahan saat memuat data.';
        console.error('[Hasil Asesmen] Error:', e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (window.lucide) lucide.createIcons();
    }
}

window.overrideSiswaMatch = function(siswaId, rowIndex) {
    if (!hasilAsesmenState.manualOverrides) {
        hasilAsesmenState.manualOverrides = {};
    }
    hasilAsesmenState.manualOverrides[siswaId] = rowIndex;
    
    showToast('Memperbarui pencocokan data...', 'info');
    
    setTimeout(function() {
        loadDataHasilAsesmen();
    }, 100);
};

window.triggerManualRegrade = async function() {
    var link = document.getElementById('hasilAsesmenLink').value.trim();
    if (!link) {
        showToast('Link Spreadsheet belum diisi!', 'warning');
        return;
    }
    
    var fileId = extractFileId(link);
    if (!fileId) return;
    
    var formUrl = null;
    var matchGid = link.match(/[#&?]gid=([0-9]+)/);
    var sheetGid = matchGid ? matchGid[1] : '0';
    var payloadData = { action: 'regrade', sheet_gid: sheetGid };
    
    try {
        const { data } = await supabaseClient
            .from('asesmen')
            .select('*')
            .ilike('google_sheet_url', '%' + fileId + '%')
            .limit(1);
            
        if (data && data.length > 0) {
            var asm = data[0];
            formUrl = asm.google_form_url;
            payloadData.formUrl = formUrl;
            payloadData.sheet_id = fileId;
            payloadData.bobot_pg = asm.bobot_pg || 2;
            payloadData.bobot_essay = asm.bobot_essay || 5;
            payloadData.mata_pelajaran = asm.mata_pelajaran;
            payloadData.kelas = asm.kelas;
            payloadData.tipe_ujian = asm.tipe_ujian;
            payloadData.tahun_pelajaran = asm.tahun_pelajaran;
            payloadData.semester = asm.semester;
            
            // Fetch soal from asesmen_soal table
            var pgKunci = {};
            var essayKunci = {};
            var jmlEssay = 0;
            
            const { data: soalData } = await supabaseClient.from('asesmen_soal').select('*').eq('asesmen_id', asm.id);
            if (soalData && soalData.length > 0) {
                for (var i = 0; i < soalData.length; i++) {
                    var s = soalData[i];
                    if (s.tipe_soal === 'pg' && s.kunci_jawaban) {
                        pgKunci['soal_' + s.nomor_soal] = String(s.kunci_jawaban).trim().toUpperCase().charAt(0);
                    } else if (s.tipe_soal === 'essay') {
                        jmlEssay++;
                        if (s.kunci_jawaban && String(s.kunci_jawaban).trim().length > 0) {
                            essayKunci['soal_' + s.nomor_soal] = s.kunci_jawaban;
                        }
                    }
                }
            }
            
            // Hanya attach jika kunci tidak kosong (agar GAS bisa fallback ke PropertiesService jika DB kosong)
            if (Object.keys(pgKunci).length > 0 || jmlEssay > 0) {
                payloadData.kunci = pgKunci;
                payloadData.essay_kunci = essayKunci;
                payloadData.jml_essay = jmlEssay;
            }
        }
    } catch(e) { console.error('Gagal fetch asesmen:', e); }
    
    if (!formUrl) {
        showToast('Form URL tidak ditemukan di database untuk link spreadsheet ini.', 'error');
        return;
    }
    
    var btn = document.getElementById('btnSyncSheet');
    var origHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" class="icon-spin" style="width:16px;height:16px;"></i> Memproses...';
    btn.disabled = true;
    if (window.lucide) lucide.createIcons();
    
    try {
        const { data: resData } = await supabaseClient.from('system_settings').select('value').eq('key', 'gas_web_app_url').maybeSingle();
        if (resData && resData.value) {
            fetch(resData.value, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify(payloadData)
            }).then(function(r) { return r.text(); }).then(function(t) {
                var isError = false;
                var errorMsg = '';
                try {
                    var parsed = JSON.parse(t);
                    if (parsed.status === 'error') {
                        isError = true;
                        errorMsg = parsed.message;
                    }
                } catch(e) {}
                
                if (isError) {
                    showToast('Gagal: ' + errorMsg, 'error');
                    console.error('[Hasil Asesmen] Regrade Error:', errorMsg);
                } else {
                    showToast('Perintah sinkronisasi selesai diproses. Memuat ulang data...', 'success');
                }
                
                setTimeout(function() {
                    btn.innerHTML = origHtml;
                    btn.disabled = false;
                    loadDataHasilAsesmen(); // Refresh data setelah selesai
                }, 5000);
            }).catch(function(e) {
                console.error(e);
                showToast('Gagal menghubungi Google Apps Script. Pastikan URL Web App valid.', 'error');
                btn.innerHTML = origHtml;
                btn.disabled = false;
            });
        }
    } catch(err) {
        console.error(err);
        btn.innerHTML = origHtml;
        btn.disabled = false;
    }
};

function updateHasilAsesmenManual(siswaId, field, value) {
    if (!hasilAsesmenState.data) return;
    var item = hasilAsesmenState.data.find(function (d) { return d.siswa_id === siswaId; });
    if (item) {
        item[field] = parseFloat(value) || 0;
        
        // Auto-kalkulasi nilai_akhir ketika skor_pg atau skor_essay berubah
        if (field === 'skor_pg' || field === 'skor_essay') {
            var skorPg = item.skor_pg || 0;
            var skorEs = item.skor_essay || 0;
            item.nilai_akhir = Math.round(skorPg + skorEs);
            
            // Update input nilai akhir di tabel secara visual
            var tr = document.querySelector('#hasilAsesmenTbody tr[data-siswa="' + siswaId + '"]');
            if (tr) {
                var inputs = tr.querySelectorAll('input[type="number"]');
                // Input terakhir adalah Nilai Akhir
                if (inputs.length > 0) {
                    var nAkhirInput = inputs[inputs.length - 1];
                    nAkhirInput.value = item.nilai_akhir;
                }
            }
        }
        
        // Tandai sebagai matched agar ikut disimpan ke nilai resmi & dipublikasikan
        if (!item.matched) {
            item.matched = true;
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

    showCustomConfirm('Sinkronisasi ke Nilai ' + tipe + '?', 'Anda akan menyimpan <strong>' + validData.length + '</strong> nilai akhir siswa ini ke kolom <strong>' + tipe + '</strong> pada laporan resmi.', 'Ya, Sinkronisasikan', async function () {
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
            validData.forEach(function (vd) {
                var exDb = existingDict[vd.siswa_id];
                var ex = {
                    tahun_pelajaran: tahun,
                    semester: semester,
                    kelas_id: kelasId,
                    mapel_id: mapelId,
                    siswa_id: vd.siswa_id,
                    nilai_sts: exDb ? exDb.nilai_sts : null,
                    nilai_sas: exDb ? exDb.nilai_sas : null,
                    nilai_saj: exDb ? exDb.nilai_saj : null,
                    nilai_sat: exDb ? exDb.nilai_sat : null,
                    updated_at: new Date().toISOString()
                };

                if (tipe === 'STS') ex.nilai_sts = vd.nilai_akhir;
                if (tipe === 'SAS') ex.nilai_sas = vd.nilai_akhir;
                if (tipe === 'SAJ') ex.nilai_saj = vd.nilai_akhir;
                if (tipe === 'SAT') ex.nilai_sat = vd.nilai_akhir;

                payload.push(ex);
            });

            const { error } = await supabaseClient.from('nilai_akademik').upsert(payload, { onConflict: 'tahun_pelajaran, semester, kelas_id, mapel_id, siswa_id' });
            if (error) throw error;

            showToast('Sinkronisasi berhasil! Nilai ' + tipe + ' telah diperbarui.', 'success');
        } catch (e) {
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
    document.querySelectorAll('#sectionPelanggaranSiswa .account-tab-content').forEach(function (el) { el.style.display = 'none'; });
    document.querySelectorAll('#sectionPelanggaranSiswa .account-tab-btn').forEach(function (btn) { btn.classList.remove('active'); });
    var tab = document.getElementById(tabId);
    if (tab) tab.style.display = 'block';
    document.querySelectorAll('#sectionPelanggaranSiswa .account-tab-btn').forEach(function (btn) {
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
        tbody.innerHTML = tataTertibList.map(function (r, i) {
            var katMap = {
                'Ringan': '<span class="role-badge" style="background:rgba(59,130,246,.1);color:#3b82f6;">Ringan</span>',
                'Sedang': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Sedang</span>',
                'Berat': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Berat</span>'
            };
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + (katMap[r.kategori] || r.kategori) + '</td>' +
                '<td style="font-weight:600;">' + (r.deskripsi || '-') + '</td>' +
                '<td style="text-align:center;font-weight:bold;color:#ef4444;">' + r.poin + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (r.sanksi || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editTataTertib(\'' + r.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteTataTertib(\'' + r.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openTataTertibModal(data) {
    document.getElementById('formTataTertibId').value = data ? data.id : '';
    document.getElementById('formTataTertibKategori').value = data ? data.kategori : 'Ringan';
    document.getElementById('formTataTertibDeskripsi').value = data ? data.deskripsi : '';
    document.getElementById('formTataTertibPoin').value = data ? data.poin : 5;
    document.getElementById('formTataTertibSanksi').value = data ? (data.sanksi || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editTataTertib(id) {
    var r = tataTertibList.find(function (x) { return x.id === id; });
    if (r) openTataTertibModal(r);
}

function deleteTataTertib(id) {
    showCustomConfirm('Hapus Aturan?', 'Aturan tata tertib ini akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('tata_tertib').delete().eq('id', id);
            if (error) throw error;
            showToast('Aturan tata tertib dihapus!', 'success');
            loadTataTertibData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        tbody.innerHTML = pelanggaranList.map(function (p, i) {
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
                '<td>' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + nama + '</td>' +
                '<td>' + kelas + '</td>' +
                '<td>' + tgl + '</td>' +
                '<td style="font-size:.85rem;">' + pelanggaran + '</td>' +
                '<td style="text-align:center;">' + (katMap[kategori] || kategori) + '</td>' +
                '<td style="text-align:center;font-weight:bold;color:#ef4444;">' + poin + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);">' + (p.tindak_lanjut || '-') + '</td>' +
                '<td>' + (statusMap[p.status] || p.status) + '</td>' +
                '<td style="font-size:.85rem;">' + (p.dilaporkan_oleh || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editPelanggaran(\'' + p.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deletePelanggaran(\'' + p.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

async function populatePelanggaranDropdowns() {
    // Populate siswa dropdown
    var selSiswa = document.getElementById('formPelanggaranSiswa');
    if (selSiswa) {
        try {
            const { data } = await supabaseClient.from('siswa').select('id, nama_lengkap, master_kelas ( nama_kelas )').eq('status', 'Aktif').order('nama_lengkap');
            selSiswa.innerHTML = '<option value="">Pilih Siswa...</option>' + (data || []).map(function (s) {
                var kls = s.master_kelas ? ' (' + s.master_kelas.nama_kelas + ')' : '';
                return '<option value="' + s.id + '">' + s.nama_lengkap + kls + '</option>';
            }).join('');
        } catch (e) { console.warn('populateSiswa error:', e); }
    }
    // Populate tata tertib dropdown
    var selTT = document.getElementById('formPelanggaranTataTertib');
    if (selTT) {
        try {
            const { data } = await supabaseClient.from('tata_tertib').select('*').order('kategori').order('poin', { ascending: false });
            selTT.innerHTML = '<option value="">Pilih Aturan Tata Tertib...</option>' + (data || []).map(function (t) {
                return '<option value="' + t.id + '">[' + t.kategori + ' - ' + t.poin + ' poin] ' + t.deskripsi + '</option>';
            }).join('');
        } catch (e) { console.warn('populateTataTertib error:', e); }
    }
}

async function openPelanggaranModal(data) {
    await populatePelanggaranDropdowns();
    document.getElementById('formPelanggaranId').value = data ? data.id : '';
    document.getElementById('formPelanggaranSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formPelanggaranTanggal').value = data ? (data.tanggal || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formPelanggaranTataTertib').value = data ? (data.tata_tertib_id || '') : '';
    document.getElementById('formPelanggaranKeterangan').value = data ? (data.keterangan || '') : '';
    document.getElementById('formPelanggaranTindakLanjut').value = data ? (data.tindak_lanjut || '') : '';
    document.getElementById('formPelanggaranStatus').value = data ? (data.status || 'Dicatat') : 'Dicatat';
    document.getElementById('formPelanggaranDilaporkan').value = data ? (data.dilaporkan_oleh || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editPelanggaran(id) {
    var p = pelanggaranList.find(function (x) { return x.id === id; });
    if (p) openPelanggaranModal(p);
}

function deletePelanggaran(id) {
    showCustomConfirm('Hapus Catatan?', 'Catatan pelanggaran ini akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('pelanggaran_siswa').delete().eq('id', id);
            if (error) throw error;
            showToast('Catatan pelanggaran dihapus!', 'success');
            loadPelanggaranData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        tbody.innerHTML = osisList.map(function (o, i) {
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
                '<td>' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (o.nama_kegiatan || '-') + '</td>' +
                '<td>' + (jenisMap[o.jenis] || o.jenis) + '</td>' +
                '<td>' + tglMulai + '</td>' +
                '<td>' + tglSelesai + '</td>' +
                '<td>' + (o.tempat || '-') + '</td>' +
                '<td style="font-size:.85rem;">' + (o.penanggung_jawab || '-') + '</td>' +
                '<td style="text-align:center;font-weight:bold;">' + (o.jumlah_peserta || '-') + '</td>' +
                '<td>' + (statusMap[o.status] || o.status) + '</td>' +
                '<td style="font-size:.85rem;color:var(--text-light);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (o.hasil_keterangan || o.deskripsi || '-') + '</td>' +
                '<td style="text-align:center;"><div style="display:flex;gap:.3rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="editOsis(\'' + o.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="deleteOsis(\'' + o.id + '\',\'' + (o.nama_kegiatan || '').replace(/'/g, "\\'") + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>' +
                '</div></td></tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>'; }
}

function openOsisModal(data) {
    document.getElementById('formOsisId').value = data ? data.id : '';
    document.getElementById('formOsisNama').value = data ? data.nama_kegiatan : '';
    document.getElementById('formOsisJenis').value = data ? (data.jenis || 'Kegiatan Rutin') : 'Kegiatan Rutin';
    document.getElementById('formOsisStatus').value = data ? (data.status || 'Direncanakan') : 'Direncanakan';
    document.getElementById('formOsisTglMulai').value = data ? (data.tanggal_mulai || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formOsisTglSelesai').value = data ? (data.tanggal_selesai || '') : '';
    document.getElementById('formOsisTempat').value = data ? (data.tempat || '') : '';
    document.getElementById('formOsisPJ').value = data ? (data.penanggung_jawab || '') : '';
    document.getElementById('formOsisPeserta').value = data ? (data.jumlah_peserta || '') : '';
    document.getElementById('formOsisAnggaran').value = data ? (data.anggaran || '') : '';
    document.getElementById('formOsisDeskripsi').value = data ? (data.deskripsi || '') : '';
    document.getElementById('formOsisHasil').value = data ? (data.hasil_keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}

function editOsis(id) {
    var o = osisList.find(function (x) { return x.id === id; });
    if (o) openOsisModal(o);
}

function deleteOsis(id, nama) {
    showCustomConfirm('Hapus Kegiatan?', 'Kegiatan <strong>"' + nama + '"</strong> akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('kegiatan_osis').delete().eq('id', id);
            if (error) throw error;
            showToast('Kegiatan OSIS dihapus!', 'success');
            loadOsisData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
                <td style="text-align:center;">${i + 1}</td>
                <td style="font-weight:600;">${e.nama_ekskul || '-'}</td>
                <td>${e.pembina || '-'}</td>
                <td>${e.jadwal_hari || '-'}</td>
                <td style="font-size:.85rem;">${e.jadwal_waktu || '-'}</td>
                <td>${e.tempat || '-'}</td>
                <td>${badgeObj}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editEkskul('${e.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deleteEkskul('${e.id}','${(e.nama_ekskul || '').replace(/'/g, "\\'")}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
function openEkskulModal(data) {
    document.getElementById('formEkskulId').value = data ? data.id : '';
    document.getElementById('formEkskulNama').value = data ? data.nama_ekskul : '';
    document.getElementById('formEkskulPembina').value = data ? (data.pembina || '') : '';
    document.getElementById('formEkskulHari').value = data ? (data.jadwal_hari || '') : '';
    document.getElementById('formEkskulWaktu').value = data ? (data.jadwal_waktu || '') : '';
    document.getElementById('formEkskulTempat').value = data ? (data.tempat || '') : '';
    document.getElementById('formEkskulDeskripsi').value = data ? (data.deskripsi || '') : '';
    document.getElementById('formEkskulStatus').value = data ? (data.status || 'Aktif') : 'Aktif';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editEkskul(id) { const item = ekskulList.find(x => x.id === id); if (item) openEkskulModal(item); }
function deleteEkskul(id, nama) {
    showCustomConfirm('Hapus Ekstrakurikuler?', `Hapus permanen <strong>${nama}</strong>?`, 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('ekstrakurikuler').delete().eq('id', id);
            showToast('Ekskul dihapus!', 'success');
            loadEkskulData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        sel.innerHTML = '<option value="">Pilih Siswa...</option>' + (data || []).map(s => {
            var kls = s.master_kelas ? ` (${s.master_kelas.nama_kelas})` : '';
            return `<option value="${s.id}">${s.nama_lengkap}${kls}</option>`;
        }).join('');
    } catch (e) { console.warn('Populate siswa error:', e); }
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
                <td style="text-align:center;">${i + 1}</td>
                <td style="font-weight:600;">${nama}</td>
                <td style="font-weight:600;color:var(--primary);">${p.nama_prestasi || '-'}</td>
                <td style="font-size:.85rem;">${tgl}</td>
                <td>${p.tingkat || '-'}</td>
                <td>${katBadge}</td>
                <td>${p.peringkat || '-'}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editPrestasi('${p.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deletePrestasi('${p.id}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
async function openPrestasiModal(data) {
    await globalPopulateSiswaDropdown('formPrestasiSiswa');
    document.getElementById('formPrestasiId').value = data ? data.id : '';
    document.getElementById('formPrestasiSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formPrestasiNama').value = data ? data.nama_prestasi : '';
    document.getElementById('formPrestasiTanggal').value = data ? (data.tanggal || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formPrestasiTingkat').value = data ? (data.tingkat || 'Sekolah') : 'Sekolah';
    document.getElementById('formPrestasiKategori').value = data ? (data.kategori || 'Akademik') : 'Akademik';
    document.getElementById('formPrestasiPeringkat').value = data ? (data.peringkat || '') : '';
    document.getElementById('formPrestasiPenyelenggara').value = data ? (data.penyelenggara || '') : '';
    document.getElementById('formPrestasiKeterangan').value = data ? (data.keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editPrestasi(id) { const item = prestasiList.find(x => x.id === id); if (item) openPrestasiModal(item); }
function deletePrestasi(id) {
    showCustomConfirm('Hapus Prestasi?', 'Hapus permanen prestasi siswa ini?', 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('prestasi_siswa').delete().eq('id', id);
            showToast('Prestasi dihapus!', 'success');
            loadPrestasiData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
            var nama = bk.siswa ? `${bk.siswa.nama_lengkap} ${bk.siswa.master_kelas ? '(' + bk.siswa.master_kelas.nama_kelas + ')' : ''}` : '-';
            var statMap = {
                'Terjadwal': '<span class="role-badge" style="background:rgba(148,163,184,.15);">Terjadwal</span>',
                'Proses': '<span class="role-badge" style="background:rgba(245,158,11,.1);color:#f59e0b;">Proses</span>',
                'Selesai': '<span class="role-badge" style="background:rgba(16,185,129,.1);color:#10b981;">Selesai</span>',
                'Dirujuk': '<span class="role-badge" style="background:rgba(239,68,68,.1);color:#ef4444;">Dirujuk</span>'
            };
            return `<tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="font-weight:600;">${nama}</td>
                <td style="font-size:.85rem;">${tgl}</td>
                <td>${bk.jenis_layanan || '-'}</td>
                <td style="font-size:.85rem;">${bk.penyelesaian_tindak_lanjut || '-'}</td>
                <td>${statMap[bk.status] || bk.status}</td>
                <td>${bk.konselor || '-'}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editBk('${bk.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deleteBk('${bk.id}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
async function openBkModal(data) {
    await globalPopulateSiswaDropdown('formBkSiswa');
    document.getElementById('formBkId').value = data ? data.id : '';
    document.getElementById('formBkSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formBkTanggal').value = data ? (data.tanggal || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formBkLayanan').value = data ? (data.jenis_layanan || 'Konseling Individu') : 'Konseling Individu';
    document.getElementById('formBkStatus').value = data ? (data.status || 'Proses') : 'Proses';
    document.getElementById('formBkPermasalahan').value = data ? (data.permasalahan || '') : '';
    document.getElementById('formBkPenyelesaian').value = data ? (data.penyelesaian_tindak_lanjut || '') : '';
    document.getElementById('formBkKonselor').value = data ? (data.konselor || '') : '';
    document.getElementById('formBkCatatan').value = data ? (data.catatan_rahasia || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editBk(id) { const item = bkList.find(x => x.id === id); if (item) openBkModal(item); }
function deleteBk(id) {
    showCustomConfirm('Hapus Catatan BK?', 'Hapus permanen catatan ini?', 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('bimbingan_konseling').delete().eq('id', id);
            showToast('Catatan BK dihapus!', 'success');
            loadBkData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
            var nama = k.siswa ? `${k.siswa.nama_lengkap} ${k.siswa.master_kelas ? '(' + k.siswa.master_kelas.nama_kelas + ')' : ''}` : '-';
            return `<tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="font-weight:600;">${nama}</td>
                <td style="font-size:.85rem;">${tgl}</td>
                <td style="color:#ef4444;font-weight:600;">${k.keluhan_penyakit || '-'}</td>
                <td style="font-size:.85rem;">${k.tindakan_obat || '-'}</td>
                <td>${k.petugas_uks || '-'}</td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:.3rem;justify-content:center;">
                        <button class="btn-icon btn-icon-blue" onclick="editKesehatan('${k.id}')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                        <button class="btn-icon btn-icon-red" onclick="deleteKesehatan('${k.id}')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">Gagal memuat: ${e.message}</td></tr>`; }
}
async function openKesehatanModal(data) {
    await globalPopulateSiswaDropdown('formKesehatanSiswa');
    document.getElementById('formKesehatanId').value = data ? data.id : '';
    document.getElementById('formKesehatanSiswa').value = data ? data.siswa_id : '';
    document.getElementById('formKesehatanTanggal').value = data ? (data.tanggal || '') : new Date().toISOString().split('T')[0];
    document.getElementById('formKesehatanKeluhan').value = data ? (data.keluhan_penyakit || '') : '';
    document.getElementById('formKesehatanTindakan').value = data ? (data.tindakan_obat || '') : '';
    document.getElementById('formKesehatanPetugas').value = data ? (data.petugas_uks || '') : '';
    document.getElementById('formKesehatanKeterangan').value = data ? (data.keterangan || '') : '';
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
}
function editKesehatan(id) { const item = kesehatanList.find(x => x.id === id); if (item) openKesehatanModal(item); }
function deleteKesehatan(id) {
    showCustomConfirm('Hapus Catatan?', 'Hapus permanen catatan kesehatan ini?', 'Ya, Hapus', async () => {
        try {
            await supabaseClient.from('kesehatan_siswa').delete().eq('id', id);
            showToast('Catatan Kesehatan dihapus!', 'success');
            loadKesehatanData();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
    } catch (e) { console.warn('loadAsesmenConfig:', e); }
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
        asesmenList = (data || []).filter(function (a) { return !a.archived_at; });
        if (countEl) countEl.textContent = asesmenList.length + ' asesmen';
        loadSampahCount();

        var isAdminKurikulum = currentRole === 'admin' || currentRole === 'kurikulum';

        if (asesmenList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada asesmen. Klik "Buat Asesmen Baru" untuk mulai.</td></tr>';
            return;
        }
        // count soal per asesmen (menggunakan exact count secara paralel agar akurat, mengatasi default limit 1000 row)
        var countMap = {};
        await Promise.all(asesmenList.map(async function (a) {
            const { count } = await supabaseClient.from('asesmen_soal')
                .select('id', { count: 'exact', head: true })
                .eq('asesmen_id', a.id);
            countMap[a.id] = count || 0;
        }));
        tbody.innerHTML = asesmenList.map(function (a, i) {
            var statusBadge = a.status === 'terbit'
                ? '<span class="badge-terbit">Terbit</span>'
                : '<span class="badge-draft">Draft</span>';
            
            var linkHtml = '<div style="display:flex;flex-direction:column;gap:.25rem;">';
            if (a.is_cbt_native) {
                linkHtml += '<span style="color:#3b82f6;font-size:.82rem;font-weight:700;"><i data-lucide="monitor" style="width:12px;height:12px;"></i> CBT Native</span>';
            } else {
                if (a.google_form_url) linkHtml += '<a href="' + a.google_form_url + '" target="_blank" style="color:var(--primary);font-size:.82rem;font-weight:600;"><i data-lucide="external-link" style="width:12px;height:12px;"></i> Form Siswa</a>';
                if (a.google_form_edit_url) linkHtml += '<a href="' + a.google_form_edit_url + '" target="_blank" style="color:#d97706;font-size:.82rem;font-weight:600;" title="Edit form untuk tambah Kop Surat"><i data-lucide="settings" style="width:12px;height:12px;"></i> Edit Form (Kop/Tema)</a>';
                if (a.google_sheet_url) linkHtml += '<a href="' + a.google_sheet_url + '" target="_blank" style="color:#16a34a;font-size:.82rem;font-weight:600;"><i data-lucide="table" style="width:12px;height:12px;"></i> Rekap Nilai</a>';
                if (!a.google_form_url && !a.google_sheet_url && !a.is_cbt_native) linkHtml += '<span style="color:var(--text-light);font-size:.82rem;">-</span>';
            }
            linkHtml += '</div>';

            var jumlahSoal = countMap[a.id] || 0;
            var canManage = isAdminKurikulum || (currentUser && a.created_by === currentUser.id);
            var aksiHtml = '';

            if (canManage) {
                var editBtn = '<button class="btn-icon btn-icon-blue" onclick="editAsesmenDraft(\'' + a.id + '\')" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>';
                
                if (a.status === 'draft') {
                    aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="previewAsesmen(\'' + a.id + '\')" title="Detail/Preview"><i data-lucide="eye" style="width:14px;height:14px"></i></button>' +
                        editBtn +
                        '<button class="btn-icon btn-icon-red" onclick="deleteAsesmen(\'' + a.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
                } else {
                    var cbtBtn = '';
                    if (a.is_cbt_native) {
                        cbtBtn = '<button class="btn-icon" style="background:rgba(59,130,246,.1);color:#3b82f6;" onclick="openMonitorCbt(\'' + a.id + '\')" title="Monitor CBT & Token"><i data-lucide="radio" style="width:14px;height:14px"></i></button>';
                    }
                    var sendBtn = '';
                    var ujianBtn = '';
                    var isAdmin = currentRole === 'admin';
                    if ((a.google_form_url || a.is_cbt_native) && isAdmin) {
                        if (a.ujian_sent_at) {
                            sendBtn = '<button class="btn-icon" style="background:rgba(239,68,68,.1);color:#ef4444;" onclick="unsendFromUjian(\'' + a.id + '\')" title="Tarik dari Soal Ujian"><i data-lucide="undo-2" style="width:14px;height:14px"></i></button>';
                            // Gear icon hanya untuk GForm, CBT dikontrol via Monitor CBT
                            if (!a.is_cbt_native) {
                                var gearColor = a.ujian_aktif === true ? 'background:rgba(5,150,105,.12);color:#059669;' : a.ujian_aktif === false ? 'background:rgba(100,116,139,.12);color:#64748b;' : 'background:rgba(124,58,237,.08);color:#7c3aed;';
                                ujianBtn = '<button class="btn-icon" style="' + gearColor + '" onclick="openUjianSettingsModal(\'' + a.id + '\')" title="Kelola Status Ujian"><i data-lucide="settings" style="width:14px;height:14px"></i></button>';
                            }
                        } else {
                            sendBtn = '<button class="btn-icon" style="background:rgba(16,185,129,.1);color:#10b981;" onclick="sendToSoalUjian(\'' + a.id + '\')" title="Kirim ke Soal Ujian"><i data-lucide="send" style="width:14px;height:14px"></i></button>';
                        }
                    }
                    aksiHtml = '<button class="btn-icon btn-icon-blue" onclick="previewAsesmen(\'' + a.id + '\')" title="Detail/Preview"><i data-lucide="eye" style="width:14px;height:14px"></i></button>' +
                        editBtn + cbtBtn + sendBtn + ujianBtn +
                        '<button class="btn-icon btn-icon-amber" onclick="archiveAsesmen(\'' + a.id + '\')" title="Arsipkan"><i data-lucide="archive" style="width:14px;height:14px"></i></button>' +
                        '<button class="btn-icon btn-icon-red" onclick="deleteAsesmen(\'' + a.id + '\')" title="Hapus"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>';
                }
            } else {
                aksiHtml = '<span style="color:var(--text-light);font-size:0.8rem;font-style:italic;">Hanya pemilik</span>';
            }
            var tglUjian = a.tanggal_pelaksanaan ? new Date(a.tanggal_pelaksanaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            return '<tr>' +
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
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
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
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
        async function () {
            if (typeof showGlobalLoader === 'function') showGlobalLoader('Mengirim ke Soal Ujian...');
            try {
                const { error } = await supabaseClient.rpc('send_to_ujian', { target_asesmen_id: asesmenId });
                if (error) throw error;
                showToast('✅ Soal berhasil dikirim ke menu Soal Ujian!', 'success');
                loadAsesmenList();
            } catch (e) {
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
        async function () {
            if (typeof showGlobalLoader === 'function') showGlobalLoader('Menarik dari Soal Ujian...');
            try {
                const { error } = await supabaseClient.rpc('unsend_from_ujian', { target_asesmen_id: asesmenId });
                if (error) throw error;
                showToast('✅ Soal berhasil ditarik dari menu Soal Ujian.', 'success');
                loadAsesmenList();
            } catch (e) {
                showToast('Gagal: ' + e.message, 'error');
            } finally {
                if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            }
        }
    );
}

// --- Modal: Kelola status aktif/nonaktif ujian ---
function openUjianSettingsModal(asesmenId) {
    var a = asesmenList.find(function (x) { return x.id === asesmenId; });
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

// --- Simpan status aktif/nonaktif (khusus GForm) ---
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
    } catch (e) {
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
    tbodyNonaktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat...</td></tr>';

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

        // Ambil semua sesi CBT terbaru untuk setiap asesmen
        var cbtAsesmenIds = list.filter(function(a) { return a.is_cbt_native; }).map(function(a) { return a.id; });
        var sesiMap = {};
        if (cbtAsesmenIds.length > 0) {
            const { data: sesiData } = await supabaseClient.from('cbt_sesi_ujian')
                .select('*')
                .in('asesmen_id', cbtAsesmenIds)
                .order('created_at', { ascending: false });
            if (sesiData) {
                sesiData.forEach(function(s) {
                    if (!sesiMap[s.asesmen_id]) sesiMap[s.asesmen_id] = s; // ambil yang terbaru saja
                });
            }
        }

        // Tentukan status aktif
        list.forEach(function(a) {
            if (a.is_cbt_native) {
                // CBT: status bergantung pada sesi CBT
                var sesi = sesiMap[a.id];
                if (sesi && sesi.status === 'berjalan') {
                    a._ujian_status = 'aktif';
                } else if (sesi && sesi.status === 'selesai') {
                    a._ujian_status = 'kadaluarsa';
                } else {
                    a._ujian_status = 'pending'; // belum pernah ada sesi
                }
            } else {
                // Google Form: pakai waktu manual
                if (a.ujian_aktif === true) {
                    a._ujian_status = 'aktif';
                } else if (a.ujian_aktif === false) {
                    a._ujian_status = 'kadaluarsa';
                } else {
                    a._ujian_status = 'pending';
                }
            }
        });

        var aktifList = list.filter(function (a) { return a._ujian_status === 'aktif' || a._ujian_status === 'pending'; });
        var nonaktifList = list.filter(function (a) { return a._ujian_status === 'kadaluarsa'; });

        // ===== Render Tabel Aktif (termasuk pending) =====
        if (aktifList.length === 0) {
            tbodyAktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada soal ujian yang aktif, silahkan hubungi admin</td></tr>';
        } else {
            tbodyAktif.innerHTML = aktifList.map(function (a, i) {
                var tgl = a.tanggal_pelaksanaan ? new Date(a.tanggal_pelaksanaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                var isPending = a._ujian_status === 'pending';
                var isSusulan = a.judul && a.judul.indexOf('(Susulan') !== -1;
                var linkBtn, statusBadge;
                if (isPending) {
                    linkBtn = '<span style="color:#94a3b8;font-size:.82rem;">Belum diaktifkan</span>';
                    statusBadge = '<span class="badge" style="background:rgba(148,163,184,.12);color:#94a3b8;font-size:.75rem;">—</span>';
                } else {
                    if (a.is_cbt_native) {
                        linkBtn = '<button class="btn btn-sm" onclick="mulaiUjianCbtSiswa(\'' + a.id + '\')" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;font-weight:700;font-size:.78rem;padding:.4rem .8rem;border-radius:8px;display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap;cursor:pointer;"><i data-lucide="radio" style="width:13px;height:13px"></i> Kerjakan CBT</button>';
                    } else {
                        linkBtn = a.google_form_url
                            ? '<a href="' + a.google_form_url + '" target="_blank" class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#047857);color:white;border:none;font-weight:700;font-size:.78rem;padding:.4rem .8rem;border-radius:8px;text-decoration:none;display:inline-flex;align-items:center;gap:.3rem;white-space:nowrap;"><i data-lucide="external-link" style="width:13px;height:13px"></i> Kerjakan (GForm)</a>'
                            : '<span style="color:var(--text-light);font-size:.82rem;">Link belum tersedia</span>';
                    }
                    statusBadge = '<span class="badge" style="background:rgba(5,150,105,.1);color:#059669;font-size:.75rem;font-weight:700;">Aktif</span>';
                }
                if (isSusulan) {
                    statusBadge += ' <span class="badge" style="background:#fef3c7;color:#92400e;font-size:.7rem;">Susulan</span>';
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

        // ===== Render Tabel Nonaktif/Kadaluarsa =====
        if (nonaktifList.length === 0) {
            tbodyNonaktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada ujian kadaluarsa.</td></tr>';
        } else {
            tbodyNonaktif.innerHTML = nonaktifList.map(function (a, i) {
                var tgl = a.tanggal_pelaksanaan ? new Date(a.tanggal_pelaksanaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                var isSusulan = a.judul && a.judul.indexOf('(Susulan') !== -1;
                var isAdmin = currentRole === 'admin';
                var aksiHtml = '';
                if (isAdmin && a.is_cbt_native) {
                    aksiHtml += '<button class="btn btn-sm" onclick="buatUjianSusulan(\'' + a.id + '\')" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;font-size:.72rem;padding:.3rem .6rem;border-radius:6px;white-space:nowrap;margin-right:.3rem;"><i data-lucide="copy-plus" style="width:11px;height:11px"></i> Susulan</button>';
                }
                aksiHtml += '<button class="btn btn-sm" onclick="lihatPesertaUjian(\'' + a.id + '\')" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;font-size:.72rem;padding:.3rem .6rem;border-radius:6px;white-space:nowrap;"><i data-lucide="users" style="width:11px;height:11px"></i> Peserta</button>';

                return '<tr style="opacity:.7;">' +
                    '<td style="text-align:center;">' + (i + 1) + '</td>' +
                    '<td style="font-weight:600;">' + (a.judul || '-') + (isSusulan ? ' <span style="font-size:.65rem;background:#fef3c7;color:#92400e;padding:.1rem .3rem;border-radius:4px;">Susulan</span>' : '') + '</td>' +
                    '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                    '<td>' + (a.kelas || '-') + '</td>' +
                    '<td>' + (a.tipe_ujian || '-') + '</td>' +
                    '<td>' + tgl + '</td>' +
                    '<td><span style="color:var(--text-light);font-size:.82rem;text-decoration:line-through;">Link dinonaktifkan</span></td>' +
                    '<td><span class="badge" style="background:rgba(100,116,139,.1);color:#64748b;font-size:.75rem;">Kadaluarsa</span></td>' +
                    '<td><div style="display:flex;gap:.3rem;flex-wrap:wrap;justify-content:center;">' + aksiHtml + '</div></td>' +
                    '</tr>';
            }).join('');
        }

        if (window.lucide) lucide.createIcons();
    } catch (e) {
        tbodyAktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
        tbodyNonaktif.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

// --- Buat Ujian Susulan (duplikasi asesmen + soal) ---
async function buatUjianSusulan(asesmenId) {
    showCustomConfirm(
        'Buat Ujian Susulan?',
        'Soal ini akan <strong>diduplikasi</strong> menjadi paket ujian baru dengan label <strong>(Susulan)</strong>.<br>Soal asli tetap aman di riwayat kadaluarsa.',
        'Ya, Buat Susulan',
        async function () {
            if (typeof showGlobalLoader === 'function') showGlobalLoader('Menduplikasi soal...');
            try {
                // 1. Ambil data asesmen sumber
                const { data: source, error: srcErr } = await supabaseClient.from('asesmen').select('*').eq('id', asesmenId).single();
                if (srcErr || !source) throw new Error('Gagal mengambil data asesmen sumber.');

                // 2. Buat judul baru
                var baseJudul = source.judul.replace(/\s*\(Susulan(?:\s*\d+)?\)\s*$/, '');
                // Cek berapa kali sudah ada susulan untuk judul yang sama
                const { data: existing } = await supabaseClient.from('asesmen')
                    .select('judul')
                    .like('judul', baseJudul + ' (Susulan%')
                    .is('deleted_at', null);
                var count = (existing ? existing.length : 0) + 1;
                var judulBaru = baseJudul + ' (Susulan ' + count + ')';

                // 3. Insert asesmen baru
                var newPayload = {
                    judul: judulBaru,
                    mata_pelajaran: source.mata_pelajaran,
                    kelas: source.kelas,
                    tipe_ujian: source.tipe_ujian,
                    waktu_menit: source.waktu_menit,
                    tanggal_pelaksanaan: new Date().toISOString().split('T')[0],
                    bobot_pg: source.bobot_pg,
                    bobot_essay: source.bobot_essay,
                    status: 'terbit',
                    is_cbt_native: source.is_cbt_native,
                    google_form_url: null,
                    ujian_sent_at: new Date().toISOString(),
                    ujian_aktif: null,
                    tahun_pelajaran: source.tahun_pelajaran,
                    semester: source.semester,
                    created_by: currentUser ? currentUser.id : null,
                    updated_at: new Date().toISOString()
                };
                const { data: newAsm, error: insErr } = await supabaseClient.from('asesmen').insert([newPayload]).select('id').single();
                if (insErr) throw insErr;

                // 4. Duplikasi soal
                const { data: soalList } = await supabaseClient.from('asesmen_soal').select('*').eq('asesmen_id', asesmenId).order('nomor_soal', { ascending: true });
                if (soalList && soalList.length > 0) {
                    var soalRows = soalList.map(function(s) {
                        return {
                            asesmen_id: newAsm.id,
                            nomor_soal: s.nomor_soal,
                            tipe_soal: s.tipe_soal,
                            naskah_soal: s.naskah_soal,
                            opsi_a: s.opsi_a,
                            opsi_b: s.opsi_b,
                            opsi_c: s.opsi_c,
                            opsi_d: s.opsi_d,
                            kunci_jawaban: s.kunci_jawaban,
                            gambar_url: s.gambar_url
                        };
                    });
                    await supabaseClient.from('asesmen_soal').insert(soalRows);
                }

                showToast('✅ Ujian Susulan "' + judulBaru + '" berhasil dibuat! Silakan mulai sesi di Monitor CBT.', 'success');
                if (typeof loadSoalUjian === 'function') loadSoalUjian();
                if (typeof loadAsesmenList === 'function') loadAsesmenList();
            } catch (e) {
                showToast('Gagal membuat susulan: ' + e.message, 'error');
            } finally {
                if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            }
        }
    );
}

// --- Lihat Peserta Ujian (riwayat siapa saja yang mengerjakan) ---
async function lihatPesertaUjian(asesmenId) {
    showGlobalLoader('Memuat data peserta...');
    try {
        // Ambil info asesmen
        const { data: asm } = await supabaseClient.from('asesmen').select('judul, mata_pelajaran, kelas').eq('id', asesmenId).single();

        // Ambil semua sesi CBT untuk asesmen ini
        const { data: sesiList } = await supabaseClient.from('cbt_sesi_ujian')
            .select('id, token, status, waktu_mulai, waktu_selesai, created_at')
            .eq('asesmen_id', asesmenId)
            .order('created_at', { ascending: true });

        if (!sesiList || sesiList.length === 0) {
            hideGlobalLoader();
            showNotifModal('Peserta Ujian', '<div style="text-align:center;padding:2rem;color:#64748b;"><p>Belum ada sesi ujian yang pernah berjalan untuk soal ini.</p></div>', 'info');
            return;
        }

        var sesiIds = sesiList.map(function(s) { return s.id; });

        // Ambil semua jawaban
        const { data: jawabanList } = await supabaseClient.from('cbt_jawaban_siswa')
            .select('*, siswa(nama_lengkap)')
            .in('sesi_id', sesiIds)
            .order('waktu_kumpul', { ascending: true });

        var html = '<div style="margin-bottom:1rem;padding:1rem;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;border:1px solid #bae6fd;">' +
            '<div style="font-weight:700;color:#0369a1;font-size:1rem;">' + (asm ? asm.judul : '') + '</div>' +
            '<div style="font-size:.85rem;color:#0c4a6e;margin-top:.3rem;">' + (asm ? asm.mata_pelajaran + ' — ' + asm.kelas : '') + '</div>' +
            '</div>';

        // Build tabel per sesi
        sesiList.forEach(function(sesi, sIdx) {
            var sesiJawaban = (jawabanList || []).filter(function(j) { return j.sesi_id === sesi.id; });
            var waktuMulai = sesi.waktu_mulai ? new Date(sesi.waktu_mulai).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
            var waktuSelesai = sesi.waktu_selesai ? new Date(sesi.waktu_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

            html += '<div style="margin-bottom:1rem;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">';
            html += '<div style="background:#f8fafc;padding:.6rem 1rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;">';
            html += '<span style="font-weight:700;font-size:.85rem;color:#334155;">Sesi ' + (sIdx + 1) + ' <span style="color:#94a3b8;font-weight:400;">(Token: ' + sesi.token + ')</span></span>';
            html += '<span style="font-size:.78rem;color:#64748b;">' + waktuMulai + ' s/d ' + waktuSelesai + '</span>';
            html += '</div>';

            if (sesiJawaban.length === 0) {
                html += '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:.85rem;">Tidak ada peserta di sesi ini.</div>';
            } else {
                html += '<table class="dash-table" style="margin:0;font-size:.82rem;"><thead><tr><th style="width:35px">No</th><th>Nama Siswa</th><th>Status</th><th>Nilai</th><th>Waktu Kumpul</th></tr></thead><tbody>';
                sesiJawaban.forEach(function(j, jIdx) {
                    var nama = j.siswa ? j.siswa.nama_lengkap : 'Unknown';
                    var status = j.status === 'selesai' ? '<span class="badge" style="background:#dcfce7;color:#16a34a;font-size:.72rem;">Selesai</span>'
                        : j.status === 'mengerjakan' ? '<span class="badge" style="background:#e0f2fe;color:#0284c7;font-size:.72rem;">Mengerjakan</span>'
                        : j.status === 'diblokir' ? '<span class="badge" style="background:#fee2e2;color:#dc2626;font-size:.72rem;">Diblokir</span>'
                        : '<span class="badge" style="background:#f1f5f9;color:#64748b;font-size:.72rem;">' + (j.status || '-') + '</span>';
                    var nilai = j.nilai !== null && j.nilai !== undefined ? j.nilai : '-';
                    var kumpul = j.waktu_kumpul ? new Date(j.waktu_kumpul).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
                    html += '<tr><td style="text-align:center;">' + (jIdx + 1) + '</td><td style="font-weight:600;">' + nama + '</td><td>' + status + '</td><td style="font-weight:800;">' + nilai + '</td><td>' + kumpul + '</td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div>';
        });

        showNotifModal('Riwayat Peserta Ujian', html, 'info');
        if (window.lucide) lucide.createIcons();

    } catch (e) {
        showToast('Gagal memuat peserta: ' + e.message, 'error');
    } finally {
        hideGlobalLoader();
    }
}

// --- Open Builder (new or edit) ---
async function openAsesmenBuilder(existingId) {
    if (typeof showSection === 'function') showSection('sectionBuatSoal');
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
            asesmenBuilderSoalList = (soalData || []).map(function (s) {
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
        } catch (e) { showToast('Gagal memuat draft: ' + e.message, 'error'); }
    } else {
        document.getElementById('builderTitle').textContent = 'Buat Asesmen Manual';
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
    document.getElementById('builderAsesmenId').value = '';
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
    document.getElementById('builderAsesmenId').value = '';
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
    document.getElementById('builderAsesmenId').value = '';
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
            waktu_mulai_ujian: null,
            waktu_selesai_ujian: null,
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
    } catch (e) {
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
            soalList.forEach(function (s, i) {
                contentHtml += '<div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #e2e8f0;">';
                contentHtml += '<div style="font-weight:600;margin-bottom:6px;font-size:0.9rem;">' + (i + 1) + '. ' + (s.tipe_soal === 'pg' ? '<span style="color:#3b82f6">[PG]</span>' : '<span style="color:#8b5cf6">[Essay]</span>') + ' ' + (s.naskah_soal.replace(/\n/g, '<br>')) + '</div>';

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

        showNotifModal('Detail Asesmen', contentHtml, 'info');
    } catch (e) {
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
        masterMapelList.forEach(function (m) {
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
        masterKelasList.forEach(function (k) {
            var label = k.nama_kelas + ' (Tingkat ' + k.tingkat + ')';
            var s = k.nama_kelas === selectedVal ? ' selected' : '';
            opts += '<option value="' + k.nama_kelas + '"' + s + '>' + label + '</option>';
        });
    }
    sel.innerHTML = opts;
}

function populateKartuKelasCheckboxes() {
    var container = document.getElementById('kartuKelasContainer');
    if (!container) return;
    var html = '';
    if (typeof masterKelasList !== 'undefined' && masterKelasList) {
        masterKelasList.forEach(function (k) {
            html += `
                <label style="display:flex; align-items:center; gap:4px; font-size:0.9rem; cursor:pointer;">
                    <input type="checkbox" class="cb-kartu-kelas" value="${k.nama_kelas}" onchange="loadSiswaCetakKartu()" />
                    ${k.nama_kelas}
                </label>
            `;
        });
    }
    container.innerHTML = html || '<div style="color:#94a3b8; font-size:0.9rem;">Belum ada data kelas</div>';
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

    var keywords = cleanKunciStr.split(',').map(function (k) { return k.trim(); }).filter(function (k) { return k !== ''; });

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

    var keywords = cleanKunciStr.split(',').map(function (k) { return k.trim(); }).filter(function (k) { return k !== ''; });
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
    cards.forEach(function (card, i) {
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
            keywordInputs.forEach(function (inpt) {
                var cleanVal = inpt.value.trim().replace(/,/g, ''); // cegah bentrok koma
                if (cleanVal) kwList.push(cleanVal);
            });

            // Simpan slot kosong jika belum diketik supaya tidak hilang saat collect
            var resultStr = kwList.join(',');
            // Tapi kalau slotnya sedang ditambah dan masih kosong, kita pertahankan
            if (keywordInputs.length > kwList.length) {
                for (var z = kwList.length; z < keywordInputs.length; z++) resultStr += (resultStr ? ',' : '') + ' ';
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
    } catch (e) {
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
    area.innerHTML = asesmenBuilderSoalList.map(function (s, i) {
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

            var keywords = cleanKunciStr.split(',').map(function (k) { return k.trim(); }).filter(function (k) { return k !== ''; });
            var rawKeys = cleanKunciStr.split(',');
            if (rawKeys.length > keywords.length) {
                for (var z = keywords.length; z < rawKeys.length; z++) keywords.push('');
            }

            html += '<div style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.5rem;">';
            for (var k = 0; k < keywords.length; k++) {
                html += '<div style="display:flex; gap:0.5rem; align-items:center;">' +
                    '<div style="background:#e0f2fe;color:#0284c7;font-weight:700;font-size:0.7rem;padding:0.2rem 0.6rem;border-radius:20px;">' + (k + 1) + '</div>' +
                    '<input type="text" class="form-input soal-kunci-essay-item" placeholder="Ketik kata kunci ' + (k + 1) + '..." value="' + escAttr(keywords[k]) + '" />' +
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

function escHtml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(str) { return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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
            var pgList = rawList.filter(function (s) { return s.tipe === 'pg'; });
            var essayList = rawList.filter(function (s) { return s.tipe === 'essay'; });
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
        var tahunPelajaran = (document.getElementById('builderTahun') || {}).value || '';
        var semester = (document.getElementById('builderSemester') || {}).value || 'Ganjil';
        var asesmenPayload = {
            judul: judul.trim(),
            mata_pelajaran: mapel,
            kelas: kelas,
            tipe_ujian: tipe,
            waktu_menit: waktu,
            tanggal_pelaksanaan: tanggal,
            bobot_pg: bobotPG,
            bobot_essay: bobotEssay,
            tahun_pelajaran: tahunPelajaran,
            semester: semester,
            updated_at: new Date().toISOString()
        };

        var asesmenId = existingId;
        if (existingId) {
            // Jangan ubah status jika sudah terbit
            const { data: curr } = await supabaseClient.from('asesmen').select('status').eq('id', existingId).single();
            if(!curr || curr.status === 'draft') asesmenPayload.status = 'draft';
            
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
            var soalRows = asesmenBuilderSoalList.map(function (s, i) {
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
    } catch (e) { showToast('Gagal menyimpan draft: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

// --- Delete Asesmen (Soft Delete → Sampah) ---
async function deleteAsesmen(id) {
    showCustomConfirm('Pindahkan ke Sampah?', 'Asesmen ini akan dipindahkan ke <strong>Sampah</strong>. Anda masih bisa memulihkannya dalam waktu 30 hari.<br><br>Setelah 30 hari, asesmen akan dihapus otomatis secara permanen.', 'Ya, Pindahkan', async function () {
        showGlobalLoader('Memindahkan ke Sampah...');
        try {
            const { error } = await supabaseClient.from('asesmen').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            showToast('Asesmen dipindahkan ke Sampah. Pulihkan dalam 30 hari.', 'success');
            closeAsesmenBuilder();
            loadAsesmenList();
            loadSampahCount();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
    } catch (e) { console.warn('loadSampahCount:', e); }
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
        tbody.innerHTML = sampahList.map(function (a, i) {
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
                '<td style="text-align:center;">' + (i + 1) + '</td>' +
                '<td style="font-weight:600;">' + (a.judul || '-') + '</td>' +
                '<td>' + (a.mata_pelajaran || '-') + '</td>' +
                '<td>' + (a.kelas || '-') + '</td>' +
                '<td>' + (a.tipe_ujian || '-') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td style="font-size:0.82rem;">' + deletedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + '</td>' +
                '<td>' + sisaBadge + '</td>' +
                '<td><div style="display:flex;gap:.4rem;justify-content:center;">' +
                '<button class="btn-icon btn-icon-blue" onclick="restoreAsesmen(\'' + a.id + '\')" title="Pulihkan"><i data-lucide="rotate-ccw" style="width:14px;height:14px"></i></button>' +
                '<button class="btn-icon btn-icon-red" onclick="permanentDeleteAsesmen(\'' + a.id + '\')" title="Hapus Permanen"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>' +
                '</div></td>' +
                '</tr>';
        }).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--danger)">Gagal: ' + e.message + '</td></tr>';
    }
}

async function restoreAsesmen(id) {
    showCustomConfirm('Pulihkan Asesmen?', 'Asesmen ini akan dikembalikan ke <strong>Riwayat Asesmen</strong> dengan status semula.', 'Ya, Pulihkan', async function () {
        showGlobalLoader('Memulihkan asesmen...');
        try {
            const { error } = await supabaseClient.from('asesmen').update({ deleted_at: null }).eq('id', id);
            if (error) throw error;
            showToast('Asesmen berhasil dipulihkan ke Riwayat!', 'success');
            loadSampahAsesmen();
            loadAsesmenList();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
                } catch (e) { console.warn('Gagal hapus drive', e); }
            }
        }

        // Hapus gambar soal dari Supabase Storage
        try {
            const { data: soalData } = await supabaseClient.from('asesmen_soal').select('gambar_url').eq('asesmen_id', id);
            if (soalData) {
                var filesToDelete = soalData
                    .filter(function (s) { return s.gambar_url && s.gambar_url.indexOf('/soal-images/') > -1; })
                    .map(function (s) { return s.gambar_url.split('/soal-images/').pop(); });
                if (filesToDelete.length > 0) {
                    await supabaseClient.storage.from('soal-images').remove(filesToDelete);
                }
            }
        } catch (e) { console.warn('Gagal hapus gambar storage', e); }

        // Delete soal then asesmen
        await supabaseClient.from('asesmen_soal').delete().eq('asesmen_id', id);
        await supabaseClient.from('asesmen').delete().eq('id', id);
    } catch (e) { console.warn('executePermanentDelete error:', e); }
}

async function permanentDeleteAsesmen(id) {
    showCustomConfirm('Hapus Permanen?', 'Asesmen ini akan <strong>dihapus permanen</strong> dari database, termasuk file Form dan Sheet-nya di Google Drive.<br><br>⚠️ <strong>Tindakan ini TIDAK bisa dibatalkan!</strong>', 'Ya, Hapus Permanen', async function () {
        showGlobalLoader('Menghapus permanen...');
        try {
            await executePermanentDelete(id);
            showToast('Asesmen berhasil dihapus permanen!', 'success');
            loadSampahAsesmen();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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

    showCustomConfirm('Kosongkan Semua Sampah?', 'Semua asesmen di sampah akan <strong>dihapus permanen</strong>.<br><br>⚠️ <strong>Tindakan ini TIDAK bisa dibatalkan!</strong>', 'Ya, Kosongkan', async function () {
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
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
    builderIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var bTipe = document.getElementById('builderTipe');
    if (bTipe) bTipe.value = 'STS';
    asesmenBuilderSoalList = [];
    if (typeof renderSoalCards === 'function') renderSoalCards();

    // 2. Bersihkan area parse
    var parseIds = ['parseJudul', 'parseMapel', 'parseKelas', 'parseWaktu', 'parseTanggal', 'parseTextarea'];
    parseIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var pTipe = document.getElementById('parseTipe'); if (pTipe) pTipe.value = 'PH';
    var pPG = document.getElementById('parseBobotPG'); if (pPG) pPG.value = '';
    var pEssay = document.getElementById('parseBobotEssay'); if (pEssay) pEssay.value = '';
    var pStatus = document.getElementById('parseStatusLabel'); if (pStatus) pStatus.innerHTML = '';

    // 3. Bersihkan area AI
    var aiIds = ['aiJudul', 'aiMapel', 'aiKelas', 'aiWaktu', 'aiTanggal', 'aiTextarea', 'aiPromptInput'];
    aiIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var aTipe = document.getElementById('aiTipe'); if (aTipe) aTipe.value = 'PH';
    var aPG = document.getElementById('aiBobotPG'); if (aPG) aPG.value = '';
    var aEssay = document.getElementById('aiBobotEssay'); if (aEssay) aEssay.value = '';
    var aStatus = document.getElementById('aiStatusLabel'); if (aStatus) aStatus.innerHTML = '';
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
    var pgList = rawList.filter(function (s) { return s.tipe === 'pg'; });
    var essayList = rawList.filter(function (s) { return s.tipe === 'essay'; });
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
    
    var srcSemester = document.getElementById(prefix + 'Semester');
    if (srcSemester) document.getElementById('builderSemester').value = srcSemester.value;

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
            function () {
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
    today.setHours(0, 0, 0, 0);
    var inputDate = new Date(tanggal);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate < today) {
        showToast('Gagal Menerbitkan: Tanggal ujian (' + tanggal + ') tidak boleh sebelum hari ini!', 'error');
        return;
    }

    if (asesmenBuilderSoalList.length === 0) { showToast('Tambahkan minimal 1 soal sebelum menerbitkan!', 'warning'); return; }

    // Validate all PG have kunci jawaban
    var pgWithoutKey = asesmenBuilderSoalList.filter(function (s) { return s.tipe === 'pg' && !s.kunci; });
    if (pgWithoutKey.length > 0) {
        showToast('Semua soal PG harus memiliki kunci jawaban! (' + pgWithoutKey.length + ' soal belum ada kunci)', 'warning');
        return;
    }

    // Validate all Essay have at least 1 keyword
    var essayWithoutKey = asesmenBuilderSoalList.filter(function (s) {
        var c = (s.kunci || '').replace('[OR]', '').trim().replace(/,/g, '');
        return s.tipe === 'essay' && c === '';
    });
    var pgCount = asesmenBuilderSoalList.filter(function (s) { return s.tipe === 'pg'; }).length;
    var essayCount = asesmenBuilderSoalList.filter(function (s) { return s.tipe === 'essay'; }).length;

    var bobotPG = parseInt((document.getElementById('builderBobotPG') || {}).value || 0);
    var bobotEssay = parseInt((document.getElementById('builderBobotEssay') || {}).value || 0);
    var totalPoin = (pgCount * bobotPG) + (essayCount * bobotEssay);
    
    if (totalPoin !== 100) {
        showToast('Gagal Menerbitkan: Total bobot saat ini (' + totalPoin + '). Harap sesuaikan bobot x soal agar total menjadi 100 (misal: 50 soal PG x 2 = 100)! Anda tetap bisa menyimpannya ke Draft.', 'warning');
        return;
    }

    showCustomConfirm(
        'Terbitkan Asesmen?',
        'Asesmen <strong>"' + escHtml(judul) + '"</strong> akan diterbitkan.<br><br>' +
        'Total: <strong>' + asesmenBuilderSoalList.length + ' soal</strong> (' + pgCount + ' PG, ' + essayCount + ' Essay)<br><br>' +
        'Setelah diterbitkan, soal TIDAK bisa diedit lagi.',
        'Lanjut Pilih Platform',
        function () { showPublishChoiceModal(judul); }
    );
}

function showPublishChoiceModal(judul) {
    var overlay = document.getElementById('notifModal');
    var iconEl = document.getElementById('notifIcon');
    var titleEl = document.getElementById('notifTitle');
    var msgEl = document.getElementById('notifMessage');
    var actionsEl = document.getElementById('notifActions');

    iconEl.innerHTML = '<i data-lucide="send" style="width:24px;height:24px;color:#f59e0b;"></i>';
    iconEl.style.background = 'rgba(245,158,11,.1)';
    titleEl.textContent = 'Pilih Platform Ujian';
    titleEl.style.color = '#f59e0b';
    msgEl.innerHTML = 'Asesmen <strong>"' + escHtml(judul) + '"</strong> sudah siap.<br>Pilih ke mana asesmen akan diterbitkan:';
    
    actionsEl.innerHTML = 
        '<div style="display:flex; flex-direction:column; gap:0.75rem; width:100%;">' +
          '<button class="btn btn-primary" onclick="closeNotifModal(); publishToCbtNative();" style="width:100%; justify-content:center; padding:0.8rem; background:#3b82f6; border-color:#3b82f6; color:white; font-size:1rem; border-radius:8px;"><i data-lucide="monitor" style="width:18px;height:18px;margin-right:6px;"></i> CBT Native</button>' +
          '<button class="btn btn-accent" onclick="closeNotifModal(); publishToGoogleForm();" style="width:100%; justify-content:center; padding:0.8rem; background:#10b981; border-color:#10b981; color:white; font-size:1rem; border-radius:8px;"><i data-lucide="file-text" style="width:18px;height:18px;margin-right:6px;"></i> Google Form</button>' +
          '<button class="btn btn-outline" onclick="closeNotifModal()" style="width:100%; justify-content:center; padding:0.8rem; font-size:1rem; border-radius:8px;">Batal</button>' +
        '</div>';

    overlay.classList.add('active');
    if (window.lucide) lucide.createIcons();
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

    // Validate Points (Sudah dipindah ke confirmPublishAsesmen)
    var jmlPG = asesmenBuilderSoalList.filter(s => s.tipe === 'pg').length;
    var jmlEssay = asesmenBuilderSoalList.filter(s => s.tipe === 'essay').length;
    if (jmlPG === 0 && jmlEssay === 0) {
        showToast('Tidak ada soal yang dibuat!', 'warning');
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
        soal: asesmenBuilderSoalList.map(function (s, i) {
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
            updatePayload.is_cbt_native = false; // Reset to Google Form
            updatePayload.ujian_sent_at = null;
            updatePayload.ujian_aktif = null;

            const { error: errUpdate } = await supabaseClient.from('asesmen').update(updatePayload).eq('id', asesmenId);
            if (errUpdate) throw errUpdate;

            // Auto-clone to draft as a backup
            try {
                await supabaseClient.rpc('clone_asesmen_to_draft', { p_asesmen_id: asesmenId });
            } catch (cloneErr) {
                console.warn("Gagal membuat clone backup:", cloneErr);
            }

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
    } catch (e) {
        showNotifModal('Gagal Menerbitkan', 'Terjadi kesalahan saat mengirim ke Google Apps Script:<br><br><strong>' + e.message + '</strong><br><br>Pastikan URL GAS benar dan sudah di-deploy sebagai Web App.', 'error');
    } finally {
        hideGlobalLoader();
    }
}

async function publishToCbtNative() {
    await saveDraftAsesmen(false);

    var asesmenId = (document.getElementById('builderAsesmenId') || {}).value;
    if (!asesmenId) { showToast('Simpan draft terlebih dahulu!', 'error'); return; }

    showGlobalLoader('Menerbitkan ke CBT Native...');
    try {
        const { error } = await supabaseClient.from('asesmen').update({ 
            status: 'terbit', 
            is_cbt_native: true, 
            published_at: new Date().toISOString(), 
            updated_at: new Date().toISOString(),
            ujian_sent_at: null,
            ujian_aktif: null
        }).eq('id', asesmenId);
        
        if (error) throw error;

        // Auto-clone to draft as a backup
        try {
            await supabaseClient.rpc('clone_asesmen_to_draft', { p_asesmen_id: asesmenId });
        } catch (cloneErr) {
            console.warn("Gagal membuat clone backup:", cloneErr);
        }

        showToast('Asesmen berhasil diterbitkan ke CBT Native!', 'success');
        
        if (typeof closeAsesmenBuilder === 'function') closeAsesmenBuilder();
        if (typeof loadAsesmenList === 'function') loadAsesmenList();
        if (typeof showSection === 'function') showSection('sectionManajemenAsesmen');
        if (typeof switchAsesmenTab === 'function') {
            var firstTab = document.querySelector('.asesmen-tab');
            if (firstTab) switchAsesmenTab('aktif', firstTab);
        }

    } catch (e) {
        showNotifModal('Gagal Menerbitkan CBT', 'Terjadi kesalahan saat menyimpan ke database:<br><br><strong>' + e.message + '</strong><br><br>⚠️ <strong>PENTING:</strong> Pastikan Anda telah menjalankan perintah SQL <code>cbt_setup.sql</code> di Supabase SQL Editor. Jika belum, sistem tidak dapat menyimpan status CBT.', 'error');
    } finally {
        hideGlobalLoader();
    }
}

// ============================================================