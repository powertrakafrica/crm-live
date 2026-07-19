"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { profileApi } from "@/lib/api";
import type { AgentProfile, UserProfile } from "./AgentProfile";

const inputCls =
  "block w-full rounded-sm border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

const GENDERS = ["Female", "Male", "Other"];
const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"];
const EXPERIENCE_LEVELS = ["New", "Intermediate", "Expert"];

interface EditPersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  agent: AgentProfile;
  onSaved: () => Promise<void> | void;
}

export function EditPersonalInfoModal({ isOpen, onClose, user, agent, onSaved }: EditPersonalInfoModalProps) {
  const verified = agent.verificationStatus === "Approved";
  const [form, setForm] = useState({
    fullName: user.fullName ?? "",
    otherNames: user.otherNames ?? "",
    surname: user.surname ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    gender: user.gender ?? "",
    nationality: user.nationality ?? "",
    phone: user.phone ?? "",
    residentialAddress: user.residentialAddress ?? "",
    digitalAddress: user.digitalAddress ?? "",
    emergencyContactName: user.emergencyContactName ?? "",
    emergencyContactPhone: user.emergencyContactPhone ?? "",
    emergencyContactRelationship: user.emergencyContactRelationship ?? "",
    ghanaCardNumber: user.ghanaCardNumber ?? "",
    momoNumber: agent.momoNumber ?? "",
    momoNetwork: agent.momoNetwork ?? "",
    experienceLevel: agent.experienceLevel ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await profileApi.update({
        fullName: form.fullName.trim() || undefined,
        otherNames: form.otherNames.trim() || undefined,
        surname: form.surname.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        nationality: form.nationality.trim() || undefined,
        phone: form.phone.trim() || undefined,
        residentialAddress: form.residentialAddress.trim() || undefined,
        digitalAddress: form.digitalAddress.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: form.emergencyContactRelationship.trim() || undefined,
        ghanaCardNumber: form.ghanaCardNumber.trim() || undefined,
      });
      await profileApi.updateAgentProfile({
        momoNumber: form.momoNumber.trim() || undefined,
        momoNetwork: form.momoNetwork || undefined,
        experienceLevel: form.experienceLevel || undefined,
      });
      await onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Personal Info" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {error && (
          <div className="rounded-sm bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {verified && (
          <p className="rounded-sm bg-amber-50 border border-amber-200 p-3 text-xs font-medium text-amber-800">
            Your identity is verified. Date of birth, gender, nationality and Ghana Card number are locked — contact an admin to reset verification before changing them.
          </p>
        )}

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal-400 mb-2">Identity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full Name"><input className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Other Names"><input className={inputCls} value={form.otherNames} onChange={(e) => set("otherNames", e.target.value)} /></Field>
            <Field label="Surname"><input className={inputCls} value={form.surname} onChange={(e) => set("surname", e.target.value)} /></Field>
            <Field label="Date of Birth"><input type="date" className={inputCls} value={form.dateOfBirth} disabled={verified} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
            <Field label="Gender">
              <select className={inputCls} value={form.gender} disabled={verified} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Nationality"><input className={inputCls} value={form.nationality} disabled={verified} onChange={(e) => set("nationality", e.target.value)} placeholder="e.g. Ghanaian" /></Field>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal-400 mb-2">Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email (read-only)"><input className={inputCls} value={user.email} disabled /></Field>
            <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Residential Address" full><input className={inputCls} value={form.residentialAddress} onChange={(e) => set("residentialAddress", e.target.value)} /></Field>
            <Field label="Digital Address (Ghana Post GPS)"><input className={inputCls} value={form.digitalAddress} onChange={(e) => set("digitalAddress", e.target.value)} /></Field>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal-400 mb-2">Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Name"><input className={inputCls} value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} /></Field>
            <Field label="Phone"><input type="tel" className={inputCls} value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} /></Field>
            <Field label="Relationship"><input className={inputCls} value={form.emergencyContactRelationship} onChange={(e) => set("emergencyContactRelationship", e.target.value)} /></Field>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal-400 mb-2">Mobile Money &amp; Experience</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="MoMo Number"><input className={inputCls} value={form.momoNumber} onChange={(e) => set("momoNumber", e.target.value)} /></Field>
            <Field label="MoMo Network">
              <select className={inputCls} value={form.momoNetwork} onChange={(e) => set("momoNetwork", e.target.value)}>
                <option value="">Select…</option>
                {MOMO_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Experience Level">
              <select className={inputCls} value={form.experienceLevel} onChange={(e) => set("experienceLevel", e.target.value)}>
                <option value="">Select…</option>
                {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal-400 mb-2">Ghana Card Number</h3>
          <Field label="Ghana Card Number" full><input className={inputCls} value={form.ghanaCardNumber} disabled={verified} onChange={(e) => set("ghanaCardNumber", e.target.value)} placeholder="e.g. GHA-712345678-9" /></Field>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">{label}</label>
      {children}
    </div>
  );
}