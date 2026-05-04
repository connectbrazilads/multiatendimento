const XLSX = require('xlsx');
const filePath = "C:\\Users\\diego\\Documents\\Relatório Equipamentos - Completo 2026.xls";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length > 0) {
        console.log('Headers found:', data[0]);
    } else {
        console.log('No data found in the sheet.');
    }
} catch (err) {
    console.error('Error reading file:', err.message);
}
