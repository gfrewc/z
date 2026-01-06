import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

class AIService {
  constructor() {
    this.geminiClient = null;
    this.groqClient = null;
    this.hfClient = null;
    this.currentProvider = 'gemini';
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  initGemini(apiKey) {
    if (apiKey) {
      this.geminiClient = new GoogleGenerativeAI(apiKey);
    }
  }

  initGroq(apiKey) {
    if (apiKey) {
      this.groqClient = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    }
  }

  initHuggingFace(apiKey) {
    if (apiKey) {
      this.hfClient = new HfInference(apiKey);
    }
  }

  setProvider(provider) {
    this.currentProvider = provider;
  }

  async fetchGeminiModels(apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      const data = await response.json();
      if (data.models) {
        return data.models
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
      }
      return [];
    } catch (error) {
      console.error('Error fetching Gemini models:', error);
      return [];
    }
  }

  async fetchGroqModels(apiKey) {
    try {
      const client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      const models = await client.models.list();
      return models.data.map(m => m.id);
    } catch (error) {
      console.error('Error fetching Groq models:', error);
      return [];
    }
  }

  async rewriteNews(originalTitle, originalContent, model, onRotateKey, options = {}) {
    const { location = '', publishDate = '' } = options;
    
    const locationInfo = location ? `المكان/الدولة: ${location}` : '';
    const dateInfo = publishDate ? `التاريخ: ${publishDate}` : `التاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
    
    const prompt = `أنت كاتب أخبار محترف متخصص في كتابة الأخبار العاجلة والمثيرة. مهمتك إعادة صياغة الخبر التالي بأسلوب ناري وملتهب يجذب القراء.

═══════════════════════════════════════
📰 الخبر الأصلي:
═══════════════════════════════════════
العنوان: ${originalTitle}
${locationInfo}
${dateInfo}

المحتوى:
${originalContent}

═══════════════════════════════════════
✍️ المطلوب منك:
═══════════════════════════════════════

1️⃣ العنوان الجديد:
   - يجب أن يبدأ بـ "🔴 عاجل |" أو "⚡ خبر عاجل |"
   - اجعله مثيراً وجذاباً مع تهويل معقول ومقبول
   - أضف المكان/الدولة إن وجد
   - مثال: "🔴 عاجل | مصر: تطورات مفاجئة تهز الشارع..."

2️⃣ الوصف القصير:
   - سطرين فقط يلخصان الخبر بشكل مثير
   - يجذب القارئ لقراءة المزيد
   - استخدم كلمات قوية ومؤثرة

3️⃣ المحتوى المعاد صياغته:
   - ابدأ بذكر المكان والتاريخ: "${location || 'المصدر'} - ${dateInfo}"
   - أعد صياغة الخبر بأسلوب صحفي احترافي ومثير
   - حافظ على جميع الحقائق والمعلومات الأصلية
   - استخدم لغة قوية وجذابة
   - قسّم المحتوى لفقرات واضحة
   - أضف تفاصيل تشويقية مع الحفاظ على المصداقية

═══════════════════════════════════════
📝 التنسيق المطلوب (التزم به بدقة):
═══════════════════════════════════════
العنوان: [العنوان الجديد هنا]
الوصف: [الوصف القصير هنا]
المحتوى: [المحتوى المعاد صياغته هنا]`;

    try {
      let result;
      
      if (this.currentProvider === 'gemini' && this.geminiClient) {
        result = await this.generateWithGemini(prompt, model);
      } else if (this.currentProvider === 'groq' && this.groqClient) {
        result = await this.generateWithGroq(prompt, model);
      } else if (this.currentProvider === 'huggingface' && this.hfClient) {
        result = await this.generateWithHuggingFace(prompt, model);
      } else {
        throw new Error('لم يتم تكوين مزود الذكاء الاصطناعي');
      }

      this.retryCount = 0;
      return this.parseRewrittenNews(result, location, publishDate);
    } catch (error) {
      console.error('AI rewrite error:', error);
      
      // Try to rotate key on rate limit
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('limit') || error.message?.includes('rate')) {
        if (onRotateKey && this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`Rotating API key, attempt ${this.retryCount}/${this.maxRetries}`);
          onRotateKey();
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.rewriteNews(originalTitle, originalContent, model, onRotateKey, options);
        }
      }
      
      this.retryCount = 0;
      throw error;
    }
  }

  async generateWithGemini(prompt, model) {
    const genModel = this.geminiClient.getGenerativeModel({ 
      model: model || 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      }
    });
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async generateWithGroq(prompt, model) {
    const completion = await this.groqClient.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'أنت كاتب أخبار عربي محترف متخصص في الأخبار العاجلة. تكتب بأسلوب مثير وجذاب مع الحفاظ على المصداقية.' 
        },
        { role: 'user', content: prompt }
      ],
      model: model || 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 4096,
      top_p: 0.95
    });
    return completion.choices[0]?.message?.content || '';
  }

  async generateWithHuggingFace(prompt, model) {
    const response = await this.hfClient.textGeneration({
      model: model || 'meta-llama/Llama-3.2-3B-Instruct',
      inputs: prompt,
      parameters: {
        max_new_tokens: 4096,
        temperature: 0.8,
        top_p: 0.95,
        return_full_text: false
      }
    });
    return response.generated_text;
  }

  parseRewrittenNews(text, location = '', publishDate = '') {
    const lines = text.split('\n').filter(l => l.trim());
    let title = '';
    let description = '';
    let content = '';
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('العنوان:') || trimmedLine.startsWith('**العنوان:**')) {
        title = trimmedLine.replace(/\*?\*?العنوان:\*?\*?/g, '').trim();
        currentSection = 'title';
      } else if (trimmedLine.startsWith('الوصف:') || trimmedLine.startsWith('**الوصف:**')) {
        description = trimmedLine.replace(/\*?\*?الوصف:\*?\*?/g, '').trim();
        currentSection = 'description';
      } else if (trimmedLine.startsWith('المحتوى:') || trimmedLine.startsWith('**المحتوى:**')) {
        content = trimmedLine.replace(/\*?\*?المحتوى:\*?\*?/g, '').trim();
        currentSection = 'content';
      } else if (currentSection === 'content') {
        content += '\n' + trimmedLine;
      } else if (currentSection === 'description' && !trimmedLine.includes('المحتوى')) {
        description += ' ' + trimmedLine;
      } else if (currentSection === 'title' && !trimmedLine.includes('الوصف')) {
        title += ' ' + trimmedLine;
      }
    }

    // Clean up the parsed content
    title = title.replace(/\*\*/g, '').trim();
    description = description.replace(/\*\*/g, '').trim();
    content = content.replace(/\*\*/g, '').trim();

    // Ensure title starts with urgent marker
    if (title && !title.includes('عاجل') && !title.includes('🔴') && !title.includes('⚡')) {
      title = '🔴 عاجل | ' + title;
    }

    // Add location to title if available and not already present
    if (location && title && !title.includes(location)) {
      const parts = title.split('|');
      if (parts.length >= 2) {
        title = parts[0] + '| ' + location + ': ' + parts.slice(1).join('|').trim();
      }
    }

    // Format the date nicely
    const formattedDate = publishDate || new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      title: title || '🔴 عاجل | خبر هام',
      description: description || text.substring(0, 200),
      content: content || text,
      location,
      publishDate: formattedDate
    };
  }

  // Check if two news articles are similar
  async checkSimilarity(title1, content1, title2, content2, model) {
    const prompt = `قارن بين الخبرين التاليين وحدد إذا كانا يتحدثان عن نفس الموضوع:

الخبر الأول:
العنوان: ${title1}
المحتوى: ${content1.substring(0, 500)}

الخبر الثاني:
العنوان: ${title2}
المحتوى: ${content2.substring(0, 500)}

أجب بـ "نعم" إذا كانا نفس الخبر أو متشابهين جداً، أو "لا" إذا كانا مختلفين.
الإجابة:`;

    try {
      let result;
      
      if (this.currentProvider === 'gemini' && this.geminiClient) {
        result = await this.generateWithGemini(prompt, model);
      } else if (this.currentProvider === 'groq' && this.groqClient) {
        result = await this.generateWithGroq(prompt, model);
      } else {
        return false;
      }

      return result.toLowerCase().includes('نعم');
    } catch (error) {
      console.error('Similarity check error:', error);
      return false;
    }
  }

  async testConnection(provider, apiKey, model) {
    try {
      const testPrompt = 'قل "مرحبا" فقط';
      
      if (provider === 'gemini') {
        const client = new GoogleGenerativeAI(apiKey);
        const genModel = client.getGenerativeModel({ model: model || 'gemini-2.0-flash-exp' });
        await genModel.generateContent(testPrompt);
        return { success: true, message: 'تم الاتصال بنجاح' };
      } else if (provider === 'groq') {
        const client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
        await client.chat.completions.create({
          messages: [{ role: 'user', content: testPrompt }],
          model: model || 'llama-3.3-70b-versatile',
          max_tokens: 10
        });
        return { success: true, message: 'تم الاتصال بنجاح' };
      } else if (provider === 'huggingface') {
        const client = new HfInference(apiKey);
        await client.textGeneration({
          model: model || 'meta-llama/Llama-3.2-3B-Instruct',
          inputs: testPrompt,
          parameters: { max_new_tokens: 10 }
        });
        return { success: true, message: 'تم الاتصال بنجاح' };
      }
      
      return { success: false, message: 'مزود غير معروف' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export const aiService = new AIService();
export default aiService;
