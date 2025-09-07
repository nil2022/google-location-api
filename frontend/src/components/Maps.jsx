// frontend/src/components/Maps.jsx
import { useState, useCallback, useRef } from 'react';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';

const libraries = ['places'];
const mapContainerStyle = {
    height: '320px',
    width: '100%',
    border: '1px solid black',
    marginTop: '10px',
    marginBottom: '10px',
    borderRadius: '8px',
};
const center = { lat: 28.6139, lng: 77.2090 }; // Default to Delhi

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default function MapComponent() {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries,
    });

    const [mapRef, setMapRef] = useState(null);
    const [selected, setSelected] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    
    const PROXY_URL = import.meta.env.VITE_PROXY_URL;

    const onMapLoad = useCallback((map) => {
        setMapRef(map);
    }, []);

    const panTo = useCallback(({ lat, lng }) => {
        mapRef.panTo({ lat, lng });
        mapRef.setZoom(14);
    }, [mapRef]);

    // Fetch autocomplete suggestions from our backend proxy
    const handleInputChange = async (event) => {
        const input = event.target.value;
        setError('');
        if (input.length < 3) {
            setSuggestions([]);
            return;
        }

        try {
            const res = await fetch(`${PROXY_URL}/api/places/autocomplete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setSuggestions(data.predictions || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
            setSuggestions([]);
        }
    };
    
    const debouncedChangeHandler = useCallback(debounce(handleInputChange, 300), [PROXY_URL]);

    // Fetch place details when a suggestion is clicked
    const handleSuggestionClick = async (place_id) => {
        setSuggestions([]); // Clear suggestions
        setError('');
        try {
            const res = await fetch(`${PROXY_URL}/api/places/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ place_id }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const place = data.result;
            setSelected(place);
            if (place.geometry) {
                panTo(place.geometry.location);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };


    if (loadError) return <div>Error loading maps. Check your VITE_GOOGLE_MAPS_API_KEY.</div>;
    if (!isLoaded) return <div>Loading Maps...</div>;

    return (
        <div className='w-full flex flex-col p-[8px] outline-none border border-black bg-blue-200'>
            <div className="relative">
                <input
                    type="text"
                    className='w-[100%] h-10 border border-black rounded-lg shadow-lg p-2'
                    placeholder="Search for a place"
                    onChange={debouncedChangeHandler}
                />
                {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg z-10">
                        {suggestions.map(({ place_id, description }) => (
                            <div
                                key={place_id}
                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleSuggestionClick(place_id)}
                            >
                                {description}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {error && <div className="bg-red-200 text-red-800 p-2 my-2 rounded">{error}</div>}

            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={10}
                onLoad={onMapLoad}
                options={{ disableDefaultUI: true, zoomControl: true }}
            >
                {selected && <Marker position={selected.geometry.location} />}
            </GoogleMap>

            <div className='w-full min-h-[50px] m-2 p-2 bg-white rounded border'>
                {selected ? (
                    <div>
                        <h3 className="font-bold">{selected.name}</h3>
                        <p>{selected.formatted_address}</p>
                        <p>Rating: {selected.rating || 'N/A'}</p>
                        {selected.website && <a href={selected.website} target="_blank" rel="noreferrer" className="text-blue-600">Website</a>}
                    </div>
                ) : (
                    <p>Search for a place to see details...</p>
                )}
            </div>
        </div>
    );
}