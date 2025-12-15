import {
    MapPin,
    Coffee,
    Utensils,
    Beer,
    Dumbbell,
    ShoppingBag,
    GraduationCap,
    Stethoscope,
    Trees,
    Bus,
    Plane,
    Building2,
    Music,
    Video
} from "lucide-react";

interface PlaceIconProps {
    type: string;
    className?: string;
    size?: number;
}

const iconMap: { [key: string]: any } = {
    'cafe': Coffee,
    'restaurant': Utensils,
    'bakery': Coffee,
    'bar': Beer,
    'night_club': Music,
    'gym': Dumbbell,
    'fitness_center': Dumbbell,
    'store': ShoppingBag,
    'shopping_mall': ShoppingBag,
    'clothing_store': ShoppingBag,
    'school': GraduationCap,
    'university': GraduationCap,
    'hospital': Stethoscope,
    'doctor': Stethoscope,
    'pharmacy': Stethoscope,
    'park': Trees,
    'transit_station': Bus,
    'bus_station': Bus,
    'train_station': Bus,
    'airport': Plane,
    'lodging': Building2,
    'hotel': Building2,
    'movie_theater': Video,
    'museum': Building2,
    'generic': MapPin
};

export default function PlaceIcon({ type, className, size = 20 }: PlaceIconProps) {
    // Clean up type string (e.g., "tourist_attraction" -> generic)
    const key = type?.toLowerCase() || 'generic';
    const IconComponent = iconMap[key] || MapPin;

    return <IconComponent size={size} className={className} />;
}
