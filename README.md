# tofushawn.github.io

My archive. Built on [paper-dossier](https://github.com/TofuShawn/paper-dossier),
a multi-skin blog template.

```bash
npm install
npm run dev      # http://localhost:4321
npm run new      # scaffold a post
```

Deployed to GitHub Pages by `.github/workflows/pages.yml`, which runs
`npm run verify` before uploading — every route is asserted to serve a real
document before the artifact ships.

## Writing

See `WRITING.md`. In short: `npm run new -- --title "..."`, which writes the
frontmatter and a skeleton body into `src/content/posts/`.

## The template

This repo is a **copy** of the template, not a fork. It tracks the template as a
remote called `upstream`:

```bash
git fetch upstream
git merge upstream/main
```

Template changes come down that way. Anything under `src/content/posts/`,
`src/lib/site.ts`, or `public/` is mine and is never sent back upstream.

## Deployment

Docker is available for local preview but GitHub Pages is what serves this site.

```bash
docker compose up -d --build   # http://localhost:4323
```
