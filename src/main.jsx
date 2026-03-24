import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.jsx";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = createRoot(document.getElementById("root"));

function ConfigErrorScreen() {
  return (
    <div className="page">
      <section className="panel">
        <p className="eyebrow">WeatherHub</p>
        <h1>Manjka Clerk konfiguracija</h1>
        <p className="lead">
          Aplikacija se ni mogla zagnati, ker manjka `VITE_CLERK_PUBLISHABLE_KEY`.
        </p>
        <p className="muted">
          Ustvari `.env` datoteko in dodaj svoj Clerk publishable key.
        </p>
        <pre className="code-block">VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx</pre>
      </section>
    </div>
  );
}

if (!clerkPublishableKey) {
  root.render(
    <React.StrictMode>
      <ConfigErrorScreen />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}
