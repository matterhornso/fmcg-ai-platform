import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Strip markdown code fences then extract the first JSON object from AI text */
function extractJSON(text: string): any {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

const SYSTEM_PROMPT = `You are ComplaintAI, an expert customer complaint management agent for a large FMCG manufacturer in India that exports to 35+ countries. You have deep expertise in:
- Consumer complaint classification and triage
- Root cause analysis (5 Why, Fishbone/Ishikawa)
- Food safety incident management
- Regulatory reporting requirements (FSSAI, EU Food Safety, UK FSA, FDA)
- Customer communication and relationship management
- Quality deviation analysis for food products
- Recall and withdrawal procedures
- HACCP and food safety management systems

Export markets: UK, Germany, UAE, Qatar, Singapore, USA, Australia, Saudi Arabia, and 25+ more countries.

Always maintain a professional, empathetic tone. Prioritize consumer safety above all.

Key regulatory updates (2025-2026):
- EU RASFF system for food safety alerts — Indian spice exports frequently flagged
- Common issues: ethylene oxide in spices, pesticide MRL exceedances, aflatoxin contamination
- India-UK CETA includes SPS equivalence recognition framework
- UK Border Target Operating Model (BTOM): Risk-based import categorization, pre-notification via IPAFFS mandatory
- GCC countries require minimum remaining shelf life (typically 50-75%) at port of entry
- FDA FSMA: FSVP verification, Preventive Controls, Food Traceability Rule
- FSSAI notification required for food safety incidents within India
- EU requires notification within 48 hours for serious food safety events`;

export async function classifyAndAnalyzeComplaint(
  customerName: string,
  country: string,
  product: string,
  batchNumber: string | undefined,
  description: string
): Promise<{
  category: string;
  priority: string;
  riskLevel: string;
  potentialRootCauses: string[];
  immediateActions: string[];
  requiresRegulatorNotification: boolean;
  regulatoryBodies: string[];
  summary: string;
}> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze and classify this customer complaint:

Customer: ${customerName}
Country: ${country}
Product: ${product}
${batchNumber ? `Batch Number: ${batchNumber}` : ''}
Complaint Description: ${description}

Provide a JSON response:
{
  "category": "quality|packaging|labeling|foreign_object|microbiological|allergen|delivery|documentation|other",
  "priority": "critical|high|medium|low",
  "riskLevel": "critical|high|medium|low",
  "potentialRootCauses": ["cause1", "cause2", "cause3"],
  "immediateActions": ["action1", "action2", ...],
  "requiresRegulatorNotification": true|false,
  "regulatoryBodies": ["body1", "body2"] (relevant regulatory authorities in ${country}),
  "summary": "Brief analysis summary"
}

Note: Foreign objects, microbiological issues, and allergen-related complaints are always critical priority.`,
      },
    ],
  });

  const textContent = response.content.find((b) => b.type === 'text');
  if (!textContent || textContent.type !== 'text') throw new Error('No AI response');

  try {
    const parsed = extractJSON(textContent.text);
    if (parsed) return parsed;
  } catch (e) {
    console.warn('Could not parse complaint classification JSON:', (e as Error).message);
  }

  return {
    category: 'quality',
    priority: 'medium',
    riskLevel: 'medium',
    potentialRootCauses: ['Process deviation', 'Raw material issue'],
    immediateActions: ['Isolate batch', 'Investigate'],
    requiresRegulatorNotification: false,
    regulatoryBodies: [],
    summary: textContent.text,
  };
}

export async function generateResponseLetter(
  complaintRef: string,
  customerName: string,
  country: string,
  product: string,
  description: string,
  resolution: string,
  category: string
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Draft a professional response letter for this customer complaint:

Reference: ${complaintRef}
Customer: ${customerName} (${country})
Product: ${product}
Complaint: ${description}
Category: ${category}
Resolution/Actions Taken: ${resolution}

Write a formal, empathetic business letter that:
1. Acknowledges the complaint professionally
2. Expresses sincere apology
3. Explains the investigation findings (brief)
4. Details the corrective actions taken
5. Offers appropriate compensation/remedy
6. Provides assurance of quality commitment
7. Includes a signature block for Quality Manager

Keep it professional yet warm. The company is based in India.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}

export async function performRootCauseAnalysis(
  product: string,
  batchNumber: string | undefined,
  category: string,
  description: string
): Promise<{
  fishboneAnalysis: {
    manpower: string[];
    machine: string[];
    material: string[];
    method: string[];
    measurement: string[];
    environment: string[];
  };
  fiveWhyAnalysis: string[];
  mostLikelyCause: string;
  preventiveRecommendations: string[];
}> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Perform a comprehensive root cause analysis for:

Product: ${product}
${batchNumber ? `Batch: ${batchNumber}` : ''}
Issue Category: ${category}
Issue Description: ${description}

Provide a JSON response with:
{
  "fishboneAnalysis": {
    "manpower": ["potential cause related to people"],
    "machine": ["potential cause related to equipment"],
    "material": ["potential cause related to raw materials/packaging"],
    "method": ["potential cause related to process/procedure"],
    "measurement": ["potential cause related to testing/inspection"],
    "environment": ["potential cause related to environment/storage"]
  },
  "fiveWhyAnalysis": [
    "Why 1: ...",
    "Why 2: ...",
    "Why 3: ...",
    "Why 4: ...",
    "Why 5: ..."
  ],
  "mostLikelyCause": "The most probable root cause based on analysis",
  "preventiveRecommendations": ["recommendation1", "recommendation2", ...]
}`,
      },
    ],
  });

  const textContent = response.content.find((b) => b.type === 'text');
  if (!textContent || textContent.type !== 'text') throw new Error('No AI response');

  try {
    const parsed = extractJSON(textContent.text);
    if (parsed) return parsed;
  } catch (e) {
    console.warn('Could not parse RCA JSON:', (e as Error).message);
  }

  return {
    fishboneAnalysis: {
      manpower: [],
      machine: [],
      material: [],
      method: [],
      measurement: [],
      environment: [],
    },
    fiveWhyAnalysis: [],
    mostLikelyCause: 'Investigation required',
    preventiveRecommendations: [],
  };
}

export async function generateRegulatoryNotification(
  complaintRef: string,
  customerName: string,
  country: string,
  product: string,
  batchNumber: string | undefined,
  description: string,
  category: string,
  authority: string
): Promise<{
  authority: string;
  notificationType: string;
  hazardCategory: string;
  productDetails: string;
  distributionInfo: string;
  actionsTaken: string;
  draftNotification: string;
}> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        authority,
        notificationType: 'To be determined',
        hazardCategory: 'To be determined',
        productDetails: `${product}${batchNumber ? `, Batch: ${batchNumber}` : ''}`,
        distributionInfo: `Distributed to ${country} — ${customerName}`,
        actionsTaken: 'Investigation in progress',
        draftNotification: `[TEMPLATE] Regulatory notification for ${authority}\n\nComplaint Ref: ${complaintRef}\nProduct: ${product}\nBatch: ${batchNumber || 'N/A'}\nCustomer: ${customerName} (${country})\nDescription: ${description}\nCategory: ${category}\n\n[Please complete this notification manually or configure ANTHROPIC_API_KEY for AI-generated drafts]`,
      };
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a formal regulatory notification draft for the following complaint:

Authority: ${authority}
Complaint Reference: ${complaintRef}
Customer: ${customerName} (${country})
Product: ${product}
${batchNumber ? `Batch Number: ${batchNumber}` : ''}
Category: ${category}
Description: ${description}

Generate a JSON response:
{
  "authority": "${authority}",
  "notificationType": "type of notification (e.g., alert, information, border rejection)",
  "hazardCategory": "hazard classification",
  "productDetails": "detailed product identification",
  "distributionInfo": "distribution and market information",
  "actionsTaken": "actions taken or proposed",
  "draftNotification": "full formal notification text ready for submission"
}

The notification should follow the standard format expected by ${authority}. Include all required fields and sections. The company is an Indian FMCG manufacturer.`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No AI response');

    try {
      const parsed = extractJSON(textContent.text);
      if (parsed) return parsed;
    } catch (e) {
      console.warn('Could not parse regulatory notification JSON:', (e as Error).message);
    }

    return {
      authority,
      notificationType: 'Review required',
      hazardCategory: 'Pending classification',
      productDetails: product,
      distributionInfo: `${country} — ${customerName}`,
      actionsTaken: 'Under investigation',
      draftNotification: textContent.text,
    };
  } catch (error) {
    console.error('Regulatory notification error:', error);
    return {
      authority,
      notificationType: 'To be determined',
      hazardCategory: 'To be determined',
      productDetails: `${product}${batchNumber ? `, Batch: ${batchNumber}` : ''}`,
      distributionInfo: `Distributed to ${country} — ${customerName}`,
      actionsTaken: 'Investigation in progress',
      draftNotification: `[TEMPLATE] Regulatory notification for ${authority}. Please complete manually.`,
    };
  }
}

export async function analyzeBatchTrace(
  batchData: any,
  complaintDescription: string
): Promise<{
  suspectedStage: string;
  confidence: string;
  analysis: string;
  recommendedInvestigation: string[];
}> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        suspectedStage: 'Unknown — AI analysis unavailable',
        confidence: 'N/A',
        analysis: 'Configure ANTHROPIC_API_KEY for AI-powered batch trace analysis.',
        recommendedInvestigation: [
          'Review raw material certificates of analysis',
          'Check production process logs',
          'Verify quality check records',
          'Inspect shipment and storage conditions',
        ],
      };
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2500,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze the following batch traceability data in relation to a customer complaint and identify the likely point of failure:

Batch Data:
${JSON.stringify(batchData, null, 2)}

Complaint Description: ${complaintDescription}

Provide a JSON response:
{
  "suspectedStage": "the production/supply chain stage most likely responsible",
  "confidence": "high|medium|low",
  "analysis": "detailed analysis explaining why this stage is suspected",
  "recommendedInvestigation": ["step1", "step2", "step3"]
}

Consider raw materials, production process, quality checks, packaging, and shipment stages.`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No AI response');

    try {
      const parsed = extractJSON(textContent.text);
      if (parsed) return parsed;
    } catch (e) {
      console.warn('Could not parse batch trace analysis JSON:', (e as Error).message);
    }

    return {
      suspectedStage: 'Requires manual investigation',
      confidence: 'low',
      analysis: textContent.text,
      recommendedInvestigation: ['Review full batch records manually'],
    };
  } catch (error) {
    console.error('Batch trace analysis error:', error);
    return {
      suspectedStage: 'Unknown — AI analysis unavailable',
      confidence: 'N/A',
      analysis: 'AI analysis failed. Please investigate manually.',
      recommendedInvestigation: [
        'Review raw material certificates of analysis',
        'Check production process logs',
        'Verify quality check records',
        'Inspect shipment and storage conditions',
      ],
    };
  }
}

export async function chatWithComplaintAgent(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: string
): Promise<string> {
  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\nCurrent complaint context: ${context}`
    : SYSTEM_PROMPT;

  const finalMsg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: systemWithContext,
    messages,
  });

  const textBlock = finalMsg.content.find((b) => b.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}
