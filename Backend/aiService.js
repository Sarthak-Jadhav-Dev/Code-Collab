const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class AIService {
  constructor() {
    const provider = process.env.AI_PROVIDER || 'openai';

    if (provider === 'gemini') {
      // Initialize Google Gemini AI
      this.genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: process.env.AI_MODEL || 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
        }
      });
      this.provider = 'gemini';
    } else {
      // Initialize OpenAI (fallback) only when needed
      this.provider = 'openai';
    }
  }

  // Lazy initialization of OpenAI client
  initializeOpenAI() {
    if (this.provider === 'openai' && !this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
      });
      this.modelName = process.env.AI_MODEL || 'gpt-4o-mini';
      this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 2000;
      this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
    }
  }

  async askAI(roomId, prompt, context = {}, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    try {
      const systemPrompt = this.buildSystemPrompt(context);

      if (this.provider === 'gemini') {
        const fullPrompt = systemPrompt + '\n\nUser: ' + prompt;
        const result = await this.model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return { message: text, success: true };
      } else {
        // Initialize OpenAI only when needed
        this.initializeOpenAI();
        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: false
        });

        return { message: response.choices[0].message.content, success: true };
      }
    } catch (error) {
      console.error('AI Service Error:', error);

      // Handle rate limiting errors with retry logic
      if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
        if (retryCount < maxRetries) {
          console.log(`Rate limit hit, retrying in ${retryDelay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1))); // Exponential backoff
          return this.askAI(roomId, prompt, context, retryCount + 1);
        } else {
          return {
            message: 'AI service is temporarily busy. Please wait a moment and try again.',
            success: false
          };
        }
      }

      // Handle timeout errors with retry logic
      if (error.message && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
        if (retryCount < maxRetries) {
          console.log(`Timeout error, retrying in ${retryDelay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1))); // Exponential backoff
          return this.askAI(roomId, prompt, context, retryCount + 1);
        } else {
          return {
            message: 'AI service timed out. Please try again.',
            success: false
          };
        }
      }

      // Handle API key errors
      if (error.message && (error.message.includes('API key') || error.message.includes('authentication'))) {
        console.error('AI Service API Key Error:', error);
        return {
          message: 'AI service configuration error. Please check API key settings.',
          success: false
        };
      }

      // Handle content filtering errors
      if (error.message && error.message.includes('content filter')) {
        console.error('AI Service Content Filter Error:', error);
        return {
          message: 'Your request was flagged by content filters. Please rephrase your question.',
          success: false
        };
      }

      return {
        message: 'Sorry, I encountered an error: ' + error.message,
        success: false
      };
    }
  }

  buildSystemPrompt(context) {
    const files = context.files || [];
    const language = context.language || 'javascript';
    const recentChat = context.recentChat || [];

    let prompt = 'You are "AI Assistant", a professional coding assistant integrated into a collaborative coding environment. You excel at:\n\n';
    prompt += '🎯 **CORE CAPABILITIES:**\n';
    prompt += '1. **Code Analysis & Debugging**: Identify bugs, logic errors, and performance issues with precision\n';
    prompt += '2. **Code Generation**: Write clean, efficient, well-documented code following best practices\n';
    prompt += '3. **Code Review**: Provide constructive feedback on code quality, security, and maintainability\n';
    prompt += '4. **Problem Solving**: Break down complex programming challenges into manageable steps\n';
    prompt += '5. **Learning Support**: Explain concepts clearly with examples and analogies\n';
    prompt += '6. **Architecture Guidance**: Suggest optimal project structure and design patterns\n\n';

    prompt += '📋 **CURRENT CONTEXT:**\n';
    prompt += '- Programming Language: **' + language + '**\n';
    prompt += '- Active File: **' + (files.find(f => f.name === context.activeFile)?.name || 'Unknown') + '**\n\n';

    if (files.length > 0) {
      prompt += '📂 **FILE CONTENTS:**\n\n';
      files.forEach(file => {
        if (file.content) {
          prompt += `File: ${file.name}\n`;
          prompt += '```' + language + '\n';
          prompt += file.content + '\n';
          prompt += '```\n\n';
        }
      });
    }

    prompt += '✨ **RESPONSE GUIDELINES:**\n';
    prompt += '- Be precise and accurate in all technical advice\n';
    prompt += '- Provide working, tested code solutions\n';
    prompt += '- Include clear explanations for your recommendations\n';
    prompt += '- Use appropriate emojis for better readability\n';
    prompt += '- Format code blocks properly with language tags\n';
    prompt += '- Highlight important points with **bold** text\n';
    prompt += '- Structure responses with # Headers, ## Subheaders, and ### Subsubheaders\n';
    prompt += '- Use bullet points and numbered lists for better organization\n';
    prompt += '- Be encouraging and supportive while maintaining technical excellence\n';
    prompt += '- Focus on the specific question asked rather than providing generic responses\n';
    prompt += '- Avoid repetitive phrases and redundant information\n\n';

    prompt += '💡 **INTERACTION STYLE:**\n';
    prompt += '- Act as a knowledgeable teammate, not just a tool\n';
    prompt += '- Ask clarifying questions when requirements are unclear\n';
    prompt += '- Suggest improvements proactively when you notice issues\n';
    prompt += '- Provide context and reasoning for your suggestions\n';
    prompt += '- Keep responses well-structured with clear headings\n';
    prompt += '- Use lists and formatting to improve readability\n';
    prompt += '- Keep responses concise but comprehensive\n';
    prompt += '- Avoid repeating the same information multiple times\n';
    prompt += '- Provide specific, actionable advice based on the code context\n\n';

    prompt += '🚫 **AVOID:**\n';
    prompt += '- Generic responses that don\'t address the specific question\n';
    prompt += '- Repetitive phrases or redundant information\n';
    prompt += '- Overly long responses that lose focus\n';
    prompt += '- Technical jargon without explanations\n\n';

    if (recentChat.length > 0) {
      prompt += '📝 **RECENT CONVERSATION:**\n';
      prompt += recentChat.slice(-3).map(msg => msg.user + ': ' + msg.msg).join('\n');
      prompt += '\n\n';
    }

    prompt += 'Remember: Always provide specific, focused responses that directly address the user\'s question with clear examples when relevant.';

    return prompt;
  }

  async generateCodeSuggestion(prompt, language, context) {
    try {
      const systemPrompt = 'You are an expert ' + language + ' developer. Generate code based on the user\'s request. Return only the code with brief comments explaining key parts. Make sure the code is production-ready and follows ' + language + ' best practices.';

      if (this.provider === 'gemini') {
        const fullPrompt = systemPrompt + '\n\nUser: ' + prompt;
        const result = await this.model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return { code: text, success: true };
      } else {
        // Initialize OpenAI only when needed
        this.initializeOpenAI();
        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: this.maxTokens,
          temperature: 0.3
        });

        return { code: response.choices[0].message.content, success: true };
      }
    } catch (error) {
      return { code: 'Error generating code: ' + error.message, success: false };
    }
  }

  async explainCode(code, language) {
    try {
      const systemPrompt = 'You are a programming tutor. Explain the given ' + language + ' code in a clear, beginner-friendly way. Break down complex parts and explain the logic step by step.';
      const userPrompt = 'Please explain this ' + language + ' code:\n\n' + code;

      if (this.provider === 'gemini') {
        const fullPrompt = systemPrompt + '\n\n' + userPrompt;
        const result = await this.model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return { explanation: text, success: true };
      } else {
        // Initialize OpenAI only when needed
        this.initializeOpenAI();
        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: this.maxTokens,
          temperature: 0.5
        });

        return { explanation: response.choices[0].message.content, success: true };
      }
    } catch (error) {
      return { explanation: 'Error explaining code: ' + error.message, success: false };
    }
  }

  async suggestImprovements(code, language) {
    try {
      const systemPrompt = 'You are a senior ' + language + ' developer doing a code review. Analyze the code and suggest specific improvements for: 1. Performance optimization 2. Code readability and maintainability 3. Security considerations 4. Best practices. Be specific and provide actionable suggestions.';
      const userPrompt = 'Please review this ' + language + ' code and suggest improvements:\n\n' + code;

      if (this.provider === 'gemini') {
        const fullPrompt = systemPrompt + '\n\n' + userPrompt;
        const result = await this.model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return { suggestions: text, success: true };
      } else {
        // Initialize OpenAI only when needed
        this.initializeOpenAI();
        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: this.maxTokens,
          temperature: 0.4
        });

        return { suggestions: response.choices[0].message.content, success: true };
      }
    } catch (error) {
      return { suggestions: 'Error analyzing code: ' + error.message, success: false };
    }
  }
}

module.exports = AIService;