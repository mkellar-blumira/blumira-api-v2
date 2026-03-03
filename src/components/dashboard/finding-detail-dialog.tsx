"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Building2,
  User,
  Shield,
  Loader2,
  Globe,
  Server,
  Tag,
  FileText,
  Workflow,
  Eye,
  Trash2,
  StickyNote,
  Send,
  UserCheck,
  XSquare,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Paperclip,
  MapPin,
  Hash,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
} from "lucide-react";
import type {
  Finding,
  BlumiraUser,
  EvidenceResponse,
  EvidenceRow,
  FindingComment,
} from "@/lib/blumira-api";
import {
  getAnnotation,
  addNote,
  setAssignee as storeAssignee,
  setLocalStatus,
  deleteAnnotation,
  type FindingAnnotation,
} from "@/lib/annotations";
import { formatDistanceToNow, format } from "date-fns";

export { getAnnotation } from "@/lib/annotations";

interface FindingDetailDialogProps {
  finding: Finding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnnotationChange?: () => void;
  users: BlumiraUser[];
}

function getUserDisplayName(user: BlumiraUser): string {
  if (user.name) return user.name;
  const full = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return full || user.email;
}

function UserSelector({
  users,
  value,
  onChange,
  placeholder,
}: {
  users: BlumiraUser[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const name = getUserDisplayName(u).toLowerCase();
    return name.includes(term) || u.email.toLowerCase().includes(term);
  });

  const handleSelect = (user: BlumiraUser) => {
    onChange(getUserDisplayName(user));
    setSearch("");
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        placeholder={placeholder || (users.length > 0 ? "Search users or type a name..." : "Type a name...")}
        value={value}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="pl-9"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.slice(0, 15).map((user) => {
            const name = getUserDisplayName(user);
            return (
              <button
                key={user.user_id || user.email}
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(user)}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{name}</p>
                  {name !== user.email && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getStatusIcon(status: string, size = "h-4 w-4") {
  switch (status.toLowerCase()) {
    case "open":
      return <AlertCircle className={`${size} text-red-500`} />;
    case "closed":
    case "resolved":
      return <CheckCircle2 className={`${size} text-emerald-500`} />;
    case "dismissed":
      return <XCircle className={`${size} text-gray-400`} />;
    default:
      return <AlertCircle className={`${size} text-gray-400`} />;
  }
}

function getPriorityBadge(priority: number) {
  const map: Record<number, { label: string; variant: "destructive" | "warning" | "default" | "secondary" | "info" }> = {
    1: { label: "P1 - Critical", variant: "destructive" },
    2: { label: "P2 - High", variant: "warning" },
    3: { label: "P3 - Medium", variant: "default" },
    4: { label: "P4 - Low", variant: "info" },
    5: { label: "P5 - Info", variant: "secondary" },
  };
  const entry = map[priority] || { label: `P${priority}`, variant: "secondary" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="text-sm mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function formatPersonName(person: { first_name?: string; last_name?: string; email?: string } | undefined | null): string | null {
  if (!person) return null;
  const full = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  return full || person.email || null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5" title="Copy value">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function formatEvidenceValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatKeyLabel(key: string): string {
  if (key === "__time_matched") return "time";
  return key.replace(/_/g, " ");
}

function EvidenceLogs({
  evidence,
  loading,
  page,
  onPageChange,
}: {
  evidence: EvidenceResponse | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
          <span className="text-sm text-neutral-400 font-mono">Loading evidence logs...</span>
        </div>
      </div>
    );
  }

  if (!evidence || evidence.data.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-center">
        <Terminal className="h-6 w-6 text-neutral-600 mx-auto mb-2" />
        <p className="text-sm text-neutral-500 font-mono">No evidence logs available</p>
      </div>
    );
  }

  const keys = evidence.evidence_keys;
  const meta = evidence.meta;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Evidence Logs</h4>
          <Badge variant="secondary" className="text-[10px]">{meta.total_items} log{meta.total_items !== 1 ? "s" : ""}</Badge>
        </div>
        {meta.total_pages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="icon" className="h-6 w-6"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {meta.page}/{meta.total_pages}
            </span>
            <Button
              variant="outline" size="icon" className="h-6 w-6"
              disabled={page >= meta.total_pages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
        <div className="max-h-[360px] overflow-y-auto">
          {evidence.data.map((row, idx) => {
            const isExpanded = expandedRow === idx;
            const timeVal = row["__time_matched"] ? formatEvidenceValue(row["__time_matched"]) : null;
            const summaryKeys = keys.filter(k => k !== "__time_matched");

            return (
              <div key={idx}>
                <button
                  onClick={() => setExpandedRow(isExpanded ? null : idx)}
                  className={`w-full text-left px-3 py-1.5 font-mono text-xs border-b border-neutral-800/60 transition-colors hover:bg-neutral-900 ${isExpanded ? "bg-neutral-900" : ""}`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-neutral-600 shrink-0 w-4 pt-px">
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </span>
                    {timeVal && (
                      <span className="text-neutral-500 shrink-0">
                        {(() => {
                          try { return format(new Date(timeVal), "HH:mm:ss.SSS"); }
                          catch { return timeVal; }
                        })()}
                      </span>
                    )}
                    <span className="text-neutral-200 truncate">
                      {summaryKeys.slice(0, 4).map((k) => {
                        const v = formatEvidenceValue(row[k]);
                        if (!v) return null;
                        return (
                          <span key={k}>
                            <span className="text-blue-400">{formatKeyLabel(k)}</span>
                            <span className="text-neutral-500">=</span>
                            <span className="text-emerald-300">{v}</span>
                            <span className="text-neutral-700 mx-1.5">|</span>
                          </span>
                        );
                      })}
                      {summaryKeys.length > 4 && (
                        <span className="text-neutral-600">+{summaryKeys.length - 4} more</span>
                      )}
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="bg-neutral-900/80 border-b border-neutral-800/60 px-3 py-2.5">
                    <div className="grid gap-1 ml-6">
                      {keys.map(key => {
                        const val = formatEvidenceValue(row[key]);
                        if (!val) return null;
                        return (
                          <div key={key} className="flex items-start gap-2 font-mono text-xs group min-w-0">
                            <span className="text-blue-400 shrink-0 min-w-[120px] text-right">{formatKeyLabel(key)}</span>
                            <span className="text-neutral-600">:</span>
                            <span className="text-neutral-200 break-all flex-1 select-all">{val}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <CopyButton text={val} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CommentsSection({
  comments,
  loading,
}: {
  comments: FindingComment[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading comments...</span>
      </div>
    );
  }

  if (comments.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">Comments</h4>
        <Badge variant="secondary" className="text-[10px]">{comments.length}</Badge>
      </div>
      <div className="space-y-2">
        {comments.map((comment, i) => {
          const senderName = comment.sender
            ? `${comment.sender.first_name || ""} ${comment.sender.last_name || ""}`.trim() || comment.sender.email || "Unknown"
            : "Unknown";
          return (
            <div key={comment.id || i} className="rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium shrink-0">
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{senderName}</span>
                </div>
                {comment.age != null && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(Date.now() - comment.age * 1000), { addSuffix: true })}
                  </span>
                )}
              </div>
              {comment.subject && (
                <p className="text-xs font-medium mb-1">{comment.subject}</p>
              )}
              <div
                className="text-sm text-muted-foreground prose prose-sm max-w-none [&_p]:m-0 [&_div]:m-0"
                dangerouslySetInnerHTML={{ __html: comment.body }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FindingDetailDialog({
  finding,
  open,
  onOpenChange,
  onAnnotationChange,
  users,
}: FindingDetailDialogProps) {
  const [detailData, setDetailData] = useState<Finding | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [annotation, setAnnotation] = useState<FindingAnnotation | null>(null);
  const [newNote, setNewNote] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [showAssignee, setShowAssignee] = useState(false);

  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidencePage, setEvidencePage] = useState(1);

  const [comments, setComments] = useState<FindingComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchEvidence = useCallback((accountId: string, findingId: string, page: number) => {
    setLoadingEvidence(true);
    fetch(`/api/blumira/findings/evidence?accountId=${accountId}&findingId=${findingId}&page=${page}&pageSize=50`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setEvidence(res);
        else setEvidence(null);
      })
      .catch(() => setEvidence(null))
      .finally(() => setLoadingEvidence(false));
  }, []);

  const fetchComments = useCallback((accountId: string, findingId: string) => {
    setLoadingComments(true);
    fetch(`/api/blumira/findings/comments?accountId=${accountId}&findingId=${findingId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data && Array.isArray(res.data)) setComments(res.data);
        else setComments([]);
      })
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, []);

  useEffect(() => {
    if (finding && open) {
      const a = getAnnotation(finding.finding_id);
      setAnnotation(a);
      setAssigneeInput(a?.assignee || "");
      setNewNote("");
      setShowAssignee(false);
      setEvidencePage(1);
      setEvidence(null);
      setComments([]);

      setLoadingDetail(true);
      fetch(`/api/blumira/findings?accountId=${finding.org_id}&findingId=${finding.finding_id}`)
        .then((r) => r.json())
        .then((res) => { if (res.data) setDetailData(res.data); })
        .catch(() => {})
        .finally(() => setLoadingDetail(false));

      fetchEvidence(finding.org_id, finding.finding_id, 1);
      fetchComments(finding.org_id, finding.finding_id);
    } else {
      setDetailData(null);
      setEvidence(null);
      setComments([]);
    }
  }, [finding, open, fetchEvidence, fetchComments]);

  const handleEvidencePageChange = useCallback((newPage: number) => {
    if (!finding) return;
    setEvidencePage(newPage);
    fetchEvidence(finding.org_id, finding.finding_id, newPage);
  }, [finding, fetchEvidence]);

  const handleAddNote = useCallback(() => {
    if (!finding || !newNote.trim()) return;
    const updated = addNote(finding.finding_id, newNote.trim(), "You");
    setAnnotation(updated);
    setNewNote("");
    onAnnotationChange?.();
  }, [finding, newNote, onAnnotationChange]);

  const handleTakeOwnership = useCallback(() => {
    if (!finding) return;
    setShowAssignee(true);
  }, [finding]);

  const handleSaveAssignee = useCallback(() => {
    if (!finding) return;
    const updated = storeAssignee(finding.finding_id, assigneeInput.trim());
    setAnnotation(updated);
    setShowAssignee(false);
    onAnnotationChange?.();
  }, [finding, assigneeInput, onAnnotationChange]);

  const handleClose = useCallback(() => {
    if (!finding) return;
    setLocalStatus(finding.finding_id, "closed");
    addNote(finding.finding_id, "Marked as closed from dashboard", "System");
    setAnnotation(getAnnotation(finding.finding_id));
    onAnnotationChange?.();
  }, [finding, onAnnotationChange]);

  const handleReopen = useCallback(() => {
    if (!finding) return;
    setLocalStatus(finding.finding_id, "none");
    addNote(finding.finding_id, "Reopened from dashboard", "System");
    setAnnotation(getAnnotation(finding.finding_id));
    onAnnotationChange?.();
  }, [finding, onAnnotationChange]);

  const handleClearAll = useCallback(() => {
    if (!finding) return;
    deleteAnnotation(finding.finding_id);
    setAnnotation(null);
    setAssigneeInput("");
    onAnnotationChange?.();
  }, [finding, onAnnotationChange]);

  if (!finding) return null;

  const detail = detailData || finding;
  const blumiraUrl = detail.url || `https://app.blumira.com/${finding.org_id}/reporting/findings/${finding.finding_id}`;
  const isClosed = annotation?.localStatus === "closed";

  const noteCount = annotation?.notes?.length || 0;

  const ownersList: string[] = [];
  if (detail.owners) {
    for (const group of [detail.owners.responders, detail.owners.analysts, detail.owners.managers]) {
      if (group) {
        for (const p of group) {
          const name = formatPersonName(p);
          if (name) ownersList.push(name);
        }
      }
    }
  }

  const categoryDisplay = detail.category_name
    || (typeof detail.category === "string" && detail.category)
    || null;

  const hasTechnicalDetails = detail.ip_address || detail.hostname || detail.url || detail.user || detail.workflow_name || detail.rule_name || detail.detector_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-lg leading-tight pr-8">
              {detail.name}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                {getPriorityBadge(detail.priority)}
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStatusIcon(detail.status_name)}
                  {detail.status_name}
                </Badge>
                {detail.short_id && (
                  <Badge variant="secondary" className="font-mono text-[10px]">{detail.short_id}</Badge>
                )}
                {detail.blocked && (
                  <Badge variant="info" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Blocked
                  </Badge>
                )}
                {isClosed && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Closed locally
                  </Badge>
                )}
                {annotation?.assignee && (
                  <Badge variant="info" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {annotation.assignee}
                  </Badge>
                )}
              </div>
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleTakeOwnership}>
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            {annotation?.assignee ? "Reassign" : "Take Ownership"}
          </Button>
          {!isClosed ? (
            <Button size="sm" variant="outline" onClick={handleClose}>
              <XSquare className="h-3.5 w-3.5 mr-1.5" />
              Close Finding
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleReopen}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reopen
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={blumiraUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in Blumira
            </a>
          </Button>
          {annotation && (
            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto" onClick={handleClearAll}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          )}
        </div>

        {showAssignee && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium">Assign this finding to:</p>
            <UserSelector users={users} value={assigneeInput} onChange={setAssigneeInput} placeholder="Select or type assignee..." />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveAssignee} disabled={!assigneeInput.trim()}>
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Assign
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAssignee(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* All content in a single scrollable flow */}
        <div className="space-y-4">
          {loadingDetail && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
            </div>
          )}

          {/* Finding details */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
            <DetailRow icon={<Building2 className="h-4 w-4" />} label="Organization" value={detail.org_name} />
            {detail.short_id && <DetailRow icon={<Hash className="h-4 w-4" />} label="Finding ID" value={<code className="text-xs bg-muted rounded px-1.5 py-0.5">{detail.short_id}</code>} />}
            <DetailRow icon={<Tag className="h-4 w-4" />} label="Type" value={detail.type_name} />
            {categoryDisplay && (
              <DetailRow icon={<Tag className="h-4 w-4" />} label="Category"
                value={<span>{categoryDisplay}{detail.subcategory && ` / ${detail.subcategory}`}</span>} />
            )}
            {detail.jurisdiction_name && <DetailRow icon={<Shield className="h-4 w-4" />} label="Jurisdiction" value={detail.jurisdiction_name} />}
            {detail.source && <DetailRow icon={<Eye className="h-4 w-4" />} label="Source" value={detail.source} />}
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Created"
              value={
                <span>
                  {format(new Date(detail.created), "MMM d, yyyy 'at' h:mm a")}
                  <span className="text-muted-foreground ml-2">({formatDistanceToNow(new Date(detail.created), { addSuffix: true })})</span>
                </span>
              } />
            {detail.modified && (
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Modified"
                value={
                  <span>
                    {format(new Date(detail.modified), "MMM d, yyyy 'at' h:mm a")}
                    {detail.modified_by && (
                      <span className="text-muted-foreground ml-2">by {formatPersonName(detail.modified_by)}</span>
                    )}
                  </span>
                } />
            )}
            {detail.status_modified && (
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Status Changed"
                value={
                  <span>
                    {format(new Date(detail.status_modified), "MMM d, yyyy 'at' h:mm a")}
                    {detail.status_modified_by && (
                      <span className="text-muted-foreground ml-2">by {formatPersonName(detail.status_modified_by)}</span>
                    )}
                  </span>
                } />
            )}
            {detail.resolution_name && <DetailRow icon={<CheckCircle2 className="h-4 w-4" />} label="Resolution" value={detail.resolution_name} />}
            {detail.resolution_notes && <DetailRow icon={<FileText className="h-4 w-4" />} label="Resolution Notes" value={detail.resolution_notes} />}
            {ownersList.length > 0 && (
              <DetailRow icon={<UserCheck className="h-4 w-4" />} label="Owners" value={ownersList.join(", ")} />
            )}
            {detail.locations && detail.locations.length > 0 && (
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Locations"
                value={detail.locations.map(l => `${l.name}${l.city ? ` (${l.city})` : ""}`).join(", ")} />
            )}
            {detail.src_country && detail.src_country.length > 0 && (
              <DetailRow icon={<Globe className="h-4 w-4" />} label="Source Countries" value={detail.src_country.join(", ")} />
            )}
          </div>

          {/* Analysis / Summary / Description */}
          {(detail.analysis || detail.summary || detail.description) && (
            <div className="space-y-3">
              {detail.analysis && (
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />Analysis</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{detail.analysis}</p>
                </div>
              )}
              {detail.summary && (
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Summary</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">{detail.summary}</p>
                </div>
              )}
              {detail.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{detail.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Technical Details */}
          {hasTechnicalDetails && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Technical Details</h4>
              {detail.ip_address && <DetailRow icon={<Globe className="h-4 w-4" />} label="IP Address" value={<code className="text-xs bg-muted rounded px-1.5 py-0.5">{detail.ip_address}</code>} />}
              {detail.hostname && <DetailRow icon={<Server className="h-4 w-4" />} label="Hostname" value={<code className="text-xs bg-muted rounded px-1.5 py-0.5">{detail.hostname}</code>} />}
              {detail.url && <DetailRow icon={<Globe className="h-4 w-4" />} label="URL" value={<a href={detail.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-xs">{detail.url}</a>} />}
              {detail.user && <DetailRow icon={<User className="h-4 w-4" />} label="User" value={detail.user} />}
              {detail.workflow_name && <DetailRow icon={<Workflow className="h-4 w-4" />} label="Workflow" value={detail.workflow_name} />}
              {detail.rule_name && <DetailRow icon={<Shield className="h-4 w-4" />} label="Rule" value={detail.rule_name} />}
              {detail.detector_name && <DetailRow icon={<Eye className="h-4 w-4" />} label="Detector" value={detail.detector_name} />}
            </div>
          )}

          {/* Evidence Logs - inline right after technical details */}
          <EvidenceLogs
            evidence={evidence}
            loading={loadingEvidence}
            page={evidencePage}
            onPageChange={handleEvidencePageChange}
          />

          {/* Attachments */}
          {detail.attachments && detail.attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Attachments</h4>
                <Badge variant="secondary" className="text-[10px]">{detail.attachments.length}</Badge>
              </div>
              <div className="space-y-1">
                {detail.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 text-sm rounded-lg border bg-muted/20 px-3 py-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{att.filename}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {att.uploaded_at && format(new Date(att.uploaded_at), "MMM d, yyyy")}
                      {att.uploaded_by && ` by ${formatPersonName(att.uploaded_by)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Findings */}
          {detail.related_findings && detail.related_findings.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Related Findings"
                value={
                  <div className="flex flex-wrap gap-1">
                    {detail.related_findings.map(id => (
                      <Badge key={id} variant="outline" className="font-mono text-[10px]">{id.slice(0, 8)}...</Badge>
                    ))}
                  </div>
                } />
            </div>
          )}

          <Separator />

          {/* Comments from API */}
          <CommentsSection comments={comments} loading={loadingComments} />

          {/* Local Notes */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-blue-600" />
              Notes
              {noteCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">{noteCount}</Badge>
              )}
            </h4>

            {annotation?.notes && annotation.notes.length > 0 ? (
              <div className="space-y-2">
                {[...annotation.notes].reverse().map((note, i) => (
                  <div key={i} className={`rounded-lg border p-3 text-sm ${note.author === "System" ? "bg-muted/20 border-dashed" : "bg-muted/30"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{note.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No notes yet. Add one below.</p>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <Button size="sm" className="self-end" onClick={handleAddNote} disabled={!newNote.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Press Ctrl+Enter to send. Notes are stored locally in your browser.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
