# Publishing rn-enterprise-cli so anyone can use it

You have two good options. Option A is the standard way ("anyone can install it");
Option B is faster if you just want to share it with a few people right now.

---

## Option A — Publish to the public npm registry (recommended)

Anyone will then be able to run:
```bash
npx rn-enterprise-cli create MyApp
# or
npm install -g rn-enterprise-cli
rn-enterprise create MyApp
```

### 1. Create an npm account (skip if you have one)
https://www.npmjs.com/signup

### 2. Check the name is available
```bash
npm view rn-enterprise-cli
```
If that returns "404 Not Found", the name is free. If it's taken, change
`"name"` in `package.json` to something unique, e.g. `@yourusername/rn-enterprise-cli`
(a "scoped" package — always available, just needs `--access public` on publish,
which is already set in `publishConfig`).

### 3. Fill in the placeholders
Edit `package.json` and replace:
- `"author"` — your name/email
- `"repository"`, `"homepage"`, `"bugs"` — your GitHub repo URL (create one and push this code — good practice even if you don't NEED it to publish)

Edit `LICENSE` and replace `YOUR NAME`.

### 4. Log in and publish
```bash
cd rn-enterprise-cli
npm login
npm publish
# if you used a scoped name (@yourusername/...):
npm publish --access public
```

### 5. Verify
```bash
npx rn-enterprise-cli create TestApp
```
from a totally different folder — if it prompts the wizard, you're live.

### Shipping updates later
Bump the version, then publish again:
```bash
npm version patch   # 1.0.0 -> 1.0.1 (or `minor`/`major`)
npm publish
```
This is also what powers the `rn-enterprise update` self-update command already
built into the CLI — it checks the npm registry for a newer version.

---

## Option B — Share it without publishing (GitHub only)

Push the `rn-enterprise-cli` folder to a public GitHub repo. Anyone can then run
it directly from the repo, no npm account needed on your end:
```bash
npx github:YOUR_GITHUB_USERNAME/rn-enterprise-cli create MyApp
```
or they clone it themselves:
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/rn-enterprise-cli.git
cd rn-enterprise-cli
npm install
node bin/cli.js create MyApp
```

---

## Before either option: a few things worth doing

- **Test a real install once** on a machine with normal internet access:
  `npm install` inside `rn-enterprise-cli/`, then `node bin/cli.js create TestApp`,
  then `cd TestApp && npm install` — confirms the whole chain works outside this
  sandboxed environment (I could only syntax-validate generated files here, not
  install real RN dependencies).
- **Add a CI badge / GitHub Actions for the CLI itself** (not just generated
  projects) if you want contributors — optional.
- **Consider semantic versioning discipline** once people depend on it: breaking
  changes to the wizard's question order or generated file layout should bump
  the major version.
