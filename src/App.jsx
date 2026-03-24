import { useEffect, useMemo, useState } from "react";

const USERS_KEY = "wh_users_v1";
const SESSION_KEY = "wh_session_v1";

const weatherCodeMap = {
  0: { label: "Jasno", icon: "☀️" },
  1: { label: "Pretežno jasno", icon: "🌤️" },
  2: { label: "Delno oblačno", icon: "⛅" },
  3: { label: "Oblačno", icon: "☁️" },
  45: { label: "Megla", icon: "🌫️" },
  48: { label: "Zmrznjena megla", icon: "🌫️" },
  51: { label: "Rahlo rosenje", icon: "🌦️" },
  53: { label: "Zmerno rosenje", icon: "🌦️" },
  55: { label: "Močno rosenje", icon: "🌧️" },
  56: { label: "Rosenje z zmrzaljo", icon: "🌧️" },
  57: { label: "Močno rosenje z zmrzaljo", icon: "🌧️" },
  61: { label: "Rahel dež", icon: "🌦️" },
  63: { label: "Zmeren dež", icon: "🌧️" },
  65: { label: "Močan dež", icon: "🌧️" },
  66: { label: "Dež z zmrzaljo", icon: "🌧️" },
  67: { label: "Močan dež z zmrzaljo", icon: "🌧️" },
  71: { label: "Rahel sneg", icon: "🌨️" },
  73: { label: "Zmeren sneg", icon: "🌨️" },
  75: { label: "Močan sneg", icon: "❄️" },
  77: { label: "Snežna zrna", icon: "❄️" },
  80: { label: "Kratek naliv", icon: "🌧️" },
  81: { label: "Nalivi", icon: "🌧️" },
  82: { label: "Močni nalivi", icon: "⛈️" },
  85: { label: "Snežne plohe", icon: "🌨️" },
  86: { label: "Močne snežne plohe", icon: "❄️" },
  95: { label: "Nevihta", icon: "⛈️" },
  96: { label: "Nevihta s točo", icon: "⛈️" },
  99: { label: "Močna nevihta s točo", icon: "⛈️" }
};

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function weatherLabel(code) {
  return weatherCodeMap[code] || { label: "Neznano", icon: "❔" };
}

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=sl&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Neuspešno iskanje mesta.");
  const data = await res.json();
  if (!data.results || !data.results.length) return null;
  const result = data.results[0];
  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude
  };
}

async function fetchCurrentWeather({ latitude, longitude }) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Neuspešno branje vremena.");
  const data = await res.json();
  return data.current_weather;
}

function updateUser(users, updatedUser) {
  return users.map((user) => (user.id === updatedUser.id ? updatedUser : user));
}

export default function App() {
  const [users, setUsers] = useState(loadUsers);
  const [session, setSession] = useState(loadSession);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchWeather, setSearchWeather] = useState(null);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [favoritesStatus, setFavoritesStatus] = useState("idle");
  const [favoritesWeather, setFavoritesWeather] = useState({});

  const activeUser = useMemo(() => {
    if (!session) return null;
    return users.find((user) => user.id === session.userId) || null;
  }, [session, users]);

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    if (!activeUser || !activeUser.favorites.length) {
      setFavoritesWeather({});
      return;
    }
    let canceled = false;
    async function loadFavorites() {
      setFavoritesStatus("loading");
      const payload = {};
      for (const fav of activeUser.favorites) {
        try {
          const current = await fetchCurrentWeather(fav);
          payload[fav.name] = current;
        } catch {
          payload[fav.name] = null;
        }
      }
      if (!canceled) {
        setFavoritesWeather(payload);
        setFavoritesStatus("ready");
      }
    }
    loadFavorites();
    return () => {
      canceled = true;
    };
  }, [activeUser]);

  function handleRegister(event) {
    event.preventDefault();
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const name = form.get("name").trim();
    const email = form.get("email").trim().toLowerCase();
    const password = form.get("password");

    if (!name || !email || !password) {
      setAuthError("Prosim izpolni vsa polja.");
      return;
    }

    if (users.some((user) => user.email === email)) {
      setAuthError("Uporabnik s tem e-poštnim naslovom že obstaja.");
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      favorites: []
    };
    setUsers((prev) => [...prev, newUser]);
    setSession({ userId: newUser.id });
  }

  function handleLogin(event) {
    event.preventDefault();
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const email = form.get("email").trim().toLowerCase();
    const password = form.get("password");

    const found = users.find((user) => user.email === email);
    if (!found || found.password !== password) {
      setAuthError("Napačen e-poštni naslov ali geslo.");
      return;
    }

    setSession({ userId: found.id });
  }

  function handleLogout() {
    setSession(null);
    setSearchCity("");
    setSearchResult(null);
    setSearchWeather(null);
    setFavoritesWeather({});
  }

  async function handleSearch(event) {
    event.preventDefault();
    setSearchResult(null);
    setSearchWeather(null);
    if (!searchCity.trim()) return;
    setSearchStatus("loading");
    try {
      const location = await geocodeCity(searchCity.trim());
      if (!location) {
        setSearchStatus("notfound");
        return;
      }
      const current = await fetchCurrentWeather(location);
      setSearchResult(location);
      setSearchWeather(current);
      setSearchStatus("ready");
    } catch (error) {
      console.error(error);
      setSearchStatus("error");
    }
  }

  function handleAddFavorite() {
    if (!activeUser || !searchResult) return;
    const exists = activeUser.favorites.some(
      (fav) => fav.name.toLowerCase() === searchResult.name.toLowerCase()
    );
    if (exists) return;
    const updatedUser = {
      ...activeUser,
      favorites: [
        ...activeUser.favorites,
        {
          name: searchResult.name,
          country: searchResult.country,
          latitude: searchResult.latitude,
          longitude: searchResult.longitude
        }
      ]
    };
    setUsers((prev) => updateUser(prev, updatedUser));
  }

  function handleRemoveFavorite(name) {
    if (!activeUser) return;
    const updatedUser = {
      ...activeUser,
      favorites: activeUser.favorites.filter((fav) => fav.name !== name)
    };
    setUsers((prev) => updateUser(prev, updatedUser));
  }

  const searchWeatherLabel = searchWeather
    ? weatherLabel(searchWeather.weathercode)
    : null;

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">WeatherHub</p>
          <h1>Vreme, kjerkoli. Shranjeno, takoj, tvoje.</h1>
          <p className="lead">
            Hiter vpogled v trenutno vreme, priljubljeni kraji in personalizirana
            izkušnja za registrirane uporabnike.
          </p>
        </div>
        <div className="hero-card">
          <p className="card-title">Trenutni fokus</p>
          <div className="mini-stack">
            <div>
              <p className="muted">Lokacija</p>
              <p className="strong">{searchResult?.name || "Ljubljana"}</p>
            </div>
            <div>
              <p className="muted">Status</p>
              <p className="strong">
                {searchWeatherLabel?.label || "Jasno"}
              </p>
            </div>
            <div>
              <p className="muted">Temperatura</p>
              <p className="strong">
                {searchWeather?.temperature != null
                  ? `${Math.round(searchWeather.temperature)}°C`
                  : "18°C"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>Preveri vreme</h2>
          <form onSubmit={handleSearch} className="search">
            <input
              type="text"
              placeholder="Vnesi mesto (npr. Maribor)"
              value={searchCity}
              onChange={(event) => setSearchCity(event.target.value)}
            />
            <button type="submit">Poišči</button>
          </form>
          <div className="status">
            {searchStatus === "loading" && "Iščem podatke..."}
            {searchStatus === "notfound" && "Mesta nisem našel. Poskusi znova."}
            {searchStatus === "error" && "Prišlo je do napake. Poskusi znova."}
          </div>
          {searchResult && searchWeather && (
            <div className="weather-card">
              <div className="weather-main">
                <span className="icon">{searchWeatherLabel.icon}</span>
                <div>
                  <p className="place">
                    {searchResult.name}, {searchResult.country}
                  </p>
                  <p className="desc">{searchWeatherLabel.label}</p>
                </div>
              </div>
              <div className="weather-meta">
                <p>
                  <span className="muted">Temperatura</span>
                  <span>{Math.round(searchWeather.temperature)}°C</span>
                </p>
                <p>
                  <span className="muted">Veter</span>
                  <span>{Math.round(searchWeather.windspeed)} km/h</span>
                </p>
              </div>
              {activeUser && (
                <button className="ghost" onClick={handleAddFavorite}>
                  Dodaj med priljubljene
                </button>
              )}
              {!activeUser && (
                <p className="hint">Prijavi se, da dodaš mesto med priljubljene.</p>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Profil uporabnika</h2>
            {activeUser && (
              <button className="ghost small" onClick={handleLogout}>
                Odjava
              </button>
            )}
          </div>

          {!activeUser && (
            <div>
              <div className="tabs">
                <button
                  className={authMode === "login" ? "active" : ""}
                  onClick={() => setAuthMode("login")}
                >
                  Prijava
                </button>
                <button
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => setAuthMode("register")}
                >
                  Registracija
                </button>
              </div>
              {authMode === "login" ? (
                <form onSubmit={handleLogin} className="auth">
                  <input name="email" type="email" placeholder="E-pošta" />
                  <input name="password" type="password" placeholder="Geslo" />
                  <button type="submit">Prijavi me</button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="auth">
                  <input name="name" type="text" placeholder="Ime in priimek" />
                  <input name="email" type="email" placeholder="E-pošta" />
                  <input name="password" type="password" placeholder="Geslo" />
                  <button type="submit">Ustvari račun</button>
                </form>
              )}
              {authError && <p className="status error">{authError}</p>}
              <p className="hint">
                Podatki se hranijo lokalno v brskalniku (demo).
              </p>
            </div>
          )}

          {activeUser && (
            <div className="profile">
              <p className="welcome">Pozdravljen, {activeUser.name}.</p>
              <p className="muted">
                Tvoj seznam priljubljenih krajev je pripravljen za hiter pregled.
              </p>
              <div className="favorites">
                {activeUser.favorites.length === 0 && (
                  <p className="hint">Še nimaš shranjenih krajev.</p>
                )}
                {activeUser.favorites.map((fav) => {
                  const current = favoritesWeather[fav.name];
                  const label = current
                    ? weatherLabel(current.weathercode)
                    : null;
                  return (
                    <div className="favorite" key={fav.name}>
                      <div>
                        <p className="strong">
                          {fav.name}
                          {fav.country ? `, ${fav.country}` : ""}
                        </p>
                        <p className="muted">
                          {label ? label.label : "Ni podatkov"}
                        </p>
                      </div>
                      <div className="favorite-meta">
                        <span>
                          {current
                            ? `${Math.round(current.temperature)}°C`
                            : "—"}
                        </span>
                        <button
                          className="ghost small"
                          onClick={() => handleRemoveFavorite(fav.name)}
                        >
                          Odstrani
                        </button>
                      </div>
                    </div>
                  );
                })}
                {favoritesStatus === "loading" && (
                  <p className="status">Osvežujem podatke...</p>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <section className="panel full">
        <h2>Kako deluje</h2>
        <div className="features">
          <div>
            <p className="strong">Registracija & prijava</p>
            <p className="muted">
              Ustvari račun in se varno prijavi v WeatherHub.
            </p>
          </div>
          <div>
            <p className="strong">Iskanje vremena</p>
            <p className="muted">
              Vnesi mesto in takoj dobi temperaturo, opis in ikono.
            </p>
          </div>
          <div>
            <p className="strong">Priljubljeni kraji</p>
            <p className="muted">
              Dodajaj in odstranjuj kraje za hitri pregled.
            </p>
          </div>
          <div>
            <p className="strong">Shranjeno v bazi</p>
            <p className="muted">
              Demo uporablja localStorage, pripravljen za priklop prave baze.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
