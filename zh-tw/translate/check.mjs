const PLACEHOLDER = /\{\{\d+\}\}/g;

// Mainland Chinese wording that reads wrong in Taiwan. Warnings only: some of these are valid in other senses.
export const MAINLAND_TERMS = {
  文件: '檔案', 打開: '開啟', 雙擊: '按兩下', 單擊: '按一下', 點擊: '點選', 本地: '本機', 檢出: '簽出', 默認: '預設',
  設置: '設定', 信息: '資訊', 程序: '程式', 服務器: '伺服器', 網絡: '網路', 支持: '支援', 搜索: '搜尋', 用戶: '使用者',
  鼠標: '滑鼠', 菜單: '選單', 文本: '文字', 數據: '資料', 視頻: '影片', 屏幕: '螢幕', 窗口: '視窗', 鏈接: '連結',
  賬戶: '帳戶', 賬號: '帳號', 刷新: '重新整理', 粘貼: '貼上', 拷貝: '複製', 緩存: '快取', 字符: '字元', 字符串: '字串',
  變量: '變數', 函數: '函式', 運行: '執行', 加載: '載入', 卸載: '解除安裝', 激活: '啟用', 創建: '建立', 導入: '匯入',
  導出: '匯出', 質量: '品質', 硬件: '硬體', 軟件: '軟體', 調用: '呼叫', 配置: '組態',
};

// A placeholder glued to the end of a word is a suffix slot (the "s" in `commit{{1}}`), which Chinese drops.
// One- or two-letter prefixes such as the "v" in `v{{0}}` are not words, so those placeholders stay.
// `textSlot` marks keys whose glued placeholder is text, like the " in repo" of `Committed{{0}}`.
const isSuffixSlot = (source, index, textSlot) => !textSlot && /[A-Za-z]{3}$/.test(source.slice(0, index));

function requiredPlaceholders(source, textSlot) {
  return [...source.matchAll(PLACEHOLDER)].filter((m) => !isSuffixSlot(source, m.index, textSlot)).map((m) => m[0]);
}

export function suffixSlots(source, textSlot = false) {
  return [...source.matchAll(PLACEHOLDER)].filter((m) => isSuffixSlot(source, m.index, textSlot)).map((m) => m[0]);
}

export function placeholderProblem(source, target, textSlot = false) {
  const allowed = new Set(source.match(PLACEHOLDER) ?? []);
  const used = new Set(target.match(PLACEHOLDER) ?? []);
  const unknown = [...used].filter((p) => !allowed.has(p));
  if (unknown.length) return `uses ${unknown.join(', ')} which the source does not have`;
  const missing = requiredPlaceholders(source, textSlot).filter((p) => !used.has(p));
  if (missing.length) return `is missing ${[...new Set(missing)].join(', ')}`;
  const slots = suffixSlots(source, textSlot).filter((p) => used.has(p));
  if (slots.length) return `keeps the English plural slot ${slots.join(', ')}`;
  // A model that sees the JSX line may copy `{account.host}` into the text, where it would render literally.
  const braces = (text) => /[{}]/.test(text.replace(PLACEHOLDER, ''));
  if (braces(target) && !braces(source)) return 'contains braces that are not placeholders';
  const markup = (text) => /<\/?[A-Za-z][^>]*>/.test(text);
  if (markup(target) && !markup(source)) return 'contains markup copied from the code';
  return null;
}

export function mainlandWarnings(target) {
  return Object.keys(MAINLAND_TERMS).filter((term) => target.includes(term));
}

export const missingKeys = (locale) => Object.keys(locale).filter((key) => !locale[key]);

/**
 * Checks translated entries. `prefixConstraints` exist because upstream compares a label with
 * `label.startsWith('Pull')`: once both sides are translated the prefix has to survive.
 */
export function checkLocale(locale, { prefixConstraints = [], textSlots = [] } = {}) {
  const errors = [];
  const warnings = [];
  for (const [source, target] of Object.entries(locale)) {
    if (!target) continue;
    const problem = placeholderProblem(source, target, textSlots.includes(source));
    if (problem) errors.push(`${JSON.stringify(source)}: translation ${problem}`);
    const terms = mainlandWarnings(target);
    if (terms.length) warnings.push(`${JSON.stringify(source)}: ${terms.map((t) => `${t} → ${MAINLAND_TERMS[t]}`).join(', ')}`);
  }
  for (const { prefix, except } of prefixConstraints) {
    const translatedPrefix = locale[prefix];
    if (!translatedPrefix) continue;
    const applies = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\(|$)`);
    const skip = except ? new RegExp(except) : null;
    for (const [source, target] of Object.entries(locale)) {
      if (!target || source === prefix || !applies.test(source) || skip?.test(source)) continue;
      if (!target.startsWith(translatedPrefix)) {
        errors.push(`${JSON.stringify(source)}: translation must start with ${JSON.stringify(translatedPrefix)} (the translation of ${JSON.stringify(prefix)})`);
      }
    }
  }
  return { errors, warnings, missing: missingKeys(locale) };
}
