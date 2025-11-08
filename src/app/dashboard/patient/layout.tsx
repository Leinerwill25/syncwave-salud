import React from 'react';

export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {/* Aquí puedes agregar elementos comunes del layout del dashboard del paciente */}
      <nav>
        {/* Por ejemplo, un menú de navegación específico para el paciente */}
      </nav>
      {children}
    </section>
  );
}
