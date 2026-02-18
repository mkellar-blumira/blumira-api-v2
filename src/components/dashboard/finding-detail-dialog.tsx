"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import type { Finding } from "@/lib/blumira-api";
import { formatDistanceToNow, format } from "date-fns";

interface FindingDetailDialogProps {
  finding: Finding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (finding: Finding, updates: Record<string, unknown>) => Promise<void>;
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

function getPriorityLabel(priority: number) {
  const map: Record<number, string> = {
    1: "Critical",
    2: "High",
    3: "Medium",
    4: "Low",
    5: "Info",
  };
  return map[priority] || `P${priority}`;
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
  onUpdate,
}: FindingDetailDialogProps) {
  const [detailData, setDetailData] = useState<Finding | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (finding && open) {
      setAssignee(finding.assigned_to || finding.assigned_to_name || "");
      setNotes(finding.notes || "");
      setSelectedStatus(finding.status?.toString() || finding.status_name || "");
      setSelectedPriority(finding.priority?.toString() || "");
      setSaveError(null);
      setSaveSuccess(false);

      setLoadingDetail(true);
      fetch(`/api/blumira/findings?accountId=${finding.org_id}&findingId=${finding.finding_id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data) {
            setDetailData(res.data);
            if (res.data.assigned_to || res.data.assigned_to_name) {
              setAssignee(res.data.assigned_to || res.data.assigned_to_name || "");
            }
            if (res.data.notes) {
              setNotes(res.data.notes);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDetail(false));
    } else {
      setDetailData(null);
    }
  }, [finding, open]);

  if (!finding) return null;

  const detail = detailData || finding;

  const hasChanges =
    assignee !== (detail.assigned_to || detail.assigned_to_name || "") ||
    notes !== (detail.notes || "") ||
    (selectedStatus && selectedStatus !== (detail.status?.toString() || detail.status_name || "")) ||
    (selectedPriority && selectedPriority !== detail.priority?.toString());

  const handleSave = async () => {
    if (!finding) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updates: Record<string, unknown> = {};

      if (assignee !== (detail.assigned_to || detail.assigned_to_name || "")) {
        updates.assigned_to = assignee;
      }
      if (notes !== (detail.notes || "")) {
        updates.notes = notes;
      }
      if (selectedPriority && selectedPriority !== detail.priority?.toString()) {
        updates.priority = parseInt(selectedPriority, 10);
      }
      if (selectedStatus && selectedStatus !== (detail.status?.toString() || "")) {
        const statusMap: Record<string, number> = {
          open: 1,
          closed: 2,
          dismissed: 3,
          in_progress: 4,
        };
        const numStatus = parseInt(selectedStatus, 10);
        if (!isNaN(numStatus)) {
          updates.status = numStatus;
        } else if (statusMap[selectedStatus.toLowerCase()]) {
          updates.status = statusMap[selectedStatus.toLowerCase()];
        }
      }

      if (Object.keys(updates).length > 0) {
        await onUpdate(finding, updates);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const blumiraUrl = `https://app.blumira.com/${finding.org_id}/reporting/findings/${finding.finding_id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <DialogTitle className="text-lg leading-tight pr-8">
                {detail.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                {getPriorityBadge(detail.priority)}
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStatusIcon(detail.status_name)}
                  {detail.status_name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ID: {detail.finding_id}
                </span>
              </DialogDescription>
            </div>
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

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Work This Finding
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finding-status" className="text-xs font-medium">
                  Status
                </Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="finding-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finding-priority" className="text-xs font-medium">
                  Priority
                </Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger id="finding-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">P1 - Critical</SelectItem>
                    <SelectItem value="2">P2 - High</SelectItem>
                    <SelectItem value="3">P3 - Medium</SelectItem>
                    <SelectItem value="4">P4 - Low</SelectItem>
                    <SelectItem value="5">P5 - Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finding-assignee" className="text-xs font-medium">
                Assign To
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="finding-assignee"
                  placeholder="Enter assignee email or name..."
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="pl-9"
                />
              </div>
              {detail.assigned_to_name && detail.assigned_to_name !== assignee && (
                <p className="text-xs text-muted-foreground">
                  Currently assigned to: {detail.assigned_to_name}
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
          </div>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-700">Changes saved successfully</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={blumiraUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Blumira
            </a>
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
