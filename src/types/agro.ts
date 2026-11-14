export type RiskLevel = "green" | "yellow" | "orange" | "red";

export type UserRole = "farmer" | "agronomist" | "provider" | "admin";

export type ThemeMode = "tarla" | "obsidyen" | "krem";

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  roleLabel: string;
  farmName: string;
  region: string;
  verified: boolean;
  walletBalanceAzn: number;
  avatar?: string;
}

export interface SoilAnalysisResult {
  id: string;
  sampleDate: string;
  laboratoryName: string;
  ph: number; // e.g. 6.8 - 8.2
  salinityEc: number; // dS/m
  humusPercent: number; // %
  nitrogenMgKg: number; // N (mq/kq)
  phosphorusMgKg: number; // P2O5 (mq/kq)
  potassiumMgKg: number; // K2O (mq/kq)
  soilTexture: string; // Gilli-qumlu, Ağır gilli, Orta gillicəli və s.
  limePercent?: number; // CaCO3 %
  notes: string;
}

export interface FertilizationRecord {
  id: string;
  date: string;
  fertilizerName: string;
  npkRatio: string;
  rateKgHa: number;
  method: string; // Səthi, Fertiqasiya, Dronla, Lokal lentvari
  stage: string;
  costAzn: number;
  notes: string;
}

export interface SprayingRecord {
  id: string;
  date: string;
  productName: string;
  activeIngredient: string;
  targetPestOrDisease: string;
  dosePerHa: string; // e.g. 0.5 L/ha or 250 q/ha
  method: "Dronla" | "Traktor çiləyicisi" | "Əl çiləyicisi";
  phiDays: number; // Gözləmə müddəti (gün)
  operatorName: string;
  notes: string;
}

export interface HarvestRecord {
  id: string;
  year: number;
  season: string;
  crop: string;
  variety: string;
  totalTons: number;
  yieldCentnerPerHa: number; // sentner/ha (1 ton = 10 sentner)
  moisturePercent: number;
  qualityGrade: string;
  revenueAzn: number;
  notes: string;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][]; // [[[lon, lat], ...]]
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: {
    parcelId: string;
    name: string;
    crop: string;
    variety: string;
    areaHa: number;
    region: string;
  };
  geometry: GeoJSONPolygon;
}

export interface Parcel {
  id: string;
  farmerId: string;
  name: string;
  code: string;
  region: string; // e.g. "Beyləqan r., Mil düzü"
  centerLat: number;
  centerLon: number;
  polygonCoords: [number, number][]; // [[lat, lon], ...]
  areaHa: number;
  previousCrop: string;
  previousVariety: string;
  currentCrop: string;
  variety: string; // Sort və ya hibrid
  plantingDate: string;
  expectedHarvestDate: string;
  seedingRate: string; // Məs: "220 kq/ha" və ya "75,000 toxum/ha"
  phenologicalStage: string; // BBCH mərhələsi
  irrigationMethod: "Pivot (Dairəvi)" | "Damcı suvarma" | "Şırım üsulu" | "Yağışyağdırma" | "Dəmyə (Suvarılmayan)";
  lastIrrigationDate: string;
  soilAnalysis: SoilAnalysisResult | null;
  fertilizationHistory: FertilizationRecord[];
  sprayingHistory: SprayingRecord[];
  harvestHistory: HarvestRecord[];
  baselineNdvi: number;
  baselineNdre: number;
  baselineNdmi: number;
  notes: string;
}

export interface NasaDailyRecord {
  date: string; // YYYY-MM-DD
  tempAvgC: number | null; // T2M
  tempMaxC: number | null; // T2M_MAX
  tempMinC: number | null; // T2M_MIN
  windSpeedMs: number | null; // WS10M (m/s)
  windSpeedKmh: number | null; // km/h
  windDirectionDeg: number | null; // WD10M (dərəcə)
  windDirectionCardinal: string; // Şm, C, Ş, Q...
  precipitationMm: number | null; // PRECTOTCORR (mm/gün)
  humidityPercent: number | null; // RH2M (%)
  solarRadiationKwhM2: number | null; // ALLSKY_SFC_SW_DWN
  soilMoistureSurface: number | null; // GWETTOP (0-1)
  soilMoistureRoot: number | null; // GWETROOT (0-1)
}

export interface NasaSatelliteGranule {
  id: string;
  title: string;
  collection: "NASA HLS (Sentinel-2 / Landsat)" | "NASA SMAP" | "NASA GPM IMERG" | "Landsat 8/9 OLI";
  datasetShortName: string;
  timeStart: string;
  timeEnd: string;
  cloudCover?: number;
  browseUrl?: string;
  dataUrl?: string;
  spatialResolution: string;
}

export interface SpectralObservation {
  date: string;
  satelliteSource: string; // e.g., "HLS Sentinel-2A (HLSS30 v2.0)" or "HLS Landsat-9 (HLSL30 v2.0)"
  cloudCoverPercent: number;
  ndvi: number; // -1 to 1 (Vegetasiya sıxlığı)
  ndre: number; // -1 to 1 (Xlorofil və Azot)
  ndmi: number; // -1 to 1 (Bitki su stresi / yarpaq rütubəti)
  evi: number; // Enhanced Vegetation Index
  savi: number; // Soil-Adjusted Vegetation Index
  isRealGranulePass: boolean;
  granuleId?: string;
}

export interface NasaTelemetryResponse {
  parcelId: string;
  coordinates: { lat: number; lon: number };
  fetchedAt: string;
  fromCache: boolean;
  sourceInfo: {
    powerSource: string;
    powerSpatialResolution: string;
    powerTemporalLagNote: string;
    gibsSource: string;
    cmrSource: string;
    smapNote: string;
    imergNote: string;
  };
  latestValidRecord: NasaDailyRecord | null;
  summary30Days: {
    avgTempC: number;
    maxTempC: number;
    minTempC: number;
    totalPrecipitationMm: number;
    avgHumidityPercent: number;
    avgWindSpeedKmh: number;
    avgSolarRadiationKwhM2: number;
    avgSoilMoistureRootPercent: number;
    avgSoilMoistureSurfacePercent: number;
    validDaysCount: number;
  };
  dailySeries: NasaDailyRecord[];
  granules: NasaSatelliteGranule[];
  spectralHistory: SpectralObservation[];
}

export interface WeatherForecastDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationSumMm: number;
  precipitationProbPercent: number;
  windSpeedMaxKmh: number;
  windDirectionDominantDeg: number;
  windDirectionCardinal: string;
  et0EvapotranspirationMm: number;
  uvIndexMax: number;
  sprayingSuitability: "optimal" | "caution" | "unsafe";
  sprayingReason: string;
}

export interface WeatherForecastResponse {
  coordinates: { lat: number; lon: number };
  sourceName: string;
  sourceUrl: string;
  updatedAt: string;
  fromCache: boolean;
  current: {
    observationTime: string;
    temperatureC: number;
    relativeHumidityPercent: number;
    windSpeedKmh: number;
    windDirectionDeg: number;
    windDirectionCardinal: string;
    precipitationMm: number;
    soilMoisture0to7cmPercent: number;
    soilMoisture7to28cmPercent: number;
    soilTemperature0cmC: number;
    sprayingWindowStatus: "optimal" | "caution" | "unsafe";
    sprayingWindowNote: string;
  };
  daily7Days: WeatherForecastDay[];
}

export interface AgronomicRiskAssessment {
  id: string;
  parcelId: string;
  parcelName: string;
  category:
    | "drought"
    | "heat_stress"
    | "frost"
    | "vegetation_anomaly"
    | "soil_salinity_ph"
    | "crop_rotation"
    | "wind_spraying"
    | "pest_disease";
  categoryLabel: string;
  level: RiskLevel;
  levelLabel: string; // "Normal (Yaşıl)" | "Diqqət (Sarı)" | "Yüksək Risk (Narıncı)" | "Ciddi Risk (Qırmızı)"
  score: number; // 0 - 100
  title: string;
  explanation: string; // Exact agronomic rule & reasoning
  ruleFormula: string; // e.g., "T_max > 32°C VƏ 14g Yağıntı < 8mm VƏ NDVI < 0.45"
  dataSource: string; // e.g., "NASA POWER + NASA SMAP + HLS Sentinel-2"
  observedDate: string;
  recommendation: string;
}

export interface CropRotationAdvice {
  previousCrop: string;
  currentCrop: string;
  compatibilityStatus: "optimal" | "acceptable" | "warning" | "critical";
  compatibilityLabel: string;
  agronomicAnalysis: string;
  soilImpactNote: string;
  nextSeasonRecommendedCrops: string[];
  fertilizerAdjustmentNote: string;
  phSalinityEvaluation: string;
}

export type ServiceCategory = "analysis" | "agronomist" | "drone" | "machinery";

export interface AgroServiceItem {
  id: string;
  slug: string;
  category: ServiceCategory;
  categoryLabel: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  providerName: string;
  providerVerified: boolean;
  pricingType: "fixed_per_ha" | "fixed_per_sample" | "quote_based";
  priceAmountAzn: number | null;
  priceUnitLabel: string; // e.g. "AZN / nümunə (Standart Lab)" or "AZN / ha (Sorğu əsasında dəqiqləşdirilir)"
  pricingNote: string;
  turnaroundTime: string;
  deliverables: string[];
  requiredInputs: string[];
}

export type OrderStatus =
  | "submitted"
  | "confirmed"
  | "in_progress"
  | "lab_or_field_execution"
  | "completed"
  | "cancelled";

export interface ServiceOrderTimelineStep {
  status: OrderStatus;
  label: string;
  timestamp: string;
  note: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  serviceId: string;
  serviceTitle: string;
  serviceCategory: ServiceCategory;
  providerName: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  parcelId: string;
  parcelName: string;
  region: string;
  areaHa: number;
  crop: string;
  variety: string;
  preferredDate: string;
  notes: string;
  estimatedPriceNote: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  timeline: ServiceOrderTimelineStep[];
}

export type CalendarTaskType =
  | "seeding"
  | "irrigation"
  | "fertilization"
  | "spraying"
  | "harvest"
  | "soil_sampling"
  | "scouting";

export interface AgroCalendarTask {
  id: string;
  parcelId: string;
  parcelName: string;
  crop: string;
  variety: string;
  phenologicalStage: string; // e.g. "BBCH 21-29 (Kollanma)"
  taskType: CalendarTaskType;
  taskTypeLabel: string;
  title: string;
  scheduledDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "planned" | "in_progress" | "completed" | "overdue";
  notes: string;
}

export interface FarmerNotification {
  id: string;
  parcelId?: string;
  parcelName?: string;
  type:
    | "risk_escalation"
    | "weather_shift"
    | "irrigation_need"
    | "satellite_anomaly"
    | "calendar_due"
    | "order_status";
  typeLabel: string;
  severity: RiskLevel;
  title: string;
  message: string;
  dataSource: string;
  createdAt: string;
  read: boolean;
}

export type MarketplaceCategory =
  | "seeds"
  | "fertilizers"
  | "crop_protection"
  | "machinery"
  | "irrigation_equipment"
  | "drones_parts"
  | "agro_services";

export interface MarketplaceProduct {
  id: string;
  title: string;
  category: MarketplaceCategory;
  categoryLabel: string;
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  region: string;
  priceAzn: number | null;
  priceUnit: string; // e.g. "AZN / ton", "AZN / kisə (50 kq)", "Qiymət təklifi ilə"
  isQuoteOnly: boolean;
  stockStatus: "in_stock" | "pre_order" | "available_on_request";
  specifications: Record<string, string>;
  description: string;
  compatibleCrops: string[];
  createdAt: string;
}

export interface MarketplaceOrder {
  id: string;
  orderNumber: string;
  productId: string;
  productTitle: string;
  sellerName: string;
  buyerName: string;
  buyerPhone: string;
  parcelName?: string;
  quantity: number;
  unit: string;
  totalPriceNote: string;
  deliveryRegion: string;
  status: "pending" | "confirmed" | "shipped" | "delivered";
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  authorRoleLabel: string;
  authorRegion: string;
  isVerifiedAgronomist: boolean;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorRoleLabel: string;
  authorRegion: string;
  isVerifiedAgronomist: boolean;
  cropCategory: string;
  problemCategory: string;
  title: string;
  content: string;
  imageDataUrl?: string;
  imageCaption?: string;
  parcelSummary?: string;
  likesCount: number;
  createdAt: string;
  comments: CommunityComment[];
}
