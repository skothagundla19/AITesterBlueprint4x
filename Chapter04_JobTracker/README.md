# JobTracker — Personal command center

A local-first Kanban board for tracking job applications. Everything is stored in your
browser's IndexedDB — no backend, no account, no data leaving your machine.

## Run it

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL. To build a static production bundle:

```bash
npm run build
npm run preview
```

## What's inside

- **React 18 + Vite** — functional components, hooks only.
- **Tailwind CSS** — custom design tokens in `tailwind.config.js` (colors, fonts, shadows).
- **`idb`** — thin async wrapper around IndexedDB (`src/db.js`). Two object stores:
  `jobs` and `resumes` (the latter powers the resume-name autocomplete even after a
  card using it is deleted).
- **`@dnd-kit/core` + `@dnd-kit/sortable`** — drag-and-drop between and within columns.
- **`lucide-react`** — icon set.

## Structure

```
src/
  db.js                 IndexedDB access (idb)
  hooks/useJobs.js       CRUD + in-memory state, kept in sync with IndexedDB
  lib/export.js          JSON backup export/import, date-diff helper
  components/
    Header.jsx           brand, theme toggle, insights/export/import/add actions
    Hero.jsx              headline + total roles / in progress / offers stats
    Toolbar.jsx            search, filters panel (status, resume, reminders)
    Board.jsx              DndContext + column layout
    Column.jsx             one Kanban column, droppable + sortable list
    JobCard.jsx            one job card, draggable via its grip handle
    JobModal.jsx           add/edit dialog with validation
    Insights.jsx           pipeline stats, status distribution, resume usage
    ConfirmDialog.jsx      delete confirmation
```

## Data model

Each job record:

```js
{
  id, company, title, url, resume, dateApplied, followUpDate,
  salary, notes, status, position, createdAt, updatedAt
}
```

`status` is one of `wishlist | applied | followup | interview | offer | rejected`.
`position` is a per-column integer used for manual drag ordering; each column can also
be toggled to sort by newest/oldest applied date without touching stored order.

## Backup

The download icon in the header exports every job and every known resume name as a
single JSON file. The upload icon replaces your current board with the contents of a
previously exported file — it's a full replace, not a merge, so export first if you
want to keep what's currently there.
