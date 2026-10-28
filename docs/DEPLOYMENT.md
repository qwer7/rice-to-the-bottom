# Запуск и публикация

Актуально на **28 октября 2026**. Автопубликация включена и проверена: [Check and release #2](https://github.com/qwer7/rice-to-the-bottom/actions/runs/40729373875) успешно выпустил коммит `0967f7e8c9975f5f87d481b6dccb0786539bf763` в Supabase и Cloudflare Pages. Сборка, тесты и миграции на временной БД прошли. На рабочей БД dry-run сообщил `Remote database is up to date.`; существующие миграции повторно не выполнялись.

После выпуска проверены открытие сайта, создание отдельного лобби и его восстановление после refresh. Полная партия с двух физических устройств и повторная установка APK в этот выпуск не проверялись.

## Действующая установка

| Ресурс | Значение |
| --- | --- |
| Репозиторий | [qwer7/rice-to-the-bottom](https://github.com/qwer7/rice-to-the-bottom), ветка `main` |
| Сайт | [race-to-the-bottom-36n.pages.dev](https://race-to-the-bottom-36n.pages.dev/) |
| Доска телевизора | [сайт с ?screen=tv](https://race-to-the-bottom-36n.pages.dev/?screen=tv) |
| Вход игрока | `https://race-to-the-bottom-36n.pages.dev/?room=ABC234`, где `ABC234` — код лобби |
| Cloudflare Pages | Проект `race-to-the-bottom`, account ID `806aaf29a852219841f5004be3cd5948` |
| Cloudflare | [панель проекта](https://dash.cloudflare.com/806aaf29a852219841f5004be3cd5948/pages/view/race-to-the-bottom), production branch `main` |
| Supabase | Проект `race-to-the-bottom`, ref `iqtaucnbzxwrpoaohtkx`, организация `Alexey` |
| Supabase | [панель проекта](https://supabase.com/dashboard/project/iqtaucnbzxwrpoaohtkx), API `https://iqtaucnbzxwrpoaohtkx.supabase.co` |
| Владелец облачных панелей | `trofitroll@gmail.com`; Cloudflare показывает `Trofitroll@gmail.com's Account` |
| Исходники на текущем Mac | `/Users/once/projects/race to the bottom` |

Vue/Vite собирает статические файлы в `dist/`. Cloudflare раздаёт их; игровые функции, Auth, PostgreSQL и Realtime работают в Supabase. Android TV открывает тот же сайт через WebView. Устройство сервера — в [SUPABASE_SETUP.md](SUPABASE_SETUP.md), APK — в [ANDROID_TV.md](ANDROID_TV.md).

Имя проекта Pages отличается от домена: для команды публикации нужно `race-to-the-bottom`, для игроков и QR — постоянный адрес с `-36n`. Адреса отдельных развёртываний предназначены для проверки конкретной сборки.

## Локальная разработка

Нужны Node.js и npm; GitHub Actions использует Node.js 22. Из корня проекта:

```sh
npm ci
```

На новом компьютере создать `.env.local` по `.env.example`; существующий файл не перезаписывать:

```dotenv
VITE_SUPABASE_URL=https://iqtaucnbzxwrpoaohtkx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<публичный Publishable key проекта>
```

Публичный ключ взять в панели API Keys Supabase. Он включается в клиентскую сборку. Пароль базы, Secret key и `service_role` в `VITE_*` недопустимы.

```sh
npm run dev -- --host 0.0.0.0
```

Открыть адрес Vite, обычно `http://localhost:5173/`. На телефоне в той же сети использовать IP компьютера и порт Vite. Для ТВ-режима добавить `?screen=tv`. С этими настройками локальный клиент подключается к рабочему Supabase: тестировать в отдельном лобби. QR ведёт на публичный сайт.

Перед отправкой изменений:

```sh
npm test
npm run build
```

Сборка включает проверку TypeScript. Готовый `dist/` можно проверить через `npm run preview -- --host 0.0.0.0`. Значения `VITE_*` фиксируются при сборке; их изменение требует новой публикации.

## Обычное обновление через GitHub

1. Подготовить изменения в отдельной ветке, проверить локально и открыть pull request.
2. Дождаться jobs `Tests and frontend build` и `Validate migrations on a disposable database`.
3. Выполнить merge в `main`. Прямой push в `main` также запускает выпуск, поэтому туда отправлять только готовые изменения.
4. Проверить [Actions](https://github.com/qwer7/rice-to-the-bottom/actions): все три jobs должны завершиться успешно.
5. Проверить новый **Production** deployment в Cloudflare и игру по постоянному адресу.

Workflow: [release.yml](../.github/workflows/release.yml). На PR выполняются только проверки, без производственных ключей. Временная БД runner создаётся и сбрасывается отдельно от рабочей базы. При push в `main` или ручном запуске после проверок выполняются:

1. Проверка настроек и production-сборка сайта.
2. Подключение Supabase и `db push --linked --dry-run`.
3. Применение только новых миграций.
4. Публикация трёх Edge Functions с JWT-настройками из `supabase/config.toml`.
5. Загрузка `dist/` в существующий Pages-проект с `--branch=main` и запись SHA выпуска.

Одновременные выпуски одной ветки исключены, текущая миграция не отменяется следующим push. Job публикации использует environment `production`; при включении approval rule в настройках environment потребуется ручное одобрение. APK этот workflow не собирает.

Для выпуска без нового коммита: **Actions → Check and release → Run workflow → main → Run workflow**. Повторный запуск использует настройки на момент запуска; уже применённые миграции пропускаются.

## Настройки GitHub

Все три секрета и семь repository variables добавлены 28 октября 2026. Значения секретов хранятся только в GitHub: [Settings → Secrets and variables → Actions](https://github.com/qwer7/rice-to-the-bottom/settings/secrets/actions).

| Repository secret | Что хранится |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Токен аккаунта с доступом к рабочему проекту Supabase |
| `SUPABASE_DB_PASSWORD` | Текущий пароль PostgreSQL рабочего проекта, не пароль входа в Supabase |
| `CLOUDFLARE_API_TOKEN` | Токен с `Account → Cloudflare Pages → Edit`, ограниченный указанным аккаунтом |

`service_role` в GitHub не нужен: функции получают его из окружения Supabase. При смене пароля базы или токена обновить соответствующий secret. Значения не добавлять в документы, коммиты или чат.

| Repository variable | Текущее значение / источник |
| --- | --- |
| `SUPABASE_PROJECT_ID` | `iqtaucnbzxwrpoaohtkx` |
| `VITE_SUPABASE_URL` | `https://iqtaucnbzxwrpoaohtkx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Публичный ключ этого проекта; `.env.local` / панель API Keys |
| `CLOUDFLARE_ACCOUNT_ID` | `806aaf29a852219841f5004be3cd5948` |
| `CLOUDFLARE_PAGES_PROJECT` | `race-to-the-bottom` |
| `MIGRATION_BASELINE_VERIFIED` | `true` |
| `DEPLOY_ENABLED` | `true` |

Именно **repository variables**, а не environment variables: `DEPLOY_ENABLED` проверяется до входа в environment.

Для временной остановки новых публикаций изменить `DEPLOY_ENABLED` на `false`. Проверки продолжатся, уже запущенный выпуск это не остановит. Вернуть `true` после устранения причины.

## История и новые миграции

Шесть исходных SQL-файлов выполнялись вручную. **28 октября 2026** рабочие таблицы, функции, индексы, политики и права сверены с файлами; в `supabase_migrations.schema_migrations` записаны шесть подтверждённых версий. Для служебной таблицы включён RLS. Успешный CLI dry-run в первом выпуске подтвердил согласованность истории. Повторять регистрацию этих версий не нужно.

| Версия | Изменение |
| --- | --- |
| `20261014000000` | `multiplayer` |
| `20261022000000` | `lobby_and_cards` |
| `20261022000001` | `conflict_retry` |
| `20261022000002` | `atomic_turns_and_hubs` |
| `20261023000000` | `short_hub_keys` |
| `20261023000001` | `display_lobbies` |

Новые изменения схемы добавлять отдельным файлом в `supabase/migrations/`, вместе с совместимыми изменениями сервера и клиента. Уже применённые файлы не редактировать. PR проверит последовательное применение файлов к пустой временной БД; это не заменяет проверку обновления базы с существующими данными.

Для ручной диагностики из корня проекта:

```sh
npx supabase login
npx supabase link --project-ref iqtaucnbzxwrpoaohtkx
npx supabase migration list
npx supabase db push --linked --dry-run
```

На текущем исходном состоянии ожидается отсутствие новых миграций. При расхождении остановить публикацию и сверить схему. `migration repair <версия> --status applied` меняет только историю: применять лишь после подтверждения, что конкретный SQL уже выполнен. Автоматический workflow repair не выполняет. Удалённый `db reset` для рабочей базы не использовать.

## Проверка выпуска и восстановление

После изменений открыть отдельное тестовое лобби: подключить два телефона, проверить лидерство, отправку ходов, раскрытие, следующий раунд и refresh. На ТВ обновить доску через меню пульта. Незавершённые семейные партии для проверки не использовать.

Общей транзакции между Supabase и Cloudflare нет. Если сайт не опубликовался, база и функции уже могут быть обновлены. Сохранять совместимость со старым клиентом и открытыми вкладками: сначала добавлять возможности, затем отдельно удалять старые. Перед разрушительными изменениями схемы нужен план и резервная копия данных.

При временной ошибке сервиса повторить неудачный job. В первом выпуске загрузка образа Supabase получила `Data limit exceeded`, затем CLI автоматически загрузил образ из другого registry и завершил выпуск; изменения кода для этого не потребовались. При повторяющейся ошибке сборки функций можно рассмотреть документированный [режим --use-api](https://supabase.com/docs/guides/functions/quickstart) отдельным изменением workflow.

Ручная публикация сайта — запасной путь: выполнить `npm ci`, `npm test`, `npm run build`, затем загрузить **содержимое** `dist/` через **Cloudflare Pages → Create deployment → Production**. Для ZIP из корня проекта:

```sh
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path('dist')
with ZipFile('/private/tmp/race-to-the-bottom-pages.zip', 'w', ZIP_DEFLATED) as archive:
    for item in sorted(root.rglob('*')):
        if item.is_file():
            archive.write(item, item.relative_to(root))
PY
```

В корне архива должны быть `index.html` и `assets/`, без внешней папки `dist`, исходников и секретов. Загрузка ZIP обновляет только сайт; функции и миграции она не выпускает. Для отката сайта повторно опубликовать предыдущую проверенную сборку; откат сайта не откатывает БД и функции. Для схемы обычно нужна новая исправляющая миграция.

Сохранять исходники, lockfile, резервную копию данных Supabase, предыдущую веб-сборку и ключ подписи APK. Git не является резервной копией данных партий. Workflow пока использует major-теги Actions и CLI `latest`; фиксация проверенных SHA/версии остаётся отдельной задачей.

## Перенос и типовые проблемы

Для смены публичного домена изменить `PUBLIC_GAME_URL` в `src/lib/joinLink.ts`, настройки хостинга и `APP_HOST` в Android-оболочке. Сайт пересобрать и опубликовать, APK пересобрать по [ANDROID_TV.md](ANDROID_TV.md). Новый origin не переносит автоматически cookie и анонимные сессии. Для нового Supabase-проекта см. [SUPABASE_SETUP.md](SUPABASE_SETUP.md); локальную `.env.local` и repository variables нужно обновить согласованно.

| Симптом | Что проверить |
| --- | --- |
| Сборка не получила настройки | Имена secrets/variables и совпадение URL с project ref |
| Отказ подключения к БД | Актуальность `SUPABASE_DB_PASSWORD`, статус проекта и журналы CLI |
| Pages API отклоняет запрос | Аккаунт и право `Cloudflare Pages: Edit` токена |
| Сайт не открывается / `ERR_QUIC_PROTOCOL_ERROR` | Сеть и VPN на устройстве; сравнить с другой сетью |
| Долго «Подключаемся» / JWT error | Anonymous sign-ins, сессию, конфигурацию JWT и журналы Edge Functions |
| Старый интерфейс | Успешный production deployment нужного SHA, постоянный адрес и refresh |
| QR ведёт не туда | `PUBLIC_GAME_URL`, код активного лобби и свежую клиентскую сборку |

Описание механизма: [Cloudflare Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Supabase Functions CI](https://supabase.com/docs/guides/functions/deploy), [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations).
