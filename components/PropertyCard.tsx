import Image from "next/image";
import { Bed, Bath, ShieldCheck, MapPin } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";

interface PropertyCardProps {
    id: string;
    title: string;
    price: string;
    pricePeriod: "month" | "year" | "one-off";
    location: string;
    bedrooms: number;
    bathrooms: number;
    imageUrl: string;
    isVerified: boolean;
    category: "Rent" | "Sale" | "Rent-to-Own";
}

export default function PropertyCard({
    title,
    price,
    pricePeriod,
    location,
    bedrooms,
    bathrooms,
    imageUrl,
    isVerified,
    category,
}: PropertyCardProps) {
    return (
        <Card className="group overflow-hidden cursor-pointer border-transparent hover:border-slate-200">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl">
                <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {category === "Rent-to-Own" && (
                        <Badge variant="accent" className="shadow-sm">
                            Rent-to-Own
                        </Badge>
                    )}
                    {isVerified && (
                        <Badge variant="verified" className="shadow-sm">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                        </Badge>
                    )}
                </div>
            </div>

            <div className="p-4 flex flex-col gap-2.5">
                <div>
                    <h3 className="font-heading font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-brand-700 transition-colors">
                        {title}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{location}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                    <div className="flex items-center gap-1.5">
                        <Bed className="h-4 w-4 text-slate-400" />
                        <span>{bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Bath className="h-4 w-4 text-slate-400" />
                        <span>{bathrooms}</span>
                    </div>
                </div>

                <div className="flex items-baseline gap-1.5 pt-2 border-t border-slate-100">
                    <span className="font-heading font-bold text-xl text-brand-700">{price}</span>
                    {pricePeriod !== "one-off" && (
                        <span className="text-slate-500 text-sm font-medium">/{pricePeriod}</span>
                    )}
                </div>
            </div>
        </Card>
    );
}
