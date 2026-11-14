"use client";

import React, { useState } from "react";
import {
  AgronomicRiskAssessment,
  AgroCalendarTask,
  CalendarTaskType,
  FarmerNotification,
  NasaTelemetryResponse,
  Parcel,
  WeatherForecastResponse,
} from "@/types/agro";
import {
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  Plus,
  Clock,
  CheckCheck,
} from "lucide-react";

interface CalendarNotificationsViewProps {
  parcels: Parcel[];
  selectedParcel: Parcel;
  calendarTasks: AgroCalendarTask[];
  notifications: FarmerNotification[];
  risks: AgronomicRiskAssessment[];
  nasaData: NasaTelemetryResponse | null;
  weatherData: WeatherForecastResponse | null;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

const TASK_TYPE_OPTIONS: Array<{ id: CalendarTaskType; label: string }> = [
  { id: "seeding", label: "Səpin" },
  { id: "irrigation", label: "Suvarma" },
  { id: "fertilization", label: "Gübrələmə" },
  { id: "spraying", label: "Dərmanlama" },
  { id: "harvest", label: "Məhsul yığımı" },
  { id: "soil_sampling", label: "Torpaq becərmə & Nümunə" },
  { id: "scouting", label: "Sahə müşahidəsi (Fenologiya)" },
];

export default function CalendarNotificationsView({
  parcels,
  selectedParcel,
  calendarTasks,
  notifications,
  risks,
  nasaData,
  weatherData,
  onAction,
}: CalendarNotificationsViewProps) {
  const [filterTaskType, setFilterTaskType] = useState<string>("all");
  const [taskParcelId, setTaskParcelId] = useState(selectedParcel.id);
  const [taskType, setTaskType] = useState<CalendarTaskType>("irrigation");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStage, setTaskStage] = useState(selectedParcel.phenologicalStage);
  const [taskDate, setTaskDate] = useState("2026-11-20");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("high");
  const [taskNotes, setTaskNotes] = useState("");

  // Synthesize live telemetry notifications from real risks, weather, and NASA data for the selected parcel
  const liveTelemetryAlerts: FarmerNotification[] = [];

  for (const r of risks) {
    if (r.level === "red" || r.level === "orange") {
      liveTelemetryAlerts.push({
        id: `live-${r.id}`,
        parcelId: r.parcelId,
        parcelName: r.parcelName,
        type:
          r.category === "drought"
            ? "irrigation_need"
            : r.category === "vegetation_anomaly"
            ? "satellite_anomaly"
            : r.category === "wind_spraying"
            ? "weather_shift"
            : "risk_escalation",
        typeLabel: r.categoryLabel,
        severity: r.level,
        title: `${r.parcelName}: ${r.title}`,
        message: `${r.explanation} Tövsiyə: ${r.recommendation}`,
        dataSource: r.dataSource,
        createdAt: r.observedDate,
        read: false,
      });
    }
  }

  if (weatherData && weatherData.current.windSpeedKmh > 14) {
    liveTelemetryAlerts.push({
      id: `live-weather-${selectedParcel.id}`,
      parcelId: selectedParcel.id,
      parcelName: selectedParcel.name,
      type: "weather_shift",
      typeLabel: "Hava və Çiləmə Şəraiti Dəyişikliyi",
      severity: weatherData.current.windSpeedKmh > 22 ? "red" : "yellow",
      title: `${selectedParcel.name}: Külək ${weatherData.current.windSpeedKmh} km/saat (${weatherData.current.windDirectionCardinal})`,
      message: weatherData.current.sprayingWindowNote,
      dataSource: weatherData.sourceName,
      createdAt: weatherData.updatedAt,
      read: false,
    });
  }

  if (nasaData && nasaData.summary30Days.avgSoilMoistureRootPercent < 40) {
    liveTelemetryAlerts.push({
      id: `live-smap-${selectedParcel.id}`,
      parcelId: selectedParcel.id,
      parcelName: selectedParcel.name,
      type: "irrigation_need",
      typeLabel: "Suvarma Ehtiyacı (NASA SMAP)",
      severity: nasaData.summary30Days.avgSoilMoistureRootPercent < 30 ? "red" : "orange",
      title: `${selectedParcel.name}: NASA SMAP Kök Rütubəti ${nasaData.summary30Days.avgSoilMoistureRootPercent}%`,
      message: `Son 30 gündə yağıntı ${nasaData.summary30Days.totalPrecipitationMm} mm olub. ${selectedParcel.irrigationMethod} ilə suvarma planını yoxlayın.`,
      dataSource: "NASA SMAP GWETROOT + NASA POWER",
      createdAt: nasaData.latestValidRecord?.date || "Cari",
      read: false,
    });
  }

  const allNotifications = [...liveTelemetryAlerts, ...notifications];

  const filteredTasks =
    filterTaskType === "all"
      ? calendarTasks
      : calendarTasks.filter((t) => t.taskType === filterTaskType);

  const handleAddCalendarTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const p = parcels.find((x) => x.id === taskParcelId) || selectedParcel;
    const typeLabel =
      TASK_TYPE_OPTIONS.find((o) => o.id === taskType)?.label || "Aqrar Əməliyyat";

    await onAction("create_calendar_task", {
      parcelId: p.id,
      parcelName: p.name,
      crop: p.currentCrop,
      variety: p.variety,
      phenologicalStage: taskStage || p.phenologicalStage,
      taskType,
      taskTypeLabel: typeLabel,
      title: taskTitle,
      scheduledDate: taskDate,
      priority: taskPriority,
      notes: taskNotes,
    });

    setTaskTitle("");
    setTaskNotes("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 5 Cols: Smart Notifications Center */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Ağıllı Fermer Bildirişləri
                </h2>
                <p className="text-[11px] text-slate-400">
                  Yalnız real peyk/hava məlumatları və sahə əməliyyatları əsasında yaradılır
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAction("mark_notifications_read", {})}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              Hamısını Oxunmuş Et
            </button>
          </div>

          <div className="space-y-3 max-h-170 overflow-y-auto pr-1">
            {allNotifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border p-3.5 text-xs transition ${
                  n.severity === "red"
                    ? "border-rose-500/40 bg-rose-500/10"
                    : n.severity === "orange"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : n.severity === "yellow"
                    ? "border-yellow-500/30 bg-yellow-500/10"
                    : "border-slate-800 bg-slate-950/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      n.severity === "red"
                        ? "bg-rose-500 text-white"
                        : n.severity === "orange"
                        ? "bg-amber-500 text-slate-950"
                        : n.severity === "yellow"
                        ? "bg-yellow-400 text-slate-950"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {n.typeLabel}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {n.createdAt.slice(0, 16).replace("T", " ")}
                  </span>
                </div>

                <div className="font-bold text-slate-100 mt-1">{n.title}</div>
                <p className="text-slate-300 mt-1 leading-relaxed text-[11px]">{n.message}</p>
                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Mənbə: {n.dataSource}</span>
                  {!n.read && !n.id.startsWith("live-") && (
                    <button
                      type="button"
                      onClick={() =>
                        onAction("mark_notifications_read", { notificationId: n.id })
                      }
                      className="text-emerald-400 hover:underline"
                    >
                      Oxundu işarələ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right 7 Cols: Phenological Stage-Based Agricultural Calendar */}
      <div className="lg:col-span-7 space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Bitki İnkişaf Mərhələsinə (BBCH) Əsaslanan Aqrar Təqvim
                </h2>
                <p className="text-xs text-slate-400">
                  Səpin, suvarma, gübrələmə, dərmanlama və məhsul yığımı işlərinin planlaşdırılması
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterTaskType("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  filterTaskType === "all"
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                Hamısı ({calendarTasks.length})
              </button>
              {TASK_TYPE_OPTIONS.slice(0, 5).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilterTaskType(opt.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    filterTaskType === opt.id
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border p-4 text-xs flex flex-wrap items-center justify-between gap-3 transition ${
                  t.status === "completed"
                    ? "border-emerald-500/30 bg-emerald-500/5 opacity-75"
                    : "border-slate-800 bg-slate-950/75"
                }`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        t.priority === "urgent"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : t.priority === "high"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      }`}
                    >
                      {t.taskTypeLabel}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {t.phenologicalStage}
                    </span>
                    <span className="text-slate-400">• {t.parcelName}</span>
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      t.status === "completed"
                        ? "line-through text-slate-400"
                        : "text-slate-100"
                    }`}
                  >
                    {t.title}
                  </div>
                  {t.notes && <p className="text-slate-400 text-[11px]">{t.notes}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      {t.scheduledDate}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t.crop} ({t.variety})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAction("toggle_calendar_task", { taskId: t.id })}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      t.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-200 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t.status === "completed" ? "Tamamlanıb" : "İcra Edildi"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Calendar Task Form */}
        <form
          onSubmit={handleAddCalendarTask}
          className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-3 text-xs"
        >
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-emerald-400" />
            Yeni Aqrotexniki İş Planlaşdır (Təqvimə Əlavə Et)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Sahə (Parsel)</label>
              <select
                value={taskParcelId}
                onChange={(e) => {
                  setTaskParcelId(e.target.value);
                  const found = parcels.find((p) => p.id === e.target.value);
                  if (found) setTaskStage(found.phenologicalStage);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              >
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Əməliyyat növü</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as CalendarTaskType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              >
                {TASK_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Planlaşdırılan tarix</label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">İşin başlığı və təsviri *</label>
              <input
                required
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Məs: Pivot #1 ilə 350 m³/ha vegetasiya suvarması"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Prioritet dərəcəsi</label>
              <select
                value={taskPriority}
                onChange={(e) =>
                  setTaskPriority(
                    e.target.value as "low" | "medium" | "high" | "urgent"
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              >
                <option value="urgent">Təcili (Qırmızı)</option>
                <option value="high">Yüksək (Narıncı)</option>
                <option value="medium">Orta (Sarı)</option>
                <option value="low">Adi (Yaşıl)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Bitki inkişaf mərhələsi (BBCH)</label>
              <input
                type="text"
                value={taskStage}
                onChange={(e) => setTaskStage(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Əlavə qeyd / Norma</label>
              <input
                type="text"
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Norma, texnika və ya məsul şəxs..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Təqvimə Əlavə Et və Bildiriş Yarat
          </button>
        </form>
      </div>
    </div>
  );
}
