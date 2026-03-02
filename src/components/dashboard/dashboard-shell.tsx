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
  FlaskConical,
  X,
} from "lucide-react";
import type { Finding, MspAccount, BlumiraUser } from "@/lib/blumira-api";

interface DashboardData {
  accounts: MspAccount[];
  findings: Finding[];
  users: BlumiraUser[];
  meta?: { timestamp: string; dataSource?: string };
  demoMode?: boolean;
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
  const [demoMode, setDemoMode] = useState(false);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setCredentialsMissing(false);
      const res = await fetch("/api/blumira/dashboard");
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch dashboard data");
      }

      if (result.demoMode) {
        setDemoMode(true);
        setDemoBannerDismissed(false);
      } else {
        setDemoMode(false);
      }

      if (result.requiresAuth || result.authError) {
        setCredentialsMissing(true);
        setData(result);
      } else {
        setData(result);
      }
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

  const handleDemoModeChange = (enabled: boolean) => {
    setDemoMode(enabled);
    setDemoBannerDismissed(false);
    setLoading(true);
    fetchData();
  };

  const handleEnableDemo = async () => {
    try {
      const res = await fetch("/api/blumira/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleDemo: true }),
      });
      if (res.ok) {
        setDemoMode(true);
        setCredentialsMissing(false);
        setLoading(true);
        fetchData();
      }
    } catch {
      setError("Failed to enable demo mode");
    }
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
                Dashboard, or try demo mode to explore with sample data.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setActiveView("settings"); setCredentialsMissing(false); setError(null); }}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Credentials
              </Button>
              <Button variant="outline" onClick={handleEnableDemo}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Try Demo Mode
              </Button>
            </div>
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
              <Button variant="outline" onClick={handleEnableDemo}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Try Demo Mode
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
        {demoMode && !demoBannerDismissed && (
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 text-purple-300 text-sm">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              Demo mode is active — you&apos;re viewing synthetic data.{" "}
              <button
                className="underline hover:text-purple-200 transition-colors"
                onClick={() => setActiveView("settings")}
              >
                Go to Settings
              </button>{" "}
              to connect real credentials or toggle demo mode off.
            </span>
            <button
              className="p-0.5 hover:bg-purple-500/20 rounded transition-colors"
              onClick={() => setDemoBannerDismissed(true)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
              users={data?.users || []}
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
          {activeView === "settings" && (
            <SettingsView onDemoModeChange={handleDemoModeChange} />
          )}
        </main>
      </div>
    </div>
  );
}
