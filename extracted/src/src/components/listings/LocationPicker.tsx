"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

/* ============================================================
   LocationPicker — cascading country / province / city dropdowns.

   Fetches from /api/locations:
   - GET /api/locations                       → countries
   - GET /api/locations?country=<code|id>     → provinces
   - GET /api/locations?province=<id>         → cities

   Default country = ایران (IR). When the parent doesn't supply a
   countryId, we auto-select Iran once the country list loads.
   ============================================================ */

export type LocationValue = {
  countryId: string;
  provinceId: string;
  cityId: string;
};

type Country = { id: string; name: string; nameEn: string | null; code: string | null };
type Province = { id: string; name: string; nameEn: string | null; code: string | null; countryId: string };
type City = { id: string; name: string; nameEn: string | null; provinceId: string };

const selectCls =
  "h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none transition focus:border-[#F58220] focus:shadow-[0_0_0_3px_rgba(245,130,32,.12)]";
const labelCls = "mb-1.5 block text-xs font-bold text-white/60";

export default function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // 1) Load country list (default to ایران)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/locations", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { countries: Country[] };
        if (!alive) return;
        setCountries(data.countries ?? []);
        if (!value.countryId && data.countries.length > 0) {
          const iran =
            data.countries.find((c) => c.code === "IR" || c.name === "ایران") ??
            data.countries[0];
          onChange({ ...value, countryId: iran.id, provinceId: "", cityId: "" });
        }
      } catch {
        /* swallow */
      } finally {
        if (alive) setLoadingCountries(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2) Load provinces when country changes
  useEffect(() => {
    if (!value.countryId) {
      setProvinces([]);
      setCities([]);
      return;
    }
    let alive = true;
    setLoadingProvinces(true);
    (async () => {
      try {
        const country = countries.find((c) => c.id === value.countryId);
        const code = country?.code ?? country?.name ?? value.countryId;
        const res = await fetch(`/api/locations?country=${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { provinces: Province[] };
        if (!alive) return;
        setProvinces(data.provinces ?? []);
        // If the current provinceId is no longer valid, clear it
        if (value.provinceId && !(data.provinces ?? []).some((p) => p.id === value.provinceId)) {
          onChange({ ...value, provinceId: "", cityId: "" });
        }
      } catch {
        if (alive) setProvinces([]);
      } finally {
        if (alive) setLoadingProvinces(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [value.countryId]);

  // 3) Load cities when province changes
  useEffect(() => {
    if (!value.provinceId) {
      setCities([]);
      return;
    }
    let alive = true;
    setLoadingCities(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/locations?province=${encodeURIComponent(value.provinceId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { cities: City[] };
        if (!alive) return;
        setCities(data.cities ?? []);
        if (value.cityId && !(data.cities ?? []).some((c) => c.id === value.cityId)) {
          onChange({ ...value, cityId: "" });
        }
      } catch {
        if (alive) setCities([]);
      } finally {
        if (alive) setLoadingCities(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [value.provinceId]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Country */}
      <div>
        <label className={labelCls}>
          <MapPin className="ml-1 inline h-3 w-3 text-[#F58220]" />
          کشور
        </label>
        <div className="relative">
          <select
            value={value.countryId}
            onChange={(e) =>
              onChange({ countryId: e.target.value, provinceId: "", cityId: "" })
            }
            className={selectCls}
            disabled={loadingCountries}
          >
            <option value="">
              {loadingCountries ? "بارگذاری…" : "انتخاب کنید"}
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {loadingCountries && (
            <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#F58220]" />
          )}
        </div>
      </div>

      {/* Province */}
      <div>
        <label className={labelCls}>استان</label>
        <div className="relative">
          <select
            value={value.provinceId}
            onChange={(e) =>
              onChange({
                countryId: value.countryId,
                provinceId: e.target.value,
                cityId: "",
              })
            }
            className={selectCls}
            disabled={loadingProvinces || !value.countryId}
          >
            <option value="">
              {!value.countryId
                ? "ابتدا کشور را انتخاب کنید"
                : loadingProvinces
                  ? "بارگذاری…"
                  : "انتخاب کنید"}
            </option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {loadingProvinces && (
            <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#F58220]" />
          )}
        </div>
      </div>

      {/* City */}
      <div>
        <label className={labelCls}>شهر</label>
        <div className="relative">
          <select
            value={value.cityId}
            onChange={(e) =>
              onChange({
                countryId: value.countryId,
                provinceId: value.provinceId,
                cityId: e.target.value,
              })
            }
            className={selectCls}
            disabled={loadingCities || !value.provinceId}
          >
            <option value="">
              {!value.provinceId
                ? "ابتدا استان را انتخاب کنید"
                : loadingCities
                  ? "بارگذاری…"
                  : "انتخاب کنید"}
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {loadingCities && (
            <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#F58220]" />
          )}
        </div>
      </div>
    </div>
  );
}
