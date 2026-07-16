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
  Eye,
  FileCheck,
  Home,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { DocumentViewer } from "@/components/ui/DocumentViewer";
import { fileProxyUrl, profileApi, uploadApi } from "@/lib/api";
import { CoveragePicker } from "./CoveragePicker";
import { coverageToItems, itemsToCoverage, type CoverageItem } from "@/lib/coverage";

interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  ghanaCardNumber: string | null;
  isVerified: boolean;
  role: string;
  // Identity & contact — returned by getUserProfile and editable here so an
  // agent can correct DOB / address / emergency contact without re-running
  // enlistment. All optional/null (the become-agent form historically didn't
  // enforce them, so existing agents may have gaps).
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  residentialAddress?: string | null;
  digitalAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  documents?: AgentDoc[];
}

type DocStatus = "Approved" | "Pending" | "Rejected";
type DocType =
  | "Certificate"
  | "GhanaCard"
  | "Other"
  | "PartnershipAgreement"
  | "PoliceClearance"
  | "ProofOfAddress";

interface AgentDoc {
  id: number;
  docType: DocType;
  fileUrl: string;
  status: DocStatus;
  reviewedAt: string | null;
  reviewedBy: number | null;
  createdAt: string;
}

interface AgentProfile {
  agentId: number;
  coverage?: { items: CoverageItem[] };
  languages: string | null;
  specialties: string | null;
  momoNumber: string | null;
  momoNetwork: string | null;
  isOnboardingComplete: boolean;
  agentCode: string | null;
  experienceLevel: "Expert" | "Intermediate" | "New" | null;
  onboardedAt: string | null;
  documents?: AgentDoc[];
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
const EXPERIENCE_LEVELS: Array<{ value: "Expert" | "Intermediate" | "New"; label: string }> = [
  { value: "New", label: "New" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Expert", label: "Expert" },
];
const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"];
const GENDER_OPTIONS: Array<"Female" | "Male" | "Other"> = ["Male", "Female", "Other"];

// Supporting doc types an agent can upload beyond Ghana Card / Partnership
// Agreement (which have dedicated endpoints). Each gets its own upload button.
const SUPPORTING_DOC_TYPES: Array<{
  docType: "Certificate" | "PoliceClearance" | "ProofOfAddress";
  icon: typeof FileCheck;
  label: string;
}> = [
  { docType: "PoliceClearance", icon: ShieldCheck, label: "Police Clearance" },
  { docType: "ProofOfAddress", icon: Home, label: "Proof of Address" },
  { docType: "Certificate", icon: Award, label: "Certificate / Qualification" },
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

const STATUS_BADGE: Record<DocStatus, string> = {
  Approved: "text-green-700 bg-white border-green-200",
  Pending: "text-amber-700 bg-white border-amber-200",
  Rejected: "text-red-700 bg-white border-red-200",
};

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
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(
    null
  );

  const [coverageItems, setCoverageItems] = useState<CoverageItem[]>([]);
  const [coverageErrors, setCoverageErrors] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"Expert" | "Intermediate" | "New" | "">("");

  // Identity & contact — editable fields persisted via profileApi.update
  // (PUT /profile/me -> updateUserProfile). Prefilled from profileApi.me().
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"" | "Female" | "Male" | "Other">("");
  const [nationality, setNationality] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [digitalAddress, setDigitalAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Upload progress keyed by doc key. The first three keep their original named
  // slots (avatar/ghanaCard/partnershipAgreement); supporting docs use their
  // docType string as the key.
  const [uploads, setUploads] = useState<Record<string, UploadState>>({
    avatar: { loading: false, error: "" },
    ghanaCard: { loading: false, error: "" },
    partnershipAgreement: { loading: false, error: "" },
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const ghanaCardInputRef = useRef<HTMLInputElement>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);
  // One hidden file input per supporting doc type (kept in a ref map so a
  // single click target can trigger the right one).
  const supportInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allDocuments: AgentDoc[] = userProfile?.documents ?? agentProfile?.documents ?? [];
  const docByType = (type: DocType) => allDocuments.find((d) => d.docType === type);

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
          setCoverageItems(coverageToItems(agent.coverage));
          setSelectedLanguages(splitCsv(agent.languages));
          setSelectedSpecialties(splitCsv(agent.specialties));
          setMomoNumber(agent.momoNumber ?? "");
          setMomoNetwork(agent.momoNetwork ?? "");
          setExperienceLevel(agent.experienceLevel ?? "");
        }
        // Prefill identity & contact from the user profile.
        setDateOfBirth(user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "");
        setGender((user.gender as "" | "Female" | "Male" | "Other") ?? "");
        setNationality(user.nationality ?? "");
        setResidentialAddress(user.residentialAddress ?? "");
        setDigitalAddress(user.digitalAddress ?? "");
        setEmergencyContactName(user.emergencyContactName ?? "");
        setEmergencyContactRelationship(user.emergencyContactRelationship ?? "");
        setEmergencyContactPhone(user.emergencyContactPhone ?? "");
      })
      .catch((err: any) => setError(err.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

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
      // Persist identity & contact first (user profile), then the agent
      // profile — both under the single "Save Changes" action. Empty strings
      // are sent as undefined so updateUserProfile (optional fields) doesn't
      // overwrite existing values with blanks.
      await profileApi.update({
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        nationality: nationality || undefined,
        residentialAddress: residentialAddress || undefined,
        digitalAddress: digitalAddress || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactRelationship: emergencyContactRelationship || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
      });
      await profileApi.updateAgentProfile({
        coverage: itemsToCoverage(coverageItems),
        experienceLevel: experienceLevel || undefined,
        isOnboardingComplete: true,
        languages: selectedLanguages.join(","),
        momoNetwork: momoNetwork || undefined,
        momoNumber: momoNumber || undefined,
        specialties: selectedSpecialties.join(","),
      });
      setCoverageErrors([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      const msg = err?.message || "Save failed";
      setError(msg);
      setCoverageErrors(err?.status === 400 ? [msg] : []);
    } finally {
      setSaving(false);
    }
  };

  // Upload a supporting doc (police clearance / proof of address / certificate)
  // through the generalized agent_documents endpoint.
  const handleSupportingUpload = async (
    file: File,
    docType: "Certificate" | "PoliceClearance" | "ProofOfAddress",
  ) => {
    setUploads((prev) => ({ ...prev, [docType]: { loading: true, error: "" } }));
    try {
      const { publicUrl } = await uploadApi.uploadFile(file, "documents");
      await profileApi.uploadAgentDocument({ docType, documentUrl: publicUrl });
      await refreshProfile();
      setUploads((prev) => ({ ...prev, [docType]: { loading: false, error: "" } }));
    } catch (err: any) {
      setUploads((prev) => ({
        ...prev,
        [docType]: { loading: false, error: err.message || "Upload failed" },
      }));
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
      const { publicUrl } = await uploadApi.uploadFile(file, folder);

      if (docType === "avatar") {
        await profileApi.uploadAvatar({ imageUrl: publicUrl });
      } else if (docType === "ghanaCard") {
        await profileApi.uploadGhanaCard({ documentUrl: publicUrl });
      } else if (docType === "partnershipAgreement") {
        await profileApi.uploadPartnershipAgreement({
          documentUrl: publicUrl,
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
  const ghanaCardDoc = docByType("GhanaCard");
  const hasGhanaCard = !!ghanaCardDoc || !!userProfile?.ghanaCardNumber;
  const hasAvatar = !!userProfile?.avatarUrl;
  const agreementDoc = docByType("PartnershipAgreement");
  const hasPartnershipAgreement = !!agreementDoc;

  const docBadge = (status?: DocStatus) =>
    status ? (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-sm border shadow-sm ${STATUS_BADGE[status]}`}
      >
        {status}
      </span>
    ) : null;

  return (
    <div className="space-y-6">
      <DocumentViewer
        url={viewer?.url ?? null}
        title={viewer?.title}
        isOpen={!!viewer}
        onClose={() => setViewer(null)}
      />
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
              {agentProfile?.agentCode && (
                <p className="text-xs font-bold text-brand-700 mt-1">
                  {agentProfile.agentCode}
                </p>
              )}
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
                  {docBadge(ghanaCardDoc?.status)}
                </div>
                <div className="flex items-center gap-2">
                  {ghanaCardDoc && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewer({
                          url: fileProxyUrl(ghanaCardDoc.fileUrl),
                          title: "Ghana Card",
                        })
                      }
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
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
                  {docBadge(agreementDoc?.status)}
                </div>
                <div className="flex items-center gap-2">
                  {agreementDoc && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewer({
                          url: fileProxyUrl(agreementDoc.fileUrl),
                          title: "Partnership Agreement",
                        })
                      }
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
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

              {/* Supporting documents (police clearance, proof of address, certificate) */}
              {SUPPORTING_DOC_TYPES.map(({ docType, icon: Icon, label }) => {
                const doc = docByType(docType);
                const present = !!doc;
                const state = uploads[docType];
                return (
                  <div key={docType}>
                    <input
                      type="file"
                      ref={(el) => {
                        supportInputRefs.current[docType] = el;
                      }}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSupportingUpload(file, docType);
                      }}
                    />
                    <div
                      className={`flex items-center justify-between p-3 border rounded-sm ${present ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`h-4 w-4 ${present ? "text-green-600" : "text-amber-600"}`}
                        />
                        <span
                          className={`text-sm font-bold ${present ? "text-green-900" : "text-amber-900"}`}
                        >
                          {label}
                        </span>
                        {docBadge(doc?.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {doc && (
                          <button
                            type="button"
                            onClick={() =>
                              setViewer({
                                url: fileProxyUrl(doc.fileUrl),
                                title: label,
                              })
                            }
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-bold px-2 border-charcoal-200"
                          disabled={state?.loading}
                          onClick={() =>
                            supportInputRefs.current[docType]?.click()
                          }
                        >
                          {state?.loading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : present ? (
                            "Re-upload"
                          ) : (
                            "Upload"
                          )}
                        </Button>
                      </div>
                    </div>
                    {state?.error && (
                      <p className="text-xs text-red-600 -mt-3 ml-1">
                        {state.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Routing Preferences (Coverage, Language, Spec, Payout, Experience) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Identity & Contact — editable; saved via profileApi.update. */}
          <Card className="border-charcoal-200 shadow-sm rounded-sm">
            <CardHeader className="bg-charcoal-50 border-b border-charcoal-100 pb-4">
              <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <User className="h-4 w-4 text-brand-600" /> Identity &amp; Contact
              </CardTitle>
              <CardDescription className="text-sm font-medium text-charcoal-600">
                Personal details on file. Keeping these current helps with
                verification and emergency reach-out.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Date of birth
                  </span>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Gender
                  </span>
                  <select
                    value={gender}
                    onChange={(e) =>
                      setGender(
                        e.target.value as "" | "Female" | "Male" | "Other",
                      )
                    }
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
                  >
                    <option value="">Select…</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Nationality
                  </span>
                  <input
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Digital address (GhanaPost)
                  </span>
                  <input
                    value={digitalAddress}
                    onChange={(e) => setDigitalAddress(e.target.value)}
                    placeholder="e.g. GA-144-1234"
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Residential address
                  </span>
                  <input
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Emergency contact name
                  </span>
                  <input
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Emergency contact relationship
                  </span>
                  <input
                    value={emergencyContactRelationship}
                    onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                    placeholder="e.g. Sibling, Spouse"
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    Emergency contact phone
                  </span>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) =>
                      setEmergencyContactPhone(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="e.g. 024 123 4567"
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

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
              <CoveragePicker
                value={coverageItems}
                onChange={setCoverageItems}
                errors={coverageErrors}
              />
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
            <CardContent className="p-6 space-y-6">
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

              {/* Experience level — surfaced to admin review and used for routing. */}
              <div className="border-t border-charcoal-100 pt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-2 block">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) =>
                    setExperienceLevel(
                      e.target.value as "" | "Expert" | "Intermediate" | "New",
                    )
                  }
                  className="w-full md:w-1/2 bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
                >
                  <option value="">Select…</option>
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Payout details (momo) — required to request payouts; previously
              collected in the server interface but never sent by the UI. */}
          <Card className="border-charcoal-200 shadow-sm rounded-sm">
            <CardHeader className="bg-charcoal-50 border-b border-charcoal-100 pb-4">
              <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-brand-600" /> Payout Details
              </CardTitle>
              <CardDescription className="text-sm font-medium text-charcoal-600">
                Mobile money account used when you request commission payouts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    MoMo Number
                  </span>
                  <input
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    placeholder="e.g. 024 000 0000"
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">
                    MoMo Network
                  </span>
                  <select
                    value={momoNetwork}
                    onChange={(e) => setMomoNetwork(e.target.value)}
                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
                  >
                    <option value="">Select…</option>
                    {MOMO_NETWORKS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}