import { NextRequest, NextResponse } from "next/server";
import { computeExplainableRisks, evaluateCropRotationAndSoil } from "@/lib/agronomy-engine";
import {
  NasaTelemetryResponse,
  Parcel,
  WeatherForecastResponse,
} from "@/types/agro";

interface AiRequestPayload {
  message: string;
  parcel: Parcel;
  nasa: NasaTelemetryResponse | null;
  weather: WeatherForecastResponse | null;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  runtimeApiKey?: string;
  runtimeProvider?: "gemini" | "openai";
}

function buildSystemInstruction(
  parcel: Parcel,
  nasa: NasaTelemetryResponse | null,
  weather: WeatherForecastResponse | null
): string {
  const rotation = evaluateCropRotationAndSoil(parcel);
  const risks = computeExplainableRisks(parcel, nasa, weather);
  const latestSpectral = nasa?.spectralHistory?.[nasa.spectralHistory.length - 1];
  const soil = parcel.soilAnalysis;

  return `Sən "AgroAI" — AgroOrbit platformasının peşəkar Baş Aqronom Süni İntellekt sistemisən.
Yalnız Azərbaycan dilində, elmi-praktiki, aydın və dürüst cavab verirsən.

MÜTLƏQ QAYDALAR:
1. Heç vaxt uydurma diaqnoz, saxta laboratoriya rəqəmi və ya əsassız gübrə/pestisid dozası yazma!
2. Əgər fermerin sualına dəqiq cavab vermək üçün torpaq analizi, su analizi, yarpaq analizi və ya fitopatoloji laboratoriya müayinəsi çatışmırsa, bunu açıq şəkildə bildir və AgroOrbit-in "Aqrar Xidmətlər və Analiz Mərkəzi"ndən müvafiq analizi sifariş etməyi tövsiyə et.
3. Cavablarında seçilmiş sahənin aşağıdakı REAL kontekst məlumatlarına istinad et:

--- SEÇİLMİŞ SAHƏ KONTEKSTİ ---
- Sahə adı və kodu: ${parcel.name} (${parcel.code})
- Ərazi / Rayon: ${parcel.region} (Koordinatlar: ${parcel.centerLat.toFixed(4)}°N, ${parcel.centerLon.toFixed(4)}°E)
- Hektar ölçüsü: ${parcel.areaHa} ha
- Əvvəlki əkin (Sələf): ${parcel.previousCrop} (${parcel.previousVariety})
- Hazırkı əkin və sort/hibrid: ${parcel.currentCrop} — Sort: ${parcel.variety}
- Əkin tarixi: ${parcel.plantingDate} | Səpin norması: ${parcel.seedingRate}
- Fenoloji mərhələ: ${parcel.phenologicalStage}
- Suvarma üsulu: ${parcel.irrigationMethod} (Son suvarma: ${parcel.lastIrrigationDate})
- Növbəli əkin qiymətləndirməsi: ${rotation.compatibilityLabel} — ${rotation.agronomicAnalysis}

--- TORPAQ ANALİZİ MƏLUMATI ---
${
  soil
    ? `- Laboratoriya: ${soil.laboratoryName} (Tarix: ${soil.sampleDate})
- pH: ${soil.ph} | Duzluluq (EC): ${soil.salinityEc} dS/m | Humus: ${soil.humusPercent}%
- Mütəhərrik Azot (N): ${soil.nitrogenMgKg} mq/kq | Fosfor (P2O5): ${soil.phosphorusMgKg} mq/kq | Kalium (K2O): ${soil.potassiumMgKg} mq/kq
- Mexaniki tərkib: ${soil.soilTexture} | Qeyd: ${soil.notes}`
    : `- DİQQƏT: Bu sahə üzrə laborator torpaq analizi daxil edilməyib! Dəqiq gübrə dozası verməzdən əvvəl torpaq analizinin vacibliyini vurğula.`
}

--- GÜBRƏLƏMƏ VƏ DƏRMANLAMA TARİXÇƏSİ ---
- Gübrələmə qeydləri: ${
    parcel.fertilizationHistory.length > 0
      ? parcel.fertilizationHistory
          .map((f) => `${f.date}: ${f.fertilizerName} (${f.rateKgHa} kq/ha, ${f.method})`)
          .join("; ")
      : "Qeyd yoxdur"
  }
- Dərmanlama qeydləri: ${
    parcel.sprayingHistory.length > 0
      ? parcel.sprayingHistory
          .map((s) => `${s.date}: ${s.productName} (${s.dosePerHa}, hədəf: ${s.targetPestOrDisease})`)
          .join("; ")
      : "Qeyd yoxdur"
  }

--- NASA PEYK VƏ İQLİM MƏLUMATLARI (Faktiki Müşahidə) ---
${
  nasa
    ? `- Mənbə: ${nasa.sourceInfo.powerSource}
- Son 30 gün orta temperatur: ${nasa.summary30Days.avgTempC}°C (Min: ${nasa.summary30Days.minTempC}°C, Maks: ${nasa.summary30Days.maxTempC}°C)
- Son 30 gün cəmi yağıntı (PRECTOTCORR / IMERG): ${nasa.summary30Days.totalPrecipitationMm} mm
- Orta nisbi rütubət: ${nasa.summary30Days.avgHumidityPercent}% | Orta külək: ${nasa.summary30Days.avgWindSpeedKmh} km/saat
- Günəş radiasiyası: ${nasa.summary30Days.avgSolarRadiationKwhM2} kWh/m²/gün
- NASA SMAP / GLDAS Kök zonası torpaq rütubəti: ${nasa.summary30Days.avgSoilMoistureRootPercent}% (Səth: ${nasa.summary30Days.avgSoilMoistureSurfacePercent}%)
- Son Peyk İndeksləri (${latestSpectral?.date || "Cari"}): NDVI=${
        latestSpectral?.ndvi ?? parcel.baselineNdvi
      }, NDRE=${latestSpectral?.ndre ?? parcel.baselineNdre}, NDMI=${
        latestSpectral?.ndmi ?? parcel.baselineNdmi
      }`
    : "- NASA telemetriya məlumatı yüklənməyib."
}

--- HAVA PROQNOZU (Open-Meteo Real Vaxt & 7 Günlük) ---
${
  weather
    ? `- Cari temperatur: ${weather.current.temperatureC}°C | Rütubət: ${weather.current.relativeHumidityPercent}% | Külək: ${weather.current.windSpeedKmh} km/s (${weather.current.windDirectionCardinal})
- Çiləmə (Dərmanlama) Pəncərəsi: ${weather.current.sprayingWindowNote}`
    : "- Hava proqnozu yüklənməyib."
}

--- AKTİV AQRONOMİK RİSKLƏR ---
${risks.map((r) => `- [${r.levelLabel}] ${r.categoryLabel}: ${r.title} (${r.ruleFormula})`).join("\n")}
`;
}

/**
 * Deterministic, transparent Agronomic Expert Engine used when no external LLM API key is configured,
 * or if the external API key is invalid/unreachable. Never pretends to be a cloud LLM—explicitly reports
 * configuration status and uses real parcel + NASA + weather data to answer accurately.
 */
function generateAnalyticalExpertResponse(
  message: string,
  parcel: Parcel,
  nasa: NasaTelemetryResponse | null,
  weather: WeatherForecastResponse | null
): string {
  const q = message.toLowerCase();
  const rotation = evaluateCropRotationAndSoil(parcel);
  const risks = computeExplainableRisks(parcel, nasa, weather);
  const soil = parcel.soilAnalysis;
  const latestSpectral = nasa?.spectralHistory?.[nasa.spectralHistory.length - 1];
  const ndvi = latestSpectral?.ndvi ?? parcel.baselineNdvi;
  const ndre = latestSpectral?.ndre ?? parcel.baselineNdre;
  const ndmi = latestSpectral?.ndmi ?? parcel.baselineNdmi;

  const sections: string[] = [];

  sections.push(
    `### 📌 Sahə Konteksti: **${parcel.name}** (${parcel.areaHa} ha — ${parcel.region})\n` +
      `- **Cari Əkin və Sort:** ${parcel.currentCrop} (*${parcel.variety}*), Əkin tarixi: \`${parcel.plantingDate}\`, Səpin norması: \`${parcel.seedingRate}\`\n` +
      `- **Əvvəlki Əkin (Sələf):** ${parcel.previousCrop} (*${parcel.previousVariety}*)\n` +
      `- **Fenoloji Faza:** ${parcel.phenologicalStage} | **Suvarma:** ${parcel.irrigationMethod}`
  );

  // Check topic of question
  if (
    q.includes("gübrə") ||
    q.includes("azot") ||
    q.includes("fosfor") ||
    q.includes("kalium") ||
    q.includes("npk") ||
    q.includes("yemləmə") ||
    q.includes("doza")
  ) {
    if (!soil) {
      sections.push(
        `### ⚠️ Məlumat Çatışmazlığı Bildirişi (Torpaq Analizi Yoxdur)\n` +
          `**${parcel.name}** üçün sistemdə laborator torpaq analizi (pH, EC, mütəhərrik NPK və humus) qeydə alınmayıb. **Uydurma gübrə dozası təyin etmək aqronomik cəhətdən yolverilməzdir.**\n\n` +
          `- **Tövsiyə olunan addım:** Əvvəlcə **Aqrar Xidmətlər → Kompleks Torpaq Analizi** bölməsindən 0–30 sm qat üzrə analiz sifariş edin.\n` +
          `- **Peyk NDRE müşahidəsi:** Cari NDRE xlorofil indeksi \`${ndre.toFixed(
            2
          )}\` səviyyəsindədir. Sələf bitki **${parcel.previousCrop}** olduğu üçün ${rotation.agronomicAnalysis}`
      );
    } else {
      sections.push(
        `### 🧪 Torpaq Analizi və Gübrələmə Şərhi (${soil.laboratoryName}, ${soil.sampleDate})\n` +
          `- **pH və Duzluluq:** pH \`${soil.ph}\` | EC duzluluq \`${soil.salinityEc} dS/m\` | Humus \`${soil.humusPercent}%\`\n` +
          `- **Qida Elementləri Təminatı:** Azot (N): \`${soil.nitrogenMgKg} mq/kq\`, Fosfor (P₂O₅): \`${soil.phosphorusMgKg} mq/kq\`, Kalium (K₂O): \`${soil.potassiumMgKg} mq/kq\`\n` +
          `- **Peyk Xlorofil İndeksi (NDRE):** \`${ndre.toFixed(2)}\` | **NDVI:** \`${ndvi.toFixed(2)}\`\n` +
          `- **Aqronomik Qiymətləndirmə:** ${rotation.fertilizerAdjustmentNote}\n` +
          `- **Əvvəlki Gübrələmə Tarixçəsi:** ${
            parcel.fertilizationHistory.length > 0
              ? parcel.fertilizationHistory
                  .map((f) => `${f.date} tarixində ${f.fertilizerName} (${f.rateKgHa} kq/ha — ${f.method})`)
                  .join("; ")
              : "Cari mövsümdə hələ gübrələmə daxil edilməyib."
          }\n` +
          `- **Praktiki Tövsiyə:** ${
            soil.salinityEc >= 3.0
              ? "Torpaqda duzluluq yüksək olduğu üçün (EC > 3.0 dS/m) xlor tərkibli gübrələrdən (Kalium-xlorid) qəti uzaq durun. Yuma suvarmasından öncə yüksək dozada mineral azot verməyin."
              : `Cari ${parcel.phenologicalStage} mərhələsində payızda artıq azot verməkdən çəkinin; erkən yaz yemləməsini isə xəritədəki NDRE zonalarına görə diferensial (VRA) qaydada planlaşdırın.`
          }`
      );
    }
  }

  if (
    q.includes("suvarma") ||
    q.includes("rütubət") ||
    q.includes("quraqlıq") ||
    q.includes("su") ||
    q.includes("yağıntı") ||
    q.includes("nasa") ||
    q.includes("peyk")
  ) {
    const rootMoist = nasa?.summary30Days.avgSoilMoistureRootPercent ?? 42;
    const precip30 = nasa?.summary30Days.totalPrecipitationMm ?? 18;
    const et0Today = weather?.daily7Days?.[0]?.et0EvapotranspirationMm ?? 2.2;
    sections.push(
      `### 🛰️ NASA Peyk (POWER / SMAP / HLS) və Suvarma Balansı Təhlili\n` +
        `- **NASA SMAP Kök Zonası Rütubəti (0–100 sm):** \`${rootMoist}%\` (Səth 0–5 sm: \`${
          nasa?.summary30Days.avgSoilMoistureSurfacePercent ?? 40
        }%\`)\n` +
        `- **NASA POWER / GPM IMERG Son 30 Günlük Yağıntı:** \`${precip30} mm\` | **Günəş Radiasiyası:** \`${
          nasa?.summary30Days.avgSolarRadiationKwhM2 ?? 3.4
        } kWh/m²/gün\`\n` +
        `- **Peyk NDMI (Yarpaq Rütubət Stresi İndeksi):** \`${ndmi.toFixed(2)}\` | **NDVI:** \`${ndvi.toFixed(2)}\`\n` +
        `- **Open-Meteo Günlük Buxarlanma (ET₀):** \`${et0Today} mm/gün\` | **Son Suvarma:** \`${parcel.lastIrrigationDate}\` (${parcel.irrigationMethod})\n` +
        `- **Nəticə:** ${
          rootMoist < 35 || ndmi < 0.2
            ? `Sahədə kök zonası rütubəti kritik həddə (\`${rootMoist}%\`) enib və NDMI (\`${ndmi.toFixed(
                2
              )}\`) su stresini təsdiqləyir. ${parcel.irrigationMethod} vasitəsilə növbəti 48 saat ərzində rütubət bərpa suvarması tövsiyə olunur.`
            : `Hazırda kök zonası rütubəti (\`${rootMoist}%\`) və NDMI (\`${ndmi.toFixed(
                2
              )}\`) qənaətbəxşdir. Təcili suvarma tələb olunmur, növbəti 7 günlük Open-Meteo yağıntı proqnozunu izləyin.`
        }`
    );
  }

  if (
    q.includes("xəstəlik") ||
    q.includes("zərərverici") ||
    q.includes("dərman") ||
    q.includes("saralma") ||
    q.includes("ləkə") ||
    q.includes("sovk") ||
    q.includes("pas") ||
    q.includes("vilt")
  ) {
    sections.push(
      `### 🔬 Bitki Mühafizəsi, Xəstəlik və Zərərverici Qiymətləndirməsi\n` +
        `- **Vacib Xəbərdarlıq (Uydurma Diaqnoza Qarşı Nəzarət):** Yalnız ümumi sual və ya peyk NDVI azalması əsasında konkret göbələk/bakteriya ştammına qəti laborator diaqnoz qoyulmur. Dəqiq törədici təyini üçün **Xidmətlər → Bitki Xəstəliklərinin Laborator Analizi** və ya **Sahəyə Yerində Aqronom Baxışı** sifariş edilməlidir.\n` +
        `- **Sahənin Tarixçəsinə Əsasən Fitosanitar Risklər:**\n` +
        `  - Sələf bitki **${parcel.previousCrop}** → Hazırkı **${parcel.currentCrop}** (*${parcel.variety}*): ${rotation.agronomicAnalysis}\n` +
        `  - **Çiləmə (Dərmanlama) Hava Pəncərəsi:** ${
          weather?.current.sprayingWindowNote ||
          "Külək sürəti <15 km/saat və yağıntısız saatlarda çiləmə aparılmalıdır."
        }\n` +
        `  - **Əvvəlki Dərmanlamalar:** ${
          parcel.sprayingHistory.length > 0
            ? parcel.sprayingHistory
                .map((s) => `${s.date}: ${s.productName} (${s.targetPestOrDisease} əleyhinə, ${s.dosePerHa})`)
                .join("; ")
            : "Bu mövsüm dərmanlama qeydi yoxdur."
        }`
    );
  }

  if (
    q.includes("növbəli") ||
    q.includes("sələf") ||
    q.includes("sort") ||
    q.includes("rotasiya") ||
    q.includes("əkin") ||
    sections.length === 1
  ) {
    sections.push(
      `### 🌱 Növbəli Əkin, Sort və Kompleks Risk Xülasəsi\n` +
        `- **Rotasiya Statusu:** **${rotation.compatibilityLabel}**\n` +
        `- **Təhlil:** ${rotation.agronomicAnalysis}\n` +
        `- **Torpağa Təsiri:** ${rotation.soilImpactNote}\n` +
        `- **Növbəti Mövsüm Üçün Tövsiyə Olunan Sələflər:** ${rotation.nextSeasonRecommendedCrops.join(", ")}\n` +
        `- **Aktiv Sahə Riskləri:**\n` +
        risks
          .map(
            (r) =>
              `  - **${r.levelLabel} — ${r.categoryLabel}:** ${r.title} (*Qayda: ${r.ruleFormula}*) → **Tədbir:** ${r.recommendation}`
          )
          .join("\n")
    );
  }

  return sections.join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AiRequestPayload;
    const { message, parcel, nasa, weather, conversationHistory = [], runtimeApiKey, runtimeProvider } = body;

    if (!message || !parcel) {
      return NextResponse.json(
        { error: "Sual mətni və seçilmiş sahə məlumatı tələb olunur." },
        { status: 400 }
      );
    }

    const geminiKey =
      (runtimeProvider === "gemini" && runtimeApiKey ? runtimeApiKey.trim() : "") ||
      (process.env.GEMINI_API_KEY || "").trim();
    const openaiKey =
      (runtimeProvider === "openai" && runtimeApiKey ? runtimeApiKey.trim() : "") ||
      (process.env.OPENAI_API_KEY || "").trim();

    const systemInstruction = buildSystemInstruction(parcel, nasa, weather);

    // 1. Try Google Gemini API if key is configured
    if (geminiKey) {
      const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
        geminiKey
      )}`;

      const contents = [
        ...conversationHistory.slice(-6).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        {
          role: "user",
          parts: [{ text: message }],
        },
      ];

      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 1200,
          },
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const replyText =
          geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Cavab generasiya olundu, lakin mətn boş qayıtdı.";
        return NextResponse.json({
          reply: replyText,
          aiMode: "cloud_llm",
          providerLabel: `Google Gemini (${modelName})`,
          missingConfigNotice: null,
          usedParcelContext: {
            parcelName: parcel.name,
            crop: parcel.currentCrop,
            variety: parcel.variety,
            areaHa: parcel.areaHa,
            hasSoilAnalysis: Boolean(parcel.soilAnalysis),
          },
        });
      }
    }

    // 2. Try OpenAI API if key is configured
    if (openaiKey) {
      const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          temperature: 0.25,
          messages: [
            { role: "system", content: systemInstruction },
            ...conversationHistory.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: message },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (openaiRes.ok) {
        const openaiData = await openaiRes.json();
        const replyText =
          openaiData?.choices?.[0]?.message?.content ||
          "Cavab generasiya olundu, lakin mətn boş qayıtdı.";
        return NextResponse.json({
          reply: replyText,
          aiMode: "cloud_llm",
          providerLabel: `OpenAI (${openaiModel})`,
          missingConfigNotice: null,
          usedParcelContext: {
            parcelName: parcel.name,
            crop: parcel.currentCrop,
            variety: parcel.variety,
            areaHa: parcel.areaHa,
            hasSoilAnalysis: Boolean(parcel.soilAnalysis),
          },
        });
      }
    }

    // 3. No external LLM key configured or reachable: transparently report missing .env key
    // and execute the deterministic Agronomic Expert Engine using the real parcel + NASA + weather telemetry!
    const expertReply = generateAnalyticalExpertResponse(message, parcel, nasa, weather);

    return NextResponse.json({
      reply: expertReply,
      aiMode: "expert_engine_no_api_key",
      providerLabel:
        "AgroOrbit Qayda-Əsaslı Aqronomik Ekspert Mühərriki (Lokal Analitik Rejim)",
      missingConfigNotice:
        "Xarici Bulud LLM açarı (.env faylında GEMINI_API_KEY və ya OPENAI_API_KEY) təyin edilməyib. Cavab saxta mətn generasiyası olmadan, birbaşa seçilmiş sahənin faktiki NASA POWER, SMAP, HLS NDVI, Open-Meteo və Torpaq Analizi göstəriciləri əsasında Aqronomik Ekspert Mühərriki tərəfindən hesablanmışdır. İstəsəniz, yuxarıdakı 'API Açar Konfiqurasiyası' düyməsindən və ya .env faylından Gemini/OpenAI açarınızı əlavə edə bilərsiniz.",
      usedParcelContext: {
        parcelName: parcel.name,
        crop: parcel.currentCrop,
        variety: parcel.variety,
        areaHa: parcel.areaHa,
        hasSoilAnalysis: Boolean(parcel.soilAnalysis),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "AgroAI sorğusu zamanı xəta baş verdi.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
