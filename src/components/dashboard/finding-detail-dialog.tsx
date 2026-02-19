"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Save,
  RefreshCw,
  Globe,
  Server,
  Tag,
  FileText,
  Workflow,
  Eye,
  Trash2,
  StickyNote,
} from "lucide-react";
import type { Finding, BlumiraUser } from "@/lib/blumira-api";
import { formatDistanceToNow, format } from "date-fns";

const STORAGE_KEY = "blumira-finding-annotations";

interface FindingAnnotation {
  assignee: string;
  notes: string;
  updatedAt: string;
}

function getAnnotations(): Record<string, FindingAnnotation> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAnnotation(findingId: string, data: FindingAnnotation) {
  const all = getAnnotations();
  all[findingId] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function deleteAnnotation(findingId: string) {
  const all = getAnnotations();
  delete all[findingId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getAnnotation(findingId: string): FindingAnnotation | null {
  const all = getAnnotations();
  return all[findingId] || null;
}

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
}: {
  users: BlumiraUser[];
  value: string;
  onChange: (value: string) => void;
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
    const display = getUserDisplayName(user);
    onChange(display);
    setSearch("");
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    setShowDropdown(true);
  };

  return (
    <div className="relative">
      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        placeholder={users.length > 0 ? "Search users or type a name..." : "Type an assignee name..."}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="pl-9"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.slice(0, 20).map((user) => {
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
                {user.org_name && (
                  <span className="text-xs text-muted-foreground shrink-0">{user.org_name}</span>
                )}
              </button>
            );
          })}
          {filtered.length > 20 && (
            <p className="px-3 py-2 text-xs text-muted-foreground text-center">
              {filtered.length - 20} more users — refine your search
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "open":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "closed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "dismissed":
      return <XCircle className="h-4 w-4 text-gray-400" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
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

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
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
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [existingAnnotation, setExistingAnnotation] = useState<FindingAnnotation | null>(null);

  useEffect(() => {
    if (finding && open) {
      const annotation = getAnnotation(finding.finding_id);
      setExistingAnnotation(annotation);
      setAssignee(annotation?.assignee || "");
      setNotes(annotation?.notes || "");
      setSaved(false);

      setLoadingDetail(true);
      fetch(`/api/blumira/findings?accountId=${finding.org_id}&findingId=${finding.finding_id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data) {
            setDetailData(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDetail(false));
    } else {
      setDetailData(null);
    }
  }, [finding, open]);

  const hasChanges =
    assignee !== (existingAnnotation?.assignee || "") ||
    notes !== (existingAnnotation?.notes || "");

  const handleSave = useCallback(() => {
    if (!finding) return;

    if (!assignee.trim() && !notes.trim()) {
      deleteAnnotation(finding.finding_id);
    } else {
      saveAnnotation(finding.finding_id, {
        assignee: assignee.trim(),
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      });
    }

    setExistingAnnotation(
      assignee.trim() || notes.trim()
        ? { assignee: assignee.trim(), notes: notes.trim(), updatedAt: new Date().toISOString() }
        : null
    );
    setSaved(true);
    onAnnotationChange?.();
    setTimeout(() => setSaved(false), 2000);
  }, [finding, assignee, notes, onAnnotationChange]);

  const handleClearAnnotation = useCallback(() => {
    if (!finding) return;
    deleteAnnotation(finding.finding_id);
    setAssignee("");
    setNotes("");
    setExistingAnnotation(null);
    onAnnotationChange?.();
  }, [finding, onAnnotationChange]);

  if (!finding) return null;

  const detail = detailData || finding;
  const blumiraUrl = `https://app.blumira.com/${finding.org_id}/reporting/findings/${finding.finding_id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-1">
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
                <span className="text-xs">
                  ID: {detail.finding_id}
                </span>
              </div>
            </DialogDescription>
          </div>
        </DialogHeader>

        {loadingDetail && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
            <DetailRow
              icon={<Building2 className="h-4 w-4" />}
              label="Organization"
              value={detail.org_name}
            />
            <DetailRow
              icon={<Tag className="h-4 w-4" />}
              label="Type"
              value={detail.type_name}
            />
            {detail.category && (
              <DetailRow
                icon={<Tag className="h-4 w-4" />}
                label="Category"
                value={
                  <span>
                    {detail.category}
                    {detail.subcategory && ` / ${detail.subcategory}`}
                  </span>
                }
              />
            )}
            {detail.source && (
              <DetailRow
                icon={<Eye className="h-4 w-4" />}
                label="Source"
                value={detail.source}
              />
            )}
            <DetailRow
              icon={<Clock className="h-4 w-4" />}
              label="Created"
              value={
                <span>
                  {format(new Date(detail.created), "MMM d, yyyy 'at' h:mm a")}
                  <span className="text-muted-foreground ml-2">
                    ({formatDistanceToNow(new Date(detail.created), { addSuffix: true })})
                  </span>
                </span>
              }
            />
            <DetailRow
              icon={<RefreshCw className="h-4 w-4" />}
              label="Last Modified"
              value={
                detail.modified ? (
                  <span>
                    {format(new Date(detail.modified), "MMM d, yyyy 'at' h:mm a")}
                    <span className="text-muted-foreground ml-2">
                      ({formatDistanceToNow(new Date(detail.modified), { addSuffix: true })})
                    </span>
                  </span>
                ) : null
              }
            />
            {detail.resolution_name && (
              <DetailRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Resolution"
                value={detail.resolution_name}
              />
            )}
          </div>

          {(detail.description || detail.summary || detail.evidence) && (
            <div className="space-y-3">
              {detail.summary && (
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Summary
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                    {detail.summary}
                  </p>
                </div>
              )}
              {detail.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Description
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">
                    {detail.description}
                  </p>
                </div>
              )}
              {detail.evidence && (
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Evidence
                  </h4>
                  <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {detail.evidence}
                  </pre>
                </div>
              )}
            </div>
          )}

          {(detail.ip_address || detail.hostname || detail.url || detail.user || detail.workflow_name || detail.rule_name || detail.detector_name) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Technical Details
              </h4>
              {detail.ip_address && (
                <DetailRow
                  icon={<Globe className="h-4 w-4" />}
                  label="IP Address"
                  value={<code className="text-xs bg-muted rounded px-1.5 py-0.5">{detail.ip_address}</code>}
                />
              )}
              {detail.hostname && (
                <DetailRow
                  icon={<Server className="h-4 w-4" />}
                  label="Hostname"
                  value={<code className="text-xs bg-muted rounded px-1.5 py-0.5">{detail.hostname}</code>}
                />
              )}
              {detail.url && (
                <DetailRow
                  icon={<Globe className="h-4 w-4" />}
                  label="URL"
                  value={
                    <a href={detail.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-xs">
                      {detail.url}
                    </a>
                  }
                />
              )}
              {detail.user && (
                <DetailRow
                  icon={<User className="h-4 w-4" />}
                  label="User"
                  value={detail.user}
                />
              )}
              {detail.workflow_name && (
                <DetailRow
                  icon={<Workflow className="h-4 w-4" />}
                  label="Workflow"
                  value={detail.workflow_name}
                />
              )}
              {detail.rule_name && (
                <DetailRow
                  icon={<Shield className="h-4 w-4" />}
                  label="Rule"
                  value={detail.rule_name}
                />
              )}
              {detail.detector_name && (
                <DetailRow
                  icon={<Eye className="h-4 w-4" />}
                  label="Detector"
                  value={detail.detector_name}
                />
              )}
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-900">Manage in Blumira</h4>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              To change status, priority, or resolution, open this finding directly in Blumira.
            </p>
            <Button size="sm" asChild>
              <a href={blumiraUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Blumira
              </a>
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-blue-600" />
                Dashboard Notes
              </h4>
              <span className="text-xs text-muted-foreground">Stored locally in your browser</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Assigned To
              </Label>
              <UserSelector
                users={users}
                value={assignee}
                onChange={setAssignee}
              />
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No users loaded from API — type a name manually
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="finding-notes" className="text-xs font-medium">
                Notes
              </Label>
              <Textarea
                id="finding-notes"
                placeholder="Add investigation notes, remediation steps, or comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {saved && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Notes saved
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingAnnotation && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleClearAnnotation}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Notes
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Notes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
