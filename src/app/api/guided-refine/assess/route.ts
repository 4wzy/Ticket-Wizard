import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Type } from '@google/genai';
import { Template } from '@/lib/templatesData';
import { uploadFilesToGemini, createFilePartsFromUploaded, parseFilesFromJSON, UploadedFile } from '@/lib/fileUtils';
import { FileData } from '@/lib/fileHelpers';
import { recordTokenUsage, enforceUsageLimit } from '@/lib/usage-tracking';
import { createAIClient, getUserSelectedModel, estimateTokenUsage, type AIModel } from '@/lib/ai-config';

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

interface AssessRequest {
  jiraDetails: GuidedJiraDetails;
  teamContext?: TeamContext | null;
  template?: Template | null;
  files?: FileData[]; // Base64 encoded files from frontend
  selectedModel?: string; // User's selected AI model
}

// AI client is now created dynamically

// Structured response schema for assessment
const assessmentResponseSchema = {
  type: Type.OBJECT,
  properties: {
    wizardScore: {
      type: Type.NUMBER,
      description: "Quality score from 1.0-10.0 (1 decimal place) based on INVEST criteria"
    },
    wizardScoreReasoning: {
      type: Type.STRING,
      description: "Detailed explanation of the wizard score based on INVEST criteria"
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
    },
    aiMessage: {
      type: Type.STRING,
      description: "AI feedback message about the ticket quality"
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING
      },
      description: "Follow-up questions to improve the ticket (optional)"
    },
    updatedJiraDetails: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Improved ticket title if suggested"
        },
        description: {
          type: Type.STRING,
          description: "Improved ticket description if suggested"
        },
        acceptanceCriteria: {
          type: Type.STRING,
          description: "Improved acceptance criteria if suggested"
        }
      },
      description: "Suggested improvements to the ticket (optional)"
    }
  },
  required: ["wizardScore", "wizardScoreReasoning", "investBreakdown", "aiMessage"],
  propertyOrdering: ["wizardScore", "wizardScoreReasoning", "aiMessage", "questions", "updatedJiraDetails"]
};

export async function POST(request: NextRequest) {
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

    const body: AssessRequest = await request.json();
    const { jiraDetails, teamContext, template, files, selectedModel } = body;
    
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Determine the AI model to use
    const aiModel = selectedModel && (selectedModel === 'gemini-2.5-flash-lite' || selectedModel === 'gemini-2.5-flash') 
      ? selectedModel as AIModel 
      : getUserSelectedModel();

    // Estimate token usage for this assessment request using the selected model
    const textLength = jiraDetails.title.length + jiraDetails.description.length + 
                      jiraDetails.acceptanceCriteria.length;
    const estimatedTokens = estimateTokenUsage('assess', textLength, aiModel);

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

    // Build assessment prompt for Gemini
    const systemPrompt = buildAssessmentPrompt(jiraDetails, teamContext, template, uploadedFiles);
    
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
        responseSchema: assessmentResponseSchema,
      },
    });

    const aiResponse = JSON.parse(response.text);
    
    // Record token usage for successful request
    const actualTokens = Math.max(estimatedTokens, Math.floor((Date.now() - startTime) / 10));
    await recordTokenUsage({
      endpoint: '/api/guided-refine/assess',
      tokens_used: actualTokens,
      model_used: aiModel,
      feature_used: 'guided_assess',
      request_id: requestId,
    }, userId);
    
    return NextResponse.json({
      success: true,
      wizardScore: aiResponse.wizardScore,
      wizardScoreReasoning: aiResponse.wizardScoreReasoning,
      investBreakdown: aiResponse.investBreakdown,
      aiMessage: aiResponse.aiMessage,
      questions: aiResponse.questions || [],
      updatedJiraDetails: aiResponse.updatedJiraDetails || null,
      uploadedFiles: uploadedFiles.length,
      fileErrors: fileErrors.length > 0 ? fileErrors : undefined
    });

  } catch (error) {
    console.error('Error in AI assessment:', error);
    
    // Record usage for failed request (minimal tokens)
    if (userId) {
      await recordTokenUsage({
        endpoint: '/api/guided-refine/assess',
        tokens_used: 50,
        model_used: getUserSelectedModel(), // Use default model for error tracking
        feature_used: 'guided_assess_failed',
        request_id: requestId,
      }, userId).catch(() => {}); // Ignore errors during failure tracking
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to assess ticket with AI' },
      { status: 500 }
    );
  }
}

// Helper function to build assessment prompt
function buildAssessmentPrompt(
  jiraDetails: GuidedJiraDetails,
  teamContext?: TeamContext | null,
  template?: Template | null,
  uploadedFiles: UploadedFile[] = []
): string {
  let prompt = `You are an expert Jira ticket assistant. Analyze this ticket and provide initial assessment and guidance.

## YOUR ROLE:
- Assess ticket quality using INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Provide constructive feedback and actionable questions
- Calculate a quality score from 1-10
- Guide users toward creating excellent tickets

## CURRENT TICKET:
**Title**: ${jiraDetails.title || 'Not provided'}
**Description**: ${jiraDetails.description || 'Not provided'}  
**Acceptance Criteria**: ${jiraDetails.acceptanceCriteria || 'Not provided'}`;

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
${Object.entries(teamContext.terminology).map(([term, definition]) => `- ${term}: ${definition}`).join('\n')}`;
  }

  // Add template context if available
  if (template) {
    prompt += `

## TEMPLATE CONTEXT:
**Template**: ${template.name}
**Description**: ${template.description}
**Title Format**: ${template.structure.titleFormat}
**Description Format**: ${template.structure.descriptionFormat}
**Acceptance Criteria Format**: ${template.structure.acceptanceCriteriaFormat}`;
  }

  // Add file context if files were uploaded
  if (uploadedFiles.length > 0) {
    prompt += `

## UPLOADED FILES CONTEXT:
The user has provided ${uploadedFiles.length} file(s) for additional context:
${uploadedFiles.map(file => `- **${file.name}** (${file.mimeType}${file.size ? `, ${Math.round(file.size / 1024)}KB` : ''})`).join('\n')}

Please analyze these files to better understand the requirements and context. Incorporate insights from the files into your assessment and suggestions for improving the ticket.`;
  }

  prompt += `

## ASSESSMENT CRITERIA:

**INVEST Principles (Rate 1-10):**
- **Independent**: Can this be developed without dependencies?
- **Negotiable**: Is scope flexible and discussable?
- **Valuable**: Does it deliver clear business/user value?
- **Estimable**: Can developers estimate effort required?
- **Small**: Is it appropriately sized for completion?
- **Testable**: Are success criteria measurable?

**Scoring Guidelines (1.0-10.0):**
Rate to 1 decimal place based on INVEST criteria:
- **Independent** (0-2.0 points): Self-contained, minimal dependencies
- **Negotiable** (0-1.5 points): Flexible scope, allows discussion
- **Valuable** (0-2.0 points): Clear business/user value articulated
- **Estimable** (0-1.5 points): Clear enough for effort estimation
- **Small** (0-1.5 points): Appropriately sized for sprint completion
- **Testable** (0-1.5 points): Verifiable acceptance criteria

## RESPONSE GUIDELINES:
1. **Calculate wizardScore** - Rate the overall ticket quality (1.0-10.0) based on INVEST criteria
2. **Provide wizardScoreReasoning** - Explain how each INVEST criterion was evaluated
2. **Provide aiMessage** - Give constructive feedback about the ticket's current state
3. **Ask questions** - Include 1-3 specific questions to help improve the ticket (if needed)
4. **Suggest improvements** - Only include updatedJiraDetails if you have specific improvement suggestions

Be encouraging and constructive. Focus on what can be improved rather than just pointing out problems.

Assess this ticket now:`;

  return prompt;
}