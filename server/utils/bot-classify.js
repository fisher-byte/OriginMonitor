// 爬虫识别规则，移植自 radarai.top 的 traffic_analytics.py
const BOT_SIGNATURES = [
  { bot_name: 'OAI-SearchBot', bot_family: 'openai', pattern: /\bOAI-SearchBot\b/i },
  { bot_name: 'GPTBot', bot_family: 'openai', pattern: /\bGPTBot\b/i },
  { bot_name: 'ChatGPT-User', bot_family: 'openai', pattern: /\bChatGPT-User\b/i },
  { bot_name: 'ClaudeBot', bot_family: 'anthropic', pattern: /\bClaudeBot\b/i },
  { bot_name: 'anthropic-ai', bot_family: 'anthropic', pattern: /\banthropic-ai\b/i },
  { bot_name: 'PerplexityBot', bot_family: 'perplexity', pattern: /\bPerplexityBot\b/i },
  { bot_name: 'Googlebot', bot_family: 'google', pattern: /\bGooglebot\b/i },
  { bot_name: 'Google-Extended', bot_family: 'google', pattern: /\bGoogle-Extended\b/i },
  { bot_name: 'GoogleOther', bot_family: 'google', pattern: /\bGoogleOther\b/i },
  { bot_name: 'Applebot', bot_family: 'apple', pattern: /\bApplebot(?:-Extended)?\b/i },
  { bot_name: 'Amazonbot', bot_family: 'amazon', pattern: /\bAmazonbot\b/i },
  { bot_name: 'FacebookBot', bot_family: 'meta', pattern: /\bFacebookBot\b/i },
  { bot_name: 'CCBot', bot_family: 'commoncrawl', pattern: /\bCCBot\b/i },
  { bot_name: 'Bytespider', bot_family: 'bytedance', pattern: /\bBytespider\b/i },
  { bot_name: 'Baiduspider', bot_family: 'baidu', pattern: /\bBaiduspider|Baidubot\b/i },
  { bot_name: 'YisouSpider', bot_family: 'tencent', pattern: /\bYisouSpider\b/i },
  { bot_name: 'SogouSpider', bot_family: 'sogou', pattern: /\bSogou(?:\s+web|\s+pic)?\s+spider\b/i },
  { bot_name: '360Spider', bot_family: '360', pattern: /\b360Spider\b/i },
  { bot_name: 'PetalBot', bot_family: 'huawei', pattern: /\bPetalBot\b/i },
  { bot_name: 'ChatGLM-Spider', bot_family: 'zhipu', pattern: /\bChatGLM-Spider\b/i },
  { bot_name: 'cohere-ai', bot_family: 'cohere', pattern: /\bcohere-ai\b/i },
  { bot_name: 'Bingbot', bot_family: 'microsoft', pattern: /\bBingbot\b/i },
];

const GENERIC_BOT_RE = /(bot|crawler|spider|slurp|fetcher|scanner|curl)/i;

function classifyUserAgent(ua) {
  if (!ua || typeof ua !== 'string') {
    return { is_bot: false, bot_name: '', bot_family: 'human' };
  }
  const trimmed = ua.trim();
  if (!trimmed) {
    return { is_bot: false, bot_name: '', bot_family: 'human' };
  }
  for (const sig of BOT_SIGNATURES) {
    if (sig.pattern.test(trimmed)) {
      return { is_bot: true, bot_name: sig.bot_name, bot_family: sig.bot_family };
    }
  }
  if (GENERIC_BOT_RE.test(trimmed)) {
    return { is_bot: true, bot_name: 'GenericBot', bot_family: 'generic' };
  }
  return { is_bot: false, bot_name: '', bot_family: 'human' };
}

module.exports = { classifyUserAgent, BOT_SIGNATURES };
