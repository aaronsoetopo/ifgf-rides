export type PickedPlace = { address: string; lat: number; lng: number };

/** Common pickup spots, so people can choose one without typing an address. */
export const QUICK_SPOTS: (PickedPlace & { label: string })[] = [
  { label: "UC Berkeley", address: "Sather Gate, UC Berkeley, Berkeley, CA", lat: 37.8703, lng: -122.2595 },
  { label: "Downtown Berkeley BART", address: "Downtown Berkeley BART, 2160 Shattuck Ave, Berkeley, CA", lat: 37.8701, lng: -122.2681 },
  { label: "DVC", address: "Diablo Valley College, 321 Golf Club Rd, Pleasant Hill, CA", lat: 37.9697, lng: -122.0702 },
  { label: "Walnut Creek BART", address: "Walnut Creek BART, 200 Ygnacio Valley Rd, Walnut Creek, CA", lat: 37.9055, lng: -122.0675 },
  { label: "Richmond BART", address: "Richmond BART, 1700 Nevin Ave, Richmond, CA", lat: 37.9369, lng: -122.3533 },
  { label: "Dublin/Pleasanton BART", address: "Dublin/Pleasanton BART, 5801 Owens Dr, Pleasanton, CA", lat: 37.7017, lng: -121.8992 },
  { label: "San Jose State", address: "San Jose State University, 1 Washington Sq, San Jose, CA", lat: 37.3352, lng: -121.8811 },
];

/** Straight-line distance in miles (haversine). */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatMiles(miles: number): string {
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}
