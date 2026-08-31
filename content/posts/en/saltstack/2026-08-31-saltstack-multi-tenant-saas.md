---
title: How We Stopped Copying Salt Formulas Between Customers
date: 2026-08-31
description: A SaltStack architecture for multi-tenant SaaS — three layers of responsibility that save you from copy-pasting between customer repos.
tags: saltstack, devops, saas, architecture
---

Imagine this: you have `billing` — a monolithic PHP application that needs RabbitMQ, Redis, MySQL, PHP-FPM, and a web server. The product is deployed separately for each customer. A second customer signs up, and the easiest path looks like this: copy the states folder, swap the password and the domain, deploy.

A year later you have five forks of the same code. Fixes made in one of them never make it into the others. Nobody can say for certain which version of the states is actually running in production for a given customer. And once you need to add a second application — `reporting`, which also depends on `billing` — it becomes clear that copy-pasting no longer scales.

## Where the problems start

Before talking about the solution, it's worth looking at where "let's just get it done quickly" usually leads.

**Copying formulas into every customer repository.** Fixes diverge, nobody can say which version of the code is actually deployed, and different customers end up with subtly different behavior without anyone intending it.

**A customer-level `cmd.run` instead of a proper state:**

```yaml
create-billing-user:
  cmd.run:
    - name: rabbitmqctl add_user billing password
```

It looks like a quick fix, but it breaks idempotency, makes password rotation painful, and smears RabbitMQ logic across customer projects instead of keeping it in one place.

**An infrastructure formula that knows about applications:**

```yaml
rabbitmq:
  billing_defaults:
    ...
```

The moment the RabbitMQ formula learns that `billing` exists, it stops being generic — and the next application that also needs RabbitMQ can no longer just reuse it.

**An application formula that knows about a specific customer:**

```jinja
{% if customer == "acme" %}
...
{% endif %}
```

This trap is more subtle: the first `if` looks harmless, but customer-specific exceptions tend to accumulate in the shared product until the formula turns into an unreadable tree of conditionals.

**Unbounded transitive dependencies** — when `billing-formula` pulls in an arbitrary version of `rabbitmq-formula` with nothing pinned. Salt itself doesn't manage this safely, so sooner or later one customer's production ends up running a version that was never actually tested.

All of these problems share one root cause: the code that manages a technology, the code that assembles an application, and a specific customer's data all live mixed together in the same place.

## The fix: three layers with a clear boundary of responsibility

Split those three things into separate repositories, fix the direction of dependencies, and the picture immediately gets simpler.

```text
Customer project
       │
       ▼
Application formula
       │
       ▼
Infrastructure formulas
```

Dependencies only flow downward. `rabbitmq-formula` knows nothing about `billing`. `billing-formula` knows nothing about the `acme` customer. The customer project doesn't implement RabbitMQ's internal logic — it only states *which* resources are needed and *where* they live.

### Layer 1 — infrastructure formulas

`rabbitmq-formula`, `redis-formula`, `mysql-formula`, `php-formula`, `nginx-formula` — each manages a single technology and has no idea which applications use it. The RabbitMQ formula can install the package, manage the service, plugins, vhosts, users, permissions, and policies — but it only ever accepts a generic data structure:

```yaml
rabbitmq:
  vhosts:
    /billing:
      present: true

  users:
    billing:
      password: secret
      tags: []

  permissions:
    billing@/billing:
      user: billing
      vhost: /billing
      configure: ".*"
      write: ".*"
      read: ".*"
```

A repository stays a formula even if it contains its own `_modules`, `_states`, and `_utils` — a separate Salt extension only makes sense when the extension is used by several independent formulas and has its own lifecycle. For most SaaS platforms, a regular SLS formula with internal extension modules alongside it is enough.

### Layer 2 — the application formula

`billing-formula` describes not a technology but a working instance of the product: PHP-FPM, configuration, systemd units for workers, migrations, health checks — and exactly which RabbitMQ/MySQL/Redis resources `billing` needs. It wires up the infrastructure formulas and translates application-level data (the app's user password, a queue name) into the structures the layer-1 formulas understand.

There's a fork in the road here: either the customer's Pillar builds the full interface for all formulas directly (approach A), or the application formula builds the infrastructure formulas' resources from its own, much simpler Pillar (approach B). The second option is usually more convenient — the customer project describes *what* `billing` needs, not *how* RabbitMQ is put together.

### Layer 3 — the customer's Salt project

`customer-acme-salt` is topology, targeting, the choice of applications and profiles (shared or dedicated), domains, feature flags, references to secrets, and pinned formula versions. This is the only place where customer-specific detail is allowed to exist. No `cmd.run`, no knowledge of RabbitMQ's internals — just data.

## When there are two applications and one RabbitMQ

Things get interesting once `billing` gets a neighbor — `reporting`, which depends on `billing` and has its own infrastructure requirements. There are two workable topologies here.

**A shared RabbitMQ cluster** with separate vhosts `/billing`, `/reporting`, and, if needed, `/integration` for cross-application communication. Simpler to operate, less hardware — but the customer's applications end up sharing an infrastructure resource to some degree.

**Separate RabbitMQ clusters** per application — full isolation, more expensive to maintain, and justified when reliability or load requirements differ significantly.

Choosing between them is no longer the concern of `rabbitmq-formula` or `billing-formula`. It's a decision made at the customer-project level: `shared` vs. `dedicated` is just one more parameter in Pillar.

The full picture for customer ACME with both applications:

```text
Customer ACME
│
├── billing
│   ├── PHP-FPM
│   ├── MySQL database: billing
│   ├── Redis namespace: billing
│   └── RabbitMQ vhost: /billing
│
├── reporting
│   ├── PHP-FPM
│   ├── MySQL database: reporting
│   ├── Redis namespace: reporting
│   └── RabbitMQ vhost: /reporting
│
└── shared services
    ├── RabbitMQ cluster
    ├── MySQL cluster
    └── Redis cluster
```

And the dependency graph at the repository level mirrors the architecture we started with:

```text
customer-acme-salt
├── billing-formula
│   ├── php-formula
│   ├── mysql-formula
│   ├── redis-formula
│   └── rabbitmq-formula
│
├── reporting-formula
│   ├── php-formula
│   ├── mysql-formula
│   ├── redis-formula
│   └── rabbitmq-formula
│
└── customer-specific Pillar
```

## Keeping secrets out of the logic

One more rule that follows naturally: secrets don't live as plain text in Git. The source can be Salt Pillar with a GPG renderer, Vault, SOPS, or any external Pillar the organization already runs — either way, the application formula receives an already-resolved value or a standardized reference, never a Vault access token itself:

```yaml
billing:
  secrets:
    mysql_password:
      source: vault
      path: customers/acme/billing
      key: mysql_password
```

The specific renderer implementation is a detail that shouldn't leak above the customer-project layer.

## What to take away from this

Boiled down to practical rules:

1. RabbitMQ, Redis, MySQL, PHP, and Nginx are separate infrastructure formulas that know nothing about applications.
2. Each SaaS component is its own application formula with its own public Pillar interface.
3. Transitive dependencies are never auto-loaded — versions get pinned at the customer or build level.
4. Customer Pillar is only responsible for topology, settings, and secret references — never for a technology's internal logic.
5. The Pillar interface and public state IDs should be treated as a versioned API, not an internal implementation detail.
6. Formulas go through CI before their version reaches a customer installation.
7. Customer-specific exceptions stay in the customer project — they never leak into infrastructure or application formulas.

Put together, the overall scheme looks like this:

```text
                    VERSIONED BUILD / LOCK
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Client Salt Project                                          │
│ topology + targeting + customer Pillar + secrets references │
└─────────────────────────────┬────────────────────────────────┘
                              │ includes
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Application Formulas                                         │
│ billing-formula + reporting-formula                          │
│ product composition + application resources + integration   │
└─────────────────────────────┬────────────────────────────────┘
                              │ uses
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Infrastructure Formulas                                      │
│ RabbitMQ + Redis + MySQL + PHP + Nginx                       │
│ generic technology lifecycle and resources                  │
└──────────────────────────────────────────────────────────────┘
```

Three simple questions, spread across three layers — "how do you manage RabbitMQ," "which RabbitMQ resources does billing need," and "where is ACME's RabbitMQ, shared or dedicated" — and copy-pasting between customer repositories simply stops being necessary.
