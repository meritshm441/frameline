import type { AtlasQuery, Decade } from '#shared/types/atlas'

/* ---------------------------------------------------------------------------
 * Decades
 * ------------------------------------------------------------------------- */

export const FIRST_DECADE: Decade = 1920
export const LAST_DECADE: Decade = 2020

export const DECADES: readonly Decade[] = Array.from(
  { length: (LAST_DECADE - FIRST_DECADE) / 10 + 1 },
  (_, i) => FIRST_DECADE + i * 10
)

export function isFullSpan({ from, to }: Pick<AtlasQuery, 'from' | 'to'>): boolean {
  return from === FIRST_DECADE && to === LAST_DECADE
}

/** "the 1960s", "the 1960s to the 1980s", "every decade". */
export function spanLabel(span: Pick<AtlasQuery, 'from' | 'to'>): string {
  if (isFullSpan(span)) return 'every decade'
  if (span.from === span.to) return `the ${span.from}s`
  return `the ${span.from}s to the ${span.to}s`
}

/* ---------------------------------------------------------------------------
 * Countries
 *
 * The map is drawn from Natural Earth's 1:110m countries (`world-atlas`),
 * which identifies shapes by ISO 3166-1 *numeric* code. TMDB filters by the
 * *alpha-2* code, so this table joins the two. Names are fixed here rather
 * than taken from `Intl.DisplayNames`, whose output varies between ICU
 * versions and would make the server and browser disagree during hydration.
 * ------------------------------------------------------------------------- */

/** ISO numeric (as `world-atlas` spells it) → [alpha-2, display name]. Antarctica is left off the map. */
export const MAP_COUNTRIES: Readonly<Record<string, readonly [string, string]>> = {
  '004': ['AF', 'Afghanistan'], '008': ['AL', 'Albania'], '012': ['DZ', 'Algeria'],
  '024': ['AO', 'Angola'], '031': ['AZ', 'Azerbaijan'], '032': ['AR', 'Argentina'],
  '036': ['AU', 'Australia'], '040': ['AT', 'Austria'], '044': ['BS', 'Bahamas'],
  '050': ['BD', 'Bangladesh'], '051': ['AM', 'Armenia'], '056': ['BE', 'Belgium'],
  '064': ['BT', 'Bhutan'], '068': ['BO', 'Bolivia'], '070': ['BA', 'Bosnia and Herzegovina'],
  '072': ['BW', 'Botswana'], '076': ['BR', 'Brazil'], '084': ['BZ', 'Belize'],
  '090': ['SB', 'Solomon Islands'], '096': ['BN', 'Brunei'], '100': ['BG', 'Bulgaria'],
  '104': ['MM', 'Myanmar'], '108': ['BI', 'Burundi'], '112': ['BY', 'Belarus'],
  '116': ['KH', 'Cambodia'], '120': ['CM', 'Cameroon'], '124': ['CA', 'Canada'],
  '140': ['CF', 'Central African Republic'], '144': ['LK', 'Sri Lanka'], '148': ['TD', 'Chad'],
  '152': ['CL', 'Chile'], '156': ['CN', 'China'], '158': ['TW', 'Taiwan'],
  '170': ['CO', 'Colombia'], '178': ['CG', 'Republic of the Congo'], '180': ['CD', 'DR Congo'],
  '188': ['CR', 'Costa Rica'], '191': ['HR', 'Croatia'], '192': ['CU', 'Cuba'],
  '196': ['CY', 'Cyprus'], '203': ['CZ', 'Czechia'], '204': ['BJ', 'Benin'],
  '208': ['DK', 'Denmark'], '214': ['DO', 'Dominican Republic'], '218': ['EC', 'Ecuador'],
  '222': ['SV', 'El Salvador'], '226': ['GQ', 'Equatorial Guinea'], '231': ['ET', 'Ethiopia'],
  '232': ['ER', 'Eritrea'], '233': ['EE', 'Estonia'], '238': ['FK', 'Falkland Islands'],
  '242': ['FJ', 'Fiji'], '246': ['FI', 'Finland'], '250': ['FR', 'France'],
  '260': ['TF', 'French Southern Lands'], '262': ['DJ', 'Djibouti'], '266': ['GA', 'Gabon'],
  '268': ['GE', 'Georgia'], '270': ['GM', 'Gambia'], '275': ['PS', 'Palestine'],
  '276': ['DE', 'Germany'], '288': ['GH', 'Ghana'], '300': ['GR', 'Greece'],
  '304': ['GL', 'Greenland'], '320': ['GT', 'Guatemala'], '324': ['GN', 'Guinea'],
  '328': ['GY', 'Guyana'], '332': ['HT', 'Haiti'], '340': ['HN', 'Honduras'],
  '348': ['HU', 'Hungary'], '352': ['IS', 'Iceland'], '356': ['IN', 'India'],
  '360': ['ID', 'Indonesia'], '364': ['IR', 'Iran'], '368': ['IQ', 'Iraq'],
  '372': ['IE', 'Ireland'], '376': ['IL', 'Israel'], '380': ['IT', 'Italy'],
  '384': ['CI', 'Côte d’Ivoire'], '388': ['JM', 'Jamaica'], '392': ['JP', 'Japan'],
  '398': ['KZ', 'Kazakhstan'], '400': ['JO', 'Jordan'], '404': ['KE', 'Kenya'],
  '408': ['KP', 'North Korea'], '410': ['KR', 'South Korea'], '414': ['KW', 'Kuwait'],
  '417': ['KG', 'Kyrgyzstan'], '418': ['LA', 'Laos'], '422': ['LB', 'Lebanon'],
  '426': ['LS', 'Lesotho'], '428': ['LV', 'Latvia'], '430': ['LR', 'Liberia'],
  '434': ['LY', 'Libya'], '440': ['LT', 'Lithuania'], '442': ['LU', 'Luxembourg'],
  '450': ['MG', 'Madagascar'], '454': ['MW', 'Malawi'], '458': ['MY', 'Malaysia'],
  '466': ['ML', 'Mali'], '478': ['MR', 'Mauritania'], '484': ['MX', 'Mexico'],
  '496': ['MN', 'Mongolia'], '498': ['MD', 'Moldova'], '499': ['ME', 'Montenegro'],
  '504': ['MA', 'Morocco'], '508': ['MZ', 'Mozambique'], '512': ['OM', 'Oman'],
  '516': ['NA', 'Namibia'], '524': ['NP', 'Nepal'], '528': ['NL', 'Netherlands'],
  '540': ['NC', 'New Caledonia'], '548': ['VU', 'Vanuatu'], '554': ['NZ', 'New Zealand'],
  '558': ['NI', 'Nicaragua'], '562': ['NE', 'Niger'], '566': ['NG', 'Nigeria'],
  '578': ['NO', 'Norway'], '586': ['PK', 'Pakistan'], '591': ['PA', 'Panama'],
  '598': ['PG', 'Papua New Guinea'], '600': ['PY', 'Paraguay'], '604': ['PE', 'Peru'],
  '608': ['PH', 'Philippines'], '616': ['PL', 'Poland'], '620': ['PT', 'Portugal'],
  '624': ['GW', 'Guinea-Bissau'], '626': ['TL', 'Timor-Leste'], '630': ['PR', 'Puerto Rico'],
  '634': ['QA', 'Qatar'], '642': ['RO', 'Romania'], '643': ['RU', 'Russia'],
  '646': ['RW', 'Rwanda'], '682': ['SA', 'Saudi Arabia'], '686': ['SN', 'Senegal'],
  '688': ['RS', 'Serbia'], '694': ['SL', 'Sierra Leone'], '703': ['SK', 'Slovakia'],
  '704': ['VN', 'Vietnam'], '705': ['SI', 'Slovenia'], '706': ['SO', 'Somalia'],
  '710': ['ZA', 'South Africa'], '716': ['ZW', 'Zimbabwe'], '724': ['ES', 'Spain'],
  '728': ['SS', 'South Sudan'], '729': ['SD', 'Sudan'], '732': ['EH', 'Western Sahara'],
  '740': ['SR', 'Suriname'], '748': ['SZ', 'Eswatini'], '752': ['SE', 'Sweden'],
  '756': ['CH', 'Switzerland'], '760': ['SY', 'Syria'], '762': ['TJ', 'Tajikistan'],
  '764': ['TH', 'Thailand'], '768': ['TG', 'Togo'], '780': ['TT', 'Trinidad and Tobago'],
  '784': ['AE', 'United Arab Emirates'], '788': ['TN', 'Tunisia'], '792': ['TR', 'Turkey'],
  '795': ['TM', 'Turkmenistan'], '800': ['UG', 'Uganda'], '804': ['UA', 'Ukraine'],
  '807': ['MK', 'North Macedonia'], '818': ['EG', 'Egypt'], '826': ['GB', 'United Kingdom'],
  '834': ['TZ', 'Tanzania'], '840': ['US', 'United States'], '854': ['BF', 'Burkina Faso'],
  '858': ['UY', 'Uruguay'], '860': ['UZ', 'Uzbekistan'], '862': ['VE', 'Venezuela'],
  '887': ['YE', 'Yemen'], '894': ['ZM', 'Zambia']
}

/** Shapes `world-atlas` gives a name but no ISO code. Only Kosovo has a TMDB code. */
export const UNNUMBERED_COUNTRIES: Readonly<Record<string, string>> = {
  Kosovo: 'XK'
}

/**
 * Places with a real film industry that are too small for a 1:110m map.
 * They're drawn as markers at these coordinates instead.
 */
export const MARKER_COUNTRIES: readonly { code: string, name: string, lonLat: [number, number] }[] = [
  { code: 'HK', name: 'Hong Kong', lonLat: [114.17, 22.32] },
  { code: 'SG', name: 'Singapore', lonLat: [103.82, 1.35] }
]

/**
 * Countries that no longer exist but still own a large part of film
 * history: TMDB files Stalker under the Soviet Union, not Russia, and
 * Closely Watched Trains under Czechoslovakia. They have no shape of their
 * own; the map outlines their successor states instead.
 */
export const HISTORIC_COUNTRIES: readonly { code: string, name: string, years: string, successors: readonly string[] }[] = [
  {
    code: 'SU',
    name: 'Soviet Union',
    years: '1922 to 1991',
    successors: ['RU', 'UA', 'BY', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'MD', 'EE', 'LV', 'LT']
  },
  { code: 'XC', name: 'Czechoslovakia', years: '1918 to 1992', successors: ['CZ', 'SK'] },
  { code: 'YU', name: 'Yugoslavia', years: '1918 to 2003', successors: ['RS', 'HR', 'SI', 'BA', 'MK', 'ME', 'XK'] }
]

const NAMES: ReadonlyMap<string, string> = new Map([
  ...Object.values(MAP_COUNTRIES).map(([code, name]) => [code, name] as const),
  ...Object.entries(UNNUMBERED_COUNTRIES).map(([name, code]) => [code, name] as const),
  ...MARKER_COUNTRIES.map(c => [c.code, c.name] as const),
  ...HISTORIC_COUNTRIES.map(c => [c.code, c.name] as const)
])

/** Every code the Atlas can open. The API rejects anything else, which also bounds its cache. */
export const ATLAS_COUNTRY_CODES: ReadonlySet<string> = new Set(NAMES.keys())

export function countryName(code: string): string {
  return NAMES.get(code) ?? code
}

/** Names that take "the" mid-sentence: "films made in the Netherlands". */
const WITH_ARTICLE = new Set(['US', 'GB', 'NL', 'PH', 'BS', 'AE', 'CF', 'DO', 'CG', 'CD', 'SB', 'FK', 'GM', 'SU', 'TF'])

/** The country's name as it reads inside a sentence. */
export function countryInSentence(code: string): string {
  return WITH_ARTICLE.has(code) ? `the ${countryName(code)}` : countryName(code)
}

/** The historic state a modern country was once part of, if any. */
export function predecessorOf(code: string) {
  return HISTORIC_COUNTRIES.find(h => h.successors.includes(code)) ?? null
}

export function historicCountry(code: string) {
  return HISTORIC_COUNTRIES.find(h => h.code === code) ?? null
}

/* ---------------------------------------------------------------------------
 * Query parsing, shared by the page (from the URL) and the API
 * ------------------------------------------------------------------------- */

function parseDecade(value: unknown, fallback: Decade): Decade {
  const n = Number(value)
  if (value === undefined || value === '' || !Number.isFinite(n)) return fallback
  const decade = Math.floor(n / 10) * 10
  return Math.min(LAST_DECADE, Math.max(FIRST_DECADE, decade))
}

export function parseAtlasQuery(raw: Record<string, unknown>): AtlasQuery {
  const code = typeof raw.country === 'string' ? raw.country.toUpperCase() : ''
  const a = parseDecade(raw.from, FIRST_DECADE)
  const b = parseDecade(raw.to, LAST_DECADE)
  return {
    country: ATLAS_COUNTRY_CODES.has(code) ? code : null,
    from: Math.min(a, b),
    to: Math.max(a, b)
  }
}
