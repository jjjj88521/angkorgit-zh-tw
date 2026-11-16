# 翻譯模型對照（2026-11-13）

同樣 40 條，語系檔排序的前 40 條。〔〕內為自動檢查標記：中＝中國用語、簡＝簡體字、術＝未套用術語表、您、半形標點。標記只是啟發式，最終以人工判斷為準。

| 指標 | Google | DeepSeek | MiMo | Haiku |
| :-- | :-- | :-- | :-- | :-- |
| 未翻譯 | 0 | 0 | 0 | 0 |
| 含中國用語 | 9 | 0 | 0 | 0 |
| 含簡體字 | 0 | 0 | 0 | 0 |
| 用「您」 | 3 | 0 | 0 | 0 |
| 中文間半形標點 | 0 | 0 | 0 | 0 |
| 術語未套用 / 適用 | 1 / 34 | 1 / 34 | 1 / 34 | 1 / 34 |

| # | 英文原文 | Google | DeepSeek | MiMo | Haiku |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | " ({{0}} commit{{1}})" |  （ {{0}}提交{{1}} ） |  （{{0}} 個提交） |  （{{0}} 個提交） |  （{{0}} 個提交） |
| 2 | " Commits stay in the repository." |  提交會保留在版本庫中。 |  提交會保留在版本庫中。 |  提交會保留在版本庫中。 |  提交會保留在版本庫中。 |
| 3 | " The branch {{0}} and its commits stay in the repository." |  分支{{0}}及其提交保留在版本庫中。 |  分支 {{0}} 及其提交會保留在版本庫中。 |  分支 {{0}} 及其提交會保留在版本庫中。 |  分支 {{0}} 及其提交會保留在版本庫中。 |
| 4 | " {{0}} commit{{1}} only on the local branch will be lost." |  {{0}}提交{{1}}僅在本地分支上會遺失。  〔中:本地〕 |  僅存在於本機分支的 {{0}} 個提交將會遺失。 |  只存在於本機分支的 {{0}} 個提交將會遺失。 |  {{0}} 個僅存在於本機分支上的提交將會遺失。 |
| 5 | " {{0}} file{{1}}" |  {{0}}檔{{1}} |  {{0}} 個檔案 |  {{0}} 個檔案 |  {{0}} 個檔案 |
| 6 | " · also akg" |  · 也 akg |  · 也可使用 akg |  · 同時有 akg |  · 也可用 akg |
| 7 | " · committed by {{0}}" |  · 由{{0}}提交 |  · 由 {{0}} 提交 |  · 由 {{0}} 提交 |  · 由 {{0}} 提交 |
| 8 | " · worktree" |  ·工作區 |  · 工作區 |  · 工作區 |  · 工作區 |
| 9 | " · {{0}} already in recents" |  · {{0}}已出現在最近更新中 |  · {{0}} 個已在最近使用中 |  · {{0}} 個已在最近清單中 |  · {{0}} 個已在最近清單中 |
| 10 | " · {{0}} cancelled" |  · {{0}}已取消 |  · {{0}} 個已取消 |  · {{0}} 個已取消 |  · {{0}} 已取消 |
| 11 | " · {{0}} partial" |  · {{0}}部分 |  · {{0}} 個部分完成 |  · {{0}} 個部分完成 |  · {{0}} 部分完成 |
| 12 | "\"{{0}}\" is a submodule — open it as its own repository to discard the changes inside it." | " {{0}} " 是一個子模組— 將其作為單獨的版本庫打開，以捨棄其中的變更。  〔中:打開〕 | 「{{0}}」是子模組——請將它作為獨立版本庫開啟，才能捨棄其中的變更。 | 「{{0}}」是子模組 — 請以獨立版本庫開啟，才能捨棄其中的變更。 | 「{{0}}」是子模組，請將它當作獨立版本庫開啟，以捨棄其中的變更。 |
| 13 | "#{{0}} {{1}} — {{2}} wants to merge {{3}} into {{4}}. Double-click to check out, right-click for actions." | # {{0}} {{1}} — {{2}}想要將{{3}}合併到{{4}} 。雙擊以查看，右鍵單擊以執行操作。  〔中:雙擊/單擊〕 | #{{0}} {{1}}——{{2}} 想要將 {{3}} 合併到 {{4}}。按兩下以簽出，按右鍵以執行操作。 | #{{0}} {{1}} — {{2}} 想要將 {{3}} 合併到 {{4}}。按兩下可簽出，按右鍵可執行操作。 | #{{0}} {{1}} — {{2}} 想將 {{3}} 合併到 {{4}}。按兩下以簽出，按右鍵可執行動作。 |
| 14 | "'s commits on top of" | 在…之上提交 | 的提交，疊加到 | 的提交重放到 | 的提交重新套用到 |
| 15 | "(no lines — deletes this section)" | （無橫線－刪除此部分） | （沒有行——刪除此區段） | （沒有行 — 會刪除此區段） | （沒有任何行，將刪除此區段） |
| 16 | "(no message)" | （無訊息） | （沒有訊息） | （無訊息） | （無訊息） |
| 17 | "(not installed)" | （未安裝） | （未安裝） | （未安裝） | （未安裝） |
| 18 | "(section deleted)" | （部分內容已刪除） | （區段已刪除） | （區段已刪除） | （區段已刪除） |
| 19 | ", like git cherry-pick -x. Useful when backporting between shared branches." | 類似於 git 揀選 -x。在共用分支之間進行向後移植時非常有用。 | ，例如 git cherry-pick -x。在共用分支之間進行回移植時很有用。  〔術:cherry-pick〕 | ，類似 git cherry-pick -x。在共用分支之間移植時很有用。  〔術:cherry-pick〕 | ，如同 git cherry-pick -x。在共用分支之間回溯移植時很有用。  〔術:cherry-pick〕 |
| 20 | ", will conflict" | 將會衝突 | ，將會發生衝突 | ，將會衝突 | ，將產生衝突 |
| 21 | ", your edits are in the way" | 你的修改妨礙了 | ，你的編輯會造成阻礙 | ，你的變更會造成阻礙 | ，你的編輯內容會造成妨礙 |
| 22 | ". Git will not overwrite your edits, so the pull would stop before it starts. Stash them, pull, then apply the stash to get them back." | Git 不會覆蓋你的修改，所以拉取會在開始前停止。貯存，再拉取，最後套用貯存來恢復修改。 | 。Git 不會覆寫你的編輯，因此拉取會在開始前停止。請先貯存它們，再拉取，然後套用貯存將它們取回。 | 。Git 不會覆寫你的變更，所以拉取會在開始前就停止。先將它們貯存、拉取，再套用貯存即可找回。 | 。Git 不會覆寫你的編輯內容，因此拉取會在開始前就停止。請先貯存這些變更，再拉取，然後套用貯存內容以取回。 |
| 23 | ". The pull still works: it stops with them marked, and you resolve them in the conflict editor." | 拉取操作仍然有效：它會在標記這些衝突項目後停止，然後您可以在衝突編輯器中解決它們。  〔您〕 | 。拉取仍可進行：它會停下並標記它們，你再於衝突編輯器中解決。 | 。拉取仍會正常運作：它會標記這些檔案後停止，你在衝突編輯器中解決即可。 | 。拉取仍能進行：它會停在這些衝突處並加以標記，你再於衝突編輯器中解決。 |
| 24 | ". You resolve them in the conflict editor and continue the rebase." | 您可以在衝突編輯器中解決這些衝突，然後繼續重定基底。  〔您〕 | 。你在衝突編輯器中解決它們，然後繼續重定基底。 | 。你在衝突編輯器中解決它們，然後繼續重定基底。 | 。你在衝突編輯器中解決後，繼續重定基底。 |
| 25 | "/path/to/new-folder" | /path/to/新資料夾 | /path/to/new-folder | /path/to/new-folder | /path/to/new-folder |
| 26 | "1 file" | 1 個文件  〔中:文件〕 | 1 個檔案 | 1 個檔案 | 1 個檔案 |
| 27 | "A file you edited also changed" | 您編輯的文件也發生了更改  〔中:文件，您〕 | 你編輯過的檔案也變更了 | 你編輯過的一個檔案也有變更 | 你編輯過的一個檔案也已有變更 |
| 28 | "A group with this name already exists" | 已存在同名組織  〔中:組織〕 | 此名稱的群組已存在 | 已存在同名的群組 | 已有此名稱的群組 |
| 29 | "A hook stopped the" | 一個掛鉤擋住了 | 掛鉤中止了 | 掛鉤中止了這次 | 掛鉤中止了 |
| 30 | "A hook stopped the operation." | 一個掛鉤阻止了手術。  〔中:手術〕 | 掛鉤中止了操作。 | 掛鉤中止了這次操作。 | 掛鉤中止了此操作。 |
| 31 | "A key combination that switches to a repository from anywhere in the app, opening it if it is not already open. Right-click a tab or a recent repository and choose Keyboard shortcut… to add one." | 一個快捷鍵組合，可從應用程式中的任何位置切換到版本庫，如果儲存庫尚未打開，則會將其打開。右鍵點選標籤頁或最近使用的版本庫，然後選擇「鍵盤快速鍵…」即可新增快捷鍵組合。  〔中:打開〕 | 可從應用程式任一處切換至某個版本庫的按鍵組合；若尚未開啟該版本庫，也會一併開啟。在分頁或最近使用的版本庫上按右鍵，然後選擇「鍵盤快速鍵…」來新增。 | 一組可從應用程式任何地方切換到某個版本庫的按鍵組合，若尚未開啟會自動開啟。按右鍵點選分頁或最近的版本庫，然後選擇「鍵盤快速鍵…」即可新增。 | 應用程式中的任何位置都可以按下此按鍵組合，切換到指定的版本庫；若尚未開啟，會自動開啟。在分頁或最近使用的版本庫上按右鍵，選擇「鍵盤快速鍵…」即可新增。 |
| 32 | "A letter, digit or F key together with {{0}}." | 字母、數字或 F 鍵加上{{0}} 。 | 字母、數字或 F 鍵，搭配 {{0}}。 | 字母、數字或 F 鍵，加上 {{0}}。 | 字母、數字或 F 鍵，需與 {{0}} 合用。 |
| 33 | "A second folder for this repository with its own checked-out branch. Work on two things at once without stashing, and keep every commit in the same history." | 此版本庫的第二個資料夾，帶有其自己的檢出分支。可以同時處理兩項任務而無需暫存，並將所有提交保留在相同的歷史記錄中。  〔中:檢出，術:stash〕 | 此版本庫的第二個資料夾，具有自己簽出的分支。無須貯存即可同時處理兩件事，並讓每個提交都保留在同一段歷史中。 | 此版本庫的第二個資料夾，擁有各自簽出的分支。可同時進行兩件事而不必貯存，所有提交都在同一份歷史中。 | 此版本庫的第二個資料夾，擁有自己已簽出的分支。可同時處理兩件事，無需貯存，且所有提交都保留在同一歷史紀錄中。 |
| 34 | "AI Assistant" | 人工智慧助手 | AI 助理 | AI 助理 | AI 助理 |
| 35 | "AI actions" | 人工智慧行動 | AI 操作 | AI 操作 | AI 動作 |
| 36 | "AI explanation" | 人工智慧解釋 | AI 說明 | AI 說明 | AI 說明 |
| 37 | "AI request failed: {{0}}" | AI 請求失敗： {{0}} | AI 請求失敗：{{0}} | AI 要求失敗：{{0}} | AI 請求失敗：{{0}} |
| 38 | "AI review" | 人工智慧評論 | AI 審查 | AI 審查 | AI 審查 |
| 39 | "AI review conventions" | 人工智慧評審慣例 | AI 審查慣例 | AI 審查慣例 | AI 審查規範 |
| 40 | "API key" | API金鑰 | API 金鑰 | API 金鑰 | API 金鑰 |
