"use client";

import React, { useState } from "react";
import {
  CommunityPost,
  MarketplaceCategory,
  MarketplaceOrder,
  MarketplaceProduct,
  Parcel,
  UserProfile,
} from "@/types/agro";
import {
  ShoppingBag,
  Users,
  Search,
  Plus,
  CheckCircle2,
  MessageSquare,
  ThumbsUp,
  Award,
  Camera,
  Trophy,
  Store,
} from "lucide-react";

interface MarketplaceCommunityViewProps {
  mode: "marketplace" | "community" | "comparison";
  products: MarketplaceProduct[];
  marketplaceOrders: MarketplaceOrder[];
  communityPosts: CommunityPost[];
  selectedParcel: Parcel;
  activeUser: UserProfile;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<void>;
}

const MARKET_CATEGORIES: Array<{ id: MarketplaceCategory | "all"; label: string }> = [
  { id: "all", label: "Bütün Kateqoriyalar" },
  { id: "seeds", label: "Toxum" },
  { id: "fertilizers", label: "Gübrə" },
  { id: "crop_protection", label: "Bitki mühafizə vasitələri" },
  { id: "machinery", label: "Kənd təsərrüfatı texnikası" },
  { id: "irrigation_equipment", label: "Suvarma avadanlıqları" },
  { id: "drones_parts", label: "Dronlar və ehtiyat hissələri" },
  { id: "agro_services", label: "Aqrar xidmətlər" },
];

export default function MarketplaceCommunityView({
  mode,
  products,
  communityPosts,
  selectedParcel,
  activeUser,
  onAction,
}: MarketplaceCommunityViewProps) {
  // Marketplace state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<MarketplaceCategory | "all">("all");
  const [showSellerCabinet, setShowSellerCabinet] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<MarketplaceProduct | null>(null);
  const [orderQty, setOrderQty] = useState("2");
  const [orderRegion, setOrderRegion] = useState(selectedParcel.region);

  // Seller Cabinet Form
  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdCat, setNewProdCat] = useState<MarketplaceCategory>("seeds");
  const [newProdPrice, setNewProdPrice] = useState("780");
  const [newProdUnit, setNewProdUnit] = useState("AZN / ton");
  const [newProdDesc, setNewProdDesc] = useState("");

  // Community state
  const [cropFilter, setCropFilter] = useState("all");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostCrop, setNewPostCrop] = useState(selectedParcel.currentCrop);
  const [newPostProb, setNewPostProb] = useState("Gübrələmə və Torpaq");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImageUrl, setNewPostImageUrl] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCat === "all" || p.category === selectedCat;
    const matchSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitle.trim()) return;
    const catLabel =
      MARKET_CATEGORIES.find((c) => c.id === newProdCat)?.label || "Aqrar Məhsul";
    await onAction("create_marketplace_product", {
      title: newProdTitle,
      category: newProdCat,
      categoryLabel: catLabel,
      priceAzn: parseFloat(newProdPrice) || null,
      priceUnit: newProdUnit,
      description: newProdDesc,
      region: activeUser.region,
    });
    setNewProdTitle("");
    setNewProdDesc("");
    setShowSellerCabinet(false);
  };

  const handlePlaceProductOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductModal) return;
    await onAction("create_marketplace_order", {
      productId: selectedProductModal.id,
      productTitle: selectedProductModal.title,
      quantity: parseFloat(orderQty) || 1,
      deliveryRegion: orderRegion,
      parcelName: selectedParcel.name,
    });
    setSelectedProductModal(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewPostImageUrl(String(ev.target?.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    await onAction("create_community_post", {
      cropCategory: newPostCrop,
      problemCategory: newPostProb,
      title: newPostTitle,
      content: newPostContent,
      imageDataUrl: newPostImageUrl || undefined,
      parcelSummary: `${selectedParcel.name} (${selectedParcel.areaHa} ha, ${selectedParcel.currentCrop} - ${selectedParcel.variety})`,
    });
    setNewPostTitle("");
    setNewPostContent("");
    setNewPostImageUrl("");
  };

  const handleAddComment = async (postId: string) => {
    const txt = (commentInputs[postId] || "").trim();
    if (!txt) return;
    await onAction("add_community_comment", {
      postId,
      content: txt,
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  if (mode === "marketplace") {
    return (
      <div className="space-y-6">
        {/* Top Marketplace Search, Filter & Seller Cabinet Toggle */}
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                Aqrar Marketplace (Toxum, Gübrə, Mühafizə Vasitələri, Texnika və Dronlar)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Sertifikatlı təchizatçılar, AKİA fermer kartı dəstəkli məhsullar, satıcı kabineti və birbaşa sifariş sistemi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-240px">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Məhsul, sort, təsiredici maddə, texnika və ya rayon üzrə axtar..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MARKET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedCat === cat.id
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seller Cabinet Form */}
          {showSellerCabinet && (
            <form
              onSubmit={handleCreateListing}
              className="rounded-xl border border-emerald-500/40 bg-slate-950/90 p-4 space-y-3 text-xs"
            >
              <div className="font-bold text-emerald-400 text-sm">
                Satıcı Kabineti — Marketplace-ə Yeni Məhsul / Texnika Əlavə Et ({activeUser.name})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Məhsulun / Texnikanın adı *</label>
                  <input
                    required
                    type="text"
                    value={newProdTitle}
                    onChange={(e) => setNewProdTitle(e.target.value)}
                    placeholder="Məs: Karbamid N46% (50 kq kisə) və ya John Deere 6155M"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Kateqoriya</label>
                  <select
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value as MarketplaceCategory)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  >
                    {MARKET_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Qiymət (AZN)</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Ölçü vahidi / şərt</label>
                  <input
                    type="text"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Texniki təsvir və sertifikat məlumatı</label>
                  <input
                    type="text"
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Məhsulun xüsusiyyətləri..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Məhsulu Marketplace-də Dərc Et
              </button>
            </form>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#111827] p-5 hover:border-emerald-500/40 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    {prod.categoryLabel}
                  </span>
                  <span className="text-[11px] text-slate-400">{prod.region}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-100 leading-snug">{prod.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {prod.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[11px]">
                  {Object.entries(prod.specifications).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-slate-400">{k}:</span>
                      <span className="text-slate-200 font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-base font-bold text-emerald-400">
                    {prod.priceAzn !== null ? `${prod.priceAzn.toLocaleString()} AZN` : "Təkliflə"}
                  </div>
                  <div className="text-[10px] text-slate-400">{prod.priceUnit}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductModal(prod)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Sifariş Et
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Product Order Modal */}
        {selectedProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111827] p-6 shadow-2xl">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-bold text-slate-100">
                  {selectedProductModal.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedProductModal(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Satıcı: <strong className="text-slate-200">{selectedProductModal.sellerName}</strong>{" "}
                ({selectedProductModal.region})
              </p>

              <form onSubmit={handlePlaceProductOrder} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Miqdar / Say</label>
                    <input
                      type="number"
                      min="1"
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Çatdırılma ünvanı / rayon</label>
                    <input
                      type="text"
                      value={orderRegion}
                      onChange={(e) => setOrderRegion(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedProductModal(null)}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-slate-300"
                  >
                    Ləğv et
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
                  >
                    Sifarişi Təsdiqlə
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === "community") {
    const filteredPosts =
      cropFilter === "all"
        ? communityPosts
        : communityPosts.filter((p) => p.cropCategory === cropFilter);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: New Question / Photo Share Form & Profiles */}
        <div className="lg:col-span-4 space-y-4">
          <form
            onSubmit={handleCreatePost}
            className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Fermer İcmasında Sual Ver & Şəkil Paylaş
            </h3>
            <p className="text-slate-400 text-[11px]">
              Aktiv profil: <strong className="text-emerald-300">{activeUser.name}</strong> (
              {activeUser.roleLabel})
            </p>

            <div>
              <label className="block text-slate-400 mb-1">Mövzu başlığı *</label>
              <input
                required
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Sual və ya müşahidənizin qısa başlığı..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Bitki kateqoriyası</label>
                <select
                  value={newPostCrop}
                  onChange={(e) => setNewPostCrop(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-slate-100"
                >
                  <option value="Payızlıq Buğda">Payızlıq Buğda</option>
                  <option value="Pambıq">Pambıq</option>
                  <option value="Payızlıq Arpa">Payızlıq Arpa</option>
                  <option value="Yonca">Yonca</option>
                  <option value="İntensiv Alma Bağı">Meyvə Bağı</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Problem kateqoriyası</label>
                <select
                  value={newPostProb}
                  onChange={(e) => setNewPostProb(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-slate-100"
                >
                  <option value="Torpaq şorlaşması və növbəli əkin">Şorlaşma & Rotasiya</option>
                  <option value="Gübrələmə və Peyk Monitorinqi">Gübrələmə & NDVI</option>
                  <option value="Xəstəlik və Zərərvericilər">Xəstəlik & Zərərverici</option>
                  <option value="Suvarma və Quraqlıq">Suvarma & Quraqlıq</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Ətraflı məzmun *</label>
              <textarea
                required
                rows={4}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Sahədəki vəziyyəti, əvvəlki əkini və sualınızı qeyd edin..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 hover:bg-slate-800">
                <Camera className="h-4 w-4 text-emerald-400" />
                Sahədən Şəkil Əlavə Et
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
              {newPostImageUrl && (
                <span className="ml-2 text-emerald-400 text-[11px]">✓ Şəkil əlavə olundu</span>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500"
            >
              İcmada Paylaş
            </button>
          </form>
        </div>

        {/* Right 8 Cols: Community Discussions & Agronomist Advice */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <span className="text-sm font-bold text-slate-100">
              Fermer Müzakirələri və Təsdiqlənmiş Aqronom Məsləhətləri
            </span>
            <div className="flex flex-wrap gap-1.5">
              {["all", "Payızlıq Buğda", "Pambıq", "Payızlıq Arpa", "İntensiv Alma Bağı"].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCropFilter(c)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      cropFilter === c
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {c === "all" ? "Hamısı" : c}
                  </button>
                )
              )}
            </div>
          </div>

          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-300">
                    {post.authorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                      {post.authorName}
                      {post.isVerifiedAgronomist && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300">
                          <Award className="h-3 w-3" /> Təsdiqlənmiş Aqronom Ekspert
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {post.authorRoleLabel} • {post.authorRegion}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-emerald-400 font-medium">
                    {post.cropCategory}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-sky-400">
                    {post.problemCategory}
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-100">{post.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{post.content}</p>

              {post.parcelSummary && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-mono text-[11px] text-emerald-400">
                  Əlaqəli sahə pasportu: {post.parcelSummary}
                </div>
              )}

              {post.imageDataUrl && (
                <div className="overflow-hidden rounded-xl border border-slate-800 max-h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.imageDataUrl}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 border-t border-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => onAction("like_community_post", { postId: post.id })}
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Faydalıdır ({post.likesCount})
                </button>
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Şərhlər və Cavablar ({post.comments.length})
                </span>
              </div>

              {/* Comments list */}
              <div className="space-y-2 pt-2">
                {post.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-3 text-xs ${
                      c.isVerifiedAgronomist
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-100 flex items-center gap-1.5">
                        {c.authorName}
                        {c.isVerifiedAgronomist && (
                          <span className="rounded bg-emerald-500 text-slate-950 px-1.5 py-0.5 text-[10px] font-bold">
                            ✓ Aqronom Rəyi
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">{c.authorRoleLabel}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{c.content}</p>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="Cavab və ya aqronomik tövsiyə yazın..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddComment(post.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Göndər
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // mode === "comparison" (Rəqabətli Üstünlük və Arxitektura Müqayisəsi)
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-slate-100">
            AgroOrbit İnteqrasiya Arxitekturası və Qlobal Aqrar Platformalarla Müqayisə
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-5">
          OneSoil, EOSDA Crop Monitoring, Farmonaut, Syngenta Cropwise və FarmTwin platformalarının funksional modulları araşdırılaraq AgroOrbit-də 8 əsas əməliyyat həlqəsi vahid kabinetdə birləşdirilmişdir (təsdiqlənməmiş reklam iddiaları olmadan, yalnız faktiki funksional modul müqayisəsi):
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-300">
                <th className="py-3 px-3">Funksional Modul (8 Əsas Proses)</th>
                <th className="py-3 px-3 text-emerald-400 font-bold">AgroOrbit</th>
                <th className="py-3 px-3">OneSoil</th>
                <th className="py-3 px-3">EOSDA</th>
                <th className="py-3 px-3">Farmonaut</th>
                <th className="py-3 px-3">Cropwise</th>
                <th className="py-3 px-3">FarmTwin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {[
                {
                  feature: "1. Peyk (NASA HLS/POWER/SMAP) və Dron Monitorinqi",
                  ao: "Tam inteqrasiya (NASA API + RTK Dron sifarişi)",
                  os: "Yalnız Sentinel-2 NDVI",
                  eo: "Peyk indeksləri (dron sifarişi yoxdur)",
                  fm: "Peyk monitorinqi",
                  cw: "Peyk və sahə müşahidəsi",
                  ft: "Peyk NDVI + 3D Dron telemetriya",
                },
                {
                  feature: "2. Əvvəlki/İndiki Əkin, Sort və Rotasiya Analizatoru",
                  ao: "Avtomatik sələf-xələf uyğunluq matrisi ilə",
                  os: "Sadə əkin qeydi",
                  eo: "Rotasiya cədvəli",
                  fm: "Məhdud",
                  cw: "Əkin tarixçəsi",
                  ft: "Parsel məhsul paylanması",
                },
                {
                  feature: "3. İzah Edilə Bilən 4-Rəngli İqlim və Aqronomik Risk Mühərriki",
                  ao: "Yaşıl/Sarı/Narıncı/Qırmızı qayda + mənbə + tarix izahı",
                  os: "Yalnız VRA zonalar",
                  eo: "Hava və vegetasiya xəbərdarlığı",
                  fm: "Ümumi xəbərdarlıq",
                  cw: "Xəstəlik/hava riski",
                  ft: "Kritik telemetriya bildirişləri",
                },
                {
                  feature: "4. Sahə Pasportu və Torpaq Analizinə Bağlı AI Aqronom",
                  ao: "Kontekstual AgroAI (uydurma diaqnoza qarşı qoruma ilə)",
                  os: "Yoxdur",
                  eo: "Ümumi analitika",
                  fm: "Sadə çatbot",
                  cw: "Diaqnostika modulu",
                  ft: "YZ Ziraat Mühendisi",
                },
                {
                  feature: "5. Torpaq, Su, Toxum və Patoloji Laborator Analiz Sifarişi",
                  ao: "6 ixtisaslaşmış analiz + sifariş izləmə sistemi",
                  os: "Yoxdur",
                  eo: "Yoxdur",
                  fm: "Yoxdur",
                  cw: "Xarici inteqrasiya ilə",
                  ft: "Yoxdur",
                },
                {
                  feature: "6. Dron, Aqronom və Texnika/Usta Xidmətlərinə Çıxış",
                  ao: "Dron (5), Aqronom (7) və Operativ Usta servisi",
                  os: "Yoxdur",
                  eo: "Yoxdur",
                  fm: "Yoxdur",
                  cw: "Məsləhətçi modulu",
                  ft: "Daxili donanma idarəetməsi",
                },
                {
                  feature: "7. Aqrar Marketplace (Toxum, Gübrə, Dron) & Satıcı Kabineti",
                  ao: "7 kateqoriyalı bazar + Satıcı kabineti + Fermer icması",
                  os: "Yoxdur",
                  eo: "Yoxdur",
                  fm: "Yoxdur",
                  cw: "Yoxdur",
                  ft: "Anbar/Silo modulu",
                },
                {
                  feature: "8. BBCH Fenoloji Aqrar Təqvim və Ağıllı Bildirişlər",
                  ao: "Bitki mərhələsinə və real telemetriyaya bağlı təqvim",
                  os: "Qeydlər",
                  eo: "Fəaliyyət təqvimi",
                  fm: "Sadə bildirişlər",
                  cw: "Tapşırıq planlayıcı",
                  ft: "Günün saha görəvləri",
                },
              ].map((row) => (
                <tr key={row.feature} className="hover:bg-slate-900/50">
                  <td className="py-3 px-3 font-semibold text-slate-200">{row.feature}</td>
                  <td className="py-3 px-3 font-semibold text-emerald-400 bg-emerald-500/5">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {row.ao}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{row.os}</td>
                  <td className="py-3 px-3 text-slate-400">{row.eo}</td>
                  <td className="py-3 px-3 text-slate-400">{row.fm}</td>
                  <td className="py-3 px-3 text-slate-400">{row.cw}</td>
                  <td className="py-3 px-3 text-slate-300">{row.ft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
