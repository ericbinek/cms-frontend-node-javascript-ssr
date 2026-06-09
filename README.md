# schema.org aligned CMS Frontend (JavaScript on Node.js)

[![Tests](https://github.com/ericbinek/cms-frontend-node-javascript-ssr/actions/workflows/test.yml/badge.svg)](https://github.com/ericbinek/cms-frontend-node-javascript-ssr/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Status](https://img.shields.io/badge/status-work_in_progress-orange.svg)
![Build in public](https://img.shields.io/badge/build-in_public-ff69b4.svg)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Node.js 24](https://img.shields.io/badge/Node.js-24-green.svg)

A server rendered web frontend for a schema.org aligned CMS, written in plain JavaScript on Node.js 24.

There is nothing to install: no `npm install`, no `node_modules`, no client framework. It serves semantic HTML from `node:http`, with ES modules in the browser and no build step.

It renders list, detail, and create, edit, and delete views for 10 schema.org entity types such as BlogPosting, Person, and WebPage, talking to the CMS API over HTTP.

A conformance test suite defines the markup and behavior.

## Status: work in progress (v0.1.0)

This is an ongoing build-in-public project, shared only for community and communication purposes. Do not deploy it in production. Do not rely on its interfaces or data format remaining stable.

## No node_modules

There is no `package-lock.json` full of transitive dependencies and no `node_modules` to audit. The runtime is Node's standard library: `node:http`, `node:fs`, `node:test`. `npm test` just calls `node --test`. Clone it and run it.

## Requirements

- Node.js 24 or newer

## Installation

```sh
git clone https://github.com/ericbinek/cms-frontend-node-javascript-ssr.git
cd cms-frontend-node-javascript-ssr
cp .env.example .env
```

## Running

```sh
node src/server.mjs
```

The server listens on `PORT` (default 4000).

## Usage

Open http://localhost:4000/ in a browser. Each entity has a list view at `/<plural>`,
a detail view at `/<plural>/:id`, and create/edit/delete flows.

Configure the upstream API via the `API_BASE_URL` environment variable.

## Entities

- `BlogPosting`
- `Person`
- `WebPage`
- `ImageObject`
- `CategoryCode`
- `CategoryCodeSet`
- `DefinedTerm`
- `DefinedTermSet`
- `Comment`
- `WebSite`

## Testing

```sh
node --test "test/*.test.mjs"
```

## Contributing

Contributions are welcome. This is a build-in-public project, so issues, questions, and ideas count as much as pull requests. If you send code, keep it on Node's built in modules with no new dependencies, use ES modules, and keep the conformance suite green, since the tests are the contract. Run them with `node --test "test/*.test.mjs"`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guidelines.

## License

MIT. See [LICENSE](LICENSE).
