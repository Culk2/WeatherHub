import { SignedIn, SignedOut } from "@clerk/clerk-react";
import WeatherIcon from "./WeatherIcon";
import { formatDirection, formatTempByUnit } from "../lib/weather";

export default function WeatherHero({
  currentWeather,
  favoriteAction,
  locationMessage,
  locationStatus,
  onAddFavorite,
  searchResult,
  searchStatus,
  settings,
  weatherMeta
}) {
  return (
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
              {currentWeather
                ? formatTempByUnit(currentWeather.temperature, settings.units)
                : "--°C"}
            </p>
            <p className="weather-subline">
              Občutek:{" "}
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
            <button type="button" onClick={onAddFavorite}>
              ⭐ Dodaj med priljubljene
            </button>
          </SignedIn>

          <SignedOut>
            <p className="hint hero-hint">Prijavi se, da lahko shranjuješ lokacije.</p>
          </SignedOut>

          {favoriteAction && <p className="status weather-note">{favoriteAction}</p>}
          {locationStatus === "requesting" && (
            <p className="status weather-note">Brskalnik preverja dostop do tvoje lokacije...</p>
          )}
          {locationStatus === "loading" && (
            <p className="status weather-note">Nalagam vreme za tvojo trenutno lokacijo...</p>
          )}
          {locationStatus === "denied" && <p className="status weather-note">{locationMessage}</p>}
          {searchStatus === "loading" && <p className="status weather-note">Nalagam podatke...</p>}
          {searchStatus === "notfound" && (
            <p className="status error weather-note">Lokacije nisem našel.</p>
          )}
          {searchStatus === "error" && (
            <p className="status error weather-note">Branje vremena ni uspelo.</p>
          )}
          {locationStatus === "error" && <p className="status error weather-note">{locationMessage}</p>}
          {locationStatus === "unsupported" && (
            <p className="status error weather-note">{locationMessage}</p>
          )}
          {locationStatus === "granted" && locationMessage && (
            <p className="status weather-note">{locationMessage}</p>
          )}
        </div>
      </div>
    </section>
  );
}
