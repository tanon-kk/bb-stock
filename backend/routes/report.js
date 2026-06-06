const express = require('express');
const router  = express.Router();
const { writeSheet, ensureSheet, cleanOldSheets } = require('../services/googleSheets');

// บันทึกรายงานลง Google Sheet
router.post('/save', async (req, res) => {
  try {
    const { month, year, stockData, posData } = req.body;

    if (!month || !year || !stockData) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบครับ' });
    }

    // ชื่อ sheet เช่น "พฤษภาคม2569"
    const sheetName = `${month}${year}`;

    await ensureSheet(sheetName);
    await cleanOldSheets();

    // สร้าง header
    const rows = [
      ['BiiBim Stock — รายงานสต็อกสินค้า'],
      [`เดือน: ${month} ${year}`],
      [`วันที่บันทึก: ${new Date().toLocaleDateString('th-TH')}`],
      [],
      ['=== สต็อกสินค้า ==='],
      ['ลำดับ', 'รายการสินค้า', 'หน่วย 1', 'หน่วย 2', 'หน่วย 3', 'หมายเหตุ'],
    ];

    // เพิ่มข้อมูล stock
    stockData.forEach((item, i) => {
      rows.push([
        i + 1,
        item.name,
        item.v1 ? `${item.v1} ${item.unit1}` : '-',
        item.v2 ? `${item.v2} ${item.unit2}` : '-',
        item.v3 ? `${item.v3} ${item.unit3}` : '-',
        item.note || '',
      ]);
    });

    // เพิ่มข้อมูล POS ถ้ามี
    if (posData && posData.length > 0) {
      rows.push([]);
      rows.push(['=== สินค้าระบบ POS ===']);
      rows.push(['ลำดับ', 'รายการสินค้า', 'หน่วย 1', 'หน่วย 2', 'หน่วย 3', 'หมายเหตุ']);
      posData.forEach((item, i) => {
        rows.push([
          i + 1,
          item.name,
          item.v1 ? `${item.v1} ${item.unit1}` : '-',
          item.v2 ? `${item.v2} ${item.unit2}` : '-',
          item.v3 ? `${item.v3} ${item.unit3}` : '-',
          item.note || '',
        ]);
      });
    }

    await writeSheet(sheetName, rows);

    res.json({ success: true, sheetName });

  } catch (err) {
    console.error('Report save error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;