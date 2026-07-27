'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram, MessageCircle, Mail, MapPin } from 'lucide-react';
import { C } from './shared';

const columns = [
  {
    title: 'Producto',
    links: [
      { label: 'Elegir mi perfil', href: '/#perfiles' },
      { label: 'Registrarse', href: '/register' },
      { label: 'Iniciar sesión', href: '/login' },
    ],
  },
  {
    title: 'Ecosistema',
    links: [
      { label: 'Software para consultorios', href: '/landing/consultorios' },
      { label: 'Gestión para clínicas', href: '/landing/clinicas' },
      { label: 'Software para enfermería', href: '/landing/enfermeros' },
      { label: 'Portal del paciente', href: '/landing/pacientes' },
      { label: 'Farmacias (próximamente)', href: '/landing/farmacias' },
      { label: 'Laboratorios (próximamente)', href: '/landing/laboratorios' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'WhatsApp', href: 'https://wa.me/584124885623' },
      { label: 'Instagram', href: 'https://instagram.com/ashira_soft' },
      { label: 'ashira.click', href: 'https://ashira.click' },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-200" style={{ background: C.surfaceMuted }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 no-underline">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                <Image src="/3.png" alt="Logo ASHIRA — plataforma de salud digital Venezuela" fill sizes="40px" className="object-cover" />
              </div>
              <span className="font-display font-bold text-lg" style={{ color: C.tealDark }}>ASHIRA</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm mb-6" style={{ color: C.inkMuted }}>
              Software de gestión médica. No cambies tu forma de trabajar. Multiplícala.
            </p>
            <div className="space-y-2 text-sm" style={{ color: C.inkMuted }}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: C.teal }} />
                Caracas, Venezuela
              </div>
              <a href="https://wa.me/584124885623" className="flex items-center gap-2 hover:text-teal-700 transition-colors">
                <MessageCircle className="w-4 h-4 shrink-0" style={{ color: C.teal }} />
                +58 412-488-5623
              </a>
              <a href="https://instagram.com/ashira_soft" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-teal-700 transition-colors">
                <Instagram className="w-4 h-4 shrink-0" style={{ color: C.teal }} />
                @ashira_soft
              </a>
              <a href="mailto:ashirasoftware@gmail.com" className="flex items-center gap-2 hover:text-teal-700 transition-colors">
                <Mail className="w-4 h-4 shrink-0" style={{ color: C.teal }} />
                ashirasoftware@gmail.com
              </a>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-bold text-sm mb-4" style={{ color: C.ink }}>{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm hover:text-teal-700 transition-colors no-underline" style={{ color: C.inkMuted }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: C.inkLight }}>© 2026 ASHIRA. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="https://instagram.com/ashira_soft" target="_blank" rel="noopener noreferrer" aria-label="Instagram ASHIRA" className="hover:text-teal-700 transition-all" style={{ color: C.inkMuted }}>
              <Instagram className="w-5 h-5" />
            </a>
            <a href="https://wa.me/584124885623" aria-label="WhatsApp ASHIRA" className="hover:text-teal-700 transition-all" style={{ color: C.inkMuted }}>
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
