'use client';

import React from 'react';
import SuccessiveConsultationForm from '../SuccessiveConsultationForm';

export default function EditSuccessiveConsultationPage({ params }: { params: Promise<{ id: string }> }) {
	return <SuccessiveConsultationForm params={params} />;
}

