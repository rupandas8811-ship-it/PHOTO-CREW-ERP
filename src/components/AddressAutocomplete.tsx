import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

interface AddressData {
  client_residence_address: string;
  city: string;
  state: string;
  pincode: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectAddress: (data: AddressData) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onSelectAddress,
  disabled = false,
  className = '',
  placeholder = '',
  isTextArea = false,
  rows = 2,
}) => {
  const placesLib = useMapsLibrary('places');
  
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [serviceError, setServiceError] = useState(false);
  
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize autocomplete and places services once library is loaded
  useEffect(() => {
    if (!placesLib) return;
    try {
      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new placesLib.AutocompleteService();
      }
      // Create a dummy element for PlacesService
      if (!placesServiceRef.current) {
        const dummy = document.createElement('div');
        placesServiceRef.current = new placesLib.PlacesService(dummy);
      }
      setServiceError(false);
    } catch (err) {
      console.error('Error initializing Google Maps Places services:', err);
      setServiceError(true);
    }
  }, [placesLib]);

  // If maps is taking too long or isn't available, we can set a small timeout or check if process.env key is empty
  const isMapsAvailable = !!placesLib && !serviceError;

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch suggestions as the user types
  useEffect(() => {
    if (!value || value.trim().length < 3 || !isMapsAvailable || !autocompleteServiceRef.current) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(() => {
      setIsLoading(true);
      autocompleteServiceRef.current?.getPlacePredictions(
        { input: value },
        (results, status) => {
          setIsLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setShowDropdown(true);
            setActiveIndex(-1);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      );
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [value, isMapsAvailable]);

  // Handle selecting an address suggestion
  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    setIsLoading(true);
    setShowDropdown(false);

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'formatted_address'],
      },
      (place, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const components = place.address_components || [];
          
          const getComponent = (types: string[]) => {
            const comp = components.find(c => c.types?.some(t => types.includes(t)));
            return comp ? comp.long_name : '';
          };

          const pincode = getComponent(['postal_code']);
          const state = getComponent(['administrative_area_level_1']);
          
          // Determine City: prefer locality, fall back to administrative_area_level_2 or sublocality
          const city = getComponent(['locality']) || getComponent(['administrative_area_level_2']) || getComponent(['sublocality_level_1']);
          
          const formattedAddress = place.formatted_address || prediction.description;

          onSelectAddress({
            client_residence_address: formattedAddress,
            city,
            state,
            pincode,
          });
        } else {
          // Fallback to prediction description if details fail
          onSelectAddress({
            client_residence_address: prediction.description,
            city: '',
            state: '',
            pincode: '',
          });
        }
      }
    );
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % predictions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + predictions.length) % predictions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < predictions.length) {
        handleSelectPrediction(predictions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {isTextArea ? (
        <textarea
          rows={rows}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`${className} w-full`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`${className} w-full`}
          placeholder={placeholder}
        />
      )}

      {/* Loading indicator inside input/textarea area if needed */}
      {isLoading && (
        <div className="absolute right-3 top-3 pointer-events-none">
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        </div>
      )}

      {/* Suggestion Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-800/60 font-sans">
          {predictions.map((pred, idx) => (
            <button
              key={pred.place_id}
              type="button"
              onClick={() => handleSelectPrediction(pred)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors text-xs cursor-pointer ${
                idx === activeIndex
                  ? 'bg-indigo-600/20 text-white font-medium'
                  : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4 mt-0.5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="font-semibold line-clamp-1">
                  {pred.structured_formatting?.main_text || pred.description}
                </p>
                {pred.structured_formatting?.secondary_text && (
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {pred.structured_formatting.secondary_text}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Friendly error message if address service is unavailable */}
      {!isMapsAvailable && value.trim().length >= 3 && (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-500 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Address suggestions are currently unavailable. Please enter the address manually.</span>
        </div>
      )}
    </div>
  );
};
