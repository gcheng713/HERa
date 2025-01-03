import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getAIResponse } from "@/lib/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AssistantChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ message: string }>();

  const onSubmit = async (data: { message: string }) => {
    if (!data.message.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content: data.message } as Message,
    ];
    setMessages(newMessages);
    setIsLoading(true);
    reset();

    try {
      const response = await getAIResponse(data.message);
      setMessages([
        ...newMessages,
        { role: "assistant", content: response } as Message,
      ]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-4 mb-4">
          {messages.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-8">
              Ask me anything about reproductive healthcare services and legal information.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-col space-y-2",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[85%] shadow-sm",
                    message.role === "assistant" 
                      ? "bg-primary/5 text-foreground" 
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t pt-4 bg-background">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Textarea
            placeholder="Type your message here..."
            className="min-h-[100px] resize-none"
            {...register("message")}
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="self-end"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AssistantChat;