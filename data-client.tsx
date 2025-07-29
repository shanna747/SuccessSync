import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { Bot, Send, Trash2, Download, MoreHorizontal, Sparkles, BarChart, Users, TrendingUp } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

interface QuickQuery {
  id: string;
  label: string;
  query: string;
  icon: React.ElementType;
}

export default function DataChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: "Hello! I'm your data assistant. I can help you analyze client performance, ROI metrics, test results, and recent activities. What would you like to explore today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { sendMessage, lastMessage, isConnected } = useWebSocket("/ws");

  const { data: dashboardMetrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const quickQueries: QuickQuery[] = [
    {
      id: "roi-trends",
      label: "Show ROI trends",
      query: "Show me the ROI trends for this quarter",
      icon: TrendingUp,
    },
    {
      id: "client-performance",
      label: "Top clients",
      query: "Who are my top performing clients?",
      icon: Users,
    },
    {
      id: "test-completion",
      label: "Test completion rates",
      query: "What are the current test completion rates?",
      icon: BarChart,
    },
    {
      id: "recent-activity",
      label: "Recent activity",
      query: "Summarize recent client activities",
      icon: Sparkles,
    },
  ];

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === "chat_response") {
      setMessages(prev => [
        ...prev.filter(m => !m.isTyping),
        {
          id: Date.now().toString(),
          type: "assistant",
          content: lastMessage.message,
          timestamp: lastMessage.timestamp,
        },
      ]);
      setIsTyping(false);
    }
  }, [lastMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: "typing",
      type: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    // Send message via WebSocket
    sendMessage({
      type: "chat_message",
      query: textToSend,
    });

    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuery = (query: string) => {
    handleSendMessage(query);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        type: "assistant",
        content: "Chat cleared! How can I help you analyze your data?",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleExportChat = () => {
    const chatContent = messages
      .filter(m => !m.isTyping)
      .map(m => `${m.type === "user" ? "You" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    
    const blob = new Blob([chatContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-chat-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header title="Data Chat" />
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col p-6">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
            {/* Quick Queries Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Queries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickQueries.map((query) => {
                    const IconComponent = query.icon;
                    return (
                      <Button
                        key={query.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-3 text-left"
                        onClick={() => handleQuickQuery(query.query)}
                        disabled={isTyping}
                      >
                        <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{query.label}</span>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Connection Status & Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearChat}
                      className="w-full justify-start"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Clear Chat
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportChat}
                      className="w-full justify-start"
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Export Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Metrics */}
              {dashboardMetrics && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Current Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Active Clients</span>
                      <span className="font-medium">{dashboardMetrics.activeClients}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Avg ROI</span>
                      <span className="font-medium text-green-600">{dashboardMetrics.avgROI}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Active Tests</span>
                      <span className="font-medium">{dashboardMetrics.activeTests}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Unread Messages</span>
                      <span className="font-medium">{dashboardMetrics.unreadMessages}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Main Chat Area */}
            <div className="lg:col-span-3">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>Data Assistant</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          AI-powered analytics companion
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                  <ScrollArea className="flex-1 px-6 custom-scrollbar" ref={scrollAreaRef}>
                    <div className="space-y-6 py-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start space-x-3 ${
                            message.type === "user" ? "justify-end" : ""
                          }`}
                        >
                          {message.type === "assistant" && (
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                          )}
                          
                          <div
                            className={`rounded-lg p-4 max-w-[80%] ${
                              message.type === "user"
                                ? "bg-primary text-primary-foreground ml-auto"
                                : "bg-gray-100 dark:bg-gray-800"
                            }`}
                          >
                            {message.isTyping ? (
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                          
                          {message.type === "user" && (
                            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">JS</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <Input
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask me about your client data, ROI metrics, or test results..."
                          className="min-h-[44px] resize-none"
                          disabled={isTyping || !isConnected}
                        />
                      </div>
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isTyping || !isConnected}
                        size="icon"
                        className="h-[44px] w-[44px]"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {!isConnected && (
                      <div className="mt-2 flex items-center space-x-2">
                        <Badge variant="destructive" className="text-xs">
                          Disconnected
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Attempting to reconnect...
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
