import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Autenticar usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Obtener datos del usuario desde la tabla user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, "organizationId"')
      .eq('authId', user.id)
      .single();

    if (userError || !userData) {
      console.error('Error obteniendo usuario:', userError);
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 3. Buscar configuración existente
    const { data: config, error: configError } = await supabase
      .from('doctor_schedule_config')
      .select('*')
      .eq('doctor_id', userData.id)
      .maybeSingle();

    if (configError) {
      console.error('Error obteniendo configuración:', configError);
      return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
    }

    // 4. Si no existe configuración, crear una por defecto
    if (!config) {
      const defaultConfig = {
        doctor_id: userData.id,
        organization_id: userData.organizationId,
        consultation_type: 'TURNOS',
        max_patients_per_day: 20,
        shift_config: {
          enabled: true,
          shifts: [
            { id: 'morning', name: 'Turno Mañana', enabled: true },
            { id: 'afternoon', name: 'Turno Tarde', enabled: true },
          ],
        },
        offices: [],
      };

      const { data: newConfig, error: createError } = await supabase
        .from('doctor_schedule_config')
        .insert(defaultConfig)
        .select()
        .single();

      if (createError) {
        console.error('Error creando configuración por defecto:', createError);
        return NextResponse.json({ error: 'Error al crear configuración' }, { status: 500 });
      }

      return NextResponse.json({ config: newConfig });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error en GET /api/dashboard/medic/schedule-config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await req.json();

    console.log('📥 POST /api/dashboard/medic/schedule-config - Datos recibidos:', JSON.stringify(body, null, 2));

    // 1. Autenticar usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError);
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, "organizationId"')
      .eq('authId', user.id)
      .single();

    if (userError || !userData) {
      console.error('Error obteniendo usuario:', userError);
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log('👤 Usuario autenticado:', { id: userData.id, organizationId: userData.organizationId });

    // 3. Validar datos requeridos
    const { consultation_type, max_patients_per_day, shift_config, offices } = body;

    if (!consultation_type || !['TURNOS', 'ORDEN_LLEGADA'].includes(consultation_type)) {
      return NextResponse.json({ error: 'Tipo de consulta inválido' }, { status: 400 });
    }

    if (!max_patients_per_day || max_patients_per_day < 1 || max_patients_per_day > 200) {
      return NextResponse.json({ error: 'Máximo de pacientes inválido (1-200)' }, { status: 400 });
    }

    // 4. Validar configuración de turnos si el tipo es TURNOS
    if (consultation_type === 'TURNOS') {
      if (!shift_config || !shift_config.shifts || shift_config.shifts.length === 0) {
        return NextResponse.json({ error: 'Debe configurar al menos un turno' }, { status: 400 });
      }

      const hasEnabledShift = shift_config.shifts.some((shift: any) => shift.enabled);
      if (!hasEnabledShift) {
        return NextResponse.json({ error: 'Debe habilitar al menos un turno' }, { status: 400 });
      }
    }

    // 5. Validar consultorios
    if (!offices || !Array.isArray(offices)) {
      return NextResponse.json({ error: 'Los consultorios deben ser un array' }, { status: 400 });
    }

    // Si hay consultorios, validar cada uno
    if (offices.length > 0) {
      for (const office of offices) {
        if (!office.name) {
          return NextResponse.json({ error: 'Cada consultorio debe tener un nombre' }, { status: 400 });
        }

        // Validar ubicación (puede ser objeto o null)
        if (office.location && typeof office.location === 'object') {
          if (!office.location.lat || !office.location.lng || !office.location.address) {
            return NextResponse.json({ 
              error: `El consultorio "${office.name}" tiene una ubicación incompleta` 
            }, { status: 400 });
          }
        }

        // Los horarios son opcionales - el doctor puede guardar consultorios sin horarios
        // y configurarlos después
        if (office.schedules && office.schedules.length > 0) {
          // Validar horarios solo si existen
          for (const schedule of office.schedules) {
            if (!schedule.days || schedule.days.length === 0) {
              return NextResponse.json({ error: 'Cada horario debe tener al menos un día' }, { status: 400 });
            }

            if (!schedule.shifts || schedule.shifts.length === 0) {
              return NextResponse.json({ error: 'Cada horario debe tener al menos un turno' }, { status: 400 });
            }

            if (!schedule.hours) {
              return NextResponse.json({ error: 'Cada horario debe tener horas definidas' }, { status: 400 });
            }

            // Validar que las horas de inicio sean menores que las de fin
            for (const shift of schedule.shifts) {
              const hours = schedule.hours[shift];
              if (!hours || !hours.start || !hours.end) {
                return NextResponse.json({ error: `Horario incompleto para turno ${shift}` }, { status: 400 });
              }

              if (hours.start >= hours.end) {
                return NextResponse.json({ error: 'La hora de inicio debe ser menor que la hora de fin' }, { status: 400 });
              }
            }
          }
        }
      }
    }

    console.log('✅ Validación completada exitosamente');
    console.log('📊 Consultorios a guardar:', offices.length);

    // 6. Preparar datos para guardar
    const configData = {
      doctor_id: userData.id,
      organization_id: userData.organizationId,
      consultation_type,
      max_patients_per_day,
      shift_config,
      offices,
      updated_at: new Date().toISOString(),
    };

    // 7. Verificar si ya existe configuración
    const { data: existingConfig } = await supabase
      .from('doctor_schedule_config')
      .select('id')
      .eq('doctor_id', userData.id)
      .maybeSingle();

    let result;
    if (existingConfig) {
      // Actualizar configuración existente
      const { data, error } = await supabase
        .from('doctor_schedule_config')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando configuración:', error);
        return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
      }

      result = data;
    } else {
      // Crear nueva configuración
      const { data, error } = await supabase
        .from('doctor_schedule_config')
        .insert(configData)
        .select()
        .single();

      if (error) {
        console.error('Error creando configuración:', error);
        return NextResponse.json({ error: 'Error al crear configuración' }, { status: 500 });
      }

      result = data;
    }

    return NextResponse.json({ success: true, config: result });
  } catch (error) {
    console.error('❌ Error en POST /api/dashboard/medic/schedule-config:', error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Verificar si es un error de Supabase
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Supabase error code:', (error as any).code);
      console.error('Supabase error details:', (error as any).details);
      console.error('Supabase error hint:', (error as any).hint);
      
      // Error específico de tabla no existente
      if ((error as any).code === '42P01') {
        return NextResponse.json({ 
          error: 'La tabla doctor_schedule_config no existe. Por favor ejecuta la migración SQL primero.',
          details: 'Ejecuta el archivo src/migrations/doctor_schedule_config_migration.sql en Supabase'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
