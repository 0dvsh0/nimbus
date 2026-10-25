/**
 * Nimbus AI Engine
 * Handles Ollama local inference, OpenAI-compatible local APIs,
 * and high-fidelity instant offline heuristic completion.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NimbusEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const TONES = ['Warm', 'Witty', 'Brief', 'Professional', 'Counter'];

  const DEFAULT_SETTINGS = {
    provider: 'ollama', // 'ollama' | 'openai' | 'fallback'
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2:latest',
    customUrl: 'http://localhost:1234/v1',
    customModel: 'local-model',
    apiKey: '',
    tone: 'Warm',
    enabled: true,
    debounceMs: 250
  };

  /**
   * Check if local Ollama daemon is active and return model tags
   */
  async function checkOllamaStatus(url = 'http://localhost:11434') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    try {
      const res = await fetch(`${url}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map(m => m.name);
        return { online: true, models, url };
      }
    } catch (e) {
      // offline or unreachable
    }
    clearTimeout(timeout);
    return { online: false, models: [], url };
  }

  /**
   * Build targeted prompt for Ollama based on platform & tone
   */
  function buildPrompt({ platform, threadContext, userTyped, tone }) {
    let platformRules = '';
    if (platform === 'twitter') {
      platformRules = 'You are replying to a tweet on X / Twitter. Reply in 1 short punchy sentence under 25 words. No hashtags. No quotes around the response.';
    } else if (platform === 'linkedin') {
      platformRules = 'You are commenting on a LinkedIn post. Be constructive and insightful in 2 concise sentences. Keep it authentic and professional.';
    } else if (platform === 'gmail') {
      platformRules = 'You are drafting an email reply in Gmail. Be courteous, clear, and action-oriented in 2-3 sentences.';
    } else {
      platformRules = 'You are typing a reply. Keep it natural, direct, and concise.';
    }

    const toneDirectives = {
      Warm: 'Tone: Warm, empathetic, encouraging, and supportive.',
      Witty: 'Tone: Clever, playful, sharp, lighthearted with an indie-hacker spirit.',
      Brief: 'Tone: Extremely concise, direct, zero fluff, under 12 words.',
      Professional: 'Tone: Polished, respectful, executive, thoughtful.',
      Counter: 'Tone: Constructive devil\'s advocate, questioning assumptions politely.'
    };

    const toneGuide = toneDirectives[tone] || toneDirectives.Warm;

    const contextStr = threadContext ? `THREAD / POST CONTEXT:\n"""\n${threadContext}\n"""\n` : '';
    const typedStr = userTyped ? `WHAT USER ALREADY TYPED (continue this exact thought or build immediately upon it):\n"${userTyped}"` : `The user has not typed anything yet. Suggest the ideal full reply.`;

    return `System: You are Nimbus, an ethereal typing assistant.
${platformRules}
${toneGuide}
Important: Return ONLY the exact reply text to insert. Do NOT output greetings like "Here is your suggestion:" or explanations.

${contextStr}
${typedStr}
Suggestion:`;
  }

  /**
   * Local Smart Heuristic Fallback Engine
   * Generates instant, contextually aware ghost suggestions when Ollama is offline or warming up.
   */
  function generateFallbackReply({ platform, threadContext = '', userTyped = '', tone = 'Warm' }) {
    const rawContext = (threadContext || '').toLowerCase();
    const rawTyped = (userTyped || '').trim();
    const lowerTyped = rawTyped.toLowerCase();

    // Context analysis
    const isLaunch = /shipped|launch|indie|built|created|product|app|startup|release/.test(rawContext);
    const isQuestion = /\?|how|what|why|when|advice|thoughts/.test(rawContext);
    const isAchievement = /promoted|milestone|celebrat|years|hired|join|excited/.test(rawContext);
    const isEmail = platform === 'gmail' || /regards|meeting|attached|update|project/.test(rawContext);

    // If user already typed prefix, seamlessly complete it
    if (rawTyped.length > 0) {
      if (/^congrat/i.test(lowerTyped)) {
        if (tone === 'Warm') return " on this massive milestone! 14 months of persistence is the real victory 🚀";
        if (tone === 'Witty') return " on the launch! Hope your sleep schedule recovers in 2-3 business weeks ☕";
        if (tone === 'Brief') return " on the launch!";
        if (tone === 'Professional') return " on reaching this impressive milestone. Looking forward to seeing the adoption.";
        if (tone === 'Counter') return " on shipping, but how are you planning customer discovery post-launch?";
      }

      if (/^thanks|^thank you/i.test(lowerTyped)) {
        if (tone === 'Warm') return " for sharing this inspiring journey with us. Rooting for you!";
        if (tone === 'Witty') return " for the update — my weekend productivity just vanished looking at this!";
        if (tone === 'Brief') return " for the quick update.";
        if (tone === 'Professional') return " for the detailed briefing. I have reviewed the milestones and agree.";
        if (tone === 'Counter') return " for sharing; have we considered the alternate edge cases?";
      }

      if (/^love|^great|^awesome/i.test(lowerTyped)) {
        if (tone === 'Warm') return " the attention to craftsmanship here. Feels super clean!";
        if (tone === 'Witty') return " this! Take my money and let me know when the pro version lands.";
        if (tone === 'Brief') return " work here.";
        if (tone === 'Professional') return " execution. The strategic alignment here is evident.";
        if (tone === 'Counter') return " direction, though scaling this might introduce new bottlenecks.";
      }

      if (/^sounds|^looks/i.test(lowerTyped)) {
        if (tone === 'Warm') return " wonderful! Let's definitely sync on this next week.";
        if (tone === 'Witty') return " like pure wizardry. Count me in!";
        if (tone === 'Brief') return " great, let's proceed.";
        if (tone === 'Professional') return " like a solid roadmap. I will review the action items and follow up.";
        if (tone === 'Counter') return " viable, though what is the projected timeline for delivery?";
      }

      if (/^i agree|^agreed/i.test(lowerTyped)) {
        if (tone === 'Warm') return " 100%. Focusing on user feedback early makes all the difference.";
        if (tone === 'Witty') return " completely, couldn't have said it better before my second coffee.";
        if (tone === 'Brief') return " with this plan.";
        if (tone === 'Professional') return " with the proposed framework; it mitigates the key operational risks.";
        if (tone === 'Counter') return " in theory, but execution in production usually looks quite different.";
      }

      // Generic smart completion if user typed a few words
      const lastWord = rawTyped.split(/\s+/).pop();
      if (tone === 'Warm') return ` and I'm really looking forward to seeing how this evolves!`;
      if (tone === 'Witty') return ` — and honestly, that's the best plot twist of the week.`;
      if (tone === 'Brief') return ` and let's touch base soon.`;
      if (tone === 'Professional') return ` and we should align our deliverables accordingly.`;
      if (tone === 'Counter') return `, but let's test these assumptions with real user metrics first.`;
    }

    // Full suggestions when text box is empty
    if (platform === 'twitter') {
      if (isLaunch) {
        if (tone === 'Warm') return "14 months of quiet persistence — that's the real launch. Congrats Ava, downloading it now 🚀";
        if (tone === 'Witty') return "Terrified and thrilled is the official indie founder badge of honor. Huge congratulations!";
        if (tone === 'Brief') return "Huge milestone. Congrats on shipping!";
        if (tone === 'Professional') return "Tremendous dedication. The product Polish truly shines through.";
        if (tone === 'Counter') return "The build is done, now the real distribution challenge begins. Rooting for you!";
      }
      if (tone === 'Warm') return "Such an insightful take. Love how thoughtfully you framed this!";
      if (tone === 'Witty') return "Underrated tweet of the day. Pin this immediately!";
      if (tone === 'Brief') return "Spot on.";
      if (tone === 'Professional') return "Compelling insight. This aligns with broader market trends.";
      if (tone === 'Counter') return "Interesting angle, though what happens when you account for scale?";
    }

    if (platform === 'linkedin') {
      if (isAchievement || isLaunch) {
        if (tone === 'Warm') return "Incredible achievement! Your perseverance and dedication are a masterclass in modern product execution. Well deserved!";
        if (tone === 'Witty') return "14 months of coffee and code boiled down into a masterpiece. Well deserved celebration ahead!";
        if (tone === 'Brief') return "Inspiring execution. Congratulations on this major milestone!";
        if (tone === 'Professional') return "A testament to disciplined execution and long-term vision. Wishing you sustained growth and adoption on this launch.";
        if (tone === 'Counter') return "Impressive technical achievement. What distribution channels are you prioritizing for initial retention?";
      }
      if (tone === 'Warm') return "Thank you for sharing such a transparent perspective. This will help so many leaders navigating similar challenges.";
      if (tone === 'Witty') return "Proof that the best lessons in tech are always learned in the trenches. Great writeup!";
      if (tone === 'Brief') return "Exceptional writeup. Thank you for sharing.";
      if (tone === 'Professional') return "A very insightful reflection. Cultivating this kind of team resilience is critical for sustainable scaling.";
      if (tone === 'Counter') return "Thought-provoking points, though the operational trade-offs deserve equal scrutiny.";
    }

    if (platform === 'gmail') {
      if (tone === 'Warm') return "Thanks so much for the thoughtful update! Everything looks great on my end, and I'm excited for the next steps.";
      if (tone === 'Witty') return "Received loud and clear! Consider me on board — let's make it happen.";
      if (tone === 'Brief') return "Looks great. Approved to move forward.";
      if (tone === 'Professional') return "Thank you for the comprehensive update. I have reviewed the deliverables and approve proceeding with the outlined timeline.";
      if (tone === 'Counter') return "Thank you for the summary. Before we lock this in, could we clarify the contingencies for Q3 deliverables?";
    }

    // General fallback
    if (tone === 'Warm') return "Thanks for sharing this, really appreciate your perspective!";
    if (tone === 'Witty') return "You nailed it — couldn't agree more!";
    if (tone === 'Brief') return "Sounds good to me.";
    if (tone === 'Professional') return "Thank you for the overview. I look forward to our next sync.";
    return "Understood, let's review the details together.";
  }

  /**
   * Main completion method
   */
  async function generateSuggestion({
    platform = 'general',
    threadContext = '',
    userTyped = '',
    tone = 'Warm',
    settings = DEFAULT_SETTINGS
  }) {
    const startTime = Date.now();
    const config = Object.assign({}, DEFAULT_SETTINGS, settings);

    // Try Ollama first if configured and not explicitly set to fallback
    if (config.provider === 'ollama' || config.provider === 'auto') {
      try {
        const prompt = buildPrompt({ platform, threadContext, userTyped, tone });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${config.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.ollamaModel,
            prompt: prompt,
            stream: false,
            options: {
              temperature: 0.65,
              top_p: 0.9,
              stop: ['\n\n', 'User:', 'System:']
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          let raw = (data.response || '').trim();
          // strip any leading quotation marks
          raw = raw.replace(/^["']|["']$/g, '');
          if (raw.length > 0) {
            return {
              text: raw,
              providerUsed: `ollama (${config.ollamaModel})`,
              latencyMs: Date.now() - startTime
            };
          }
        }
      } catch (e) {
        // Fall back gracefully
      }
    }

    // Try OpenAI-compatible endpoint (LM Studio, vLLM, etc.)
    if (config.provider === 'openai') {
      try {
        const prompt = buildPrompt({ platform, threadContext, userTyped, tone });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(`${config.customUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
          },
          body: JSON.stringify({
            model: config.customModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 80
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content?.trim();
          if (raw) {
            return {
              text: raw.replace(/^["']|["']$/g, ''),
              providerUsed: `openai-local (${config.customModel})`,
              latencyMs: Date.now() - startTime
            };
          }
        }
      } catch (e) {
        // Fall back gracefully
      }
    }

    // Smart Local Heuristic Engine
    const fallbackText = generateFallbackReply({ platform, threadContext, userTyped, tone });
    return {
      text: fallbackText,
      providerUsed: 'local-heuristic',
      latencyMs: Date.now() - startTime
    };
  }

  return {
    TONES,
    DEFAULT_SETTINGS,
    checkOllamaStatus,
    generateSuggestion,
    generateFallbackReply,
    buildPrompt
  };
});
