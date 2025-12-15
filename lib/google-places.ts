export interface Place {
    id: string;
    name: string;
    address: string;
    type: string;
    rating?: number;
    photoUrl?: string; // Derived from photos array
}

function getPhotoUrl(photoName: string, apiKey: string) {
    if (!photoName || !apiKey) return undefined;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;
}

export async function searchPlaces(query: string): Promise<Place[]> {
    if (!query) return [];

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_PLACES_API_KEY is missing");
        return [];
    }

    try {
        console.log(`Searching Google Places (New API) for: "${query}"`);

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.photos'
            },
            body: JSON.stringify({
                textQuery: query,
                languageCode: 'tr'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Google Places API Error (Search):", data);
            return [];
        }

        if (!data.places) return [];

        console.log(`Found ${data.places.length} places.`);
        return data.places.map((place: any) => ({
            id: place.id,
            name: place.displayName?.text || 'Bilinmeyen Mekan',
            address: place.formattedAddress || '',
            type: place.types?.[0] || 'unknown',
            rating: place.rating,
            photoUrl: place.photos?.[0]?.name ? getPhotoUrl(place.photos[0].name, apiKey) : undefined
        }));
    } catch (error) {
        console.error("Failed to fetch places:", error);
        return [];
    }
}

export async function getPlaceDetails(placeId: string): Promise<Place | null> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_PLACES_API_KEY is missing for details");
        return null;
    }

    try {
        console.log(`Fetching details for place ID: ${placeId}`);

        // Need to pass language via query param or header? 
        // v1 uses languageCode in body for search, but for GET details it uses `languageCode` query param.
        const responseWithLang = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=tr`, {
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,types,rating,photos'
            }
        });

        const data = await responseWithLang.json();

        if (!responseWithLang.ok) {
            console.error("Google Places API Error (Details):", data);
            return null;
        }

        return {
            id: data.id,
            name: data.displayName?.text || 'Bilinmeyen Mekan',
            address: data.formattedAddress || '',
            type: data.types?.[0] || 'unknown',
            rating: data.rating,
            photoUrl: data.photos?.[0]?.name ? getPhotoUrl(data.photos[0].name, apiKey) : undefined
        };
    } catch (error) {
        console.error("Failed to fetch place details:", error);
        return null;
    }
}
