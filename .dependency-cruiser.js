/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Zirkuläre Abhängigkeiten sind verboten',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Keine ungenutzten Module (außer index.ts/Einstiegspunkte)',
      from: {
        orphan: true,
        pathNot: '\\.d\\.ts$',
      },
      to: {},
    },
    {
      name: 'no-infra-in-orchestrator-core',
      severity: 'error',
      comment: 'Orchestrator-Core darf keine Infrastruktur importieren',
      from: {
        path: '^packages/orchestrator-core',
      },
      to: {
        path: ['express', 'better-sqlite3', 'bullmq', 'ioredis', '@octokit', 'dockerode'],
      },
    },
    {
      name: 'no-http-in-domain',
      severity: 'error',
      comment: 'Domain- und Shared-Packages dürfen nicht von Express/HTTP abhängen',
      from: {
        path: '^packages/(shared|orchestrator-core|run-state)',
      },
      to: {
        path: ['express', 'bullmq'],
      },
    },
    {
      name: 'not-to-apps-from-packages',
      severity: 'error',
      comment: 'Packages dürfen nicht von Apps abhängen',
      from: {
        path: '^packages/',
      },
      to: {
        path: '^apps/',
      },
    },
    {
      name: 'no-test-fixtures-in-production-code',
      severity: 'warn',
      comment: 'Test-Fixtures und Mocks nicht in Produktionscode importieren',
      from: {
        pathNot: ['__tests__', '__contracts__', '__fixtures__', '\\.test\\.', '\\.spec\\.'],
      },
      to: {
        path: ['fake-adapter', 'smoke\\.test', '__fixtures__'],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled'],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    exclude: {
      path: 'node_modules|dist|coverage|\\.d\\.ts$',
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      archi: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },
  },
};
