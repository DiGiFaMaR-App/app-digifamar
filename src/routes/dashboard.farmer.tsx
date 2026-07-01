import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  DollarSign,
  Package,
  Star,
  LayoutGrid,
  Trophy,
  Plus,
  Pencil,
  X,
  Wallet,
  Image as ImageIcon,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/farmer")({
  head: () => ({ meta: [{ title: "Farmer Dashboard — DiGiFaMaR" }] }),
  component: FarmerDashboard,
});

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const LISTING_CATEGORIES = [
  "Fresh Vegetables",
  "Fresh Fruits",
  "Grains & Cereals",
  "Meat & Poultry",
  "Dairy & Eggs",
  "Organic Produce",
  "Greenhouse Grown",
  "Other",
] as const;

const LISTING_UNITS = ["lb", "kg", "crate", "dozen", "jar", "each", "bag"] as const;

const FARM_TYPES = [
  "Vegetables & Produce",
  "Fruits & Orchards",
  "Grains & Cereals",
  "Livestock & Cattle",
  "Poultry",
  "Dairy",
  "Organic Farm",
  "Greenhouse/Hydroponic",
  "Mixed",
  "Other",
] as const;

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const LENDING_TARGET = 30;

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  farmer_id: string;
  name: string;
  category: string;
  price_per_unit: number;
  unit: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  views: number;
  orders_count: number;
}

interface Order {
  id: string;
  buyer_first_name: string | null;
  product_name: string | null;
  amount: number;
  status: string;
  created_at: string;
}

interface Stats {
  totalSales: number;
  pendingBalance: number;
  availableBalance: number;
  activeListings: number;
  avgRating: number | null;
}

interface FarmProfile {
  farm_name: string;
  description: string | null;
  state: string | null;
  farm_type: string | null;
}

interface ListingDraft {
  name: string;
  category: string;
  price_per_unit: string;
  unit: string;
  description: string;
  is_active: boolean;
  image_url: string;
}

const emptyDraft: ListingDraft = {
  name: "",
  category: "Fresh Vegetables",
  price_per_unit: "",
  unit: "lb",
  description: "",
  is_active: true,
  image_url: "",
};

// ─────────────────────────────────────────────────────────────────
// DATA HOOK
// ─────────────────────────────────────────────────────────────────

function useFarmerDashboard(userId: string | undefined) {
  // Use `any` cast to query tables not yet in the generated types
  const sb = supabase as any;

  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    pendingBalance: 0,
    availableBalance: 0,
    activeListings: 0,
    avgRating: null,
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [ordersRes, listingsRes, reviewsRes, profileRes] = await Promise.all([
          sb
            .from("orders")
            .select("id, buyer_first_name, product_name, amount, escrow_amount, status, created_at")
            .eq("farmer_id", userId)
            .order("created_at", { ascending: false }),
          sb
            .from("listings")
            .select("*")
            .eq("farmer_id", userId)
            .order("created_at", { ascending: false }),
          sb.from("reviews").select("rating").eq("farmer_id", userId),
          supabase.from("farmer_profiles").select("*").eq("user_id", userId).maybeSingle(),
        ]);

        if (cancelled) return;

        const rawOrders: any[] = ordersRes.data ?? [];
        const rawListings: Listing[] = listingsRes.data ?? [];
        const rawReviews: any[] = reviewsRes.data ?? [];

        const totalSales = rawOrders.length;
        const pendingBalance = rawOrders
          .filter((o) => o.status === "escrowed")
          .reduce((s, o) => s + (Number(o.escrow_amount) || 0), 0);
        const availableBalance = rawOrders
          .filter((o) => o.status === "released")
          .reduce((s, o) => s + (Number(o.amount) || 0), 0);
        const activeListings = rawListings.filter((l) => l.is_active).length;
        const avgRating =
          rawReviews.length > 0
            ? rawReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / rawReviews.length
            : null;

        setStats({
          totalSales,
          pendingBalance,
          availableBalance,
          activeListings,
          avgRating,
        });
        setListings(rawListings);
        setOrders(rawOrders.slice(0, 10) as Order[]);

        if (profileRes.data) {
          const pd = profileRes.data as any;
          setProfile({
            farm_name: pd.farm_name ?? "",
            description: pd.description ?? null,
            state: pd.state ?? null,
            farm_type: pd.farm_type ?? null,
          });
        }
      } catch {
        // tables may not exist yet — silent, show zero state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async (id: string, value: boolean) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: value } : l)));
    await sb.from("listings").update({ is_active: value }).eq("id", id);
  };

  const saveListing = async (draft: ListingDraft, editId?: string): Promise<boolean> => {
    const payload = {
      name: draft.name.trim(),
      category: draft.category,
      price_per_unit: parseFloat(draft.price_per_unit) || 0,
      unit: draft.unit,
      description: draft.description.trim() || null,
      is_active: draft.is_active,
      image_url: draft.image_url.trim() || null,
    };
    if (editId) {
      const { error } = await sb
        .from("listings")
        .update(payload)
        .eq("id", editId)
        .eq("farmer_id", userId);
      if (error) {
        toast.error("Failed to update listing");
        return false;
      }
      setListings((prev) => prev.map((l) => (l.id === editId ? { ...l, ...payload } : l)));
    } else {
      const { data, error } = await sb
        .from("listings")
        .insert({ ...payload, farmer_id: userId, views: 0, orders_count: 0 })
        .select()
        .single();
      if (error) {
        toast.error("Failed to create listing");
        return false;
      }
      if (data) setListings((prev) => [data as Listing, ...prev]);
    }
    return true;
  };

  const saveProfile = async (p: FarmProfile): Promise<boolean> => {
    const { error } = await (supabase.from("farmer_profiles") as any)
      .update({
        farm_name: p.farm_name,
        description: p.description,
        state: p.state,
        farm_type: p.farm_type,
      })
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to save profile");
      return false;
    }
    setProfile(p);
    return true;
  };

  return {
    stats,
    listings,
    orders,
    profile,
    loading,
    toggleActive,
    saveListing,
    saveProfile,
  };
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

function FarmerDashboard() {
  const { user } = useAuth();
  const { stats, listings, orders, profile, loading, toggleActive, saveListing, saveProfile } =
    useFarmerDashboard(user?.id);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const formRef = useRef<HTMLDivElement>(null);

  const openCreate = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const openEdit = (l: Listing) => {
    setDraft({
      name: l.name,
      category: l.category,
      price_per_unit: String(l.price_per_unit),
      unit: l.unit,
      description: l.description ?? "",
      is_active: l.is_active,
      image_url: l.image_url ?? "",
    });
    setEditingId(l.id);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const handleSaveListing = async () => {
    if (!draft.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!draft.price_per_unit || isNaN(parseFloat(draft.price_per_unit))) {
      toast.error("Enter a valid price");
      return;
    }
    const ok = await saveListing(draft, editingId ?? undefined);
    if (ok) {
      setShowForm(false);
      setEditingId(null);
      toast.success(editingId ? "Listing updated" : "Listing created");
    }
  };

  return (
    <RequireAuth>
      <AppShell role="farmer">
        <div className="min-h-screen bg-[#060F06] text-[#F0FFF0]">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
            {/* Page header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#7AAB7A]">Farmer Dashboard</p>
                <h1 className="text-2xl font-extrabold sm:text-3xl">
                  {loading ? "Loading…" : (profile?.farm_name ?? "Your Farm")}
                </h1>
              </div>
              <Button
                onClick={openCreate}
                className="bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Create New Listing
              </Button>
            </div>

            {/* Stats row */}
            <StatsRow stats={stats} loading={loading} />

            {/* Lending milestone */}
            <LendingMilestone salesCount={stats.totalSales} />

            {/* Listings section */}
            <SectionWrapper
              title="Active Listings"
              action={
                <button
                  onClick={openCreate}
                  className="text-xs font-semibold text-[#4ADE80] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> New listing
                </button>
              }
            >
              <ListingsTable
                listings={listings}
                loading={loading}
                onToggleActive={toggleActive}
                onEdit={openEdit}
              />
            </SectionWrapper>

            {/* Inline create/edit form */}
            {showForm && (
              <div ref={formRef}>
                <ListingForm
                  draft={draft}
                  isEditing={!!editingId}
                  onChange={setDraft}
                  onSave={handleSaveListing}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                />
              </div>
            )}

            {/* Recent orders */}
            <SectionWrapper title="Recent Orders">
              <RecentOrdersTable orders={orders} loading={loading} />
            </SectionWrapper>

            {/* Wallet */}
            <WalletSection available={stats.availableBalance} pending={stats.pendingBalance} />

            {/* Farm profile quick edit */}
            {profile !== null && <FarmProfileSection profile={profile} onSave={saveProfile} />}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}

// ─────────────────────────────────────────────────────────────────
// STATS ROW
// ─────────────────────────────────────────────────────────────────

function StatsRow({ stats, loading }: { stats: Stats; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const ratingDisplay =
    stats.avgRating !== null ? `${stats.avgRating.toFixed(1)} ★` : "No reviews yet";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={DollarSign} label="Total Sales" value={String(stats.totalSales)} />
      <StatCard
        icon={Wallet}
        label="Pending Balance"
        value={`$${stats.pendingBalance.toFixed(2)}`}
        accent
      />
      <StatCard icon={LayoutGrid} label="Active Listings" value={String(stats.activeListings)} />
      <StatCard icon={Star} label="Avg Rating" value={ratingDisplay} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? "border-[#4ADE80]/30 bg-[#4ADE80]/10" : "border-[#1E3A1E] bg-[#132013]"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-[#7AAB7A]">
        <Icon className="h-4 w-4 text-[#4ADE80]" />
        {label}
      </div>
      <p
        className={`mt-1.5 text-2xl font-extrabold ${accent ? "text-[#4ADE80]" : "text-[#F0FFF0]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] p-4 animate-pulse">
      <div className="h-3 w-20 rounded bg-[#1E3A1E] mb-3" />
      <div className="h-7 w-16 rounded bg-[#1E3A1E]" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LENDING MILESTONE
// ─────────────────────────────────────────────────────────────────

function LendingMilestone({ salesCount }: { salesCount: number }) {
  const pct = Math.min((salesCount / LENDING_TARGET) * 100, 100);
  const qualified = salesCount >= LENDING_TARGET;
  const remaining = LENDING_TARGET - salesCount;

  return (
    <div className="rounded-2xl border border-[#4ADE80]/25 bg-[#4ADE80]/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4ADE80]/20">
            <Trophy className="h-4 w-4 text-[#4ADE80]" />
          </div>
          <div>
            <p className="font-semibold text-[#F0FFF0]">30-Sale Lending Milestone</p>
            {qualified ? (
              <p className="text-sm text-[#7AAB7A] mt-0.5">
                You've hit the milestone — preferred lender rates unlocked!
              </p>
            ) : (
              <p className="text-sm text-[#7AAB7A] mt-0.5">
                Complete{" "}
                <span className="font-semibold text-[#F0FFF0]">
                  {remaining} more sale{remaining !== 1 ? "s" : ""}
                </span>{" "}
                to unlock preferred lender rates.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-[#4ADE80]/20 px-2.5 py-0.5 text-xs font-bold text-[#4ADE80]">
            {Math.min(salesCount, LENDING_TARGET)}/{LENDING_TARGET}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 rounded-full bg-[#1E3A1E] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#4ADE80] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {qualified ? (
          <Link to="/lending">
            <Button size="sm" className="bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold">
              🎉 You qualify! View lending partners
            </Button>
          </Link>
        ) : (
          <Link to="/lending">
            <Button size="sm" className="bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold">
              Complete {remaining} more sale{remaining !== 1 ? "s" : ""} →
            </Button>
          </Link>
        )}
        <Link
          to="/lending"
          className="text-xs text-[#7AAB7A] hover:text-[#4ADE80] hover:underline flex items-center gap-1"
        >
          Learn about the lending program <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LISTINGS TABLE
// ─────────────────────────────────────────────────────────────────

function ListingsTable({
  listings,
  loading,
  onToggleActive,
  onEdit,
}: {
  listings: Listing[];
  loading: boolean;
  onToggleActive: (id: string, value: boolean) => void;
  onEdit: (l: Listing) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-[#1E3A1E] animate-pulse" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#1E3A1E] bg-[#132013] py-12 text-center">
        <Package className="mx-auto h-8 w-8 text-[#7AAB7A] mb-2" />
        <p className="text-sm text-[#7AAB7A]">No listings yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] overflow-hidden">
      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[40px_1fr_90px_110px_80px_60px_60px_56px] gap-3 px-4 py-2.5 border-b border-[#1E3A1E] text-[10px] uppercase tracking-wider text-[#7AAB7A] font-semibold">
        <span />
        <span>Name</span>
        <span>Price</span>
        <span>Category</span>
        <span>Status</span>
        <span>Views</span>
        <span>Orders</span>
        <span />
      </div>

      {listings.map((l, idx) => (
        <div
          key={l.id}
          className={`grid grid-cols-[40px_1fr_56px] sm:grid-cols-[40px_1fr_90px_110px_80px_60px_60px_56px] gap-3 items-center px-4 py-3 ${
            idx < listings.length - 1 ? "border-b border-[#1E3A1E]" : ""
          }`}
        >
          {/* Thumbnail */}
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#1E3A1E] shrink-0 flex items-center justify-center">
            {l.image_url ? (
              <img
                src={l.image_url}
                alt={l.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-[#7AAB7A]" />
            )}
          </div>

          {/* Name */}
          <span className="text-sm font-medium text-[#F0FFF0] truncate">{l.name}</span>

          {/* Price — hidden on mobile */}
          <span className="hidden sm:block text-sm font-semibold text-[#4ADE80]">
            ${l.price_per_unit.toFixed(2)}/{l.unit}
          </span>

          {/* Category — hidden on mobile */}
          <span className="hidden sm:block text-xs text-[#7AAB7A] truncate">{l.category}</span>

          {/* Status toggle — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2">
            <Switch
              checked={l.is_active}
              onCheckedChange={(v) => onToggleActive(l.id, v)}
              className="data-[state=checked]:bg-[#4ADE80]"
            />
            <span className="text-xs text-[#7AAB7A]">{l.is_active ? "Active" : "Off"}</span>
          </div>

          {/* Views — hidden on mobile */}
          <span className="hidden sm:block text-xs text-[#7AAB7A]">{l.views.toLocaleString()}</span>

          {/* Orders — hidden on mobile */}
          <span className="hidden sm:block text-xs text-[#7AAB7A]">
            {l.orders_count.toLocaleString()}
          </span>

          {/* Edit */}
          <button
            onClick={() => onEdit(l)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#1E3A1E] hover:bg-[#1E3A1E] transition-colors text-[#7AAB7A] hover:text-[#4ADE80]"
            aria-label="Edit listing"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LISTING INLINE FORM
// ─────────────────────────────────────────────────────────────────

function ListingForm({
  draft,
  isEditing,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ListingDraft;
  isEditing: boolean;
  onChange: (d: ListingDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) =>
    onChange({ ...draft, [k]: v });

  return (
    <div className="rounded-2xl border border-[#4ADE80]/30 bg-[#132013] p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-[#F0FFF0]">
          {isEditing ? "Edit Listing" : "Create New Listing"}
        </h3>
        <button
          onClick={onCancel}
          className="text-[#7AAB7A] hover:text-[#F0FFF0] transition-colors"
          aria-label="Close form"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Product name */}
        <FormField label="Product Name">
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Heirloom Tomatoes"
            className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] placeholder:text-[#7AAB7A]/50 focus:border-[#4ADE80]"
          />
        </FormField>

        {/* Category + Unit side by side */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category">
            <Select value={draft.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] focus:ring-[#4ADE80]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#132013] border-[#1E3A1E]">
                {LISTING_CATEGORIES.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="text-[#F0FFF0] focus:bg-[#1E3A1E] focus:text-[#F0FFF0]"
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Unit">
            <Select value={draft.unit} onValueChange={(v) => set("unit", v)}>
              <SelectTrigger className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] focus:ring-[#4ADE80]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#132013] border-[#1E3A1E]">
                {LISTING_UNITS.map((u) => (
                  <SelectItem
                    key={u}
                    value={u}
                    className="text-[#F0FFF0] focus:bg-[#1E3A1E] focus:text-[#F0FFF0]"
                  >
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* Price */}
        <FormField label="Price per Unit ($)">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={draft.price_per_unit}
            onChange={(e) => set("price_per_unit", e.target.value)}
            placeholder="e.g. 3.50"
            className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] placeholder:text-[#7AAB7A]/50 focus:border-[#4ADE80]"
          />
        </FormField>

        {/* Description */}
        <FormField label="Description">
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What makes this product special?"
            rows={3}
            className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] placeholder:text-[#7AAB7A]/50 focus:border-[#4ADE80] resize-none"
          />
        </FormField>

        {/* Image URL */}
        <FormField label="Image URL (optional)">
          <Input
            value={draft.image_url}
            onChange={(e) => set("image_url", e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] placeholder:text-[#7AAB7A]/50 focus:border-[#4ADE80]"
          />
        </FormField>

        {/* Stock toggle */}
        <label className="flex items-center justify-between rounded-xl border border-[#1E3A1E] bg-[#060F06] px-4 py-3 cursor-pointer">
          <span className="text-sm text-[#F0FFF0]">Listing active (visible to buyers)</span>
          <Switch
            checked={draft.is_active}
            onCheckedChange={(v) => set("is_active", v)}
            className="data-[state=checked]:bg-[#4ADE80]"
          />
        </label>
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 border-[#1E3A1E] bg-transparent text-[#7AAB7A] hover:bg-[#1E3A1E] hover:text-[#F0FFF0]"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          className="flex-[2] bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold"
        >
          {isEditing ? "Save Changes" : "Publish Listing"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// RECENT ORDERS TABLE
// ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  shipped: "bg-blue-500/15 text-blue-400",
  awaiting_confirmation: "bg-orange-500/15 text-orange-400",
  released: "bg-[#4ADE80]/15 text-[#4ADE80]",
  escrowed: "bg-purple-500/15 text-purple-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  shipped: "Shipped",
  awaiting_confirmation: "Awaiting Confirmation",
  released: "Released",
  escrowed: "Escrowed",
};

function RecentOrdersTable({ orders, loading }: { orders: Order[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-[#1E3A1E] animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#1E3A1E] bg-[#132013] py-12 text-center">
        <Package className="mx-auto h-8 w-8 text-[#7AAB7A] mb-2" />
        <p className="text-sm text-[#7AAB7A]">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_90px_140px_100px] gap-3 px-4 py-2.5 border-b border-[#1E3A1E] text-[10px] uppercase tracking-wider text-[#7AAB7A] font-semibold">
        <span>Order ID</span>
        <span>Buyer</span>
        <span>Product</span>
        <span>Amount</span>
        <span>Status</span>
        <span>Date</span>
      </div>

      {orders.map((o, idx) => (
        <div
          key={o.id}
          className={`grid grid-cols-[1fr_90px_100px] sm:grid-cols-[80px_1fr_1fr_90px_140px_100px] gap-3 items-center px-4 py-3 ${
            idx < orders.length - 1 ? "border-b border-[#1E3A1E]" : ""
          }`}
        >
          <span className="hidden sm:block text-xs font-mono text-[#7AAB7A]">
            #{o.id.slice(-6).toUpperCase()}
          </span>
          <span className="text-sm text-[#F0FFF0] truncate">{o.buyer_first_name ?? "—"}</span>
          <span className="hidden sm:block text-sm text-[#7AAB7A] truncate">
            {o.product_name ?? "—"}
          </span>
          <span className="text-sm font-semibold text-[#4ADE80]">
            ${Number(o.amount).toFixed(2)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold truncate ${
              STATUS_STYLES[o.status] ?? "bg-[#1E3A1E] text-[#7AAB7A]"
            }`}
          >
            {STATUS_LABELS[o.status] ?? o.status}
          </span>
          <span className="hidden sm:block text-xs text-[#7AAB7A]">
            {new Date(o.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// WALLET SECTION
// ─────────────────────────────────────────────────────────────────

function WalletSection({ available, pending }: { available: number; pending: number }) {
  return (
    <SectionWrapper title="Wallet">
      <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] p-5">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-xs text-[#7AAB7A] uppercase tracking-wider mb-1">
              Available Balance
            </p>
            <p className="text-2xl font-extrabold text-[#4ADE80]">${available.toFixed(2)}</p>
            <p className="text-xs text-[#7AAB7A] mt-0.5">Released funds</p>
          </div>
          <div>
            <p className="text-xs text-[#7AAB7A] uppercase tracking-wider mb-1">Pending Balance</p>
            <p className="text-2xl font-extrabold text-[#F0FFF0]">${pending.toFixed(2)}</p>
            <p className="text-xs text-[#7AAB7A] mt-0.5">In escrow</p>
          </div>
        </div>
        <Button
          onClick={() =>
            toast.success("Withdrawal request submitted — processed within 2 business days")
          }
          className="w-full bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold"
        >
          <Wallet className="mr-2 h-4 w-4" /> Request Withdrawal
        </Button>
      </div>
    </SectionWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────
// FARM PROFILE QUICK EDIT
// ─────────────────────────────────────────────────────────────────

function FarmProfileSection({
  profile,
  onSave,
}: {
  profile: FarmProfile;
  onSave: (p: FarmProfile) => Promise<boolean>;
}) {
  const [form, setForm] = useState<FarmProfile>(profile);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FarmProfile>(k: K, v: FarmProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.farm_name.trim()) {
      toast.error("Farm name is required");
      return;
    }
    setSaving(true);
    const ok = await onSave(form);
    if (ok) toast.success("Farm profile updated");
    setSaving(false);
  };

  return (
    <SectionWrapper title="Farm Profile">
      <div className="rounded-2xl border border-[#1E3A1E] bg-[#132013] p-5 space-y-4">
        <FormField label="Farm Name">
          <Input
            value={form.farm_name}
            onChange={(e) => set("farm_name", e.target.value)}
            placeholder="Sunrise Family Farm"
            className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] placeholder:text-[#7AAB7A]/50 focus:border-[#4ADE80]"
          />
        </FormField>

        <FormField label="Bio">
          <Textarea
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Tell buyers about your farm…"
            rows={3}
            className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] placeholder:text-[#7AAB7A]/50 focus:border-[#4ADE80] resize-none"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="State">
            <Select value={form.state ?? ""} onValueChange={(v) => set("state", v)}>
              <SelectTrigger className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] focus:ring-[#4ADE80]/20">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-64 bg-[#132013] border-[#1E3A1E]">
                {US_STATES.map((s) => (
                  <SelectItem
                    key={s.code}
                    value={s.code}
                    className="text-[#F0FFF0] focus:bg-[#1E3A1E] focus:text-[#F0FFF0]"
                  >
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Farm Type">
            <Select value={form.farm_type ?? ""} onValueChange={(v) => set("farm_type", v)}>
              <SelectTrigger className="bg-[#060F06] border-[#1E3A1E] text-[#F0FFF0] focus:ring-[#4ADE80]/20">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-[#132013] border-[#1E3A1E]">
                {FARM_TYPES.map((t) => (
                  <SelectItem
                    key={t}
                    value={t}
                    className="text-[#F0FFF0] focus:bg-[#1E3A1E] focus:text-[#F0FFF0]"
                  >
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#4ADE80] hover:bg-[#22C55E] text-black font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </SectionWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────

function SectionWrapper({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7AAB7A]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#7AAB7A] uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}
