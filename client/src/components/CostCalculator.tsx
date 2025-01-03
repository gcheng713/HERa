import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLoadScript, GoogleMap, DirectionsRenderer } from "@react-google-maps/api";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Car, Bus, Bike } from "lucide-react";

// Define libraries we need for the map
const libraries: ("places")[] = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "8px"
};

const defaultMapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

interface CostCalculatorProps {
  clinicLocation: {
    lat: number;
    lng: number;
    address: string;
  };
}

type FormValues = {
  startLocation: string;
  transportMode: "DRIVING" | "TRANSIT" | "BICYCLING";
};

// Constants for cost calculation
const COST_PER_MILE_DRIVING = 0.59; // IRS standard mileage rate
const AVERAGE_PARKING_COST = 15; // Average daily parking cost
const AVERAGE_TRANSIT_FARE = 2.75; // Average public transit fare
const BIKE_SHARE_BASE_COST = 3.5; // Base cost for bike share

export function CostCalculator({ clinicLocation }: CostCalculatorProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      startLocation: "",
      transportMode: "DRIVING",
    },
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const calculateCost = (
    mode: "DRIVING" | "TRANSIT" | "BICYCLING",
    distanceInMiles: number
  ) => {
    switch (mode) {
      case "DRIVING":
        return distanceInMiles * COST_PER_MILE_DRIVING + AVERAGE_PARKING_COST;
      case "TRANSIT":
        // Assuming 2 trips (there and back) with potential transfers
        return AVERAGE_TRANSIT_FARE * 4;
      case "BICYCLING":
        // Base cost plus time-based fee if distance is significant
        return distanceInMiles > 5
          ? BIKE_SHARE_BASE_COST + (distanceInMiles / 5) * 2
          : BIKE_SHARE_BASE_COST;
      default:
        return 0;
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!window.google) {
      console.error("Google Maps not loaded");
      return;
    }

    setIsCalculating(true);
    try {
      const directionsService = new google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: data.startLocation,
        destination: clinicLocation.address,
        travelMode: google.maps.TravelMode[data.transportMode],
      });

      setDirections(result);

      // Extract distance and duration
      const route = result.routes[0].legs[0];
      setDistance(route.distance?.text || "");
      setDuration(route.duration?.text || "");

      // Calculate cost
      const distanceInMiles = parseFloat(route.distance?.text?.split(" ")[0] || "0");
      const cost = calculateCost(data.transportMode, distanceInMiles);
      setEstimatedCost(cost);

      // Center the map on the route
      if (mapInstance && result.routes[0].bounds) {
        mapInstance.fitBounds(result.routes[0].bounds);
      }
    } catch (error) {
      console.error("Error calculating route:", error);
    }
    setIsCalculating(false);
  };

  if (loadError) {
    return <div className="text-red-500">Error loading Google Maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="startLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting Location</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your address or zip code" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transportMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transportation Mode</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="DRIVING" id="driving" />
                      <label htmlFor="driving" className="flex items-center gap-1 cursor-pointer">
                        <Car className="h-4 w-4" />
                        Car
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="TRANSIT" id="transit" />
                      <label htmlFor="transit" className="flex items-center gap-1 cursor-pointer">
                        <Bus className="h-4 w-4" />
                        Transit
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BICYCLING" id="bicycling" />
                      <label htmlFor="bicycling" className="flex items-center gap-1 cursor-pointer">
                        <Bike className="h-4 w-4" />
                        Bike
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isCalculating} className="w-full">
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              "Calculate Route & Cost"
            )}
          </Button>
        </form>
      </Form>

      {directions && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Distance</p>
              <p className="text-lg">{distance}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Duration</p>
              <p className="text-lg">{duration}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Estimated Cost</p>
            <p className="text-2xl font-bold text-primary">
              ${estimatedCost.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              * Cost includes estimated fuel, parking, or transit fares where applicable
            </p>
          </div>

          <div style={{ height: "300px", width: "100%", position: "relative" }}>
            <GoogleMap
              onLoad={setMapInstance}
              mapContainerStyle={mapContainerStyle}
              zoom={12}
              center={clinicLocation}
              options={defaultMapOptions}
            >
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          </div>
        </div>
      )}
    </div>
  );
}