const weatherCodeMap = {
  0: { label: "Jasno", icon: "☀️", tone: "sunny" },
  1: { label: "Pretežno jasno", icon: "🌤️", tone: "sunny" },
  2: { label: "Delno oblačno", icon: "⛅", tone: "cloudy" },
  3: { label: "Oblačno", icon: "☁️", tone: "cloudy" },
  45: { label: "Megla", icon: "🌫️", tone: "cloudy" },
  48: { label: "Megla z ivjem", icon: "🌫️", tone: "cloudy" },
  51: { label: "Rahlo rosenje", icon: "🌦️", tone: "rainy" },
  53: { label: "Zmerno rosenje", icon: "🌦️", tone: "rainy" },
  55: { label: "Močno rosenje", icon: "🌧️", tone: "rainy" },
  61: { label: "Rahel dež", icon: "🌦️", tone: "rainy" },
  63: { label: "Zmeren dež", icon: "🌧️", tone: "rainy" },
  65: { label: "Močan dež", icon: "⛈️", tone: "rainy" },
  71: { label: "Rahel sneg", icon: "🌨️", tone: "cloudy" },
  73: { label: "Zmeren sneg", icon: "🌨️", tone: "cloudy" },
  75: { label: "Močan sneg", icon: "❄️", tone: "cloudy" },
  80: { label: "Kratek naliv", icon: "🌧️", tone: "rainy" },
  81: { label: "Nalivi", icon: "⛈️", tone: "rainy" },
  82: { label: "Močni nalivi", icon: "⛈️", tone: "rainy" },
  95: { label: "Nevihta", icon: "⛈️", tone: "rainy" }
};

const weekdayFormatter = new Intl.DateTimeFormat("sl-SI", { weekday: "short" });

export function weatherLabel(code) {
  return weatherCodeMap[code] || { label: "Neznano", icon: "❔", tone: "cloudy" };
}

export function formatTempByUnit(value, unit) {
  if (value == null) return "-";
  if (unit === "F") {
    return `${Math.round((value * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(value)}°C`;
}

export function formatDirection(value) {
  if (value == null) return "-";
  return `${Math.round(value)}°`;
}

export function formatDay(date) {
  const parts = weekdayFormatter.format(new Date(date)).replace(".", "");
  return parts.charAt(0).toUpperCase() + parts.slice(1);
}

export async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=sl&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Neuspešno iskanje mesta.");
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude
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
    forecast_days: "5",
    timezone: "auto"
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error("Neuspešno branje vremena.");
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
    }))
  };
}
