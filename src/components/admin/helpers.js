// Не-компонентные помощники админки (вынесены из ui.jsx ради fast refresh).

let toastTimer;
export function showToast(msg, type = 'ok') {
  const t = document.getElementById('__toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

export const fmtDate = d => d ? new Date(d).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
export const fmtDateTime = d => d ? new Date(d).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Выгрузка в Excel: sheets = [{ name, rows: [{col: value}] }]. xlsx грузим лениво. */
export async function exportXlsx(fileName, sheets) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ '': 'Нет данных' }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.xlsx');
}
