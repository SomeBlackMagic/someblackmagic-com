---
title: SaltStack plugin 2026.3.0 — Pillar environments, effective values, and Pillar keys in Jinja
seoTitle: SaltStack Plugin 2026.3.0: Pillar Environments & Keys
date: 2026-11-01
translationKey: saltstack-plugin-2026-3-0
description: The new release of the IntelliJ plugin for SaltStack — per-environment pillar_roots and dynamic __env__, Pillar application order and a merge model with effective values, override and unused-file diagnostics, navigation and completion for Pillar keys in Jinja, plus Saltfile and Salt Bundle support.
tags: saltstack, intellij, tooling
---

Release 2026.3.0 of the [SaltStack plugin](https://plugins.jetbrains.com/plugin/30291-saltstack) is almost entirely about Pillar. In [2026.2.3](/en/saltstack/2026-10-18-saltstack-plugin-2026-2-3) the IDE learned to check a single Pillar file. Now it understands Pillar as a whole: which files end up in which environment, in what order they are applied, how they merge, and what value a key will finally have on the minion. On top of that, there is new support for Saltfile and Salt Bundle metadata. Let's go through it all.

## Pillar per environment

In Salt, `pillar_roots` are configured per environment, and `top.sls` in `base` sees a completely different set of files than in `dev`. The plugin now works the same way.

- **Settings.** The `pillar_roots` settings are now a table: environment → directories. *Mark Directory As* now lets you pick an environment, so you can mark a directory as a Pillar root for the right env straight from the project tree. Roots can be set as a regular path or as a VirtualFile URL.
- **Top → SLS navigation** respects the environment: an entry in the `dev:` block leads to a file from the `dev` roots, not from the first directory that happens to match.
- **Diagnostics.** If `top.sls` mentions an environment with no configured roots, or an SLS that doesn't exist in that environment's roots, the IDE highlights it. A quick fix helps you add the environment or create the missing file.

```yaml
# pillar/top.sls
base:
  '*':
    - common          # looked up in the base roots
dev:
  'dev-*':
    - debug           # looked up only in the dev roots
staging:              # environment not configured: warning + quick fix
  '*':
    - common
```

### Dynamic `__env__` roots

Templated directories with `__env__` are supported, just like in Salt itself:

```yaml
pillar_roots:
  base:
    - /srv/pillar/base
  __env__:
    - /srv/pillar/envs/__env__
```

The plugin discovers every environment that matches the pattern (`envs/dev`, `envs/qa`, ...) and uses them in navigation, completion, and diagnostics. The list updates as soon as you create, delete, or rename a directory, with no IDE restart. If an environment is configured explicitly and also matches `__env__`, the explicit setting wins, and the plugin shows a weak warning about it. Settings are validated while you edit them: the list of available environments changes along with the roots table.

### Active Pillar environment

When a project has several environments, it helps to see it through the eyes of a specific minion with a specific `pillarenv`. For that, there is now an active environment switcher:

- a status bar widget and an editor notification for quick switching;
- two modes: **merged** (all environments together) and **per-env** (only the selected one);
- `top.sls` blocks for inactive environments are dimmed, and diagnostics related to them stay out of your way;
- Quick Documentation (Ctrl+Q) on an environment key in `top.sls` shows whether it's active.

## `include:` in Pillar

Pillar supports a different set of `include` features than state files, and the plugin now tells them apart.

**Relative names and globs.** `.users` resolves relative to the current file, and `users.*` expands to every matching SLS. Ctrl+Click on a glob lets you pick one of the files, and completion works too. Pillar doesn't support `..users`, so it's an error.

```yaml
# pillar/apps/web.sls
include:
  - .nginx        # → apps/nginx.sls
  - users.*       # → users/admins.sls, users/devs.sls, ...
  - ..common      # error: Pillar doesn't support ..
```

**Environment-bound includes.** An entry like `- dev: common` works in state files but not in Pillar. The plugin flags this syntax and offers two quick fixes: convert it to a plain include, or jump to the right environment's block in `top.sls`, which is where the file should be included.

**Full form with `key` and `defaults`.** For includes written as a mapping, there is option completion, value validation, and Quick Documentation with an example and the effective key path:

```yaml
include:
  - users:
      key: accounts         # everything from users.sls ends up under accounts:
      defaults:
        shell: /bin/bash    # the shell variable is available in users.sls
```

In the included file, Ctrl+Click on the variable takes you to its declaration in the `defaults` of the including file.

## `ignore_missing` in Pillar Top

The `ignore_missing: True` option is now fully supported in `top.sls`: completion, validation, and Quick Documentation. Missing SLS files under this option are no longer reported as errors. If the option is written incorrectly or isn't needed, a quick fix removes it without touching the other options.

```yaml
base:
  'web*':
    - ignore_missing: True
    - web.optional      # the file may be missing, no warning
```

## Pillar application order

The new **Show Pillar Application Order** action and tool window show the order in which Salt will apply SLS files for the selected targets, taking into account environments, the order in `top.sls`, the `order` option, glob expansion, and recursive includes. It's a static calculation, so nothing needs to run on a minion.

Duplicate detection in `top.sls` now uses the same calculation: the entry that has already been applied earlier is the one highlighted, with targets and order taken into account. Invalid `order` values are flagged as well.

## Effective values: the Pillar merge model

This is the biggest part of the release. The plugin now statically "compiles" Pillar the way Salt does: it recursively merges dictionaries, handles includes along with `key`, applies the list merge rules, and remembers which file each value came from.

You can see the result in Quick Documentation (Ctrl+Q) on a Pillar key: the effective value and the file it came from. If the key is overridden by a later SLS, the documentation says so.

```yaml
# pillar/common.sls
nginx:
  workers: 2
  log_level: warn

# pillar/web.sls (applied after common)
nginx:
  workers: 8
```

Ctrl+Q on `log_level` shows `warn` from `common.sls`, while on `workers` it shows `8` from `web.sls` and notes that the value from `common.sls` is overridden.

The model is honest about what can't be known statically. Values inside `{% if %}/{% elif %}/{% else %}` are marked as uncertain rather than presented as final. The YAML keys `1` and `'1'` are different keys, and the plugin keeps them separate. Likewise, list merges distinguish `yes` from `'yes'`, and nested lists and maps are compared by structure and values.

## Override diagnostics

Built on top of the merge model, a new inspection shows key conflicts right in the editor:

- a key that is guaranteed to be overridden by another SLS gets a weak warning;
- type changes (a map replaced by a string, and so on) and cases where a list will be replaced rather than extended are flagged separately;
- **Overrides** / **Overridden** gutter icons let you jump between definitions of the same key;
- the severity is configurable in *Settings → Editor → Inspections*.

To avoid false positives, only SLS files that are guaranteed to be applied together count as conflicting: in the same environment and for overlapping targets. Values from uncertain Jinja branches aren't reported, includes with different `key` values don't conflict, and relative includes (`.name`) are taken into account. Diagnostics are cached per project and recalculated when files or settings change, so they stay fast on large repositories.

## Unused Pillar files

The new `PillarUnusedFile` inspection finds SLS files that can't be reached from `top.sls`, either directly or through includes. Such files get a weak warning. Globs in `top.sls`, recursive includes, and dynamic `__env__` environments are all taken into account.

Files outside Pillar roots and dynamic includes that can't be resolved statically are skipped to avoid false positives. If you're keeping a file on purpose, you can silence the warning with a comment:

```yaml
# noinspection PillarUnusedFile
legacy:
  enabled: false
```

## Find Usages for Pillar SLS

*Find Usages* (Alt+F7) on a Pillar file shows every `top.sls` entry that applies it, with environments taken into account: a file from the `dev` roots won't be found in the `base` block. A file-level search shows the Top entries, not the first YAML key in the file, and respects the selected scope.

## Pillar keys in Jinja

The IDE now links Pillar lookups in state files to the place where the key is declared.

**Navigation and Find Usages.** Ctrl+Click works for all the common forms:

```jinja
{{ pillar['nginx']['workers'] }}
{{ pillar.nginx.workers }}
{{ salt['pillar.get']('nginx:workers', 2) }}
```

All three lead to `workers` in the Pillar file. If the key is declared in several files, the IDE lets you choose. Paths with `key` in includes are taken into account: a key from `users.sls`, included with `key: accounts`, is found as `accounts:...`. *Find Usages* on a key in a Pillar file shows every place it's used in templates.

**Completion.** After `pillar.` or `pillar['`, the IDE suggests keys that actually exist in the effective Pillar and marks the conditional ones. If a key can't be written with dot notation (`log-level`, `1st`), completion rewrites the expression into subscript notation for you. Quotes and special characters are escaped according to the surrounding quotes.

For `pillar.get`, `salt['pillar.get']`, and `pillar.item`, completion works segment by segment: after `nginx:` you get the child keys of `nginx`. The `delimiter` and `pillarenv` arguments are respected, and an existing delimiter isn't duplicated.

```jinja
{{ salt['pillar.get']('nginx/', delimiter='/') }}   {# nginx keys, separated by / #}
{{ salt['pillar.get']('db:', pillarenv='dev') }}    {# keys from the dev environment #}
```

**`pillar.get` vs `salt['pillar.get']`.** In Jinja, `pillar.get('a:b')` is a plain `dict.get`: it doesn't split the path on `:` and almost always returns the default value. The plugin warns about this and offers a quick fix that replaces the call with `salt['pillar.get']`, including variants with spaces (`pillar . get(...)`).

## Jinja context for Pillar files

Pillar SLS files and `top.sls` are rendered with a different set of variables than state files. Completion and checks now know which variables are available in each of these file types. There are two new inspections:

- a reference to `pillar` inside a Pillar SLS is highlighted: while Pillar is being rendered, this variable doesn't yet contain the compiled Pillar, so such a reference usually doesn't do what the author expects;
- Python loader dunder variables (`__salt__`, `__pillar__`, `__grains__`, and so on) in Jinja are flagged, and a quick fix replaces them with `salt`, `pillar`, `grains`.

## Saltfile

`Saltfile` files now get full support:

- completion for top-level sections (`salt-ssh`, `salt-call`, `salt-cloud`, and others) and their options, based on Salt CLI metadata; sections and options already in use aren't suggested again;
- warnings for unknown sections, unknown options in a section, and duplicate sections. Names generated by Jinja are excluded from the check;
- Quick Documentation (Ctrl+Q) for sections and options.

```yaml
salt-ssh:
  config_dir: ./etc/salt
  roster_file: ./roster
  max_procs: 10
  unknown_opt: 1     # unknown option for salt-ssh
salt-ssh:            # duplicate section
  ssh_log_file: ./ssh.log
```

## Salt Bundle

The plugin recognizes Salt Bundle package files:

- `FORMULA` and `EXTENSION` are detected as dedicated file types with their own icons, with completion for required and optional metadata fields;
- `FORMULAIGNORE` and `EXTENSIONIGNORE` get syntax highlighting;
- state diagnostics no longer run on these files inside directories with `top.sls`, so there are no more false Salt/Jinja errors on them.

## Fixes and more

- A glob with an unclosed `[` or `]` in `top.sls` is now treated as a literal instead of breaking the check.
- Fixed resolution of nested `init.sls` files in Pillar.
- Fixed an NPE when looking up files for a Pillar key.
- The application order window no longer mixes data when several projects are open.
- Pillar key completion is faster on large repositories.
- The short plugin survey now appears only after you've actually worked with Salt files (for example, applied a quick fix), not just opened a project.
- Added compatibility with the IntelliJ Platform 2026.3 (build 263.*).

Update via *Settings → Plugins* or on the [plugin's JetBrains Marketplace page](https://plugins.jetbrains.com/plugin/30291-saltstack), and let us know which Pillar features you're still missing.
