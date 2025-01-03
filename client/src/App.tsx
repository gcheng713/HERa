import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import LegalInfo from "@/pages/LegalInfo";
import ClinicFinder from "@/pages/ClinicFinder";
import Resources from "@/pages/Resources";
import Admin from "@/pages/Admin";
import Dashboard from "@/components/Dashboard"; // Added import
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, MessageCircle, X } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function App() {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {/* Main Content Area */}
        <main className={cn(
          "flex-1 container mx-auto px-4 py-8 transition-all duration-300",
          isChatOpen ? "lg:pr-[400px]" : ""
        )}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/legal-info" component={LegalInfo} />
            <Route path="/find-clinic" component={ClinicFinder} />
            <Route path="/resources" component={Resources} />
            <Route path="/admin" component={Admin} />
            <Route path="/dashboard" component={Dashboard} /> {/* Added route */}
            <Route component={NotFound} />
          </Switch>
        </main>

        {/* Chat Toggle Button (visible when chat is closed) */}
        {!isChatOpen && (
          <Button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}

        {/* Fixed Chatbot Sidebar */}
        <aside className={cn(
          "fixed top-16 right-0 w-[380px] h-[calc(100vh-4rem)] border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300",
          isChatOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="h-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">AI Assistant</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsChatOpen(false)}
                className="hover:bg-primary/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <AssistantChat />
          </div>
        </aside>
      </div>
      <Toaster />
    </div>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;