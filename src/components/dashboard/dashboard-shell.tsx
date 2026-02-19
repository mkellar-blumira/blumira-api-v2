"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { OverviewView } from "./overview-view";
import { FindingsView } from "./findings-view";
import { OrganizationsView } from "./organizations-view";
import { AgentsView } from "./agents-view";
import { AnalyticsView } from "./analytics-view";
import { SettingsView } from "./settings-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  Loader2,
  Settings,
  RefreshCw,
} from "lucide-react";
import type { Finding, MspAccount, BlumiraUser } from "@/lib/blumira-api";

interface DashboardData {
  accounts: MspAccount[];
  findings: Finding[];
  users: BlumiraUser[];
  meta?: { timestamp: string };
}

export function DashboardShell() {
  const [activeView, setActiveView] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentialsMissing, setCredentialsMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setCredentialsMissing(false);
      const res = await fetch("/api/blumira/dashboard");
      const result = await res.json();

      if (!res.ok) {
        if (
          result.error?.includes("BLUMIRA_CLIENT_ID") ||
          result.error?.includes("BLUMIRA_CLIENT_SECRET") ||
          result.error?.includes("Authentication failed")
        ) {
          setCredentialsMissing(true);
        }
        throw new Error(result.error || "Failed to fetch dashboard data");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const findings = data?.findings || [];
  const criticalCount = findings.filter((f) => f.priority === 1).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Shield className="h-12 w-12 text-blue-500" />
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Blumira MSP Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Loading security data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (credentialsMissing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-amber-500/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-amber-500/10 p-4">
                <AlertTriangle className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                API Credentials Required
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your Blumira API credentials to access the MSP
                Dashboard.
              </p>
            </div>
            <Button onClick={() => { setActiveView("settings"); setCredentialsMissing(false); setError(null); }}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Credentials
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-red-500/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-500/10 p-4">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Connection Error</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {error}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => { setActiveView("settings"); setError(null); }}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        findingsBadge={criticalCount}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          onRefresh={handleRefresh}
          refreshing={refreshing}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          criticalCount={criticalCount}
          lastUpdated={data?.meta?.timestamp}
        />

        <main className="flex-1 overflow-y-auto">
          {activeView === "overview" && (
            <OverviewView
              findings={findings}
              accountCount={data?.accounts?.length || 0}
              onNavigate={setActiveView}
            />
          )}
          {activeView === "findings" && (
            <FindingsView
              findings={findings}
              searchTerm={searchTerm}
              users={data?.users || []}
            />
          )}
          {activeView === "organizations" && <OrganizationsView />}
          {activeView === "agents" && <AgentsView />}
          {activeView === "analytics" && (
            <AnalyticsView findings={findings} />
          )}
          {activeView === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
