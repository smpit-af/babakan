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
    } catch (e) {
        console.error('Error loading wali kelas data:', e);
    }
}

// === 1. JURNAL INVAL ===
function renderWkInvalTable() {
    let tbody = document.querySelector('#tableWkInval tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (dWkInval.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data jurnal inval.</td></tr>`;
        return;
    }
    dWkInval.forEach((d, i) => {
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
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
    if (window.lucide) lucide.createIcons();
}

function populateWkInvalSelects() {
    let selKelas = document.getElementById('formWkInvalKelas');
    let selGuru = document.getElementById('formWkInvalGuru');
    let selMapel = document.getElementById('formWkInvalMapel');

    if (selKelas) {
        selKelas.innerHTML = '<option value="">Pilih Kelas...</option>';
        if (typeof masterKelasList !== 'undefined') {
            masterKelasList.forEach(k => {
                selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
            });
        }
    }

    if (selGuru) {
        selGuru.innerHTML = '<option value="">Pilih Guru...</option>';
        if (typeof guruList !== 'undefined') {
            guruList.forEach(g => {
                selGuru.innerHTML += `<option value="${g.nama_lengkap}">${g.nama_lengkap}</option>`;
            });
        }
    }

    if (selMapel) {
        selMapel.innerHTML = '<option value="">Pilih Mata Pelajaran...</option>';
        if (typeof masterMapelList !== 'undefined') {
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
    if (!payload.tanggal || !payload.kelas || !payload.nama_guru || !payload.mata_pelajaran) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if (id) {
            const { error } = await supabaseClient.from('wk_jurnal_inval').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_jurnal_inval').insert([payload]);
            if (error) throw error;
        }
        showToast('Data jurnal berhasil disimpan!', 'success');
        closeWkModalInval();
        await loadWaliKelasData();
    } catch (e) {
        console.error("Error saving Inval:", e);
        let msg = e.message || (e.error && e.error.message) || JSON.stringify(e) || "Unknown error";
        alert('Gagal menyimpan: ' + msg);
        showToast('Gagal menyimpan: ' + msg, 'error');
    } finally { hideGlobalLoader(); }
}

function editWkInval(id) {
    let d = dWkInval.find(x => x.id === id);
    if (!d) return;
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
            if (error) throw error;
            showToast('Jurnal berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch (e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
    });
}

// === 2. TATIB & KARAKTER ===
function populateSiswaSelectWk(selectId, filterKelas = '') {
    let sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Pilih Siswa...</option>';
    let list = getSiswaForKeuangan(filterKelas);
    list.forEach(s => {
        sel.innerHTML += `<option value="${s.id}">${s.namaLengkap} (${s.kelas})</option>`;
    });
}

function renderWkTatibTable() {
    let tbody = document.querySelector('#tableWkKarakter tbody');
    if (!tbody) return;

    let search = document.getElementById('searchWkKarakter').value.toLowerCase();
    let filterJenis = document.getElementById('filterWkJenisKarakter').value;
    let selFilterKelas = document.getElementById('filterWkKelasKarakter');
    if (selFilterKelas && selFilterKelas.options.length <= 1 && typeof masterKelasList !== 'undefined') {
        let currentVal = selFilterKelas.value;
        selFilterKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selFilterKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
        selFilterKelas.value = currentVal;
    }

    let filterKelas = selFilterKelas ? selFilterKelas.value : '';

    let filtered = dWkKarakter;
    if (search) filtered = filtered.filter(d => d.siswa?.nama_lengkap?.toLowerCase().includes(search));
    if (filterJenis) filtered = filtered.filter(d => d.jenis === filterJenis);
    if (filterKelas) filtered = filtered.filter(d => d.siswa?.master_kelas?.nama_kelas === filterKelas);

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data tatib & karakter.</td></tr>`;
        return;
    }
    filtered.forEach((d, i) => {
        let badgeStyle = d.jenis === 'Pelanggaran' ? 'background:#fee2e2; color:#dc2626;' : 'background:#dcfce7; color:#16a34a;';
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
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
    if (window.lucide) lucide.createIcons();
}

function openWkModalKarakter() {
    let selKelas = document.getElementById('formWkKarakterKelasFilter');
    if (selKelas && typeof masterKelasList !== 'undefined') {
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
    if (!payload.id_siswa || !payload.tanggal || !payload.jenis || !payload.keterangan) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if (id) {
            const { error } = await supabaseClient.from('wk_catatan_karakter').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_catatan_karakter').insert([payload]);
            if (error) throw error;
        }
        showToast('Catatan berhasil disimpan!', 'success');
        closeWkModalKarakter();
        await loadWaliKelasData();
    } catch (e) { showToast('Gagal menyimpan: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function editWkKarakter(id) {
    let d = dWkKarakter.find(x => x.id === id);
    if (!d) return;
    openWkModalKarakter();
    document.getElementById('wkModalKarakterTitle').innerText = 'Edit Catatan Karakter';
    document.getElementById('formWkKarakterId').value = d.id;

    let kelasSiswa = d.siswa?.master_kelas?.nama_kelas || '';
    let selKelas = document.getElementById('formWkKarakterKelasFilter');
    if (selKelas && kelasSiswa) selKelas.value = kelasSiswa;
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
            if (error) throw error;
            showToast('Catatan berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch (e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
    });
}

// === 3. BUKU PENGHUBUNG ===
function renderWkPenghubungTable() {
    let tbody = document.querySelector('#tableWkPenghubung tbody');
    if (!tbody) return;

    let search = document.getElementById('searchWkPenghubung')?.value.toLowerCase() || '';
    let filterJenis = document.getElementById('filterWkJenisPenghubung')?.value || '';
    let selFilterKelas = document.getElementById('filterWkKelasPenghubung');

    if (selFilterKelas && selFilterKelas.options.length <= 1 && typeof masterKelasList !== 'undefined') {
        let currentVal = selFilterKelas.value;
        selFilterKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selFilterKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
        selFilterKelas.value = currentVal;
    }

    let filterKelas = selFilterKelas ? selFilterKelas.value : '';

    let filtered = dWkPenghubung;
    if (search) filtered = filtered.filter(d => d.siswa?.nama_lengkap?.toLowerCase().includes(search));
    if (filterJenis) filtered = filtered.filter(d => d.jenis_komunikasi === filterJenis);
    if (filterKelas) filtered = filtered.filter(d => d.siswa?.master_kelas?.nama_kelas === filterKelas);

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data buku penghubung.</td></tr>`;
        return;
    }
    filtered.forEach((d, i) => {
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
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
    if (window.lucide) lucide.createIcons();
}

function openWkModalPenghubung() {
    let selKelas = document.getElementById('formWkPenghubungKelasFilter');
    if (selKelas && typeof masterKelasList !== 'undefined') {
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
    if (!payload.id_siswa || !payload.tanggal || !payload.permasalahan) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if (id) {
            const { error } = await supabaseClient.from('wk_buku_penghubung').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_buku_penghubung').insert([payload]);
            if (error) throw error;
        }
        showToast('Data penghubung berhasil disimpan!', 'success');
        closeWkModalPenghubung();
        await loadWaliKelasData();
    } catch (e) { showToast('Gagal menyimpan: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function editWkPenghubung(id) {
    let d = dWkPenghubung.find(x => x.id === id);
    if (!d) return;
    openWkModalPenghubung();
    document.getElementById('wkModalPenghubungTitle').innerText = 'Edit Buku Penghubung';
    document.getElementById('formWkPenghubungId').value = d.id;

    let kelasSiswa = d.siswa?.master_kelas?.nama_kelas || '';
    let selKelas = document.getElementById('formWkPenghubungKelasFilter');
    if (selKelas && kelasSiswa) selKelas.value = kelasSiswa;
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
            if (error) throw error;
            showToast('Catatan berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch (e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
    });
}

// === 4. INVENTARIS KELAS ===
function renderWkInventarisTable() {
    let tbody = document.querySelector('#tableWkInventaris tbody');
    if (!tbody) return;

    let search = document.getElementById('searchWkInventaris')?.value.toLowerCase() || '';
    let filterKondisi = document.getElementById('filterWkKondisiInventaris')?.value || '';
    let selFilterKelas = document.getElementById('filterWkKelasInventaris');

    if (selFilterKelas && selFilterKelas.options.length <= 1 && typeof masterKelasList !== 'undefined') {
        let currentVal = selFilterKelas.value;
        selFilterKelas.innerHTML = '<option value="">Semua Kelas</option>';
        masterKelasList.forEach(k => {
            selFilterKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
        selFilterKelas.value = currentVal;
    }

    let filterKelas = selFilterKelas ? selFilterKelas.value : '';

    let filtered = dWkInventaris;
    if (search) filtered = filtered.filter(d => d.nama_barang?.toLowerCase().includes(search));
    if (filterKondisi) filtered = filtered.filter(d => d.kondisi === filterKondisi);
    if (filterKelas) filtered = filtered.filter(d => d.kelas === filterKelas);

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data inventaris.</td></tr>`;
        return;
    }
    filtered.forEach((d, i) => {
        let badgeColor = d.kondisi === 'Baik' ? '#16a34a' : (d.kondisi === 'Rusak Ringan' ? '#f59e0b' : '#dc2626');
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
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
    if (window.lucide) lucide.createIcons();
}

function openWkModalInventaris() {
    let selKelas = document.getElementById('formWkInventarisKelas');
    if (selKelas) {
        selKelas.innerHTML = '<option value="">Pilih Kelas...</option>';
        if (typeof masterKelasList !== 'undefined') {
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
    if (!payload.tanggal_lapor || !payload.kelas || !payload.nama_barang) {
        return showToast('Mohon lengkapi field wajib!', 'warning');
    }
    showGlobalLoader();
    try {
        if (id) {
            const { error } = await supabaseClient.from('wk_inventaris_kelas').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('wk_inventaris_kelas').insert([payload]);
            if (error) throw error;
        }
        showToast('Data inventaris berhasil disimpan!', 'success');
        closeWkModalInventaris();
        await loadWaliKelasData();
    } catch (e) { showToast('Gagal menyimpan: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function editWkInventaris(id) {
    let d = dWkInventaris.find(x => x.id === id);
    if (!d) return;
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
            if (error) throw error;
            showToast('Inventaris berhasil dihapus!', 'success');
            await loadWaliKelasData();
        } catch (e) { showToast('Gagal menghapus: ' + e.message, 'error'); }
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
    } catch (e) { console.error('Gagal load hero:', e); dKontenHero = []; }
    renderHeroManager();
}

function renderHeroManager() {
    var tbody = document.querySelector('#tableHeroSlides tbody');
    if (!tbody) return;

    if (dKontenHero.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada slide hero. Klik "Tambah Slide" untuk menambahkan.</td></tr>';
        return;
    }

    tbody.innerHTML = dKontenHero.map(function (h, i) {
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

async function hapusSlideHero(id) {
    showCustomConfirm('Hapus Slide?', 'Slide ini dan gambarnya akan dihapus.', 'Ya, Hapus', async function () {
        showGlobalLoader('Menghapus slide...');
        try {
            const { error } = await supabaseClient.from('konten_hero').delete().eq('id', id);
            if (error) throw error;
            showToast('Slide dihapus!', 'success');
            await loadKontenHero();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
    } catch (e) { showToast('Gagal upload: ' + e.message, 'error'); }
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
    } catch (e) { console.error('Gagal load visi misi:', e); dKontenVisiMisiList = []; }
    renderVisiMisiTable();
}

function renderVisiMisiTable() {
    var tbody = document.querySelector('#tableVisiMisi tbody');
    if (!tbody) return;
    if (dKontenVisiMisiList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data visi & misi. Klik "Tambah Visi & Misi" untuk menambahkan.</td></tr>';
        return;
    }
    tbody.innerHTML = dKontenVisiMisiList.map(function (d, i) {
        var misiArr = d.misi || [];
        var misiText = misiArr.length > 0 ? misiArr.map(function (m, j) { return (j + 1) + '. ' + m; }).join('<br>') : '-';
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
    var d = dKontenVisiMisiList.find(function (x) { return x.id === id; });
    if (!d) return;
    openVisiMisiModal();
    document.getElementById('visiMisiModalTitle').innerText = 'Edit Visi & Misi';
    document.getElementById('formVisiMisiId').value = d.id;
    document.getElementById('formVisiTeks').value = d.visi || '';
    var container = document.getElementById('misiListContainer');
    container.innerHTML = '';
    var misiArr = d.misi || [];
    misiArr.forEach(function (m, i) { addMisiItemHTML(container, m, i); });
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
    misiInputs.forEach(function (el) { if (el.value.trim()) misiArr.push(el.value.trim()); });

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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function hapusVisiMisi(id) {
    showCustomConfirm('Hapus Visi & Misi?', 'Data ini akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('konten_visi_misi').delete().eq('id', id);
            if (error) throw error;
            showToast('Visi & Misi dihapus!', 'success');
            await loadKontenVisiMisi();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
    } catch (e) { console.error('Gagal load testimoni:', e); dKontenTestimoni = []; }
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
    dKontenTestimoni.forEach(function (d, i) {
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
    var d = dKontenTestimoni.find(function (x) { return x.id === id; });
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
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { hideGlobalLoader(); }
}

function hapusTestimoni(id) {
    showCustomConfirm('Hapus Testimoni?', 'Testimoni ini akan dihapus permanen.', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('konten_testimoni').delete().eq('id', id);
            if (error) throw error;
            showToast('Testimoni dihapus!', 'success');
            await loadKontenTestimoni();
        } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
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
    slides.forEach(function (s, i) {
        if (i === 0) s.classList.add('active');
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
        data.forEach(function (h, i) {
            var div = document.createElement('div');
            div.className = 'hero-slide' + (i === 0 ? ' active' : '');
            if (h.gambar_desktop) div.style.backgroundImage = "url('" + h.gambar_desktop + "')";
            div.setAttribute('data-mobile', h.gambar_mobile || '');
            container.appendChild(div);
        });

        // Apply mobile images if on small screen
        if (window.innerWidth <= 768) {
            container.querySelectorAll('.hero-slide').forEach(function (slide) {
                var mobileUrl = slide.getAttribute('data-mobile');
                if (mobileUrl) slide.style.backgroundImage = "url('" + mobileUrl + "')";
            });
        }
        initHeroSlider();
    } catch (e) {
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
                misiUl.innerHTML = data.misi.map(function (m, i) {
                    return '<li>' + (i + 1) + '. ' + m + '</li>';
                }).join('');
            }
        }
    } catch (e) { console.log('Visi Misi public fallback to static'); }
}

async function loadTestimoniPublic() {
    try {
        const { data, error } = await supabaseClient.from('konten_testimoni').select('*').order('urutan');
        if (error) throw error;
        if (!data || data.length === 0) return;

        var track = document.getElementById('testimonialTrack');
        var dotsContainer = document.getElementById('testimonialDots');
        if (!track) return;

        track.innerHTML = data.map(function (t) {
            var initials = t.nama.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
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
            dotsContainer.innerHTML = data.map(function (t, i) {
                return '<span class="dot' + (i === 0 ? ' active' : '') + '" onclick="setTestimonial(' + i + ')" style="width:10px;height:10px;border-radius:50%;background:' + (i === 0 ? 'var(--primary)' : 'rgba(30,58,138,0.2)') + ';cursor:pointer;"></span>';
            }).join('');
        }

        if (window.lucide) lucide.createIcons();
    } catch (e) { console.log('Testimoni public fallback to static'); }
}

// ============================================================
// PUSAT PENGATURAN & TANDA TERIMA
// ============================================================

let honorConfig = {
    perJam: 0,
    waliKelas: 0
};

async function loadHonorDasar() {
    try {
        const { data, error } = await supabaseClient.from('system_settings').select('*').in('key', ['honor_per_jam', 'honor_wali_kelas']);
        if (!error && data) {
            data.forEach(item => {
                if (item.key === 'honor_per_jam') {
                    honorConfig.perJam = parseInt(item.value) || 0;
                    if (document.getElementById('inputHonorPerJam')) document.getElementById('inputHonorPerJam').value = formatRupiahInput(honorConfig.perJam.toString());
                }
                if (item.key === 'honor_wali_kelas') {
                    honorConfig.waliKelas = parseInt(item.value) || 0;
                    if (document.getElementById('inputHonorWaliKelas')) document.getElementById('inputHonorWaliKelas').value = formatRupiahInput(honorConfig.waliKelas.toString());
                }
            });
        }
    } catch (e) { console.error("Error loading honor config", e); }
}

async function simpanHonorDasar() {
    let jamInput = document.getElementById('inputHonorPerJam').value;
    let waliInput = document.getElementById('inputHonorWaliKelas').value;

    // Default to '0' if empty, then strip non-digits
    jamInput = jamInput ? jamInput.replace(/[^0-9]/g, '') : '0';
    waliInput = waliInput ? waliInput.replace(/[^0-9]/g, '') : '0';

    try {
        await supabaseClient.from('system_settings').upsert([
            { key: 'honor_per_jam', value: jamInput },
            { key: 'honor_wali_kelas', value: waliInput }
        ]);
        honorConfig.perJam = parseInt(jamInput) || 0;
        honorConfig.waliKelas = parseInt(waliInput) || 0;
        showToast("Penetapan Honor berhasil disimpan", "success");
    } catch (e) {
        showToast("Gagal menyimpan penetapan honor", "error");
    }
}

async function simpanPengaturanKwitansi() {
    var nama = document.getElementById('inputNamaBendahara').value.trim();
    var ttdFile = document.getElementById('inputTTDBendahara').files[0];

    showGlobalLoader("Menyimpan Pengaturan...");

    try {
        var ttdUrl = document.getElementById('previewTTDImage').getAttribute('src');
        if (!ttdUrl || ttdUrl === window.location.href || ttdUrl.startsWith('file://')) {
            ttdUrl = '';
        }

        if (ttdFile) {
            ttdUrl = await uploadToGoogleDrive(ttdFile, 'lainnya');
        }

        await supabaseClient.from('system_settings').upsert([
            { key: 'nama_bendahara', value: nama },
            { key: 'ttd_bendahara', value: ttdUrl || '' }
        ]);

        // Sinkronisasi ke localStorage agar Kwitansi langsung terupdate
        let settings = { namaBendahara: nama, ttdBase64: ttdUrl || '' };
        localStorage.setItem('kwitansi_settings', JSON.stringify(settings));

        showToast("Pengaturan Bendahara berhasil disimpan!", "success");
        if (typeof closePengaturanBendaharaModal === 'function') closePengaturanBendaharaModal();
    } catch (e) {
        showToast("Gagal menyimpan pengaturan: " + e.message, "error");
    } finally {
        hideGlobalLoader();
    }
}

async function loadPengaturanKwitansi() {
    try {
        const { data, error } = await supabaseClient.from('system_settings').select('*').in('key', ['nama_bendahara', 'ttd_bendahara']);
        if (!error && data) {
            data.forEach(item => {
                if (item.key === 'nama_bendahara' && document.getElementById('inputNamaBendahara')) {
                    document.getElementById('inputNamaBendahara').value = item.value;
                }
                if (item.key === 'ttd_bendahara' && item.value && document.getElementById('previewTTDImage')) {
                    document.getElementById('previewTTDImage').src = item.value;
                    document.getElementById('previewTTDContainer').style.display = 'block';
                }
            });
        }
    } catch (e) { }
}

function previewTTDBendahara(event) {
    var file = event.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('previewTTDImage').src = e.target.result;
            document.getElementById('previewTTDContainer').style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

function hapusTTDBendahara() {
    document.getElementById('inputTTDBendahara').value = '';
    document.getElementById('previewTTDImage').src = '';
    document.getElementById('previewTTDContainer').style.display = 'none';
}

async function populateDatalistPusatPengaturan() {
    if (typeof loadGuruData === 'function' && (typeof guruList === 'undefined' || guruList.length === 0)) {
        await loadGuruData();
    }
    if (typeof loadMasterMapel === 'function' && (typeof masterMapelList === 'undefined' || masterMapelList.length === 0)) {
        await loadMasterMapel();
    }

    let listGuru = document.getElementById('listGuru');
    if (listGuru && typeof guruList !== 'undefined') {
        listGuru.innerHTML = guruList.map(g => `<option value="${g.nama_lengkap}">`).join('');
    }

    let listMapel = document.getElementById('listMapel');
    if (listMapel && typeof masterMapelList !== 'undefined') {
        listMapel.innerHTML = masterMapelList.map(m => `<option value="${m.nama_mapel}">`).join('');
    }
}

function openPengaturanBendaharaModal() {
    let modal = document.getElementById('modalPengaturanBendahara');
    if (modal) {
        modal.classList.add('active');
    }
}

function closePengaturanBendaharaModal() {
    let modal = document.getElementById('modalPengaturanBendahara');
    if (modal) {
        modal.classList.remove('active');
    }
}


async function switchPusatPengaturanTab(tab) {
    document.getElementById('tabPusatUmum').style.display = 'none';
    document.getElementById('tabPusatHonor').style.display = 'none';
    document.getElementById('tabPusatUniversal').style.display = 'none';

    document.getElementById('tabBtnPusatUmum').style.background = 'transparent';
    document.getElementById('tabBtnPusatUmum').style.color = 'var(--text-light)';
    document.getElementById('tabBtnPusatHonor').style.background = 'transparent';
    document.getElementById('tabBtnPusatHonor').style.color = 'var(--text-light)';
    document.getElementById('tabBtnPusatUniversal').style.background = 'transparent';
    document.getElementById('tabBtnPusatUniversal').style.color = 'var(--text-light)';

    if (tab === 'umum') {
        document.getElementById('tabPusatUmum').style.display = 'block';
        document.getElementById('tabBtnPusatUmum').style.background = 'var(--primary)';
        document.getElementById('tabBtnPusatUmum').style.color = 'white';
        await loadPengaturanKwitansi();
        await loadHonorDasar();
    } else if (tab === 'honor') {
        document.getElementById('tabPusatHonor').style.display = 'block';
        document.getElementById('tabBtnPusatHonor').style.background = 'var(--primary)';
        document.getElementById('tabBtnPusatHonor').style.color = 'white';

        await loadHonorDasar();
        await populateDatalistPusatPengaturan();

        // Auto set date to today if empty
        let dateInput = document.getElementById('tandaTerimaTanggal');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        if (document.getElementById('tbodyFormHonor').children.length === 0) { if (localStorage.getItem('draftHonorData')) muatTabelHonor(); else tambahBarisHonor(); }
    } else if (tab === 'universal') {
        document.getElementById('tabPusatUniversal').style.display = 'block';
        document.getElementById('tabBtnPusatUniversal').style.background = 'var(--primary)';
        document.getElementById('tabBtnPusatUniversal').style.color = 'white';

        let dateInput = document.getElementById('universalTanggalCetak');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        if (document.getElementById('tbodyFormUniversal').children.length === 0) { if (localStorage.getItem('draftUniversalData')) muatTabelUniversal(); else tambahBarisUniversal(); }
    }
}

// FORMAT RUPIAH HELPER FOR INPUT
function formatRupiahInput(angka, prefix) {
    if (!angka) return '';
    var number_string = angka.toString().replace(/[^,\d]/g, ''),
        split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    return prefix == undefined ? rupiah : (rupiah ? rupiah : '');
}

// HELPER: Format Date to Indonesian
function formatTanggalIndo(dateStr) {
    if (!dateStr) return "";
    let d = new Date(dateStr);
    let months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let day = d.getDate().toString().padStart(2, '0');
    let month = months[d.getMonth()];
    let year = d.getFullYear();
    return day + " " + month + " " + year;
}

function formatBulanTahunIndo(dateStr) {
    if (!dateStr) return "";
    let d = new Date(dateStr);
    let months = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    let month = months[d.getMonth()];
    let year = d.getFullYear();
    return month + " " + year;
}

// ================= HONOR =================
function tambahBarisHonor() {
    let tbody = document.getElementById('tbodyFormHonor');
    let tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align:center;" class="row-no">1</td>
        <td><input type="text" list="listGuru" class="form-input honor-nama" placeholder="Nama Guru/Staff" style="min-width:140px; margin:0;" autocomplete="off" /></td>
        <td><input type="text" class="form-input honor-jabatan" placeholder="Jabatan" style="min-width:110px; margin:0;" /></td>
        <td><input type="text" list="listMapel" class="form-input honor-mapel" placeholder="Opsional" style="min-width:110px; margin:0;" autocomplete="off" /></td>
        <td><input type="number" class="form-input honor-jam" placeholder="Jam" style="width:70px; margin:0;" oninput="kalkulasiJamHonor(this)" /></td>
        <td><input type="text" class="form-input honor-mengajar format-rp" placeholder="0" style="min-width:100px; margin:0; text-align:right;" oninput="kalkulasiBarisHonor(this)" /></td>
        <td><input type="text" class="form-input honor-walikelas format-rp" placeholder="0" style="min-width:90px; margin:0; text-align:right;" oninput="kalkulasiBarisHonor(this)" value="${honorConfig.waliKelas ? formatRupiahInput(honorConfig.waliKelas.toString()) : ''}" /></td>
        <td><input type="text" class="form-input honor-tunjangan format-rp" placeholder="0" style="min-width:100px; margin:0; text-align:right;" oninput="kalkulasiBarisHonor(this)" /></td>
        <td><input type="text" class="form-input honor-total" placeholder="0" style="min-width:110px; margin:0; background:#f1f5f9; text-align:right;" readonly /></td>
        <td style="text-align:center;">
            <button class="btn btn-danger" style="padding:0.4rem;" onclick="hapusBarisHonor(this)"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
    if (window.lucide) window.lucide.createIcons();
    updateNomorBarisHonor();

    // Auto trigger calc on new row to apply the default walikelas to the total
    kalkulasiBarisHonor(tr.querySelector('.honor-walikelas'));
}

function hapusBarisHonor(btn) {
    btn.closest('tr').remove();
    updateNomorBarisHonor();
}

function updateNomorBarisHonor() {
    let tbody = document.getElementById('tbodyFormHonor');
    let rows = tbody.querySelectorAll('tr');
    rows.forEach((row, i) => {
        row.querySelector('.row-no').innerText = i + 1;
    });
}

function kalkulasiJamHonor(jamInput) {
    let jam = parseFloat(jamInput.value) || 0;
    let mengajarInput = jamInput.closest('tr').querySelector('.honor-mengajar');
    let calculated = jam * honorConfig.perJam;
    mengajarInput.value = formatRupiahInput(calculated.toString());
    kalkulasiBarisHonor(mengajarInput);
}

function kalkulasiBarisHonor(inputEl) {
    if (inputEl.classList.contains('format-rp')) {
        let val = inputEl.value;
        inputEl.value = formatRupiahInput(val);
    }

    let tr = inputEl.closest('tr');
    let mengajar = parseInt(tr.querySelector('.honor-mengajar').value.replace(/\./g, '')) || 0;
    let walikelas = parseInt(tr.querySelector('.honor-walikelas').value.replace(/\./g, '')) || 0;
    let tunjangan = parseInt(tr.querySelector('.honor-tunjangan').value.replace(/\./g, '')) || 0;

    let total = mengajar + walikelas + tunjangan;
    tr.querySelector('.honor-total').value = formatRupiahInput(total.toString());
}

function cetakTandaTerimaHonor() {
    let rawDate = document.getElementById('tandaTerimaTanggal').value;
    if (!rawDate) rawDate = new Date().toISOString().split('T')[0];

    let bulanTahun = formatBulanTahunIndo(rawDate);
    let tanggalCetak = "Babakan, " + formatTanggalIndo(rawDate);

    let rows = document.getElementById('tbodyFormHonor').querySelectorAll('tr');
    if (rows.length === 0) return alert("Belum ada data untuk dicetak!");

    let tbodyHTML = "";
    let grandTotal = 0;

    rows.forEach((row, i) => {
        let nama = row.querySelector('.honor-nama').value || "";
        let jabatan = row.querySelector('.honor-jabatan').value || "";
        let mapel = row.querySelector('.honor-mapel').value || "";
        let jam = row.querySelector('.honor-jam').value || "";
        let mengajar = row.querySelector('.honor-mengajar').value || "";
        let walikelas = row.querySelector('.honor-walikelas').value || "";
        let tunjangan = row.querySelector('.honor-tunjangan').value || "";
        let total = row.querySelector('.honor-total').value || "";

        let ttd1 = (i + 1) % 2 !== 0 ? (i + 1) + "." : "";
        let ttd2 = (i + 1) % 2 === 0 ? (i + 1) + "." : "";

        grandTotal += parseInt(total.replace(/\./g, '')) || 0;

        tbodyHTML += `
            <tr>
                <td class="center">${i + 1}</td>
                <td>${nama}</td>
                <td>${jabatan}</td>
                <td>${mapel}</td>
                <td class="center">${jam}</td>
                <td class="right">${mengajar}</td>
                <td class="right">${walikelas}</td>
                <td class="right">${tunjangan}</td>
                <td class="right bold">${total}</td>
                <td class="ttd-col">
                    <div style="display:flex;">
                        <div style="flex:1;">${ttd1}</div>
                        <div style="flex:1;">${ttd2}</div>
                    </div>
                </td>
            </tr>
        `;
    });

    tbodyHTML += `
        <tr class="total-row">
            <td colspan="8" class="center bold">Jumlah Total</td>
            <td class="right bold">${formatRupiahInput(grandTotal.toString())}</td>
            <td></td>
        </tr>
    `;

    let namaKepsek = document.getElementById('inputNamaKepsek')?.value || "MUJAMIL AKSO, S.Ag";
    let namaBendahara = document.getElementById('inputNamaBendahara')?.value || "TATIH TIHLAH";
    let nipKepsek = document.getElementById('inputNIPKepsek')?.value || "";

    let kopSuratHTML = `
        <div style="text-align:center; margin-bottom:-30px; position:relative; z-index:1;">
            <img src="img/kop-surat.png" onerror="this.src='img/kop-surat.jpg'" alt="Kop Surat" style="width:100%; height:auto; max-height:220px; object-fit:contain;" />
        </div>
    `;

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Tanda Terima Honor</title>
            <style>
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    body { -webkit-print-color-adjust: exact; margin:0; }
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                }
                .print-container {
                    width: 100%;
                    max-width: 27.7cm; /* Lebar A4 landscape dikurangi margin */
                    margin: 0 auto;
                }
                .header-title {
                    text-align: center;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 10px;
                    margin-top: -15px;
                    line-height: 1.3;
                    position: relative;
                    z-index: 2;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 5px;
                    vertical-align: middle;
                }
                th {
                    text-align: center;
                    font-weight: bold;
                    background-color: #f9f9f9;
                }
                .center { text-align: center; }
                .right { text-align: right; }
                .bold { font-weight: bold; }
                
                .ttd-col {
                    width: 120px;
                    vertical-align: top;
                }

                .signatures {
                    width: 100%;
                    margin-top: 20px;
                    display: table;
                }
                .signatures > div {
                    display: table-cell;
                    width: 50%;
                }
                .sig-left { text-align: left; padding-left: 20px;}
                .sig-right { text-align: left; padding-left: 20%;}
                
                .sig-name {
                    font-weight: bold;
                    text-decoration: underline;
                    margin-top: 60px;
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                ${kopSuratHTML}
                <div class="header-title">
                    REKAP HONOR GURU DAN STAFF TATA USAHA<br>
                    BULAN ${bulanTahun}<br>
                    SMP ISLAM TERPADU AL-FATHONAH BABAKAN
                </div>

                <table>
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:30px;">NO</th>
                            <th rowspan="2" style="width:150px;">NAMA</th>
                            <th rowspan="2" style="width:130px;">JABATAN</th>
                            <th rowspan="2" style="width:130px;">GURU BIDANG STUDY</th>
                            <th colspan="5">KETERANGAN</th>
                            <th rowspan="2" style="width:120px;">TANDA TANGAN</th>
                        </tr>
                        <tr>
                            <th style="width:60px;">JUMLAH<br>JAM</th>
                            <th style="width:80px;">HONOR<br>MENGAJAR</th>
                            <th style="width:80px;">WALI<br>KELAS</th>
                            <th style="width:80px;">TUNJANGAN<br>JABATAN</th>
                            <th style="width:80px;">JUMLAH</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tbodyHTML}
                    </tbody>
                </table>

                <div class="signatures">
                    <div class="sig-left">
                        Mengetahui,<br>
                        Kepala Sekolah SMP IT AL-FATHONAH BABAKAN<br>
                        <div class="sig-name">${namaKepsek}</div>
                        ${nipKepsek ? "NIP. " + nipKepsek : ""}
                    </div>
                    <div class="sig-right">
                        ${tanggalCetak}<br>
                        Bendahara<br>
                        SMP IT AL-FATHONAH BABAKAN<br>
                        <div class="sig-name">${namaBendahara}</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    let printWindow = window.open('', '_blank', 'width=1000,height=700');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// ================= UNIVERSAL =================
function tambahBarisUniversal() {
    let tbody = document.getElementById('tbodyFormUniversal');
    let tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align:center;" class="row-no">1</td>
        <td><input type="text" list="listGuru" class="form-input univ-nama" placeholder="Nama Lengkap" style="min-width:140px; margin:0;" autocomplete="off" /></td>
        <td><input type="text" class="form-input univ-keterangan" placeholder="Keterangan Tanda Terima" style="min-width:200px; margin:0;" /></td>
        <td><input type="text" class="form-input univ-jumlah format-rp" placeholder="0" style="min-width:120px; margin:0; text-align:right;" oninput="this.value=formatRupiahInput(this.value)" /></td>
        <td style="text-align:center;">
            <button class="btn btn-danger" style="padding:0.4rem;" onclick="hapusBarisUniversal(this)"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
    if (window.lucide) window.lucide.createIcons();
    updateNomorBarisUniversal();
}

function hapusBarisUniversal(btn) {
    btn.closest('tr').remove();
    updateNomorBarisUniversal();
}

function updateNomorBarisUniversal() {
    let tbody = document.getElementById('tbodyFormUniversal');
    let rows = tbody.querySelectorAll('tr');
    rows.forEach((row, i) => {
        row.querySelector('.row-no').innerText = i + 1;
    });
}

function cetakTandaTerimaUniversal() {
    let rawDate = document.getElementById('universalTanggalCetak').value;
    if (!rawDate) rawDate = new Date().toISOString().split('T')[0];

    let judul = document.getElementById('universalJudul').value || "TANDA TERIMA UNIVERSAL";
    let tanggalCetak = "Babakan, " + formatTanggalIndo(rawDate);

    let rows = document.getElementById('tbodyFormUniversal').querySelectorAll('tr');
    if (rows.length === 0) return alert("Belum ada data untuk dicetak!");

    let tbodyHTML = "";
    let grandTotal = 0;

    rows.forEach((row, i) => {
        let nama = row.querySelector('.univ-nama').value || "";
        let keterangan = row.querySelector('.univ-keterangan').value || "";
        let jumlah = row.querySelector('.univ-jumlah').value || "";

        grandTotal += parseInt(jumlah.replace(/\./g, '')) || 0;

        let ttd1 = (i + 1) % 2 !== 0 ? (i + 1) + "." : "";
        let ttd2 = (i + 1) % 2 === 0 ? (i + 1) + "." : "";

        tbodyHTML += `
            <tr>
                <td class="center">${i + 1}</td>
                <td>${nama}</td>
                <td>${keterangan}</td>
                <td class="right">${jumlah}</td>
                <td class="ttd-col">
                    <div style="display:flex;">
                        <div style="flex:1;">${ttd1}</div>
                        <div style="flex:1;">${ttd2}</div>
                    </div>
                </td>
            </tr>
        `;
    });

    tbodyHTML += `
        <tr class="total-row">
            <td colspan="3" class="center bold">Jumlah Total</td>
            <td class="right bold">${formatRupiahInput(grandTotal.toString())}</td>
            <td></td>
        </tr>
    `;

    let namaKepsek = document.getElementById('inputNamaKepsek')?.value || "MUJAMIL AKSO, S.Ag";
    let namaBendahara = document.getElementById('inputNamaBendahara')?.value || "TATIH TIHLAH";
    let nipKepsek = document.getElementById('inputNIPKepsek')?.value || "";

    let kopSuratHTML = `
        <div style="text-align:center; margin-bottom:-30px; position:relative; z-index:1;">
            <img src="img/kop-surat.png" onerror="this.src='img/kop-surat.jpg'" alt="Kop Surat" style="width:100%; height:auto; max-height:220px; object-fit:contain;" />
        </div>
    `;

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Tanda Terima Universal</title>
            <style>
                @media print {
                    @page { size: portrait; margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; margin:0; }
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                }
                .print-container {
                    width: 100%;
                }
                .header-title {
                    text-align: center;
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 10px;
                    margin-top: 15px;
                    line-height: 1.3;
                    text-decoration: underline;
                    position: relative;
                    z-index: 2;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 6px;
                    vertical-align: middle;
                }
                th {
                    text-align: center;
                    font-weight: bold;
                    background-color: #f9f9f9;
                }
                .center { text-align: center; }
                .right { text-align: right; }
                .bold { font-weight: bold; }
                
                .ttd-col {
                    width: 120px;
                    vertical-align: top;
                }

                .signatures {
                    width: 100%;
                    margin-top: 40px;
                    display: table;
                }
                .signatures > div {
                    display: table-cell;
                    width: 50%;
                }
                .sig-left { text-align: left; padding-left: 20px;}
                .sig-right { text-align: left; padding-left: 20%;}
                
                .sig-name {
                    font-weight: bold;
                    text-decoration: underline;
                    margin-top: 70px;
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                ${kopSuratHTML}
                <div class="header-title">
                    ${judul}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:40px;">NO</th>
                            <th style="width:200px;">NAMA</th>
                            <th>KETERANGAN</th>
                            <th style="width:120px;">JUMLAH (Rp)</th>
                            <th style="width:120px;">TANDA TANGAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tbodyHTML}
                    </tbody>
                </table>

                <div class="signatures">
                    <div class="sig-left">
                        Mengetahui,<br>
                        Kepala Sekolah SMP IT AL-FATHONAH BABAKAN<br>
                        <div class="sig-name">${namaKepsek}</div>
                        ${nipKepsek ? "NIP. " + nipKepsek : ""}
                    </div>
                    <div class="sig-right">
                        ${tanggalCetak}<br>
                        Bendahara<br>
                        SMP IT AL-FATHONAH BABAKAN<br>
                        <div class="sig-name">${namaBendahara}</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    let printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}


// SIMPAN TABEL HONOR
function simpanTabelHonor() {
    try {
        let rows = document.getElementById('tbodyFormHonor').querySelectorAll('tr');
        let data = [];
        rows.forEach(row => {
            data.push({
                nama: row.querySelector('.honor-nama')?.value || '',
                jabatan: row.querySelector('.honor-jabatan')?.value || '',
                mapel: row.querySelector('.honor-mapel')?.value || '',
                jam: row.querySelector('.honor-jam')?.value || '',
                mengajar: row.querySelector('.honor-mengajar')?.value || '',
                walikelas: row.querySelector('.honor-walikelas')?.value || '',
                tunjangan: row.querySelector('.honor-tunjangan')?.value || '',
                total: row.querySelector('.honor-total')?.value || ''
            });
        });
        localStorage.setItem('draftHonorData', JSON.stringify({
            tanggal: document.getElementById('tandaTerimaTanggal')?.value || '',
            rows: data
        }));
        if (typeof showToast === 'function') {
            showToast('Draf tabel rekap honor berhasil disimpan!', 'success');
        } else if (typeof Swal !== 'undefined') {
            Swal.fire('Tersimpan', 'Draf tabel rekap honor berhasil disimpan ke perangkat.', 'success');
        } else {
            alert('Tersimpan! Draf tabel rekap honor berhasil disimpan ke perangkat.');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Gagal menyimpan data: ' + e.message, 'error');
        else alert('Gagal menyimpan data: ' + e.message);
        console.error(e);
    }
}

function muatTabelHonor() {
    let draft = localStorage.getItem('draftHonorData');
    if (!draft) return;
    try {
        let parsed = JSON.parse(draft);
        if (parsed.tanggal) document.getElementById('tandaTerimaTanggal').value = parsed.tanggal;
        if (parsed.rows && parsed.rows.length > 0) {
            document.getElementById('tbodyFormHonor').innerHTML = ''; // clear
            parsed.rows.forEach(r => {
                tambahBarisHonor();
                let trs = document.getElementById('tbodyFormHonor').querySelectorAll('tr');
                let lastTr = trs[trs.length - 1];
                lastTr.querySelector('.honor-nama').value = r.nama || '';
                lastTr.querySelector('.honor-jabatan').value = r.jabatan || '';
                lastTr.querySelector('.honor-mapel').value = r.mapel || '';
                lastTr.querySelector('.honor-jam').value = r.jam || '';
                lastTr.querySelector('.honor-mengajar').value = r.mengajar || '';
                lastTr.querySelector('.honor-walikelas').value = r.walikelas || '';
                lastTr.querySelector('.honor-tunjangan').value = r.tunjangan || '';
                lastTr.querySelector('.honor-total').value = r.total || '';
            });
        }
    } catch (e) { }
}



// SIMPAN TABEL UNIVERSAL
function simpanTabelUniversal() {
    try {
        let rows = document.getElementById('tbodyFormUniversal').querySelectorAll('tr');
        let data = [];
        rows.forEach(row => {
            data.push({
                nama: row.querySelector('.univ-nama')?.value || '',
                keterangan: row.querySelector('.univ-keterangan')?.value || '',
                jumlah: row.querySelector('.univ-jumlah')?.value || ''
            });
        });
        localStorage.setItem('draftUniversalData', JSON.stringify({
            judul: document.getElementById('universalJudul')?.value || '',
            tanggal: document.getElementById('universalTanggalCetak')?.value || '',
            rows: data
        }));
        if (typeof showToast === 'function') {
            showToast('Draf tanda terima universal berhasil disimpan!', 'success');
        } else if (typeof Swal !== 'undefined') {
            Swal.fire('Tersimpan', 'Draf tanda terima universal berhasil disimpan ke perangkat.', 'success');
        } else {
            alert('Tersimpan! Draf tanda terima universal berhasil disimpan ke perangkat.');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Gagal menyimpan data: ' + e.message, 'error');
        else alert('Gagal menyimpan data: ' + e.message);
        console.error(e);
    }
}

function muatTabelUniversal() {
    let draft = localStorage.getItem('draftUniversalData');
    if (!draft) return;
    try {
        let parsed = JSON.parse(draft);
        if (parsed.judul) document.getElementById('universalJudul').value = parsed.judul;
        if (parsed.tanggal) document.getElementById('universalTanggalCetak').value = parsed.tanggal;
        if (parsed.rows && parsed.rows.length > 0) {
            document.getElementById('tbodyFormUniversal').innerHTML = ''; // clear
            parsed.rows.forEach(r => {
                tambahBarisUniversal();
                let trs = document.getElementById('tbodyFormUniversal').querySelectorAll('tr');
                let lastTr = trs[trs.length - 1];
                if (lastTr) {
                    let inputNama = lastTr.querySelector('.univ-nama');
                    if (inputNama) inputNama.value = r.nama || '';
                    let inputKet = lastTr.querySelector('.univ-keterangan');
                    if (inputKet) inputKet.value = r.keterangan || '';
                    let inputJumlah = lastTr.querySelector('.univ-jumlah');
                    if (inputJumlah) inputJumlah.value = r.jumlah || '';
                }
            });
        }
    } catch (e) { }
}

// DRAGGABLE LOGIC FOR AI CHAT
function makeDraggable(el, headerEl) {
    if (!el || !headerEl) return;
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    headerEl.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target.closest('.ai-chat-close')) return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
        el.style.bottom = "auto";
        el.style.right = "auto";
        el.style.transform = "none";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
setTimeout(() => {
    makeDraggable(document.getElementById('aiChatModal'), document.querySelector('.ai-chat-header'));
}, 1000);// ============================================================