import { NextRequest, NextResponse } from "next/server";
import { readDatabase, writeDatabase } from "@/lib/db";
import { calculatePolygonAreaHectares, evaluateCropRotationAndSoil } from "@/lib/agronomy-engine";
import {
  AgroCalendarTask,
  CommunityComment,
  CommunityPost,
  FarmerNotification,
  FertilizationRecord,
  HarvestRecord,
  MarketplaceOrder,
  MarketplaceProduct,
  OrderStatus,
  Parcel,
  ServiceOrder,
  SoilAnalysisResult,
  SprayingRecord,
} from "@/types/agro";

export async function GET() {
  const db = readDatabase();
  return NextResponse.json(db);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const db = readDatabase();

    switch (action) {
      case "switch_user_role": {
        const { userId } = payload;
        const found = db.users.find((u) => u.id === userId);
        if (found) {
          db.activeUserId = found.id;
        }
        break;
      }

      case "update_user_profile": {
        const { id, name, phone, email, farmName, region } = payload;
        const user = db.users.find((u) => u.id === (id || db.activeUserId));
        if (user) {
          if (name) user.name = name;
          if (phone) user.phone = phone;
          if (email) user.email = email;
          if (farmName) user.farmName = farmName;
          if (region) user.region = region;
        }
        break;
      }

      case "create_parcel": {
        const coords: [number, number][] =
          Array.isArray(payload.polygonCoords) && payload.polygonCoords.length >= 3
            ? payload.polygonCoords
            : [
                [Number(payload.centerLat) + 0.003, Number(payload.centerLon) - 0.004],
                [Number(payload.centerLat) + 0.003, Number(payload.centerLon) + 0.004],
                [Number(payload.centerLat) - 0.003, Number(payload.centerLon) + 0.004],
                [Number(payload.centerLat) - 0.003, Number(payload.centerLon) - 0.004],
              ];
        const computedHa = calculatePolygonAreaHectares(coords);
        const areaHa =
          Number(payload.areaHa) > 0 ? Number(payload.areaHa) : computedHa > 0 ? computedHa : 25.0;

        const newParcel: Parcel = {
          id: `parcel-${Date.now()}`,
          farmerId: db.activeUserId,
          name: payload.name || "Yeni Kənd Təsərrüfatı Sahəsi",
          code: payload.code || `AO-${Math.floor(10 + Math.random() * 89)}`,
          region: payload.region || "Azərbaycan",
          centerLat: Number(payload.centerLat) || coords[0][0],
          centerLon: Number(payload.centerLon) || coords[0][1],
          polygonCoords: coords,
          areaHa,
          previousCrop: payload.previousCrop || "Dincə qoyulmuş sahə",
          previousVariety: payload.previousVariety || "-",
          currentCrop: payload.currentCrop || "Payızlıq Buğda",
          variety: payload.variety || "Yerli Sort",
          plantingDate: payload.plantingDate || new Date().toISOString().split("T")[0],
          expectedHarvestDate: payload.expectedHarvestDate || "2027-06-20",
          seedingRate: payload.seedingRate || "200 kq/ha",
          phenologicalStage: payload.phenologicalStage || "BBCH 11 (İlk çıxış fazası)",
          irrigationMethod: payload.irrigationMethod || "Pivot (Dairəvi)",
          lastIrrigationDate: payload.lastIrrigationDate || new Date().toISOString().split("T")[0],
          soilAnalysis: payload.soilAnalysis || null,
          fertilizationHistory: [],
          sprayingHistory: [],
          harvestHistory: [],
          baselineNdvi: Number(payload.baselineNdvi) || 0.58,
          baselineNdre: Number(payload.baselineNdre) || 0.36,
          baselineNdmi: Number(payload.baselineNdmi) || 0.28,
          notes: payload.notes || "",
        };

        db.parcels.unshift(newParcel);

        const rot = evaluateCropRotationAndSoil(newParcel);
        const notif: FarmerNotification = {
          id: `notif-${Date.now()}`,
          parcelId: newParcel.id,
          parcelName: newParcel.name,
          type: rot.compatibilityStatus === "critical" ? "risk_escalation" : "satellite_anomaly",
          typeLabel: "Yeni Sahə Qeydiyyatı & Rotasiya Təhlili",
          severity:
            rot.compatibilityStatus === "critical"
              ? "red"
              : rot.compatibilityStatus === "warning"
              ? "orange"
              : "green",
          title: `${newParcel.name} (${newParcel.areaHa} ha) sistemə əlavə edildi`,
          message: `${rot.compatibilityLabel}: ${rot.agronomicAnalysis}`,
          dataSource: "AgroOrbit Kadastr və Rotasiya Mühərriki",
          createdAt: new Date().toISOString(),
          read: false,
        };
        db.notifications.unshift(notif);
        break;
      }

      case "update_parcel": {
        const idx = db.parcels.findIndex((p) => p.id === payload.id);
        if (idx !== -1) {
          db.parcels[idx] = {
            ...db.parcels[idx],
            ...payload,
          };
        }
        break;
      }

      case "delete_parcel": {
        db.parcels = db.parcels.filter((p) => p.id !== payload.parcelId);
        break;
      }

      case "save_soil_analysis": {
        const parcel = db.parcels.find((p) => p.id === payload.parcelId);
        if (parcel) {
          const soil: SoilAnalysisResult = {
            id: `soil-${Date.now()}`,
            sampleDate: payload.sampleDate || new Date().toISOString().split("T")[0],
            laboratoryName: payload.laboratoryName || "AqroLab Mərkəzi Laboratoriya",
            ph: Number(payload.ph),
            salinityEc: Number(payload.salinityEc),
            humusPercent: Number(payload.humusPercent),
            nitrogenMgKg: Number(payload.nitrogenMgKg),
            phosphorusMgKg: Number(payload.phosphorusMgKg),
            potassiumMgKg: Number(payload.potassiumMgKg),
            soilTexture: payload.soilTexture || "Orta gillicəli",
            limePercent: payload.limePercent ? Number(payload.limePercent) : undefined,
            notes: payload.notes || "",
          };
          parcel.soilAnalysis = soil;

          if (soil.salinityEc >= 2.5 || soil.ph > 8.1) {
            db.notifications.unshift({
              id: `notif-${Date.now()}`,
              parcelId: parcel.id,
              parcelName: parcel.name,
              type: "risk_escalation",
              typeLabel: "Torpaq Analizi Riski",
              severity: soil.salinityEc >= 4.0 ? "red" : "orange",
              title: `${parcel.name}: Torpaq Analizində Duzluluq/pH Xəbərdarlığı`,
              message: `Yeni daxil edilmiş analizdə pH=${soil.ph}, EC=${soil.salinityEc} dS/m qeydə alındı. Qış yuma və ya fizioloji turş gübrə rejimi tələb olunur.`,
              dataSource: soil.laboratoryName,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
        }
        break;
      }

      case "add_fertilization_record": {
        const parcel = db.parcels.find((p) => p.id === payload.parcelId);
        if (parcel) {
          const rec: FertilizationRecord = {
            id: `fert-${Date.now()}`,
            date: payload.date || new Date().toISOString().split("T")[0],
            fertilizerName: payload.fertilizerName,
            npkRatio: payload.npkRatio || "-",
            rateKgHa: Number(payload.rateKgHa),
            method: payload.method || "Səthi",
            stage: payload.stage || parcel.phenologicalStage,
            costAzn: Number(payload.costAzn) || 0,
            notes: payload.notes || "",
          };
          parcel.fertilizationHistory.unshift(rec);
        }
        break;
      }

      case "add_spraying_record": {
        const parcel = db.parcels.find((p) => p.id === payload.parcelId);
        if (parcel) {
          const rec: SprayingRecord = {
            id: `spray-${Date.now()}`,
            date: payload.date || new Date().toISOString().split("T")[0],
            productName: payload.productName,
            activeIngredient: payload.activeIngredient || "-",
            targetPestOrDisease: payload.targetPestOrDisease,
            dosePerHa: payload.dosePerHa,
            method: payload.method || "Dronla",
            phiDays: Number(payload.phiDays) || 14,
            operatorName: payload.operatorName || "Təsərrüfat Operatoru",
            notes: payload.notes || "",
          };
          parcel.sprayingHistory.unshift(rec);
        }
        break;
      }

      case "add_harvest_record": {
        const parcel = db.parcels.find((p) => p.id === payload.parcelId);
        if (parcel) {
          const totalTons = Number(payload.totalTons) || 0;
          const yieldCentnerPerHa =
            Number(payload.yieldCentnerPerHa) > 0
              ? Number(payload.yieldCentnerPerHa)
              : parcel.areaHa > 0
              ? Math.round(((totalTons * 10) / parcel.areaHa) * 10) / 10
              : 0;
          const rec: HarvestRecord = {
            id: `harv-${Date.now()}`,
            year: Number(payload.year) || new Date().getFullYear(),
            season: payload.season || `${new Date().getFullYear()} Mövsümü`,
            crop: payload.crop || parcel.currentCrop,
            variety: payload.variety || parcel.variety,
            totalTons,
            yieldCentnerPerHa,
            moisturePercent: Number(payload.moisturePercent) || 12.0,
            qualityGrade: payload.qualityGrade || "I Dərəcə",
            revenueAzn: Number(payload.revenueAzn) || 0,
            notes: payload.notes || "",
          };
          parcel.harvestHistory.unshift(rec);
        }
        break;
      }

      case "create_service_order": {
        const srv = db.services.find((s) => s.id === payload.serviceId);
        const parcel = db.parcels.find((p) => p.id === payload.parcelId);
        const activeUser = db.users.find((u) => u.id === db.activeUserId) || db.users[0];
        const areaHa = Number(payload.areaHa) || parcel?.areaHa || 10;

        let estimatedPriceNote = srv?.priceUnitLabel || "Sorğu əsasında təklif";
        if (srv?.pricingType === "fixed_per_ha" && srv.priceAmountAzn) {
          const total = Math.round(areaHa * srv.priceAmountAzn * 100) / 100;
          estimatedPriceNote = `${total} AZN (${areaHa} ha × ${srv.priceAmountAzn} AZN/ha rəsmi tarif)`;
        } else if (srv?.pricingType === "fixed_per_sample" && srv.priceAmountAzn) {
          estimatedPriceNote = `${srv.priceAmountAzn} AZN (${srv.priceUnitLabel})`;
        }

        const nowIso = new Date().toISOString();
        const orderNumber = `AO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

        const newOrder: ServiceOrder = {
          id: `ord-${Date.now()}`,
          orderNumber,
          serviceId: srv?.id || payload.serviceId,
          serviceTitle: srv?.title || payload.serviceTitle || "Aqrar Xidmət",
          serviceCategory: srv?.category || "analysis",
          providerName: srv?.providerName || "AgroOrbit Təminatçı Mərkəzi",
          farmerId: activeUser.id,
          farmerName: payload.farmerName || activeUser.name,
          farmerPhone: payload.farmerPhone || activeUser.phone,
          parcelId: parcel?.id || payload.parcelId || "custom",
          parcelName: payload.parcelName || parcel?.name || "Fərdi Sahə",
          region: payload.region || parcel?.region || activeUser.region,
          areaHa,
          crop: payload.crop || parcel?.currentCrop || "-",
          variety: payload.variety || parcel?.variety || "-",
          preferredDate: payload.preferredDate || nowIso.split("T")[0],
          notes: payload.notes || "",
          estimatedPriceNote,
          status: "submitted",
          statusLabel: "Sifariş Göndərildi (Baxılır)",
          createdAt: nowIso,
          updatedAt: nowIso,
          timeline: [
            {
              status: "submitted",
              label: "Sifariş qeydiyyata alındı",
              timestamp: nowIso.replace("T", " ").slice(0, 16),
              note: `${payload.parcelName || parcel?.name || "Sahə"} (${areaHa} ha, ${
                payload.crop || parcel?.currentCrop
              } — ${payload.variety || parcel?.variety}) üzrə müraciət yaradıldı.`,
            },
          ],
        };

        db.serviceOrders.unshift(newOrder);

        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          parcelId: newOrder.parcelId,
          parcelName: newOrder.parcelName,
          type: "order_status",
          typeLabel: "Yeni Xidmət Sifarişi",
          severity: "green",
          title: `Sifariş #${newOrder.orderNumber} yaradıldı: ${newOrder.serviceTitle}`,
          message: `${newOrder.parcelName} (${newOrder.areaHa} ha) üçün sifarişiniz '${newOrder.providerName}' tərəfindən qəbul edildi.`,
          dataSource: "AgroOrbit Xidmət və Analiz Mərkəzi",
          createdAt: nowIso,
          read: false,
        });
        break;
      }

      case "update_service_order_status": {
        const { orderId, status, note } = payload as {
          orderId: string;
          status: OrderStatus;
          note?: string;
        };
        const order = db.serviceOrders.find((o) => o.id === orderId);
        if (order) {
          const statusMap: Record<OrderStatus, string> = {
            submitted: "Sifariş Göndərildi",
            confirmed: "Təsdiqləndi — İcraya Hazırlanır",
            in_progress: "Briqada / Mütəxəssis Yoldadır",
            lab_or_field_execution: "Sahədə / Laboratoriyada İcra Olunur",
            completed: "Tamamlandı — Hesabat Təhvil Verildi",
            cancelled: "Ləğv Edildi",
          };
          const nowIso = new Date().toISOString();
          order.status = status;
          order.statusLabel = statusMap[status] || status;
          order.updatedAt = nowIso;
          order.timeline.push({
            status,
            label: order.statusLabel,
            timestamp: nowIso.replace("T", " ").slice(0, 16),
            note: note || `Sifariş statusu '${order.statusLabel}' olaraq yeniləndi.`,
          });

          db.notifications.unshift({
            id: `notif-${Date.now()}`,
            parcelId: order.parcelId,
            parcelName: order.parcelName,
            type: "order_status",
            typeLabel: "Xidmət Sifarişi Statusu Dəyişdi",
            severity: status === "completed" ? "green" : status === "cancelled" ? "orange" : "yellow",
            title: `Sifariş #${order.orderNumber}: ${order.statusLabel}`,
            message: `${order.serviceTitle} (${order.parcelName}) üzrə status yeniləndi: ${
              note || order.statusLabel
            }`,
            dataSource: order.providerName,
            createdAt: nowIso,
            read: false,
          });
        }
        break;
      }

      case "create_calendar_task": {
        const parcel = db.parcels.find((p) => p.id === payload.parcelId);
        const task: AgroCalendarTask = {
          id: `cal-${Date.now()}`,
          parcelId: parcel?.id || payload.parcelId || "parcel-1",
          parcelName: parcel?.name || payload.parcelName || "Sahə",
          crop: payload.crop || parcel?.currentCrop || "Payızlıq Buğda",
          variety: payload.variety || parcel?.variety || "-",
          phenologicalStage:
            payload.phenologicalStage || parcel?.phenologicalStage || "Cari inkişaf mərhələsi",
          taskType: payload.taskType || "scouting",
          taskTypeLabel: payload.taskTypeLabel || "Aqrar Əməliyyat",
          title: payload.title,
          scheduledDate: payload.scheduledDate || new Date().toISOString().split("T")[0],
          priority: payload.priority || "medium",
          status: "planned",
          notes: payload.notes || "",
        };
        db.calendarTasks.unshift(task);

        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          parcelId: task.parcelId,
          parcelName: task.parcelName,
          type: "calendar_due",
          typeLabel: "Aqrar Təqvim Planlaması",
          severity: task.priority === "urgent" ? "red" : task.priority === "high" ? "orange" : "green",
          title: `Yeni Təqvim İşi (${task.scheduledDate}): ${task.title}`,
          message: `${task.parcelName} (${task.phenologicalStage}) üçün '${task.taskTypeLabel}' əməliyyatı təqvimə əlavə olundu.`,
          dataSource: "AgroOrbit Aqrar Təqvim",
          createdAt: new Date().toISOString(),
          read: false,
        });
        break;
      }

      case "toggle_calendar_task": {
        const task = db.calendarTasks.find((t) => t.id === payload.taskId);
        if (task) {
          task.status = task.status === "completed" ? "planned" : "completed";
        }
        break;
      }

      case "mark_notifications_read": {
        if (payload?.notificationId) {
          const n = db.notifications.find((x) => x.id === payload.notificationId);
          if (n) n.read = true;
        } else {
          db.notifications.forEach((n) => {
            n.read = true;
          });
        }
        break;
      }

      case "create_marketplace_product": {
        const activeUser = db.users.find((u) => u.id === db.activeUserId) || db.users[0];
        const prod: MarketplaceProduct = {
          id: `mp-${Date.now()}`,
          title: payload.title,
          category: payload.category || "seeds",
          categoryLabel: payload.categoryLabel || "Aqrar Məhsul",
          sellerId: activeUser.id,
          sellerName: payload.sellerName || activeUser.farmName || activeUser.name,
          sellerVerified: activeUser.verified,
          region: payload.region || activeUser.region,
          priceAzn: payload.isQuoteOnly ? null : Number(payload.priceAzn) || null,
          priceUnit: payload.priceUnit || "AZN",
          isQuoteOnly: Boolean(payload.isQuoteOnly),
          stockStatus: payload.stockStatus || "in_stock",
          specifications: payload.specifications || { "Mənşə": "Azərbaycan", "Zəmanət": "Rəsmi" },
          description: payload.description || "",
          compatibleCrops: Array.isArray(payload.compatibleCrops)
            ? payload.compatibleCrops
            : ["Bütün bitkilər"],
          createdAt: new Date().toISOString().split("T")[0],
        };
        db.marketplaceProducts.unshift(prod);
        break;
      }

      case "create_marketplace_order": {
        const prod = db.marketplaceProducts.find((p) => p.id === payload.productId);
        const activeUser = db.users.find((u) => u.id === db.activeUserId) || db.users[0];
        const qty = Number(payload.quantity) || 1;
        const totalPriceNote =
          prod && prod.priceAzn !== null
            ? `${Math.round(prod.priceAzn * qty * 100) / 100} AZN (${qty} × ${prod.priceAzn} ${
                prod.priceUnit
              })`
            : "Satıcı tərəfindən fərdi qiymət təklifi göndəriləcək";

        const mOrder: MarketplaceOrder = {
          id: `mord-${Date.now()}`,
          orderNumber: `MP-${Math.floor(1000 + Math.random() * 9000)}`,
          productId: prod?.id || payload.productId,
          productTitle: prod?.title || payload.productTitle,
          sellerName: prod?.sellerName || "Satıcı",
          buyerName: payload.buyerName || activeUser.name,
          buyerPhone: payload.buyerPhone || activeUser.phone,
          parcelName: payload.parcelName,
          quantity: qty,
          unit: prod?.priceUnit || "ədəd",
          totalPriceNote,
          deliveryRegion: payload.deliveryRegion || activeUser.region,
          status: "pending",
          createdAt: new Date().toISOString().split("T")[0],
        };
        db.marketplaceOrders.unshift(mOrder);

        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          type: "order_status",
          typeLabel: "Marketplace Sifarişi",
          severity: "green",
          title: `Marketplace Sifarişi #${mOrder.orderNumber}: ${mOrder.productTitle}`,
          message: `Miqdar: ${qty} | Çatdırılma: ${mOrder.deliveryRegion} | Məbləğ: ${totalPriceNote}`,
          dataSource: "AgroOrbit Marketplace",
          createdAt: new Date().toISOString(),
          read: false,
        });
        break;
      }

      case "create_community_post": {
        const activeUser = db.users.find((u) => u.id === db.activeUserId) || db.users[0];
        const post: CommunityPost = {
          id: `post-${Date.now()}`,
          authorId: activeUser.id,
          authorName: activeUser.name,
          authorRole: activeUser.role,
          authorRoleLabel: activeUser.roleLabel,
          authorRegion: activeUser.region,
          isVerifiedAgronomist: activeUser.role === "agronomist",
          cropCategory: payload.cropCategory || "Ümumi Əkinçilik",
          problemCategory: payload.problemCategory || "Aqrotexniki Məsləhət",
          title: payload.title,
          content: payload.content,
          imageDataUrl: payload.imageDataUrl || undefined,
          imageCaption: payload.imageCaption || undefined,
          parcelSummary: payload.parcelSummary || undefined,
          likesCount: 1,
          createdAt: new Date().toISOString(),
          comments: [],
        };
        db.communityPosts.unshift(post);
        break;
      }

      case "add_community_comment": {
        const post = db.communityPosts.find((p) => p.id === payload.postId);
        const activeUser = db.users.find((u) => u.id === db.activeUserId) || db.users[0];
        if (post) {
          const comment: CommunityComment = {
            id: `comm-${Date.now()}`,
            authorName: activeUser.name,
            authorRole: activeUser.role,
            authorRoleLabel: activeUser.roleLabel,
            authorRegion: activeUser.region,
            isVerifiedAgronomist: activeUser.role === "agronomist",
            content: payload.content,
            createdAt: new Date().toISOString(),
          };
          post.comments.push(comment);
        }
        break;
      }

      case "like_community_post": {
        const post = db.communityPosts.find((p) => p.id === payload.postId);
        if (post) {
          post.likesCount += 1;
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Naməlum əməliyyat: ${action}` }, { status: 400 });
    }

    writeDatabase(db);
    return NextResponse.json(db);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Məlumat bazası əməliyyatında xəta baş verdi.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
