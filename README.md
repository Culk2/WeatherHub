# WeatherHub

React aplikacija za preverjanje vremena z naslednjo integracijo:

- `Clerk` za registracijo in prijavo
- `Sanity` za shranjevanje priljubljenih krajev
- `Open-Meteo` za podatke o vremenu

## Zagon

1. Namesti odvisnosti:

```powershell
npm install
```

2. Ustvari `.env` na osnovi `.env.example`.

3. Zazeni razvojni streznik:

```powershell
npm run dev
```

## Potrebne `.env` vrednosti

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
VITE_SANITY_PROJECT_ID=your_project_id
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2025-03-24
VITE_SANITY_WRITE_TOKEN=your_sanity_write_token
```

## Sanity schema

V svoj Sanity Studio dodaj schema datoteko iz:

- `sanity/favoriteSchema.js`

Ta schema definira dokument `favorite`, ki vsebuje:

- `clerkUserId`
- `cityName`
- `country`
- `latitude`
- `longitude`
- `createdAt`

## Pomembno

Ta implementacija zapisuje v Sanity neposredno iz frontenda prek `VITE_SANITY_WRITE_TOKEN`.
To je sprejemljivo za demo ali studentski projekt, ni pa dobra produkcijska praksa.

Za produkcijo naredi naslednje:

1. zapis v Sanity prestavi na backend ali serverless funkcijo
2. Clerk sejo preveri na backendu
3. write token hrani samo na strezniku
