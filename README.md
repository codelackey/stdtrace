# Milsoft `.STD` Switching, Backfeed & Phase-Aware Trace Simulator

An interactive, zero-dependency electrical distribution simulator that models a dual-substation network using Milsoft WindMil `.STD` topology conventions and visualizes real-time switching, backfeeds, outages, parallel loops, and phase-aware upstream/downstream traces on a Leaflet map.

The application runs in **dual mode**:
* **Live Sync Mode (`LIVE SYNC`):** Powered by a zero-dependency Node.js server (`server.mjs`) using Server-Sent Events (SSE) and lightweight **Delta Sync** messages (`INIT`, `DELTA`, `RESET`) to synchronize switching operations across multiple open browser tabs or operator screens in real time.
* **Standalone Mode (`STANDALONE`):** Runs purely client-side on static hosts like GitHub Pages with automatic fallback when no backend stream is present.

---

## Key Features
* **Lightweight Multi-Client Delta Sync (`server.mjs`):** Rather than re-sending full network geometry on every action, the server tracks only off-nominal switch `overrides` (`section_id -> 0 | 1`) and broadcasts ~50-byte `DELTA` JSON payloads over `/api/events` (SSE) using only Node.js built-in modules (`node:http`, `node:fs/promises`)—requiring zero `npm install` or `node_modules` disk overhead.
* **Observability & Console Telemetry:** Timestamped `[SERVER]` terminal logs and `[SYNC]` / `[TRACE]` browser DevTools console logs report client connections, byte payload sizes, active override counts, and trace operations in real time.
* **Real-Time Switching Operations:** Click any Substation Breaker (`Type 9`), Recloser/Fuse (`Type 10`), Switch (`Type 6`), or Transformer (`Type 5`) to toggle it open or closed and immediately re-evaluate system energization.
* **Automatic Backfeed & Loop Detection:** Identifies sections fed by an alternate substation across closed tie switches (**amber**) and warns operators if two substations are tied in parallel (**magenta**).
* **Phase-Aware Upstream & Downstream Tracing:** Filter traces by `All (ABC)`, `Phase A`, `Phase B`, or `Phase C` to trace live power flow back to the active source or downstream to affected consumers and connected kVA.
* **WindMil `.STD` Export:** Generates a fixed 11-column comma-delimited `.STD` file reflecting current switch states (`O`/`C` in Field `E-9`) and tie partner identifiers (`Field E-11`).

---

## Project Architecture

```text
├── index.html     # Toolbar, LIVE SYNC/STANDALONE pill, <dialog> Help modal, and map container
├── style.css      # Header layout, sync status badge, modal dialog, and floating legend styles
├── data.js        # Milsoft .STD data model, undirected graph builder, and trace algorithms
├── app.js         # Dual-mode SSE Delta Sync client, Leaflet rendering, SVG symbology, and UI handlers
├── server.mjs     # Zero-dependency Node.js static file & SSE Delta Sync broadcast server
└── package.json   # Minimal {"type":"module"} manifest enabling native ES modules in Node
```

---

## How It Works Under the Hood

### 1. Milsoft `.STD` Data Model (`data.js`)
Every element in `initialSections` follows a uniform schema aligned with the Milsoft WindMil `.STD` specification:

| Property | WindMil `.STD` Field | Description |
| :--- | :--- | :--- |
| `section_id` | `E-1` (Section ID) | Unique identifier for the line segment, device, or consumer. |
| `element_type` | `E-2` (Element Type) | `9` = Source, `1` = Overhead Line, `10` = Recloser/Fuse, `6` = Switch, `5` = Transformer, `11` = Service Drop, `8` = Consumer/Meter. |
| `phasing` | `E-3` (Phasing) | Active conductors carried by the element (`ABC`, `BC`, `A`, `B`, `C`). |
| `parent_id` | `E-4` (Parent ID) | Upstream parent element ID in the nominal radial tree (`ROOT` for substation sources). |
| `start_lng` / `start_lat` | `E-5` / `E-6` | Starting coordinates (WGS84 longitude/latitude). |
| `end_lng` / `end_lat` | `E-7` / `E-8` | Ending coordinates (identical to start coordinates for point nodes like meters). |
| `is_open` | `E-9` (Switch Status) | `0` = Closed (`C`), `1` = Open (`O`). |
| `connected_kva` | `E-9` (Consumer Load) | Connected load in kVA for Consumer/Meter records (`Type 8`). |
| `partner_id` | `E-11` (Partner ID) | For tie switches (`Type 6`), points to the paired element ID on the adjacent feeder. |

### 2. Undirected Graph & Real-Time Energization (`analyzeEnergization`)
In a static `.STD` file, `parent_id` encodes only the *nominal* radial feed direction. When an upstream breaker opens and a tie switch closes, power flows backward against the nominal `parent_id` pointers. To support backfeeds without mutating `parent_id`:

1. **Undirected Adjacency List:** `analyzeEnergization()` builds a bidirectional adjacency map (`adj`) linking every section to both its `parent_id` and (for tie switches) its `partner_id`.
2. **Multi-Source Breadth-First Search (BFS):** Starting from every closed Source (`element_type === 9` and `is_open === 0`), BFS propagates outward across closed neighbors (`is_open === 0`).
3. **Phase Intersection (`intersectPhases`):** At every hop, the active phase set is intersected with the next element's phasing (`activePhases ∩ next.phasing`). If no phases overlap (for example, `Phase B` meeting a `Phase A` lateral tap), propagation stops at that boundary.
4. **Dynamic Flow Direction (`flowParents` & `flowChildren`):** As BFS discovers each energized element, it records which neighbor energized it (`flowParents`) and which neighbors it feeds (`flowChildren`). This dynamically reorients "upstream" and "downstream" during a backfeed.
5. **Backfeed & Parallel Loop Classification:**
   * **0 sources:** Flagged as an **Outage** (Red).
   * **2+ sources simultaneously:** Flagged as a **Parallel Loop Warning** (Magenta).
   * **Alternate source:** If an element is energized by a source other than its nominal radial substation—determined dynamically by walking `parent_id` up to `ROOT` via the memoized `getNormalSource()` helper—`isBackfed` is set to `true` (**Amber**).

### 3. Upstream & Downstream Tracing (`traceDirection`)
When the user selects **Trace Upstream** or **Trace Downstream** and clicks an element:
* `traceDirection()` runs a targeted BFS over the `flowParents` (upstream to active source) or `flowChildren` (downstream to loads) sets computed by `analyzeEnergization()`.
* `app.js` renders a yellow highlight halo (`#fde047`) underneath the traced polylines and markers and sums all traced consumer counts (`element_type === 8`) and `connected_kva` values in the top status bar.

### 4. Dual-Mode Delta Sync Protocol (`server.mjs` & `app.js`)
Modeled after real utility SCADA/OMS telemetry pipelines, static network geometry stays loaded in each browser while only compact operational state changes cross the wire:

* **Server (`server.mjs`):**
  * Maintains an in-memory `overrides` `Map` (`section_id -> 0 | 1`) storing only devices currently in an off-nominal state, plus a 25-second `: ping` SSE heartbeat.
  * `GET /api/events` — Sends an initial `{"type":"INIT","overrides":{...}}` payload when a browser connects, then streams lightweight `{"type":"DELTA","section_id":"...","is_open":0|1}` or `{"type":"RESET"}` messages on every state change.
  * `POST /api/toggle` — Accepts `{ section_id }` or `{ reset: true }`, updates `overrides`, logs the transition to the terminal, and broadcasts the delta to all active clients.
* **Client (`app.js`):**
  * Connects to `/api/events` via `EventSource` on load, turns the header pill green (**`LIVE SYNC`**), and applies incoming deltas in **O(1)** time using a `sectionsById` `Map`.
  * Logs all incoming/outgoing sync frames and byte sizes to the browser DevTools Console (`[SYNC]`).
  * When hosted on a static server such as GitHub Pages, `EventSource` closes cleanly on error and the pill displays **`STANDALONE`**.

---

## Running Locally & Deploying

### Multi-Client Control Room Mode (Node.js v20+)
Requires Node.js v20+ with **no external dependencies** (`npm install` is not needed):
```bash
node server.mjs
```
Open `http://localhost:3000` in two or more browser tabs/windows (and optionally open Browser DevTools → Console) to watch `[SERVER]` and `[SYNC]` delta broadcasts synchronize switch toggles across every open client.

### Static / GitHub Pages Mode
1. Push the repository to `main`.
2. In GitHub, open **Settings → Pages**, set **Source** to **Deploy from a branch**, select `main` / `/ (root)`, and click **Save**.
3. The hosted app automatically detects that `/api/events` is unavailable and runs in **`STANDALONE`** mode.

---

## Credits
* **Concept, Distribution Domain Logic & Implementation:** Project author (Milsoft WindMil `.STD` schema alignment, switching scenarios, multi-client Delta Sync architecture, and repository workflow).
* **AI Pair Programming & Code Generation:** Built collaboratively with **Gemini** (Google), which assisted with the undirected graph traversal engine, phase-aware trace logic, inline SVG Leaflet symbology, zero-dependency Node SSE Delta Sync server, and technical documentation.
* **Mapping & Base Tiles:** Powered by [Leaflet](https://leafletjs.com) and [OpenStreetMap](https://openstreetmap.org) contributors.
