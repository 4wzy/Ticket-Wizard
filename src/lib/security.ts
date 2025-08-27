import DOMPurify from 'isomorphic-dompurify';

// Input validation constants
export const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 2000,
  PROJECT_INFO_MAX_LENGTH: 5000,
  STANDARDS_MAX_LENGTH: 5000,
  TEMPLATE_FORMAT_MAX_LENGTH: 10000,
  CATEGORY_MAX_LENGTH: 100,
  TAG_MAX_LENGTH: 50,
  MAX_TAGS: 20,
  MAX_ADDITIONAL_FIELDS: 50
} as const;

// Sanitize HTML content to prevent XSS
export function sanitizeHtml(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

// Validate and sanitize text input
export function validateAndSanitizeText(
  input: unknown, 
  fieldName: string, 
  maxLength: number, 
  required: boolean = false
): { isValid: boolean; value: string; error?: string } {
  
  // Check if required field is provided
  if (required && (!input || typeof input !== 'string' || input.trim().length === 0)) {
    return {
      isValid: false,
      value: '',
      error: `${fieldName} is required`
    };
  }

  // Handle non-string or empty input
  if (!input || typeof input !== 'string') {
    return {
      isValid: !required,
      value: '',
      error: required ? `${fieldName} must be a string` : undefined
    };
  }

  // Sanitize the input
  const sanitized = sanitizeHtml(input.trim());

  // Check length
  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      value: sanitized.substring(0, maxLength),
      error: `${fieldName} must be ${maxLength} characters or less`
    };
  }

  return {
    isValid: true,
    value: sanitized
  };
}

// Validate visibility scope
export function validateVisibilityScope(scope: unknown): { isValid: boolean; value?: string; error?: string } {
  const validScopes = ['global', 'organization', 'team', 'private'] as const;
  
  if (!scope || typeof scope !== 'string') {
    return {
      isValid: false,
      error: 'Visibility scope must be a string'
    };
  }

  if (!validScopes.includes(scope as any)) {
    return {
      isValid: false,
      error: `Invalid visibility scope. Must be one of: ${validScopes.join(', ')}`
    };
  }

  return {
    isValid: true,
    value: scope
  };
}

// Validate UUID format
export function validateUUID(id: unknown): { isValid: boolean; value?: string; error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!id || typeof id !== 'string') {
    return {
      isValid: false,
      error: 'ID must be a string'
    };
  }

  if (!uuidRegex.test(id)) {
    return {
      isValid: false,
      error: 'Invalid ID format'
    };
  }

  return {
    isValid: true,
    value: id
  };
}

// Validate and sanitize tags array
export function validateTags(tags: unknown): { isValid: boolean; value: string[]; error?: string } {
  if (!tags) {
    return { isValid: true, value: [] };
  }

  if (!Array.isArray(tags)) {
    return {
      isValid: false,
      value: [],
      error: 'Tags must be an array'
    };
  }

  if (tags.length > VALIDATION_LIMITS.MAX_TAGS) {
    return {
      isValid: false,
      value: [],
      error: `Maximum ${VALIDATION_LIMITS.MAX_TAGS} tags allowed`
    };
  }

  const sanitizedTags: string[] = [];
  
  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return {
        isValid: false,
        value: [],
        error: 'All tags must be strings'
      };
    }

    const sanitized = sanitizeHtml(tag.trim());
    if (sanitized.length === 0) continue;
    
    if (sanitized.length > VALIDATION_LIMITS.TAG_MAX_LENGTH) {
      return {
        isValid: false,
        value: [],
        error: `Tag "${sanitized}" is too long (max ${VALIDATION_LIMITS.TAG_MAX_LENGTH} characters)`
      };
    }

    sanitizedTags.push(sanitized);
  }

  return {
    isValid: true,
    value: sanitizedTags
  };
}

// Validate and sanitize key-value objects (abbreviations, terminology)
export function validateKeyValueObject(
  obj: unknown, 
  fieldName: string, 
  maxKeyLength: number = 100, 
  maxValueLength: number = 500
): { isValid: boolean; value: Record<string, string>; error?: string } {
  
  if (!obj) {
    return { isValid: true, value: {} };
  }

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return {
      isValid: false,
      value: {},
      error: `${fieldName} must be an object`
    };
  }

  const sanitized: Record<string, string> = {};
  const entries = Object.entries(obj as Record<string, unknown>);

  if (entries.length > 100) { // Reasonable limit
    return {
      isValid: false,
      value: {},
      error: `${fieldName} can have maximum 100 entries`
    };
  }

  for (const [key, value] of entries) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return {
        isValid: false,
        value: {},
        error: `All keys and values in ${fieldName} must be strings`
      };
    }

    const sanitizedKey = sanitizeHtml(key.trim());
    const sanitizedValue = sanitizeHtml(value.trim());

    if (sanitizedKey.length === 0) continue;

    if (sanitizedKey.length > maxKeyLength) {
      return {
        isValid: false,
        value: {},
        error: `Key "${sanitizedKey}" in ${fieldName} is too long (max ${maxKeyLength} characters)`
      };
    }

    if (sanitizedValue.length > maxValueLength) {
      return {
        isValid: false,
        value: {},
        error: `Value for "${sanitizedKey}" in ${fieldName} is too long (max ${maxValueLength} characters)`
      };
    }

    sanitized[sanitizedKey] = sanitizedValue;
  }

  return {
    isValid: true,
    value: sanitized
  };
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  // Clean up old entries
  for (const [key, data] of rateLimitMap.entries()) {
    if (data.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }

  const current = rateLimitMap.get(identifier);
  
  if (!current || current.resetTime < now) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }

  current.count++;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime
  };
}

// Check if user has permission to access resource based on visibility
export async function checkResourceAccess(
  resource: { 
    visibility_scope: string; 
    created_by: string; 
    organization_id: string | null; 
    team_id: string | null; 
  },
  userId: string,
  userProfile: { organization_id: string | null; org_role?: string },
  userTeamIds: string[]
): Promise<{ hasAccess: boolean; error?: string }> {
  
  switch (resource.visibility_scope) {
    case 'global':
      // Everyone can access global resources
      return { hasAccess: true };
    
    case 'private':
      // Only creator can access private resources
      return { hasAccess: resource.created_by === userId };
    
    case 'organization':
      // Must be in same organization
      if (!userProfile.organization_id || !resource.organization_id) {
        return { hasAccess: false, error: 'Organization access required' };
      }
      return { hasAccess: userProfile.organization_id === resource.organization_id };
    
    case 'team':
      // Must be member of the specific team
      if (!resource.team_id) {
        return { hasAccess: false, error: 'Invalid team resource' };
      }
      
      return { hasAccess: userTeamIds.includes(resource.team_id) };
    
    default:
      return { hasAccess: false, error: 'Invalid visibility scope' };
  }
}