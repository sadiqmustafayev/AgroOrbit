"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgronomicRiskAssessment,
  NasaTelemetryResponse,
  Parcel,
  RiskLevel,
  ThemeMode,
  WeatherForecastResponse,
} from "@/types/agro";
import { AgroDatabaseSchema } from "@/lib/db";
import {
  computeExplainableRisks,
  evaluateCropRotationAndSoil,
  getOverallParcelRiskLevel,
} from "@/lib/agronomy-engine";
import InteractiveAgroMap from "@/components/InteractiveAgroMap";
import NasaClimateView from "@/components/NasaClimateView";
import FarmManagementView from "@/components/FarmManagementView";
import AgroAiView from "@/components/AgroAiView";
import ServicesCenterView from "@/components/ServicesCenterView";
import CalendarNotificationsView from "@/components/CalendarNotificationsView";
import MarketplaceCommunityView from "@/components/MarketplaceCommunityView";
import {
  LayoutDashboard,
  Map as MapIcon,
  Satellite,
  Sprout,
  Bot,
  FlaskConical,
  Bell,
  ShoppingBag,
  Users,
  Trophy,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  UserCog,
  Palette,
  Menu,
  X,
  Activity,
  Plane,
  Calendar,
} from "lucide-react";

type NavSectionId =
  | "dashboard"
  | "map"
  | "nasa"
  | "farm"
  | "ai"
  | "services"
  | "calendar"
  | "marketplace"
  | "community"
  | "comparison";

function riskBadgeClasses(level: RiskLevel): string {
  switch (level) {
    case "green":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "yellow":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    case "orange":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "red":
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  }
}

export default function AgroOrbitPlatformPage() {
  const [dbState, setDbState] = useState<AgroDatabaseSchema | null>(null);
  const [activeNav, setActiveNav] = useState<NavSectionId>("dashboard");
  const [selectedParcelId, setSelectedParcelId] = useState<string>("parcel-1");
  const [themeMode, setThemeMode] = useState<ThemeMode>("tarla");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Live API states for NASA and Weather
  const [nasaData, setNasaData] = useState<NasaTelemetryResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState<boolean>(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Load initial database state
  const fetchDbState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = (await res.json()) as AgroDatabaseSchema;
        setDbState(data);
      }
    } catch {
      // Fallback handled gracefully
    }
  }, []);

  useEffect(() => {
    fetchDbState();
  }, [fetchDbState]);

  const parcels = useMemo(() => dbState?.parcels || [], [dbState]);
  const selectedParcel: Parcel | null = useMemo(() => {
    if (!parcels.length) return null;
    return parcels.find((p) => p.id === selectedParcelId) || parcels[0];
  }, [parcels, selectedParcelId]);

  const activeUser = useMemo(() => {
    if (!dbState) return null;
    return (
      dbState.users.find((u) => u.id === dbState.activeUserId) || dbState.users[0]
    );
  }, [dbState]);

  // Fetch NASA & Open-Meteo Telemetry whenever selectedParcel changes
  const fetchParcelTelemetry = useCallback(async (parcel: Parcel) => {
    setTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const [nasaRes, weatherRes] = await Promise.all([
        fetch(
          `/api/nasa?parcelId=${encodeURIComponent(parcel.id)}&lat=${
            parcel.centerLat
          }&lon=${parcel.centerLon}&baseNdvi=${parcel.baselineNdvi}&baseNdre=${
            parcel.baselineNdre
          }&baseNdmi=${parcel.baselineNdmi}`
        ),
        fetch(`/api/weather?lat=${parcel.centerLat}&lon=${parcel.centerLon}`),
      ]);

      if (nasaRes.ok) {
        const nJson = (await nasaRes.json()) as NasaTelemetryResponse;
        setNasaData(nJson);
      }
      if (weatherRes.ok) {
        const wJson = (await weatherRes.json()) as WeatherForecastResponse;
        setWeatherData(wJson);
      }
    } catch (err) {
      setTelemetryError(
        err instanceof Error ? err.message : "Peyk və hava sorğusunda xəta."
      );
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedParcel) {
      fetchParcelTelemetry(selectedParcel);
    }
  }, [selectedParcel, fetchParcelTelemetry]);

  // Compute explainable risks for the selected parcel
  const currentRisks: AgronomicRiskAssessment[] = useMemo(() => {
    if (!selectedParcel) return [];
    return computeExplainableRisks(selectedParcel, nasaData, weatherData);
  }, [selectedParcel, nasaData, weatherData]);

  // Mutate database state via /api/state
  const handleAction = async (
    action: string,
    payload: Record<string, unknown>
  ) => {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (res.ok) {
      const updated = (await res.json()) as AgroDatabaseSchema;
      setDbState(updated);
      if (action === "create_parcel" && updated.parcels.length > 0) {
        setSelectedParcelId(updated.parcels[0].id);
      }
    }
  };

  // Save drawn polygon boundary on map
  const handleSaveDrawnPolygon = async (
    coords: [number, number][],
    areaHa: number
  ) => {
    if (!selectedParcel) return;
    const avgLat =
      Math.round(
        (coords.reduce((s, c) => s + c[0], 0) / coords.length) * 10000
      ) / 10000;
    const avgLon =
      Math.round(
        (coords.reduce((s, c) => s + c[1], 0) / coords.length) * 10000
      ) / 10000;

    await handleAction("update_parcel", {
      id: selectedParcel.id,
      polygonCoords: coords,
      areaHa,
      centerLat: avgLat,
      centerLon: avgLon,
    });
  };

  // Import GeoJSON polygon as new parcel
  const handleImportGeoJsonParcel = async (
    name: string,
    coords: [number, number][],
    areaHa: number,
    crop?: string,
    variety?: string,
    region?: string
  ) => {
    const avgLat =
      Math.round(
        (coords.reduce((s, c) => s + c[0], 0) / coords.length) * 10000
      ) / 10000;
    const avgLon =
      Math.round(
        (coords.reduce((s, c) => s + c[1], 0) / coords.length) * 10000
      ) / 10000;

    await handleAction("create_parcel", {
      name,
      polygonCoords: coords,
      areaHa,
      centerLat: avgLat,
      centerLon: avgLon,
      currentCrop: crop || "Payızlıq Buğda",
      variety: variety || "Bezostaya-100",
      region: region || "GeoJSON İdxal Ərazisi",
    });
  };

  if (!dbState || !selectedParcel || !activeUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f17] text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <div className="font-mono text-sm text-emerald-400">
            AgroOrbit Rəqəmsal Kənd Təsərrüfatı Ekosistemi Yüklənir...
          </div>
        </div>
      </div>
    );
  }

  const totalFarmAreaHa =
    Math.round(parcels.reduce((acc, p) => acc + p.areaHa, 0) * 10) / 10;
  const meanNdvi =
    Math.round(
      (parcels.reduce((acc, p) => acc + p.baselineNdvi, 0) / parcels.length) *
        100
    ) / 100;
  const unreadNotifsCount = dbState.notifications.filter((n) => !n.read).length;
  const latestSpec =
    nasaData?.spectralHistory?.[nasaData.spectralHistory.length - 1];
  const overallParcelRisk = getOverallParcelRiskLevel(currentRisks);
  const rotationEval = evaluateCropRotationAndSoil(selectedParcel);

  const navGroups: Array<{
    groupTitle: string;
    items: Array<{
      id: NavSectionId;
      label: string;
      badge?: string;
      icon: React.ComponentType<{ className?: string }>;
    }>;
  }> = [
    {
      groupTitle: "RƏQƏMSAL TƏSƏRRÜFAT & PEYK",
      items: [
        { id: "dashboard", label: "İcmal Dashboard", icon: LayoutDashboard },
        {
          id: "map",
          label: "Ağıllı Xəritə & Risklər",
          badge: "GIS",
          icon: MapIcon,
        },
        {
          id: "nasa",
          label: "NASA Peyk & İqlim",
          badge: "CANLI",
          icon: Satellite,
        },
      ],
    },
    {
      groupTitle: "AQRONOMİYA & SÜNİ İNTELLEKT",
      items: [
        {
          id: "farm",
          label: "Sahələr & Əkin Pasportu",
          badge: `${parcels.length}`,
          icon: Sprout,
        },
        {
          id: "ai",
          label: "AgroAI Aqronom",
          badge: "AI",
          icon: Bot,
        },
        {
          id: "calendar",
          label: "Bildirişlər & Təqvim",
          badge: unreadNotifsCount > 0 ? String(unreadNotifsCount) : undefined,
          icon: Bell,
        },
      ],
    },
    {
      groupTitle: "XİDMƏTLƏR, BAZAR & İCMA",
      items: [
        {
          id: "services",
          label: "Analiz, Aqronom & Dron",
          badge: `${dbState.services.length}`,
          icon: FlaskConical,
        },
        {
          id: "marketplace",
          label: "Aqrar Marketplace",
          icon: ShoppingBag,
        },
        {
          id: "community",
          label: "Fermer İcması & Ekspert",
          icon: Users,
        },
        {
          id: "comparison",
          label: "Rəqabətli Üstünlük",
          icon: Trophy,
        },
      ],
    },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row ${
        themeMode === "obsidyen"
          ? "theme-obsidyen bg-black text-slate-100"
          : themeMode === "krem"
          ? "theme-krem bg-[#0d1912] text-slate-100"
          : "bg-[#0b0f17] text-slate-100"
      }`}
    >
      {/* Left Persistent Sidebar (FarmTwin Enterprise Architecture) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-68 shrink-0 border-r border-slate-800/90 bg-[#0b0f17]/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 flex flex-col justify-between ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
                <Satellite className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-white">
                    AGRO<span className="text-emerald-400">ORBIT</span>
                  </span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                    v2.0
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Rəqəmsal Aqrar İntellekt Ekosistemi
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Active Farm Summary Box */}
          <div className="mx-4 mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>AKTİV TƏSƏRRÜFAT</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                NASA/GIS Onlayn
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100 mt-1 truncate">
              {activeUser.farmName}
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-300 border-t border-slate-800 pt-1.5">
              <span>{parcels.length} Sahə</span>
              <span className="text-emerald-400 font-bold">{totalFarmAreaHa} ha</span>
            </div>
          </div>

          {/* Grouped Sidebar Navigation */}
          <nav className="mt-4 px-3 space-y-5 overflow-y-auto max-h-[calc(100vh-270px)]">
            {navGroups.map((group) => (
              <div key={group.groupTitle}>
                <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.groupTitle}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveNav(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                          isActive
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 ${
                              isActive ? "text-emerald-400" : "text-slate-400"
                            }`}
                          />
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                              isActive
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Role & User Card */}
        <div className="border-t border-slate-800/90 p-4 bg-slate-950/60">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate flex items-center gap-1">
                {activeUser.name}
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="text-[10px] text-emerald-400 truncate">
                {activeUser.roleLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Rol Dəyiş və ya Profili Redaktə Et"
            >
              <UserCog className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Floating Utility Header */}
        <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-[#0b0f17]/90 px-4 lg:px-6 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg bg-slate-800 p-2 text-slate-200"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Active Parcel Selector */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-400">Aktiv Sahə:</span>
              <select
                aria-label="Aktiv sahəni seçin"
                value={selectedParcel.id}
                onChange={(e) => setSelectedParcelId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({p.areaHa} ha • {p.currentCrop})
                  </option>
                ))}
              </select>
            </div>

            {/* Overall Parcel Risk Status Pill */}
            <span
              className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${riskBadgeClasses(
                overallParcelRisk
              )}`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              Sahə Risk Statusu:{" "}
              {overallParcelRisk === "green"
                ? "Yaşıl (Normal)"
                : overallParcelRisk === "yellow"
                ? "Sarı (Diqqət)"
                : overallParcelRisk === "orange"
                ? "Narıncı (Yüksək Risk)"
                : "Qırmızı (Ciddi Risk)"}
            </span>
          </div>

          {/* Right Utility Controls: Live Weather, Spraying Window, Theme Switcher, Role Switcher, Notifications */}
          <div className="flex flex-wrap items-center gap-2">
            {weatherData && (
              <div
                className="hidden xl:flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs"
                title={`Mənbə: ${weatherData.sourceName}`}
              >
                <span className="font-mono font-bold text-slate-100 flex items-center gap-1">
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  {weatherData.current.temperatureC}°C
                </span>
                <span className="font-mono text-sky-400 flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" />
                  {weatherData.current.windSpeedKmh} km/s (
                  {weatherData.current.windDirectionCardinal})
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    weatherData.current.sprayingWindowStatus === "optimal"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : weatherData.current.sprayingWindowStatus === "caution"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  Çiləmə:{" "}
                  {weatherData.current.sprayingWindowStatus === "optimal"
                    ? "Optimal"
                    : weatherData.current.sprayingWindowStatus === "caution"
                    ? "Diqqət"
                    : "Əlverişsiz"}
                </span>
              </div>
            )}

            {/* Theme Mode Switcher (FarmTwin Tarla / Obsidyen / Krem) */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-0.5 text-[11px]">
              <Palette className="h-3.5 w-3.5 text-slate-400 mx-1.5" />
              {(["tarla", "obsidyen", "krem"] as ThemeMode[]).map((tm) => (
                <button
                  key={tm}
                  type="button"
                  onClick={() => setThemeMode(tm)}
                  className={`rounded-lg px-2 py-1 capitalize transition ${
                    themeMode === tm
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tm}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setActiveNav("calendar")}
              className="relative rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-200 hover:border-emerald-500/50"
              title="Fermer Bildirişləri və Aqrar Təqvim"
            >
              <Bell className="h-4 w-4 text-emerald-400" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 font-mono text-[10px] font-bold text-white">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Telemetry Error Alert if any */}
        {telemetryError && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 flex items-center justify-between">
            <span>{telemetryError}</span>
            <button
              type="button"
              onClick={() => fetchParcelTelemetry(selectedParcel)}
              className="rounded bg-rose-500/20 px-2.5 py-1 text-rose-200 hover:bg-rose-500/30"
            >
              Yenidən Yoxla
            </button>
          </div>
        )}

        {/* Main Workspace Container */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* ==============================================================
              1. EXECUTIVE DASHBOARD (İCMAL DASHBOARD — FARMTWIN INSPIRED)
             ============================================================== */}
          {activeNav === "dashboard" && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-[#111827] via-[#0f291e] to-[#111827] p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-mono mb-1">
                      <span>XOŞ GƏLDİNİZ, {activeUser.name.toUpperCase()}</span>
                      <span>•</span>
                      <span>{activeUser.farmName}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                      Rəqəmsal Kənd Təsərrüfatı İdarəetmə və Peyk Kəşfiyyatı Mərkəzi
                    </h1>
                    <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                      Seçilmiş sahə: <strong>{selectedParcel.name}</strong> ({selectedParcel.areaHa}{" "}
                      ha) • Bitki: <strong>{selectedParcel.currentCrop}</strong> (
                      {selectedParcel.variety}) • Sələf:{" "}
                      <strong>{selectedParcel.previousCrop}</strong> • Suvarma:{" "}
                      <strong>{selectedParcel.irrigationMethod}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveNav("map")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow"
                    >
                      <MapIcon className="h-4 w-4" />
                      Ağıllı Xəritəni Aç
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNav("ai")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <Bot className="h-4 w-4" />
                      AgroAI Məsləhət Al
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNav("services")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      <Plane className="h-4 w-4 text-sky-400" />
                      Analiz / Dron Sifariş Et
                    </button>
                  </div>
                </div>
              </div>

              {/* 10 Core Stat KPI Cards (FarmTwin Telemetry Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {[
                  {
                    title: "Ümumi Əkin Sahəsi",
                    val: `${totalFarmAreaHa} ha`,
                    sub: `${parcels.length} qeydiyyatlı parsel`,
                    color: "text-emerald-400",
                  },
                  {
                    title: "AktivSahə Ölçüsü",
                    val: `${selectedParcel.areaHa} ha`,
                    sub: `${selectedParcel.code} • ${selectedParcel.currentCrop}`,
                    color: "text-slate-100",
                  },
                  {
                    title: "Peyk NDVI İndeksi",
                    val: `${(latestSpec?.ndvi ?? selectedParcel.baselineNdvi).toFixed(2)}`,
                    sub: `Orta təsərrüfat NDVI: ${meanNdvi}`,
                    color:
                      (latestSpec?.ndvi ?? selectedParcel.baselineNdvi) >= 0.5
                        ? "text-emerald-400"
                        : "text-amber-400",
                  },
                  {
                    title: "NDRE (Xlorofil & Azot)",
                    val: `${(latestSpec?.ndre ?? selectedParcel.baselineNdre).toFixed(2)}`,
                    sub: `NDMI Su İndeksi: ${(
                      latestSpec?.ndmi ?? selectedParcel.baselineNdmi
                    ).toFixed(2)}`,
                    color: "text-teal-400",
                  },
                  {
                    title: "SMAP Kök Rütubəti",
                    val: `${nasaData?.summary30Days.avgSoilMoistureRootPercent ?? 42}%`,
                    sub: `Səth (0-5sm): ${
                      nasaData?.summary30Days.avgSoilMoistureSurfacePercent ?? 40
                    }%`,
                    color: "text-sky-400",
                  },
                  {
                    title: "NASA 30g Yağıntı",
                    val: `${nasaData?.summary30Days.totalPrecipitationMm ?? 18} mm`,
                    sub: `Günəş rad: ${
                      nasaData?.summary30Days.avgSolarRadiationKwhM2 ?? 3.45
                    } kWh/m²`,
                    color: "text-blue-400",
                  },
                  {
                    title: "Cari Hava & Külək",
                    val: `${weatherData?.current.temperatureC ?? 15}°C`,
                    sub: `Külək: ${weatherData?.current.windSpeedKmh ?? 11} km/s (${
                      weatherData?.current.windDirectionCardinal || "Şm"
                    })`,
                    color: "text-amber-400",
                  },
                  {
                    title: "Torpaq pH & Duzluluq",
                    val: selectedParcel.soilAnalysis
                      ? `pH ${selectedParcel.soilAnalysis.ph}`
                      : "Analiz Yoxdur",
                    sub: selectedParcel.soilAnalysis
                      ? `EC: ${selectedParcel.soilAnalysis.salinityEc} dS/m • Humus ${selectedParcel.soilAnalysis.humusPercent}%`
                      : "Laborator analiz tövsiyə edilir",
                    color:
                      selectedParcel.soilAnalysis &&
                      selectedParcel.soilAnalysis.salinityEc >= 3.0
                        ? "text-rose-400"
                        : "text-emerald-400",
                  },
                  {
                    title: "Aktiv Xidmət Sifarişləri",
                    val: `${dbState.serviceOrders.length} sifariş`,
                    sub: "Dron, Analiz və Aqronom",
                    color: "text-purple-400",
                  },
                  {
                    title: "Təqvim & Bildirişlər",
                    val: `${dbState.calendarTasks.filter((t) => t.status !== "completed").length} tapşırıq`,
                    sub: `${ currentRisks.filter((r) => r.level === "red" || r.level === "orange").length } yüksək/ciddi risk`,
                    color: "text-rose-400",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.title}
                    className="rounded-xl border border-slate-800/90 bg-[#111827] p-3.5 shadow"
                  >
                    <div className="text-[11px] text-slate-400">{kpi.title}</div>
                    <div className={`font-mono text-xl font-extrabold mt-1 ${kpi.color}`}>
                      {kpi.val}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Asymmetric 2-Column Dashboard Grid (7 Cols Primary Spatial + 5 Cols Operational Risks & Weather) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Cols: Interactive Mini-Map + Crop Distribution Bar + Parcel Comparison Table */}
                <div className="lg:col-span-7 space-y-6">
                  <InteractiveAgroMap
                    parcels={parcels}
                    selectedParcel={selectedParcel}
                    onSelectParcel={setSelectedParcelId}
                    nasaData={nasaData}
                    weatherData={weatherData}
                    risks={currentRisks}
                    compact
                    onExpandToFullMap={() => setActiveNav("map")}
                  />

                  {/* Crop Distribution Stacked Bar (FarmTwin Ürün Dağılımı) */}
                  <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-100">
                        Təsərrüfat Üzrə Əkin və Sort Paylanması ({totalFarmAreaHa} ha)
                      </h3>
                      <span className="font-mono text-xs text-slate-400">
                        {parcels.length} Aktiv Parsel
                      </span>
                    </div>

                    <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-900 mb-3">
                      {parcels.map((p, idx) => {
                        const pct = Math.round((p.areaHa / totalFarmAreaHa) * 100);
                        const colors = [
                          "bg-emerald-500",
                          "bg-amber-500",
                          "bg-sky-500",
                          "bg-purple-500",
                        ];
                        return (
                          <div
                            key={p.id}
                            style={{ width: `${pct}%` }}
                            className={`${colors[idx % colors.length]} h-full transition-all`}
                            title={`${p.name}: ${p.areaHa} ha (${pct}%)`}
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {parcels.map((p, idx) => {
                        const pct = Math.round((p.areaHa / totalFarmAreaHa) * 100);
                        const dotColors = [
                          "bg-emerald-500",
                          "bg-amber-500",
                          "bg-sky-500",
                          "bg-purple-500",
                        ];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedParcelId(p.id)}
                            className={`text-left rounded-xl border p-2.5 transition ${
                              p.id === selectedParcel.id
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  dotColors[idx % dotColors.length]
                                }`}
                              />
                              <span className="truncate">{p.currentCrop}</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                              {p.code}: <strong className="text-slate-200">{p.areaHa} ha</strong> (
                              {pct}%)
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: 4-Color Explainable Agronomic Risks + Weather Spraying Suitability + Tasks */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Explainable 4-Color Risk Monitoring Panel */}
                  <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-emerald-400" />
                          İzahlı Rəngli Risk Monitorinqi ({selectedParcel.code})
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Yaşıl (Normal) • Sarı (Diqqət) • Narıncı (Yüksək) • Qırmızı (Ciddi)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {currentRisks.map((r) => (
                        <div
                          key={r.id}
                          className={`rounded-xl border p-3 text-xs ${riskBadgeClasses(
                            r.level
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold uppercase tracking-wide text-[10px]">
                              {r.levelLabel} — {r.categoryLabel}
                            </span>
                            <span className="font-mono text-[10px] opacity-80">
                              {r.observedDate}
                            </span>
                          </div>
                          <div className="font-bold text-slate-100 text-xs">{r.title}</div>
                          <p className="text-slate-200/90 text-[11px] mt-1 leading-relaxed">
                            {r.explanation}
                          </p>
                          <div className="mt-1.5 pt-1.5 border-t border-current/20 font-mono text-[10px] flex flex-wrap justify-between gap-1">
                            <span>Qayda: {r.ruleFormula}</span>
                            <span>Mənbə: {r.dataSource}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crop Rotation Quick Summary & Upcoming Calendar Tasks */}
                  <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-emerald-400" />
                        Növbəli Əkin Rəyi & Yaxınlaşan Aqrar İşlər
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveNav("calendar")}
                        className="text-xs text-emerald-400 hover:underline flex items-center"
                      >
                        Təqvim <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
                      <div className="font-semibold text-emerald-300">
                        {rotationEval.compatibilityLabel} ({selectedParcel.previousCrop} →{" "}
                        {selectedParcel.currentCrop})
                      </div>
                      <p className="text-slate-300 text-[11px] mt-1">
                        {rotationEval.agronomicAnalysis}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {dbState.calendarTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-200 truncate">
                              {task.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {task.parcelName} • {task.phenologicalStage}
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                            {task.scheduledDate}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              2. FULL SMART GIS MAP & RISK MONITORING
             ============================================================== */}
          {activeNav === "map" && (
            <div className="space-y-6">
              <InteractiveAgroMap
                parcels={parcels}
                selectedParcel={selectedParcel}
                onSelectParcel={setSelectedParcelId}
                nasaData={nasaData}
                weatherData={weatherData}
                risks={currentRisks}
                onSaveDrawnPolygon={handleSaveDrawnPolygon}
                onImportGeoJsonParcel={handleImportGeoJsonParcel}
              />

              {/* Detailed Risk Breakdown Cards Below Full Map */}
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
                <h3 className="text-base font-bold text-slate-100 mb-1">
                  {selectedParcel.name} — Rəngli Aqronomik Risk Sisteminin Hesablanma Qaydaları
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Hər bir risk göstəricisi real peyk (NASA POWER, SMAP, HLS NDVI), hava proqnozu və sahənin torpaq/əkin tarixçəsi əsasında şəffaf aqronomik düsturlarla hesablanır:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentRisks.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-xl border p-4 text-xs space-y-2 ${riskBadgeClasses(
                        r.level
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{r.title}</span>
                        <span className="rounded-full bg-black/30 px-2.5 py-0.5 font-mono text-[11px] font-bold">
                          {r.levelLabel} (Bal: {r.score}/100)
                        </span>
                      </div>
                      <p className="text-slate-100 leading-relaxed">
                        <strong>Riskin səbəbi:</strong> {r.explanation}
                      </p>
                      <div className="rounded-lg bg-black/25 p-2 font-mono text-[11px]">
                        <div>
                          <strong>Aqronomik Qayda:</strong> {r.ruleFormula}
                        </div>
                        <div>
                          <strong>Məlumat Mənbəyi:</strong> {r.dataSource}
                        </div>
                        <div>
                          <strong>Müşahidə Tarixi:</strong> {r.observedDate}
                        </div>
                      </div>
                      <p className="text-emerald-300 font-medium">
                        <strong>Tövsiyə olunan tədbir:</strong> {r.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              3. NASA SATELLITE & CLIMATE INTEGRATION
             ============================================================== */}
          {activeNav === "nasa" && (
            <NasaClimateView
              parcel={selectedParcel}
              nasaData={nasaData}
              weatherData={weatherData}
              loading={telemetryLoading}
              onRefresh={() => fetchParcelTelemetry(selectedParcel)}
            />
          )}

          {/* ==============================================================
              4. FARMER & PARCEL MANAGEMENT (PASSPORT, ROTATION, HISTORY)
             ============================================================== */}
          {activeNav === "farm" && (
            <FarmManagementView
              parcels={parcels}
              selectedParcel={selectedParcel}
              onSelectParcel={setSelectedParcelId}
              onAction={handleAction}
            />
          )}

          {/* ==============================================================
              5. AGROAI – REAL AI AGRONOMIST
             ============================================================== */}
          {activeNav === "ai" && (
            <AgroAiView
              parcels={parcels}
              selectedParcel={selectedParcel}
              onSelectParcel={setSelectedParcelId}
              nasaData={nasaData}
              weatherData={weatherData}
            />
          )}

          {/* ==============================================================
              6. AGRICULTURAL SERVICES, LAB ANALYSIS & DRONE CENTER
             ============================================================== */}
          {activeNav === "services" && (
            <ServicesCenterView
              services={dbState.services}
              serviceOrders={dbState.serviceOrders}
              parcels={parcels}
              selectedParcel={selectedParcel}
              activeUser={activeUser}
              onAction={handleAction}
            />
          )}

          {/* ==============================================================
              7. FARMER NOTIFICATIONS & PHENOLOGICAL CALENDAR
             ============================================================== */}
          {activeNav === "calendar" && (
            <CalendarNotificationsView
              parcels={parcels}
              selectedParcel={selectedParcel}
              calendarTasks={dbState.calendarTasks}
              notifications={dbState.notifications}
              risks={currentRisks}
              nasaData={nasaData}
              weatherData={weatherData}
              onAction={handleAction}
            />
          )}

          {/* ==============================================================
              8. MARKETPLACE, COMMUNITY & COMPETITIVE COMPARISON
             ============================================================== */}
          {(activeNav === "marketplace" ||
            activeNav === "community" ||
            activeNav === "comparison") && (
            <MarketplaceCommunityView
              mode={activeNav}
              products={dbState.marketplaceProducts}
              marketplaceOrders={dbState.marketplaceOrders}
              communityPosts={dbState.communityPosts}
              selectedParcel={selectedParcel}
              activeUser={activeUser}
              onAction={handleAction}
            />
          )}
        </main>
      </div>

      {/* Role Switcher & Authentication Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111827] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">
                Təhlükəsizlik, İstifadəçi Rolları və Kabinet İdarəetməsi
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Platformanı fərqli istifadəçi rollarında (Fermer, Baş Aqronom, Xidmət Təminatçısı/Satıcı, Admin) sınaqdan keçirmək üçün hesabı seçin:
            </p>

            <div className="space-y-2">
              {dbState.users.map((u) => {
                const isCurr = u.id === activeUser.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={async () => {
                      await handleAction("switch_user_role", { userId: u.id });
                      setShowProfileModal(false);
                    }}
                    className={`w-full text-left rounded-xl border p-3 text-xs flex items-center justify-between transition ${
                      isCurr
                        ? "border-emerald-500 bg-emerald-500/15"
                        : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-100">
                        {u.name} ({u.roleLabel})
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {u.farmName} • {u.email} • {u.phone}
                      </div>
                    </div>
                    {isCurr && (
                      <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-slate-950">
                        Aktiv
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
