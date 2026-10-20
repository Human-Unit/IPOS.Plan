# Локальный polish редактора по брендбуку

Исторический отчёт о первом локальном проходе. Текущий редизайн, проверки и статус публикации описаны в [IPOS_PLAN_2.md](IPOS_PLAN_2.md); итоговые сведения ниже относятся к исходному проходу.

Источник: Figma `836q18CXC7jTT4FRrRQvUM`, Page 1. Проверены lockup `81:76`, эмблема `107:2`, страница Logo `1:375`, Typography `1:629`, палитра `1:342` / `1:336` и подписи соседних образцов.

| Токен                                | Источник / применение                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `#132FC1`, `#3A53D1`                 | Figma: институциональный синий, навигация, focus, primary actions                     |
| `#C11316`, `#D13A3D`                 | Figma: ИПОС, дедлайн и review                                                         |
| `#101010`, `#EEEEEE`, `#A6A4A4`      | Figma: заголовки, нейтральные поверхности и декоративные метки                        |
| `#17191D`, `#F7F7F5`, white          | Подтверждённые пользователем fallback tokens, читаемый текст и canvas                 |
| BL Melody SemiBold                   | Figma: только ориентир; production stack Arial / Helvetica сохранён                   |
| NT Somic Regular, 1.32 / −2%         | Figma Logo page: ориентир пропорций и интерлиньяжа, без загрузки шрифта               |
| Clear space около 18% ширины эмблемы | Logo page `1:375`: 81.157 px вокруг 447.711 px геометрии                              |
| Угловатая геометрия, тонкие правила  | Официальная эмблема и квадратные swatches; 4 px UI-radius — адаптация, не токен Figma |

Официальные SVG экспортированы через Figma connector, без редактирования байтов, recolor или ручной перерисовки. Эмблема: `340 × 421.4`, SHA-256 `fe15c7851ae3258af8fa076f12a757386230717d548fc48a9d57b75ca6d34c64`. Lockup: `1915.36 × 474.287`, SHA-256 `8da06fb7a230440cc23b1d2f917ec98e5ae6be92e2b2ac81602caa563cacade4`. В коде используются локальные файлы; временные asset URLs отсутствуют. Файлы шрифтов не добавляются.

## Принятые решения

- Одна крупная редактируемая идентичность плана; toolbar показывает рабочее пространство, а не повторяет длинный title. Совпадающий первый heading остаётся в данных, в редакторе компактный, в readonly скрыт.
- Outline ориентирован на задачи: primary row, сворачиваемые вложенные heading/reference/image/callout. Обычные параграфы и bullets не дублируются в навигации.
- Группировка действует до следующей task/divider в пределах siblings. Native inline-блоки не пересобираются и не перемещаются: сохраняется прямое редактирование, clipboard и undo. Для требований используются общий ритм и разделитель в конце группы; медиа без children показываются в колонке задачи.
- Инспектор без выбора показывает существующий title, реальные task counts, watermark и контакт/дату только если они присутствуют в содержимом/названии. Новые persistent поля не вводятся.
- Состояния task — существующие enum values, с небольшими semantic markers. Secondary commands находятся в меню; preview/share — основные действия.
- Watermark — официальная эмблема небольшого размера на периферии чтения. Состояние переключателя остаётся локальным UI state.
- Прямые URL raster-изображений в reference получают thumbnail; для Instagram/YouTube остаются аккуратный placeholder, исходный кликабельный URL и domain. Scraping, embeds, proxy и API не добавлены. При ошибке загрузки thumbnail возвращается placeholder.

## Проверка 13.10.2026

Browser skill/runtime отсутствует в доступных skills; использован локальный Chromium через Playwright, разрешённый запросом. Финальная проверка — `npm start` после production build, `http://127.0.0.1:3105/`. Проверено: dashboard → import → document → outline/selection/inspector → preview/share → viewer в другой вкладке.

| Проверка                                               | Результат                                                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| lint / typecheck / unit / build                        | PASS, 26 unit tests                                                                                                                    |
| Playwright                                             | PASS, 7 сценариев; исходные 6 сохранены, новый проверяет brand hierarchy, native editing, исходные IDs/JSON, thumbnail и keyboard menu |
| Page identity / meaningful content / framework overlay | PASS, правильные страницы и содержимое, overlay отсутствует                                                                            |
| Viewports                                              | PASS: 1920×1080, 1440×1000, 1024×768, 768×1024, 390×844                                                                                |
| Overflow / console / pageerror                         | PASS: horizontal overflow отсутствует; errors и warnings — 0                                                                           |
| Обзор плана / selected inspector / outline             | PASS: counts, реальный контакт, свойства, collapse/navigation, drawer/bottom sheet                                                     |
| Preview / viewer                                       | PASS: общий renderer, без editor chrome; refresh `/view#p=…` — HTTP 200                                                                |
| Совместимость                                          | PASS: исходные IDs, JSON v1, inline requirements, clipboard/undo, conflict handling, immutable snapshot, revisions/import/export       |
| SVG assets                                             | PASS: оба непустые, локальные; SHA-256 совпадает с исходными экспортами, aspect ratio сохранён                                         |

На одинаковом demoplan первая задача начинается на 449 px вместо 574 px до polish: около 22% более раннее начало. На QA-документе с реальными портретными референсами большая часть первого брифа помещается в 1440×1000.

Скриншоты вне репозитория: `C:/Users/ahmad/.codex/attachments/ipos-plan-brand-20261013/`. Основные: `editor-1440.png`, `selected-1440.png`, `editor-390.png`, `inspector-390.png`, `viewer-1440.png`, `viewer-390.png`. Фото и содержимое QA-документа не добавлены в demo seed, app assets или пользовательскую базу: использован отдельный временный browser context и перехват URL изображений.

### Намеренные отличия

- BL Melody / NT Somic не поставляются с приложением; остаётся production stack Arial / Helvetica. Пропорции и hierarchy взяты из Figma, UI spacing адаптирован к рабочему редактору.
- Брендбук — источник графики и палитры, а не макет web app. Размеры controls, semantic green для done, radius 4 px и responsive раскладка — адаптация для интерфейса.
- Текстовые companions сохраняют native inline flow. Группировка задаётся scoped CSS по исходным block IDs, без новых wrappers, DOM reparenting, атрибутов на управляемых узлах или преобразования текста в новый renderer.
- Совпадающий heading в редакторе остаётся доступным для изменения; readonly скрывает его визуально. Из JSON он не удаляется.
- Preview сохраняет авторскую навигацию возврата, export и share; edit commands отсутствуют. Shared viewer полностью лишён редакторских controls.
- Дата показывается только при наличии в title, контакт — только из содержимого. Эти данные не подменены фиктивными persistent полями. Watermark — preference текущего экрана; share codec не изменён.
- Dashboard и favicon не перерабатывались: область задачи — editor / preview / viewer.

## Изменённые файлы

- `src/app/globals.css` — tokens, плотность, typography, states, responsive layout.
- `src/components/editor/{document-structure,plan-cover,plan-outline,plan-renderer,block-inspector,media-content}` — presentation grouping, обложка, outline, свойства и ссылки.
- `src/components/editor/plan-actions-menu.tsx`, `plan-inspector.tsx` — новые UI-компоненты меню и обзора.
- `src/components/plan/official-brand.tsx`, `public/brand/student-council-{emblem,lockup}.svg` — официальные exports и пропорциональный wrapper.
- `src/components/task/task-card.tsx` — semantic statuses и brief presentation.
- `src/features/plans/editor-screen.tsx`, `src/features/sharing/viewer-screen.tsx` — toolbar и readonly branding.
- `tests/e2e/{workflow,regression,editor-layout}.spec.ts`, `actions.ts`, `brand-polish.spec.ts`; `tests/unit/document-structure.test.ts` — новые проверки и только необходимые изменения UI selectors / grouping expectations.
- `docs/BRAND_POLISH.md` — источник, решения и проверка.

Модель, база, use-plan/repository, share codec, dependencies и lockfile не изменены. Git: `main`, 14 изменённых и 8 новых файлов, staging пуст. Commit, push и deploy не выполнялись.

JSON v1, IndexedDB, share codec, revisions, task IDs, переносимый порядок/children и модель BlockNote не изменяются. Изменения остаются локальными для review; commit/push/deploy для этого прохода запрещены запросом пользователя.
