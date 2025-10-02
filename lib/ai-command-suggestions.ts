// lib/ai-command-suggestions.ts

export interface CommandSuggestion {
  command: string
  description: string
  category: string
  risk_level: "low" | "medium" | "high"
  prerequisites?: string[]
  expected_output?: string
}

export interface CommandExplanation {
  command: string
  explanation: string
  purpose: string
  risks: string[]
  alternatives: string[]
  best_practices: string[]
}

export interface AISuggestionsRequest {
  current_methodology: {
    name: string
    description?: string
    steps: Array<{
      type: "command" | "manual"
      content: string
      completed: boolean
    }>
  }
  project_target: string
  completed_steps: string[]
  custom_prompt?: string
  use_online?: boolean
  provider?: "gemini" | "gpt"
}

export async function getCommandSuggestions(
  request: AISuggestionsRequest
): Promise<CommandSuggestion[]> {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/ai-command-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI suggestion failed: ${response.status}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('AI command suggestion failed:', error);
    return getFallbackSuggestions(request);
  }
}

export async function explainCommand(
  command: string,
  context: {
    target: string
    methodology: string
    use_online?: boolean
    provider?: "gemini" | "gpt"
  }
): Promise<CommandExplanation> {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/ai-explain-command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command,
        context,
        use_online: context.use_online ?? true,
        provider: context.provider ?? 'gemini'
      }),
    });

    if (!response.ok) {
      throw new Error(`Command explanation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI command explanation failed:', error);
    return getFallbackExplanation(command, context);
  }
}

// Fallback functions
function getFallbackSuggestions(request: AISuggestionsRequest): CommandSuggestion[] {
  const { project_target, current_methodology } = request;
  
  return [
    {
      command: `nmap -sV -sC -O ${project_target}`,
      description: "Comprehensive network scan with version detection and script scanning",
      category: "Network Reconnaissance",
      risk_level: "low",
      prerequisites: ["Network access to target"],
      expected_output: "Open ports, service versions, OS detection"
    },
    {
      command: `gobuster dir -u https://${project_target} -w /usr/share/wordlists/dirb/common.txt`,
      description: "Directory and file brute force scanning",
      category: "Web Application Testing",
      risk_level: "medium",
      prerequisites: ["Web server accessible"],
      expected_output: "Discovered directories and files"
    }
  ];
}

function getFallbackExplanation(command: string, context: any): CommandExplanation {
  return {
    command,
    explanation: `This command appears to be a security testing command targeting ${context.target}.`,
    purpose: "Security assessment and penetration testing",
    risks: ["May trigger security monitoring", "Could impact target system"],
    alternatives: ["Consider using less intrusive options first"],
    best_practices: ["Test in controlled environment", "Obtain proper authorization"]
  };
}