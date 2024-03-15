import { useState, useCallback, useRef } from 'react';
import { useLoadScript, GoogleMap, Autocomplete, Marker } from '@react-google-maps/api';


const libraries = ['places'];
const mapContainerStyle = {
    height: '320px',
    width: '100%',
    border: '1px solid black',
    marginTop: '10px',
    marginBottom: '10px',
    padding: '8px 8px 8px 8px',
    borderRadius: '8px',
    position: 'relative',
    
};

const center = { lat: 46.63, lng: 10.51 }; // Default center, replace with your preferred default location
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_API_KEY; // Replace with your API key

/**
 * MapComponent is a component that displays a map with a search bar and markers for selected places.
 */
export default function MapComponent() {
    const inputRef = useRef(null);
    const [mapRef, setMapRef] = useState(null);
    const [selected, setSelected] = useState(null);
    const [autocomplete, setAutocomplete] = useState('')


    /**
     * handleClick is a function that selects the text in the input field when clicked.
     */
    const handleClick = () => {
        inputRef.current.select();
    };

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: googleMapsApiKey,
        libraries,
    });

   
    /**
     * onLoad is a callback function that is called when the map is loaded.
     * It sets the initial center of the map to the user's current location if available.
     * @param {object} map - The Google Maps map object.
     */
    const onLoad = useCallback((map) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const newCenter = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.panTo(newCenter);
                map.setZoom(12);
                map.setCenter(newCenter);
            }, (error) => {
                console.log('Error getting location:', error);
            });
        }
        setMapRef(map);
    }, []);

    /**
     * onUnmount is a callback function that is called when the component is unmounted.
     * It sets the map reference to null.
     */
    const onUnmount = useCallback(() => {
        setMapRef(null);
    }, []);

    /**
     * onPlaceChanged is a function that is called when a place is selected from the autocomplete search bar.
     * It updates the selected place state and pans the map to the selected place's location.
     * @param {object} autocomplete - The Google Maps autocomplete object.
     */
    const onPlaceChanged = (autocomplete) => {
        const place = autocomplete.getPlace();
        setSelected(place);

        if (place.geometry && place.geometry.location) {
            const location = place.geometry.location;
            mapRef.panTo({ lat: location.lat(), lng: location.lng() });
            mapRef.setZoom(14);
            mapRef.setCenter({ lat: location.lat(), lng: location.lng() });
        }
    };

    if (loadError) {
        return <div>Error loading maps</div>;
    }

    if (!isLoaded) {
        return <div>Loading Maps</div>;
    }

    console.log('Places data: ', selected)

    return (
        <div className='w-full flex flex-col p-[8px] outline-none border border-black bg-blue-200'>
            <Autocomplete
                onLoad={(autoC) => setAutocomplete(autoC)}
                onPlaceChanged={() => onPlaceChanged(autocomplete)}
            >
                <input
                    type="text"
                    className='w-[100%] h-10 border border-black rounded-lg shadow-lg p-2'
                    placeholder="Search Places"
                    ref={inputRef}
                    onClick={handleClick}
                />
            </Autocomplete>
            <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={center}
                    zoom={5}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    mapTypeId='roadmap'
                >
                    {selected && (
                        <Marker
                            position={{
                                lat: selected.geometry.location.lat(),
                                lng: selected.geometry.location.lng(),
                            }}
                            icon={{
                                url: selected.icon,
                                scaledSize: new window.google.maps.Size(20, 20),
                                origin: new window.google.maps.Point(0, 0),
                                anchor: new window.google.maps.Point(25, 25),
                            }}
                        />
                    )}
                </GoogleMap>

            <div className='w-full h-[50px] m-2 p-2'>
                {selected ? (<div>
                    <p>Latitude: {selected.geometry.location.lat()}</p>
                    <p>Longitude: {selected.geometry.location.lng()}</p>
                    <p>Formatted Address: {selected.formatted_address}</p>
                    <p>Location Name: {selected.name}</p>
                    <p>Place ID: {selected.place_id}</p>
                    <p>Website: {selected.website}</p>
                    <p>Vicinity: {selected.vicinity}</p>
                    <p>User Ratings Total: {selected.user_ratings_total}</p>
                    <p>URL: <a href={selected.url} target="_blank">{selected.url}</a> </p>
                    <p>Average Rating: {selected.rating}</p>
                    <p>International Phone Number: {selected.international_phone_number}</p>
                    <p>Icon Mask URL: <a href={selected.icon_mask_base_uri} target='_blank'>{selected.icon_mask_base_uri}</a></p>
                    <p>Icon: <a href={selected.icon} target='_blank'>{selected.icon}</a></p>
                </div>) : (<p> No Data...</p>)}
            </div>
        </div>
    );
}