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
  { label: string; description: string; dot: string; badge: string }
> = {
  VIEWER: {
    label: "Visor",
    description: "Solo puede ver el canvas",
    dot: "bg-sky-400",
    badge:
      "bg-sky-400/15 text-sky-500 ring-1 ring-sky-400/30 dark:bg-sky-400/10 dark:text-sky-400",
  },
  EDITOR: {
    label: "Editor",
    description: "Puede editar el canvas",
    dot: "bg-violet-400",
    badge:
      "bg-violet-400/15 text-violet-600 ring-1 ring-violet-400/30 dark:bg-violet-400/10 dark:text-violet-400",
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

function InitialAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initial = name.charAt(0).toUpperCase();
  const colors = [
    "bg-rose-400/20 text-rose-500",
    "bg-amber-400/20 text-amber-500",
    "bg-emerald-400/20 text-emerald-500",
    "bg-sky-400/20 text-sky-500",
    "bg-violet-400/20 text-violet-500",
  ];
  const color = colors[initial.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {initial}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InviteModal({
  dashboardId,
  dashboardName,
  onClose,
}: InviteModalProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [email, setEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState("none");
  const [maxUses, setMaxUses] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [revoking, setRevoking] = useState<string | null>(null);
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
        // Usar el dominio actual, y fallback al dominio de Vercel si no está disponible
        let baseUrl = "";
        if (typeof window !== "undefined" && window.location.origin) {
          baseUrl = window.location.origin;
        } else {
          baseUrl = "https://tech-test-green-eight.vercel.app";
        }
        setNewLink(
          `${baseUrl}/mydashboards?dashboardId=${dashboardId}&invite=${data.token}`
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-border"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 25px 60px -12px rgba(0,0,0,0.35)" }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1 21c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M19 15c2 .5 4 2 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-tight">Invitaciones</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{dashboardName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Body scrollable ── */}
        <div className="overflow-y-auto flex-1">

          {/* ── Nueva invitación ── */}
          <div className="px-6 py-5 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Nueva invitación
            </p>

            {/* Selector de rol */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-2">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ROLE_CONFIG) as ShareRole[]).map((r) => {
                  const cfg = ROLE_CONFIG[r];
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`relative flex flex-col gap-1 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-border/80 hover:bg-muted/40"
                      }`}
                    >
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-snug">
                        {cfg.description}
                      </span>
                      {active && (
                        <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${cfg.dot}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vencimiento + Máx. usos */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Vencimiento</label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger className="w-full bg-background border-border text-sm h-9 rounded-lg">
                    <SelectValue placeholder="Sin vencimiento" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-[60]">
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Máx. usos</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 = Ilimitado"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full h-9 text-sm text-foreground placeholder:text-muted-foreground/50 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg px-3 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email <span className="text-muted-foreground/50 font-normal">(opcional)</span>
              </label>
              <input
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 text-sm text-foreground placeholder:text-muted-foreground/50 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg px-3 outline-none transition-all"
              />
            </div>

            {createError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 mb-3">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-destructive shrink-0">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-xs text-destructive">{createError}</p>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
              {creating ? "Generando..." : "Generar link"}
            </button>

            {/* Link generado */}
            {newLink && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" className="text-primary">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="text-[11px] font-semibold text-primary">Link generado</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={newLink}
                    className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/80 outline-none truncate"
                  />
                  <button
                    onClick={() => handleCopy(newLink)}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                      copied
                        ? "bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/30"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Invitaciones activas ── */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Invitaciones activas
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground/50">
                <span className="w-4 h-4 border-2 border-border border-t-muted-foreground rounded-full animate-spin" />
                <span className="text-xs">Cargando...</span>
              </div>
            ) : invites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-muted-foreground/50 mb-1">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-foreground/70">Sin invitaciones todavía</p>
                <p className="text-[11px] text-muted-foreground/50">Generá un link arriba para compartir este canvas</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {invites.map((invite) => {
                  const expired = isExpired(invite.expiresAt);
                  const accepted = !!invite.acceptedAt;
                  const roleConf = ROLE_CONFIG[invite.role] ?? ROLE_CONFIG.VIEWER;
                  const maxed = invite.maxUses !== null && invite.useCount >= invite.maxUses;

                  return (
                    <div
                      key={invite.id}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        expired || maxed
                          ? "border-border opacity-60"
                          : accepted
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3 p-3">

                        {/* Avatar */}
                        {accepted && invite.acceptedBy?.name ? (
                          <InitialAvatar name={invite.acceptedBy.name} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground/60">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleConf.badge}`}>
                              {roleConf.label}
                            </span>
                            {expired ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Vencido
                              </span>
                            ) : maxed ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                                Límite alcanzado
                              </span>
                            ) : accepted ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/25">
                                Aceptado
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-500 ring-1 ring-amber-400/25">
                                Pendiente
                              </span>
                            )}
                            {invite.maxUses !== null && !maxed && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {invite.useCount}/{invite.maxUses} usos
                              </span>
                            )}
                          </div>

                          {/* Nombre / email */}
                          <p className="text-xs text-foreground/80 mt-1.5 truncate font-medium">
                            {accepted && invite.acceptedBy
                              ? invite.acceptedBy.name || invite.acceptedBy.email || "Usuario desconocido"
                              : invite.email || (
                                  <span className="text-muted-foreground/50 italic font-normal">Link abierto (sin email)</span>
                                )}
                          </p>

                          {/* Fechas */}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground/50">
                              Creado {formatDate(invite.createdAt)}
                            </span>
                            {invite.expiresAt && (
                              <span className={`text-[10px] ${expired ? "text-destructive/70" : "text-muted-foreground/50"}`}>
                                Vence {formatDate(invite.expiresAt)}
                              </span>
                            )}
                            {accepted && invite.acceptedAt && (
                              <span className="text-[10px] text-emerald-500/80">
                                Aceptado {formatDate(invite.acceptedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {invite.useCount > 0 && (
                            <button
                              onClick={() => setExpandedUsers(expandedUsers === invite.id ? null : invite.id)}
                              title="Ver quiénes aceptaron"
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                                expandedUsers === invite.id
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                                <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M1 21c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M19 15c2 .5 4 2 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                          {!expired && !maxed && (
                            <button
                              onClick={() => handleCopy(`${window.location.origin}/mydashboards?dashboardId=${dashboardId}&invite=${invite.token}`)}
                              title="Copiar link"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleRevoke(invite.id)}
                            disabled={revoking === invite.id}
                            title="Revocar invitación"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                          >
                            {revoking === invite.id ? (
                              <span className="w-3 h-3 border border-destructive/40 border-t-destructive rounded-full animate-spin" />
                            ) : (
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Panel usuarios que aceptaron */}
                      {expandedUsers === invite.id && invite.useCount > 0 && (
                        <div className="border-t border-border bg-muted/30 px-4 py-3 flex flex-col gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Usuarios que aceptaron
                          </p>
                          {invite.acceptedUsers && invite.acceptedUsers.length > 0
                            ? invite.acceptedUsers.map((u, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <InitialAvatar name={u.name || u.email || "?"} size="sm" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground/80 truncate">
                                      {u.name ?? u.email ?? "Usuario desconocido"}
                                    </p>
                                    {u.name && u.email && (
                                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                    {formatDate(u.acceptedAt)}
                                  </span>
                                </div>
                              ))
                            : invite.acceptedBy && (
                                <div className="flex items-center gap-2">
                                  <InitialAvatar name={invite.acceptedBy.name || invite.acceptedBy.email || "?"} size="sm" />
                                  <p className="text-xs font-medium text-foreground/80 truncate flex-1">
                                    {invite.acceptedBy.name ?? invite.acceptedBy.email ?? "Usuario desconocido"}
                                  </p>
                                  {invite.acceptedAt && (
                                    <span className="text-[10px] text-muted-foreground/50 shrink-0">
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