# 爬虫识别库

## 已支持的爬虫

### AI 爬虫（重点关注）

| 爬虫名称 | 家族 | 说明 |
|----------|------|------|
| GPTBot | openai | OpenAI 网页抓取 bot |
| ChatGPT-User | openai | ChatGPT 用户主动打开 URL |
| OAI-SearchBot | openai | OpenAI 搜索索引 bot |
| ClaudeBot | anthropic | Anthropic Claude 网页抓取 |
| anthropic-ai | anthropic | Anthropic AI 抓取 |
| PerplexityBot | perplexity | Perplexity 搜索抓取 |

### 搜索引擎

| 爬虫名称 | 家族 | 说明 |
|----------|------|------|
| Googlebot | google | Google 搜索抓取 |
| Google-Extended | google | Google AI 训练抓取 |
| GoogleOther | google | Google 非标准抓取 |
| Bingbot | microsoft | Bing 搜索抓取 |
| Baiduspider | baidu | 百度搜索抓取 |
| Applebot | apple | Apple 搜索抓取 |

### 国内爬虫

| 爬虫名称 | 家族 | 说明 |
|----------|------|------|
| Bytespider | bytedance | 字节跳动爬虫 |
| YisouSpider | tencent | 神马/夸克搜索 |
| SogouSpider | sogou | 搜狗搜索 |
| 360Spider | 360 | 360 搜索 |
| PetalBot | huawei | 华为搜索 |
| ChatGLM-Spider | zhipu | 智谱 AI |

### 其他

| 爬虫名称 | 家族 | 说明 |
|----------|------|------|
| CCBot | commoncrawl | Common Crawl |
| FacebookBot | meta | Facebook 分享预览 |
| Amazonbot | amazon | Amazon Alexa |
| cohere-ai | cohere | Cohere AI |
| GenericBot | generic | 未明确归类的 bot |

## 通用匹配规则

除已知爬虫外，UA 中包含以下关键词也会被识别为 GenericBot：
`bot`, `crawler`, `spider`, `slurp`, `fetcher`, `scanner`, `curl`

## 数据来源

爬虫识别规则移植自 [radarai.top](https://radarai.top) 的 `services/traffic_analytics.py`。
