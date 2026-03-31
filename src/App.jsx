import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import AdminAccessDenied from "./components/AdminAccessDenied";
import AdminPage from "./components/AdminPage";
import FavoritesPanel from "./components/FavoritesPanel";
import ForecastPanel from "./components/ForecastPanel";
import HourlyForecastPanel from "./components/HourlyForecastPanel";
import ProfilePanel from "./components/ProfilePanel";
import SiteNotice from "./components/SiteNotice";
import WeatherHero from "./components/WeatherHero";
import { hasAdminGuardConfigured, isAdminUser } from "./lib/admin";
import { favoriteDocumentId, favoriteQuery } from "./lib/favorites";
import { sanityClient, sanityConfigured, sanityWriteEnabled } from "./lib/sanity";
import { loadSettings, SETTINGS_KEY } from "./lib/settings";
import { emptySiteNotice, normalizeSiteNotice, siteNoticeQuery } from "./lib/siteNotice";
import { fetchWeatherBundle, geocodeCity, weatherLabel } from "./lib/weather";

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
      setFavoriteAction("Ta kraj je že med priljubljenimi.");
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
    setSearchCity(favorite.cityName);
    await runWeatherLookup({
      name: favorite.cityName,
      country: favorite.country,
      latitude: favorite.latitude,
      longitude: favorite.longitude
    });
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
  const hasAdminAccess = isAdminUser(user);
  const adminGuardConfigured = hasAdminGuardConfigured();

  if (pathname === "/admin") {
    if (!hasAdminAccess) {
      return (
        <AdminAccessDenied
          hasGuardConfigured={adminGuardConfigured}
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

        <form className="header-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Poišči mesto ali občino"
            value={searchCity}
            onChange={(event) => setSearchCity(event.target.value)}
          />
          <button type="submit">🔍</button>
        </form>
      </header>

      <SiteNotice notice={siteNotice} />

      <WeatherHero
        currentWeather={currentWeather}
        favoriteAction={favoriteAction}
        onAddFavorite={handleAddFavorite}
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
    </div>
  );
}
