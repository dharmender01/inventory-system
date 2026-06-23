import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Plus, Trash2, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { apiError } from "../api/client";
import { createCustomer, deleteCustomer, listCustomers } from "../api/customers";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import Field, { inputCls } from "../components/Field";
import MiniStat from "../components/MiniStat";
import Modal from "../components/Modal";
import SearchInput from "../components/SearchInput";

const EMPTY = { full_name: "", email: "", phone: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f) {
  const e = {};
  if (!f.full_name.trim()) e.full_name = "Full name is required";
  if (!f.email.trim()) e.email = "Email is required";
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address";
  return e;
}

export default function Customers() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");

  const all = data || [];
  const withPhone = all.filter((c) => c.phone).length;

  const q = search.trim().toLowerCase();
  const filtered = all.filter(
    (c) =>
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q),
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      invalidate();
      toast.success("Customer added");
      setOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => {
      invalidate();
      toast.success("Customer deleted");
      setConfirm(null);
    },
    onError: (e) => {
      toast.error(apiError(e));
      setConfirm(null);
    },
  });

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    createMut.mutate({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    });
  };

  const columns = [
    {
      key: "full_name",
      header: "Customer",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.full_name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{r.full_name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted sm:hidden">
              <Mail size={12} className="text-slate-400" /> {r.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      className: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Mail size={14} className="text-slate-400" /> {r.email}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) =>
        r.phone ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
            <Phone size={13} className="text-slate-400" /> {r.phone}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (r) => (
        <Button size="icon" variant="ghost" onClick={() => setConfirm(r)} aria-label={`Delete ${r.full_name}`}>
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <MiniStat label="Customers" value={all.length} icon={Users} tone="sky" />
        <MiniStat label="With phone" value={withPhone} icon={UserCheck} tone="indigo" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone…" />
        <Button onClick={openCreate}>
          <Plus size={16} /> Add customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        empty={
          q ? (
            <EmptyState icon={Users} title="No matching customers" message={`Nothing matches “${search}”.`} />
          ) : (
            <EmptyState
              icon={Users}
              title="No customers yet"
              message="Add a customer before creating orders."
              action={
                <Button onClick={openCreate}>
                  <Plus size={16} /> Add customer
                </Button>
              }
            />
          )
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={createMut.isPending}>
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" required error={errors.full_name}>
            <input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ava Thompson" />
          </Field>
          <Field label="Email address" required error={errors.email}>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ava@example.com" />
          </Field>
          <Field label="Phone number" error={errors.phone}>
            <input type="tel" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1-555-0100" />
          </Field>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        loading={delMut.isPending}
        title="Delete customer"
        message={`Delete "${confirm?.full_name}"? This cannot be undone.`}
        onConfirm={() => delMut.mutate(confirm.id)}
      />
    </div>
  );
}
