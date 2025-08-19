#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { z } from "zod";

const server = new Server(
  {
    name: "mcp-for-ha-conversation",
    version: "1.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Try loading .env from multiple likely locations
function loadDotenv() {
  const candidatePaths = [
    process.env.DOTENV_PATH,
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        console.error(`Loaded environment variables from: ${p}`);
        return;
      }
    } catch {
      // ignore
    }
  }
  // Fallback to default search (cwd) if nothing matched
  dotenv.config();
}

loadDotenv();

const HomeAssistantConfigSchema = z.object({
  url: z.string().url(),
  token: z.string(),
  agentId: z.string().optional(),
  language: z.string().optional(),
  conversationId: z.string().optional(),
  insecure: z.boolean().optional(),
});

type HomeAssistantConfig = z.infer<typeof HomeAssistantConfigSchema>;

let haConfig: HomeAssistantConfig | null = null;

// Initialize from environment variables
function initializeConfig() {
  const envUrl = process.env.HOME_ASSISTANT_URL;
  const envToken = process.env.HOME_ASSISTANT_TOKEN;
  const envAgentId = process.env.HOME_ASSISTANT_AGENT_ID;
  const envLanguage = process.env.HOME_ASSISTANT_LANGUAGE; // only send when provided
  const envConversationId = process.env.HOME_ASSISTANT_CONVERSATION_ID;
  const envInsecure =
    process.env.HOME_ASSISTANT_INSECURE === "1" ||
    process.env.HOME_ASSISTANT_INSECURE === "true"
      ? true
      : undefined;
  
  console.error("Environment variables check:");
  console.error("HOME_ASSISTANT_URL:", envUrl ? "set" : "not set");
  console.error("HOME_ASSISTANT_TOKEN:", envToken ? "set" : "not set");
  console.error("HOME_ASSISTANT_AGENT_ID:", envAgentId ? "set" : "not set");
  console.error("HOME_ASSISTANT_LANGUAGE:", envLanguage ? `set (${envLanguage})` : "not set");
  console.error("HOME_ASSISTANT_CONVERSATION_ID:", envConversationId ? "set" : "not set");
  console.error("HOME_ASSISTANT_INSECURE:", envInsecure ? "set (true)" : "not set/false");
  
  if (envUrl && envToken) {
    haConfig = {
      url: envUrl,
      token: envToken,
      agentId: envAgentId,
      language: envLanguage,
      conversationId: envConversationId,
      insecure: envInsecure,
    };
    console.error("Home Assistant configuration loaded from environment variables");
    console.error("URL:", envUrl);
    console.error("Agent ID:", envAgentId);
    if (envLanguage) console.error("Language:", envLanguage);
    if (envConversationId) console.error("Conversation ID:", envConversationId);
  } else {
    console.error("Environment variables not properly configured");
  }
}

// Initialize config on startup
initializeConfig();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ha_conversation",
        description: "Send conversation request to Home Assistant conversation agent",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The conversation text to send to Home Assistant",
            },
          },
          required: ["text"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "ha_conversation") {
    const args = z.object({
      text: z.string(),
    }).parse(request.params.arguments);

    // Force using environment variables only
    const configToUse = haConfig;
    console.error("Config resolution: using", configToUse ? "environment variables" : "none");

    if (!configToUse) {
      throw new Error(
        "Home Assistant configuration not provided. Please set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN environment variables."
      );
    }

    try {
      const requestData: any = { text: args.text };
      if (configToUse.language) requestData.language = configToUse.language;

      // Add agent_id and conversation_id if available
      if (configToUse.agentId) requestData.agent_id = configToUse.agentId;
      if (configToUse.conversationId) requestData.conversation_id = configToUse.conversationId;

      const response = await axios.post(
        `${configToUse.url.replace(/\/$/, '')}/api/conversation/process`,
        requestData,
        {
          headers: {
            "Authorization": `Bearer ${configToUse.token}`,
            "Content-Type": "application/json",
          },
          httpsAgent: configToUse.insecure
            ? new (require('https')).Agent({ rejectUnauthorized: false })
            : undefined,
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Home Assistant API error: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server for Home Assistant conversation started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});