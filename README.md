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

## How it works

tweakcc works by patching Claude Code's minified `cli.js` file, reading customizations from `~/.tweakcc/config.json`. For npm-based installations `cli.js` is modified directly, but for native installations it's extracted from the binary using [node-lief](https://github.com/Piebald-AI/node-lief), patched, and then the binary is repacked. When you update your Claude Code installation, your customizations will be overwritten, but they're remembered in your configuration file, so they can be reapplied by just running `npx tweakcc --apply`.

tweakcc is verified to work with Claude Code **2.1.62.** In newer or earlier versions various patches might not work. However, if we have the [system prompts for your version](https://github.com/Piebald-AI/tweakcc/tree/main/data/prompts) then system prompt patching is guaranteed to work with that version, even if it's significantly different from the verified CC version&mdash;the version number stated above is only relevant for the non-system-prompt patches.

You can also create custom patches using tweakcc without having to fork it or open a PR. `tweakcc adhoc-patch` supports using custom scripts that work with native and npm-based installs and that automatically detect your Claude Code installation. See the [upstream README](https://github.com/Piebald-AI/tweakcc#readme) for details.

## `config.json` reference

tweakcc reads `~/.tweakcc/config.json` on each run. The shape is defined by [`TweakccConfig`](src/types.ts) in `src/types.ts`; defaults come from [`DEFAULT_SETTINGS`](src/defaultSettings.ts) in `src/defaultSettings.ts`.

> **Absent fields preserve Claude Code's own defaults.** If a top-level key under `settings` is missing from your `config.json` (e.g. you delete the `userMessageDisplay` block, or omit `misc.enableVerboseProperty`), tweakcc will *not* apply the corresponding patch — CC's unmodified behavior is preserved. Set a field explicitly to opt into tweakcc's customization. This is a fork-specific semantic; upstream tweakcc would deep-merge absent fields against `DEFAULT_SETTINGS` and patch regardless.

**Minimal example.** Only opt into a few patches — everything else stays at CC's default:

```jsonc
{
  "ccVersion": "2.1.112",
  "ccInstallationPath": null,
  "changesApplied": false,
  "settings": {
    "misc": {
      "enableVerboseProperty": true,
      "expandThinkingBlocks": true,
      "showTweakccVersion": true,
      "showPatchesApplied": true
    }
  }
}
```

Below is an annotated example with every field set to its default, for reference. The real file is plain JSON — strip the `//` comments before saving. You don't need to include every field; only the ones you want tweakcc to apply.

```jsonc
{
  "ccVersion": "2.1.62",                       // CC version tweakcc last saw; drives prompt refresh & conflicts.

  // Absolute path to the CC installation (cli.js for npm installs, binary for native).
  // Set on first detection. Overridable via TWEAKCC_CC_INSTALLATION_PATH env var.
  "ccInstallationPath": "/home/user/.local/bin/claude",

  "ccInstallationDir": null,                   // Deprecated; only read to migrate old configs.
  "lastModified": "2026-04-21T00:00:00.000Z",  // ISO timestamp of last config write.
  "changesApplied": true,                      // Last --apply succeeded; drives "patches applied" indicator.
  "hidePiebaldAnnouncement": false,            // (Optional) Hide Piebald promo block in TUI.

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
      // Format string; "{}" is replaced with a randomly selected verb.
      "format": "{}… ",
      // 177 verbs by default; one picked at random per response.
      "verbs": ["Accomplishing", "Actioning", "Baking", "Brewing", "Cogitating" /* ... */]
    },

    // ======
    // thinkingStyle — spinner animation next to the thinking verb.
    // ======
    "thinkingStyle": {
      "updateInterval": 120,                      // Delay between frames in ms. Lower = faster.
      "phases": ["·", "✢", "✳", "✶", "✻", "✽"],  // Frames to cycle; platform-dependent default.
      "reverseMirror": true                       // Plays forwards then backwards (ping-pong).
    },

    // ======
    // userMessageDisplay — styling for user messages in the chat transcript.
    // ======
    "userMessageDisplay": {
      "format": " > {} ",                   // Format string; "{}" is replaced with the message text.
      "styling": [],                        // bold | italic | underline | strikethrough | inverse.
      "foregroundColor": "default",         // "default" | "rgb(r,g,b)" | "ansi:<name>".
      "backgroundColor": null,              // null / "default" = no background, else a color.

      // One of: "none", "single", "double", "round", "bold", "singleDouble",
      // "doubleSingle", "classic", "topBottomSingle", "topBottomDouble", "topBottomBold".
      "borderStyle": "none",

      "borderColor": "rgb(255,255,255)",    // Color when borderStyle isn't "none".
      "paddingX": 0,                        // Horizontal padding inside the box.
      "paddingY": 0,                        // Vertical padding inside the box.
      "fitBoxToContent": false              // Shrink box to fit message instead of filling width.
    },

    // ======
    // inputBox
    // ======
    "inputBox": {
      "removeBorder": false  // Remove the rounded border around the input box.
    },

    // ======
    // misc — grab-bag toggles. Descriptions lifted from MiscView.tsx.
    // ======
    "misc": {
      // --- Startup / UI ---
      "showTweakccVersion": true,               // Show "+ tweakcc v<VERSION>" message at startup.
      "showPatchesApplied": true,               // Show "patches applied" indicator at startup.
      "hideStartupBanner": false,               // Hide CC's startup banner.
      "hideStartupClawd": false,                // Hide the Clawd ASCII art at startup.
      "hideCtrlGToEdit": false,                 // Hide "ctrl-g to edit prompt" hint.
      "expandThinkingBlocks": true,             // Thinking blocks expanded by default.
      "enableVerboseProperty": true,            // Verbose token counter (time + thinking state).
      "suppressNativeInstallerWarning": false,  // Suppress "use native installer" warning.
      "filterScrollEscapeSequences": false,     // Filter terminal scroll escape sequences.

      // --- Model / agent ---
      "enableModelCustomizations": true,  // /model lists all models, not just latest 3.
      "enableOpusplan1m": true,           // Add opusplan[1m] alias (Opus plan, Sonnet 1M exec).
      "allowCustomAgentModels": false,    // Allow arbitrary model names in agent frontmatter.

      // Replace default context limit with CLAUDE_CODE_CONTEXT_LIMIT env var (falls back to 200K).
      "enableContextLimitOverride": false,

      // --- MCP ---
      "mcpConnectionNonBlocking": true,  // Start CC immediately; MCPs connect in background.
      "mcpServerBatchSize": null,        // Parallel MCP connections (1-20). null = default (3).
      "enableChannelsMode": false,       // Force-enable MCP channel notifications (bypasses tengu_harbor).

      // --- Statusline ---
      "statuslineThrottleMs": null,         // Throttle interval ms. null = default. 0 = instant.
      "statuslineUseFixedInterval": false,  // Use setInterval instead of throttle.

      // --- Session memory / conversation titles ---
      "enableSessionMemory": true,           // Force-enable session memory (bypasses tengu_session_memory).
      "enableRememberSkill": false,          // Register "remember" skill that writes findings to CLAUDE.local.md.
      "enableConversationTitle": true,       // Enable /title and /rename for manually naming conversations.
      "enableTitleVisibilityToggle": false,  // Add /session-title to toggle session title visibility.

      // --- File reads / output ---
      "increaseFileReadLimit": false,     // Raise Read token limit 25k → 1M.
      "suppressLineNumbers": false,       // Remove "1→" prefixes (saves tokens).
      "suppressRateLimitOptions": false,  // Don't auto-trigger /rate-limit-options.
      "tableFormat": "default",           // "default" | "ascii" | "clean" | "clean-top-bottom".
      "tokenCountRounding": null,         // Round token counts to nearest multiple.

      // --- Plan mode / permissions ---
      "autoAcceptPlanMode": false,            // Auto-accept plans; skip "Ready to code?" prompt.
      "allowBypassPermissionsInSudo": false,  // ⚠️ Allow --dangerously-skip-permissions under sudo (no check).

      // --- Experimental / feature-flag bypasses ---
      "enableSwarmMode": true,             // Force-enable swarm mode.
      "enableWorktreeMode": true,          // Force-enable EnterWorktree tool (bypasses tengu_worktree_mode flag).
      "enableVoiceMode": false,            // Force-enable /voice (bypasses tengu_amber_quartz gate).
      "enableVoiceConciseOutput": true,    // Concise voice output (needs enableVoiceMode).
      "enableFixLspSupport": true,         // Remove field-validation errors; add textDocument/didOpen.
      "enableCustomSessionColors": false,  // Accept hex/rgb in /color; enable customColorMap.

      // Map of custom named colors (e.g. { "mycolor": "rgb(1,2,3)" }).
      // Used when enableCustomSessionColors is true.
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
    "defaultToolset": null,   // Toolset auto-selected on CC start.
    "planModeToolset": null,  // Toolset used in plan mode.

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
      //   "regexFlags": "g",       // must include "g"
      //   "format": "{MATCH}",     // "{MATCH}" placeholder; can add chars around it
      //   "styling": ["bold"],     // bold | italic | underline | strikethrough | inverse
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

