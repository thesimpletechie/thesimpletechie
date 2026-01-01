const GROQ_API_KEY = "your API";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GeneratedFile {
    name: string;
    content: string;
}

const cleanCode = (code: any) => {
    if (typeof code !== 'string') return String(code || '');
    // Strip markdown code blocks if they exist
    return code.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '$1').trim();
};

export const generateCode = async (prompt: string, language: string, settings?: {
    includeComments: boolean;
    addErrorHandling: boolean;
    productionReady: boolean;
}): Promise<GeneratedFile[]> => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are an expert ${language} developer. Generate clean, efficient code based on the user's request. 
                        You MUST generate multiple files and use deep nested folder structures if necessary (e.g., 'src/components/ui/Button.tsx', 'lib/utils/api.ts').
                        ${settings?.includeComments ? 'Include helpful comments explaining the logic.' : 'Do not include any comments.'}
                        ${settings?.addErrorHandling ? 'Add robust error handling and edge case checks.' : 'Keep the code simple without extra error handling.'}
                        ${settings?.productionReady ? 'Ensure the code is production-ready, following best practices, naming conventions, and modularity.' : 'Provide a quick working prototype.'}
                        
                        CRITICAL: Return the output as a valid JSON array of objects. Each object must have "name" (the FULL path including directories) and "content" (the code string) keys.
                        Return ONLY the raw JSON array, no markdown code blocks or explanations.`,
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
                max_tokens: 4096,
                response_format: { type: "json_object" }, // Groq supports json_object
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "[]";

        try {
            const parsed = JSON.parse(cleanCode(content));
            const files = Array.isArray(parsed) ? parsed : (parsed.files && Array.isArray(parsed.files)) ? parsed.files : parsed.name && parsed.content ? [parsed] : null;

            if (files) return files;
            return [{ name: `index.${language}`, content: cleanCode(content) }];
        } catch (e) {
            return [{ name: `index.${language}`, content: cleanCode(content) }];
        }
    } catch (error) {
        console.error("Error generating code:", error);
        throw error;
    }
};

export const analyzeCode = async (code: string) => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are an expert debugger. Analyze the provided code for bugs, performance issues, and best practices. 
                        Return the response as a JSON object with this structure:
                        {
                          "issues": [
                            {
                              "line": number,
                              "message": "string",
                              "severity": "error" | "warning",
                              "fix": "string describing the fix"
                            }
                          ],
                          "fixedCode": "the complete fixed code"
                        }
                        
                        CRITICAL: The "fixedCode" must be a full, valid, and PRETTY-PRINTED version of the original code with all fixes applied. 
                        Use proper indentation (2 spaces) and newline characters (\\n) so it is easy to read.
                        Return ONLY the raw JSON object, no markdown code blocks or additional text.`,
                    },
                    {
                        role: "user",
                        content: code,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(cleanCode(content));

        if (parsed && typeof parsed === 'object' && parsed.fixedCode) {
            parsed.fixedCode = cleanCode(parsed.fixedCode);
        }

        return parsed || {};
    } catch (error) {
        console.error("Error analyzing code:", error);
        throw error;
    }
};

export const generateProjectReport = async (projectSummary: string) => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are a Principal Software Architect. Your task is to analyze the provided project file summaries and generate a single, comprehensive Technical Project Report in Markdown format.
            
            The report MUST include:
            1. # Project Overview: A high-level description of the project's purpose.
            2. ## Architecture & Tech Stack: Analysis of the project structure and technologies used.
            3. ## Core Modules & Components: Breakdown of the main functional areas.
            4. ## File-by-File Summary: A concise table or list summarizing the purpose of EACH file.
            5. ## Usage & Integration: How the parts work together.
            
            Use professional technical language and clear formatting.
            Return ONLY the markdown content, no additional text or code blocks wrapping the response.`,
                    },
                    {
                        role: "user",
                        content: `Generate a unified project report for the following files and their contents:\n\n${projectSummary}`,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.2,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return cleanCode(data.choices[0]?.message?.content || "");
    } catch (error) {
        console.error("Error generating project report:", error);
        throw error;
    }
};

export const analyzeTeamActivity = async (activities: string[]) => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are a Team Operations Specialist. Analyze the provided team activity logs and provide a concise, professional summary (Pulse Report).
            
            The summary should be formatted in Markdown and include:
            1. **Overall Momentum**: A one-sentence summary of the current pace.
            2. **Key Accomplishments**: 2-3 bullet points of what's been achieved.
            3. **Potential Choke Points**: Any risks or areas that need attention based on the activity.
            
            Keep the tone encouraging and professional. Return ONLY the markdown content.`,
                    },
                    {
                        role: "user",
                        content: `Summarize the following team activities:\n\n${activities.join('\n')}`,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return cleanCode(data.choices[0]?.message?.content || "");
    } catch (error) {
        console.error("Error analyzing team activity:", error);
        throw error;
    }
};

export const generateDocs = async (fileName: string, content: string) => {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are a technical writer. Generate comprehensive documentation in Markdown format for the provided file content. 
            Include a title, overview, section for components/hooks/functions, and usage examples.
            Return ONLY the markdown, no explanation or markdown code blocks wrapping the entire response.`,
                    },
                    {
                        role: "user",
                        content: `File Name: ${fileName}\n\nContent:\n${content}`,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Error generating documentation:", error);
        throw error;
    }
};
