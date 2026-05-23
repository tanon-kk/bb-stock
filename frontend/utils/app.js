// ===== NAVIGATION =====
function navigateTo(page) {
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + page);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
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

// ===== PRODUCTS =====
function getProducts() {
  return JSON.parse(localStorage.getItem('bb_products') || '[]');
}
function saveProducts(products) {
  localStorage.setItem('bb_products', JSON.stringify(products));
}

// ===== SESSION DATA (ข้อมูลที่กรอกในรอบนี้) =====
function getSessionData() {
  return JSON.parse(localStorage.getItem('bb_session') || '{}');
}
function saveSessionData(data) {
  localStorage.setItem('bb_session', JSON.stringify(data));
}

// ===== FILE IMPORT =====
let pendingProducts = [];

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
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    pendingProducts = [];
    rows.forEach((row, i) => {
      if (i === 0) return;
      if (!row[1]) return;
      pendingProducts.push({
        id: row[0] || i,
        name: String(row[1]).trim(),
        unit1: row[2] ? String(row[2]).trim() : '',
        unit2: row[3] ? String(row[3]).trim() : '',
        unit3: row[4] ? String(row[4]).trim() : '',
      });
    });

    document.getElementById('file-name').textContent = '📄 ' + file.name;
    document.getElementById('file-count').textContent = 'พบ ' + pendingProducts.length + ' รายการสินค้า';
    document.getElementById('file-preview').classList.remove('hidden');
  };
  reader.readAsArrayBuffer(file);
}

function confirmUpload() {
  if (pendingProducts.length === 0) return;
  showUploadPopup();
  let progress = 0;
  const interval = setInterval(() => {
    progress += 8;
    document.getElementById('progress-bar').style.width = Math.min(progress, 100) + '%';
    document.getElementById('progress-text').textContent = Math.min(progress, 100) + '%';
    if (progress >= 100) {
      clearInterval(interval);
      saveProducts(pendingProducts);
      // ล้าง session เดิมเมื่อ import ใหม่
      localStorage.removeItem('bb_session');
      pendingProducts = [];
      document.getElementById('file-preview').classList.add('hidden');
      document.getElementById('fileInput').value = '';
      hideUploadPopup();
      showToast('✅ อัพโหลดสำเร็จ ' + getProducts().length + ' รายการ');
      navigateTo('dashboard');
    }
  }, 80);
}

function cancelUpload() {
  pendingProducts = [];
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
  const products = getProducts();
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;

  if (products.length === 0) {
    listEl.innerHTML = '<p class="empty-state">ยังไม่มีรายการสินค้า<br>กรุณากด "เพิ่มรายการสินค้า" ก่อนครับ</p>';
    return;
  }

  const session = getSessionData();

  listEl.innerHTML = products.map(p => {
    const key = type + '_' + p.id;
    const saved = session[key];
    const hasSaved = saved && (saved.v1 || saved.v2 || saved.v3);
    return `
      <div class="item-row" onclick="openEntry('${type}', '${p.id}', '${p.name}', '${p.unit1}', '${p.unit2}', '${p.unit3}')">
        <span class="item-no">${p.id}</span>
        <span class="item-name">${p.name}${hasSaved ? ' <span style="color:#1D9E75;font-size:11px;">✓</span>' : ''}</span>
        <button class="item-btn">${hasSaved ? 'แก้ไข' : 'บันทึก'}</button>
      </div>
    `;
  }).join('');
}

function filterList(type, keyword) {
  const products = getProducts();
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;
  const session = getSessionData();

  const filtered = keyword
    ? products.filter(p =>
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        String(p.id).includes(keyword))
    : products;

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-state">ไม่พบรายการที่ค้นหาครับ</p>';
    return;
  }

  listEl.innerHTML = filtered.map(p => {
    const key = type + '_' + p.id;
    const saved = session[key];
    const hasSaved = saved && (saved.v1 || saved.v2 || saved.v3);
    return `
      <div class="item-row" onclick="openEntry('${type}', '${p.id}', '${p.name}', '${p.unit1}', '${p.unit2}', '${p.unit3}')">
        <span class="item-no">${p.id}</span>
        <span class="item-name">${p.name}${hasSaved ? ' <span style="color:#1D9E75;font-size:11px;">✓</span>' : ''}</span>
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

  // ตั้งค่า label หน่วย
  document.getElementById('label-u1').textContent = unit1 || 'หน่วย 1';
  document.getElementById('label-u2').textContent = unit2 || 'หน่วย 2';
  document.getElementById('label-u3').textContent = unit3 || 'หน่วย 3';

  // แสดง/ซ่อน column ตามที่มี
  document.getElementById('group-u2').style.display = unit2 ? 'flex' : 'none';
  document.getElementById('group-u3').style.display = unit3 ? 'flex' : 'none';

  // เคลียร์ input
  document.getElementById('input-u1').value = '';
  document.getElementById('input-u2').value = '';
  document.getElementById('input-u3').value = '';

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

  // แปลง fraction เช่น 2/5 → 100 (สำหรับ ml)
  function parseVal(val, unit) {
    if (!val) return 0;
    if (val.includes('/')) {
      const parts = val.split('/');
      const num = parseFloat(parts[0]) || 0;
      const den = parseFloat(parts[1]) || 1;
      return Math.round((num / den) * parseFloat(unit)) || 0;
    }
    return parseFloat(val) || 0;
  }

  const session = getSessionData();
  const key = currentEntry.type + '_' + currentEntry.id;
  const existing = session[key] || { v1: 0, v2: 0, v3: 0 };

  // +บวกกับของเดิม
  const n1 = (parseFloat(v1) || 0);
  const n2 = (parseFloat(v2) || 0);
  const n3Raw = v3;

  // สำหรับ v3 ให้แปลง fraction แล้วบวก
  let n3 = 0;
  if (n3Raw.includes('/')) {
    const parts = n3Raw.split('/');
    n3 = (parseFloat(parts[0]) || 0) / (parseFloat(parts[1]) || 1);
  } else {
    n3 = parseFloat(n3Raw) || 0;
  }

  session[key] = {
    id: currentEntry.id,
    name: currentEntry.name,
    unit1: currentEntry.unit1,
    unit2: currentEntry.unit2,
    unit3: currentEntry.unit3,
    v1: (existing.v1 || 0) + n1,
    v2: (existing.v2 || 0) + n2,
    v3: (existing.v3 || 0) + n3,
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
      background:rgba(255,255,255,0.92); color:#a0435a;
      padding:10px 22px; border-radius:999px;
      font-family:var(--font,Kanit); font-size:14px; font-weight:600;
      box-shadow:0 4px 20px rgba(220,100,130,0.25);
      border:1px solid rgba(255,180,200,0.5);
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