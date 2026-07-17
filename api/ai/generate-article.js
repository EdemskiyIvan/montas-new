const MAX_TEXT_LENGTH = 4000;

function cleanText(value, max = MAX_TEXT_LENGTH) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function extractJson(content) {
  const source = String(content || '').trim().replace(/^```json\s*|\s*```$/g, '');
  return JSON.parse(source);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authorization = req.headers.authorization;
  const cmsApiOrigin = process.env.CMS_API_ORIGIN;
  if (!cmsApiOrigin) {
    return res.status(503).json({ error: 'CMS_API_ORIGIN не настроен.' });
  }
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const topic = cleanText(req.body?.topic, 300);
  const keyword = cleanText(req.body?.keyword, 160);
  const audience = cleanText(req.body?.audience, 300);
  const category = cleanText(req.body?.category, 80);
  const brief = cleanText(req.body?.brief);
  const targetWords = Number(req.body?.targetWords);
  if (!topic || !keyword) {
    return res.status(400).json({ error: 'Заполните тему и фокус-ключ.' });
  }

  const provider = (process.env.AI_PROVIDER || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'openai')).toLowerCase();
  const isDeepSeek = provider === 'deepseek';
  const apiKey = isDeepSeek
    ? process.env.DEEPSEEK_API_KEY
    : (process.env.OPENAI_API_KEY || process.env.CMS_AI_API_KEY);
  if (!apiKey) {
    return res.status(503).json({ error: isDeepSeek ? 'DEEPSEEK_API_KEY не настроен.' : 'OPENAI_API_KEY не настроен.' });
  }

  const model = process.env.AI_MODEL || (isDeepSeek ? 'deepseek-v4-flash' : 'gpt-5.6-luna');
  const endpoint = isDeepSeek
    ? 'https://api.deepseek.com/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const wordGoal = [900, 1400, 2000].includes(targetWords) ? targetWords : 1400;
  const instructions = `Ты — экспертный автор русскоязычного digital-агентства MONTAS. Подготовь полезный, точный и честный черновик SEO-статьи. Не выдумывай факты, исследования, кейсы, ссылки или цифры. Если для утверждения нужна проверка, сформулируй его осторожно и пометь в тексте [проверить факт].

Верни только валидный JSON без Markdown с полями:
title (40–70 символов), slug (латиница и дефисы), metaDescription (120–160 символов), category, tags (массив из 3–6 строк), contentHtml.
contentHtml должен содержать только p, h2, h3, ul, ol, li, strong, em, blockquote и a. Используй минимум 3 H2, короткие абзацы, хотя бы одну внутреннюю ссылку на относительный путь сайта MONTAS и одну внешнюю ссылку только если она действительно уместна. Используй ключ естественно: в первом абзаце, metaDescription и хотя бы одном H2; стремись к плотности 1–3%. Не используй H1 — заголовок статьи будет H1 на странице.`;
  const requestText = `Тема: ${topic}\nФокус-ключ: ${keyword}\nКатегория: ${category || 'Маркетинг'}\nАудитория: ${audience || 'не указана'}\nЦелевой объём: около ${wordGoal} слов\nДополнительный бриф: ${brief || 'нет'}`;

  try {
    const authCheck = await fetch(`${cmsApiOrigin.replace(/\/$/, '')}/api/posts/all`, { headers: { Authorization: authorization } });
    if (!authCheck.ok) return res.status(401).json({ error: 'Сессия истекла. Войдите в CMS снова.' });
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.55,
        max_tokens: wordGoal === 900 ? 2600 : wordGoal === 2000 ? 5600 : 4100,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: requestText },
        ],
      }),
    });
    const payload = await upstream.json();
    if (!upstream.ok) {
      console.error('AI provider error', upstream.status, payload?.error?.type || 'unknown');
      return res.status(502).json({ error: 'Провайдер AI не смог создать черновик. Повторите попытку.' });
    }
    const article = extractJson(payload?.choices?.[0]?.message?.content);
    if (!article?.title || !article?.contentHtml || !article?.metaDescription) {
      return res.status(502).json({ error: 'AI вернул неполный черновик. Повторите попытку.' });
    }
    return res.status(200).json({
      title: cleanText(article.title, 120),
      slug: cleanText(article.slug, 160),
      metaDescription: cleanText(article.metaDescription, 220),
      category: cleanText(article.category, 80) || category || 'Маркетинг',
      tags: Array.isArray(article.tags) ? article.tags.map(tag => cleanText(tag, 40)).filter(Boolean).slice(0, 6) : [],
      contentHtml: cleanText(article.contentHtml, 120000),
      keyword,
    });
  } catch (error) {
    console.error('AI article generation failed', error?.name || 'unknown');
    return res.status(502).json({ error: 'Не удалось обработать ответ AI. Повторите попытку.' });
  }
}
