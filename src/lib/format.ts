
export const formatNumber = (pNumero: number) => {
  const cNumero = parseFloat(pNumero.toString().replaceAll(",", ""));

  return cNumero.toLocaleString("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDateDisplay = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  
  // Si es una fecha completa con zona horaria o tiempo (contiene T o espacio), la tratamos como tal
  if (dateStr.includes('T') || dateStr.includes(' ')) {
    return new Date(dateStr).toLocaleDateString();
  }
  
  // Si es una fecha solo (YYYY-MM-DD), evitamos el desfase de zona horaria
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr).toLocaleDateString();
    
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(dateStr).toLocaleDateString();
    
    // Al usar el constructor con números (year, monthIndex, day), se crea en la zona horaria local del sistema
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  } catch (e) {
    return new Date(dateStr).toLocaleDateString();
  }
};
