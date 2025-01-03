import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, Map, BookOpen, Phone } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";
import type { Clinic } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

  const R = 3959; // Earth's radius in miles (use 6371 for kilometers)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const Home = () => {
  const [zipcode, setZipcode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const { toast } = useToast();

  // Fetch all clinics to find the nearest one
  const { data: clinics, isLoading: isClinicsLoading } = useQuery<Clinic[]>({
    queryKey: ["/api/clinics/all"],
  });

  const searchNearestClinic = async () => {
    if (!zipcode || zipcode.length !== 5) {
      toast({
        title: "Invalid Zipcode",
        description: "Please enter a valid 5-digit zipcode",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Convert zipcode to coordinates using a geocoding service
      const response = await fetch(
        `https://api.geocod.io/v1.7/geocode?postal_code=${zipcode}&api_key=${import.meta.env.VITE_GEOCODIO_API_KEY}`
      );
      const data = await response.json();

      if (!data.results || !data.results[0]) {
        throw new Error("Invalid zipcode or location not found");
      }

      const { lat, lng: lon } = data.results[0].location;
      setUserCoords({ lat, lon });
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Error",
        description: "Failed to find location from zipcode",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Find nearest clinic based on user coordinates
  const nearestClinic = userCoords && clinics?.length
    ? clinics.reduce((nearest, clinic) => {
        if (!clinic.latitude || !clinic.longitude) return nearest;

        const distance = calculateDistance(
          userCoords.lat,
          userCoords.lon,
          clinic.latitude,
          clinic.longitude
        );

        return !nearest || distance < nearest.distance
          ? { clinic, distance }
          : nearest;
      }, null as { clinic: Clinic; distance: number } | null)
    : null;

  return (
    <div className="space-y-8">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Compassionate Care & Support
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Access confidential information and resources about abortion services in your area.
        </p>

        <div className="flex gap-2 max-w-sm mx-auto">
          <Input
            type="text"
            placeholder="Enter your zipcode"
            value={zipcode}
            onChange={(e) => setZipcode(e.target.value)}
            maxLength={5}
            className="text-center"
          />
          <Button
            onClick={searchNearestClinic}
            disabled={isSearching || isClinicsLoading}
          >
            {isSearching && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Find Nearest Clinic
          </Button>
        </div>

        {nearestClinic && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Nearest Clinic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold">{nearestClinic.clinic.name}</h3>
                <p>{nearestClinic.clinic.address}</p>
                <p>Distance: {Math.round(nearestClinic.distance)} miles</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          nearestClinic.clinic.name +
                            " " +
                            nearestClinic.clinic.address
                        )}`,
                        "_blank"
                      )
                    }
                  >
                    <Map className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = `tel:${nearestClinic.clinic.phone}`}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {nearestClinic.clinic.phone}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Find Care
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Locate verified clinics and healthcare providers in your area</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Legal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Access up-to-date legal information specific to your state</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Educational materials and support services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              24/7 Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Connect with healthcare professionals and support services</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ask Our AI Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <AssistantChat />
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;