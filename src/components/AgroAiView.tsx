"use client";

import React, { useState } from "react";
import {
  NasaTelemetryResponse,
  Parcel,
  WeatherForecastResponse,
} from "@/types/agro";
import {
  Bot,
  Send,
  Sparkles,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Sprout,
  Satellite,
  FlaskConical,
} from "lucide-react";

interface AgroAiViewProps {
  parcels: Parcel[];
  selectedParcel: Parcel;
  onSelectParcel: (parcelId: string) => void;
  nasaData: NasaTelemetryResponse | null;
  weatherData: WeatherForecastResponse | null;
}

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  providerLabel?: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Seçilmiş sahənin torpaq analizi (pH, EC, NPK) və sələf bitkisinə görə gübrələməni izah et",
  "NASA SMAP torpaq rütubəti, 30 günlük yağıntı və NDMI indeksinə əsasən suvarma ehtiyacını qiymətləndir",
  "Sahədə əvvəlki və hazırkı əkin növbələşməsi hansı xəstəlik və zərərverici risklərini yaradır?",
  "Peyk NDVI və NDRE göstəriciləri bu sort üçün hansı aqronomik vəziyyəti göstərir?",
  "Yarpaqda saralma müşahidə olunursa hansı laborator analizlər lazımdır? Uydurma diaqnoz olmadan izah et",
];

export default function AgroAiView({
  parcels,
  selectedParcel,
  onSelectParcel,
  nasaData,
  weatherData,
}: AgroAiViewProps) {
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "welcome-1",
      role: "assistant",
      providerLabel: "AgroAI Baş Aqronom Sistemi",
      timestamp: "Sistem Hazırdır",
      content: `Salam! Mən **AgroAI** — AgroOrbit-in süni intellekt əsaslı rəqəmsal aqronom sistemiyəm.\n\nHazırda söhbət kontekstinə **${selectedParcel.name}** (**${selectedParcel.areaHa} ha**, **${selectedParcel.region}**) sahəsinin məlumatları qoşulub:\n- **Hazırkı Bitki və Sort:** ${selectedParcel.currentCrop} (*${selectedParcel.variety}*), Əkin tarixi: \`${selectedParcel.plantingDate}\`\n- **Əvvəlki Əkin (Sələf):** ${selectedParcel.previousCrop}\n- **Torpaq Analizi:** ${
        selectedParcel.soilAnalysis
          ? `pH ${selectedParcel.soilAnalysis.ph}, EC ${selectedParcel.soilAnalysis.salinityEc} dS/m, Humus ${selectedParcel.soilAnalysis.humusPercent}%`
          : "Daxil edilməyib (məlumat çatışmazlığı nəzərə alınır)"
      }\n\nBitki xəstəlikləri, gübrələmə və suvarma rejimi, sort texnologiyası, torpaq analizi şərhi və ya NASA peyk göstəriciləri barədə sualınızı yaza bilərsiniz.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [runtimeProvider, setRuntimeProvider] = useState<"gemini" | "openai">("gemini");
  const [runtimeApiKey, setRuntimeApiKey] = useState("");
  const [configNotice, setConfigNotice] = useState<string | null>(null);

  const sendMessage = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatItem = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          parcel: selectedParcel,
          nasa: nasaData,
          weather: weatherData,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          runtimeApiKey: runtimeApiKey || undefined,
          runtimeProvider,
        }),
      });

      const data = await res.json();
      if (data.missingConfigNotice) {
        setConfigNotice(data.missingConfigNotice);
      } else {
        setConfigNotice(null);
      }

      const aiMsg: ChatItem = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || data.error || "Cavab alına bilmədi.",
        providerLabel: data.providerLabel || "AgroAI Mühərriki",
        timestamp: new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Serverlə əlaqə zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
          timestamp: "Xəta",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 4 Cols: Active Parcel Context & Telemetry Inspector */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
              <Bot className="h-3.5 w-3.5" />
              AgroAI Kontekst Mühərriki
            </span>
            <button
              type="button"
              onClick={() => setShowKeyConfig((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              API Açar Ayarı
            </button>
          </div>

          {showKeyConfig && (
            <div className="rounded-xl border border-amber-500/40 bg-slate-950 p-3.5 text-xs space-y-2.5">
              <div className="font-semibold text-amber-300">
                Xarici Bulud LLM Konfiqurasiyası (.env və ya Sessiya Açarı)
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Server tərəfdə <code className="text-slate-200">.env</code> faylında{" "}
                <code className="text-emerald-300">GEMINI_API_KEY</code> və ya{" "}
                <code className="text-emerald-300">OPENAI_API_KEY</code> oxunur. Açarınızı həmçinin
                buradan daxil edib dərhal sınaqdan keçirə bilərsiniz:
              </p>
              <div className="flex gap-2">
                <select
                  value={runtimeProvider}
                  onChange={(e) => setRuntimeProvider(e.target.value as "gemini" | "openai")}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI GPT</option>
                </select>
                <input
                  type="password"
                  value={runtimeApiKey}
                  onChange={(e) => setRuntimeApiKey(e.target.value)}
                  placeholder="API açarını daxil edin..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Söhbət Kontekstindəki Aktiv Sahə:
            </label>
            <select
              value={selectedParcel.id}
              onChange={(e) => onSelectParcel(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100"
            >
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} ({p.areaHa} ha)
                </option>
              ))}
            </select>
          </div>

          {/* Live Context Summary Cards */}
          <div className="space-y-2.5 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
                <Sprout className="h-3.5 w-3.5" />
                Əkin və Sort Məlumatları
              </div>
              <div className="space-y-1 text-slate-300">
                <div>
                  <strong>Hazırkı Bitki:</strong> {selectedParcel.currentCrop} (
                  {selectedParcel.variety})
                </div>
                <div>
                  <strong>Əvvəlki Əkin (Sələf):</strong> {selectedParcel.previousCrop}
                </div>
                <div>
                  <strong>Hektar & Əkin Tarixi:</strong>{" "}
                  <span className="font-mono">{selectedParcel.areaHa} ha</span> •{" "}
                  <span className="font-mono">{selectedParcel.plantingDate}</span>
                </div>
                <div>
                  <strong>Səpin Norması:</strong> {selectedParcel.seedingRate}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center gap-1.5 font-semibold text-sky-400 mb-1">
                <FlaskConical className="h-3.5 w-3.5" />
                Torpaq Analizi Konteksti
              </div>
              {selectedParcel.soilAnalysis ? (
                <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                  <div>
                    pH: <strong>{selectedParcel.soilAnalysis.ph}</strong> | EC:{" "}
                    <strong>{selectedParcel.soilAnalysis.salinityEc} dS/m</strong> | Humus:{" "}
                    <strong>{selectedParcel.soilAnalysis.humusPercent}%</strong>
                  </div>
                  <div>
                    N: {selectedParcel.soilAnalysis.nitrogenMgKg} | P₂O₅:{" "}
                    {selectedParcel.soilAnalysis.phosphorusMgKg} | K₂O:{" "}
                    {selectedParcel.soilAnalysis.potassiumMgKg} mq/kq
                  </div>
                </div>
              ) : (
                <div className="text-amber-300 text-[11px] flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Torpaq analizi yoxdur — AI uydurma gübrə dozası verməyəcək.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1">
                <Satellite className="h-3.5 w-3.5" />
                Canlı NASA & Hava Telemetriyası
              </div>
              <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                <div>
                  NDVI:{" "}
                  <strong>
                    {nasaData?.spectralHistory?.[nasaData.spectralHistory.length - 1]?.ndvi ??
                      selectedParcel.baselineNdvi}
                  </strong>{" "}
                  | NDRE:{" "}
                  <strong>
                    {nasaData?.spectralHistory?.[nasaData.spectralHistory.length - 1]?.ndre ??
                      selectedParcel.baselineNdre}
                  </strong>{" "}
                  | NDMI:{" "}
                  <strong>
                    {nasaData?.spectralHistory?.[nasaData.spectralHistory.length - 1]?.ndmi ??
                      selectedParcel.baselineNdmi}
                  </strong>
                </div>
                <div>
                  SMAP Kök Rütubəti:{" "}
                  <strong>{nasaData?.summary30Days.avgSoilMoistureRootPercent ?? 42}%</strong> | 30g
                  Yağıntı: <strong>{nasaData?.summary30Days.totalPrecipitationMm ?? 18} mm</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Agronomic Prompts */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Hazır Aqronomik Sorğu Şablonları:
            </div>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => sendMessage(qp)}
                  disabled={loading}
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition"
                >
                  → {qp}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right 8 Cols: AgroAI Interactive Conversation Workspace */}
      <div className="lg:col-span-8 flex flex-col rounded-2xl border border-slate-800 bg-[#111827] overflow-hidden h-180">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                AgroAI – Fərdi Süni İntellekt Aqronom Məsləhətçisi
              </h3>
              <p className="text-[11px] text-slate-400">
                Sahə pasportu, NASA POWER/SMAP/HLS və torpaq analizi ilə birbaşa əlaqəli analitik model
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Azərbaycan Dili • Uydurma Diaqnoza Qarşı Qoruma
          </span>
        </div>

        {/* Transparent Configuration Banner if no external API key in .env */}
        {configNotice && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-[11px] text-amber-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>{configNotice}</div>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white font-medium"
                    : "border border-slate-800 bg-slate-950/90 text-slate-200"
                }`}
              >
                {m.providerLabel && (
                  <div className="mb-1.5 flex items-center justify-between gap-4 border-b border-slate-800 pb-1 text-[10px] font-mono text-emerald-400">
                    <span>{m.providerLabel}</span>
                    <span className="text-slate-500">{m.timestamp}</span>
                  </div>
                )}
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              AgroAI seçilmiş sahənin NASA peyk və torpaq göstəricilərini təhlil edir...
            </div>
          )}
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-slate-800 bg-slate-950/80 p-4 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`${selectedParcel.name} (${selectedParcel.currentCrop} - ${selectedParcel.variety}) haqqında aqronomik sualınızı yazın...`}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Soruş
          </button>
        </form>
      </div>
    </div>
  );
}
