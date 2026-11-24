import { initialSections, SWITCHABLE_TYPES, analyzeEnergization, traceDirection } from './data.js';

let sections = structuredClone(initialSections);
let activeTrace = null;

const SYMBOL_TYPES = new Set();
SYMBOL_TYPES.add(5);
SYMBOL_TYPES.add(6);
SYMBOL_TYPES.add(9);
SYMBOL_TYPES.add(10);

const map = L.map('map').setView([38.7995, -77.6020], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const networkLayer = L.layerGroup().addTo(map);
const traceLayer = L.layerGroup().addTo(map);
const actionEl = document.getElementById('action');
const phaseEl = document.getElementById('phase');
const statusEl = document.getElementById('status');

function getColor(sec, info) {
  if (sec.is_open === 1) return '#94a3b8';
  if (info.sources.size === 0) return '#ef4444';
  if (info.sources.size > 1) return '#d946ef';
  if (info.isBackfed) return '#f59e0b';
  return info.sources.has('SUB-02') ? '#0d9488' : '#2563eb';
}

function createDeviceIcon(type, color, isOpen) {
  const fill = isOpen ? '#ffffff' : color;
  const stroke = isOpen ? '#475569' : '#0f172a';
  const shapes = {
    9: `<rect x="3" y="3" width="18" height="18" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
    5: `<polygon points="12,3 22,20 2,20" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    10: `<polygon points="12,2 22,12 12,22 2,12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    6: `<rect x="5" y="5" width="14" height="14" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
    8: `<circle cx="12" cy="12" r="6.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
  };
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="24" viewBox="0 0 24 24" style="display:block;cursor:pointer;">${shapes[type]}</svg>`,
    iconSize: L.point(24, 24),
    iconAnchor: L.point(12, 12)
  });
}

function handleElementClick(sec) {
  const mode = actionEl.value;
  if (mode === 'switch') {
    if (SWITCHABLE_TYPES.has(sec.element_type)) {
      sec.is_open = sec.is_open ? 0 : 1;
      render();
    }
  } else {
    activeTrace = { startId: sec.section_id, dir: mode };
    render();
  }
}

function render() {
  networkLayer.clearLayers();
  traceLayer.clearLayers();

  const energization = analyzeEnergization(sections, phaseEl.value);
  const tracedIds = activeTrace ? traceDirection(activeTrace.startId, energization, activeTrace.dir) : new Set();
  let outagedConsumers = 0, outagedKva = 0, backfedCount = 0, loopCount = 0;

  sections.forEach(sec => {
    const info = energization.get(sec.section_id);
    const color = getColor(sec, info);
    const isTraced = tracedIds.has(sec.section_id);
    if (info.isBackfed && info.sources.size === 1) backfedCount++;
    if (info.sources.size > 1) loopCount++;

    if (sec.element_type === 8) {
      if (info.sources.size === 0) {
        outagedConsumers++;
        outagedKva += sec.connected_kva || 0;
      }
      if (isTraced) {
        L.circleMarker([sec.end_lat, sec.end_lng], { radius: 13, color: '#fde047', weight: 4, fillOpacity: 0 }).addTo(traceLayer);
      }
      L.marker([sec.end_lat, sec.end_lng], { icon: createDeviceIcon(8, color, false) })
        .bindTooltip(`${sec.section_id} (${sec.connected_kva} kVA, Ph ${sec.phasing}) | Fed by: ${[...info.sources].join('+') || 'OUTAGE'}`)
        .on('click', () => handleElementClick(sec))
        .addTo(networkLayer);
      return;
    }

    if (isTraced) {
      L.polyline([[sec.start_lat, sec.start_lng], [sec.end_lat, sec.end_lng]], {
        color: '#fde047', weight: 11, opacity: 0.9
      }).addTo(traceLayer);
    }

    L.polyline([[sec.start_lat, sec.start_lng], [sec.end_lat, sec.end_lng]], {
      color,
      weight: sec.element_type === 11 ? 2.5 : 4.5,
      dashArray: sec.is_open ? '6, 6' : (sec.element_type === 11 ? '3, 4' : null)
    }).bindTooltip(`${sec.section_id}: ${sec.element_label} (${sec.phasing})${sec.is_open ? ' [OPEN]' : ''}`)
      .on('click', () => handleElementClick(sec))
      .addTo(networkLayer);

    if (SYMBOL_TYPES.has(sec.element_type)) {
      const symbolPos = sec.element_type === 9
        ? [sec.start_lat, sec.start_lng]
        : [(sec.start_lat + sec.end_lat) / 2, (sec.start_lng + sec.end_lng) / 2];

      L.marker(symbolPos, { icon: createDeviceIcon(sec.element_type, color, sec.is_open === 1) })
        .bindTooltip(`${sec.section_id}: ${sec.element_label}`)
        .on('click', () => handleElementClick(sec))
        .addTo(networkLayer);
    }
  });

  if (activeTrace) {
    const tracedMeters = sections.filter(s => tracedIds.has(s.section_id) && s.element_type === 8);
    const tracedKva = tracedMeters.reduce((sum, m) => sum + (m.connected_kva || 0), 0);
    statusEl.textContent = `${activeTrace.dir.toUpperCase()} trace from ${activeTrace.startId}: ${tracedIds.size} elements (${tracedMeters.length} consumers, ${tracedKva.toFixed(1)} kVA)`;
  } else {
    const loopWarn = loopCount > 0 ? ` | WARNING: ${loopCount} looped sections!` : '';
    statusEl.textContent = `Outage: ${outagedConsumers} consumers (${outagedKva.toFixed(1)} kVA) | Backfed: ${backfedCount} sections${loopWarn}`;
  }
}

function formatStdRow(r) {
  const field9 = r.element_type === 6
    ? (r.is_open === 1 ? 'O' : 'C')
    : (r.element_type === 8 ? (r.connected_kva ?? '') : '');
  const field10 = r.element_type === 6 ? r.section_id : '';
  const field11 = r.element_type === 6 ? (r.partner_id ?? '') : '';

  return [
    r.section_id, r.element_type, r.phasing, r.parent_id,
    r.start_lng, r.start_lat, r.end_lng, r.end_lat,
    field9, field10, field11
  ].join(',');
}

phaseEl.addEventListener('change', render);
document.getElementById('clear-trace').addEventListener('click', () => { activeTrace = null; render(); });
document.getElementById('reset-btn').addEventListener('click', () => {
  sections = structuredClone(initialSections);
  activeTrace = null;
  render();
});

document.getElementById('download-std').addEventListener('click', () => {
  const text = sections.map(formatStdRow).join('\r\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'feeder_backfeed_demo.std';
  a.click();
  URL.revokeObjectURL(a.href);
});

function addLegend(targetMap) {
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-legend');
    // Note: L.DomEvent.disableClickPropagation(div) prevents 
    // clicking the legend's −/+ collapse button from accidentally
    // clicking through to map elements underneath.
    L.DomEvent.disableClickPropagation(div);

    div.innerHTML = `
      <div class="legend-header">
        <span>Network Legend</span>
        <button id="legend-toggle" title="Collapse/Expand">−</button>
      </div>
      <div id="legend-body" class="legend-body">
        <div class="legend-section">Energization State</div>
        <div class="legend-row"><span class="swatch-line" style="background:#2563eb"></span>Substation 1 (Normal)</div>
        <div class="legend-row"><span class="swatch-line" style="background:#0d9488"></span>Substation 2 (Normal)</div>
        <div class="legend-row"><span class="swatch-line" style="background:#f59e0b"></span>Backfed (Off-Nominal)</div>
        <div class="legend-row"><span class="swatch-line" style="background:#ef4444"></span>De-Energized (Outage)</div>
        <div class="legend-row"><span class="swatch-line" style="background:#d946ef"></span>Parallel Loop Warning</div>
        <div class="legend-row">
          <svg width="16" height="16" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#ffffff" stroke="#475569" stroke-width="2.5"/></svg>
          Open Device (Hollow)
        </div>


        <div class="legend-section">Device Symbols</div>
        <div class="legend-row"><svg width="16" height="16" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="#2563eb" stroke="#0f172a" stroke-width="2.5"/></svg>Substation Breaker</div>
        <div class="legend-row"><svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="#2563eb" stroke="#0f172a" stroke-width="2"/></svg>Recloser / Fuse</div>
        <div class="legend-row"><svg width="16" height="16" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" fill="#2563eb" stroke="#0f172a" stroke-width="2.5"/></svg>Switch</div>
        <div class="legend-row"><svg width="16" height="16" viewBox="0 0 24 24"><polygon points="12,3 22,20 2,20" fill="#2563eb" stroke="#0f172a" stroke-width="2"/></svg>Transformer</div>
        <div class="legend-row"><svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5" fill="#2563eb" stroke="#0f172a" stroke-width="2"/></svg>Consumer / Meter</div>
      </div>
    `;

    const toggleBtn = div.querySelector('#legend-toggle');
    const bodyEl = div.querySelector('#legend-body');
    toggleBtn.addEventListener('click', () => {
      const collapsed = bodyEl.classList.toggle('collapsed');
      toggleBtn.textContent = collapsed ? '+' : '−';
    });

    return div;
  };

  legend.addTo(targetMap);
}

addLegend(map);
render();
