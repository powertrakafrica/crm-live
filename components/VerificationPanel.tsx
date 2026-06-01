import { CheckCircle, Download, FileText, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "./ui/Button";

interface VerificationItemProps {
    label: string;
    isVerified: boolean;
    dateChecked?: string;
    icon: React.ReactNode;
}

function VerificationItem({ label, isVerified, dateChecked, icon }: VerificationItemProps) {
    return (
        <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl bg-white transition-all hover:shadow-sm hover:border-brand-200">
            <div className={`p-2 rounded-lg shrink-0 ${isVerified ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-400'}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-slate-900">{label}</h4>
                    {isVerified ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                        </span>
                    ) : (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            Pending
                        </span>
                    )}
                </div>
                {dateChecked && isVerified && (
                    <p className="text-xs text-slate-500">Last checked on: {dateChecked}</p>
                )}
            </div>
        </div>
    );
}

interface VerificationPanelProps {
    referenceCode: string;
    checks: {
        ownership: { verified: boolean; date?: string };
        gpsLocation: { verified: boolean; date?: string };
        landCommission: { verified: boolean; date?: string };
    };
    onDownloadCert?: () => void;
}

export default function VerificationPanel({
    referenceCode,
    checks,
    onDownloadCert,
}: VerificationPanelProps) {
    const allVerified = checks.ownership.verified && checks.gpsLocation.verified && checks.landCommission.verified;

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-heading font-bold flex items-center gap-2 text-slate-900">
                        <ShieldCheck className="h-6 w-6 text-brand-500" />
                        TEPS Trust Layer
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Ref: <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-xs">{referenceCode}</span>
                    </p>
                </div>
                {allVerified && (
                    <div className="hidden md:block">
                        <span className="inline-flex items-center rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                            Fully Verified
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-3 mb-6">
                <VerificationItem
                    icon={<ShieldCheck className="h-5 w-5" />}
                    label="Ownership Documents"
                    isVerified={checks.ownership.verified}
                    dateChecked={checks.ownership.date}
                />
                <VerificationItem
                    icon={<MapPin className="h-5 w-5" />}
                    label="GPS Location Verification"
                    isVerified={checks.gpsLocation.verified}
                    dateChecked={checks.gpsLocation.date}
                />
                <VerificationItem
                    icon={<FileText className="h-5 w-5" />}
                    label="Land Commission Search"
                    isVerified={checks.landCommission.verified}
                    dateChecked={checks.landCommission.date}
                />
            </div>

            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="text-xs text-slate-500 max-w-[280px]">
                    *TEPS verified properties carry our guarantee against fraudulent listings.
                </p>
                <Button
                    variant="outline"
                    onClick={onDownloadCert}
                    disabled={!allVerified}
                    size="sm"
                    className="w-full sm:w-auto gap-2"
                >
                    <Download className="h-4 w-4" />
                    Download Certificate
                </Button>
            </div>
        </div>
    );
}
