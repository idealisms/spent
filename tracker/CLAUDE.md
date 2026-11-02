# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
yarn start        # Dev server with hot reload (port 8080)
yarn build        # Production build
yarn test         # Run unit tests (Vitest)
yarn test:e2e     # Run Puppeteer e2e tests
yarn test:watch   # Watch mode for tests
yarn typecheck    # tsc --noEmit (TypeScript 7)
yarn prettier     # Format code
```

## Architecture Overview

**Spent Tracker** is a React expense tracking app that syncs data to Dropbox.

**Stack:** React 19, Redux 5, TypeScript 7, MUI 9, React Router 7, Dropbox API. Built with webpack 5 + esbuild-loader (no type-checking in the build; run `yarn typecheck`). Tests: Vitest (unit) and Puppeteer (e2e). Dependency upgrade history/status: `PACKAGES.md`.

**Redux State Shape:**

- `auth` - Dropbox OAuth tokens
- `settings` - Spend targets, report categories, cloud sync state
- `transactions` - Transaction data with tags and categories

## Module Structure

The app uses a module-based organization in `app/`:

```
app/
├── auth/          # Authentication (Dropbox OAuth)
├── main/          # Core app: Daily/Monthly views, Reports, Editor
├── transactions/  # Transaction components and data model
├── index.tsx      # Entry point (React createRoot)
├── muiTheme.ts    # MUI theme configuration
└── store.*.ts     # Redux store (dev/prod variants)
```

Each module follows the pattern:

- `model.ts` - TypeScript interfaces and state shape
- `actions.ts` - Action creators and thunks
- `reducers.ts` - Redux reducer
- `components/` - React components

## Key Patterns

**Component Props Pattern:**

```typescript
interface IOwnProps {}
interface IAppStateProps {} // mapStateToProps
interface IDispatchProps {} // mapDispatchToProps
type IProps = IOwnProps & IAppStateProps & IDispatchProps;
```

**Styling:** Uses `tss-react/mui` with `makeStyles()` hook:

```typescript
const useStyles = makeStyles()((theme: Theme) => ({
  root: { ... }
}));
```

**Transaction Model:** Transactions have tags that map to categories via `TAG_TO_CATEGORY`. Categories display as emoji via `categoryToEmoji()`.

## Routes

Defined in `app/main/components/RoutePaths.ts`:

- `/login` - Dropbox login
- `/auth` - OAuth callback
- `/` - Daily spending view
- `/monthly` - Monthly view
- `/report` - Annual report
- `/editor` - Transaction editor

## Testing

Unit tests use Vitest with Jest-style globals (`describe`/`it`/`expect`, `vi.fn()`/`vi.mock()` for mocks) and live in `__test__/` directories. Run a single test file:

```bash
yarn test app/transactions/__test__/utils.spec.ts
```

## Cloud Sync

Data persists to Dropbox via `actions.ts` thunks. The `ICloudState` enum tracks sync status (Done, Modified, Uploading).
