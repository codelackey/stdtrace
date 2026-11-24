# Milsoft `.STD` Switching, Backfeed & Phase-Aware Trace Simulator

An interactive, zero-dependency browser application that models a dual-substation electrical distribution network using Milsoft WindMil `.STD` topology conventions and visualizes real-time switching, backfeeds, outages, parallel loops, and phase-aware upstream/downstream traces on a Leaflet map.

---

## Key Features
* **Real-Time Switching Operations:** Click any Substation Breaker (`Type 9`), Recloser/Fuse (`Type 10`), Switch (`Type 6`), or Transformer (`Type 5`) to toggle it open or closed and immediately re-evaluate system energization.
* **Automatic Backfeed & Loop Detection:** Automatically identifies sections fed by an alternate substation across closed tie switches (**amber**) and warns operators if two substations are tied in parallel (**magenta**).
* **Phase-Aware Upstream & Downstream Tracing:** Filter traces by `All (ABC)`, `Phase A`, `Phase B`, or `Phase C` to trace live power flow back to the active source or downstream to affected consumers and connected kVA.
* **WindMil `.STD` Export:** Generates a fixed 11-column comma-delimited `.STD` file reflecting current switch states (`O`/`C` in Field `E-9`) and tie partner identifiers (`Field E-11`).
* **Zero Build Tools:** Built purely with standard HTML5, CSS3, ES Modules, and Leaflet via CDN.

---

## Project Architecture

```text
├── index.html   # Page toolbar, native <dialog> Help modal, and Leaflet map container
├── style.css    # Responsive header bar, status badge, modal dialog, and floating legend styles
├── data.js      # Milsoft .STD data model, undirected graph builder, and trace algorithms
└── app.js       # Leaflet map rendering, inline SVG device symbology, and UI event handlers
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
   * If an element is energized by **0 sources**, it is flagged as an **Outage** (Red).
   * If an element is energized by **2 or more sources simultaneously**, it is flagged as a **Parallel Loop Warning** (Magenta).
   * If an element is energized by a source other than its nominal radial substation—determined dynamically by walking `parent_id` up to the `ROOT` source via the memoized `getNormalSource()` helper—`isBackfed` is set to `true` (**Amber**).


### 3. Upstream & Downstream Tracing (`traceDirection`)
When the user selects **Trace Upstream** or **Trace Downstream** and clicks an element:
* `traceDirection()` runs a targeted BFS over the `flowParents` (upstream to active source) or `flowChildren` (downstream to loads) sets computed by `analyzeEnergization()`.
* `app.js` renders a yellow highlight halo (`#fde047`) underneath the traced polylines and markers and sums all traced consumer counts (`element_type === 8`) and `connected_kva` values in the top status bar.

### 4. Symbology & Map Rendering (`app.js`)
* **Inline SVG Device Icons (`createDeviceIcon`):** Rather than loading external PNG icons, Leaflet `L.divIcon` markers render crisp 24×24 SVG shapes (square for Substation Breakers, diamond for Reclosers/Fuses, box for Switches, triangle for Transformers, and circle for Consumers).
* **Open State Styling:** When `sec.is_open === 1`, the SVG interior switches to hollow white (`#ffffff`) with a slate-gray border (`#475569`), and its conductor span renders as a dashed gray line.
* **Interactive Controls:** Includes a collapsible bottom-right `L.control` legend (`addLegend`) and a native HTML `<dialog>` guide (`#help-dialog`).

---

## Running Locally & Deploying
* **Local Development:** Because the app uses native ES modules (`<script type="module">`), serve it over HTTP rather than opening `index.html` via `file://`:
  ```bash
  npx serve .
  # or
  python3 -m http.server 8000
  ```
* **GitHub Pages:** Push to `main`, open **Settings → Pages** in your GitHub repository, set **Source** to **Deploy from a branch**, select `main` / `/ (root)`, and click **Save**.

---

## Credits
* **Concept, Distribution Domain Logic & Implementation:** Project author (Milsoft WindMil `.STD` schema alignment, switching scenarios, and repository workflow).
* **AI Pair Programming & Code Generation:** Built collaboratively with **Gemini** (Google), which assisted with the undirected graph traversal engine, phase-aware trace logic, inline SVG Leaflet symbology, and technical documentation.
* **Mapping & Base Tiles:** Powered by [Leaflet](https://leafletjs.com) and [OpenStreetMap](https://openstreetmap.org) contributors.
