import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertClientSchema, 
  insertConversationSchema, 
  insertMessageSchema,
  insertTestSchema,
  insertTestAssignmentSchema,
  insertRoiMetricSchema,
  insertActivitySchema,
  loginSchema,
  type User
} from "@shared/schema";

// Middleware to authenticate requests
interface AuthenticatedRequest extends Request {
  user?: User;
}

const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const user = await storage.validateSession(token);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat_message') {
          // Handle data assistant chat messages
          const response = await handleDataAssistantQuery(message.query);
          ws.send(JSON.stringify({
            type: 'chat_response',
            message: response,
            timestamp: new Date().toISOString()
          }));
        } else if (message.type === 'conversation_message') {
          // Handle real-time conversation messages
          const newMessage = await storage.createMessage({
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderType: message.senderType,
            content: message.content,
            messageType: 'text',
            isRead: false
          });
          
          // Broadcast to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'new_message',
                message: newMessage
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const result = await storage.authenticateUser(credentials);
      
      if (!result) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      res.json({ user: result.user, token: result.token });
    } catch (error) {
      res.status(400).json({ error: 'Invalid login data' });
    }
  });

  app.post("/api/auth/logout", authenticate, async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader.substring(7);
      await storage.logout(token);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    res.json(req.user);
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", authenticate, async (req: any, res) => {
    try {
      const csmId = req.query.csmId as string || "csm-1";
      const metrics = await storage.getDashboardMetrics(csmId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Clients
  app.get("/api/clients", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role === 'csm') {
        // CSMs can see all clients
        const clients = await storage.getClients();
        res.json(clients);
      } else if (user.role === 'client') {
        // Clients can only see their own data
        if (!user.clientId) {
          return res.status(403).json({ error: "Client user has no associated client" });
        }
        const client = await storage.getClient(user.clientId);
        res.json(client ? [client] : []);
      } else {
        res.status(403).json({ error: "Unauthorized role" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Only CSMs can create clients
      if (user.role !== 'csm') {
        return res.status(403).json({ error: "Only CSMs can create clients" });
      }
      
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.get("/api/clients/:id", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      const clientId = req.params.id;
      
      // Check authorization
      if (user.role === 'client' && user.clientId !== clientId) {
        return res.status(403).json({ error: "Can only access your own client data" });
      }
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  // Conversations
  app.get("/api/conversations", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      let conversations;
      
      if (user.role === 'csm') {
        // CSMs can see conversations filtered by clientId or csmId
        const clientId = req.query.clientId as string;
        const csmId = req.query.csmId as string;
        conversations = await storage.getConversations(clientId, csmId);
      } else if (user.role === 'client') {
        // Clients can only see their own conversations
        conversations = await storage.getConversations(user.clientId || '');
      } else {
        return res.status(403).json({ error: "Unauthorized role" });
      }
      
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      const validatedData = insertConversationSchema.parse(req.body);
      
      // Check authorization based on role
      if (user.role === 'client' && validatedData.clientId !== user.clientId) {
        return res.status(403).json({ error: "Can only create conversations for your own client" });
      }
      
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  // Messages
  app.get("/api/conversations/:id/messages", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      const conversationId = req.params.id;
      
      // First get the conversation to check authorization
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Check authorization
      if (user.role === 'client' && conversation.clientId !== user.clientId) {
        return res.status(403).json({ error: "Can only access your own conversations" });
      }
      
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Verify the user can send messages to this conversation
      if (validatedData.conversationId) {
        const conversation = await storage.getConversation(validatedData.conversationId);
        if (user.role === 'client' && conversation?.clientId !== user.clientId) {
          return res.status(403).json({ error: "Can only send messages to your own conversations" });
        }
      }
      
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Tests
  app.get("/api/tests", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Only CSMs can access tests
      if (user.role !== 'csm') {
        return res.status(403).json({ error: "Only CSMs can access tests" });
      }
      
      const createdBy = req.query.createdBy as string;
      const tests = await storage.getTests(createdBy);
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tests" });
    }
  });

  app.post("/api/tests", authenticate, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Only CSMs can create tests
      if (user.role !== 'csm') {
        return res.status(403).json({ error: "Only CSMs can create tests" });
      }
      
      const validatedData = insertTestSchema.parse(req.body);
      const test = await storage.createTest(validatedData);
      res.status(201).json(test);
    } catch (error) {
      res.status(400).json({ error: "Invalid test data" });
    }
  });

  app.get("/api/tests/:id", async (req, res) => {
    try {
      const test = await storage.getTest(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test" });
    }
  });

  // Test Assignments  
  app.get("/api/test-assignments", authenticate, async (req: any, res) => {
    try {
      const clientId = req.query.clientId as string;
      const testId = req.query.testId as string;
      const assignments = await storage.getTestAssignments(clientId, testId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test assignments" });
    }
  });

  app.post("/api/test-assignments", authenticate, async (req: any, res) => {
    try {
      const validatedData = insertTestAssignmentSchema.parse(req.body);
      const assignment = await storage.createTestAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ error: "Invalid test assignment data" });
    }
  });

  app.patch("/api/test-assignments/:id", async (req, res) => {
    try {
      const updates = req.body;
      const assignment = await storage.updateTestAssignment(req.params.id, updates);
      if (!assignment) {
        return res.status(404).json({ error: "Test assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update test assignment" });
    }
  });

  // ROI Metrics
  app.get("/api/roi-metrics", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      const metrics = await storage.getRoiMetrics(clientId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ROI metrics" });
    }
  });

  app.post("/api/roi-metrics", async (req, res) => {
    try {
      const validatedData = insertRoiMetricSchema.parse(req.body);
      const metric = await storage.createRoiMetric(validatedData);
      res.status(201).json(metric);
    } catch (error) {
      res.status(400).json({ error: "Invalid ROI metric data" });
    }
  });

  // Activities
  app.get("/api/activities", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getActivities(clientId, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid activity data" });
    }
  });

  // Gmail sync simulation
  app.post("/api/gmail/sync", async (req, res) => {
    try {
      // Simulate Gmail sync process
      // In a real implementation, this would integrate with Gmail API
      const syncResult = {
        success: true,
        messagesImported: Math.floor(Math.random() * 10) + 1,
        timestamp: new Date().toISOString()
      };
      res.json(syncResult);
    } catch (error) {
      res.status(500).json({ error: "Failed to sync Gmail" });
    }
  });

  return httpServer;
}

async function handleDataAssistantQuery(query: string): Promise<string> {
  // Simple query processing for data assistant
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('roi') || lowerQuery.includes('return on investment')) {
    const metrics = await storage.getDashboardMetrics("csm-1");
    return `Based on your current data, your average ROI is ${metrics.avgROI}. This represents strong performance across your ${metrics.activeClients} active clients.`;
  }
  
  if (lowerQuery.includes('client') || lowerQuery.includes('customer')) {
    const clients = await storage.getClients("csm-1");
    const activeClients = clients.filter(c => c.status === "active");
    return `You currently have ${activeClients.length} active clients. Your top performer has an ROI of ${Math.max(...clients.map(c => parseFloat(c.roi || "0")))}%.`;
  }
  
  if (lowerQuery.includes('test') || lowerQuery.includes('assessment')) {
    const assignments = await storage.getTestAssignments();
    const completed = assignments.filter(a => a.status === "completed").length;
    const inProgress = assignments.filter(a => a.status === "in_progress").length;
    return `You have ${completed} completed tests and ${inProgress} tests currently in progress. Overall completion rate is strong.`;
  }
  
  if (lowerQuery.includes('activity') || lowerQuery.includes('recent')) {
    const activities = await storage.getActivities(undefined, 3);
    return `Recent activity includes: ${activities.map(a => a.title).join(', ')}. All clients are showing positive engagement.`;
  }
  
  // Default response
  return "I can help you analyze your client data, ROI metrics, test results, and recent activities. What specific information would you like to know?";
}
