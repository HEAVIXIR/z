# HEAVIX — Architecture Overview & Feature Index

**This document is the definitive feature index for HEAVIX.**
**It maps the full architecture tree to implementation status + admin editability.**

---

## Architecture Tree (per project documents)

```
HEAVIX
│
├── Catalog
│   ├── Category (3-generation machine taxonomy: 16 L1 → L2 → L3)
│   ├── Brand Registry (629+ brands, aliases, families, industries)
│   ├── Product / Machine / Part / Attachment
│   ├── Compatibility Graph
│   ├── Attribute Engine (405 definitions, 22 types, provenance)
│   └── Product Models + Generations
│
├── Marketplace
│   ├── Listings (full CRUD, dynamic attributes, images, location, transaction)
│   ├── Transaction Types (SALE/RENT/WANTED/QUOTE/AUCTION/SERVICE_REQUEST)
│   ├── Service Types (9 types)
│   ├── Sell in 7 Days (prepayment + 1% commission)
│   ├── RFQ / B2B
│   ├── Auctions
│   ├── Offers (accept/reject/counter)
│   └── Company Verification (documents, branches, timeline)
│
├── Pricing Intelligence
│   ├── Price Estimation ✅ NEW
│   │   ├── Comparable-based engine (median/p25/p75)
│   │   ├── Confidence tiers (HIGH/MEDIUM/LOW/INSUFFICIENT)
│   │   ├── Price Health (IN_RANGE/BELOW/ABOVE)
│   │   ├── Admin Override (audited)
│   │   └── Legal disclaimer
│   ├── Comparable Engine ✅ NEW
│   │   ├── Cross-listing comparison
│   │   ├── 3-tier fallback (strict → relaxed → brand+category)
│   │   └── Data freshness tracking
│   ├── Price History ✅
│   │   ├── Monthly aggregation
│   │   ├── Median + range + count
│   │   └── PriceRecord model
│   └── Price Analytics ✅
│       ├── Outlier detection (Tukey IQR)
│       ├── Price suggestions for sellers
│       └── Admin dashboard with charts
│
└── Decision Intelligence
    ├── Machine Compare ✅ NEW
    │   ├── Model-level comparison (Brand → Model → Generation → Specs)
    │   ├── Fixed + dynamic attributes
    │   └── Cross-category warning
    ├── Listing Compare ✅ NEW
    │   ├── Side-by-side listing comparison
    │   ├── Price + estimated range integration
    │   ├── Differences-only toggle
    │   └── Missing data handling ("—" not 0)
    ├── Application Compare ✅ NEW
    │   ├── Scenario-based comparison (mining/road/construction/etc.)
    │   └── Relevant features highlighted per scenario
    └── AI Comparison ✅ NEW
        ├── LLM summary of differences
        ├── No winner declaration
        ├── Missing data identification
        └── Saved + shareable comparisons
```

---

## Feature → Admin Editability Matrix

### Catalog
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| Categories | `/admin/categories` | ✅ Full (name, slug, parent, layer, image, industries, AI image gen) |
| Brands | `/admin/taxonomy/brands/[id]` | ✅ Full (11 tabs: identity, aliases, industries, domains, categories, models, media, SEO, display, AI, danger) |
| Brand Families | `/admin/brand-families` | ✅ Full |
| Attributes | `/admin/taxonomy/attributes` | ✅ Full (CRUD + options + category links + flags) |
| Products | `/admin/products` | ✅ Full (CRUD) |
| Compatibility Graph | `/admin/compatibility` | ✅ Full (CRUD edges) |

### Marketplace
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| Listings | `/admin/listings/[id]/edit` | ✅ Full (all fields + attributes + images + status + extend) |
| Sell in 7 Days | `/admin/sell-in-7-days` | ✅ Full (status + financial config) |
| RFQ | `/admin/rfq` | ✅ Full |
| Auctions | `/admin/auctions` | ✅ Full |
| Offers | `/admin/offers` | ✅ Full (accept/reject/counter) |
| Companies | `/admin/companies/[id]` | ✅ Full (verification + documents + branches) |
| Transactions | `/admin/taxonomy/transactions` | ✅ Full |
| Services | `/admin/taxonomy/services` | ✅ Full |

### Pricing Intelligence
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| Price Estimation | `/admin/pricing` | ✅ Full (estimates, observations, overrides, history) |
| Price Observations | `/admin/pricing` (tab 2) | ✅ Full (filter, view, flag) |
| Price Overrides | `/admin/pricing` (tab 3) | ✅ Full (create with reason + audit) |
| Price History | `/admin/pricing` (tab 4) | ✅ Full (chart + table) |
| Price Analytics | `/admin/price-intelligence` | ✅ Full (stats, outliers, suggestions) |
| Public Price Card | Listing detail page | ✅ Auto-rendered (editable via admin) |

### Decision Intelligence (Compare)
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| Compare Sessions | `/admin/compare` | ✅ Full (view, rename, archive, share) |
| Attribute Visibility | `/admin/compare` (config) | ✅ Full (selectable attributes) |
| AI Summaries | `/admin/compare` (per session) | ✅ Viewable |
| Public Compare Page | `/compare` | ✅ Auto-rendered |

### Homepage Sections
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| Section order/active | `/admin/homepage-layout` | ✅ Full (toggle + reorder + edit text) |
| Hero | `/admin/home/hero` | ✅ Full (text + images + 30+ dimensions + listing picker) |
| Verified Machines | `/admin/home/verified-machines` | ✅ Full (title, limit, animation) |
| Trusted Brands | `/admin/home/trusted-brands` | ✅ Full (title, limit, speed, brand select) |
| Machine Categories | `/admin/home/categories` | ✅ Full (generation, parent) |
| Header/Logo | `/admin/home/header` | ✅ Full (logo URL, text, animation duration) |
| Footer | `/admin/home/footer` | ✅ Full |
| Services | `/admin/services` | ✅ Full (CRUD) |
| Site Stats | `/admin/site-stats` | ✅ Full (CRUD + reorder) |
| Menu | `/admin/menu` | ✅ Full (CRUD + reorder + nest) |
| Settings | `/admin/settings` | ✅ Full |

### AI / Intelligence
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| AI Gateway | `/admin/ai-gateway` | ✅ View logs |
| AI Budget | `/admin/ai-budget` | ✅ Full (limits + policies) |
| AI Agents | `/admin/ai-agents` | ✅ Run + configure |
| AI Scraper | `/admin/ai-scraper` | ✅ Generate + import |
| AI Reels | `/admin/reels` | ✅ Generate + list |
| Knowledge Graph | `/admin/knowledge-graph` | ✅ Explorer |
| Demand Engine | `/admin/demand-engine` | ✅ View analytics |
| Opportunity Engine | `/admin/opportunities` | ✅ View + manage |
| Market Heatmap | `/admin/market-heatmap` | ✅ View analytics |
| Recommendations | (auto-generated) | ⚠️ No admin page yet |

### Content
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| Articles/Knowledge | `/admin/articles` | ✅ Full (CRUD + AI generation + AI cover) |
| SEO Metadata | `/admin/seo` | ✅ Full (per-entity CRUD) |
| Sitemap | `/sitemap.xml` | ✅ Auto-generated |
| Robots | `/robots.txt` | ✅ Auto-generated |

### Security / System
| Feature | Admin Page | Editable |
|---------|-----------|----------|
| Users | `/admin/users` + `/[id]` | ✅ Full (CRUD + roles + verification) |
| Audit Log | `/admin/audit-log` | ✅ View + filter |
| Background Jobs | `/admin/jobs` | ✅ Trigger + stats |
| Feature Flags | `/admin/feature-flags` | ✅ Full |
| Locations | `/admin/taxonomy/locations` | ✅ Full (country/province/city) |

---

## Document Index (docs/)

1. `HEAVIX-PROJECT-PRINCIPLES.md` — Master authority document
2. `HEAVIX-CORRECTED-REFERENCE-V1.1.md` — Architecture reference
3. `HEAVIX-SECURITY-BASELINE-V1.md` — Security principles
4. `HEAVIX-DATA-GOVERNANCE-V1.md` — Data governance
5. `HEAVIX-P0-IMPLEMENTATION-PLAN.md` — Execution plan (P0→P1→P2)
6. `HEAVIX-AUDIT-2026-09-20.md` — Gap assessment
7. `HEAVIX-PRICE-ESTIMATION-SPEC-V1.0.md` — Price engine spec ✅ NEW
8. `HEAVIX-MACHINE-COMPARISON-SPEC-V1.0.md` — Compare engine spec ✅ NEW
9. `HEAVIX-REQUIREMENTS-CORRECTIONS.md` — User correction requirements
10. `HEAVIX-PROJECT-REFERENCE.md` — Previous reference
11. `ADR-001-database-strategy.md` — DB decision record
12. `HEAVIX-MASTER-DOCUMENT.md` — Strategy
13. `HEAVIX-MASTER-STRATEGY.md` — Strategy

---

## Current Data Snapshot

- **Categories:** 295 (16 machine L1, 174 L2, 97 L3)
- **Brands:** 629+ canonical with aliases/families/industries
- **Attributes:** 405 definitions, 215 options, 731 category links
- **Listings:** 31 (all with images)
- **Industries:** 39 brand industries + 16 application industries
- **Locations:** Iran + 31 provinces + 179 cities
- **Users:** 2 (bcrypt-hashed)
- **Models:** Role/Permission/RolePermission/UserRole (5 roles, 20 permissions)
- **Security:** bcrypt + secure sessions + RBAC + AuditLog + rate limiting + upload hardening
- **Tests:** 70 passing, 0 failing
