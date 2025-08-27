import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { uploadFilesToGemini, createFilePartsFromUploaded, parseFilesFromJSON, UploadedFile } from '@/lib/fileUtils';
import { FileData } from '@/lib/fileHelpers';
import { recordTokenUsage, enforceUsageLimit } from '@/lib/usage-tracking';
import { createAIClient, getUserSelectedModel, estimateTokenUsage, type AIModel } from '@/lib/ai-config';

interface TeamContext {
  id: string;
  name: string;
  description: string;
  abbreviations: Record<string, string>;
  terminology: Record<string, string>;
  projectInfo: string;
  standards: string;
}

interface TicketContext {
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  questions?: string[];
}

interface ChatRequest {
  message: string;
  chatHistory: ChatMessage[];
  ticketContext?: TicketContext;
  teamContext?: TeamContext;
  mode: 'guided' | 'manual';
  files?: FileData[]; // Base64 encoded files from frontend
  selectedModel?: string; // User's selected AI model
}

// AI client is now created dynamically

// Structured response schema for chat responses
const chatResponseSchema = {
  type: Type.OBJECT,
  properties: {
    response: {
      type: Type.STRING,
      description: "AI assistant response to the user's message"
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING
      },
      description: "Follow-up questions to help improve the ticket (optional)"
    },
    updatedTicket: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Updated ticket title if modified"
        },
        description: {
          type: Type.STRING,
          description: "Updated ticket description if modified"
        },
        acceptanceCriteria: {
          type: Type.STRING,
          description: "Updated acceptance criteria if modified"
        }
      },
      description: "Updated ticket content if the conversation resulted in changes"
    },
    clarityScore: {
      type: Type.NUMBER,
      description: "Current ticket quality score from 1.0-10.0 (1 decimal place) based on INVEST criteria"
    },
    clarityScoreReasoning: {
      type: Type.STRING,
      description: "Detailed explanation of the clarity score based on INVEST criteria"
    },
    investBreakdown: {
      type: Type.OBJECT,
      properties: {
        independent: { type: Type.NUMBER, description: "Independent score (0.0-2.0)" },
        negotiable: { type: Type.NUMBER, description: "Negotiable score (0.0-1.5)" },
        valuable: { type: Type.NUMBER, description: "Valuable score (0.0-2.0)" },
        estimable: { type: Type.NUMBER, description: "Estimable score (0.0-1.5)" },
        small: { type: Type.NUMBER, description: "Small score (0.0-1.5)" },
        testable: { type: Type.NUMBER, description: "Testable score (0.0-1.5)" }
      },
      description: "Individual INVEST criteria scores"
    }
  },
  required: ["response"],
  propertyOrdering: ["response", "questions", "updatedTicket", "clarityScore", "clarityScoreReasoning", "investBreakdown"]
};

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let userId: string | undefined;
  
  try {
    // Get authenticated user for usage tracking (do this first)
    const { getAuthenticatedUser } = await import('@/lib/supabase-server');
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    userId = authResult.user.id;

    const body: ChatRequest = await request.json();
    const { message, chatHistory, ticketContext, teamContext, mode, files, selectedModel } = body;
    
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Determine the AI model to use
    const aiModel = selectedModel && (selectedModel === 'gemini-2.5-flash-lite' || selectedModel === 'gemini-2.5-flash') 
      ? selectedModel as AIModel 
      : getUserSelectedModel();

    // Estimate token usage for this chat request using the selected model
    const textLength = message.length + chatHistory.reduce((sum, msg) => sum + msg.text.length, 0) +
                      (ticketContext?.title || '').length + (ticketContext?.description || '').length;
    const estimatedTokens = estimateTokenUsage('chat', textLength, aiModel);

    // Check usage limits before processing
    const usageCheck = await enforceUsageLimit(estimatedTokens, userId);
    if (!usageCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: usageCheck.message || 'Usage limit exceeded',
        usage_limit_exceeded: true,
        current_usage: usageCheck.usage?.current_usage,
        limit: usageCheck.usage?.limit,
      }, { status: 429 });
    }
    
    // Handle file uploads if present
    let uploadedFiles: UploadedFile[] = [];
    let fileErrors: string[] = [];
    
    if (files && files.length > 0) {
      try {
        const parsedFiles = parseFilesFromJSON(files);
        const uploadResult = await uploadFilesToGemini(parsedFiles);
        uploadedFiles = uploadResult.files;
        fileErrors = uploadResult.errors;
        
        if (fileErrors.length > 0) {
          console.warn('File upload errors:', fileErrors);
        }
      } catch (error) {
        console.error('Error processing files:', error);
        fileErrors.push('Failed to process uploaded files');
      }
    }
    
    // Build conversational prompt for Gemini
    const systemPrompt = buildChatPrompt(message, chatHistory, ticketContext, teamContext, mode, uploadedFiles);
    
    // Prepare content parts for Gemini
    const contentParts = [];
    
    // Add file parts first if any files were uploaded
    if (uploadedFiles.length > 0) {
      contentParts.push(...createFilePartsFromUploaded(uploadedFiles));
    }
    
    // Add text prompt
    contentParts.push({ text: systemPrompt });
    
    // Create AI client and call Gemini API with structured output
    const ai = createAIClient();
    const response = await ai.models.generateContent({
      model: aiModel,
      contents: [{ role: "user", parts: contentParts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: chatResponseSchema,
      },
    });

    const aiResponse = JSON.parse(response.text);
    
    // Record token usage for successful request
    const actualTokens = Math.max(estimatedTokens, Math.floor((Date.now() - startTime) / 10));
    await recordTokenUsage({
      endpoint: '/api/chat',
      tokens_used: actualTokens,
      model_used: aiModel,
      feature_used: mode === 'guided' ? 'guided_chat' : 'manual_chat',
      request_id: requestId,
    }, userId);
    
    return NextResponse.json({
      success: true,
      response: aiResponse.response,
      questions: aiResponse.questions || [],
      updatedTicket: aiResponse.updatedTicket || null,
      clarityScore: aiResponse.clarityScore || null,
      clarityScoreReasoning: aiResponse.clarityScoreReasoning || null,
      investBreakdown: aiResponse.investBreakdown || null,
      uploadedFiles: uploadedFiles.length,
      fileErrors: fileErrors.length > 0 ? fileErrors : undefined
    });
  } catch (error) {
    console.error('Error in chat with Gemini:', error);
    
    // Record usage for failed request (minimal tokens)
    if (userId) {
      await recordTokenUsage({
        endpoint: '/api/chat',
        tokens_used: 50,
        model_used: getUserSelectedModel(), // Use default model for error tracking
        feature_used: mode === 'guided' ? 'guided_chat_failed' : 'manual_chat_failed',
        request_id: requestId,
      }, userId).catch(() => {}); // Ignore errors during failure tracking
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}

// Helper function to build chat prompt
function buildChatPrompt(
  userMessage: string,
  chatHistory: ChatMessage[],
  ticketContext?: TicketContext,
  teamContext?: TeamContext,
  mode: string = 'manual',
  uploadedFiles: UploadedFile[] = []
): string {
  let prompt = `You are an expert Jira ticket assistant. You help users create and refine high-quality Jira tickets through interactive conversation.

## YOUR ROLE:
- ${mode === 'guided' ? 'Guide users step-by-step through ticket creation' : 'Answer questions and help refine existing tickets'}
- Apply INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Provide helpful suggestions and ask clarifying questions
- Keep responses conversational and friendly

## CURRENT TICKET CONTEXT:
**Title**: ${ticketContext?.title || 'Not provided'}
**Description**: ${ticketContext?.description || 'Not provided'}
**Acceptance Criteria**: ${ticketContext?.acceptanceCriteria || 'Not provided'}
`;

  // Add team context if available
  if (teamContext) {
    prompt += `
## TEAM CONTEXT:
**Team**: ${teamContext.name}
**Description**: ${teamContext.description}
**Project Info**: ${teamContext.projectInfo}
**Standards**: ${teamContext.standards}

**Team Abbreviations**:
${Object.entries(teamContext.abbreviations).map(([abbrev, full]) => `- ${abbrev}: ${full}`).join('\n')}

**Team Terminology**:
${Object.entries(teamContext.terminology).map(([term, definition]) => `- ${term}: ${definition}`).join('\n')}
`;
  }

  // Add file context if files were uploaded
  if (uploadedFiles.length > 0) {
    prompt += `
## UPLOADED FILES CONTEXT:
The user has provided ${uploadedFiles.length} file(s) for additional context:
${uploadedFiles.map(file => `- **${file.name}** (${file.mimeType}${file.size ? `, ${Math.round(file.size / 1024)}KB` : ''})`).join('\n')}

Please analyze these files and incorporate relevant information into your response. Reference specific content from the files when it helps improve the Jira ticket or answer the user's question.
`;
  }

  // Add conversation history
  if (chatHistory.length > 1) {
    prompt += `
## CONVERSATION HISTORY:
${chatHistory.slice(-5).map(msg => `**${msg.role.toUpperCase()}**: ${msg.text}`).join('\n')}
`;
  }

  prompt += `
## USER'S MESSAGE:
${userMessage}

## RESPONSE GUIDELINES:
1. **Be conversational and helpful** - Respond naturally to the user's question or comment
2. **Focus on ticket quality** - Help improve clarity, completeness, and INVEST compliance
3. **Ask follow-up questions** - When appropriate, ask 1-2 specific questions to gather more information
4. **Update ticket content** - If the conversation suggests changes to the ticket, include them in updatedTicket
5. **Calculate clarity score** - Rate the current ticket quality (1.0-10.0) based on INVEST criteria with reasoning

## CLARITY SCORE CALCULATION (1.0-10.0):
Rate to 1 decimal place based on INVEST criteria:
- **Independent** (0-2.0 points): Self-contained, minimal dependencies
- **Negotiable** (0-1.5 points): Flexible scope, allows discussion
- **Valuable** (0-2.0 points): Clear business/user value articulated
- **Estimable** (0-1.5 points): Clear enough for effort estimation
- **Small** (0-1.5 points): Appropriately sized for sprint completion
- **Testable** (0-1.5 points): Verifiable acceptance criteria

Provide detailed reasoning explaining how each INVEST criterion was evaluated.
Also provide individual INVEST breakdown scores that sum to the total score.

Respond to the user's message now:`;

  return prompt;
}