---
title: SaltStack plugin 2026.2.3 — Pillar validation, import_yaml navigation, and SLS context variables
date: 2026-10-18
translationKey: saltstack-plugin-2026-2-3
description: The new release of the IntelliJ plugin for SaltStack — Pillar structure and key validation with YAML 1.1 semantics, include completion, navigation into import_yaml/import_json data, the sls/slspath/tpldir variables, and stricter checks for state files.
tags: saltstack, intellij, tooling
---

Release 2026.2.3 of the [SaltStack plugin](https://plugins.jetbrains.com/plugin/30291-saltstack) brings together everything since 2026.2.1: the state file checks that shipped in 2026.2.2 and a large new set of features for Pillar. The idea behind this release is simple: the IDE should catch errors that you currently only see after running `state.apply` or `pillar.items` on a minion. Here are the highlights.

## Pillar: structure validation

If a Pillar file doesn't render to a mapping, or `include:` isn't written as a list, Salt will fail at render time. The plugin now catches this right away:

- the root of a Pillar SLS must be a mapping. Falsy values (`null`, `false`, `0`), which Salt treats as an empty Pillar, are allowed;
- `include:` must be a YAML list, with each item as a separate entry;
- multiple YAML documents in one file are now reported as an error instead of a warning;
- roots wrapped in Jinja blocks (`{% if %}`, `{% macro %}`, block-form `{% set %}`) don't produce false positives.

Common mistakes come with quick fixes: wrap a scalar `include:` into a list, or split an item with several keys into separate items. Indentation and comments are preserved.

## Pillar: keys by YAML 1.1 rules

Salt parses YAML according to the 1.1 spec and then works with the result as a Python dictionary. Because of that, keys that are identical to Salt can look completely different. `PillarKeyValidator` normalizes keys the same way Salt does and finds duplicates you would never spot by eye:

```yaml
ports:
  80: http
  0x50: http-alt     # duplicate: 0x50 == 80
  1:20: legacy       # duplicate: sexagesimal 1:20 == 80

flags:
  true: enabled
  1: one             # duplicate: in Python True == 1

names:
  a: plain
  "\x61": escaped    # duplicate: "\x61" decodes to "a"
```

Normalization understands decimal, octal, hexadecimal, binary, and sexagesimal numbers, `.inf`, `.nan`, and escape sequences in double-quoted strings. Beyond duplicates, the validator checks for empty keys, reserved names, and type mismatches. To avoid double reporting, the standard YAML duplicate key inspection is suppressed in Pillar files, leaving only ours.

## Pillar: completion and navigation for `include:`

`include:` now offers path completion based on `pillarRoots`, and Ctrl+Click takes you to the file:

```yaml
include:
  - common.base   # → common/base.sls
  - apps          # → apps/init.sls
  -               # the IDE suggests available SLS files here
```

`init.sls` collapses to its directory name, just like in Salt itself. If `pillarRoots` isn't configured, the plugin looks for a `pillar` directory in the project. State files still use `fileRoots`, so the two kinds of paths don't get mixed up.

## `import_yaml` and `import_json`: data the IDE understands

Previously, a variable created by `{% import_yaml %}` was a black box to the IDE. Now the plugin reads the imported file and:

- completes keys, array indexes, and nested fields;
- inserts bracket notation for keys that can't be written with a dot (containing a dash, a space, or a dot, or starting with a digit): `defaults["log-level"]`;
- navigates on Ctrl+Click to the exact key or list item in the YAML/JSON file;
- works even when the import is inside an `{% if %}` block.

```jinja
{% import_yaml "defaults.yaml" as defaults %}
{{ defaults.nginx.workers }}        {# Ctrl+Click → the workers key in defaults.yaml #}
{{ defaults.servers[0].host }}      {# list items work too #}
```

Only static access is analyzed: if a key is computed dynamically, the plugin doesn't make anything up.

## SLS context variables

Salt passes every SLS a set of variables describing the file itself. The plugin now knows all of them: `sls`, `slspath`, `sls_path`, `slsdotpath`, `slscolonpath`, `tplpath`, `tplfile`, `tpldir`, and `tpldot`.

Quick Documentation (Ctrl+Q) shows not only a description but also the value the variable will have in the current file. For example, for `salt/web/nginx/init.sls`:

| Variable       | Value                |
|----------------|----------------------|
| `sls`          | `web.nginx`          |
| `slspath`      | `web/nginx`          |
| `sls_path`     | `web_nginx`          |
| `slsdotpath`   | `web.nginx`          |
| `slscolonpath` | `web:nginx`          |
| `tplfile`      | `web/nginx/init.sls` |
| `tpldir`       | `web/nginx`          |

These variables exist only while an SLS is being rendered. So in plain Jinja templates (for example, ones used by `file.managed`) they aren't offered in completion, and using them is flagged as an undefined variable.

## State files: requisites, arguments, and cycles

This part shipped in 2026.2.2 and deserves a mention of its own.

**Requisites.** Added support for `listen_in`, `onfail_all`, and all the `*_any` forms (`require_any`, `watch_any`, `onchanges_any`, `onfail_any`), with completion, validation, and Quick Documentation. Wildcard patterns (`*`, `?`, `[ ]`) no longer cause false "unresolved ID" warnings. Bare state IDs in requisites are completed and validated too. Scalar values where Salt expects a list (`require_in`, `require_any`) are now an error.

**Requisite cycles.** `RequisiteCycleValidator` builds a dependency graph and finds cycles before you run anything. Identical IDs in different modules (`pkg: nginx` and `service: nginx`) are told apart correctly and don't form false cycles.

**Arguments.** State function argument types are checked against Salt metadata: string, list, mapping, boolean, number. Global arguments now cover all 17 (`umask`, `parallel`, `reload_modules`, `reload_pillar`, `reload_grains`, `fire_event`, `saltenv`, and others), each with completion, documentation, and validation.

**Declaration structure and duplicate IDs.** The plugin checks that a declaration has one function per module and no repeated modules, and finds duplicate state IDs within a file and across files. IDs generated by Jinja and `extend` are excluded from this check.

## Performance and stability

- Fixed a 17-second UI freeze when opening the metadata settings while the metadata server was responding slowly.
- Salt metadata now loads in the background, so completion in state files no longer blocks the editor.
- Added error reporting via Sentry and the standard JetBrains Marketplace error handler. If something crashes, you can send a report straight from the IDE, and we can fix it faster.

## Under the hood

- The [Jinja2 Enhanced Support](https://plugins.jetbrains.com/plugin/29804-jinja2-enhanced-suppo) dependency has been updated to 2026.3.2, so the plugin gets all the improvements from its [latest release](/en/saltstack/2026-10-17-jinja2-enhanced-20206-3-2).
- PIT mutation testing has been added to the test suite, and coverage has grown significantly.
- The build has moved to JDK 25.

Update via *Settings → Plugins* or on the [plugin's JetBrains Marketplace page](https://plugins.jetbrains.com/plugin/30291-saltstack), and let us know which checks you're still missing.
