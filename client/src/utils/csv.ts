export function downloadCSV(data: any[], filename: string, columns: {key: string, label: string}[]) {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c.key] ?? '';
      // Handle JSON fields
      if (typeof val === 'object') val = JSON.stringify(val);
      // Escape commas and quotes
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
