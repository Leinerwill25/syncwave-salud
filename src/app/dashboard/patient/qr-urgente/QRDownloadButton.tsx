'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import { Download, Loader2 } from 'lucide-react';

interface QRDownloadButtonProps {
  cardData: {
    full_name: string;
    cedula: string;
    blood_type: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    doctor_name: string;
    specialty: string;
    profile_photo_url?: string;
    qr_url: string;
  };
}

export default function QRDownloadButton({ cardData }: QRDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  };

  const getQRBase64 = (value: string): Promise<string> => {
    return new Promise(async (resolve) => {
      const QRCode = (await import('qrcode')).default;
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, value, {
        width: 400,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      }, () => {
        resolve(canvas.toDataURL('image/png'));
      });
    });
  };

  const downloadPDF = async () => {
    try {
      setIsGenerating(true);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98],
      });

      let logoBase64 = '';
      let profileBase64 = '';
      let qrBase64 = '';

      try {
        logoBase64 = await getBase64ImageFromURL('/3.png');
        if (cardData.profile_photo_url) {
          profileBase64 = await getBase64ImageFromURL(cardData.profile_photo_url);
        }
        qrBase64 = await getQRBase64(cardData.qr_url);
      } catch (e) {
        console.error('Error:', e);
      }

      // 1. ESTRUCTURA DE FONDO (BLOQUES FIJOS)
      pdf.setFillColor(15, 23, 41); // #0f1729
      pdf.rect(0, 0, 85.6, 53.98, 'F');
      
      pdf.setFillColor(23, 34, 59); // #17223b
      pdf.rect(55, 0, 30.6, 53.98, 'F');

      // Línea superior de diseño
      pdf.setFillColor(74, 125, 232);
      pdf.rect(0, 0, 42.8, 1.5, 'F');
      pdf.setFillColor(127, 255, 212);
      pdf.rect(42.8, 0, 42.8, 1.5, 'F');

      // 2. CABECERA (LOGO + BADGE)
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', 5, 5, 6, 6);
      }
      pdf.setFillColor(225, 29, 72);
      pdf.roundedRect(14, 6, 15, 4.5, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('URGENTE', 16, 9.2);

      // 3. BLOQUE DE NOMBRE (ANCLAJE SUPERIOR: 16mm)
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      const nameLines = pdf.splitTextToSize(cardData.full_name.toUpperCase(), 48);
      pdf.text(nameLines, 5, 16);

      // ID (Siempre 2mm debajo del nombre)
      const idY = 16 + (nameLines.length * 4.5);
      pdf.setTextColor(111, 168, 245);
      pdf.setFontSize(8);
      pdf.setFont('courier', 'bold');
      pdf.text(`CÉDULA: ${cardData.cedula}`, 5, idY);

      // 4. BLOQUE DE SANGRE (MOVIDO A LA COLUMNA DERECHA)
      pdf.setTextColor(111, 168, 245);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SANGRE', 60, 8);
      pdf.setTextColor(127, 255, 212);
      pdf.setFontSize(14);
      pdf.text(cardData.blood_type.toUpperCase(), 60, 14);

      // 5. BLOQUE DE CONTACTOS (CENTRADOS Y ORDENADOS)
      // Contacto de Emergencia (Subido a 36mm para centrarlo)
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${cardData.emergency_contact_name.toUpperCase()}`, 5, 36);
      pdf.setTextColor(111, 168, 245);
      pdf.text(`${cardData.emergency_contact_phone}`, 5, 39.5);

      // Médico Tratante (Anclado al fondo para dar aire)
      pdf.setDrawColor(127, 255, 212);
      pdf.setLineWidth(0.6);
      pdf.line(5, 47.5, 5, 51);
      
      pdf.setTextColor(127, 255, 212);
      pdf.setFontSize(8);
      pdf.text(cardData.doctor_name.toUpperCase(), 7.5, 48.5);
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(6);
      pdf.text(cardData.specialty.toUpperCase(), 7.5, 51);

      // 6. COLUMNA DERECHA (FOTO + QR)
      // Foto
      if (profileBase64) {
        pdf.saveGraphicsState();
        pdf.setDrawColor(74, 125, 232);
        pdf.circle(75, 10, 6, 'S');
        pdf.clip();
        pdf.addImage(profileBase64, 'JPEG', 69, 4, 12, 12);
        pdf.restoreGraphicsState();
      }

      // QR (GRANDE Y LIMPIO)
      if (qrBase64) {
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(59, 21, 23, 23, 1.5, 1.5, 'F');
        pdf.addImage(qrBase64, 'PNG', 60.5, 22.5, 20, 20);
      }

      pdf.setTextColor(111, 168, 245);
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESCANEAR HISTORIAL', 70.5, 46, { align: 'center' });

      pdf.save(`ASHIRA_Emergencia_${cardData.full_name.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={downloadPDF}
      disabled={isGenerating}
      className={`
        flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest
        ${isGenerating 
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
          : 'bg-[#4A7DE8] text-white hover:bg-[#3b6cd4] shadow-xl shadow-blue-500/20 active:scale-95'
        }
      `}
    >
      {isGenerating ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Generando...</span>
        </>
      ) : (
        <>
          <Download size={18} />
          <span>Descargar PDF</span>
        </>
      )}
    </button>
  );
}
