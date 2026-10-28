# Race to the Bottom — развёртывание и публикация

Актуализировано: **28 октября 2026**. Руководство описывает существующую установку, локальный запуск, публикацию сайта, обновление Supabase и Android TV. Логины сверены с открытыми панелями сервисов; последнее подтверждённое развёртывание сайта и установка ТВ-приложения выполнены 23 октября 2026. Сегодня приложение повторно не развёртывалось.

## 1. Где находится проект и под какими аккаунтами

| Что | Значение |
| --- | --- |
| Основной сайт | https://race-to-the-bottom-36n.pages.dev/ |
| Экран телевизора | https://race-to-the-bottom-36n.pages.dev/?screen=tv |
| Ссылка для игрока | `https://race-to-the-bottom-36n.pages.dev/?room=ABC234` — вместо ABC234 текущий код комнаты |
| Cloudflare: логин | **trofitroll@gmail.com** — в панели отображается как `Trofitroll@gmail.com's Account` |
| Cloudflare: account ID | `806aaf29a852219841f5004be3cd5948` |
| Cloudflare Pages: проект | `race-to-the-bottom` |
| Cloudflare: панель проекта | https://dash.cloudflare.com/806aaf29a852219841f5004be3cd5948/pages/view/race-to-the-bottom |
| Supabase: логин | **trofitroll@gmail.com** |
| Supabase: организация | **Alexey**, ID `jwheicnuvbcyqaivnimq` |
| Supabase: проект / project ref | `race-to-the-bottom` / `iqtaucnbzxwrpoaohtkx` |
| Supabase: панель проекта | https://supabase.com/dashboard/project/iqtaucnbzxwrpoaohtkx |
| Supabase: API | https://iqtaucnbzxwrpoaohtkx.supabase.co |
| Supabase: регион при создании | Europe / Paris, `eu-west-3` |
| Исходники на этом Mac | `/Users/once/projects/race to the bottom` |
| Рабочие артефакты публикации | `/Users/once/Documents/Codex/2026-10-22/b` |

Используется стандартный домен Cloudflare Pages `race-to-the-bottom-36n.pages.dev`. Отдельный пользовательский домен в текущей конфигурации не задан. Имя проекта Cloudflare (`race-to-the-bottom`) и имя домена (`race-to-the-bottom-36n`) отличаются — это ожидаемо.

Адреса отдельных сборок вида `https://27002db5.race-to-the-bottom-36n.pages.dev/` относятся к конкретным развёртываниям. Для игры, QR-кодов и телевизора используется постоянный адрес выше.

Пароли, коды восстановления, токены панелей и служебные ключи в этом файле не хранятся. Логин игрового участника — его выбранное имя; аккаунты Cloudflare/Supabase игрокам не нужны. Способ входа владельца в панели (пароль либо внешний провайдер) здесь не зафиксирован.

## 2. Как устроена работающая установка

```text
Телефон / планшет / компьютер ── HTTPS ── Cloudflare Pages: HTML, JS, CSS
Android TV WebView ───────────── HTTPS ── тот же сайт с ?screen=tv
                │
                └── Supabase Auth + Edge Functions + PostgreSQL + Realtime
```

- **Frontend:** Vue 3, TypeScript, Pinia, Vite. Результат сборки — папка `dist/`.
- **Hosting:** Cloudflare Pages, ручная загрузка сборки через **Direct Upload**. Автопубликация из Git в текущем процессе не настроена.
- **Backend:** Supabase. Cloudflare не запускает игровые функции и не хранит базу партий.
- **Auth:** анонимный вход Supabase. У браузера сохраняется собственная сессия.
- **ТВ:** приложение `com.racetothebottom.tv`, версия **1.6**, `versionCode=7`; открывает сайт через WebView. HTML/JS/CSS больше не упакованы в APK.

При открытии доска создаёт или восстанавливает лобби. Первый подключившийся игрок становится лидером. QR-код виден только в лобби при сборе участников, открывает сайт с кодом комнаты. Имя сохраняется на устройстве в cookie на год и в localStorage; при следующем входе подставляется в форму. Вход подтверждается кнопкой, автоматического присоединения по одному сканированию нет.

На телефонах доступен клиент игрока. На компьютерах и планшетах можно выбирать игрока или доску. Старый механизм хабов с постоянным ключом остаётся в сервере для совместимости, но для обычного текущего сценария не требуется.

## 3. Что требуется локально

Для сайта нужны Node.js с npm и исходники проекта с `package-lock.json`. Для серверного развёртывания через CLI дополнительно нужны доступ к Supabase и Supabase CLI. Для изменения Android-оболочки нужны JDK 17, Android SDK Platform 35, Build Tools 35, Python 3 и прежний ключ подписи.

Основные файлы:

| Путь от корня проекта | Назначение |
| --- | --- |
| `src/` | Интерфейс и клиентская логика |
| `src/lib/joinLink.ts` | Постоянный публичный адрес для QR-ссылок |
| `.env.example` | Шаблон переменных клиента |
| `.env.local` | Локальные URL и публичный ключ Supabase; исключён из Git |
| `supabase/config.toml` | Настройки развёртывания Edge Functions |
| `supabase/migrations/` | SQL-миграции в порядке имён файлов |
| `supabase/functions/` | Три функции и общие модули |
| `android-tv/` | Исходники и сборщик ТВ-приложения |
| `android-tv/.signing/` | Прежний ключ подписи APK и пароль; исключены из Git |
| `GAME_RULES.md` | Правила игры |
| `SUPABASE_SETUP.md` | Подробности сервера и история изменений |

В старых разделах `SUPABASE_SETUP.md` описан вход главного игрока по постоянному ключу. Для текущего подключения ориентироваться на это руководство и раздел «Доски с первым игроком-лидером» в конце того файла.

## 4. Локальный запуск сайта

```sh
cd '/Users/once/projects/race to the bottom'
npm ci
```

На новом компьютере создать `.env.local` по образцу `.env.example`. На текущем Mac он уже существует; перезаписывать его шаблоном не нужно.

```dotenv
VITE_SUPABASE_URL=https://iqtaucnbzxwrpoaohtkx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<публичный Publishable key проекта>
```

Publishable key взять из панели ключей нужного проекта Supabase. Это публичный клиентский ключ, он штатно попадает в JS-сборку. **Secret key, service_role и пароль базы вместо него не использовать.**

```sh
npm run dev -- --host 0.0.0.0
```

Открыть адрес, который напечатал Vite, обычно `http://localhost:5173/`. На телефоне в той же сети использовать сетевой IP Mac и порт Vite; `localhost` на телефоне означает сам телефон.

ТВ-режим локально: `http://localhost:5173/?screen=tv`. Локальный клиент с этими переменными работает с существующим облачным Supabase, поэтому его комнаты реальные, а не изолированная тестовая база. QR-ссылки намеренно ведут на публичный сайт, даже если доска открыта локально.

## 5. Сборка и публикация сайта на Cloudflare

### Проверить и собрать

```sh
cd '/Users/once/projects/race to the bottom'
npm test
npm run build
```

`npm run build` сначала проверяет TypeScript, затем создаёт `dist/index.html` и `dist/assets/`. Переменные `VITE_*` включаются **во время сборки**. Изменение `.env.local` требует новой сборки и публикации.

Для проверки готовой сборки локально:

```sh
npm run preview -- --host 0.0.0.0
```

Открыть адрес, напечатанный командой preview.

### Сделать ZIP

Следующая команда создаёт архив рядом с проектом, без внешней папки `dist`:

```sh
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path('dist')
with ZipFile('race-to-the-bottom-pages.zip', 'w', ZIP_DEFLATED) as archive:
    for item in sorted(root.rglob('*')):
        if item.is_file():
            archive.write(item, item.relative_to(root))
PY
```

В корне ZIP должны лежать `index.html` и `assets/`. Загружать **только содержимое `dist/`**. `.env.local`, исходники, `node_modules`, базу и Android-ключи в архив сайта не включать.

### Загрузить

1. Войти в Cloudflare под **trofitroll@gmail.com**.
2. Открыть [проект Pages](https://dash.cloudflare.com/806aaf29a852219841f5004be3cd5948/pages/view/race-to-the-bottom).
3. Нажать **Create deployment** и выбрать **Production**.
4. Загрузить `race-to-the-bottom-pages.zip` через выбор файла либо перетащить папку `dist` через загрузку папки.
5. Дождаться успешной загрузки всех файлов, нажать **Save and deploy**.
6. Дождаться **Success**, открыть https://race-to-the-bottom-36n.pages.dev/.

Существующий домен сохраняется. Direct Upload принимает готовые файлы: Cloudflare не выполняет `npm run build`, сборка должна быть сделана до загрузки.

При последней рабочей публикации ZIP сохранён также здесь:
`/Users/once/Documents/Codex/2026-10-22/b/race-to-the-bottom-pages.zip`.
Новая команда выше создаёт свежий ZIP в корне проекта; старый архив из рабочей папки сам не обновится.

### Проверить после публикации

- Открыть сайт на телефоне и доску на общем экране.
- Проверить код и QR лобби: камера телефона должна открыть постоянный домен с `?room=...`.
- Войти минимум двумя игроками, убедиться, что первый получил управление.
- Запустить тестовую партию, отправить ходы с обоих устройств, проверить раскрытие, цены, капитал и переход к следующему раунду.
- На ТВ выбрать «Назад»/Menu → **Обновить доску**, либо перезапустить приложение.

Если изменён только интерфейс сайта, обновлять Supabase и APK не требуется. Если поменялся протокол игры, сначала подготовить совместимую схему и серверные функции, затем публиковать клиент.

Для отката сохранить предыдущий проверенный ZIP и повторно опубликовать его как Production. Это откатывает только сайт, не SQL-миграции и не функции Supabase.

## 6. Supabase: схема, доступы и функции

### Текущая конфигурация

- Anonymous sign-ins включён в настройках Supabase Auth.
- Публичные таблицы защищены RLS; закрытые руки и колоды не читаются клиентом напрямую.
- `game_sessions` включена в публикацию `supabase_realtime`; клиент подписывается на обновления своей комнаты и дополнительно синхронизируется запросами.
- Служебные SQL-процедуры доступны `service_role`, который используется только внутри серверных функций.
- Секреты `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` читаются функциями из окружения Supabase. Их не переносить в `VITE_*`.

Функции:

| Имя | Назначение |
| --- | --- |
| `create-room` | Создание/восстановление доски и хаба, выдача текущего лобби |
| `join-room` | Вход игрока или дополнительной доски |
| `game-action` | Игровые действия, синхронизация, завершение ходов и управление партией |

Адрес каждой функции: `https://iqtaucnbzxwrpoaohtkx.supabase.co/functions/v1/<имя>`.

В `supabase/config.toml` для всех трёх задано `verify_jwt = false`: отключена именно устаревшая проверка JWT на шлюзе. Внутри обработчиков остаётся проверка пользователя через Supabase Auth `auth.getUser(token)` и проверка прав на комнату. При ручной публикации настройка **Verify JWT with legacy secret** должна соответствовать этой конфигурации.

### Миграции

Для нового пустого проекта применяются все файлы по порядку:

1. `20261014000000_multiplayer.sql`
2. `20261022000000_lobby_and_cards.sql`
3. `20261022000001_conflict_retry.sql`
4. `20261022000002_atomic_turns_and_hubs.sql`
5. `20261023000000_short_hub_keys.sql`
6. `20261023000001_display_lobbies.sql`

На существующем проекте эти миграции уже применялись через SQL Editor. **Не запускать их повторно на рабочей базе.** История CLI могла не быть заполнена, поскольку первоначальное развёртывание выполнялось через Dashboard.

### Обновление через CLI

Команды выполняются из корня проекта. Вход CLI — под аккаунтом, у которого есть доступ к организации **Alexey**:

```sh
npx supabase login
npx supabase link --project-ref iqtaucnbzxwrpoaohtkx
npx supabase migration list
```

Если локальные версии отсутствуют в удалённой истории, сначала сверить фактическую схему с файлами. Только для миграций, которые действительно уже выполнены, отметить соответствующие версии как applied:

```sh
npx supabase migration repair 20261014000000 --status applied
npx supabase migration repair 20261022000000 --status applied
npx supabase migration repair 20261022000001 --status applied
npx supabase migration repair 20261022000002 --status applied
npx supabase migration repair 20261023000000 --status applied
npx supabase migration repair 20261023000001 --status applied
```

`migration repair` меняет историю миграций, а не выполняет SQL. Не использовать его для пропуска ещё не выполненных изменений.

После добавления новой миграции и проверки её влияния на существующие комнаты:

```sh
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy create-room
npx supabase functions deploy join-room
npx supabase functions deploy game-action
```

CLI упаковывает локальные импорты `_shared/game.ts`, `_shared/api.ts`, `_shared/hubKey.ts`. Для обычного обновления функций без изменения схемы `db push` не нужен. Перед изменениями схемы сохранить резервную копию нужных данных; доступность резервных копий платформы проверять в панели своего тарифа.

### Ручное обновление через Dashboard

Возможен прежний способ: SQL Editor для новых SQL-изменений, Edge Functions → нужная функция → Code → Deploy updates для функций. При первоначальной загрузке общие модули объединялись с обработчиком в один `index.ts`, а соответствующие относительные импорты удалялись. Нельзя просто вставить обработчик с локальными импортами без добавления его общих файлов. Для воспроизводимости предпочтителен CLI из исходников.

## 7. Android TV: когда нужен APK и как его обновить

### Обычное обновление игры

Опубликовать сайт по разделу 5 и обновить доску через меню приложения. **Новый APK не нужен.** Версия 1.6 загружает сайт по сети; старая 1.5 содержала интерфейс внутри APK и больше не является текущим способом работы.

### Изменение Android-оболочки

APK нужен, если меняются адрес разрешённого сайта, поведение WebView, пульт, системные параметры, иконка или разрешения.

- Java: `android-tv/app/src/main/java/com/racetothebottom/tv/MainActivity.java`.
- Версия: `android-tv/app/src/main/AndroidManifest.xml`; при обновлении увеличить `versionCode` и указать `versionName`.
- Сборщик: `android-tv/scripts/build.py` — собирает оболочку без веб-ресурсов, подписывает и проверяет APK.
- Приложение разрешает навигацию только по HTTPS на `race-to-the-bottom-36n.pages.dev`, без доступа к локальным файлам и без JavaScript-моста к Android.

Сборка на текущем Mac, из корня проекта:

```sh
TV_JAVA_HOME='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/jdk/jdk-17.0.21+9/Contents/Home' \
TV_BUILD_TOOLS='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/build-tools/android-15' \
TV_ANDROID_JAR='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/platform/android-35/android.jar' \
TV_SIGNING_DIR='/Users/once/projects/race to the bottom/android-tv/.signing' \
TV_APK_OUTPUT='/Users/once/Documents/Codex/2026-10-22/b/race-to-the-bottom-tv.apk' \
python3 android-tv/scripts/build.py
```

Имена каталогов SDK отражают фактическую локальную распаковку; при переносе на другой компьютер подставить свои пути к JDK, Build Tools и `android.jar`.

**Для обновления уже установленного приложения нужен тот же ключ подписи.** Сохранить `android-tv/.signing/release.jks` и `android-tv/.signing/password` отдельно в защищённом резервном хранилище. Не публиковать их. Если указать пустой новый каталог подписи, сборщик создаст другой ключ — такой APK не заменит прежнюю установку обычным обновлением.

### Установка по сети

Проверенная установка: TCL, прошивка `V8-T615T03-LF1V613`, Android 11. Во время настройки IP телевизора был **192.168.1.58**; он может измениться. Mac и ТВ должны быть в одной сети. Отладку включают и первое подключение разрешают на самом телевизоре.

```sh
TV_ADB='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/platform-tools/platform-tools/adb'
"$TV_ADB" connect 192.168.1.58:5555
"$TV_ADB" -s 192.168.1.58:5555 install --no-incremental -r '/Users/once/Documents/Codex/2026-10-22/b/race-to-the-bottom-tv.apk'
"$TV_ADB" -s 192.168.1.58:5555 shell am start -n com.racetothebottom.tv/.MainActivity
```

`--no-incremental` использовался для надёжной установки на этом TCL. Приложение появляется в меню Android TV. «Назад»/Menu открывает обновление доски и выход. Для игры отладка не нужна; после установки её можно отключить.

Краткая диагностика на ТВ:

```sh
"$TV_ADB" -s 192.168.1.58:5555 shell tail -30 /sdcard/Android/data/com.racetothebottom.tv/files/connection-check.txt
```

Там записываются этапы загрузки и статусы запросов без тел запросов, ответов и ключей; размер ограничен 64 КиБ. `Website loaded` подтверждает загрузку страницы, успешные ответы `create-room`/`game-action` — связь с игровым сервером.

## 8. Если меняется домен или переносится установка

Для другого домена нужно изменить `PUBLIC_GAME_URL` в `src/lib/joinLink.ts`, пересобрать и опубликовать сайт. Для ТВ также изменить `APP_HOST` в `MainActivity.java`, собрать и установить новый APK: домен ограничен в оболочке.

При другом origin браузеры и ТВ не перенесут автоматически прежние cookie, имена и анонимные сессии. Доска может создать новое лобби, участникам потребуется войти заново.

Для нового Supabase-проекта: применить все шесть миграций к пустой базе, включить Anonymous sign-ins, развернуть три Edge Functions с текущими настройками JWT, обновить URL/Publishable key в `.env.local`, пересобрать сайт. Старые партии и пользователи при этом сами не переносятся.

## 9. Типовые проблемы и что сохранять

| Симптом | Что проверить |
| --- | --- |
| `ERR_QUIC_PROTOCOL_ERROR` / сайт не открывается | Интернет и VPN на конкретном устройстве. Ранее проблема зависела от VPN; проверка без него помогла. Сравнить с другой сетью. |
| Сайт открылся, но долго «Подключаемся» | Доступность Supabase, Auth, журналы Edge Functions, правильность переменных сборки. На ТВ посмотреть connection-check.txt. |
| Функция возвращает ошибку JWT | Anonymous sign-ins, наличие пользовательской сессии, соответствие настройки legacy JWT файлу config.toml. |
| После публикации старый интерфейс | Обновить страницу/доску, убедиться, что опубликовали свежий ZIP в Production, а не открыли URL старой сборки. |
| QR ведёт не туда | PUBLIC_GAME_URL, код текущего лобби и публикацию новой сборки. |
| Нельзя обновить APK | Тот же package ID и ключ подписи, увеличенный versionCode; не потерян ли старый .signing. |

Для восстановления сохранить исходники, `package-lock.json`, SQL-миграции и функции, защищённую копию `.env.local`, прежний ключ подписи APK, рабочий APK и предыдущий проверенный ZIP сайта. Исходники сами по себе не являются резервной копией данных Supabase.

Это руководство содержит логины и адреса инфраструктуры, но не секреты. Для дальнейшей работы основной порядок: **проверки → нужные обновления Supabase → сборка сайта → Production Direct Upload → проверка телефонов и обновление доски на ТВ**.
