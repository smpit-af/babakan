// ============================================================
// Google Apps Script — Buat Soal Asesmen
// SMP IT AL-FATHONAH
// 
// CARA PAKAI:
// 1. Buka https://script.google.com dengan akun asfagamecenter@gmail.com
// 2. Buat project baru
// 3. Paste seluruh kode ini ke file Code.gs
// 4. Klik Deploy > New deployment
// 5. Pilih type: Web app
// 6. Execute as: Me
// 7. Who has access: Anyone
// 8. Klik Deploy > Salin URL Web App
// 9. Masukkan URL tersebut ke dashboard (menu Buat Soal Asesmen > Konfigurasi)
// ============================================================

/**
 * doPost — Endpoint utama yang menerima data soal dari dashboard
 * Dashboard mengirim JSON via fetch() POST
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === 'delete') {
      return handleDelete(data);
    }
    
    if (data.action === 'close') {
      return handleClose(data);
    }
    
    return handleCreate(data);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle penghapusan Form dan Sheet
 */
function handleDelete(data) {
  var deletedCount = 0;
  
  if (data.formUrl) {
    try {
      var formId = FormApp.openByUrl(data.formUrl).getId();
      deleteTriggerForForm(formId); // Hapus trigger-nya dulu
      DriveApp.getFileById(formId).setTrashed(true);
      deletedCount++;
    } catch(e) {}
  }
  
  if (data.sheetUrl) {
    try {
      var sheetId = SpreadsheetApp.openByUrl(data.sheetUrl).getId();
      DriveApp.getFileById(sheetId).setTrashed(true);
      deletedCount++;
    } catch(e) {}
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'File berhasil dihapus ke tempat sampah (' + deletedCount + ' file).'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle penutupan Form (arsip) — form tidak bisa diakses lagi
 */
function handleClose(data) {
  var closed = false;
  if (data.formUrl) {
    try {
      var form = FormApp.openByUrl(data.formUrl);
      deleteTriggerForForm(form.getId()); // Hapus trigger-nya
      form.setAcceptingResponses(false);
      form.setCustomClosedFormMessage('Formulir ujian ini telah ditutup dan diarsipkan oleh guru. Terima kasih.');
      closed = true;
    } catch(e) {}
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: closed ? 'Form berhasil ditutup.' : 'Form tidak ditemukan atau sudah ditutup.'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Hapus trigger yang terkait dengan form tertentu
 */
function deleteTriggerForForm(formId) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    try {
      if (triggers[i].getHandlerFunction() === 'onFormSubmitGrading' && triggers[i].getTriggerSourceId() === formId) {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    } catch(e) {}
  }
}

/**
 * Handle pembuatan wujud soal
 */
function handleCreate(data) {
  // 1. Buat Google Form (mode Quiz)
  var form = createQuizForm(data);
  var formUrl = form.getPublishedUrl();
  var editUrl = form.getEditUrl();
  
  // 2. Buat/Dapatkan Google Sheet untuk log kunci jawaban & hasil
  var sheet = createAnswerSheet(data, form);
  var sheetUrl = sheet.getUrl();
  
  // 3. Log kunci jawaban ke sheet
  logKunciJawaban(data, sheet);
  
  // 4. Set trigger untuk auto-grading
  setupFormSubmitTrigger(form, sheet, data);

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    formUrl: formUrl,
    editUrl: editUrl,
    sheetUrl: sheetUrl,
    message: 'Google Form berhasil dibuat!'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Buat Google Form dengan mode Quiz
 */
function createQuizForm(data) {
  var tipeFull = data.tipe === 'SAS' ? 'SUMATIF AKHIR SEMESTER (SAS)' : (data.tipe === 'STS' ? 'SUMATIF TENGAH SEMESTER (STS)' : (data.tipe || 'ASESMEN'));
  var formTitle = tipeFull + ' - SMP IT AL FATHONAH BABAKAN';
  
  var form = FormApp.create(formTitle);
  
  // TIDAK menggunakan mode Quiz agar kolom "Skor" tidak muncul di sheet responses.
  // Semua kalkulasi nilai ditangani oleh tab "Hasil Koreksi" secara custom.
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(true);
  form.setShowLinkToRespondAgain(false);
  
  // Format Tanggal
  var tglStr = data.tanggal || '-';
  
  // Deskripsi form
  var desc = 'Mata Pelajaran : ' + (data.mapel || '-') + '\n' +
             'Kelas : ' + (data.kelas || '-') + '\n' +
             'Tahun Pelajaran : ' + (data.tahun || '-') + '\n' +
             'Semester : ' + (data.semester || '-') + '\n' +
             'Alokasi Waktu : ' + (data.waktu ? data.waktu + ' Menit' : '-') + '\n' +
             'Hari/Tanggal : ' + tglStr + '\n\n' +
             'Kerjakan soal berikut dengan teliti, baca soal terlebih dahulu sebelum memberikan jawaban.\n' +
             'Pastikan Anda sudah login dengan email yang benar.';
  form.setDescription(desc);
  
  // Tambah field Nama Siswa
  form.addTextItem()
    .setTitle('Nama Lengkap')
    .setRequired(true);
  
  // Tambah field Kelas
  form.addTextItem()
    .setTitle('Kelas')
    .setRequired(true);
  
  // Tambah soal satu per satu
  var soalList = data.soal || [];
  for (var i = 0; i < soalList.length; i++) {
    var s = soalList[i];
    var naskah = 'Soal ' + s.nomor + '. ' + (s.naskah || '');
    
    if (s.tipe === 'pg') {
      // Pilihan Ganda
      var item = form.addMultipleChoiceItem();
      item.setTitle(naskah);
      item.setRequired(true);
      
      var choices = [];
      if (s.opsi && s.opsi.a) choices.push(item.createChoice('A. ' + s.opsi.a));
      if (s.opsi && s.opsi.b) choices.push(item.createChoice('B. ' + s.opsi.b));
      if (s.opsi && s.opsi.c) choices.push(item.createChoice('C. ' + s.opsi.c));
      if (s.opsi && s.opsi.d) choices.push(item.createChoice('D. ' + s.opsi.d));
      
      if (choices.length > 0) {
        item.setChoices(choices);
      }
      
    } else if (s.tipe === 'essay') {
      var essayItem = form.addParagraphTextItem();
      essayItem.setTitle(naskah);
      essayItem.setRequired(true);
    }
  }
  
  return form;
}

/**
 * Buat Google Sheet untuk logging
 */
function createAnswerSheet(data, form) {
  var ss = SpreadsheetApp.create('Hasil Asesmen — ' + (data.judul || 'Tanpa Judul'));
  
  // Link form responses ke sheet ini
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  
  return ss;
}

/**
 * Log kunci jawaban ke sheet terpisah
 */
function logKunciJawaban(data, ss) {
  // Buat sheet baru untuk kunci jawaban
  var kunciSheet = ss.insertSheet('Kunci Jawaban');
  
  // Header
  kunciSheet.appendRow(['No Soal', 'Tipe', 'Naskah Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci Jawaban']);
  
  // Style header
  var headerRange = kunciSheet.getRange(1, 1, 1, 8);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1e3a8a');
  headerRange.setFontColor('#ffffff');
  
  // Data soal
  var soalList = data.soal || [];
  for (var i = 0; i < soalList.length; i++) {
    var s = soalList[i];
    var row = [
      s.nomor,
      s.tipe === 'pg' ? 'Pilihan Ganda' : 'Essay',
      s.naskah || '',
      (s.opsi && s.opsi.a) || '',
      (s.opsi && s.opsi.b) || '',
      (s.opsi && s.opsi.c) || '',
      (s.opsi && s.opsi.d) || '',
      s.kunci ? (s.kunci.indexOf('[OR]') === 0 ? s.kunci.replace('[OR]', '') + ' (METODE: SALAH SATU BENAR)' : s.kunci) : '-'
    ];
    kunciSheet.appendRow(row);
  }
  
  // Warnai kunci jawaban
  var lastRow = kunciSheet.getLastRow();
  if (lastRow > 1) {
    var kunjiRange = kunciSheet.getRange(2, 8, lastRow - 1, 1);
    kunjiRange.setFontWeight('bold');
    kunjiRange.setFontColor('#16a34a');
  }
  
  // Auto-resize kolom
  for (var c = 1; c <= 8; c++) {
    kunciSheet.autoResizeColumn(c);
  }
  
  // Protect kunci jawaban sheet (hanya owner bisa edit)
  var protection = kunciSheet.protect().setDescription('Kunci Jawaban - Hanya Guru');
  protection.setWarningOnly(true);
}

/**
 * Setup onFormSubmit trigger untuk auto-grading
 */
function setupFormSubmitTrigger(form, ss, data) {
  // Simpan data kunci ke PropertiesService untuk diakses oleh trigger
  var pgKunci = {};
  var essayKunci = {};
  var soalList = data.soal || [];
  for (var i = 0; i < soalList.length; i++) {
    var s = soalList[i];
    if (s.tipe === 'pg' && s.kunci) {
      pgKunci['soal_' + s.nomor] = s.kunci;
    } else if (s.tipe === 'essay' && s.kunci && s.kunci.trim().length > 0) {
      essayKunci['soal_' + s.nomor] = s.kunci;
    }
  }
  
  PropertiesService.getScriptProperties().setProperty('kunci_' + form.getId(), JSON.stringify(pgKunci));
  PropertiesService.getScriptProperties().setProperty('essay_kunci_' + form.getId(), JSON.stringify(essayKunci));
  PropertiesService.getScriptProperties().setProperty(
    'sheet_' + form.getId(), 
    ss.getId()
  );
  PropertiesService.getScriptProperties().setProperty(
    'judul_' + form.getId(),
    data.judul || ''
  );
  PropertiesService.getScriptProperties().setProperty('bobot_pg_' + form.getId(), data.bobotPG || 2);
  PropertiesService.getScriptProperties().setProperty('bobot_essay_' + form.getId(), data.bobotEssay || 0);
  PropertiesService.getScriptProperties().setProperty('jml_essay_' + form.getId(), data.jmlEssay || 0);
  PropertiesService.getScriptProperties().setProperty('tahun_' + form.getId(), data.tahun || '');
  PropertiesService.getScriptProperties().setProperty('semester_' + form.getId(), data.semester || '');
  PropertiesService.getScriptProperties().setProperty('mapel_' + form.getId(), data.mapel || '');
  
  // Bersihkan trigger lama yang sudah tidak terpakai (cegah error "terlalu banyak pemicu")
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var t = 0; t < allTriggers.length; t++) {
    var trigger = allTriggers[t];
    if (trigger.getHandlerFunction() === 'onFormSubmitGrading') {
      // Hapus trigger yang form-nya sudah dihapus/tidak valid
      try {
        var triggerSrc = trigger.getTriggerSourceId();
        // Cek apakah form masih ada
        try { FormApp.openById(triggerSrc); } 
        catch(e) {
          // Form sudah tidak ada, hapus trigger-nya
          ScriptApp.deleteTrigger(trigger);
        }
      } catch(e) {
        ScriptApp.deleteTrigger(trigger);
      }
    }
  }
  
  // Buat trigger onFormSubmit
  ScriptApp.newTrigger('onFormSubmitGrading')
    .forForm(form)
    .onFormSubmit()
    .create();
}

/**
 * Auto-grading saat siswa submit form
 * Dipanggil otomatis oleh trigger
 */
function onFormSubmitGrading(e) {
  try {
    var form = FormApp.openById(e.source.getId());
    var formId = form.getId();
    
    // Ambil data kunci dari properties
    var kuniciJson = PropertiesService.getScriptProperties().getProperty('kunci_' + formId);
    var essayKunciJson = PropertiesService.getScriptProperties().getProperty('essay_kunci_' + formId);
    if (!kuniciJson) return;
    
    var kunci = JSON.parse(kuniciJson);
    var essayKunci = essayKunciJson ? JSON.parse(essayKunciJson) : {};
    var sheetId = PropertiesService.getScriptProperties().getProperty('sheet_' + formId);
    if (!sheetId) return;
    
    var ss = SpreadsheetApp.openById(sheetId);
    
    var bobotPG = parseInt(PropertiesService.getScriptProperties().getProperty('bobot_pg_' + formId)) || 2;
    var bobotEssay = parseInt(PropertiesService.getScriptProperties().getProperty('bobot_essay_' + formId)) || 0;
    var jmlEssay = parseInt(PropertiesService.getScriptProperties().getProperty('jml_essay_' + formId)) || 0;
    var tahunPelajaran = PropertiesService.getScriptProperties().getProperty('tahun_' + formId) || '';
    var semesterVal = PropertiesService.getScriptProperties().getProperty('semester_' + formId) || '';
    var mapelVal = PropertiesService.getScriptProperties().getProperty('mapel_' + formId) || '';
    
    // Cari atau buat sheet "Hasil Koreksi"
    var hasilSheet = ss.getSheetByName('Hasil Koreksi');
    if (!hasilSheet) {
      hasilSheet = ss.insertSheet('Hasil Koreksi');
      // Header
      var headers = ['Timestamp', 'Email', 'Nama', 'Kelas', 'Mata Pelajaran', 'Tahun Pelajaran', 'Semester'];
      
      // Tambah header per soal
      var soalCount = Object.keys(kunci).length + jmlEssay; // PG + Essay
      for (var n = 1; n <= soalCount; n++) {
        headers.push('Soal ' + n);
        headers.push('Status ' + n);
      }
      headers.push('Benar PG', 'Salah PG', 'TOTAL POIN PG');
      
      for (var e = 1; e <= jmlEssay; e++) {
        headers.push('Poin Essay ' + e + ' (Max: ' + bobotEssay + ')');
      }
      headers.push('TOTAL POIN ESSAY', 'NILAI AKHIR KESELURUHAN');
      
      hasilSheet.appendRow(headers);
      
      // Style header
      var hRange = hasilSheet.getRange(1, 1, 1, headers.length);
      hRange.setFontWeight('bold');
      hRange.setBackground('#1e3a8a');
      hRange.setFontColor('#ffffff');
      
      SpreadsheetApp.flush(); // Paksa google sheet merekam lembaran baru sebelum lanjut ke proses input data
    }
    
    var rowForDebug = [];
    try {
        // Ambil response terakhir
        var response = e.response;
        
        // BUGFIX GOOGLE: Terkadang di submit perdana, e.response terlempar undefined dari server Google.
        // Jika itu terjadi, kita paksa ambil jawaban terakhir secara manual dari form.
        if (!response) {
            var allResponses = form.getResponses();
            if (allResponses.length > 0) {
                response = allResponses[allResponses.length - 1];
            } else {
                throw new Error("Form belum memiliki response sama sekali.");
            }
        }
        
        var itemResponses = response.getItemResponses();
        var email = response.getRespondentEmail() || '-';
        var nama = '';
        var kelasName = '';
        
        for (var j = 0; j < itemResponses.length; j++) {
            var ir = itemResponses[j];
            var title = ir.getItem().getTitle();
            if (title === 'Nama Lengkap') nama = ir.getResponse();
            if (title === 'Kelas') kelasName = ir.getResponse();
        }
        
        var row = [formatDate(new Date()), email, nama, kelasName, mapelVal, tahunPelajaran, semesterVal];
        rowForDebug = row; // Fallback untuk debug error
        
        var benar = 0;
        var salah = 0;
        var statusCells = [];
        var essayScoresOutput = [];
        
        var getJawaban = function(nomor) {
            var prefix = 'Soal ' + nomor + '.';
            for (var m = 0; m < itemResponses.length; m++) {
                if (itemResponses[m].getItem().getTitle().indexOf(prefix) === 0) {
                    return itemResponses[m].getResponse() || '';
                }
            }
            return '';
        };
        
        var soalCount = Object.keys(kunci).length + jmlEssay;
        for (var n = 1; n <= soalCount; n++) {
            var kunjiKey = 'soal_' + n;
            var jawaban = getJawaban(n);
            
            if (kunci[kunjiKey]) {
                // Soal PG
                var isCorrect = false;
                if (jawaban) {
                    var answerLetter = jawaban.charAt(0).toUpperCase();
                    isCorrect = (answerLetter === kunci[kunjiKey]);
                }
                
                row.push(jawaban);
                row.push(isCorrect ? '✅ BENAR' : '❌ SALAH');
                statusCells.push({ col: row.length, correct: isCorrect });
                
                if (isCorrect) benar++; else salah++;
                
            } else if (essayKunci[kunjiKey] && jawaban) {
                // Determine Logic Method
                var rawKey = essayKunci[kunjiKey];
                var isOrLogic = rawKey.indexOf('[OR]') === 0;
                var cleanKey = isOrLogic ? rawKey.substring(4) : rawKey;
                
                var kws = cleanKey.split(',').map(function(k){ return k.trim().toLowerCase(); }).filter(function(k){ return k.length > 0; });
                var ansLower = jawaban.toLowerCase();
                var matches = 0;
                
                for (var w = 0; w < kws.length; w++) {
                    if (ansLower.indexOf(kws[w]) > -1) {
                        matches++;
                        if (isOrLogic) break; // Cukup 1 kata kunci sudah mewakili
                    }
                }
                
                var skor = 0;
                var statusStr = '';
                var colorFlag = null;
                
                if (kws.length > 0) {
                    if (isOrLogic) {
                        // LOGIKA OR (Satu Kata Kunci = FULL)
                        skor = (matches > 0) ? bobotEssay : 0;
                        if (matches > 0) {
                            statusStr = '✅ BENAR (FULL)';
                            colorFlag = true;
                        } else {
                            statusStr = '❌ SALAH (0 Kata Kunci)';
                            colorFlag = false;
                        }
                    } else {
                        // LOGIKA AND / PARSIAL
                        skor = (matches / kws.length) * bobotEssay;
                        if (matches === kws.length) {
                            statusStr = '✅ BENAR (FULL)';
                            colorFlag = true;
                        } else if (matches > 0) {
                            statusStr = '⚠️ KATA KUNCI PARSIAL (' + matches + '/' + kws.length + ')';
                            colorFlag = null; 
                        } else {
                            statusStr = '❌ SALAH (0 Kata Kunci)';
                            colorFlag = false;
                        }
                    }
                } else {
                    statusStr = '❌ SALAH (Kunci Jawaban Kosong)';
                    colorFlag = false;
                }
                
                row.push(jawaban);
                row.push(statusStr);
                statusCells.push({ col: row.length, correct: colorFlag });
                essayScoresOutput.push(isNaN(skor) ? 0 : Math.round(skor));
                
            } else {
                row.push(jawaban);
                row.push('📝 Perlu Koreksi');
                statusCells.push({ col: row.length, correct: null });
                if (!kunci[kunjiKey]) essayScoresOutput.push(''); 
            }
        }
        
        row.push(benar);
        row.push(salah);
        var skorPG = benar * bobotPG;
        row.push(skorPG);
        
        for (var z = 0; z < jmlEssay; z++) {
            row.push(essayScoresOutput[z] !== undefined ? essayScoresOutput[z] : '');
        }
        
        row.push(''); // Placeholder Total Essay
        row.push(''); // Placeholder Nilai Akhir
        
        hasilSheet.appendRow(row);
        var lastRow = hasilSheet.getLastRow();
        
        var colTotalEssay = row.length - 1; 
        var colNilaiAkhir = row.length;
        
        if (jmlEssay > 0) {
            hasilSheet.getRange(lastRow, colTotalEssay).setFormulaR1C1("=SUM(R[0]C[-" + jmlEssay + "]:R[0]C[-1])");
        } else {
            hasilSheet.getRange(lastRow, colTotalEssay).setValue(0);
        }
        hasilSheet.getRange(lastRow, colNilaiAkhir).setFormulaR1C1("=R[0]C[-" + (jmlEssay + 2) + "] + R[0]C[-1]");
        
        for (var k = 0; k < statusCells.length; k++) {
            var sc = statusCells[k];
            var colIdx = sc.col; // sc.col sudah merupakan index 1-based yang 100% akurat
            var cell = hasilSheet.getRange(lastRow, colIdx);
            if (sc.correct === true) {
                cell.setBackground('#dcfce7'); cell.setFontColor('#166534');
            } else if (sc.correct === false) {
                cell.setBackground('#fee2e2'); cell.setFontColor('#991b1b');
            } else {
                cell.setBackground('#fef3c7'); cell.setFontColor('#92400e');
            }
        }
        
        var nilaiCell = hasilSheet.getRange(lastRow, row.length);
        nilaiCell.setBackground('#dcfce7');
        nilaiCell.setFontColor('#166534');
        nilaiCell.setFontWeight('bold');
        
        if (jmlEssay > 0) {
            var startEssayCol = row.length - 1 - jmlEssay; 
            var essayRange = hasilSheet.getRange(lastRow, startEssayCol, 1, jmlEssay);
            essayRange.setBackground('#fef08a');
        }
        
    } catch (e) {
        rowForDebug.push("CRITICAL SCRIPT ERROR: " + e.toString());
        hasilSheet.appendRow(rowForDebug);
    }
  } catch (outerError) {
    Logger.log('onFormSubmitGrading FATAL error: ' + outerError.toString());
  }
}

function formatDate(date) {
    if (!date) return '';
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
}
