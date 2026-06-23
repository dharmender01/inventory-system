import {
  Boxes,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "../lib/cn";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
];

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 text-white">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-glow-indigo">
        <Boxes className="text-white" size={20} aria-hidden="true" />
      </div>
      <span className="text-base font-semibold tracking-tight">StockFlow</span>
    </div>
  );
}

function NavItems({ onNavigate }) {
  return (
    <>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-white/10 text-white shadow-sm ring-1 ring-inset ring-white/10"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent transition-all duration-200",
                  isActive ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              />
              <Icon size={18} className="transition-transform duration-150 group-hover:scale-110" aria-hidden="true" />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}

function currentTitle(pathname) {
  if (pathname.startsWith("/orders")) return "Orders";
  const item = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
  return item?.label || "Dashboard";
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const title = currentTitle(pathname);

  return (
    <div className="min-h-dvh">
      {}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar-gradient px-3 py-4 lg:flex">
        <Brand />
        <nav className="mt-6 flex flex-col gap-1">
          <NavItems />
        </nav>
        <p className="mt-auto px-3 text-xs text-slate-500">v1.0 · Inventory &amp; Orders</p>
      </aside>

      {}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-overlay-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar-gradient px-3 py-4 shadow-modal animate-slide-in-left">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                className="focus-ring cursor-pointer rounded-md p-1 text-slate-300 transition-colors hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-1">
              <NavItems onNavigate={() => setOpen(false)} />
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="glass sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/50 px-4 shadow-sm lg:px-8">
          <button
            className="focus-ring cursor-pointer rounded-md p-1 text-ink lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold text-ink">{title}</h1>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          {}
          <div key={pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
