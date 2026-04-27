'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Phone, 
  Edit3, 
  Save, 
  History,
  AlertTriangle 
} from 'lucide-react';
import QRDownloadButton from './QRDownloadButton';

interface PatientEmergencyCard {
  id: string;
  full_name: string;
  cedula: string;
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  doctor_name: string;
  specialty: string;
  profile_photo_url?: string;
  qr_url: string;
}

interface QREmergencyCardProps {
  patient: any;
}

export default function QREmergencyCard({ patient }: QREmergencyCardProps) {
  const initialData: PatientEmergencyCard = {
    id: patient?.id || 'id-default',
    full_name: patient?.fullName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim(),
    cedula: patient?.identifier || 'V-00.000.000',
    blood_type: patient?.bloodType || 'N/A',
    emergency_contact_name: patient?.emergencyContact?.name || 'No asignado',
    emergency_contact_phone: patient?.emergencyContact?.phone || 'No asignado',
    doctor_name: 'Dr. Alejandro Silva',
    specialty: 'Especialidad Médica',
    profile_photo_url: patient?.profile_photo_url || undefined,
    qr_url: patient?.qrUrl || '#',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [cardData, setCardData] = useState<PatientEmergencyCard>(initialData);

  const toggleEdit = () => setIsEditing(!isEditing);
  const resetData = () => { setCardData(initialData); setIsEditing(false); };

  if (!patient) return <div className="w-[352px] h-[222px] bg-slate-100 animate-pulse rounded-2xl" />;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center animate-in fade-in duration-700">
      
      {/* VISTA PREVIA VISUAL */}
      <div className="flex flex-col items-center gap-6">
        <div 
          className={`
            relative w-[360px] h-[225px] rounded-2xl overflow-hidden shadow-2xl
            bg-gradient-to-br from-[#0f1729] to-[#1a2744]
            ${isEditing ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
            transition-all duration-500
          `}
        >
          {/* Línea decorativa superior */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4A7DE8] to-[#7FFFD4] z-10" />

          <div className="relative flex h-full p-5">
            {/* IZQUIERDA (62%) */}
            <div className="w-[62%] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <img src="/3.png" alt="ASHIRA" className="h-5 object-contain" />
                  <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse uppercase tracking-wider">
                    URGENTE
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-white font-black text-[13px] leading-tight uppercase tracking-tight break-words">
                    {cardData.full_name}
                  </h3>
                  <p className="text-blue-400 font-mono text-[9px] tracking-widest font-bold uppercase opacity-90">
                    CÉDULA: {cardData.cedula}
                  </p>
                </div>

                <div className="w-12 h-0.5 bg-blue-500/30 my-2.5 rounded-full" />

                <div className="flex flex-col gap-0.5">
                  <p className="text-blue-400/70 text-[8px] font-black uppercase tracking-widest">Grupo Sanguíneo</p>
                  <p className="text-[#7FFFD4] font-black text-lg leading-none">{cardData.blood_type.toUpperCase()}</p>
                </div>
              </div>

              {/* CONTACTO DE EMERGENCIA */}
              <div className="mb-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-500/20 rounded-md">
                    <Phone size={10} className="text-blue-400" strokeWidth={3} />
                  </div>
                  <p className="text-white text-[9px] font-black truncate">
                    {cardData.emergency_contact_name.toUpperCase()} - <span className="text-blue-400">{cardData.emergency_contact_phone}</span>
                  </p>
                </div>
                
                <div className="border-l-4 border-[#7FFFD4] pl-2.5 py-0.5 bg-white/5 rounded-r-lg">
                  <p className="text-[#7FFFD4] text-[9px] font-black italic tracking-tight truncate">
                    {cardData.doctor_name.toUpperCase()}
                  </p>
                  <p className="text-slate-400 text-[8px] font-bold tracking-wide uppercase opacity-80">
                    {cardData.specialty}
                  </p>
                </div>
              </div>
            </div>

            {/* DERECHA (38%) */}
            <div className="w-[38%] flex flex-col items-center justify-between py-1 pl-4 border-l border-white/5">
              <div className="relative mt-1">
                {cardData.profile_photo_url ? (
                  <img 
                    src={cardData.profile_photo_url} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover shadow-2xl"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center text-blue-400 font-black text-xl">
                    {cardData.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="bg-white p-1 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <QRCodeSVG
                  value={cardData.qr_url}
                  size={80}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="H"
                  imageSettings={{ src: "/3.png", height: 16, width: 16, excavate: true }}
                />
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <div className="h-0.5 w-6 bg-blue-500/30 rounded-full" />
                <p className="text-blue-400 text-[7px] font-black tracking-[0.15em] uppercase">
                  Escanear Historial
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLES */}
        <div className="flex gap-4 w-full max-w-[360px]">
          <button 
            onClick={toggleEdit}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest
              ${isEditing 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-blue-100 hover:text-blue-600 shadow-sm'
              }
            `}
          >
            {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
            {isEditing ? 'Guardar' : 'Editar'}
          </button>
          
          <QRDownloadButton cardData={cardData} />
        </div>
      </div>

      {/* PANEL DE EDICIÓN */}
      {isEditing && (
        <div className="w-full max-w-[340px] bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-right-10 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Edit3 size={20} className="text-blue-600" />
              Ajustes de Tarjeta
            </h4>
            <button onClick={resetData} className="text-slate-400 hover:text-blue-600 transition-colors">
              <History size={20} />
            </button>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Médico de Referencia</label>
              <input 
                type="text" 
                value={cardData.doctor_name}
                onChange={(e) => setCardData({...cardData, doctor_name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidad</label>
              <input 
                type="text" 
                value={cardData.specialty}
                onChange={(e) => setCardData({...cardData, specialty: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto Emergencia</label>
              <div className="grid grid-cols-1 gap-2">
                <input 
                  type="text" 
                  value={cardData.emergency_contact_name}
                  onChange={(e) => setCardData({...cardData, emergency_contact_name: e.target.value})}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium"
                  placeholder="Nombre"
                />
                <input 
                  type="text" 
                  value={cardData.emergency_contact_phone}
                  onChange={(e) => setCardData({...cardData, emergency_contact_phone: e.target.value})}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium"
                  placeholder="Teléfono"
                />
              </div>
            </div>
            
            <div className="pt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
              <AlertTriangle size={20} className="text-blue-500 flex-shrink-0" />
              <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase tracking-tight">
                Las alergias se han movido exclusivamente al Historial Digital (Escaneo QR) para mantener la tarjeta legible.
              </p>
            </div>

            <button 
              onClick={() => setIsEditing(false)} 
              className="w-full py-3 bg-slate-900 text-white font-black text-xs rounded-xl shadow-xl hover:bg-slate-800 transition-all uppercase tracking-widest mt-2"
            >
              Confirmar Cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
