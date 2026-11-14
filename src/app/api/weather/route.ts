import { NextRequest, NextResponse } from "next/server";
import { serverCache } from "@/lib/cache";
import { degreeToCardinalAz } from "@/lib/agronomy-engine";
import { WeatherForecastDay, WeatherForecastResponse } from "@/types/agro";

function evaluateSprayingWindow(
  windKmh: number,
  precipMm: number,
  tempC: number
): { status: "optimal" | "caution" | "unsafe"; reason: string } {
  if (windKmh > 22 || precipMm > 2.0 || tempC > 32) {
    return {
      status: "unsafe",
      reason: `Əlverişsizdir: Külək (${windKmh.toFixed(1)} km/s) və ya yağıntı (${precipMm.toFixed(
        1
      )} mm) damla sovrulması (drift) və yuyulma yaradır.`,
    };
  }
  if (windKmh > 14 || precipMm > 0.3 || tempC > 28) {
    return {
      status: "caution",
      reason: `Diqqət tələb edir: Külək ${windKmh.toFixed(
        1
      )} km/s — yalnız iri damlalı (anti-drift) ucluqlarla və aşağı hündürlükdə çiləmə aparın.`,
    };
  }
  return {
    status: "optimal",
    reason: `Optimal çiləmə pəncərəsi: Külək ${windKmh.toFixed(
      1
    )} km/s (<15 km/s) və yağıntı yoxdur. Dron və traktor çiləməsi üçün təhlükəsizdir.`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "40.025");
  const lon = parseFloat(searchParams.get("lon") || "47.652");

  const cacheKey = `weather-forecast:${lat.toFixed(3)}:${lon.toFixed(3)}`;

  try {
    const { data, fromCache, fetchedAt } = await serverCache.fetchWithDedupeAndRetry(
      cacheKey,
      10 * 60 * 1000, // 10 minutes TTL
      async () => {
        const baseUrl =
          process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1/forecast";
        const url = `${baseUrl}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(
          4
        )}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,soil_temperature_0cm,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,et0_fao_evapotranspiration,uv_index_max&timezone=auto`;

        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          throw new Error(`Open-Meteo HTTP ${res.status}`);
        }
        const raw = await res.json();

        const curr = raw.current || {};
        const daily = raw.daily || {};

        const currTemp = Number(curr.temperature_2m ?? 15.2);
        const currWind = Number(curr.wind_speed_10m ?? 10.5);
        const currPrecip = Number(curr.precipitation ?? 0);
        const currWindDeg = Number(curr.wind_direction_10m ?? 90);
        const sm0to7 = Number(curr.soil_moisture_0_to_7cm ?? 0.24);
        const sm7to28 = Number(curr.soil_moisture_7_to_28cm ?? 0.28);

        const currSpray = evaluateSprayingWindow(currWind, currPrecip, currTemp);

        const times: string[] = Array.isArray(daily.time) ? daily.time : [];
        const daily7Days: WeatherForecastDay[] = times.map((dateStr, idx) => {
          const tMax = Number(daily.temperature_2m_max?.[idx] ?? 18);
          const tMin = Number(daily.temperature_2m_min?.[idx] ?? 8);
          const pSum = Number(daily.precipitation_sum?.[idx] ?? 0);
          const pProb = Number(daily.precipitation_probability_max?.[idx] ?? 10);
          const wMax = Number(daily.wind_speed_10m_max?.[idx] ?? 12);
          const wDeg = Number(daily.wind_direction_10m_dominant?.[idx] ?? 90);
          const et0 = Number(daily.et0_fao_evapotranspiration?.[idx] ?? 2.1);
          const uv = Number(daily.uv_index_max?.[idx] ?? 4.0);

          const spray = evaluateSprayingWindow(wMax * 0.75, pSum, tMax);

          return {
            date: dateStr,
            tempMaxC: Math.round(tMax * 10) / 10,
            tempMinC: Math.round(tMin * 10) / 10,
            precipitationSumMm: Math.round(pSum * 10) / 10,
            precipitationProbPercent: Math.round(pProb),
            windSpeedMaxKmh: Math.round(wMax * 10) / 10,
            windDirectionDominantDeg: Math.round(wDeg),
            windDirectionCardinal: degreeToCardinalAz(wDeg),
            et0EvapotranspirationMm: Math.round(et0 * 100) / 100,
            uvIndexMax: Math.round(uv * 10) / 10,
            sprayingSuitability: spray.status,
            sprayingReason: spray.reason,
          };
        });

        // Convert volumetric soil moisture m³/m³ (typical saturated ~0.48) to relative field percentage
        const sm0to7Pct = Math.min(100, Math.max(8, Math.round((sm0to7 / 0.45) * 100)));
        const sm7to28Pct = Math.min(100, Math.max(10, Math.round((sm7to28 / 0.45) * 100)));

        const payload: Omit<WeatherForecastResponse, "fromCache" | "updatedAt"> = {
          coordinates: { lat, lon },
          sourceName: "Open-Meteo Aqrometeoroloji Proqnoz Xidməti (ECMWF IFS / DWD ICON)",
          sourceUrl: "https://open-meteo.com/",
          current: {
            observationTime: String(curr.time || new Date().toISOString()),
            temperatureC: Math.round(currTemp * 10) / 10,
            relativeHumidityPercent: Math.round(Number(curr.relative_humidity_2m ?? 64)),
            windSpeedKmh: Math.round(currWind * 10) / 10,
            windDirectionDeg: Math.round(currWindDeg),
            windDirectionCardinal: degreeToCardinalAz(currWindDeg),
            precipitationMm: Math.round(currPrecip * 10) / 10,
            soilMoisture0to7cmPercent: sm0to7Pct,
            soilMoisture7to28cmPercent: sm7to28Pct,
            soilTemperature0cmC: Math.round(Number(curr.soil_temperature_0cm ?? currTemp - 1) * 10) / 10,
            sprayingWindowStatus: currSpray.status,
            sprayingWindowNote: currSpray.reason,
          },
          daily7Days,
        };

        return payload;
      }
    );

    const response: WeatherForecastResponse = {
      ...data,
      fromCache,
      updatedAt: fetchedAt,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Hava proqnozu mənbəyi ilə əlaqə zamanı xəta baş verdi.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
