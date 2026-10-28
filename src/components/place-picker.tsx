"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { QUICK_SPOTS, type PickedPlace } from "@/lib/places";
import { Icon } from "./icon";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const BAY_AREA = { center: { lat: 37.65, lng: -122.1 }, radius: 50_000 };

/**
 * Lets the user choose a location and submits it as hidden `address`, `lat`, `lng` fields.
 * Uses Google Places search when an API key is configured; quick picks and GPS always work.
 */
export function PlacePicker({
  defaultValue,
  showQuickSpots = true,
  placeholder = "Search an address or place",
}: {
  defaultValue?: PickedPlace | null;
  showQuickSpots?: boolean;
  placeholder?: string;
}) {
  const [place, setPlace] = useState<PickedPlace | null>(defaultValue ?? null);
  const [editing, setEditing] = useState(!defaultValue);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function pick(p: PickedPlace) {
    setPlace(p);
    setEditing(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setGeoError("Your browser can't share location.");
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        pick({ address: `My location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location. Search or pick a spot instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div>
      <input type="hidden" name="address" value={place?.address ?? ""} />
      <input type="hidden" name="lat" value={place?.lat ?? ""} />
      <input type="hidden" name="lng" value={place?.lng ?? ""} />

      {place && !editing ? (
        <div className="flex items-start gap-3 rounded-lg border border-ink/80 bg-white px-3 py-2.5">
          <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="flex-1 text-sm">{place.address}</p>
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium underline">
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {MAPS_KEY ? (
            <APIProvider apiKey={MAPS_KEY}>
              <SearchBox onPick={pick} placeholder={placeholder} />
            </APIProvider>
          ) : (
            <p className="rounded-lg bg-black/5 px-3 py-2 text-xs text-black/60">
              Address search turns on once a Google Maps key is added. For now, pick a spot below or use your
              location.
            </p>
          )}

          <button type="button" onClick={useMyLocation} className="btn-outline w-full" disabled={locating}>
            <Icon name="location" />
            {locating ? "Finding you…" : "Use my current location"}
          </button>
          {geoError && <p className="text-xs text-red-700">{geoError}</p>}

          {showQuickSpots && (
            <div>
              <p className="hint mb-2">Or pick a common spot:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SPOTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => pick(s)}
                    className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs hover:border-ink"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchBox({ onPick, placeholder }: { onPick: (p: PickedPlace) => void; placeholder: string }) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!places || query.trim().length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        token.current ??= new places.AutocompleteSessionToken();
        const res = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: token.current,
          includedRegionCodes: ["us"],
          locationBias: BAY_AREA,
        });
        if (!cancelled) {
          setSuggestions(res.suggestions);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Address search isn't working right now. Pick a spot below instead.");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [places, query]);

  async function choose(s: google.maps.places.AutocompleteSuggestion) {
    const prediction = s.placePrediction;
    if (!prediction) return;
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
    token.current = null; // a session ends once a place is chosen
    if (!place.location) return;
    const name = place.displayName ?? "";
    const addr = place.formattedAddress ?? prediction.text.toString();
    onPick({
      address: name && !addr.startsWith(name) ? `${name}, ${addr}` : addr,
      lat: place.location.lat(),
      lng: place.location.lng(),
    });
  }

  const visible = query.trim().length >= 3 ? suggestions : [];

  return (
    <div className="relative">
      <input
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={places ? placeholder : "Loading address search…"}
        autoComplete="off"
        disabled={!places}
      />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      {visible.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-black/15 bg-white shadow-lg">
          {visible.map((s, i) => (
            <li key={s.placePrediction?.placeId ?? i}>
              <button
                type="button"
                onClick={() => choose(s)}
                className="block w-full px-3 py-2.5 text-left text-sm hover:bg-black/5"
              >
                <span className="font-medium">{s.placePrediction?.mainText?.toString()}</span>{" "}
                <span className="text-black/55">{s.placePrediction?.secondaryText?.toString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
