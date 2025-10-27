"use client";

import { useEffect, useState, useMemo } from "react";
import RequireAuth from "../../../components/RequireAuth";
import DashboardSidebar from "../../../components/DashboardSidebar";
import { supabaseBrowser } from "../../../supabase/client";

type BudgetRow = {
  id: string;
  category: string;
  description: string | null;
  planned_cents: number;
  actual_cents: number;
};

function dollars(nCents: number) {
  return `$${(nCents / 100).toLocaleString()}`;
}

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

export default function CoupleBudgetPage() {
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [plannedInputs, setPlannedInputs] = useState<Record<string, string>>({});
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({});
  const [catInputs, setCatInputs] = useState<Record<string, string>>({});
  const [descInputs, setDescInputs] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPlanned, setNewPlanned] = useState("");
  const [newActual, setNewActual] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // fetch budget + total paid via WedFlex (payments table status escrowed/released)
  const totalBookedOnWedflex = useMemo(() => {
    // You could also fetch this from payments (sum for this couple).
    // For now assume we might compute it later dynamically.
    return 0;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        const { data, error } = await sb
          .from("budget_items")
          .select("*")
          .eq("couple_id", uid)
          .order("created_at", { ascending: true });
        if (error) throw error;

        // init local state
        const list = (data || []) as BudgetRow[];
        setRows(list);

        // initialize editable inputs so typing is smooth
        const newPlannedMap: Record<string, string> = {};
        const newActualMap: Record<string, string> = {};
        const newCatMap: Record<string, string> = {};
        const newDescMap: Record<string, string> = {};
        for (const r of list) {
          newPlannedMap[r.id] = (r.planned_cents / 100).toString();
          newActualMap[r.id] = (r.actual_cents / 100).toString();
          newCatMap[r.id] = r.category;
          newDescMap[r.id] = r.description ?? "";
        }
        setPlannedInputs(newPlannedMap);
        setActualInputs(newActualMap);
        setCatInputs(newCatMap);
        setDescInputs(newDescMap);
      } catch (e) {
        setErr(toErrorString(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plannedTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.planned_cents, 0);
  }, [rows]);

  const actualTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.actual_cents, 0);
  }, [rows]);

  async function saveRow(id: string) {
    try {
      setSaving(true);
      setErr(null);

      const sb = supabaseBrowser();
      const plannedNum = Math.round(
        parseFloat(plannedInputs[id] || "0") * 100
      );
      const actualNum = Math.round(
        parseFloat(actualInputs[id] || "0") * 100
      );
      const catVal = catInputs[id] || "";
      const descVal = descInputs[id] || "";

      const { error } = await sb
        .from("budget_items")
        .update({
          category: catVal,
          description: descVal,
          planned_cents: plannedNum,
          actual_cents: actualNum,
        })
        .eq("id", id);

      if (error) throw error;

      // update local rows[]
      setRows((old) =>
        old.map((r) =>
          r.id === id
            ? {
                ...r,
                category: catVal,
                description: descVal,
                planned_cents: plannedNum,
                actual_cents: actualNum,
              }
            : r
        )
      );
    } catch (e) {
      setErr(toErrorString(e));
    } finally {
      setSaving(false);
    }
  }

  async function addRow() {
    try {
      setSaving(true);
      setErr(null);

      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) throw new Error("Not authenticated");

      const plannedNum = Math.round(parseFloat(newPlanned || "0") * 100);
      const actualNum = Math.round(parseFloat(newActual || "0") * 100);

      const { data, error } = await sb
        .from("budget_items")
        .insert({
          couple_id: me.user.id,
          category: newCat || "Other",
          description: newDesc || "",
          planned_cents: plannedNum,
          actual_cents: actualNum,
        })
        .select("*")
        .single();

      if (error) throw error;

      const row = data as BudgetRow;

      setRows((old) => [...old, row]);

      setCatInputs((m) => ({ ...m, [row.id]: row.category }));
      setDescInputs((m) => ({ ...m, [row.id]: row.description ?? "" }));
      setPlannedInputs((m) => ({
        ...m,
        [row.id]: (row.planned_cents / 100).toString(),
      }));
      setActualInputs((m) => ({
        ...m,
        [row.id]: (row.actual_cents / 100).toString(),
      }));

      // clear new-row inputs
      setNewCat("");
      setNewDesc("");
      setNewPlanned("");
      setNewActual("");
    } catch (e) {
      setErr(toErrorString(e));
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
            <p className="text-sm opacity-70">
              Track your wedding budget, what you have planned vs what you have
              actually booked and spent — plus what you have already booked on
              WedFlex.
            </p>
          </header>

          {err && (
            <p className="text-red-600 text-sm break-words">
              Error: {err}
            </p>
          )}

          {loading ? (
            <p>Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-xs opacity-70">Planned Total</div>
                  <div className="text-xl font-semibold">
                    {dollars(plannedTotal)}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-xs opacity-70">Actual Total</div>
                  <div className="text-xl font-semibold">
                    {dollars(actualTotal)}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-xs opacity-70">
                    Booked on WedFlex
                  </div>
                  <div className="text-xl font-semibold">
                    {dollars(totalBookedOnWedflex * 100 /* placeholder */)}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-xs opacity-70">
                    Difference (Planned vs Actual)
                  </div>
                  <div className="text-xl font-semibold">
                    {dollars(actualTotal - plannedTotal)}
                  </div>
                </div>
              </div>

              <section className="border rounded-lg p-4 space-y-4">
                <h2 className="font-semibold">Your Budget Items</h2>

                {rows.length === 0 ? (
                  <p className="text-sm opacity-70">
                    No budget items yet. Add your first below.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {rows.map((r) => (
                      <li
                        key={r.id}
                        className="border rounded p-3 text-sm grid gap-3 md:grid-cols-4"
                      >
                        <div className="flex flex-col gap-2">
                          <label className="text-xs opacity-70">
                            Category
                          </label>
                          <input
                            className="border rounded px-2 py-1 text-sm"
                            value={catInputs[r.id] ?? ""}
                            onChange={(e) =>
                              setCatInputs((m) => ({
                                ...m,
                                [r.id]: e.target.value,
                              }))
                            }
                          />
                          <label className="text-xs opacity-70">
                            Description
                          </label>
                          <input
                            className="border rounded px-2 py-1 text-sm"
                            value={descInputs[r.id] ?? ""}
                            onChange={(e) =>
                              setDescInputs((m) => ({
                                ...m,
                                [r.id]: e.target.value,
                              }))
                            }
                            placeholder="Flowers, DJ deposit, etc."
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-xs opacity-70">
                            Planned ($)
                          </label>
                          <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm"
                            value={plannedInputs[r.id] ?? ""}
                            onChange={(e) =>
                              setPlannedInputs((m) => ({
                                ...m,
                                [r.id]: e.target.value,
                              }))
                            }
                          />
                          <label className="text-xs opacity-70">
                            Actual ($)
                          </label>
                          <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm"
                            value={actualInputs[r.id] ?? ""}
                            onChange={(e) =>
                              setActualInputs((m) => ({
                                ...m,
                                [r.id]: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="flex flex-col justify-end">
                          <button
                            className="bg-purple-700 text-white rounded px-3 py-2 text-xs"
                            disabled={saving}
                            onClick={() => saveRow(r.id)}
                          >
                            {saving ? "Saving…" : "Save Row"}
                          </button>
                        </div>

                        <div className="text-xs opacity-70 self-end md:self-start">
                          Planned: {dollars(r.planned_cents)} <br />
                          Actual: {dollars(r.actual_cents)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add new item row */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">
                    Add Budget Item
                  </h3>
                  <div className="grid gap-3 md:grid-cols-4 text-sm">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs opacity-70">
                        Category
                      </label>
                      <input
                        className="border rounded px-2 py-1 text-sm"
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                        placeholder="Flowers"
                      />
                      <label className="text-xs opacity-70">
                        Description
                      </label>
                      <input
                        className="border rounded px-2 py-1 text-sm"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Bridal bouquet"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs opacity-70">
                        Planned ($)
                      </label>
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm"
                        value={newPlanned}
                        onChange={(e) => setNewPlanned(e.target.value)}
                        placeholder="500"
                      />
                      <label className="text-xs opacity-70">
                        Actual ($)
                      </label>
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm"
                        value={newActual}
                        onChange={(e) => setNewActual(e.target.value)}
                        placeholder="450"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <button
                        className="bg-purple-700 text-white rounded px-3 py-2 text-xs"
                        disabled={saving}
                        onClick={addRow}
                      >
                        {saving ? "Adding…" : "Add Item"}
                      </button>
                    </div>

                    <div className="text-xs opacity-70 self-end md:self-start">
                      WedFlex booked so far: {dollars(totalBookedOnWedflex * 100 /* placeholder */)}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
