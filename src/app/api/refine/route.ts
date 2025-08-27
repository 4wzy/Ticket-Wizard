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

interface RefinementRequest {
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  selectedSections?: string[];
  aiPrompt?: string;
  teamContext?: TeamContext;
  previousClarityScore?: number;
  templateStructure?: {
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: { [key: string]: string };
  };
  files?: FileData[]; // Base64 encoded files from frontend
  selectedModel?: string; // User's selected AI model
}

// AI client is now created dynamically

// Structured response schema for Gemini
const refinementResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Refined Jira ticket title"
    },
    description: {
      type: Type.STRING,
      description: "Refined Jira ticket description"
    },
    acceptanceCriteria: {
      type: Type.STRING,
      description: "Refined acceptance criteria"
    },
    clarityScore: {
      type: Type.NUMBER,
      description: "Quality score from 1.0-10.0 (1 decimal place) based on INVEST criteria"
    },
    clarityScoreReasoning: {
      type: Type.STRING,
      description: "Detailed explanation of the clarity score based on INVEST criteria"
    },
    investBreakdown: {
      type: Type.OBJECT,
      properties: {
        independent: {
          type: Type.NUMBER,
          description: "Independent score (0.0-2.0): Self-contained, minimal dependencies"
        },
        negotiable: {
          type: Type.NUMBER,
          description: "Negotiable score (0.0-1.5): Flexible scope, allows discussion"
        },
        valuable: {
          type: Type.NUMBER,
          description: "Valuable score (0.0-2.0): Clear business/user value articulated"
        },
        estimable: {
          type: Type.NUMBER,
          description: "Estimable score (0.0-1.5): Clear enough for effort estimation"
        },
        small: {
          type: Type.NUMBER,
          description: "Small score (0.0-1.5): Appropriately sized for sprint completion"
        },
        testable: {
          type: Type.NUMBER,
          description: "Testable score (0.0-1.5): Verifiable acceptance criteria"
        }
      },
      description: "Individual INVEST criteria scores that sum to the total clarity score"
    },
    improvementSummary: {
      type: Type.STRING,
      description: "Brief summary of what was improved"
    }
  },
  required: ["title", "description", "acceptanceCriteria", "clarityScore", "clarityScoreReasoning", "investBreakdown", "improvementSummary"],
  propertyOrdering: ["title", "description", "acceptanceCriteria", "clarityScore", "clarityScoreReasoning", "investBreakdown", "improvementSummary"]
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

    const body: RefinementRequest = await request.json();
    const { selectedSections = [], aiPrompt = '', teamContext, templateStructure, files, selectedModel } = body;
    
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Determine the AI model to use
    const aiModel = selectedModel && (selectedModel === 'gemini-2.5-flash-lite' || selectedModel === 'gemini-2.5-flash') 
      ? selectedModel as AIModel 
      : getUserSelectedModel();

    // Estimate token usage for this request using the selected model
    const textLength = (body.title || '').length + (body.description || '').length + 
                      (body.acceptanceCriteria || '').length + (aiPrompt || '').length;
    const estimatedTokens = estimateTokenUsage('refine', textLength, aiModel);

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
    
    // Determine sections to refine
    const sectionsToRefine = selectedSections.length > 0 
      ? selectedSections 
      : ['title', 'description', 'acceptanceCriteria'];
    
    // Build comprehensive prompt for Gemini
    const systemPrompt = buildSystemPrompt(body, sectionsToRefine, teamContext, templateStructure, aiPrompt, body.previousClarityScore, uploadedFiles);
    
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
        responseSchema: refinementResponseSchema,
      },
    });

    const refinedContent = JSON.parse(response.text);
    
    // Build response in expected format
    const refined = {
      title: sectionsToRefine.includes('title') ? refinedContent.title : body.title,
      description: sectionsToRefine.includes('description') ? refinedContent.description : body.description,
      acceptanceCriteria: sectionsToRefine.includes('acceptanceCriteria') ? refinedContent.acceptanceCriteria : body.acceptanceCriteria,
    };

    // Record token usage for successful request
    const actualTokens = Math.max(estimatedTokens, Math.floor((Date.now() - startTime) / 10));
    await recordTokenUsage({
      endpoint: '/api/refine',
      tokens_used: actualTokens,
      model_used: aiModel,
      feature_used: 'manual_refine',
      request_id: requestId,
    }, userId);

    return NextResponse.json({
      success: true,
      data: refined,
      refinedSections: sectionsToRefine,
      clarityScore: refinedContent.clarityScore,
      clarityScoreReasoning: refinedContent.clarityScoreReasoning,
      investBreakdown: refinedContent.investBreakdown,
      improvementSummary: refinedContent.improvementSummary,
      uploadedFiles: uploadedFiles.length,
      fileErrors: fileErrors.length > 0 ? fileErrors : undefined
    });
  } catch (error) {
    console.error('Error refining ticket with Gemini:', error);
    
    // Record usage for failed request (minimal tokens)
    if (userId) {
      await recordTokenUsage({
        endpoint: '/api/refine',
        tokens_used: 50,
        model_used: getUserSelectedModel(), // Use default model for error tracking
        feature_used: 'manual_refine_failed',
        request_id: requestId,
      }, userId).catch(() => {}); // Ignore errors during failure tracking
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to refine ticket with AI' },
      { status: 500 }
    );
  }
}

// Helper function to build comprehensive system prompt with INVEST criteria
function buildSystemPrompt(
  ticketData: RefinementRequest,
  sectionsToRefine: string[],
  teamContext?: TeamContext,
  templateStructure?: {
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: { [key: string]: string };
  },
  userPrompt?: string,
  previousClarityScore?: number,
  uploadedFiles: UploadedFile[] = []
): string {
  let prompt = `You are an expert Jira ticket refinement specialist. Your task is to improve the provided ticket sections based on INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) and best practices.

## INVEST CRITERIA GUIDELINES:
- **Independent**: Ticket should be self-contained and not overly dependent on other work
- **Negotiable**: Requirements should be flexible and allow for discussion
- **Valuable**: Must deliver clear business or user value
- **Estimable**: Should be clear enough for developers to estimate effort
- **Small**: Appropriately sized for a single sprint (usually 1-2 weeks)
- **Testable**: Must have clear, verifiable acceptance criteria

## CURRENT TICKET CONTENT:
**Title**: ${ticketData.title || 'Not provided'}
**Description**: ${ticketData.description || 'Not provided'}
**Acceptance Criteria**: ${ticketData.acceptanceCriteria || 'Not provided'}

## SECTIONS TO REFINE: 
${sectionsToRefine.join(', ')}
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

  // Add template structure guidance if available
  if (templateStructure) {
    prompt += `
## TEMPLATE STRUCTURE TO FOLLOW:
**Title Format**: ${templateStructure.titleFormat}
**Description Format**: ${templateStructure.descriptionFormat}
**Acceptance Criteria Format**: ${templateStructure.acceptanceCriteriaFormat}
`;
  }

  // Add file context if files were uploaded
  if (uploadedFiles.length > 0) {
    prompt += `
## UPLOADED FILES CONTEXT:
The user has provided ${uploadedFiles.length} file(s) for additional context:
${uploadedFiles.map(file => `- **${file.name}** (${file.mimeType}${file.size ? `, ${Math.round(file.size / 1024)}KB` : ''})`).join('\n')}

Please analyze these files and incorporate relevant information into the ticket refinement. Use specific details from the files to enhance the ticket content, acceptance criteria, and overall quality.
`;
  }

  // Add user-specific instructions
  if (userPrompt?.trim()) {
    prompt += `
## SPECIFIC USER INSTRUCTIONS:
${userPrompt}
`;
  }

  prompt += `
## REFINEMENT INSTRUCTIONS:
1. **Enhance clarity and specificity** - Make requirements crystal clear
2. **Improve INVEST compliance** - Ensure the ticket meets all INVEST criteria
3. **Add missing details** - Fill gaps that would help developers understand the work
4. **Maintain business value focus** - Keep the user/business benefit prominent
5. **Ensure testability** - Create verifiable acceptance criteria
6. **Keep scope appropriate** - Size for 1-2 week sprint completion

## CLARITY SCORE CALCULATION (1.0-10.0):
Rate the refined ticket quality to 1 decimal place based on INVEST criteria:
- **Independent** (0-2.0 points): Self-contained, minimal dependencies
- **Negotiable** (0-1.5 points): Flexible scope, allows discussion
- **Valuable** (0-2.0 points): Clear business/user value articulated
- **Estimable** (0-1.5 points): Clear enough for effort estimation
- **Small** (0-1.5 points): Appropriately sized for sprint completion
- **Testable** (0-1.5 points): Verifiable acceptance criteria

${previousClarityScore ? `**Previous Score**: ${previousClarityScore}/10.0 - Consider this when scoring the refined version. The new score should reflect improvements made.` : ''}

## OUTPUT REQUIREMENTS:
- Provide refined versions of ALL three sections (title, description, acceptanceCriteria) regardless of which sections were selected for refinement
- Only the selected sections will be applied, but I need all three for context
- Calculate an accurate clarity score (1.0-10.0) based on the refined content using INVEST criteria
- Provide detailed reasoning for the clarity score, explaining how each INVEST criterion was evaluated
- **Provide individual INVEST breakdown scores:**
  - independent: 0.0-2.0 (Self-contained, minimal dependencies)
  - negotiable: 0.0-1.5 (Flexible scope, allows discussion)
  - valuable: 0.0-2.0 (Clear business/user value articulated)
  - estimable: 0.0-1.5 (Clear enough for effort estimation)
  - small: 0.0-1.5 (Appropriately sized for sprint completion)
  - testable: 0.0-1.5 (Verifiable acceptance criteria)
- Include a brief improvement summary explaining what was enhanced

Refine the ticket content now:`;

  return prompt;
}