"use client";

import { useEffect, useRef, useState } from "react";
import { STATUSES, type Job, type JobInput, type Status } from "@/lib/types";
import { progress, statusColor } from "@/lib/ui";

type Props = {
  job: Job;
  onClose: () => void;
  onPatch: (changes: JobInput, delay?: number) => void;
  onStatus: (s: Status) => void;
  onDelete: () => void;
};

export default function JobDrawer({ job, onClose, onPatch, onStatus, onDelete }: Props) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [newItem, setNewItem] = useState("");
  const companyRef = useRef<HTMLInputElement>(null);
  const p = progress(job);

  // Fokus ke nama perusahaan untuk lamaran yang baru dibuat
  useEffect(() => {
    if (!job.company) companyRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = (field: "company" | "role" | "location" | "salary" | "source" | "link" | "notes") => ({
    value: job[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onPatch({ [field]: e.target.value }, 600),
  });

  const setChecklist = (checklist: Job["checklist"]) => onPatch({ checklist });

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const t = newItem.trim();
    if (!t) return;
    setChecklist([...job.checklist, { text: t, done: false }]);
    setNewItem("");
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" aria-label="Detail lamaran">
        <div className="d-head">
          <span className="dot" style={{ "--c": statusColor(job.status) } as React.CSSProperties} />
          <h2>{job.company || "Lamaran baru"}</h2>
          <button className="x" aria-label="Tutup" onClick={onClose}>×</button>
        </div>

        <div className="d-body">
          <div className="field">
            <span className="sec-t">Status</span>
            <div className="status-pick">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  aria-pressed={job.status === s.id}
                  style={{ "--c": statusColor(s.id) } as React.CSSProperties}
                  onClick={() => onStatus(s.id)}
                >
                  <span className="dot" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label htmlFor="f-company">Perusahaan</label>
              <input id="f-company" ref={companyRef} placeholder="mis. Tokopedia" {...text("company")} />
            </div>
            <div className="field">
              <label htmlFor="f-role">Posisi</label>
              <input id="f-role" placeholder="mis. Fullstack Developer" {...text("role")} />
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label htmlFor="f-location">Lokasi / tipe</label>
              <input id="f-location" placeholder="Jakarta · Hybrid" {...text("location")} />
            </div>
            <div className="field">
              <label htmlFor="f-salary">Ekspektasi gaji</label>
              <input id="f-salary" placeholder="Rp 8–10 jt" {...text("salary")} />
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label htmlFor="f-applied">Tanggal lamar</label>
              <input
                id="f-applied"
                type="date"
                value={job.appliedDate ?? ""}
                onChange={(e) => onPatch({ appliedDate: e.target.value || null })}
              />
            </div>
            <div className="field">
              <label htmlFor="f-follow">Follow up</label>
              <input
                id="f-follow"
                type="date"
                value={job.followUp ?? ""}
                onChange={(e) => onPatch({ followUp: e.target.value || null })}
              />
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label htmlFor="f-source">Sumber</label>
              <input id="f-source" placeholder="LinkedIn, Glints, referral…" {...text("source")} />
            </div>
            <div className="field">
              <label htmlFor="f-prio">Prioritas</label>
              <select
                id="f-prio"
                value={job.priority}
                onChange={(e) => onPatch({ priority: e.target.value as Job["priority"] })}
              >
                <option value="normal">Normal</option>
                <option value="high">Tinggi</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-link">Link lowongan</label>
            <input id="f-link" placeholder="https://…" {...text("link")} />
            {/^https?:\/\//.test(job.link) && (
              <a className="link-open" href={job.link} target="_blank" rel="noopener noreferrer">
                Buka lowongan ↗
              </a>
            )}
          </div>

          <div className="field">
            <span className="sec-t">Checklist · {p.done}/{p.total}</span>
            <div className="checks">
              {job.checklist.map((c, i) => (
                <label key={i} className={`chk${c.done ? " done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={(e) =>
                      setChecklist(job.checklist.map((x, k) => (k === i ? { ...x, done: e.target.checked } : x)))
                    }
                  />
                  <span>{c.text}</span>
                  <button
                    className="rm"
                    aria-label="Hapus item"
                    onClick={(e) => {
                      e.preventDefault();
                      setChecklist(job.checklist.filter((_, k) => k !== i));
                    }}
                  >
                    ×
                  </button>
                </label>
              ))}
            </div>
            <form className="add-chk" onSubmit={addItem}>
              <input
                id="f-newchk"
                placeholder="Tambah item, mis. Siapkan portfolio"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
              />
              <button className="btn">Tambah</button>
            </form>
          </div>

          <div className="field">
            <label htmlFor="f-notes">Catatan</label>
            <textarea id="f-notes" placeholder="Nama recruiter, pertanyaan interview, kesan…" {...text("notes")} />
          </div>
        </div>

        <div className="d-foot">
          {confirmDel ? (
            <>
              <span className="muted">Hapus lamaran ini?</span>
              <button className="btn" onClick={() => setConfirmDel(false)}>Batal</button>
              <button className="btn danger" onClick={onDelete}>Ya, hapus</button>
            </>
          ) : (
            <>
              <span className="muted">Tersimpan otomatis</span>
              <button className="btn danger" onClick={() => setConfirmDel(true)}>Hapus</button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
