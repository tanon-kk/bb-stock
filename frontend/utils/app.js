// แสดงวันที่ปัจจุบันภาษาไทย
function setCurrentDate() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const dateStr = now.toLocaleDateString('th-TH', options);
  const el = document.getElementById('current-date');
  if (el) el.textContent = dateStr;
}

setCurrentDate();