import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Boxes, Filter, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { apiError } from "../api/client";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "../api/products";
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
import { money } from "../lib/format";

const EMPTY = { name: "", sku: "", price: "", quantity_in_stock: "", low_stock_threshold: 10 };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Name is required";
  if (!f.sku.trim()) e.sku = "SKU is required";
  if (f.price === "" || Number(f.price) < 0 || Number.isNaN(Number(f.price)))
    e.price = "Price must be 0 or more";
  const q = Number(f.quantity_in_stock);
  if (f.quantity_in_stock === "" || q < 0 || !Number.isInteger(q))
    e.quantity_in_stock = "Quantity must be a whole number ≥ 0";
  if (Number(f.low_stock_threshold) < 0) e.low_stock_threshold = "Threshold must be ≥ 0";
  return e;
}

export default function Products() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const all = data || [];
  const totalUnits = all.reduce((s, p) => s + p.quantity_in_stock, 0);
  const lowCount = all.filter((p) => p.quantity_in_stock <= p.low_stock_threshold).length;

  const q = search.trim().toLowerCase();
  const filtered = all.filter((p) => {
    const matches = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const lowOk = !lowOnly || p.quantity_in_stock <= p.low_stock_threshold;
    return matches && lowOk;
  });

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setModal({ mode: "create" });
  };
  const openEdit = (p) => {
    setForm({
      name: p.name,
      sku: p.sku,
      price: p.price,
      quantity_in_stock: p.quantity_in_stock,
      low_stock_threshold: p.low_stock_threshold,
    });
    setErrors({});
    setModal({ mode: "edit", product: p });
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMut = useMutation({
    mutationFn: (payload) =>
      modal.mode === "create" ? createProduct(payload) : updateProduct(modal.product.id, payload),
    onSuccess: () => {
      invalidate();
      toast.success(modal.mode === "create" ? "Product created" : "Product updated");
      setModal(null);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      invalidate();
      toast.success("Product deleted");
      setConfirm(null);
    },
    onError: (e) => {
      toast.error(apiError(e));
      setConfirm(null);
    },
  });

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    saveMut.mutate({
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity_in_stock: Number(form.quantity_in_stock),
      low_stock_threshold: Number(form.low_stock_threshold),
    });
  };

  const columns = [
    {
      key: "name",
      header: "Product",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} square />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{r.name}</p>
            <p className="font-mono text-xs text-muted sm:hidden">{r.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "sku", header: "SKU", className: "hidden sm:table-cell", cellClassName: "hidden sm:table-cell", render: (r) => <span className="font-mono text-xs text-muted">{r.sku}</span> },
    { key: "price", header: "Price", className: "text-right", cellClassName: "text-right font-mono tnum", render: (r) => money(r.price) },
    {
      key: "qty",
      header: "In stock",
      className: "text-right",
      cellClassName: "text-right",
      render: (r) => {
        const zero = r.quantity_in_stock === 0;
        const low = r.quantity_in_stock <= r.low_stock_threshold;
        return (
          <span className="inline-flex items-center gap-2">
            <span className={cn("font-mono tnum", zero ? "text-rose-600" : low ? "text-amber-600" : "text-ink")}>
              {r.quantity_in_stock}
            </span>
            {low && <Badge tone={zero ? "danger" : "warning"}>{zero ? "Out" : "Low"}</Badge>}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label={`Edit ${r.name}`}>
            <Pencil size={16} />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setConfirm(r)} aria-label={`Delete ${r.name}`}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MiniStat label="Products" value={all.length} icon={Package} tone="indigo" />
        <MiniStat label="Units in stock" value={totalUnits} icon={Boxes} tone="emerald" />
        <MiniStat label="Low stock" value={lowCount} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products or SKU…" />
          <button
            type="button"
            onClick={() => setLowOnly((v) => !v)}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              lowOnly
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-border bg-white text-muted hover:bg-slate-50",
            )}
            aria-pressed={lowOnly}
          >
            <Filter size={15} /> Low stock
          </button>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add product
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        empty={
          q || lowOnly ? (
            <EmptyState icon={Package} title="No matching products" message="Try a different search or clear the filter." />
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              message="Add your first product to start tracking inventory."
              action={
                <Button onClick={openCreate}>
                  <Plus size={16} /> Add product
                </Button>
              }
            />
          )
        }
      />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Edit product" : "Add product"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saveMut.isPending}>
              {modal?.mode === "edit" ? "Save changes" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Product name" required error={errors.name}>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Wireless Mouse" />
          </Field>
          <Field label="SKU / code" required error={errors.sku}>
            <input className={inputCls} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="WM-001" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price" required error={errors.price}>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
            </Field>
            <Field label="Quantity in stock" required error={errors.quantity_in_stock}>
              <input type="number" min="0" className={inputCls} value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <Field label="Low-stock threshold" hint="Flagged as low when stock is at or below this number." error={errors.low_stock_threshold}>
            <input type="number" min="0" className={inputCls} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
          </Field>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        loading={delMut.isPending}
        title="Delete product"
        message={`Delete "${confirm?.name}"? This cannot be undone.`}
        onConfirm={() => delMut.mutate(confirm.id)}
      />
    </div>
  );
}
