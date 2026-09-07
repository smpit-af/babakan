// === MANAJEMEN TAGIHAN (PENDAFTARAN & UNIVERSAL) ===
let activeDetailIdKat = null;
let activeDetailJenis = null;

function renderMasterTagihanTable(jenis) {
    let tbody = document.querySelector(`#masterTable${jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal'} tbody`);
    if (!tbody) return;

    let baseData = dKeuanganInsidental.filter(k => (k.jenis_tagihan || 'universal') === jenis && !k.is_archived);
    let filteredData = baseData;

    // Filter tags
    if (jenis === 'universal') {
        let search = (document.getElementById('searchTagihanMaster')?.value || '').toLowerCase();
        let filterBulan = document.getElementById('filterBulanTagihan')?.value || '';

        if (search) {
            filteredData = filteredData.filter(d =>
                d.nama.toLowerCase().includes(search) ||
                (d.kelas || '').toLowerCase().includes(search)
            );
        }
        if (filterBulan) {
            filteredData = filteredData.filter(d => d.tanggal && d.tanggal.startsWith(filterBulan));
        }

        // Summary Cards - sudah dipindahkan ke detail per tagihan,
        // sembunyikan di halaman utama agar tidak muncul saat refresh
        let summaryEl = document.getElementById('tagihanSummary');
        if (summaryEl) {
            summaryEl.innerHTML = '';
            summaryEl.style.display = 'none';
        }
    } else if (jenis === 'pendaftaran') {
        let summaryEl = document.getElementById('pendaftaranSummary');
        if (summaryEl) {
            let totalTerbayarSemua = 0;
            let totalTerbayarBulanIni = 0;
            let bulanIni = new Date().toISOString().slice(0, 7);

            let namaCounts = {};

            filteredData.forEach(k => {
                let kodeTagihan = 'pendaftaran_' + k.id;
                if (typeof dPembayaranSiswa !== 'undefined') {
                    let matchingPayments = dPembayaranSiswa.filter(p => p.jenis === kodeTagihan);
                    matchingPayments.forEach(p => {
                        if (p.riwayat) {
                            p.riwayat.forEach(r => {
                                let nom = parseInt(r.nominal) || 0;
                                totalTerbayarSemua += nom;
                                if (r.tanggal && r.tanggal.startsWith(bulanIni)) {
                                    totalTerbayarBulanIni += nom;
                                }
                                namaCounts[k.nama] = (namaCounts[k.nama] || 0) + nom;
                            });
                        }
                    });
                }
            });

            let topNama = Object.entries(namaCounts).sort((a, b) => b[1] - a[1])[0];

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
                    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Tagihan</div>
                    <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${filteredData.length}</div>
                </div>
                <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #8b5cf6;">
                    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Terbanyak</div>
                    <div style="font-size:1rem; font-weight:700; color:#8b5cf6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${topNama ? topNama[0] : '-'}">${topNama ? topNama[0] : '-'}</div>
                </div>
            `;
        }
    }

    tbody.innerHTML = '';
    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada riwayat tagihan ${jenis}.</td></tr>`;
        return;
    }

    filteredData.forEach((k, idx) => {
        // Parse rincian if available
        let rincianHtml = '';
        if (jenis === 'pendaftaran' && k.rincian) {
            try {
                let items = typeof k.rincian === 'string' ? JSON.parse(k.rincian) : k.rincian;
                if (items && items.length > 0) {
                    rincianHtml = '<div style="margin-top:4px; font-size:0.8rem; color:var(--text-light);">';
                    items.forEach((item, i) => {
                        rincianHtml += `${i + 1}. ${item.nama} (${formatRupiah(item.nominal)})<br>`;
                    });
                    rincianHtml += '</div>';
                }
            } catch (e) { }
        }

        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${k.nama}</strong>${rincianHtml}</td>
                <td>${k.kelas}</td>
                <td style="color:var(--danger); font-weight:600;">${formatRupiah(k.nominal)}</td>
                <td>${k.tanggal}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-sm btn-outline" style="color:#64748b; border-color:#cbd5e1;" onclick="arsipkanTagihan('${k.id}', '${jenis}')" title="Arsipkan"><i data-lucide="archive" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusTagihan('${k.id}', '${jenis}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-primary" onclick="bukaDetailTagihan('${k.id}', '${jenis}')">Detail</button>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function bukaDetailTagihan(idKat, jenis) {
    activeDetailIdKat = idKat;
    activeDetailJenis = jenis;

    let kat = dKeuanganInsidental.find(k => k.id == idKat);
    if (!kat) return;

    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    let containerMaster = document.getElementById(`masterTableContainer${suffix}`);
    let containerDetail = document.getElementById(`detailTableContainer${suffix}`);

    containerMaster.style.display = 'none';
    containerDetail.style.display = 'block';

    // Sembunyikan summary cards & filter di halaman utama saat detail terbuka
    if (jenis === 'universal') {
        let summaryEl = document.getElementById('tagihanSummary');
        if (summaryEl) summaryEl.style.display = 'none';
        let filterEl = containerMaster?.previousElementSibling;
    }

    document.getElementById(`lblDetailNama${suffix}`).innerText = kat.nama;
    document.getElementById(`lblDetailInfo${suffix}`).innerText = `Kelas: ${kat.kelas} | Nominal per siswa: Rp ${formatRupiah(kat.nominal)}`;

    // Render ringkasan saldo jika universal
    if (jenis === 'universal') {
        renderDetailSaldo(idKat);
        switchDetailUniversalTab('pemasukan');
    }

    renderDetailSiswaTable(jenis);
}

// Fungsi untuk menghitung dan menampilkan ringkasan saldo per tagihan
function renderDetailSaldo(idKat) {
    let saldoEl = document.getElementById('detailUniversalSaldo');
    if (!saldoEl) return;

    let kat = dKeuanganInsidental.find(k => k.id == idKat);
    if (!kat) return;

    // Hitung total pemasukan dari tagihan ini
    let kodeTagihan = 'insidental_' + idKat;
    let totalPemasukan = 0;
    let jumlahSiswaBayar = 0;
    let totalSiswa = getSiswaForKeuangan(kat.kelas).length;

    if (typeof dPembayaranSiswa !== 'undefined') {
        let matchingPayments = dPembayaranSiswa.filter(p => p.jenis === kodeTagihan);
        matchingPayments.forEach(p => {
            let totalSiswaIni = 0;
            if (p.riwayat) {
                p.riwayat.forEach(r => {
                    totalPemasukan += parseInt(r.nominal) || 0;
                });
                totalSiswaIni = p.riwayat.reduce((s, r) => s + (parseInt(r.nominal) || 0), 0);
            }
            if (totalSiswaIni > 0) jumlahSiswaBayar++;
        });
    }

    // Hitung total pengeluaran dari tagihan ini
    let totalPengeluaran = 0;
    let jumlahTransaksiKeluar = 0;
    if (typeof dKasKeluar !== 'undefined') {
        let pengeluaranTagihan = dKasKeluar.filter(x => x.id_tagihan === idKat);
        pengeluaranTagihan.forEach(x => {
            totalPengeluaran += parseInt(x.jumlah) || 0;
            jumlahTransaksiKeluar++;
        });
    }

    let sisa = totalPemasukan - totalPengeluaran;
    let sisaColor = sisa >= 0 ? '#10b981' : '#ef4444';

    saldoEl.innerHTML = `
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #10b981;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">💰 Total Terkumpul</div>
            <div style="font-size:1.3rem; font-weight:700; color:#10b981;">Rp ${formatRupiah(totalPemasukan)}</div>
            <div style="font-size:0.75rem; color:var(--text-light); margin-top:2px;">${jumlahSiswaBayar}/${totalSiswa} siswa</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #ef4444;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">💸 Total Digunakan</div>
            <div style="font-size:1.3rem; font-weight:700; color:#ef4444;">Rp ${formatRupiah(totalPengeluaran)}</div>
            <div style="font-size:0.75rem; color:var(--text-light); margin-top:2px;">${jumlahTransaksiKeluar} transaksi</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid ${sisaColor};">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">💳 Sisa Saldo</div>
            <div style="font-size:1.3rem; font-weight:700; color:${sisaColor};">Rp ${formatRupiah(sisa)}</div>
        </div>
    `;
}

// Fungsi perpindahan tab internal di Detail Tagihan (Pemasukan / Pengeluaran)
function switchDetailUniversalTab(tabName) {
    let tabPemasukan = document.getElementById('tabDetailPemasukan');
    let tabPengeluaran = document.getElementById('tabDetailPengeluaran');
    let btnPemasukan = document.getElementById('tabBtnDetailPemasukan');
    let btnPengeluaran = document.getElementById('tabBtnDetailPengeluaran');

    if (tabName === 'pemasukan') {
        if (tabPemasukan) tabPemasukan.style.display = '';
        if (tabPengeluaran) tabPengeluaran.style.display = 'none';
        if (btnPemasukan) { btnPemasukan.style.background = '#10b981'; btnPemasukan.style.color = 'white'; }
        if (btnPengeluaran) { btnPengeluaran.style.background = 'transparent'; btnPengeluaran.style.color = 'var(--text-light)'; }
    } else {
        if (tabPemasukan) tabPemasukan.style.display = 'none';
        if (tabPengeluaran) tabPengeluaran.style.display = '';
        if (btnPemasukan) { btnPemasukan.style.background = 'transparent'; btnPemasukan.style.color = 'var(--text-light)'; }
        if (btnPengeluaran) { btnPengeluaran.style.background = '#ef4444'; btnPengeluaran.style.color = 'white'; }

        // Muat data kas keluar & reset kategori
        fetchKasKeluar().then(() => {
            let select = document.getElementById('selectUnivKategoriPengeluaran');
            if (select && select.value) {
                switchUnivKategoriPengeluaran(select.value);
            } else {
                let container = document.getElementById('univKategoriContentContainer');
                if (container) container.style.display = 'none';
                let ph = document.getElementById('univKategoriPlaceholder');
                if (ph) ph.style.display = 'block';
            }
        });
    }
    if (window.lucide) lucide.createIcons();
}

function tutupDetailTagihan(jenis) {
    activeDetailIdKat = null;
    activeDetailJenis = null;

    let containerMaster = document.getElementById(`masterTableContainer${jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal'}`);
    let containerDetail = document.getElementById(`detailTableContainer${jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal'}`);

    containerMaster.style.display = 'block';
    containerDetail.style.display = 'none';
}

function renderDetailSiswaTable(jenis) {
    if (!activeDetailIdKat) return;

    let tbody = document.querySelector(`#tableDetailSiswa${jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal'} tbody`);
    if (!tbody) return;
    let search = document.getElementById(`searchDetail${jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal'}`).value.toLowerCase();

    let kat = dKeuanganInsidental.find(k => k.id == activeDetailIdKat);
    if (!kat) return;

    let listSiswa = getSiswaForKeuangan(kat.kelas);
    if (search) listSiswa = listSiswa.filter(s => s.namaLengkap.toLowerCase().includes(search));

    let prefix = jenis === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    let kodeTagihan = prefix + kat.id;

    tbody.innerHTML = '';
    if (listSiswa.length === 0) {
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

window.onTagihanKategoriChange = function (val) {
    document.getElementById('formInsidentalJenis').value = val;
    let inputNama = document.getElementById('formInsidentalNama');
    let title = document.getElementById('keuanganInsidentalTitle');
    let desc = document.getElementById('keuanganInsidentalDesc');

    if (val === 'pendaftaran') {
        inputNama.placeholder = 'Contoh: Pendaftaran Angkatan 2024/2025, Uang Pangkal, dll';
        title.innerText = 'Buat Tagihan Pendaftaran';
        desc.innerText = 'Tentukan rincian biaya pendaftaran untuk siswa baru.';
        document.getElementById('formGroupUniversal').style.display = 'none';
        document.getElementById('formGroupPendaftaran').style.display = 'block';
        document.getElementById('footerUniversal').style.display = 'none';
        document.getElementById('footerPendaftaran').style.display = 'flex';

        // Reset Rincian
        document.getElementById('formPendaftaranNama').value = '';
        document.getElementById('formPendaftaranTanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('pendaftaranRincianContainer').innerHTML = '';
        addPendaftaranRincianItem();
        updatePendaftaranRincianTotal();

        // Populate kelas target
        let selKelas = document.getElementById('formPendaftaranKelas');
        if (selKelas) {
            selKelas.innerHTML = '<option value="Semua Kelas">Semua Kelas</option>';
            if (typeof masterKelasList !== 'undefined') {
                masterKelasList.forEach(k => {
                    selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
                });
            }
        }

        // Load Year
        if (typeof loadActiveYear === 'function') loadActiveYear().then(() => {
            let lblYear = document.getElementById('lblActiveYear');
            document.getElementById('formPendaftaranTahun').value = (lblYear && lblYear.textContent && lblYear.textContent !== 'Memuat...') ? lblYear.textContent : '-';
        });

    } else {
        inputNama.placeholder = 'Contoh: Kegiatan Renang, Study Tour, ANBK';
        title.innerText = 'Buat Transaksi Universal';
        desc.innerText = 'Pilih kategori tagihan, tentukan detail, dan simpan.';
        document.getElementById('formGroupUniversal').style.display = 'block';
        document.getElementById('formGroupPendaftaran').style.display = 'none';
        document.getElementById('footerUniversal').style.display = 'flex';
        document.getElementById('footerPendaftaran').style.display = 'none';
    }
};

function openTambahTransaksiModal(jenis) {
    if (jenis === 'pendaftaran') {
        let sel = document.getElementById('formTagihanKategori');
        if (sel) sel.value = 'pendaftaran';
        onTagihanKategoriChange('pendaftaran');
        document.getElementById('keuanganInsidentalModal').classList.add('active');
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Universal flow
    let sel = document.getElementById('formTagihanKategori');
    if (sel) sel.value = 'universal';
    onTagihanKategoriChange('universal');

    document.getElementById('formInsidentalNama').value = '';
    document.getElementById('formInsidentalNominal').value = '';
    document.getElementById('formInsidentalTanggal').value = new Date().toISOString().split('T')[0];
    let selKelas = document.getElementById('formInsidentalKelas');
    selKelas.innerHTML = '<option value="Semua Kelas">Semua Kelas</option>';
    if (typeof masterKelasList !== 'undefined') {
        masterKelasList.forEach(k => {
            selKelas.innerHTML += `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`;
        });
    }

    document.getElementById('keuanganInsidentalModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

// === PENDAFTARAN TAGIHAN MODAL (DENGAN RINCIAN) ===
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
        <button class="btn btn-danger btn-sm" style="width:100%; display:inline-flex; justify-content:center; align-items:center; gap:5px; padding:0.5rem;" onclick="this.parentElement.remove(); updatePendaftaranRincianTotal();">
            <i data-lucide="trash" style="width:16px;"></i> Hapus Item
        </button>
    `;
    c.appendChild(div);
    if (window.lucide) lucide.createIcons();
}

function updatePendaftaranRincianTotal() {
    let tot = 0;
    document.querySelectorAll('.pd-rincian-nom').forEach(inp => {
        tot += parseInt(inp.value) || 0;
    });
    document.getElementById('formPendaftaranTotalText').innerText = 'Rp ' + formatRupiah(tot);
}

async function savePendaftaranTagihan() {
    let nama = document.getElementById('formPendaftaranNama').value.trim();
    let kelas = document.getElementById('formPendaftaranKelas').value;
    let tgl = document.getElementById('formPendaftaranTanggal').value;
    let tahun = document.getElementById('formPendaftaranTahun').value;

    if (!nama || !tgl) return showToast('Harap lengkapi nama tagihan dan tanggal!', 'error');

    // Kumpulkan rincian biaya
    let rincian = [];
    let totalNominal = 0;
    let rows = document.querySelectorAll('#pendaftaranRincianContainer > div');
    rows.forEach(row => {
        let nmItem = row.querySelector('.pd-rincian-nama').value.trim();
        let nomItem = parseInt(row.querySelector('.pd-rincian-nom').value) || 0;
        if (nmItem && nomItem > 0) {
            rincian.push({ nama: nmItem, nominal: nomItem });
            totalNominal += nomItem;
        }
    });

    if (rincian.length === 0 || totalNominal <= 0) return showToast('Tambahkan minimal 1 item rincian biaya!', 'error');

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
        if (error) throw error;

        if (data && data.length > 0) dKeuanganInsidental.push(data[0]);

        closePendaftaranTagihanModal();
        showToast('Tagihan pendaftaran berhasil dibuat!', 'success');
        renderMasterTagihanTable('pendaftaran');
    } catch (e) {
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

    if (!nama || !nom || !tgl) return showToast('Harap lengkapi semua data wajib!', 'error');

    let obj = {
        nama: nama,
        kelas: kelas,
        nominal: parseInt(nom),
        tanggal: tgl,
        jenis_tagihan: jenis
    };

    try {
        const { data, error } = await supabaseClient.from('keuangan_kategori').insert([obj]).select();
        if (error) throw error;

        if (data && data.length > 0) dKeuanganInsidental.push(data[0]);

        closeKeuanganInsidentalModal();
        showToast('Tagihan berhasil dibuat!', 'success');
        renderMasterTagihanTable(jenis);
    } catch (e) {
        showToast('Gagal membuat tagihan: ' + e.message, 'error');
    }
}

function hapusTagihan(idKat, jenisTable) {
    let kat = dKeuanganInsidental.find(k => k.id == idKat);
    if (!kat) return;

    showCustomConfirm('Hapus Tagihan?', 'Anda yakin ingin menghapus permanen tagihan <strong>' + kat.nama + '</strong>? Seluruh riwayat pembayaran siswa terkait tagihan ini akan terhapus!', 'Ya, Hapus', async function () {
        try {
            let prefix = jenisTable === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
            let kodeTagihan = prefix + idKat;

            await supabaseClient.from('keuangan_pembayaran').delete().eq('jenis', kodeTagihan);
            const { error } = await supabaseClient.from('keuangan_kategori').delete().eq('id', idKat);
            if (error) throw error;

            dKeuanganInsidental = dKeuanganInsidental.filter(k => k.id != idKat);
            dPembayaranSiswa = dPembayaranSiswa.filter(p => p.jenis != kodeTagihan);

            showToast('Tagihan berhasil dihapus!', 'success');
            renderMasterTagihanTable(jenisTable);

            // If the deleted one was open in details, close it
            if (activeDetailIdKat == idKat) tutupDetailTagihan(jenisTable);
        } catch (e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}

// === CETAK LAPORAN TAGIHAN (F4 KOP SURAT) ===
function printLaporanTagihan(jenis) {
    if (!activeDetailIdKat || activeDetailJenis !== jenis) {
        return showToast('Silakan buka detail tagihan terlebih dahulu sebelum mencetak laporan.', 'warning');
    }

    let kat = dKeuanganInsidental.find(k => k.id == activeDetailIdKat);
    if (!kat) return;

    let prefix = jenis === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    let kodeTagihan = prefix + kat.id;
    let listSiswa = getSiswaForKeuangan(kat.kelas);
    let search = document.getElementById(`searchDetail${jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal'}`).value.toLowerCase();
    if (search) listSiswa = listSiswa.filter(s => s.namaLengkap.toLowerCase().includes(search));

    let today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
    if (jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
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

    document.getElementById('pembayaranTotalTagihan').innerText = 'Rp ' + formatRupiah(tagihan);
    document.getElementById('pembayaranTerbayar').innerText = 'Rp ' + formatRupiah(terbayar);
    document.getElementById('pembayaranSisaTagihan').innerText = 'Rp ' + formatRupiah(Math.max(0, sisa));

    let container = document.getElementById('riwayatPembayaranContainer');
    let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);

    if (!rec || rec.riwayat.length === 0) {
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
        if (window.lucide) lucide.createIcons();
    }

    // UPDATE UI SECARA LIVE UNTUK SUMMARY & SALDO
    if (jenis.startsWith('insidental_')) {
        renderMasterTagihanTable('universal');
        if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) renderDetailSaldo(activeDetailIdKat);
    } else if (jenis.startsWith('pendaftaran_')) {
        renderMasterTagihanTable('pendaftaran');
    }
}
async function submitPembayaran() {
    let idSiswa = document.getElementById('formPembayaranIdSiswa').value;
    let jenis = document.getElementById('formPembayaranIdTransaksi').value;
    let tgl = document.getElementById('formPembayaranTanggal').value;
    let nom = parseInt(document.getElementById('formPembayaranNominal').value);

    if (!nom || nom <= 0) return showToast('Nominal tidak valid', 'error');

    try {
        let obj = {
            id_siswa: idSiswa,
            jenis: jenis,
            nominal: nom,
            tanggal: tgl,
            keterangan: ''
        };
        const { data, error } = await supabaseClient.from('keuangan_pembayaran').insert([obj]).select();
        if (error) throw error;

        let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
        if (!rec) {
            rec = { idSiswa: idSiswa, jenis: jenis, riwayat: [] };
            dPembayaranSiswa.push(rec);
        }

        if (data && data.length > 0) {
            rec.riwayat.push({ id_pembayaran: data[0].id, tanggal: tgl, nominal: nom, ket: '' });
        } else {
            rec.riwayat.push({ tanggal: tgl, nominal: nom, ket: '' });
        }

        showToast('Pembayaran berhasil dicatat!', 'success');
        refreshStatusPembayaran(idSiswa, jenis);

        // Refresh the table in the background so columns reflect the change
        if (jenis.startsWith('insidental_')) {
            renderDetailSiswaTable('universal');
        } else if (jenis.startsWith('pendaftaran_')) {
            renderDetailSiswaTable('pendaftaran');
        }
    } catch (e) {
        showToast('Gagal mencatat pembayaran: ' + e.message, 'error');
    }

    document.getElementById('formPembayaranNominal').value = '';
    document.getElementById('formPembayaranKeterangan').value = '';

    if (jenis.startsWith('pendaftaran_')) renderDetailSiswaTable('pendaftaran');
    else if (jenis.startsWith('insidental_')) renderDetailSiswaTable('universal');
}

function editPembayaran(idPembayaran, idSiswa, jenis) {
    let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
    if (!rec) return;
    let r = rec.riwayat.find(x => x.id_pembayaran == idPembayaran);
    if (!r) return;

    let el = document.getElementById('riwayat-' + idPembayaran);
    if (!el) return;

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
    if (window.lucide) lucide.createIcons();
    document.getElementById('editNominal-' + idPembayaran).focus();
}

function hapusPembayaran(idPembayaran, idSiswa, jenis) {
    showCustomConfirm(
        'Hapus Pembayaran?',
        'Data pembayaran ini akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.',
        'Ya, Hapus',
        async function () {
            try {
                const { error } = await supabaseClient.from('keuangan_pembayaran')
                    .delete().eq('id', idPembayaran);
                if (error) throw error;

                let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
                if (rec) {
                    rec.riwayat = rec.riwayat.filter(x => x.id_pembayaran != idPembayaran);
                }

                showToast('Pembayaran berhasil dihapus!', 'success');
                refreshStatusPembayaran(idSiswa, jenis);

                if (jenis.startsWith('insidental_')) renderDetailSiswaTable('universal');
                else if (jenis.startsWith('pendaftaran_')) renderDetailSiswaTable('pendaftaran');
            } catch (e) {
                showToast('Gagal menghapus: ' + e.message, 'error');
            }
        }
    );
}

async function updatePembayaran(idPembayaran, idSiswa, jenis) {
    let newNom = parseInt(document.getElementById('editNominal-' + idPembayaran).value);
    if (!newNom || newNom <= 0) return showToast('Nominal tidak valid!', 'error');

    try {
        const { error } = await supabaseClient.from('keuangan_pembayaran')
            .update({ nominal: newNom })
            .eq('id', idPembayaran);
        if (error) throw error;

        // Update in-memory
        let rec = dPembayaranSiswa.find(p => p.idSiswa == idSiswa && p.jenis == jenis);
        if (rec) {
            let r = rec.riwayat.find(x => x.id_pembayaran == idPembayaran);
            if (r) r.nominal = newNom;
        }

        showToast('Nominal berhasil diperbarui!', 'success');
        refreshStatusPembayaran(idSiswa, jenis);

        // Refresh detail table
        if (jenis.startsWith('insidental_')) renderDetailSiswaTable('universal');
        else if (jenis.startsWith('pendaftaran_')) renderDetailSiswaTable('pendaftaran');
    } catch (e) {
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
    } catch (e) { return { namaBendahara: '', ttdBase64: '' }; }
}

function openPengaturanKwitansi() {
    if (typeof openPengaturanBendaharaModal === 'function') {
        openPengaturanBendaharaModal();
    }
}

// Removed duplicate functions for Pengaturan Bendahara

// -- Fungsi Terbilang (Angka ke Kata) --
function terbilang(angka) {
    let bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    angka = parseInt(angka);
    if (angka < 0) return 'Minus ' + terbilang(Math.abs(angka));
    if (angka < 12) return bilangan[angka];
    else if (angka < 20) return terbilang(angka - 10) + ' Belas';
    else if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
    else if (angka < 200) return 'Seratus ' + terbilang(angka - 100);
    else if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
    else if (angka < 2000) return 'Seribu ' + terbilang(angka - 1000);
    else if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
    else if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
    else if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
    return angka.toString();
}

// -- Generate HTML Kwitansi Profesional (4 per A4 page) --
function generateKwitansiHTML(dataSiswa, isMassal = false, startIndex = 0) {
    let today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    let logoUrl = window.location.href.includes('dashboard.html') ?
        window.location.href.split('dashboard.html')[0] + 'img/logo.png' : 'img/logo.png';

    let settings = getKwitansiSettings();
    let namaBendahara = settings.namaBendahara || '_______________________';
    let ttdBase64 = settings.ttdBase64 || '';

    let ttdHtml = ttdBase64
        ? `<img src="${ttdBase64}" style="height:8mm; max-width:40mm; object-fit:contain; display:block; margin:2mm auto 1mm auto;" />`
        : `<div style="height:8mm;"></div>`;

    let cards = '';
    dataSiswa.forEach((d, idx) => {
        let realIdx = startIndex + idx;
        let noKwitansi = 'KW-' + new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(realIdx + 1).padStart(4, '0');
        let statusText = d.sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';
        let statusColor = d.sisa <= 0 ? '#059669' : '#dc2626';

        let containerStyle = isMassal
            ? "flex:1; width:100%; box-sizing:border-box; border:1.5px solid #1e293b; padding:0; display:flex; flex-direction:column; justify-content:center; page-break-inside:avoid; font-family:'Times New Roman', Times, serif; font-size:8.5pt; color:#000; background:#fff; overflow:hidden;"
            : "width:100%; box-sizing:border-box; border:1.5px solid #1e293b; padding:0; margin-bottom:1.5mm; font-family:'Times New Roman', Times, serif; font-size:8.5pt; color:#000; background:#fff;";

        cards += `
            <div style="${containerStyle}">
                <!-- KOP SURAT -->
                <div style="display:flex; align-items:center; padding:1.5mm 5mm; border-bottom:2px double #1e293b;">
                    <img src="${logoUrl}" onerror="this.style.display='none'" style="width:42px; height:42px; object-fit:contain; margin-right:10px; flex-shrink:0;" />
                    <div style="flex:1; text-align:center; line-height:1.2;">
                        <div style="font-size:7pt; font-weight:bold; letter-spacing:0.3px;">YAYASAN PONDOK PESANTREN AL-FATHONAH</div>
                        <div style="font-size:11pt; font-weight:bold; letter-spacing:0.8px; margin:0;">SMP IT AL-FATHONAH BABAKAN</div>
                        <div style="font-size:6pt;">Jl. H. Mastra (Ponpes Al-Fathonah) No. 04 Desa Kudukeras Kec. Babakan Kab. Cirebon 45191</div>
                        <div style="font-size:6pt;">Tlp./Fax. (0231) 641960 &nbsp;|&nbsp; Hp. 085 323 056 221</div>
                    </div>
                </div>
                
                <!-- JUDUL KWITANSI -->
                <div style="text-align:center; padding:1mm 0 0.5mm 0;">
                    <div style="font-size:10pt; font-weight:bold; letter-spacing:1px; text-decoration:underline;">KWITANSI PEMBAYARAN</div>
                    <div style="font-size:6pt; color:#475569; margin-top:1px;">No: ${noKwitansi}</div>
                </div>
                
                <!-- BODY DETAIL -->
                <div style="padding:1mm 6mm; flex:1;">
                    <table style="width:100%; border-collapse:collapse; font-size:9pt;">
                        <tr>
                            <td style="width:110px; padding:1.5px 0; vertical-align:top; font-weight:bold;">Telah Terima Dari</td>
                            <td style="width:12px; text-align:center; vertical-align:top;">:</td>
                            <td style="padding:1.5px 0; border-bottom:1px dotted #94a3b8; font-weight:600;">${d.nama}${d.kelas ? ' - Kelas ' + d.kelas : ''}</td>
                        </tr>
                        <tr>
                            <td style="padding:1.5px 0; vertical-align:top; font-weight:bold;">Uang Sejumlah</td>
                            <td style="text-align:center; vertical-align:top;">:</td>
                            <td style="padding:1.5px 0; border-bottom:1px dotted #94a3b8; font-style:italic; font-size:8pt;">### ${terbilang(d.terbayar).trim()} Rupiah ###</td>
                        </tr>
                        <tr>
                            <td style="padding:1.5px 0; vertical-align:top; font-weight:bold;">Untuk Pembayaran</td>
                            <td style="text-align:center; vertical-align:top;">:</td>
                            <td style="padding:1.5px 0; border-bottom:1px dotted #94a3b8;">${d.namaTagihan}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- FOOTER: NOMINAL + TTD -->
                <div style="display:flex; justify-content:space-between; align-items:flex-end; padding:1mm 6mm 1.5mm 6mm;">
                    <div>
                        <div style="border:1.5px solid #1e293b; padding:2mm 5mm; background:#f8fafc; text-align:center;">
                            <div style="font-size:7pt; color:#475569; margin-bottom:1px;">Jumlah yang Dibayar</div>
                            <div style="font-size:11.5pt; font-weight:bold; letter-spacing:0.5px;">${formatRupiah(d.terbayar)}</div>
                        </div>
                        <div style="margin-top:1.5mm; font-size:7pt;">
                            Sisa: <strong style="color:${statusColor};">${formatRupiah(Math.max(0, d.sisa))}</strong>
                            &nbsp;<span style="background:${statusColor}; color:white; padding:0.5px 4px; border-radius:2px; font-size:6pt; font-weight:bold;">${statusText}</span>
                        </div>
                    </div>
                    <div style="text-align:center; min-width:130px;">
                        <div style="font-size:8pt;">Babakan, ${today}</div>
                        <div style="font-size:8pt;">Bendahara Sekolah,</div>
                        ${ttdHtml}
                        <div style="font-size:8pt; font-weight:bold; text-decoration:underline;">${namaBendahara}</div>
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

    if (!idSiswa || !jenis) return showToast('Data siswa atau tagihan tidak ditemukan.', 'error');

    let s = getSiswaForKeuangan().find(x => x.id == idSiswa);
    let nama = s ? s.namaLengkap : 'Unknown';
    let kelas = s ? s.kelas : '-';

    let tagihan = hitungTotalTagihan(jenis);
    let terbayarTotal = hitungTotalTerbayar(idSiswa, jenis);
    let sisa = tagihan - terbayarTotal;

    if (terbayarTotal <= 0) return showToast('Belum ada pembayaran yang tercatat untuk siswa ini.', 'warning');

    // Cari nama tagihan
    let namaTagihan = jenis;
    if (jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
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
function openKwitansiMassal(jenisTab) {
    if (!activeDetailIdKat || activeDetailJenis !== jenisTab) {
        return showToast('Silakan buka detail tagihan terlebih dahulu.', 'warning');
    }

    let kat = dKeuanganInsidental.find(k => k.id == activeDetailIdKat);
    if (!kat) return;

    let prefix = jenisTab === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    pendingKwitansiJenis = prefix + kat.id;

    document.getElementById('kwitansiMassalSubtitle').innerText = 'Tagihan: ' + kat.nama + ' — Kelas: ' + kat.kelas;

    let listSiswa = getSiswaForKeuangan(kat.kelas);
    let container = document.getElementById('kwitansiMassalListContainer');

    if (listSiswa.length === 0) {
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
    if (window.lucide) lucide.createIcons();
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
    if (cbs.length === 0) return showToast('Pilih minimal satu siswa untuk dicetak kwitansinya.', 'warning');

    let ids = Array.from(cbs).map(cb => cb.value);
    let jenis = pendingKwitansiJenis;

    // Cari nama tagihan
    let namaTagihan = jenis;
    if (jenis.startsWith('insidental_') || jenis.startsWith('pendaftaran_')) {
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

        if (terbayarVal > 0) {
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

    if (dataKwitansi.length === 0) return showToast('Tidak ada siswa dengan pembayaran yang bisa dicetak.', 'warning');

    let printArea = document.getElementById('printAreaKwitansi');

    let html = '';
    for (let i = 0; i < dataKwitansi.length; i += 4) {
        let batch = dataKwitansi.slice(i, i + 4);
        html += '<div style="display:flex; flex-direction:column; height:99vh; page-break-after:always; gap:1.5mm; overflow:hidden; box-sizing:border-box;">';
        html += generateKwitansiHTML(batch, true, i);
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
    if (window.lucide) lucide.createIcons();
}

function closeSaldoAwalModal() {
    document.getElementById('saldoAwalModal').classList.remove('active');
}

function simpanSaldoAwal() {
    let nominal = parseInt(document.getElementById('inputSaldoAwal').value) || 0;
    let oldSaldo = parseInt(localStorage.getItem('kas_saldo_awal') || '0');

    if (nominal !== oldSaldo) {
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
    if (!tbody) return;

    // Ambil Saldo Awal
    let saldoAwal = parseInt(localStorage.getItem('kas_saldo_awal') || '0');

    // Gabungkan 3 sumber data + audit log: dPembayaranSiswa (Masuk), dKasKeluar (Keluar), dPengeluaranDinas (Keluar)
    let transaksiList = [];

    // 1. Pemasukan (Pembayaran Siswa)
    if (typeof dPembayaranSiswa !== 'undefined') {
        dPembayaranSiswa.forEach(rec => {
            let s = getSiswaForKeuangan().find(x => x.id === rec.idSiswa);
            let namaSiswa = s ? s.namaLengkap : 'Siswa Tidak Diketahui';

            let namaTagihan = rec.jenis || 'Tagihan';
            if (rec.jenis && (rec.jenis.startsWith('insidental_') || rec.jenis.startsWith('pendaftaran_'))) {
                let idKat = rec.jenis.split('_').slice(1).join('_');
                let cat = typeof dKeuanganInsidental !== 'undefined' ? dKeuanganInsidental.find(c => c.id === idKat) : null;
                if (cat) {
                    namaTagihan = cat.nama;
                } else {
                    namaTagihan = rec.jenis.startsWith('insidental_') ? 'Transaksi Universal' : 'Pendaftaran & Administrasi';
                }
            }

            if (rec.riwayat) {
                rec.riwayat.forEach(r => {
                    if (r.nominal > 0) {
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
    if (typeof dKasKeluar !== 'undefined') {
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
    if (typeof dPengeluaranDinas !== 'undefined') {
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
    if (tahunSelect) {
        let currentValue = tahunSelect.value;
        // Jika belum ada pilihan default sama sekali (pertama kali load), set ke tahun berjalan
        if (!tahunSelect.hasAttribute('data-initialized')) {
            currentValue = new Date().getFullYear().toString();
            tahunSelect.setAttribute('data-initialized', 'true');
        }

        let years = new Set();
        transaksiList.forEach(t => { if (t.tanggal && t.tanggal.length >= 4) years.add(t.tanggal.substring(0, 4)); });
        years.add(new Date().getFullYear().toString()); // Selalu sertakan tahun ini

        while (tahunSelect.options.length > 1) {
            tahunSelect.remove(1);
        }

        Array.from(years).sort((a, b) => b.localeCompare(a)).forEach(y => {
            if (y && !isNaN(y)) {
                let opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === currentValue) opt.selected = true;
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

    if (filterTanggal) {
        displayList = displayList.filter(t => t.tanggal && t.tanggal.startsWith(filterTanggal));
    }
    if (filterBulan) {
        displayList = displayList.filter(t => t.tanggal && t.tanggal.length >= 7 && t.tanggal.substring(5, 7) === filterBulan);
    }
    if (filterTahun) {
        displayList = displayList.filter(t => t.tanggal && t.tanggal.startsWith(filterTahun));
    }
    if (search) {
        displayList = displayList.filter(t =>
            t.keterangan.toLowerCase().includes(search) ||
            t.kategori.toLowerCase().includes(search)
        );
    }

    let isFiltered = filterTanggal || filterBulan || filterTahun || search;

    let filteredTotalMasuk = totalMasuk;
    let filteredTotalKeluar = totalKeluar;
    if (isFiltered) {
        filteredTotalMasuk = displayList.reduce((s, t) => s + t.masuk, 0);
        filteredTotalKeluar = displayList.reduce((s, t) => s + t.keluar, 0);
    }

    // Update Summary Cards
    let ksSaldoAwalTampil = document.getElementById('ksSaldoAwalTampil');
    let ksTotalMasuk = document.getElementById('ksTotalMasuk');
    let ksTotalKeluar = document.getElementById('ksTotalKeluar');
    let ksSaldoAkhir = document.getElementById('ksSaldoAkhir');

    if (ksSaldoAwalTampil) ksSaldoAwalTampil.innerText = 'Rp ' + formatRupiah(saldoAwal);
    if (ksTotalMasuk) ksTotalMasuk.innerText = 'Rp ' + formatRupiah(filteredTotalMasuk);
    if (ksTotalKeluar) ksTotalKeluar.innerText = 'Rp ' + formatRupiah(filteredTotalKeluar);
    if (ksSaldoAkhir) ksSaldoAkhir.innerText = 'Rp ' + formatRupiah(saldoBerjalan);

    // Tampilkan di tabel (Urutkan dari yang terbaru ke terlama untuk tampilan)
    displayList.sort((a, b) => b.timestamp - a.timestamp);

    tbody.innerHTML = '';

    if (displayList.length === 0 && !isFiltered) {
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
        if (t.isAudit) typeColor = '#f59e0b';
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

    if (!isFiltered) {
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
// MODUL BUKU KAS BENDAHARA (3 TABS: Global, Operasional, Internal)
// ==============================================================================
let activeBukuKasTab = 'kas_global';

function switchBukuKasTab(tab) {
    activeBukuKasTab = tab;

    // Toggle tab button active state
    document.querySelectorAll('#sectionBukuKasBendahara .account-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) btn.classList.add('active');
    });

    // Toggle tab content visibility
    let tabMap = {
        'kas_global': 'tabBukuKasGlobal',
        'kas_operasional': 'tabBukuKasOperasional',
        'kas_internal': 'tabBukuKasInternal'
    };
    Object.values(tabMap).forEach(id => {
        let el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    let activeDiv = document.getElementById(tabMap[tab]);
    if (activeDiv) activeDiv.style.display = 'block';

    // Render data for the active tab
    renderBukuKas();
    if (window.lucide) lucide.createIcons();
}

function loadBukuKas() {
    renderBukuKas();
}

function buildBukuKasTransaksiList(sourceFilter) {
    // sourceFilter: 'all' | 'operasional' | 'internal'
    let transaksiList = [];
    let saldoAwal = parseInt(localStorage.getItem('kas_saldo_awal') || '0');

    // 1 & 2. Transaksi Operasional (Pemasukan & Pengeluaran)
    if (sourceFilter === 'all' || sourceFilter === 'operasional') {
        if (typeof dOperasional !== 'undefined') {
            dOperasional.forEach(rec => {
                if (rec.jenis_transaksi === 'Pemasukan') {
                    transaksiList.push({
                        tanggal: rec.tanggal,
                        timestamp: new Date(rec.tanggal).getTime(),
                        sumber: 'Kas Operasional',
                        kategori: rec.kategori || 'Dana BOS',
                        keterangan: rec.keterangan || 'Pemasukan Operasional',
                        masuk: parseInt(rec.nominal) || 0,
                        keluar: 0
                    });
                } else if (rec.jenis_transaksi === 'Pengeluaran') {
                    transaksiList.push({
                        tanggal: rec.tanggal,
                        timestamp: new Date(rec.tanggal).getTime(),
                        sumber: 'Kas Operasional',
                        kategori: rec.kategori || 'Pengeluaran',
                        keterangan: rec.keterangan || '-',
                        masuk: 0,
                        keluar: parseInt(rec.nominal) || 0
                    });
                }
            });
        }
    }

    // 3. Pemasukan dari Siswa (Pembayaran tagihan/pendaftaran)
    if (sourceFilter === 'all' || sourceFilter === 'internal') {
        if (typeof dPembayaranSiswa !== 'undefined') {
            dPembayaranSiswa.forEach(rec => {
                let s = getSiswaForKeuangan().find(x => x.id === rec.idSiswa);
                let namaSiswa = s ? s.namaLengkap : 'Siswa';

                let namaTagihan = rec.jenis || 'Tagihan';
                if (rec.jenis && (rec.jenis.startsWith('insidental_') || rec.jenis.startsWith('pendaftaran_'))) {
                    let idKat = rec.jenis.split('_').slice(1).join('_');
                    let cat = typeof dKeuanganInsidental !== 'undefined' ? dKeuanganInsidental.find(c => c.id === idKat) : null;
                    if (cat) namaTagihan = cat.nama;
                    else namaTagihan = rec.jenis.startsWith('insidental_') ? 'Transaksi Universal' : 'Pendaftaran';
                }

                if (rec.riwayat) {
                    rec.riwayat.forEach(r => {
                        if (parseInt(r.nominal) > 0) {
                            transaksiList.push({
                                tanggal: r.tanggal,
                                timestamp: new Date(r.tanggal).getTime(),
                                sumber: 'Kas Internal',
                                kategori: 'Pembayaran Siswa',
                                keterangan: `${namaTagihan} - ${namaSiswa}`,
                                masuk: parseInt(r.nominal),
                                keluar: 0
                            });
                        }
                    });
                }
            });
        }
    }

    // 4. Pengeluaran Internal (Kas Keluar Universal)
    if (sourceFilter === 'all' || sourceFilter === 'internal') {
        if (typeof dKasKeluar !== 'undefined') {
            dKasKeluar.forEach(k => {
                transaksiList.push({
                    tanggal: k.tanggal,
                    timestamp: new Date(k.tanggal).getTime(),
                    sumber: 'Kas Internal',
                    kategori: k.kategori || 'Pengeluaran',
                    keterangan: k.nama_item + (k.keterangan ? ' - ' + k.keterangan : ''),
                    masuk: 0,
                    keluar: parseInt(k.jumlah) || 0
                });
            });
        }
    }

    // 5. Pengeluaran Dinas
    if (sourceFilter === 'all' || sourceFilter === 'operasional') {
        if (typeof dPengeluaranDinas !== 'undefined') {
            dPengeluaranDinas.forEach(p => {
                transaksiList.push({
                    tanggal: p.tanggal_berangkat || p.tanggal,
                    timestamp: new Date(p.tanggal_berangkat || p.tanggal).getTime(),
                    sumber: 'Kas Operasional',
                    kategori: 'Pengeluaran Dinas',
                    keterangan: `${p.jenis} ke ${p.tujuan} (${p.petugas})`,
                    masuk: 0,
                    keluar: parseInt(p.jumlah_uang) || 0
                });
            });
        }
    }

    // Sort ascending by date
    transaksiList.sort((a, b) => a.timestamp - b.timestamp);

    return { transaksiList, saldoAwal };
}

function renderBukuKas() {
    let tab = activeBukuKasTab;
    let sourceFilter = 'all';
    let filterBulanId = 'filterBulanBukuKas';
    let searchId = 'searchBukuKas';
    let tbodyId = 'tbodyBukuKas';
    let colCount = 7;
    let showSumber = true;
    let prefixSaldo = 'bk';

    if (tab === 'kas_operasional') {
        sourceFilter = 'operasional';
        filterBulanId = 'filterBulanBukuKasOp';
        searchId = 'searchBukuKasOp';
        tbodyId = 'tbodyBukuKasOp';
        colCount = 6;
        showSumber = false;
        prefixSaldo = 'bkOp';
    } else if (tab === 'kas_internal') {
        sourceFilter = 'internal';
        filterBulanId = 'filterBulanBukuKasInt';
        searchId = 'searchBukuKasInt';
        tbodyId = 'tbodyBukuKasInt';
        colCount = 6;
        showSumber = false;
        prefixSaldo = 'bkInt';
    }

    let tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    let { transaksiList, saldoAwal } = buildBukuKasTransaksiList(sourceFilter);

    // Set default month filter on first load
    let filterBulanInput = document.getElementById(filterBulanId);
    if (filterBulanInput && !filterBulanInput.dataset.initialized) {
        let now = new Date();
        let yyyy = now.getFullYear();
        let mm = String(now.getMonth() + 1).padStart(2, '0');
        filterBulanInput.value = `${yyyy}-${mm}`;
        filterBulanInput.dataset.initialized = 'true';
    }

    let filterBulan = filterBulanInput ? filterBulanInput.value : '';
    let search = (document.getElementById(searchId)?.value || '').toLowerCase();

    let transaksiBeforeMonth = [];
    let transaksiInMonth = [];

    transaksiList.forEach(t => {
        if (!t.tanggal) return;
        let tBulan = t.tanggal.substring(0, 7); // 'YYYY-MM'
        if (filterBulan) {
            if (tBulan < filterBulan) {
                transaksiBeforeMonth.push(t);
            } else if (tBulan === filterBulan) {
                transaksiInMonth.push(t);
            }
        } else {
            // If filter is empty, show all time
            transaksiInMonth.push(t);
        }
    });

    // Compute Saldo Awal up to the selected month
    let totalMasukBefore = transaksiBeforeMonth.reduce((s, t) => s + t.masuk, 0);
    let totalKeluarBefore = transaksiBeforeMonth.reduce((s, t) => s + t.keluar, 0);
    let computedSaldoAwal = filterBulan ? (saldoAwal + totalMasukBefore - totalKeluarBefore) : saldoAwal;

    // Compute Month Totals (before text search)
    let fullMonthMasuk = transaksiInMonth.reduce((s, t) => s + t.masuk, 0);
    let fullMonthKeluar = transaksiInMonth.reduce((s, t) => s + t.keluar, 0);
    let computedSaldoAkhir = computedSaldoAwal + fullMonthMasuk - fullMonthKeluar;

    // Apply Text Search to Display List
    let displayList = transaksiInMonth;
    if (search) {
        displayList = displayList.filter(t =>
            (t.kategori || '').toLowerCase().includes(search) ||
            (t.keterangan || '').toLowerCase().includes(search) ||
            (t.sumber || '').toLowerCase().includes(search)
        );
    }

    // Update summary cards
    let elSaldoAwal = document.getElementById(prefixSaldo + 'SaldoAwal');
    let elTotalPemasukan = document.getElementById(prefixSaldo + 'TotalPemasukan');
    let elTotalPengeluaran = document.getElementById(prefixSaldo + 'TotalPengeluaran');
    let elSaldoAkhir = document.getElementById(prefixSaldo + 'SaldoAkhir');

    if (elSaldoAwal) elSaldoAwal.innerText = formatRupiah(computedSaldoAwal);
    if (elTotalPemasukan) elTotalPemasukan.innerText = formatRupiah(fullMonthMasuk);
    if (elTotalPengeluaran) elTotalPengeluaran.innerText = formatRupiah(fullMonthKeluar);
    if (elSaldoAkhir) elSaldoAkhir.innerText = formatRupiah(computedSaldoAkhir);

    // Sort descending for display
    displayList.sort((a, b) => b.timestamp - a.timestamp);

    tbody.innerHTML = '';

    if (displayList.length === 0) {
        let emptyMsg = (filterBulan || search) ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada data transaksi.';
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center; padding:2rem; color:var(--text-light);">${emptyMsg}</td></tr>`;
        return;
    }

    displayList.forEach((t, idx) => {
        let sumberCol = showSumber ? `<td><span style="background:${t.sumber === 'Kas Operasional' ? '#dbeafe' : '#d1fae5'}; color:${t.sumber === 'Kas Operasional' ? '#2563eb' : '#059669'}; padding:3px 10px; border-radius:6px; font-size:0.75rem; font-weight:600;">${t.sumber}</span></td>` : '';
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td>${t.tanggal ? t.tanggal.substring(0, 10) : '-'}</td>
                ${sumberCol}
                <td>${t.kategori}</td>
                <td>${t.keterangan}</td>
                <td style="text-align:right; color:#10b981; font-weight:600;">${t.masuk > 0 ? formatRupiah(t.masuk) : '-'}</td>
                <td style="text-align:right; color:#ef4444; font-weight:600;">${t.keluar > 0 ? formatRupiah(t.keluar) : '-'}</td>
            </tr>
        `;
    });
}

// ==============================================================================
// MODUL ARSIP TRANSAKSI
// ==============================================================================
function renderArsipTransaksi() {
    let tbody = document.querySelector('#tableArsipTransaksi tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">Memuat data log arsip...</td></tr>';

    // Fetch Audit Log dari Supabase
    supabaseClient
        .from('arsip_transaksi_log')
        .select('*')
        .order('dibuat_pada', { ascending: false })
        .limit(200)
        .then(({ data, error }) => {
            if (error) {
                console.warn('Tabel arsip_transaksi_log belum tersedia:', error);
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">
                    <i data-lucide="database" style="width:32px;height:32px;color:#ef4444;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;"></i>
                    Sistem Arsip Transaksi belum diaktifkan di Database.<br>
                    Silakan jalankan Script SQL Triggers pada Supabase SQL Editor.
                </td></tr>`;
                if (window.lucide) lucide.createIcons();
                return;
            }

            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada riwayat transaksi (Arsip Log masih kosong).</td></tr>';
                return;
            }

            // Populate filter tahun dinamis
            let tahunSelect = document.getElementById('filterTahunArsip');
            if (tahunSelect && data.length > 0) {
                let currentValue = tahunSelect.value;
                let years = new Set();
                data.forEach(t => {
                    if (t.dibuat_pada) {
                        let y = new Date(t.dibuat_pada).getFullYear().toString();
                        years.add(y);
                    }
                });

                // Hanya update option jika berbeda agar tidak mereset pilihan saat oninput
                if (tahunSelect.options.length <= 1 || years.size > 0) {
                    while (tahunSelect.options.length > 1) {
                        tahunSelect.remove(1);
                    }
                    Array.from(years).sort((a, b) => b.localeCompare(a)).forEach(y => {
                        let opt = document.createElement('option');
                        opt.value = y;
                        opt.textContent = y;
                        if (y === currentValue) opt.selected = true;
                        tahunSelect.appendChild(opt);
                    });
                }
            }

            // Ambil nilai filter
            let search = (document.getElementById('searchArsip')?.value || '').toLowerCase();
            let filterTahun = document.getElementById('filterTahunArsip')?.value || '';
            let filterSumber = document.getElementById('filterSumberArsip')?.value || '';

            let displayList = data;

            if (filterTahun) {
                displayList = displayList.filter(log => log.dibuat_pada && log.dibuat_pada.startsWith(filterTahun));
            }

            if (filterSumber) {
                displayList = displayList.filter(log => log.tabel_sumber === filterSumber);
            }

            if (search) {
                displayList = displayList.filter(log => {
                    let ket = (log.data_baru?.keterangan || log.data_lama?.keterangan || '').toLowerCase();
                    let nama = (log.data_baru?.nama_item || log.data_lama?.nama_item || '').toLowerCase();
                    return ket.includes(search) || nama.includes(search);
                });
            }

            if (displayList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Tidak ada log arsip yang cocok dengan filter.</td></tr>';
                return;
            }

            displayList.forEach((log, i) => {
                let d = log.aksi === 'DELETE' ? log.data_lama : log.data_baru;
                if (!d) d = {};

                let modul = log.tabel_sumber;
                if (modul === 'keuangan_pembayaran') modul = 'Tagihan/Pendaftaran';
                else if (modul === 'kas_keluar') modul = 'Pengeluaran Internal';
                else if (modul === 'buku_kas_bendahara') modul = 'Kas Operasional';
                else if (modul === 'pengeluaran_dinas') modul = 'Pengeluaran Dinas';

                let ket = d.keterangan || d.nama_item || d.jenis || '-';
                let nom = parseInt(d.nominal || d.jumlah || d.jumlah_uang || 0);

                let aksiColor = log.aksi === 'DELETE' ? '#fee2e2; color:#ef4444' : log.aksi === 'UPDATE' ? '#fef3c7; color:#f59e0b' : '#dcfce7; color:#10b981';
                let aksiLabel = log.aksi === 'DELETE' ? 'DIHAPUS' : log.aksi === 'UPDATE' ? 'DIEDIT' : 'BARU';

                let perubahan = '-';
                if (log.aksi === 'UPDATE' && log.data_lama) {
                    let oldNom = parseInt(log.data_lama.nominal || log.data_lama.jumlah || log.data_lama.jumlah_uang || 0);
                    if (oldNom !== nom) perubahan = `Rp ${formatRupiah(oldNom)} &rarr; Rp ${formatRupiah(nom)}`;
                    else perubahan = 'Teks Diedit';
                } else if (log.aksi === 'DELETE') {
                    perubahan = '<span style="color:#ef4444">Data Terhapus</span>';
                }

                tbody.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${formatTanggalIndo(log.dibuat_pada, true)}</td>
                        <td><span style="padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; background: ${aksiColor}">${aksiLabel}</span></td>
                        <td><span style="font-weight:600; color:var(--text-color);">${modul}</span></td>
                        <td>${ket}</td>
                        <td>${perubahan}</td>
                        <td style="text-align:right; font-weight:700; color:${log.aksi === 'DELETE' ? '#ef4444' : 'var(--primary-dark)'};">Rp ${formatRupiah(nom)}</td>
                    </tr>
                `;
            });

        })
        .catch(err => {
            console.error('Fetch arsip log failed:', err);
        });
}

function printLaporanArsip() {
    let printArea = document.getElementById('printAreaLaporan');
    if (!printArea) return;

    let filterTahun = document.getElementById('filterTahunArsip')?.value || 'Semua Tahun';
    let filterSumber = document.getElementById('filterSumberArsip')?.value || 'Semua Modul';

    let tbody = document.querySelector('#tableArsipTransaksi tbody');
    if (!tbody || tbody.innerText.includes('Tidak ada arsip')) {
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
    if (!printArea) return;

    let today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    let settings = getKwitansiSettings();
    let namaBendahara = settings.namaBendahara || '_______________________';
    let ttdBase64 = settings.ttdBase64 || '';

    let ttdHtml = ttdBase64
        ? `<img src="${ttdBase64}" style="height:15mm; max-width:50mm; object-fit:contain; display:block; margin:3mm auto 2mm auto;" />`
        : `<div style="margin-bottom:20mm;"></div>`;

    let tbody = document.querySelector('#tableKasSekolah tbody');
    if (!tbody) return;

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
        if (error) throw error;
        dKasKeluar = data || [];
    } catch (e) {
        console.error('Failed to fetch kas keluar:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient !== 'undefined') fetchKasKeluar();
});

function renderKasKeluarTable() {
    let tbody = document.querySelector('#tableKasKeluar tbody');
    if (!tbody) return;

    let search = (document.getElementById('searchKasKeluar')?.value || '').toLowerCase();
    let filterKat = document.getElementById('filterKategoriKK')?.value || '';
    let filterBulan = document.getElementById('filterBulanKK')?.value || '';

    let filtered = dKasKeluar;
    if (search) {
        filtered = filtered.filter(d =>
            d.nama_item.toLowerCase().includes(search) ||
            (d.keterangan || '').toLowerCase().includes(search) ||
            d.kategori.toLowerCase().includes(search)
        );
    }
    if (filterKat) {
        filtered = filtered.filter(d => d.kategori === filterKat);
    }
    if (filterBulan) {
        filtered = filtered.filter(d => d.tanggal && d.tanggal.startsWith(filterBulan));
    }

    // Summary Cards
    let summaryEl = document.getElementById('kasKeluarSummary');
    if (summaryEl) {
        let totalAll = dKasKeluar.reduce((s, d) => s + parseInt(d.jumlah || 0), 0);
        let totalFiltered = filtered.reduce((s, d) => s + parseInt(d.jumlah || 0), 0);
        let bulanIni = new Date().toISOString().slice(0, 7);
        let totalBulanIni = dKasKeluar.filter(d => d.tanggal && d.tanggal.startsWith(bulanIni)).reduce((s, d) => s + parseInt(d.jumlah || 0), 0);

        // Count per category
        let katCounts = {};
        dKasKeluar.forEach(d => { katCounts[d.kategori] = (katCounts[d.kategori] || 0) + parseInt(d.jumlah || 0); });
        let topKat = Object.entries(katCounts).sort((a, b) => b[1] - a[1])[0];

        summaryEl.innerHTML = `
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #ef4444;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Kas Keluar</div>
                <div style="font-size:1.3rem; font-weight:700; color:#ef4444;">${formatRupiah(totalAll)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
                <div style="font-size:1.3rem; font-weight:700; color:#f59e0b;">${formatRupiah(totalBulanIni)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${dKasKeluar.length}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #8b5cf6;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Terbanyak</div>
                <div style="font-size:1rem; font-weight:700; color:#8b5cf6;">${topKat ? topKat[0] : '-'}</div>
            </div>
        `;
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data kas keluar.</td></tr>`;
        return;
    }

    let katColors = {
        'Pelatih Ekskul': '#2563eb',
        'Sarana & Prasarana': '#059669',
        'Tagihan Utilitas': '#f59e0b',
        'Operasional': '#8b5cf6',
        'Konsumsi': '#ec4899',
        'Lainnya': '#64748b'
    };

    filtered.forEach((d, idx) => {
        let color = katColors[d.kategori] || '#64748b';
        let displayKeterangan = d.keterangan || '-';
        if (d.kategori === 'Honor' && typeof d.keterangan === 'string' && d.keterangan.startsWith('{')) {
            try {
                let j = JSON.parse(d.keterangan);
                let count = j.penerima ? j.penerima.length : 0;
                displayKeterangan = `${j.deskripsi || ''} (${count} Penerima)`;
            } catch (e) { }
        }

        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><span style="background:${color}15; color:${color}; padding:3px 10px; border-radius:6px; font-size:0.8rem; font-weight:600;">${d.kategori}</span></td>
                <td><strong>${d.nama_item}</strong></td>
                <td style="font-weight:600; color:var(--danger);">${formatRupiah(d.jumlah)}</td>
                <td>${d.tanggal}</td>
                <td>${displayKeterangan}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-sm btn-outline" onclick="editKasKeluar('${d.id}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="hapusKasKeluar('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function injectKasKeluarForm(kat, d = {}) {
    let body = document.getElementById('kasKeluarModalBody');
    if (!body) return;
    body.innerHTML = `
        <input type="hidden" id="formKKId" value="${d.id || ''}">
        <input type="hidden" id="formKKKategori" value="${kat}">
        <div class="form-group" style="margin:0;">
          <label class="form-label">Tanggal Pengeluaran</label>
          <input type="date" id="formKKTanggal" class="form-input" value="${d.tanggal || new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Nama Item / Keterangan Singkat</label>
          <input type="text" id="formKKNamaItem" class="form-input" placeholder="Contoh: Beli konsumsi rapat" value="${d.nama_item || ''}">
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Jumlah (Rp)</label>
          <input type="number" id="formKKJumlah" class="form-input" placeholder="0" value="${d.jumlah || ''}">
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Catatan Tambahan (Opsional)</label>
          <textarea id="formKKKeterangan" class="form-input" rows="2" placeholder="Detail pengeluaran...">${d.keterangan || ''}</textarea>
        </div>
    `;
}

function openKasKeluarModal() {
    let kat = window.currentUnivKategori || '';
    if (!kat) {
        showToast('Pilih kategori pengeluaran terlebih dahulu!', 'warning');
        return;
    }

    if (kat === 'Honor') {
        window.honorSource = 'Universal';
        window.editingKasKeluarId = null;
        openHonorModal();
        return;
    }

    if (kat === 'Konsumsi') {
        openKonsumsiModal();
        return;
    }

    // Lainnya - use generic form
    document.getElementById('kasKeluarModalTitle').innerText = 'Tambah Pengeluaran: ' + kat;
    document.getElementById('kasKeluarModal').querySelector('.modal-header p').innerText = 'Catat pengeluaran operasional (fotocopy, bensin, cetak, dll).';
    injectKasKeluarForm(kat);
    document.getElementById('kasKeluarModal').classList.add('active');
}

function closeKasKeluarModal() {
    document.getElementById('kasKeluarModal').classList.remove('active');
}

function editKasKeluar(id) {
    let d = dKasKeluar.find(x => x.id === id);
    if (!d) return;

    if (d.kategori === 'Honor') {
        window.honorSource = 'Universal';
        window.editingKasKeluarId = d.id;
        let ket = d.keterangan || '';
        let j = null;
        try {
            if (ket.startsWith('{')) j = JSON.parse(ket);
        } catch (e) { }

        localStorage.removeItem('honorFormCache');
        let obj = {
            recipients: j && j.penerima ? j.penerima : [{ nama: d.nama_item || '', jumlah: d.jumlah || 0 }],
            tanggal: d.tanggal,
            keterangan: j ? (j.deskripsi || '') : (d.keterangan || '')
        };
        localStorage.setItem('honorFormCache', JSON.stringify(obj));
        openHonorModal();
        return;
    }

    if (d.kategori === 'Konsumsi') {
        editKonsumsiPengeluaran(d.id);
        return;
    }

    // Lainnya - generic form
    document.getElementById('kasKeluarModalTitle').innerText = 'Edit Pengeluaran: ' + d.kategori;
    document.getElementById('kasKeluarModal').querySelector('.modal-header p').innerText = 'Catat pengeluaran operasional (fotocopy, bensin, cetak, dll).';
    injectKasKeluarForm(d.kategori, d);
    document.getElementById('kasKeluarModal').classList.add('active');
}

async function saveKasKeluar() {
    let id = document.getElementById('formKKId').value;
    let kategori = document.getElementById('formKKKategori').value;
    let nama_item = document.getElementById('formKKNamaItem').value.trim();
    let jumlah = parseInt(document.getElementById('formKKJumlah').value) || 0;
    let tanggal = document.getElementById('formKKTanggal').value;
    let keterangan = document.getElementById('formKKKeterangan').value.trim();

    if (!nama_item) return showToast('Nama item wajib diisi!', 'error');
    if (jumlah <= 0) return showToast('Jumlah harus lebih dari 0!', 'error');
    if (!tanggal) return showToast('Tanggal wajib diisi!', 'error');

    let payload = { kategori, nama_item, jumlah, tanggal, keterangan };

    // Sertakan id_tagihan jika sedang membuka detail tagihan universal
    if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) {
        payload.id_tagihan = activeDetailIdKat;
    }

    try {
        if (id) {
            const { error } = await supabaseClient.from('kas_keluar').update(payload).eq('id', id);
            if (error) throw error;
            let idx = dKasKeluar.findIndex(x => x.id === id);
            if (idx >= 0) Object.assign(dKasKeluar[idx], payload);
            showToast('Data berhasil diperbarui!', 'success');
        } else {
            const { data, error } = await supabaseClient.from('kas_keluar').insert([payload]).select();
            if (error) throw error;
            if (data && data[0]) dKasKeluar.unshift(data[0]);
            showToast('Pengeluaran berhasil ditambahkan!', 'success');
        }
        closeKasKeluarModal();
        renderUnivKategoriTable();
        if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) renderDetailSaldo(activeDetailIdKat);
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    }
}

function hapusKasKeluar(id) {
    showCustomConfirm('Hapus Data?', 'Anda yakin ingin menghapus data pengeluaran ini?', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('kas_keluar').delete().eq('id', id);
            if (error) throw error;
            dKasKeluar = dKasKeluar.filter(x => x.id !== id);
            showToast('Data berhasil dihapus!', 'success');
            renderUnivKategoriTable();
            if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) renderDetailSaldo(activeDetailIdKat);
        } catch (e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}

// === CETAK LAPORAN KAS KELUAR ===
function printLaporanKasKeluar() {
    if (dKasKeluar.length === 0) {
        return showToast('Belum ada data kas keluar untuk dicetak.', 'warning');
    }

    let search = (document.getElementById('searchKasKeluar')?.value || '').toLowerCase();
    let filterKat = document.getElementById('filterKategoriKK')?.value || '';
    let filterBulan = document.getElementById('filterBulanKK')?.value || '';

    let filtered = dKasKeluar;
    if (search) {
        filtered = filtered.filter(d =>
            d.nama_item.toLowerCase().includes(search) ||
            (d.keterangan || '').toLowerCase().includes(search) ||
            d.kategori.toLowerCase().includes(search)
        );
    }
    if (filterKat) filtered = filtered.filter(d => d.kategori === filterKat);
    if (filterBulan) filtered = filtered.filter(d => d.tanggal && d.tanggal.startsWith(filterBulan));

    let today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    let totalUang = filtered.reduce((s, d) => s + parseInt(d.jumlah || 0), 0);

    let periodeLabel = 'Seluruh Data';
    if (filterBulan) {
        let [y, m] = filterBulan.split('-');
        let bulanNama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        periodeLabel = bulanNama[parseInt(m)] + ' ' + y;
    }
    if (filterKat) periodeLabel += ' — Kategori: ' + filterKat;

    let trs = '';
    filtered.forEach((d, idx) => {
        let displayKeterangan = d.keterangan || '-';
        if (d.kategori === 'Honor' && typeof d.keterangan === 'string' && d.keterangan.startsWith('{')) {
            try {
                let j = JSON.parse(d.keterangan);
                let count = j.penerima ? j.penerima.length : 0;
                displayKeterangan = `${j.deskripsi || ''} (${count} Penerima)`;
            } catch (e) { }
        }

        trs += `<tr>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${idx + 1}</td>
            <td style="padding:5px; border:1px solid #000;">${d.kategori}</td>
            <td style="padding:5px; border:1px solid #000;">${d.nama_item}</td>
            <td style="text-align:right; padding:5px; border:1px solid #000;">${formatRupiah(d.jumlah)}</td>
            <td style="text-align:center; padding:5px; border:1px solid #000;">${d.tanggal}</td>
            <td style="padding:5px; border:1px solid #000;">${displayKeterangan}</td>
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

async function fetchPengeluaranDinas() {
    try {
        const { data, error } = await supabaseClient.from('pengeluaran_dinas').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        dPengeluaranDinas = data || [];
    } catch (e) {
        console.error('Failed to fetch pengeluaran dinas:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient !== 'undefined') fetchPengeluaranDinas();
});

function renderPengeluaranDinasTable() {
    let tbody = document.querySelector('#tablePengeluaranDinas tbody');
    if (!tbody) return;

    let search = (document.getElementById('searchPengeluaranDinas')?.value || '').toLowerCase();
    let filtered = dPengeluaranDinas;
    if (search) {
        filtered = filtered.filter(d =>
            d.tujuan.toLowerCase().includes(search) ||
            d.petugas.toLowerCase().includes(search) ||
            d.jenis.toLowerCase().includes(search)
        );
    }

    // Summary cards
    let summaryEl = document.getElementById('pengeluaranDinasSummary');
    if (summaryEl) {
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
    if (filtered.length === 0) {
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
    if (window.lucide) lucide.createIcons();
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
    if (window.lucide) lucide.createIcons();
}

function closePengeluaranDinasModal() {
    document.getElementById('pengeluaranDinasModal').classList.remove('active');
}

function editPengeluaranDinas(id) {
    let d = dPengeluaranDinas.find(x => x.id === id);
    if (!d) return;

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
    if (window.lucide) lucide.createIcons();
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

    if (!tujuan || !petugas || !jumlah || !berangkat || !pulang) {
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
        if (id) {
            // Update
            const { error } = await supabaseClient.from('pengeluaran_dinas').update(obj).eq('id', id);
            if (error) throw error;
            let idx = dPengeluaranDinas.findIndex(x => x.id === id);
            if (idx >= 0) Object.assign(dPengeluaranDinas[idx], obj);
            showToast('Data pengeluaran dinas berhasil diperbarui!', 'success');
        } else {
            // Insert
            const { data, error } = await supabaseClient.from('pengeluaran_dinas').insert([obj]).select();
            if (error) throw error;
            if (data && data.length > 0) dPengeluaranDinas.unshift(data[0]);
            showToast('Data pengeluaran dinas berhasil ditambahkan!', 'success');
        }

        closePengeluaranDinasModal();
        renderPengeluaranDinasTable();
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    }
}

function hapusPengeluaranDinas(id) {
    showCustomConfirm('Hapus Data?', 'Anda yakin ingin menghapus data pengeluaran dinas ini?', 'Ya, Hapus', async function () {
        try {
            const { error } = await supabaseClient.from('pengeluaran_dinas').delete().eq('id', id);
            if (error) throw error;
            dPengeluaranDinas = dPengeluaranDinas.filter(x => x.id !== id);
            showToast('Data berhasil dihapus!', 'success');
            renderPengeluaranDinasTable();
        } catch (e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}

// === CETAK LAPORAN PENGELUARAN DINAS ===
function printLaporanPengeluaranDinas() {
    if (dPengeluaranDinas.length === 0) {
        return showToast('Belum ada data pengeluaran dinas untuk dicetak.', 'warning');
    }

    let search = (document.getElementById('searchPengeluaranDinas')?.value || '').toLowerCase();
    let filtered = dPengeluaranDinas;
    if (search) {
        filtered = filtered.filter(d =>
            d.tujuan.toLowerCase().includes(search) ||
            d.petugas.toLowerCase().includes(search) ||
            d.jenis.toLowerCase().includes(search)
        );
    }

    let today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
    [tabU, tabP, tabD].forEach(t => { if (t) { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--text-light)'; } });
    [contentU, contentP, contentD].forEach(c => { if (c) c.style.display = 'none'; });

    if (tab === 'universal') {
        if (tabU) { tabU.style.borderBottomColor = 'var(--primary)'; tabU.style.color = 'var(--primary)'; }
        if (contentU) contentU.style.display = '';
        renderLapMaster('universal');
    } else if (tab === 'pendaftaran') {
        if (tabP) { tabP.style.borderBottomColor = 'var(--primary)'; tabP.style.color = 'var(--primary)'; }
        if (contentP) contentP.style.display = '';
        renderLapMaster('pendaftaran');
    } else if (tab === 'dinas') {
        if (tabD) { tabD.style.borderBottomColor = 'var(--primary)'; tabD.style.color = 'var(--primary)'; }
        if (contentD) contentD.style.display = '';
        renderLapPengeluaranDinasTable();
    }
    closeLapDetail('universal');
    closeLapDetail('pendaftaran');
    if (window.lucide) lucide.createIcons();
}

function renderLapPengeluaranDinasTable() {
    let search = (document.getElementById('lapSearchPengeluaranDinas')?.value || '').toLowerCase();
    let filtered = dPengeluaranDinas;
    if (search) {
        filtered = filtered.filter(d =>
            d.tujuan.toLowerCase().includes(search) ||
            d.petugas.toLowerCase().includes(search) ||
            d.jenis.toLowerCase().includes(search)
        );
    }

    // Summary
    let summaryEl = document.getElementById('lapSummaryPengeluaranDinas');
    if (summaryEl) {
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
    if (!tbody) return;

    tbody.innerHTML = '';
    if (filtered.length === 0) {
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
    if (summaryEl) {
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
    if (!tbody) return;

    tbody.innerHTML = '';
    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-light);">Belum ada data tagihan ${jenis}.</td></tr>`;
        return;
    }

    filteredData.forEach((k, idx) => {
        // Rincian for pendaftaran
        let rincianHtml = '';
        if (jenis === 'pendaftaran' && k.rincian) {
            try {
                let items = typeof k.rincian === 'string' ? JSON.parse(k.rincian) : k.rincian;
                if (items && items.length > 0) {
                    rincianHtml = '<div style="margin-top:4px; font-size:0.8rem; color:var(--text-light);">';
                    items.forEach((item, i) => {
                        rincianHtml += `${i + 1}. ${item.nama} (${formatRupiah(item.nominal)})<br>`;
                    });
                    rincianHtml += '</div>';
                }
            } catch (e) { }
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
    if (window.lucide) lucide.createIcons();
}

function openLapDetail(idKat, jenis) {
    activeLapDetailIdKat = idKat;
    activeLapDetailJenis = jenis;

    let kat = dKeuanganInsidental.find(k => k.id == idKat);
    if (!kat) return;

    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    document.getElementById('lapDetailTitle' + suffix).innerText = kat.nama;
    document.getElementById('lapDetailSub' + suffix).innerText = `Kelas: ${kat.kelas} | Nominal: ${formatRupiah(kat.nominal)} | Tanggal: ${kat.tanggal}`;
    document.getElementById('lapDetailContainer' + suffix).style.display = '';
    document.getElementById('lapSearch' + suffix).value = '';

    renderLapDetail(jenis);
    if (window.lucide) lucide.createIcons();
}

function closeLapDetail(jenis) {
    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    let el = document.getElementById('lapDetailContainer' + suffix);
    if (el) el.style.display = 'none';
    if (activeLapDetailJenis === jenis) {
        activeLapDetailIdKat = null;
        activeLapDetailJenis = null;
    }
}

function renderLapDetail(jenis) {
    if (!activeLapDetailIdKat || activeLapDetailJenis !== jenis) return;

    let kat = dKeuanganInsidental.find(k => k.id == activeLapDetailIdKat);
    if (!kat) return;

    let suffix = jenis === 'pendaftaran' ? 'Pendaftaran' : 'Universal';
    let prefix = jenis === 'pendaftaran' ? 'pendaftaran_' : 'insidental_';
    let kodeTagihan = prefix + kat.id;

    let listSiswa = getSiswaForKeuangan(kat.kelas);
    let search = document.getElementById('lapSearch' + suffix).value.toLowerCase();
    if (search) listSiswa = listSiswa.filter(s => s.namaLengkap.toLowerCase().includes(search));

    let tbody = document.querySelector('#lapDetailTable' + suffix + ' tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (listSiswa.length === 0) {
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

    if (tabName === 'tagihan') {
        if (tabTagihan) tabTagihan.style.display = '';
        if (tabKasKeluar) tabKasKeluar.style.display = 'none';
        if (btnTagihan) { btnTagihan.style.background = '#10b981'; btnTagihan.style.color = 'white'; }
        if (btnKasKeluar) { btnKasKeluar.style.background = 'transparent'; btnKasKeluar.style.color = 'var(--text-light)'; }
        if (btnAksiPemasukan) btnAksiPemasukan.style.display = '';
        if (btnAksiCetakPengeluaran) btnAksiCetakPengeluaran.style.display = 'none';
        if (btnAksiPengeluaran) btnAksiPengeluaran.style.display = 'none';
    } else {
        if (tabTagihan) tabTagihan.style.display = 'none';
        if (tabKasKeluar) tabKasKeluar.style.display = '';
        if (btnTagihan) { btnTagihan.style.background = 'transparent'; btnTagihan.style.color = 'var(--text-light)'; }
        if (btnKasKeluar) { btnKasKeluar.style.background = '#ef4444'; btnKasKeluar.style.color = 'white'; }
        if (btnAksiPemasukan) btnAksiPemasukan.style.display = 'none';
        if (btnAksiCetakPengeluaran) btnAksiCetakPengeluaran.style.display = '';
        if (btnAksiPengeluaran) btnAksiPengeluaran.style.display = '';

        // Muat data kas keluar
        fetchKasKeluar().then(() => {
            let select = document.getElementById('selectUnivKategoriPengeluaran');
            if (select && select.value) {
                switchUnivKategoriPengeluaran(select.value);
            } else {
                let container = document.getElementById('univKategoriContentContainer');
                if (container) container.style.display = 'none';
                let ph = document.getElementById('univKategoriPlaceholder');
                if (ph) ph.style.display = 'block';
            }
        });
    }
    if (window.lucide) lucide.createIcons();
}

function switchUnivKategoriPengeluaran(kategori) {
    let container = document.getElementById('univKategoriContentContainer');
    let ph = document.getElementById('univKategoriPlaceholder');

    if (!kategori) {
        if (container) container.style.display = 'none';
        if (ph) ph.style.display = 'block';
        return;
    }

    if (container) container.style.display = 'block';
    if (ph) ph.style.display = 'none';

    let title = document.getElementById('univKategoriTableTitle');
    if (title) title.innerText = 'Riwayat Pengeluaran: ' + kategori;

    let thead = document.getElementById('theadUnivKategori');
    if (thead) {
        if (kategori === 'Honor') {
            thead.innerHTML = `
                <tr>
                    <th style="width:40px;">No</th>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th style="text-align:center;">Penerima</th>
                    <th style="text-align:right;">Total</th>
                    <th style="text-align:center; width:140px;">Aksi</th>
                </tr>
            `;
        } else if (kategori === 'Konsumsi') {
            thead.innerHTML = `
                <tr>
                    <th style="width:40px;">No</th>
                    <th>Tanggal</th>
                    <th>Kegiatan</th>
                    <th>Jenis</th>
                    <th style="text-align:center;">Porsi</th>
                    <th style="text-align:right;">Harga Satuan</th>
                    <th style="text-align:right;">Total</th>
                    <th style="text-align:center; width:100px;">Aksi</th>
                </tr>
            `;
        } else {
            // Lainnya
            thead.innerHTML = `
                <tr>
                    <th style="width:40px;">No</th>
                    <th>Tanggal</th>
                    <th>Nama Pengeluaran</th>
                    <th style="text-align:right;">Nominal</th>
                    <th>Catatan</th>
                    <th style="text-align:center; width:100px;">Aksi</th>
                </tr>
            `;
        }
    }

    window.currentUnivKategori = kategori;
    renderUnivKategoriTable();
}

function renderUnivKategoriTable() {
    let tbody = document.getElementById('tbodyUnivKategori');
    if (!tbody) return;
    let kat = window.currentUnivKategori;
    if (!kat) return;

    let filtered = dKasKeluar.filter(x => x.kategori === kat && x.id_tagihan === activeDetailIdKat);

    let search = document.getElementById('searchUnivKategori')?.value.toLowerCase() || "";
    let filterBulan = document.getElementById('filterBulanUnivKategori')?.value || "";

    if (search) {
        filtered = filtered.filter(x =>
            (x.nama_item || "").toLowerCase().includes(search) ||
            (x.keterangan || "").toLowerCase().includes(search)
        );
    }
    if (filterBulan) {
        filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(filterBulan));
    }

    let colSpan = kat === 'Honor' ? 6 : (kat === 'Konsumsi' ? 8 : 6);

    let summaryEl = document.getElementById('kasKeluarSummary');
    if (summaryEl) {
        let totalFiltered = filtered.reduce((s, d) => s + parseInt(d.jumlah || 0), 0);
        let bulanIni = new Date().toISOString().slice(0, 7);
        let totalBulanIni = filtered.filter(d => d.tanggal && d.tanggal.startsWith(bulanIni)).reduce((s, d) => s + parseInt(d.jumlah || 0), 0);

        let namaCounts = {};
        filtered.forEach(d => {
            let nama = d.nama_item || 'Tidak Bernama';
            namaCounts[nama] = (namaCounts[nama] || 0) + parseInt(d.jumlah || 0);
        });
        let topNama = Object.entries(namaCounts).sort((a, b) => b[1] - a[1])[0];

        summaryEl.innerHTML = `
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #ef4444;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Kas Keluar</div>
                <div style="font-size:1.3rem; font-weight:700; color:#ef4444;">${formatRupiah(totalFiltered)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
                <div style="font-size:1.3rem; font-weight:700; color:#f59e0b;">${formatRupiah(totalBulanIni)}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${filtered.length}</div>
            </div>
            <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #8b5cf6;">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Terbanyak</div>
                <div style="font-size:1rem; font-weight:700; color:#8b5cf6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${topNama ? topNama[0] : '-'}">${topNama ? topNama[0] : '-'}</div>
            </div>
        `;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:2rem;color:var(--text-light);">Belum ada data pengeluaran untuk kategori ini.</td></tr>`;
        return;
    }

    let html = '';
    let total = 0;

    filtered.forEach((d, i) => {
        let amt = parseInt(d.jumlah) || 0;
        total += amt;

        if (kat === 'Honor') {
            // Parse JSON keterangan
            let desc = '-', jumlahPenerima = 0;
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    desc = j.deskripsi || '-';
                    jumlahPenerima = j.penerima ? j.penerima.length : 0;
                } else {
                    desc = d.keterangan || '-';
                }
            } catch (e) { desc = d.keterangan || '-'; }

            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td>${desc}</td>
                <td style="text-align:center;"><span style="background:rgba(37,99,235,0.1); color:#2563eb; padding:2px 8px; border-radius:4px; font-size:0.85rem; font-weight:600;">${jumlahPenerima} Orang</span></td>
                <td style="text-align:right; font-weight:600; color:var(--danger);">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:center; white-space:nowrap;">
                    <button class="btn btn-sm btn-primary" title="Detail" onclick="viewDetailHonorUniv('${d.id}')"><i data-lucide="eye" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-primary" style="background:#0ea5e9;border:none;" title="Edit" onclick="editKasKeluar('${d.id}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-danger" title="Hapus" onclick="hapusKasKeluar('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </td>
            </tr>`;
        } else if (kat === 'Konsumsi') {
            // Parse JSON keterangan for Konsumsi
            let kegiatan = d.nama_item || '-';
            let jenis = '-', porsi = '-', hargaSatuan = '-';
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    jenis = j.jenis || '-';
                    porsi = j.porsi || '-';
                    hargaSatuan = j.harga_satuan || 0;
                }
            } catch (e) { }

            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td><strong>${kegiatan}</strong></td>
                <td><span style="background:rgba(236,72,153,0.1); color:#ec4899; padding:2px 8px; border-radius:4px; font-size:0.85rem;">${jenis}</span></td>
                <td style="text-align:center;">${porsi}</td>
                <td style="text-align:right;">Rp ${formatRupiah(hargaSatuan)}</td>
                <td style="text-align:right; font-weight:600; color:var(--danger);">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:center; white-space:nowrap;">
                    <button class="btn btn-sm btn-primary" style="background:#0ea5e9;border:none;" title="Edit" onclick="editKasKeluar('${d.id}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-danger" title="Hapus" onclick="hapusKasKeluar('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </td>
            </tr>`;
        } else {
            // Lainnya
            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td><strong>${d.nama_item || '-'}</strong></td>
                <td style="text-align:right; font-weight:600; color:var(--danger);">Rp ${formatRupiah(amt)}</td>
                <td>${d.keterangan || '-'}</td>
                <td style="text-align:center; white-space:nowrap;">
                    <button class="btn btn-sm btn-primary" style="background:#0ea5e9;border:none;" title="Edit" onclick="editKasKeluar('${d.id}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-sm btn-danger" title="Hapus" onclick="hapusKasKeluar('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </td>
            </tr>`;
        }
    });

    // Total row
    let totalColSpan = kat === 'Honor' ? 4 : (kat === 'Konsumsi' ? 6 : 3);
    let remainColSpan = kat === 'Honor' ? 2 : 2;
    html += `
        <tr style="background:#f8fafc;">
            <td colspan="${totalColSpan}" style="text-align:right; font-weight:bold;">Total ${kat}</td>
            <td colspan="${remainColSpan}" style="text-align:right; font-weight:bold; color:var(--primary-dark);">Rp ${formatRupiah(total)}</td>
        </tr>
    `;

    tbody.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}

// ===== KONSUMSI MODAL FUNCTIONS =====
function openKonsumsiModal() {
    document.getElementById('formKonsumsiId').value = '';
    document.getElementById('konsumsiModalTitle').innerText = 'Tambah Pengeluaran: Konsumsi';
    document.getElementById('formKonsumsiTanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('formKonsumsiKegiatan').value = '';
    document.getElementById('formKonsumsiJenis').value = '';
    document.getElementById('formKonsumsiPorsi').value = '';
    document.getElementById('formKonsumsiHargaSatuan').value = '';
    document.getElementById('formKonsumsiCatatan').value = '';
    document.getElementById('konsumsiTotalDisplay').innerText = 'Rp 0';
    document.getElementById('konsumsiPengeluaranModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closeKonsumsiModal() {
    document.getElementById('konsumsiPengeluaranModal').classList.remove('active');
}

function hitungTotalKonsumsi() {
    let porsi = parseInt(document.getElementById('formKonsumsiPorsi').value) || 0;
    let harga = parseInt(document.getElementById('formKonsumsiHargaSatuan').value) || 0;
    let total = porsi * harga;
    document.getElementById('konsumsiTotalDisplay').innerText = 'Rp ' + formatRupiah(total);
}

function editKonsumsiPengeluaran(id) {
    let d = dKasKeluar.find(x => x.id === id);
    if (!d) return;

    document.getElementById('formKonsumsiId').value = d.id;
    document.getElementById('konsumsiModalTitle').innerText = 'Edit Pengeluaran: Konsumsi';
    document.getElementById('formKonsumsiTanggal').value = d.tanggal || '';
    document.getElementById('formKonsumsiKegiatan').value = d.nama_item || '';

    // Parse JSON keterangan
    let jenis = '', porsi = '', hargaSatuan = '', catatan = '';
    try {
        if (d.keterangan && d.keterangan.startsWith('{')) {
            let j = JSON.parse(d.keterangan);
            jenis = j.jenis || '';
            porsi = j.porsi || '';
            hargaSatuan = j.harga_satuan || '';
            catatan = j.catatan || '';
        }
    } catch (e) { }

    document.getElementById('formKonsumsiJenis').value = jenis;
    document.getElementById('formKonsumsiPorsi').value = porsi;
    document.getElementById('formKonsumsiHargaSatuan').value = hargaSatuan;
    document.getElementById('formKonsumsiCatatan').value = catatan;
    hitungTotalKonsumsi();

    document.getElementById('konsumsiPengeluaranModal').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

async function saveKonsumsiPengeluaran() {
    let id = document.getElementById('formKonsumsiId').value;
    let tanggal = document.getElementById('formKonsumsiTanggal').value;
    let kegiatan = document.getElementById('formKonsumsiKegiatan').value.trim();
    let jenis = document.getElementById('formKonsumsiJenis').value;
    let porsi = parseInt(document.getElementById('formKonsumsiPorsi').value) || 0;
    let hargaSatuan = parseInt(document.getElementById('formKonsumsiHargaSatuan').value) || 0;
    let catatan = document.getElementById('formKonsumsiCatatan').value.trim();

    if (!tanggal) return showToast('Tanggal wajib diisi!', 'error');
    if (!kegiatan) return showToast('Kegiatan/Acara wajib diisi!', 'error');
    if (!jenis) return showToast('Jenis konsumsi wajib dipilih!', 'error');
    if (porsi <= 0) return showToast('Jumlah porsi harus lebih dari 0!', 'error');
    if (hargaSatuan <= 0) return showToast('Harga satuan harus lebih dari 0!', 'error');

    let total = porsi * hargaSatuan;

    let keteranganObj = {
        jenis: jenis,
        porsi: porsi,
        harga_satuan: hargaSatuan,
        catatan: catatan
    };

    let payload = {
        kategori: 'Konsumsi',
        nama_item: kegiatan,
        jumlah: total,
        tanggal: tanggal,
        keterangan: JSON.stringify(keteranganObj)
    };

    // Sertakan id_tagihan jika sedang membuka detail tagihan universal
    if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) {
        payload.id_tagihan = activeDetailIdKat;
    }

    let btn = document.querySelector('#konsumsiPengeluaranModal .btn-primary');
    let origText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        if (id) {
            const { error } = await supabaseClient.from('kas_keluar').update(payload).eq('id', id);
            if (error) throw error;
            let idx = dKasKeluar.findIndex(x => x.id === id);
            if (idx >= 0) Object.assign(dKasKeluar[idx], payload);
            showToast('Data konsumsi berhasil diperbarui!', 'success');
        } else {
            const { data, error } = await supabaseClient.from('kas_keluar').insert([payload]).select();
            if (error) throw error;
            if (data && data.length > 0) dKasKeluar.push(data[0]);
            showToast('Data konsumsi berhasil disimpan!', 'success');
        }
        closeKonsumsiModal();
        renderUnivKategoriTable();
        renderKasKeluarTable();
        if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) renderDetailSaldo(activeDetailIdKat);
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = origText; btn.disabled = false;
    }
}

// ===== DETAIL HONOR UNIVERSAL =====
function viewDetailHonorUniv(id) {
    let d = dKasKeluar.find(x => x.id === id);
    if (!d) return;

    let body = document.getElementById('detailHonorUnivBody');
    let penerima = [];
    let desc = '-';
    try {
        if (d.keterangan && d.keterangan.startsWith('{')) {
            let j = JSON.parse(d.keterangan);
            desc = j.deskripsi || '-';
            penerima = j.penerima || [];
        }
    } catch (e) { }

    let rows = '';
    let totalHonor = 0;
    penerima.forEach((p, i) => {
        let amt = parseInt(p.jumlah) || 0;
        totalHonor += amt;
        rows += `<tr>
            <td style="text-align:center;padding:6px;border-bottom:1px solid var(--border-color);">${i + 1}</td>
            <td style="padding:6px;border-bottom:1px solid var(--border-color);font-weight:500;">${p.nama || '-'}</td>
            <td style="text-align:right;padding:6px;border-bottom:1px solid var(--border-color);font-weight:600;color:var(--primary-dark);">Rp ${formatRupiah(amt)}</td>
        </tr>`;
    });

    body.innerHTML = `
        <div style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <span style="color:var(--text-light);">Tanggal:</span>
                <strong>${formatTanggalIndo(d.tanggal)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <span style="color:var(--text-light);">Keterangan:</span>
                <strong>${desc}</strong>
            </div>
        </div>
        <h4 style="margin-bottom:0.5rem; color:var(--primary-dark);">Daftar Penerima Honor</h4>
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="background:var(--bg-lighter);">
                    <th style="padding:6px;text-align:center;width:40px;">No</th>
                    <th style="padding:6px;">Nama Penerima</th>
                    <th style="padding:6px;text-align:right;">Jumlah</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr style="background:rgba(37,99,235,0.06);">
                    <td colspan="2" style="padding:8px; font-weight:bold; text-align:right;">Total Honor</td>
                    <td style="padding:8px; font-weight:bold; text-align:right; color:#2563eb;">Rp ${formatRupiah(totalHonor)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    document.getElementById('detailHonorUnivModal').classList.add('active');
}

function closeDetailHonorUnivModal() {
    document.getElementById('detailHonorUnivModal').classList.remove('active');
}

// ===== PRINT LAPORAN PER KATEGORI =====
function printLaporanUnivKategori() {
    let kat = window.currentUnivKategori;
    if (!kat) return showToast('Pilih kategori terlebih dahulu!', 'warning');

    let filtered = dKasKeluar.filter(x => x.kategori === kat);
    let filterBulan = document.getElementById('filterBulanUnivKategori')?.value || '';
    if (filterBulan) {
        filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(filterBulan));
    }

    if (filtered.length === 0) return showToast('Belum ada data untuk dicetak.', 'warning');

    let today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    let totalUang = filtered.reduce((s, d) => s + (parseInt(d.jumlah) || 0), 0);

    let periodeLabel = 'Seluruh Data';
    if (filterBulan) {
        let [y, m] = filterBulan.split('-');
        let bulanNama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        periodeLabel = bulanNama[parseInt(m)] + ' ' + y;
    }

    let trs = '';
    let thRow = '';

    if (kat === 'Honor') {
        thRow = `<tr>
            <th style="width:5%; border:1px solid #000; padding:5px; background:#f0f0f0;">No</th>
            <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Tanggal</th>
            <th style="width:25%; border:1px solid #000; padding:5px; background:#f0f0f0;">Keterangan</th>
            <th style="width:30%; border:1px solid #000; padding:5px; background:#f0f0f0;">Penerima</th>
            <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Total</th>
        </tr>`;

        filtered.forEach((d, idx) => {
            let desc = '-', penerimaList = '';
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    desc = j.deskripsi || '-';
                    if (j.penerima) {
                        penerimaList = j.penerima.map(p => `${p.nama}: Rp ${formatRupiah(p.jumlah || 0)}`).join('<br>');
                    }
                }
            } catch (e) { }

            trs += `<tr>
                <td style="text-align:center; padding:5px; border:1px solid #000;">${idx + 1}</td>
                <td style="padding:5px; border:1px solid #000;">${d.tanggal}</td>
                <td style="padding:5px; border:1px solid #000;">${desc}</td>
                <td style="padding:5px; border:1px solid #000; font-size:9pt;">${penerimaList}</td>
                <td style="text-align:right; padding:5px; border:1px solid #000; font-weight:bold;">${formatRupiah(d.jumlah)}</td>
            </tr>`;
        });
        trs += `<tr>
            <td colspan="4" style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">TOTAL HONOR :</td>
            <td style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">${formatRupiah(totalUang)}</td>
        </tr>`;
    } else if (kat === 'Konsumsi') {
        thRow = `<tr>
            <th style="width:5%; border:1px solid #000; padding:5px; background:#f0f0f0;">No</th>
            <th style="width:12%; border:1px solid #000; padding:5px; background:#f0f0f0;">Tanggal</th>
            <th style="width:22%; border:1px solid #000; padding:5px; background:#f0f0f0;">Kegiatan</th>
            <th style="width:12%; border:1px solid #000; padding:5px; background:#f0f0f0;">Jenis</th>
            <th style="width:10%; border:1px solid #000; padding:5px; background:#f0f0f0;">Porsi</th>
            <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Harga Satuan</th>
            <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Total</th>
        </tr>`;

        filtered.forEach((d, idx) => {
            let jenis = '-', porsi = '-', hargaSatuan = 0;
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    jenis = j.jenis || '-';
                    porsi = j.porsi || '-';
                    hargaSatuan = j.harga_satuan || 0;
                }
            } catch (e) { }

            trs += `<tr>
                <td style="text-align:center; padding:5px; border:1px solid #000;">${idx + 1}</td>
                <td style="padding:5px; border:1px solid #000;">${d.tanggal}</td>
                <td style="padding:5px; border:1px solid #000;">${d.nama_item || '-'}</td>
                <td style="padding:5px; border:1px solid #000;">${jenis}</td>
                <td style="text-align:center; padding:5px; border:1px solid #000;">${porsi}</td>
                <td style="text-align:right; padding:5px; border:1px solid #000;">${formatRupiah(hargaSatuan)}</td>
                <td style="text-align:right; padding:5px; border:1px solid #000; font-weight:bold;">${formatRupiah(d.jumlah)}</td>
            </tr>`;
        });
        trs += `<tr>
            <td colspan="6" style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">TOTAL KONSUMSI :</td>
            <td style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">${formatRupiah(totalUang)}</td>
        </tr>`;
    } else {
        // Lainnya
        thRow = `<tr>
            <th style="width:5%; border:1px solid #000; padding:5px; background:#f0f0f0;">No</th>
            <th style="width:15%; border:1px solid #000; padding:5px; background:#f0f0f0;">Tanggal</th>
            <th style="width:30%; border:1px solid #000; padding:5px; background:#f0f0f0;">Nama Pengeluaran</th>
            <th style="width:20%; border:1px solid #000; padding:5px; background:#f0f0f0;">Nominal</th>
            <th style="width:30%; border:1px solid #000; padding:5px; background:#f0f0f0;">Catatan</th>
        </tr>`;

        filtered.forEach((d, idx) => {
            trs += `<tr>
                <td style="text-align:center; padding:5px; border:1px solid #000;">${idx + 1}</td>
                <td style="padding:5px; border:1px solid #000;">${d.tanggal}</td>
                <td style="padding:5px; border:1px solid #000;">${d.nama_item || '-'}</td>
                <td style="text-align:right; padding:5px; border:1px solid #000; font-weight:bold;">${formatRupiah(d.jumlah)}</td>
                <td style="padding:5px; border:1px solid #000;">${d.keterangan || '-'}</td>
            </tr>`;
        });
        trs += `<tr>
            <td colspan="3" style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">TOTAL PENGELUARAN LAINNYA :</td>
            <td style="text-align:right; font-weight:bold; padding:5px; border:1px solid #000;">${formatRupiah(totalUang)}</td>
            <td style="padding:5px; border:1px solid #000;"></td>
        </tr>`;
    }

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
            <div class="lpc-title">LAPORAN PENGELUARAN: ${kat.toUpperCase()}<br><span style="font-size:11pt; font-weight:normal;">Periode: ${periodeLabel} — Dicetak: ${today}</span></div>
            <table class="lpc-table" style="width:100%; border-collapse:collapse;">
                <thead>${thRow}</thead>
                <tbody>${trs}</tbody>
            </table>
            <div style="margin-top:30px; text-align:right; padding-right:40px;">
                <div style="font-size:10pt;">Babakan, ${today}</div>
                <div style="font-size:9pt; margin-top:2px;">Bendahara,</div>
                ${ttdHtml}
                <div style="font-size:10pt; font-weight:bold; text-decoration:underline;">${namaBendahara}</div>
            </div>
        </div>
    `;
    setTimeout(() => {
        window.print();
        setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 400);
}

const originalShowSectionKeuangan = window.showSection;
if (originalShowSectionKeuangan) {
    window.showSection = function (sectionId, element) {
        originalShowSectionKeuangan(sectionId, element);
        if (sectionId === 'sectionTransaksiOperasional') {
            switchOperasionalTab('pemasukan');
            fetchOperasionalData();
        }
        if (sectionId === 'sectionKeuanganInsidental') {
            tutupDetailTagihan('universal');
            fetchKasKeluar();
            renderMasterTagihanTable('universal');
        }
        if (sectionId === 'sectionKeuanganPendaftaran') { tutupDetailTagihan('pendaftaran'); renderMasterTagihanTable('pendaftaran'); loadActiveYear(); }
        if (sectionId === 'sectionBukuKasBendahara') {
            Promise.all([
                typeof fetchKeuanganData === 'function' ? fetchKeuanganData() : Promise.resolve(),
                typeof fetchKasKeluar === 'function' ? fetchKasKeluar() : Promise.resolve(),
                typeof fetchPengeluaranDinas === 'function' ? fetchPengeluaranDinas() : Promise.resolve(),
                typeof fetchOperasionalData === 'function' ? fetchOperasionalData() : Promise.resolve()
            ]).then(() => {
                switchBukuKasTab('kas_global');
                renderBukuKas();
            });
        }
        if (sectionId === 'sectionPengeluaranDinas') { fetchPengeluaranDinas().then(() => renderPengeluaranDinasTable()); }
        if (sectionId === 'sectionKasSekolah') { Promise.all([fetchKeuanganData(), fetchKasKeluar(), fetchPengeluaranDinas()]).then(() => renderKasSekolahTable()); }
        if (sectionId === 'sectionArsipTransaksi') { Promise.all([fetchKeuanganData(), fetchKasKeluar(), fetchPengeluaranDinas()]).then(() => renderArsipTransaksi()); }
        if (sectionId === 'sectionLaporanKeuangan') { Promise.all([fetchKeuanganData(), fetchPengeluaranDinas()]).then(() => switchLaporanTab('universal')); }
        if (sectionId === 'sectionPusatPengaturan') { switchPusatPengaturanTab('umum'); }
    };
}

// =========================================================================
// FITUR CETAK KARTU UJIAN
// =========================================================================

var dataSiswaCetak = [];

async function loadSiswaCetakKartu() {
    var selectedClasses = Array.from(document.querySelectorAll('.cb-kartu-kelas:checked')).map(cb => cb.value);
    var tbody = document.getElementById('kartuSiswaTbody');
    var container = document.getElementById('kartuTableContainer');

    if (selectedClasses.length === 0) {
        container.style.display = 'none';
        dataSiswaCetak = [];
        return;
    }

    container.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Memuat data siswa...</td></tr>';

    try {
        let listSiswa = [];
        const { data: kelasData, error: kelasErr } = await supabaseClient.from('master_kelas').select('id, nama_kelas').in('nama_kelas', selectedClasses);
        if (kelasErr) throw kelasErr;

        var kelasIds = kelasData.map(k => k.id);

        const { data: siswaData, error: siswaErr } = await supabaseClient
            .from('siswa')
            .select('id, nama_lengkap, jenis_kelamin, nisn, foto, kelas_id, master_kelas(nama_kelas)')
            .in('kelas_id', kelasIds)
            .eq('status', 'Aktif');
        if (siswaErr) throw siswaErr;

        listSiswa = siswaData || [];

        // Sort by kelas first, then alphabetical within each kelas
        listSiswa.sort((a, b) => {
            var kelasA = (a.master_kelas ? a.master_kelas.nama_kelas : '');
            var kelasB = (b.master_kelas ? b.master_kelas.nama_kelas : '');
            if (kelasA !== kelasB) return kelasA.localeCompare(kelasB);
            return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '');
        });

        var defaultRuang = document.getElementById('bulkRuangInput') ? document.getElementById('bulkRuangInput').value : '01';

        dataSiswaCetak = listSiswa.map((s, index) => {
            return {
                ...s,
                nomorPeserta: '', // Akan diset oleh renumberPerRuang
                kelasName: s.master_kelas ? s.master_kelas.nama_kelas : '',
                ruang: defaultRuang
            };
        });

        renumberPerRuang();
        renderTabelCetakKartu();

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger)">Gagal memuat siswa: ' + e.message + '</td></tr>';
    }
}

function renderTabelCetakKartu() {
    var tbody = document.getElementById('kartuSiswaTbody');
    if (dataSiswaCetak.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light)">Tidak ada siswa aktif di kelas ini.</td></tr>';
        return;
    }

    // reset select all checkbox
    var selectAll = document.getElementById('cbSiswaCetakAll');
    if (selectAll) selectAll.checked = true;

    tbody.innerHTML = dataSiswaCetak.map((s, i) => {
        return `
            <tr>
                <td style="text-align:center;"><input type="checkbox" class="cb-siswa-cetak" value="${s.id}" checked /></td>
                <td style="text-align:center;">${i + 1}</td>
                <td style="font-weight:600;">${s.nama_lengkap || '-'} <br><small style="color:#64748b; font-size:10px;">${s.kelasName || ''}</small></td>
                <td style="text-align:center;">${s.jenis_kelamin || '-'}</td>
                <td>
                    <input type="text" class="form-input" id="nomorPeserta_${s.id}" value="${s.nomorPeserta}" onchange="updateNomorPeserta('${s.id}', this.value)" style="height:35px; padding:0.3rem 0.6rem; max-width:150px; font-weight:700; font-family:monospace; font-size:1rem; text-align:center; color:#1e293b;" />
                </td>
                <td>
                    <input type="text" class="form-input" id="ruangPeserta_${s.id}" value="${s.ruang}" onchange="updateRuangPeserta('${s.id}', this.value)" style="height:35px; padding:0.3rem 0.6rem; max-width:60px; font-weight:700; text-align:center; color:#1e293b;" />
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
    if (siswa) siswa.nomorPeserta = val;
}

function updateRuangPeserta(id, val) {
    var siswa = dataSiswaCetak.find(s => s.id === id);
    if (siswa) siswa.ruang = val;
    renumberPerRuang();
    renderTabelCetakKartu();
}

function toggleAllSiswaCetak(checked) {
    var checkboxes = document.querySelectorAll('.cb-siswa-cetak');
    checkboxes.forEach(cb => cb.checked = checked);
}

function applyBulkRuang() {
    var newVal = document.getElementById('bulkRuangInput').value;
    var checkboxes = document.querySelectorAll('.cb-siswa-cetak:checked');
    if (checkboxes.length === 0) {
        showToast('Pilih minimal 1 siswa', 'error');
        return;
    }
    checkboxes.forEach(cb => {
        var id = cb.value;
        var siswa = dataSiswaCetak.find(s => s.id === id);
        if (siswa) siswa.ruang = newVal;
    });
    renumberPerRuang();
    renderTabelCetakKartu();
    showToast('Ruang berhasil diterapkan & nomor peserta di-reset per ruang', 'success');
}

// Renumber nomor peserta per ruang: setiap ruang mulai dari 001
function renumberPerRuang() {
    // Kelompokkan siswa berdasarkan ruang
    var ruangMap = {};
    dataSiswaCetak.forEach(s => {
        var r = s.ruang || '01';
        if (!ruangMap[r]) ruangMap[r] = [];
        ruangMap[r].push(s);
    });
    // Assign nomor urut per ruang
    Object.keys(ruangMap).forEach(r => {
        ruangMap[r].forEach((s, idx) => {
            s.nomorPeserta = (idx + 1).toString().padStart(3, '0');
        });
    });
}

function acakNomorPeserta() {
    if (dataSiswaCetak.length === 0) return;

    // Acak per ruang: setiap ruang diacak terpisah
    var ruangMap = {};
    dataSiswaCetak.forEach(s => {
        var r = s.ruang || '01';
        if (!ruangMap[r]) ruangMap[r] = [];
        ruangMap[r].push(s);
    });

    Object.keys(ruangMap).forEach(r => {
        var siswaInRoom = ruangMap[r];
        var numbers = siswaInRoom.map(s => s.nomorPeserta);
        // Fisher-Yates shuffle
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        siswaInRoom.forEach((s, i) => {
            s.nomorPeserta = numbers[i];
        });
    });

    renderTabelCetakKartu();
    showToast('Nomor peserta berhasil diacak per ruang!', 'success');
}

var kartuTtdBase64 = '';

// Kosongkan input form saat halaman pertama kali diload/direfresh
document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('kartuKetuaPanitia');
    if (el) el.value = '';
    localStorage.removeItem('kartuKetuaPanitia'); // Bersihkan sisa data sebelumnya
});

function handleTtdUpload(input) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
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
    var kelasName = siswa.kelasName || '-';
    var namaPanitia = document.getElementById('kartuKetuaPanitia').value || '______________________';
    var ruangUjian = siswa.ruang || '01';
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
    var newSesi = [{ waktu: '', mapel: '', pengawas: '', pengawas2: '', pengawas3: '' }];

    // Jika sudah ada hari sebelumnya, copy waktu sesi-nya
    if (jadwalUjianDays.length > 0) {
        var prevDay = jadwalUjianDays[jadwalUjianDays.length - 1];
        if (prevDay.sesi && prevDay.sesi.length > 0) {
            newSesi = prevDay.sesi.map(function (s) {
                return { waktu: s.waktu || '', mapel: '', pengawas: '', pengawas2: '', pengawas3: '' };
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
    jadwalUjianDays[dayIdx].sesi.push({ waktu: '', mapel: '', pengawas: '', pengawas2: '', pengawas3: '' });
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
    } catch (e) { return []; }
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
        function (namaJadwal) {
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
    var item = riwayat.find(function (r) { return r.id === id; });
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
    var item = riwayat.find(function (r) { return r.id === id; });
    if (!item) return;

    showCustomPrompt(
        'Ubah Nama Jadwal',
        'Masukkan nama baru untuk jadwal ini.',
        'Nama jadwal baru',
        item.nama,
        function (namaBaru) {
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
    riwayat = riwayat.filter(function (r) { return r.id !== id; });
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

    tbody.innerHTML = riwayat.map(function (r, i) {
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
    jadwalUjianDays.forEach(function (day, dIdx) {
        html += '<div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f8fafc;">';
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.8rem; flex-wrap:wrap; gap:0.5rem;">';
        html += '<div style="flex-grow:1; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">';
        html += '<label style="font-weight:600; font-size:0.9rem; color:#334155; margin:0; min-width:100px;">Pilih Tanggal:</label>';
        html += '<input type="date" class="form-input" style="height:34px; max-width:200px;" value="' + (day.hariRaw || '') + '" onchange="updateJadwalHari(' + dIdx + ', this.value)" />';
        html += '<span style="font-size:0.85rem; font-weight:600; color:#2563eb; margin-left:8px;">' + (day.hari || '') + '</span>';
        html += '</div>';
        html += '<button class="btn-icon btn-icon-red" onclick="hapusJadwalHari(' + dIdx + ')" title="Hapus Hari Ini"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>';
        html += '</div>';
        html += '<div style="padding-left:0.5rem; border-left:2px solid #e2e8f0;">';

        // Bangun opsi dropdown Mata Pelajaran dari master data
        var mapelOptions = '<option value="">-- Pilih Mapel --</option>';
        mapelOptions += '<option value="ISTIRAHAT">☕ ISTIRAHAT</option>';
        if (typeof masterMapelList !== 'undefined' && masterMapelList.length > 0) {
            masterMapelList.forEach(function (m) {
                mapelOptions += '<option value="' + m.nama_mapel + '">' + m.nama_mapel + '</option>';
            });
        }

        // Bangun opsi dropdown Pengawas dari data guru
        var pengawasOptions = '<option value="">-- Pilih Pengawas --</option>';
        if (typeof guruList !== 'undefined' && guruList.length > 0) {
            guruList.filter(function (g) { return g.status === 'Aktif'; }).forEach(function (g) {
                pengawasOptions += '<option value="' + g.nama_lengkap + '">' + g.nama_lengkap + '</option>';
            });
        }

        day.sesi.forEach(function (s, sIdx) {
            var mapelOpts = mapelOptions.replace('value="' + s.mapel + '"', 'value="' + s.mapel + '" selected');
            var pengawasOpts = pengawasOptions.replace('value="' + s.pengawas + '"', 'value="' + s.pengawas + '" selected');
            var pengawas2Opts = pengawasOptions.replace('value="' + (s.pengawas2 || '') + '"', 'value="' + (s.pengawas2 || '') + '" selected');
            var pengawas3Opts = pengawasOptions.replace('value="' + (s.pengawas3 || '') + '"', 'value="' + (s.pengawas3 || '') + '" selected');

            html += '<div class="jadwal-sesi-row" style="display:flex; flex-wrap:wrap; gap:6px; align-items:flex-end; margin-bottom:8px; padding:8px; background:#fff; border-radius:6px; border:1px solid #e2e8f0;">';
            html += '<div style="flex:1 1 120px; min-width:100px;"><label style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:2px;">Waktu</label>';
            html += '<input type="text" class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px; width:100%;" value="' + s.waktu + '" onchange="updateJadwalSesi(' + dIdx + ', ' + sIdx + ', \'waktu\', this.value)" placeholder="07:30-09:30" /></div>';
            html += '<div style="flex:1 1 140px; min-width:120px;"><label style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:2px;">Mata Pelajaran</label>';
            html += '<select class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px; width:100%;" onchange="updateJadwalSesi(' + dIdx + ', ' + sIdx + ', \'mapel\', this.value)">' + mapelOpts + '</select></div>';
            html += '<div style="flex:1 1 140px; min-width:120px;"><label style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:2px;">Pengawas (R.01)</label>';
            html += '<select class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px; width:100%;" onchange="updateJadwalSesi(' + dIdx + ', ' + sIdx + ', \'pengawas\', this.value)">' + pengawasOpts + '</select></div>';
            html += '<div style="flex:1 1 140px; min-width:120px;"><label style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:2px;">Pengawas (R.02)</label>';
            html += '<select class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px; width:100%;" onchange="updateJadwalSesi(' + dIdx + ', ' + sIdx + ', \'pengawas2\', this.value)">' + pengawas2Opts + '</select></div>';
            html += '<div style="flex:1 1 140px; min-width:120px;"><label style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:2px;">Pengawas (R.03)</label>';
            html += '<select class="form-input" style="height:38px; font-size:0.85rem; padding:4px 8px; width:100%;" onchange="updateJadwalSesi(' + dIdx + ', ' + sIdx + ', \'pengawas3\', this.value)">' + pengawas3Opts + '</select></div>';
            html += '<div style="flex:0 0 auto;"><button class="btn-icon btn-icon-red" onclick="hapusJadwalSesi(' + dIdx + ', ' + sIdx + ')" style="width:36px;height:36px;padding:0;" title="Hapus Sesi"><i data-lucide="x" style="width:14px;height:14px;"></i></button></div>';
            html += '</div>';
        });

        html += '<button class="btn btn-outline" style="font-size:0.8rem; padding:0.25rem 0.5rem;" onclick="tambahJadwalSesi(' + dIdx + ')"><i data-lucide="plus" style="width:12px;height:12px;"></i> Tambah Sesi</button>';
        html += '</div></div>';
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function buildJadwalHTML(siswa) {
    var judul = document.getElementById('kartuJudul').value || 'JADWAL UJIAN';
    var lblYear = document.getElementById('lblActiveYear');
    var tahun = lblYear ? lblYear.textContent : '2026/2027';

    var tableRows = '';
    var no = 1;

    // Validasi data: Hanya masukkan hari yang memiliki minimal 1 sesi valid
    var validDays = jadwalUjianDays.filter(function (day) {
        return day.hari.trim() !== '' || day.sesi.some(s => s.waktu || s.mapel);
    });

    if (validDays.length === 0) {
        tableRows = '<tr><td colspan="5" style="text-align:center; padding:8px; color:#94a3b8;">Jadwal belum diisi</td></tr>';
        var maxPengawas = 1;
    } else {
        var maxPengawas = 1;
        validDays.forEach(function (day) {
            day.sesi.forEach(function (s) {
                if (s.pengawas3) maxPengawas = Math.max(maxPengawas, 3);
                else if (s.pengawas2) maxPengawas = Math.max(maxPengawas, 2);
            });
        });

        validDays.forEach(function (day) {
            var sesiValid = day.sesi.filter(s => s.waktu || s.mapel || s.pengawas || s.pengawas2 || s.pengawas3);
            if (sesiValid.length === 0) return;

            // Gunakan rowspan untuk hari
            tableRows += '<tr>';
            tableRows += '<td rowspan="' + sesiValid.length + '" style="border: 1px solid #1e293b; padding: 1px; text-align:center; vertical-align:middle; font-weight:600;">' + no + '</td>';
            tableRows += '<td rowspan="' + sesiValid.length + '" style="border: 1px solid #1e293b; padding: 1px; vertical-align:middle; font-weight:600;">' + (day.hari || '-') + '</td>';

            sesiValid.forEach(function (s, idx) {
                if (idx > 0) tableRows += '<tr>'; // Buka row baru untuk sesi ke-2 dst

                var waktuText = s.waktu ? s.waktu : '-';
                var mapelText = s.mapel ? s.mapel : '-';
                var pengawasText = s.pengawas ? s.pengawas : '';
                var pengawas2Text = s.pengawas2 ? s.pengawas2 : '';
                var pengawas3Text = s.pengawas3 ? s.pengawas3 : '';

                // Jika mapel mengandung kata ISTIRAHAT, gabungkan kolom
                if (mapelText.toUpperCase().includes('ISTIRAHAT')) {
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; text-align:center; overflow:hidden;">' + waktuText + '</td>';
                    tableRows += '<td colspan="' + (1 + maxPengawas) + '" style="border: 1px solid #1e293b; padding: 1px; text-align:center; font-style:italic; font-weight:bold; background:#f1f5f9; overflow:hidden;">' + mapelText + '</td>';
                } else {
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; text-align:center; overflow:hidden;">' + waktuText + '</td>';
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; overflow:hidden; word-break:break-word;">' + mapelText + '</td>';
                    tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; overflow:hidden; word-break:break-word;">' + pengawasText + '</td>';
                    if (maxPengawas > 1) {
                        tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; overflow:hidden; word-break:break-word;">' + pengawas2Text + '</td>';
                    }
                    if (maxPengawas > 2) {
                        tableRows += '<td style="border: 1px solid #1e293b; padding: 1px; overflow:hidden; word-break:break-word;">' + pengawas3Text + '</td>';
                    }
                }

                tableRows += '</tr>';
            });
            no++;
        });
    }

    var headerPengawas = '';
    if (maxPengawas === 1) {
        headerPengawas = `
                    <tr>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:12px; text-align:center;">No</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:44px; text-align:center;">Hari/Tanggal</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:38px; text-align:center;">Waktu</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; width:56px; text-align:center;">Mata Pelajaran</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; text-align:center;">Pengawas (R.01)</th>
                    </tr>
        `;
    } else {
        headerPengawas = `
                    <tr>
                        <th rowspan="2" style="border: 1px solid #1e293b; padding: 1px; width:12px; text-align:center; vertical-align:middle;">No</th>
                        <th rowspan="2" style="border: 1px solid #1e293b; padding: 1px; width:44px; text-align:center; vertical-align:middle;">Hari/Tanggal</th>
                        <th rowspan="2" style="border: 1px solid #1e293b; padding: 1px; width:38px; text-align:center; vertical-align:middle;">Waktu</th>
                        <th rowspan="2" style="border: 1px solid #1e293b; padding: 1px; width:56px; text-align:center; vertical-align:middle;">Mata Pelajaran</th>
                        <th colspan="${maxPengawas}" style="border: 1px solid #1e293b; padding: 1px; text-align:center;">Pengawas</th>
                    </tr>
                    <tr>
                        <th style="border: 1px solid #1e293b; padding: 1px; text-align:center;">R.01</th>
                        <th style="border: 1px solid #1e293b; padding: 1px; text-align:center;">R.02</th>
                        ${maxPengawas > 2 ? '<th style="border: 1px solid #1e293b; padding: 1px; text-align:center;">R.03</th>' : ''}
                    </tr>
        `;
    }

    return `
        <div class="kartu-ujian" style="display:flex; flex-direction:column; justify-content:flex-start; align-items:center; padding: 8px 10px;">
            <div class="kartu-jadwal" style="width: 100%;">
                <div class="jadwal-title" style="margin-top:0; margin-bottom:0px; font-size:9px; text-align:center; font-weight:800; color:var(--primary-dark); text-transform:uppercase;">JADWAL ${judul}</div>
                <div style="font-size:10px; text-align:center; font-weight:800; color:#b45309; margin-bottom:0px;">SMP IT AL FATHONAH BABAKAN</div>
                <div style="font-size:7.5px; text-align:center; font-weight:600; color:#475569; margin-bottom:4px;">TAHUN PELAJARAN ${tahun}</div>
            <table class="jadwal-table" style="width: 100%; border-collapse: collapse; font-size: 6px; line-height: 1.05; table-layout: fixed;">
                <thead>
                    ${headerPengawas}
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
    if (!siswa) return;

    var html = buildKartuHTML(siswa);
    preparePrint(html);
}

function cetakSemuaKartu() {
    var checkedIds = Array.from(document.querySelectorAll('.cb-siswa-cetak:checked')).map(cb => cb.value);
    var siswaToprint = dataSiswaCetak.filter(s => checkedIds.includes(s.id));

    if (siswaToprint.length === 0) {
        showToast('Pilih minimal 1 siswa untuk dicetak!', 'warning');
        return;
    }

    // Cetak semua kartu depan
    var htmlDepan = '';
    siswaToprint.forEach(siswa => {
        htmlDepan += buildKartuHTML(siswa);
    });

    preparePrint(htmlDepan);
}

function cetakSemuaJadwal() {
    var checkedIds = Array.from(document.querySelectorAll('.cb-siswa-cetak:checked')).map(cb => cb.value);
    var siswaToprint = dataSiswaCetak.filter(s => checkedIds.includes(s.id));

    if (siswaToprint.length === 0) {
        showToast('Pilih minimal 1 siswa untuk dicetak!', 'warning');
        return;
    }

    // Cetak semua kartu belakang
    // PENTING: Urutan kartu di-mirror per baris (tukar kolom 1 ↔ 2)
    // agar presisi saat kertas dibalik untuk cetak bolak-balik manual.
    // Depan: [1][2] → Belakang (kertas dibalik): [2][1]
    //        [3][4]                                [4][3]

    var jadwalCards = [];
    siswaToprint.forEach(siswa => {
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
// TRANSAKSI OPERASIONAL
// ============================================================
let dOperasional = [];
let currentOperasionalTab = 'pemasukan';

function switchOperasionalTab(tab) {
    currentOperasionalTab = tab;

    // Update Buttons
    let btnPemasukan = document.getElementById('tabBtnOperasionalPemasukan');
    let btnPengeluaran = document.getElementById('tabBtnOperasionalPengeluaran');

    if (btnPemasukan) {
        btnPemasukan.style.background = tab === 'pemasukan' ? '#10b981' : 'transparent';
        btnPemasukan.style.color = tab === 'pemasukan' ? 'white' : 'var(--text-light)';
    }

    if (btnPengeluaran) {
        btnPengeluaran.style.background = tab === 'pengeluaran' ? '#ef4444' : 'transparent';
        btnPengeluaran.style.color = tab === 'pengeluaran' ? 'white' : 'var(--text-light)';
    }

    // Update Content
    let tabPemasukan = document.getElementById('tabOperasionalPemasukan');
    let tabPengeluaran = document.getElementById('tabOperasionalPengeluaran');

    if (tabPemasukan) tabPemasukan.style.display = tab === 'pemasukan' ? 'block' : 'none';
    if (tabPengeluaran) tabPengeluaran.style.display = tab === 'pengeluaran' ? 'block' : 'none';

    if (tab === 'pemasukan') {
        renderOperasionalPemasukanTable();
    } else {
        let selectedKat = document.getElementById('selectKategoriPengeluaran');
        if (selectedKat) {
            switchOpKategoriPengeluaran(selectedKat.value);
        } else {
            renderOperasionalPengeluaranSummary();
        }
    }
}

function openOperasionalPemasukanModal() {
    let tglEl = document.getElementById('formOpMasukTanggal');
    if (tglEl) tglEl.value = new Date().toISOString().split('T')[0];
    let jmlEl = document.getElementById('formOpMasukJumlah');
    if (jmlEl) jmlEl.value = '';
    let ketEl = document.getElementById('formOpMasukKet');
    if (ketEl) ketEl.value = '';

    let modal = document.getElementById('operasionalPemasukanModal');
    if (modal) modal.classList.add('active');
}

function closeOperasionalPemasukanModal() {
    let modal = document.getElementById('operasionalPemasukanModal');
    if (modal) modal.classList.remove('active');
}

function switchOpKategoriPengeluaran(kategori) {
    let container = document.getElementById('opKategoriContentContainer');
    if (!container) return;
    if (!kategori) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    let title = document.getElementById('opKategoriTableTitle');
    if (title) title.innerText = 'Riwayat Pengeluaran - ' + kategori;

    // Set column headers
    let thead = document.getElementById('theadOpKategori');
    if (thead) {
        if (kategori === 'Honor') {
            thead.innerHTML = `
                <tr>
                    <th style="width:50px; text-align:center;">No</th>
                    <th style="width:150px; text-align:center;">Tanggal</th>
                    <th style="text-align:center;">Keterangan / Detail</th>
                    <th style="width:200px; text-align:center;">Total Jumlah</th>
                    <th style="width:140px; text-align:center;">Aksi</th>
                </tr>
            `;
        } else if (kategori === 'Ekstrakurikuler') {
            thead.innerHTML = `
                <tr>
                    <th style="width:50px; text-align:center;">No</th>
                    <th style="width:150px; text-align:center;">Tanggal</th>
                    <th style="width:200px; text-align:center;">Nama Pelatih</th>
                    <th style="text-align:center;">Keterangan / Detail</th>
                    <th style="width:150px; text-align:center;">Jumlah</th>
                    <th style="width:140px; text-align:center;">Aksi</th>
                </tr>
            `;
        } else if (kategori === 'Utilitas (listrik & wifi)') {
            thead.innerHTML = `
                <tr>
                    <th style="width:50px; text-align:center;">No</th>
                    <th style="width:150px; text-align:center;">Tanggal</th>
                    <th style="text-align:center;">Keterangan</th>
                    <th style="width:200px; text-align:center;">Jumlah Pembayaran</th>
                    <th style="width:140px; text-align:center;">Aksi</th>
                </tr>
            `;
        } else if (kategori === 'Alat Tulis Kantor (ATK)') {
            thead.innerHTML = `
                <tr>
                    <th style="width:50px; text-align:center;">No</th>
                    <th style="width:150px; text-align:center;">Tanggal</th>
                    <th style="text-align:center;">Keterangan</th>
                    <th style="width:200px; text-align:center;">Total Jumlah</th>
                    <th style="width:140px; text-align:center;">Aksi</th>
                </tr>
            `;
        } else if (kategori === 'Perjalanan Dinas') {
            thead.innerHTML = `
                <tr>
                    <th style="width:50px; text-align:center;">No</th>
                    <th style="width:250px; text-align:center;">Waktu & Tujuan</th>
                    <th style="text-align:center;">Agenda / Acara</th>
                    <th style="width:200px; text-align:center;">Total Pengeluaran</th>
                    <th style="width:140px; text-align:center;">Aksi</th>
                </tr>
            `;
        } else if (kategori === 'Lainnya') {
            thead.innerHTML = `
                <tr>
                    <th style="width:50px; text-align:center;">No</th>
                    <th style="width:150px; text-align:center;">Tanggal</th>
                    <th style="text-align:center;">Keterangan</th>
                    <th style="width:200px; text-align:center;">Total Jumlah</th>
                    <th style="width:140px; text-align:center;">Aksi</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th style="width:50px; text-align:center;">No</th>
                    <th style="width:150px; text-align:center;">Tanggal</th>
                    <th style="text-align:center;">Keterangan / Detail</th>
                    <th style="width:200px; text-align:center;">Jumlah</th>
                    <th style="width:140px; text-align:center;">Aksi</th>
                </tr>
            `;
        }
    }

    window.currentOpKategori = kategori;
    renderOpKategoriTable();
}

function renderOpKategoriTable() {
    renderOperasionalPengeluaranSummary();

    let tbody = document.getElementById('tbodyOpKategori');
    if (!tbody) return;
    let kat = window.currentOpKategori;
    if (!kat) return;

    let filtered = dOperasional.filter(x => x.jenis_transaksi === 'Pengeluaran' && x.kategori === kat);

    let search = document.getElementById('searchOpKategori')?.value.toLowerCase() || "";
    let filterBulan = document.getElementById('filterBulanOpKategori')?.value || "";

    if (search) {
        filtered = filtered.filter(x => (x.keterangan || "").toLowerCase().includes(search));
    }
    if (filterBulan) {
        let year = filterBulan.split('-')[0];
        let month = filterBulan.split('-')[1];
        filtered = filtered.filter(x => x.tanggal && x.tanggal.startsWith(`${year}-${month}`));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">Belum ada data pengeluaran untuk kategori ini.</td></tr>';
        return;
    }

    let html = '';
    let total = 0;
    filtered.forEach((d, i) => {
        let amt = parseInt(d.nominal) || 0;
        total += amt;

        if (kat === 'Honor') {
            let info = "Detail Honor";
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    info = j.deskripsi || "Pembayaran Honor";
                } else {
                    info = d.keterangan || "-";
                }
            } catch (e) { info = d.keterangan || "-"; }

            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td>${info}</td>
                <td style="text-align:right; font-weight:600;">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-primary" style="padding:0.4rem; margin-right:4px;" onclick="viewDetailHonor('${d.id}')" title="Detail Honor">
                        <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn" style="padding:0.4rem; margin-right:4px; background-color:#eab308; color:white; border-color:#eab308;" onclick="editOperasional('${d.id}')" title="Edit">
                        <i data-lucide="edit" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem;" onclick="deleteOperasional('${d.id}')">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            </tr>`;
        } else if (kat === 'Ekstrakurikuler') {
            let pelatih = "-";
            let ket = d.keterangan || "-";
            if (ket.startsWith("Pelatih: ")) {
                let parts = ket.split(" | Ket: ");
                pelatih = parts[0].replace("Pelatih: ", "");
                if (parts.length > 1) ket = parts[1];
                else ket = "-";
            }
            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td>${pelatih}</td>
                <td>${ket}</td>
                <td style="text-align:right; font-weight:600;">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-primary" style="padding:0.4rem; margin-right:4px;" onclick="viewDetailEkskul('${d.id}')" title="Detail Ekskul">
                        <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn" style="padding:0.4rem; margin-right:4px; background-color:#eab308; color:white; border-color:#eab308;" onclick="editOperasional('${d.id}')" title="Edit">
                        <i data-lucide="edit" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem;" onclick="deleteOperasional('${d.id}')">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            </tr>`;
        } else if (kat === 'Utilitas (listrik & wifi)') {
            let info = d.keterangan || "-";
            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td>${info}</td>
                <td style="text-align:right; font-weight:600;">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-primary" style="padding:0.4rem; margin-right:4px;" onclick="viewDetailUtilitas('${d.id}')" title="Detail">
                        <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn" style="padding:0.4rem; margin-right:4px; background-color:#eab308; color:white; border-color:#eab308;" onclick="editOperasional('${d.id}')" title="Edit">
                        <i data-lucide="edit" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem;" onclick="deleteOperasional('${d.id}')">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            </tr>`;
        } else if (kat === 'Alat Tulis Kantor (ATK)') {
            let info = d.keterangan || "-";
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    info = j.deskripsi || "Pembelian ATK";
                }
            } catch (e) { info = d.keterangan || "-"; }

            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td>${info}</td>
                <td style="text-align:right; font-weight:600;">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-primary" style="padding:0.4rem; margin-right:4px;" onclick="viewDetailAtk('${d.id}')" title="Detail ATK">
                        <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn" style="padding:0.4rem; margin-right:4px; background-color:#eab308; color:white; border-color:#eab308;" onclick="editOperasional('${d.id}')" title="Edit">
                        <i data-lucide="edit" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem;" onclick="deleteOperasional('${d.id}')">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            </tr>`;
        } else if (kat === 'Perjalanan Dinas') {
            let info = "-";
            let agenda = "-";
            let tujuan = "-";
            let waktu = formatTanggalIndo(d.tanggal);
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    agenda = j.agenda || "-";
                    tujuan = j.tujuan || "-";
                    if (j.tanggal_kembali) waktu += " - " + formatTanggalIndo(j.tanggal_kembali);
                } else {
                    agenda = d.keterangan || "-";
                }
            } catch (e) { agenda = d.keterangan || "-"; }

            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>
                    <div style="font-weight:600; margin-bottom:4px;">${tujuan}</div>
                    <div style="font-size:0.85rem; color:var(--text-light);"><i data-lucide="calendar" style="width:12px;height:12px;margin-right:2px;vertical-align:-2px;"></i> ${waktu}</div>
                </td>
                <td>${agenda}</td>
                <td style="text-align:right; font-weight:600;">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-primary" style="padding:0.4rem; margin-right:4px;" onclick="viewDetailDinas('${d.id}')" title="Detail Dinas">
                        <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn" style="padding:0.4rem; margin-right:4px; background-color:#eab308; color:white; border-color:#eab308;" onclick="editOperasional('${d.id}')" title="Edit">
                        <i data-lucide="edit" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem;" onclick="deleteOperasional('${d.id}')">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            </tr>`;
        } else if (kat === 'Lainnya') {
            let info = d.keterangan || "-";
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    info = j.deskripsi || "Pengeluaran Lainnya";
                }
            } catch (e) { info = d.keterangan || "-"; }

            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td>${info}</td>
                <td style="text-align:right; font-weight:600;">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-primary" style="padding:0.4rem; margin-right:4px;" onclick="viewDetailLainnya('${d.id}')" title="Detail">
                        <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn" style="padding:0.4rem; margin-right:4px; background-color:#eab308; color:white; border-color:#eab308;" onclick="editOperasional('${d.id}')" title="Edit">
                        <i data-lucide="edit" style="width:16px;height:16px;color:white;"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem;" onclick="deleteOperasional('${d.id}')">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            </tr>`;
        } else {
            html += `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${formatTanggalIndo(d.tanggal)}</td>
                <td>${d.keterangan || "-"}</td>
                <td style="text-align:right; font-weight:600;">Rp ${formatRupiah(amt)}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-primary" style="padding:0.4rem; margin-right:4px;" onclick="viewDetailUtilitas(\'${d.id}\')" title="Detail Utilitas">
                        <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                    <button class="btn" style="padding:0.4rem; margin-right:4px; background-color:#eab308; color:white; border-color:#eab308;" onclick="editOperasional(\'${d.id}\')" title="Edit">
                        <i data-lucide="edit" style="width:16px;height:16px;color:white;"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem;" onclick="deleteOperasional('${d.id}')">
                        <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                    </button>
                </td>
            </tr>`;
        }
    });

    html += `
        <tr style="background:#f8fafc;">
            <td colspan="3" style="text-align:right; font-weight:bold;">Total ${kat}</td>
            <td colspan="2" style="text-align:right; font-weight:bold; color:var(--primary-dark);">Rp ${formatRupiah(total)}</td>
        </tr>
    `;

    tbody.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
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
        if (currentOperasionalTab === 'pengeluaran') {
            let selectedKat = document.getElementById('selectKategoriPengeluaran');
            if (selectedKat) switchOpKategoriPengeluaran(selectedKat.value);
            else renderOperasionalPengeluaranSummary();
        }

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
            (x.kategori || '').toLowerCase().includes(search) ||
            (x.keterangan || '').toLowerCase().includes(search)
        );
    }

    if (filterBulan) {
        filtered = filtered.filter(x => {
            if (!x.tanggal) return false;
            return x.tanggal.startsWith(filterBulan);
        });
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
            <td>${formatTanggalIndo(d.tanggal)}</td>
            <td>${d.kategori || 'Dana BOS'}</td>
            <td>${d.keterangan || '-'}</td>
            <td style="color:var(--success); font-weight:600;">+ Rp ${formatRupiah(amt)}</td>
            <td style="text-align:right;">
                <button class="btn btn-sm btn-danger" onclick="deleteOperasional('${d.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
            </td>
        </tr>`;
    });

    if (filtered.length === 0) trs = '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:2rem;">Belum ada data pemasukan operasional</td></tr>';
    tbody.innerHTML = trs;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Summary
    let summaryDiv = document.getElementById('operasionalPemasukanSummary');
    if (summaryDiv) {
        let maxTrx = filtered.length > 0 ? Math.max(...filtered.map(x => parseInt(x.nominal) || 0)) : 0;
        summaryDiv.innerHTML = `
            <div class="card" style="padding:1rem; border-left:4px solid var(--success);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Pemasukan</div>
                <div style="font-size:1.2rem; font-weight:bold; color:var(--text-dark);">Rp ${formatRupiah(total)}</div>
            </div>
            <div class="card" style="padding:1rem; border-left:4px solid var(--primary);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
                <div style="font-size:1.2rem; font-weight:bold; color:var(--text-dark);">Rp ${formatRupiah(currMonthTotal)}</div>
            </div>
            <div class="card" style="padding:1rem; border-left:4px solid var(--warning);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
                <div style="font-size:1.2rem; font-weight:bold; color:var(--text-dark);">${filtered.length}</div>
            </div>
            <div class="card" style="padding:1rem; border-left:4px solid var(--info);">
                <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Pemasukan Terbesar</div>
                <div style="font-size:1.2rem; font-weight:bold; color:var(--text-dark);">Rp ${formatRupiah(maxTrx)}</div>
            </div>
        `;
    }
}

function renderOperasionalPengeluaranSummary() {
    let summaryDiv = document.getElementById('operasionalPengeluaranSummary');
    if (!summaryDiv) return;

    // We do not filter by search for the global summary, or maybe we do? 
    // Usually summaries should show global stats unaffected by text search of a specific category, 
    // but we can filter by type "Pengeluaran"
    let filtered = dOperasional.filter(x => x.jenis_transaksi === 'Pengeluaran');

    let total = 0;
    let currMonthTotal = 0;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    filtered.forEach(d => {
        let amt = parseInt(d.nominal) || 0;
        total += amt;
        let dDate = new Date(d.tanggal);
        if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
            currMonthTotal += amt;
        }
    });

    // Hitung statistik per kategori
    let categorySums = {};
    filtered.forEach(x => {
        let kat = x.kategori || 'Lainnya';
        categorySums[kat] = (categorySums[kat] || 0) + (parseInt(x.nominal) || 0);
    });

    let catHtml = '';
    let colors = ['#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#10b981'];
    let cIdx = 0;

    // Urutkan kategori berdasarkan pengeluaran terbesar
    let sortedCats = Object.entries(categorySums).sort((a, b) => b[1] - a[1]);

    sortedCats.forEach(([kat, sum]) => {
        let col = colors[cIdx % colors.length];
        catHtml += `
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid ${col};">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${kat}">${kat}</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">Rp ${formatRupiah(sum)}</div>
        </div>`;
        cIdx++;
    });

    let topKat = sortedCats.length > 0 ? sortedCats[0][0] : '-';

    summaryDiv.innerHTML = `
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #ef4444;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Kas Keluar</div>
            <div style="font-size:1.3rem; font-weight:700; color:#ef4444;">Rp ${formatRupiah(total)}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #f59e0b;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Bulan Ini</div>
            <div style="font-size:1.3rem; font-weight:700; color:#f59e0b;">Rp ${formatRupiah(currMonthTotal)}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid var(--primary);">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Total Transaksi</div>
            <div style="font-size:1.3rem; font-weight:700; color:var(--text-dark);">${filtered.length}</div>
        </div>
        <div style="background:var(--bg-lighter); border-radius:12px; padding:1rem 1.2rem; border-left:4px solid #8b5cf6;">
            <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:4px;">Terbanyak</div>
            <div style="font-size:1rem; font-weight:700; color:#8b5cf6;">${topKat}</div>
        </div>
        ${catHtml}
    `;
}

async function saveOperasionalPemasukan() {
    let tgl = document.getElementById('formOpMasukTanggal').value;
    let jumlah = document.getElementById('formOpMasukJumlah').value;
    let ket = document.getElementById('formOpMasukKet').value;

    if (!tgl || !jumlah) {
        showToast('Tanggal dan Jumlah harus diisi!', 'warning');
        return;
    }

    let btn = document.querySelector('button[onclick="saveOperasionalPemasukan()"]');
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
        if (error) throw error;

        if (data && data.length > 0) dOperasional.unshift(data[0]);
        renderOperasionalPemasukanTable();

        document.getElementById('formOpMasukTanggal').value = '';
        document.getElementById('formOpMasukJumlah').value = '';
        document.getElementById('formOpMasukKet').value = '';
        closeOperasionalPemasukanModal();
        showToast('Pemasukan operasional berhasil disimpan!', 'success');
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = 'Simpan Pemasukan'; btn.disabled = false;
    }
}

function openOperasionalPengeluaranModal() {
    let kat = window.currentOpKategori || '';
    if (!kat) {
        showToast('Pilih kategori pengeluaran terlebih dahulu!', 'warning');
        return;
    }

    if (kat === 'Honor') {
        window.honorSource = 'Operasional';
        openHonorModal();
        return;
    } else if (kat === 'Ekstrakurikuler') {
        openEkskulPengeluaranModal();
        return;
    } else if (kat === 'Utilitas (listrik & wifi)') {
        openUtilitasModal();
        return;
    } else if (kat === 'Alat Tulis Kantor (ATK)') {
        openAtkModal();
        return;
    } else if (kat === 'Perjalanan Dinas') {
        openDinasModal();
        return;
    } else if (kat === 'Lainnya') {
        openLainnyaModal();
        return;
    }

    let body = document.getElementById('opKeluarModalBody');
    if (body) {
        body.innerHTML = `
            <input type="hidden" id="formOpKeluarKategori" value="${kat}">
            <div class="form-group" style="margin-bottom:1rem;">
                <label class="form-label">Tanggal Pengeluaran <span style="color:red;">*</span></label>
                <input type="date" id="formOpKeluarTanggal" class="form-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group" style="margin-bottom:1rem;">
                <label class="form-label">Jumlah / Nominal (Rp) <span style="color:red;">*</span></label>
                <input type="number" id="formOpKeluarJumlah" class="form-input" placeholder="0">
            </div>
            <div class="form-group" style="margin-bottom:1rem;">
                <label class="form-label">Keterangan / Detail <span style="color:red;">*</span></label>
                <input type="text" id="formOpKeluarKeterangan" class="form-input" placeholder="Contoh: Beli spidol dan kertas">
            </div>
        `;
    }

    let title = document.getElementById('opKeluarModalTitle');
    if (title) title.innerText = 'Catat Pengeluaran: ' + kat;

    document.getElementById('operasionalPengeluaranModal').classList.add('active');
}

function closeOperasionalPengeluaranModal() {
    document.getElementById('operasionalPengeluaranModal').classList.remove('active');
}

async function saveOperasionalPengeluaran() {
    let kat = document.getElementById('formOpKeluarKategori').value;
    let tgl = document.getElementById('formOpKeluarTanggal').value;
    let jumlah = document.getElementById('formOpKeluarJumlah').value;
    let ket = document.getElementById('formOpKeluarKeterangan').value;

    if (!kat || !tgl || !jumlah || !ket) {
        showToast('Kategori, Tanggal, Jumlah, dan Keterangan harus diisi!', 'warning');
        return;
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
            keterangan: ket
        };

        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if (error) throw error;

        if (data && data.length > 0) dOperasional.unshift(data[0]);
        renderOpKategoriTable();
        closeOperasionalPengeluaranModal();
        showToast('Pengeluaran operasional berhasil dicatat!', 'success');

    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = oldTxt; btn.disabled = false;
    }
}

function deleteOperasional(id) {
    showCustomConfirm('Hapus Transaksi?', 'Hapus transaksi operasional ini?', 'Ya, Hapus', async function () {
        try {
            let { error } = await supabaseClient.from('buku_kas_bendahara').delete().eq('id', id);
            if (error) throw error;

            dOperasional = dOperasional.filter(x => x.id !== id);
            if (currentOperasionalTab === 'pemasukan') renderOperasionalPemasukanTable();
            if (currentOperasionalTab === 'pengeluaran') renderOpKategoriTable();
            if (typeof updateOperasionalSummary === 'function') updateOperasionalSummary();
            showToast('Transaksi berhasil dihapus!', 'success');
        } catch (e) {
            showToast('Gagal menghapus: ' + e.message, 'error');
        }
    });
}

function printLaporanOperasional() {
    let kat = window.currentOpKategori || '';
    let title = '';
    let theadHTML = '';
    let colCount = 5; // default jumlah kolom

    if (currentOperasionalTab === 'pemasukan') {
        title = 'Riwayat Pemasukan Transaksi Operasional (Dana BOS)';
    } else {
        if (!kat) {
            showToast('Pilih kategori pengeluaran terlebih dahulu!', 'warning');
            return;
        }
        title = 'Riwayat Pengeluaran - ' + kat;
    }

    let filtered = dOperasional.filter(x => x.jenis_transaksi === (currentOperasionalTab === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'));

    // Filter by kategori jika pengeluaran
    if (currentOperasionalTab !== 'pemasukan') {
        filtered = filtered.filter(x => x.kategori === kat);
    }

    // Terapkan filter pencarian & bulan
    let search = '';
    let filterBulan = '';

    if (currentOperasionalTab === 'pemasukan') {
        search = (document.getElementById('searchOpPemasukan')?.value || '').toLowerCase();
        filterBulan = document.getElementById('filterBulanOpPemasukan')?.value || '';
    } else {
        search = (document.getElementById('searchOpKategori')?.value || '').toLowerCase();
        filterBulan = document.getElementById('filterBulanOpKategori')?.value || '';
    }

    if (search) {
        filtered = filtered.filter(x =>
            (x.kategori || '').toLowerCase().includes(search) ||
            (x.keterangan || '').toLowerCase().includes(search)
        );
    }

    if (filterBulan) {
        filtered = filtered.filter(x => {
            if (!x.tanggal) return false;
            return x.tanggal.startsWith(filterBulan);
        });
    }

    let tbody = '';
    let total = 0;
    let cs = 'border:1px solid #000; padding:5px;'; // cell style

    if (currentOperasionalTab === 'pemasukan') {
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Tanggal</th>
                <th style="${cs}">Sumber Dana</th>
                <th style="${cs}">Keterangan</th>
                <th style="${cs} text-align:right;">Jumlah</th>
            </tr>`;
        colCount = 5;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${formatTanggalIndo(d.tanggal)}</td>
                <td style="${cs}">${d.kategori || '-'}</td>
                <td style="${cs}">${d.keterangan || '-'}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="4" style="${cs} text-align:right; font-weight:bold;">TOTAL</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else if (kat === 'Honor') {
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Tanggal Dibayarkan</th>
                <th style="${cs}">Penerima</th>
                <th style="${cs}">Keterangan</th>
                <th style="${cs} text-align:right;">Total Honor</th>
            </tr>`;
        colCount = 5;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            let penerima = '-';
            let ket = d.keterangan || '-';
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    if (j.recipients && j.recipients.length > 0) {
                        penerima = j.recipients.map(r => r.nama).join(', ');
                    }
                    ket = j.deskripsi || '-';
                }
            } catch (e) { }
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${formatTanggalIndo(d.tanggal)}</td>
                <td style="${cs}">${penerima}</td>
                <td style="${cs}">${ket}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="4" style="${cs} text-align:right; font-weight:bold;">TOTAL HONOR</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else if (kat === 'Ekstrakurikuler') {
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Tanggal</th>
                <th style="${cs}">Pelatih / Pengajar</th>
                <th style="${cs}">Keterangan</th>
                <th style="${cs} text-align:right;">Jumlah</th>
            </tr>`;
        colCount = 5;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            let pelatih = '-';
            let ket = d.keterangan || '-';
            if (ket.startsWith("Pelatih: ")) {
                let parts = ket.split(" | Ket: ");
                pelatih = parts[0].replace("Pelatih: ", "");
                ket = parts.length > 1 ? parts[1] : '-';
            }
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${formatTanggalIndo(d.tanggal)}</td>
                <td style="${cs}">${pelatih}</td>
                <td style="${cs}">${ket}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="4" style="${cs} text-align:right; font-weight:bold;">TOTAL EKSTRAKURIKULER</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else if (kat === 'Utilitas (listrik & wifi)') {
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Tanggal Pembayaran</th>
                <th style="${cs}">Keterangan</th>
                <th style="${cs} text-align:right;">Jumlah Pembayaran</th>
            </tr>`;
        colCount = 4;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${formatTanggalIndo(d.tanggal)}</td>
                <td style="${cs}">${d.keterangan || '-'}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="3" style="${cs} text-align:right; font-weight:bold;">TOTAL UTILITAS</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else if (kat === 'Alat Tulis Kantor (ATK)') {
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Tanggal</th>
                <th style="${cs}">Rincian Barang</th>
                <th style="${cs}">Keterangan</th>
                <th style="${cs} text-align:right;">Total Jumlah</th>
            </tr>`;
        colCount = 5;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            let info = d.keterangan || '-';
            let rincian = '-';
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    info = j.deskripsi || '-';
                    if (j.items && j.items.length > 0) {
                        rincian = j.items.map(it => it.nama + ' (Rp ' + formatRupiah(parseInt(it.harga) || 0) + ')').join(', ');
                    }
                }
            } catch (e) { }
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${formatTanggalIndo(d.tanggal)}</td>
                <td style="${cs} font-size:12px;">${rincian}</td>
                <td style="${cs}">${info}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="4" style="${cs} text-align:right; font-weight:bold;">TOTAL ATK</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else if (kat === 'Perjalanan Dinas') {
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Waktu</th>
                <th style="${cs}">Tujuan</th>
                <th style="${cs}">Agenda</th>
                <th style="${cs}">Peserta</th>
                <th style="${cs} text-align:right;">Total Pengeluaran</th>
            </tr>`;
        colCount = 6;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            let tujuan = '-', agenda = '-', peserta = '-';
            let waktu = formatTanggalIndo(d.tanggal);
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    tujuan = j.tujuan || '-';
                    agenda = j.agenda || '-';
                    if (j.tanggal_kembali) waktu += ' s/d ' + formatTanggalIndo(j.tanggal_kembali);
                    let pList = j.peserta || j.penerima || [];
                    if (pList.length > 0) {
                        peserta = pList.map(p => typeof p === 'string' ? p : p.nama).join(', ');
                    }
                }
            } catch (e) { }
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${waktu}</td>
                <td style="${cs}">${tujuan}</td>
                <td style="${cs}">${agenda}</td>
                <td style="${cs}">${peserta}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="5" style="${cs} text-align:right; font-weight:bold;">TOTAL PERJALANAN DINAS</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else if (kat === 'Lainnya') {
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Tanggal</th>
                <th style="${cs}">Rincian Barang</th>
                <th style="${cs}">Keterangan</th>
                <th style="${cs} text-align:right;">Total Jumlah</th>
            </tr>`;
        colCount = 5;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            let info = d.keterangan || '-';
            let rincian = '-';
            try {
                if (d.keterangan && d.keterangan.startsWith('{')) {
                    let j = JSON.parse(d.keterangan);
                    info = j.deskripsi || '-';
                    if (j.items && j.items.length > 0) {
                        rincian = j.items.map(it => it.nama + ' (Rp ' + formatRupiah(parseInt(it.harga) || 0) + ')').join(', ');
                    }
                }
            } catch (e) { }
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${formatTanggalIndo(d.tanggal)}</td>
                <td style="${cs} font-size:12px;">${rincian}</td>
                <td style="${cs}">${info}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="4" style="${cs} text-align:right; font-weight:bold;">TOTAL LAINNYA</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    } else {
        // Fallback generik
        theadHTML = `
            <tr style="background:#f1f5f9;">
                <th style="${cs} width:40px;">No</th>
                <th style="${cs}">Tanggal</th>
                <th style="${cs}">Keterangan</th>
                <th style="${cs} text-align:right;">Jumlah</th>
            </tr>`;
        colCount = 4;
        filtered.forEach((d, i) => {
            let amt = parseInt(d.nominal) || 0;
            total += amt;
            tbody += `<tr>
                <td style="${cs} text-align:center;">${i + 1}</td>
                <td style="${cs}">${formatTanggalIndo(d.tanggal)}</td>
                <td style="${cs}">${d.keterangan || '-'}</td>
                <td style="${cs} text-align:right;">Rp ${formatRupiah(amt)}</td>
            </tr>`;
        });
        tbody += `<tr>
            <td colspan="3" style="${cs} text-align:right; font-weight:bold;">TOTAL</td>
            <td style="${cs} text-align:right; font-weight:bold;">Rp ${formatRupiah(total)}</td>
        </tr>`;
    }

    let kopSuratHTML = `
        <div style="text-align:center; margin-bottom:10px; position:relative; z-index:1;">
            <img src="img/kop-surat.png" onerror="this.src='img/kop-surat.jpg'" alt="Kop Surat" style="width:100%; height:auto; max-height:220px; object-fit:contain;" />
        </div>
        <div style="text-align:center; font-weight:bold; font-size:16px; margin-top:20px; margin-bottom:15px; text-decoration:underline; font-family: Arial, sans-serif;">
            ${title}
        </div>
    `;

    let tableHTML = `
    <table style="width:100%; border-collapse:collapse; margin-top:20px; font-size:14px;">
        <thead>
            ${theadHTML}
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
            <p style="margin:0;">Cirebon, ${formatTanggalIndo(today.toISOString().split('T')[0])}</p>
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


// ==========================================
// PENGELUARAN HONOR
// ==========================================

let honorRecipients = [];

function openHonorModal() {
    let cached = localStorage.getItem('honorFormCache');
    localStorage.removeItem('honorFormCache');
    if (cached) {
        try {
            let j = JSON.parse(cached);
            honorRecipients = j.recipients || [];
            document.getElementById('formHonorTanggal').value = j.tanggal || new Date().toISOString().split('T')[0];
            document.getElementById('formHonorKeterangan').value = j.keterangan || '';
        } catch (e) {
            honorRecipients = [];
        }
    } else {
        honorRecipients = [];
        document.getElementById('formHonorTanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('formHonorKeterangan').value = '';
    }
    if (honorRecipients.length === 0) addHonorRecipient();
    renderHonorRecipients();
    document.getElementById('honorPengeluaranModal').classList.add('active');
}

function closeHonorModal() {
    document.getElementById('honorPengeluaranModal').classList.remove('active');
}





function addHonorRecipient() {
    saveHonorRecipientsFromDOM();
    honorRecipients.push({ nama: '', jumlah: '' });
    renderHonorRecipients();
}

function removeHonorRecipient(index) {
    saveHonorRecipientsFromDOM();
    honorRecipients.splice(index, 1);
    if (honorRecipients.length === 0) addHonorRecipient();
    renderHonorRecipients();
}

function saveHonorRecipientsFromDOM() {
    for (let i = 0; i < honorRecipients.length; i++) {
        let n = document.getElementById('honorNama_' + i);
        let j = document.getElementById('honorJumlah_' + i);
        if (n) honorRecipients[i].nama = n.value;
        if (j) honorRecipients[i].jumlah = j.value;
    }
}

function calculateHonorTotal() {
    saveHonorRecipientsFromDOM();
    let tot = 0;
    honorRecipients.forEach(r => {
        tot += parseInt(r.jumlah) || 0;
    });
    let el = document.getElementById('honorTotalJumlahRp');
    if (el) el.innerText = 'Rp ' + formatRupiah(tot);
    return tot;
}

function renderHonorRecipients() {
    let container = document.getElementById('honorRecipientsContainer');
    if (!container) return;

    let guruOptions = '<option value="">-- Ketik / Pilih Nama --</option>';
    if (window.guruList && window.guruList.length > 0) {
        window.guruList.forEach(g => {
            guruOptions += '<option value="' + g.nama_lengkap + '">' + g.nama_lengkap + '</option>';
        });
    }

    let html = '';
    honorRecipients.forEach((r, i) => {
        html += '<div class="mobile-stack" style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-end;">';
        html += '<div style="flex:2;">';
        html += '<label class="form-label" style="font-size:0.85rem;">Nama Penerima</label>';
        html += '<input type="text" id="honorNama_' + i + '" list="honorGuruList" class="form-input" placeholder="Nama Guru / Staff" value="' + (r.nama || '') + '" oninput="calculateHonorTotal()">';
        html += '</div>';
        html += '<div style="flex:1;">';
        html += '<label class="form-label" style="font-size:0.85rem;">Jumlah (Rp)</label>';
        html += '<input type="number" id="honorJumlah_' + i + '" class="form-input" placeholder="0" value="' + (r.jumlah || '') + '" oninput="calculateHonorTotal()">';
        html += '</div>';
        html += '<div>';
        html += '<button class="btn btn-danger" style="padding:0.6rem;" onclick="removeHonorRecipient(' + i + ')">';
        html += '<i data-lucide="trash-2" style="width:16px;height:16px;"></i>';
        html += '</button>';
        html += '</div>';
        html += '</div>';
    });

    html += '<datalist id="honorGuruList">' + guruOptions + '</datalist>';
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    calculateHonorTotal();
}

async function saveHonorPengeluaran() {
    saveHonorRecipientsFromDOM();

    let validRecipients = honorRecipients.filter(r => r.nama.trim() !== '' && parseInt(r.jumlah) > 0);
    if (validRecipients.length === 0) {
        showToast('Minimal satu penerima dengan nama dan jumlah valid!', 'warning');
        return;
    }

    let tgl = document.getElementById('formHonorTanggal').value;
    let ket = document.getElementById('formHonorKeterangan').value;
    if (!tgl || !ket) {
        showToast('Tanggal dan keterangan wajib diisi!', 'warning');
        return;
    }

    let total = calculateHonorTotal();

    let keteranganObj = {
        deskripsi: ket,
        penerima: validRecipients
    };

    let obj = {
        kategori: 'Honor',
        tanggal: tgl,
        keterangan: JSON.stringify(keteranganObj)
    };

    if (window.honorSource === 'Universal') {
        obj.nama_item = 'Pembayaran Honor';
        obj.jumlah = total;
    } else {
        obj.sumber_dana = 'Kas Operasional';
        obj.jenis_transaksi = 'Pengeluaran';
        obj.nominal = total;
    }

    let btn = document.querySelector('#honorPengeluaranModal .btn-primary');
    let originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        let data, error;

        if (window.honorSource === 'Universal') {
            // Sertakan id_tagihan jika sedang membuka detail tagihan universal
            if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) {
                obj.id_tagihan = activeDetailIdKat;
            }
            if (window.editingKasKeluarId) {
                let res = await supabaseClient.from('kas_keluar').update(obj).eq('id', window.editingKasKeluarId).select();
                data = res.data; error = res.error;
                if (error) throw error;
                if (data && data.length > 0) {
                    let idx = dKasKeluar.findIndex(x => x.id === window.editingKasKeluarId);
                    if (idx !== -1) dKasKeluar[idx] = data[0];
                }
                window.editingKasKeluarId = null;
            } else {
                let res = await supabaseClient.from('kas_keluar').insert([obj]).select();
                data = res.data; error = res.error;
                if (error) throw error;
                if (data && data.length > 0) dKasKeluar.push(data[0]);
            }
            showToast('Data Honor Universal berhasil disimpan!', 'success');
            renderKasKeluarTable();
            closeHonorModal();
            renderUnivKategoriTable();
            if (typeof activeDetailIdKat !== 'undefined' && activeDetailIdKat) renderDetailSaldo(activeDetailIdKat);
        } else {
            if (window.editingOperasionalId) {
                let res = await supabaseClient.from('buku_kas_bendahara').update(obj).eq('id', window.editingOperasionalId).select();
                data = res.data; error = res.error;
                if (error) throw error;
                if (data && data.length > 0) {
                    let idx = dOperasional.findIndex(x => x.id === window.editingOperasionalId);
                    if (idx !== -1) dOperasional[idx] = data[0];
                }
                window.editingOperasionalId = null;
            } else {
                let res = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
                data = res.data; error = res.error;
                if (error) throw error;
                if (data && data.length > 0) dOperasional.push(data[0]);
            }
            renderOpKategoriTable();
            if (typeof updateOperasionalSummary === 'function') updateOperasionalSummary();
        }

        localStorage.removeItem('honorFormCache');
        document.getElementById('honorPengeluaranModal').classList.remove('active');
        showToast('Pengeluaran Honor berhasil disimpan!', 'success');
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

function viewDetailHonor(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailHonorTanggal').innerText = formatTanggalIndo(d.tanggal);

    let ket = d.keterangan || '';
    let j = null;
    try {
        if (ket.startsWith('{')) j = JSON.parse(ket);
    } catch (e) { }

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailHonorTotal').innerText = 'Rp ' + formatRupiah(total);

    let tbody = document.getElementById('tbodyDetailHonor');
    tbody.innerHTML = '';

    if (j && j.penerima && Array.isArray(j.penerima)) {
        document.getElementById('detailHonorKeterangan').innerText = j.deskripsi || '-';
        j.penerima.forEach((p, i) => {
            let amt = parseInt(p.jumlah) || 0;
            tbody.innerHTML += '<tr><td style="text-align:center;">' + (i + 1) + '</td><td>' + p.nama + '</td><td style="text-align:right;">Rp ' + formatRupiah(amt) + '</td></tr>';
        });
    } else {
        document.getElementById('detailHonorKeterangan').innerText = ket;
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem;">Rincian penerima tidak tersedia.</td></tr>';
    }

    document.getElementById('detailHonorPengeluaranModal').classList.add('active');
}

function closeDetailHonorModal() {
    document.getElementById('detailHonorPengeluaranModal').classList.remove('active');
}

// ==========================================
// PENGELUARAN EKSTRAKURIKULER
// ==========================================

function openEkskulPengeluaranModal() {
    let cached = localStorage.getItem('ekskulFormCache');
    localStorage.removeItem('ekskulFormCache');
    if (cached) {
        try {
            let j = JSON.parse(cached);
            document.getElementById('formEkskulPelatih').value = j.pelatih || '';
            document.getElementById('formEkskulTanggal').value = j.tanggal || new Date().toISOString().split('T')[0];
            document.getElementById('formEkskulJumlah').value = j.jumlah || '';
            document.getElementById('formEkskulKeterangan').value = j.keterangan || '';
        } catch (e) { }
    } else {
        document.getElementById('formEkskulPelatih').value = '';
        document.getElementById('formEkskulTanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('formEkskulJumlah').value = '';
        document.getElementById('formEkskulKeterangan').value = '';
    }
    document.getElementById('ekskulPengeluaranModal').classList.add('active');
}

function closeEkskulPengeluaranModal() {
    document.getElementById('ekskulPengeluaranModal').classList.remove('active');
}



async function saveEkskulPengeluaran() {
    let pelatih = document.getElementById('formEkskulPelatih').value.trim();
    let tgl = document.getElementById('formEkskulTanggal').value;
    let jml = document.getElementById('formEkskulJumlah').value;
    let ket = document.getElementById('formEkskulKeterangan').value.trim();

    if (!pelatih || !tgl || !jml || !ket) {
        showToast('Semua kolom wajib diisi!', 'warning');
        return;
    }

    let combinedKet = "Pelatih: " + pelatih + " | Ket: " + ket;

    let obj = {
        sumber_dana: 'Kas Operasional',
        jenis_transaksi: 'Pengeluaran',
        kategori: 'Ekstrakurikuler',
        nominal: parseInt(jml),
        tanggal: tgl,
        keterangan: combinedKet
    };

    let btn = document.querySelector('#ekskulPengeluaranModal .btn-primary');
    let originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if (error) throw error;

        if (data && data.length > 0) dOperasional.unshift(data[0]);
        renderOpKategoriTable();
        if (typeof updateOperasionalSummary === 'function') updateOperasionalSummary();

        localStorage.removeItem('ekskulFormCache');
        document.getElementById('ekskulPengeluaranModal').classList.remove('active');
        showToast('Pengeluaran Ekstrakurikuler berhasil disimpan!', 'success');
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

// ==========================================
// PENGELUARAN UTILITAS (LISTRIK & WIFI)
// ==========================================

function openUtilitasModal() {
    let cached = localStorage.getItem('utilitasFormCache');
    localStorage.removeItem('utilitasFormCache');
    if (cached) {
        try {
            let j = JSON.parse(cached);
            document.getElementById('formUtilitasJumlah').value = j.jumlah || '';
            document.getElementById('formUtilitasTanggal').value = j.tanggal || new Date().toISOString().split('T')[0];
            document.getElementById('formUtilitasKeterangan').value = j.keterangan || '';
        } catch (e) { }
    } else {
        document.getElementById('formUtilitasJumlah').value = '';
        document.getElementById('formUtilitasTanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('formUtilitasKeterangan').value = '';
    }
    document.getElementById('utilitasPengeluaranModal').classList.add('active');
}

function closeUtilitasModal() {
    document.getElementById('utilitasPengeluaranModal').classList.remove('active');
}

async function saveUtilitasPengeluaran() {
    let jml = document.getElementById('formUtilitasJumlah').value;
    let tgl = document.getElementById('formUtilitasTanggal').value;
    let ket = document.getElementById('formUtilitasKeterangan').value.trim();

    if (!jml || !tgl || !ket) {
        showToast('Semua kolom wajib diisi!', 'warning');
        return;
    }

    let obj = {
        sumber_dana: 'Kas Operasional',
        jenis_transaksi: 'Pengeluaran',
        kategori: 'Utilitas (listrik & wifi)',
        nominal: parseInt(jml),
        tanggal: tgl,
        keterangan: ket
    };

    let btn = document.querySelector('#utilitasPengeluaranModal .btn-primary');
    let originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if (error) throw error;

        if (data && data.length > 0) dOperasional.unshift(data[0]);
        renderOpKategoriTable();
        if (typeof updateOperasionalSummary === 'function') updateOperasionalSummary();

        localStorage.removeItem('utilitasFormCache');
        document.getElementById('utilitasPengeluaranModal').classList.remove('active');
        showToast('Pengeluaran Utilitas berhasil disimpan!', 'success');
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

// ==========================================
// PENGELUARAN ATK
// ==========================================

let atkItems = [];

function openAtkModal() {
    let cached = localStorage.getItem('atkFormCache');
    localStorage.removeItem('atkFormCache');
    if (cached) {
        try {
            let j = JSON.parse(cached);
            atkItems = j.items || [];
            document.getElementById('formAtkTanggal').value = j.tanggal || new Date().toISOString().split('T')[0];
            document.getElementById('formAtkKeterangan').value = j.keterangan || '';
        } catch (e) {
            atkItems = [];
        }
    } else {
        atkItems = [];
        document.getElementById('formAtkTanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('formAtkKeterangan').value = '';
    }
    if (atkItems.length === 0) addAtkItem();
    renderAtkItems();
    document.getElementById('atkPengeluaranModal').classList.add('active');
}

function closeAtkModal() {
    document.getElementById('atkPengeluaranModal').classList.remove('active');
}



function addAtkItem() {
    saveAtkItemsFromDOM();
    atkItems.push({ nama: '', harga: '' });
    renderAtkItems();
}

function removeAtkItem(index) {
    saveAtkItemsFromDOM();
    atkItems.splice(index, 1);
    if (atkItems.length === 0) addAtkItem();
    renderAtkItems();
}

function saveAtkItemsFromDOM() {
    for (let i = 0; i < atkItems.length; i++) {
        let n = document.getElementById('atkNama_' + i);
        let h = document.getElementById('atkHarga_' + i);
        if (n) atkItems[i].nama = n.value;
        if (h) atkItems[i].harga = h.value;
    }
}

function calculateAtkTotal() {
    saveAtkItemsFromDOM();
    let tot = 0;
    atkItems.forEach(r => {
        tot += parseInt(r.harga) || 0;
    });
    let el = document.getElementById('atkTotalJumlahRp');
    if (el) el.innerText = 'Rp ' + formatRupiah(tot);
    return tot;
}

function renderAtkItems() {
    let container = document.getElementById('atkItemsContainer');
    if (!container) return;

    let html = '';
    atkItems.forEach((r, i) => {
        html += '<div class="mobile-stack" style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-end;">';
        html += '<div style="flex:2;">';
        html += '<label class="form-label" style="font-size:0.85rem;">Nama Barang / Item</label>';
        html += '<input type="text" id="atkNama_' + i + '" class="form-input" placeholder="Misal: Spidol, Kertas HVS" value="' + (r.nama || '') + '" oninput="calculateAtkTotal()">';
        html += '</div>';
        html += '<div style="flex:1;">';
        html += '<label class="form-label" style="font-size:0.85rem;">Harga (Rp)</label>';
        html += '<input type="number" id="atkHarga_' + i + '" class="form-input" placeholder="0" value="' + (r.harga || '') + '" oninput="calculateAtkTotal()">';
        html += '</div>';
        html += '<div>';
        html += '<button class="btn btn-danger" style="padding:0.6rem;" onclick="removeAtkItem(' + i + ')">';
        html += '<i data-lucide="trash-2" style="width:16px;height:16px;"></i>';
        html += '</button>';
        html += '</div>';
        html += '</div>';
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    calculateAtkTotal();
}

async function saveAtkPengeluaran() {
    saveAtkItemsFromDOM();

    let validItems = atkItems.filter(r => r.nama.trim() !== '' && parseInt(r.harga) > 0);
    if (validItems.length === 0) {
        showToast('Minimal satu barang dengan nama dan harga valid!', 'warning');
        return;
    }

    let tgl = document.getElementById('formAtkTanggal').value;
    let ket = document.getElementById('formAtkKeterangan').value;
    if (!tgl || !ket) {
        showToast('Tanggal dan keterangan wajib diisi!', 'warning');
        return;
    }

    let total = calculateAtkTotal();

    let keteranganObj = {
        deskripsi: ket,
        items: validItems
    };

    let obj = {
        sumber_dana: 'Kas Operasional',
        jenis_transaksi: 'Pengeluaran',
        kategori: 'Alat Tulis Kantor (ATK)',
        nominal: total,
        tanggal: tgl,
        keterangan: JSON.stringify(keteranganObj)
    };

    let btn = document.querySelector('#atkPengeluaranModal .btn-primary');
    let originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if (error) throw error;

        if (data && data.length > 0) dOperasional.unshift(data[0]);
        renderOpKategoriTable();
        if (typeof updateOperasionalSummary === 'function') updateOperasionalSummary();

        localStorage.removeItem('atkFormCache');
        document.getElementById('atkPengeluaranModal').classList.remove('active');
        showToast('Pengeluaran ATK berhasil disimpan!', 'success');
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

function viewDetailAtk(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailAtkTanggal').innerText = formatTanggalIndo(d.tanggal);

    let ket = d.keterangan || '';
    let j = null;
    try {
        if (ket.startsWith('{')) j = JSON.parse(ket);
    } catch (e) { }

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailAtkTotal').innerText = 'Rp ' + formatRupiah(total);

    let tbody = document.getElementById('tbodyDetailAtk');
    tbody.innerHTML = '';

    if (j && j.items && Array.isArray(j.items)) {
        document.getElementById('detailAtkKeterangan').innerText = j.deskripsi || '-';
        j.items.forEach((p, i) => {
            let amt = parseInt(p.harga) || 0;
            tbody.innerHTML += '<tr><td style="text-align:center;">' + (i + 1) + '</td><td>' + p.nama + '</td><td style="text-align:right;">Rp ' + formatRupiah(amt) + '</td></tr>';
        });
    } else {
        document.getElementById('detailAtkKeterangan').innerText = ket;
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem;">Rincian barang tidak tersedia.</td></tr>';
    }

    document.getElementById('detailAtkPengeluaranModal').classList.add('active');
}

function closeDetailAtkModal() {
    document.getElementById('detailAtkPengeluaranModal').classList.remove('active');
}

// ==========================================
// PENGELUARAN PERJALANAN DINAS
// ==========================================

let dinasNames = [];

function openDinasModal() {
    let cached = localStorage.getItem('dinasFormCache');
    localStorage.removeItem('dinasFormCache');
    if (cached) {
        try {
            let j = JSON.parse(cached);
            dinasNames = [];
            if (j.names && Array.isArray(j.names)) {
                dinasNames = j.names.map(n => typeof n === 'object' ? (n.nama || '') : n);
            }
            document.getElementById('formDinasTujuan').value = j.tujuan || '';
            document.getElementById('formDinasAgenda').value = j.agenda || '';
            document.getElementById('formDinasTanggalBerangkat').value = j.tanggal_berangkat || new Date().toISOString().split('T')[0];
            document.getElementById('formDinasTanggalKembali').value = j.tanggal_kembali || new Date().toISOString().split('T')[0];
            document.getElementById('formDinasJumlah').value = j.jumlah || '';
            document.getElementById('formDinasKeterangan').value = j.keterangan || '';
        } catch (e) { dinasNames = []; }
    } else {
        dinasNames = [];
        document.getElementById('formDinasTujuan').value = '';
        document.getElementById('formDinasAgenda').value = '';
        document.getElementById('formDinasTanggalBerangkat').value = new Date().toISOString().split('T')[0];
        document.getElementById('formDinasTanggalKembali').value = new Date().toISOString().split('T')[0];
        document.getElementById('formDinasJumlah').value = '';
        document.getElementById('formDinasKeterangan').value = '';
    }
    if (dinasNames.length === 0) addDinasName();
    renderDinasNames();
    document.getElementById('dinasPengeluaranModal').classList.add('active');
}

function closeDinasModal() {
    document.getElementById('dinasPengeluaranModal').classList.remove('active');
}



function addDinasName() {
    saveDinasNamesFromDOM();
    dinasNames.push('');
    renderDinasNames();
}

function removeDinasName(index) {
    saveDinasNamesFromDOM();
    dinasNames.splice(index, 1);
    if (dinasNames.length === 0) addDinasName();
    renderDinasNames();
}

function saveDinasNamesFromDOM() {
    for (let i = 0; i < dinasNames.length; i++) {
        let n = document.getElementById('dinasNama_' + i);
        if (n) dinasNames[i] = n.value;
    }
}

function renderDinasNames() {
    let container = document.getElementById('dinasNamesContainer');
    if (!container) return;

    let guruOptions = '<option value="">-- Ketik / Pilih Nama --</option>';
    if (window.guruList && window.guruList.length > 0) {
        window.guruList.forEach(g => {
            guruOptions += '<option value="' + g.nama_lengkap + '">' + g.nama_lengkap + '</option>';
        });
    }

    let html = '';
    dinasNames.forEach((nama, i) => {
        html += '<div style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-end;">';
        html += '<div style="flex:1;">';
        html += '<input type="text" id="dinasNama_' + i + '" list="dinasGuruList" class="form-input" placeholder="Nama Guru / Staff" value="' + (nama || '') + '">';
        html += '</div>';
        html += '<div>';
        html += '<button class="btn btn-danger" style="padding:0.6rem;" onclick="removeDinasName(' + i + ')">';
        html += '<i data-lucide="trash-2" style="width:16px;height:16px;"></i>';
        html += '</button>';
        html += '</div>';
        html += '</div>';
    });

    html += '<datalist id="dinasGuruList">' + guruOptions + '</datalist>';
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}

async function saveDinasPengeluaran() {
    saveDinasNamesFromDOM();

    let validNames = dinasNames.filter(n => n.trim() !== '');
    if (validNames.length === 0) {
        showToast('Minimal satu nama yang melakukan perjalanan!', 'warning');
        return;
    }

    let tujuan = document.getElementById('formDinasTujuan').value.trim();
    let agenda = document.getElementById('formDinasAgenda').value.trim();
    let tglBerangkat = document.getElementById('formDinasTanggalBerangkat').value;
    let tglKembali = document.getElementById('formDinasTanggalKembali').value;
    let jumlah = parseInt(document.getElementById('formDinasJumlah').value) || 0;
    let ket = document.getElementById('formDinasKeterangan').value.trim();

    if (!tujuan || !agenda || !tglBerangkat || !tglKembali) {
        showToast('Tujuan, Agenda, Tanggal Berangkat, dan Tanggal Kembali wajib diisi!', 'warning');
        return;
    }
    if (jumlah <= 0) {
        showToast('Jumlah Pengeluaran Dinas harus diisi!', 'warning');
        return;
    }

    let keteranganObj = {
        deskripsi: ket,
        tujuan: tujuan,
        agenda: agenda,
        tanggal_kembali: tglKembali,
        peserta: validNames
    };

    let obj = {
        sumber_dana: 'Kas Operasional',
        jenis_transaksi: 'Pengeluaran',
        kategori: 'Perjalanan Dinas',
        nominal: jumlah,
        tanggal: tglBerangkat,
        keterangan: JSON.stringify(keteranganObj)
    };

    let btn = document.querySelector('#dinasPengeluaranModal .btn-primary');
    let originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if (error) throw error;

        if (data && data.length > 0) dOperasional.unshift(data[0]);
        renderOpKategoriTable();
        if (typeof updateOperasionalSummary === 'function') updateOperasionalSummary();

        localStorage.removeItem('dinasFormCache');
        document.getElementById('dinasPengeluaranModal').classList.remove('active');
        showToast('Pengeluaran Perjalanan Dinas berhasil disimpan!', 'success');
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

function viewDetailDinas(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    let ket = d.keterangan || '';
    let j = null;
    let waktu = formatTanggalIndo(d.tanggal);

    try {
        if (ket.startsWith('{')) j = JSON.parse(ket);
    } catch (e) { }

    document.getElementById('detailDinasTujuan').innerText = j?.tujuan || '-';
    document.getElementById('detailDinasAgenda').innerText = j?.agenda || '-';
    if (j?.tanggal_kembali) waktu += ' s/d ' + formatTanggalIndo(j.tanggal_kembali);
    document.getElementById('detailDinasWaktu').innerText = waktu;
    document.getElementById('detailDinasKeterangan').innerText = j?.deskripsi || '-';

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailDinasTotal').innerText = 'Rp ' + formatRupiah(total);

    let tbody = document.getElementById('tbodyDetailDinas');
    tbody.innerHTML = '';

    // Support both old format (penerima with biaya) and new format (peserta as string array)
    let pesertaList = j?.peserta || j?.penerima || [];
    if (pesertaList.length > 0) {
        pesertaList.forEach((p, i) => {
            let nama = typeof p === 'string' ? p : p.nama;
            tbody.innerHTML += '<tr><td style="text-align:center;">' + (i + 1) + '</td><td colspan="2">' + nama + '</td></tr>';
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem;">Rincian nama tidak tersedia.</td></tr>';
    }

    document.getElementById('detailDinasPengeluaranModal').classList.add('active');
}

function closeDetailDinasModal() {
    document.getElementById('detailDinasPengeluaranModal').classList.remove('active');
}


// ==========================================
// PENGELUARAN LAINNYA
// ==========================================

let lainnyaItems = [];

function openLainnyaModal() {
    let cached = localStorage.getItem('lainnyaFormCache');
    localStorage.removeItem('lainnyaFormCache');
    if (cached) {
        try {
            let j = JSON.parse(cached);
            lainnyaItems = j.items || [];
            document.getElementById('formLainnyaTanggal').value = j.tanggal || new Date().toISOString().split('T')[0];
            document.getElementById('formLainnyaKeterangan').value = j.keterangan || '';
        } catch (e) {
            lainnyaItems = [];
        }
    } else {
        lainnyaItems = [];
        document.getElementById('formLainnyaTanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('formLainnyaKeterangan').value = '';
    }
    if (lainnyaItems.length === 0) addLainnyaItem();
    renderLainnyaItems();
    document.getElementById('lainnyaPengeluaranModal').classList.add('active');
}

function closeLainnyaModal() {
    document.getElementById('lainnyaPengeluaranModal').classList.remove('active');
}



function addLainnyaItem() {
    saveLainnyaItemsFromDOM();
    lainnyaItems.push({ nama: '', harga: '' });
    renderLainnyaItems();
}

function removeLainnyaItem(index) {
    saveLainnyaItemsFromDOM();
    lainnyaItems.splice(index, 1);
    if (lainnyaItems.length === 0) addLainnyaItem();
    renderLainnyaItems();
}

function saveLainnyaItemsFromDOM() {
    for (let i = 0; i < lainnyaItems.length; i++) {
        let n = document.getElementById('lainnyaNama_' + i);
        let h = document.getElementById('lainnyaHarga_' + i);
        if (n) lainnyaItems[i].nama = n.value;
        if (h) lainnyaItems[i].harga = h.value;
    }
}

function calculateLainnyaTotal() {
    saveLainnyaItemsFromDOM();
    let tot = 0;
    lainnyaItems.forEach(r => {
        tot += parseInt(r.harga) || 0;
    });
    let el = document.getElementById('lainnyaTotalJumlahRp');
    if (el) el.innerText = 'Rp ' + formatRupiah(tot);
    return tot;
}

function renderLainnyaItems() {
    let container = document.getElementById('lainnyaItemsContainer');
    if (!container) return;

    let html = '';
    lainnyaItems.forEach((r, i) => {
        html += '<div class="mobile-stack" style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-end;">';
        html += '<div style="flex:2;">';
        html += '<label class="form-label" style="font-size:0.85rem;">Nama Barang / Item</label>';
        html += '<input type="text" id="lainnyaNama_' + i + '" class="form-input" placeholder="Misal: Perlengkapan..." value="' + (r.nama || '') + '" oninput="calculateLainnyaTotal()">';
        html += '</div>';
        html += '<div style="flex:1;">';
        html += '<label class="form-label" style="font-size:0.85rem;">Harga (Rp)</label>';
        html += '<input type="number" id="lainnyaHarga_' + i + '" class="form-input" placeholder="0" value="' + (r.harga || '') + '" oninput="calculateLainnyaTotal()">';
        html += '</div>';
        html += '<div>';
        html += '<button class="btn btn-danger" style="padding:0.6rem;" onclick="removeLainnyaItem(' + i + ')">';
        html += '<i data-lucide="trash-2" style="width:16px;height:16px;"></i>';
        html += '</button>';
        html += '</div>';
        html += '</div>';
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    calculateLainnyaTotal();
}

async function saveLainnyaPengeluaran() {
    saveLainnyaItemsFromDOM();

    let validItems = lainnyaItems.filter(r => r.nama.trim() !== '' && parseInt(r.harga) > 0);
    if (validItems.length === 0) {
        showToast('Minimal satu barang dengan nama dan harga valid!', 'warning');
        return;
    }

    let tgl = document.getElementById('formLainnyaTanggal').value;
    let ket = document.getElementById('formLainnyaKeterangan').value;
    if (!tgl || !ket) {
        showToast('Tanggal dan keterangan wajib diisi!', 'warning');
        return;
    }

    let total = calculateLainnyaTotal();

    let keteranganObj = {
        deskripsi: ket,
        items: validItems
    };

    let obj = {
        sumber_dana: 'Kas Operasional',
        jenis_transaksi: 'Pengeluaran',
        kategori: 'Lainnya',
        nominal: total,
        tanggal: tgl,
        keterangan: JSON.stringify(keteranganObj)
    };

    let btn = document.querySelector('#lainnyaPengeluaranModal .btn-primary');
    let originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        let { data, error } = await supabaseClient.from('buku_kas_bendahara').insert([obj]).select();
        if (error) throw error;

        if (data && data.length > 0) dOperasional.unshift(data[0]);
        renderOpKategoriTable();
        if (typeof updateOperasionalSummary === 'function') updateOperasionalSummary();

        localStorage.removeItem('lainnyaFormCache');
        document.getElementById('lainnyaPengeluaranModal').classList.remove('active');
        showToast('Pengeluaran Lainnya berhasil disimpan!', 'success');
    } catch (e) {
        showToast('Gagal menyimpan: ' + e.message, 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

function viewDetailLainnya(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailLainnyaTanggal').innerText = formatTanggalIndo(d.tanggal);

    let ket = d.keterangan || '';
    let j = null;
    try {
        if (ket.startsWith('{')) j = JSON.parse(ket);
    } catch (e) { }

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailLainnyaTotal').innerText = 'Rp ' + formatRupiah(total);

    let tbody = document.getElementById('tbodyDetailLainnya');
    tbody.innerHTML = '';

    if (j && j.items && Array.isArray(j.items)) {
        document.getElementById('detailLainnyaKeterangan').innerText = j.deskripsi || '-';
        j.items.forEach((p, i) => {
            let amt = parseInt(p.harga) || 0;
            tbody.innerHTML += '<tr><td style="text-align:center;">' + (i + 1) + '</td><td>' + p.nama + '</td><td style="text-align:right;">Rp ' + formatRupiah(amt) + '</td></tr>';
        });
    } else {
        document.getElementById('detailLainnyaKeterangan').innerText = ket;
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem;">Rincian barang tidak tersedia.</td></tr>';
    }

    document.getElementById('detailLainnyaPengeluaranModal').classList.add('active');
}

function closeDetailLainnyaModal() {
    document.getElementById('detailLainnyaPengeluaranModal').classList.remove('active');
}

window.editingOperasionalId = null;

function editOperasional(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    window.editingOperasionalId = d.id;
    let ket = d.keterangan || '';
    let j = null;
    try {
        if (ket.startsWith('{')) j = JSON.parse(ket);
    } catch (e) { }

    if (d.kategori === 'Honor') {
        window.honorSource = 'Operasional';
        localStorage.removeItem('honorFormCache');
        let obj = {
            recipients: j && j.penerima ? j.penerima : [],
            tanggal: d.tanggal,
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('honorFormCache', JSON.stringify(obj));
        openHonorModal();
    }
    else if (d.kategori === 'Ekstrakurikuler') {
        localStorage.removeItem('ekskulFormCache');
        let pelatih = '';
        let deskripsi = ket;
        if (ket.startsWith("Pelatih: ")) {
            let parts = ket.split(" | Ket: ");
            pelatih = parts[0].replace("Pelatih: ", "");
            if (parts.length > 1) deskripsi = parts[1];
            else deskripsi = "";
        }
        let obj = {
            pelatih: pelatih,
            tanggal: d.tanggal,
            jumlah: parseInt(d.nominal) || '',
            keterangan: deskripsi
        };
        localStorage.setItem('ekskulFormCache', JSON.stringify(obj));
        openEkskulPengeluaranModal();
    }
    else if (d.kategori === 'Utilitas (listrik & wifi)') {
        localStorage.removeItem('utilitasFormCache');
        let obj = {
            jumlah: parseInt(d.nominal) || '',
            tanggal: d.tanggal,
            keterangan: ket
        };
        localStorage.setItem('utilitasFormCache', JSON.stringify(obj));
        openUtilitasModal();
    }
    else if (d.kategori === 'Alat Tulis Kantor (ATK)') {
        localStorage.removeItem('atkFormCache');
        let obj = {
            items: (j && j.items ? j.items : []).map(p => ({ nama: p.nama, harga: p.harga })),
            tanggal: d.tanggal,
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('atkFormCache', JSON.stringify(obj));
        openAtkModal();
    }
    else if (d.kategori === 'Perjalanan Dinas') {
        localStorage.removeItem('dinasFormCache');
        let peserta = j ? (j.peserta || j.penerima || []) : [];
        let pList = peserta.map(p => typeof p === 'string' ? p : p.nama);
        let obj = {
            names: pList,
            tujuan: j ? (j.tujuan || '') : '',
            agenda: j ? (j.agenda || '') : '',
            tanggal_berangkat: d.tanggal,
            tanggal_kembali: j ? (j.tanggal_kembali || d.tanggal) : d.tanggal,
            jumlah: parseInt(d.nominal) || '',
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('dinasFormCache', JSON.stringify(obj));
        openDinasModal();
    }
    else if (d.kategori === 'Lainnya') {
        localStorage.removeItem('lainnyaFormCache');
        let obj = {
            items: (j && j.items ? j.items : []).map(p => ({ nama: p.nama, harga: p.harga })),
            tanggal: d.tanggal,
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('lainnyaFormCache', JSON.stringify(obj));
        openLainnyaModal();
    }
}

function viewDetailEkskul(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailEkskulTanggal').innerText = formatTanggalIndo(d.tanggal);

    let ket = d.keterangan || '';
    let pelatih = '-';
    let deskripsi = ket;
    if (ket.startsWith("Pelatih: ")) {
        let parts = ket.split(" | Ket: ");
        pelatih = parts[0].replace("Pelatih: ", "");
        if (parts.length > 1) deskripsi = parts[1];
        else deskripsi = "";
    }

    document.getElementById('detailEkskulPelatih').innerText = pelatih;
    document.getElementById('detailEkskulKeterangan').innerText = deskripsi;

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailEkskulTotal').innerText = 'Rp ' + formatRupiah(total);

    document.getElementById('detailEkskulPengeluaranModal').classList.add('active');
}

function closeDetailEkskulModal() {
    document.getElementById('detailEkskulPengeluaranModal').classList.remove('active');
}

function viewDetailUtilitas(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailUtilitasTanggal').innerText = formatTanggalIndo(d.tanggal);
    document.getElementById('detailUtilitasKeterangan').innerText = d.keterangan || '-';

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailUtilitasTotal').innerText = 'Rp ' + formatRupiah(total);

    document.getElementById('detailUtilitasPengeluaranModal').classList.add('active');
}

function closeDetailUtilitasModal() {
    document.getElementById('detailUtilitasPengeluaranModal').classList.remove('active');
}

// ============================================================
// PDF STEMPEL & TTD BENDAHARA LOGIC
// ============================================================
function toggleNomorSuratInput() {
    var docType = document.getElementById('docTypeSelect').value;
    var group = document.getElementById('nomorSuratGroup');
    if (docType === 'sptjm') {
        group.style.display = 'block';
    } else {
        group.style.display = 'none';
    }
}

async function fetchImageAsUint8Array(url) {
    var res = await fetch(url);
    if (!res.ok) throw new Error('Gagal memuat gambar: ' + url + '. Pastikan gambar sudah diletakkan di folder img.');
    var buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
}

function viewDetailLainnya(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailLainnyaTanggal').innerText = formatTanggalIndo(d.tanggal);

    let ket = d.keterangan || '';
    let j = null;
    try {
        if (ket.startsWith('{')) j = JSON.parse(ket);
    } catch (e) { }

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailLainnyaTotal').innerText = 'Rp ' + formatRupiah(total);

    let tbody = document.getElementById('tbodyDetailLainnya');
    tbody.innerHTML = '';

    if (j && j.items && Array.isArray(j.items)) {
        document.getElementById('detailLainnyaKeterangan').innerText = j.deskripsi || '-';
        j.items.forEach((p, i) => {
            let amt = parseInt(p.harga) || 0;
            tbody.innerHTML += '<tr><td style="text-align:center;">' + (i + 1) + '</td><td>' + p.nama + '</td><td style="text-align:right;">Rp ' + formatRupiah(amt) + '</td></tr>';
        });
    } else {
        document.getElementById('detailLainnyaKeterangan').innerText = ket;
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem;">Rincian barang tidak tersedia.</td></tr>';
    }

    document.getElementById('detailLainnyaPengeluaranModal').classList.add('active');
}

function closeDetailLainnyaModal() {
    document.getElementById('detailLainnyaPengeluaranModal').classList.remove('active');
}

window.editingOperasionalId = null;

function editOperasional(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    window.editingOperasionalId = d.id;
    let ket = d.keterangan || '';
    let j = null;
    try {
        if (ket.startsWith('{')) j = JSON.parse(ket);
    } catch (e) { }

    if (d.kategori === 'Honor') {
        window.honorSource = 'Operasional';
        localStorage.removeItem('honorFormCache');
        let obj = {
            recipients: j && j.penerima ? j.penerima : [],
            tanggal: d.tanggal,
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('honorFormCache', JSON.stringify(obj));
        openHonorModal();
    }
    else if (d.kategori === 'Ekstrakurikuler') {
        localStorage.removeItem('ekskulFormCache');
        let pelatih = '';
        let deskripsi = ket;
        if (ket.startsWith("Pelatih: ")) {
            let parts = ket.split(" | Ket: ");
            pelatih = parts[0].replace("Pelatih: ", "");
            if (parts.length > 1) deskripsi = parts[1];
            else deskripsi = "";
        }
        let obj = {
            pelatih: pelatih,
            tanggal: d.tanggal,
            jumlah: parseInt(d.nominal) || '',
            keterangan: deskripsi
        };
        localStorage.setItem('ekskulFormCache', JSON.stringify(obj));
        openEkskulPengeluaranModal();
    }
    else if (d.kategori === 'Utilitas (listrik & wifi)') {
        localStorage.removeItem('utilitasFormCache');
        let obj = {
            jumlah: parseInt(d.nominal) || '',
            tanggal: d.tanggal,
            keterangan: ket
        };
        localStorage.setItem('utilitasFormCache', JSON.stringify(obj));
        openUtilitasModal();
    }
    else if (d.kategori === 'Alat Tulis Kantor (ATK)') {
        localStorage.removeItem('atkFormCache');
        let obj = {
            items: (j && j.items ? j.items : []).map(p => ({ nama: p.nama, harga: p.harga })),
            tanggal: d.tanggal,
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('atkFormCache', JSON.stringify(obj));
        openAtkModal();
    }
    else if (d.kategori === 'Perjalanan Dinas') {
        localStorage.removeItem('dinasFormCache');
        let peserta = j ? (j.peserta || j.penerima || []) : [];
        let pList = peserta.map(p => typeof p === 'string' ? p : p.nama);
        let obj = {
            names: pList,
            tujuan: j ? (j.tujuan || '') : '',
            agenda: j ? (j.agenda || '') : '',
            tanggal_berangkat: d.tanggal,
            tanggal_kembali: j ? (j.tanggal_kembali || d.tanggal) : d.tanggal,
            jumlah: parseInt(d.nominal) || '',
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('dinasFormCache', JSON.stringify(obj));
        openDinasModal();
    }
    else if (d.kategori === 'Lainnya') {
        localStorage.removeItem('lainnyaFormCache');
        let obj = {
            items: (j && j.items ? j.items : []).map(p => ({ nama: p.nama, harga: p.harga })),
            tanggal: d.tanggal,
            keterangan: j ? (j.deskripsi || '') : ''
        };
        localStorage.setItem('lainnyaFormCache', JSON.stringify(obj));
        openLainnyaModal();
    }
}

function viewDetailEkskul(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailEkskulTanggal').innerText = formatTanggalIndo(d.tanggal);

    let ket = d.keterangan || '';
    let pelatih = '-';
    let deskripsi = ket;
    if (ket.startsWith("Pelatih: ")) {
        let parts = ket.split(" | Ket: ");
        pelatih = parts[0].replace("Pelatih: ", "");
        if (parts.length > 1) deskripsi = parts[1];
        else deskripsi = "";
    }

    document.getElementById('detailEkskulPelatih').innerText = pelatih;
    document.getElementById('detailEkskulKeterangan').innerText = deskripsi;

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailEkskulTotal').innerText = 'Rp ' + formatRupiah(total);

    document.getElementById('detailEkskulPengeluaranModal').classList.add('active');
}

function closeDetailEkskulModal() {
    document.getElementById('detailEkskulPengeluaranModal').classList.remove('active');
}

function viewDetailUtilitas(id) {
    let d = dOperasional.find(x => x.id === id);
    if (!d) return;

    document.getElementById('detailUtilitasTanggal').innerText = formatTanggalIndo(d.tanggal);
    document.getElementById('detailUtilitasKeterangan').innerText = d.keterangan || '-';

    let total = parseInt(d.nominal) || 0;
    document.getElementById('detailUtilitasTotal').innerText = 'Rp ' + formatRupiah(total);

    document.getElementById('detailUtilitasPengeluaranModal').classList.add('active');
}

function closeDetailUtilitasModal() {
    document.getElementById('detailUtilitasPengeluaranModal').classList.remove('active');
}

// ============================================================
// PDF STEMPEL & TTD BENDAHARA LOGIC
// ============================================================
function toggleNomorSuratInput() {
    var docType = document.getElementById('docTypeSelect').value;
    var group = document.getElementById('nomorSuratGroup');
    if (docType === 'sptjm') {
        group.style.display = 'block';
    } else {
        group.style.display = 'none';
    }
}

async function fetchImageAsUint8Array(url) {
    var res = await fetch(url);
    if (!res.ok) throw new Error('Gagal memuat gambar: ' + url + '. Pastikan gambar sudah diletakkan di folder img.');
    var buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
}

async function prosesStempelDokumen() {
    var fileInput = document.getElementById('docPdfInput');
    var docType = document.getElementById('docTypeSelect').value;
    var nomorSurat = document.getElementById('docNomorSurat').value;
    var btn = document.getElementById('btnProsesStempel');

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Silakan pilih file PDF terlebih dahulu.', 'warning');
        return;
    }
    if (docType === 'sptjm' && !nomorSurat) {
        showToast('Mohon isi Nomor Surat untuk dokumen SPTJM.', 'warning');
        return;
    }

    var file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
        showToast('File harus berupa PDF.', 'warning');
        return;
    }

    btn.innerHTML = '<i data-lucide="loader" class="icon-spin" style="width:18px;height:18px;vertical-align:middle;margin-right:8px;"></i> Sedang Memproses...';
    btn.disabled = true;

    try {
        if (typeof PDFLib === 'undefined') {
            throw new Error('Library PDF-Lib tidak ditemukan. Pastikan koneksi internet aktif.');
        }

        var fileBuffer = await file.arrayBuffer();
        var pdfDoc = await PDFLib.PDFDocument.load(fileBuffer);

        // Load images
        var stempelBytes = await fetchImageAsUint8Array('img/stempel.png');
        var ttdKepsekBytes = await fetchImageAsUint8Array('img/ttd_kepsek.png');

        var stempelImage = await pdfDoc.embedPng(stempelBytes);
        var ttdKepsekImage = await pdfDoc.embedPng(ttdKepsekBytes);

        var ttdBendaharaImage = null;
        if (docType !== 'sptjm') {
            var ttdBendaharaBytes = await fetchImageAsUint8Array('img/ttd_bendahara.png');
            ttdBendaharaImage = await pdfDoc.embedPng(ttdBendaharaBytes);
        }

        // Get the last page
        var pages = pdfDoc.getPages();
        var lastPage = pages[pages.length - 1];

        // Standard scaling for images (preserve aspect ratio)
        var stempelScale = 100 / stempelImage.width;
        var stempelDims = stempelImage.scale(stempelScale);

        var ttdScale = 150 / ttdKepsekImage.width;
        var ttdKepsekDims = ttdKepsekImage.scale(ttdScale);

        var ttdBendaharaDims = null;
        if (ttdBendaharaImage) {
            var bendaharaScale = 90 / ttdBendaharaImage.width;
            ttdBendaharaDims = ttdBendaharaImage.scale(bendaharaScale);
        }

        if (docType === 'sptjm') {
            // Draw Nomor Surat on first page (or last if 1 page)
            var firstPage = pages[0];

            // Draw white rectangle to hide ".................." only (not "Nomor :")
            firstPage.drawRectangle({
                x: 245,
                y: 672,
                width: 235,
                height: 18,
                color: PDFLib.rgb(1, 1, 1),
            });

            // Draw the actual Nomor Surat (centered-ish on the dots)
            firstPage.drawText(nomorSurat, {
                x: 250,
                y: 673,
                size: 11,
                color: PDFLib.rgb(0, 0, 0),
            });

            // Draw Stamp (Kanan Bawah)
            lastPage.drawImage(stempelImage, {
                x: 350,
                y: 92,
                width: stempelDims.width,
                height: stempelDims.height,
            });

            // Draw Kepsek Signature (positioned between "Kepala Sekolah" label and name)
            var sptjmTtdScale = 100 / ttdKepsekImage.width;
            var sptjmTtdDims = ttdKepsekImage.scale(sptjmTtdScale);
            lastPage.drawImage(ttdKepsekImage, {
                x: 400,
                y: 95,
                width: sptjmTtdDims.width,
                height: sptjmTtdDims.height,
            });
        } else if (docType === 'buku_pajak') {
            // Buku Pembantu Pajak
            var bkuKepsekScale = 100 / ttdKepsekImage.width;
            var bkuKepsekDims = ttdKepsekImage.scale(bkuKepsekScale);

            lastPage.drawImage(stempelImage, {
                x: 35,
                y: 250,
                width: stempelDims.width,
                height: stempelDims.height,
            });
            lastPage.drawImage(ttdKepsekImage, {
                x: 83,
                y: 250,
                width: bkuKepsekDims.width,
                height: bkuKepsekDims.height,
            });

            if (ttdBendaharaImage && ttdBendaharaDims) {
                lastPage.drawImage(ttdBendaharaImage, {
                    x: 630,
                    y: 250,
                    width: ttdBendaharaDims.width,
                    height: ttdBendaharaDims.height,
                });
            }
        } else if (docType === 'rekapitulasi') {
            // Rekapitulasi Realisasi
            var bkuKepsekScale = 100 / ttdKepsekImage.width;
            var bkuKepsekDims = ttdKepsekImage.scale(bkuKepsekScale);

            lastPage.drawImage(stempelImage, {
                x: 30,
                y: 70,
                width: stempelDims.width,
                height: stempelDims.height,
            });
            lastPage.drawImage(ttdKepsekImage, {
                x: 90,
                y: 70,
                width: bkuKepsekDims.width,
                height: bkuKepsekDims.height,
            });

            if (ttdBendaharaImage && ttdBendaharaDims) {
                lastPage.drawImage(ttdBendaharaImage, {
                    x: 650,
                    y: 70,
                    width: ttdBendaharaDims.width,
                    height: ttdBendaharaDims.height,
                });
            }
        } else {
            // BKU (2 signatures)
            // Kiri: Kepsek + Stempel. Kanan: Bendahara.
            var bkuKepsekScale = 100 / ttdKepsekImage.width;
            var bkuKepsekDims = ttdKepsekImage.scale(bkuKepsekScale);

            lastPage.drawImage(stempelImage, {
                x: 65,
                y: 70,
                width: stempelDims.width,
                height: stempelDims.height,
            });
            lastPage.drawImage(ttdKepsekImage, {
                x: 109,
                y: 70,
                width: bkuKepsekDims.width,
                height: bkuKepsekDims.height,
            });

            if (ttdBendaharaImage && ttdBendaharaDims) {
                lastPage.drawImage(ttdBendaharaImage, {
                    x: 620,
                    y: 70,
                    width: ttdBendaharaDims.width,
                    height: ttdBendaharaDims.height,
                });
            }
        }

        var modifiedPdfBytes = await pdfDoc.save();

        // Trigger download
        var blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        showToast('Dokumen berhasil diproses dan diunduh!', 'success');

    } catch (err) {
        console.error(err);
        showToast('Gagal memproses PDF: ' + err.message, 'error');
    } finally {
        btn.innerHTML = '<i data-lucide="download" style="width:18px;height:18px;vertical-align:middle;margin-right:8px;"></i> Proses & Download PDF';
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
}

