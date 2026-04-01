# ChemIP Frontend

ChemIP 사용자 UI (Next.js App Router)입니다.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## Run

```bash
npm install
npm run dev
```

- Default URL: `http://localhost:7000`

## Public Network Run

```bash
npm run dev:public
```

- Access from other devices in same network: `http://<HOST_IP>:7000`

### Temporary Internet Share

```bash
npm run tunnel
```

- Generates temporary `localtunnel` URL

## Main Screens

- `/` Home search (chemicals + drugs quick access)
- `/chemical/[id]` Chemical detail tabs
  - `MSDS`
  - `Bilingual`
  - `Patents`
  - `Market`
  - `KOSHA Guides`
  - `AI`
- `/patents`
- `/trade`
- `/drugs`

## Quality Check

```bash
npm run lint
npm run build
```

## Runtime E2E Spot Check

`KOSHA Guides` tab runtime check:

```bash
npx playwright test e2e/kosha-guides-tab.spec.ts --browser=chromium --reporter=line
```

- Verifies: tab visible -> click -> panel visible
- Evidence screenshot: `docs/screenshots/runtime_check_20260301/07_chemical_kosha_guides_tab.png`

## Directory

```text
app/         # route pages
components/  # shared UI components
lib/         # utils/constants/http wrappers
public/      # static assets
```
