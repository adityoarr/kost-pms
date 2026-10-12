// src/components/property-card.tsx
"use client";

import Link from "next/link";

export default function PropertyCard({ property }: { property: any }) {
    return (
        <Link href={`/properties/${property.id}`} className="block group">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {property.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${property.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {property.status}
                    </span>
                </div>

                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    📍 {property.address}, {property.city}
                </p>

                {property.phone && (
                    <p className="text-gray-500 text-sm mt-4 flex items-center gap-2">
                        📞 {property.phone}
                    </p>
                )}
            </div>
        </Link>
    );
}