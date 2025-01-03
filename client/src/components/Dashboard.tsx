import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Newspaper,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface UpdateData {
  id: number;
  type: "legal" | "clinic" | "news";
  state: string;
  title: string;
  description: string;
  timestamp: string;
  urgency?: "low" | "medium" | "high";
  url?: string;
}

export default function Dashboard() {
  const { data: updates = [], isLoading } = useQuery<UpdateData[]>({
    queryKey: ["/api/dashboard/updates"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const [selectedUpdate, setSelectedUpdate] = useState<UpdateData | null>(null);

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-yellow-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "legal":
        return <FileText className="h-5 w-5" />;
      case "clinic":
        return <MapPin className="h-5 w-5" />;
      case "news":
        return <Newspaper className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold text-primary">Live Updates Dashboard</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Auto-refreshing every 30 seconds</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-[120px] bg-muted" />
              <CardContent className="space-y-3">
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="h-5 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Legal Updates Card */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <FileText className="h-6 w-6" />
                Legal Updates
              </CardTitle>
              <CardDescription className="text-base">
                Recent legislative changes and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {updates
                    .filter((update) => update.type === "legal")
                    .map((update) => (
                      <div
                        key={update.id}
                        className="border-l-4 border-primary pl-4 py-3 space-y-2 cursor-pointer hover:bg-accent/50 rounded-r-lg transition-colors"
                        onClick={() => setSelectedUpdate(update)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-sm font-medium">
                            {update.state}
                          </Badge>
                          <Badge
                            className={cn(
                              "text-sm",
                              getUrgencyColor(update.urgency)
                            )}
                          >
                            {update.urgency || "info"}
                          </Badge>
                        </div>
                        <h4 className="text-lg font-medium">{update.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {update.description}
                        </p>
                        <time className="text-xs text-muted-foreground block">
                          {formatTimestamp(update.timestamp)}
                        </time>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Clinic Updates Card */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <MapPin className="h-6 w-6" />
                Clinic Updates
              </CardTitle>
              <CardDescription className="text-base">
                Real-time clinic availability and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {updates
                    .filter((update) => update.type === "clinic")
                    .map((update) => (
                      <div
                        key={update.id}
                        className="border-l-4 border-primary pl-4 py-3 space-y-2 cursor-pointer hover:bg-accent/50 rounded-r-lg transition-colors"
                        onClick={() => setSelectedUpdate(update)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-sm font-medium">
                            {update.state}
                          </Badge>
                          <time className="text-xs text-muted-foreground">
                            {formatTimestamp(update.timestamp)}
                          </time>
                        </div>
                        <h4 className="text-lg font-medium">{update.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {update.description}
                        </p>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* News Updates Card */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Newspaper className="h-6 w-6" />
                Latest News
              </CardTitle>
              <CardDescription className="text-base">
                Breaking news and media coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {updates
                    .filter((update) => update.type === "news")
                    .map((update) => (
                      <div
                        key={update.id}
                        className="border-l-4 border-primary pl-4 py-3 space-y-2 cursor-pointer hover:bg-accent/50 rounded-r-lg transition-colors"
                        onClick={() => setSelectedUpdate(update)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-sm font-medium">
                            {update.state}
                          </Badge>
                          <time className="text-xs text-muted-foreground">
                            {formatTimestamp(update.timestamp)}
                          </time>
                        </div>
                        <h4 className="text-lg font-medium">{update.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {update.description}
                        </p>
                        {update.url && (
                          <a
                            href={update.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Read full article <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Update Details Dialog */}
      <Dialog open={!!selectedUpdate} onOpenChange={() => setSelectedUpdate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              {getTypeIcon(selectedUpdate?.type || "legal")}
              {selectedUpdate?.title}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary">{selectedUpdate?.state}</Badge>
              {selectedUpdate?.urgency && (
                <Badge className={getUrgencyColor(selectedUpdate.urgency)}>
                  {selectedUpdate.urgency}
                </Badge>
              )}
              <time className="text-sm text-muted-foreground">
                {selectedUpdate?.timestamp && formatTimestamp(selectedUpdate.timestamp)}
              </time>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-lg text-muted-foreground">
              {selectedUpdate?.description}
            </p>
            {selectedUpdate?.url && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(selectedUpdate.url, '_blank')}
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Read full article
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}