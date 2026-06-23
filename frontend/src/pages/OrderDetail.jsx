import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Package, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiError } from "../api/client";
import { deleteOrder, getOrder } from "../api/orders";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";
import Skeleton from "../components/Skeleton";
import { fmtDate, money, timeAgo } from "../lib/format";
import { useState } from "react";

function BackLink() {
  return (
    <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      <ArrowLeft size={16} /> Back to orders
    </Link>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => getOrder(id),
  });

  const delMut = useMutation({
    mutationFn: () => deleteOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Order cancelled");
      navigate("/orders");
    },
    onError: (e) => {
      toast.error(apiError(e));
      setConfirm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="rounded-xl border border-border bg-surface p-6 text-sm text-danger shadow-card">
          Order not found.
        </p>
      </div>
    );
  }

  const units = data.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="space-y-5">
      <BackLink />

      <div className="grid gap-5 lg:grid-cols-3">
        {}
        <div className="space-y-4 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-mono text-2xl font-semibold text-gradient">Order #{data.id}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <Calendar size={14} className="text-slate-400" />
                  <span title={fmtDate(data.created_at)}>{timeAgo(data.created_at)}</span>
                </p>
              </div>
              <Badge tone="success">{data.status}</Badge>
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Package size={16} className="text-slate-400" /> Items
              <span className="font-normal text-muted">({data.items.length})</span>
            </h3>
            <div className="space-y-2">
              {data.items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <Avatar name={it.product_name || `#${it.product_id}`} square />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{it.product_name || `Product #${it.product_id}`}</p>
                    <p className="font-mono text-xs text-muted">{it.product_sku || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">
                      <span className="font-mono tnum">{money(it.unit_price)}</span> × {it.quantity}
                    </p>
                    <p className="font-mono text-base font-semibold text-ink tnum">{money(it.line_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card lg:sticky lg:top-20">
            <h3 className="text-sm font-semibold text-ink">Summary</h3>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Line items</dt>
                <dd className="font-mono text-ink tnum">{data.items.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Total units</dt>
                <dd className="font-mono text-ink tnum">{units}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium text-ink">Total</span>
              <span className="font-mono text-2xl font-semibold text-gradient tnum">{money(data.total_amount)}</span>
            </div>
            <Button variant="danger" className="mt-5 w-full" onClick={() => setConfirm(true)}>
              <Trash2 size={16} /> Cancel order
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <h3 className="text-sm font-semibold text-ink">Customer</h3>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={data.customer_name || `#${data.customer_id}`} />
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{data.customer_name || "Unknown"}</p>
                <p className="font-mono text-xs text-muted">Customer #{data.customer_id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={delMut.isPending}
        title="Cancel order"
        confirmLabel="Cancel order"
        message={`Cancel order #${data.id}? Reserved stock will be returned to inventory.`}
        onConfirm={() => delMut.mutate()}
      />
    </div>
  );
}
