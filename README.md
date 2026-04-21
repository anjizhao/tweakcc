# tweakcc

[![tweakcc on npm](https://img.shields.io/npm/v/tweakcc?color)](https://www.npmjs.com/package/tweakcc)

This is my personal fork of [tweakcc](https://github.com/Piebald-AI/tweakcc), a CLI tool that patches Claude Code's minified `cli.js` (or native binary) to apply customizations.

> For feature documentation (themes, thinking verbs, toolsets, input pattern highlighters, Opus Plan 1M, MCP startup optimization, table format, AGENTS.md support, etc.), the API reference, CLI subcommands (`unpack`, `repack`, `adhoc-patch`), and remote config usage, see the [upstream README](https://github.com/Piebald-AI/tweakcc#readme).

This README documents only the things I personally care about: how tweakcc works, how to configure it, how to build it, and how to recover when things break.

## Table of contents

- [How it works](#how-it-works)
- [`config.json` reference](#configjson-reference)
- [Configuration directory](#configuration-directory)
- [Building from source](#building-from-source)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [Related projects](#related-projects)
- [License](#license)

## How it works

tweakcc works by patching Claude Code's minified `cli.js` file, reading customizations from `~/.tweakcc/config.json`. For npm-based installations `cli.js` is modified directly, but for native installations it's extracted from the binary using [node-lief](https://github.com/Piebald-AI/node-lief), patched, and then the binary is repacked. When you update your Claude Code installation, your customizations will be overwritten, but they're remembered in your configuration file, so they can be reapplied by just running `npx tweakcc --apply`.

tweakcc is verified to work with Claude Code **2.1.62.** In newer or earlier versions various patches might not work. However, if we have the [system prompts for your version](https://github.com/Piebald-AI/tweakcc/tree/main/data/prompts) then system prompt patching is guaranteed to work with that version, even if it's significantly different from the verified CC version&mdash;the version number stated above is only relevant for the non-system-prompt patches.

You can also create custom patches using tweakcc without having to fork it or open a PR. `tweakcc adhoc-patch` supports using custom scripts that work with native and npm-based installs and that automatically detect your Claude Code installation. See the [upstream README](https://github.com/Piebald-AI/tweakcc#readme) for details.

## `config.json` reference

tweakcc reads `~/.tweakcc/config.json` on each run. The shape is defined by [`TweakccConfig`](src/types.ts) in `src/types.ts`; defaults come from [`DEFAULT_SETTINGS`](src/defaultSettings.ts) in `src/defaultSettings.ts`. Sections below cover every field.

### Top-level (`TweakccConfig`)

| Field | Type | Description |
| --- | --- | --- |
| `ccVersion` | `string` | Claude Code version tweakcc last saw. Used to decide when to re-fetch system prompts and when to warn about prompt conflicts. |
| `ccInstallationPath` | `string \| null` | Absolute path to the CC installation (`cli.js` for npm, the binary for native). Set on first detection; overridable via `TWEAKCC_CC_INSTALLATION_PATH`. |
| `ccInstallationDir` | `string \| null` | **Deprecated.** Only read for migrating old configs to `ccInstallationPath`. |
| `lastModified` | `string` (ISO) | Timestamp tweakcc stamps when it writes the config. |
| `changesApplied` | `boolean` | Whether the last `--apply` succeeded. Drives the "patches applied" indicator at startup. |
| `settings` | `Settings` | All user-facing customizations. See sections below. |
| `hidePiebaldAnnouncement` | `boolean?` | Hides the upstream Piebald promo block in the TUI. |
| `remoteConfig` | `RemoteConfig?` | Cached copy of the last `--config-url` fetch. Contains `sourceUrl`, `dateFetched`, and a `Partial<Settings>` under `settings` that's merged on top of your local settings when applying. |

### `settings.themes`

An array of [`Theme`](src/types.ts) objects. Each theme has `name`, `id`, and a flat `colors` object. Color values accept either `rgb(r,g,b)` strings or `ansi:<name>` (where `<name>` is any [chalk color](https://github.com/chalk/chalk#colors), e.g. `ansi:redBright`).

tweakcc ships 7 default themes in `DEFAULT_SETTINGS.themes`: `dark`, `light`, `light-ansi`, `dark-ansi`, `light-daltonized`, `dark-daltonized`, `monochrome`.

<details>
<summary>Full list of color keys (60 total)</summary>

General UI: `text`, `inverseText`, `inactive`, `subtle`, `suggestion`, `remember`, `background`, `success`, `error`, `warning`, `warningShimmer`.

Claude brand / spinner: `claude`, `claudeShimmer`, `claudeBlue_FOR_SYSTEM_SPINNER`, `claudeBlueShimmer_FOR_SYSTEM_SPINNER`.

Modes & borders: `autoAccept`, `planMode`, `ide`, `permission`, `permissionShimmer`, `bashBorder`, `promptBorder`, `promptBorderShimmer`.

Diff rendering: `diffAdded`, `diffRemoved`, `diffAddedDimmed`, `diffRemovedDimmed`, `diffAddedWord`, `diffRemovedWord`, `diffAddedWordDimmed`, `diffRemovedWordDimmed`.

Subagent accents (`_FOR_SUBAGENTS_ONLY` suffix): `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`. Plus `professionalBlue`.

Rainbow (highlighter accents): `rainbow_red`, `rainbow_orange`, `rainbow_yellow`, `rainbow_green`, `rainbow_blue`, `rainbow_indigo`, `rainbow_violet`, plus `_shimmer` variants of each.

Clawd ASCII art: `clawd_body`, `clawd_background`.

Message backgrounds: `userMessageBackground`, `bashMessageBackgroundColor`, `memoryBackgroundColor`.

Rate-limit bar: `rate_limit_fill`, `rate_limit_empty`.

</details>

### `settings.thinkingVerbs`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `format` | `string` | `"{}… "` | Format string; `{}` is replaced with a randomly selected verb. |
| `verbs` | `string[]` | 177 verbs | Pool of verbs. One is picked at random per response. |

### `settings.thinkingStyle`

Spinner animation next to the thinking verb.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `updateInterval` | `number` (ms) | `120` | Delay between frames. Lower = faster. |
| `phases` | `string[]` | `['·','✢','✳','✶','✻','✽']` (platform-dependent) | Characters to cycle through. |
| `reverseMirror` | `boolean` | `true` | If `true`, the animation plays forwards then backwards (so it ping-pongs). |

### `settings.userMessageDisplay`

Styling for user messages in the chat transcript.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `format` | `string` | `" > {} "` | Format string; `{}` is replaced with the message text. |
| `styling` | `string[]` | `[]` | Any of `'bold'`, `'italic'`, `'underline'`, `'strikethrough'`, `'inverse'`. |
| `foregroundColor` | `string \| 'default'` | `'default'` | `'default'` to leave uncolored, otherwise `rgb(r,g,b)` or `ansi:<name>`. |
| `backgroundColor` | `string \| 'default' \| null` | `null` | `null`/`'default'` for no background, otherwise a color. |
| `borderStyle` | `enum` | `'none'` | One of `'none'`, `'single'`, `'double'`, `'round'`, `'bold'`, `'singleDouble'`, `'doubleSingle'`, `'classic'`, `'topBottomSingle'`, `'topBottomDouble'`, `'topBottomBold'`. |
| `borderColor` | `string` | `'rgb(255,255,255)'` | Color for the border when `borderStyle` isn't `'none'`. |
| `paddingX` | `number` | `0` | Horizontal padding inside the box. |
| `paddingY` | `number` | `0` | Vertical padding inside the box. |
| `fitBoxToContent` | `boolean` | `false` | If `true`, the box shrinks to fit the message instead of filling width. |

### `settings.inputBox`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `removeBorder` | `boolean` | `false` | Removes the rounded border around the input box for a cleaner look. |

### `settings.misc`

All grab-bag toggles. Descriptions are lifted from the tweakcc Misc view ([`MiscView.tsx`](src/ui/components/MiscView.tsx)).

**Startup / UI**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `showTweakccVersion` | `boolean` | `true` | Shows the blue `+ tweakcc v<VERSION>` message at startup. |
| `showPatchesApplied` | `boolean` | `true` | Shows the green "tweakcc patches are applied" indicator at startup. |
| `hideStartupBanner` | `boolean` | `false` | Hides CC's startup banner shown before the first prompt. |
| `hideStartupClawd` | `boolean` | `false` | Hides the Clawd ASCII art at startup. |
| `hideCtrlGToEdit` | `boolean` | `false` | Hides the "ctrl-g to edit prompt" hint shown during streaming. |
| `expandThinkingBlocks` | `boolean` | `true` | Thinking blocks always expanded instead of collapsed. |
| `enableVerboseProperty` | `boolean` | `true` | Token counter shows detailed info like `(2s · ↓ 169 tokens · thinking)`. |
| `suppressNativeInstallerWarning` | `boolean` | `false` | Suppress the "use the native installer" warning at startup. |
| `filterScrollEscapeSequences` | `boolean` | `false` | Filters out terminal escape sequences that cause unwanted scrolling. |

**Model / agent**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enableModelCustomizations` | `boolean` | `true` | `/model` lists all Claude models instead of just the latest 3. |
| `enableOpusplan1m` | `boolean` | `true` | Adds the `opusplan[1m]` alias (Opus for planning, Sonnet 1M for building). |
| `enableContextLimitOverride` | `boolean` | `false` | Replaces default context limit with `CLAUDE_CODE_CONTEXT_LIMIT` env var (falls back to 200K). |
| `allowCustomAgentModels` | `boolean` | `false` | Allow arbitrary model names in custom-agent frontmatter (e.g. `gemini-2.5-flash`). |

**MCP**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `mcpConnectionNonBlocking` | `boolean` | `true` | Start CC immediately while MCPs connect in background. |
| `mcpServerBatchSize` | `number \| null` | `null` | Number of parallel MCP connections (1–20). `null` = CC default (3). |
| `enableChannelsMode` | `boolean` | `false` | Force-enable MCP channel notifications (bypasses `tengu_harbor` flag + allowlist). |

**Statusline**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `statuslineThrottleMs` | `number \| null` | `null` | Throttle statusline updates to this interval. `null` = CC default behavior. `0` = instant. |
| `statuslineUseFixedInterval` | `boolean` | `false` | If `true`, uses `setInterval` instead of throttle (fixed schedule, not on-demand). |

**Session memory**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enableSessionMemory` | `boolean` | `true` | Force-enable session memory (bypasses `tengu_session_memory` and `tengu_coral_fern` Statsig flags). |
| `enableRememberSkill` | `boolean` | `false` | Register a `remember` skill that reviews session memories into `CLAUDE.local.md`. |
| `enableConversationTitle` | `boolean` | `true` | Enables `/title` and `/rename` for manually naming conversations. |
| `enableTitleVisibilityToggle` | `boolean` | `false` | Adds `/session-title` to toggle session title visibility in the prompt bar. |

**File reads / output**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `increaseFileReadLimit` | `boolean` | `false` | Raises the Read file token limit from 25,000 to 1,000,000. |
| `suppressLineNumbers` | `boolean` | `false` | Removes `1→` line-number prefixes from Read output (saves tokens). |
| `suppressRateLimitOptions` | `boolean` | `false` | Prevents CC from auto-triggering `/rate-limit-options` on rate limits. |
| `tableFormat` | `'default' \| 'ascii' \| 'clean' \| 'clean-top-bottom'` | `'default'` | How Claude formats tables. See upstream README for examples. |
| `tokenCountRounding` | `number \| null` | `null` | Round displayed token counts to nearest multiple (any integer; UI cycles common values). `null` = no rounding. |

**Plan mode / permissions**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `autoAcceptPlanMode` | `boolean` | `false` | Auto-accept plans instead of showing the "Ready to code?" prompt. |
| `allowBypassPermissionsInSudo` | `boolean \| null` | `false` | ⚠️ Allows `--dangerously-skip-permissions` under `sudo`. Disables a security check. |

**Experimental / feature-flag toggles**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enableSwarmMode` | `boolean` | `true` | Force-enable swarm mode. |
| `enableWorktreeMode` | `boolean` | `true` | Force-enable the `EnterWorktree` tool (bypasses `tengu_worktree_mode` flag). |
| `enableVoiceMode` | `boolean` | `false` | Force-enable `/voice` (bypasses `tengu_amber_quartz` gate). |
| `enableVoiceConciseOutput` | `boolean` | `true` | Enable concise-output prompt for voice. Only applies when `enableVoiceMode` is on. |
| `enableFixLspSupport` | `boolean` | `true` | Removes unimplemented-field validation errors; adds `textDocument/didOpen` notifications. |
| `enableCustomSessionColors` | `boolean` | `false` | Accept hex/rgb values in `/color` and named colors from `customColorMap`. |
| `customColorMap` | `Record<string,string> \| null` | `null` | Map of custom named colors (e.g. `{ "mycolor": "rgb(1,2,3)" }`). Active when `enableCustomSessionColors` is on. |

### `settings.toolsets`, `defaultToolset`, `planModeToolset`

| Field | Type | Description |
| --- | --- | --- |
| `toolsets` | `Toolset[]` | Array of `{ name: string; allowedTools: string[] \| '*' }`. `'*'` means all tools. |
| `defaultToolset` | `string \| null` | Name of the toolset auto-selected on CC start. |
| `planModeToolset` | `string \| null` | Name of the toolset used when in plan mode. |

### `settings.subagentModels`

Per-subagent model overrides. Each accepts any model ID CC knows about, or `null` to use the default.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `plan` | `string \| null` | `null` | Model for the Plan subagent. |
| `explore` | `string \| null` | `null` | Model for the Explore subagent. |
| `generalPurpose` | `string \| null` | `null` | Model for the general-purpose subagent. |

### `settings.inputPatternHighlighters`

Array of highlighter objects. Each has:

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | User-friendly label shown in the TUI. |
| `regex` | `string` | Regex pattern (as a string, not a literal). |
| `regexFlags` | `string` | Flag chars from `g`, `i`, `m`, `s`, `u`, `y`. Must include `g`. |
| `format` | `string` | Render template; use `{MATCH}` as placeholder. Can add characters around the match. |
| `styling` | `string[]` | Any of `'bold'`, `'italic'`, `'underline'`, `'strikethrough'`, `'inverse'`. |
| `foregroundColor` | `string \| null` | `null` to leave uncolored, otherwise `rgb(r,g,b)` or `ansi:<name>`. |
| `backgroundColor` | `string \| null` | Same rules as `foregroundColor`. |
| `enabled` | `boolean` | Temporarily disable without deleting. |

### `settings.inputPatternHighlightersTestText`

`string`. Scratch text used in the highlighter editor for live preview. Not applied to CC. Default: `"Type test text here to see highlighting"`.

### `settings.claudeMdAltNames`

`string[] | null`. Fallback filenames CC checks when `CLAUDE.md` doesn't exist, in priority order. `CLAUDE.md` is always tried first regardless. Default:

```json
["AGENTS.md", "GEMINI.md", "CRUSH.md", "QWEN.md", "IFLOW.md", "WARP.md", "copilot-instructions.md"]
```

## Configuration directory

tweakcc stores its configuration files in one of the following locations, in order of priority:

1. **`TWEAKCC_CONFIG_DIR`** environment variable if set, or
2. **`~/.tweakcc/`** if it exists, or
3. **`~/.claude/tweakcc`** if it exists, or
4. **`$XDG_CONFIG_HOME/tweakcc`** if the `XDG_CONFIG_HOME` environment variable is set.

If none of the above exist, `~/.tweakcc` will be created and used. If you version control `~/.claude` for Claude Code configuration and want your tweakcc config and system prompts there too, then manually create the directory first, or move your existing `~/.tweakcc` directory there:

```bash
# For new users
mkdir -p ~/.claude/tweakcc

# For existing users
mv ~/.tweakcc ~/.claude/tweakcc
```

## Building from source

You can use tweakcc by running `npx tweakcc`, or `npm install -g tweakcc` and then `tweakcc`. Or build and run it locally:

```bash
git clone https://github.com/Piebald-AI/tweakcc.git
cd tweakcc
pnpm i
pnpm build
node dist/index.mjs
```

## Troubleshooting

tweakcc stores a backup of your Claude Code `cli.js`/binary for when you want to revert your customizations and for reapplying patches. Before it applies your customizations, it restores the original `cli.js`/binary so that it can start from a clean slate. Sometimes things can get confused and your `claude` can be corrupted.

In particular, you may run into a situation where you have a tweakcc-patched (or maybe a prettier-formatted) `claude` but no tweakcc backup. And then it makes a backup of that modified `claude`. If you then try to reinstall Claude Code and apply your customizations, tweakcc will restore its backup of the old _modified_ `claude`.

To break out of this loop you can install a different version of Claude Code, which will cause tweakcc to discard its existing backup and take a fresh backup of the new `claude` file. Or you can simply delete tweakcc's backup file (located at `~/.tweakcc/cli.backup.js` or `~/.tweakcc/native-binary.backup`). If you do delete `cli.backup.js` or `native-binary.backup`, make sure you reinstall Claude Code _before_ you run tweakcc again, because if your `claude` is still the modified version, it will get into the same loop again.

## FAQ

#### System prompts

<details>
<summary>How can I customize my Claude Code system prompts?</summary>

Run `npx tweakcc` first, and then navigate to the `system-prompts` directory in your config directory (see [Configuration directory](#configuration-directory)), which will have just been created, in your file browser. Each markdown file contains parts of prompts, such as the main system prompt, built-in tool descriptions, and various agent and utility prompts. Modify any of them, and then run `tweakcc --apply` or the tweakcc UI to apply your changes.

</details>

<details>
<summary>Does tweakcc generate the prompt markdown files from my Claude Code installation?</summary>

No, it fetches them fresh from the [data/prompts](https://github.com/Piebald-AI/tweakcc/tree/main/data/prompts) folder in the upstream tweakcc repo. There is one JSON file for each Claude Code version. When a new CC version is released, a prompts file for it is generated as soon as possible.

</details>

#### Themes

<details>
<summary>How can I customize my Claude Code theme?</summary>

Run `npx tweakcc`, go to `Themes`, and modify existing themes or create a new one. Then go back to the main menu and choose `Apply customizations`.

</details>

<details>
<summary>Why isn't all the text in Claude Code getting its color changed?</summary>

Some of the text Claude Code outputs has no coloring information at all, and unfortunately, that text is rendered using your terminal's default text foreground color and can't be customized.

</details>

<details>
<summary>Is there a way to disable colored output in Claude Code altogether?</summary>

Yes! You can use the [`FORCE_COLOR`](https://force-color.org/) environment variable, a convention which many CLI tools including Claude Code respect. Set it to `0` to disable colors entirely in Claude Code.

</details>

<details>
<summary>Why isn't my new theme being applied?</summary>

Could you have forgotten to actually set Claude Code's theme to your new theme? Run `claude` and then use `/theme` to switch to your new theme if so.

</details>

#### Nix / NixOS

<details>
<summary>Does tweakcc work with Claude Code installed via Nix?</summary>

**Yes.** tweakcc automatically detects and resolves Nix [`makeBinaryWrapper`](https://nixos.org/manual/nixpkgs/stable/#fun-makeBinaryWrapper) wrappers. When your `claude` binary is a Nix wrapper (a tiny compiled C shim that sets environment variables and calls `execv`), tweakcc sees through it to find the real Bun-compiled binary (typically named `.claude-unwrapped`) and operates on that instead.

However, because the Nix store (`/nix/store/...`) is read-only, writing the patched binary back requires `sudo`:

```bash
sudo npx tweakcc --apply
```

To undo your changes and restore the original binary:

```bash
sudo nix store repair /nix/store/<hash>-claude-code-<version>
```

> [!WARNING]
> **Modifying the Nix store directly is fragile.** Your changes will be lost if you run `nix-collect-garbage`, `nix store repair`, or rebuild the package (e.g., via `nixos-rebuild switch` or `home-manager switch`). After any of those operations, simply re-run `sudo npx tweakcc --apply` to re-patch. Your customizations are always preserved in `~/.tweakcc/config.json`.

</details>

#### Other

<details>
<summary>tweakcc vs. tweakcn...?</summary>

[tweakcn](https://github.com/jnsahaj/tweakcn), though similarly named, is unrelated to tweakcc or Claude Code. It's a tool for editing your [shadcn/ui](https://github.com/shadcn-ui/ui) themes. Check it out!

</details>

## Contributing

Contributions to upstream tweakcc are welcome. For detailed guidelines on development setup, code style, testing, and submitting pull requests, see the [CONTRIBUTING.md](https://github.com/Piebald-AI/tweakcc/blob/main/CONTRIBUTING.md) file in the upstream repo.

## Related projects

- [**cc-mirror**](https://github.com/numman-ali/cc-mirror) - Create multiple isolated Claude Code variants with custom providers (Z.ai, MiniMax, OpenRouter, LiteLLM). Uses tweakcc to customize system prompts, themes, thinking styles, and toolsets.

Other tools for customizing Claude Code or adding functionality to it:

- [**clotilde**](https://github.com/fgrehm/clotilde) - Wrapper for Claude Code that adds powerful manual session naming, resuming, forking, and incognito (ephemeral) session management to Claude Code.
- [**ccstatusline**](https://github.com/sirmalloc/ccstatusline) - Highly customizable status line formatter for Claude Code CLI that displays model info, git branch, token usage, and other metrics in your terminal.
- [**claude-powerline**](https://github.com/Owloops/claude-powerline) - Vim-style powerline statusline for Claude Code with real-time usage tracking, git integration, and custom themes.
- [**CCometixLine**](https://github.com/Haleclipse/CCometixLine) - A high-performance Claude Code statusline tool written in Rust with Git integration, usage tracking, interactive TUI configuration, and Claude Code enhancement utilities.

Forks:

- [**tweakgc-cli**](https://github.com/DanielNappa/tweakgc-cli) - CLI tool to extend the GitHub Copilot CLI to accept more selectable models.

## License

[MIT](https://github.com/Piebald-AI/tweakcc/blob/main/LICENSE)

Copyright © 2026 [Piebald LLC](https://piebald.ai).
