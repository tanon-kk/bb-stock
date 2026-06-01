// ============================================================
// NAVIGATION
// ============================================================

function navigateTo(page) {
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));

  const target = document.getElementById('view-' + page);
  if (target) target.classList.add('active');

  window.scrollTo(0, 0);
  setTheme(page);

  if (page === 'stock') renderList('stock');
  if (page === 'pos')   renderList('pos');
}

function setTheme(page) {
  const map = {
    dashboard: 'theme-stock',
    stock:     'theme-stock',
    import:    'theme-import',
    pos:       'theme-pos',
    report:    'theme-report',
  };
  document.body.className = map[page] || 'theme-stock';
}


// ============================================================
// DATE
// ============================================================

function setCurrentDate() {
  const el = document.getElementById('current-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}


// ============================================================
// LOCAL STORAGE
// ============================================================

function getProducts(type) {
  const key = type === 'consumable' ? 'bb_consumable' : 'bb_products';
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveProducts(type, data) {
  const key = type === 'consumable' ? 'bb_consumable' : 'bb_products';
  localStorage.setItem(key, JSON.stringify(data));
}

function getSession() {
  return JSON.parse(localStorage.getItem('bb_session') || '{}');
}

function saveSession(data) {
  localStorage.setItem('bb_session', JSON.stringify(data));
}


// ============================================================
// FILE IMPORT
// ============================================================

let pendingStock      = [];
let pendingConsumable = [];

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const ext     = '.' + file.name.split('.').pop().toLowerCase();
  const allowed = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.ods'];

  if (!allowed.includes(ext)) {
    showToast('⚠️ รองรับไฟล์ Excel และ CSV เท่านั้นครับ');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => parseExcel(new Uint8Array(e.target.result), file.name, input);
  reader.readAsArrayBuffer(file);
}

function parseExcel(buffer, fileName, input) {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });

    pendingStock      = [];
    pendingConsumable = [];

    workbook.SheetNames.forEach(sheetName => {
      const rows  = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
      const items = extractItems(rows);
      const isConsumable = ['สิ้นเปลือง', 'วัสดุ', 'consumable'].some(k =>
        sheetName.toLowerCase().includes(k.toLowerCase())
      );
      if (isConsumable) pendingConsumable = items;
      else              pendingStock      = items;
    });

    const total = pendingStock.length + pendingConsumable.length;

    if (total === 0) {
      showToast('⚠️ ไม่พบรายการสินค้าในไฟล์นี้ครับ');
      input.value = '';
      return;
    }

    document.getElementById('file-name').textContent  = '📄 ' + fileName;
    document.getElementById('file-count').textContent =
      `พบสินค้า ${pendingStock.length} รายการ | วัสดุสิ้นเปลือง ${pendingConsumable.length} รายการ`;
    document.getElementById('file-preview').classList.remove('hidden');

  } catch (err) {
    showToast('⚠️ เกิดข้อผิดพลาด: ' + err.message);
    input.value = '';
  }
}

function extractItems(rows) {
  let startRow = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i][0] && typeof rows[i][0] === 'number') { startRow = i; break; }
  }

  const items = [];
  for (let i = startRow; i < rows.length; i++) {
    const row  = rows[i];
    const id   = row[0];
    const name = String(row[1] || '').trim();
    if (!id || !name || typeof id !== 'number') continue;

    items.push({
      id:    Math.round(id),
      name,
      unit1: String(row[2] || '').trim(),
      unit2: String(row[3] || '').trim(),
      unit3: String(row[4] || '').trim(),
    });
  }
  return items;
}

function confirmUpload() {
  if (!pendingStock.length && !pendingConsumable.length) return;

  showUploadPopup();
  let progress = 0;

  const tick = setInterval(() => {
    progress = Math.min(progress + 8, 100);
    document.getElementById('progress-bar').style.width = progress + '%';
    document.getElementById('progress-text').textContent = progress + '%';

    if (progress >= 100) {
      clearInterval(tick);
      saveProducts('stock',      pendingStock);
      saveProducts('consumable', pendingConsumable);
      localStorage.removeItem('bb_session');

      const total = getProducts('stock').length + getProducts('consumable').length;
      pendingStock = pendingConsumable = [];
      document.getElementById('file-preview').classList.add('hidden');
      document.getElementById('fileInput').value = '';
      hideUploadPopup();
      showToast(`✅ อัพโหลดสำเร็จ ${total} รายการ`);
      navigateTo('dashboard');
    }
  }, 80);
}

function cancelUpload() {
  pendingStock = pendingConsumable = [];
  document.getElementById('file-preview').classList.add('hidden');
  document.getElementById('fileInput').value = '';
}

function showUploadPopup() {
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-text').textContent = '0%';
  document.getElementById('upload-popup').classList.remove('hidden');
}

function hideUploadPopup() {
  document.getElementById('upload-popup').classList.add('hidden');
}

function cancelPopup() {
  hideUploadPopup();
}


// ============================================================
// RENDER LIST
// ============================================================

function buildProductList() {
  let seq = 0;
  return [
    ...getProducts('stock').map(p     => ({ ...p, groupType: 'stock',      seq: ++seq })),
    ...getProducts('consumable').map(p => ({ ...p, groupType: 'consumable', seq: ++seq })),
  ];
}

function renderList(type) {
  const all    = buildProductList();
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;

  if (!all.length) {
    listEl.innerHTML = '<p class="empty-state">ยังไม่มีรายการสินค้า<br>กรุณากด "เพิ่มรายการสินค้า" ก่อนครับ</p>';
    return;
  }

  updateSummary(type, all);
  updateCount(type, all.length);

  const session = getSession();
  listEl.innerHTML = all.map(p => itemRowHTML(type, p, session)).join('');
}

function filterList(type, keyword) {
  const all    = buildProductList();
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;

  const filtered = keyword
    ? all.filter(p =>
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        String(p.seq).includes(keyword))
    : all;

  updateCount(type, filtered.length, keyword ? all.length : null);

  if (!filtered.length) {
    listEl.innerHTML = '<p class="empty-state">ไม่พบรายการที่ค้นหาครับ</p>';
    return;
  }

  const session = getSession();
  listEl.innerHTML = filtered.map(p => itemRowHTML(type, p, session)).join('');
}

function updateSummary(type, all) {
  const session   = getSession();
  const savedCount = all.filter(p => {
    const s = session[type + '_' + p.groupType + '_' + p.id];
    return s && (s.v1 || s.v2 || s.v3);
  }).length;

  const totalEl = document.getElementById(type + '-total');
  const savedEl = document.getElementById(type + '-saved');
  if (totalEl) totalEl.textContent = all.length;
  if (savedEl) savedEl.textContent = savedCount;
}

function updateCount(type, shown, total) {
  const el = document.getElementById(type + '-count');
  if (!el) return;
  el.textContent = total != null
    ? `พบ ${shown} / ${total} รายการ`
    : `ทั้งหมด ${shown} รายการ`;
}

function itemRowHTML(type, p, session) {
  const key      = `${type}_${p.groupType}_${p.id}`;
  const saved    = session[key];
  const hasSaved = saved && (saved.v1 || saved.v2 || saved.v3);

  let savedText = '';
  if (hasSaved) {
    const parts = [];
    if (saved.v1) parts.push(`${saved.v1} ${p.unit1}`);
    if (saved.v2) parts.push(`${saved.v2} ${p.unit2}`);
    if (saved.v3) parts.push(`${saved.v3} ${p.unit3}`);
    savedText = `<div class="item-saved">${parts.join(' | ')}</div>`;
  }

  return `
    <div class="item-row" onclick="openEntry('${type}','${p.groupType}_${p.id}',\`${p.name}\`,'${p.unit1}','${p.unit2}','${p.unit3}')">
      <span class="item-no">${p.seq}</span>
      <div class="item-name-wrap">
        <span class="item-name">${p.name}</span>
        ${savedText}
      </div>
      <button class="item-btn">${hasSaved ? 'แก้ไข' : 'บันทึก'}</button>
    </div>
  `;
}


// ============================================================
// ENTRY MODAL
// ============================================================

let currentEntry = {};

function openEntry(type, id, name, unit1, unit2, unit3) {
  currentEntry = { type, id, name, unit1, unit2, unit3 };

  document.getElementById('modal-title').textContent    = name;
  document.getElementById('modal-subtitle').textContent =
    type === 'stock' ? '📦 บันทึกสต็อกสินค้า' : '🖥️ บันทึกระบบ POS';

  [
    { group: 'group-u1', label: 'label-u1', input: 'input-u1', unit: unit1 },
    { group: 'group-u2', label: 'label-u2', input: 'input-u2', unit: unit2 },
    { group: 'group-u3', label: 'label-u3', input: 'input-u3', unit: unit3 },
  ].forEach(({ group, label, input, unit }) => {
    const show = unit && unit.trim();
    document.getElementById(group).style.display = show ? 'flex' : 'none';
    document.getElementById(label).textContent   = unit || '';
    document.getElementById(input).value         = '';
  });

  document.getElementById('entry-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('input-u1').focus(), 100);
}

function closeEntry() {
  document.getElementById('entry-modal').classList.add('hidden');
  currentEntry = {};
}

function saveEntry() {
  const v1 = document.getElementById('input-u1').value.trim();
  const v2 = document.getElementById('input-u2').value.trim();
  const v3 = document.getElementById('input-u3').value.trim();

  if (!v1 && !v2 && !v3) {
    showToast('⚠️ กรุณากรอกจำนวนอย่างน้อย 1 ช่องครับ');
    return;
  }

  const session  = getSession();
  const key      = `${currentEntry.type}_${currentEntry.id}`;
  const existing = session[key] || { v1: 0, v2: 0, v3: 0 };

  session[key] = {
    ...currentEntry,
    v1: (existing.v1 || 0) + parseVal(v1),
    v2: (existing.v2 || 0) + parseVal(v2),
    v3: (existing.v3 || 0) + parseVal(v3),
    updatedAt: new Date().toISOString(),
  };

  saveSession(session);
  closeEntry();
  showToast('✅ บันทึก ' + currentEntry.name + ' แล้วครับ');
  renderList(currentEntry.type);
}

function parseVal(val) {
  if (!val) return 0;
  if (String(val).includes('/')) {
    const [a, b] = String(val).split('/');
    return (parseFloat(a) || 0) / (parseFloat(b) || 1);
  }
  return parseFloat(val) || 0;
}


// ============================================================
// TOAST NOTIFICATION
// ============================================================

function showToast(msg) {
  let toast = document.getElementById('toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '32px',
      left:         '50%',
      transform:    'translateX(-50%)',
      background:   'rgba(255,255,255,0.92)',
      padding:      '10px 22px',
      borderRadius: '999px',
      fontFamily:   'Kanit, sans-serif',
      fontSize:     '14px',
      fontWeight:   '600',
      boxShadow:    '0 4px 20px rgba(0,0,0,0.15)',
      border:       '1px solid rgba(255,255,255,0.80)',
      zIndex:       '9999',
      transition:   'opacity 0.3s ease',
      whiteSpace:   'nowrap',
    });
    document.body.appendChild(toast);
  }

  toast.textContent  = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}


// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
});