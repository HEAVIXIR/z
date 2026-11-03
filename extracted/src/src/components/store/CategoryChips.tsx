"use client";

import { Cog, Wrench, Battery, Filter, Gauge, Zap, Boxes, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/store-types";

const ICONS: Record<string, React.ReactNode> = {
  engine: <Cog className="size-3.5" />,
  brakes: <Gauge className="size-3.5" />,
  suspension: <Wrench className="size-3.5" />,
  electrical: <Zap className="size-3.5" />,
  filters: <Filter className="size-3.5" />,
  "oil-filter": <Filter className="size-3.5" />,
  "air-filter": <Filter className="size-3.5" />,
};

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
  onClear,
}: {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-slim pb-1">
          <button
            onClick={onClear}
            className={cn(
              "flex items-center gap-1 px-2.5 h-7 rounded-full border text-xs whitespace-nowrap shrink-0 transition-colors",
              !selectedId
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground",
            )}
          >
            <Boxes className="size-3.5" />
            همه
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex items-center gap-1 px-2.5 h-7 rounded-full border text-xs whitespace-nowrap shrink-0 transition-colors",
                selectedId === c.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {ICONS[c.slug || ""] || <Boxes className="size-3.5" />}
              {c.name}
              {c.children?.length ? (
                <ChevronLeft className="size-3 opacity-50" />
              ) : null}
            </button>
          ))}
          {categories.length === 0 && (
            <Badge variant="secondary" className="text-xs">در حال بارگذاری دسته‌ها...</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
