'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InventoryMovementForm from '../_components/InventoryMovementForm';
import { Loader2 } from 'lucide-react';

function PurchasePageContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') === 'materiales' ? 'material' : 'medication';

  return (
    <div className="p-4 md:p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <InventoryMovementForm mode="PURCHASE" initialType={type} />
    </div>
  );
}

export default function InventoryPurchasePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    }>
      <PurchasePageContent />
    </Suspense>
  );
}
