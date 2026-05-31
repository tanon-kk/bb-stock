// ===== NAVIGATION =====
function navigateTo(page) {
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + page);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);

  document.body.className = '';
  const themeMap = {
    dashboard: 'theme-stock',
    stock:     'theme-stock',
    import:    'theme-import',
    pos:       'theme-pos',
    report:    'theme-report',
  };
  document.body.classList.add(themeMap[page] || 'theme-stock');

  if (page === 'stock') renderList('stock');
  if (page === 'pos') renderList('pos');
}

// ===== DATE =====
function setCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const el = document.getElementById('current-date');
  if (el) el.textContent = now.toLocaleDateString('th-TH', options);
}

// ===== STORAGE =====
function getProducts(type) {
  const key = type === 'consumable' ? 'bb_consumable' : 'bb_products';
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveProducts(type, products) {
  const key = type === 'consumable' ? 'bb_consumable' : 'bb_products';
  localStorage.setItem(key, JSON.stringify(products));
}

function getSessionData() {
  return JSON.parse(localStorage.getItem('bb_session') || '{}');
}

function saveSessionData(data) {
  localStorage.setItem('bb_session', JSON.stringify(data));
}

// ===== FILE IMPORT =====
let pendingStock = [];
let pendingConsumable = [];

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const allowed = ['.xlsx','.xls','.xlsm','.xlsb','.csv','.ods'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) {
    showToast('⚠️ รองรับไฟล์ Excel และ CSV เท่านั้นครับ');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      pendingStock = [];
      pendingConsumable = [];

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        let dataStartRow = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          if (rows[i][0] && typeof rows[i][0] === 'number') {
            dataStartRow = i;
            break;
          }
        }

        const items = [];
        for (let i = dataStartRow; i < rows.length; i++) {
          const row = rows[i];
          const id = row[0];
          const name = String(row[1] || '').trim();
          if (!id || !name || typeof id !== 'number') continue;

          items.push({
            id: Math.round(id),
            name: name,
            unit1: String(row[2] || '').trim(),
            unit2: String(row[3] || '').trim(),
            unit3: String(row[4] || '').trim(),
          });
        }

        const isConsumable = sheetName.includes('สิ้นเปลือง') ||
                             sheetName.includes('วัสดุ') ||
                             sheetName.toLowerCase().includes('consumable');

        if (isConsumable) {
          pendingConsumable = items;
        } else {
          pendingStock = items;
        }
      });

      const total = pendingStock.length + pendingConsumable.length;
      if (total === 0) {
        showToast('⚠️ ไม่พบรายการสินค้าในไฟล์นี้ครับ');
        input.value = '';
        return;
      }

      document.getElementById('file-name').textContent = '📄 ' + file.name;
      document.getElementById('file-count').textContent =
        `พบสินค้า ${pendingStock.length} รายการ | วัสดุสิ้นเปลือง ${pendingConsumable.length} รายการ`;
      document.getElementById('file-preview').classList.remove('hidden');

    } catch(err) {
      showToast('⚠️ เกิดข้อผิดพลาด: ' + err.message);
      input.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

function confirmUpload() {
  if (pendingStock.length === 0 && pendingConsumable.length === 0) return;
  showUploadPopup();
  let progress = 0;
  const interval = setInterval(() => {
    progress += 8;
    document.getElementById('progress-bar').style.width = Math.min(progress, 100) + '%';
    document.getElementById('progress-text').textContent = Math.min(progress, 100) + '%';
    if (progress >= 100) {
      clearInterval(interval);
      saveProducts('stock', pendingStock);
      saveProducts('consumable', pendingConsumable);
      localStorage.removeItem('bb_session');
      pendingStock = [];
      pendingConsumable = [];
      document.getElementById('file-preview').classList.add('hidden');
      document.getElementById('fileInput').value = '';
      hideUploadPopup();
      showToast(`✅ อัพโหลดสำเร็จ ${getProducts('stock').length + getProducts('consumable').length} รายการ`);
      navigateTo('dashboard');
    }
  }, 80);
}

function cancelUpload() {
  pendingStock = [];
  pendingConsumable = [];
  document.getElementById('file-preview').classList.add('hidden');
  document.getElementById('fileInput').value = '';
}

function showUploadPopup() {
  document.getElementById('upload-popup').classList.remove('hidden');
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-text').textContent = '0%';
}

function hideUploadPopup() {
  document.getElementById('upload-popup').classList.add('hidden');
}

function cancelPopup() { hideUploadPopup(); }

// ===== RENDER LIST =====
function renderList(type) {
  const stock = getProducts('stock');
  const consumable = getProducts('consumable');
  const allProducts = [
    ...stock.map(p => ({ ...p, groupType: 'stock' })),
    ...consumable.map(p => ({ ...p, groupType: 'consumable' }))
  ];
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;

  if (allProducts.length === 0) {
    listEl.innerHTML = '<p class="empty-state">ยังไม่มีรายการสินค้า<br>กรุณากด "เพิ่มรายการสินค้า" ก่อนครับ</p>';
    return;
  }

  const session = getSessionData();

  listEl.innerHTML = allProducts.map(p => {
    const key = type + '_' + p.groupType + '_' + p.id;
    const saved = session[key];
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
      <div class="item-row" onclick="openEntry('${type}', '${p.groupType}_${p.id}', \`${p.name}\`, '${p.unit1}', '${p.unit2}', '${p.unit3}')">
        <span class="item-no">${p.id}</span>
        <div class="item-name-wrap">
          <span class="item-name">${p.name}</span>
          ${savedText}
        </div>
        <button class="item-btn">${hasSaved ? 'แก้ไข' : 'บันทึก'}</button>
      </div>
    `;
  }).join('');
}

function filterList(type, keyword) {
  const stock = getProducts('stock');
  const consumable = getProducts('consumable');
  const allProducts = [
    ...stock.map(p => ({ ...p, groupType: 'stock' })),
    ...consumable.map(p => ({ ...p, groupType: 'consumable' }))
  ];
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;
  const session = getSessionData();

  const filtered = keyword
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        String(p.id).includes(keyword))
    : allProducts;

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-state">ไม่พบรายการที่ค้นหาครับ</p>';
    return;
  }

  listEl.innerHTML = filtered.map(p => {
    const key = type + '_' + p.groupType + '_' + p.id;
    const saved = session[key];
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
      <div class="item-row" onclick="openEntry('${type}', '${p.groupType}_${p.id}', \`${p.name}\`, '${p.unit1}', '${p.unit2}', '${p.unit3}')">
        <span class="item-no">${p.id}</span>
        <div class="item-name-wrap">
          <span class="item-name">${p.name}</span>
          ${savedText}
        </div>
        <button class="item-btn">${hasSaved ? 'แก้ไข' : 'บันทึก'}</button>
      </div>
    `;
  }).join('');
}

// ===== ENTRY MODAL =====
let currentEntry = {};

function openEntry(type, id, name, unit1, unit2, unit3) {
  currentEntry = { type, id, name, unit1, unit2, unit3 };

  document.getElementById('modal-title').textContent = name;
  document.getElementById('modal-subtitle').textContent =
    type === 'stock' ? '📦 บันทึกสต็อกสินค้า' : '🖥️ บันทึกระบบ POS';

  const groups = [
    { group: 'group-u1', label: 'label-u1', input: 'input-u1', unit: unit1 },
    { group: 'group-u2', label: 'label-u2', input: 'input-u2', unit: unit2 },
    { group: 'group-u3', label: 'label-u3', input: 'input-u3', unit: unit3 },
  ];

  groups.forEach(g => {
    const groupEl = document.getElementById(g.group);
    const labelEl = document.getElementById(g.label);
    const inputEl = document.getElementById(g.input);
    if (g.unit && g.unit.trim() !== '') {
      groupEl.style.display = 'flex';
      labelEl.textContent = g.unit;
      inputEl.value = '';
      inputEl.placeholder = '0';
    } else {
      groupEl.style.display = 'none';
      inputEl.value = '';
    }
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

  function parseVal(val) {
    if (!val) return 0;
    if (String(val).includes('/')) {
      const parts = String(val).split('/');
      return (parseFloat(parts[0]) || 0) / (parseFloat(parts[1]) || 1);
    }
    return parseFloat(val) || 0;
  }

  const session = getSessionData();
  const key = currentEntry.type + '_' + currentEntry.id;
  const existing = session[key] || { v1: 0, v2: 0, v3: 0 };

  session[key] = {
    id: currentEntry.id,
    name: currentEntry.name,
    unit1: currentEntry.unit1,
    unit2: currentEntry.unit2,
    unit3: currentEntry.unit3,
    v1: (existing.v1 || 0) + parseVal(v1),
    v2: (existing.v2 || 0) + parseVal(v2),
    v3: (existing.v3 || 0) + parseVal(v3),
    type: currentEntry.type,
    updatedAt: new Date().toISOString(),
  };

  saveSessionData(session);
  closeEntry();
  showToast('✅ บันทึก ' + currentEntry.name + ' แล้วครับ');
  renderList(currentEntry.type);
}

// ===== TOAST =====
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
      background:rgba(255,255,255,0.92); color:var(--theme-text);
      padding:10px 22px; border-radius:999px;
      font-family:var(--font,Kanit); font-size:14px; font-weight:600;
      box-shadow:0 4px 20px rgba(0,0,0,0.15);
      border:1px solid rgba(255,255,255,0.80);
      z-index:9999; transition:opacity 0.3s ease;
      white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
});