// frontend/src/components/Maps.jsx

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import { FiMapPin, FiStar, FiLink, FiNavigation, FiSearch, FiLoader, FiSun, FiMoon, FiMap, FiChevronUp } from 'react-icons/fi';

// --- HELPER CONFIG AND FUNCTIONS (UNCHANGED AND VERIFIED) ---
const libraries = ['places'];
const mapContainerStyle = { height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 };
const center = { lat: 28.6139, lng: 77.2090 };
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] }, { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] }, { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }, { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] }, { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] }, { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] }, { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] }, { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] }, { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] }, { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] }, { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] }, { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] }, { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] }, { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] }, { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] }, { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }, { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] }, { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];
function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; }

// --- UI COMPONENTS (UNCHANGED AND VERIFIED) ---
const SkeletonLoader = () => (
    <div className="p-6 space-y-5">
        <div className="h-7 skeleton rounded w-3/4"></div> <div className="h-4 skeleton rounded w-full"></div> <div className="h-4 skeleton rounded w-5/6"></div>
        <div className="flex space-x-4 pt-4"> <div className="h-11 skeleton rounded-lg w-1/2"></div> <div className="h-11 skeleton rounded-lg w-1/2"></div> </div>
    </div>
);
const ThemeToggle = ({ theme, onToggle }) => (
    <button onClick={onToggle} className="p-2 rounded-full theme-toggle" aria-label="Toggle dark mode">
        {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
    </button>
);

// --- MAIN COMPONENT ---
export default function MapComponent() {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    useEffect(() => { const root = window.document.documentElement; root.dataset.theme = theme; root.classList.remove(theme === 'light' ? 'dark' : 'light'); root.classList.add(theme); localStorage.setItem('theme', theme); }, [theme]);
    
    const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, libraries });
    const [mapRef, setMapRef] = useState(null);
    const [selected, setSelected] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const PROXY_URL = import.meta.env.VITE_PROXY_URL;
    const searchInputRef = useRef(null);
    
    // --- LOGIC FUNCTIONS (UNCHANGED AND VERIFIED) ---
    useEffect(() => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }), (error) => console.error("Error getting user location:", error.message)); } }, []);
    const onMapLoad = useCallback((map) => setMapRef(map), []);
    const panTo = useCallback((coords) => { if (mapRef) { mapRef.panTo(coords); mapRef.setZoom(15); } }, [mapRef]);
    const handleInputChange = async (event) => { const input = event.target.value; setError(''); if (input.length < 3) { setSuggestions([]); setIsSearching(false); return; } setIsSearching(true); try { const res = await fetch(`${PROXY_URL}/api/places/autocomplete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input }), }); const data = await res.json(); if (data.error) throw new Error(data.error); setSuggestions(data.predictions || []); } catch (err) { console.error(err); setError(err.message); setSuggestions([]); } finally { setIsSearching(false); } };
    const debouncedChangeHandler = useCallback(debounce(handleInputChange, 600), [PROXY_URL]);
    const handleSuggestionClick = async (place_id) => { setIsPanelOpen(true); if (searchInputRef.current) { const suggestion = suggestions.find(s => s.place_id === place_id); searchInputRef.current.value = suggestion ? suggestion.description : ''; } setSuggestions([]); setError(''); setIsLoadingDetails(true); setSelected(null); try { const res = await fetch(`${PROXY_URL}/api/places/details`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ place_id }), }); const data = await res.json(); if (data.error) throw new Error(data.error); const place = data.result; setSelected(place); if (place.geometry) { panTo(place.geometry.location); } } catch (err) { console.error(err); setError(err.message); } finally { setIsLoadingDetails(false); } };
    const getDirectionsUrl = () => { if (!selected?.geometry) return '#'; const destination = `${selected.geometry.location.lat},${selected.geometry.location.lng}`; let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`; if (userLocation) { url += `&origin=${userLocation.lat},${userLocation.lng}`; } return url; };

    if (loadError) return <div className="flex items-center justify-center h-screen bg-slate-900 text-red-500">Error loading maps. Check API key.</div>;
    if (!isLoaded) return <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-300">Loading Map Interface...</div>;

    return (
        <div className="relative h-screen w-screen overflow-hidden font-sans">
            <GoogleMap
                mapContainerStyle={mapContainerStyle} center={center} zoom={12} onLoad={onMapLoad}
                options={{ disableDefaultUI: true, zoomControl: true, styles: theme === 'dark' ? darkMapStyle : [] }}>
                {selected && <Marker position={selected.geometry.location} />}
            </GoogleMap>

            {/* --- RE-ENGINEERED FLOATING PANEL --- */}
            <aside className={`glass-panel floating-panel absolute z-10 flex flex-col
                               w-full md:w-96 lg:w-[450px]
                               md:h-full md:max-h-none md:top-0 md:left-0 md:rounded-none rounded-t-2xl
                               bottom-0 left-0
                               transition-all duration-500 ease-in-out
                               ${isPanelOpen ? 'max-h-[90vh]' : 'max-h-32 md:max-h-full'}`}>
                
                <header 
                    className="flex-shrink-0 flex justify-between items-center p-4 md:p-6 cursor-pointer md:cursor-default"
                    onClick={() => { if (window.innerWidth < 768) setIsPanelOpen(!isPanelOpen) }}
                >
                    <div className="flex items-center space-x-3">
                        <FiMap className="text-blue-500 dark:text-blue-400" size={24} />
                        <h1 className="gradient-title text-2xl">Places</h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
                        <FiChevronUp className={`md:hidden text-slate-400 transition-transform duration-300 ${isPanelOpen ? 'rotate-180' : 'rotate-0'}`} />
                    </div>
                </header>
                
                <div className="px-4 md:px-6 pb-4 flex-grow flex flex-col space-y-4 min-h-0">
                    <div className="relative flex-shrink-0">
                        <FiSearch className="absolute top-1/2 left-4 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            className="search-input w-full h-12 rounded-lg p-2 pl-12"
                            placeholder="Search for a place..."
                            onChange={debouncedChangeHandler}
                            onFocus={() => setIsPanelOpen(true)}
                            ref={searchInputRef}
                        />
                        {isSearching && <FiLoader className="absolute top-1/2 right-4 transform -translate-y-1/2 text-slate-400 animate-spin" />}
                    </div>

                    <div className="flex-grow min-h-0 overflow-y-auto">
                        {suggestions.length > 0 && (
                            <div className="suggestions-dropdown rounded-lg">
                                {suggestions.map(({ place_id, description }) => (
                                    <div key={place_id} className="p-3 text-slate-800 dark:text-slate-200 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 cursor-pointer border-b dark:border-slate-700 last:border-b-0"
                                        onClick={() => handleSuggestionClick(place_id)}>
                                        {description}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {error && <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-3 rounded-lg">{error}</div>}

                        {/* Details are now inside the scrollable container */}
                        <section className="bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-300/50 dark:border-slate-700/50 shadow-inner">
                            {isLoadingDetails ? <SkeletonLoader /> : selected ? (
                                <div className="p-6">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selected.name}</h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex items-start">
                                        <FiMapPin className="mr-3 flex-shrink-0 mt-1" /> <span>{selected.formatted_address}</span>
                                    </p>
                                    
                                    {selected.rating && (
                                        <div className="flex items-center mt-4">
                                            <span className="text-yellow-500 font-bold mr-2">{selected.rating.toFixed(1)}</span>
                                            <div className="flex">
                                                {[...Array(5)].map((_, i) => ( <FiStar key={i} size={18} className={`star-filled ${i < Math.round(selected.rating) ? 'text-yellow-400 fill-current' : 'text-slate-300 dark:text-slate-600'}`} /> ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {selected.website && ( <a href={selected.website} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center justify-center py-3 px-4 text-white rounded-lg"> <FiLink className="mr-2" /> Website </a> )}
                                        <a href={getDirectionsUrl()} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center justify-center py-3 px-4 text-white rounded-lg"> <FiNavigation className="mr-2" /> Directions </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-slate-500 dark:text-slate-400 p-6">
                                    <FiMapPin size={48} className="mb-4 opacity-50" />
                                    <h3 className="font-semibold text-lg">Discover Places</h3>
                                    <p className="text-sm max-w-xs mx-auto mt-1 opacity-80">Use the search bar to find landmarks, restaurants, and more.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </aside>
        </div>
    );
}
