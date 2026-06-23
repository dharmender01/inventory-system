import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, Plus, ShoppingCart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { getSummary } from "../api/dashboard";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import { StatSkeleton } from "../components/Skeleton";
import StatCard from "../components/StatCard";
import { money } from "../lib/format";

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getSummary,
  });

  const cards = [
    { label: "Total products", value: data?.total_products ?? 0, icon: Package, tone: "indigo", to: "/products" },
    { label: "Total customers", value: data?.total_customers ?? 0, icon: Users, tone: "sky", to: "/customers" },
    { label: "Total orders", value: data?.total_orders ?? 0, icon: ShoppingCart, tone: "emerald", to: "/orders" },
    { label: "Low stock", value: data?.low_stock_count ?? 0, icon: AlertTriangle, tone: "amber", to: "/products" },
  ];

  const columns = [
    { key: "name", header: "Product", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: "sku", header: "SKU", render: (r) => <span className="font-mono text-xs text-muted">{r.sku}</span> },
    { key: "price", header: "Price", className: "text-right", cellClassName: "text-right font-mono tnum", render: (r) => money(r.price) },
    {
      key: "qty",
      header: "In stock",
      className: "text-right",
      cellClassName: "text-right",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-mono tnum">{r.quantity_in_stock}</span>
          <Badge tone={r.quantity_in_stock === 0 ? "danger" : "warning"}>≤ {r.low_stock_threshold}</Badge>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {}
      <section className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 text-white shadow-glow-indigo sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">Welcome back 👋</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Inventory &amp; Orders Overview</h2>
          <p className="mt-2 max-w-xl text-sm text-white/80">
            Track products, customers and orders in real time — stock and totals update automatically.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/orders"
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Plus size={16} /> New order
            </Link>
            <Link
              to="/products"
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 backdrop-blur transition-colors hover:bg-white/25"
            >
              <Package size={16} /> Add product
            </Link>
          </div>
        </div>
      </section>

      {}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : cards.map((c) => (
              <Link key={c.label} to={c.to} className="focus-ring rounded-xl">
                <StatCard {...c} />
              </Link>
            ))}
      </div>

      {}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <AlertTriangle size={18} className="text-amber-500" /> Low stock products
          </h2>
          <Link to="/products" className="text-sm font-medium text-primary hover:underline">
            Manage products →
          </Link>
        </div>
        <DataTable
          columns={columns}
          rows={data?.low_stock_products}
          loading={isLoading}
          error={isError}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={Package}
              title="No low-stock products"
              message="Everything is comfortably in stock."
            />
          }
        />
      </section>
    </div>
  );
}
