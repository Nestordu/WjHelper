import React, { useMemo, useState } from 'react';
import codesJson from '../data/codes.json';
import {
  Award,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Info,
  Shield,
} from 'lucide-react';

interface CodeEntry {
  code: string;
  reward?: string;
  level_requirement: number;
  level_note?: string;
  start_time: string;
  end_time: string;
  valid_until_display?: string;
  other_requirements?: string;
  announcement_title?: string;
  topic_id?: string;
  source: string;
  date_added?: string;
}

interface CodesFile {
  meta?: {
    last_scrape_at?: string;
    source?: string;
    feed_url?: string;
  };
  codes: CodeEntry[];
}

function normalizePayload(raw: unknown): { codes: CodeEntry[]; meta: CodesFile['meta'] } {
  if (Array.isArray(raw)) {
    return { codes: raw as CodeEntry[], meta: undefined };
  }
  const obj = raw as CodesFile;
  return { codes: obj.codes ?? [], meta: obj.meta };
}

/** 固定雪花参数，避免每次渲染随机导致闪烁 */
const SNOW_PRESETS = Array.from({ length: 48 }, (_, i) => ({
  left: `${((i * 47) % 100) + (i % 3) * 0.7}%`,
  delay: `${(i % 12) * 0.35}s`,
  duration: `${6 + (i % 9)}s`,
  size: `${1 + (i % 4)}px`,
}));

const Home: React.FC = () => {
  const { codes: initialCodes, meta } = useMemo(() => normalizePayload(codesJson as unknown), []);
  const [codes] = useState<CodeEntry[]>(initialCodes);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleCodeExpansion = (code: string) => {
    setExpandedCode((prev) => (prev === code ? null : code));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isCodeExpired = (endTime: string) => {
    if (!endTime) return false;
    const end = new Date(endTime);
    if (Number.isNaN(end.getTime())) return false;
    return end.getTime() < Date.now();
  };

  const lastScrapeLabel = meta?.last_scrape_at
    ? formatDate(meta.last_scrape_at)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-sky-950 text-slate-100">
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          {SNOW_PRESETS.map((s, i) => (
            <span
              key={i}
              className="wj-snowflake"
              style={{
                left: s.left,
                width: s.size,
                height: s.size,
                animationDelay: s.delay,
                animationDuration: s.duration,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <p className="mb-2 text-sm tracking-[0.2em] text-sky-200/80">Whiteout Survival · 国服</p>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow md:text-5xl">无尽冬日</h1>
          <p className="mt-3 text-lg text-sky-100/90">兑换码速查</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
            数据来自 TapTap
            <a
              className="mx-1 text-sky-300 underline decoration-sky-500/50 underline-offset-2 hover:text-white"
              href="https://www.taptap.cn/app/521534/topic?type=official"
              target="_blank"
              rel="noreferrer"
            >
              官方公告
            </a>
            ，GitHub Actions 每日同步。多数礼包有截止时间与熔炉等级等要求，请以公告正文为准。
          </p>
          <a
            href="#codes"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-900/40 transition hover:bg-sky-400"
          >
            查看兑换码
          </a>
          <div className="mt-10 flex justify-center text-white/70 animate-bounce">
            <ChevronDown size={28} aria-hidden />
          </div>
        </div>
      </header>

      <main id="codes" className="mx-auto max-w-3xl scroll-mt-6 px-4 py-14">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-semibold text-white">近期礼包码</h2>
          {lastScrapeLabel && (
            <p className="text-xs text-slate-400">数据抓取：{lastScrapeLabel}</p>
          )}
        </div>

        {codes.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
            暂无兑换码数据。若已配置 GitHub Actions，请等待首次抓取完成。
          </div>
        ) : (
          <ul className="space-y-4">
            {codes.map((item, index) => {
              const expired = isCodeExpired(item.end_time);
              return (
                <li
                  key={`${item.topic_id ?? 'x'}-${item.code}-${index}`}
                  className={`rounded-xl border border-white/10 bg-slate-900/60 shadow-lg backdrop-blur-sm transition hover:border-sky-500/30 ${expired ? 'opacity-60' : ''}`}
                >
                  <div className="flex w-full items-center gap-4 p-4 md:p-5">
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
                      onClick={() => toggleCodeExpansion(item.code)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCodeExpansion(item.code);
                        }
                      }}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-600/90">
                        <Award size={22} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-lg font-semibold tracking-wide text-white">{item.code}</span>
                          {expired && (
                            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">已过期</span>
                          )}
                        </div>
                        {item.announcement_title && (
                          <p className="mt-1 truncate text-sm text-slate-400">{item.announcement_title}</p>
                        )}
                        {item.reward ? (
                          <p className="mt-0.5 text-sm text-sky-200/90">{item.reward}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-sky-500 p-2.5 text-slate-950 hover:bg-sky-400"
                        onClick={() => copyToClipboard(item.code)}
                        title="复制"
                      >
                        {copiedCode === item.code ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                      <button
                        type="button"
                        className="p-1 text-slate-300 hover:text-white"
                        onClick={() => toggleCodeExpansion(item.code)}
                        aria-expanded={expandedCode === item.code}
                        aria-label={expandedCode === item.code ? '收起详情' : '展开详情'}
                      >
                        {expandedCode === item.code ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                      </button>
                    </div>
                  </div>

                  {expandedCode === item.code && (
                    <div className="border-t border-white/10 px-4 pb-5 pt-4 md:px-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex gap-3">
                          <Calendar className="mt-0.5 shrink-0 text-sky-400" size={18} />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">有效期</p>
                            <p className="mt-1 text-sm text-slate-200">
                              {item.valid_until_display
                                ? item.valid_until_display
                                : item.end_time
                                  ? formatDate(item.end_time)
                                  : '请见官方公告'}
                            </p>
                            {!item.end_time && (
                              <p className="mt-1 text-xs text-slate-500">未解析到明确截止时间时，以游戏内提示为准。</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Shield className="mt-0.5 shrink-0 text-sky-400" size={18} />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">兑换要求</p>
                            <p className="mt-1 text-sm text-slate-200">
                              {item.level_requirement > 0
                                ? `大熔炉 / 等级相关：≥ ${item.level_requirement} 级（解析自公告）`
                                : '未标注具体等级'}
                            </p>
                            {item.level_note ? (
                              <p className="mt-1 text-xs text-slate-400">{item.level_note}</p>
                            ) : null}
                            {item.other_requirements && item.other_requirements !== '无' ? (
                              <p className="mt-1 text-xs text-slate-400">{item.other_requirements}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <Info className="mt-0.5 shrink-0 text-sky-400" size={18} />
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-slate-500">来源</p>
                          <a
                            href={item.source}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-sm text-sky-300 hover:text-white"
                          >
                            {item.source}
                            <ExternalLink size={14} className="shrink-0" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <section className="border-t border-white/10 bg-slate-950/80 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold text-white">兑换方法</h2>
          <p className="mt-2 text-sm text-slate-400">与常见攻略一致：从个人入口进入设置，再打开兑换码。</p>
          <ol className="mt-8 space-y-5 text-slate-200">
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-slate-950">
                1
              </span>
              <div>
                <h3 className="font-medium text-white">打开游戏首页</h3>
                <p className="mt-1 text-sm text-slate-400">点击左上方的个人头像。</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-slate-950">
                2
              </span>
              <div>
                <h3 className="font-medium text-white">进入设置</h3>
                <p className="mt-1 text-sm text-slate-400">在界面右下方找到设置按钮并点击。</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-slate-950">
                3
              </span>
              <div>
                <h3 className="font-medium text-white">输入兑换码</h3>
                <p className="mt-1 text-sm text-slate-400">
                  在设置中找到「兑换码」，粘贴或输入后确认。注意区分大小写，并在有效期内使用；部分礼包对熔炉等级等有要求。
                </p>
              </div>
            </li>
          </ol>
          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            说明参考：
            <a
              className="text-sky-400 hover:underline"
              href="https://m.ali213.net/news/gl2405/1404825.html"
              target="_blank"
              rel="noreferrer"
            >
              游侠手游 · 无尽冬日兑换码与使用方法
            </a>
          </p>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-slate-900/40 p-6 text-sm leading-relaxed text-slate-400">
          <h2 className="text-lg font-semibold text-slate-200">关于本站</h2>
          <p className="mt-3">
            本站仅整理 TapTap《无尽冬日》官方论坛公告中出现的礼包码与公开条件，方便检索与复制；与游戏开发商无隶属关系。
          </p>
          {meta?.feed_url && (
            <p className="mt-2">
              抓取范围：
              <a className="text-sky-400 hover:underline" href={meta.feed_url} target="_blank" rel="noreferrer">
                官方公告列表
              </a>
            </p>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} 无尽冬日兑换码速查 · 仅供玩家参考
      </footer>
    </div>
  );
};

export default Home;
