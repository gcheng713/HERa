import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Phone, FileText, HandHeart } from "lucide-react";

interface Resource {
  id: number;
  name: string;
  category: string;
  description: string;
  contactInfo: {
    phone?: string;
    email?: string;
    hours?: string;
  };
  url?: string;
}

const ResourceCategories = {
  FINANCIAL: "Financial Assistance",
  SUPPORT: "Support Services",
  EDUCATION: "Educational Resources",
  EMERGENCY: "Emergency Services",
};

const Resources = () => {
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const getResourcesByCategory = (category: string) => {
    return resources.filter(
      (resource: Resource) => resource.category === category
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Resources</h1>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-5 w-5" />
            <h3 className="font-semibold">24/7 Helpline</h3>
          </div>
          <p>1-800-555-0000</p>
          <p className="text-sm text-muted-foreground mt-2">
            Confidential support available 24 hours a day, 7 days a week
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="FINANCIAL">
        <TabsList className="w-full justify-start">
          {Object.entries(ResourceCategories).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="flex-1 md:flex-none">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          Object.entries(ResourceCategories).map(([key, value]) => (
            <TabsContent key={key} value={key}>
              <div className="grid gap-4">
                {getResourcesByCategory(value)?.map((resource: Resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </TabsContent>
          ))
        )}
      </Tabs>
    </div>
  );
};

const ResourceCard = ({ resource }: { resource: Resource }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {resource.category === ResourceCategories.FINANCIAL && (
          <HandHeart className="h-5 w-5" />
        )}
        {resource.category === ResourceCategories.EDUCATION && (
          <FileText className="h-5 w-5" />
        )}
        {resource.name}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="mb-4">{resource.description}</p>

      <div className="space-y-2">
        {resource.contactInfo.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {resource.contactInfo.phone}
          </p>
        )}
        {resource.contactInfo.hours && (
          <p className="text-sm text-muted-foreground">
            Hours: {resource.contactInfo.hours}
          </p>
        )}
      </div>

      {resource.url && (
        <Button variant="outline" className="mt-4" asChild>
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Visit Website
          </a>
        </Button>
      )}
    </CardContent>
  </Card>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default Resources;