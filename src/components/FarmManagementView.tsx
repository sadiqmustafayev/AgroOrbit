"use client";

import React, { useState } from "react";
import { Parcel } from "@/types/agro";
import { evaluateCropRotationAndSoil } from "@/lib/agronomy-engine";
import {
  Sprout,
  Plus,
  FlaskConical,
  Droplets,
  ShieldAlert,
  Wheat,
  CheckCircle2,
  AlertTriangle,
  History,
  MapPin,
  Layers,
} from "lucide-react";

interface FarmManagementViewProps {
  parcels: Parcel[];
  selectedParcel: Parcel;
  onSelectParcel: (parcelId: string) => void;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

export default function FarmManagementView({
  parcels,
  selectedParcel,
  onSelectParcel,
  onAction,
}: FarmManagementViewProps) {
  const [showNewParcelModal, setShowNewParcelModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    "passport" | "soil" | "fertilization" | "spraying" | "harvest"
  >("passport");

  // New Parcel Form State
  const [pName, setPName] = useState("");
  const [pCode, setPCode] = useState("");
  const [pRegion, setPRegion] = useState("Beyləqan rayonu");
  const [pLat, setPLat] = useState("40.0320");
  const [pLon, setPLon] = useState("47.6610");
  const [pArea, setPArea] = useState("45.0");
  const [pPrevCrop, setPPrevCrop] = useState("Yonca");
  const [pPrevVar, setPPrevVar] = useState("Yerli Göy Yonca");
  const [pCurrCrop, setPCurrCrop] = useState("Payızlıq Buğda");
  const [pVariety, setPVariety] = useState("Bezostaya-100");
  const [pPlantDate, setPPlantDate] = useState("2026-10-25");
  const [pSeedRate, setPSeedRate] = useState("210 kq/ha");
  const [pIrrigation, setPIrrigation] = useState<Parcel["irrigationMethod"]>("Pivot (Dairəvi)");

  // Soil Analysis Form State
  const [soilLab, setSoilLab] = useState(
    selectedParcel.soilAnalysis?.laboratoryName || "KTN Mərkəzi Aqrokimya Laboratoriyası"
  );
  const [soilPh, setSoilPh] = useState(String(selectedParcel.soilAnalysis?.ph ?? 7.5));
  const [soilEc, setSoilEc] = useState(String(selectedParcel.soilAnalysis?.salinityEc ?? 1.4));
  const [soilHumus, setSoilHumus] = useState(
    String(selectedParcel.soilAnalysis?.humusPercent ?? 2.6)
  );
  const [soilN, setSoilN] = useState(String(selectedParcel.soilAnalysis?.nitrogenMgKg ?? 42));
  const [soilP, setSoilP] = useState(String(selectedParcel.soilAnalysis?.phosphorusMgKg ?? 30));
  const [soilK, setSoilK] = useState(String(selectedParcel.soilAnalysis?.potassiumMgKg ?? 280));
  const [soilTexture, setSoilTexture] = useState(
    selectedParcel.soilAnalysis?.soilTexture || "Orta gillicəli"
  );
  const [soilNotes, setSoilNotes] = useState(selectedParcel.soilAnalysis?.notes || "");

  // Fertilization Form State
  const [fertName, setFertName] = useState("Karbamid (Azot 46%)");
  const [fertNpk, setFertNpk] = useState("46-0-0");
  const [fertRate, setFertRate] = useState("150");
  const [fertMethod, setFertMethod] = useState("Dronla diferensial (VRA)");
  const [fertCost, setFertCost] = useState("4200");
  const [fertNotes, setFertNotes] = useState("");

  // Spraying Form State
  const [sprayProd, setSprayProd] = useState("Atlantis OD + Biopower");
  const [sprayActive, setSprayActive] = useState("Mezosulfuron-metil");
  const [sprayTarget, setSprayTarget] = useState("Birillik və çoxillik alaq otları");
  const [sprayDose, setSprayDose] = useState("1.0 L/ha");
  const [sprayMethod, setSprayMethod] = useState<"Dronla" | "Traktor çiləyicisi" | "Əl çiləyicisi">(
    "Dronla"
  );
  const [sprayPhi, setSprayPhi] = useState("30");

  // Harvest Form State
  const [harvYear, setHarvYear] = useState("2026");
  const [harvCrop, setHarvCrop] = useState(selectedParcel.previousCrop || "Payızlıq Buğda");
  const [harvVar, setHarvVar] = useState(selectedParcel.previousVariety || "Bezostaya-100");
  const [harvTons, setHarvTons] = useState("320");
  const [harvMoist, setHarvMoist] = useState("12.4");
  const [harvRev, setHarvRev] = useState("118000");

  const rotationAdvice = evaluateCropRotationAndSoil(selectedParcel);

  const handleCreateParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    await onAction("create_parcel", {
      name: pName,
      code: pCode || `AO-${Math.floor(10 + Math.random() * 89)}`,
      region: pRegion,
      centerLat: parseFloat(pLat) || 40.025,
      centerLon: parseFloat(pLon) || 47.652,
      areaHa: parseFloat(pArea) || 35,
      previousCrop: pPrevCrop,
      previousVariety: pPrevVar,
      currentCrop: pCurrCrop,
      variety: pVariety,
      plantingDate: pPlantDate,
      seedingRate: pSeedRate,
      irrigationMethod: pIrrigation,
    });
    setShowNewParcelModal(false);
    setPName("");
  };

  const handleSaveSoil = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAction("save_soil_analysis", {
      parcelId: selectedParcel.id,
      laboratoryName: soilLab,
      ph: parseFloat(soilPh),
      salinityEc: parseFloat(soilEc),
      humusPercent: parseFloat(soilHumus),
      nitrogenMgKg: parseFloat(soilN),
      phosphorusMgKg: parseFloat(soilP),
      potassiumMgKg: parseFloat(soilK),
      soilTexture,
      notes: soilNotes,
    });
  };

  const handleAddFert = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAction("add_fertilization_record", {
      parcelId: selectedParcel.id,
      fertilizerName: fertName,
      npkRatio: fertNpk,
      rateKgHa: parseFloat(fertRate),
      method: fertMethod,
      costAzn: parseFloat(fertCost),
      notes: fertNotes,
    });
    setFertNotes("");
  };

  const handleAddSpray = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAction("add_spraying_record", {
      parcelId: selectedParcel.id,
      productName: sprayProd,
      activeIngredient: sprayActive,
      targetPestOrDisease: sprayTarget,
      dosePerHa: sprayDose,
      method: sprayMethod,
      phiDays: parseInt(sprayPhi, 10) || 20,
    });
  };

  const handleAddHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAction("add_harvest_record", {
      parcelId: selectedParcel.id,
      year: parseInt(harvYear, 10) || 2026,
      crop: harvCrop,
      variety: harvVar,
      totalTons: parseFloat(harvTons),
      moisturePercent: parseFloat(harvMoist),
      revenueAzn: parseFloat(harvRev),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Parcel Selector & Add Parcel Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#111827] p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Fermer və Rəqəmsal Təsərrüfat İdarəetməsi (Kadastr & Əkin Pasportu)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Hər bir sahənin əvvəlki və hazırkı əkini, sortu, səpin norması, növbəli əkin uyğunluğu, torpaq analizi, gübrələmə və yığım tarixçəsi
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewParcelModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow"
        >
          <Plus className="h-4 w-4" />
          Yeni Sahə (Parsel) Qeydiyyata Al
        </button>
      </div>

      {/* Parcel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {parcels.map((p) => {
          const isSel = p.id === selectedParcel.id;
          const rot = evaluateCropRotationAndSoil(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectParcel(p.id)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                isSel
                  ? "border-emerald-500 bg-emerald-500/10 shadow-lg"
                  : "border-slate-800 bg-[#111827] hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                  {p.code}
                </span>
                <span className="font-mono text-xs font-bold text-slate-200">{p.areaHa} ha</span>
              </div>
              <div className="font-bold text-sm text-slate-100 line-clamp-1">{p.name}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                <span className="truncate">{p.region}</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Hazırkı bitki:</span>
                  <span className="font-semibold text-emerald-300">{p.currentCrop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sort / Hibrid:</span>
                  <span className="text-slate-200 truncate max-w-35">{p.variety}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Əvvəlki əkin:</span>
                  <span className="text-slate-300">{p.previousCrop}</span>
                </div>
              </div>
              <div className="mt-2.5">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    rot.compatibilityStatus === "optimal"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : rot.compatibilityStatus === "critical"
                      ? "bg-rose-500/20 text-rose-300"
                      : rot.compatibilityStatus === "warning"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-sky-500/20 text-sky-300"
                  }`}
                >
                  {rot.compatibilityLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Parcel Detailed Monitoring & History Tabs */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              {selectedParcel.name} ({selectedParcel.areaHa} ha) — Sahə Tarixçəsi və Monitorinq Pasportu
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "passport", label: "Əkin Pasportu & Rotasiya", icon: Layers },
              { id: "soil", label: "Torpaq Analizi", icon: FlaskConical },
              {
                id: "fertilization",
                label: `Gübrələmə (${selectedParcel.fertilizationHistory.length})`,
                icon: Droplets,
              },
              {
                id: "spraying",
                label: `Dərmanlama (${selectedParcel.sprayingHistory.length})`,
                icon: ShieldAlert,
              },
              {
                id: "harvest",
                label: `Məhsuldarlıq (${selectedParcel.harvestHistory.length})`,
                icon: Wheat,
              },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setActiveSubTab(
                      t.id as "passport" | "soil" | "fertilization" | "spraying" | "harvest"
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeSubTab === t.id
                      ? "bg-emerald-500 text-slate-950 font-semibold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          {activeSubTab === "passport" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 cols: Full Agronomic Passport */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Sahənin Adı", value: selectedParcel.name },
                    { label: "Yerləşdiyi Ərazi", value: selectedParcel.region },
                    { label: "Hektarla Ölçüsü", value: `${selectedParcel.areaHa} ha`, mono: true },
                    {
                      label: "Əvvəlki Əkin Bitkisi (Sələf)",
                      value: `${selectedParcel.previousCrop} (${selectedParcel.previousVariety})`,
                    },
                    { label: "Hazırkı Əkilən Bitki", value: selectedParcel.currentCrop },
                    { label: "Bitkinin Sortu / Hibridi", value: selectedParcel.variety },
                    { label: "Əkin Tarixi", value: selectedParcel.plantingDate, mono: true },
                    { label: "Səpin Norması", value: selectedParcel.seedingRate, mono: true },
                    { label: "Suvarma Üsulu", value: selectedParcel.irrigationMethod },
                    {
                      label: "Fenoloji Mərhələ",
                      value: selectedParcel.phenologicalStage,
                    },
                    {
                      label: "Son Suvarma Tarixi",
                      value: selectedParcel.lastIrrigationDate,
                      mono: true,
                    },
                    {
                      label: "Mərkəzi Koordinat",
                      value: `${selectedParcel.centerLat.toFixed(4)}°N, ${selectedParcel.centerLon.toFixed(4)}°E`,
                      mono: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <div className="text-[11px] text-slate-400">{item.label}</div>
                      <div
                        className={`text-xs font-semibold text-slate-100 mt-1 ${
                          item.mono ? "font-mono text-emerald-300" : ""
                        }`}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedParcel.notes && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 text-xs text-slate-300">
                    <strong className="text-slate-100">Aqronom Qeydi:</strong> {selectedParcel.notes}
                  </div>
                )}
              </div>

              {/* Right 5 cols: Crop Rotation & Soil Recommendation Engine */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <History className="h-4 w-4" />
                    Növbəli Əkin və Torpaq Tövsiyə Sistemi
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      rotationAdvice.compatibilityStatus === "optimal"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : rotationAdvice.compatibilityStatus === "critical"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {rotationAdvice.compatibilityLabel}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs space-y-2">
                  <div className="font-semibold text-slate-200">
                    Rotasiya keçidi:{" "}
                    <span className="text-amber-300">{rotationAdvice.previousCrop}</span> →{" "}
                    <span className="text-emerald-400">{rotationAdvice.currentCrop}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {rotationAdvice.agronomicAnalysis}
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    <strong>Torpağa təsiri:</strong> {rotationAdvice.soilImpactNote}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-sky-300">
                    Torpaq pH, Duzluluq və Gübrə Tənzimləməsi:
                  </div>
                  <p className="text-slate-300">{rotationAdvice.phSalinityEvaluation}</p>
                  <p className="text-emerald-300/90">{rotationAdvice.fertilizerAdjustmentNote}</p>
                </div>

                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                    Növbəti mövsüm üçün tövsiyə olunan əkinlər:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rotationAdvice.nextSeasonRecommendedCrops.map((c) => (
                      <span
                        key={c}
                        className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-300"
                      >
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "soil" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-100">
                  Mövcud Torpaq Analizi Nəticələri ({selectedParcel.code})
                </h4>
                {selectedParcel.soilAnalysis ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="text-[11px] text-slate-400">Turşuluq / Qələvilik (pH)</div>
                        <div className="font-mono text-xl font-bold text-emerald-400 mt-1">
                          {selectedParcel.soilAnalysis.ph}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="text-[11px] text-slate-400">Duzluluq (ECe)</div>
                        <div
                          className={`font-mono text-xl font-bold mt-1 ${
                            selectedParcel.soilAnalysis.salinityEc >= 3.0
                              ? "text-rose-400"
                              : "text-sky-400"
                          }`}
                        >
                          {selectedParcel.soilAnalysis.salinityEc} dS/m
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="text-[11px] text-slate-400">Üzvi Maddə (Humus)</div>
                        <div className="font-mono text-xl font-bold text-amber-400 mt-1">
                          {selectedParcel.soilAnalysis.humusPercent}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="text-[11px] text-slate-400">Mütəhərrik Azot (N)</div>
                        <div className="font-mono text-lg font-bold text-slate-100 mt-1">
                          {selectedParcel.soilAnalysis.nitrogenMgKg} mq/kq
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="text-[11px] text-slate-400">Fosfor (P₂O₅)</div>
                        <div className="font-mono text-lg font-bold text-slate-100 mt-1">
                          {selectedParcel.soilAnalysis.phosphorusMgKg} mq/kq
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <div className="text-[11px] text-slate-400">Mübadiləli Kalium (K₂O)</div>
                        <div className="font-mono text-lg font-bold text-slate-100 mt-1">
                          {selectedParcel.soilAnalysis.potassiumMgKg} mq/kq
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 space-y-1">
                      <div>
                        <strong>Laboratoriya:</strong> {selectedParcel.soilAnalysis.laboratoryName}{" "}
                        ({selectedParcel.soilAnalysis.sampleDate})
                      </div>
                      <div>
                        <strong>Mexaniki tərkib:</strong> {selectedParcel.soilAnalysis.soilTexture}
                      </div>
                      <div>
                        <strong>Rəy:</strong> {selectedParcel.soilAnalysis.notes}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Bu sahə üzrə hələ torpaq analizi daxil edilməyib. Sağdakı formadan nəticələri daxil edin.
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveSoil} className="lg:col-span-6 space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <h4 className="text-sm font-bold text-slate-100">
                  Yeni / Yenilənmiş Torpaq Analizi Daxil Et
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Laboratoriya adı</label>
                    <input
                      type="text"
                      value={soilLab}
                      onChange={(e) => setSoilLab(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Qranulometrik tərkib</label>
                    <input
                      type="text"
                      value={soilTexture}
                      onChange={(e) => setSoilTexture(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">pH göstəricisi</label>
                    <input
                      type="number"
                      step="0.05"
                      value={soilPh}
                      onChange={(e) => setSoilPh(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Duzluluq EC (dS/m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={soilEc}
                      onChange={(e) => setSoilEc(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Humus (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={soilHumus}
                      onChange={(e) => setSoilHumus(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Azot N (mq/kq)</label>
                    <input
                      type="number"
                      value={soilN}
                      onChange={(e) => setSoilN(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Fosfor P₂O₅ (mq/kq)</label>
                    <input
                      type="number"
                      value={soilP}
                      onChange={(e) => setSoilP(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Kalium K₂O (mq/kq)</label>
                    <input
                      type="number"
                      value={soilK}
                      onChange={(e) => setSoilK(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Qeyd</label>
                  <input
                    type="text"
                    value={soilNotes}
                    onChange={(e) => setSoilNotes(e.target.value)}
                    placeholder="Laboratoriya rəyi..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Torpaq Analizini Yadda Saxla
                </button>
              </form>
            </div>
          )}

          {activeSubTab === "fertilization" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-sm font-bold text-slate-100">Gübrələmə Tarixçəsi</h4>
                {selectedParcel.fertilizationHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">Hələ gübrələmə qeydi əlavə olunmayıb.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedParcel.fertilizationHistory.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-100">
                            {f.fertilizerName} (NPK: {f.npkRatio})
                          </div>
                          <div className="text-slate-400 mt-0.5">
                            Üsul: {f.method} • Faza: {f.stage} • {f.notes}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-emerald-400 font-bold">{f.rateKgHa} kq/ha</div>
                          <div className="text-slate-400 text-[11px]">{f.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddFert} className="lg:col-span-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
                <h4 className="text-sm font-bold text-slate-100">Yeni Gübrələmə Əməliyyatı Əlavə Et</h4>
                <div>
                  <label className="block text-slate-400 mb-1">Gübrənin adı</label>
                  <input
                    type="text"
                    value={fertName}
                    onChange={(e) => setFertName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">NPK nisbəti</label>
                    <input
                      type="text"
                      value={fertNpk}
                      onChange={(e) => setFertNpk(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Norma (kq/ha)</label>
                    <input
                      type="number"
                      value={fertRate}
                      onChange={(e) => setFertRate(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Tətbiq üsulu</label>
                    <input
                      type="text"
                      value={fertMethod}
                      onChange={(e) => setFertMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Ümumi xərc (AZN)</label>
                    <input
                      type="number"
                      value={fertCost}
                      onChange={(e) => setFertCost(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  + Gübrələmə Qeydini Əlavə Et
                </button>
              </form>
            </div>
          )}

          {activeSubTab === "spraying" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-sm font-bold text-slate-100">Dərmanlama və Bitki Mühafizəsi Tarixçəsi</h4>
                {selectedParcel.sprayingHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">Bu mövsüm dərmanlama qeydi yoxdur.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedParcel.sprayingHistory.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-100">
                            {s.productName} ({s.activeIngredient})
                          </div>
                          <div className="text-slate-400 mt-0.5">
                            Hədəf: {s.targetPestOrDisease} • Üsul: {s.method} • Gözləmə (PHI):{" "}
                            {s.phiDays} gün
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-sky-400 font-bold">{s.dosePerHa}</div>
                          <div className="text-slate-400 text-[11px]">{s.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddSpray} className="lg:col-span-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
                <h4 className="text-sm font-bold text-slate-100">Yeni Dərmanlama Əməliyyatı Qeyd Et</h4>
                <div>
                  <label className="block text-slate-400 mb-1">Preparatın adı</label>
                  <input
                    type="text"
                    value={sprayProd}
                    onChange={(e) => setSprayProd(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Təsiredici maddə</label>
                    <input
                      type="text"
                      value={sprayActive}
                      onChange={(e) => setSprayActive(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Doza (ha üzrə)</label>
                    <input
                      type="text"
                      value={sprayDose}
                      onChange={(e) => setSprayDose(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Hədəf xəstəlik / zərərverici / alaq</label>
                  <input
                    type="text"
                    value={sprayTarget}
                    onChange={(e) => setSprayTarget(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Çiləmə üsulu</label>
                    <select
                      value={sprayMethod}
                      onChange={(e) =>
                        setSprayMethod(
                          e.target.value as "Dronla" | "Traktor çiləyicisi" | "Əl çiləyicisi"
                        )
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                    >
                      <option value="Dronla">Dronla</option>
                      <option value="Traktor çiləyicisi">Traktor çiləyicisi</option>
                      <option value="Əl çiləyicisi">Əl çiləyicisi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Gözləmə müddəti (gün)</label>
                    <input
                      type="number"
                      value={sprayPhi}
                      onChange={(e) => setSprayPhi(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  + Dərmanlama Qeydini Əlavə Et
                </button>
              </form>
            </div>
          )}

          {activeSubTab === "harvest" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-sm font-bold text-slate-100">Məhsul Yığımı və Məhsuldarlıq Tarixçəsi</h4>
                {selectedParcel.harvestHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">Hələ məhsul yığımı qeydi daxil edilməyib.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedParcel.harvestHistory.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-100">
                            {h.season} — {h.crop} ({h.variety})
                          </div>
                          <div className="text-slate-400 mt-0.5">
                            Keyfiyyət: {h.qualityGrade} • Nəmlik: {h.moisturePercent}% • {h.notes}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-emerald-400 font-bold text-sm">
                            {h.totalTons} ton ({h.yieldCentnerPerHa} sentner/ha)
                          </div>
                          <div className="text-slate-300 text-[11px]">
                            Gəlir: {h.revenueAzn.toLocaleString()} AZN
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddHarvest} className="lg:col-span-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
                <h4 className="text-sm font-bold text-slate-100">Yeni Məhsul Yığımı Qeyd Et</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">İl</label>
                    <input
                      type="number"
                      value={harvYear}
                      onChange={(e) => setHarvYear(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Bitki</label>
                    <input
                      type="text"
                      value={harvCrop}
                      onChange={(e) => setHarvCrop(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Sort / Hibrid</label>
                    <input
                      type="text"
                      value={harvVar}
                      onChange={(e) => setHarvVar(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Ümumi Yığım (ton)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={harvTons}
                      onChange={(e) => setHarvTons(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Dən/Məhsul nəmliyi (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={harvMoist}
                      onChange={(e) => setHarvMoist(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Satış gəliri (AZN)</label>
                    <input
                      type="number"
                      value={harvRev}
                      onChange={(e) => setHarvRev(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  + Məhsuldarlıq Qeydini Saxla
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Registering a New Parcel */}
      {showNewParcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">
                Yeni Kənd Təsərrüfatı Sahəsini Qeydiyyata Al
              </h3>
              <button
                type="button"
                onClick={() => setShowNewParcelModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateParcel} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Sahənin adı *</label>
                  <input
                    required
                    type="text"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="Məs: Parsel #05 – Şəmkir Qərb Sahəsi"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Kadastr kodu</label>
                  <input
                    type="text"
                    value={pCode}
                    onChange={(e) => setPCode(e.target.value)}
                    placeholder="SMK-05"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Yerləşdiyi rayon / kənd *</label>
                  <input
                    required
                    type="text"
                    value={pRegion}
                    onChange={(e) => setPRegion(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Enlik (Lat)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={pLat}
                    onChange={(e) => setPLat(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Uzunluq (Lon)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={pLon}
                    onChange={(e) => setPLon(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Hektarla ölçüsü (ha) *</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={pArea}
                    onChange={(e) => setPArea(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Əvvəlki əkin bitkisi (Sələf)</label>
                  <input
                    type="text"
                    value={pPrevCrop}
                    onChange={(e) => setPPrevCrop(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Əvvəlki sort</label>
                  <input
                    type="text"
                    value={pPrevVar}
                    onChange={(e) => setPPrevVar(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Hazırkı əkilən bitki *</label>
                  <input
                    required
                    type="text"
                    value={pCurrCrop}
                    onChange={(e) => setPCurrCrop(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Bitkinin sortu və ya hibridi *</label>
                  <input
                    required
                    type="text"
                    value={pVariety}
                    onChange={(e) => setPVariety(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Əkin tarixi</label>
                  <input
                    type="date"
                    value={pPlantDate}
                    onChange={(e) => setPPlantDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Səpin norması</label>
                  <input
                    type="text"
                    value={pSeedRate}
                    onChange={(e) => setPSeedRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Suvarma üsulu</label>
                  <select
                    value={pIrrigation}
                    onChange={(e) =>
                      setPIrrigation(e.target.value as Parcel["irrigationMethod"])
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  >
                    <option value="Pivot (Dairəvi)">Pivot (Dairəvi)</option>
                    <option value="Damcı suvarma">Damcı suvarma</option>
                    <option value="Şırım üsulu">Şırım üsulu</option>
                    <option value="Yağışyağdırma">Yağışyağdırma</option>
                    <option value="Dəmyə (Suvarılmayan)">Dəmyə (Suvarılmayan)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewParcelModal(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  Sahəni Yadda Saxla və Rotasiyanı Yoxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
