# 技術驗證報告（2026-11-12）

對象：上游 `cheat2001/angkorgit` v0.27.0（`7afb6b6`）。本機沒有 Rust 工具鏈，**沒有實際建置任何安裝檔**；以下「原始碼」指閱讀上游鎖定版本的原始碼，「執行」指實際跑過程式。

## 一、版本號 `<上游版本>+zh-TW.N`

| 項目 | 結果 | 依據 |
| :-- | :-- | :-- |
| semver 排序 | 通過 | 執行：Rust Playground 以 `semver` crate 實測 `0.27.0 < 0.27.0+zh-TW.1 < +zh-TW.2 < +zh-TW.9 < +zh-TW.10 < 0.27.1 < 0.28.0 < 0.28.0+zh-TW.1` 全為 true |
| 更新器比較 | 通過 | 原始碼：`tauri-plugin-updater` 2.10.1 `updater.rs:532` 為 `release.version > self.current_version`；`latest.json` 的版本會去掉開頭的 `v` 再解析 |
| NSIS | 可建置 | 原始碼：`tauri-bundler` 2.9.4（`@tauri-apps/cli` 2.11.4 所用）遇到非數字 build metadata 只警告，`VIProductVersion` 的 build 欄填 `0` |
| MSI | 建置失敗 | 原始碼：同版本直接 `bail!`「must be numeric-only … for msi target」。放棄 MSI 的決策成立；上游 `bundle.targets` 為 `all`，Windows 需明確指定只打 NSIS |
| deb | 版本字串原樣寫入 | 原始碼：`Version: 0.27.0+zh-TW.1`；dpkg 會把最後一個 `-` 之後視為 revision，格式合法 |
| macOS | 版本字串原樣寫入 plist | 原始碼：`CFBundleShortVersionString` 與 `CFBundleVersion` 皆用原字串；`CFBundleVersion` 可用 `bundle.macOS.bundleVersion` 覆寫成純數字 |
| **rpm** | **有風險，未驗證** | 原始碼：鎖定版本把版本字串原樣傳給 rpm 建構器，沒有轉換；RPM 的 Version 欄不允許 `-`，而 `zh-TW` 含 `-`。可能建置失敗或產出不合法套件 |
| GitHub tag 含 `+` | 通過 | 實例：`k3s-io/k3s` 的 tag `v1.37.2+k3s1`，下載網址編碼為 `%2B`；`tauri-action` 產生 `latest.json` 時對 tag 做 `encodeURIComponent` |
| 安裝檔檔名含 `+` | 未驗證 | `tauri-action` 不會替換 `+`；GitHub 上傳後是否改名，沒找到實例 |

**結論**：更新器與 Windows、macOS、deb 的路徑成立。rpm 與檔名含 `+` 兩項已在第四節的 CI 實際打包中確認可行。

## 二、AST 腳本覆蓋率

以 TypeScript compiler API 寫量測原型，掃描 `apps/desktop/src` 的 108 個檔案（不含測試）。只做分類與計數，**沒有實作改寫，也沒有驗證改寫後能否編譯與執行**。

規模：2,157 處、1,676 條不重複字串，分布在 81 個檔案。高於先前估計的 1,000–1,500 條。另有 `packages/core` 147 處、`packages/design-system` 7 處。

| 類別 | 處數 | 佔比 | 自動化程度 |
| :-- | --: | --: | :-- |
| 位置明確的純字串（JSX 文字、`title` 等屬性、JSX 表達式、物件的 `label` 等鍵、`toast.*` 等呼叫參數） | 1,326 | 61% | 固定規則即可包成 `t()` |
| 樣板字串（含 `${…}`） | 484 | 22% | 可機械轉成位置佔位符，如 `t('{{0}} files', {0: n})` |
| JSX 句子片段（一句話被行內元素或變數切開） | 210 | 10% | 可逐片段包，但中文語序會不自然；要翻得好需整句處理的規則 |
| 其他位置（陣列、回傳值、變數、未知鍵） | 137 | 6% | 需專案專屬規則或人工判斷，且混有誤判 |

其他發現：

- **誤判需排除**：示範用的程式碼片段、CSS class、字型名稱（`Inter`、`Monaco`）、鍵盤鍵名會被當成文案，保留英文清單會有相當份量。
- **模組層級常數 145 處**：在 import 時就求值，i18n 必須先於這些模組初始化，切換語言需重新載入視窗。
- **呼叫參數**：`toast.*` 佔 217 處，其餘是專案自有函式（`act`、`run`、`runPush`、`pickDirectory` 等），需列成設定。
- **測試**：e2e 只有一個檔案，內含約 1,253 行英文文字斷言，測試必須在英文語系下執行；因此「翻成中文後邏輯壞掉」的問題測試抓不到，只能靠 draft 階段實機檢查。
- **Rust 錯誤訊息**：抽樣到的 26 條中有 25 條帶動態參數，「前端對照翻譯」不能用整句比對，需要從 Rust 格式字串產生樣式比對表。

**結論**：約 83% 可由兩類固定規則處理，10% 可處理但品質有疑慮，6% 需要例外規則。方向可行，但 AST 腳本的工作量明顯高於「把字串包起來」；偵測本身靠啟發式，量測沒抓到的字串數量未知。

## 三、對既有決策的影響

- 首版審稿量約 1,800 條，不是 1,000–1,500 條。
- rpm 需在 CI 實測；若失敗，選項是不發 rpm，或版本號改用不含 `-` 的寫法。
- Rust 錯誤訊息的做法需要補設計，或延到第二階段。
- `packages/core` 的 147 處字串尚未決定如何處理。

## 四、CI 實際打包（同日補測）

在 fork `jjjj88521/angkorgit-zh-tw` 的 `spike/zh-tw-version` 分支新增 `.github/workflows/zh-tw-spike-version.yml`，以設定覆寫檔（`--config`）套用版本 `0.27.0+zh-TW.1`、productName `AngKorGit zh-TW`、identifier `dev.angkorgit.zhtw`，沒有修改任何上游檔案。Actions run 43171322941 三個平台全部成功。

| 項目 | 實測結果 |
| :-- | :-- |
| Windows NSIS | 建置成功；安裝檔的 ProductVersion、FileVersion 顯示 `0.27.0+zh-TW.1`；出現預期中的警告，`VIProductVersion` 的 build 欄為 `0` |
| macOS universal | 建置成功；`CFBundleShortVersionString` 與 `CFBundleVersion` 皆為 `0.27.0+zh-TW.1`，identifier 為 `dev.angkorgit.zhtw` |
| deb | 建置成功；`Version: 0.27.0+zh-TW.1`，套件名 `ang-kor-git-zh-tw` |
| rpm | 建置成功；`rpm -qp` 讀出 `version=0.27.0+zh-TW.1 release=1`。先前擔心的 `-` 沒有造成建置失敗 |
| AppImage | 建置成功 |
| 檔名含 `+` | GitHub 保留 `+`，只把空白換成 `.`，例如 `AngKorGit.zh-TW_0.27.0+zh-TW.1_x64-setup.exe` |
| `latest.json` | `version` 為 `0.27.0+zh-TW.1`；下載網址中 tag 與檔名的 `+` 都編碼為 `%2B` |
| 設定覆寫檔 | `tauri build --config` 與 `tauri-action` 都正確套用，「上游檔案零修改」對版本號、名稱、identifier、更新端點成立 |

仍未驗證：

- 實機安裝，以及 App 內從 `+zh-TW.1` 更新到 `+zh-TW.2` 的完整流程。這次每個平台各用一把臨時金鑰，無法拿來測更新。
- Release 正式公開後的下載網址（目前是 draft）。
- rpm 以 `dnf` 安裝與升級時，Version 含 `-` 是否有問題。

注意：測試用的更新器私鑰與密碼是 CI 內臨時產生的，已出現在公開的 Actions log 中。它只簽了這次的 draft Release，不可重用，draft 也不應公開。

## 五、下一步

- Rust 錯誤訊息與 `packages/core` 字串的設計已補，結論記在 ADR 0001 的 Consequences：後端訊息首版不翻；`packages/core` 納入同一套腳本，AI 提示詞保留英文，設定搜尋同時支援繁中與英文。
- 用正式金鑰（存成 repo secret）建立發版 workflow，並做一次實機安裝與 App 內更新測試。
