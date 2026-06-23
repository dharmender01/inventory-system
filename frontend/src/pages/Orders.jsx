import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Eye,
  Minus,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiError } from "../api/client";
import { listCustomers } from "../api/customers";
import { createOrder, deleteOrder, listOrders } from "../api/orders";
import { listProducts } from "../api/products";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import Field, { inputCls } from "../components/Field";
import MiniStat from "../components/MiniStat";
import Modal from "../components/Modal";
import SearchInput from "../components/SearchInput";
import { cn } from "../lib/cn";
import { fmtDate, money, timeAgo } from "../lib/format";

const blankLine = () => ({ product_id: "", quantity: 1 });

export default function Orders() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ordersQ = useQuery({ queryKey: ["orders"], queryFn: listOrders });
  const customersQ = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const productsQ = useQuery({ queryKey: ["products"], queryFn: listProducts });

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([blankLine()]);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");

  const allOrders = ordersQ.data || [];
  const revenue = allOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const avg = allOrders.length ? revenue / allOrders.length : 0;

  const q = search.trim().toLowerCase();
  const filteredOrders = allOrders.filter(
    (o) =>
      !q ||
      String(o.id).includes(q) ||
      (o.customer_name || "").toLowerCase().includes(q) ||
      (o.status || "").toLowerCase().includes(q),
  );

  const productMap = useMemo(
    () => Object.fromEntries((productsQ.data || []).map((p) => [String(p.id), p])),
    [productsQ.data],
  );

  const estTotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = productMap[String(l.product_id)];
        return sum + (p ? Number(p.price) * Number(l.quantity || 0) : 0);
      }, 0),
    [lines, productMap],
  );
  const totalItems = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMut = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      invalidate();
      toast.success("Order created");
      setOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteOrder(id),
    onSuccess: () => {
      invalidate();
      toast.success("Order cancelled");
      setConfirm(null);
    },
    onError: (e) => {
      toast.error(apiError(e));
      setConfirm(null);
    },
  });

  const openCreate = () => {
    setCustomerId("");
    setLines([blankLine()]);
    setErrors({});
    setOpen(true);
  };

  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, blankLine()]);
  const removeLine = (i) => setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)));
  const stepQty = (i, delta) =>
    setLines((ls) =>
      ls.map((l, idx) => (idx === i ? { ...l, quantity: Math.max(1, (Number(l.quantity) || 1) + delta) } : l)),
    );
  const chosenElsewhere = (idx) =>
    new Set(lines.filter((_, j) => j !== idx).map((l) => String(l.product_id)).filter(Boolean));

  function validate() {
    const e = {};
    if (!customerId) e.customer = "Select a customer";
    const itemErrors = lines.map((l) => {
      if (!l.product_id) return "Select a product";
      const n = Number(l.quantity);
      if (!Number.isInteger(n) || n <= 0) return "Quantity must be a whole number ≥ 1";
      const p = productMap[String(l.product_id)];
      if (p && n > p.quantity_in_stock) return `Only ${p.quantity_in_stock} in stock`;
      return null;
    });
    if (itemErrors.some(Boolean)) e.items = itemErrors;
    return e;
  }

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (e.customer || (e.items && e.items.some(Boolean))) return;
    createMut.mutate({
      customer_id: Number(customerId),
      items: lines.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
    });
  };

  const columns = [
    { key: "id", header: "Order", render: (r) => <Badge tone="brand" className="font-mono">#{r.id}</Badge> },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.customer_name || `#${r.customer_id}`} />
          <span className="font-medium text-ink">{r.customer_name || `#${r.customer_id}`}</span>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      className: "text-right",
      cellClassName: "text-right",
      render: (r) => (
        <span title={(r.items || []).map((i) => `${i.quantity}× ${i.product_name || `#${i.product_id}`}`).join(", ")}>
          <Badge tone="neutral">{r.items?.length ?? 0}</Badge>
        </span>
      ),
    },
    { key: "total", header: "Total", className: "text-right", cellClassName: "text-right font-mono font-semibold tnum", render: (r) => money(r.total_amount) },
    { key: "status", header: "Status", render: (r) => <Badge tone="success">{r.status}</Badge> },
    {
      key: "date",
      header: "Created",
      className: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell",
      render: (r) => <span className="text-xs text-muted" title={fmtDate(r.created_at)}>{timeAgo(r.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link to={`/orders/${r.id}`} aria-label={`View order ${r.id}`}>
            <Button size="icon" variant="ghost">
              <Eye size={16} />
            </Button>
          </Link>
          <Button size="icon" variant="ghost" onClick={() => setConfirm(r)} aria-label={`Cancel order ${r.id}`}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  const noCustomers = (customersQ.data || []).length === 0;
  const noProducts = (productsQ.data || []).length === 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat label="Total orders" value={allOrders.length} icon={Receipt} tone="indigo" />
        <MiniStat label="Revenue" value={money(revenue)} icon={DollarSign} tone="emerald" count={false} />
        <MiniStat label="Avg order" value={money(avg)} icon={TrendingUp} tone="sky" count={false} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by #, customer, status…" />
        <Button onClick={openCreate}>
          <Plus size={16} /> Create order
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filteredOrders}
        loading={ordersQ.isLoading}
        error={ordersQ.isError}
        onRetry={ordersQ.refetch}
        onRowClick={(r) => navigate(`/orders/${r.id}`)}
        empty={
          q ? (
            <EmptyState icon={ShoppingCart} title="No matching orders" message={`Nothing matches “${search}”.`} />
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="No orders yet"
              message="Create an order to reduce stock and compute totals automatically."
              action={
                <Button onClick={openCreate}>
                  <Plus size={16} /> Create order
                </Button>
              }
            />
          )
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Create order"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={createMut.isPending} disabled={noCustomers || noProducts}>
              Place order · {money(estTotal)}
            </Button>
          </>
        }
      >
        {(noCustomers || noProducts) && (
          <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
            You need at least one {noCustomers ? "customer" : ""}
            {noCustomers && noProducts ? " and one " : ""}
            {noProducts ? "product" : ""} before creating an order.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <Field label="Customer" required error={errors.customer}>
            <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {(customersQ.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Line items</span>
              <span className="text-xs text-muted">{lines.length} line{lines.length > 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-2">
              {lines.map((l, i) => {
                const p = productMap[String(l.product_id)];
                const lineErr = errors.items?.[i];
                const lineTotal = p ? Number(p.price) * Number(l.quantity || 0) : 0;
                const taken = chosenElsewhere(i);
                return (
                  <div
                    key={i}
                    className={cn("rounded-lg border bg-white p-3", lineErr ? "border-rose-200" : "border-border")}
                  >
                    <div className="flex items-center gap-2">
                      {p ? (
                        <Avatar name={p.name} square />
                      ) : (
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                          <Package size={16} />
                        </div>
                      )}
                      <select
                        className={cn(inputCls, "flex-1")}
                        value={l.product_id}
                        onChange={(e) => setLine(i, { product_id: e.target.value })}
                      >
                        <option value="">Select a product…</option>
                        {(productsQ.data || []).map((prod) => (
                          <option
                            key={prod.id}
                            value={prod.id}
                            disabled={prod.quantity_in_stock === 0 || taken.has(String(prod.id))}
                          >
                            {prod.name} — {money(prod.price)}
                            {prod.quantity_in_stock === 0 ? " (out of stock)" : ` (${prod.quantity_in_stock} in stock)`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                        className="focus-ring shrink-0 cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-rose-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Remove item"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {p && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-11">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted">{money(p.price)} each</span>
                          <Badge tone={p.quantity_in_stock === 0 ? "danger" : p.quantity_in_stock <= p.low_stock_threshold ? "warning" : "success"}>
                            {p.quantity_in_stock} in stock
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center rounded-md border border-border bg-white">
                            <button
                              type="button"
                              onClick={() => stepQty(i, -1)}
                              className="focus-ring cursor-pointer rounded-l-md px-2 py-1.5 text-muted hover:bg-slate-50"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={l.quantity}
                              onChange={(e) => setLine(i, { quantity: e.target.value })}
                              className="w-12 border-x border-border py-1.5 text-center text-sm tnum focus:outline-none"
                              aria-label="Quantity"
                            />
                            <button
                              type="button"
                              onClick={() => stepQty(i, 1)}
                              className="focus-ring cursor-pointer rounded-r-md px-2 py-1.5 text-muted hover:bg-slate-50"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="w-20 text-right font-mono text-sm font-semibold tnum">{money(lineTotal)}</span>
                        </div>
                      </div>
                    )}
                    {lineErr && (
                      <p className="mt-1 pl-11 text-xs text-danger" role="alert">
                        {lineErr}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="focus-ring mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-indigo-50/40"
            >
              <Plus size={16} /> Add another item
            </button>
          </div>

          <div className="space-y-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 p-4 ring-1 ring-inset ring-indigo-100">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Items</span>
              <span className="font-mono text-ink tnum">{totalItems}</span>
            </div>
            <div className="flex items-center justify-between border-t border-indigo-100 pt-2">
              <span className="text-sm font-medium text-ink">Estimated total</span>
              <span className="font-mono text-xl font-semibold text-gradient tnum">{money(estTotal)}</span>
            </div>
          </div>
          <p className="text-xs text-muted">The backend recomputes and stores the authoritative total on submit.</p>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        loading={delMut.isPending}
        title="Cancel order"
        confirmLabel="Cancel order"
        message={`Cancel order #${confirm?.id}? Reserved stock will be returned to inventory.`}
        onConfirm={() => delMut.mutate(confirm.id)}
      />
    </div>
  );
}
