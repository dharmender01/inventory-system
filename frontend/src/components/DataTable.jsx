import { cn } from "../lib/cn";
import EmptyState from "./EmptyState";
import { TableSkeleton } from "./Skeleton";

export default function DataTable({
  columns,
  rows,
  loading,
  error,
  onRetry,
  empty,
  keyField = "id",
  onRowClick,
}) {
  if (loading) return <TableSkeleton columns={columns.length} />;

  if (error) {
    return (
      <div className="animate-fade-in rounded-xl border border-border bg-surface py-16 text-center shadow-card">
        <p className="mb-3 text-sm text-danger">Failed to load data.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="focus-ring cursor-pointer rounded text-sm text-primary underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!rows?.length) return empty || <EmptyState />;

  return (
    <div className="animate-fade-in overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr
              key={row[keyField]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "animate-fade-in-up transition-colors hover:bg-indigo-50/40",
                onRowClick && "cursor-pointer",
              )}
              style={{ animationDelay: `${Math.min(i * 28, 280)}ms` }}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3", c.cellClassName)}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
