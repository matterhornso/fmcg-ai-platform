import { getAnthropicClient, extractJSON } from '../utils/ai';

const SYSTEM_PROMPT = `You are QualityAI, an expert quality management agent for a large FMCG manufacturer in India that exports to 35+ countries. You have deep expertise in:
- Food safety standards (FSSAI, HACCP, ISO 22000, BRC, FSSC 22000)
- GMP (Good Manufacturing Practices)
- Supplier quality management
- Non-conformance reporting
- Corrective and Preventive Actions (CAPA)
- Export compliance for quality standards (EU, US FDA, UK FSA, GCC)
- Indian export regulations for food products

Always provide practical, actionable recommendations. Format responses as structured JSON when requested.

Key regulatory updates (2025-2026):
- India-UK CETA (July 2025): Self-certification of origin allowed, SPS equivalence, 48-hour goods release target
- India-EU FTA (January 2026): Major market access for food/FMCG to 27-country EU bloc
- India-UAE CEPA: Operational since 2022, preferential tariffs on food products
- India-Australia ECTA: Operational since 2022, tariff concessions on agri-food
- EUDR (EU Deforestation Regulation): Affects coffee, cocoa, palm oil, soy exports to EU
- Common rejection reasons: pesticide residue exceedances, ethylene oxide in spices, aflatoxin in groundnuts, labeling non-compliance, microbiological contamination
- FSSAI Export NOC required for food exports
- BIS Quality Control Orders (QCOs) may apply to certain products
- PLI scheme for food processing provides manufacturing incentives`;

export async function generateAuditChecklist(
  auditType: string,
  product: string,
  supplier?: string,
  location?: string
): Promise<{ checklist: string[]; guidelines: string }> {
  const response = await getAnthropicClient().messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a comprehensive audit checklist for the following:
Audit Type: ${auditType}
Product/Process: ${product}
${supplier ? `Supplier: ${supplier}` : ''}
${location ? `Location: ${location}` : ''}

Return a JSON object with:
{
  "checklist": ["item1", "item2", ...] (20-30 specific checkpoints),
  "guidelines": "Brief overview of key focus areas and regulatory requirements"
}`,
      },
    ],
  });

  const textContent = response.content.find((b) => b.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  try {
    const parsed = extractJSON(textContent.text);
    if (parsed) return parsed;
  } catch (e) {
    console.warn('Could not parse AI checklist JSON:', (e as Error).message);
  }

  return {
    checklist: ['Review documentation', 'Visual inspection', 'Process verification'],
    guidelines: textContent.text,
  };
}

export async function analyzeAuditFindings(
  auditTitle: string,
  auditType: string,
  product: string,
  findings: string[],
  checklist: string[]
): Promise<{
  overallScore: number;
  riskLevel: string;
  summary: string;
  correctiveActions: Array<{ action: string; priority: string; deadline: string; responsible: string }>;
  preventiveActions: string[];
}> {
  const response = await getAnthropicClient().messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze the following audit findings and provide a comprehensive assessment:

Audit: ${auditTitle}
Type: ${auditType}
Product/Process: ${product}

Checklist Items Covered: ${checklist.join(', ')}

Findings/Non-conformances:
${findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Provide a JSON response with:
{
  "overallScore": <0-100>,
  "riskLevel": "critical|high|medium|low",
  "summary": "Executive summary of audit results",
  "correctiveActions": [
    {
      "action": "specific corrective action",
      "priority": "immediate|7days|30days",
      "deadline": "timeframe",
      "responsible": "department/role"
    }
  ],
  "preventiveActions": ["preventive measure 1", "preventive measure 2", ...]
}`,
      },
    ],
  });

  const textContent = response.content.find((b) => b.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  try {
    const parsed = extractJSON(textContent.text);
    if (parsed) return parsed;
  } catch (e) {
    console.warn('Could not parse AI analysis JSON:', (e as Error).message);
  }

  return {
    overallScore: 70,
    riskLevel: 'medium',
    summary: textContent.text,
    correctiveActions: [],
    preventiveActions: [],
  };
}

export async function getCountryRequirements(
  country: string,
  productCategory: string
): Promise<{
  country: string;
  productCategory: string;
  regulatoryBody: string;
  importStandards: string[];
  labelingRequirements: string[];
  requiredCertifications: string[];
  testingRequirements: string[];
  restrictedIngredients: string[];
  packagingStandards: string[];
  shelfLifeRules: string;
  additionalNotes: string;
}> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        country,
        productCategory,
        regulatoryBody: 'Please verify with local regulatory authority',
        importStandards: ['Verify with customs authority'],
        labelingRequirements: ['Verify local labeling regulations'],
        requiredCertifications: ['Health certificate', 'Certificate of origin'],
        testingRequirements: ['Verify with destination country lab requirements'],
        restrictedIngredients: ['Check destination country restricted substances list'],
        packagingStandards: ['Verify local packaging regulations'],
        shelfLifeRules: 'Verify destination country shelf-life requirements',
        additionalNotes: 'Configure ANTHROPIC_API_KEY for detailed AI-powered country requirements analysis.',
      };
    }

    const response = await getAnthropicClient().messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Provide comprehensive import requirements for the following:

Country: ${country}
Product Category: ${productCategory} (FMCG food products exported from India)

Provide a JSON response:
{
  "country": "${country}",
  "productCategory": "${productCategory}",
  "regulatoryBody": "primary regulatory authority for food imports",
  "importStandards": ["standard1", "standard2"],
  "labelingRequirements": ["requirement1", "requirement2"],
  "requiredCertifications": ["cert1", "cert2"],
  "testingRequirements": ["test1", "test2"],
  "restrictedIngredients": ["ingredient1", "ingredient2"],
  "packagingStandards": ["standard1", "standard2"],
  "shelfLifeRules": "shelf life requirements and rules",
  "additionalNotes": "any other important notes for Indian exporters"
}

Be specific about ${country}'s regulations. Include any recent regulatory changes relevant to Indian FMCG food exports.`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No AI response');

    try {
      const parsed = extractJSON(textContent.text);
      if (parsed) return parsed;
    } catch (e) {
      console.warn('Could not parse country requirements JSON:', (e as Error).message);
    }

    return {
      country,
      productCategory,
      regulatoryBody: 'Please verify',
      importStandards: [],
      labelingRequirements: [],
      requiredCertifications: [],
      testingRequirements: [],
      restrictedIngredients: [],
      packagingStandards: [],
      shelfLifeRules: 'Please verify',
      additionalNotes: textContent.text,
    };
  } catch (error) {
    console.error('Country requirements error:', error);
    return {
      country,
      productCategory,
      regulatoryBody: 'Please verify with local regulatory authority',
      importStandards: ['Verify with customs authority'],
      labelingRequirements: ['Verify local labeling regulations'],
      requiredCertifications: ['Health certificate', 'Certificate of origin'],
      testingRequirements: ['Verify with destination country lab requirements'],
      restrictedIngredients: ['Check destination country restricted substances list'],
      packagingStandards: ['Verify local packaging regulations'],
      shelfLifeRules: 'Verify destination country shelf-life requirements',
      additionalNotes: 'AI analysis unavailable. Please consult with trade compliance team.',
    };
  }
}

export async function predictShelfLife(
  product: string,
  destinationCountry: string,
  shippingMode: string,
  season: string,
  packagingType: string
): Promise<{
  declaredShelfLife: string;
  estimatedTransitDays: number;
  estimatedRemainingAtArrival: string;
  riskLevel: string;
  riskFactors: string[];
  temperatureExposure: string;
  recommendations: string[];
  packagingUpgrades: string[];
}> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        declaredShelfLife: 'Refer to product specification',
        estimatedTransitDays: 0,
        estimatedRemainingAtArrival: 'Requires calculation',
        riskLevel: 'unknown',
        riskFactors: ['AI analysis unavailable'],
        temperatureExposure: 'Depends on route and season',
        recommendations: ['Consult logistics team for transit time estimates', 'Review product stability data'],
        packagingUpgrades: ['Configure ANTHROPIC_API_KEY for AI-powered shelf-life prediction'],
      };
    }

    const response = await getAnthropicClient().messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2500,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Predict shelf-life impact for the following export shipment:

Product: ${product} (FMCG food product from India)
Destination Country: ${destinationCountry}
Shipping Mode: ${shippingMode}
Season: ${season}
Packaging Type: ${packagingType}

Provide a JSON response:
{
  "declaredShelfLife": "typical declared shelf life for this product type",
  "estimatedTransitDays": <number>,
  "estimatedRemainingAtArrival": "estimated remaining shelf life upon arrival",
  "riskLevel": "low|medium|high|critical",
  "riskFactors": ["factor1", "factor2"],
  "temperatureExposure": "expected temperature conditions during transit",
  "recommendations": ["recommendation1", "recommendation2"],
  "packagingUpgrades": ["upgrade1", "upgrade2"]
}

Consider the shipping route from India to ${destinationCountry}, typical transit times for ${shippingMode}, seasonal temperature variations during ${season}, and the impact on FMCG food product quality.`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No AI response');

    try {
      const parsed = extractJSON(textContent.text);
      if (parsed) return parsed;
    } catch (e) {
      console.warn('Could not parse shelf life prediction JSON:', (e as Error).message);
    }

    return {
      declaredShelfLife: 'Refer to product specification',
      estimatedTransitDays: 0,
      estimatedRemainingAtArrival: 'Calculation required',
      riskLevel: 'medium',
      riskFactors: [],
      temperatureExposure: 'Review required',
      recommendations: [],
      packagingUpgrades: [],
    };
  } catch (error) {
    console.error('Shelf life prediction error:', error);
    return {
      declaredShelfLife: 'Refer to product specification',
      estimatedTransitDays: 0,
      estimatedRemainingAtArrival: 'Requires calculation',
      riskLevel: 'unknown',
      riskFactors: ['AI analysis unavailable'],
      temperatureExposure: 'Depends on route and season',
      recommendations: ['Consult logistics team for transit time estimates', 'Review product stability data'],
      packagingUpgrades: ['Consult packaging team for recommendations'],
    };
  }
}

export async function checkContaminationRisks(
  product: string,
  destinationCountry: string
): Promise<{
  riskLevel: string,
  commonContaminants: Array<{contaminant: string, limit: string, testMethod: string, historicalIssues: string}>,
  testingRecommendations: string[],
  rejectionHistory: string,
  recommendations: string[]
}> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        riskLevel: 'unknown',
        commonContaminants: [],
        testingRecommendations: [
          'Test for pesticide residues per destination country MRL requirements',
          'Test for heavy metals (lead, cadmium, arsenic, mercury)',
          'Conduct microbiological testing (TPC, coliforms, E. coli, Salmonella, Listeria)',
          'Test for mycotoxins (aflatoxins) if applicable',
          'Verify ethylene oxide levels for spice products',
        ],
        rejectionHistory: 'Configure ANTHROPIC_API_KEY for AI-powered rejection history analysis.',
        recommendations: ['Consult FSSAI and destination country regulatory authority for specific limits'],
      };
    }

    const response = await getAnthropicClient().messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze contamination risks for exporting the following product from India:

Product: ${product}
Destination Country: ${destinationCountry}

Based on historical rejection data (EU RASFF, FDA Import Alerts, UK FSA incidents, GCC rejections), identify the key contamination risks for this specific product-destination combination.

Provide a JSON response:
{
  "riskLevel": "low|medium|high|critical",
  "commonContaminants": [
    {
      "contaminant": "name of contaminant",
      "limit": "maximum residue limit or regulatory threshold in destination country",
      "testMethod": "recommended test method",
      "historicalIssues": "brief description of past incidents for Indian exports"
    }
  ],
  "testingRecommendations": ["specific testing recommendation 1", "specific testing recommendation 2"],
  "rejectionHistory": "summary of historical rejection patterns for this product from India to this destination",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}

Be specific about ${destinationCountry}'s limits and historical rejection data for Indian ${product} exports. Include EU RASFF data, FDA import alerts, or other relevant regulatory databases.`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No AI response');

    try {
      const parsed = extractJSON(textContent.text);
      if (parsed) return parsed;
    } catch (e) {
      console.warn('Could not parse contamination risks JSON:', (e as Error).message);
    }

    return {
      riskLevel: 'medium',
      commonContaminants: [],
      testingRecommendations: [],
      rejectionHistory: 'Unable to parse AI analysis',
      recommendations: [],
    };
  } catch (error) {
    console.error('Contamination risk check error:', error);
    return {
      riskLevel: 'unknown',
      commonContaminants: [],
      testingRecommendations: [
        'Test for pesticide residues per destination country MRL requirements',
        'Test for heavy metals (lead, cadmium, arsenic, mercury)',
        'Conduct microbiological testing (TPC, coliforms, E. coli, Salmonella, Listeria)',
        'Test for mycotoxins (aflatoxins) if applicable',
        'Verify ethylene oxide levels for spice products',
      ],
      rejectionHistory: 'AI analysis unavailable. Please consult regulatory databases manually.',
      recommendations: ['Consult FSSAI and destination country regulatory authority for specific limits'],
    };
  }
}

export async function chatWithQualityAgent(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: string
): Promise<string> {
  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\nCurrent context: ${context}`
    : SYSTEM_PROMPT;

  const stream = getAnthropicClient().messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: systemWithContext,
    messages,
  });

  const finalMessage = await stream.finalMessage();
  const textBlock = finalMessage.content.find((b) => b.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}
