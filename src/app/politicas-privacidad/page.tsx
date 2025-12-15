'use client';

import React from 'react';
import { Shield, Lock, Eye, FileText, Users, CreditCard, Database, Mail, Phone, MapPin, Calendar, HeartPulse, Stethoscope, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PoliticasPrivacidadPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 w-full max-w-full overflow-x-hidden">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
				{/* Header */}
				<div className="text-center mb-8 sm:mb-12">
					<div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg mb-6">
						<Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
					</div>
					<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent mb-4">Políticas de Privacidad</h1>
					<p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">ASHIRA - Última actualización: {new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
				</div>

				{/* Contenido */}
				<div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-12 space-y-8 sm:space-y-12">
					{/* Introducción */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<FileText className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">1. Introducción</h2>
						</div>
						<div className="prose prose-slate max-w-none space-y-4 text-gray-700 leading-relaxed">
							<p>
								En <strong>ASHIRA</strong> ("nosotros", "nuestro", "la Plataforma"), nos comprometemos a proteger y respetar su privacidad. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos su información personal y de salud cuando utiliza nuestra plataforma de gestión médica integrada.
							</p>
							<p>Al utilizar nuestros servicios, usted acepta las prácticas descritas en esta política. Si no está de acuerdo con alguna parte de esta política, le recomendamos que no utilice nuestros servicios.</p>
							<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-6">
								<p className="text-sm text-blue-800">
									<strong>Nota importante:</strong> Esta plataforma maneja información de salud sensible. Todos los datos están protegidos según las normativas aplicables en Venezuela y las mejores prácticas internacionales de seguridad de datos médicos.
								</p>
							</div>
						</div>
					</section>

					{/* Información que recopilamos */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Database className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">2. Información que Recopilamos</h2>
						</div>
						<div className="space-y-6">
							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Users className="w-5 h-5 text-indigo-600" />
									2.1. Información Personal de Identificación
								</h3>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>
										<strong>Nombre completo</strong> (primer nombre y apellidos)
									</li>
									<li>
										<strong>Cédula de identidad</strong> o documento de identificación
									</li>
									<li>
										<strong>Fecha de nacimiento</strong>
									</li>
									<li>
										<strong>Género</strong>
									</li>
									<li>
										<strong>Dirección de residencia</strong>
									</li>
									<li>
										<strong>Números de teléfono</strong> (móvil y fijo)
									</li>
									<li>
										<strong>Dirección de correo electrónico</strong>
									</li>
									<li>
										<strong>Fotografía de perfil</strong> (opcional)
									</li>
								</ul>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<HeartPulse className="w-5 h-5 text-red-600" />
									2.2. Información de Salud e Historial Médico
								</h3>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>
										<strong>Historial médico completo</strong>, incluyendo consultas, diagnósticos y tratamientos
									</li>
									<li>
										<strong>Signos vitales</strong> (presión arterial, frecuencia cardíaca, temperatura, peso, altura, etc.)
									</li>
									<li>
										<strong>Alergias conocidas</strong> y reacciones adversas
									</li>
									<li>
										<strong>Condiciones médicas crónicas</strong>
									</li>
									<li>
										<strong>Medicamentos actuales</strong> y prescritos
									</li>
									<li>
										<strong>Historial familiar de enfermedades</strong>
									</li>
									<li>
										<strong>Resultados de laboratorio</strong> y estudios diagnósticos
									</li>
									<li>
										<strong>Recetas médicas</strong> y órdenes de tratamiento
									</li>
									<li>
										<strong>Notas médicas</strong> y observaciones clínicas
									</li>
									<li>
										<strong>Imágenes médicas</strong> y documentos adjuntos
									</li>
									<li>
										<strong>Motivo de consulta</strong> y síntomas reportados
									</li>
								</ul>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Stethoscope className="w-5 h-5 text-green-600" />
									2.3. Información de Profesionales de la Salud
								</h3>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>
										<strong>Credenciales profesionales</strong> (licencia médica, número de colegiatura)
									</li>
									<li>
										<strong>Especialidad médica</strong>
									</li>
									<li>
										<strong>Historial académico</strong> (universidad, título, año de graduación)
									</li>
									<li>
										<strong>Certificaciones y cursos</strong>
									</li>
									<li>
										<strong>Firma digital</strong> y fotografía profesional
									</li>
									<li>
										<strong>Horarios de disponibilidad</strong>
									</li>
									<li>
										<strong>Métodos de pago aceptados</strong>
									</li>
								</ul>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Building2 className="w-5 h-5 text-purple-600" />
									2.4. Información de Organizaciones (Clínicas, Consultorios, Farmacias, Laboratorios)
								</h3>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>
										<strong>Datos legales</strong> (RIF, razón social, nombre comercial)
									</li>
									<li>
										<strong>Dirección fiscal y operativa</strong>
									</li>
									<li>
										<strong>Información de contacto</strong> (teléfonos, correos, redes sociales)
									</li>
									<li>
										<strong>Licencia sanitaria</strong> y número de seguro de responsabilidad
									</li>
									<li>
										<strong>Datos bancarios</strong> (para procesamiento de pagos)
									</li>
									<li>
										<strong>Fotografías del consultorio</strong> y perfil de la organización
									</li>
									<li>
										<strong>Especialidades ofrecidas</strong> y servicios disponibles
									</li>
									<li>
										<strong>Horarios de atención</strong> y disponibilidad
									</li>
								</ul>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<CreditCard className="w-5 h-5 text-orange-600" />
									2.5. Información Financiera y de Pago
								</h3>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>
										<strong>Información de facturación</strong> y métodos de pago
									</li>
									<li>
										<strong>Historial de transacciones</strong> y pagos realizados
									</li>
									<li>
										<strong>Comprobantes de pago</strong> y referencias de transferencia
									</li>
									<li>
										<strong>Capturas de pantalla</strong> de comprobantes de pago (cuando el paciente las sube)
									</li>
									<li>
										<strong>Estado de pagos pendientes</strong> y confirmados
									</li>
									<li>
										<strong>Información de suscripciones</strong> y planes contratados
									</li>
								</ul>
								<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
									<p className="text-sm text-yellow-800">
										<strong>Importante:</strong> No almacenamos números de tarjetas de crédito completos. Toda la información de pago sensible es procesada por proveedores de pago seguros y certificados.
									</p>
								</div>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Calendar className="w-5 h-5 text-blue-600" />
									2.6. Información de Citas y Consultas
								</h3>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>
										<strong>Fechas y horarios de citas</strong> programadas
									</li>
									<li>
										<strong>Estado de las citas</strong> (confirmada, cancelada, completada, reprogramada)
									</li>
									<li>
										<strong>Motivo de la cita</strong> y notas adicionales
									</li>
									<li>
										<strong>Ubicación de la consulta</strong> (presencial o virtual)
									</li>
									<li>
										<strong>Historial de consultas</strong> y seguimientos
									</li>
								</ul>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Eye className="w-5 h-5 text-indigo-600" />
									2.7. Información Técnica y de Uso
								</h3>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>
										<strong>Dirección IP</strong> y ubicación geográfica aproximada
									</li>
									<li>
										<strong>Tipo de dispositivo</strong> y sistema operativo
									</li>
									<li>
										<strong>Navegador web</strong> y versión
									</li>
									<li>
										<strong>Registros de actividad</strong> y logs de acceso
									</li>
									<li>
										<strong>Cookies y tecnologías de seguimiento</strong> (ver sección 8)
									</li>
									<li>
										<strong>Preferencias de notificación</strong> (email, WhatsApp, push)
									</li>
								</ul>
							</div>

							<div className="bg-gray-50 rounded-xl p-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Users className="w-5 h-5 text-teal-600" />
									2.8. Información de Pacientes No Registrados
								</h3>
								<p className="text-gray-700 mb-3">Cuando un profesional de la salud crea una consulta para un paciente que no está registrado en la plataforma, recopilamos información básica para poder brindar el servicio médico:</p>
								<ul className="space-y-2 text-gray-700 ml-6 list-disc">
									<li>Datos personales básicos (nombre, apellido, cédula, teléfono, email, fecha de nacimiento, género, dirección)</li>
									<li>Información médica relevante (alergias, condiciones crónicas, medicamentos actuales, historial familiar)</li>
									<li>Datos de la consulta realizada</li>
								</ul>
								<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
									<p className="text-sm text-blue-800">
										<strong>Nota:</strong> Esta información se almacena de forma segura y puede ser utilizada para futuras consultas o para invitar al paciente a registrarse en la plataforma.
									</p>
								</div>
							</div>
						</div>
					</section>

					{/* Cómo utilizamos la información */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Eye className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">3. Cómo Utilizamos su Información</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Utilizamos la información recopilada para los siguientes propósitos:</p>
							<div className="space-y-4">
								<div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
									<CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Prestación de Servicios Médicos</h4>
										<p className="text-sm text-gray-700">Para gestionar citas, consultas, recetas, órdenes médicas, resultados de laboratorio y toda la documentación médica necesaria para brindar atención de salud de calidad.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
									<CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Comunicación</h4>
										<p className="text-sm text-gray-700">Para enviar notificaciones sobre citas, recordatorios, resultados de exámenes, mensajes entre pacientes y profesionales, y actualizaciones importantes del servicio.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
									<CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Facturación y Pagos</h4>
										<p className="text-sm text-gray-700">Para procesar pagos, generar facturas, verificar comprobantes de pago y gestionar la facturación de servicios médicos.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
									<CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Mejora del Servicio</h4>
										<p className="text-sm text-gray-700">Para analizar el uso de la plataforma, identificar problemas técnicos, mejorar la experiencia del usuario y desarrollar nuevas funcionalidades.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
									<CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Cumplimiento Legal</h4>
										<p className="text-sm text-gray-700">Para cumplir con obligaciones legales, responder a solicitudes gubernamentales, proteger nuestros derechos legales y prevenir actividades fraudulentas o ilegales.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-teal-50 rounded-lg">
									<CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Seguridad</h4>
										<p className="text-sm text-gray-700">Para proteger la seguridad de la plataforma, detectar y prevenir fraudes, abusos y actividades no autorizadas, y proteger los datos de nuestros usuarios.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-pink-50 rounded-lg">
									<CheckCircle2 className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Grupos Familiares</h4>
										<p className="text-sm text-gray-700">Para permitir que los pacientes gestionen grupos familiares y compartan acceso a información médica con miembros autorizados de su familia.</p>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* Compartir información */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Users className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">4. Compartir Información con Terceros</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>
								<strong>No vendemos, alquilamos ni comercializamos su información personal o de salud.</strong> Sin embargo, podemos compartir información en las siguientes circunstancias:
							</p>
							<div className="space-y-4">
								<div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
									<h4 className="font-semibold text-gray-900 mb-2">4.1. Con Profesionales de la Salud Autorizados</h4>
									<p className="text-sm">Compartimos su información médica con los profesionales de la salud que usted autoriza explícitamente, incluyendo médicos, especialistas, laboratorios y farmacias que forman parte de su red de atención.</p>
								</div>
								<div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r-lg">
									<h4 className="font-semibold text-gray-900 mb-2">4.2. Proveedores de Servicios</h4>
									<p className="text-sm">Compartimos información con proveedores de servicios de confianza que nos ayudan a operar la plataforma, como:</p>
									<ul className="text-sm ml-6 mt-2 list-disc">
										<li>Proveedores de hosting y almacenamiento en la nube (Supabase)</li>
										<li>Servicios de email y notificaciones (Resend)</li>
										<li>Proveedores de procesamiento de pagos</li>
										<li>Servicios de análisis y monitoreo</li>
									</ul>
									<p className="text-sm mt-2">Estos proveedores están contractualmente obligados a proteger su información y solo pueden usarla para los fines específicos para los que fueron contratados.</p>
								</div>
								<div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50 rounded-r-lg">
									<h4 className="font-semibold text-gray-900 mb-2">4.3. Requerimientos Legales</h4>
									<p className="text-sm">Podemos divulgar información si es requerido por ley, orden judicial, proceso legal, o si creemos de buena fe que la divulgación es necesaria para:</p>
									<ul className="text-sm ml-6 mt-2 list-disc">
										<li>Cumplir con una obligación legal</li>
										<li>Proteger y defender nuestros derechos o propiedad</li>
										<li>Prevenir o investigar posibles violaciones de nuestros términos de servicio</li>
										<li>Proteger la seguridad personal de usuarios o del público</li>
										<li>Proteger contra responsabilidad legal</li>
									</ul>
								</div>
								<div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 rounded-r-lg">
									<h4 className="font-semibold text-gray-900 mb-2">4.4. Con su Consentimiento Explícito</h4>
									<p className="text-sm">Compartimos información cuando usted nos da su consentimiento explícito para hacerlo, como cuando autoriza a un profesional de la salud a acceder a su historial médico o cuando se une a un grupo familiar.</p>
								</div>
								<div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r-lg">
									<h4 className="font-semibold text-gray-900 mb-2">4.5. Emergencias Médicas</h4>
									<p className="text-sm">En caso de emergencia médica donde la vida del paciente esté en peligro, podemos compartir información médica relevante con profesionales de la salud de emergencia, siempre que sea necesario para salvar vidas.</p>
								</div>
							</div>
						</div>
					</section>

					{/* Seguridad de datos */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Lock className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">5. Seguridad de los Datos</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Implementamos medidas de seguridad técnicas, administrativas y físicas para proteger su información contra acceso no autorizado, alteración, divulgación o destrucción:</p>
							<div className="grid sm:grid-cols-2 gap-4">
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
										<Lock className="w-4 h-4 text-indigo-600" />
										Cifrado de Datos
									</h4>
									<p className="text-sm">Todos los datos se transmiten y almacenan utilizando cifrado de extremo a extremo (TLS/SSL) y cifrado en reposo.</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
										<Shield className="w-4 h-4 text-green-600" />
										Autenticación
									</h4>
									<p className="text-sm">Utilizamos autenticación de múltiples factores y sistemas de gestión de sesiones seguros.</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
										<Eye className="w-4 h-4 text-blue-600" />
										Control de Acceso
									</h4>
									<p className="text-sm">Implementamos controles de acceso basados en roles para asegurar que solo personal autorizado acceda a información sensible.</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
										<Database className="w-4 h-4 text-purple-600" />
										Monitoreo Continuo
									</h4>
									<p className="text-sm">Monitoreamos continuamente la plataforma para detectar y prevenir accesos no autorizados o actividades sospechosas.</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
										<FileText className="w-4 h-4 text-orange-600" />
										Auditorías Regulares
									</h4>
									<p className="text-sm">Realizamos auditorías de seguridad regulares y pruebas de penetración para identificar y corregir vulnerabilidades.</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
										<Users className="w-4 h-4 text-teal-600" />
										Capacitación del Personal
									</h4>
									<p className="text-sm">Nuestro personal está capacitado en prácticas de seguridad de datos y privacidad de información de salud.</p>
								</div>
							</div>
							<div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
								<p className="text-sm text-yellow-800">
									<strong>Importante:</strong> Aunque implementamos medidas de seguridad robustas, ningún sistema es 100% seguro. Le recomendamos que mantenga su contraseña segura, no la comparta con nadie y cierre sesión cuando use dispositivos compartidos.
								</p>
							</div>
						</div>
					</section>

					{/* Derechos del usuario */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<CheckCircle2 className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">6. Sus Derechos</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Usted tiene los siguientes derechos respecto a su información personal:</p>
							<div className="space-y-3">
								<div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
									<div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Derecho de Acceso</h4>
										<p className="text-sm">Puede solicitar una copia de toda la información personal que tenemos sobre usted.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
									<div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Derecho de Rectificación</h4>
										<p className="text-sm">Puede solicitar la corrección de información inexacta o incompleta.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
									<div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Derecho de Eliminación</h4>
										<p className="text-sm">Puede solicitar la eliminación de su información personal, sujeto a ciertas limitaciones legales y médicas.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
									<div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Derecho de Oposición</h4>
										<p className="text-sm">Puede oponerse al procesamiento de su información personal para ciertos fines.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
									<div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">5</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Derecho de Portabilidad</h4>
										<p className="text-sm">Puede solicitar que transfiramos su información a otro proveedor de servicios de salud.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-pink-50 rounded-lg">
									<div className="w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">6</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Derecho de Revocación del Consentimiento</h4>
										<p className="text-sm">Puede revocar su consentimiento para el procesamiento de datos en cualquier momento.</p>
									</div>
								</div>
								<div className="flex items-start gap-3 p-4 bg-teal-50 rounded-lg">
									<div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">7</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Derecho de Restricción</h4>
										<p className="text-sm">Puede solicitar que limitemos el procesamiento de su información en ciertas circunstancias.</p>
									</div>
								</div>
							</div>
							<div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
								<p className="text-sm text-blue-800">
									<strong>Para ejercer estos derechos:</strong> Envíe una solicitud por escrito a{' '}
									<a href="mailto:syncwaveagency@gmail.com" className="underline font-semibold">
										syncwaveagency@gmail.com
									</a>{' '}
									o contáctenos por WhatsApp al <strong>04242070878</strong>. Responderemos a su solicitud dentro de 30 días hábiles.
								</p>
							</div>
						</div>
					</section>

					{/* Retención de datos */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Database className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">7. Retención de Datos</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Conservamos su información personal y de salud durante el tiempo necesario para cumplir con los propósitos descritos en esta política, a menos que la ley requiera o permita un período de retención más largo:</p>
							<ul className="space-y-2 ml-6 list-disc">
								<li>
									<strong>Registros médicos:</strong> Se conservan según los requisitos legales aplicables en Venezuela, generalmente por un mínimo de 10 años después de la última consulta.
								</li>
								<li>
									<strong>Información de cuenta:</strong> Se conserva mientras su cuenta esté activa y durante un período adicional razonable después de su cierre.
								</li>
								<li>
									<strong>Información financiera:</strong> Se conserva según los requisitos legales y fiscales aplicables, generalmente por 7 años.
								</li>
								<li>
									<strong>Logs y registros de actividad:</strong> Se conservan por un período de 2 años para fines de seguridad y auditoría.
								</li>
							</ul>
							<div className="mt-4 p-4 bg-gray-50 rounded-lg">
								<p className="text-sm">
									<strong>Nota:</strong> Algunos datos pueden conservarse por períodos más largos si es necesario para cumplir con obligaciones legales, resolver disputas, hacer cumplir nuestros acuerdos o por razones de seguridad.
								</p>
							</div>
						</div>
					</section>

					{/* Cookies */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Eye className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">8. Cookies y Tecnologías de Seguimiento</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el uso de la plataforma y personalizar el contenido:</p>
							<div className="space-y-3">
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2">Cookies Esenciales</h4>
									<p className="text-sm">Necesarias para el funcionamiento básico de la plataforma, incluyendo autenticación y seguridad.</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2">Cookies de Funcionalidad</h4>
									<p className="text-sm">Nos permiten recordar sus preferencias y proporcionar características mejoradas.</p>
								</div>
								<div className="p-4 bg-gray-50 rounded-lg">
									<h4 className="font-semibold text-gray-900 mb-2">Cookies Analíticas</h4>
									<p className="text-sm">Nos ayudan a entender cómo los usuarios interactúan con la plataforma para mejorar nuestros servicios.</p>
								</div>
							</div>
							<p className="text-sm mt-4">Puede controlar y gestionar las cookies a través de la configuración de su navegador. Sin embargo, tenga en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad de la plataforma.</p>
						</div>
					</section>

					{/* Menores de edad */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Users className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">9. Protección de Menores</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Nuestra plataforma no está dirigida directamente a menores de 18 años. No recopilamos intencionalmente información personal de menores sin el consentimiento explícito y verificado de sus padres o tutores legales.</p>

							<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
								<h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
									<Users className="w-5 h-5 text-blue-600" />
									9.1. Registro de Menores por Representantes Legales
								</h4>
								<p className="text-sm mb-3">
									<strong>Estado actual:</strong> La funcionalidad de grupos familiares no está disponible en este momento. Sin embargo, estamos desarrollando esta característica para permitir que padres, madres o tutores legales registren y gestionen la información médica de menores de edad bajo su representación legal.
								</p>
								<p className="text-sm mb-3">
									<strong>Funcionalidad futura:</strong> Cuando esta funcionalidad esté disponible, los representantes legales (padres, madres o tutores) podrán:
								</p>
								<ul className="text-sm ml-6 mb-3 list-disc space-y-1">
									<li>Crear y gestionar grupos familiares</li>
									<li>Registrar menores de edad como miembros del grupo familiar</li>
									<li>Indicar explícitamente su relación legal con el menor (padre, madre o tutor legal)</li>
									<li>Gestionar toda la información médica y de salud del menor</li>
									<li>Autorizar o revocar el acceso de profesionales de la salud a la información del menor</li>
									<li>Acceder, revisar, modificar y solicitar la eliminación de la información del menor</li>
								</ul>
								<p className="text-sm">
									<strong>Consentimiento y verificación:</strong> Al registrar a un menor, el representante legal deberá:
								</p>
								<ul className="text-sm ml-6 mt-2 list-disc space-y-1">
									<li>Proporcionar documentación que acredite su relación legal con el menor (partida de nacimiento, documento de tutela, etc.)</li>
									<li>Declarar explícitamente que es el padre, madre o tutor legal del menor</li>
									<li>Consentir el procesamiento de la información del menor según esta Política de Privacidad</li>
									<li>Aceptar la responsabilidad legal por todas las acciones realizadas en nombre del menor</li>
								</ul>
							</div>

							<div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
								<h4 className="font-semibold text-gray-900 mb-2">9.2. Aplicación Retroactiva de Políticas</h4>
								<p className="text-sm">Al aceptar esta Política de Privacidad, usted consiente que cuando la funcionalidad de grupos familiares esté disponible, estas disposiciones sobre protección de menores se aplicarán automáticamente. Los usuarios registrados antes de la implementación de esta funcionalidad estarán sujetos a estas mismas políticas y términos cuando decidan utilizar la característica de grupos familiares.</p>
								<p className="text-sm mt-2">
									<strong>Notificación:</strong> Le notificaremos con anticipación cuando esta funcionalidad esté disponible y le proporcionaremos información adicional sobre cómo utilizarla de manera segura y legal.
								</p>
							</div>

							<div className="bg-gray-50 rounded-xl p-4">
								<h4 className="font-semibold text-gray-900 mb-2">9.3. Derechos de los Padres y Tutores</h4>
								<p className="text-sm mb-2">Los padres, madres o tutores legales tienen los siguientes derechos respecto a la información de menores bajo su representación:</p>
								<ul className="text-sm ml-6 list-disc space-y-1">
									<li>
										<strong>Derecho de acceso:</strong> Acceder a toda la información personal y médica del menor
									</li>
									<li>
										<strong>Derecho de rectificación:</strong> Corregir información inexacta o incompleta
									</li>
									<li>
										<strong>Derecho de eliminación:</strong> Solicitar la eliminación de la información del menor, sujeto a requisitos legales y médicos
									</li>
									<li>
										<strong>Derecho de oposición:</strong> Oponerse al procesamiento de información del menor para ciertos fines
									</li>
									<li>
										<strong>Derecho de portabilidad:</strong> Solicitar la transferencia de información del menor a otro proveedor
									</li>
									<li>
										<strong>Derecho de revocación:</strong> Revocar el consentimiento en cualquier momento
									</li>
									<li>
										<strong>Derecho de control de acceso:</strong> Controlar qué profesionales de la salud pueden acceder a la información del menor
									</li>
								</ul>
							</div>

							<div className="bg-gray-50 rounded-xl p-4">
								<h4 className="font-semibold text-gray-900 mb-2">9.4. Registro de Menores por Profesionales de la Salud</h4>
								<p className="text-sm">Los profesionales de la salud autorizados pueden crear registros médicos para menores de edad cuando proporcionen atención médica, siempre que:</p>
								<ul className="text-sm ml-6 mt-2 list-disc space-y-1">
									<li>Obtengan el consentimiento explícito del padre, madre o tutor legal presente</li>
									<li>Verifiquen la identidad y relación legal del representante</li>
									<li>Documenten adecuadamente el consentimiento en el registro médico</li>
									<li>Informen al representante legal sobre cómo acceder y gestionar la información del menor</li>
								</ul>
							</div>

							<div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
								<p className="text-sm text-red-800">
									<strong>Importante:</strong> Si cree que hemos recopilado información de un menor sin el consentimiento apropiado de su padre, madre o tutor legal, o si tiene dudas sobre la veracidad de una relación legal declarada, contáctenos inmediatamente a través de los canales indicados en la sección de Contacto.
								</p>
							</div>

							<div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg">
								<p className="text-sm text-indigo-800">
									<strong>Responsabilidad legal:</strong> El representante legal es el único responsable de garantizar que tiene la autoridad legal para registrar y gestionar la información del menor. ASHIRA se reserva el derecho de verificar la relación legal y puede solicitar documentación adicional en cualquier momento. Cualquier uso fraudulento o no autorizado de esta funcionalidad puede resultar en la suspensión o eliminación de la cuenta y acciones legales correspondientes.
								</p>
							</div>
						</div>
					</section>

					{/* Transferencias internacionales */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<MapPin className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">10. Transferencias Internacionales de Datos</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Sus datos pueden ser almacenados y procesados en servidores ubicados fuera de Venezuela, incluyendo pero no limitado a Estados Unidos y otros países donde operan nuestros proveedores de servicios en la nube.</p>
							<p>Al utilizar nuestros servicios, usted consiente la transferencia de su información a estos países. Nos aseguramos de que todas las transferencias internacionales cumplan con las leyes aplicables y que sus datos estén protegidos mediante medidas de seguridad adecuadas.</p>
						</div>
					</section>

					{/* Cambios a la política */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<FileText className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">11. Cambios a esta Política de Privacidad</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas o por razones legales, operativas o regulatorias.</p>
							<p>Le notificaremos sobre cambios materiales mediante:</p>
							<ul className="space-y-2 ml-6 list-disc">
								<li>Un aviso prominente en nuestra plataforma</li>
								<li>Una notificación por correo electrónico a la dirección asociada con su cuenta</li>
								<li>Actualización de la fecha de "Última actualización" en la parte superior de esta política</li>
							</ul>
							<p>Le recomendamos que revise esta política periódicamente para mantenerse informado sobre cómo protegemos su información.</p>
						</div>
					</section>

					{/* Contacto */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<Mail className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">12. Contacto</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Si tiene preguntas, inquietudes o solicitudes relacionadas con esta Política de Privacidad o el manejo de su información personal, puede contactarnos a través de:</p>
							<div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 space-y-4">
								<div className="flex items-start gap-3">
									<Mail className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Correo Electrónico</h4>
										<a href="mailto:syncwaveagency@gmail.com" className="text-teal-600 hover:underline">
											syncwaveagency@gmail.com
										</a>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<Phone className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">WhatsApp</h4>
										<a href="https://wa.me/584242070878" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
											04242070878
										</a>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<MapPin className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
									<div>
										<h4 className="font-semibold text-gray-900 mb-1">Ubicación</h4>
										<p className="text-gray-700">Venezuela</p>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* Consentimiento */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<CheckCircle2 className="w-6 h-6 text-teal-600" />
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">13. Consentimiento</h2>
						</div>
						<div className="space-y-4 text-gray-700 leading-relaxed">
							<p>Al utilizar nuestros servicios, usted reconoce que ha leído, entendido y acepta esta Política de Privacidad y consiente la recopilación, uso y divulgación de su información personal y de salud según se describe en esta política.</p>
							<p>Si no está de acuerdo con esta política, debe dejar de utilizar nuestros servicios inmediatamente.</p>
						</div>
					</section>

					{/* Footer */}
					<div className="pt-8 border-t border-gray-200 mt-12">
						<div className="text-center space-y-4">
							<p className="text-sm text-gray-600">© {new Date().getFullYear()} ASHIRA. Todos los derechos reservados.</p>
							<div className="flex flex-wrap justify-center gap-4 text-sm">
								<Link href="/" className="text-teal-600 hover:underline">
									Inicio
								</Link>
								<span className="text-gray-400">•</span>
								<Link href="/register" className="text-teal-600 hover:underline">
									Registro
								</Link>
								<span className="text-gray-400">•</span>
								<Link href="/login" className="text-teal-600 hover:underline">
									Iniciar Sesión
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
