import { createClient } from "@sanity/client";

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET;
const apiVersion = import.meta.env.VITE_SANITY_API_VERSION || "2025-03-24";
const token = import.meta.env.VITE_SANITY_WRITE_TOKEN;

export const sanityConfigured = Boolean(projectId && dataset);
export const sanityWriteEnabled = Boolean(projectId && dataset && token);

export const sanityClient = sanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      token,
      perspective: "published"
    })
  : null;
