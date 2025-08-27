import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Template } from '@/lib/templatesData';

interface GuidedJiraDetails {
  title: string;
  description: string;
  acceptanceCriteria: string;
}

interface TeamContext {
  id: string;
  name: string;
  description: string;
  abbreviations: Record<string, string>;
  terminology: Record<string, string>;
  projectInfo: string;
  standards: string;
}

interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  questions?: string[];
}

interface RespondRequest {
  jiraDetails: GuidedJiraDetails;
  chatHistory: AiChatMessage[];
  teamContext?: TeamContext | null;
  template?: Template | null;
  files?: FileData[]; // Base64 encoded files from frontend
  selectedModel?: string; // User's selected AI model
}

interface FileData {
  name: string;
  type: string;
  content: string;
  size: number;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user for usage tracking
    const { getAuthenticatedUser } = await import('@/lib/supabase-server');
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body: RespondRequest = await request.json();
    const { jiraDetails, chatHistory, teamContext, files, selectedModel } = body;

    // Get the user's message from chat history
    const lastUserMessage = chatHistory.filter(m => m.role === 'user').pop()?.text || "";
    
    if (!lastUserMessage.trim()) {
      throw new Error('No user message found');
    }

    // Get the authorization header from the original request
    const authHeader = request.headers.get('authorization');
    
    // Call the new chat API endpoint with authentication
    const chatResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify({
        message: lastUserMessage,
        chatHistory: chatHistory,
        ticketContext: jiraDetails,
        teamContext: teamContext,
        mode: 'guided',
        files: files, // Pass files through to chat API
        selectedModel: selectedModel // Pass selected model through to chat API
      }),
    });

    if (!chatResponse.ok) {
      throw new Error('Failed to get AI response');
    }

    const aiResponse = await chatResponse.json();

    // Format response for guided mode expectations
    return NextResponse.json({
      success: true,
      wizardScore: aiResponse.clarityScore || 5,
      wizardScoreReasoning: aiResponse.clarityScoreReasoning,
      investBreakdown: aiResponse.investBreakdown,
      aiMessage: aiResponse.response,
      questions: aiResponse.questions || [],
      updatedJiraDetails: aiResponse.updatedTicket || jiraDetails,
      uploadedFiles: aiResponse.uploadedFiles,
      fileErrors: aiResponse.fileErrors
    });

  } catch (error) {
    console.error('Error in AI response processing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}