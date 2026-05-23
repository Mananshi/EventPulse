// Tells TypeScript to treat CSS file imports as valid modules.
// Without this, `import './App.css'` causes a type error because
// TypeScript only understands JS/TS modules by default.
declare module '*.css';
