# yet-another-metronome

一个 Web 节拍器。

文案使用 i18next 和 react-i18next 管理，目前仅启用简体中文（`zh-CN`）。所有界面文案、无障碍标签、提示和页面/PWA 元数据集中在 `src/locales/zh-CN.json`。

组件通过 `useTranslation()` 的 `t()` 读取文案，动态内容使用 `{{变量名}}` 插值。初始化和翻译键类型检查位于 `src/i18n.ts`；HTML 和 PWA 元数据在 Vite 构建时读取同一份中文资源。修改文案后可运行 `npm run build` 和 `npm test` 验证。
