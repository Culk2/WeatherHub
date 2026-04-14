import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import AdminAccessDenied from "./components/AdminAccessDenied";
import AdminPage from "./components/AdminPage";
import FavoritesPanel from "./components/FavoritesPanel";
import ForecastPanel from "./components/ForecastPanel";
import HourlyForecastPanel from "./components/HourlyForecastPanel";
import PrecipitationHistoryPanel from "./components/PrecipitationHistoryPanel";
import ProfilePanel from "./components/ProfilePanel";
import SiteNotice from "./components/SiteNotice";
import WeatherHero from "./components/WeatherHero";
import { hasAdminGuardConfigured, isAdminUser } from "./lib/admin";
import { favoriteDocumentId, favoriteQuery } from "./lib/favorites";
import { sanityClient, sanityConfigured, sanityWriteEnabled } from "./lib/sanity";
import { loadSettings, SETTINGS_KEY } from "./lib/settings";
import { emptySiteNotice, normalizeSiteNotice, siteNoticeQuery } from "./lib/siteNotice";
import {
  fetchPreviousMonthPrecipitation,
  fetchWeatherBundle,
  geocodeCity,
  reverseGeocodeCity,
  weatherLabel
} from "./lib/weather";

function fallbackLocationFromCoords(latitude, longitude) {
  return {
    name: "Trenutna lokacija",
    country: "",
    latitude,
    longitude
  };
}

export default function App() {
  const { user, isLoaded } = useUser();
  const [pathname, setPathname] = useState(window.location.pathname);
  const [searchCity, setSearchCity] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [favorites, setFavorites] = useState([]);
  const [favoritesStatus, setFavoritesStatus] = useState("idle");
  const [favoritesWeather, setFavoritesWeather] = useState({});
  const [favoriteAction, setFavoriteAction] = useState("");
  const [settings, setSettings] = useState(loadSettings);
  const [siteNotice, setSiteNotice] = useState(emptySiteNotice);
  const [noticeDraft, setNoticeDraft] = useState(emptySiteNotice);
  const [noticeStatus, setNoticeStatus] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [precipitationHistory, setPrecipitationHistory] = useState(null);
  const [precipitationStatus, setPrecipitationStatus] = useState("idle");
  const [isPrecipitationModalOpen, setIsPrecipitationModalOpen] = useState(false);
  const hasUserChosenLocationRef = useRef(false);

  useEffect(() => {
    function syncPathname() {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", syncPathname);
    return () => {
      window.removeEventListener("popstate", syncPathname);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

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
    if (!sanityConfigured || !sanityClient) {
      setSiteNotice(emptySiteNotice);
      setNoticeDraft(emptySiteNotice);
      return;
    }

    let cancelled = false;

    async function loadSiteNotice() {
      try {
        const result = await sanityClient.fetch(siteNoticeQuery);
        const normalized = normalizeSiteNotice(result);

        if (!cancelled) {
          setSiteNotice(normalized);
          setNoticeDraft(normalized);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadSiteNotice();

    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (
      searchResult ||
      settings.defaultLocationId ||
      hasUserChosenLocationRef.current ||
      !navigator.geolocation
    ) {
      if (!navigator.geolocation) {
        setLocationStatus("unsupported");
        setLocationMessage("Brskalnik ne podpira zaznave lokacije.");
      }
      return;
    }

    let cancelled = false;

    handleUseCurrentLocation({
      cancelledRef: () => cancelled,
      isAutomatic: true
    });

    return () => {
      cancelled = true;
    };
  }, [searchResult, settings.defaultLocationId]);

  useEffect(() => {
    if (!searchResult) {
      setPrecipitationHistory(null);
      setPrecipitationStatus("idle");
      return;
    }

    let cancelled = false;

    async function loadPrecipitationHistory() {
      setPrecipitationStatus("loading");

      try {
        const history = await fetchPreviousMonthPrecipitation(searchResult);

        if (!cancelled) {
          setPrecipitationHistory(history);
          setPrecipitationStatus("ready");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPrecipitationStatus("error");
        }
      }
    }

    loadPrecipitationHistory();

    return () => {
      cancelled = true;
    };
  }, [searchResult]);

  useEffect(() => {
    if (!isPrecipitationModalOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsPrecipitationModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isPrecipitationModalOpen]);

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
    hasUserChosenLocationRef.current = true;

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
      setFavoriteAction("Ta kraj je že med priljubljenimi.");
      return;
    }

    setFavoriteAction("Shranjujem kraj...");

    try {
      const created = await sanityClient.createIfNotExists({
        _id: favoriteDocumentId(user.id, searchResult.name, searchResult.country),
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

    setFavoriteAction("Brišem kraj...");

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
    hasUserChosenLocationRef.current = true;
    setSearchCity(favorite.cityName);

    await runWeatherLookup({
      name: favorite.cityName,
      country: favorite.country,
      latitude: favorite.latitude,
      longitude: favorite.longitude
    });
  }

  function handleGeolocationError(errorCode) {
    if (errorCode === 1) {
      setLocationStatus("denied");
      setLocationMessage("Dostop do lokacije ni dovoljen.");
      return;
    }

    if (errorCode === 2) {
      setLocationStatus("error");
      setLocationMessage("Trenutne lokacije ni bilo mogoče določiti.");
      return;
    }

    if (errorCode === 3) {
      setLocationStatus("error");
      setLocationMessage("Zahteva za lokacijo je potekla.");
      return;
    }

    setLocationStatus("error");
    setLocationMessage("Branje trenutne lokacije ni uspelo.");
  }

  function handleUseCurrentLocation({ cancelledRef = () => false, isAutomatic = false } = {}) {
    if (!isAutomatic) {
      hasUserChosenLocationRef.current = true;
    }

    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      setLocationMessage("Brskalnik ne podpira zaznave lokacije.");
      return;
    }

    setLocationStatus("requesting");
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (cancelledRef()) {
          return;
        }

        setLocationStatus("loading");

        try {
          let location;

          try {
            location = await reverseGeocodeCity(coords.latitude, coords.longitude);
          } catch (error) {
            console.error(error);
            location = fallbackLocationFromCoords(coords.latitude, coords.longitude);
            if (!cancelledRef()) {
              setLocationMessage("Mesta ni bilo mogoče določiti, vreme prikazujem po koordinatah.");
            }
          }

          if (cancelledRef() || (isAutomatic && hasUserChosenLocationRef.current)) {
            return;
          }

          await runWeatherLookup(location);
          setLocationStatus("granted");
        } catch (error) {
          console.error(error);
          if (!cancelledRef()) {
            setLocationStatus("error");
            setLocationMessage("Branje vremena za trenutno lokacijo ni uspelo.");
          }
        }
      },
      (error) => {
        if (!cancelledRef()) {
          handleGeolocationError(error.code);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  }

  function updateSettings(patch) {
    setSettings((current) => ({
      ...current,
      ...patch
    }));
  }

  function updateNoticeDraft(patch) {
    setNoticeDraft((current) => ({
      ...current,
      ...patch
    }));
  }

  async function handleSaveNotice() {
    if (!sanityClient || !sanityWriteEnabled) {
      setNoticeStatus("Shranjevanje ni možno brez Sanity write tokena.");
      return;
    }

    setNoticeStatus("Shranjujem obvestilo...");

    try {
      const nextNotice = {
        _id: "site-notice",
        _type: "siteNotice",
        title: noticeDraft.title.trim(),
        message: noticeDraft.message.trim(),
        isActive: noticeDraft.isActive,
        updatedAt: new Date().toISOString()
      };

      await sanityClient.createOrReplace(nextNotice);

      const normalized = normalizeSiteNotice(nextNotice);
      setSiteNotice(normalized);
      setNoticeDraft(normalized);
      setNoticeStatus("Obvestilo je shranjeno.");
    } catch (error) {
      console.error(error);
      setNoticeStatus("Shranjevanje obvestila ni uspelo.");
    }
  }

  const currentWeather = weatherData?.current;
  const forecast = weatherData?.forecast || [];
  const hourly = weatherData?.hourly || [];
  const weatherMeta = currentWeather
    ? weatherLabel(currentWeather.weatherCode)
    : weatherLabel(1);

  if (pathname === "/admin") {
    if (!isAdminUser(user)) {
      return (
        <AdminAccessDenied
          hasGuardConfigured={hasAdminGuardConfigured()}
          isLoaded={isLoaded}
          isSignedIn={Boolean(user)}
        />
      );
    }

    return (
      <AdminPage
        noticeDraft={noticeDraft}
        noticeStatus={noticeStatus}
        onDraftChange={updateNoticeDraft}
        onSave={handleSaveNotice}
        sanityConfigured={sanityConfigured}
      />
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="brand-block">
          <p className="eyebrow">WeatherHub</p>
          <h1>Vreme za danes in naprej.</h1>
        </div>

        <div className="header-actions">
          <form className="header-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Poišči mesto ali občino"
              value={searchCity}
              onChange={(event) => setSearchCity(event.target.value)}
            />
            <button type="submit">🔍</button>
          </form>
          <button
            className="location-button"
            type="button"
            onClick={() => handleUseCurrentLocation()}
          >
            📍 Moja lokacija
          </button>
        </div>
      </header>

      <SiteNotice notice={siteNotice} />

      <WeatherHero
        currentWeather={currentWeather}
        favoriteAction={favoriteAction}
        locationMessage={locationMessage}
        locationStatus={locationStatus}
        onAddFavorite={handleAddFavorite}
        onOpenPrecipitationModal={() => setIsPrecipitationModalOpen(true)}
        searchResult={searchResult}
        searchStatus={searchStatus}
        settings={settings}
        weatherMeta={weatherMeta}
      />

      <HourlyForecastPanel hourly={hourly} settings={settings} />
      <ForecastPanel forecast={forecast} settings={settings} />

      <main className="content-grid">
        <FavoritesPanel
          favorites={favorites}
          favoritesWeather={favoritesWeather}
          onRemoveFavorite={handleRemoveFavorite}
          onSelectFavorite={handleSelectFavorite}
          searchResult={searchResult}
          settings={settings}
        />

        <ProfilePanel
          favorites={favorites}
          favoritesStatus={favoritesStatus}
          onSettingsChange={updateSettings}
          settings={settings}
          user={user}
        />
      </main>

      {isPrecipitationModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsPrecipitationModalOpen(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="precipitation-modal-title"
          >
            <div className="modal-head">
              <h2 id="precipitation-modal-title">Graf padavin</h2>
              <button
                className="modal-close"
                type="button"
                onClick={() => setIsPrecipitationModalOpen(false)}
                aria-label="Zapri okno"
              >
                ×
              </button>
            </div>
            <PrecipitationHistoryPanel
              history={precipitationHistory}
              status={precipitationStatus}
            />
          </div>
        </div>
      )}
    </div>
  );
}
