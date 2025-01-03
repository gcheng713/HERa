import { useCallback, useState } from "react";
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from "@react-google-maps/api";
import type { Clinic } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone } from "lucide-react";

interface ClinicMapProps {
  clinics: Clinic[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

const defaultCenter = { lat: 39.8283, lng: -98.5795 }; // Center of US

const ClinicMap = ({ clinics, center, zoom = 7 }: ClinicMapProps) => {
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);

    if (clinics.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoords = false;

      clinics.forEach((clinic) => {
        if (clinic.latitude && clinic.longitude) {
          const lat = Number(clinic.latitude);
          const lng = Number(clinic.longitude);

          if (!isNaN(lat) && !isNaN(lng)) {
            bounds.extend({ lat, lng });
            hasValidCoords = true;
          }
        }
      });

      if (hasValidCoords) {
        map.fitBounds(bounds);
      }
    }
  }, [clinics]);

  if (!isLoaded) {
    return (
      <div className="w-full h-[500px] bg-muted animate-pulse flex items-center justify-center">
        Loading map...
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] relative">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center || defaultCenter}
        zoom={zoom}
        onLoad={onLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
        }}
      >
        {clinics.map((clinic) => {
          if (!clinic.latitude || !clinic.longitude) return null;

          const lat = Number(clinic.latitude);
          const lng = Number(clinic.longitude);

          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <MarkerF
              key={clinic.id}
              position={{ lat, lng }}
              onClick={() => setSelectedClinic(clinic)}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: new google.maps.Size(40, 40)
              }}
            />
          );
        })}

        {selectedClinic && selectedClinic.latitude && selectedClinic.longitude && (
          <InfoWindowF
            position={{
              lat: Number(selectedClinic.latitude),
              lng: Number(selectedClinic.longitude)
            }}
            onCloseClick={() => setSelectedClinic(null)}
          >
            <Card className="min-w-[200px] shadow-none border-0">
              <CardContent className="p-3 space-y-2">
                <h3 className="font-semibold">{selectedClinic.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedClinic.address}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedClinic.name + ' ' + selectedClinic.address)}`, '_blank')}
                    className="flex-1"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`tel:${selectedClinic.phone}`)}
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>
              </CardContent>
            </Card>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
};

export default ClinicMap;