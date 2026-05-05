export type SurveyQuestionType = 'rating' | 'single_choice' | 'boolean' | 'text';

export interface BaseSurveyQuestion {
	id: string;
	type: SurveyQuestionType;
	label: string;
	required?: boolean;
}

export interface RatingQuestion extends BaseSurveyQuestion {
	type: 'rating';
	min: number;
	max: number;
}

export interface SingleChoiceQuestion extends BaseSurveyQuestion {
	type: 'single_choice';
	options: string[];
}

export interface BooleanQuestion extends BaseSurveyQuestion {
	type: 'boolean';
}

export interface TextQuestion extends BaseSurveyQuestion {
	type: 'text';
	max_length?: number;
}

export type SurveyQuestion = RatingQuestion | SingleChoiceQuestion | BooleanQuestion | TextQuestion;

export interface ConsultationSurvey {
	id: string;
	version: number;
	is_active: boolean;
	questions: SurveyQuestion[];
	created_at: string;
}

export interface ConsultationSurveyResponse {
	id: string;
	consultation_id: string;
	patient_id: string;
	survey_id: string;
	answers: Record<string, any>;
	dismissed: boolean;
	completed_at: string | null;
	created_at: string;
	
	// Relation included if fetched with join
	consultation?: {
		started_at: string;
		chief_complaint: string | null;
		doctor_id: string | null;
		doctor?: {
			name: string | null;
		} | null;
	} | null;
}
