import React from 'react';
import { AnalyticsSidebar } from '@/components/analytics/layout/AnalyticsSidebar';
import { AnalyticsAuthGuard } from '@/components/analytics/auth/AnalyticsAuthGuard';

export const dynamic = 'force-dynamic';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AnalyticsAuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <AnalyticsSidebar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AnalyticsAuthGuard>
  );
}

