import { initialSections, SWITCHABLE_TYPES, analyzeEnergization } from './data.js';

let sections = structuredClone(initialSections);
const map = L.map('map').setView([38.7995, -77.6020], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const networkLayer = L.layerGroup().addTo(map);
const phaseEl = document.getElementById('phase');
const statusEl = document.getElementById('status');

function getColor(sec, info) {
  if (sec.is_open === 1) return '#94a3b8';         // Gray dashed: Open switch/recloser
  if (info.sources.size === 0) return '#ef4444';   // Red: De-energized (Outage)
  if (info.sources.size > 1) return '#d946ef';     // Magenta: Parallel loop / tied sources
  if (info.isBackfed) return '#f59e0b';            // Amber: Backfed across tie switch
  return info.sources.has('SUB-02') ? '#0d9488' : '#2563eb';
}

function render() {
  networkLayer.clearLayers();
  const energization = analyzeEnergization(sections, phaseEl.value);
  let outagedConsumers = 0, outagedKva = 0, backfedCount = 0, loopCount = 0;

  sections.forEach(sec => {
    const info = energization.get(sec.section_id);
    const color = getColor(sec, info);
    if (info.isBackfed && info.sources.size === 1) backfedCount++;
    if (info.sources.size > 1) loopCount++;

    if (sec.element_type === 8) {
      if (info.sources.size === 0) {
        outagedConsumers++;
        outagedKva += sec.connected_kva || 0;
      }
      L.circleMarker([sec.end_lat, sec.end_lng], {
        radius: 7, color: '#1e293b', weight: 1.5, fillColor: color, fillOpacity: 1
      })
        .bindTooltip(`${sec.section_id} (${sec.connected_kva} kVA, Ph ${sec.phasing}) | Fed by: ${[...info.sources].join('+') || 'OUTAGE'}`)
        .addTo(networkLayer);
      return;
    }

    const isSwitchable = SWITCHABLE_TYPES.has(sec.element_type);
    const line = L.polyline([[sec.start_lat, sec.start_lng], [sec.end_lat, sec.end_lng]], {
      color,
      weight: isSwitchable ? 7 : (sec.element_type === 11 ? 2.5 : 4.5),
      dashArray: sec.is_open ? '6, 6' : (sec.element_type === 11 ? '3, 4' : null)
    }).addTo(networkLayer);

    const hint = isSwitchable ? ' [Click to Toggle Open/Close]' : '';
    line.bindTooltip(`${sec.section_id}: ${sec.element_label} (${sec.phasing})${sec.is_open ? ' [OPEN]' : ''}${hint}`);

    if (isSwitchable) {
      line.on('click', () => {
        sec.is_open = sec.is_open ? 0 : 1;
        render();
      });
    }
  });

  const loopWarn = loopCount > 0 ? ` | WARNING: ${loopCount} looped sections!` : '';
  statusEl.textContent = `Outage: ${outagedConsumers} consumers (${outagedKva.toFixed(1)} kVA) | Backfed: ${backfedCount} sections${loopWarn}`;
}

phaseEl.addEventListener('change', render);
document.getElementById('reset-btn').addEventListener('click', () => {
  sections = structuredClone(initialSections);
  render();
});

document.getElementById('download-std').addEventListener('click', () => {
  const text = sections
    .map(r => `${r.section_id},${r.element_type},${r.phasing},${r.parent_id},${r.connected_kva || ''},${r.start_lng},${r.start_lat},${r.end_lng},${r.end_lat}`)
    .join('\r\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'feeder_backfeed_demo.std';
  a.click();
  URL.revokeObjectURL(a.href);
});

render();
