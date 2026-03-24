export const SETTINGS_KEY = "weatherhub_settings_v1";

export function loadSettings() {
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
