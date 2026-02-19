"use client";

import { useState, useMemo, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  StickyNote,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Finding } from "@/lib/blumira-api";
import { formatDistanceToNow } from "date-fns";
import { FindingDetailDialog, getAnnotation } from "./finding-detail-dialog";

interface FindingsViewProps {
  findings: Finding[];
  searchTerm: string;
}

type SortField = "priority" | "created" | "name" | "org_name";
type SortDir = "asc" | "desc";

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "open":
      return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    case "closed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "dismissed":
      return <XCircle className="h-3.5 w-3.5 text-gray-400" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5 text-gray-400" />;
  }
}

function getPriorityBadge(priority: number) {
  const map: Record<number, { label: string; variant: "destructive" | "warning" | "default" | "secondary" | "info" }> = {
    1: { label: "Critical", variant: "destructive" },
    2: { label: "High", variant: "warning" },
    3: { label: "Medium", variant: "default" },
    4: { label: "Low", variant: "info" },
    5: { label: "Info", variant: "secondary" },
  };
  const entry = map[priority] || { label: `P${priority}`, variant: "secondary" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function FindingsView({ findings, searchTerm }: FindingsViewProps) {
  const [orgFilter, setOrgFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showCount, setShowCount] = useState(50);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [annotationVersion, setAnnotationVersion] = useState(0);

  const organizations = useMemo(
    () => [...new Set(findings.map((f) => f.org_name))].sort(),
    [findings]
  );
  const statuses = useMemo(
    () => [...new Set(findings.map((f) => f.status_name))].sort(),
    [findings]
  );

  const filtered = useMemo(() => {
    let result = findings;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          f.org_name.toLowerCase().includes(term) ||
          f.type_name.toLowerCase().includes(term) ||
          (f.assigned_to_name && f.assigned_to_name.toLowerCase().includes(term)) ||
          (f.assigned_to && f.assigned_to.toLowerCase().includes(term))
      );
    }

    if (orgFilter !== "all") {
      result = result.filter((f) => f.org_name === orgFilter);
    }
    if (priorityFilter !== "all") {
      result = result.filter(
        (f) => f.priority.toString() === priorityFilter
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((f) => f.status_name === statusFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "priority":
          cmp = a.priority - b.priority;
          break;
        case "created":
          cmp =
            new Date(a.created).getTime() - new Date(b.created).getTime();
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "org_name":
          cmp = a.org_name.localeCompare(b.org_name);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    findings,
    searchTerm,
    orgFilter,
    priorityFilter,
    statusFilter,
    sortField,
    sortDir,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleRowClick = (finding: Finding) => {
    setSelectedFinding(finding);
    setDialogOpen(true);
  };

  const handleAnnotationChange = useCallback(() => {
    setAnnotationVersion((v) => v + 1);
  }, []);

  const openCount = findings.filter((f) => f.status_name === "Open").length;
  const criticalCount = findings.filter((f) => f.priority === 1).length;

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      {sortField === field &&
        (sortDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        ))}
    </button>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Security Findings
          </h2>
          <p className="text-muted-foreground">
            {filtered.length} of {findings.length} findings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalCount} Critical
            </Badge>
          )}
          <Badge variant="warning" className="text-xs">
            {openCount} Open
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org} value={org}>
                {org}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="1">Critical</SelectItem>
            <SelectItem value="2">High</SelectItem>
            <SelectItem value="3">Medium</SelectItem>
            <SelectItem value="4">Low</SelectItem>
            <SelectItem value="5">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(orgFilter !== "all" ||
          priorityFilter !== "all" ||
          statusFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOrgFilter("all");
              setPriorityFilter("all");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_150px_100px_100px_100px_120px_40px] gap-4 items-center px-4 py-3 border-b text-xs font-medium text-muted-foreground bg-muted/30">
            <SortButton field="name">Finding</SortButton>
            <SortButton field="org_name">Organization</SortButton>
            <SortButton field="priority">Priority</SortButton>
            <span>Status</span>
            <span>Tracking</span>
            <SortButton field="created">Created</SortButton>
            <span />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Filter className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No findings match</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              {filtered.slice(0, showCount).map((finding) => {
                const annotation = getAnnotation(finding.finding_id);
                const displayAssignee = annotation?.assignee || finding.assigned_to_name || finding.assigned_to;
                // eslint-disable-next-line react-hooks/rules-of-hooks -- annotationVersion triggers re-render
                void annotationVersion;

                return (
                  <div
                    key={finding.finding_id}
                    onClick={() => handleRowClick(finding)}
                    className="grid grid-cols-[1fr_150px_100px_100px_100px_120px_40px] gap-4 items-center px-4 py-3 border-b last:border-0 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-blue-700 transition-colors">
                        {finding.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {finding.type_name}
                      </p>
                    </div>
                    <span className="text-sm truncate">
                      {finding.org_name}
                    </span>
                    <div>{getPriorityBadge(finding.priority)}</div>
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(finding.status_name)}
                      <span className="text-xs">{finding.status_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {displayAssignee ? (
                        <>
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate">
                            {displayAssignee}
                          </span>
                        </>
                      ) : annotation?.notes ? (
                        <>
                          <StickyNote className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="text-xs text-blue-600 truncate">
                            Has notes
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(finding.created), {
                        addSuffix: true,
                      })}
                    </span>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`https://app.blumira.com/${finding.org_id}/reporting/findings/${finding.finding_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filtered.length > showCount && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCount((c) => c + 50)}
                  >
                    Load more ({filtered.length - showCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <FindingDetailDialog
        finding={selectedFinding}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAnnotationChange={handleAnnotationChange}
      />
    </div>
  );
}
