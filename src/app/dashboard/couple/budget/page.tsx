"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import DashboardSidebar from "../../../components/DashboardSidebar";
import { supabaseBrowser } from "../../../supabase/client";

type BudgetItem = {
  id: string;
  couple_id: string;
  name: string;
  category: string | null;
  planned_cents: number;
  actual_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  amount_cents: number;
  status: "escrowed" | "released" | "refunded";
};

const toDollars = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dollarsToCents = (v: string) => {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

export default function CoupleBudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [wedflexBookedCents, setWedflexBookedCents] = useState(0); // sum of payments (no status labeling)
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // New row draft
  const [draft, setDraft] = useState({
    name: "",
    category: "",
    planned: "",
    actual: "",
    notes: "",
  });

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<{ name: string; category: string; planned: string; actual: string; notes: string }>({
    name: "",
    category: "",
    planned: "",
    actual: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        // Load budget items (owner-only via RLS)
        const { data: rows, error: rErr } = await sb
          .from("budget_items")
          .select("*")
          .eq("couple_id", uid)
          .order("created_at", { ascending: true });
        if (rErr) throw rErr;

        // Load WedFlex payments and add them (no status labels exposed)
        const { data: pays, error: pErr } = await sb
          .from("payments")
          .select("amount_cents,status")
          .eq("couple_id", uid);
        if (pErr) throw pErr;

        // Sum of non-refunded payments — shown as “Booked on WedFlex”
        const booked = (pays ?? [])
          .filter((p: PaymentRow) => p.status !== "refunded")
          .reduce((s: number, p: PaymentRow) => s + (p.amount_cents || 0), 0);

        setItems((rows ?? []) as BudgetItem[]);
        setWedflexBookedCents(booked);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Totals (user-entered budget items)
  const plannedTotal = useMemo(
    () => items.reduce((s, i) => s + (i.planned_cents || 0), 0),
    [items]
  );
  const actualTotal = useMemo(
    () => items.reduce((s, i) => s + (i.actual_cents || 0), 0),
    [items]
  );

  const varianceCents = plannedTotal - (actualTotal + wedflexBookedCents);
  const remainingCents = Math.max(plannedTotal - (actualTotal + wedflexBookedCents), 0);

  async function addItem() {
    const sb = supabaseBrowser();
    const { data: me } = await sb.auth.getUser();
    if (!me?.user) return;

    const row = {
      couple_id: me.user.id,
      name: draft.name.trim(),
      category: draft.category.trim() || null,
      planned_cents: dollarsToCents(draft.planned),
      actual_cents: dollarsToCents(draft.actual),
      notes: draft.notes.trim() || null,
    };
    if (!row.name) return alert("Name is required");

    const { data, error } = await sb
      .from("budget_items")
      .insert(row)
      .select("*")
      .single();
    if (error) return alert(error.message);

    setItems((arr) => [...arr, data as BudgetItem]);
    setDraft({ name: "", category: "", planned: "", actual: "", notes: "" });
  }

  function startEdit(i: BudgetItem) {
    setEditingId(i.id);
    setEditRow({
      name: i.name,
      category: i.category ?? "",
      planned: (i.planned_cents / 100).toString(),
      actual: (i.actual_cents / 100).toString(),
      notes: i.notes ?? "",
    });
  }
function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <div className="text-sm mb-1">{label}</div>
      <input
        className="w-full border rounded px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

  async function saveEdit(id: string) {
    const sb = supabaseBrowser();
    const patch = {
      name: editRow.name.trim(),
      category: editRow.category.trim() || null,
      planned_cents: dollarsToCents(editRow.planned),
      actual_cents: dollarsToCents(editRow.actual),
      notes: editRow.notes.trim() || null,
    };
    if (!patch.name) return alert("Name is required");

    const { data, error } = await sb
      .from("budget_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return alert(error.message);

    setItems((arr) => arr.map((row) => (row.id === id ? (data as BudgetItem) : row)));
    setEditingId(null);
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this budget item?")) return;
    const sb = supabaseBrowser();
    const { error } = await sb.from("budget_items").delete().eq("id", id);
    if (error) return alert(error.message);
    setItems((arr) => arr.filter((x) => x.id !== id));
  }

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="couple" />
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">Wedding Budget</h1>
          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600">Error: {err}</p>}

          {!loading && !err && (
            <>
              {/* KPI Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi label="Planned Total" value={`$${toDollars(plannedTotal)}`} />
                <Kpi label="Actual (Manual Items)" value={`$${toDollars(actualTotal)}`} />
                <Kpi
                  label="Booked on WedFlex"
                  value={`$${toDollars(wedflexBookedCents)}`}
                />
                <Kpi 
                label="Remaining vs Planned" 
                value={`$${toDollars(remainingCents)}`} 
                />
                <Kpi
                  label="Variance (Planned - Actuals)"
                  value={`$${toDollars(varianceCents)}`}
                />
              </div>

              {/* Add Item */}
              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-3">Add Budget Line Item</h2>
                <div className="grid md:grid-cols-5 gap-3 items-end">
                  <TextField
                    label="Name *"
                    value={draft.name}
                    onChange={(v) => setDraft({ ...draft, name: v })}
                    placeholder="Venue"
                  />
                  <TextField
                    label="Category"
                    value={draft.category}
                    onChange={(v) => setDraft({ ...draft, category: v })}
                    placeholder="Deposit"
                  />
                  <TextField
                    label="Planned ($)"
                    value={draft.planned}
                    onChange={(v) => setDraft({ ...draft, planned: v })}
                    placeholder="2000"
                    inputMode="decimal"
                  />
                  <TextField
                    label="Actual ($)"
                    value={draft.actual}
                    onChange={(v) => setDraft({ ...draft, actual: v })}
                    placeholder="1500"
                    inputMode="decimal"
                  />
                  <button
                    onClick={addItem}
                    className="h-10 bg-purple-700 text-white rounded px-4"
                  >
                    Add Item
                  </button>
                </div>
                <div className="mt-3">
                  <label className="block text-sm mb-1">Notes</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    placeholder="Any additional detail…"
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                </div>
              </section>

              {/* Table */}
              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-3">Your Budget Items</h2>
                {items.length === 0 ? (
                  <p className="text-sm opacity-70">No items yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left">
                        <tr className="border-b">
                          <th className="py-2 pr-3">Name</th>
                          <th className="py-2 pr-3">Category</th>
                          <th className="py-2 pr-3">Planned</th>
                          <th className="py-2 pr-3">Actual</th>
                          <th className="py-2 pr-3">Notes</th>
                          <th className="py-2 pr-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((i) =>
                          editingId === i.id ? (
                            <tr key={i.id} className="border-b">
                              <td className="py-2 pr-3">
                                <input
                                  className="w-full border rounded px-2 py-1"
                                  value={editRow.name}
                                  onChange={(e) => setEditRow({ ...editRow, name: e.target.value })}
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  className="w-full border rounded px-2 py-1"
                                  value={editRow.category}
                                  onChange={(e) => setEditRow({ ...editRow, category: e.target.value })}
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  className="w-full border rounded px-2 py-1"
                                  inputMode="decimal"
                                  value={editRow.planned}
                                  onChange={(e) => setEditRow({ ...editRow, planned: e.target.value })}
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  className="w-full border rounded px-2 py-1"
                                  inputMode="decimal"
                                  value={editRow.actual}
                                  onChange={(e) => setEditRow({ ...editRow, actual: e.target.value })}
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  className="w-full border rounded px-2 py-1"
                                  value={editRow.notes}
                                  onChange={(e) => setEditRow({ ...editRow, notes: e.target.value })}
                                />
                              </td>
                              <td className="py-2 pr-3 text-right">
                                <button
                                  onClick={() => saveEdit(i.id)}
                                  className="mr-2 px-3 py-1 rounded bg-green-600 text-white"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1 rounded border"
                                >
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={i.id} className="border-b">
                              <td className="py-2 pr-3">{i.name}</td>
                              <td className="py-2 pr-3">{i.category ?? "—"}</td>
                              <td className="py-2 pr-3">${toDollars(i.planned_cents)}</td>
                              <td className="py-2 pr-3">${toDollars(i.actual_cents)}</td>
                              <td className="py-2 pr-3">{i.notes ?? "—"}</td>
                              <td className="py-2 pr-3 text-right">
                                <button
                                  onClick={() => startEdit(i)}
                                  className="mr-2 px-3 py-1 rounded border"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeItem(i.id)}
                                  className="px-3 py-1 rounded bg-red-600 text-white"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Summary */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard title="Planned Total" amountCents={plannedTotal} />
                <SummaryCard title="Actuals (Manual Items)" amountCents={actualTotal} />
                <SummaryCard title="Booked on WedFlex" amountCents={wedflexBookedCents} />
              </section>

              <div className="text-sm opacity-70">
                * “Booked on WedFlex” is the total of your payments on WedFlex (refunds excluded). We don’t show internal payment statuses here.
              </div>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3 bg-purple-50">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function SummaryCard({ title, amountCents }: { title: string; amountCents: number }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-xl font-semibold">${toDollars(amountCents)}</div>
    </div>
  );
}
