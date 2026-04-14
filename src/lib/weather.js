const weatherCodeMap = {
  0: { label: "Jasno", icon: "\u2600\uFE0F", tone: "sunny" },
  1: { label: "Pretezno jasno", icon: "\uD83C\uDF24\uFE0F", tone: "sunny" },
  2: { label: "Delno oblacno", icon: "\u26C5", tone: "cloudy" },
  3: { label: "Oblacno", icon: "\u2601\uFE0F", tone: "cloudy" },
  45: { label: "Megla", icon: "\uD83C\uDF2B\uFE0F", tone: "cloudy" },
  48: { label: "Megla z ivjem", icon: "\uD83C\uDF2B\uFE0F", tone: "cloudy" },
  51: { label: "Rahlo rosenje", icon: "\uD83C\uDF26\uFE0F", tone: "rainy" },
  53: { label: "Zmerno rosenje", icon: "\uD83C\uDF26\uFE0F", tone: "rainy" },
  55: { label: "Mocno rosenje", icon: "\uD83C\uDF27\uFE0F", tone: "rainy" },
  61: { label: "Rahel dez", icon: "\uD83C\uDF26\uFE0F", tone: "rainy" },
  63: { label: "Zmeren dez", icon: "\uD83C\uDF27\uFE0F", tone: "rainy" },
  65: { label: "Mocan dez", icon: "\u26C8\uFE0F", tone: "rainy" },
  71: { label: "Rahel sneg", icon: "\uD83C\uDF28\uFE0F", tone: "cloudy" },
  73: { label: "Zmeren sneg", icon: "\uD83C\uDF28\uFE0F", tone: "cloudy" },
  75: { label: "Mocan sneg", icon: "\u2744\uFE0F", tone: "cloudy" },
  80: { label: "Kratek naliv", icon: "\uD83C\uDF27\uFE0F", tone: "rainy" },
  81: { label: "Nalivi", icon: "\u26C8\uFE0F", tone: "rainy" },
  82: { label: "Mocni nalivi", icon: "\u26C8\uFE0F", tone: "rainy" },
  95: { label: "Nevihta", icon: "\u26C8\uFE0F", tone: "rainy" }
};

const weekdayFormatter = new Intl.DateTimeFormat("sl-SI", { weekday: "short" });
const hourFormatter = new Intl.DateTimeFormat("sl-SI", {
  hour: "2-digit",
  minute: "2-digit"
});

export function weatherLabel(code) {
  return weatherCodeMap[code] || { label: "Neznano", icon: "?", tone: "cloudy" };
}

export function formatTempByUnit(value, unit) {
  if (value == null) return "-";
  if (unit === "F") {
    return `${Math.round((value * 9) / 5 + 32)}\u00B0F`;
  }

  return `${Math.round(value)}\u00B0C`;
}

export function formatDirection(value) {
  if (value == null) return "-";
  return `${Math.round(value)}\u00B0`;
}

export function formatDay(date) {
  const parts = weekdayFormatter.format(new Date(date)).replace(".", "");
  return parts.charAt(0).toUpperCase() + parts.slice(1);
}

export function formatHour(date) {
  return hourFormatter.format(new Date(date));
}

function getTwelveMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const end = new Date(now);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

export async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=sl&format=json`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Neuspesno iskanje mesta.");
  }

  const data = await res.json();
  const result = data.results?.[0];

  if (!result) {
    return null;
  }

  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude
  };
}

export async function reverseGeocodeCity(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    "accept-language": "sl",
    addressdetails: "1",
    zoom: "10"
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error("Neuspesno branje trenutne lokacije.");
  }

  const data = await res.json();
  const address = data.address || {};
  const name =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    data.name ||
    "Trenutna lokacija";

  return {
    name,
    country: address.country || "",
    latitude,
    longitude
  };
}

export async function fetchWeatherBundle({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min"
    ].join(","),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "precipitation_probability",
      "wind_speed_10m"
    ].join(","),
    forecast_days: "5",
    timezone: "auto"
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error("Vremenski API trenutno ne odgovarja.");
    }

    throw new Error("Neuspesno branje vremena.");
  }

  const data = await res.json();

  return {
    current: {
      time: data.current?.time,
      temperature: data.current?.temperature_2m,
      apparentTemperature: data.current?.apparent_temperature,
      weatherCode: data.current?.weather_code,
      windSpeed: data.current?.wind_speed_10m,
      windDirection: data.current?.wind_direction_10m,
      maxTemperature: data.daily?.temperature_2m_max?.[0],
      minTemperature: data.daily?.temperature_2m_min?.[0]
    },
    forecast: (data.daily?.time || []).map((day, index) => ({
      date: day,
      weatherCode: data.daily.weather_code?.[index],
      maxTemperature: data.daily.temperature_2m_max?.[index],
      minTemperature: data.daily.temperature_2m_min?.[index]
    })),
    hourly: (data.hourly?.time || []).slice(0, 24).map((time, index) => ({
      time,
      temperature: data.hourly.temperature_2m?.[index],
      apparentTemperature: data.hourly.apparent_temperature?.[index],
      weatherCode: data.hourly.weather_code?.[index],
      precipitationProbability: data.hourly.precipitation_probability?.[index],
      windSpeed: data.hourly.wind_speed_10m?.[index]
    }))
  };
}

export async function fetchPreviousMonthPrecipitation({ latitude, longitude }) {
  const { startDate, endDate } = getTwelveMonthRange();
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    daily: "precipitation_sum,precipitation_hours",
    timezone: "auto"
  });

  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`);

  if (!res.ok) {
    throw new Error("Neuspesno branje zgodovine padavin.");
  }

  const data = await res.json();
  const days = (data.daily?.time || []).map((date, index) => ({
    date,
    precipitationSum: data.daily.precipitation_sum?.[index] ?? 0,
    precipitationHours: data.daily.precipitation_hours?.[index] ?? 0
  }));

  const monthsMap = new Map();

  days.forEach((day) => {
    const monthKey = day.date.slice(0, 7);
    const current = monthsMap.get(monthKey) || {
      key: monthKey,
      date: `${monthKey}-01`,
      precipitationSum: 0,
      precipitationHours: 0
    };

    current.precipitationSum += day.precipitationSum;
    current.precipitationHours += day.precipitationHours;
    monthsMap.set(monthKey, current);
  });

  const months = Array.from(monthsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totalPrecipitation = months.reduce((sum, month) => sum + month.precipitationSum, 0);
  const wettestMonth = months.reduce(
    (best, month) =>
      month.precipitationSum > (best?.precipitationSum ?? -1) ? month : best,
    null
  );

  return {
    startDate,
    endDate,
    months,
    totalPrecipitation,
    wettestMonth
  };
}
