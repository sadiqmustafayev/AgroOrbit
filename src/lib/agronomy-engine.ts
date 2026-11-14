import {
  AgronomicRiskAssessment,
  CropRotationAdvice,
  NasaTelemetryResponse,
  Parcel,
  RiskLevel,
  WeatherForecastResponse,
} from "@/types/agro";

export function degreeToCardinalAz(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || isNaN(deg)) return "N/A";
  const dirs = [
    "Şm (N)",
    "Şm-Ş (NE)",
    "Ş (E)",
    "C-Ş (SE)",
    "C (S)",
    "C-Q (SW)",
    "Q (W)",
    "Şm-Q (NW)",
  ];
  const idx = Math.round(((deg % 360) < 0 ? deg + 360 : deg) / 45) % 8;
  return dirs[idx];
}


export function calculatePolygonAreaHectares(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137; // Earth radius in meters
  let areaSqMeters = 0;

  for (let i = 0; i < coords.length; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % coords.length];

    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;

    areaSqMeters += dLambda * (2 + Math.sin(phi1) + Math.sin(phi2));
  }

  areaSqMeters = Math.abs((areaSqMeters * R * R) / 2.0);
  const hectares = areaSqMeters / 10000;
  return Math.round(hectares * 100) / 100;
}


export function evaluateCropRotationAndSoil(parcel: Parcel): CropRotationAdvice {
  const prev = (parcel.previousCrop || "").toLowerCase();
  const curr = (parcel.currentCrop || "").toLowerCase();
  const soil = parcel.soilAnalysis;

  let compatibilityStatus: CropRotationAdvice["compatibilityStatus"] = "acceptable";
  let compatibilityLabel = "Məqbul Növbəli Əkin (Normal)";
  let agronomicAnalysis = "";
  let soilImpactNote = "";
  let nextSeasonRecommendedCrops: string[] = [];
  let fertilizerAdjustmentNote = "";

  if (prev && curr && prev === curr) {
    if (curr.includes("yonca")) {
      compatibilityStatus = "optimal";
      compatibilityLabel = "Çoxillik Yem Əkini (Uyğundur)";
      agronomicAnalysis =
        "Yonca çoxillik paxlalı bitki olduğu üçün 3-4 il eyni sahədə saxlanılması aqrotexniki normadır və torpağı simbiotik azotla (150-220 kq N/ha) zənginləşdirir.";
      soilImpactNote = "Torpaq strukturunu yaxşılaşdırır, kök çürüklüyünə qarşı 4-cü ildən sonra dənli və ya texniki bitkilərlə əvəzlənməlidir.";
      nextSeasonRecommendedCrops = ["Payızlıq Buğda", "Pambıq", "Qarğıdalı"];
    } else if (curr.includes("pambıq")) {
      compatibilityStatus = "critical";
      compatibilityLabel = "Ciddi Risk: Pambıq Monokulturası (Qırmızı)";
      agronomicAnalysis =
        "Pambığın təkrar pambıqdan sonra əkilməsi torpaqda Verticillium dahliae (vilt / soluxma) göbələyinin, sovka qışlama ehtiyatının və birtərəfli qida tükənməsinin kəskin artmasına səbəb olur.";
      soilImpactNote = "Üzvi maddə (humus) azalır, şırım suvarma zamanı təkrar şorlaşma və torpaq bərkiməsi riski yüksəlir.";
      nextSeasonRecommendedCrops = ["Yonca", "Payızlıq Arpa", "Payızlıq Buğda", "Soya / Noxud"];
    } else if (curr.includes("buğda") || curr.includes("arpa")) {
      compatibilityStatus = "warning";
      compatibilityLabel = "Diqqət: Taxıl Təkrar Əkini (Sarı/Narıncı)";
      agronomicAnalysis =
        "Taxılın ardıcıl taxıldan sonra əkilməsi kök çürüklüyü (Fusarium, Helminthosporium), sünbülcük xəstəlikləri və taxıl böcəyi (Eurygaster integriceps) fonunu yüksəldir.";
      soilImpactNote = "Üst qatda mütəhərrik azot və fosfor ehtiyatı zəifləyir, alaq otları (yulafca, çöl xardalı) sıxlığı artır.";
      nextSeasonRecommendedCrops = ["Yonca", "Noxud / Mərcimək", "Günəbaxan", "Şəkər çuğunduru"];
    } else {
      compatibilityStatus = "warning";
      compatibilityLabel = "Təkrar Əkin Riski (Monokultura)";
      agronomicAnalysis = `${parcel.previousCrop} bitkisindən sonra yenidən ${parcel.currentCrop} əkilməsi eyni ailəyə məxsus zərərverici və patogenlərin toplanmasına şərait yaradır.`;
      soilImpactNote = "Eyni kök dərinliyindən qida maddələrinin sorulması torpaq yorğunluğu yaradır.";
      nextSeasonRecommendedCrops = ["Yonca", "Payızlıq Buğda", "Paxlalı bitkilər"];
    }
  } else if (
    (prev.includes("yonca") || prev.includes("noxud") || prev.includes("soya") || prev.includes("paxla")) &&
    (curr.includes("buğda") || curr.includes("pambıq") || curr.includes("qarğıdalı"))
  ) {
    compatibilityStatus = "optimal";
    compatibilityLabel = "İdeal Növbəli Əkin Sxemi (Yaşıl)";
    agronomicAnalysis = `Sələf bitki (${parcel.previousCrop}) kök yumrucuq bakteriyaları (Rhizobium) vasitəsilə torpaqda bioloji azot ehtiyatı yaratmışdır. Bu, hazırkı ${parcel.currentCrop} əkininin ilkin vegetasiya gücü üçün ən əlverişli sələfdir.`;
    soilImpactNote = "Torpağın su-fiziki xassələri və məsaməliliyi yüksək səviyyədədir, vilt və kök çürüklüyü patogen yükü minimuma enmişdir.";
    nextSeasonRecommendedCrops = ["Qarğıdalı", "Payızlıq Arpa", "Günəbaxan"];
  } else if (
    (prev.includes("buğda") || prev.includes("arpa")) &&
    (curr.includes("pambıq") || curr.includes("qarğıdalı") || curr.includes("günəbaxan") || curr.includes("şəkər"))
  ) {
    compatibilityStatus = "optimal";
    compatibilityLabel = "Aqronomik Cəhətdən Optimal Rotasiya (Yaşıl)";
    agronomicAnalysis = `Payızlıq dənli bitkidən (${parcel.previousCrop}) sonra cərgəarası becərilən texniki bitkiyə (${parcel.currentCrop}) keçid saçaqlı və mil kök sistemlərinin növbələşməsini təmin edir.`;
    soilImpactNote = "Torpağın həm üst (0-25 sm), həm də dərin (25-60 sm) qatlarından balanslı istifadə olunur.";
    nextSeasonRecommendedCrops = ["Yonca", "Noxud", "Payızlıq Buğda"];
  } else if (
    (prev.includes("kartof") || prev.includes("pomidor")) &&
    (curr.includes("kartof") || curr.includes("pomidor") || curr.includes("badımcan"))
  ) {
    compatibilityStatus = "critical";
    compatibilityLabel = "Ciddi Risk: Badımcançiçəklilər (Solanaceae) Ardıcıllığı";
    agronomicAnalysis = `${parcel.previousCrop} və ${parcel.currentCrop} eyni fəsiləyə (Solanaceae) aiddir. Fitoftoroz (Phytophthora infestans), alternarioz və nematod riski kəskin yüksəlir.`;
    soilImpactNote = "Kalium ehtiyatı sürətlə tükənir və torpaq infeksiyası toplanır.";
    nextSeasonRecommendedCrops = ["Payızlıq Buğda", "Yonca", "Soğan / Sarımsaq"];
  } else {
    compatibilityStatus = "acceptable";
    compatibilityLabel = "Uyğun Əkin Növbələşməsi";
    agronomicAnalysis = `${parcel.previousCrop || "Əvvəlki bitki"} sələfindən sonra ${parcel.currentCrop} əkilməsi aqrotexniki baxımdan məqbuldur. Sahədə qalıq bitki qalıqlarının düzgün xırdalanması tövsiyə olunur.`;
    soilImpactNote = "Torpaq strukturunun qorunması üçün üzvi-mineral balans nəzarətdə saxlanılmalıdır.";
    nextSeasonRecommendedCrops = ["Yonca", "Paxlalı bitkilər", "Payızlıq Arpa"];
  }

  let phSalinityEvaluation = "";
  if (!soil) {
    phSalinityEvaluation =
      "Sahə üzrə laborator torpaq analizi daxil edilməyib. Dəqiq pH, EC (duzluluq) və NPK balansı üçün 'Xidmətlər -> Torpaq analizi' sifariş edilməsi tövsiyə olunur.";
    fertilizerAdjustmentNote =
      "Torpaq analizi olmadığı üçün uydurma gübrə dozası təyin edilmir. Yalnız sələf bitkiyə əsasən baza müşahidəsi aparılır.";
  } else {
    const phStatus =
      soil.ph > 8.0
        ? `Qələvi (pH ${soil.ph}) — fosfor və mikroelementlərin (Fe, Zn, Mn) mənimsənilməsi çətinləşir`
        : soil.ph < 6.0
        ? `Turş (pH ${soil.ph}) — əhəngləmə tələb oluna bilər`
        : `Normal/Zəif qələvi (pH ${soil.ph}) — əksər kənd təsərrüfatı bitkiləri üçün əlverişlidir`;

    const ecStatus =
      soil.salinityEc >= 4.0
        ? `Yüksək şorlaşma (EC ${soil.salinityEc} dS/m) — yuma norması və duzadavamlı sort seçimi vacibdir`
        : soil.salinityEc >= 2.0
        ? `Orta duzluluq (EC ${soil.salinityEc} dS/m) — həssas bitkilərdə məhsuldarlıq 10-15% azala bilər`
        : `Şorlaşmamış / Normal (EC ${soil.salinityEc} dS/m)`;

    phSalinityEvaluation = `${phStatus}. ${ecStatus}. Humus: ${soil.humusPercent}% (${soil.laboratoryName}, ${soil.sampleDate}).`;

    const nNote =
      soil.nitrogenMgKg < 30
        ? `Mütəhərrik azot aşağıdır (${soil.nitrogenMgKg} mq/kq) — vegetasiya boyu hissəvi azot yemləməsi tələb olunur.`
        : `Mütəhərrik azot qənaətbəxşdir (${soil.nitrogenMgKg} mq/kq).`;
    const pNote =
      soil.phosphorusMgKg < 25
        ? `Fosfor çatışmazlığı (${soil.phosphorusMgKg} mq/kq) — əkinlə birlikdə fosforlu gübrə (məs. Ammofos/DAP) tətbiqi vacibdir.`
        : `Fosfor təminatı normaldır (${soil.phosphorusMgKg} mq/kq).`;

    fertilizerAdjustmentNote = `${nNote} ${pNote} Yüksək pH (${soil.ph}) nəzərə alınaraq fizioloji turş reaksiyalı gübrələrə (Ammonium-sulfat, MAP) üstünlük verilməlidir.`;
  }

  return {
    previousCrop: parcel.previousCrop,
    currentCrop: parcel.currentCrop,
    compatibilityStatus,
    compatibilityLabel,
    agronomicAnalysis,
    soilImpactNote,
    nextSeasonRecommendedCrops,
    fertilizerAdjustmentNote,
    phSalinityEvaluation,
  };
}


export function computeExplainableRisks(
  parcel: Parcel,
  nasa: NasaTelemetryResponse | null,
  weather: WeatherForecastResponse | null
): AgronomicRiskAssessment[] {
  const risks: AgronomicRiskAssessment[] = [];
  const nowDate = new Date().toISOString().split("T")[0];

  const latestSpectral = nasa?.spectralHistory?.[nasa.spectralHistory.length - 1];
  const prevSpectral =
    nasa?.spectralHistory && nasa.spectralHistory.length >= 2
      ? nasa.spectralHistory[nasa.spectralHistory.length - 2]
      : null;

  const ndvi = latestSpectral ? latestSpectral.ndvi : parcel.baselineNdvi;
  const ndmi = latestSpectral ? latestSpectral.ndmi : parcel.baselineNdmi;
  const obsDate = latestSpectral?.date || nasa?.latestValidRecord?.date || nowDate;

  const precip30d = nasa?.summary30Days?.totalPrecipitationMm ?? 18;
  const rootMoisturePct =
    nasa?.summary30Days?.avgSoilMoistureRootPercent ??
    weather?.current?.soilMoisture7to28cmPercent ??
    42;
  const maxTemp =
    weather?.daily7Days?.[0]?.tempMaxC ?? nasa?.summary30Days?.maxTempC ?? 24;

  let droughtLevel: RiskLevel = "green";
  let droughtScore = 20;
  let droughtTitle = "Torpaq Rütubəti və Su Balansı Normaldır";
  let droughtExplanation = `Son 30 gündə yağıntı (${precip30d.toFixed(1)} mm), kök zonası rütubəti (${rootMoisturePct.toFixed(0)}%) və NDMI rütubət indeksi (${ndmi.toFixed(2)}) bitkinin (${parcel.currentCrop}) su tələbatını ödəyir.`;
  const droughtFormula = `Kök_Rütubəti=${rootMoisturePct.toFixed(0)}% | 30g_Yağıntı=${precip30d.toFixed(1)}mm | T_max=${maxTemp.toFixed(1)}°C | NDMI=${ndmi.toFixed(2)}`;
  let droughtRec = `Cari suvarma rejimini (${parcel.irrigationMethod}) plan üzrə davam etdirin.`;

  if (rootMoisturePct < 30 || (precip30d < 12 && ndmi < 0.18 && maxTemp > 28)) {
    droughtLevel = "red";
    droughtScore = 88;
    droughtTitle = "Ciddi Quraqlıq və Kök Zonası Su Kəsiri";
    droughtExplanation = `Yüksək temperatur (${maxTemp.toFixed(1)}°C), yağıntı çatışmazlığı (${precip30d.toFixed(1)} mm / 30 gün), NASA SMAP kök rütubətinin ${rootMoisturePct.toFixed(0)}%-ə düşməsi və aşağı NDMI (${ndmi.toFixed(2)}) birlikdə kəskin su stresi yaradır.`;
    droughtRec = `Təcili olaraq ${parcel.irrigationMethod} vasitəsilə suvarma norması verilsin və yarpaq turqoru yoxlanılsın.`;
  } else if (rootMoisturePct < 40 || (precip30d < 20 && ndmi < 0.26)) {
    droughtLevel = "orange";
    droughtScore = 68;
    droughtTitle = "Yüksək Su Stresi və Rütubət İtkisi Riski";
    droughtExplanation = `30 günlük yağıntı miqdarı (${precip30d.toFixed(1)} mm) buxarlanma (ET0) səviyyəsindən aşağıdır və kök zonası rütubəti ${rootMoisturePct.toFixed(0)}% həddinə enib.`;
    droughtRec = "Növbəti 48-72 saat ərzində növbəti suvarmanı planlaşdırın.";
  } else if (rootMoisturePct < 48 || precip30d < 28) {
    droughtLevel = "yellow";
    droughtScore = 44;
    droughtTitle = "Torpaq Rütubətində Azalma Meyli (Diqqət)";
    droughtExplanation = `Səth və kök qatında rütubət (${rootMoisturePct.toFixed(0)}%) optimal həddin aşağı sərhədinə yaxınlaşır.`;
    droughtRec = "Suvarma cədvəlini və kanalların/damcı xətlərinin təzyiqini yoxlayın.";
  }

  risks.push({
    id: `risk-drought-${parcel.id}`,
    parcelId: parcel.id,
    parcelName: parcel.name,
    category: "drought",
    categoryLabel: "Quraqlıq və Torpaq Rütubəti",
    level: droughtLevel,
    levelLabel: levelToLabelAz(droughtLevel),
    score: droughtScore,
    title: droughtTitle,
    explanation: droughtExplanation,
    ruleFormula: droughtFormula,
    dataSource: "NASA POWER (PRECTOTCORR) + NASA SMAP (GWETROOT) + HLS NDMI",
    observedDate: obsDate,
    recommendation: droughtRec,
  });

  // 2. Vegetasiya İndeksi (NDVI / NDRE) Anomaliyası
  const ndviDrop = prevSpectral ? prevSpectral.ndvi - ndvi : 0;
  let vegLevel: RiskLevel = "green";
  let vegScore = 18;
  let vegTitle = `Vegetasiya İnkişafı (${parcel.phenologicalStage}) Normaldır`;
  let vegExplanation = `Sahə üzrə orta NDVI göstəricisi ${ndvi.toFixed(2)} və NDRE xlorofil indeksi ${(latestSpectral?.ndre ?? parcel.baselineNdre).toFixed(2)} səviyyəsindədir.`;
  let vegRec = "Planlı fenoloji müşahidəni davam etdirin.";

  if (ndvi < 0.32 || ndviDrop > 0.1) {
    vegLevel = "red";
    vegScore = 85;
    vegTitle = "Peyk Monitorinqində Kəskin NDVI Azalması / Anomaliya";
    vegExplanation = `NDVI göstəricisi ${ndvi.toFixed(2)} səviyyəsinə düşüb${ndviDrop > 0 ? ` (əvvəlki keçidlə müqayisədə -${(ndviDrop * 100).toFixed(1)}% azalma)` : ""}. Bu, sahədə suvarma nasazlığı, kök çürüklüyü və ya zərərverici ocağına işarə edir.`;
    vegRec = "Xəritədə qırmızı/narıncı alt-zonalara yerində aqronom baxışı və ya multispektral dron uçuşu sifariş edin.";
  } else if (ndvi < 0.45 || ndviDrop > 0.05) {
    vegLevel = "orange";
    vegScore = 64;
    vegTitle = "Vegetasiya Sıxlığında Zəifləmə və Qeyri-Bərabər İnkişaf";
    vegExplanation = `NDVI (${ndvi.toFixed(2)}) və NDRE (${(latestSpectral?.ndre ?? parcel.baselineNdre).toFixed(2)}) sahənin bəzi sektorlarında xlorofil və azot mənimsənilməsinin zəiflədiyini göstərir.`;
    vegRec = "Yarpaq/bitki analizi və diferensial gübrələmə (VRA) imkanını dəyərləndirin.";
  } else if (ndvi < 0.56) {
    vegLevel = "yellow";
    vegScore = 40;
    vegTitle = "Orta Vegetasiya Aktivliyi — Diqqət Tələb Edir";
    vegExplanation = `NDVI=${ndvi.toFixed(2)} göstəricisi mövsümi orta həddədir, lakin kənar zolaqlarda seyrəklik müşahidə olunur.`;
    vegRec = "Növbəti peyk keçidində (5-8 gün) dinamikanı müqayisə edin.";
  }

  risks.push({
    id: `risk-veg-${parcel.id}`,
    parcelId: parcel.id,
    parcelName: parcel.name,
    category: "vegetation_anomaly",
    categoryLabel: "Peyk Vegetasiya (NDVI/NDRE)",
    level: vegLevel,
    levelLabel: levelToLabelAz(vegLevel),
    score: vegScore,
    title: vegTitle,
    explanation: vegExplanation,
    ruleFormula: `NDVI=${ndvi.toFixed(2)} | ΔNDVI=${(-ndviDrop).toFixed(2)} | NDRE=${(latestSpectral?.ndre ?? parcel.baselineNdre).toFixed(2)}`,
    dataSource: latestSpectral?.satelliteSource || "NASA HLS (Sentinel-2 / Landsat)",
    observedDate: obsDate,
    recommendation: vegRec,
  });

  const rotation = evaluateCropRotationAndSoil(parcel);
  const soil = parcel.soilAnalysis;
  let soilLevel: RiskLevel = "green";
  let soilScore = 15;
  let soilTitle = "Torpaq Münbitliyi və Növbəli Əkin Balansı";
  let soilExp = rotation.agronomicAnalysis;
  let soilRec = rotation.fertilizerAdjustmentNote;

  if (rotation.compatibilityStatus === "critical" || (soil && soil.salinityEc >= 4.0)) {
    soilLevel = "red";
    soilScore = 86;
    soilTitle = "Ciddi Torpaq Şorlaşması və ya Monokultura Riski";
    soilExp = `${rotation.agronomicAnalysis} ${soil ? `Torpaq EC duzluluğu: ${soil.salinityEc} dS/m, pH: ${soil.ph}.` : ""}`;
    soilRec = "Təcili fitosanitar nəzarət, drenaj yoxlaması və növbəti mövsüm üçün paxlalı/yonca rotasiyası tətbiq edin.";
  } else if (rotation.compatibilityStatus === "warning" || (soil && (soil.salinityEc >= 2.2 || soil.ph > 8.1))) {
    soilLevel = "orange";
    soilScore = 62;
    soilTitle = "Torpaq pH/Duzluluq və ya Əkin Rotasiyası Xəbərdarlığı";
    soilExp = `${rotation.phSalinityEvaluation} ${rotation.agronomicAnalysis}`;
  } else if (!soil || soil.humusPercent < 2.2) {
    soilLevel = "yellow";
    soilScore = 38;
    soilTitle = soil ? "Humus Ehtiyatının Qorunması Tələb Olunur" : "Laborator Torpaq Analizi Yenilənməlidir";
    soilExp = rotation.phSalinityEvaluation;
  }

  risks.push({
    id: `risk-soil-${parcel.id}`,
    parcelId: parcel.id,
    parcelName: parcel.name,
    category: "soil_salinity_ph",
    categoryLabel: "Torpaq və Növbəli Əkin",
    level: soilLevel,
    levelLabel: levelToLabelAz(soilLevel),
    score: soilScore,
    title: soilTitle,
    explanation: soilExp,
    ruleFormula: soil
      ? `pH=${soil.ph} | EC=${soil.salinityEc} dS/m | Humus=${soil.humusPercent}% | Sələf=${parcel.previousCrop}`
      : `Torpaq_Analizi=Yoxdur | Sələf=${parcel.previousCrop} -> ${parcel.currentCrop}`,
    dataSource: soil ? `${soil.laboratoryName} + Aqronomik Rotasiya Matrisi` : "Təsərrüfat Əkin Tarixçəsi",
    observedDate: soil?.sampleDate || nowDate,
    recommendation: soilRec,
  });

  // 4. Külək, Temperatur və Dərmanlama Pəncərəsi Riski
  const windKmh = weather?.current?.windSpeedKmh ?? nasa?.summary30Days?.avgWindSpeedKmh ?? 12;
  const precipToday = weather?.current?.precipitationMm ?? 0;
  let windLevel: RiskLevel = "green";
  let windScore = 14;
  let windTitle = "Dron və Traktorla Dərmanlama Üçün Əlverişli Hava";
  let windExp = `Cari külək sürəti ${windKmh.toFixed(1)} km/saat (< 15 km/saat həddi) və yağıntı (${precipToday.toFixed(1)} mm) çiləmə əməliyyatları üçün təhlükəsizdir.`;
  let windRec = "Planlaşdırılmış dərmanlama və ya yarpaq gübrələməsini səhər/axşam saatlarında icra edə bilərsiniz.";

  if (windKmh > 24 || precipToday > 3.0) {
    windLevel = "red";
    windScore = 82;
    windTitle = "Dərmanlama Qadağandır: Güclü Külək / Yağıntı Riski";
    windExp = `Küləyin sürəti ${windKmh.toFixed(1)} km/saat və ya yağıntı (${precipToday.toFixed(1)} mm) pestisidlərin qonşu sahələrə sovrulmasına (drift) və yuyulmasına səbəb olacaq.`;
    windRec = "Bütün dron və traktor çiləmə əməliyyatlarını külək < 15 km/saat düşənədək dayandırın.";
  } else if (windKmh > 16) {
    windLevel = "orange";
    windScore = 58;
    windTitle = "Külək Sürəti Yüksəkdir — Dron Uçuşu və Çiləmədə Diqqət";
    windExp = `Külək sürəti ${windKmh.toFixed(1)} km/saat təşkil edir. Standart ucluqlarla dərmanlama zamanı damla sovrulması riski var.`;
    windRec = "Yalnız anti-drift (iri damlalı injektor) ucluqlardan istifadə edin və ya küləyin sakitləşməsini gözləyin.";
  } else if (windKmh > 12) {
    windLevel = "yellow";
    windScore = 35;
    windTitle = "Mülayim Külək — Çiləmə Hündürlüyünə Nəzarət Edin";
    windExp = `Küləyin sürəti ${windKmh.toFixed(1)} km/saat həddindədir.`;
    windRec = "Dron uçuş hündürlüyünü bitki çətirindən 2.0-2.5 metr məsafədə saxlayın.";
  }

  risks.push({
    id: `risk-wind-${parcel.id}`,
    parcelId: parcel.id,
    parcelName: parcel.name,
    category: "wind_spraying",
    categoryLabel: "İqlim və Çiləmə Pəncərəsi",
    level: windLevel,
    levelLabel: levelToLabelAz(windLevel),
    score: windScore,
    title: windTitle,
    explanation: windExp,
    ruleFormula: `Külək=${windKmh.toFixed(1)} km/s | Yağıntı=${precipToday.toFixed(1)} mm | Hədd: Optimal <15 km/s`,
    dataSource: weather ? `${weather.sourceName} + NASA POWER (WS10M)` : "NASA POWER (WS10M)",
    observedDate: weather?.updatedAt ? weather.updatedAt.split("T")[0] : obsDate,
    recommendation: windRec,
  });

  return risks;
}

export function levelToLabelAz(level: RiskLevel): string {
  switch (level) {
    case "green":
      return "Normal (Yaşıl)";
    case "yellow":
      return "Diqqət (Sarı)";
    case "orange":
      return "Yüksək Risk (Narıncı)";
    case "red":
      return "Ciddi Risk (Qırmızı)";
  }
}

export function getOverallParcelRiskLevel(risks: AgronomicRiskAssessment[]): RiskLevel {
  if (risks.some((r) => r.level === "red")) return "red";
  if (risks.some((r) => r.level === "orange")) return "orange";
  if (risks.some((r) => r.level === "yellow")) return "yellow";
  return "green";
}
