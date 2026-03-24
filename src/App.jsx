import { useEffect, useState } from "react";
import {
  SignInButton,
  SignOutButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser
} from "@clerk/clerk-react";
import { sanityClient, sanityConfigured, sanityWriteEnabled } from "./lib/sanity";

const SETTINGS_KEY = "weatherhub_settings_v1";

const weatherCodeMap = {
  0: { label: "Jasno", icon: "☀️", tone: "sunny" },
  1: { label: "Pretezno jasno", icon: "🌤️", tone: "sunny" },
  2: { label: "Delno oblacno", icon: "⛅", tone: "cloudy" },
  3: { label: "Oblacno", icon: "☁️", tone: "cloudy" },
  45: { label: "Megla", icon: "🌫️", tone: "cloudy" },
  48: { label: "Megla z ivjem", icon: "🌫️", tone: "cloudy" },
  51: { label: "Rahlo rosenje", icon: "🌦️", tone: "rainy" },
  53: { label: "Zmerno rosenje", icon: "🌦️", tone: "rainy" },
  55: { label: "Mocno rosenje", icon: "🌧️", tone: "rainy" },
  61: { label: "Rahel dez", icon: "🌦️", tone: "rainy" },
  63: { label: "Zmeren dez", icon: "🌧️", tone: "rainy" },
  65: { label: "Mocan dez", icon: "⛈️", tone: "rainy" },
  71: { label: "Rahel sneg", icon: "🌨️", tone: "cloudy" },
  73: { label: "Zmeren sneg", icon: "🌨️", tone: "cloudy" },
  75: { label: "Mocan sneg", icon: "❄️", tone: "cloudy" },
  80: { label: "Kratek naliv", icon: "🌧️", tone: "rainy" },
  81: { label: "Nalivi", icon: "⛈️", tone: "rainy" },
  82: { label: "Mocni nalivi", icon: "⛈️", tone: "rainy" },
  95: { label: "Nevihta", icon: "⛈️", tone: "rainy" }
};

const favoriteQuery = `
  *[_type == "favorite" && clerkUserId == $clerkUserId]
  | order(createdAt desc) {
    _id,
    cityName,
    country,
    latitude,
    longitude,
    createdAt
  }
`;

const weekdayFormatter = new Intl.DateTimeFormat("sl-SI", { weekday: "short" });

function weatherLabel(code) {
  return weatherCodeMap[code] || { label: "Neznano", icon: "❔", tone: "cloudy" };
}

function favoriteDocumentId(clerkUserId, cityName, country) {
  return `favorite.${clerkUserId}.${cityName}.${country || "none"}`
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-");
}

function formatTemp(value) {
  if (value == null) return "-";
  return `${Math.round(value)}°C`;
}

function formatTempByUnit(value, unit) {
  if (value == null) return "-";
  if (unit === "F") {
    return `${Math.round((value * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(value)}°C`;
}

function formatDirection(value) {
  if (value == null) return "-";
  return `${Math.round(value)}°`;
}

function formatDay(date) {
  const parts = weekdayFormatter.format(new Date(date)).replace(".", "");
  return parts.charAt(0).toUpperCase() + parts.slice(1);
}

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=sl&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Neuspesno iskanje mesta.");
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

async function fetchWeatherBundle({ latitude, longitude }) {
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
  if (!res.ok) throw new Error("Neuspesno branje vremena.");
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

function WeatherIcon({ icon, tone }) {
  return (
    <div className={`weather-symbol weather-symbol-${tone}`}>
      <div className="weather-symbol-shell">
        <span className="icon-text">{icon}</span>
      </div>
    </div>
  );
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return {
      units: parsed?.units || "C",
      defaultLocationId: parsed?.defaultLocationId || "",
      theme: parsed?.theme || "light"
    };
  } catch {
    return {
      units: "C",
      defaultLocationId: "",
      theme: "light"
    };
  }
}

function AppContent() {
  const { user, isLoaded } = useUser();
  const [searchCity, setSearchCity] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [favorites, setFavorites] = useState([]);
  const [favoritesStatus, setFavoritesStatus] = useState("idle");
  const [favoritesWeather, setFavoritesWeather] = useState({});
  const [favoriteAction, setFavoriteAction] = useState("");
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    if (!isLoaded || !user) {
      setFavorites([]);
      setFavoritesWeather({});
      setFavoritesStatus("idle");
      return;
    }

    if (!sanityConfigured || !sanityClient) {
      setFavoritesStatus("config-error");
      return;
    }

    let cancelled = false;

    async function loadFavorites() {
      setFavoritesStatus("loading");
      try {
        const result = await sanityClient.fetch(favoriteQuery, {
          clerkUserId: user.id
        });

        if (!cancelled) {
          setFavorites(result);
          setFavoritesStatus("ready");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFavoritesStatus("error");
        }
      }
    }

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  useEffect(() => {
    if (!favorites.length) {
      setFavoritesWeather({});
      return;
    }

    let cancelled = false;

    async function hydrateFavoritesWeather() {
      const nextWeather = {};

      for (const favorite of favorites) {
        try {
          const bundle = await fetchWeatherBundle(favorite);
          nextWeather[favorite._id] = bundle.current;
        } catch {
          nextWeather[favorite._id] = null;
        }
      }

      if (!cancelled) {
        setFavoritesWeather(nextWeather);
      }
    }

    hydrateFavoritesWeather();

    return () => {
      cancelled = true;
    };
  }, [favorites]);

  useEffect(() => {
    if (!settings.defaultLocationId || searchResult || !favorites.length) {
      return;
    }

    const favorite = favorites.find((item) => item._id === settings.defaultLocationId);
    if (favorite) {
      handleSelectFavorite(favorite);
    }
  }, [favorites, searchResult, settings.defaultLocationId]);

  async function runWeatherLookup(location) {
    setSearchStatus("loading");
    setFavoriteAction("");

    try {
      const bundle = await fetchWeatherBundle(location);
      setSearchResult(location);
      setWeatherData(bundle);
      setSearchStatus("ready");
    } catch (error) {
      console.error(error);
      setSearchStatus("error");
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (!searchCity.trim()) {
      setSearchStatus("idle");
      return;
    }

    setWeatherData(null);
    setSearchResult(null);
    setSearchStatus("loading");

    try {
      const location = await geocodeCity(searchCity.trim());

      if (!location) {
        setSearchStatus("notfound");
        return;
      }

      await runWeatherLookup(location);
    } catch (error) {
      console.error(error);
      setSearchStatus("error");
    }
  }

  async function handleAddFavorite() {
    if (!user || !searchResult || !sanityClient) {
      return;
    }

    if (!sanityWriteEnabled) {
      setFavoriteAction("Manjka Sanity write token.");
      return;
    }

    const duplicate = favorites.some(
      (favorite) =>
        favorite.cityName.toLowerCase() === searchResult.name.toLowerCase() &&
        (favorite.country || "").toLowerCase() ===
          (searchResult.country || "").toLowerCase()
    );

    if (duplicate) {
      setFavoriteAction("Ta kraj je ze med priljubljenimi.");
      return;
    }

    setFavoriteAction("Shranjujem kraj...");

    try {
      const documentId = favoriteDocumentId(
        user.id,
        searchResult.name,
        searchResult.country
      );

      const created = await sanityClient.createIfNotExists({
        _id: documentId,
        _type: "favorite",
        clerkUserId: user.id,
        cityName: searchResult.name,
        country: searchResult.country,
        latitude: searchResult.latitude,
        longitude: searchResult.longitude,
        createdAt: new Date().toISOString()
      });

      setFavorites((current) => [created, ...current]);
      setFavoriteAction("Kraj je dodan med priljubljene.");
    } catch (error) {
      console.error(error);
      setFavoriteAction("Shranjevanje ni uspelo.");
    }
  }

  async function handleRemoveFavorite(favoriteId) {
    if (!sanityClient) {
      return;
    }

    if (!sanityWriteEnabled) {
      setFavoriteAction("Manjka Sanity write token.");
      return;
    }

    setFavoriteAction("Brisem kraj...");

    try {
      await sanityClient.delete(favoriteId);
      setFavorites((current) => current.filter((favorite) => favorite._id !== favoriteId));
      setFavoriteAction("Kraj je odstranjen.");
    } catch (error) {
      console.error(error);
      setFavoriteAction("Brisanje ni uspelo.");
    }
  }

  async function handleSelectFavorite(favorite) {
    setSearchCity(favorite.cityName);
    await runWeatherLookup({
      name: favorite.cityName,
      country: favorite.country,
      latitude: favorite.latitude,
      longitude: favorite.longitude
    });
  }

  const currentWeather = weatherData?.current;
  const forecast = weatherData?.forecast || [];
  const weatherMeta = currentWeather
    ? weatherLabel(currentWeather.weatherCode)
    : weatherLabel(1);

  return (
    <div className="page">
      <header className="app-header">
        <div className="brand-block">
          <p className="eyebrow">WeatherHub</p>
          <h1>Vreme za danes in naprej.</h1>
        </div>

        <form className="header-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Poisci mesto ali obcino"
            value={searchCity}
            onChange={(event) => setSearchCity(event.target.value)}
          />
          <button type="submit">🔍</button>
        </form>
      </header>

      <section className={`weather-hero weather-hero-${weatherMeta.tone}`}>
        <div className="weather-hero-copy">
          <p className="weather-kicker">Trenutno vreme</p>
          <h2>
            {searchResult
              ? `${searchResult.name}${searchResult.country ? `, ${searchResult.country}` : ""}`
              : "Izberi lokacijo"}
          </h2>
          <p className="weather-description">
            {currentWeather ? weatherMeta.label : "Vnesi lokacijo in preveri trenutno stanje."}
          </p>

          <div className="weather-primary">
            <WeatherIcon icon={weatherMeta.icon} tone={weatherMeta.tone} />
            <div className="weather-primary-reading">
              <p className="weather-temp-large">
                {currentWeather ? formatTempByUnit(currentWeather.temperature, settings.units) : "--°C"}
              </p>
              <p className="weather-subline">
                Feels like:{" "}
                {currentWeather
                  ? formatTempByUnit(currentWeather.apparentTemperature, settings.units)
                  : "--"}
              </p>
              <p className="weather-subline">
                H:{" "}
                {currentWeather
                  ? formatTempByUnit(currentWeather.maxTemperature, settings.units)
                  : "--"}{" "}
                L:{" "}
                {currentWeather
                  ? formatTempByUnit(currentWeather.minTemperature, settings.units)
                  : "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="weather-hero-side">
          <div className="hero-stats">
            <div className="hero-stat">
              <span>🌬️ Veter</span>
              <strong>{currentWeather ? `${Math.round(currentWeather.windSpeed)} km/h` : "-"}</strong>
            </div>
            <div className="hero-stat">
              <span>🧭 Smer</span>
              <strong>{currentWeather ? formatDirection(currentWeather.windDirection) : "-"}</strong>
            </div>
            <div className="hero-stat">
              <span>📍 Geo</span>
              <strong>
                {searchResult
                  ? `${searchResult.latitude.toFixed(1)} / ${searchResult.longitude.toFixed(1)}`
                  : "-"}
              </strong>
            </div>
          </div>

          <div className="hero-actions">
            <SignedIn>
              <button type="button" onClick={handleAddFavorite}>
                ⭐ Dodaj med priljubljene
              </button>
            </SignedIn>
            <SignedOut>
              <p className="hint hero-hint">Prijavi se, da lahko shranjujes lokacije.</p>
            </SignedOut>
            {favoriteAction && <p className="status weather-note">{favoriteAction}</p>}
            {searchStatus === "loading" && <p className="status weather-note">Nalagam podatke...</p>}
            {searchStatus === "notfound" && (
              <p className="status error weather-note">Lokacije nisem nasel.</p>
            )}
            {searchStatus === "error" && (
              <p className="status error weather-note">Branje vremena ni uspelo.</p>
            )}
          </div>
        </div>
      </section>

      <main className="content-grid">
        <section className="panel compact-panel">
          <div className="section-head">
            <h3>Search + Favorites</h3>
            <span className="section-meta">{favorites.length} krajev</span>
          </div>

          <form className="compact-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Vnesi lokacijo"
              value={searchCity}
              onChange={(event) => setSearchCity(event.target.value)}
            />
            <button type="submit">Poisci</button>
          </form>

          <div className="favorites-list">
            {favorites.length === 0 && <p className="hint">Ni shranjenih lokacij.</p>}
            {favorites.map((favorite) => {
              const current = favoritesWeather[favorite._id];
              const isActive =
                searchResult?.name === favorite.cityName &&
                searchResult?.country === favorite.country;

              return (
                <div
                  className={`favorite-row ${isActive ? "favorite-row-active" : ""}`}
                  key={`quick-${favorite._id}`}
                >
                  <div
                    className="favorite-row-main"
                    onClick={() => handleSelectFavorite(favorite)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectFavorite(favorite);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <p className="favorite-city">{favorite.cityName}</p>
                      <p className="favorite-label">
                        {current ? weatherLabel(current.weatherCode).label : "Brez podatkov"}
                      </p>
                    </div>
                    <strong className="favorite-temp">
                      {current ? formatTempByUnit(current.temperature, settings.units) : "--"}
                    </strong>
                  </div>
                  <button
                    className="remove-button"
                    type="button"
                    onClick={() => handleRemoveFavorite(favorite._id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel compact-panel">
          <div className="panel-head">
            <div>
              <h3>Uporabniski profil</h3>
              <p className="muted profile-copy">
                {user?.firstName ? `Pozdravljen, ${user.firstName}.` : "Profil uporabnika"}
              </p>
            </div>
            <SignedIn>
              <div className="user-badge">
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>

          <SignedOut>
            <div className="auth-shell">
              <p className="muted">Clerk upravlja registracijo, prijavo in sejo.</p>
              <div className="cta-row">
                <SignInButton mode="modal">
                  <button type="button">Prijava</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="ghost" type="button">
                    Registracija
                  </button>
                </SignUpButton>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="settings-list">
              <div className="setting-block">
                <span className="setting-label">Enote</span>
                <div className="segmented-control">
                  <button
                    className={settings.units === "C" ? "segment-active" : ""}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        units: "C"
                      }))
                    }
                  >
                    °C
                  </button>
                  <button
                    className={settings.units === "F" ? "segment-active" : ""}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        units: "F"
                      }))
                    }
                  >
                    °F
                  </button>
                </div>
              </div>

              <div className="setting-block">
                <label className="setting-label" htmlFor="default-location">
                  Privzeta lokacija
                </label>
                <select
                  id="default-location"
                  className="settings-select"
                  value={settings.defaultLocationId}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      defaultLocationId: event.target.value
                    }))
                  }
                >
                  <option value="">Brez privzete lokacije</option>
                  {favorites.map((favorite) => (
                    <option key={favorite._id} value={favorite._id}>
                      {favorite.cityName}
                      {favorite.country ? `, ${favorite.country}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-block">
                <span className="setting-label">Tema</span>
                <div className="segmented-control">
                  <button
                    className={settings.theme === "light" ? "segment-active" : ""}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        theme: "light"
                      }))
                    }
                  >
                    Light
                  </button>
                  <button
                    className={settings.theme === "dark" ? "segment-active" : ""}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        theme: "dark"
                      }))
                    }
                  >
                    Dark
                  </button>
                </div>
              </div>

              {favoritesStatus === "config-error" && (
                <p className="status error">Sanity ni nastavljen.</p>
              )}
              {favoritesStatus === "error" && (
                <p className="status error">Branje iz Sanity ni uspelo.</p>
              )}

              <SignOutButton>
                <button className="signout-button" type="button">
                  Odjava
                </button>
              </SignOutButton>
            </div>
          </SignedIn>
        </section>
      </main>

      <section className="panel forecast-panel">
        <div className="section-head">
          <h3>Napoved</h3>
          <span className="section-meta">Naslednjih 5 dni</span>
        </div>

        <div className="forecast-grid">
          {forecast.length === 0 && <p className="hint">Forecast bo prikazan po izbiri lokacije.</p>}
          {forecast.map((day) => {
            const meta = weatherLabel(day.weatherCode);

            return (
              <div className="forecast-card" key={day.date}>
                <p className="forecast-day">{formatDay(day.date)}</p>
                <div className="forecast-icon">{meta.icon}</div>
                <p className="forecast-temp">{formatTempByUnit(day.maxTemperature, settings.units)}</p>
                <p className="forecast-low">L: {formatTempByUnit(day.minTemperature, settings.units)}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
