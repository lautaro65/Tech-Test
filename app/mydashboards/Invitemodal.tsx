"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

type ShareRole = "VIEWER" | "EDITOR";

interface Invite {
  id: string;
  token: string;
  role: ShareRole;
  email: string | null;
  acceptedAt: string | null;
  acceptedBy?: { name: string | null; email: string | null } | null;
  acceptedUsers?: {
    name: string | null;
    email: string | null;
    acceptedAt: string;
  }[];
  expiresAt: string | null;
  createdAt: string;
  maxUses: number | null;
  useCount: number;
}

interface InviteModalProps {
  dashboardId: string;
  dashboardName: string;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<
  ShareRole,
  { label: string; description: string; classes: string }
> = {
  VIEWER: {
    label: "Visor",
    description: "Solo puede ver el canvas",
    classes: "bg-sky-50 text-sky-700 border-sky-200",
  },
  EDITOR: {
    label: "Editor",
    description: "Puede editar el canvas",
    classes: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

const EXPIRY_OPTIONS = [
  { value: "none", label: "Sin vencimiento" },
  { value: "1", label: "1 día" },
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
];

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InviteModal({
  dashboardId,
  dashboardName,
  onClose,
}: InviteModalProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Crear nueva invitación
  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [email, setEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState("none");
  const [maxUses, setMaxUses] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Link generado
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revocar
  const [revoking, setRevoking] = useState<string | null>(null);
  // Panel de usuarios que aceptaron
  const [expandedUsers, setExpandedUsers] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invite?dashboardId=${dashboardId}`);
      const data = await res.json();
      setInvites(data.invites || []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleCreate = async () => {
    setCreateError("");
    setNewLink(null);
    setCreating(true);
    try {
      const parsedMaxUses =
        maxUses === "" || maxUses === "0" ? null : Number(maxUses);
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId,
          role,
          email: email.trim() || null,
          expiryDays: expiryDays !== "none" ? Number(expiryDays) : null,
          maxUses: parsedMaxUses,
        }),
      });
      const data = await res.json();
      if (data.token) {
        setNewLink(
          `${window.location.origin}/mydashboards?dashboardId=${dashboardId}&invite=${data.token}`,
        );
        setEmail("");
        fetchInvites();
      } else {
        setCreateError(data.error || "No se pudo crear la invitación");
      }
    } catch {
      setCreateError("Error al crear la invitación");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setRevoking(inviteId);
    try {
      await fetch(`/api/invite?id=${inviteId}`, { method: "DELETE" });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (newLink) setNewLink(null);
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle
                    cx="9"
                    cy="7"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="17"
                    cy="7"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M1 21c0-3.31 3.58-6 8-6s8 2.69 8 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M19 15c2 .5 4 2 4 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Invitaciones
              </h3>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[280px]">
              {dashboardName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1">
          {/* ── Crear nueva invitación ── */}
          <div className="px-6 py-5 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Nueva invitación
            </p>

            {/* Rol */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-foreground/80 mb-2">
                Rol
              </label>
              <div className="flex gap-2">
                {(Object.keys(ROLE_CONFIG) as ShareRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                      role === r
                        ? "border-foreground bg-background"
                        : "border-border hover:border-ring"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${ROLE_CONFIG[r].classes}`}
                    >
                      {ROLE_CONFIG[r].label}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {ROLE_CONFIG[r].description}
                    </span>
                    {role === r && (
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-foreground block" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Vencimiento + Máx. usos */}
            <div className="flex gap-3 mb-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Vencimiento
                </label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sin vencimiento" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Máx. usos
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 = Ilimitado"
                  value={maxUses}
                  onChange={(e) =>
                    setMaxUses(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="w-full text-sm text-foreground/90 placeholder:text-muted-foreground/60 bg-card border border-border focus:border-ring rounded-xl px-3 py-2 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                Email{" "}
                <span className="text-muted-foreground/60 font-normal">
                  (opcional)
                </span>
              </label>
              <input
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm text-foreground/90 placeholder:text-muted-foreground/60 bg-card border border-border focus:border-ring rounded-xl px-3 py-2 outline-none transition-colors"
              />
            </div>

            {createError && (
              <p className="text-xs text-red-500 mb-3">{createError}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-foreground text-primary-foreground px-4 py-2 rounded-xl hover:bg-foreground/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {creating ? "Generando..." : "Generar link"}
            </button>

            {/* Link generado */}
            {newLink && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-accent/50 p-3">
                <p className="text-[11px] font-semibold text-accent-foreground mb-2 flex items-center gap-1.5">
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Link generado
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newLink}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 bg-card border border-primary/20 rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 outline-none truncate"
                  />
                  <button
                    onClick={() => handleCopy(newLink)}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      copied
                        ? "bg-emerald-500 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Invitaciones existentes ── */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Invitaciones activas
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground/60">
                <span className="w-4 h-4 border-2 border-border border-t-muted-foreground rounded-full animate-spin" />
                <span className="text-xs">Cargando...</span>
              </div>
            ) : invites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground/60">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Sin invitaciones todavía
                </p>
                <p className="text-[11px] text-muted-foreground/60">
                  Generá un link arriba para compartir este dashboard
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {invites.map((invite) => {
                  const expired = isExpired(invite.expiresAt);
                  const accepted = !!invite.acceptedAt;
                  const roleConf =
                    ROLE_CONFIG[invite.role] ?? ROLE_CONFIG.VIEWER;

                  return (
                    <div
                      key={invite.id}
                      className={`rounded-xl border overflow-hidden transition-colors ${
                        accepted ? "border-emerald-200" : "border-border"
                      }`}
                    >
                      <div
                        className={`flex items-start gap-3 p-3 ${
                          expired
                            ? "bg-muted opacity-60"
                            : accepted
                              ? "bg-emerald-50/50"
                              : "bg-card"
                        }`}
                      >
                        {/* Avatar / estado */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                            accepted
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {accepted && invite.acceptedBy?.name ? (
                            invite.acceptedBy.name.charAt(0).toUpperCase()
                          ) : (
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="12"
                                cy="7"
                                r="4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${roleConf.classes}`}
                            >
                              {roleConf.label}
                            </span>
                            {expired ? (
                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                Vencido
                              </span>
                            ) : accepted ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                Aceptado
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                                Pendiente
                              </span>
                            )}
                            {invite.maxUses !== null && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                  invite.useCount >= invite.maxUses
                                    ? "bg-red-50 text-red-500 border border-red-200"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {invite.useCount}/{invite.maxUses} usos
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-foreground/70 mt-1 truncate">
                            {accepted && invite.acceptedBy
                              ? invite.acceptedBy.name ||
                                invite.acceptedBy.email ||
                                "Usuario desconocido"
                              : invite.email || (
                                  <span className="text-muted-foreground/60 italic">
                                    Link abierto (sin email)
                                  </span>
                                )}
                          </p>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground/60">
                              Creado {formatDate(invite.createdAt)}
                            </span>
                            {invite.expiresAt && (
                              <span
                                className={`text-[10px] ${expired ? "text-red-400" : "text-muted-foreground/60"}`}
                              >
                                Vence {formatDate(invite.expiresAt)}
                              </span>
                            )}
                            {accepted && invite.acceptedAt && (
                              <span className="text-[10px] text-emerald-500">
                                Aceptado {formatDate(invite.acceptedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 shrink-0">
                          {invite.useCount > 0 && (
                            <button
                              onClick={() =>
                                setExpandedUsers(
                                  expandedUsers === invite.id
                                    ? null
                                    : invite.id,
                                )
                              }
                              title="Ver quiénes aceptaron"
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                                expandedUsers === invite.id
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground/80"
                              }`}
                            >
                              <svg
                                width="13"
                                height="13"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  cx="9"
                                  cy="7"
                                  r="3"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                />
                                <circle
                                  cx="17"
                                  cy="7"
                                  r="3"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                />
                                <path
                                  d="M1 21c0-3.31 3.58-6 8-6s8 2.69 8 6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M19 15c2 .5 4 2 4 6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          )}

                          {!expired &&
                            !(
                              invite.maxUses !== null &&
                              invite.useCount >= invite.maxUses
                            ) && (
                              <button
                                onClick={() =>
                                  handleCopy(
                                    `${window.location.origin}/mydashboards?dashboardId=${dashboardId}&invite=${invite.token}`,
                                  )
                                }
                                title="Copiar link"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <rect
                                    x="9"
                                    y="9"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  />
                                  <path
                                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                            )}

                          <button
                            onClick={() => handleRevoke(invite.id)}
                            disabled={revoking === invite.id}
                            title="Revocar invitación"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                          >
                            {revoking === invite.id ? (
                              <span className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                            ) : (
                              <svg
                                width="12"
                                height="12"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  d="M18 6 6 18M6 6l12 12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Panel de usuarios que aceptaron */}
                      {expandedUsers === invite.id && invite.useCount > 0 && (
                        <div className="border-t border-emerald-100 bg-emerald-50/30 px-3 py-2.5 flex flex-col gap-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                            Usuarios que aceptaron
                          </p>
                          {invite.acceptedUsers &&
                          invite.acceptedUsers.length > 0
                            ? invite.acceptedUsers.map((u, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {u.name?.charAt(0).toUpperCase() ?? "?"}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground/80 truncate">
                                      {u.name ??
                                        u.email ??
                                        "Usuario desconocido"}
                                    </p>
                                    {u.name && u.email && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {u.email}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                    {formatDate(u.acceptedAt)}
                                  </span>
                                </div>
                              ))
                            : invite.acceptedBy && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {invite.acceptedBy.name
                                      ?.charAt(0)
                                      .toUpperCase() ?? "?"}
                                  </div>
                                  <p className="text-xs font-medium text-foreground/80 truncate">
                                    {invite.acceptedBy.name ??
                                      invite.acceptedBy.email ??
                                      "Usuario desconocido"}
                                  </p>
                                  {invite.acceptedAt && (
                                    <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto">
                                      {formatDate(invite.acceptedAt)}
                                    </span>
                                  )}
                                </div>
                              )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
