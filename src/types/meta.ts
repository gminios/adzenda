// Meta Marketing API v21.0 — response types

export interface MetaCampaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  objective?: string;
  start_time?: string;
  stop_time?: string;
}

export interface MetaAdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface MetaAd {
  id: string;
  adset_id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  creative?: { id: string };
}

export interface MetaInsight {
  ad_id: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

export interface MetaPagedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
  error?: { message: string; code: number; type: string };
}
