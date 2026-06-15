"use client";

import { useState, useEffect } from "react";
import {
  Home,
  Plus,
  Edit,
  Eye,
  MoreHorizontal,
  Search,
  User,
  X,
  Save,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  Calendar,
  FileText,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PhotonSearch } from "@/components/PhotonSearch";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { agentApi } from "@/lib/api";

interface AgentListing {
  id: number;
  title: string;
  ownerName: string;
  price: number;
  period: string;
  status: string;
  views: number;
  enquiries: number;
  dateAdded: string;
  category?: string;
  bedrooms?: number;
  bathrooms?: number;
  location?: string;
  description?: string;
  sqft?: number;
  yearBuilt?: number;
  gpsCode?: string;
  amenities?: string[];
  images?: { url: string; isPrimary: boolean }[];
}

export function AgentListings() {
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // States for Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<AgentListing | null>(
    null,
  );

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    title: "",
    description: "",
    ownerName: "",
    location: "",
    gpsCode: "",
    category: "Rent",
    bedrooms: 0,
    bathrooms: 0,
    sqft: 0,
    yearBuilt: 0,
    amenities: "",
    price: 0,
    period: "month",
  });

  useEffect(() => {
    agentApi
      .listings()
      .then((data: any) => {
        const mapped = (data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          ownerName: p.ownerId ? `Owner #${p.ownerId}` : "Unknown",
          price: p.price,
          period: p.pricePeriod || "month",
          status:
            p.status === "Active"
              ? "Available"
              : p.status === "Pending"
                ? "Under Offer"
                : p.status === "Sold" || p.status === "Rented"
                  ? "Sold/Rented"
                  : p.status,
          views: p.viewsCount || 0,
          enquiries: p.enquiriesCount || 0,
          dateAdded: p.createdAt
            ? new Date(p.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "N/A",
          category: p.category,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          location: p.location,
          description: p.description,
          sqft: p.sqft,
          yearBuilt: p.yearBuilt,
          gpsCode: p.gpsCode,
          amenities: p.amenities,
          images: p.images,
        }));
        setListings(mapped);
      })
      .catch((err: any) => setError(err.message || "Failed to load listings"))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusToggle = (id: number, currentStatus: string) => {
    const nextStatus =
      currentStatus === "Available"
        ? "Under Offer"
        : currentStatus === "Under Offer"
          ? "Sold/Rented"
          : "Available";
    const updated = listings.map((l) =>
      l.id === id ? { ...l, status: nextStatus } : l,
    );
    setListings(updated);
  };

  const openWizard = () => {
    setWizardStep(1);
    setWizardForm({
      title: "",
      description: "",
      ownerName: "",
      location: "",
      gpsCode: "",
      category: "Rent",
      bedrooms: 0,
      bathrooms: 0,
      sqft: 0,
      yearBuilt: 0,
      amenities: "",
      price: 0,
      period: "month",
    });
    setEditingListing(null);
    setIsWizardOpen(true);
  };

  const openEditWizard = (listing: AgentListing) => {
    setWizardStep(1);
    setWizardForm({
      title: listing.title,
      description: listing.description ?? "",
      ownerName: listing.ownerName,
      location: listing.location ?? "",
      gpsCode: listing.gpsCode ?? "",
      category: listing.category ?? "Rent",
      bedrooms: listing.bedrooms ?? 0,
      bathrooms: listing.bathrooms ?? 0,
      sqft: listing.sqft ?? 0,
      yearBuilt: listing.yearBuilt ?? 0,
      amenities: listing.amenities ? listing.amenities.join(", ") : "",
      price: listing.price,
      period: listing.period,
    });
    setEditingListing(listing);
    setIsWizardOpen(true);
  };

  const handleSaveListing = () => {
    const {
      title,
      description,
      ownerName,
      location,
      gpsCode,
      category,
      bedrooms,
      bathrooms,
      sqft,
      yearBuilt,
      amenities,
      price,
      period,
    } = wizardForm;

    const amenitiesArr = amenities
      ? amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    if (editingListing) {
      const updated = listings.map((l) =>
        l.id === editingListing.id
          ? {
              ...l,
              title,
              category,
              price,
              period,
              bedrooms,
              bathrooms,
              location,
              ownerName,
              description,
              sqft,
              yearBuilt,
              gpsCode,
              amenities: amenitiesArr,
            }
          : l,
      );
      setListings(updated);
      setEditingListing(null);
    } else {
      const newListing: AgentListing = {
        id: Date.now(),
        title,
        category,
        price,
        period,
        bedrooms,
        bathrooms,
        location,
        ownerName,
        description,
        sqft,
        yearBuilt,
        gpsCode,
        amenities: amenitiesArr,
        status: "Available",
        views: 0,
        enquiries: 0,
        dateAdded: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
      setListings([newListing, ...listings]);
    }
    setIsWizardOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-700";
      case "Under Offer":
        return "bg-orange-100 text-orange-700";
      case "Sold/Rented":
        return "bg-charcoal-200 text-charcoal-600";
      default:
        return "bg-charcoal-100 text-charcoal-600";
    }
  };

  const WIZARD_STEPS = 4;

  const canContinue = () => {
    switch (wizardStep) {
      case 1:
        return wizardForm.title.trim() !== "" && wizardForm.ownerName.trim() !== "" && wizardForm.location.trim() !== "";
      case 2:
        return true;
      case 3:
        return wizardForm.price > 0;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const renderWizardStep = () => (
    <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white grow space-y-6">
      {/* Step 1: Basic Details */}
      {wizardStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-2">
            <h4 className="font-bold text-lg text-charcoal-900">
              Basic Details
            </h4>
            <p className="text-sm text-charcoal-500">
              What property are you listing?
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Property Title *
            </label>
            <input
              type="text"
              value={wizardForm.title}
              onChange={(e) =>
                setWizardForm({ ...wizardForm, title: e.target.value })
              }
              placeholder="e.g. 2-BR Modern Apartment"
              className={`w-full bg-white border text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm ${wizardForm.title.trim() === '' ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'}`}
            />
            {wizardForm.title.trim() === '' && (
              <p className="text-[11px] text-red-600 font-medium">Property title is required</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Description
            </label>
            <textarea
              rows={3}
              value={wizardForm.description}
              onChange={(e) =>
                setWizardForm({ ...wizardForm, description: e.target.value })
              }
              placeholder="Detailed description of the property..."
              className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 resize-none shadow-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Owner Name *
              </label>
              <input
                type="text"
                value={wizardForm.ownerName}
                onChange={(e) =>
                  setWizardForm({ ...wizardForm, ownerName: e.target.value })
                }
                placeholder="Owner or Client Name"
                className={`w-full bg-white border text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm ${wizardForm.ownerName.trim() === '' ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'}`}
              />
              {wizardForm.ownerName.trim() === '' && (
                <p className="text-[11px] text-red-600 font-medium">Owner name is required</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Location (City/Area) *
              </label>
              <div className={`rounded-sm ${wizardForm.location.trim() === '' ? 'ring-1 ring-red-500' : ''}`}>
                <PhotonSearch
                  value={wizardForm.location}
                  onChange={(val, feat) => {
                    setWizardForm({ ...wizardForm, location: val });
                    if (feat?.properties.postcode) {
                      setWizardForm((prev) => ({
                        ...prev,
                        gpsCode: feat.properties.postcode ?? prev.gpsCode,
                      }));
                    }
                  }}
                  placeholder="Search location..."
                />
              </div>
              {wizardForm.location.trim() === '' && (
                <p className="text-[11px] text-red-600 font-medium">Location is required</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Ghana Post GPS Code
            </label>
            <input
              type="text"
              value={wizardForm.gpsCode}
              onChange={(e) =>
                setWizardForm({ ...wizardForm, gpsCode: e.target.value })
              }
              placeholder="e.g. GA-182-9901"
              className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none text-charcoal-900 font-mono tracking-wide placeholder:font-sans shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Step 2: Specifications */}
      {wizardStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-2">
            <h4 className="font-bold text-lg text-charcoal-900">
              Specifications
            </h4>
            <p className="text-sm text-charcoal-500">
              Key details about the property.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Category
              </label>
              <select
                value={wizardForm.category}
                onChange={(e) =>
                  setWizardForm({ ...wizardForm, category: e.target.value })
                }
                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
              >
                <option value="Rent">For Rent</option>
                <option value="Sale">For Sale</option>
                <option value="Rent-to-Own">Rent-to-Own</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Bedrooms
              </label>
              <div className="relative">
                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                <input
                  type="number"
                  min="0"
                  value={wizardForm.bedrooms}
                  onChange={(e) =>
                    setWizardForm({
                      ...wizardForm,
                      bedrooms: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Bathrooms
              </label>
              <div className="relative">
                <Bath className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                <input
                  type="number"
                  min="0"
                  value={wizardForm.bathrooms}
                  onChange={(e) =>
                    setWizardForm({
                      ...wizardForm,
                      bathrooms: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Size (Sqft)
              </label>
              <div className="relative">
                <Maximize2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                <input
                  type="number"
                  min="0"
                  value={wizardForm.sqft || ""}
                  onChange={(e) =>
                    setWizardForm({
                      ...wizardForm,
                      sqft: Number(e.target.value),
                    })
                  }
                  placeholder="Total area"
                  className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Year Built
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 5}
                  value={wizardForm.yearBuilt || ""}
                  onChange={(e) =>
                    setWizardForm({
                      ...wizardForm,
                      yearBuilt: Number(e.target.value),
                    })
                  }
                  placeholder="e.g. 2020"
                  className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Amenities (Comma separated)
            </label>
            <div className="relative">
              <CheckSquare className="absolute left-3 top-3 h-4 w-4 text-charcoal-400" />
              <textarea
                rows={2}
                value={wizardForm.amenities}
                onChange={(e) =>
                  setWizardForm({ ...wizardForm, amenities: e.target.value })
                }
                placeholder="e.g. Swimming Pool, 24/7 Security, Gym, Wi-Fi"
                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 resize-none shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {wizardStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-2">
            <h4 className="font-bold text-lg text-charcoal-900">Pricing</h4>
            <p className="text-sm text-charcoal-500">
              Set the price and payment terms.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Price (GH₵) *
              </label>
              <input
                type="number"
                value={wizardForm.price || ""}
                onChange={(e) =>
                  setWizardForm({
                    ...wizardForm,
                    price: Number(e.target.value),
                  })
                }
                className={`w-full bg-white border text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm ${wizardForm.price <= 0 ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'}`}
              />
              {wizardForm.price <= 0 && (
                <p className="text-[11px] text-red-600 font-medium">Price must be greater than 0</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Period
              </label>
              <select
                value={wizardForm.period}
                onChange={(e) =>
                  setWizardForm({ ...wizardForm, period: e.target.value })
                }
                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
              >
                <option value="month">Per Month</option>
                <option value="year">Per Year</option>
                <option value="one-off">One-Off Sale</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Media */}
      {wizardStep === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-2">
            <h4 className="font-bold text-lg text-charcoal-900">
              Media Upload
            </h4>
            <p className="text-sm text-charcoal-500">
              Upload photos and visuals for the listing.
            </p>
          </div>
          <div
            className="border-2 border-dashed border-brand-300 bg-brand-50/50 rounded-sm p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-50 transition-colors text-center"
            onClick={() => alert("Simulating file picker dialog...")}
          >
            <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-brand-600 border border-brand-100">
              <Plus className="h-8 w-8" />
            </div>
            <p className="text-base font-bold text-charcoal-900 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-charcoal-500 mb-4 max-w-sm mx-auto">
              SVG, PNG, JPG or GIF (max. 10MB). First image will be used as the
              cover.
            </p>
            <Button
              variant="outline"
              className="border-brand-200 font-bold bg-white shadow-sm text-brand-700"
            >
              Browse Files
            </Button>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            <div className="h-20 w-28 shrink-0 bg-charcoal-200 rounded-sm overflow-hidden relative group">
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop"
                className="w-full h-full object-cover"
                alt="thumb1"
              />
              <div className="absolute top-1 right-1 bg-charcoal-900/60 p-1 rounded-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3 text-white" />
              </div>
              <div className="absolute bottom-0 left-0 w-full bg-brand-600 text-white text-[9px] font-bold text-center py-0.5 tracking-wide">
                COVER
              </div>
            </div>
            <div className="h-20 w-28 shrink-0 bg-charcoal-200 rounded-sm overflow-hidden relative group">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop"
                className="w-full h-full object-cover"
                alt="thumb2"
              />
              <div className="absolute top-1 right-1 bg-charcoal-900/60 p-1 rounded-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="h-20 w-28 shrink-0 bg-charcoal-200 rounded-sm overflow-hidden relative group">
              <img
                src="https://images.unsplash.com/photo-1536376072261-38c75010e6c9?q=80&w=2071&auto=format&fit=crop"
                className="w-full h-full object-cover"
                alt="thumb3"
              />
              <div className="absolute top-1 right-1 bg-charcoal-900/60 p-1 rounded-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-charcoal-950">
            Managed Listings
          </h2>
          <p className="text-charcoal-500 font-medium">
            Manage properties uploaded on behalf of owners.
          </p>
        </div>
        <Button
          onClick={openWizard}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-6 shadow-sm"
        >
          <Plus className="h-5 w-5 mr-2" /> List New Property
        </Button>
      </div>

      {loading ? (
        <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
          <p className="text-charcoal-500 font-medium">Loading listings...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : (
        <Card className="border-charcoal-200 shadow-sm rounded-sm z-0">
          <CardContent className="p-0">
            <div className="p-4 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                <input
                  type="text"
                  placeholder="Search by property or owner name..."
                  className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-4 py-2"
                />
              </div>
              <div className="hidden md:flex gap-2">
                <Badge className="bg-white text-charcoal-600 border border-charcoal-200 font-bold">
                  All ({listings.length})
                </Badge>
                <Badge className="bg-white text-charcoal-600 border border-charcoal-200 font-bold">
                  Available (
                  {listings.filter((l) => l.status === "Available").length})
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-charcoal-500 uppercase bg-charcoal-50 border-b border-charcoal-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider">
                      Owner / Loc
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr
                      key={listing.id}
                      className="bg-white border-b border-charcoal-100 hover:bg-charcoal-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-charcoal-900">
                          {listing.title}
                        </div>
                        <div className="font-medium text-xs text-brand-600 mt-1">
                          GH₵ {listing.price.toLocaleString()}/{listing.period}
                        </div>
                        {(listing.bedrooms !== undefined ||
                          listing.category ||
                          listing.sqft) && (
                          <div className="text-xs text-charcoal-500 mt-1 flex gap-2 flex-wrap items-center">
                            {listing.category && (
                              <span className="uppercase text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-sm font-bold tracking-wide">
                                {listing.category}
                              </span>
                            )}
                            {listing.category &&
                              listing.bedrooms !== undefined && <span>•</span>}
                            {listing.bedrooms !== undefined && (
                              <span>{listing.bedrooms} Beds</span>
                            )}
                            {listing.bathrooms !== undefined && (
                              <span>• {listing.bathrooms} Baths</span>
                            )}
                            {listing.sqft && (
                              <span>
                                • {listing.sqft.toLocaleString()} sqft
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-6 rounded-full bg-charcoal-200 flex items-center justify-center text-xs font-bold text-charcoal-600">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="font-bold text-charcoal-700">
                            {listing.ownerName}
                          </span>
                        </div>
                        {listing.location ? (
                          <div className="text-xs text-charcoal-500 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />{" "}
                            {listing.location}
                          </div>
                        ) : (
                          <div className="text-xs text-charcoal-400 italic">
                            Location unassigned
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={`${getStatusColor(listing.status)} border-none shadow-none font-bold cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap`}
                          onClick={() =>
                            handleStatusToggle(listing.id, listing.status)
                          }
                        >
                          {listing.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-xs font-bold text-charcoal-600">
                          <span title="Views">
                            <Eye className="h-3 w-3 inline mr-1 text-charcoal-400" />
                            {listing.views}
                          </span>
                          <span
                            title="Enquiries"
                            className="text-brand-600 bg-brand-50 px-2 py-0.5 rounded-sm whitespace-nowrap"
                          >
                            {listing.enquiries} leads
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => openEditWizard(listing)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-charcoal-500 hover:text-brand-600 hover:bg-brand-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => alert("Opening context menu...")}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-charcoal-500 hover:text-charcoal-900"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-brand-50 border border-brand-200 rounded-sm p-4 text-sm font-medium text-brand-800 flex items-start gap-3">
        <Home className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">On-Behalf Uploading:</span> Listings you
          create on behalf of an owner are automatically tagged with your{" "}
          <code className="bg-white px-1.5 py-0.5 rounded text-brand-900 border border-brand-200 text-xs">
            agent_code
          </code>
          . You will receive all incoming enquiries while the owner retains
          legal profile ownership.
        </div>
      </div>

      {/* Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-charcoal-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm pt-10 pb-10">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50 shrink-0">
              <div>
                <h3 className="font-heading font-bold text-xl text-charcoal-950 flex items-center gap-2">
                  <Home className="h-5 w-5 text-brand-600" />
                  {editingListing ? "Edit Listing" : "List New Property"}
                </h3>
                <p className="text-sm text-charcoal-500 font-medium mt-1">
                  Step {wizardStep} of {WIZARD_STEPS}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingListing(null);
                  setIsWizardOpen(false);
                }}
                className="h-8 w-8 flex items-center justify-center rounded-sm bg-white border border-charcoal-200 text-charcoal-400 hover:text-charcoal-900 transition-colors shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-1.5 w-full bg-charcoal-100 shrink-0">
              <div
                className="h-full bg-brand-600 transition-all duration-300"
                style={{ width: `${(wizardStep / WIZARD_STEPS) * 100}%` }}
              ></div>
            </div>

            {renderWizardStep()}

            <div className="p-5 border-t border-charcoal-100 bg-charcoal-50 shrink-0 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
              <Button
                variant="ghost"
                onClick={() => setWizardStep(wizardStep - 1)}
                className={`font-bold text-charcoal-600 ${wizardStep === 1 ? "invisible" : ""}`}
              >
                Back
              </Button>

              {wizardStep < WIZARD_STEPS ? (
                <Button
                  onClick={() => {
                    if (canContinue()) setWizardStep(wizardStep + 1);
                  }}
                  disabled={!canContinue()}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-8 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSaveListing}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-8 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />{" "}
                  {editingListing ? "Save Changes" : "Publish Listing"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
