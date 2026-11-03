"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toFa } from "@/lib/format";
import {
  MapPin,
  Plus,
  Trash2,
  Loader2,
  Globe,
  Map as MapIcon,
  Building2,
} from "lucide-react";

interface Country {
  id: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  phoneCode: string | null;
  sortOrder: number;
  provinceCount?: number;
}
interface Province {
  id: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  sortOrder: number;
  countryId: string;
  cityCount?: number;
}
interface City {
  id: string;
  name: string;
  nameEn: string | null;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
  provinceId: string;
}

type Tab = "country" | "province" | "city";

export default function LocationsManager() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("country");

  // Country state
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryForm, setCountryForm] = useState({
    name: "",
    nameEn: "",
    code: "",
    phoneCode: "",
    sortOrder: 0,
  });
  const [submittingCountry, setSubmittingCountry] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Province state
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [provinceForm, setProvinceForm] = useState({
    name: "",
    nameEn: "",
    code: "",
    sortOrder: 0,
  });
  const [submittingProvince, setSubmittingProvince] = useState(false);

  // City state
  const [cities, setCities] = useState<City[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [cityForm, setCityForm] = useState({
    name: "",
    nameEn: "",
    latitude: "",
    longitude: "",
    sortOrder: 0,
  });
  const [submittingCity, setSubmittingCity] = useState(false);

  // Provinces list (for city tab dropdown — across all countries)
  const [allProvinces, setAllProvinces] = useState<Province[]>([]);
  const [allProvinceCountryMap, setAllProvinceCountryMap] = useState<Record<string, string>>({});

  const [err, setErr] = useState<string | null>(null);

  // Load countries on mount
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((j) => {
        setCountries(j.countries ?? []);
        if (j.countries?.length > 0 && !selectedCountryId) {
          setSelectedCountryId(j.countries[0].id);
        }
      })
      .catch((e) => setErr(e.message));
  }, []);

  // Load all provinces for the city-tab dropdown
  useEffect(() => {
    // For each country, fetch provinces — but to keep it simple, fetch one country at a time on demand.
    // Here we just preload provinces for all countries that have > 0 provinces.
    if (countries.length === 0) return;
    Promise.all(
      countries.map((c) =>
        fetch(`/api/locations?country=${c.id}`)
          .then((r) => r.json())
          .then((j) => ({
            countryId: c.id,
            countryName: c.name,
            provinces: (j.provinces ?? []) as Province[],
          })),
      ),
    ).then((results) => {
      const all: Province[] = [];
      const map: Record<string, string> = {};
      results.forEach((r) => {
        r.provinces.forEach((p) => {
          all.push(p);
          map[p.id] = r.countryName;
        });
      });
      all.sort((a, b) => a.name.localeCompare(b.name));
      setAllProvinces(all);
      setAllProvinceCountryMap(map);
      if (all.length > 0 && !selectedProvinceId) {
        setSelectedProvinceId(all[0].id);
      }
    });
  }, [countries.length]);

  // Load provinces when selectedCountryId changes
  useEffect(() => {
    if (!selectedCountryId) return;
    fetch(`/api/locations?country=${selectedCountryId}`)
      .then((r) => r.json())
      .then((j) => setProvinces(j.provinces ?? []))
      .catch((e) => setErr(e.message));
  }, [selectedCountryId]);

  // Load cities when selectedProvinceId changes
  useEffect(() => {
    if (!selectedProvinceId) return;
    fetch(`/api/locations?province=${selectedProvinceId}`)
      .then((r) => r.json())
      .then((j) => setCities(j.cities ?? []))
      .catch((e) => setErr(e.message));
  }, [selectedProvinceId]);

  /* ── Country actions ── */
  function submitCountry(e: React.FormEvent) {
    e.preventDefault();
    if (!countryForm.name) {
      setErr("نام کشور الزامی است.");
      return;
    }
    setErr(null);
    setSubmittingCountry(true);
    fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: "country", ...countryForm }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "خطا");
        setCountries((prev) =>
          [...prev, { ...j.country, provinceCount: 0 }].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          ),
        );
        setCountryForm({ name: "", nameEn: "", code: "", phoneCode: "", sortOrder: 0 });
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setSubmittingCountry(false));
  }

  function deleteCountry(c: Country) {
    // Safety check: fetch provinces first (GET doesn't return counts in list mode).
    setBusyId(c.id);
    fetch(`/api/locations?country=${c.id}`)
      .then((r) => r.json())
      .then(async (j) => {
        const provinceCount = (j.provinces ?? []).length;
        if (provinceCount > 0) {
          alert(`این کشور ${toFa(provinceCount)} استان دارد و قابل حذف نیست.`);
          return;
        }
        if (!confirm(`حذف کشور «${c.name}»؟`)) return;
        const r = await fetch(`/api/locations/${c.id}?level=country`, {
          method: "DELETE",
        });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error ?? "خطا");
        }
        setCountries((prev) => prev.filter((x) => x.id !== c.id));
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setBusyId(null));
  }

  /* ── Province actions ── */
  function submitProvince(e: React.FormEvent) {
    e.preventDefault();
    if (!provinceForm.name || !selectedCountryId) {
      setErr("نام استان و کشور الزامی است.");
      return;
    }
    setErr(null);
    setSubmittingProvince(true);
    fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "province",
        countryId: selectedCountryId,
        ...provinceForm,
      }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "خطا");
        setProvinces((prev) =>
          [...prev, { ...j.province, cityCount: 0 }].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          ),
        );
        // Bump country province count
        setCountries((prev) =>
          prev.map((c) =>
            c.id === selectedCountryId ? { ...c, provinceCount: (c.provinceCount ?? 0) + 1 } : c,
          ),
        );
        setProvinceForm({ name: "", nameEn: "", code: "", sortOrder: 0 });
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setSubmittingProvince(false));
  }

  function deleteProvince(p: Province) {
    // Safety check: fetch cities first (GET doesn't return counts in list mode).
    setBusyId(p.id);
    fetch(`/api/locations?province=${p.id}`)
      .then((r) => r.json())
      .then(async (j) => {
        const cityCount = (j.cities ?? []).length;
        if (cityCount > 0) {
          alert(`این استان ${toFa(cityCount)} شهر دارد و قابل حذف نیست.`);
          return;
        }
        if (!confirm(`حذف استان «${p.name}»؟`)) return;
        const r = await fetch(`/api/locations/${p.id}?level=province`, {
          method: "DELETE",
        });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error ?? "خطا");
        }
        setProvinces((prev) => prev.filter((x) => x.id !== p.id));
        setCountries((c) =>
          c.map((country) =>
            country.id === p.countryId
              ? { ...country, provinceCount: Math.max(0, (country.provinceCount ?? 0) - 1) }
              : country,
          ),
        );
        // Also update allProvinces list for the city tab dropdown
        setAllProvinces((prev) => prev.filter((x) => x.id !== p.id));
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setBusyId(null));
  }

  /* ── City actions ── */
  function submitCity(e: React.FormEvent) {
    e.preventDefault();
    if (!cityForm.name || !selectedProvinceId) {
      setErr("نام شهر و استان الزامی است.");
      return;
    }
    setErr(null);
    setSubmittingCity(true);
    fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "city",
        provinceId: selectedProvinceId,
        name: cityForm.name,
        nameEn: cityForm.nameEn,
        latitude: cityForm.latitude === "" ? null : Number(cityForm.latitude),
        longitude: cityForm.longitude === "" ? null : Number(cityForm.longitude),
        sortOrder: cityForm.sortOrder,
      }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "خطا");
        setCities((prev) =>
          [...prev, j.city].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          ),
        );
        setProvinces((prev) =>
          prev.map((p) =>
            p.id === selectedProvinceId ? { ...p, cityCount: (p.cityCount ?? 0) + 1 } : p,
          ),
        );
        setCityForm({ name: "", nameEn: "", latitude: "", longitude: "", sortOrder: 0 });
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setSubmittingCity(false));
  }

  function deleteCity(c: City) {
    if (!confirm(`حذف شهر «${c.name}»؟`)) return;
    setBusyId(c.id);
    fetch(`/api/locations/${c.id}?level=city`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? "خطا");
        }
        setCities((prev) => prev.filter((x) => x.id !== c.id));
        setProvinces((p) =>
          p.map((x) =>
            x.id === c.provinceId ? { ...x, cityCount: Math.max(0, (x.cityCount ?? 0) - 1) } : x,
          ),
        );
        router.refresh();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setBusyId(null));
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "country", label: "کشورها", icon: Globe },
    { key: "province", label: "استان‌ها", icon: MapIcon },
    { key: "city", label: "شهرها", icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {err}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-[#F58220] text-white shadow"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Country tab */}
      {tab === "country" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={submitCountry}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#F58220]" />
              <h2 className="text-lg font-bold text-zinc-900">کشور جدید</h2>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600">نام فارسی</label>
                <input
                  value={countryForm.name}
                  onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                  placeholder="ایران"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600">نام انگلیسی</label>
                <input
                  dir="ltr"
                  value={countryForm.nameEn}
                  onChange={(e) => setCountryForm({ ...countryForm, nameEn: e.target.value })}
                  placeholder="Iran"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">کد (۲ حرفی)</label>
                  <input
                    dir="ltr"
                    value={countryForm.code}
                    onChange={(e) =>
                      setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })
                    }
                    placeholder="IR"
                    maxLength={2}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono outline-none focus:border-[#F58220] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">کد تلفن</label>
                  <input
                    dir="ltr"
                    value={countryForm.phoneCode}
                    onChange={(e) => setCountryForm({ ...countryForm, phoneCode: e.target.value })}
                    placeholder="+98"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600">ترتیب</label>
                <input
                  type="number"
                  value={countryForm.sortOrder}
                  onChange={(e) =>
                    setCountryForm({ ...countryForm, sortOrder: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={submittingCountry}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
              >
                {submittingCountry ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                ایجاد کشور
              </button>
            </div>
          </form>

          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 text-right font-bold">نام</th>
                      <th className="px-4 py-3 text-right font-bold">انگلیسی</th>
                      <th className="px-4 py-3 text-center font-bold">کد</th>
                      <th className="px-4 py-3 text-center font-bold">تلفن</th>
                      <th className="px-4 py-3 text-center font-bold">استان‌ها</th>
                      <th className="px-4 py-3 text-center font-bold">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {countries.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-bold text-zinc-900">{c.name}</td>
                        <td className="px-4 py-3 text-zinc-500" dir="ltr">
                          {c.nameEn ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.code ? (
                            <span
                              dir="ltr"
                              className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-700"
                            >
                              {c.code}
                            </span>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-600" dir="ltr">
                          {c.phoneCode ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                              (c.provinceCount ?? 0) > 0
                                ? "bg-orange-100 text-orange-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            <MapIcon className="h-3 w-3" />
                            {toFa(c.provinceCount ?? 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => deleteCountry(c)}
                            disabled={busyId === c.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {countries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                          کشوری ثبت نشده.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Province tab */}
      {tab === "province" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-bold text-zinc-600">انتخاب کشور</label>
            <select
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
            >
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <form
              onSubmit={submitProvince}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-[#F58220]" />
                <h2 className="text-lg font-bold text-zinc-900">استان جدید</h2>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">نام فارسی</label>
                  <input
                    value={provinceForm.name}
                    onChange={(e) => setProvinceForm({ ...provinceForm, name: e.target.value })}
                    placeholder="تهران"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">نام انگلیسی</label>
                  <input
                    dir="ltr"
                    value={provinceForm.nameEn}
                    onChange={(e) => setProvinceForm({ ...provinceForm, nameEn: e.target.value })}
                    placeholder="Tehran"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-600">کد</label>
                    <input
                      dir="ltr"
                      value={provinceForm.code}
                      onChange={(e) => setProvinceForm({ ...provinceForm, code: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-600">ترتیب</label>
                    <input
                      type="number"
                      value={provinceForm.sortOrder}
                      onChange={(e) =>
                        setProvinceForm({ ...provinceForm, sortOrder: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submittingProvince || !selectedCountryId}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
                >
                  {submittingProvince ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  ایجاد استان
                </button>
              </div>
            </form>

            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 text-right font-bold">نام</th>
                        <th className="px-4 py-3 text-right font-bold">انگلیسی</th>
                        <th className="px-4 py-3 text-center font-bold">کد</th>
                        <th className="px-4 py-3 text-center font-bold">شهرها</th>
                        <th className="px-4 py-3 text-center font-bold">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {provinces.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-bold text-zinc-900">{p.name}</td>
                          <td className="px-4 py-3 text-zinc-500" dir="ltr">
                            {p.nameEn ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-zinc-600" dir="ltr">
                            {p.code ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                                (p.cityCount ?? 0) > 0
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              <Building2 className="h-3 w-3" />
                              {toFa(p.cityCount ?? 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => deleteProvince(p)}
                              disabled={busyId === p.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {provinces.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                            استانی ثبت نشده.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* City tab */}
      {tab === "city" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-bold text-zinc-600">انتخاب استان</label>
            <select
              value={selectedProvinceId}
              onChange={(e) => setSelectedProvinceId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
            >
              {allProvinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {allProvinceCountryMap[p.id] ?? ""} / {p.name}
                </option>
              ))}
            </select>
            {allProvinces.length === 0 && (
              <p className="mt-2 text-xs text-zinc-400">
                ابتدا در تب استان‌ها، حداقل یک استان بسازید.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <form
              onSubmit={submitCity}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#F58220]" />
                <h2 className="text-lg font-bold text-zinc-900">شهر جدید</h2>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">نام فارسی</label>
                  <input
                    value={cityForm.name}
                    onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                    placeholder="تهران"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">نام انگلیسی</label>
                  <input
                    dir="ltr"
                    value={cityForm.nameEn}
                    onChange={(e) => setCityForm({ ...cityForm, nameEn: e.target.value })}
                    placeholder="Tehran"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-600">عرض جغرافیایی</label>
                    <input
                      dir="ltr"
                      type="number"
                      step="any"
                      value={cityForm.latitude}
                      onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                      placeholder="35.6892"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-600">طول جغرافیایی</label>
                    <input
                      dir="ltr"
                      type="number"
                      step="any"
                      value={cityForm.longitude}
                      onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                      placeholder="51.3890"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">ترتیب</label>
                  <input
                    type="number"
                    value={cityForm.sortOrder}
                    onChange={(e) =>
                      setCityForm({ ...cityForm, sortOrder: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#F58220] focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingCity || !selectedProvinceId}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
                >
                  {submittingCity ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  ایجاد شهر
                </button>
              </div>
            </form>

            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 text-right font-bold">نام</th>
                        <th className="px-4 py-3 text-right font-bold">انگلیسی</th>
                        <th className="px-4 py-3 text-center font-bold">عرض ج.</th>
                        <th className="px-4 py-3 text-center font-bold">طول ج.</th>
                        <th className="px-4 py-3 text-center font-bold">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {cities.map((c) => (
                        <tr key={c.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-bold text-zinc-900">{c.name}</td>
                          <td className="px-4 py-3 text-zinc-500" dir="ltr">
                            {c.nameEn ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-zinc-600" dir="ltr">
                            {c.latitude ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-zinc-600" dir="ltr">
                            {c.longitude ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => deleteCity(c)}
                              disabled={busyId === c.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {cities.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                            شهری ثبت نشده.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
