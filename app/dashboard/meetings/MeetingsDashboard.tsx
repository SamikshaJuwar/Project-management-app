"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarDays, Plus, Search, Filter, ChevronDown, X, Clock,
  Users, Link as LinkIcon, Mail, Calendar, FileText, CheckCircle2,
  XCircle, Loader2, MoreVertical, Trash2, SquarePen, Eye, AlertCircle,
  Building2, Globe,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; }
interface TeamMember { id: string; name: string | null; email: string; avatarUrl?: string | null; role: string; }

interface MOM {
  id: string; meetingId: string; attendeesNames: string;
  pointsDiscussed: string; description?: string | null;
  conclusion: string; goalsSet: string;
  createdAt: string; updatedAt: string;
}

interface Meeting {
  id: string; agenda: string; meetingType: string;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  points?: string | null;
  attendeeIds: string[];
  externalAttendees: string[];
  attendees?: TeamMember[];
  meetingLink?: string | null;
  dateTime: string; sendEmail: boolean; calendarSync: boolean;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt: string; mom?: MOM | null;
}

interface MeetingsDashboardProps {
  teamMembers: TeamMember[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtDateTimeLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_CONFIG = {
  SCHEDULED: { label: "Scheduled", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  COMPLETED:  { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  CANCELLED:  { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500" },
};

// ─── Small components ─────────────────────────────────────────────────────────

function Avatar({ user }: { user: { name?: string | null; email: string; avatarUrl?: string | null } }) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.name || ""} className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm">
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SCHEDULED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Add / Edit Meeting Modal ─────────────────────────────────────────────────

interface AddMeetingModalProps {
  teamMembers: TeamMember[];
  onClose: () => void;
  onSaved: (m: Meeting) => void;
  editMeeting?: Meeting | null;
}

function AddMeetingModal({ teamMembers, onClose, onSaved, editMeeting }: AddMeetingModalProps) {
  const isEdit = !!editMeeting;
  const [agenda, setAgenda] = useState(editMeeting?.agenda ?? "");
  const [meetingType, setMeetingType] = useState<"project" | "other">((editMeeting?.meetingType as "project" | "other") ?? "project");
  const [projectId, setProjectId] = useState(editMeeting?.projectId ?? "");
  const [points, setPoints] = useState(editMeeting?.points ?? "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(editMeeting?.attendeeIds ?? []);
  const [externalInput, setExternalInput] = useState("");
  const [externalAttendees, setExternalAttendees] = useState<string[]>(editMeeting?.externalAttendees ?? []);
  const [meetingLink, setMeetingLink] = useState(editMeeting?.meetingLink ?? "");
  const [dateTime, setDateTime] = useState(fmtDateTimeLocal(editMeeting?.dateTime));
  const [sendEmail, setSendEmail] = useState(editMeeting?.sendEmail ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch projects dynamically every time modal opens ──────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setProjectsLoading(true);
    setProjectsError("");
    fetch("/api/projects")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load projects");
        const data: Array<{ id: string; name: string }> = await res.json();
        if (!cancelled) setProjects(data.map((p) => ({ id: p.id, name: p.name })));
      })
      .catch((err) => {
        if (!cancelled) setProjectsError(err.message ?? "Could not load projects");
      })
      .finally(() => { if (!cancelled) setProjectsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleAttendee = (id: string) =>
    setAttendeeIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const addExternal = () => {
    const email = externalInput.trim();
    if (email && /\S+@\S+\.\S+/.test(email) && !externalAttendees.includes(email)) {
      setExternalAttendees(p => [...p, email]);
    }
    setExternalInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenda.trim() || !dateTime) { setError("Agenda and date/time are required."); return; }
    if (meetingType === "project" && !projectId) { setError("Please select a project."); return; }
    setSaving(true); setError("");
    try {
      const url = isEdit ? `/api/meetings/${editMeeting!.id}` : "/api/meetings";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agenda, meetingType,
          projectId: meetingType === "project" ? projectId : null,
          points: meetingType === "project" ? points : null,
          attendeeIds, externalAttendees,
          meetingLink: meetingLink || null,
          dateTime: new Date(dateTime).toISOString(),
          sendEmail,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to save"); }
      onSaved(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{isEdit ? "Edit Meeting" : "Schedule a Meeting"}</h2>
              <p className="text-xs text-gray-500">Fill in the details below</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Agenda */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Agenda *</label>
            <input
              value={agenda} onChange={e => setAgenda(e.target.value)}
              placeholder="Weekly standup, Sprint planning…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Meeting Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Meeting Type *</label>
            <div className="flex gap-3">
              {(["project", "other"] as const).map(type => (
                <label key={type} className={`flex items-center gap-2.5 flex-1 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${meetingType === type ? "bg-indigo-50 border-indigo-400 text-indigo-900" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  <input type="radio" name="meetingType" value={type} checked={meetingType === type}
                    onChange={() => setMeetingType(type)} className="accent-indigo-600" />
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    {type === "project" ? <Building2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    {type === "project" ? "Project Meeting" : "General / Other"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Project-only fields */}
          {meetingType === "project" && (
            <div className="space-y-4 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
              {/* Select Project */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Select Project *</label>
                {projectsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading projects…
                  </div>
                ) : projectsError ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 border border-red-200 rounded-xl bg-red-50 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" /> {projectsError}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 border border-amber-200 rounded-xl bg-amber-50 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No projects available. <a href="/dashboard/projects" target="_blank" className="underline font-semibold hover:text-amber-900">Please create a project first.</a></span>
                  </div>
                ) : (
                  <div className="relative">
                    <select value={projectId} onChange={e => setProjectId(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-gray-900 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all">
                      <option value="">Pick a project…</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Discussion Points */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Discussion Points</label>
                <textarea value={points} onChange={e => setPoints(e.target.value)} rows={3}
                  placeholder="Key topics to discuss…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none" />
              </div>

              {/* Internal Attendees */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Internal Attendees
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-gray-200 bg-white p-2">
                  {teamMembers.map(m => (
                    <label key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${attendeeIds.includes(m.id) ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={attendeeIds.includes(m.id)} onChange={() => toggleAttendee(m.id)} className="accent-indigo-600 w-4 h-4" />
                      <Avatar user={m} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.name || m.email}</p>
                        <p className="text-[11px] text-gray-400 truncate">{m.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* External Attendees */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> External Attendees
            </label>
            <div className="flex gap-2">
              <input value={externalInput} onChange={e => setExternalInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExternal())}
                placeholder="external@company.com"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              <button type="button" onClick={addExternal}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors">
                Add
              </button>
            </div>
            {externalAttendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {externalAttendees.map(email => (
                  <span key={email} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs text-gray-600">
                    <Mail className="w-3 h-3" /> {email}
                    <button type="button" onClick={() => setExternalAttendees(p => p.filter(x => x !== email))}
                      className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Date & Time *
            </label>
            <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>

          {/* Meeting Link */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> Meeting Link
            </label>
            <input value={meetingLink} onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/xxx or Zoom link…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>

          {/* Email Toggle */}
          <label className="flex items-center gap-3 cursor-pointer group w-fit">
            <div onClick={() => setSendEmail(p => !p)}
              className={`w-10 h-5 rounded-full transition-colors relative ${sendEmail ? "bg-indigo-500" : "bg-gray-200"}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-800 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Notifications
            </span>
          </label>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit as never} disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
            {saving ? "Saving…" : isEdit ? "Update Meeting" : "Schedule Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MOM Modal ────────────────────────────────────────────────────────────────

function MOMModal({ meeting, onClose, onSaved }: { meeting: Meeting; onClose: () => void; onSaved: (m: Meeting) => void }) {
  const existing = meeting.mom;
  const [attendeesNames, setAttendeesNames] = useState(existing?.attendeesNames ?? "");
  const [pointsDiscussed, setPointsDiscussed] = useState(existing?.pointsDiscussed ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [conclusion, setConclusion] = useState(existing?.conclusion ?? "");
  const [goalsSet, setGoalsSet] = useState(existing?.goalsSet ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeesNames.trim() || !pointsDiscussed.trim() || !conclusion.trim() || !goalsSet.trim()) {
      setError("All required fields must be filled."); return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/mom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeesNames, pointsDiscussed, description: description || null, conclusion, goalsSet }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const updated = await fetch(`/api/meetings/${meeting.id}`);
      onSaved(await updated.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Minutes of Meeting</h2>
              <p className="text-xs text-gray-500 truncate max-w-xs">{meeting.agenda}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {[
            { label: "Attendees Present *", value: attendeesNames, set: setAttendeesNames, placeholder: "John, Jane, Bob…", rows: 2 },
            { label: "Points Discussed *", value: pointsDiscussed, set: setPointsDiscussed, placeholder: "1. Review sprint progress\n2. Blockers…", rows: 4 },
            { label: "Description / Notes", value: description, set: setDescription, placeholder: "Additional context…", rows: 3 },
            { label: "Conclusion *", value: conclusion, set: setConclusion, placeholder: "Final decision or outcome…", rows: 2 },
            { label: "Goals Set *", value: goalsSet, set: setGoalsSet, placeholder: "1. Complete feature X by Friday…", rows: 3 },
          ].map(({ label, value, set, placeholder, rows }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
              <textarea value={value} onChange={e => set(e.target.value)} rows={rows} placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none" />
            </div>
          ))}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit as never} disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {saving ? "Saving…" : existing ? "Update MOM" : "Save MOM"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MOM View Modal ───────────────────────────────────────────────────────────

function MOMViewModal({ meeting, onClose, onEdit }: { meeting: Meeting; onClose: () => void; onEdit: () => void }) {
  const mom = meeting.mom!;
  const rows = [
    { label: "Attendees Present", value: mom.attendeesNames, icon: <Users className="w-4 h-4" />, accent: "text-indigo-600" },
    { label: "Points Discussed", value: mom.pointsDiscussed, icon: <FileText className="w-4 h-4" />, accent: "text-blue-600" },
    { label: "Description", value: mom.description, icon: <Eye className="w-4 h-4" />, accent: "text-gray-500" },
    { label: "Conclusion", value: mom.conclusion, icon: <CheckCircle2 className="w-4 h-4" />, accent: "text-emerald-600" },
    { label: "Goals Set", value: mom.goalsSet, icon: <Calendar className="w-4 h-4" />, accent: "text-violet-600" },
  ].filter(r => r.value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">MOM — {meeting.agenda}</h2>
              <p className="text-xs text-gray-500">{fmtDate(meeting.dateTime)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {rows.map(({ label, value, icon, accent }) => (
            <div key={label} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className={`flex items-center gap-2 text-xs font-semibold mb-1.5 uppercase tracking-wide ${accent}`}>
                {icon} {label}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">Close</button>
          <button onClick={onEdit} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors shadow-sm">
            <SquarePen className="w-4 h-4" /> Edit MOM
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function MeetingsDashboard({ teamMembers }: MeetingsDashboardProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Projects fetched dynamically (for filter dropdown) ─────────────────────
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; name: string }>) =>
        setProjects(data.map(p => ({ id: p.id, name: p.name })))
      )
      .catch(() => {});
  }, []);

  const [showAdd, setShowAdd] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [momMeeting, setMomMeeting] = useState<Meeting | null>(null);
  const [viewMomMeeting, setViewMomMeeting] = useState<Meeting | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/meetings");
      if (res.ok) setMeetings(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSaved = (m: Meeting) => {
    setMeetings(prev => {
      const idx = prev.findIndex(x => x.id === m.id);
      return idx >= 0 ? prev.with(idx, m) : [m, ...prev];
    });
    setShowAdd(false); setEditMeeting(null);
  };

  const handleMOMSaved = (m: Meeting) => {
    setMeetings(prev => prev.map(x => x.id === m.id ? m : x));
    setMomMeeting(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setMeetings(p => p.filter(x => x.id !== id));
    setOpenMenuId(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMeetings(p => p.map(m => m.id === id ? updated : m));
    }
    setOpenMenuId(null);
  };

  // Stats
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7);
  const stats = {
    total: meetings.length,
    thisWeek: meetings.filter(m => { const d = new Date(m.dateTime); return d >= startOfWeek && d < endOfWeek; }).length,
    completed: meetings.filter(m => m.status === "COMPLETED").length,
    pendingMOM: meetings.filter(m => m.status === "COMPLETED" && !m.mom).length,
  };

  const filtered = meetings.filter(m => {
    const q = search.toLowerCase();
    if (q && !m.agenda.toLowerCase().includes(q) && !m.project?.name.toLowerCase().includes(q)) return false;
    if (filterProject !== "all" && m.projectId !== filterProject) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-8">
      {/* Modals */}
      {(showAdd || editMeeting) && (
        <AddMeetingModal teamMembers={teamMembers}
          onClose={() => { setShowAdd(false); setEditMeeting(null); }}
          onSaved={handleSaved} editMeeting={editMeeting} />
      )}
      {momMeeting && (
        <MOMModal meeting={momMeeting} onClose={() => setMomMeeting(null)} onSaved={handleMOMSaved} />
      )}
      {viewMomMeeting && (
        <MOMViewModal meeting={viewMomMeeting} onClose={() => setViewMomMeeting(null)}
          onEdit={() => { setMomMeeting(viewMomMeeting); setViewMomMeeting(null); }} />
      )}

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Meetings</h1>
            </div>
            <p className="text-sm text-gray-500 ml-13 pl-[52px]">Schedule, track, and document project meetings</p>
          </div>
          <button
            id="add-meeting-btn"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Add Meeting
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Meetings", value: stats.total, icon: <CalendarDays className="w-5 h-5" />, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", valuColor: "text-indigo-700" },
            { label: "This Week", value: stats.thisWeek, icon: <Clock className="w-5 h-5" />, iconBg: "bg-blue-100", iconColor: "text-blue-600", valuColor: "text-blue-700" },
            { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="w-5 h-5" />, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", valuColor: "text-emerald-700" },
            { label: "Pending MOM", value: stats.pendingMOM, icon: <FileText className="w-5 h-5" />, iconBg: "bg-amber-100", iconColor: "text-amber-600", valuColor: "text-amber-700" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center ${s.iconColor} shrink-0`}>
                {s.icon}
              </div>
              <div>
                <div className={`text-2xl font-bold ${s.valuColor}`}>{s.value}</div>
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings…"
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-gray-50 transition-all" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="relative">
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="appearance-none border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all">
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all">
              <option value="all">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <CalendarDays className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold mb-1">No meetings found</p>
            <p className="text-sm text-gray-400">
              {search || filterProject !== "all" || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "Click \"Add Meeting\" to schedule your first one"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Agenda", "Project", "Date & Time", "Attendees", "Status", "MOM", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 first:pl-6 last:pr-4 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(m => {
                  const totalAttendees = (m.attendees?.length ?? 0) + m.externalAttendees.length;
                  return (
                    <tr key={m.id} className="group hover:bg-gray-50 transition-colors">
                      {/* Agenda */}
                      <td className="px-4 py-3.5 pl-6 max-w-[240px]">
                        <div className="font-semibold text-gray-900 truncate">{m.agenda}</div>
                        {m.meetingLink && (
                          <a href={m.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-0.5 transition-colors">
                            <LinkIcon className="w-3 h-3" /> Join Link
                          </a>
                        )}
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3.5">
                        {m.project ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700">
                            <Building2 className="w-3 h-3" /> {m.project.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-800">{fmtDate(m.dateTime)}</div>
                        <div className="text-xs text-gray-400">{fmtTime(m.dateTime)}</div>
                      </td>

                      {/* Attendees */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-2">
                            {(m.attendees ?? []).slice(0, 3).map(u => <Avatar key={u.id} user={u} />)}
                          </div>
                          {totalAttendees > 0 && (
                            <span className="text-xs text-gray-500">{totalAttendees} attendee{totalAttendees !== 1 ? "s" : ""}</span>
                          )}
                          {totalAttendees === 0 && <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5"><StatusBadge status={m.status} /></td>

                      {/* MOM */}
                      <td className="px-4 py-3.5">
                        {m.mom ? (
                          <button onClick={() => setViewMomMeeting(m)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                            <FileText className="w-3 h-3" /> View MOM
                          </button>
                        ) : m.status === "COMPLETED" ? (
                          <button onClick={() => setMomMeeting(m)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                            <Plus className="w-3 h-3" /> Add MOM
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 pr-4 relative" ref={openMenuId === m.id ? menuRef : undefined}>
                        <button onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === m.id && (
                          <div className="absolute right-4 top-10 z-10 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                            <button onClick={() => { setEditMeeting(m); setOpenMenuId(null); }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <SquarePen className="w-4 h-4 text-gray-400" /> Edit Meeting
                            </button>
                            <button onClick={() => { setMomMeeting(m); setOpenMenuId(null); }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <FileText className="w-4 h-4 text-gray-400" /> {m.mom ? "Update MOM" : "Add MOM"}
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            {m.status === "SCHEDULED" && (
                              <>
                                <button onClick={() => handleStatusChange(m.id, "COMPLETED")}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors">
                                  <CheckCircle2 className="w-4 h-4" /> Mark Completed
                                </button>
                                <button onClick={() => handleStatusChange(m.id, "CANCELLED")}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                                  <XCircle className="w-4 h-4" /> Cancel Meeting
                                </button>
                              </>
                            )}
                            <div className="border-t border-gray-100 my-1" />
                            <button onClick={() => handleDelete(m.id)}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
