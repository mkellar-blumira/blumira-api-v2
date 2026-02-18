const AUTH_URL = "https://auth.blumira.com/oauth/token";
const API_BASE_URL = "https://api.blumira.com/public-api/v1";
export const APP_BASE_URL = "https://app.blumira.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.BLUMIRA_CLIENT_ID;
  const clientSecret = process.env.BLUMIRA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "BLUMIRA_CLIENT_ID and BLUMIRA_CLIENT_SECRET environment variables are required"
    );
  }

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: "public-api",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Authentication failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("No access token received from authentication endpoint");
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000 - 60000,
  };

  return data.access_token;
}

async function apiGet<T = unknown>(
  path: string,
  token: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function apiPatch<T = unknown>(
  path: string,
  token: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API PATCH failed (${response.status}): ${text}`);
  }

  return response.json();
}

export interface MspAccount {
  account_id: string;
  name: string;
  open_findings?: number;
}

export interface AccountDetails {
  agent_count_available: number;
  agent_count_used: number;
  license: string;
  user_count: number;
}

export interface Finding {
  finding_id: string;
  name: string;
  priority: number;
  status_name: string;
  status?: number;
  type_name: string;
  type?: number;
  created: string;
  modified: string;
  org_name: string;
  org_id: string;
  resolution_name?: string;
  resolution?: number;
  assigned_to?: string;
  assigned_to_name?: string;
  description?: string;
  summary?: string;
  source?: string;
  category?: string;
  subcategory?: string;
  evidence?: string;
  notes?: string;
  ip_address?: string;
  hostname?: string;
  url?: string;
  user?: string;
  workflow_name?: string;
  rule_name?: string;
  detector_name?: string;
}

export interface AgentDevice {
  device_id: string;
  hostname: string;
  alive: string;
  arch: string;
  created: string;
  is_excluded: boolean;
  is_isolated: boolean;
  is_sleeping: boolean;
  isolation_requested: boolean;
  key_id: string;
  keyname: string;
  modified: string;
  org_id: string;
  plat: string;
}

export interface AgentKey {
  key_id: string;
  key_name?: string;
  name?: string;
  status?: string;
  created_at?: string;
}

interface ApiResponse<T> {
  status?: string;
  data?: T;
  meta?: {
    total_items?: number;
    page?: number;
    per_page?: number;
  };
}

export async function fetchMspAccounts(
  token: string
): Promise<MspAccount[]> {
  const res = await apiGet<ApiResponse<MspAccount[]>>(
    "/msp/accounts",
    token
  );
  return res.data || [];
}

export async function fetchAccountDetail(
  token: string,
  accountId: string
): Promise<AccountDetails | null> {
  try {
    const res = await apiGet<ApiResponse<AccountDetails> & AccountDetails>(
      `/msp/accounts/${accountId}`,
      token
    );
    return res.data || res;
  } catch {
    return null;
  }
}

export async function fetchAllFindings(
  token: string
): Promise<Finding[]> {
  const res = await apiGet<ApiResponse<Finding[]>>(
    "/msp/accounts/findings",
    token
  );
  return res.data || [];
}

export async function fetchAccountFindings(
  token: string,
  accountId: string
): Promise<Finding[]> {
  try {
    const res = await apiGet<ApiResponse<Finding[]>>(
      `/msp/accounts/${accountId}/findings`,
      token
    );
    return res.data || [];
  } catch {
    return [];
  }
}

export async function fetchAccountAgentDevices(
  token: string,
  accountId: string
): Promise<{ devices: AgentDevice[]; meta: Record<string, unknown> | null }> {
  try {
    const res = await apiGet<ApiResponse<AgentDevice[]>>(
      `/msp/accounts/${accountId}/agents/devices`,
      token
    );
    return { devices: res.data || [], meta: res.meta || null };
  } catch {
    return { devices: [], meta: null };
  }
}

export async function fetchAccountAgentKeys(
  token: string,
  accountId: string
): Promise<AgentKey[]> {
  try {
    const res = await apiGet<ApiResponse<AgentKey[]>>(
      `/msp/accounts/${accountId}/agents/keys`,
      token
    );
    return res.data || [];
  } catch {
    return [];
  }
}

export interface EnrichedAccount extends MspAccount {
  details: AccountDetails | null;
  findings: Finding[];
  agentDevices: AgentDevice[];
  agentKeys: AgentKey[];
  deviceMeta: Record<string, unknown> | null;
  stats: {
    totalFindings: number;
    criticalFindings: number;
    openFindings: number;
    totalDevices: number;
    onlineDevices: number;
    sleepingDevices: number;
    isolatedDevices: number;
    excludedDevices: number;
    agentKeysCount: number;
  };
}

export interface FindingUpdate {
  status?: number;
  priority?: number;
  assigned_to?: string;
  resolution?: number;
  notes?: string;
}

export async function updateFinding(
  token: string,
  accountId: string,
  findingId: string,
  updates: FindingUpdate
): Promise<Finding> {
  const res = await apiPatch<ApiResponse<Finding> & Finding>(
    `/msp/accounts/${accountId}/findings/${findingId}`,
    token,
    updates as Record<string, unknown>
  );
  return res.data || res;
}

export async function fetchFindingDetail(
  token: string,
  accountId: string,
  findingId: string
): Promise<Finding | null> {
  try {
    const res = await apiGet<ApiResponse<Finding> & Finding>(
      `/msp/accounts/${accountId}/findings/${findingId}`,
      token
    );
    return res.data || res;
  } catch {
    return null;
  }
}

export async function fetchEnrichedAccount(
  token: string,
  account: MspAccount
): Promise<EnrichedAccount> {
  const [details, findings, devicesResult, agentKeys] = await Promise.all([
    fetchAccountDetail(token, account.account_id),
    fetchAccountFindings(token, account.account_id),
    fetchAccountAgentDevices(token, account.account_id),
    fetchAccountAgentKeys(token, account.account_id),
  ]);

  const devices = devicesResult.devices;

  return {
    ...account,
    details,
    findings,
    agentDevices: devices,
    agentKeys,
    deviceMeta: devicesResult.meta,
    stats: {
      totalFindings: findings.length,
      criticalFindings: findings.filter((f) => f.priority === 1).length,
      openFindings: findings.filter(
        (f) => f.status_name === "Open"
      ).length,
      totalDevices: devices.length,
      onlineDevices: devices.filter(
        (d) => !d.is_sleeping && !d.is_isolated && !d.is_excluded
      ).length,
      sleepingDevices: devices.filter((d) => d.is_sleeping).length,
      isolatedDevices: devices.filter((d) => d.is_isolated).length,
      excludedDevices: devices.filter((d) => d.is_excluded).length,
      agentKeysCount: agentKeys.length,
    },
  };
}
