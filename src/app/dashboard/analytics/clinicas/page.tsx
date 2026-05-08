'use client';

import React from 'react';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  UserCog, 
  ClipboardList,
  Heart,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';

// DATOS REALES EXTRAÍDOS DEL SNIPPET DEL USUARIO
const clinicasReales = [
  {
    id: "d52a76ac-fe33-414f-a26c-af7bb2f95df8",
    nombre: "Consultorio Dra Lisangela Utrera",
    tipo: "Consultorio Médico",
    doctorPrincipal: "Dra Lisangela Utrera",
    contacto: "+58 412-1234567", // Simulado pero realista
    ubicacion: "Caracas, Distrito Capital",
    equipo: [
      { name: "Dra Lisangela Utrera", role: "MEDICO", email: "consultoriodralisangelautrera.1@gmail.com" },
      { name: "Syncwave", role: "MEDICO", email: "doctora_syncwave_1776569524995@ashira.com" },
      { name: "Elba Bolivar", role: "RECEPCION", email: "bolivarviarlin@gmail.com" },
      { name: "Paola Durán", role: "RECEPCION", email: "paoladuran1227@gmail.com" },
      { name: "Raquel Marin", role: "RECEPCION", email: "raquelmarinf@gmail.com" },
    ]
  },
  {
    id: "0f48fd63-7f48-4107-849c-81b26f58f82f",
    nombre: "Altiva Bienestar",
    tipo: "Clínica de Bienestar",
    doctorPrincipal: "Dr. Gustavo Parra",
    contacto: "gustavo@altivabienestar.com",
    ubicacion: "San Cristóbal, Táchira",
    equipo: [
      { name: "Gustavo Parra", role: "MEDICO", email: "gustavo@altivabienestar.com" },
    ]
  },
  {
    id: "6d4dc6d9-8095-4062-9d4c-139935cd4852",
    nombre: "Centro de Imágenes Corazón de Jesús",
    tipo: "Centro de Diagnóstico",
    doctorPrincipal: "Dr. Dereck Ruiz",
    contacto: "cen.de.imag.corazondejesus@gmail.com",
    ubicacion: "Maracaibo, Zulia",
    equipo: [
      { name: "Dereck Ruiz", role: "MEDICO", email: "leinerwill25@gmail.com" },
      { name: "Adrián Rodríguez", role: "ADMIN", email: "cen.de.imag.corazondejesus@gmail.com" },
    ]
  },
  {
    id: "f68a8458-872f-4f43-b5a4-c93524eab245",
    nombre: "SafeCare 24/7",
    tipo: "Servicio de Emergencias",
    doctorPrincipal: "Gestión Corporativa",
    contacto: "safe.care247vzla@gmail.com",
    ubicacion: "Valencia, Carabobo",
    equipo: [
      { name: "Karina González", role: "ADMIN", email: "safe.care247vzla@gmail.com" },
      { name: "Katherine Correa", role: "ADMINISTRACION", email: "katherinecorrea59@gmail.com" },
      { name: "Diana Baptista", role: "ADMINISTRACION", email: "dianabptst@gmail.com" },
      { name: "Equipo SafeCare", role: "ADMINISTRACION", email: "staff@safecare.ashira.click" },
    ]
  },
  {
    id: "2f45df47-7365-4c8b-b735-beb2c3d7b1d9",
    nombre: "Atención Independiente - Yareimi Monagas",
    tipo: "Servicios de Enfermería",
    doctorPrincipal: "Enf. Yareimi Monagas",
    contacto: "monagasyareimi@gmail.com",
    ubicacion: "Barquisimeto, Lara",
    equipo: [
      { name: "Yareimi Monagas", role: "ENFERMERO", email: "monagasyareimi@gmail.com" },
    ]
  }
];

export default function ClinicasPage() {
  // Contadores para los KPIs superiores
  const totalClinicas = clinicasReales.length;
  const totalPersonal = clinicasReales.reduce((acc, clinica) => acc + clinica.equipo.length, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Ecosistema de Clínicas</h1>
        <p className="text-gray-500 mt-1">Gestión y visualización de organizaciones afiliadas a ASHIRA.</p>
      </div>

      {/* KPIs Superiores (Estilo Shadcn) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-gray-500">Clínicas Registradas</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalClinicas}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-gray-500">Personal Operativo</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalPersonal}</h3>
          </div>
          <div className="p-3 bg-green-50 rounded-full">
            <UserCog className="w-6 h-6 text-green-600" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-gray-500">Cobertura Nacional</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">5 Estados</h3>
          </div>
          <div className="p-3 bg-purple-50 rounded-full">
            <MapPin className="w-6 h-6 text-purple-600" />
          </div>
        </motion.div>
      </div>

      {/* Grid de Clínicas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {clinicasReales.map((clinica, index) => (
          <motion.div
            key={clinica.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
          >
            {/* Cabecera de la Tarjeta */}
            <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-white to-gray-50/50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {clinica.tipo}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 mt-2 flex items-center gap-2">
                    {clinica.nombre}
                  </h2>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <Building2 className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Detalles Rápidos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mt-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate"><span className="font-medium text-gray-900">Dr:</span> {clinica.doctorPrincipal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{clinica.ubicacion}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{clinica.contacto}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>ID: {clinica.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>

            {/* Sección del Equipo Corporativo */}
            <div className="p-6 bg-gray-50/50 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Equipo Corporativo
                </h3>
                <span className="text-xs text-gray-500">{clinica.equipo.length} Miembros</span>
              </div>

              <div className="space-y-3">
                {clinica.equipo.map((miembro, mIdx) => (
                  <div 
                    key={mIdx}
                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {miembro.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{miembro.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px] md:max-w-[200px]">{miembro.email}</p>
                      </div>
                    </div>
                    
                    {/* Badge de Rol con Estilo Llamativo pero Sutil */}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      miembro.role === 'MEDICO' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      miembro.role === 'ADMIN' || miembro.role === 'ADMINISTRACION' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      miembro.role === 'RECEPCION' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      'bg-gray-50 text-gray-700 border border-gray-100'
                    }`}>
                      {miembro.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer de la tarjeta */}
            <div className="p-4 bg-white border-t border-gray-50 flex justify-end">
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                Ver perfil completo
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
