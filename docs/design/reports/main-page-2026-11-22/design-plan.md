software — IPOS.Plan content-planning workspace for the student council media sector.

Design: retain the shipped institutional blue palette, Montserrat headings and Inter UI. Compact overview rather than a full-screen marketing hero; neutral library surface; existing emblem; existing theme switch and motion. The user specifically requested less empty space and more readable small text. A random palette, full-screen sections, stock images, shader, scene or decorative scroll moment would work against that request. These marketing-page recipes are intentionally not added to the working dashboard.

Voice: facts only; Russian operational labels; plan, task, assignee, deadline and backup retain their existing meanings. No invented claims, metrics, people or photographs.

Copy first: h1 Контент-планы; description Задачи, тексты и сроки медиасектора — в одном плане.; primary Новый план; library Сохранённые планы; visible field labels Поиск по библиотеке and Показать планы. Existing local-storage disclosure and safety dialogs remain.

Composition:
- App bar: brand left, existing owner-workspace link and theme controls right, same outer edges as the library; keyboard skip link.
- Overview: heading and primary action above real library-wide task counts. Content determines height; compact two-column counts on mobile.
- Library: real plan rows, visible search/filter labels, backup and JSON import. Titles 22px desktop / 20px phone, summaries 16px, supporting text 14px. Minimum 44px actions and 48px search/filter fields.
- Names and storage: existing disclosure, readable at 16px / 14px respectively. No fake content to fill a sparse library.

Motion: preserve the existing short load entrance, data-change transitions, count updates and theme wave; rows lift 2px on hover, fine-pointer buttons step/press. Reduced motion retains the existing application behavior.

Protected: IndexedDB and data formats; demo seed; search and filters; create/open/edit/duplicate/delete; backup/restore; owner workspace and published pages; editor typography; immutable share; JSON/DOCX and A4 print. No dependencies or backend changes.

Baseline: design/student-council-impeccable at f75fe7e. Previous worktree clean. Before screenshots show the existing bundled demo in isolated Chrome profiles. Profiles and generated checks live in ignored .taste-skill or the OS temp folder. Real browser profiles are not used.

Verification: skill consistency, layout, screenshots, perf and finish gate; repository lint, typecheck, unit tests, production build and existing end-to-end tests. Marketing-only findings are reported separately from real overflow, contrast, focus and interaction defects; no checker is edited or hidden from.