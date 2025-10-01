// lib/ai-analysis.ts
const apiBase = "http://127.0.0.1:5000";

export async function generateAIAnalysis(request: {
  commands: any[];
  evidence: any[];
  projects: any[];
  methodologies: any[];
  customPrompt?: string;
}) {
  try {
    const response = await fetch(`${apiBase}/api/ai-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('AI Analysis failed:', error);
    throw error;
  }
}