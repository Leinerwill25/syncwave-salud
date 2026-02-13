export interface GenericReportConfig {
	id?: string;
	primary_color: string;
	secondary_color: string;
	font_family: string;
	header_text: string;
	footer_text: string;
	logo_url?: string | null;
}

export type ConsultationData = {
	id: string;
	appointment_id?: string | null;
	patient_id: string;
	doctor_id: string;
	chief_complaint?: string | null;
	diagnosis?: string | null;
	icd11_code?: string | null;
	icd11_title?: string | null;
	notes?: string | null;
	vitals?: Record<string, any> | null;
	started_at?: string | null;
	ended_at?: string | null;
	created_at?: string;
};
