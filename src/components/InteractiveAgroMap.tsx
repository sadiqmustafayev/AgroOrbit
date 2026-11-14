"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AgronomicRiskAssessment,
  GeoJSONFeature,
  NasaTelemetryResponse,
  Parcel,
  RiskLevel,
  WeatherForecastResponse,
} from "@/types/agro";
import {
  calculatePolygonAreaHectares,
  getOverallParcelRiskLevel,
} from "@/lib/agronomy-engine";
import {
  Compass,
  Download,
  Upload,
  Layers,
  PenTool,
  Check,
  Trash2,
  Crosshair,
  AlertTriangle,
  Satellite,
  Calendar,
} from "lucide-react";

export type MapLayerType =
  | "satellite"
  | "ndvi"
  | "ndre"
  | "ndmi"
  | "precipitation"
  | "temperature"
  | "soil_moisture"
  | "wind"
  | "drought_risk"
  | "crop_growth"
  | "risk_zones";

interface InteractiveAgroMapProps {
  parcels: Parcel[];
  selectedParcel: Parcel;
  onSelectParcel: (parcelId: string) => void;
  nasaData: NasaTelemetryResponse | null;
  weatherData: WeatherForecastResponse | null;
  risks: AgronomicRiskAssessment[];
  onSaveDrawnPolygon?: (coords: [number, number][], areaHa: number) => void;
  onImportGeoJsonParcel?: (
    name: string,
    coords: [number, number][],
    areaHa: number,
    crop?: string,
    variety?: string,
    region?: string
  ) => void;
  compact?: boolean;
  onExpandToFullMap?: () => void;
}

const LAYER_OPTIONS: Array<{
  id: MapLayerType;
  label: string;
  unit: string;
  source: string;
  rampLabels: [string, string, string, string];
  rampColors: [string, string, string, string];
}> = [
  {
    id: "satellite",
    label: "Peyk Görüntüləri (RGB)",
    unit: "Optik",
    source: "Esri World Imagery + NASA GIBS TrueColor",
    rampLabels: ["Torpaq", "Seyrək", "Orta", "Sıx örtük"],
    rampColors: ["#92400e", "#eab308", "#4ade80", "#15803d"],
  },
  {
    id: "ndvi",
    label: "NDVI (Vegetasiya)",
    unit: "-0.1 → 0.9",
    source: "NASA HLS (Sentinel-2 / Landsat)",
    rampLabels: ["<0.25 Zəif", "0.40 Orta", "0.60 Yaxşı", ">0.75 Yüksək"],
    rampColors: ["#ef4444", "#f59e0b", "#84cc16", "#16a34a"],
  },
  {
    id: "ndre",
    label: "NDRE (Xlorofil & Azot)",
    unit: "0.0 → 0.7",
    source: "Red-Edge Spektral Kanal (HLS S30)",
    rampLabels: ["Azot kəsiri", "Orta N", "Normal N", "Yüksək xlorofil"],
    rampColors: ["#f97316", "#facc15", "#22c55e", "#0d9488"],
  },
  {
    id: "ndmi",
    label: "NDMI (Bitki Su Stresi)",
    unit: "-0.2 → 0.6",
    source: "NIR / SWIR Rütubət İndeksi",
    rampLabels: ["Kəskin quraq", "Su stresi", "Normal nəmlik", "Tam turqor"],
    rampColors: ["#dc2626", "#f59e0b", "#38bdf8", "#0284c7"],
  },
  {
    id: "soil_moisture",
    label: "Torpaq Rütubəti (SMAP)",
    unit: "% (Kök zonası)",
    source: "NASA SMAP GWETROOT (0-100 sm)",
    rampLabels: ["<28% Quru", "35% Diqqət", "45% Optimal", ">55% Doymuş"],
    rampColors: ["#ef4444", "#eab308", "#06b6d4", "#1d4ed8"],
  },
  {
    id: "precipitation",
    label: "Yağıntı (GPM IMERG)",
    unit: "mm / 30g",
    source: "NASA GPM IMERG / POWER",
    rampLabels: ["<10 mm", "15-25 mm", "25-45 mm", ">50 mm"],
    rampColors: ["#f97316", "#fde047", "#38bdf8", "#2563eb"],
  },
  {
    id: "temperature",
    label: "Temperatur Rejimi",
    unit: "°C",
    source: "NASA POWER T2M + Open-Meteo",
    rampLabels: ["<8°C Soyuq", "15°C Mülayim", "24°C İsti", ">32°C İsti stresi"],
    rampColors: ["#3b82f6", "#22c55e", "#f59e0b", "#dc2626"],
  },
  {
    id: "wind",
    label: "Külək və Çiləmə Həddi",
    unit: "km/saat",
    source: "Open-Meteo 10m + NASA WS10M",
    rampLabels: ["<10 Optimal", "10-15 Mülayim", "15-22 Riskli", ">22 Qadağan"],
    rampColors: ["#22c55e", "#eab308", "#f97316", "#ef4444"],
  },
  {
    id: "drought_risk",
    label: "Quraqlıq Riski",
    unit: "İndeks",
    source: "ET0 + SMAP + Yağıntı Balansı",
    rampLabels: ["Yaşıl (Normal)", "Sarı (Diqqət)", "Narıncı (Yüksək)", "Qırmızı (Ciddi)"],
    rampColors: ["#22c55e", "#eab308", "#f97316", "#ef4444"],
  },
  {
    id: "crop_growth",
    label: "Bitki İnkişafı (BBCH)",
    unit: "Fenologiya",
    source: "Aqronomik Fenoloji Model + NDVI",
    rampLabels: ["Seyrək çıxış", "Orta inkişaf", "Aktiv böyümə", "Tam çətir"],
    rampColors: ["#f59e0b", "#a3e635", "#22c55e", "#15803d"],
  },
  {
    id: "risk_zones",
    label: "Aqronomik Risk Zonaları",
    unit: "4 Səviyyəli",
    source: "AgroOrbit Kompleks Risk Mühərriki",
    rampLabels: [
      "Yaşıl (Normal)",
      "Sarı (Diqqət)",
      "Narıncı (Yüksək)",
      "Qırmızı (Ciddi)",
    ],
    rampColors: ["#22c55e", "#eab308", "#f97316", "#ef4444"],
  },
];

function riskLevelToHex(level: RiskLevel): string {
  switch (level) {
    case "green":
      return "#22c55e";
    case "yellow":
      return "#eab308";
    case "orange":
      return "#f97316";
    case "red":
      return "#ef4444";
  }
}

export default function InteractiveAgroMap({
  parcels,
  selectedParcel,
  onSelectParcel,
  nasaData,
  weatherData,
  risks,
  onSaveDrawnPolygon,
  onImportGeoJsonParcel,
  compact = false,
  onExpandToFullMap,
}: InteractiveAgroMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersGroupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gibsOverlayRef = useRef<any>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>("ndvi");
  const [enableNasaGibsOverlay, setEnableNasaGibsOverlay] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [manualLat, setManualLat] = useState(String(selectedParcel.centerLat));
  const [manualLon, setManualLon] = useState(String(selectedParcel.centerLon));
  const [compareDateIdxA, setCompareDateIdxA] = useState<number>(0);
  const [compareDateIdxB, setCompareDateIdxB] = useState<number>(5);
  const [selectedZoneInfo, setSelectedZoneInfo] = useState<{
    sectorName: string;
    valueLabel: string;
    riskLevel: RiskLevel;
    reason: string;
    source: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    setManualLat(String(selectedParcel.centerLat));
    setManualLon(String(selectedParcel.centerLon));
  }, [selectedParcel.id, selectedParcel.centerLat, selectedParcel.centerLon]);

  useEffect(() => {
    if (nasaData?.spectralHistory && nasaData.spectralHistory.length >= 2) {
      setCompareDateIdxA(Math.max(0, nasaData.spectralHistory.length - 3));
      setCompareDateIdxB(nasaData.spectralHistory.length - 1);
    }
  }, [nasaData]);

  // Initialize Leaflet map once
  useEffect(() => {
    let isMounted = true;
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      // Ensure Leaflet CSS is present
      if (!document.getElementById("leaflet-css-cdn")) {
        const link = document.createElement("link");
        link.id = "leaflet-css-cdn";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(mapContainerRef.current, {
        center: [selectedParcel.centerLat, selectedParcel.centerLon],
        zoom: compact ? 14 : 15,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // High-res Esri World Imagery satellite base
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Esri World Imagery | NASA GIBS / HLS",
        }
      ).addTo(map);

      // Hybrid boundaries & place names overlay
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          opacity: 0.75,
        }
      ).addTo(map);

      const fg = L.featureGroup().addTo(map);
      layersGroupRef.current = fg;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle NASA GIBS WMTS live satellite layer toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      if (gibsOverlayRef.current) {
        map.removeLayer(gibsOverlayRef.current);
        gibsOverlayRef.current = null;
      }
      if (enableNasaGibsOverlay) {
        const gibsLayer = L.tileLayer(
          "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2024-11-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
          {
            maxZoom: 9,
            opacity: 0.65,
            attribution: "NASA GIBS WMTS (MODIS_Terra_NDVI_8Day)",
          }
        );
        gibsLayer.addTo(map);
        gibsOverlayRef.current = gibsLayer;
      }
    });
  }, [enableNasaGibsOverlay]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: any) => {
      if (!isDrawing) return;
      const lat = Math.round(e.latlng.lat * 100000) / 100000;
      const lng = Math.round(e.latlng.lng * 100000) / 100000;
      setDrawnPoints((prev) => [...prev, [lat, lng]]);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [isDrawing]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([selectedParcel.centerLat, selectedParcel.centerLon], compact ? 14 : 15, {
      duration: 0.9,
    });
  }, [selectedParcel.id, selectedParcel.centerLat, selectedParcel.centerLon, compact]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const fg = layersGroupRef.current;
    if (!map || !fg) return;

    import("leaflet").then((L) => {
      fg.clearLayers();

      const overallRisk = getOverallParcelRiskLevel(risks);
      const specHistory = nasaData?.spectralHistory || [];
      const activeSpec =
        specHistory[compareDateIdxB] ||
        specHistory[specHistory.length - 1] || {
          date: new Date().toISOString().split("T")[0],
          ndvi: selectedParcel.baselineNdvi,
          ndre: selectedParcel.baselineNdre,
          ndmi: selectedParcel.baselineNdmi,
          satelliteSource: "NASA HLS (Sentinel-2 / Landsat)",
        };

      for (const p of parcels) {
        const isSelected = p.id === selectedParcel.id;
        const borderColor = isSelected ? "#22c55e" : "#38bdf8";

        const poly = L.polygon(p.polygonCoords, {
          color: borderColor,
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? riskLevelToHex(overallRisk) : "#0ea5e9",
          fillOpacity: isSelected && activeLayer === "satellite" ? 0.18 : isSelected ? 0.08 : 0.2,
          dashArray: isSelected ? undefined : "6, 6",
        });

        poly.on("click", () => {
          if (!isDrawing && p.id !== selectedParcel.id) {
            onSelectParcel(p.id);
          }
        });

        poly.bindTooltip(
          `<div style="font-family: monospace; font-size: 12px; font-weight: 700;">
            ${p.code} — ${p.name}<br/>
            <span style="color:#16a34a">${p.currentCrop} (${p.variety}) • ${p.areaHa} ha</span>
          </div>`,
          { sticky: true }
        );

        poly.addTo(fg);

        
        if (isSelected && activeLayer !== "satellite" && p.polygonCoords.length >= 3) {
          const lats = p.polygonCoords.map((c) => c[0]);
          const lons = p.polygonCoords.map((c) => c[1]);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);

          const rows = 3;
          const cols = 3;
          const dLat = (maxLat - minLat) / rows;
          const dLon = (maxLon - minLon) / cols;

          const sectorNames = [
            ["Şimal-Qərb (NW)", "Şimal-Mərkəz (N)", "Şimal-Şərq (NE)"],
            ["Qərb-Mərkəz (W)", "Mərkəzi Sektor (C)", "Şərq-Mərkəz (E)"],
            ["Cənub-Qərb (SW)", "Cənub-Mərkəz (S)", "Cənub-Şərq (SE)"],
          ];

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cellLat1 = maxLat - r * dLat;
              const cellLat2 = maxLat - (r + 1) * dLat;
              const cellLon1 = minLon + c * dLon;
              const cellLon2 = minLon + (c + 1) * dLon;

              const spatialDelta = (1 - r * 0.5 - c * 0.4) * 0.06;

              let cellColor = "#22c55e";
              let cellRisk: RiskLevel = "green";
              let valueLabel = "";
              let reasonText = "";
              let sourceText = activeSpec.satelliteSource;

              if (activeLayer === "ndvi") {
                const v = Math.max(0.15, Math.min(0.9, activeSpec.ndvi + spatialDelta));
                valueLabel = `NDVI: ${v.toFixed(2)}`;
                if (v < 0.35) {
                  cellColor = "#ef4444";
                  cellRisk = "red";
                  reasonText = `NDVI (${v.toFixed(2)}) kritik həddən (<0.35) aşağıdır — seyrək çıxış, şorlaşma və ya kök stresi.`;
                } else if (v < 0.48) {
                  cellColor = "#f97316";
                  cellRisk = "orange";
                  reasonText = `NDVI (${v.toFixed(2)}) orta həddən aşağıdır — lokal azot və ya nəmlik çatışmazlığı.`;
                } else if (v < 0.6) {
                  cellColor = "#eab308";
                  cellRisk = "yellow";
                  reasonText = `NDVI (${v.toFixed(2)}) qənaətbəxşdir, lakin maksimum çətir sıxlığına çatmayıb.`;
                } else {
                  cellColor = "#22c55e";
                  cellRisk = "green";
                  reasonText = `NDVI (${v.toFixed(2)}) yüksək biomassa və sağlam fotosintez aktivliyini göstərir.`;
                }
              } else if (activeLayer === "ndre") {
                const v = Math.max(0.1, Math.min(0.68, activeSpec.ndre + spatialDelta * 0.8));
                valueLabel = `NDRE: ${v.toFixed(2)}`;
                if (v < 0.24) {
                  cellColor = "#ef4444";
                  cellRisk = "red";
                  reasonText = `NDRE (${v.toFixed(2)}) yarpaq xlorofilinin və mütəhərrik azotun kəskin çatışmazlığını göstərir.`;
                } else if (v < 0.32) {
                  cellColor = "#f97316";
                  cellRisk = "orange";
                  reasonText = `NDRE (${v.toFixed(2)}) azot yemləməsi (VRA artımı +15%) tələb edən sektordur.`;
                } else if (v < 0.38) {
                  cellColor = "#eab308";
                  cellRisk = "yellow";
                  reasonText = `NDRE (${v.toFixed(2)}) orta xlorofil səviyyəsidir.`;
                } else {
                  cellColor = "#10b981";
                  cellRisk = "green";
                  reasonText = `NDRE (${v.toFixed(2)}) optimal azot mənimsənilməsini təsdiqləyir.`;
                }
              } else if (activeLayer === "ndmi" || activeLayer === "soil_moisture") {
                const baseMoist =
                  nasaData?.summary30Days.avgSoilMoistureRootPercent ??
                  weatherData?.current.soilMoisture7to28cmPercent ??
                  42;
                const moistPct = Math.round(
                  Math.max(14, Math.min(75, baseMoist + spatialDelta * 120))
                );
                const ndmiVal = Math.max(-0.05, Math.min(0.6, activeSpec.ndmi + spatialDelta));
                valueLabel =
                  activeLayer === "ndmi"
                    ? `NDMI: ${ndmiVal.toFixed(2)}`
                    : `Rütubət: ${moistPct}%`;
                sourceText = "NASA SMAP (GWETROOT) + HLS NDMI";
                if (moistPct < 30 || ndmiVal < 0.16) {
                  cellColor = "#ef4444";
                  cellRisk = "red";
                  reasonText = `Kök zonası rütubəti (${moistPct}%) və NDMI (${ndmiVal.toFixed(2)}) kəskin su kəsirini göstərir.`;
                } else if (moistPct < 38) {
                  cellColor = "#f59e0b";
                  cellRisk = "orange";
                  reasonText = `Sektorda rütubət (${moistPct}%) optimal həddən aşağı düşür.`;
                } else if (moistPct < 45) {
                  cellColor = "#38bdf8";
                  cellRisk = "yellow";
                  reasonText = `Rütubət (${moistPct}%) orta səviyyədədir.`;
                } else {
                  cellColor = "#0284c7";
                  cellRisk = "green";
                  reasonText = `Kök zonası rütubəti (${moistPct}%) tam optimaldır.`;
                }
              } else if (activeLayer === "precipitation") {
                const p30 = Math.max(
                  2,
                  Math.round(
                    ((nasaData?.summary30Days.totalPrecipitationMm ?? 20) + spatialDelta * 40) * 10
                  ) / 10
                );
                valueLabel = `Yağıntı: ${p30} mm`;
                sourceText = "NASA GPM IMERG / POWER PRECTOTCORR";
                cellColor = p30 < 12 ? "#f97316" : p30 < 22 ? "#eab308" : "#38bdf8";
                cellRisk = p30 < 12 ? "orange" : p30 < 22 ? "yellow" : "green";
                reasonText = `Son 30 gündə peyk yağıntı miqdarı ${p30} mm təşkil etmişdir.`;
              } else if (activeLayer === "temperature") {
                const t =
                  Math.round(
                    ((weatherData?.current.temperatureC ??
                      nasaData?.summary30Days.avgTempC ??
                      16) -
                      spatialDelta * 12) *
                      10
                  ) / 10;
                valueLabel = `Temp: ${t}°C`;
                sourceText = "NASA POWER T2M + Open-Meteo";
                cellColor = t > 30 ? "#ef4444" : t > 24 ? "#f59e0b" : "#22c55e";
                cellRisk = t > 30 ? "red" : t > 24 ? "yellow" : "green";
                reasonText = `Səth və çətir temperaturu ${t}°C səviyyəsindədir.`;
              } else if (activeLayer === "wind") {
                const w =
                  Math.round(
                    ((weatherData?.current.windSpeedKmh ??
                      nasaData?.summary30Days.avgWindSpeedKmh ??
                      11) +
                      (r - 1) * 1.4) *
                      10
                  ) / 10;
                const dir = weatherData?.current.windDirectionCardinal || "Şm-Ş";
                valueLabel = `${w} km/s (${dir})`;
                sourceText = "Open-Meteo 10m + NASA WS10M";
                cellColor = w > 22 ? "#ef4444" : w > 15 ? "#f97316" : "#22c55e";
                cellRisk = w > 22 ? "red" : w > 15 ? "orange" : "green";
                reasonText =
                  w > 15
                    ? `Külək sürəti (${w} km/s) dronla dərmanlama zamanı sovrulma (drift) riski yaradır.`
                    : `Külək sürəti (${w} km/s) çiləmə əməliyyatları üçün təhlükəsizdir (<15 km/s).`;
              } else {
                const v = activeSpec.ndvi + spatialDelta;
                const ec = p.soilAnalysis?.salinityEc ?? 1.2;
                if (v < 0.36 || (ec >= 3.5 && r === 2 && c === 2)) {
                  cellColor = "#ef4444";
                  cellRisk = "red";
                  valueLabel = "Qırmızı Risk Zonası";
                  reasonText = `Aşağı vegetasiya (NDVI=${v.toFixed(
                    2
                  )}) + torpaq duzluluğu (EC=${ec} dS/m) və rütubət çatışmazlığı üst-üstə düşür. Təcili yerində yoxlama tələb olunur.`;
                } else if (v < 0.48 || ec >= 2.8) {
                  cellColor = "#f97316";
                  cellRisk = "orange";
                  valueLabel = "Narıncı Risk Zonası";
                  reasonText = `Yüksək aqronomik risk: vegetasiya zəifləməsi (NDVI=${v.toFixed(
                    2
                  )}) və suvarma qeyri-bərabərliyi.`;
                } else if (v < 0.58) {
                  cellColor = "#eab308";
                  cellRisk = "yellow";
                  valueLabel = "Sarı Diqqət Zonası";
                  reasonText = `Diqqət tələb edən zona: növbəti suvarma və yemləmədə nəzarətdə saxlanılmalıdır.`;
                } else {
                  cellColor = "#22c55e";
                  cellRisk = "green";
                  valueLabel = "Yaşıl (Optimal)";
                  reasonText = `Normal və qənaətbəxş aqronomik göstəricilər (NDVI=${v.toFixed(2)}).`;
                }
                sourceText = "NASA HLS + NASA SMAP + Torpaq Analizi Qayda Mühərriki";
              }

              const sectorTitle = sectorNames[r]?.[c] || `Sektor ${r + 1}-${c + 1}`;
              const cellRect = L.rectangle(
                [
                  [cellLat2, cellLon1],
                  [cellLat1, cellLon2],
                ],
                {
                  color: cellColor,
                  weight: 1,
                  fillColor: cellColor,
                  fillOpacity: 0.45,
                }
              );

              cellRect.on("click", () => {
                setSelectedZoneInfo({
                  sectorName: `${p.code} • ${sectorTitle}`,
                  valueLabel,
                  riskLevel: cellRisk,
                  reason: reasonText,
                  source: sourceText,
                  date: activeSpec.date,
                });
              });

              cellRect.bindTooltip(
                `<div style="font-family:monospace;font-size:11px;">
                  <b>${sectorTitle}</b>: ${valueLabel}<br/>
                  <span>Klikləyin: Risk səbəbi və mənbə</span>
                </div>`
              );

              cellRect.addTo(fg);
            }
          }
        }
      }

      // Render active user-drawn polygon if drawing
      if (drawnPoints.length > 0) {
        for (const pt of drawnPoints) {
          L.circleMarker(pt, {
            radius: 5,
            color: "#ffffff",
            fillColor: "#22c55e",
            fillOpacity: 1,
            weight: 2,
          }).addTo(fg);
        }
        if (drawnPoints.length >= 2) {
          L.polygon(drawnPoints, {
            color: "#22c55e",
            weight: 3,
            fillColor: "#22c55e",
            fillOpacity: 0.3,
            dashArray: "4, 4",
          }).addTo(fg);
        }
      }
    });
  }, [
    parcels,
    selectedParcel,
    activeLayer,
    nasaData,
    weatherData,
    risks,
    drawnPoints,
    isDrawing,
    compareDateIdxB,
    onSelectParcel,
  ]);

  const drawnAreaHa = calculatePolygonAreaHectares(drawnPoints);

  const handleExportGeoJSON = () => {
    // GeoJSON standard uses [longitude, latitude]
    const ring = selectedParcel.polygonCoords.map(([lat, lon]) => [lon, lat]);
    if (
      ring.length > 0 &&
      (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
    ) {
      ring.push([...ring[0]]);
    }

    const feature: GeoJSONFeature = {
      type: "Feature",
      properties: {
        parcelId: selectedParcel.id,
        name: selectedParcel.name,
        crop: selectedParcel.currentCrop,
        variety: selectedParcel.variety,
        areaHa: selectedParcel.areaHa,
        region: selectedParcel.region,
      },
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    };

    const collection = {
      type: "FeatureCollection",
      features: [feature],
    };

    const blob = new Blob([JSON.stringify(collection, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedParcel.code.toLowerCase()}-${selectedParcel.id}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportGeoJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(String(ev.target?.result || "{}"));
        const feat = json.type === "FeatureCollection" ? json.features?.[0] : json;
        const ring = feat?.geometry?.coordinates?.[0];
        if (Array.isArray(ring) && ring.length >= 3) {
          const latLonCoords: [number, number][] = ring
            .slice(0, ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] ? -1 : undefined)
            .map((pt: number[]) => [Number(pt[1]), Number(pt[0])]);
          const ha = calculatePolygonAreaHectares(latLonCoords);
          if (onImportGeoJsonParcel) {
            onImportGeoJsonParcel(
              feat.properties?.name || `GeoJSON Sahə (${file.name.replace(".geojson", "")})`,
              latLonCoords,
              ha,
              feat.properties?.crop,
              feat.properties?.variety,
              feat.properties?.region
            );
          }
        }
      } catch {
        alert("GeoJSON fayl formatı oxuna bilmədi. Zəhmət olmasa düzgün Polygon GeoJSON seçin.");
      }
    };
    reader.readAsText(file);
  };

  const handleFlyToCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 15, { duration: 0.8 });
    }
  };

  const currentLayerMeta =
    LAYER_OPTIONS.find((l) => l.id === activeLayer) || LAYER_OPTIONS[1];

  const specHistory = nasaData?.spectralHistory || [];
  const specA = specHistory[compareDateIdxA];
  const specB = specHistory[compareDateIdxB];

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-800/80 bg-[#111827] overflow-hidden shadow-xl">
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#0b0f17]/95 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
            <Satellite className="h-3.5 w-3.5" />
            GIS & Peyk Kadastr Xəritəsi
          </span>
          <select
            aria-label="Sahə seçimi"
            value={selectedParcel.id}
            onChange={(e) => onSelectParcel(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            {parcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name} ({p.areaHa} ha)
              </option>
            ))}
          </select>

          <span className="font-mono text-xs text-emerald-400 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg">
            Sahə: <strong>{selectedParcel.areaHa} ha</strong> |{" "}
            {selectedParcel.centerLat.toFixed(4)}°N, {selectedParcel.centerLon.toFixed(4)}°E
          </span>
        </div>

        {/* GeoJSON, Drawing & Coordinate Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          {!compact && (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsDrawing((prev) => !prev);
                  if (isDrawing) setDrawnPoints([]);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  isDrawing
                    ? "bg-amber-500 text-slate-950 font-semibold"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                <PenTool className="h-3.5 w-3.5" />
                {isDrawing ? "Çəkmə Реjimi Aktivdir" : "Sərhəd Çək (Hektar Ölç)"}
              </button>

              {isDrawing && drawnPoints.length >= 3 && onSaveDrawnPolygon && (
                <button
                  type="button"
                  onClick={() => {
                    onSaveDrawnPolygon(drawnPoints, drawnAreaHa);
                    setIsDrawing(false);
                    setDrawnPoints([]);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <Check className="h-3.5 w-3.5" />
                  Poliqonu Saxla ({drawnAreaHa} ha)
                </button>
              )}

              {isDrawing && drawnPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDrawnPoints([])}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-500/40 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Təmizlə
                </button>
              )}

              <button
                type="button"
                onClick={() => setEnableNasaGibsOverlay((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${
                  enableNasaGibsOverlay
                    ? "bg-sky-500/20 border-sky-400 text-sky-300"
                    : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
                title="NASA GIBS WMTS Qlobal NDVI Qatı"
              >
                <Layers className="h-3.5 w-3.5" />
                NASA GIBS Qatı
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportGeoJSON}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            title="Sahənin sərhədlərini GeoJSON formatında yüklə"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            GeoJSON Yüklə
          </button>

          {!compact && onImportGeoJsonParcel && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
              <Upload className="h-3.5 w-3.5 text-sky-400" />
              GeoJSON İdxal
              <input
                type="file"
                accept=".geojson,.json"
                onChange={handleImportGeoJSONFile}
                className="hidden"
              />
            </label>
          )}

          {compact && onExpandToFullMap && (
            <button
              type="button"
              onClick={onExpandToFullMap}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Tam Xəritəyə Keç →
            </button>
          )}
        </div>
      </div>

      {/* Layer Switcher Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/80 bg-slate-900/90 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
          Xəritə Qatları:
        </span>
        {LAYER_OPTIONS.map((layer) => {
          const active = activeLayer === layer.id;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
              }`}
            >
              {layer.label}
            </button>
          );
        })}
      </div>

      {/* Coordinate Entry & Date Comparison Sub-bar (when not compact) */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 bg-slate-950/60 px-4 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Crosshair className="h-3.5 w-3.5 text-emerald-400" />
              Koordinatla Keçid:
            </span>
            <input
              type="number"
              step="0.0001"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="Enlik (Lat)"
              className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-100"
            />
            <input
              type="number"
              step="0.0001"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              placeholder="Uzunluq (Lon)"
              className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={handleFlyToCoordinates}
              className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-slate-700 border border-slate-700"
            >
              Koordinata Bax
            </button>
            {isDrawing && (
              <span className="font-mono text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                Çəkilən nöqtələr: {drawnPoints.length} | Hesablanan ölçü:{" "}
                <strong>{drawnAreaHa} ha</strong> (Xəritəyə klikləyərək sərhəd nöqtələri qoyun)
              </span>
            )}
          </div>

          {specHistory.length >= 2 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-sky-400" />
                Tarixlər üzrə Peyk Müqayisəsi:
              </span>
              <select
                aria-label="Əvvəlki tarix"
                value={compareDateIdxA}
                onChange={(e) => setCompareDateIdxA(Number(e.target.value))}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200"
              >
                {specHistory.map((s, idx) => (
                  <option key={s.date + idx} value={idx}>
                    Tarix A: {s.date} (NDVI {s.ndvi})
                  </option>
                ))}
              </select>
              <span className="text-slate-500">→</span>
              <select
                aria-label="Cari tarix"
                value={compareDateIdxB}
                onChange={(e) => setCompareDateIdxB(Number(e.target.value))}
                className="rounded border border-emerald-500/50 bg-slate-900 px-2 py-1 font-mono text-xs text-emerald-300"
              >
                {specHistory.map((s, idx) => (
                  <option key={s.date + idx} value={idx}>
                    Tarix B: {s.date} (NDVI {s.ndvi})
                  </option>
                ))}
              </select>
              {specA && specB && (
                <span className="rounded bg-slate-900 border border-slate-800 px-2 py-1 font-mono text-[11px] text-slate-200">
                  ΔNDVI:{" "}
                  <strong
                    className={
                      specB.ndvi - specA.ndvi >= 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    {specB.ndvi - specA.ndvi >= 0 ? "+" : ""}
                    {(specB.ndvi - specA.ndvi).toFixed(2)}
                  </strong>{" "}
                  | ΔNDMI:{" "}
                  <strong
                    className={
                      specB.ndmi - specA.ndmi >= 0 ? "text-sky-400" : "text-amber-400"
                    }
                  >
                    {specB.ndmi - specA.ndmi >= 0 ? "+" : ""}
                    {(specB.ndmi - specA.ndmi).toFixed(2)}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Map Viewport */}
      <div className="relative w-full" style={{ height: compact ? "350px" : "520px" }}>
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Floating Glass Legend HUD (FarmTwin style) */}
        <div className="pointer-events-auto absolute bottom-4 left-4 z-400 max-w-xs rounded-xl border border-slate-700/80 bg-slate-950/85 p-3 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-semibold text-slate-100">
              {currentLayerMeta.label}
            </span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {currentLayerMeta.unit}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">
            Mənbə: {currentLayerMeta.source}
          </p>
          <div className="grid grid-cols-4 gap-1">
            {currentLayerMeta.rampColors.map((hex, i) => (
              <div key={hex + i} className="flex flex-col items-center">
                <div
                  className="h-2.5 w-full rounded-sm mb-1"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[9px] text-slate-300 text-center leading-tight">
                  {currentLayerMeta.rampLabels[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Selected Sector / Risk Inspector HUD */}
        {selectedZoneInfo && (
          <div className="pointer-events-auto absolute top-4 right-4 z-400 w-80 rounded-xl border border-slate-700 bg-slate-950/90 p-3.5 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                {selectedZoneInfo.sectorName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedZoneInfo(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: riskLevelToHex(selectedZoneInfo.riskLevel) }}
              />
              <span className="font-mono text-xs font-semibold text-emerald-300">
                {selectedZoneInfo.valueLabel}
              </span>
              <span className="text-[10px] text-slate-400 ml-auto font-mono">
                {selectedZoneInfo.date}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed mb-2">
              <strong>Səbəb:</strong> {selectedZoneInfo.reason}
            </p>
            <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
              <strong>Məlumat mənbəyi:</strong> {selectedZoneInfo.source}
            </p>
          </div>
        )}

        {/* Top-Left Live Telemetry Pill */}
        <div className="pointer-events-none absolute top-3 left-3 z-400 flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-200 backdrop-blur-md flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              <strong>{selectedParcel.currentCrop}</strong> ({selectedParcel.variety}) •{" "}
              <span className="text-emerald-400">{selectedParcel.phenologicalStage}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
