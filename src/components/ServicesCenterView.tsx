"use client";

import React, { useState } from "react";
import {
  AgroServiceItem,
  OrderStatus,
  Parcel,
  ServiceCategory,
  ServiceOrder,
  UserProfile,
} from "@/types/agro";
import {
  FlaskConical,
  UserCheck,
  Plane,
  Wrench,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  FileCheck2,
} from "lucide-react";

interface ServicesCenterViewProps {
  services: AgroServiceItem[];
  serviceOrders: ServiceOrder[];
  parcels: Parcel[];
  selectedParcel: Parcel;
  activeUser: UserProfile;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

export default function ServicesCenterView({
  services,
  serviceOrders,
  parcels,
  selectedParcel,
  activeUser,
  onAction,
}: ServicesCenterViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | "all">("all");
  const [activeServiceModal, setActiveServiceModal] = useState<AgroServiceItem | null>(null);

  // Order Form State
  const [orderParcelId, setOrderParcelId] = useState(selectedParcel.id);
  const [orderRegion, setOrderRegion] = useState(selectedParcel.region);
  const [orderAreaHa, setOrderAreaHa] = useState(String(selectedParcel.areaHa));
  const [orderCrop, setOrderCrop] = useState(selectedParcel.currentCrop);
  const [orderVariety, setOrderVariety] = useState(selectedParcel.variety);
  const [orderDate, setOrderDate] = useState("2026-11-18");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderSuccessBanner, setOrderSuccessBanner] = useState<string | null>(null);

  const openOrderModal = (srv: AgroServiceItem) => {
    setActiveServiceModal(srv);
    setOrderParcelId(selectedParcel.id);
    setOrderRegion(selectedParcel.region);
    setOrderAreaHa(String(selectedParcel.areaHa));
    setOrderCrop(selectedParcel.currentCrop);
    setOrderVariety(selectedParcel.variety);
    setOrderNotes("");
  };

  const handleParcelChangeInForm = (pId: string) => {
    setOrderParcelId(pId);
    const found = parcels.find((p) => p.id === pId);
    if (found) {
      setOrderRegion(found.region);
      setOrderAreaHa(String(found.areaHa));
      setOrderCrop(found.currentCrop);
      setOrderVariety(found.variety);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServiceModal) return;
    const foundParcel = parcels.find((p) => p.id === orderParcelId);

    await onAction("create_service_order", {
      serviceId: activeServiceModal.id,
      serviceTitle: activeServiceModal.title,
      parcelId: orderParcelId,
      parcelName: foundParcel?.name || "Seçilmiş Sahə",
      region: orderRegion,
      areaHa: parseFloat(orderAreaHa) || selectedParcel.areaHa,
      crop: orderCrop,
      variety: orderVariety,
      preferredDate: orderDate,
      notes: orderNotes,
      farmerName: activeUser.name,
      farmerPhone: activeUser.phone,
    });

    setOrderSuccessBanner(
      `"${activeServiceModal.title}" üzrə sifarişiniz uğurla qeydiyyata alındı və aşağıdakı Sifariş İzləmə Sisteminə əlavə olundu!`
    );
    setActiveServiceModal(null);
  };

  const filteredServices =
    selectedCategory === "all"
      ? services
      : services.filter((s) => s.category === selectedCategory);

  const categoryCounts = {
    all: services.length,
    analysis: services.filter((s) => s.category === "analysis").length,
    agronomist: services.filter((s) => s.category === "agronomist").length,
    drone: services.filter((s) => s.category === "drone").length,
    machinery: services.filter((s) => s.category === "machinery").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Aqrar Xidmətlər, Laborator Analiz və Dron Mərkəzi
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Torpaq, su, toxum və fitopatoloji analizlərin, aqronom məsləhətlərinin, RTK dron əməliyyatlarının və texnika təmirinin vahid sifariş və izləmə mərkəzi
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: `Bütün Xidmətlər (${categoryCounts.all})`, icon: ShieldCheck },
              {
                id: "analysis",
                label: `Analiz Xidmətləri (${categoryCounts.analysis})`,
                icon: FlaskConical,
              },
              {
                id: "agronomist",
                label: `Aqronom Xidmətləri (${categoryCounts.agronomist})`,
                icon: UserCheck,
              },
              { id: "drone", label: `Dron Xidmətləri (${categoryCounts.drone})`, icon: Plane },
              {
                id: "machinery",
                label: `Texnika & Usta (${categoryCounts.machinery})`,
                icon: Wrench,
              },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as ServiceCategory | "all")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    selectedCategory === cat.id
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {orderSuccessBanner && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              {orderSuccessBanner}
            </span>
            <button
              type="button"
              onClick={() => setOrderSuccessBanner(null)}
              className="text-emerald-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Services Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#111827] p-5 hover:border-emerald-500/50 transition"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    srv.category === "analysis"
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      : srv.category === "agronomist"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : srv.category === "drone"
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {srv.categoryLabel}
                </span>
                <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" />
                  {srv.turnaroundTime}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 leading-snug">{srv.title}</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {srv.shortDescription}
              </p>

              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                <div className="text-slate-300">
                  <strong className="text-slate-400">Təminatçı:</strong> {srv.providerName}{" "}
                  {srv.providerVerified && (
                    <span className="text-emerald-400 font-semibold">✓ Rəsmi</span>
                  )}
                </div>
                <div className="font-mono text-emerald-400 font-semibold">
                  Tarif / Təklif: {srv.priceUnitLabel}
                </div>
                <div className="text-[10px] text-slate-500">{srv.pricingNote}</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openOrderModal(srv)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition"
              >
                Ətraflı Bax və Sifariş Et
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Tracking System (Sifariş İzləmə Sistemi) */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-400" />
              Sifariş İzləmə Sistemi (Canlı Status və Tarixçə)
            </h3>
            <p className="text-xs text-slate-400">
              Sifarişlərinizin statusu dəyişdikdə avtomatik olaraq Bildirişlər Mərkəzinə məlumat göndərilir
            </p>
          </div>
          <span className="font-mono text-xs text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
            Aktiv Sifarişlər: {serviceOrders.length}
          </span>
        </div>

        <div className="space-y-4">
          {serviceOrders.map((ord) => (
            <div
              key={ord.id}
              className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      #{ord.orderNumber}
                    </span>
                    <span className="text-sm font-bold text-slate-100">{ord.serviceTitle}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Sahə: <strong className="text-slate-200">{ord.parcelName}</strong> ({ord.areaHa}{" "}
                    ha) • Bitki: <strong className="text-slate-200">{ord.crop}</strong> (
                    {ord.variety}) • Ərazi: {ord.region}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Təminatçı: {ord.providerName} • Qiymət / Tarif:{" "}
                    <span className="font-mono text-emerald-300">{ord.estimatedPriceNote}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ord.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : ord.status === "cancelled"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    }`}
                  >
                    {ord.statusLabel}
                  </span>

                  {/* Status Progression Control for testing & provider workflow */}
                  <select
                    aria-label="Sifariş statusunu dəyiş"
                    value={ord.status}
                    onChange={(e) =>
                      onAction("update_service_order_status", {
                        orderId: ord.id,
                        status: e.target.value as OrderStatus,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
                  >
                    <option value="submitted">1. Sifariş Göndərildi</option>
                    <option value="confirmed">2. Təsdiqləndi</option>
                    <option value="in_progress">3. Briqada / Mütəxəssis Yoldadır</option>
                    <option value="lab_or_field_execution">4. Sahədə / Laboratoriyada İcra</option>
                    <option value="completed">5. Tamamlandı (Hesabat Təhvil)</option>
                    <option value="cancelled">Ləğv Edildi</option>
                  </select>
                </div>
              </div>

              {/* Timeline Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                {ord.timeline.map((step, i) => (
                  <div
                    key={step.timestamp + i}
                    className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                      <span>✓ {step.label}</span>
                      <span className="font-mono text-[10px] text-slate-500">{step.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">{step.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Service Inspection & Order Modal */}
      {activeServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#111827] p-6 shadow-2xl my-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">
                  {activeServiceModal.categoryLabel}
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  {activeServiceModal.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Təminatçı: <strong className="text-slate-200">{activeServiceModal.providerName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveServiceModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs text-slate-300 space-y-2 mb-4">
              <p className="leading-relaxed">{activeServiceModal.fullDescription}</p>
              <div className="pt-2 border-t border-slate-800">
                <strong className="text-emerald-400">Təhvil verilən nəticələr:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                  {activeServiceModal.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 border-t border-slate-800 flex flex-wrap justify-between gap-2 font-mono">
                <span className="text-emerald-300 font-bold">
                  Tarif: {activeServiceModal.priceUnitLabel}
                </span>
                <span className="text-slate-400">Müddət: {activeServiceModal.turnaroundTime}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-100 text-sm">
                Xidmət Sifarişi Forması (Sahə Parametrləri)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Sahəni seçin *</label>
                  <select
                    value={orderParcelId}
                    onChange={(e) => handleParcelChangeInForm(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  >
                    {parcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name} ({p.areaHa} ha)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Yerləşdiyi ərazi (Rayon/Kənd) *</label>
                  <input
                    required
                    type="text"
                    value={orderRegion}
                    onChange={(e) => setOrderRegion(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Hektar ölçüsü (ha) *</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={orderAreaHa}
                    onChange={(e) => setOrderAreaHa(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Əkilən bitki *</label>
                  <input
                    required
                    type="text"
                    value={orderCrop}
                    onChange={(e) => setOrderCrop(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Sort və ya hibrid *</label>
                  <input
                    required
                    type="text"
                    value={orderVariety}
                    onChange={(e) => setOrderVariety(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Arzuolunan tarix</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Əlavə aqronomik qeydlər (simptomlar, nümunə sayı, preparat və s.)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Sahə üzrə xüsusi qeydlərinizi daxil edin..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                />
              </div>

              {activeServiceModal.pricingType === "fixed_per_ha" &&
                activeServiceModal.priceAmountAzn && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 font-mono text-xs text-emerald-300">
                    Hesablanan təxmini xidmət dəyəri:{" "}
                    <strong>
                      {(
                        (parseFloat(orderAreaHa) || 0) * activeServiceModal.priceAmountAzn
                      ).toFixed(2)}{" "}
                      AZN
                    </strong>{" "}
                    ({orderAreaHa} ha × {activeServiceModal.priceAmountAzn} AZN/ha)
                  </div>
                )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveServiceModal(null)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700"
                >
                  Bağla
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  Sifarişi Təsdiqlə və Göndər
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
