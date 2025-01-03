import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const { toast } = useToast();

  const { mutate: generateClinics } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/generate-clinics", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to generate clinics");
      }
      return response.json();
    },
    onMutate: () => {
      setIsGenerating(true);
      toast({
        title: "Starting Clinic Generation",
        description: "Generating clinic data for all states. This may take a few minutes.",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Successfully generated ${data.count} clinics across all states.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate clinics: " + error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const { mutate: startCrawler } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/start-clinic-crawler", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to start crawler");
      }
      return response.json();
    },
    onMutate: () => {
      setIsCrawling(true);
      toast({
        title: "Crawler Started",
        description: "The clinic crawler has started. This may take a few minutes.",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Crawler has been triggered successfully. Please refresh the clinic finder page in a few minutes to see updated results.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start the crawler: " + error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCrawling(false);
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Admin Panel</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clinic Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use this button to start the clinic crawler. This will fetch the latest clinic data from multiple sources.
              </p>
              <Button 
                onClick={() => startCrawler()} 
                disabled={isCrawling}
                className="w-full"
              >
                {isCrawling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Crawler Running...
                  </>
                ) : (
                  'Start Clinic Crawler'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Test Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate additional clinic data using AI. This will create realistic test data for all states.
              </p>
              <Button 
                onClick={() => generateClinics()} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Clinics...
                  </>
                ) : (
                  'Generate Clinic Data'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;