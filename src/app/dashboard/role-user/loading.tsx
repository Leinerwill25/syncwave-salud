/** @loading Role User Dashboard Loading State */

export default function RoleUserLoading() {
    return (
        <div className="w-full min-w-0 px-2 sm:px-0 space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="space-y-3">
                <div className="h-8 w-48 bg-slate-200 rounded-lg" />
                <div className="h-4 w-72 bg-slate-100 rounded-lg" />
            </div>

            {/* Modules Grid Skeleton */}
            <div className="space-y-6">
                <div className="h-6 w-40 bg-slate-200 rounded-md" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                                <div className="flex gap-2">
                                    <div className="h-4 w-8 bg-blue-50 rounded" />
                                    <div className="h-4 w-8 bg-green-50 rounded" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-5 w-1/2 bg-slate-200 rounded" />
                                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
