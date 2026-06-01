const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001/api";

export interface ApiError {
    error: string;
    status: number;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getAuthHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("teps_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJsonRaw<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
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
            const newToken = await refreshAccessToken();
            if (!newToken) {
                clearAuthAndRedirect();
                throw err;
            }
            return fetchJson<T>(path, options, true);
        }
        throw err;
    }
}

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("teps_refresh_token") : null;
    if (!refreshToken) return null;

    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = fetchJsonRaw<{ accessToken: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
    })
        .then((result) => {
            localStorage.setItem("teps_access_token", result.accessToken);
            document.cookie = `teps_auth=${result.accessToken}; path=/; max-age=604800; SameSite=Lax`;
            return result.accessToken;
        })
        .catch(() => {
            return null;
        })
        .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
        });

    return refreshPromise;
}

function clearAuthAndRedirect() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("teps_access_token");
    localStorage.removeItem("teps_refresh_token");
    document.cookie = "teps_auth=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/auth/login";
}

// ─── Auth ────────────────────────────────────────────

export const api = {
    login: (body: { email: string; password: string }) =>
        fetchJsonRaw<{ user: unknown; accessToken: string; refreshToken: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    register: (body: { email: string; password: string; fullName: string; phone?: string; role?: string }) =>
        fetchJsonRaw<{ id: number; email: string; fullName: string; role: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    me: () => fetchJson<unknown>("/auth/me"),
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
    verifications: () => fetchJson<unknown[]>("/agent/verifications"),
    tickets: () => fetchJson<unknown[]>("/agent/tickets"),
};

// ─── Client ──────────────────────────────────────────

export const clientApi = {
    savedProperties: () => fetchJson<unknown[]>("/client/saved-properties"),
    serviceRequests: () => fetchJson<unknown>("/client/service-requests"),
    payments: () => fetchJson<unknown[]>("/client/payments"),
};

// ─── Upload ──────────────────────────────────────────

export const uploadApi = {
    image: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        return fetch(`${API_BASE}/upload/image`, {
            method: "POST",
            credentials: "include",
            headers: getAuthHeader(),
            body: form,
        }).then((r) => r.json());
    },
    document: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        return fetch(`${API_BASE}/upload/document`, {
            method: "POST",
            credentials: "include",
            headers: getAuthHeader(),
            body: form,
        }).then((r) => r.json());
    },
    presign: (filename: string, folder: string, contentType?: string) => {
        const qs = new URLSearchParams({ filename, folder });
        if (contentType) qs.append("contentType", contentType);
        return fetchJson<{ url: string; publicUrl: string; key: string }>(`/upload/presign?${qs.toString()}`);
    },
};

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
    agentProfile: (agentId?: number) => {
        const path = agentId ? `/profile/agent/${agentId}` : "/profile/agent";
        return fetchJson<unknown>(path);
    },
    updateAgentProfile: (body: Record<string, unknown>) => fetchJson<unknown>("/profile/agent", { method: "PUT", body: JSON.stringify(body) }),
};

// ─── Verifications ───────────────────────────────────

export const verificationApi = {
    get: (propertyId: number) => fetchJson<unknown>(`/properties/${propertyId}/verification`),
    create: (propertyId: number) => fetchJson<unknown>(`/properties/${propertyId}/verification`, { method: "POST" }),
    updateCheck: (propertyId: number, checkId: number, body: { status?: string; evidenceUrl?: string; notes?: string }) =>
        fetchJson<unknown>(`/properties/${propertyId}/verification/checks/${checkId}`, { method: "PATCH", body: JSON.stringify(body) }),
    submitEvidence: (verificationId: number, checkId: number, body: { evidenceUrl: string; notes?: string }) =>
        fetchJson<unknown>(`/owner/verifications/${verificationId}/checks/${checkId}/evidence`, { method: "POST", body: JSON.stringify(body) }),
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
