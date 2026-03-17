/** @loading Patient Dashboard Loading State */

export default function PatientLoading() {
    return (
        <div className="space-y-6 animate-pulse p-4 sm:p-8">
            {/* Header Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                <div className="h-8 w-1/3 bg-slate-200 rounded-lg mb-4" />
                <div className="h-4 w-1/4 bg-slate-100 rounded-lg" />
            </div>

            {/* Next Appointment Skeleton (Hero) */}
            <div className="h-64 bg-slate-200 rounded-2xl shadow-lg" />

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg" />
                        <div className="h-4 w-1/2 bg-slate-200 rounded" />
                    </div>
                ))}
            </div>

            {/* Lower Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-80 bg-white rounded-2xl border border-slate-100 shadow-sm" />
                <div className="h-80 bg-white rounded-2xl border border-slate-100 shadow-sm" />
            </div>
        </div>
    );
}
