"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JobDrawer from "./JobDrawer";
import { STATUSES, type Job, type JobInput, type Status } from "@/lib/types";
import { fmtDate, followDue, progress, statusColor, today } from "@/lib/ui";

type View = "board" | "list";

type Props = {
  user: { name: string; email: string; image: string };
  logoutAction: () => Promise<void>;
};

export default function Board({ user, logoutAction }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<View>("board");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dragId = useRef<string | null>(null);
  const pending = useRef<Record<string, JobInput>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const chains = useRef<Record<string, Promise<void>>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  // ---- load ----
  useEffect(() => {
    try {
      const v = localStorage.getItem("jt-view");
      if (v === "board" || v === "list") setView(v);
    } catch {}
    fetch("/api/jobs")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return Promise.reject();
        }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((data: Job[]) => {
        setJobs(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem("jt-view", v);
    } catch {}
  };

  // ---- mutations (optimistic, satu request per lamaran pada satu waktu) ----
  const patch = useCallback(
    (id: string, changes: JobInput, delay = 0) => {
      setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...changes } : j)));
      pending.current[id] = { ...pending.current[id], ...changes };
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        const body = pending.current[id];
        delete pending.current[id];
        if (!body) return;
        chains.current[id] = (chains.current[id] ?? Promise.resolve())
          .then(async () => {
            const r = await fetch(`/api/jobs/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Gagal menyimpan");
          })
          .catch((e: Error) => showToast(`${e.message}. Coba ubah lagi.`));
      }, delay);
    },
    [showToast],
  );

  const setStatus = useCallback(
    (job: Job, status: Status) => {
      if (job.status === status) return;
      const changes: JobInput = { status };
      if (status !== "wishlist" && !job.appliedDate) changes.appliedDate = today();
      patch(job.id, changes);
    },
    [patch],
  );

  const create = async (status: Status = "wishlist") => {
    try {
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, appliedDate: status === "wishlist" ? null : today() }),
      });
      if (!r.ok) throw new Error();
      const job: Job = await r.json();
      setJobs((js) => [job, ...js]);
      setOpenId(job.id);
    } catch {
      showToast("Gagal membuat lamaran. Pastikan database berjalan.");
    }
  };

  const remove = async (id: string) => {
    clearTimeout(timers.current[id]);
    delete pending.current[id];
    setOpenId(null);
    const prev = jobs;
    setJobs((js) => js.filter((j) => j.id !== id));
    await chains.current[id];
    const r = await fetch(`/api/jobs/${id}`, { method: "DELETE" }).catch(() => null);
    if (!r || (!r.ok && r.status !== 404)) {
      setJobs(prev);
      showToast("Gagal menghapus lamaran.");
    } else showToast("Lamaran dihapus");
  };

  // ---- derived ----
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => !q || `${j.company} ${j.role} ${j.location}`.toLowerCase().includes(q));
  }, [jobs, query]);

  const stats = useMemo(() => {
    const c = (s: Status) => jobs.filter((j) => j.status === s).length;
    const sent = jobs.filter((j) => j.status !== "wishlist").length;
    const due = jobs.filter(followDue).length;
    const items: [string | number, string][] = [
      [jobs.length, "Total"],
      [sent, "Terkirim"],
      [c("interview"), "Interview"],
      [c("offer"), "Offer"],
      [sent ? `${Math.round(((c("interview") + c("offer")) / sent) * 100)}%` : "–", "Lolos ke interview"],
    ];
    if (due) items.push([due, "Perlu follow up"]);
    return items;
  }, [jobs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openJob = jobs.find((j) => j.id === openId) ?? null;

  return (
    <>
      <div className="wrap">
        <header className="top">
          <div>
            <h1>Lamaran Kerja</h1>
            <div className="sub">Pantau setiap lamaran dari wishlist sampai offer.</div>
          </div>
          <form action={logoutAction} className="account">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" width={30} height={30} referrerPolicy="no-referrer" />
            ) : (
              <span className="avatar">{(user.name || user.email).charAt(0).toUpperCase()}</span>
            )}
            <span className="who">
              <b>{user.name || user.email}</b>
              {user.name && <small>{user.email}</small>}
            </span>
            <button className="btn" type="submit">Keluar</button>
          </form>
        </header>

        <div className="stats">
          {stats.map(([n, l]) => (
            <div className="stat" key={l}>
              <b>{n}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>

        <div className="toolbar">
          <div className="seg" role="group" aria-label="Tampilan">
            <button aria-pressed={view === "board"} onClick={() => changeView("board")}>Board</button>
            <button aria-pressed={view === "list"} onClick={() => changeView("list")}>List</button>
          </div>
          <input
            id="search"
            className="search"
            type="search"
            placeholder="Cari perusahaan atau posisi…"
            aria-label="Cari"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn primary" onClick={() => create("wishlist")} disabled={state !== "ready"}>
            + Lamaran baru
          </button>
        </div>

        <main>
          {state === "loading" && <div className="empty-col">Memuat lamaran…</div>}

          {state === "error" && (
            <div className="error-box">
              <b>Tidak bisa terhubung ke database.</b>
              <span>
                Jalankan Postgres dengan <code>docker compose up -d db</code>, pastikan{" "}
                <code>DATABASE_URL</code> di <code>.env.local</code> benar, lalu muat ulang halaman.
              </span>
            </div>
          )}

          {state === "ready" && view === "board" && (
            <div className="board-scroll">
              <div className="board">
                {STATUSES.map((s) => {
                  const items = visible.filter((j) => j.status === s.id);
                  return (
                    <section
                      key={s.id}
                      className={`col${overCol === s.id ? " over" : ""}`}
                      style={{ "--c": statusColor(s.id) } as React.CSSProperties}
                      onDragOver={(e) => {
                        if (!dragId.current) return;
                        e.preventDefault();
                        setOverCol(s.id);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const job = jobs.find((j) => j.id === dragId.current);
                        dragId.current = null;
                        setOverCol(null);
                        if (job) setStatus(job, s.id);
                      }}
                    >
                      <div className="col-h">
                        <span className="dot" />
                        {s.label}
                        <span className="n">{items.length}</span>
                      </div>
                      {items.map((j) => (
                        <JobCard
                          key={j.id}
                          job={j}
                          onOpen={() => setOpenId(j.id)}
                          onDragStart={() => (dragId.current = j.id)}
                        />
                      ))}
                      {!jobs.length && s.id === "wishlist" && (
                        <div className="empty-col">Belum ada lamaran. Tambahkan perusahaan incaranmu di sini.</div>
                      )}
                      <button className="add-in" onClick={() => create(s.id)}>+ Tambah</button>
                    </section>
                  );
                })}
              </div>
            </div>
          )}

          {state === "ready" && view === "list" &&
            (visible.length ? (
              <div className="list-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Perusahaan</th>
                      <th>Posisi</th>
                      <th>Status</th>
                      <th>Tgl lamar</th>
                      <th>Follow up</th>
                      <th>Checklist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((j) => {
                      const p = progress(j);
                      return (
                        <tr
                          key={j.id}
                          className="row"
                          tabIndex={0}
                          onClick={() => setOpenId(j.id)}
                          onKeyDown={(e) => e.key === "Enter" && setOpenId(j.id)}
                        >
                          <td><b>{j.company || "Tanpa nama"}</b></td>
                          <td>{j.role}</td>
                          <td>
                            <span className="pill" style={{ "--c": statusColor(j.status) } as React.CSSProperties}>
                              <span className="dot" />
                              {STATUSES.find((s) => s.id === j.status)?.label}
                            </span>
                          </td>
                          <td className="mono">{fmtDate(j.appliedDate) || "–"}</td>
                          <td className="mono" style={followDue(j) ? { color: "var(--warn)" } : undefined}>
                            {fmtDate(j.followUp) || "–"}
                          </td>
                          <td className="mono">{p.total ? `${p.done}/${p.total}` : "–"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="notice">Tidak ada lamaran yang cocok.</div>
            ))}
        </main>
      </div>

      {openJob && (
        <JobDrawer
          key={openJob.id}
          job={openJob}
          onClose={() => setOpenId(null)}
          onPatch={(changes, delay) => patch(openJob.id, changes, delay)}
          onStatus={(s) => setStatus(openJob, s)}
          onDelete={() => remove(openJob.id)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

function JobCard({ job, onOpen, onDragStart }: { job: Job; onOpen: () => void; onDragStart: () => void }) {
  const [dragging, setDragging] = useState(false);
  const p = progress(job);
  return (
    <button
      className={`card${dragging ? " dragging" : ""}`}
      draggable
      style={{ "--c": statusColor(job.status) } as React.CSSProperties}
      onClick={onOpen}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", job.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
    >
      <div className="co">{job.company || "Tanpa nama"}</div>
      {job.role && <div className="ro">{job.role}</div>}
      <div className="meta">
        {job.priority === "high" && <span className="prio high">Prioritas</span>}
        {job.appliedDate && <span>{fmtDate(job.appliedDate)}</span>}
        {followDue(job) && <span className="due">Follow up!</span>}
        {p.total > 0 && (
          <>
            <span className="prog" aria-hidden="true">
              <i style={{ width: `${(p.done / p.total) * 100}%` }} />
            </span>
            <span>{p.done}/{p.total}</span>
          </>
        )}
      </div>
    </button>
  );
}
