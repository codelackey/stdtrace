// Element Types: 9=Source, 1=Overhead, 10=Recloser/Fuse, 6=Switch,
//                5=Transformer, 11=Service Drop, 8=Consumer/Meter
export const initialSections = [
    // Feeder 1 (Normal Source: SUB-01)
    { section_id: 'SUB-01', parent_id: 'ROOT', partner_id: null, element_type: 9, element_label: 'Substation 1 (Breaker)', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.7950, start_lng: -77.6130, end_lat: 38.7955, end_lng: -77.6120 },
    { section_id: 'FDR-101', parent_id: 'SUB-01', partner_id: null, element_type: 1, element_label: 'Main Trunk 336 ACSR', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.7955, start_lng: -77.6120, end_lat: 38.7980, end_lng: -77.6080 },
    { section_id: 'REC-01', parent_id: 'FDR-101', partner_id: null, element_type: 10, element_label: 'Line Recloser R-12', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.7980, start_lng: -77.6080, end_lat: 38.7983, end_lng: -77.6075 },
    { section_id: 'FDR-102', parent_id: 'REC-01', partner_id: null, element_type: 1, element_label: 'Main Trunk North', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.7983, start_lng: -77.6075, end_lat: 38.8010, end_lng: -77.6040 },

    // Lateral A -> Transformer 1 -> 2 Consumers (Phase A)
    { section_id: 'LAT-A1', parent_id: 'FDR-102', partner_id: null, element_type: 10, element_label: 'Lateral Fuse F-4', phasing: 'A', is_open: 0, connected_kva: null, start_lat: 38.8010, start_lng: -77.6040, end_lat: 38.8015, end_lng: -77.6035 },
    { section_id: 'LAT-A2', parent_id: 'LAT-A1', partner_id: null, element_type: 1, element_label: 'Oak St Tap 1/0', phasing: 'A', is_open: 0, connected_kva: null, start_lat: 38.8015, start_lng: -77.6035, end_lat: 38.8035, end_lng: -77.6010 },
    { section_id: 'XFMR-1', parent_id: 'LAT-A2', partner_id: null, element_type: 5, element_label: '50kVA Padmount T-101', phasing: 'A', is_open: 0, connected_kva: null, start_lat: 38.8035, start_lng: -77.6010, end_lat: 38.8038, end_lng: -77.6005 },
    { section_id: 'SRV-101', parent_id: 'XFMR-1', partner_id: null, element_type: 11, element_label: 'Service Drop 101', phasing: 'A', is_open: 0, connected_kva: null, start_lat: 38.8038, start_lng: -77.6005, end_lat: 38.8043, end_lng: -77.6012 },
    { section_id: 'MTR-101', parent_id: 'SRV-101', partner_id: null, element_type: 8, element_label: 'Consumer #4401', phasing: 'A', is_open: 0, connected_kva: 5.2, start_lat: 38.8043, start_lng: -77.6012, end_lat: 38.8043, end_lng: -77.6012 },
    { section_id: 'SRV-102', parent_id: 'XFMR-1', partner_id: null, element_type: 11, element_label: 'Service Drop 102', phasing: 'A', is_open: 0, connected_kva: null, start_lat: 38.8038, start_lng: -77.6005, end_lat: 38.8044, end_lng: -77.5998 },
    { section_id: 'MTR-102', parent_id: 'SRV-102', partner_id: null, element_type: 8, element_label: 'Consumer #4402', phasing: 'A', is_open: 0, connected_kva: 4.8, start_lat: 38.8044, start_lng: -77.5998, end_lat: 38.8044, end_lng: -77.5998 },

    // Lateral B -> Tie Switch (Field E-11 partner_id) -> Feeder 2 (Source: SUB-02)
    { section_id: 'LAT-B1', parent_id: 'FDR-102', partner_id: null, element_type: 1, element_label: 'Pine Rd Tie Line', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.8010, start_lng: -77.6040, end_lat: 38.7995, end_lng: -77.6000 },
    { section_id: 'SW-TIE', parent_id: 'LAT-B1', partner_id: 'FDR-201B', element_type: 6, element_label: 'Tie Switch SW-TIE', phasing: 'ABC', is_open: 1, connected_kva: null, start_lat: 38.7995, start_lng: -77.6000, end_lat: 38.7990, end_lng: -77.5985 },
    { section_id: 'FDR-201B', parent_id: 'FDR-201A', partner_id: null, element_type: 1, element_label: 'Feeder 2 Tie Leg', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.7990, start_lng: -77.5985, end_lat: 38.7975, end_lng: -77.5950 },
    { section_id: 'FDR-201A', parent_id: 'SUB-02', partner_id: null, element_type: 1, element_label: 'Feeder 2 Main Trunk', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.7968, start_lng: -77.5938, end_lat: 38.7975, end_lng: -77.5950 },
    { section_id: 'XFMR-2', parent_id: 'FDR-201A', partner_id: null, element_type: 5, element_label: '150kVA Bank T-205', phasing: 'BC', is_open: 0, connected_kva: null, start_lat: 38.7975, start_lng: -77.5950, end_lat: 38.7972, end_lng: -77.5945 },
    { section_id: 'MTR-201', parent_id: 'XFMR-2', partner_id: null, element_type: 8, element_label: 'Consumer #8810', phasing: 'B', is_open: 0, connected_kva: 42.0, start_lat: 38.7968, start_lng: -77.5942, end_lat: 38.7968, end_lng: -77.5942 },
    { section_id: 'MTR-202', parent_id: 'XFMR-2', partner_id: null, element_type: 8, element_label: 'Consumer #8811', phasing: 'C', is_open: 0, connected_kva: 38.5, start_lat: 38.7975, start_lng: -77.5938, end_lat: 38.7975, end_lng: -77.5938 },
    { section_id: 'SUB-02', parent_id: 'ROOT', partner_id: null, element_type: 9, element_label: 'Substation 2 (Tie Src)', phasing: 'ABC', is_open: 0, connected_kva: null, start_lat: 38.7960, start_lng: -77.5925, end_lat: 38.7968, end_lng: -77.5938 }
];

export const SWITCHABLE_TYPES = new Set();
SWITCHABLE_TYPES.add(5);  // Transformer (Fused)
SWITCHABLE_TYPES.add(6);  // Electric Switch
SWITCHABLE_TYPES.add(9);  // Substation Source Breaker
SWITCHABLE_TYPES.add(10); // Recloser / Fuse

const normalSourceCache = new Map();

function getNormalSource(sectionId, byId) {
    if (normalSourceCache.has(sectionId)) return normalSourceCache.get(sectionId);

    const chain = [];
    let curr = byId.get(sectionId);
    let resolved = null;

    while (curr) {
        if (normalSourceCache.has(curr.section_id)) {
            resolved = normalSourceCache.get(curr.section_id);
            break;
        }
        chain.push(curr.section_id);
        if (curr.element_type === 9) {
            resolved = curr.section_id;
            break;
        }
        curr = byId.get(curr.parent_id);
    }

    for (const id of chain) normalSourceCache.set(id, resolved);
    return resolved;
}

function intersectPhases(a, b) {
    return [...a].filter(p => b.includes(p)).join('');
}

export function analyzeEnergization(sections, phaseFilter = 'ALL') {
    const byId = new Map(sections.map(s => [s.section_id, s]));
    const adj = new Map(sections.map(s => [s.section_id, []]));

    for (const s of sections) {
        if (s.parent_id && s.parent_id !== 'ROOT' && adj.has(s.parent_id)) {
            adj.get(s.section_id).push(s.parent_id);
            adj.get(s.parent_id).push(s.section_id);
        }
        if (s.partner_id && adj.has(s.partner_id)) {
            adj.get(s.section_id).push(s.partner_id);
            adj.get(s.partner_id).push(s.section_id);
        }
    }

    const state = new Map(sections.map(s => [s.section_id, {
        sources: new Set(), isBackfed: false, flowParents: new Set(), flowChildren: new Set()
    }]));
    const sources = sections.filter(s => s.element_type === 9 && s.is_open === 0);

    for (const src of sources) {
        const startPhases = phaseFilter === 'ALL' ? src.phasing : intersectPhases(phaseFilter, src.phasing);
        if (!startPhases) continue;

        const visited = new Set([src.section_id]);
        const queue = [{ id: src.section_id, activePhases: startPhases }];
        state.get(src.section_id).sources.add(src.section_id);

        while (queue.length > 0) {
            const { id, activePhases } = queue.shift();
            for (const nextId of adj.get(id)) {
                const next = byId.get(nextId);
                if (next.is_open === 1 || visited.has(nextId)) continue;
                const shared = intersectPhases(activePhases, next.phasing);
                if (!shared) continue;

                visited.add(nextId);
                const info = state.get(nextId);
                info.sources.add(src.section_id);
                info.flowParents.add(id);
                state.get(id).flowChildren.add(nextId);

                const normalSrc = getNormalSource(nextId, byId);
                if (normalSrc && src.section_id !== normalSrc) info.isBackfed = true;
                queue.push({ id: nextId, activePhases: shared });
            }
        }
    }
    return state;
}

export function traceDirection(startId, energization, dir = 'downstream') {
    if (!energization.has(startId)) return new Set();
    const traced = new Set([startId]);
    const queue = [startId];

    while (queue.length > 0) {
        const currId = queue.shift();
        const info = energization.get(currId);
        const neighbors = dir === 'upstream' ? info.flowParents : info.flowChildren;
        for (const nextId of neighbors) {
            if (!traced.has(nextId)) {
                traced.add(nextId);
                queue.push(nextId);
            }
        }
    }
    return traced;
}
