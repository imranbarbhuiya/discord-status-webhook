export interface StatusPageResult {
	incidents: StatusPageIncident[];
	page: StatusPagePageInformation;
}

export interface StatusPagePageInformation {
	id: string;
	name: string;
	time_zone: string;
	updated_at: string;
	url: string;
}

export interface StatusPageIncident {
	components: StatusPageComponent[];
	created_at: string;
	id: string;
	impact: StatusPageIncidentImpact;
	incident_updates: StatusPageIncidentUpdate[];
	monitoring_at: string | null;
	name: string;
	page_id: string;
	resolved_at: string | null;
	shortlink: string;
	started_at: string;
	status: StatusPageIncidentStatus;
	updated_at: string | null;
}

export interface StatusPageIncidentUpdate {
	affected_components: StatusPageComponentUpdate[];
	body: string;
	created_at: string;
	custom_tweet: string | null;
	deliver_notifications: boolean;
	display_at: string;
	id: string;
	incident_id: string;
	status: string;
	tweet_id: string | null;
	update_at: string;
}

export type StatusPageIncidentStatus = 'identified' | 'investigating' | 'monitoring' | 'postmortem' | 'resolved';
export type StatusPageIncidentImpact = 'critical' | 'major' | 'minor' | 'none';

export interface StatusPageComponent {
	created_at: string;
	description: string;
	group: boolean;
	group_id: string | null;
	id: string;
	name: string;
	only_show_if_degraded: boolean;
	page_id: string;
	position: number;
	showcase: boolean;
	start_date: string | null;
	status: string;
	updated_at: string;
}

export interface StatusPageComponentUpdate {
	code: string;
	name: string;
	new_status: string;
	old_status: string;
}
