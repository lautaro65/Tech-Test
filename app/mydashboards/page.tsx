"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import InviteModal from "./Invitemodal";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type Visibility = "PRIVATE";

interface NewDashboardForm {
  presetId: string | null;
  name: string;
  description: string;
  visibility: Visibility;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESETS = [
  {
    id: "empty",
    name: "En blanco",
    description: "Empezá desde cero, sin entidades.",
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      </svg>
    ),
  },
  {
    id: "fiesta",
    name: "Fiesta básica",
    description: "Mesas y sillas para un evento social.",
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7.5 19.5c.5-1.5 2.5-3 4.5-3s4 1.5 4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "corporativo",
    name: "Corporativo",
    description: "Distribución tipo auditorio y áreas.",
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 12v3m-3-1.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "PRIVATE",
    label: "Privado",
    description: "Solo vos podés verlo",
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const VISIBILITY_BADGE: Record<Visibility, { classes: string; label: string }> = {
  PRIVATE: { classes: "bg-muted text-muted-foreground", label: "Privado" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Paleta vibrante que funciona bien en light y dark
const CARD_PALETTES = [
  { from: "from-violet-500", to: "to-violet-700" },
  { from: "from-blue-500",   to: "to-indigo-600" },
  { from: "from-emerald-500",to: "to-teal-600" },
  { from: "from-amber-400",  to: "to-orange-500" },
  { from: "from-rose-500",   to: "to-pink-600" },
  { from: "from-cyan-500",   to: "to-blue-600" },
  { from: "from-fuchsia-500",to: "to-purple-600" },
  { from: "from-teal-400",   to: "to-emerald-600" },
];

function cardPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_PALETTES[Math.abs(hash) % CARD_PALETTES.length];
}

function dashboardInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function formatDate(dateStr: string) {
  if (!dateStr) return null;
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

// ─── Icon helpers ─────────────────────────────────────────────────────────────

const IconClose = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconArrow = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSearch = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" className="text-muted-foreground/50 shrink-0">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="m21 21-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPlus = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconTrash = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconEdit = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M15.232 5.232a3 3 0 0 1 4.243 4.243L7.5 21H3v-4.5l12.232-12.268Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconLogout = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconClock = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconUser = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const Spinner = ({ size = "w-3.5 h-3.5", border = "border-primary-foreground/30 border-t-primary-foreground" }: { size?: string; border?: string }) => (
  <span className={`${size} rounded-full border-2 ${border} animate-spin inline-block shrink-0`} />
);

// ─── LeaveSharedDashboard ─────────────────────────────────────────────────────

function LeaveSharedDashboard({ inviteId, dashboardName, onLeft }: {
  inviteId: string;
  dashboardName: string;
  onLeft: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await fetch(`/api/invite/leave?id=${inviteId}`, { method: "DELETE" });
      onLeft();
    } finally {
      setLeaving(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="ml-auto flex items-center gap-1.5 rounded-xl bg-destructive/8 border border-destructive/20 px-2.5 py-1.5">
        <span className="text-[11px] text-muted-foreground">¿Salir?</span>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-destructive hover:bg-destructive/90 text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {leaving ? <Spinner size="w-2.5 h-2.5" /> : "Sí"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-1.5 py-1 rounded-md hover:bg-muted transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Salir de este dashboard"
      className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/8 px-2.5 py-1.5 rounded-lg transition-colors"
    >
      <IconLogout />
      Salir
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const INITIAL_FORM: NewDashboardForm = {
  presetId: null,
  name: "",
  description: "",
  visibility: "PRIVATE",
};

export default function MyDashboardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [sharedDashboards, setSharedDashboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<NewDashboardForm>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState("");

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ dashboardId: string; dashboardName: string } | null>(null);

  const [pendingInvite, setPendingInvite] = useState<{
    token: string;
    dashboardId: string;
    data?: {
      dashboardName?: string;
      ownerName?: string;
      ownerEmail?: string;
      role?: "VIEWER" | "EDITOR";
      expiresAt?: string | null;
      alreadyMember?: boolean;
      currentRole?: "VIEWER" | "EDITOR";
    } | null;
  } | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [loadingInviteData, setLoadingInviteData] = useState(false);
  const [acceptInviteError, setAcceptInviteError] = useState<string | null>(null);

  const filtered = dashboards.filter((db) =>
    db.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (status === "authenticated" && searchParams.get("reason") === "invite") {
      toast("Iniciaste sesión. Ahora podés aceptar tu invitación.", {
        icon: "🔗",
        duration: 4500,
        style: { fontSize: "13px" },
      });
      router.replace("/mydashboards" + window.location.search.replace(/[?&]reason=invite/, ""));
    }
  }, [status, searchParams, router]);

  useEffect(() => {
    const modalActive = modalOpen || inviteModal || pendingInvite || loadingInviteData;
    if (modalActive) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => { document.body.classList.remove("overflow-hidden"); };
  }, [modalOpen, inviteModal, pendingInvite, loadingInviteData]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("invite")) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`/auth?login&reason=invite&callbackUrl=${returnUrl}`);
      } else {
        router.replace("/api/auth/signin");
      }
    }
    if (status === "authenticated") {
      fetch("/api/mydashboards")
        .then((r) => r.json())
        .then((data) => {
          setDashboards(data.dashboards || []);
          setSharedDashboards(data.sharedDashboards || []);
          setLoading(false);
        });

      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");
      const dashId = params.get("dashboardId");
      if (inviteToken && dashId) {
        setLoadingInviteData(true);
        fetch(`/api/invite/preview?token=${inviteToken}&dashboardId=${dashId}`)
          .then((r) => r.json())
          .then((data) => {
            setPendingInvite({ token: inviteToken, dashboardId: dashId, data: data ?? null });
          })
          .catch(() => {
            setPendingInvite({ token: inviteToken, dashboardId: dashId, data: null });
          })
          .finally(() => setLoadingInviteData(false));
      }
    }
  }, [status, router]);

  const handleRejectInvite = () => {
    setPendingInvite(null);
    setAcceptInviteError(null);
    router.replace("/mydashboards");
  };

  const handleAcceptInvite = async () => {
    if (!pendingInvite) return;
    setAcceptingInvite(true);
    setAcceptInviteError(null);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pendingInvite.token, dashboardId: pendingInvite.dashboardId }),
      });
      if (res.ok) {
        setPendingInvite(null);
        router.replace("/mydashboards");
        const r = await fetch("/api/mydashboards");
        const data = await r.json();
        setDashboards(data.dashboards || []);
        setSharedDashboards(data.sharedDashboards || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setAcceptInviteError(data.error || "La invitación expiró o no es válida.");
      }
    } catch {
      setAcceptInviteError("Error de conexión. Intentá de nuevo.");
    } finally {
      setAcceptingInvite(false);
    }
  };

  const openModal = () => {
    setForm(INITIAL_FORM);
    setStep(1);
    setNameError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      setStep(1);
      setForm(INITIAL_FORM);
      setNameError("");
    }, 200);
  };

  const goToStep2 = () => {
    if (!form.presetId) return;
    setStep(2);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setNameError("El nombre es obligatorio.");
      return;
    }
    setNameError("");
    setCreating(true);
    try {
      const res = await fetch("/api/mydashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: form.presetId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          visibility: form.visibility,
        }),
      });
      const data = await res.json();
      if (data.id) {
        closeModal();
        router.push(`/${data.id}/dashboard/`);
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Cargando tus espacios</p>
          <p className="text-xs text-muted-foreground mt-1">Un momento...</p>
        </div>
      </div>
    );
  }

  const user = session?.user || { name: "", email: "" };
  const firstName = user.name ? user.name.split(" ")[0] : null;
  const initials = user.name
    ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")
    : "U";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="bottom-right" />

      <main className="max-w-6xl mx-auto px-6 py-10 lg:py-14">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Tus espacios
            </p>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              {firstName ? <>Hola, {firstName} </> : "Mis dashboards"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Organizá, visualizá y gestioná todos tus eventos desde un solo lugar.
            </p>
          </div>
          {/* Avatar */}
          <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
            <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-primary/20">
              {initials}
            </div>
            {user.email && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{user.email}</p>
            )}
          </div>
        </div>

        {/* ── Actions bar ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Nuevo */}
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-px"
            >
              <IconPlus />
              Nuevo dashboard
            </button>

            {/* Eliminar / selectMode */}
            {!selectMode ? (
              <button
                onClick={() => setSelectMode(true)}
                className="inline-flex items-center gap-2 bg-card border border-border text-foreground/70 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-muted hover:text-foreground transition-colors"
              >
                <IconTrash />
                Eliminar
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setSelectMode(false); setSelectedIds([]); }}
                  className="inline-flex items-center gap-2 bg-card border border-border text-muted-foreground text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={selectedIds.length === 0 || deleting}
                  onClick={() => setDeleteModalOpen(true)}
                  className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
                    selectedIds.length === 0 || deleting
                      ? "bg-destructive/40 text-white/60 cursor-not-allowed"
                      : "bg-destructive hover:bg-destructive/90 text-white"
                  }`}
                >
                  {deleting ? <Spinner size="w-3 h-3" /> : <IconTrash />}
                  {selectedIds.length > 0 ? `Eliminar (${selectedIds.length})` : "Seleccioná uno"}
                </button>
              </>
            )}
          </div>

          {/* Buscador */}
          <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5 w-full sm:w-72 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <IconSearch />
            <input
              type="text"
              placeholder="Buscar dashboard..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none w-full"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <IconClose size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Count ─────────────────────────────────────────────────────────── */}
        <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-5">
          {filtered.length} dashboard{filtered.length !== 1 ? "s" : ""}
          {search && <span className="font-normal normal-case ml-1 text-muted-foreground/60">· "{search}"</span>}
        </p>

        {/* ── Grid mis dashboards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Crear card */}
          <button
            onClick={openModal}
            className="group relative flex flex-col items-center justify-center gap-4 min-h-[220px] rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card hover:bg-primary/4 transition-all duration-200 text-center p-6 overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,var(--color-primary)/0.07,transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-12 h-12 rounded-xl bg-muted group-hover:bg-primary flex items-center justify-center text-muted-foreground group-hover:text-primary-foreground transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg">
              <IconPlus size={18} />
            </div>
            <div className="relative">
              <p className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                Crear nuevo
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Desde cero o con una plantilla
              </p>
            </div>
          </button>

          {/* Empty search state */}
          {filtered.length === 0 && search && (
            <div className="col-span-full flex flex-col items-center justify-center gap-3 py-20">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <IconSearch size={22} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Sin resultados para "{search}"</p>
                <p className="text-xs text-muted-foreground mt-1">Probá con otro término o creá un nuevo dashboard</p>
              </div>
              <button
                onClick={() => setSearch("")}
                className="text-xs font-medium text-primary hover:underline"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}

          {/* Dashboard cards */}
          {filtered.map((db) => {
            const vis = VISIBILITY_BADGE[db.visibility as Visibility] || VISIBILITY_BADGE.PRIVATE;
            const palette = cardPalette(db.name || "x");
            const abbr = dashboardInitials(db.name || "??");
            const updatedFormatted = formatDate(db.updatedAt);
            const createdFormatted = formatDate(db.createdAt);
            const isSelected = selectedIds.includes(db.id);

            return (
              <div
                key={db.id}
                className={`group flex flex-col bg-card border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-destructive ring-2 ring-destructive/30 shadow-md"
                    : "border-border hover:border-border/80 hover:shadow-lg hover:-translate-y-0.5"
                }`}
                onClick={() => {
                  if (selectMode) {
                    setSelectedIds((ids) =>
                      ids.includes(db.id) ? ids.filter((id) => id !== db.id) : [...ids, db.id],
                    );
                  } else {
                    router.push(`/${db.id}/dashboard/`);
                  }
                }}
              >
                {/* Banner */}
                <div className={`h-[96px] bg-gradient-to-br ${palette.from} ${palette.to} flex items-center justify-center relative overflow-hidden`}>
                  {/* Patrón sutil */}
                  <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:14px_14px]" />
                  {/* Glow central */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.18),transparent_60%)]" />
                  <span className="relative text-3xl font-black text-white/85 select-none tracking-tighter drop-shadow-sm">
                    {abbr}
                  </span>

                  {/* Badges top-right */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    {db.presetId && db.presetId !== "empty" && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/25 text-white/90 backdrop-blur-sm">
                        {PRESETS.find((p) => p.id === db.presetId)?.name ?? db.presetId}
                      </span>
                    )}
                    {db.isArchived && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/25 text-white/90 backdrop-blur-sm">
                        Archivado
                      </span>
                    )}
                  </div>

                  {/* Checkbox de selección */}
                  {selectMode && (
                    <div className={`absolute left-2.5 top-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "bg-destructive border-destructive" : "bg-white/20 border-white/60 backdrop-blur-sm"
                    }`}>
                      {isSelected && (
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col px-4 pt-4 pb-3 gap-1">
                  <h2 className="text-sm font-semibold text-foreground leading-snug truncate">
                    {db.name}
                  </h2>
                  {db.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {db.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic">Sin descripción</p>
                  )}
                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60 mt-auto pt-2.5">
                    {updatedFormatted ? (
                      <span className="flex items-center gap-1">
                        <IconClock />
                        {updatedFormatted}
                      </span>
                    ) : createdFormatted ? (
                      <span className="flex items-center gap-1">
                        <IconClock />
                        {createdFormatted}
                      </span>
                    ) : null}
                    <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${vis.classes}`}>
                      {vis.label}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-3 border-t border-border/40 flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!selectMode && (
                    <button
                      onClick={() => router.push(`/${db.id}/dashboard/`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      Abrir
                      <IconArrow />
                    </button>
                  )}
                  <button
                    onClick={() => setInviteModal({ dashboardId: db.id, dashboardName: db.name })}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted hover:bg-accent text-foreground/70 hover:text-accent-foreground px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M20 8v6m-3-3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Invitar
                  </button>
                  <button
                    title="Editar"
                    className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-muted hover:text-foreground/70 transition-colors"
                  >
                    <IconEdit />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Modal confirmación eliminar ───────────────────────────────────── */}
        {deleteModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteModalOpen(false)}
          >
            <div
              className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Franja destructive top */}
              <div className="h-1 bg-destructive w-full" />
              <div className="px-6 pt-5 pb-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                  <IconTrash size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground">Eliminar dashboards</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                    Esta acción es permanente y no se puede deshacer.
                  </p>
                  <ul className="space-y-1">
                    {dashboards
                      .filter((db) => selectedIds.includes(db.id))
                      .map((db) => (
                        <li key={db.id} className="flex items-center gap-2 text-sm text-foreground/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                          {db.name}
                        </li>
                      ))}
                  </ul>
                </div>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  <IconClose />
                </button>
              </div>
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await Promise.all(
                        selectedIds.map((id) => fetch(`/api/mydashboards?id=${id}`, { method: "DELETE" })),
                      );
                      setDashboards((d) => d.filter((db) => !selectedIds.includes(db.id)));
                      setSelectedIds([]);
                      setSelectMode(false);
                      setDeleteModalOpen(false);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold bg-destructive hover:bg-destructive/90 text-white px-5 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting && <Spinner size="w-3.5 h-3.5" />}
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Dashboards compartidos ────────────────────────────────────────────── */}
      {sharedDashboards.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          {/* Separador con label */}
          <div className="flex items-center gap-3 mb-7">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                  <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M1 21c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M19 15c2 .5 4 2 4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Compartidos conmigo
              </p>
            </div>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-semibold text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5">
              {sharedDashboards.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedDashboards.map((item) => {
              const { dashboard, role, acceptedAt } = item;
              const palette = cardPalette(dashboard.name || "x");
              const abbr = dashboardInitials(dashboard.name || "??");
              const isEditor = role === "EDITOR";

              return (
                <div
                  key={item.id}
                  className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Banner */}
                  <div className={`h-[96px] bg-gradient-to-br ${palette.from} ${palette.to} flex items-center justify-center relative overflow-hidden`}>
                    <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:14px_14px]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.18),transparent_60%)]" />
                    <span className="relative text-3xl font-black text-white/85 select-none tracking-tighter drop-shadow-sm">
                      {abbr}
                    </span>
                    {/* Role badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                        isEditor
                          ? "bg-violet-600/85 text-white"
                          : "bg-sky-600/85 text-white"
                      }`}>
                        {isEditor ? "Editor" : "Visor"}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col px-4 pt-4 pb-3 gap-1">
                    <h2 className="text-sm font-semibold text-foreground leading-snug truncate">
                      {dashboard.name}
                    </h2>
                    {dashboard.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {dashboard.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 italic">Sin descripción</p>
                    )}
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/60 mt-auto pt-2.5">
                      {dashboard.owner?.name && (
                        <span className="flex items-center gap-1">
                          <IconUser />
                          {dashboard.owner.name}
                        </span>
                      )}
                      {acceptedAt && (
                        <span className="flex items-center gap-1">
                          <IconClock />
                          {formatDate(acceptedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-border/40 flex items-center gap-1.5">
                    <button
                      onClick={() => router.push(`/${dashboard.id}/dashboard/`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      Abrir
                      <IconArrow />
                    </button>
                    <LeaveSharedDashboard
                      inviteId={item.id}
                      dashboardName={dashboard.name}
                      onLeft={() => setSharedDashboards((prev) => prev.filter((s) => s.id !== item.id))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── InviteModal externo ───────────────────────────────────────────────── */}
      {inviteModal && (
        <InviteModal
          dashboardId={inviteModal.dashboardId}
          dashboardName={inviteModal.dashboardName}
          onClose={() => setInviteModal(null)}
        />
      )}

      {/* ── Pending invite modal ──────────────────────────────────────────────── */}
      {(pendingInvite || loadingInviteData) &&
        (() => {
          const isMember = pendingInvite?.data?.alreadyMember;
          const sameRole = isMember && pendingInvite?.data?.currentRole === pendingInvite?.data?.role;
          const roleChanging = isMember && !sameRole;
          const newRole = pendingInvite?.data?.role;
          const currentRole = pendingInvite?.data?.currentRole;

          const isEditor = newRole === "EDITOR";
          const headerBg = sameRole
            ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
            : isEditor
              ? "bg-gradient-to-br from-violet-500/10 to-primary/10"
              : "bg-gradient-to-br from-sky-500/10 to-primary/10";

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-border/60">
                {/* Header */}
                <div className={`px-6 pt-6 pb-5 ${headerBg} border-b border-border/40`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    sameRole
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : isEditor
                        ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                        : "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
                  }`}>
                    {sameRole ? (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M20 8v6m-3-3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    {sameRole ? "Ya sos miembro" : roleChanging ? "Cambio de rol" : "Invitación recibida"}
                  </p>
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    {loadingInviteData
                      ? "Cargando invitación..."
                      : pendingInvite?.data?.dashboardName
                        ? `"${pendingInvite.data.dashboardName}"`
                        : "¡Te han invitado!"}
                  </h3>
                </div>

                {/* Body */}
                <div className="px-6 py-5 flex flex-col gap-3">
                  {loadingInviteData ? (
                    <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground/60">
                      <Spinner size="w-5 h-5" border="border-border border-t-muted-foreground" />
                      <span className="text-sm">Verificando invitación...</span>
                    </div>
                  ) : sameRole ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                          <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-sm text-foreground/80 font-medium">
                        Ya tenés acceso como{" "}
                        <span className={`font-bold ${currentRole === "EDITOR" ? "text-violet-600" : "text-sky-600"}`}>
                          {currentRole === "EDITOR" ? "Editor" : "Visor"}
                        </span>.
                      </p>
                      <p className="text-xs text-muted-foreground">No necesitás hacer nada más.</p>
                    </div>
                  ) : (
                    <>
                      {/* Dueño */}
                      {(pendingInvite?.data?.ownerName || pendingInvite?.data?.ownerEmail) && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                            {pendingInvite.data?.ownerName?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Invitado por
                            </p>
                            <p className="text-sm font-semibold text-foreground truncate">
                              {pendingInvite.data?.ownerName ?? pendingInvite.data?.ownerEmail}
                            </p>
                            {pendingInvite.data?.ownerName && pendingInvite.data?.ownerEmail && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {pendingInvite.data.ownerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cambio de rol */}
                      {roleChanging ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Cambio de rol</p>
                            <p className="text-xs text-foreground/80 mt-0.5">
                              Tu rol actual como{" "}
                              <span className={`font-bold ${currentRole === "EDITOR" ? "text-violet-600" : "text-sky-600"}`}>
                                {currentRole === "EDITOR" ? "Editor" : "Visor"}
                              </span>{" "}
                              será reemplazado por{" "}
                              <span className={`font-bold ${newRole === "EDITOR" ? "text-violet-600" : "text-sky-600"}`}>
                                {newRole === "EDITOR" ? "Editor" : "Visor"}
                              </span>.
                            </p>
                          </div>
                        </div>
                      ) : (
                        pendingInvite?.data?.role && (
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              pendingInvite.data.role === "EDITOR"
                                ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                                : "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                            }`}>
                              {pendingInvite.data.role === "EDITOR" ? (
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                  <path d="M15.232 5.232a3 3 0 0 1 4.243 4.243L7.5 21H3v-4.5l12.232-12.268Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" stroke="currentColor" strokeWidth="1.5" />
                                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tu rol</p>
                              <p className={`text-sm font-bold ${pendingInvite.data.role === "EDITOR" ? "text-violet-600" : "text-sky-600"}`}>
                                {pendingInvite.data.role === "EDITOR" ? "Editor" : "Visor"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {pendingInvite.data.role === "EDITOR"
                                  ? "Podés ver y editar el canvas"
                                  : "Solo podés ver el canvas"}
                              </p>
                            </div>
                          </div>
                        )
                      )}

                      {!pendingInvite?.data && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Has recibido una invitación para colaborar en un dashboard.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex flex-col gap-2">
                  {acceptInviteError && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2.5">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="shrink-0">
                        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {acceptInviteError}
                    </div>
                  )}
                  {sameRole ? (
                    <>
                      <button
                        onClick={() => {
                          setPendingInvite(null);
                          router.push(`/${pendingInvite?.dashboardId}/dashboard/`);
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <IconArrow size={13} />
                        Ir al dashboard
                      </button>
                      <button
                        onClick={handleRejectInvite}
                        className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground/70 rounded-xl font-medium text-sm transition-colors"
                      >
                        Cerrar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleAcceptInvite}
                        disabled={acceptingInvite || loadingInviteData}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                      >
                        {acceptingInvite && <Spinner size="w-4 h-4" />}
                        {acceptingInvite ? "Procesando..." : roleChanging ? "Cambiar mi rol" : "Aceptar invitación"}
                      </button>
                      <button
                        onClick={handleRejectInvite}
                        disabled={acceptingInvite}
                        className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground/70 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        {roleChanging ? "Mantener rol actual" : "Rechazar"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Modal creación (2 pasos) ──────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Línea top con gradient de primary */}
            <div className="h-0.5 bg-[linear-gradient(to_right,var(--color-primary),var(--color-accent-foreground))]" />

            {/* Header modal */}
            <div className="px-7 pt-5 pb-4 border-b border-border flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Paso {step} de 2
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    <div className={`h-1.5 w-10 rounded-full transition-all duration-300 ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
                    <div className={`h-1.5 w-10 rounded-full transition-all duration-300 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {step === 1 ? "Elegí una plantilla" : "Detalles del dashboard"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === 1
                    ? "Podés modificar todo después de crear tu dashboard."
                    : "Completá la información básica de tu nuevo espacio."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                <IconClose />
              </button>
            </div>

            {/* Step 1 — Plantillas */}
            {step === 1 && (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESETS.map((preset) => {
                    const selected = form.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, presetId: preset.id }))}
                        className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 cursor-pointer focus:outline-none transition-all duration-150 ${
                          selected
                            ? "border-primary bg-primary/8 shadow-sm"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                        }`}
                        style={{ minHeight: 148 }}
                      >
                        {selected && (
                          <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <svg width="8" height="8" fill="none" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        <div className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        }`}>
                          {preset.icon}
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <span className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>
                            {preset.name}
                          </span>
                          <span className="text-xs mt-0.5 text-muted-foreground leading-snug">
                            {preset.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — Detalles */}
            {step === 2 && (
              <div className="p-6 flex flex-col gap-5">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                    Nombre <span className="text-destructive">*</span>
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Ej: Cumpleaños de Martín"
                    value={form.name}
                    onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError(""); }}
                    className={`w-full text-sm text-foreground placeholder:text-muted-foreground/50 bg-background border rounded-xl px-3.5 py-2.5 outline-none transition-all ${
                      nameError
                        ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                        : "border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
                    }`}
                  />
                  {nameError && (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      {nameError}
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                    Descripción{" "}
                    <span className="text-muted-foreground/60 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    placeholder="Breve descripción del evento o espacio..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 rounded-xl px-3.5 py-2.5 outline-none resize-none transition-all"
                  />
                </div>

                {/* Visibilidad */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-2">
                    Visibilidad
                  </label>
                  <div className="flex gap-2">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setForm((f) => ({ ...f, visibility: opt.value }))}
                        className={`flex-1 flex items-center gap-3 py-3 px-3.5 rounded-xl border-2 text-left transition-all ${
                          form.visibility === opt.value
                            ? "border-primary bg-primary/8"
                            : "border-border bg-card hover:border-border/80 hover:bg-muted/50"
                        }`}
                      >
                        <div className={`transition-colors ${form.visibility === opt.value ? "text-primary" : "text-muted-foreground"}`}>
                          {opt.icon}
                        </div>
                        <div>
                          <span className={`text-xs font-semibold block ${form.visibility === opt.value ? "text-primary" : "text-foreground"}`}>
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                        </div>
                        {form.visibility === opt.value && (
                          <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <svg width="8" height="8" fill="none" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer modal */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
              <button
                onClick={step === 1 ? closeModal : () => setStep(1)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted transition-colors"
              >
                {step === 1 ? "Cancelar" : "← Atrás"}
              </button>
              {step === 1 ? (
                <button
                  disabled={!form.presetId}
                  onClick={goToStep2}
                  className="inline-flex items-center gap-2 text-sm font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar
                  <IconArrow size={13} />
                </button>
              ) : (
                <button
                  disabled={creating}
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 text-sm font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {creating && <Spinner size="w-3.5 h-3.5" />}
                  {creating ? "Creando..." : "Crear dashboard"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}