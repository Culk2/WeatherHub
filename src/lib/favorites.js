export const favoriteQuery = `
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

export function favoriteDocumentId(clerkUserId, cityName, country) {
  return `favorite.${clerkUserId}.${cityName}.${country || "none"}`
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-");
}
