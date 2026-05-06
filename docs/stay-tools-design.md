# Frihet Stay — MCP Tools Design Doc

**Status**: design only. NO implementation. Wave 4 candidate.
**Author**: night sprint 2026-05-06
**Trust Area**: low — read-mostly + standard CRUD on existing REST endpoints.
**Approval needed**: Viktor (scope of v1 tool set, vocabulary alignment).

## Context

Frihet ERP exposes a complete `Frihet Stay` (vacation rental management) REST surface:

```
/v1/reservations + /v1/reservations/{id}
/v1/properties + /v1/properties/{id}
/v1/guests + /v1/guests/{id}
/v1/channels + /v1/channels/{id} + /v1/channels/{id}/sync
```

Total: 9 endpoints, all in `functions/src/openapi.yaml` and gated by the same `ALLOWED_RESOURCES` allowlist as other resources in `publicApi.ts`.

`@frihet/mcp-server` (npm v1.7.0-beta.1) currently ships 62 tools across 11 families: invoices, expenses, clients, products, quotes, vendors, webhooks, intelligence, crm, deposits, einvoice. **Stay is the largest gap** — entire vacation-rental product is invisible to MCP-using AI assistants.

## Non-goals

- Stay-specific business logic (channel manager integrations, double-booking detection, ICS sync) — those stay in the ERP UI / Cloud Functions
- Multi-property hierarchical permissions (assume tenant-level scope, like other tools)
- Real-time updates (polling-based, like other Stay UI consumption)
- Historical reservation data export beyond standard pagination

## Architecture

### v1 priority — 5 tools (this design's scope)

The original ask was 5 tools. Pick the highest-leverage subset that unlocks AI assistant use cases:

| Tool | Endpoint | Priority |
|---|---|---|
| `list_reservations` | GET /v1/reservations | P0 (core list) |
| `get_reservation` | GET /v1/reservations/{id} | P0 (detail view) |
| `create_reservation` | POST /v1/reservations | P0 (most-asked AI use case: "book X for Y dates") |
| `list_properties` | GET /v1/properties | P0 (context for any reservation question) |
| `sync_channel` | POST /v1/channels/{id}/sync | P1 (operational unblock) |

### v2 — additional 11 tools (follow-up scope)

| Tool | Endpoint |
|---|---|
| `update_reservation` | PUT /v1/reservations/{id} |
| `cancel_reservation` | DELETE /v1/reservations/{id} |
| `get_property` | GET /v1/properties/{id} |
| `create_property` | POST /v1/properties |
| `update_property` | PUT /v1/properties/{id} |
| `list_guests` | GET /v1/guests |
| `get_guest` | GET /v1/guests/{id} |
| `create_guest` | POST /v1/guests |
| `update_guest` | PUT /v1/guests/{id} |
| `list_channels` | GET /v1/channels |
| `get_channel` | GET /v1/channels/{id} |

## v1 tool specs

Format mirrors existing `apps/erp` tools (e.g. `clients.ts`). All use:
- `z.object` schemas via `zod/v4`
- `withToolLogging` + Langfuse tracing wrapper (auto-applied via `register-all.ts` patch)
- `READ_ONLY_ANNOTATIONS` / `CREATE_ANNOTATIONS` per operation kind
- `IFrihetClient` interface methods (to be added: `listReservations`, `getReservation`, `createReservation`, `listProperties`, `syncChannel`)

### `list_reservations`

```typescript
server.registerTool("list_reservations", {
  title: "List Reservations",
  description:
    "List all reservations for the workspace, with optional filters by " +
    "property, guest, status, or date range. " +
    "/ Lista todas las reservas, con filtros opcionales por propiedad, " +
    "huésped, estado o rango de fechas.",
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: {
    propertyId: z.string().optional().describe("Filter by property / Filtrar por propiedad"),
    guestId: z.string().optional().describe("Filter by guest / Filtrar por huésped"),
    status: z.enum(["confirmed", "pending", "cancelled", "completed", "no_show"]).optional()
      .describe("Filter by reservation status / Filtrar por estado"),
    checkInFrom: z.string().date().optional().describe("Check-in from (YYYY-MM-DD) / Entrada desde"),
    checkInTo: z.string().date().optional().describe("Check-in to (YYYY-MM-DD) / Entrada hasta"),
    fields: z.string().optional().describe("Comma-separated fields to return / Campos a devolver"),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    after: z.string().optional().describe("Cursor pagination / Cursor de paginación"),
  },
  outputSchema: paginatedOutput(reservationItemOutput),
}, async (args) => withToolLogging("list_reservations", async () => {
  const result = await client.listReservations(args);
  return {
    content: [listContent(formatPaginatedResponse("reservations", result))],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}));
```

### `get_reservation`

```typescript
server.registerTool("get_reservation", {
  title: "Get Reservation",
  description:
    "Get a single reservation by ID. Returns full booking details: guest, " +
    "property, dates, channel, payment status. " +
    "/ Obtiene una reserva por ID. Devuelve detalles completos.",
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: { id: z.string().describe("Reservation ID / ID de reserva") },
  outputSchema: reservationItemOutput,
}, async ({ id }) => withToolLogging("get_reservation", async () => {
  const r = await client.getReservation(id);
  return {
    content: [getContent(formatRecord("reservation", r))],
    structuredContent: r as unknown as Record<string, unknown>,
  };
}));
```

### `create_reservation`

```typescript
server.registerTool("create_reservation", {
  title: "Create Reservation",
  description:
    "Create a new reservation. Requires property, guest (id or new guest data), " +
    "and check-in/check-out dates. Creates new guest if id not provided. " +
    "/ Crea una nueva reserva. Requiere propiedad, huésped (id o datos), " +
    "y fechas de entrada/salida.",
  annotations: CREATE_ANNOTATIONS,
  inputSchema: {
    propertyId: z.string().describe("Property ID / ID de propiedad"),
    guestId: z.string().optional().describe("Existing guest ID / ID de huésped existente"),
    guest: z.object({  // create new guest inline if id not provided
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      idDocument: z.string().optional().describe("DNI/passport / Documento"),
      country: z.string().optional().describe("ISO 3166-1 alpha-2"),
    }).optional().describe("New guest data if guestId omitted / Datos para crear huésped"),
    checkIn: z.string().date().describe("Check-in (YYYY-MM-DD) / Entrada"),
    checkOut: z.string().date().describe("Check-out (YYYY-MM-DD) / Salida"),
    nights: z.number().int().min(1).optional().describe("Auto-calculated if omitted / Calculado si se omite"),
    guestCount: z.number().int().min(1).describe("Number of guests / Número de huéspedes"),
    channelId: z.string().optional().describe("Booking channel (Airbnb/Booking/Direct) / Canal"),
    totalAmount: z.number().nonnegative().optional().describe("Total amount / Total"),
    currency: z.string().length(3).optional().describe("ISO 4217 (defaults to workspace currency)"),
    notes: z.string().optional(),
  },
  outputSchema: reservationItemOutput,
}, async (args) => withToolLogging("create_reservation", async () => {
  const r = await client.createReservation(args);
  return {
    content: [mutateContent(formatRecord("reservation", r))],
    structuredContent: r as unknown as Record<string, unknown>,
  };
}));
```

### `list_properties`

```typescript
server.registerTool("list_properties", {
  title: "List Properties",
  description:
    "List all rental properties for the workspace. Returns name, address, " +
    "capacity, owner info, license number. " +
    "/ Lista todas las propiedades. Devuelve nombre, dirección, capacidad, " +
    "datos del propietario, número de licencia.",
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: {
    q: z.string().optional().describe("Search by name or address / Buscar por nombre o dirección"),
    isActive: z.boolean().optional().describe("Filter by active status / Filtrar por activas"),
    fields: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    after: z.string().optional(),
  },
  outputSchema: paginatedOutput(propertyItemOutput),
}, async (args) => withToolLogging("list_properties", async () => {
  const result = await client.listProperties(args);
  return {
    content: [listContent(formatPaginatedResponse("properties", result))],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}));
```

### `sync_channel`

```typescript
server.registerTool("sync_channel", {
  title: "Sync Channel",
  description:
    "Trigger manual sync of a booking channel (Airbnb, Booking.com, etc.). " +
    "Pulls new reservations and pushes calendar updates. Returns sync status. " +
    "/ Dispara sincronización manual de un canal. Importa reservas nuevas y " +
    "envía actualizaciones de calendario.",
  annotations: UPDATE_ANNOTATIONS,
  inputSchema: {
    channelId: z.string().describe("Channel ID / ID de canal"),
    direction: z.enum(["pull", "push", "both"]).optional()
      .describe("Sync direction (default: both) / Dirección de sincronización"),
  },
  outputSchema: z.object({
    channelId: z.string(),
    status: z.enum(["ok", "partial", "failed"]),
    pulledCount: z.number().int().nonnegative(),
    pushedCount: z.number().int().nonnegative(),
    errors: z.array(z.string()).optional(),
    lastSyncAt: z.string().datetime(),
  }),
}, async ({ channelId, direction }) => withToolLogging("sync_channel", async () => {
  const r = await client.syncChannel(channelId, direction ?? "both");
  return {
    content: [mutateContent(formatRecord("channelSync", r))],
    structuredContent: r as unknown as Record<string, unknown>,
  };
}));
```

## IFrihetClient additions

```typescript
interface IFrihetClient {
  // existing ...

  // Stay
  listReservations(args: ListReservationsArgs): Promise<PaginatedResult<Reservation>>;
  getReservation(id: string): Promise<Reservation>;
  createReservation(args: CreateReservationArgs): Promise<Reservation>;
  listProperties(args: ListPropertiesArgs): Promise<PaginatedResult<Property>>;
  syncChannel(channelId: string, direction: "pull" | "push" | "both"): Promise<ChannelSyncResult>;
}
```

Implementation: HTTP fetch against `https://api.frihet.io/v1/{resource}` with bearer token (same pattern as existing clients/invoices fetch impls).

## Output schemas (`shared.ts` additions)

```typescript
export const reservationItemOutput = z.object({
  id: z.string(),
  propertyId: z.string(),
  guestId: z.string(),
  status: z.enum(["confirmed", "pending", "cancelled", "completed", "no_show"]),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  nights: z.number().int().min(1),
  guestCount: z.number().int().min(1),
  channelId: z.string().optional(),
  totalAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const propertyItemOutput = z.object({
  id: z.string(),
  name: z.string(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().length(2).optional(),
  }).optional(),
  capacity: z.number().int().min(1),
  ownerName: z.string().optional(),
  licenseNumber: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

## Trust Area surface

| Risk | Mitigation |
|---|---|
| Tool creates reservation that conflicts with existing booking | Underlying CF already validates double-booking; tool surfaces 409 error |
| Channel sync triggered too frequently → external API rate limit | Existing CF rate-limits per channel; tool propagates error |
| Inline guest creation with bad data (no email, no ID document) | Use existing CF validation; tool returns 400 with actionable message |
| Reservation totals diverge from property pricing rules | This is a write-through — same validation as ERP UI applies |
| Workspace-isolation bypass via fake propertyId | Existing publicApi.ts enforces workspaceUid scope; cannot cross-tenant |

## Migration path

**Phase 0 — verify endpoint surface** (0.5 day):
- Confirm REST endpoints respond per OpenAPI spec
- Capture sample responses for output schema design

**Phase 1 — IFrihetClient HTTP impl** (1 day):
- Add 5 client methods matching existing pattern
- Unit tests with `nock` / fetch mocks

**Phase 2 — register 5 tools** (1 day):
- Tool definitions + `register-all.ts` wiring
- Schema validation tests (zod parse errors → meaningful tool errors)

**Phase 3 — release + observability** (0.5 day):
- Bump `releases.json` to v1.8.0-beta.1 (tools 62 → 67)
- Update `apps/erp/data/manifest.frihet/mcp.json`
- Update `static/llms.txt` mention of MCP tool count
- Verify Langfuse traces appear for each new tool

**Phase 4 — v2 follow-up** (1 week):
- Remaining 11 tools (update/delete reservations, full property/guest CRUD, channel list/get)
- Saved by clear pattern from v1

Total v1: ~3 days dev. v2 follow-up: +3-4 days.

## Open questions for Viktor

1. **v1 priority subset OK?** 3 reservation tools + 1 property + 1 channel. Or different split (e.g., 4 reservations + 1 property)?
2. **Inline guest creation in `create_reservation`**: include or require pre-existing guestId? Tradeoff: AI assistant convenience vs cleaner data model.
3. **Channel sync `direction` enum**: keep `pull/push/both` or simplify to just trigger?
4. **MCP tool naming convention**: existing tools are snake_case (`list_clients`). Stay tools follow same. Confirm.
5. **Release cadence**: ship v1 to npm immediately after merge, or batch with v2 (16 total)? Affects mcpToolCount manifest field.

## References

- Existing tool patterns: `~/Documents/frihet-mcp/src/tools/clients.ts`, `invoices.ts`, `expenses.ts`
- REST surface: `~/Documents/Frihet-ERP/functions/src/openapi.yaml` (search `/v1/reservations`, etc.)
- Allowed resources: `~/Documents/Frihet-ERP/functions/src/publicApi.ts:ALLOWED_RESOURCES`
- Tool registration: `~/Documents/frihet-mcp/src/tools/register-all.ts`
- Schemas + helpers: `~/Documents/frihet-mcp/src/tools/shared.ts`

## Decision log

This doc is **proposal stage**. No commitment. Viktor approval gates Phase 0 entry.
