# Landing Pages ASHIRA — estructura post-refactor (contenido + SEO)

Documento actualizado tras la reestructuración de contenido y SEO. **El diseño visual de componentes compartidos no se rediseñó**; cambió la arquitectura de contenido, precios (USD) y metadatos.

---

## Fuente única de verdad

`src/config/ashira-content.ts` exporta:

- `pricingPlans` / `consultorioPricing` / `clinicaPricing` / `enfermeroPricing` / `homePricingCards` — **todo en USD**
- `differentiators` — 5 diferenciadores
- `tractionStats` — +350 pacientes, 3 IA, 2h/día, 8x ROI
- `audienceRoutes`, `ecosystemLinks`, `companyFaqs`, `seoByRoute`

Helpers SEO: `src/lib/seo.ts` + `src/components/seo/JsonLd.tsx`  
Sitemap: `src/app/sitemap.ts` · Robots: `src/app/robots.ts`

---

## Mapa de rutas

| Ruta | Rol | Notas |
|------|-----|--------|
| `/` | Enrutador de ecosistema | Hero + `ProfileSelector` + trust + historia corta + ecosistema + roadmap + FAQ + CTA |
| `/landing/consultorios` | Médicos | Precios USD desde config ($35 / $31.50 / $24.50) |
| `/landing/clinicas` | Clínicas | Precios USD por especialista + admin; calculadora multi-sede |
| `/landing/enfermeros` | Enfermería | Precios USD desde config |
| `/landing/pacientes` | Pacientes | Gratis; Plan Familiar hasta 5 |
| `/landing/farmacias` | Próximamente | Waitlist email |
| `/landing/laboratorios` | Próximamente | Waitlist email |

---

## Home `/` — secciones

1. Hero ecosistema (H1: “El ecosistema de salud digital…”)
2. **ProfileSelector** (`#perfiles`) → rutas de audiencia
3. MarqueeTrust
4. OriginStory (versión corta del problema)
5. Grid ecosistema (links reales; Analytics → WhatsApp)
6. Roadmap
7. FAQ empresa (`companyFaqs`)
8. CTA + LandingFooter

Ya no monta en profundidad: AIBento, FeatureTabs, PricingTable, Differentiators, RoleShowcase, RoiBlock, PatientPanelLoyalty, Embajadora (el detalle vive en landings de rol).

---

## CTAs

Ningún “Conocer más” del ecosistema apunta a `#`. Farmacias/Labs → sus rutas. Analytics → WhatsApp ventas.

---

## SEO

Cada landing tiene `layout.tsx` con `metadata` (title, description, OG, Twitter, canonical). Home usa metadata del root layout + JSON-LD Organization/SoftwareApplication + FAQPage. Consultorios/clínicas/enfermeros incluyen FAQPage JSON-LD. Las 7 rutas están en `sitemap.xml` e indexables en `robots.ts`.

---

*Actualizado: julio 2026*
