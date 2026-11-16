---
status: accepted
---

# 版本號採 `<上游版本>+zh-TW.N` 並放棄 MSI

簡中 fork 沿用上游的 `vX.Y.Z` 號段並自行遞增 patch，結果同名 tag 指向不同 commit、版號與上游分岔，使用者無法從版號看出對應哪個上游版本。我們決定用 semver build metadata 標示繁中版：`<上游版本>+zh-TW.N`，N 從 1 起算、同一上游版本每重發一次加 1、上游換版歸回 1；tag 與 App 內版本一致。Tauri 的 MSI 打包要求 build metadata 為純數字，因此 Windows 只發佈 NSIS 安裝檔，不發 MSI。

## Considered Options

- **tag 用 `+zh-TW.N`、App 內用 `+N`**：可保留 MSI，但 tag 與 App 內顯示的版本不一致。
- **沿用上游號段自行遞增 patch**：即簡中 fork 的做法，會與上游 tag 衝突。

## Consequences

已確認（詳見 `docs/verification-2026-11-12.md`）：

- 更新器以 `release.version > current_version` 比較，`semver` crate 實測 `0.27.0 < 0.27.0+zh-TW.1 < 0.27.0+zh-TW.2 < 0.28.0`。
- 鎖定版本的 NSIS 可建置，`VIProductVersion` 的 build 欄填 `0`；MSI 會直接建置失敗。
- GitHub tag 可含 `+`，下載網址編碼為 `%2B`。

- fork 的 CI 以 `0.27.0+zh-TW.1` 實際打包 macOS、Linux（deb、rpm、AppImage）、Windows（NSIS）全部成功；GitHub 保留檔名中的 `+`，`latest.json` 的網址編碼為 `%2B`。

尚未驗證，不影響本決策但發首版前要做：

- 實機安裝，以及 App 內從 `+zh-TW.N` 更新到 `+zh-TW.(N+1)`。
- rpm 的 Version 含 `-`，建置可過，但以 `dnf` 安裝與升級的行為未測。
