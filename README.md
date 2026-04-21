# tweakcc

[![tweakcc on npm](https://img.shields.io/npm/v/tweakcc?color)](https://www.npmjs.com/package/tweakcc)

This is my personal fork of [tweakcc](https://github.com/Piebald-AI/tweakcc), a CLI tool that patches Claude Code's minified `cli.js` (or native binary) to apply customizations.

> For feature documentation (themes, thinking verbs, toolsets, input pattern highlighters, Opus Plan 1M, MCP startup optimization, table format, AGENTS.md support, etc.), the API reference, CLI subcommands (`unpack`, `repack`, `adhoc-patch`), and remote config usage, see the [upstream README](https://github.com/Piebald-AI/tweakcc#readme).

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

tweakcc reads `~/.tweakcc/config.json` on each run. The shape is defined by [`TweakccConfig`](src/types.ts) in `src/types.ts`; defaults come from [`DEFAULT_SETTINGS`](src/defaultSettings.ts) in `src/defaultSettings.ts`.

Below is an annotated example with every field set to its default. The real file is plain JSON — strip the `//` comments before saving.

```jsonc
{
  "ccVersion": "2.1.62",                              // Claude Code version tweakcc last saw. Drives prompt re-fetching and conflict warnings.

  // Absolute path to the CC installation (cli.js for npm installs, binary for native).
  // Set on first detection. Overridable via TWEAKCC_CC_INSTALLATION_PATH env var.
  "ccInstallationPath": "/home/user/.local/bin/claude",

  "ccInstallationDir": null,                          // Deprecated: only read to migrate old configs into ccInstallationPath.
  "lastModified": "2026-04-21T00:00:00.000Z",         // ISO timestamp tweakcc stamps when it writes the config.
  "changesApplied": true,                             // Whether the last --apply succeeded. Drives the "patches applied" startup indicator.
  "hidePiebaldAnnouncement": false,                   // (Optional) Hides the upstream Piebald promo block in the TUI.

  // (Optional) Cached copy of the last --config-url fetch. Its `settings` is a
  // Partial<Settings> merged on top of local settings when applying.
  "remoteConfig": {
    "sourceUrl": "https://gist.example/config.json",
    "dateFetched": "2026-04-21T00:00:00.000Z",
    "settings": { /* partial Settings object */ }
  },

  "settings": {
    // ======
    // themes — array of themes. Ships 7 defaults: dark, light, light-ansi, dark-ansi,
    // light-daltonized, dark-daltonized, monochrome. Color values accept "rgb(r,g,b)"
    // or "ansi:<name>" (chalk color names, e.g. "ansi:redBright").
    // ======
    "themes": [
      {
        "name": "Dark mode",
        "id": "dark",
        "colors": {
          // --- General UI ---
          "text": "rgb(255,255,255)",
          "inverseText": "rgb(0,0,0)",
          "inactive": "rgb(153,153,153)",
          "subtle": "rgb(80,80,80)",
          "suggestion": "rgb(177,185,249)",
          "remember": "rgb(177,185,249)",
          "background": "rgb(0,204,204)",
          "success": "rgb(78,186,101)",
          "error": "rgb(255,107,128)",
          "warning": "rgb(255,193,7)",
          "warningShimmer": "rgb(255,223,57)",

          // --- Claude brand & system spinner ---
          "claude": "rgb(215,119,87)",
          "claudeShimmer": "rgb(235,159,127)",
          "claudeBlue_FOR_SYSTEM_SPINNER": "rgb(147,165,255)",
          "claudeBlueShimmer_FOR_SYSTEM_SPINNER": "rgb(177,195,255)",

          // --- Modes & borders ---
          "autoAccept": "rgb(175,135,255)",
          "planMode": "rgb(72,150,140)",
          "ide": "rgb(71,130,200)",
          "permission": "rgb(177,185,249)",
          "permissionShimmer": "rgb(207,215,255)",
          "bashBorder": "rgb(253,93,177)",
          "promptBorder": "rgb(136,136,136)",
          "promptBorderShimmer": "rgb(166,166,166)",

          // --- Diff rendering ---
          "diffAdded": "rgb(34,92,43)",
          "diffRemoved": "rgb(122,41,54)",
          "diffAddedDimmed": "rgb(71,88,74)",
          "diffRemovedDimmed": "rgb(105,72,77)",
          "diffAddedWord": "rgb(56,166,96)",
          "diffRemovedWord": "rgb(179,89,107)",
          "diffAddedWordDimmed": "rgb(46,107,58)",
          "diffRemovedWordDimmed": "rgb(139,57,69)",

          // --- Subagent accents (the _FOR_SUBAGENTS_ONLY suffix is literal) ---
          "red_FOR_SUBAGENTS_ONLY": "rgb(220,38,38)",
          "blue_FOR_SUBAGENTS_ONLY": "rgb(37,99,235)",
          "green_FOR_SUBAGENTS_ONLY": "rgb(22,163,74)",
          "yellow_FOR_SUBAGENTS_ONLY": "rgb(202,138,4)",
          "purple_FOR_SUBAGENTS_ONLY": "rgb(147,51,234)",
          "orange_FOR_SUBAGENTS_ONLY": "rgb(234,88,12)",
          "pink_FOR_SUBAGENTS_ONLY": "rgb(219,39,119)",
          "cyan_FOR_SUBAGENTS_ONLY": "rgb(8,145,178)",
          "professionalBlue": "rgb(106,155,204)",

          // --- Rainbow (input pattern highlighter accents) ---
          "rainbow_red": "rgb(235,95,87)",
          "rainbow_orange": "rgb(245,139,87)",
          "rainbow_yellow": "rgb(250,195,95)",
          "rainbow_green": "rgb(145,200,130)",
          "rainbow_blue": "rgb(130,170,220)",
          "rainbow_indigo": "rgb(155,130,200)",
          "rainbow_violet": "rgb(200,130,180)",
          "rainbow_red_shimmer": "rgb(250,155,147)",
          "rainbow_orange_shimmer": "rgb(255,185,137)",
          "rainbow_yellow_shimmer": "rgb(255,225,155)",
          "rainbow_green_shimmer": "rgb(185,230,180)",
          "rainbow_blue_shimmer": "rgb(180,205,240)",
          "rainbow_indigo_shimmer": "rgb(195,180,230)",
          "rainbow_violet_shimmer": "rgb(230,180,210)",

          // --- Clawd ASCII art ---
          "clawd_body": "rgb(215,119,87)",
          "clawd_background": "rgb(0,0,0)",

          // --- Message backgrounds ---
          "userMessageBackground": "rgb(55, 55, 55)",
          "bashMessageBackgroundColor": "rgb(65, 60, 65)",
          "memoryBackgroundColor": "rgb(55, 65, 70)",

          // --- Rate-limit bar ---
          "rate_limit_fill": "rgb(177,185,249)",
          "rate_limit_empty": "rgb(80,83,112)"
        }
      }
      // ... plus 6 other default themes (light, light-ansi, dark-ansi,
      //     light-daltonized, dark-daltonized, monochrome) with the same shape.
    ],

    // ======
    // thinkingVerbs — the word shown while Claude is generating.
    // ======
    "thinkingVerbs": {
      "format": "{}… ",                               // Format string; "{}" is replaced with a randomly selected verb.
      "verbs": ["Accomplishing", "Actioning", "Baking", "Brewing", "Cogitating" /* ... */]  // 177 verbs by default; one picked at random per response.
    },

    // ======
    // thinkingStyle — spinner animation next to the thinking verb.
    // ======
    "thinkingStyle": {
      "updateInterval": 120,                          // Delay between frames in ms. Lower = faster.
      "phases": ["·", "✢", "✳", "✶", "✻", "✽"],      // Characters to cycle through. Default is platform-dependent.
      "reverseMirror": true                           // If true, plays forwards then backwards (ping-pong).
    },

    // ======
    // userMessageDisplay — styling for user messages in the chat transcript.
    // ======
    "userMessageDisplay": {
      "format": " > {} ",                             // Format string; "{}" is replaced with the message text.
      "styling": [],                                  // Any of: "bold", "italic", "underline", "strikethrough", "inverse".
      "foregroundColor": "default",                   // "default" to leave uncolored, otherwise "rgb(r,g,b)" or "ansi:<name>".
      "backgroundColor": null,                        // null/"default" for no background, otherwise a color.

      // One of: "none", "single", "double", "round", "bold", "singleDouble",
      // "doubleSingle", "classic", "topBottomSingle", "topBottomDouble", "topBottomBold".
      "borderStyle": "none",

      "borderColor": "rgb(255,255,255)",              // Border color when borderStyle isn't "none".
      "paddingX": 0,                                  // Horizontal padding inside the box.
      "paddingY": 0,                                  // Vertical padding inside the box.
      "fitBoxToContent": false                        // If true, box shrinks to fit the message instead of filling width.
    },

    // ======
    // inputBox
    // ======
    "inputBox": {
      "removeBorder": false                           // Removes the rounded border around the input box for a cleaner look.
    },

    // ======
    // misc — grab-bag toggles. Descriptions lifted from MiscView.tsx.
    // ======
    "misc": {
      // --- Startup / UI ---
      "showTweakccVersion": true,                     // Show the blue "+ tweakcc v<VERSION>" message at startup.
      "showPatchesApplied": true,                     // Show the green "tweakcc patches are applied" indicator at startup.
      "hideStartupBanner": false,                     // Hide CC's startup banner shown before the first prompt.
      "hideStartupClawd": false,                      // Hide the Clawd ASCII art at startup.
      "hideCtrlGToEdit": false,                       // Hide the "ctrl-g to edit prompt" hint shown during streaming.
      "expandThinkingBlocks": true,                   // Thinking blocks always expanded instead of collapsed.
      "enableVerboseProperty": true,                  // Token counter shows detailed info like "(2s · ↓ 169 tokens · thinking)".
      "suppressNativeInstallerWarning": false,        // Suppress the "use the native installer" warning at startup.
      "filterScrollEscapeSequences": false,           // Filter out terminal escape sequences that cause unwanted scrolling.

      // --- Model / agent ---
      "enableModelCustomizations": true,              // /model lists all Claude models instead of just the latest 3.
      "enableOpusplan1m": true,                       // Add the opusplan[1m] alias (Opus for planning, Sonnet 1M for building).

      // Replace default context limit with CLAUDE_CODE_CONTEXT_LIMIT env var (falls back to 200K if env var not set).
      "enableContextLimitOverride": false,

      "allowCustomAgentModels": false,                // Allow arbitrary model names in custom-agent frontmatter (e.g. "gemini-2.5-flash").

      // --- MCP ---
      "mcpConnectionNonBlocking": true,               // Start CC immediately while MCPs connect in background.
      "mcpServerBatchSize": null,                     // Number of parallel MCP connections (1–20). null = CC default (3).
      "enableChannelsMode": false,                    // Force-enable MCP channel notifications (bypasses tengu_harbor flag + allowlist).

      // --- Statusline ---
      "statuslineThrottleMs": null,                   // Throttle statusline updates to this interval (ms). null = CC default. 0 = instant.
      "statuslineUseFixedInterval": false,            // If true, use setInterval instead of throttle (fixed schedule, not on-demand).

      // --- Session memory / conversation titles ---
      "enableSessionMemory": true,                    // Force-enable session memory (bypasses tengu_session_memory and tengu_coral_fern).
      "enableRememberSkill": false,                   // Register a "remember" skill that reviews session memories into CLAUDE.local.md.
      "enableConversationTitle": true,                // Enable /title and /rename for manually naming conversations.
      "enableTitleVisibilityToggle": false,           // Add /session-title to toggle session title visibility in the prompt bar.

      // --- File reads / output ---
      "increaseFileReadLimit": false,                 // Raise the Read file token limit from 25,000 to 1,000,000.
      "suppressLineNumbers": false,                   // Remove "1→" line-number prefixes from Read output (saves tokens).
      "suppressRateLimitOptions": false,              // Prevent CC from auto-triggering /rate-limit-options on rate limits.
      "tableFormat": "default",                       // "default" | "ascii" | "clean" | "clean-top-bottom". See upstream README for examples.
      "tokenCountRounding": null,                     // Round displayed token counts to nearest multiple of this integer. null = no rounding.

      // --- Plan mode / permissions ---
      "autoAcceptPlanMode": false,                    // Auto-accept plans instead of showing the "Ready to code?" prompt.
      "allowBypassPermissionsInSudo": false,          // ⚠️ Allow --dangerously-skip-permissions under sudo. Disables a security check.

      // --- Experimental / feature-flag bypasses ---
      "enableSwarmMode": true,                        // Force-enable swarm mode.
      "enableWorktreeMode": true,                     // Force-enable the EnterWorktree tool (bypasses tengu_worktree_mode flag).
      "enableVoiceMode": false,                       // Force-enable /voice (bypasses tengu_amber_quartz gate).
      "enableVoiceConciseOutput": true,               // Enable concise-output prompt for voice. Only applies when enableVoiceMode is on.
      "enableFixLspSupport": true,                    // Remove unimplemented-field validation errors; add textDocument/didOpen notifications.
      "enableCustomSessionColors": false,             // Accept hex/rgb values in /color and named colors from customColorMap.

      // Map of custom named colors (e.g. { "mycolor": "rgb(1,2,3)" }). Active when enableCustomSessionColors is true.
      "customColorMap": null
    },

    // ======
    // toolsets — collections of allowed tools. Activate one via /toolset in CC.
    // ======
    "toolsets": [
      // Example:
      // { "name": "research", "allowedTools": ["WebFetch", "WebSearch", "Read"] },
      // { "name": "everything", "allowedTools": "*" }
    ],
    "defaultToolset": null,                           // Name of the toolset auto-selected on CC start.
    "planModeToolset": null,                          // Name of the toolset used when in plan mode.

    // ======
    // subagentModels — per-subagent model overrides. null = CC default.
    // ======
    "subagentModels": {
      "plan": null,
      "explore": null,
      "generalPurpose": null
    },

    // ======
    // inputPatternHighlighters — highlight patterns as you type in the input box.
    // ======
    "inputPatternHighlighters": [
      // Example:
      // {
      //   "name": "File path",
      //   "regex": "(?:[a-zA-Z]:)?[/\\\\]?[a-zA-Z0-9._-]+(?:[/\\\\][a-zA-Z0-9._-]+)+",
      //   "regexFlags": "g",                         // must include "g"
      //   "format": "{MATCH}",                        // {MATCH} placeholder; can add chars around it
      //   "styling": ["bold"],                        // any of: bold, italic, underline, strikethrough, inverse
      //   "foregroundColor": "rgb(71,194,10)",
      //   "backgroundColor": null,
      //   "enabled": true
      // }
    ],

    // Scratch text used in the highlighter editor for live preview. Not applied to CC.
    "inputPatternHighlightersTestText": "Type test text here to see highlighting",

    // ======
    // claudeMdAltNames — fallback filenames CC checks when CLAUDE.md doesn't exist,
    // in priority order. CLAUDE.md is always tried first regardless.
    // ======
    "claudeMdAltNames": [
      "AGENTS.md",
      "GEMINI.md",
      "CRUSH.md",
      "QWEN.md",
      "IFLOW.md",
      "WARP.md",
      "copilot-instructions.md"
    ]
  }
}
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
