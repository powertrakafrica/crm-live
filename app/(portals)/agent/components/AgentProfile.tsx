"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  MapPin,
  Languages,
  CheckCircle,
  FileText,
  Save,
  ShieldCheck,
  Loader2,
  UploadCloud,
  X,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { profileApi, uploadApi } from "@/lib/api";

interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  ghanaCardNumber: string | null;
  ghanaCardUrl: string | null;
  isVerified: boolean;
  role: string;
}

interface AgentProfile {
  agentId: number;
  coverageAreas: string | null;
  languages: string | null;
  specialties: string | null;
  momoNumber: string | null;
  momoNetwork: string | null;
  isOnboardingComplete: boolean;
  partnershipAgreementUrl: string | null;
}

const ALL_LANGUAGES = [
  "English",
  "Twi",
  "Ga",
  "Ewe",
  "Fante",
  "Dagbani",
  "Hausa",
];
const ALL_SPECIALTIES = [
  "Residential Appraisals",
  "Standard Viewings",
  "Commercial & Retail",
  "Land & Plots",
  "Rent-to-Own Deals",
];
const ALL_CONSTITUENCIES = [
  "Ayawaso West",
  "Okaikwei North",
  "Ablekuma Central",
  "Korle Klottey",
  "Nhyiaeso",
  "Oforikrom",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function splitCsv(val: string | null): string[] {
  if (!val) return [];
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface UploadState {
  loading: boolean;
  error: string;
}

export function AgentProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [primaryRegion, setPrimaryRegion] = useState("greater-accra");
  const [selectedConstituencies, setSelectedConstituencies] = useState<
    string[]
  >([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const [uploads, setUploads] = useState<
    Record<"avatar" | "ghanaCard" | "partnershipAgreement", UploadState>
  >({
    avatar: { loading: false, error: "" },
    ghanaCard: { loading: false, error: "" },
    partnershipAgreement: { loading: false, error: "" },
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const ghanaCardInputRef = useRef<HTMLInputElement>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  const refreshProfile = async () => {
    try {
      const user = (await profileApi.me()) as UserProfile;
      const agent = (await profileApi.agentProfile()) as AgentProfile | null;
      setUserProfile(user);
      setAgentProfile(agent);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    Promise.all([
      profileApi.me() as Promise<UserProfile>,
      profileApi.agentProfile() as Promise<AgentProfile | null>,
    ])
      .then(([user, agent]) => {
        setUserProfile(user);
        setAgentProfile(agent);
        if (agent) {
          setSelectedConstituencies(splitCsv(agent.coverageAreas));
          setSelectedLanguages(splitCsv(agent.languages));
          setSelectedSpecialties(splitCsv(agent.specialties));
        }
      })
      .catch((err: any) => setError(err.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const toggleConstituency = (c: string) => {
    setSelectedConstituencies((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const toggleLanguage = (l: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );
  };

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await profileApi.updateAgentProfile({
        coverageAreas: selectedConstituencies.join(","),
        languages: selectedLanguages.join(","),
        specialties: selectedSpecialties.join(","),
        isOnboardingComplete: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (
    file: File,
    docType: "avatar" | "ghanaCard" | "partnershipAgreement",
    folder: string,
  ) => {
    setUploads((prev) => ({
      ...prev,
      [docType]: { loading: true, error: "" },
    }));
    try {
      const presign = await uploadApi.presign(file.name, folder, file.type);
      const uploadRes = await fetch(presign.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      if (docType === "avatar") {
        await profileApi.uploadAvatar({ imageUrl: presign.publicUrl });
      } else if (docType === "ghanaCard") {
        await profileApi.uploadGhanaCard({ documentUrl: presign.publicUrl });
      } else if (docType === "partnershipAgreement") {
        await profileApi.uploadPartnershipAgreement({
          documentUrl: presign.publicUrl,
        });
      }

      await refreshProfile();
      setUploads((prev) => ({
        ...prev,
        [docType]: { loading: false, error: "" },
      }));
    } catch (err: any) {
      setUploads((prev) => ({
        ...prev,
        [docType]: { loading: false, error: err.message || "Upload failed" },
      }));
    }
  };

  const onFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "avatar" | "ghanaCard" | "partnershipAgreement",
    folder: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleUpload(file, docType, folder);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <span className="ml-3 text-charcoal-600 font-medium">
          Loading profile...
        </span>
      </div>
    );
  }

  if (error && !userProfile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">
        {error}
      </div>
    );
  }

  const name = userProfile?.fullName ?? "Agent";
  const isVerified = userProfile?.isVerified ?? false;
  const hasGhanaCard =
    !!userProfile?.ghanaCardUrl || !!userProfile?.ghanaCardNumber;
  const hasAvatar = !!userProfile?.avatarUrl;
  const hasPartnershipAgreement = !!agentProfile?.partnershipAgreementUrl;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-charcoal-950">
            Professional Identity
          </h2>
          <p className="text-charcoal-500 font-medium">
            Manage your verified agent profile and coverage preferences.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm"
        >
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" /> Saved
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ID & Verification Documents */}
        <Card className="xl:col-span-1 border-charcoal-200 shadow-sm rounded-sm h-fit">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center pb-6 border-b border-charcoal-100">
              <div className="h-24 w-24 bg-accent-100 text-accent-700 rounded-full flex items-center justify-center font-bold text-3xl mb-4 relative shadow-inner overflow-hidden">
                {hasAvatar ? (
                  <img
                    src={userProfile!.avatarUrl!}
                    alt={name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initials(name)
                )}
                <div
                  className={`absolute bottom-0 right-0 h-6 w-6 ${isVerified ? "bg-green-500" : "bg-amber-400"} rounded-full border-2 border-white flex items-center justify-center`}
                >
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              </div>
              <h3 className="font-bold text-charcoal-950 text-xl">{name}</h3>
              <p className="text-sm font-bold text-charcoal-500 uppercase tracking-wide mt-1">
                {isVerified ? "Verified TEPS Agent" : "Pending Verification"}
              </p>
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => onFileSelect(e, "avatar", "avatars")}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs font-bold border-charcoal-200"
                disabled={uploads.avatar.loading}
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploads.avatar.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5 mr-1" />
                )}
                {hasAvatar ? "Change Photo" : "Upload Headshot"}
              </Button>
              {uploads.avatar.error && (
                <p className="text-xs text-red-600 mt-1">
                  {uploads.avatar.error}
                </p>
              )}
            </div>

            <div className="pt-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-400 mb-2 border-b border-charcoal-100 pb-1">
                Onboarding Documents
              </h4>

              {/* Ghana Card */}
              <input
                type="file"
                ref={ghanaCardInputRef}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onFileSelect(e, "ghanaCard", "documents")}
              />
              <div
                className={`flex items-center justify-between p-3 border rounded-sm ${hasGhanaCard ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className={`h-4 w-4 ${hasGhanaCard ? "text-green-600" : "text-amber-600"}`}
                  />
                  <span
                    className={`text-sm font-bold ${hasGhanaCard ? "text-green-900" : "text-amber-900"}`}
                  >
                    Ghana Card
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasGhanaCard && userProfile?.ghanaCardUrl && (
                    <a
                      href={userProfile.ghanaCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> View
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold px-2 border-charcoal-200"
                    disabled={uploads.ghanaCard.loading}
                    onClick={() => ghanaCardInputRef.current?.click()}
                  >
                    {uploads.ghanaCard.loading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : hasGhanaCard ? (
                      "Re-upload"
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </div>
              </div>
              {uploads.ghanaCard.error && (
                <p className="text-xs text-red-600 -mt-3 ml-1">
                  {uploads.ghanaCard.error}
                </p>
              )}

              {/* Professional Headshot */}
              <div
                className={`flex items-center justify-between p-3 border rounded-sm ${hasAvatar ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
              >
                <div className="flex items-center gap-2">
                  <User
                    className={`h-4 w-4 ${hasAvatar ? "text-green-600" : "text-amber-600"}`}
                  />
                  <span
                    className={`text-sm font-bold ${hasAvatar ? "text-green-900" : "text-amber-900"}`}
                  >
                    Professional Headshot
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-sm border shadow-sm ${hasAvatar ? "text-green-700 bg-white border-green-200" : "text-amber-700 bg-white border-amber-200"}`}
                >
                  {hasAvatar ? "Uploaded" : "Pending"}
                </span>
              </div>

              {/* Partnership Agreement */}
              <input
                type="file"
                ref={agreementInputRef}
                className="hidden"
                accept=".pdf"
                onChange={(e) =>
                  onFileSelect(e, "partnershipAgreement", "documents")
                }
              />
              <div
                className={`flex items-center justify-between p-3 border rounded-sm ${hasPartnershipAgreement ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
              >
                <div className="flex items-center gap-2">
                  <FileText
                    className={`h-4 w-4 ${hasPartnershipAgreement ? "text-green-600" : "text-amber-600"}`}
                  />
                  <span
                    className={`text-sm font-bold ${hasPartnershipAgreement ? "text-green-900" : "text-amber-900"}`}
                  >
                    Partnership Agreement
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasPartnershipAgreement &&
                    agentProfile?.partnershipAgreementUrl && (
                      <a
                        href={agentProfile.partnershipAgreementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> View
                      </a>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold px-2 border-charcoal-200"
                    disabled={uploads.partnershipAgreement.loading}
                    onClick={() => agreementInputRef.current?.click()}
                  >
                    {uploads.partnershipAgreement.loading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : hasPartnershipAgreement ? (
                      "Re-upload"
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </div>
              </div>
              {uploads.partnershipAgreement.error && (
                <p className="text-xs text-red-600 -mt-3 ml-1">
                  {uploads.partnershipAgreement.error}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Routing Preferences (Coverage, Language, Spec) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Coverage Area */}
          <Card className="border-charcoal-200 shadow-sm rounded-sm">
            <CardHeader className="bg-charcoal-50 border-b border-charcoal-100 pb-4">
              <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" /> Coverage Area
                Preferences
              </CardTitle>
              <CardDescription className="text-sm font-medium text-charcoal-600">
                This determines the geo-fenced tickets and verifications routed
                to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                    Primary Region
                  </label>
                  <select
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
                    value={primaryRegion}
                    onChange={(e) => setPrimaryRegion(e.target.value)}
                  >
                    <option value="greater-accra">Greater Accra</option>
                    <option value="ashanti">Ashanti</option>
                    <option value="western">Western</option>
                    <option value="eastern">Eastern</option>
                    <option value="central">Central</option>
                    <option value="volta">Volta</option>
                    <option value="northern">Northern</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                    Active Constituencies
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1 border border-charcoal-200 rounded-sm p-2 min-h-10.5 bg-charcoal-50">
                    {selectedConstituencies.map((c) => (
                      <span
                        key={c}
                        className="bg-white border border-brand-200 text-brand-800 text-xs font-bold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => toggleConstituency(c)}
                          className="text-brand-400 font-normal hover:text-red-500 cursor-pointer text-[10px] ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {ALL_CONSTITUENCIES.filter(
                      (c) => !selectedConstituencies.includes(c),
                    ).length > 0 && (
                      <div className="relative group">
                        <span className="text-xs text-charcoal-400 italic flex items-center gap-1 px-1 font-medium cursor-pointer hover:text-brand-600">
                          + Add more
                        </span>
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-charcoal-200 rounded-sm shadow-lg z-10 p-2 w-48 max-h-40 overflow-y-auto">
                          {ALL_CONSTITUENCIES.filter(
                            (c) => !selectedConstituencies.includes(c),
                          ).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleConstituency(c)}
                              className="block w-full text-left text-sm font-medium text-charcoal-700 hover:bg-charcoal-50 px-2 py-1 rounded-sm"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Languages & Specialties */}
          <Card className="border-charcoal-200 shadow-sm rounded-sm">
            <CardHeader className="bg-charcoal-50 border-b border-charcoal-100 pb-4">
              <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <Languages className="h-4 w-4 text-brand-600" /> Profiling &amp;
                Expertise
              </CardTitle>
              <CardDescription className="text-sm font-medium text-charcoal-600">
                Helps Admins and the AI assign specific localized or specialized
                requests to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-2 block">
                    Languages Spoken
                  </label>
                  <div className="space-y-2">
                    {ALL_LANGUAGES.map((lang) => (
                      <label
                        key={lang}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded-sm hover:bg-charcoal-50 border border-transparent hover:border-charcoal-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-brand-600 border-charcoal-300 rounded focus:ring-brand-500"
                          checked={selectedLanguages.includes(lang)}
                          onChange={() => toggleLanguage(lang)}
                        />
                        <span className="font-bold text-charcoal-900 text-sm">
                          {lang}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border-l border-charcoal-100 pl-8">
                  <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-2 block">
                    Property Specialties
                  </label>
                  <div className="space-y-2">
                    {ALL_SPECIALTIES.map((spec) => (
                      <label
                        key={spec}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded-sm hover:bg-charcoal-50 border border-transparent hover:border-charcoal-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-accent-600 border-charcoal-300 rounded focus:ring-accent-500"
                          checked={selectedSpecialties.includes(spec)}
                          onChange={() => toggleSpecialty(spec)}
                        />
                        <span className="font-bold text-charcoal-900 text-sm">
                          {spec}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
