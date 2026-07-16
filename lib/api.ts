import type { GeoRegion, GeoConstituency } from "./coverage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001/api";

export interface ApiError {
    error: string;
    status: number;
}

// Auth tokens live in HttpOnly cookies set by the backend; `credentials: "include"`
// attaches them automatically. Nothing auth-related is stored in JS-readable
// storage, so there is no Bearer header to build and no localStorage to read.
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function fetchJsonRaw<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    const data = await res.json().catch(() => ({ error: "Network error" }));
    if (!res.ok) {
        throw Object.assign(new Error(data.error || "Request failed"), { status: res.status });
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
        fetchJsonRaw<{ id: number; email: string; fullName: string; role: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    me: () => fetchMe(),
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
    addDocument: (id: number, body: { documentType: string; url: string }) =>
        fetchJson<unknown>(`/properties/${id}/documents`, { method: "POST", body: JSON.stringify(body) }),
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
    properties: () => fetchJson<unknown[]>("/owner/properties"),
    analytics: () => fetchJson<unknown>("/owner/analytics"),
    verifications: () => fetchJson<unknown[]>("/owner/verifications"),
    payments: () => fetchJson<unknown[]>("/owner/payments"),
};

// ─── Agent ───────────────────────────────────────────

export const agentApi = {
    leads: () => fetchJson<unknown[]>("/agent/leads"),
    earnings: () => fetchJson<unknown>("/agent/earnings"),
    listings: () => fetchJson<unknown[]>("/agent/listings"),
    // Listings the agent legally owns (created via POST /properties, which
    // forces ownerId := the caller) — the set the agent may CRUD through the
    // property routes. Distinct from `listings` (bookings/commissions-managed).
    myListings: () => fetchJson<unknown[]>("/agent/my-listings"),
    verifications: () => fetchJson<unknown[]>("/agent/verifications"),
    tickets: () => fetchJson<unknown[]>("/agent/tickets"),
};

// ─── Client ──────────────────────────────────────────

export const clientApi = {
    savedProperties: () => fetchJson<unknown[]>("/client/saved-properties"),
    saveProperty: (propertyId: number) =>
        fetchJson<unknown>("/client/saved-properties", { method: "POST", body: JSON.stringify({ propertyId }) }),
    removeSavedProperty: (propertyId: number) =>
        fetchJson<{ message: string }>(`/client/saved-properties/${propertyId}`, { method: "DELETE" }),
    // Persist the private "Vault" note on a saved property (migration 0022).
    updateNote: (propertyId: number, note: string | null) =>
        fetchJson<unknown>(`/client/saved-properties/${propertyId}`, { method: "PATCH", body: JSON.stringify({ note }) }),
    serviceRequests: () => fetchJson<unknown>("/client/service-requests"),
    payments: () => fetchJson<unknown[]>("/client/payments"),
};

// ─── Saved Searches (Client) ────────────────────────

export const savedSearchApi = {
    list: () => fetchJson<unknown[]>("/client/saved-searches"),
    create: (body: { name: string; queryJson: Record<string, string>; alertEnabled?: boolean }) =>
        fetchJson<unknown>("/client/saved-searches", { method: "POST", body: JSON.stringify(body) }),
    remove: (id: number) => fetchJson<{ message: string }>(`/client/saved-searches/${id}`, { method: "DELETE" }),
};

// ─── Upload ──────────────────────────────────────────

export const uploadApi = {
    image: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        return fetch(`${API_BASE}/upload/image`, {
            method: "POST",
            credentials: "include",
            body: form,
        }).then((r) => r.json());
    },
    document: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        return fetch(`${API_BASE}/upload/document`, {
            method: "POST",
            credentials: "include",
            body: form,
        }).then((r) => r.json());
    },
    presign: (filename: string, folder: string, contentType?: string) => {
        const qs = new URLSearchParams({ filename, folder });
        // Always send a concrete contentType so the backend signs a known
        // value (never an empty/absent one). Pair this with uploadFile() so
        // the PUT header matches the signed value exactly.
        qs.append("contentType", contentType || "application/octet-stream");
        return fetchJson<{ key: string; previewUrl: string; publicUrl: string; url: string }>(`/upload/presign?${qs.toString()}`);
    },
    // Single source of truth for direct-to-Spaces uploads: normalize the
    // Content-Type once and use the same string for both the presigned
    // signature (server-side) and the PUT request header (browser-side).
    // Browsers return "" for File.type when they can't infer a MIME; if presign
    // and PUT disagreed on that value the upload 403s with SignatureDoesNotMatch.
    // Prefer this over calling presign() + fetch() by hand.
    uploadFile: async (
        file: File,
        folder: string,
    ): Promise<{ key: string; previewUrl: string; publicUrl: string; url: string }> => {
        const contentType = file.type || "application/octet-stream";
        const presign = await uploadApi.presign(file.name, folder, contentType);
        const res = await fetch(presign.url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": contentType },
        });
        if (!res.ok) {
            throw Object.assign(new Error(`Upload failed: ${res.status} ${res.statusText}`), { status: res.status });
        }
        // Only public-category folders (avatars, property images) get flipped
        // public-read. Sensitive docs stay private and are later read through
        // the GET /api/files/* proxy — so we deliberately do NOT finalize them,
        // and the backend's /finalize folder-allowlist would reject them anyway.
        if (folder === "avatars" || folder === "images") {
            await fetchJson("/upload/finalize", {
                method: "POST",
                body: JSON.stringify({ key: presign.key }),
            });
        }
        return presign;
    },
};

// Rewrite a Spaces public URL into the authenticated backend proxy URL. Sensitive
// docs (Ghana cards, partnership agreements, verification evidence) are private on
// the Space; the proxy authorizes owner/assigned-agent/admin and streams the bytes.
// The Spaces URL is `https://<region>.digitaloceanspaces.com/<bucket>/<key...>`,
// so the key is everything after the bucket segment of the pathname.
export function fileProxyUrl(spacesUrl: string): string {
    if (!spacesUrl) return spacesUrl;
    try {
        const u = new URL(spacesUrl);
        const segments = u.pathname.split("/").filter(Boolean);
        if (segments.length < 2) return spacesUrl;
        segments.shift(); // drop the bucket segment
        const key = segments.join("/");
        return `${API_BASE}/files/${encodeURI(key)}`;
    } catch {
        return spacesUrl; // not a valid URL — return as-is
    }
}

// ─── Payments ────────────────────────────────────────

export const paymentApi = {
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
    me: () => fetchJson<unknown>("/profile/me"),
    update: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/me", { method: "PUT", body: JSON.stringify(body) }),
    uploadAvatar: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/avatar", { method: "POST", body: JSON.stringify(body) }),
    uploadGhanaCard: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/ghana-card", { method: "POST", body: JSON.stringify(body) }),
    uploadPartnershipAgreement: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/partnership-agreement", { method: "POST", body: JSON.stringify(body) }),
    // Supporting agent docs (police clearance, proof of address, certificate,
    // other) — backed by the generalized agent_documents table. GhanaCard and
    // PartnershipAgreement have their own dedicated endpoints above.
    uploadAgentDocument: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/agent-documents", { method: "POST", body: JSON.stringify(body) }),
    agentProfile: (agentId?: number) => {
        const path = agentId ? `/profile/agent/${agentId}` : "/profile/agent";
        return fetchJson<unknown>(path);
    },
    updateAgentProfile: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/agent", { method: "PUT", body: JSON.stringify(body) }),
    // Become-an-agent application: a logged-in client/owner applies; admin
    // approval promotes them. myApplication returns null when none submitted.
    submitAgentApplication: (body: Record<string, unknown>) =>
        fetchJson<unknown>("/profile/agent-application", { method: "POST", body: JSON.stringify(body) }),
    myAgentApplication: () => fetchJson<unknown>("/profile/agent-application"),
};

// ─── Geo ─────────────────────────────────────────────

export const geoApi = {
  regions: (countryCode = "GH") => {
    const qs = countryCode
      ? `?countryCode=${encodeURIComponent(countryCode)}`
      : "";
    return fetchJson<GeoRegion[]>(`/geo/regions${qs}`);
  },
  constituencies: (regionId: number) =>
    fetchJson<GeoConstituency[]>(`/geo/regions/${regionId}/constituencies`),
  allConstituencies: () => fetchJson<GeoConstituency[]>(`/geo/constituencies`),
};

// ─── Verifications ───────────────────────────────────

export const verificationApi = {
    get: (propertyId: number) => fetchJson<unknown>(`/properties/${propertyId}/verification`),
    create: (propertyId: number) => fetchJson<unknown>(`/properties/${propertyId}/verification`, { method: "POST" }),
    updateCheck: (propertyId: number, checkId: number, body: { status?: string; evidenceUrl?: string; notes?: string }) =>
        fetchJson<unknown>(`/properties/${propertyId}/verification/checks/${checkId}`, { method: "PATCH", body: JSON.stringify(body) }),
    submitEvidence: (verificationId: number, checkId: number, body: { evidenceUrl: string; notes?: string }) =>
        fetchJson<unknown>(`/owner/verifications/${verificationId}/checks/${checkId}/evidence`, { method: "POST", body: JSON.stringify(body) }),
    // Assigned-agent site-visit tick: mark a check Passed/Failed with evidence
    // + notes. Authorized server-side to the assigned agent (admin bypasses).
    // gpsLatitude/gpsLongitude are captured by the agent's device for the
    // GPSLocation check (spec §2.3) and persisted on the check row.
    agentUpdateCheck: (verificationId: number, checkId: number, body: { evidenceUrl?: string; notes?: string; status: "Failed" | "Passed" | "Pending"; gpsLatitude?: string; gpsLongitude?: string }) =>
        fetchJson<unknown>(`/agent/verifications/${verificationId}/checks/${checkId}`, { method: "PATCH", body: JSON.stringify(body) }),
    // Schedule a field site visit — flips verification status to
    // SiteVisitScheduled. Admin or the agent assigned to the verification.
    scheduleSiteVisit: (propertyId: number, body: { notes?: string }) =>
        fetchJson<unknown>(`/properties/${propertyId}/verification/site-visit`, { method: "POST", body: JSON.stringify(body) }),
    // Agent's final "I'm done — hand to admin" action (spec gap #10). Server
    // rejects if any check is still Pending, then advances the verification to
    // UnderReview and notifies the admins. Authorized to the assigned agent.
    submitReport: (verificationId: number) =>
        fetchJson<unknown>(`/agent/verifications/${verificationId}/submit`, { method: "POST" }),
    // Attach/replace the verification certificate URL. Admin-only.
    setCertificate: (propertyId: number, certificateUrl: string) =>
        fetchJson<unknown>(`/properties/${propertyId}/verification/certificate`, { method: "POST", body: JSON.stringify({ certificateUrl }) }),
};

// ─── Messages ────────────────────────────────────────

export const messageApi = {
    threads: () => fetchJson<unknown[]>("/messages/threads"),
    threadMessages: (threadId: number) => fetchJson<unknown[]>(`/messages/threads/${threadId}`),
    send: (threadId: number, body: string) =>
        fetchJson<unknown>(`/messages/threads/${threadId}`, { method: "POST", body: JSON.stringify({ body }) }),
    createThread: (body: { participant2Id: number; propertyId?: number; threadType?: string }) =>
        fetchJson<unknown>("/messages/threads", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Bookings ────────────────────────────────────────

export const bookingApi = {
    slots: (propertyId: number) => fetchJson<unknown[]>(`/bookings/slots/${propertyId}`),
    create: (body: Record<string, unknown>) => fetchJson<unknown>("/bookings", { method: "POST", body: JSON.stringify(body) }),
    myBookings: () => fetchJson<unknown[]>("/bookings/my"),
    get: (id: number) => fetchJson<unknown>(`/bookings/${id}`),
    updateStatus: (id: number, status: string) => fetchJson<unknown>(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
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
