# AngKorGit 繁中版

將上游 Git 用戶端 AngKorGit 翻譯為繁體中文（zh-TW）並獨立發佈的 fork，以及支撐它的翻譯與發版流程。

## Language

### 來源

**上游（Upstream）**:
原始專案 `cheat2001/angkorgit`，繁中版所有程式碼與英文文案的唯一來源。
_Avoid_: 原版、官方版

**上游版本（Upstream Release）**:
上游以 `vX.Y.Z` tag 正式發佈的一個版本，是唯一會啟動翻譯流程的事件。
_Avoid_: 新版本、上游更新、上游 commit

**略過的上游版本（Skipped Upstream Release）**:
在其翻譯 PR 合併前就被更新的上游版本取代、因而沒有對應繁中版的上游版本。

### 產出

**繁中版（zh-TW Edition）**:
本 fork 公開發佈的 AngKorGit，預設顯示繁體中文並可切回英文，擁有獨立的應用程式識別，可與上游的 App 並存安裝。
_Avoid_: 翻譯版本、漢化版、中文版

**繁中版本號（zh-TW Version）**:
繁中版的版本識別，格式為 `<上游版本>+zh-TW.N`，表明它對應哪一個上游版本；N 從 1 起算，同一上游版本每重新發佈一次繁中版就加 1，上游換版時歸回 1。
_Avoid_: fork 版號、自行遞增 patch

### 文案

**語系檔（Locale File）**:
繁中文案的唯一存放處，每條英文原文對應一條繁中文案；翻譯 PR 的審稿對象就是它的差異。
_Avoid_: 字典、翻譯檔

**原文變更（Source Change）**:
上游修改了既有字串的英文原文；變更後的字串視為新字串，舊文案失效並需重新文案確認。

**術語表（Termbase）**:
Git 領域用語的英文對繁中固定譯名清單，以 Git 官方 zh_TW 翻譯為基準；機器翻譯與審稿人都必須遵循。
_Avoid_: 字典、glossary

**翻譯初稿（Draft Translation）**:
機器翻譯依術語表產生、尚未經文案確認的繁中文案。
_Avoid_: 機翻結果、AI 翻譯

**漏譯（Untranslated String）**:
使用者看得到、沒有繁中文案、不在保留英文清單內、也不是後端訊息的英文字串；存在漏譯時不得發版。

**保留英文清單（Keep-English List）**:
刻意不翻譯的字串清單，例如品牌名、主題名、字型名，以及送給 AI 模型的提示詞。
_Avoid_: 白名單、allowlist

**後端訊息（Backend Message）**:
由 Rust 端或 libgit2 產生、原樣顯示給使用者的文字，包含錯誤與操作結果；目前維持英文，不算漏譯。
_Avoid_: Rust 錯誤、系統訊息

**AI 提示詞（AI Prompt）**:
App 送給 AI 模型的指示文字，不是介面文案，一律保留英文以維持與上游相同的 AI 行為。

### 流程

**翻譯 PR（Translation PR）**:
針對最新上游版本自動產生、等待審稿的繁中文案變更；任何時刻最多只有一個處於開啟狀態。
_Avoid_: 同步 PR、更新 PR

**文案確認（Copy Approval）**:
審稿人檢視並合併翻譯 PR 的行為，代表該批繁中文案可以發佈。
_Avoid_: 校稿、review

**審稿人（Reviewer）**:
唯一有權做文案確認的人，即本 fork 的維護者。
