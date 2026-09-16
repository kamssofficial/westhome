/**
 * The physical showrooms.
 *
 * Both addresses are rendered in three places — the About page, the Contact page
 * and the site-wide Store structured data — and the Kasaragod one had already
 * drifted between them (the About card and the JSON-LD formatted it
 * differently). Keeping them here means the next address change happens once.
 */
export type StoreLocation = {
  /** Short city label, used as the heading of each card. */
  id: string;
  label: string;
  /** Address lines, rendered in order. */
  lines: string[];
  /** Opened by the "Get directions" links. */
  mapsUrl: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo: { latitude: number; longitude: number };
};

/** Google Maps search link for an address we only have as text. */
function mapsSearch(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export const STORE_LOCATIONS: StoreLocation[] = [
  {
    id: "kasaragod",
    label: "Kasaragod",
    lines: [
      "City Gate Building, near Press Club Junction,",
      "Karandakkad, Kasaragod, Kerala — 671121",
    ],
    mapsUrl: mapsSearch(
      "WEST HOME by BM Distributors, City Gate Building, Press Club Junction, Karandakkad, Kasaragod, Kerala 671121"
    ),
    address: {
      streetAddress: "City Gate Building, near Press Club Junction, Karandakkad",
      addressLocality: "Kasaragod",
      addressRegion: "Kerala",
      postalCode: "671121",
      addressCountry: "IN",
    },
    geo: { latitude: 12.4924, longitude: 74.9899 },
  },
  {
    id: "mangalore",
    label: "Mangalore",
    lines: ["1st Floor, Kankanady Gate Building,", "Kankanady, Mangalore, Karnataka"],
    // Pinned location from the store's own Google Maps listing.
    mapsUrl: "https://maps.app.goo.gl/S7pgjhnypZWJEa9M6",
    address: {
      streetAddress: "1st Floor, Kankanady Gate Building, Kankanady",
      addressLocality: "Mangalore",
      addressRegion: "Karnataka",
      // No pincode: the two sources disagree (575001 vs 575002), so it is
      // better left out of the schema than published wrong.
      addressCountry: "IN",
    },
    geo: { latitude: 12.8699149, longitude: 74.8605786 },
  },
];
