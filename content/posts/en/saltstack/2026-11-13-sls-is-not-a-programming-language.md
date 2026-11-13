---
title: SLS Is Not a Programming Language. Where SaltStack Logic Belongs
date: 2026-11-13
description: Why SLS should describe desired state instead of implementing deployment algorithms, and how to split logic between SLS, Pillar, utility, execution and state modules, Salt Extensions, and orchestration.
tags: saltstack, devops, architecture
---

As a SaltStack project grows, its SLS files tend to take on more and more work. At first they contain nothing but a package install and a managed config file. Then come conditions for different operating systems, loops that create similar resources, transformations of input data, checks of the current state via shell commands, and multi-step upgrade procedures.

Each individual change may look justified. But gradually SLS stops being a declarative description of state and turns into the main implementation language for deployment logic.

The main thesis of this post:

> SLS is meant to describe desired state and compose states. It should not become the place where deployment algorithms, data normalization, state discovery, and multi-step process control are implemented.

This doesn't mean Jinja, conditions, or loops are forbidden in SLS. The line isn't drawn between "simple" and "complex" syntax — it's drawn between different kinds of responsibility.

## What happens when SLS runs

An SLS file isn't executed like a regular program. First a template engine, most often Jinja, produces a data structure. Then Salt compiles it into a set of low chunks and builds a graph of states. After that, state modules compare the desired state with the current one and make the necessary changes.

```text
Pillar and grains
       ↓
Jinja rendering
       ↓
compiled states
       ↓
state modules
       ↓
system changes
```

Jinja runs before the states do. It produces a declaration, but it doesn't manage resources in the sense that a state module does.

An important caveat: `salt[...]` calls inside Jinja are executed on the minion right during rendering. That's the most common way state discovery quietly sneaks into a template: the result of an execution module determines the structure of the states before the state modules even get a chance to compare anything.

So a loop that produces ten similar declarative states can be perfectly appropriate. But a loop that implements a discovery algorithm, transforms a configuration model, or assembles a sequence of commands is already moving program logic into the rendering layer.

## The problem isn't `if` and `for`

Conditions and loops by themselves aren't an architectural mistake. For example, this fragment stays declarative:

```jinja
{% for user_name, user_data in users.items() %}
user_{{ user_name }}:
  user.present:
    - name: {{ user_name }}
    - shell: {{ user_data.get('shell', '/bin/bash') }}
{% endfor %}
```

The loop doesn't work out how to manage users and doesn't check whether they exist by hand. It just creates several `user.present` declarations from data that has already been prepared. Comparing current and desired state is the state module's job.

The line is crossed when SLS starts to:

- migrate or normalize data structures;
- implement merge rules for several configuration models;
- discover the current state on its own;
- build shell commands as the primary way of managing a resource;
- fake idempotency with `grep`, `test`, `&&`, and `||`;
- manage transient states and multi-step workflows;
- perform non-deterministic computations during rendering.

## The right pattern: `map.jinja`

Before getting to the anti-patterns, it's worth pointing out an example of handling data the right way. The classic `map.jinja` from template-formula assembles the final configuration from fixed layers:

```text
defaults.yaml
       ↓
OS-specific values (osfamilymap, osmap)
       ↓
Pillar on top of everything
```

This is also data merging in Jinja, but it follows an established convention: the order of layers is known in advance, there's a single rule — each layer is applied on top of the previous one — and anyone familiar with Salt formulas understands the result without reading the code. That merge is part of the formula's contract, not a hidden algorithm.

Problems start where a formula invents its own rules: migrating schemas, resolving conflicts, maintaining backward compatibility.

## Example 1. Data normalization inside SLS

Suppose a formula supports both a new and a legacy configuration schema. Code like this shows up in the SLS:

```jinja
{% if legacy_config is defined %}
  {% for category in supported_categories %}
    {% if category in legacy_config %}
      {% if category not in current_config %}
        {% do current_config.update({category: {}}) %}
      {% endif %}
      {% do current_config[category].update(
        legacy_config[category]
      ) %}
    {% endif %}
  {% endfor %}
{% endif %}
```

Unlike `map.jinja`, this block:

- supports two data schemas;
- migrates values from the old schema to the new one;
- creates missing nested structures;
- defines its own merge rules;
- mutates input data before states are compiled.

That's already a standalone transformation function:

```text
legacy configuration
        ↓
normalization and merge
        ↓
current configuration
```

Such a function is hard to test in isolation inside SLS. You have to render the whole template, set up a Salt context, and inspect the resulting lowstate — even though what you're actually testing is an ordinary data-structure transformation.

It makes more sense to move the normalization into a testable Python function, for example in a utility module:

```python
def normalize_config(current, legacy):
    """Return configuration converted to the current schema."""
```

For that function you can separately test empty structures, conflicting values, precedence of the new schema, unknown parameters, repeated calls, and backward compatibility.

The SLS then receives data that is already prepared and is only concerned with declaring state.

## Example 2. A homemade state module built from YAML, Jinja, and shell

Another common case is managing a resource through a series of `cmd.run` calls:

```jinja
resource_create:
  cmd.run:
    - name: >
        tool list | grep -q "{{ resource_name }}"
        || tool create {{ resource_name }}

{% for key, value in resource_config.items() %}
resource_config_{{ loop.index }}:
  cmd.run:
    - name: >
        tool config set
        {{ resource_name }}
        {{ key }}={{ value }}
{% endfor %}
```

Here the SLS itself implements finding the resource, checking whether it exists, creating it, applying parameters, generating commands, and part of the idempotency logic.

In effect, this is a state module implemented with YAML, Jinja, and shell. Salt doesn't get a proper model of the resource. All it sees are commands and their exit codes.

This approach causes several problems. First, `test=True` can't show an accurate change plan unless the command implements its own safe check. Second, setting a parameter often runs on every apply, even if the desired value is already in place. Third, errors in parsing text output become part of the state model. Fourth, shell quoting and special characters in the data create a whole extra class of bugs.

### What about `unless` and `onlyif`?

The natural objection: move the check out of the shell into the `unless`, `onlyif`, or `creates` arguments.

```yaml
resource_create:
  cmd.run:
    - name: tool create example
    - unless: tool show example
```

This is genuinely better than `grep ... ||` inside the command: the check becomes explicit, and `test=True` at least doesn't run the command itself. But there's still no resource model. In a dry run Salt can only report "the command would have been executed" — not which parameters will change, or from what to what. `changes` stays unstructured: stdout and an exit code. For individual parameters you end up writing "command + check" pairs, and each such pair parses text output all over again.

`unless` and `onlyif` are an acceptable intermediate step, but not a substitute for a state module.

The desired declaration should look roughly like this:

```yaml
managed_resource:
  virtual_resource.present:
    - name: example
    - type: container
    - profiles:
        - default
    - config:
        limits.cpu: 4
        limits.memory: 8GiB
```

And the state module should:

1. fetch the current state of the resource;
2. normalize it for comparison;
3. compare it with the desired state;
4. compute the changes;
5. return a correct result under `test=True`;
6. apply only the necessary operations;
7. return structured `changes`.

In this model SLS answers the question "what should exist", and the state module answers "how to detect and enforce that state".

## Example 3. A deployment workflow inside an infrastructure formula

Over time, a formula for an infrastructure service may start performing a sequence like this:

```text
configure the package repository
        ↓
install the package
        ↓
prepare certificates
        ↓
download extensions
        ↓
restart the service
        ↓
wait until it's ready
        ↓
patch the integration module
        ↓
reload Salt modules
        ↓
enable service extensions
```

Individual steps may be needed, but together they represent not a single steady state but an install or upgrade procedure.

It's important to distinguish steady state from workflow. Steady state answers questions like: which package should be installed, which config file should exist, which permissions should be set, which extensions should be enabled, whether the service should be running and enabled at boot.

Workflow answers different questions: in what order to perform the upgrade, when to temporarily stop the service, when to turn on a compatibility feature, how to wait for readiness, what to do on failure, when to move on to the next node, how to roll back.

The service's steady state should stay in the infrastructure formula. Specialized operations should be encapsulated in execution or state modules. Fixes and extensions to Salt itself should be shipped as a Salt Extension. The upgrade sequence, waiting, and coordination between nodes belong in orchestration.

If the workflow is left inside a regular SLS, a subsequent highstate may unexpectedly re-run part of the upgrade procedure. On top of that, the resulting file becomes hard to read: the declaration of steady state sits side by side with transient actions and workarounds for issues in specific versions.

## Example 4. An algorithm hidden inside a single `cmd.run`

Sometimes an SLS looks short, but the complexity is hidden inside a single shell command:

```yaml
deploy_configuration_repository:
  cmd.run:
    - name: |
        [ -d /srv/config/.git ] || (
          initialize_repository &&
          configure_remote &&
          fetch_sources &&
          update_dependencies &&
          run_post_deploy_hook
        )
```

In a real-world version, instead of these placeholder functions you'll usually find `git init`, creating links and hooks, configuring a remote, fetching a branch, initializing submodules, updating dependencies, and running a post-deploy script.

To Salt, this is a single action. It can't separately see the repository's state, the required remote, the selected branch, the state of submodules, whether the hook exists, or the outcome of each step.

The `[ -d .../.git ]` check also doesn't mean the repository is in the required state. The directory can exist yet have the wrong remote, a stale branch, broken submodules, or a missing hook.

The length of the SLS is misleading here. One state hides an entire algorithm and several independent resources. Most of that algorithm is already covered by standard states:

```yaml
config_repository:
  git.latest:
    - name: https://git.example.com/config.git
    - target: /srv/config
    - rev: main
    - submodules: True

config_repository_hook:
  file.managed:
    - name: /srv/config/.git/hooks/post-merge
    - source: salt://config/files/post-merge
    - mode: '0755'
    - require:
      - git: config_repository

config_post_deploy:
  cmd.run:
    - name: /srv/config/bin/post-deploy
    - onchanges:
      - git: config_repository
```

`git.latest` manages the remote, branch, and submodules and behaves correctly under `test=True`. `file.managed` takes care of the hook. The post-deploy script runs via `onchanges` only when the repository has actually changed. Whatever the standard states don't cover should be encapsulated in a specialized module with an explicit model of current and desired state.

## Example 5. Non-deterministic rendering

Another telling case is computing a random value during rendering:

```jinja
certificate_reload_schedule:
  cron.present:
    - name: rebuild-certificate && restart-service
    - minute: {{ range(6, 54) | random }}
    - hour: 6
```

With identical Pillar and grains, two runs can compile different states. The first highstate sets one minute value, the second sets another, and the third changes the schedule yet again.

This breaks reproducibility, highstate predictability, dry-run stability, the ability to explain where a value came from, and the guarantee of no changes on repeated application.

If tasks really need to be spread out over time, the value must be deterministic. The simplest option is a stable function of the node ID:

```jinja
    - minute: {{ salt['random.seed'](48, hash=grains['id']) + 6 }}
```

Each node gets its own minute in the 6–53 range, but for any given node it doesn't change between runs. Other options are passing the minute explicitly through Pillar or delegating the distribution to an external scheduler.

Randomness on every render is not a desired state.

## Example 6. External data via `cmd.run` and `curl` during rendering

Sometimes a formula fetches its data right in the template by calling an HTTP API through the shell:

```jinja
{% set backends = salt['cmd.run'](
     'curl -s https://inventory.example.com/api/backends?role=web'
   ) | load_json %}

{% for backend in backends %}
upstream_{{ backend.name }}:
  file.managed:
    - name: /etc/nginx/upstreams/{{ backend.name }}.conf
    - source: salt://nginx/files/upstream.conf.j2
    - template: jinja
    - context:
        address: {{ backend.address }}
{% endfor %}
```

It looks compact, but this code has several problems at once:

- the request runs on the minion on every render, including under `test=True` and `state.show_sls`;
- the rendering result depends on the availability and current response of an external service, so identical Pillar and grains no longer produce an identical state graph;
- `curl -s` without `--fail` returns an error body or an empty string, and the formula either crashes while parsing JSON or silently generates zero states;
- there's no timeout, no retries, and no error handling, and the API token has to live on the command line, where it ends up in logs and the process list;
- the data can't be substituted in tests without spinning up the real service.

External data should come into the formula as input, not be fetched by the template. The most direct way is to fetch it on the master via `ext_pillar`:

```yaml
# /etc/salt/master.d/ext_pillar.conf
ext_pillar:
  - http_json:
      url: https://inventory.example.com/api/backends?role=web
      namespace: inventory
```

Then the SLS only reads data that has already been prepared:

```jinja
{% set backends = salt['pillar.get']('inventory:backends', []) %}

{% for backend in backends %}
upstream_{{ backend.name }}:
  file.managed:
    - name: /etc/nginx/upstreams/{{ backend.name }}.conf
    - source: salt://nginx/files/upstream.conf.j2
    - template: jinja
    - context:
        address: {{ backend.address }}
{% endfor %}
```

If you need custom request logic — authentication, pagination, filtering, response normalization — it's worth moving it into your own ext_pillar module or execution module with an explicit timeout, error handling, and unit tests:

```python
def get_backends(role, timeout=10):
    """Return normalized list of backends for the given role.

    Raises CommandExecutionError if the inventory API is unavailable.
    """
```

Either way, the template only answers the question of which upstream files should exist, while fetching and validating external data lives in code that can be tested and that reports errors explicitly.

## Counterexample: a condition that stays declarative

Not every branch needs to be moved out of SLS. For example, choosing between a pinned and the latest version of a package still describes desired state:

```jinja
service_package:
{% if package_version == 'latest' %}
  pkg.latest:
    - name: service-package
{% else %}
  pkg.installed:
    - name: service-package
    - version: {{ package_version }}
{% endif %}
```

Both branches answer the same question: which version of the package should be installed. They don't implement manual state discovery, don't build a deployment workflow, and don't stand in for a state module.

Likewise, simple loops that generate similar declarations and conditions that include an extra config file are perfectly fine. The requirement isn't the absence of logic altogether — it's preserving the declarative model.

## Where logic should live

So that the line doesn't depend on the personal taste of whoever wrote the formula, it helps to split responsibility by component type.

### SLS

SLS is responsible for declaring desired state, composing states, requisites between resources, simple conditional inclusion of states, and generating similar declarations from prepared data.

SLS shouldn't implement the model of a managed resource or a complex data-preparation algorithm on its own.

### Pillar

Pillar holds input data: environment parameters, versions, topology, resource lists, feature flags, references to secrets, and values specific to a particular deployment.

Pillar is data, not a place for executable algorithms. That said, pillar files are rendered through Jinja too, and the same logic easily grows there: schema migrations, merging sources, `salt[...]` calls. Every rule in this post applies to pillar templates as well.

### Utility modules

Utility modules are the right place for pure functions: normalizing structures, migrating data schemas, merging configurations, validating and transforming values, computing derived parameters, building a shared model used by several SLS files.

That logic can be tested with ordinary unit tests, without rendering the whole formula.

### Execution modules

Execution modules are responsible for operations and for fetching data from the system or an external API: querying the current configuration, creating or modifying a resource, calling a specialized CLI or API, performing an operation that the standard Salt modules don't provide.

They expose a reusable Python API and hide the details of transport, parsing, and error handling.

### State modules

State modules connect current and desired state. They should fetch the current state, determine the required diff, support `test=True`, apply only the necessary changes, and return clear `result`, `changes`, and `comment` values.

If an SLS does all of this by hand through `cmd.run`, that's a strong sign of a missing state module.

### Salt Extensions

A Salt Extension is a way to package, version, and ship Salt's Python components — execution, state, utility, or runner modules, for example.

A Salt Extension isn't a separate kind of business logic. It lets logic that's been moved out of SLS have its own dependencies, tests, and lifecycle.

Salt also supports a simpler path: `_modules`, `_states`, and `_utils` directories right in the formula repository, distributed to minions via `saltutil.sync_all`. It's an officially supported approach, but in my view it isn't best practice: it mixes Python code with declarations and doesn't give you a clean architecture. Small, easily testable code can live there for a long time. But as soon as a module grows, picks up dependencies, or is needed by several formulas, it's worth moving it into an extension and testing it separately as ordinary Python code.

### Orchestration

Orchestration is responsible for workflows across nodes, roles, and external systems: rolling updates, taking a node out of the load balancer, stopping and starting components in a given order, waiting for readiness, data migrations, traffic switching, rollback, and coordinating multiple minions.

Orchestration describes a process. A regular formula describes the state of a single system or component.

## How this relates to the project's architectural layers

Distributing logic across technical components complements splitting a Salt project into three levels: Environment → Application Formula → Infrastructure Formula. An Infrastructure Formula manages a technology — packages, configuration, services, and generic resources — and knows nothing about customers or business applications. An Application Formula describes an application's infrastructure requirements through the contracts of infrastructure formulas. An Environment describes a specific deployment: which applications, on which nodes, in which versions, and with what topology.

Dependencies flow in one direction only, and no level uses SLS as a substitute for utility, execution, or state modules. This model will be covered in detail in a separate post.

## A practical test for SLS

Before adding a complex fragment to an SLS file, it's worth asking a few questions.

1. **Does the fragment describe an outcome or a procedure?** If it says which resource should exist, it's a candidate for SLS. If it describes steps, waits, transient states, and transition handling, it's probably a workflow.
2. **Is the data already prepared?** If the SLS just walks a ready-made structure and produces states, that's normal composition. If it migrates schemas, merges sources, and resolves conflicts, you need a separate normalization function.
3. **Who compares current and desired state?** If a state module does it, the separation holds. If the SLS runs a CLI, parses its output, and decides on its own whether to run the next command, it's imitating a state module.
4. **Does `test=True` work?** The user should see an accurate change plan without anything being applied. If that's impossible because of an opaque `cmd.run`, the resource model is in the wrong layer.
5. **Can the logic be tested independently?** Data transformation, validation, or dependency computation should be testable without rendering the full highstate. If you have to run the Salt renderer to check a pure function, it should be moved into Python.
6. **Does the same input produce the same result?** With identical Pillar, grains, and formula versions, the same state graph should be compiled. Randomness, the current time, and unstable ordering of external data break reproducibility.
7. **Does the code have its own lifecycle?** If a component needs its own dependencies, versioning, unit tests, and reuse across several formulas, it should be packaged as a module and distributed as a Salt Extension.

### How to check this in practice

Question 6 can be checked by comparing the compiled output of two runs:

```bash
salt-call --local state.show_lowstate --out=json > run1.json
salt-call --local state.show_lowstate --out=json > run2.json
diff run1.json run2.json
```

An empty diff means rendering is deterministic. Question 5 is covered by plain pytest: functions extracted into utility modules are tested directly, without the Salt renderer and without a running minion.

## Summary

SLS stays a readable declaration of state when input data has a clear contract, transformations and validation are moved into testable functions, operations are encapsulated in execution modules, comparison of current and desired state is done by state modules, multi-step processes live in orchestration, and identical input produces identical rendering output.

The point of this separation isn't to ban Jinja or to make every formula minimal at any cost, but to keep clear boundaries of responsibility. Each layer answers its own question:

- SLS — what state the system should be in;
- state module — how to detect drift and bring the resource to that state;
- utility and execution modules — how to prepare data and perform specialized operations;
- orchestration — in what order to coordinate changes across systems.

When these questions aren't mixed together in a single template, formulas are easier to test, safer to re-apply, and easier to evolve as the infrastructure grows.
