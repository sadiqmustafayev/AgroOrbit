"use client";

import React, { useState } from "react";
import {
  NasaTelemetryResponse,
  Parcel,
  WeatherForecastResponse,
} from "@/types/agro";
import {
  Satellite,
  CloudRain,
  Wind,
  Sun,
  Droplets,
  Thermometer,
  RefreshCw,
  Info,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface NasaClimateViewProps {
  parcel: Parcel;
  nasaData: NasaTelemetryResponse | null;
  weatherData: WeatherForecastResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function NasaClimateView({
  parcel,
  nasaData,
  weatherData,
  loading,
  onRefresh,
}: NasaClimateViewProps) {
  const [selectedMetricChart, setSelectedMetricChart] = useState<
    "temp" | "precip" | "moisture" | "solar"
  >("temp");
  const [compareIdx1, setCompareIdx1] = useState(0);
  const [compareIdx2, setCompareIdx2] = useState(
    Math.max(1, (nasaData?.spectralHistory?.length || 2) - 1)
  );

  const specList = nasaData?.spectralHistory || [];
  const passA = specList[compareIdx1] || specList[0];
  const passB = specList[compareIdx2] || specList[specList.length - 1];

  const series = nasaData?.dailySeries || [];

  return (
    <div className="space-y-6">
      {/* Header & Source Transparency Notice */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                <Satellite className="h-3.5 w-3.5" />
                NASA Earthdata & Aqrometeoroloji Telemetriya
              </span>
              <span className="font-mono text-xs text-slate-400">
                Koordinat: {parcel.centerLat.toFixed(4)}°N, {parcel.centerLon.toFixed(4)}°E ({parcel.areaHa} ha)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {parcel.name} — Peyk və İqlim Monitorinqi
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Bitki: <strong className="text-slate-200">{parcel.currentCrop}</strong> ({parcel.variety}) • Mərhələ:{" "}
              <span className="text-emerald-400">{parcel.phenologicalStage}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "NASA API Sorğulanır..." : "Peyk Məlumatlarını Yenilə"}
          </button>
        </div>

        {/* Mandatory Methodological Separation Banner */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
            <div className="font-semibold text-sky-300 flex items-center gap-1.5 mb-1">
              <Info className="h-4 w-4 shrink-0" />
              1. Faktiki Peyk Müşahidə Arxivləri (NASA POWER / HLS / SMAP / IMERG)
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <strong>Mənbə:</strong> {nasaData?.sourceInfo.powerSource || "NASA POWER & CMR"}.{" "}
              {nasaData?.sourceInfo.powerTemporalLagNote} Məkan ayırdetməsi: HLS multispektral{" "}
              <span className="font-mono">30m</span>, SMAP torpaq rütubəti{" "}
              <span className="font-mono">9km</span>, GPM IMERG yağıntı{" "}
              <span className="font-mono">10km</span>, POWER iqlim şəbəkəsi{" "}
              <span className="font-mono">0.5°×0.625°</span>. Son arxiv tarixi:{" "}
              <span className="font-mono text-sky-300 font-semibold">
                {nasaData?.latestValidRecord?.date || "Yüklənir..."}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              2. Real Vaxt Hava və 7 Günlük Proqnoz Mənbəyi (Open-Meteo ECMWF/ICON)
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <strong>Mənbə:</strong>{" "}
              {weatherData?.sourceName || "Open-Meteo Rəsmi Aqrometeoroloji Xidməti"}. NASA POWER
              avtomatik proqnoz kimi təqdim edilmir; real vaxt və 7 günlük hava/çiləmə proqnozu bu
              mənbədən alınır. Yenilənmə vaxtı:{" "}
              <span className="font-mono text-emerald-300 font-semibold">
                {weatherData?.updatedAt
                  ? weatherData.updatedAt.replace("T", " ").slice(0, 19)
                  : "Yüklənir..."}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 6 Core NASA Satellite & Climate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Temperatur (Orta / Maks)</span>
            <Thermometer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {nasaData ? `${nasaData.summary30Days.avgTempC}°C` : "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-400">
            Min: {nasaData?.summary30Days.minTempC ?? "—"}°C | Maks:{" "}
            <span className="text-amber-400">{nasaData?.summary30Days.maxTempC ?? "—"}°C</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Mənbə: NASA POWER (T2M)</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Külək Sürəti və İstiqaməti</span>
            <Wind className="h-4 w-4 text-sky-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {weatherData
              ? `${weatherData.current.windSpeedKmh} km/s`
              : nasaData
              ? `${nasaData.summary30Days.avgWindSpeedKmh} km/s`
              : "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-sky-400">
            İstiqamət:{" "}
            {weatherData?.current.windDirectionCardinal ||
              nasaData?.latestValidRecord?.windDirectionCardinal ||
              "Şm-Ş"}{" "}
            ({weatherData?.current.windDirectionDeg ?? nasaData?.latestValidRecord?.windDirectionDeg ?? 45}°)
          </div>
          <div className="mt-2 text-[10px] text-slate-500">NASA WS10M / WD10M & Open-Meteo</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Yağıntı Miqdarı (30 gün)</span>
            <CloudRain className="h-4 w-4 text-blue-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {nasaData ? `${nasaData.summary30Days.totalPrecipitationMm} mm` : "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-blue-400">
            Cari gün: {weatherData?.current.precipitationMm ?? 0} mm
          </div>
          <div className="mt-2 text-[10px] text-slate-500">NASA GPM IMERG / PRECTOTCORR</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Havanın Rütubəti (RH2M)</span>
            <Droplets className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {nasaData ? `${nasaData.summary30Days.avgHumidityPercent}%` : "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-cyan-400">
            Cari RH: {weatherData?.current.relativeHumidityPercent ?? "—"}%
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Mənbə: NASA POWER RH2M</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Günəş Radiasiyası</span>
            <Sun className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {nasaData ? `${nasaData.summary30Days.avgSolarRadiationKwhM2}` : "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-yellow-400">
            kWh / m² / gün (Fotosintetik aktiv)
          </div>
          <div className="mt-2 text-[10px] text-slate-500">NASA CERES (ALLSKY_SFC_SW_DWN)</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Torpaq Rütubəti (SMAP)</span>
            <Droplets className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-400">
            {nasaData ? `${nasaData.summary30Days.avgSoilMoistureRootPercent}%` : "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-300">
            Səth (0-5sm): {nasaData?.summary30Days.avgSoilMoistureSurfacePercent ?? "—"}%
          </div>
          <div className="mt-2 text-[10px] text-slate-500">NASA SMAP GWETROOT (Kök zonası)</div>
        </div>
      </div>

      {/* Multi-Date Spectral Indices (NDVI, NDRE, NDMI, EVI, SAVI) & Date Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Multispektral Vegetasiya və Rütubət İndeksləri (NASA HLS / Sentinel-2 / Landsat)
              </h3>
              <p className="text-xs text-slate-400">
                Sahənin koordinatları üzrə tarixlərarası NDVI, NDRE, NDMI, EVI və SAVI müqayisəsi
              </p>
            </div>
          </div>

          {/* Date-to-Date Comparison Selector */}
          {passA && passB && (
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  Tarixlər Üzrə Müqayisə Kalkulyatoru:
                </span>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Birinci tarix"
                    value={compareIdx1}
                    onChange={(e) => setCompareIdx1(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-200"
                  >
                    {specList.map((s, idx) => (
                      <option key={s.date + idx} value={idx}>
                        {s.date} (NDVI {s.ndvi})
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-500 text-xs">ilə</span>
                  <select
                    aria-label="İkinci tarix"
                    value={compareIdx2}
                    onChange={(e) => setCompareIdx2(Number(e.target.value))}
                    className="rounded-lg border border-emerald-500/50 bg-slate-900 px-2.5 py-1 font-mono text-xs text-emerald-300"
                  >
                    {specList.map((s, idx) => (
                      <option key={s.date + idx} value={idx}>
                        {s.date} (NDVI {s.ndvi})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                {[
                  { label: "NDVI (Biomassa)", a: passA.ndvi, b: passB.ndvi },
                  { label: "NDRE (Azot/Xlorofil)", a: passA.ndre, b: passB.ndre },
                  { label: "NDMI (Yarpaq Su)", a: passA.ndmi, b: passB.ndmi },
                  { label: "EVI (Sıx Çətir)", a: passA.evi, b: passB.evi },
                  { label: "SAVI (Torpaq Kor.)", a: passA.savi, b: passB.savi },
                ].map((item) => {
                  const diff = Math.round((item.b - item.a) * 100) / 100;
                  return (
                    <div
                      key={item.label}
                      className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5"
                    >
                      <div className="text-[10px] text-slate-400 mb-1">{item.label}</div>
                      <div className="font-mono text-sm font-bold text-slate-100">
                        {item.a.toFixed(2)} → {item.b.toFixed(2)}
                      </div>
                      <div
                        className={`font-mono text-xs font-semibold mt-0.5 ${
                          diff > 0
                            ? "text-emerald-400"
                            : diff < 0
                            ? "text-rose-400"
                            : "text-slate-400"
                        }`}
                      >
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spectral History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2">Keçid Tarixi</th>
                  <th className="py-2 px-2">Peyk / Sensor</th>
                  <th className="py-2 px-2">Bulud %</th>
                  <th className="py-2 px-2">NDVI</th>
                  <th className="py-2 px-2">NDRE</th>
                  <th className="py-2 px-2">NDMI</th>
                  <th className="py-2 px-2">EVI / SAVI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {specList.map((row, idx) => (
                  <tr key={row.date + idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-2 font-semibold text-slate-200">{row.date}</td>
                    <td className="py-2.5 px-2 font-sans text-slate-300 text-[11px]">
                      {row.satelliteSource}
                    </td>
                    <td className="py-2.5 px-2 text-slate-400">{row.cloudCoverPercent}%</td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold ${
                          row.ndvi >= 0.55
                            ? "bg-emerald-500/20 text-emerald-300"
                            : row.ndvi >= 0.4
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {row.ndvi.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-emerald-400">{row.ndre.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-sky-400">{row.ndmi.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-slate-300">
                      {row.evi.toFixed(2)} / {row.savi.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NASA POWER 30-Day Interactive Telemetry Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#111827] p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  NASA POWER 30 Günlük Dinamika Qrafiki
                </h3>
                <p className="text-xs text-slate-400">
                  Faktiki peyk müşahidə seriyası ({series[0]?.date || "—"} →{" "}
                  {series[series.length - 1]?.date || "—"})
                </p>
              </div>
              <div className="flex gap-1">
                {[
                  { id: "temp", label: "Temperatur" },
                  { id: "precip", label: "Yağıntı" },
                  { id: "moisture", label: "SMAP Rütubət" },
                  { id: "solar", label: "Radiasiya" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setSelectedMetricChart(
                        tab.id as "temp" | "precip" | "moisture" | "solar"
                      )
                    }
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                      selectedMetricChart === tab.id
                        ? "bg-emerald-500 text-slate-950 font-semibold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Bar/Line Chart */}
            <div className="mt-4 h-56 w-full rounded-xl border border-slate-800/90 bg-slate-950/80 p-4 flex flex-col justify-end">
              {series.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  NASA POWER seriyası yüklənir...
                </div>
              ) : (
                <div className="flex items-end justify-between gap-1 h-40 w-full">
                  {series.slice(-24).map((d, i) => {
                    let val = 0;
                    let maxScale = 40;
                    let barColor = "bg-emerald-500";
                    let unit = "";

                    if (selectedMetricChart === "temp") {
                      val = d.tempMaxC ?? d.tempAvgC ?? 15;
                      maxScale = 40;
                      barColor = val > 30 ? "bg-rose-500" : val > 22 ? "bg-amber-400" : "bg-emerald-500";
                      unit = "°C";
                    } else if (selectedMetricChart === "precip") {
                      val = d.precipitationMm ?? 0;
                      maxScale = Math.max(15, ...series.map((x) => x.precipitationMm ?? 0));
                      barColor = "bg-sky-400";
                      unit = "mm";
                    } else if (selectedMetricChart === "moisture") {
                      val = Math.round((d.soilMoistureRoot ?? 0.42) * 100);
                      maxScale = 100;
                      barColor = val < 32 ? "bg-rose-500" : "bg-cyan-400";
                      unit = "%";
                    } else {
                      val = d.solarRadiationKwhM2 ?? 3.5;
                      maxScale = 8;
                      barColor = "bg-yellow-400";
                      unit = "kWh";
                    }

                    const heightPct = Math.max(6, Math.min(100, Math.round((val / maxScale) * 100)));

                    return (
                      <div
                        key={d.date + i}
                        className="group relative flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <div className="pointer-events-none absolute -top-7 hidden group-hover:block z-10 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-white shadow">
                          {d.date.slice(5)}: {val} {unit}
                        </div>
                        <div
                          className={`w-full rounded-t transition-all ${barColor} opacity-85 group-hover:opacity-100`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500 border-t border-slate-800 pt-1.5">
                <span>{series[Math.max(0, series.length - 24)]?.date || ""}</span>
                <span>NASA POWER Gündəlik Arxiv Seriyası</span>
                <span>{series[series.length - 1]?.date || ""}</span>
              </div>
            </div>
          </div>

          {/* Spraying Window & 7-Day Open-Meteo Forecast Summary */}
          {weatherData && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">
                  7 Günlük Aqrometeoroloji Proqnoz & Çiləmə Pəncərəsi
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Open-Meteo API</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {weatherData.daily7Days.slice(0, 7).map((day) => (
                  <div
                    key={day.date}
                    className="rounded-lg border border-slate-800 bg-slate-950/80 p-1.5"
                    title={day.sprayingReason}
                  >
                    <div className="font-mono text-[10px] text-slate-400">
                      {day.date.slice(5)}
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-100 my-0.5">
                      {day.tempMaxC}°
                    </div>
                    <div className="font-mono text-[10px] text-sky-400">
                      {day.precipitationSumMm}mm
                    </div>
                    <div
                      className={`mt-1 h-1.5 w-full rounded-full ${
                        day.sprayingSuitability === "optimal"
                          ? "bg-emerald-500"
                          : day.sprayingSuitability === "caution"
                          ? "bg-amber-400"
                          : "bg-rose-500"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
