// ===== NAVIGATION =====
function navigateTo(page) {
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + page);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
}

// ===== DATE =====
function setCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const el = document.getElementById('current-date');
  if (el) el.textContent = now.toLocaleDateString('th-TH', options);
}

// ===== PRODUCTS (เก็บใน localStorage) =====
function getProducts() {
  return JSON.parse(localStorage.getItem('bb_products') || '[]');
}

function saveProducts(products) {
  localStorage.setItem('bb_products', JSON.stringify(products));
}

// ===== FILE IMPORT =====
let pendingProducts = [];

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    pendingProducts = [];
    rows.forEach((row, i) => {
      if (i === 0) return; // ข้าม header
      if (!row[1]) return; // ข้ามแถวว่าง
      pendingProducts.push({
        id: row[0] || (i),
        name: row[1],
        unit1: row[2] || '',
        unit2: row[3] || '',
        unit3: row[4] || '',
      });
    });

    document.getElementById('file-name').textContent = '📄 ' + file.name;
    document.getElementById('file-count').textContent = 'พบ ' + pendingProducts.length + ' รายการ';
    document.getElementById('file-preview').classList.remove('hidden');
  };
  reader.readAsArrayBuffer(file);
}

function confirmUpload() {
  if (pendingProducts.length === 0) return;
  showUploadPopup();

  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    document.getElementById('progress-bar').style.width = progress + '%';
    document.getElementById('progress-text').textContent = progress + '%';
    if (progress >= 100) {
      clearInterval(interval);
      saveProducts(pendingProducts);
      pendingProducts = [];
      document.getElementById('file-preview').classList.add('hidden');
      document.getElementById('fileInput').value = '';
      hideUploadPopup();
      alert('✅ อัพโหลดสำเร็จ ' + getProducts().length + ' รายการ');
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

function cancelPopup() {
  hideUploadPopup();
}

// ===== RENDER STOCK / POS LIST =====
function renderList(type) {
  const products = getProducts();
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;

  if (products.length === 0) {
    listEl.innerHTML = '<p class="empty-state">ยังไม่มีรายการสินค้า<br>กรุณา Import ไฟล์ก่อนครับ</p>';
    return;
  }

  listEl.innerHTML = products.map(p => `
    <div class="item-row" onclick="openEntry('${type}', ${p.id}, '${p.name}', '${p.unit1}', '${p.unit2}', '${p.unit3}')">
      <span class="item-no">${p.id}</span>
      <span class="item-name">${p.name}</span>
      <button class="item-btn">บันทึก</button>
    </div>
  `).join('');
}

function filterList(type, keyword) {
  const products = getProducts();
  const listEl = document.getElementById(type + '-list');
  if (!listEl) return;

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(keyword.toLowerCase()) ||
    String(p.id).includes(keyword)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-state">ไม่พบรายการที่ค้นหาครับ</p>';
    return;
  }

  listEl.innerHTML = filtered.map(p => `
    <div class="item-row" onclick="openEntry('${type}', ${p.id}, '${p.name}', '${p.unit1}', '${p.unit2}', '${p.unit3}')">
      <span class="item-no">${p.id}</span>
      <span class="item-name">${p.name}</span>
      <button class="item-btn">บันทึก</button>
    </div>
  `).join('');
}

// ===== OPEN ENTRY (กรอกจำนวน) =====
function openEntry(type, id, name, unit1, unit2, unit3) {
  // จะทำใน step ถัดไปครับ
  alert('เปิดหน้ากรอกสต็อก: ' + name);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  renderList('stock');
  renderList('pos');
});