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
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import type { Finding, BlumiraUser } from "@/lib/blumira-api";
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

  const reload = useCallback(() => {
    if (!finding) return;
    setAnnotation(getAnnotation(finding.finding_id));
    onAnnotationChange?.();
  }, [finding, onAnnotationChange]);

  useEffect(() => {
    if (finding && open) {
      const a = getAnnotation(finding.finding_id);
      setAnnotation(a);
      setAssigneeInput(a?.assignee || "");
      setNewNote("");
      setShowAssignee(false);

      setLoadingDetail(true);
      fetch(`/api/blumira/findings?accountId=${finding.org_id}&findingId=${finding.finding_id}`)
        .then((r) => r.json())
        .then((res) => { if (res.data) setDetailData(res.data); })
        .catch(() => {})
        .finally(() => setLoadingDetail(false));
    } else {
      setDetailData(null);
    }
  }, [finding, open]);

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
    const updated = setLocalStatus(finding.finding_id, "closed");
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
  const blumiraUrl = `https://app.blumira.com/${finding.org_id}/reporting/findings/${finding.finding_id}`;
  const isClosed = annotation?.localStatus === "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
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

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {loadingDetail && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <DetailRow icon={<Building2 className="h-4 w-4" />} label="Organization" value={detail.org_name} />
              <DetailRow icon={<Tag className="h-4 w-4" />} label="Type" value={detail.type_name} />
              {detail.category && (
                <DetailRow icon={<Tag className="h-4 w-4" />} label="Category"
                  value={<span>{detail.category}{detail.subcategory && ` / ${detail.subcategory}`}</span>} />
              )}
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
                  value={<span>{format(new Date(detail.modified), "MMM d, yyyy 'at' h:mm a")}</span>} />
              )}
              {detail.resolution_name && <DetailRow icon={<CheckCircle2 className="h-4 w-4" />} label="Resolution" value={detail.resolution_name} />}
            </div>

            {(detail.description || detail.summary || detail.evidence) && (
              <div className="space-y-3">
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
                {detail.evidence && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />Evidence</h4>
                    <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">{detail.evidence}</pre>
                  </div>
                )}
              </div>
            )}

            {(detail.ip_address || detail.hostname || detail.url || detail.user || detail.workflow_name || detail.rule_name || detail.detector_name) && (
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

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-blue-600" />
                Notes
                {annotation?.notes && annotation.notes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{annotation.notes.length}</Badge>
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
