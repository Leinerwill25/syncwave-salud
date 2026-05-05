import { POINTS_EVENTS } from '@/lib/points/events';
import { HeartPulse, User, Calendar, FileText, Users, Trophy } from 'lucide-react';

export default function HowToEarnList() {
  const events = Object.values(POINTS_EVENTS);
  
  // Agrupar por categoría
  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  const categoryConfig: Record<string, { title: string, icon: any, color: string }> = {
    profile: { title: 'Tu Perfil', icon: User, color: 'text-purple-500 bg-purple-50' },
    appointments: { title: 'Tus Citas', icon: Calendar, color: 'text-blue-500 bg-blue-50' },
    documents: { title: 'Documentos Clínicos', icon: FileText, color: 'text-teal-500 bg-teal-50' },
    surveys: { title: 'Encuestas', icon: HeartPulse, color: 'text-rose-500 bg-rose-50' },
    family: { title: 'Grupo Familiar', icon: Users, color: 'text-indigo-500 bg-indigo-50' },
    streaks: { title: 'Rachas y Logros', icon: Trophy, color: 'text-yellow-500 bg-yellow-50' },
    payments: { title: 'Pagos', icon: FileText, color: 'text-green-500 bg-green-50' }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([category, catEvents]) => {
        const config = categoryConfig[category] || { title: category, icon: HeartPulse, color: 'text-gray-500 bg-gray-50' };
        const Icon = config.icon;

        return (
          <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{config.title}</h3>
            </div>
            
            <ul className="divide-y divide-gray-50">
              {catEvents.map((event) => (
                <li key={event.key} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{event.description}</p>
                    <div className="flex gap-2 mt-1">
                      {event.once && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Una sola vez</span>
                      )}
                      {event.dailyLimit && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Máx. {event.dailyLimit} al día</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 border border-green-100">
                    +{event.points} <span className="hidden sm:inline text-xs font-normal">Pulsos</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
