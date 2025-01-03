import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StateSelector from "@/components/StateSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Phone, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LegalInfo as LegalInfoType } from "@/lib/types";

const LegalInfo = () => {
  const [selectedState, setSelectedState] = useState<string>("");

  const { data: legalInfo, isLoading } = useQuery<LegalInfoType>({
    queryKey: [`/api/legal-info/${selectedState}`, selectedState],
    enabled: !!selectedState,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Legal Information</h1>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This information is regularly updated but laws can change quickly. Always verify with local healthcare providers or legal professionals.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <StateSelector value={selectedState} onValueChange={setSelectedState} />
      </div>

      {selectedState && (
        <div className="space-y-6">
          {legalInfo && (
            <Tabs defaultValue="laws" className="space-y-4">
              <TabsList>
                <TabsTrigger value="laws">Current Laws</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="laws">
                <div className="space-y-4">
                  {/* Restrictions Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Restrictions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {legalInfo.restrictions.map((restriction, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {restriction}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Requirements Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {legalInfo.requirements.map((requirement, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {requirement}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="resources">
                <div className="space-y-4">
                  {/* Emergency Contacts */}
                  {legalInfo.emergencyContacts?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Emergency Contacts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {legalInfo.emergencyContacts.map((contact, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Phone className="h-5 w-5 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{contact.name}</p>
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="text-sm text-primary hover:underline"
                                >
                                  {contact.phone}
                                </a>
                                {contact.available24x7 && (
                                  <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    24/7
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Legal Resources */}
                  {legalInfo.legalResources?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Legal Resources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {legalInfo.legalResources.map((resource, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Info className="h-5 w-5 mt-0.5 text-muted-foreground" />
                              <div>
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:underline text-primary"
                                >
                                  {resource.name}
                                </a>
                                <p className="text-sm text-muted-foreground">
                                  {resource.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Health Department Info */}
                  {legalInfo.healthDeptInfo && (
                    <Card>
                      <CardHeader>
                        <CardTitle>State Health Department</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {legalInfo.healthDeptInfo.name && (
                            <p className="font-medium">{legalInfo.healthDeptInfo.name}</p>
                          )}
                          <div className="flex flex-col gap-2">
                            {legalInfo.healthDeptInfo.website && (
                              <a
                                href={legalInfo.healthDeptInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-2"
                              >
                                <Globe className="h-4 w-4" />
                                Official Website
                              </a>
                            )}
                            {legalInfo.healthDeptInfo.phone && (
                              <a
                                href={`tel:${legalInfo.healthDeptInfo.phone}`}
                                className="text-primary hover:underline flex items-center gap-2"
                              >
                                <Phone className="h-4 w-4" />
                                {legalInfo.healthDeptInfo.phone}
                              </a>
                            )}
                            {legalInfo.healthDeptInfo.email && (
                              <a
                                href={`mailto:${legalInfo.healthDeptInfo.email}`}
                                className="text-primary hover:underline flex items-center gap-2"
                              >
                                <Mail className="h-4 w-4" />
                                {legalInfo.healthDeptInfo.email}
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          {isLoading && <LoadingSkeleton />}
        </div>
      )}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  </div>
);

export default LegalInfo;