import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StateSelector from "@/components/StateSelector";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Globe, Calculator, Map } from "lucide-react";
import { CostCalculator } from "@/components/CostCalculator";
import ClinicMap from "@/components/ClinicMap";
import type { Clinic } from "@/lib/types";

const ClinicFinder = () => {
  const [selectedState, setSelectedState] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [showMap, setShowMap] = useState(true);

  const { data: clinics, isLoading } = useQuery<Clinic[]>({
    queryKey: [`/api/clinics/${selectedState}`, selectedState],
    enabled: !!selectedState,
  });

  const filteredClinics = clinics?.filter((clinic: Clinic) =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Find a Clinic</h1>

      <div className="space-y-4">
        <StateSelector value={selectedState} onValueChange={setSelectedState} />

        {selectedState && (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Search clinics by name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowMap(!showMap)}
                  className="gap-2"
                >
                  <Map className="h-4 w-4" />
                  {showMap ? "Hide Map" : "Show Map"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Found {filteredClinics?.length || 0} clinics in {selectedState}
              </p>
            </div>

            {showMap && filteredClinics && filteredClinics.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <ClinicMap clinics={filteredClinics} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {selectedClinic && selectedClinic.latitude && selectedClinic.longitude && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Travel Cost Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <CostCalculator
              clinicLocation={{
                lat: selectedClinic.latitude,
                lng: selectedClinic.longitude,
                address: selectedClinic.address,
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          filteredClinics?.map((clinic: Clinic) => (
            <Card key={clinic.id}>
              <CardHeader>
                <CardTitle className="line-clamp-2">{clinic.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-sm">{clinic.address}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                    <a 
                      href={`tel:${clinic.phone}`}
                      className="text-sm hover:underline"
                    >
                      {clinic.phone}
                    </a>
                  </div>

                  {clinic.services && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {clinic.services.map((service, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {clinic.acceptedInsurance && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Accepted Insurance</h4>
                      <div className="flex flex-wrap gap-2">
                        {clinic.acceptedInsurance.map((insurance, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary"
                          >
                            {insurance}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.name + ' ' + clinic.address)}`, '_blank')}
                  className="flex-1"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Directions
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(clinic.name)}`, '_blank')}
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Website
                </Button>
                <Button
                  variant={selectedClinic?.id === clinic.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedClinic(selectedClinic?.id === clinic.id ? null : clinic)}
                  className="flex-1"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {selectedClinic?.id === clinic.id ? "Hide Calculator" : "Calculate Cost"}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <>
    {[1, 2, 3, 4].map((i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-48" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-6 w-20" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </CardFooter>
      </Card>
    ))}
  </>
);

export default ClinicFinder;