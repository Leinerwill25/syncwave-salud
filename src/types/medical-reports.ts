export type ReportType =
	| 'laboratorio'
	| 'imagen'
	| 'ecografia'
	| 'resonancia'
	| 'rayos_x'
	| 'tomografia'
	| 'electrocardiograma'
	| 'biopsia'
	| 'otro';

export interface PatientMedicalReport {
	id: string;
	patient_id: string;
	consultation_id: string | null;
	title: string;
	description: string | null;
	report_type: ReportType;
	file_url: string;
	file_name: string;
	file_size: number | null;
	file_type: string | null;
	uploaded_by: string | null;
	is_shared_with_doctor: boolean;
	created_at: string;
	updated_at: string;
}

export interface PatientMedicalReportInsert {
	patient_id: string;
	consultation_id?: string | null;
	title: string;
	description?: string | null;
	report_type: ReportType;
	file_url: string;
	file_name: string;
	file_size?: number | null;
	file_type?: string | null;
	uploaded_by?: string | null;
	is_shared_with_doctor?: boolean;
}

export interface PatientMedicalReportUpdate {
	consultation_id?: string | null;
	title?: string;
	description?: string | null;
	report_type?: ReportType;
	is_shared_with_doctor?: boolean;
}
