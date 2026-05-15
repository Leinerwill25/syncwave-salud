import { jsPDF } from "jspdf";

interface MetricsData {
  totalCitas: number;
  confirmadas: number;
  noAsistio: number;
  revenue: number;
  pacientesNuevos: number;
  baseCurrency?: string;
}

interface BiweeklyReportData {
  organizationName: string;
  periodCurrent: string;
  periodPrevious: string;
  metrics: {
    current: MetricsData;
    previous: MetricsData;
  };
  agenda: Array<{
    date: string;
    patient: string;
    status: string;
    price: number;
  }>;
  trends: {
    monthlyVolume: Array<{ month: string; value: number }>;
    topServices: Array<{ name: string; value: number }>;
    dayCounts: Array<{ day: string; count: number }>;
  };
  loyalty: {
    recurrentes: number;
    unicos: number;
  };
}

export async function generateBiweeklyReportPDF(data: BiweeklyReportData): Promise<Blob> {
  const doc = new jsPDF();
  
  // Paleta de colores Corporativa, Minimalista y Vibrante
  const primaryColor = [15, 23, 42]; // #0f172a (Slate 900)
  const secondaryColor = [71, 85, 105]; // #475569 (Slate 600)
  const accentColor = [16, 185, 129]; // #10b981 (Emerald 500)
  const dangerColor = [239, 68, 68]; // #ef4444 (Red 500)
  const textColor = [30, 41, 59]; // #1e293b (Slate 800)
  const lightBg = [248, 250, 252]; // #f8fafc (Slate 50)
  const borderColor = [226, 232, 240]; // #e2e8f0 (Slate 200)
  
  const currency = data.metrics.current.baseCurrency || 'USD';
  
  // --- HEADER ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ASHIRA", 20, 20);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("INFORME DE RENDIMIENTO GERENCIAL", 20, 28);
  
  doc.setFontSize(10);
  doc.text(`${data.organizationName}`, 20, 34);
  
  let y = 55;
  
  // --- PERIODOS DE COMPARACIÓN ---
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(20, y, 170, 15, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.rect(20, y, 170, 15, 'S');
  
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("Períodos Comparados:", 25, y + 9);
  doc.setFont("helvetica", "normal");
  doc.text(`Actual: ${data.periodCurrent}  vs  Anterior: ${data.periodPrevious}`, 65, y + 9);
  
  y += 25;
  
  // --- SECCIÓN 1: KPIS EN CARDS ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Métricas Clave", 20, y);
  y += 10;
  
  const cur = data.metrics.current;
  const prev = data.metrics.previous;
  
  const drawCard = (x: number, yPos: number, width: number, height: number, title: string, value: string, prevValue: string, variation: string, isPositive: boolean) => {
    // Fondo de la card
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(x, yPos, width, height, 'F');
    
    // Borde
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(x, yPos, width, height, 'S');
    
    // Título
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(title, x + 10, yPos + 10);
    
    // Valor
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(value, x + 10, yPos + 22);
    
    // Valor Previo y Variación
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Previo: ${prevValue}`, x + 10, yPos + 30);
    
    if (isPositive) {
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    } else {
      doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
    }
    doc.setFont("helvetica", "bold");
    doc.text(`(${variation})`, x + 50, yPos + 30);
  };
  
  const cardWidth = 80;
  const cardHeight = 35;
  
  // Card 1: Total Citas
  const diffCitas = cur.totalCitas - prev.totalCitas;
  drawCard(20, y, cardWidth, cardHeight, "TOTAL CITAS", `${cur.totalCitas}`, `${prev.totalCitas}`, `${diffCitas >= 0 ? '+' : ''}${diffCitas}`, diffCitas >= 0);
  
  // Card 2: Ingresos
  const diffRev = cur.revenue - prev.revenue;
  drawCard(110, y, cardWidth, cardHeight, "INGRESOS", `${cur.revenue} ${currency}`, `${prev.revenue} ${currency}`, `${diffRev >= 0 ? '+' : ''}${diffRev}`, diffRev >= 0);
  
  y += cardHeight + 10;
  
  // Card 3: Confirmadas
  const diffConf = cur.confirmadas - prev.confirmadas;
  drawCard(20, y, cardWidth, cardHeight, "CONFIRMADAS", `${cur.confirmadas}`, `${prev.confirmadas}`, `${diffConf >= 0 ? '+' : ''}${diffConf}`, diffConf >= 0);
  
  // Card 4: Pacientes Nuevos
  const diffPac = cur.pacientesNuevos - prev.pacientesNuevos;
  drawCard(110, y, cardWidth, cardHeight, "PACIENTES NUEVOS", `${cur.pacientesNuevos}`, `${prev.pacientesNuevos}`, `${diffPac >= 0 ? '+' : ''}${diffPac}`, diffPac >= 0);
  
  y += cardHeight + 20;
  
  // --- SECCIÓN 2: GRÁFICO DE BARRAS DE SERVICIOS ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Servicios Más Solicitados", 20, y);
  y += 10;
  
  const services = data.trends.topServices.slice(0, 5); // Top 5
  const maxVal = Math.max(...services.map(s => s.value)) || 1;
  const maxBarWidth = 100;
  
  services.forEach(s => {
    // Nombre del servicio
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(s.name, 20, y + 4);
    
    // Barra
    const barWidth = (s.value / maxVal) * maxBarWidth;
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(70, y, barWidth, 5, 'F');
    
    // Valor
    doc.setFont("helvetica", "bold");
    doc.text(`${s.value}`, 75 + barWidth, y + 4);
    
    y += 8;
  });
  
  y += 15;
  
  // --- SECCIÓN 3: FIDELIZACIÓN (Visual) ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Fidelización de Pacientes", 20, y);
  y += 10;
  
  const totalPacientes = data.loyalty.recurrentes + data.loyalty.unicos || 1;
  const pctRecurrentes = (data.loyalty.recurrentes / totalPacientes) * 100;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Pacientes Recurrentes: ${data.loyalty.recurrentes} (${Math.round(pctRecurrentes)}%)`, 20, y);
  
  y += 4;
  // Barra de progreso
  doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.rect(20, y, 170, 4, 'F');
  
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(20, y, (pctRecurrentes / 100) * 170, 4, 'F');
  
  y += 10;
  doc.text(`Pacientes Únicos: ${data.loyalty.unicos}`, 20, y);
  
  return doc.output('blob');
}
