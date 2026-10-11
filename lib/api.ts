import type { GeoConstituency, GeoConstituencyDetail, GeoFeatureCollection, GeoRegion, GeoRegionDetail } from "./coverage";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001/api";

// Mirrors the backend's EMAIL_ENABLED switch, for copy that depends on it (the
// "confirm your email" hint on login, where the reset link is sent). Email is
// shelved, so this is off unless NEXT_PUBLIC_EMAIL_ENABLED=true.
export const EMAIL_ENABLED = process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";

export interface AgentDocument {
    createdAt: string;
    docType: string;
    fileUrl: string;
    id: number;
    reviewedAt: string | null;
    reviewedBy: number | null;
    status: "Approved" | "Pending" | "Rejected";
}

export interface ApiError {
    error: string;
    status: number;
}

// Auth tokens live in HttpOnly cookies set by the backend; `credentials: "include"`
// attaches them automatically. Nothing auth-related is stored in JS-readable
// storage, so there is no Bearer header to build and no localStorage to read.
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Convert a stored Spaces public URL (https://<endpoint>/<bucket>/<key>) into a
// backend proxy URL (${API_BASE}/files/<key>) so PRIVATE documents render for
// authorized viewers (owner / assigned agent / admin). Property documents are
// NOT in PUBLIC_FOLDERS (only avatars/images are), so their raw CDN URLs 403 —
// the GET /api/files/* proxy resolves property_documents.url to the owner +
// assigned agent (+ admin bypass). Opened in a new tab, the HttpOnly auth cookie
// rides along via credentials:"include" (same as the crm dashboard).
export function fileProxyUrl(spacesUrl: string | null | undefined): string | null {
    if (!spacesUrl) return null;
    try {
        const u = new URL(spacesUrl);
        // key = everything after the first path segment (the bucket).
        const key = u.pathname.replace(/^\//, "").split("/").slice(1).join("/");
        if (!key) return null;
        return `${API_BASE}/files/${key}`;
    } catch {
        return null;
    }
}

export interface RentPeriod {
    amountDue: number;
    dueReminderSentAt: string | null;
    id: number;
    overdueReminderSentAt: string | null;
    overdueReminderStage: number;
    paidAt: string | null;
    paymentId: number | null;
    periodEnd: string;
    periodStart: string;
    status: "Due" | "Overdue" | "Paid";
    tenancyId: number;
}

// Shape returned by GET /properties/:id/documents (property.service listPropertyDocuments).
export interface PropertyDocument {
    createdAt: string;
    documentType: string;
    id: number;
    label: null | string;
    notes: null | string;
    reviewedAt: null | string;
    reviewedByName: null | string;
    status: "Approved" | "Pending" | "Rejected";
    uploadedByName: null | string;
    url: string;
}

// The 10 document_type enum values (backend DocumentTypeEnum) with display labels.
export const DOCUMENT_TYPES: { label: string; value: string }[] = [
    { label: "Title Deed", value: "TitleDeed" },
    { label: "Indenture", value: "Indenture" },
    { label: "Sale Agreement", value: "SaleAgreement" },
    { label: "Site Plan", value: "SitePlan" },
    { label: "Allocation Letter", value: "AllocationLetter" },
    { label: "Power of Attorney", value: "PowerOfAttorney" },
    { label: "Inspection Report", value: "InspectionReport" },
    { label: "Ghana Card", value: "GhanaCard" },
    { label: "Passport", value: "Passport" },
    { label: "Other (specify label)", value: "Other" },
];

export async function fetchJsonRaw<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    const data = await res.json().catch(() => ({ error: "Network error" }));
    if (!res.ok) {
        // `code` carries the backend's machine-readable error code (e.g.
        // AGENT_NOT_VERIFIED) so callers can branch on it rather than the message.
        throw Object.assign(new Error(data.error || "Request failed"), { code: data.code as string | undefined, status: res.status });
    }
    return data as T;
}

function hasStatus(err: unknown): err is Error & { status: number } {
    return err instanceof Error && "status" in err && typeof (err as Record<string, unknown>).status === "number";
}

async function fetchJson<T>(path: string, options?: RequestInit, retried = false): Promise<T> {
    try {
        return await fetchJsonRaw<T>(path, options);
    } catch (err: unknown) {
        if (hasStatus(err) && err.status === 401 && !retried) {
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
                void clearAuthAndRedirect();
                throw err;
            }
            return fetchJson<T>(path, options, true);
        }
        throw err;
    }
}

async function refreshAccessToken(): Promise<boolean> {
    // The refresh token rides the teps_refresh_token HttpOnly cookie
    // (credentials: "include"); no body needed. On success the backend re-sets
    // the access cookie, so there is nothing for us to persist.
    if (typeof window === "undefined") return false;

    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = fetchJsonRaw<{ user: unknown }>("/auth/refresh", { method: "POST" })
        .then(() => true)
        .catch(() => false)
        .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
        });

    return refreshPromise;
}

async function fetchMe(): Promise<unknown> {
    // `me()` is a *probe* ("is anyone logged in?"), NOT an authenticated data
    // call. A 401 is the normal "logged out" answer, so it must NEVER trigger the
    // redirect-to-login path — doing so (with a full page reload) from the login
    // page would remount the app, re-probe, and loop ~3 requests/second until the
    // rate limiter fires (429). Here we try one silent refresh (so an expired
    // access cookie + a live refresh cookie still auto-logs the user in), then
    // either return the user or rethrow — the caller decides what a 401 means.
    try {
        return await fetchJsonRaw<unknown>("/auth/me");
    } catch (err) {
        if (hasStatus(err) && err.status === 401 && await refreshAccessToken()) {
            return fetchJsonRaw<unknown>("/auth/me");
        }
        throw err;
    }
}

async function clearAuthAndRedirect(): Promise<void> {
    if (typeof window === "undefined") return;
    // Ask the backend to revoke the session + clear both cookies. Best-effort:
    // redirect regardless so a stuck logout can't trap the user.
    await api.logout().catch(() => {});
    window.location.href = "/auth/login";
}

// ─── Auth ────────────────────────────────────────────

export const api = {
    login: (body: { email: string; password: string }) =>
        fetchJsonRaw<{ user: unknown }>("/auth/login", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    register: (body: { email: string; password: string; fullName: string; phone?: string; role?: string }) =>
        // `verificationRequired` says which signup flow the backend is running:
        //   false (current) — email is switched off server-side; the account is
        //     ready and the user can sign in straight away.
        //   true — email confirmation is on: the backend answers identically
        //     whether the account was created or the address was already
        //     registered, and the user finishes from the link in their inbox.
        fetchJsonRaw<{ message: string; verificationRequired?: boolean }>("/auth/register", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    verifyEmail: (token: string) =>
        fetchJsonRaw<{ message: string }>("/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ token }),
        }),
    resendVerification: (email: string) =>
        fetchJsonRaw<{ message: string }>("/auth/resend-verification", {
            method: "POST",
            body: JSON.stringify({ email }),
        }),
    me: () => fetchMe(),
    forgotPassword: (email: string) =>
        fetchJsonRaw<{ message: string }>("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
        }),
    resetPassword: (token: string, newPassword: string) =>
        fetchJsonRaw<{ message: string }>("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ newPassword, token }),
        }),
    logout: () => fetchJsonRaw<{ message: string }>("/auth/logout", { method: "POST" }),
};

// ─── Fee Rules (Public) ──────────────────────────────

export const feeApi = {
    list: () => fetchJson<unknown[]>("/properties/fee-rules"),
};

// ─── Properties (Public) ─────────────────────────────

export const propertiesApi = {
    list: (filters?: Record<string, string>) => {
        const qs = filters ? "?" + new URLSearchParams(filters).toString() : "";
        return fetchJson<unknown[]>(`/properties${qs}`);
    },
    get: (id: number) => fetchJson<unknown>(`/properties/${id}`),
    getByRef: (code: string) => fetchJson<unknown>(`/properties/reference/${code}`),
    create: (body: Record<string, unknown>) =>
        fetchJson<unknown>("/properties", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Record<string, unknown>) =>
        fetchJson<unknown>(`/properties/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) => fetchJson<{ message: string }>(`/properties/${id}`, { method: "DELETE" }),
    addImage: (id: number, body: { url: string; altText?: string; sortOrder?: number; isPrimary?: boolean }) =>
        fetchJson<unknown>(`/properties/${id}/images`, { method: "POST", body: JSON.stringify(body) }),
    deleteImage: (id: number, imageId: number) =>
        fetchJson<{ message: string }>(`/properties/${id}/images/${imageId}`, { method: "DELETE" }),
    addDocument: (id: number, body: { documentType: string; url: string; label?: string }) =>
        fetchJson<unknown>(`/properties/${id}/documents`, { method: "POST", body: JSON.stringify(body) }),
    deleteDocument: (id: number, docId: number) =>
        fetchJson<{ message: string }>(`/properties/${id}/documents/${docId}`, { method: "DELETE" }),
    listDocuments: (id: number) =>
        fetchJson<unknown[]>(`/properties/${id}/documents`),
};

// ─── Admin ───────────────────────────────────────────

export const adminApi = {
    moderationQueue: () => fetchJson<unknown[]>("/admin/moderation-queue"),
    approveProperty: (id: number) =>
        fetchJson<unknown>(`/admin/properties/${id}/approve`, { method: "PATCH" }),
    rejectProperty: (id: number) =>
        fetchJson<unknown>(`/admin/properties/${id}/reject`, { method: "PATCH" }),
    users: (params?: Record<string, string>) => {
        const qs = params ? "?" + new URLSearchParams(params).toString() : "";
        return fetchJson<unknown[]>(`/admin/users${qs}`);
    },
    updateUserRole: (id: number, role: string) =>
        fetchJson<unknown>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    verificationQueue: () => fetchJson<unknown[]>("/admin/verifications/queue"),
    reviewVerification: (propertyId: number, body: { notes: string; certificateUrl?: string }) =>
        fetchJson<unknown>(`/admin/verifications/${propertyId}/review`, { method: "PATCH", body: JSON.stringify(body) }),
    finance: () => fetchJson<unknown>("/admin/finance"),
    payments: () => fetchJson<unknown[]>("/admin/payments"),
    refundPayment: (id: number) => fetchJson<unknown>(`/admin/payments/${id}/refund`, { method: "PATCH" }),
    feeRules: () => fetchJson<unknown[]>("/admin/fee-rules"),
    updateFeeRule: (id: number, body: Record<string, unknown>) =>
        fetchJson<unknown>(`/admin/fee-rules/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    auditLogs: () => fetchJson<unknown[]>("/admin/audit-logs"),
    agentApplications: () => fetchJson<unknown[]>("/admin/agent-applications"),
    reviewAgentApplication: (id: number, status: string, notes?: string) =>
        fetchJson<unknown>(`/admin/agent-applications/${id}`, { method: "PATCH", body: JSON.stringify({ status, notes }) }),
    unassignedCases: () => fetchJson<{ bookings: unknown[]; verifications: unknown[] }>("/admin/unassigned-cases"),
};

// ─── Owner ───────────────────────────────────────────

export const ownerApi = {
    leads: {
        list: (params: { limit?: number; page?: number; propertyId?: number; search?: string; status?: string }) => {
            const sp = new URLSearchParams();
            if (params.page !== undefined) sp.set("page", String(params.page));
            if (params.limit !== undefined) sp.set("limit", String(params.limit));
            if (params.propertyId !== undefined) sp.set("propertyId", String(params.propertyId));
            if (params.search !== undefined) sp.set("search", params.search);
            if (params.status !== undefined) sp.set("status", params.status);
            return fetchJson<{ data: unknown[]; limit: number; page: number; total: number }>(`/owner/leads?${sp.toString()}`);
        },
        summary: () => fetchJson<{ byStatus: Record<string, number>; total: number }>("/owner/leads/summary"),
    },
    properties: () => fetchJson<unknown[]>("/owner/properties"),
    analytics: () => fetchJson<unknown>("/owner/analytics"),
    verifications: {
        list: () => fetchJson<unknown[]>("/owner/verifications"),
        submit: (verificationId: number, body: { email?: string; paymentMethod?: string; phoneNumber?: string; provider?: "Hubtel" | "Paystack"; tier: "Basic" | "Premium" | "Standard" }) =>
            fetchJson<{
                checkoutUrl: string | null;
                payment: { id: number; providerStatus: string | null } | null;
                status: "awaiting_payment" | "submitted";
            }>(`/owner/verifications/${verificationId}/submit`, { method: "POST", body: JSON.stringify(body) }),
    },
    payments: () => fetchJson<unknown[]>("/owner/payments"),
    receipt: (id: number) => fetchJson<{ receiptUrl: string }>(`/owner/payments/${id}/receipt`),
    tenancies: {
        create: (body: { depositMonths: number; leaseEnd: string; leaseStart: string; monthlyRent: number; propertyId: number; tenantId: number }) =>
            fetchJson<unknown>("/owner/tenancies", { method: "POST", body: JSON.stringify(body) }),
        get: (id: number) => fetchJson<unknown>(`/owner/tenancies/${id}`),
        list: () => fetchJson<unknown[]>("/owner/tenancies"),
        rentPeriods: (id: number) => fetchJson<RentPeriod[]>(`/owner/tenancies/${id}/rent-periods`),
    },
};

// ─── Agent ───────────────────────────────────────────

export const agentApi = {
    leads: () => fetchJson<unknown[]>("/agent/leads"),
    earnings: () => fetchJson<unknown>("/agent/earnings"),
    listings: () => fetchJson<unknown[]>("/agent/listings"),
    myListings: () => fetchJson<unknown[]>("/agent/my-listings"),
    verifications: () => fetchJson<unknown[]>("/agent/verifications"),
    submitVerification: (verificationId: number) =>
        fetchJson<unknown>(`/agent/verifications/${verificationId}/submit`, { method: "POST" }),
    tickets: () => fetchJson<unknown[]>("/agent/tickets"),
};

// ─── Client ──────────────────────────────────────────

export const clientApi = {
    savedProperties: {
        add: (propertyId: number) =>
            fetchJson<unknown>("/client/saved-properties", { method: "POST", body: JSON.stringify({ propertyId }) }),
        list: () => fetchJson<unknown[]>("/client/saved-properties"),
        remove: (propertyId: number) =>
            fetchJson<{ message: string }>(`/client/saved-properties/${propertyId}`, { method: "DELETE" }),
        updateNote: (propertyId: number, note: string | null) =>
            fetchJson<unknown>(`/client/saved-properties/${propertyId}`, { method: "PATCH", body: JSON.stringify({ note }) }),
    },
    serviceRequests: () => fetchJson<unknown>("/client/service-requests"),
    payments: () => fetchJson<unknown[]>("/client/payments"),
    savedSearches: {
        create: (body: Record<string, unknown>) =>
            fetchJson<unknown>("/client/saved-searches", { method: "POST", body: JSON.stringify(body) }),
        delete: (id: number) => fetchJson<{ message: string }>(`/client/saved-searches/${id}`, { method: "DELETE" }),
        list: () => fetchJson<unknown[]>("/client/saved-searches"),
        update: (id: number, body: { alertEnabled?: boolean; name?: string; queryJson?: Record<string, string> }) =>
            fetchJson<unknown>(`/client/saved-searches/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
        updateAlert: (id: number, alertEnabled: boolean) =>
            fetchJson<unknown>(`/client/saved-searches/${id}`, { method: "PATCH", body: JSON.stringify({ alertEnabled }) }),
    },
    tenancies: {
        list: () => fetchJson<unknown[]>("/client/tenancies"),
        rentPeriods: (id: number) => fetchJson<RentPeriod[]>(`/client/tenancies/${id}/rent-periods`),
    },
};

// ─── Upload ──────────────────────────────────────────

// Multipart uploads can't go through fetchJson (it forces a JSON Content-Type,
// and the browser must set the multipart boundary itself), so this mirrors its
// behaviour: throw on a non-2xx response, and retry once after a silent refresh
// on 401.
async function uploadFile(path: string, file: File, retried = false): Promise<unknown> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}${path}`, { body: form, credentials: "include", method: "POST" });
    if (res.status === 401 && !retried && await refreshAccessToken()) {
        return uploadFile(path, file, true);
    }
    const data = await res.json().catch(() => ({ error: "Upload failed" }));
    if (!res.ok) {
        throw Object.assign(new Error(data.error || "Upload failed"), { status: res.status });
    }
    return data;
}

export const uploadApi = {
    image: (file: File) => uploadFile("/upload/image", file),
    document: (file: File) => uploadFile("/upload/document", file),
    presign: (filename: string, folder: string, contentType?: string) => {
        const qs = new URLSearchParams({ filename, folder });
        if (contentType) qs.append("contentType", contentType);
        return fetchJson<{ url: string; publicUrl: string; key: string }>(`/upload/presign?${qs.toString()}`);
    },
};

// ─── Payments ────────────────────────────────────────

export const paymentApi = {
    feePreview: (body: Record<string, unknown>) =>
        fetchJson<{ amount: number; currency: string }>("/payments/fee-preview", { method: "POST", body: JSON.stringify(body) }),
    initiate: (body: Record<string, unknown>) =>
        fetchJson<{ payment: unknown; checkoutUrl?: string }>("/payments/initiate", { method: "POST", body: JSON.stringify(body) }),
    history: () => fetchJson<unknown[]>("/payments/history"),
    get: (id: number) => fetchJson<unknown>(`/payments/${id}`),
    verify: (id: number) => fetchJson<unknown>(`/payments/verify/${id}`, { method: "POST" }),
    releaseEscrow: (id: number) => fetchJson<unknown>(`/payments/${id}/escrow/release`, { method: "PATCH" }),
};

// ─── Commissions ─────────────────────────────────────

export const commissionApi = {
    list: (agentId?: number) => {
        const qs = agentId ? `?agentId=${agentId}` : "";
        return fetchJson<unknown[]>(`/commissions${qs}`);
    },
    calculate: (body: Record<string, unknown>) =>
        fetchJson<unknown>("/commissions/calculate", { method: "POST", body: JSON.stringify(body) }),
    approve: (id: number) => fetchJson<unknown>(`/commissions/${id}/approve`, { method: "PATCH" }),
    dispute: (id: number) => fetchJson<unknown>(`/commissions/${id}/dispute`, { method: "PATCH" }),
};

// ─── Payouts ─────────────────────────────────────────

export const payoutApi = {
    list: (agentId?: number) => {
        const qs = agentId ? `?agentId=${agentId}` : "";
        return fetchJson<unknown[]>(`/payouts${qs}`);
    },
    request: (body: { commissionIds: number[]; momoNumber: string; momoNetwork: string }) =>
        fetchJson<unknown>("/payouts/request", { method: "POST", body: JSON.stringify(body) }),
    review: (id: number, body: { status: string; notes?: string }) =>
        fetchJson<unknown>(`/payouts/${id}/review`, { method: "PATCH", body: JSON.stringify(body) }),
    process: (id: number) => fetchJson<unknown>(`/payouts/${id}/process`, { method: "PATCH" }),
};

// ─── Profile ─────────────────────────────────────────

export const profileApi = {
    agentApplication: (body: Record<string, unknown>) =>
        fetchJson<unknown>("/profile/agent-application", { method: "POST", body: JSON.stringify(body) }),
    agentProfile: (agentId?: number) => {
        const path = agentId ? `/profile/agent/${agentId}` : "/profile/agent";
        return fetchJson<unknown>(path);
    },
    getAgentApplication: () => fetchJson<unknown>("/profile/agent-application"),
    me: () => fetchJson<unknown>("/profile/me"),
    partnershipAgreementTemplate: () => fetchJson<{ fileUrl: string | null }>("/profile/partnership-agreement-template"),
    update: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/me", { method: "PUT", body: JSON.stringify(body) }),
    updateAgentProfile: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/agent", { method: "PUT", body: JSON.stringify(body) }),
    uploadAvatar: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/avatar", { method: "POST", body: JSON.stringify(body) }),
    uploadGhanaCard: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/ghana-card", { method: "POST", body: JSON.stringify(body) }),
    uploadPartnershipAgreement: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/partnership-agreement", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Geo ─────────────────────────────────────────────

export const geoApi = {
  regions: (countryCode = "GH") => {
    const qs = countryCode
      ? `?countryCode=${encodeURIComponent(countryCode)}`
      : "";
    return fetchJson<GeoRegion[]>(`/geo/regions${qs}`);
  },
  region: (regionId: number) =>
    fetchJson<GeoRegionDetail>(`/geo/regions/${regionId}`),
  constituencies: (regionId: number) =>
    fetchJson<GeoConstituency[]>(`/geo/regions/${regionId}/constituencies`),
  constituency: (constituencyId: number) =>
    fetchJson<GeoConstituencyDetail>(`/geo/constituencies/${constituencyId}`),
  allConstituencies: () => fetchJson<GeoConstituency[]>(`/geo/constituencies`),
  // Live-only, paginated properties within a constituency. Semantic alias of
  // propertiesApi.list({ constituencyId }) — exposed so callers can address it
  // by constituency without re-deriving the filter.
  constituencyProperties: (constituencyId: number, filters?: Record<string, string>) => {
    const qs = filters ? "?" + new URLSearchParams(filters).toString() : "";
    return fetchJson<{ data: unknown[]; pagination: { limit: number; page: number; totalPages: number; total: number } }>(`/geo/constituencies/${constituencyId}/properties${qs}`);
  },
  // GeoJSON boundaries served from /api/geojson (sourced from the geo DB, not
  // the static public/json/gh.json the map uses today).
  ghanaGeoJson: () => fetchJson<GeoFeatureCollection>(`/geojson/ghana`),
  regionGeoJson: (regionId: number) =>
    fetchJson<GeoFeatureCollection>(`/geojson/regions/${regionId}`),
};

// ─── Verifications ───────────────────────────────────

export const verificationApi = {
    get: (propertyId: number) => fetchJson<unknown>(`/properties/${propertyId}/verification`),
    create: (propertyId: number) => fetchJson<unknown>(`/properties/${propertyId}/verification`, { method: "POST" }),
    updateCheck: (propertyId: number, checkId: number, body: { status?: string; evidenceUrl?: string; notes?: string; gpsLatitude?: string; gpsLongitude?: string }) =>
        fetchJson<unknown>(`/properties/${propertyId}/verification/checks/${checkId}`, { method: "PATCH", body: JSON.stringify(body) }),
    submitEvidence: (verificationId: number, checkId: number, body: { evidenceUrl: string; notes?: string }) =>
        fetchJson<unknown>(`/owner/verifications/${verificationId}/checks/${checkId}/evidence`, { method: "POST", body: JSON.stringify(body) }),
};

// ─── Messages ────────────────────────────────────────

export type Message = {
    body: string;
    createdAt: string;
    direction: "inbound" | "outbound";
    fromMe: boolean;
    id: number;
    provider: string;
    recipientId: number | null;
    senderId: number | null;
    status: string;
    threadId: number;
};

export type Thread = {
    contactName: string;
    createdAt: string;
    id: number;
    isActive: boolean;
    lastMessage: { body: string | null; createdAt: string; direction: "inbound" | "outbound"; id: number; senderId: number | null; threadId: number } | null;
    lastMessageAt: string | null;
    participant1Id: number;
    participant1Name: string | null;
    participant2Id: number;
    participant2Name: string | null;
    propertyId: number | null;
    propertyTitle: string | null;
    threadType: string;
    unread: number;
    unreadCountP1: number;
    unreadCountP2: number;
    updatedAt: string;
};

export const messageApi = {
    assistant: () =>
        fetchJson<{ threadId: number }>("/messages/assistant", { method: "POST" }),
    createThread: (body: { participant2Id: number; propertyId?: number; threadType?: string }) =>
        fetchJson<Thread>("/messages/threads", { method: "POST", body: JSON.stringify(body) }),
    send: (threadId: number, body: string) =>
        fetchJson<Message>(`/messages/threads/${threadId}`, { method: "POST", body: JSON.stringify({ body }) }),
    streamPing: () => fetchJson<{ ok: boolean }>("/messages/stream/ping"),
    threadMessages: (threadId: number) => fetchJson<Message[]>(`/messages/threads/${threadId}`),
    threads: (page?: number, limit?: number) => {
        const params = new URLSearchParams();
        if (page !== undefined) params.set("page", String(page));
        if (limit !== undefined) params.set("limit", String(limit));
        const qs = params.toString();
        return fetchJson<{ threads: Thread[]; total: number }>(`/messages/threads${qs ? "?" + qs : ""}`);
    },
};

// ─── Bookings ────────────────────────────────────────

export type BookingSlot = { id: string; day: string; date: string; times: string[] };

export const bookingApi = {
    slots: (propertyId: number) => fetchJson<BookingSlot[]>(`/bookings/slots/${propertyId}`),
    create: (body: Record<string, unknown>) => fetchJson<unknown>("/bookings", { method: "POST", body: JSON.stringify(body) }),
    myBookings: () => fetchJson<unknown[]>("/bookings/my"),
    get: (id: number) => fetchJson<unknown>(`/bookings/${id}`),
    forProperty: (propertyId: number) => fetchJson<unknown[]>(`/bookings/property/${propertyId}`),
    updateStatus: (id: number, status: string) => fetchJson<unknown>(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ─── Availability ────────────────────────────────────

export const availabilityApi = {
    get: (propertyId: number) => fetchJson<unknown>(`/properties/${propertyId}/availability`),
    put: (propertyId: number, body: Record<string, unknown>) =>
        fetchJson<unknown>(`/properties/${propertyId}/availability`, { method: "PUT", body: JSON.stringify(body) }),
    addBlackout: (propertyId: number, body: { endAt: string; reason?: string; startAt: string }) =>
        fetchJson<unknown>(`/properties/${propertyId}/availability/blackouts`, { method: "POST", body: JSON.stringify(body) }),
    removeBlackout: (propertyId: number, blackoutId: number) =>
        fetchJson<{ message: string }>(`/properties/${propertyId}/availability/blackouts/${blackoutId}`, { method: "DELETE" }),
};

// ─── Ratings ─────────────────────────────────────────

export const ratingApi = {
    agentRatings: (agentId: number) => fetchJson<{ ratings: unknown[]; average: number }>(`/ratings/agent/${agentId}`),
    create: (body: Record<string, unknown>) => fetchJson<unknown>("/ratings", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Reports ─────────────────────────────────────────

export const reportApi = {
    create: (body: Record<string, unknown>) => fetchJson<unknown>("/reports", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Audit Logs (Admin) ──────────────────────────────

export const auditLogApi = {
    list: () => fetchJson<unknown[]>("/admin/audit-logs"),
};

// ─── CRM ─────────────────────────────────────────────

export const crmApi = {
    stats: () => fetchJson<{ contacts: number; leads: number; activities: number; newLeads: number; closedWon: number }>("/crm/stats"),
    contacts: {
        list: (params?: Record<string, string>) => {
            const qs = params ? "?" + new URLSearchParams(params).toString() : "";
            return fetchJson<unknown[]>(`/crm/contacts${qs}`);
        },
        create: (body: Record<string, unknown>) => fetchJson<unknown>("/crm/contacts", { method: "POST", body: JSON.stringify(body) }),
        get: (id: number) => fetchJson<unknown>(`/crm/contacts/${id}`),
        update: (id: number, body: Record<string, unknown>) => fetchJson<unknown>(`/crm/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
        delete: (id: number) => fetchJson<{ message: string }>(`/crm/contacts/${id}`, { method: "DELETE" }),
    },
    leads: {
        list: (params?: Record<string, string>) => {
            const qs = params ? "?" + new URLSearchParams(params).toString() : "";
            return fetchJson<unknown[]>(`/crm/leads${qs}`);
        },
        create: (body: Record<string, unknown>) => fetchJson<unknown>("/crm/leads", { method: "POST", body: JSON.stringify(body) }),
        get: (id: number) => fetchJson<unknown>(`/crm/leads/${id}`),
        update: (id: number, body: Record<string, unknown>) => fetchJson<unknown>(`/crm/leads/${id}`, { method: "PUT", body: JSON.stringify(body) }),
        delete: (id: number) => fetchJson<{ message: string }>(`/crm/leads/${id}`, { method: "DELETE" }),
    },
    activities: {
        list: (params?: Record<string, string>) => {
            const qs = params ? "?" + new URLSearchParams(params).toString() : "";
            return fetchJson<unknown[]>(`/crm/activities${qs}`);
        },
        create: (body: Record<string, unknown>) => fetchJson<unknown>("/crm/activities", { method: "POST", body: JSON.stringify(body) }),
        get: (id: number) => fetchJson<unknown>(`/crm/activities/${id}`),
        update: (id: number, body: Record<string, unknown>) => fetchJson<unknown>(`/crm/activities/${id}`, { method: "PUT", body: JSON.stringify(body) }),
        delete: (id: number) => fetchJson<{ message: string }>(`/crm/activities/${id}`, { method: "DELETE" }),
    },
};
