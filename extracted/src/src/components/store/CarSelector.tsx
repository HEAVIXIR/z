"use client";

import { Car, Truck, X, ChevronLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CarModelGroup } from "@/lib/store-types";
import { toFa } from "@/lib/store-format";

export type VehicleType = "PASSENGER" | "HEAVY";

export function CarSelector({
  groups,
  vehicleType,
  selectedBrand,
  selectedModelId,
  selectedYear,
  onVehicleType,
  onBrand,
  onModel,
  onYear,
  onClear,
}: {
  groups: CarModelGroup[];
  vehicleType: VehicleType;
  selectedBrand: string;
  selectedModelId: string;
  selectedYear: number | null;
  onVehicleType: (t: VehicleType) => void;
  onBrand: (b: string) => void;
  onModel: (id: string) => void;
  onYear: (y: number | null) => void;
  onClear: () => void;
}) {
  const brands = groups.map((g) => g.brand);
  const selectedGroup = groups.find((g) => g.brand === selectedBrand) || null;
  const selectedModel = selectedGroup?.models.find((m) => m.id === selectedModelId) || null;

  const years: number[] = [];
  if (selectedModel) {
    for (let y = selectedModel.yearTo; y >= selectedModel.yearFrom; y--) years.push(y);
  }

  const hasFilter = !!selectedModelId;

  return (
    <section className="border-b border-border/60 bg-card">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-8 rounded-lg bg-foreground text-background grid place-items-center">
            {vehicleType === "HEAVY" ? <Truck className="size-4" /> : <Car className="size-4" />}
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg leading-tight">
              {vehicleType === "HEAVY" ? "قطعات ماشین‌آلات سنگین" : "قطعات خودروی خود را پیدا کنید"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {vehicleType === "HEAVY" ? "کامیون، ماشین‌آلات راه‌سازی و کشاورزی" : "برند، مدل و سال خودرو را انتخاب کنید"}
            </p>
          </div>
        </div>

        {/* Vehicle type toggle */}
        <div className="mb-3 inline-flex p-0.5 bg-muted rounded-lg">
          <button
            onClick={() => onVehicleType("PASSENGER")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
              vehicleType === "PASSENGER" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Car className="size-3.5" /> خودروی سواری
          </button>
          <button
            onClick={() => onVehicleType("HEAVY")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
              vehicleType === "HEAVY" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Truck className="size-3.5" /> ماشین‌آلات سنگین
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Select value={selectedBrand || undefined} onValueChange={(v) => { onBrand(v); onModel(""); onYear(null) }}>
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder={vehicleType === "HEAVY" ? "برند ماشین‌آلات" : "برند خودرو"} />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedModelId || undefined}
            onValueChange={(v) => { onModel(v); onYear(null) }}
            disabled={!selectedBrand}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder={selectedBrand ? "مدل" : "ابتدا برند را انتخاب کنید"} />
            </SelectTrigger>
            <SelectContent>
              {selectedGroup?.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.brand} {m.model} ({toFa(m.yearFrom)}–{toFa(m.yearTo)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear ? String(selectedYear) : undefined}
            onValueChange={(v) => onYear(Number(v))}
            disabled={!selectedModelId}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder={selectedModelId ? "سال تولید" : "ابتدا مدل را انتخاب کنید"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {selectedModel && (
                  <SelectLabel>
                    {selectedModel.brand} {selectedModel.model}
                  </SelectLabel>
                )}
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{toFa(y)}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {hasFilter && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-foreground/5 text-foreground border-border/70 gap-1.5 h-7 pr-2.5">
              <span className="text-muted-foreground text-[11px]">نتایج برای:</span>
              <span className="font-semibold">
                {selectedModel ? `${selectedModel.brand} ${selectedModel.model}` : ""}
                {selectedYear ? ` ${toFa(selectedYear)}` : ""}
              </span>
              <button
                onClick={onClear}
                className="size-5 grid place-items-center rounded hover:bg-danger/15 hover:text-danger mr-0.5"
                aria-label="پاک کردن فیلتر"
              >
                <X className="size-3" />
              </button>
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={onClear}>
              پاک کردن
              <ChevronLeft className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
