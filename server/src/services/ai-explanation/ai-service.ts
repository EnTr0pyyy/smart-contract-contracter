/**
 * AI Explanation Service
 * 
 * CRITICAL SAFETY RULES:
 * 1. AI receives ONLY structured JSON (no raw contract code)
 * 2. AI cannot detect new risks
 * 3. AI cannot modify risk scores
 * 4. All outputs are strictly validated
 */

import { 
  AIExplanationInput, 
  AIExplanationOutput, 
  RiskType,
  RiskExplanation 
} from '../../types/risk.types';

export class AIExplanationService {
  /**
   * Generate human-readable explanations for detected risks
   * Uses Claude/GPT with strict prompt engineering
   */
  static async generateExplanations(
    input: AIExplanationInput
  ): Promise<AIExplanationOutput> {
    // Build safe prompt (no code injection possible)
    const prompt = this.buildPrompt(input);

    // Call AI service (Claude Sonnet / GPT-4)
    const aiResponse = await this.callAIService(prompt);

    // Validate and parse response
    const validated = this.validateAndParse(aiResponse, input);

    return validated;
  }

  /**
   * Build safe prompt from structured input
   */
  private static buildPrompt(input: AIExplanationInput): string {
    return `You are a smart contract security expert translator.

⚠️ CRITICAL RULES:
1. You are translating technical findings into explanations
2. You CANNOT detect new risks
3. You CANNOT modify risk scores
4. You MUST generate exactly TWO summaries: beginner and developer
5. You MUST maintain neutral, factual tone
6. You MUST respond with valid JSON only

INPUT (pre-detected structured findings):
${JSON.stringify({
  risk_score: input.risk_score,
  total_risks: input.risks.length,
  risks: input.risks.map(r => ({
    type: r.type,
    severity: r.severity,
    weight: r.weight,
    code_snippet: r.code_snippet,
    line_number: r.line_number,
    machine_reason: r.machine_reason,
    function_name: r.function_name,
  })),
  confidence: input.confidence,
}, null, 2)}

REQUIRED OUTPUT (valid JSON):
{
  "beginner_summary": "<2-3 sentences in plain English explaining overall risk level>",
  "developer_summary": "<2-3 sentences with technical precision for developers>",
  "risk_explanations": [
    {
      "type": "<must match input risk type>",
      "beginner": "<plain English explanation with analogies (max 200 chars)>",
      "developer": "<technical explanation (max 300 chars)>",
      "why_it_matters": "<user impact in simple terms (max 150 chars)>",
      "mitigation": "<how to fix (max 200 chars)>"
    }
  ]
}

EXAMPLE BEGINNER EXPLANATIONS:
- "This contract allows the owner to create unlimited tokens, like a central bank printing money without limits."
- "Your funds can be frozen at any time, similar to a bank account that can be locked by management."

EXAMPLE DEVELOPER EXPLANATIONS:
- "No MAX_SUPPLY constant. Mint function has onlyOwner modifier without supply cap check."
- "Pausable contract inherits Pausable.sol. whenNotPaused modifier blocks user operations."

Generate the explanation now (JSON only, no markdown):`;
  }

  /**
   * Call AI service (Claude Sonnet or GPT-4)
   */
  private static async callAIService(prompt: string): Promise<string> {
    // Mock implementation - replace with actual AI service call
    // This would use Anthropic Claude API or OpenAI GPT-4 API
    
    // For hackathon/demo, you can use the existing RunAnywhere setup
    // or integrate with Anthropic/OpenAI APIs
    
    // Example with Anthropic Claude:
    /*
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    });
    return response.content[0].text;
    */

    // For now, return a placeholder
    // In production, this MUST be replaced with actual AI service
    throw new Error('AI service not configured. Set up Claude or GPT-4 API.');
  }

  /**
   * Validate and parse AI response
   * Reject malformed or dangerous outputs
   */
  private static validateAndParse(
    aiResponse: string,
    originalInput: AIExplanationInput
  ): AIExplanationOutput {
    try {
      // Extract JSON from response
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON found in AI response');
      }

      const jsonStr = aiResponse.slice(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      // Validate structure
      this.validateStructure(parsed, originalInput);

      // Validate lengths
      this.validateLengths(parsed);

      // Ensure no new risks introduced
      this.validateNoNewRisks(parsed, originalInput);

      return parsed as AIExplanationOutput;
    } catch (error) {
      console.error('AI response validation failed:', error);
      // Fallback to safe default explanations
      return this.generateFallbackExplanations(originalInput);
    }
  }

  /**
   * Validate response structure
   */
  private static validateStructure(
    parsed: any,
    input: AIExplanationInput
  ): void {
    if (!parsed.beginner_summary || typeof parsed.beginner_summary !== 'string') {
      throw new Error('Missing or invalid beginner_summary');
    }

    if (!parsed.developer_summary || typeof parsed.developer_summary !== 'string') {
      throw new Error('Missing or invalid developer_summary');
    }

    if (!Array.isArray(parsed.risk_explanations)) {
      throw new Error('Missing or invalid risk_explanations array');
    }

    if (parsed.risk_explanations.length !== input.risks.length) {
      throw new Error('Risk count mismatch');
    }

    // Validate each explanation
    for (const explanation of parsed.risk_explanations) {
      if (!explanation.type || !explanation.beginner || !explanation.developer ||
          !explanation.why_it_matters || !explanation.mitigation) {
        throw new Error('Invalid explanation structure');
      }
    }
  }

  /**
   * Validate string lengths
   */
  private static validateLengths(parsed: any): void {
    if (parsed.beginner_summary.length > 400) {
      throw new Error('Beginner summary too long');
    }

    if (parsed.developer_summary.length > 500) {
      throw new Error('Developer summary too long');
    }

    for (const explanation of parsed.risk_explanations) {
      if (explanation.beginner.length > 300) {
        throw new Error('Beginner explanation too long');
      }
      if (explanation.developer.length > 400) {
        throw new Error('Developer explanation too long');
      }
      if (explanation.why_it_matters.length > 200) {
        throw new Error('Why it matters too long');
      }
      if (explanation.mitigation.length > 300) {
        throw new Error('Mitigation too long');
      }
    }
  }

  /**
   * Ensure AI didn't introduce new risks
   */
  private static validateNoNewRisks(
    parsed: any,
    input: AIExplanationInput
  ): void {
    const inputTypes = new Set(input.risks.map(r => r.type));
    const outputTypes = new Set(parsed.risk_explanations.map((e: any) => e.type));

    for (const type of outputTypes) {
      if (!inputTypes.has(type)) {
        throw new Error(`AI introduced unauthorized risk type: ${type}`);
      }
    }
  }

  /**
   * Generate fallback explanations if AI fails
   */
  private static generateFallbackExplanations(
    input: AIExplanationInput
  ): AIExplanationOutput {
    const riskCount = input.risks.length;
    const classification = this.getClassificationText(input.risk_score);

    const riskExplanations: RiskExplanation[] = input.risks.map(risk => ({
      type: risk.type,
      beginner: this.getDefaultBeginnerExplanation(risk.type),
      developer: risk.machine_reason,
      why_it_matters: this.getDefaultImpact(risk.type),
      mitigation: this.getDefaultMitigation(risk.type),
    }));

    return {
      beginner_summary: `This contract has ${riskCount} security concern${riskCount > 1 ? 's' : ''} with ${classification} risk level. Review the findings below before interacting with this contract.`,
      developer_summary: `Analysis detected ${riskCount} risk${riskCount > 1 ? 's' : ''} with total risk score ${input.risk_score}/10. Review each finding for technical details.`,
      risk_explanations: riskExplanations,
    };
  }

  /**
   * Default explanations for each risk type
   */
  private static getDefaultBeginnerExplanation(type: RiskType): string {
    const defaults: Record<RiskType, string> = {
      [RiskType.UNLIMITED_MINTING]: 'The owner can create unlimited tokens without restrictions.',
      [RiskType.OWNER_RESTRICTED_MINTING]: 'Only the owner can create new tokens, centralizing supply control.',
      [RiskType.WITHDRAW_FUNCTION]: 'The owner can withdraw funds from the contract.',
      [RiskType.EMERGENCY_WITHDRAWAL]: 'There is an emergency function that can drain all funds.',
      [RiskType.BALANCE_MANIPULATION]: 'Privileged accounts can modify user balances directly.',
      [RiskType.CENTRALIZED_OWNERSHIP]: 'A single address controls multiple critical functions.',
      [RiskType.PAUSABLE_CONTRACT]: 'The contract can be paused, freezing all operations.',
      [RiskType.OWNERSHIP_TRANSFER]: 'Contract ownership can be transferred to a new address.',
      [RiskType.DELEGATECALL_USAGE]: 'The contract uses delegatecall, allowing code execution in its context.',
      [RiskType.UUPS_PROXY]: 'The contract is upgradeable and its logic can be changed.',
      [RiskType.TRANSPARENT_PROXY]: 'The contract implementation can be swapped completely.',
      [RiskType.SELFDESTRUCT]: 'The contract can be permanently destroyed.',
      [RiskType.TX_ORIGIN]: 'The contract uses tx.origin, which is vulnerable to phishing.',
      [RiskType.UNCHECKED_CALL]: 'External calls are not properly checked for failures.',
      [RiskType.ADJUSTABLE_FEES]: 'The owner can change fees or taxes at any time.',
      [RiskType.BLACKLIST_MODIFICATION]: 'The owner can blacklist addresses from interacting.',
      [RiskType.MAX_TX_LIMIT]: 'Transaction limits can be modified by the owner.',
      [RiskType.WHITELIST_MODIFICATION]: 'The owner controls who can interact with the contract.',
    };
    return defaults[type] || 'A security concern was detected.';
  }

  private static getDefaultImpact(type: RiskType): string {
    return 'This could affect your ability to interact with or withdraw from the contract.';
  }

  private static getDefaultMitigation(type: RiskType): string {
    return 'Consider avoiding contracts with this pattern or using contracts with timelock/multisig protections.';
  }

  private static getClassificationText(score: number): string {
    if (score <= 2.0) return 'very low';
    if (score <= 4.0) return 'low';
    if (score <= 6.0) return 'moderate';
    if (score <= 8.0) return 'high';
    return 'very high';
  }
}
