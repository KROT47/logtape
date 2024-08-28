import { defineConfig } from "vitepress";
import { jsrRef } from "markdown-it-jsr-ref";
import { Presets, SingleBar } from "cli-progress";

const progress = new SingleBar({}, Presets.shades_classic);
let started = false;

const jsrRefVersion = process.env.CI === "true" ? "stable" : "unstable";

const jsrRefPlugin = await jsrRef({
  package: "@logtape/logtape",
  version: jsrRefVersion,
  cachePath: ".jsr-cache.json",
  progress: (complete: number, total: number) => {
    if (started) progress.update(complete);
    else {
      started = true;
      progress.start(total, complete);
    }
  },
});

const MANUAL = {
  text: "Manual",
  items: [
    { text: "Installation", link: "/manual/install" },
    { text: "Quick start", link: "/manual/start" },
    { text: "Categories", link: "/manual/categories" },
    { text: "Contexts", link: "/manual/contexts" },
    { text: "Sinks", link: "/manual/sinks" },
    { text: "Filters", link: "/manual/filters" },
    { text: "Testing", link: "/manual/testing" },
  ],
};

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "LogTape",
  description:
    "Simple logging library with zero dependencies for Deno, Node.js, Bun, browsers, and edge functions",
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "What is LogTape?", link: "/intro" },
      MANUAL,
      { text: "API references", link: "https://jsr.io/@logtape/logtape" },
    ],

    sidebar: [
      { text: "What is LogTape?", link: "/intro" },
      { text: "Changelog", link: "/changelog" },
      MANUAL,
    ],

    socialLinks: [
      {
        icon: {
          svg:
            '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>JSR</title><path d="M3.692 5.538v3.693H0v7.384h7.385v1.847h12.923v-3.693H24V7.385h-7.385V5.538Zm1.846 1.847h1.847v7.384H1.846v-3.692h1.846v1.846h1.846zm3.693 0h5.538V9.23h-3.692v1.846h3.692v5.538H9.231V14.77h3.692v-1.846H9.231Zm7.384 1.846h5.539v3.692h-1.846v-1.846h-1.846v5.538h-1.847z"/></svg>',
        },
        link: "https://jsr.io/@logtape/logtape",
        ariaLabel: "JSR",
      },
      { icon: "npm", link: "https://www.npmjs.com/package/@logtape/logtape" },
      { icon: "github", link: "https://github.com/dahlia/logtape" },
    ],

    search: {
      provider: "local",
    },
  },
  markdown: {
    config(md) {
      md.use(jsrRefPlugin);
    },
  },
});