/** @loading Medic Dashboard Loading State */
import { Loader2, Users, CalendarDays, DollarSign } from 'lucide-react';

const ComponentSkeleton = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
    <div className={`animate-pulse bg-white/70 rounded-2xl border border-slate-100 p-6 shadow-sm ${className}`}>
        {children || <div className="h-32 bg-slate-200 rounded-xl" />}
    </div>
);

export default function MedicLoading() {
    return (
        <div className="p-4 sm:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen space-y-8">
            <div className="space-y-2">
                <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
            </div>

            {/* KPI Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <ComponentSkeleton key={i} className="min-h-[160px] flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-200 rounded-2xl shrink-0" />
                        <div className="space-y-3 w-full">
                            <div className="h-3 bg-slate-200 rounded w-1/3" />
                            <div className="h-6 bg-slate-300 rounded w-1/2" />
                            <div className="h-3 bg-slate-200 rounded w-1/4" />
                        </div>
                    </ComponentSkeleton>
                ))}
            </div>

            {/* Today Consultations Skeleton */}
            <ComponentSkeleton className="h-64 overflow-hidden border-t-4 border-t-teal-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg" />
                    <div className="space-y-2">
                        <div className="h-4 w-48 bg-teal-100 rounded" />
                        <div className="h-3 w-32 bg-teal-50 rounded" />
                    </div>
                </div>
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl w-full" />
                    ))}
                </div>
            </ComponentSkeleton>

            {/* Grid for Agenda and Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ComponentSkeleton className="h-[500px]" />
                </div>
                <ComponentSkeleton className="h-[500px]" />
            </div>

            {/* Footer Buttons */}
            <div className="h-12 w-40 bg-slate-200 rounded-xl animate-pulse" />
        </div>
    );
}
