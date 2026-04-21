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

_TODO: document each field in `~/.tweakcc/config.json`._

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
