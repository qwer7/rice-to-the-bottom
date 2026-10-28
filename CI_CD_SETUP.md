# GitHub → Supabase → Cloudflare

Workflow: [.github/workflows/release.yml](.github/workflows/release.yml).
Статус: подготовлен локально; облачные доступы и первый запуск ещё не проверены.

## Как работает

- Pull request: тесты, проверка TypeScript/сборки, применение миграций к одноразовой локальной Supabase в GitHub runner. Без производственных ключей и публикации.
- Push в `main`: те же проверки, затем публикация при repository variable `DEPLOY_ENABLED=true`.
- Ручной запуск: Actions → Check and release → Run workflow → main.
- Порядок: production-сборка → новые миграции → Edge Functions → Cloudflare Pages. Ошибка останавливает последующие шаги.
- Одновременные публикации main исключены; выполняющаяся миграция не отменяется новым push.
- Публикация использует environment `production`; при желании в его настройках можно включить ручное одобрение. Без approval rule публикация автоматическая.
- Сайт остаётся в прежнем Direct Upload-проекте и на прежнем домене. APK не меняется и не публикуется этим workflow.
- Содержимое партий не загружается из Git: только новые изменения схемы и код. `db reset --local` в проверке относится исключительно к одноразовой БД runner, не к рабочей базе.

## 1. Привязать GitHub

Если репозиторий ещё не создан, создать пустой, желательно private, без README/license/gitignore: локальная история уже существует. Если репозиторий уже содержит коммиты, сначала просмотреть и согласовать истории — не использовать force push.

На странице репозитория: Code → HTTPS → скопировать URL. Далее в каталоге проекта:

```sh
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

Подставить настоящий URL. Если origin уже настроен, сначала `git remote -v`, затем при необходимости `git remote set-url origin ...`. GitHub может потребовать авторизацию через credential manager либо SSH/PAT; пароль аккаунта не является паролем для HTTPS Git. Секреты не передавать в чат и не включать в URL.

Для дальнейшей работы: отдельная ветка → коммиты → pull request → проверка → merge в main → автоматическая публикация. Прямой push в main также запускает публикацию; не использовать его для незавершённой работы. В настройках репозитория желательно требовать успешные jobs `Tests and frontend build` и `Validate migrations on a disposable database` перед merge.

## 2. Добавить настройки GitHub

Settings → Secrets and variables → Actions. Перечисленные Variables — **repository variables**; особенно `DEPLOY_ENABLED`, поскольку он проверяется до входа в environment.

### Secrets

| Название | Откуда взять |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase account → Access Tokens, токен с доступом к нужному проекту |
| `SUPABASE_DB_PASSWORD` | Пароль базы рабочего проекта; это не пароль входа в аккаунт |
| `CLOUDFLARE_API_TOKEN` | Custom API token: Account → Cloudflare Pages → Edit, ограничить нужным аккаунтом |

`service_role` в GitHub не требуется: серверные функции получают его от Supabase. Не добавлять его в переменные VITE.

### Variables

| Название | Значение для текущей установки |
|---|---|
| `SUPABASE_PROJECT_ID` | `iqtaucnbzxwrpoaohtkx` |
| `VITE_SUPABASE_URL` | `https://iqtaucnbzxwrpoaohtkx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Публичный ключ из `.env.local`/панели Supabase, штатно включается в JS |
| `CLOUDFLARE_ACCOUNT_ID` | `806aaf29a852219841f5004be3cd5948` — сверить в панели |
| `CLOUDFLARE_PAGES_PROJECT` | `race-to-the-bottom` — имя проекта, не `race-to-the-bottom-36n.pages.dev` |
| `MIGRATION_BASELINE_VERIFIED` | Сначала `false`, затем `true` только после шага 3 |
| `DEPLOY_ENABLED` | Сначала `false`, затем `true` после завершения настройки |

Проверить, что production branch существующего Cloudflare Pages-проекта — `main`: workflow отправляет именно эту ветку. Иначе сборка может оказаться preview вместо обновления основного адреса.

## 3. Один раз согласовать историю миграций

По DEPLOYMENT.md шесть существующих миграций уже выполнялись вручную через SQL Editor. Пустая CLI-история не означает пустую базу. **Не включать автопубликацию, пока история и фактическая схема не согласованы.**

После безопасной авторизации CLI выполнить `supabase link --project-ref iqtaucnbzxwrpoaohtkx` и `supabase migration list`. Сверить функции, таблицы, политики и изменения со всеми локальными миграциями. Если версия действительно применена, но отсутствует в истории, использовать `migration repair <версия> --status applied`. Версии и подробности приведены в [DEPLOYMENT.md](DEPLOYMENT.md), раздел «Обновление через CLI».

Не запускать repair списком вслепую: он лишь меняет отметку, не проверяет и не выполняет SQL. При расхождениях сначала согласовать схему. Автоматический workflow никогда не делает repair.

Затем `supabase db push --dry-run`: для исходного состояния ожидается отсутствие новых миграций. После проверки выставить `MIGRATION_BASELINE_VERIFIED=true` и `DEPLOY_ENABLED=true`. Запустить workflow вручную на main и проверить первый выпуск.

## 4. Проверить первую публикацию

Все jobs зелёные; миграции не повторились; функции опубликованы; Cloudflare показывает production deployment нужного коммита. Открыть прежний адрес, создать отдельное тестовое лобби, войти с двух устройств, завершить раунд и проверить refresh. Не испытывать изменения на незавершённой семейной партии.

## Ограничения и восстановление

Общей транзакции между Supabase и Cloudflare нет. Если публикация сайта упала, база/функции могут быть уже обновлены. Изменения должны оставаться совместимыми со старым клиентом, в том числе с уже открытыми вкладками. Добавлять новые поля/методы до удаления старых; несовместимые изменения оформлять отдельным планом выпуска.

После исправления временной ошибки повторить неудачный job. Уже применённые миграции CLI пропустит. Откат сайта не откатывает БД: для схемы обычно нужна новая исправляющая миграция. Не редактировать применённые SQL-файлы и не запускать удалённый db reset. Перед потенциально разрушительными миграциями нужен отдельный план и резервная копия.

Чтобы временно остановить новые автоматические публикации, выставить `DEPLOY_ENABLED=false`; уже запущенный deploy это не остановит. Проверки PR продолжают работать. GitHub-hosted runner minutes зависят от тарифа/видимости репозитория; локальная проверка Supabase требует Docker на runner и может занять несколько минут. Собственный сервер CI не нужен.

Начальный workflow использует major-теги Actions и актуальную Supabase CLI (`latest`); после первого успешного запуска желательно зафиксировать проверенные SHA Actions и версию CLI, обновляя их отдельными коммитами.

Источники: [Cloudflare Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Supabase Functions CI](https://supabase.com/docs/guides/functions/deploy), [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations).
