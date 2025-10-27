"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import DashboardSidebar from "../../../components/DashboardSidebar";
import { supabaseBrowser } from "../../../supabase/client";

type BudgetLine = {
  id: string;
  label: string;
  planned_cents: number;
  actual_cents: number;
};

export default function CoupleBudgetPage() {
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // local "new row" inputs
  const [newLabel, setNewLabel] = useState("");
  const [newPlanned, setNewPlanned] = useState<string>("");
  const [newActual, setNewActual] = useState<string>("");

  // Load budget rows for the logged-in couple
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) {
          throw new Error("Not authenticated");
        }

        const uid = me.user.id;

        const { data, error } = await sb
          .from("wedding_budget")
          .select("id,label,planned_cents,actual_cents")
          .eq("couple_id", uid)
          .order("label", { ascending: true });

        if (error) throw error;

        // initialize local editable state
        const safeRows = (data ?? []).map((row) => ({
          id: row.id,
          label: row.label ?? "",
          planned_cents: row.planned_cents ?? 0,
          actual_cents: row.actual_cents ?? 0,
        }));

        setLines(safeRows);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived totals
  const totals = useMemo(() => {
    let totalPlanned = 0;
    let totalActual = 0;
    for (const l of lines) {
      totalPlanned += l.planned_cents || 0;
      totalActual += l.actual_cents || 0;
    }
    return {
      totalPlanned,
      totalActual,
      remaining: totalPlanned - totalActual,
    };
  }, [lines]);

  // Update one field in an existing budget row (local only)
  function updateLine(id: string, field: "label" | "planned_cents" | "actual_cents", value: string) {
    setLines((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "label") {
          return { ...row, label: value };
        }
        // money fields come in as strings from <input type="number" />
        const num = Number(value);
        return {
          ...row,
          [field]: Number.isFinite(num) ? Math.round(num * 100) : 0, // store as cents
        } as BudgetLine;
      })
    );
  }

  // Because we're storing in cents inside state, we need helper to display dollars
  function dollarsFromCents(cents: number | undefined): string {
    if (!Number.isFinite(cents)) return "";
    return (Math.round(cents || 0) / 100).toString();
  }

  // Add brand-new row to local state (not saved yet)
  function addNewLine() {
    if (!newLabel.trim()) return;
    const plannedNum = Number(newPlanned);
    const actualNum = Number(newActual);

    const newRow: BudgetLine = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      planned_cents: Number.isFinite(plannedNum)
        ? Math.round(plannedNum * 100)
        : 0,
      actual_cents: Number.isFinite(actualNum)
        ? Math.round(actualNum * 100)
        : 0,
    };

    setLines((prev) => [...prev, newRow]);
    setNewLabel("");
    setNewPlanned("");
    setNewActual("");
  }

  // Persist all lines back to Supabase
  async function saveAll() {
    try {
      setSaving(true);
      setMsg(null);
      setErr(null);

      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) throw new Error("Not authenticated");
      const uid = me.user.id;

      // We'll upsert each row for this couple_id
      // (so both existing and new rows are saved)
      const payload = lines.map((l) => ({
        id: l.id,
        couple_id: uid,
        label: l.label,
        planned_cents: l.planned_cents ?? 0,
        actual_cents: l.actual_cents ?? 0,
      }));

      const { error } = await sb.from("wedding_budget").upsert(payload, {
        onConflict: "id",
      });
      if (error) throw error;

      setMsg("Budget saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="couple" />

        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Budget</h1>
            <p className="text-sm text-slate-600">
              Track what you planned to spend vs what you’ve actually booked (including WedFlex).
            </p>
          </header>

          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600 text-sm">Error: {err}</p>}

          {!loading && !err && (
            <>
              {/* Summary KPIs */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-xs uppercase text-slate-500">Planned Total</div>
                  <div className="text-xl font-semibold">
                    ${ (totals.totalPlanned / 100).toLocaleString() }
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-xs uppercase text-slate-500">Actual / Booked So Far</div>
                  <div className="text-xl font-semibold">
                    ${ (totals.totalActual / 100).toLocaleString() }
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-xs uppercase text-slate-500">Remaining</div>
                  <div className="text-xl font-semibold">
                    ${ (totals.remaining / 100).toLocaleString() }
                  </div>
                </div>
              </section>

              {/* Editable budget table */}
              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-3">Your Budget Lines</h2>

                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr] gap-2 text-xs text-slate-500 mb-2">
                  <div>Category / Description</div>
                  <div className="text-right">Planned $</div>
                  <div className="text-right">Actual $</div>
                </div>

                <ul className="space-y-3">
                  {lines.map((row) => (
                    <li
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2 items-start"
                    >
                      {/* Label */}
                      <input
                        className="border rounded px-3 py-2 text-sm w-full"
                        value={row.label}
                        onChange={(e) =>
                          updateLine(row.id, "label", e.target.value)
                        }
                        placeholder="Flowers, DJ, Venue deposit…"
                      />

                      {/* Planned dollars */}
                      <input
                        className="border rounded px-3 py-2 text-sm w-full text-right"
                        type="number"
                        min={0}
                        step="0.01"
                        value={dollarsFromCents(row.planned_cents)}
                        onChange={(e) =>
                          updateLine(row.id, "planned_cents", e.target.value)
                        }
                        placeholder="0.00"
                      />

                      {/* Actual dollars */}
                      <input
                        className="border rounded px-3 py-2 text-sm w-full text-right"
                        type="number"
                        min={0}
                        step="0.01"
                        value={dollarsFromCents(row.actual_cents)}
                        onChange={(e) =>
                          updateLine(row.id, "actual_cents", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </li>
                  ))}
                </ul>

                {/* Add new line inline */}
                <div className="mt-6 border-t pt-4 grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
                  <input
                    className="border rounded px-3 py-2 text-sm w-full"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="New item (ex. Bartender)"
                  />
                  <input
                    className="border rounded px-3 py-2 text-sm w-full text-right"
                    type="number"
                    min={0}
                    step="0.01"
                    value={newPlanned}
                    onChange={(e) => setNewPlanned(e.target.value)}
                    placeholder="0.00"
                  />
                  <input
                    className="border rounded px-3 py-2 text-sm w-full text-right"
                    type="number"
                    min={0}
                    step="0.01"
                    value={newActual}
                    onChange={(e) => setNewActual(e.target.value)}
                    placeholder="0.00"
                  />
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      onClick={addNewLine}
                      className="bg-purple-700 text-white text-xs font-medium px-3 py-2 rounded hover:bg-purple-800"
                    >
                      + Add Line
                    </button>
                  </div>
                </div>
              </section>

              {/* Save button & messages */}
              <div className="flex items-center gap-3">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="bg-purple-700 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Budget"}
                </button>

                {msg && (
                  <span className="text-green-700 text-sm">{msg}</span>
                )}
                {err && (
                  <span className="text-red-600 text-sm">Error: {err}</span>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
