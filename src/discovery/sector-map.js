/**
 * Sector Map — maps narrative sectors to investable companies
 * 
 * This is the universe of stocks we can discover.
 * Organized by sector with related keywords for discovery.
 */

export const SECTOR_MAP = {
  'memory-chips': {
    label: 'Memory & Chips',
    tickers: ['MU', 'WDC', 'Samsung', 'SKT', 'SEC'],
    aliases: ['Micron', 'Western Digital', 'Samsung Electronics', 'SK Hynix'],
    keywords: ['memory', 'DRAM', 'NAND', 'HBM', 'VRAM', 'flash storage', 'semiconductor memory'],
    description: 'Companies producing memory and storage chips'
  },
  
  'semiconductors': {
    label: 'Semiconductors',
    tickers: ['NVDA', 'AMD', 'INTC', 'QCOM', 'TSM', 'AMAT', 'LRCX', 'ASML'],
    aliases: ['NVIDIA', 'AMD', 'Intel', 'Qualcomm', 'TSMC', 'Applied Materials', 'Lam Research'],
    keywords: ['semiconductor', 'chip', 'GPU', 'CPU', 'foundry', 'fabrication', 'wafer'],
    description: 'Core semiconductor companies'
  },
  
  'semiconductor-equipment': {
    label: 'Semiconductor Equipment',
    tickers: ['AMAT', 'LRCX', 'ASML', 'KLAC', 'TER', 'AMBA'],
    aliases: ['Applied Materials', 'Lam Research', 'ASML', 'KLA Corp', 'Teradyne'],
    keywords: ['semiconductor equipment', 'wafer fabrication equipment', 'lithography', 'deposition', 'etch'],
    description: 'Equipment makers for chip manufacturing'
  },
  
  'data-center': {
    label: 'Data Center / Infrastructure',
    tickers: ['VRT', 'DLR', 'EQIX', 'AMT', 'CCI', 'CONE'],
    aliases: ['Vertiv', 'Digital Realty', 'Equinix', 'American Tower', 'Crown Castle'],
    keywords: ['datacenter', 'data center', 'colocation', 'hyperscaler', 'server', 'rack'],
    description: 'Data center REITs and infrastructure companies'
  },
  
  'power-management': {
    label: 'Power Management',
    tickers: ['VRT', 'ETN', 'EMR', 'PH', 'ROK', 'ABB'],
    aliases: ['Vertiv', 'Eaton', 'Emerson', 'Parker-Hannifin', 'Rockwell Automation'],
    keywords: ['power management', 'UPS', 'power distribution', 'electrical', 'grid power', 'power conversion'],
    description: 'Power infrastructure and management companies'
  },
  
  'cooling': {
    label: 'Data Center Cooling',
    tickers: ['VRT', 'NVT', 'SCJ', 'Honeywell', 'Johnson Controls'],
    aliases: ['Vertiv', 'nVent', 'Steico', 'Honeywell', 'JCI'],
    keywords: ['liquid cooling', 'thermal management', 'cooling', 'heat dissipation', 'direct liquid cooling'],
    description: 'Cooling solutions for AI data centers'
  },
  
  'networking': {
    label: 'Networking / Interconnects',
    tickers: ['ANET', 'CSCO', 'MSI', 'CARR', 'JLIC', 'VNET'],
    aliases: ['Arista Networks', 'Cisco', 'Motorola Solutions', 'Cerence'],
    keywords: ['networking', 'ethernet', 'optical', 'interconnect', 'switch', 'router', 'bandwidth'],
    description: 'Networking and data center interconnect companies'
  },
  
  'electrical-infrastructure': {
    label: 'Electrical Infrastructure',
    tickers: ['FSLR', 'BEP', 'NEE', 'ORA', 'ENPH', 'SEDG', 'RUN'],
    aliases: ['First Solar', 'Brookfield Renewable', 'NextEra', 'Ormat', 'Enphase', 'SolarEdge'],
    keywords: ['electrical infrastructure', 'power grid', 'transmission', 'distribution', 'smart grid'],
    description: 'Grid and electrical infrastructure companies'
  },
  
  'battery-storage': {
    label: 'Battery & Storage',
    tickers: ['BE', 'STEM', 'FSLR', 'ENPH', 'NEE'],
    aliases: ['Bloom Energy', 'Stem', 'First Solar', 'Enphase', 'NextEra'],
    keywords: ['battery storage', 'grid storage', 'energy storage', 'lithium ion', 'BESS'],
    description: 'Battery and grid storage companies'
  },
  
  'ai-drug-discovery': {
    label: 'AI Drug Discovery',
    tickers: ['RVTY', 'EXAS', 'REGN', 'BMY', 'LLY', 'NVS'],
    aliases: ['Revvity', 'Exact Sciences', 'Regeneron', 'Bristol-Myers', 'Eli Lilly', 'Novartis'],
    keywords: ['AI drug discovery', 'alphafold', 'computational biology', 'AI pharma', 'drug AI'],
    description: 'Pharma/biotech using AI for drug development'
  },
  
  'biotech': {
    label: 'Biotech',
    tickers: ['BIIB', 'REGN', 'MRNA', 'NVAX', 'INO', 'MCRB'],
    aliases: ['Biogen', 'Regeneron', 'Moderna', 'Novavax', 'Inovio', 'Mirimus'],
    keywords: ['biotech', 'mRNA', 'vaccine', 'gene therapy', 'CRISPR', 'FDA approval'],
    description: 'Biotechnology companies'
  },
  
  'defense': {
    label: 'Defense',
    tickers: ['LHX', 'LMT', 'RTX', 'NOC', 'BA', 'GD', 'GHM'],
    aliases: ['L3Harris', 'Lockheed', 'Raytheon', 'Northrop', 'Boeing', 'General Dynamics'],
    keywords: ['defense', 'military', 'aerospace', 'missile', 'radar', 'classified', 'DoD contract'],
    description: 'Defense and aerospace contractors'
  },
  
  'drones': {
    label: 'Drones / Autonomous',
    tickers: ['LHX', 'BA', 'KTOS', 'SIEGY', 'GD'],
    aliases: ['L3Harris', 'Boeing', 'Kratos', 'Siemens', 'General Dynamics'],
    keywords: ['drone', 'UAV', 'autonomous', 'unmanned', 'AUV', 'UAS'],
    description: 'Drone and autonomous systems companies'
  },
  
  'space': {
    label: 'Space / Satellites',
    tickers: ['BA', 'LMT', 'RTX', 'GHM', 'SPCE', 'MAXR'],
    aliases: ['Boeing', 'Lockheed', 'Raytheon', 'General Dynamics', 'Virgin Galactic', 'Maxar'],
    keywords: ['satellite', 'space', 'launch', 'LEO', 'orbit', 'constellation', 'spacecraft'],
    description: 'Space and satellite companies'
  },
  
  'cyber': {
    label: 'Cybersecurity',
    tickers: ['CRWD', 'PANW', 'ZS', 'OKTA', 'NET', 'FTNT'],
    aliases: ['CrowdStrike', 'Palo Alto', 'Zscaler', 'Okta', 'Cloudflare', 'Fortinet'],
    keywords: ['cybersecurity', 'cyber', 'firewall', 'zero trust', 'endpoint', 'SIEM'],
    description: 'Cybersecurity companies'
  },
  
  'mining': {
    label: 'Mining',
    tickers: ['FCX', 'SCCO', 'AA', 'NEM', 'GOLD', 'KGC', 'PLG'],
    aliases: ['Freeport-McMoRan', 'Southern Copper', 'Alcoa', 'Newmont', 'Agnico Eagle'],
    keywords: ['mining', 'copper mining', 'gold mining', 'copper', 'ore', 'extraction'],
    description: 'Mining companies'
  },
  
  'metals': {
    label: 'Metals & Materials',
    tickers: ['AA', 'NUE', 'STLD', 'RS', 'X'],
    aliases: ['Alcoa', 'Nucor', 'Steel Dynamics', 'Reliance Steel', 'US Steel'],
    keywords: ['metals', 'aluminum', 'steel', 'copper', 'zinc', 'materials'],
    description: 'Metals and materials companies'
  },
  
  'rare-earths': {
    label: 'Rare Earths',
    tickers: ['LYB', 'EMN', 'CE', 'FMC', 'SRL'],
    aliases: ['LyondellBasell', 'Eastman', 'Celanese', 'FMC', 'Southern Copper'],
    keywords: ['rare earth', 'rare earth elements', 'REE', 'lanthanide', 'magnet materials'],
    description: 'Rare earth and specialty materials'
  },
  
  'manufacturing': {
    label: 'Advanced Manufacturing',
    tickers: ['CAT', 'DE', 'HON', 'ETN', 'PH'],
    aliases: ['Caterpillar', 'Deere', 'Honeywell', 'Eaton', 'Parker-Hannifin'],
    keywords: ['advanced manufacturing', 'industrial', 'automation', 'smart factory', 'reshoring'],
    description: 'Advanced manufacturing and reshoring plays'
  }
};

/**
 * Get all tickers from multiple sectors
 */
export function getTickersForSectors(sectorIds) {
  const tickers = new Set();
  for (const sectorId of sectorIds) {
    const sector = SECTOR_MAP[sectorId];
    if (sector) {
      sector.tickers.forEach(t => tickers.add(t));
    }
  }
  return Array.from(tickers);
}

/**
 * Find sector by keyword match
 */
export function findSectorByKeyword(keyword) {
  const lower = keyword.toLowerCase();
  const matches = [];
  
  for (const [sectorId, sector] of Object.entries(SECTOR_MAP)) {
    for (const kw of sector.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        matches.push({ sectorId, sector, matchedKeyword: kw });
      }
    }
  }
  
  return matches;
}

/**
 * Get sector info
 */
export function getSector(sectorId) {
  return SECTOR_MAP[sectorId] || null;
}

/**
 * Print all sectors (for CLI testing)
 */
export function printSectorMap() {
  console.log('\n=== MarketScout Sector Map ===\n');
  for (const [id, sector] of Object.entries(SECTOR_MAP)) {
    console.log(`[${id}] ${sector.label}`);
    console.log(`  Tickers: ${sector.tickers.join(', ')}`);
    console.log(`  ${sector.description}`);
    console.log();
  }
}

if (process.argv[1].endsWith('sector-map.js')) {
  printSectorMap();
}
