# APK для Android TV

Текущая оболочка: `com.racetothebottom.tv`, **versionName 1.7**, **versionCode 8**, Android 6+ (minSdk 23, targetSdk 35). APK подписан прежним ключом; установка версии 1.7 на телевизор ещё не проверена.

## Когда нужна новая сборка

Приложение открывает `https://race-to-the-bottom.vercel.app/?screen=tv` в WebView. Веб-интерфейс и игровой сервер в APK не упакованы. При обычном обновлении игры достаточно публикации сайта и команды **Обновить доску** в меню пульта либо перезапуска приложения. Интернет нужен и для сайта, и для Supabase.

APK пересобирается при изменении Android-кода: адреса разрешённого сайта, WebView, пульта, иконки, разрешений или системных параметров. Это отдельная ручная сборка; GitHub Actions не собирает APK.

## Исходники и инструменты

| Путь от корня | Назначение |
| --- | --- |
| `android-tv/app/src/main/java/com/racetothebottom/tv/MainActivity.java` | WebView, фиксированный домен `APP_HOST`, пульт и диагностика |
| `android-tv/app/src/main/AndroidManifest.xml` | Package ID, версии, минимальная/целевая версия Android и разрешения |
| `android-tv/app/src/main/res/` | Иконка и баннер Android TV |
| `android-tv/scripts/build.py` | Компиляция, упаковка, выравнивание, подпись и проверка APK |
| `android-tv/.signing/` | Постоянный ключ подписи и пароль; исключены из Git |
| `android-tv/build/` | Промежуточные файлы и APK по умолчанию; исключены из Git |

Нужны **Python 3, JDK 17, Android SDK Platform 35, Build Tools 35**. Для установки нужен `adb` из Android SDK Platform-Tools. Сборщик использует `aapt2`, `javac`, D8, `zipalign` и `apksigner` напрямую; Gradle и сборка `dist/` ему не нужны.

При выпуске следующей версии увеличить `android:versionCode` в manifest относительно установленного APK и обновить `android:versionName`. Если меняется версия оболочки, обновить также диагностическую строку `App 1.7 started` в `MainActivity.java`. Package ID для обновления должен остаться прежним.

## Ключ подписи: проверить до сборки

Для обновления установленного приложения нужны прежние `release.jks` и `password`. Не выводить их содержимое и не добавлять в Git или архив сайта. Хранить защищённую резервную копию обоих файлов отдельно от компьютера.

Сборщик автоматически создаёт ключ и пароль, если файлов нет. Поэтому для **обновления** сначала выполнить проверку из корня проекта:

```sh
export TV_SIGNING_DIR="$PWD/android-tv/.signing"
test -s "$TV_SIGNING_DIR/release.jks" && test -s "$TV_SIGNING_DIR/password"
```

Продолжать только если команда завершилась успешно. Если файлов нет, восстановить прежнюю подпись из резервной копии. Пустой новый каталог создаст другую подпись, и обычное обновление установленного приложения не получится. Для первой установки нового независимого приложения генерация нового ключа допустима; после неё сохранить ключ и пароль.

## Сборка на текущем Mac

Следующие пути к инструментам проверены на наличие 28 октября 2026. Выполнять из корня репозитория после проверки подписи:

```sh
export TV_JAVA_HOME='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/jdk/jdk-17.0.21+9/Contents/Home'
export TV_BUILD_TOOLS='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/build-tools/android-15'
export TV_ANDROID_JAR='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/platform/android-35/android.jar'
export TV_SIGNING_DIR="$PWD/android-tv/.signing"
export TV_APK_OUTPUT="$PWD/android-tv/build/race-to-the-bottom-tv.apk"

python3 android-tv/scripts/build.py
```

На другом компьютере подставить свои абсолютные пути. `TV_JAVA_HOME` — корень JDK с папкой `bin`; `TV_BUILD_TOOLS` — папка с `aapt2`, `zipalign` и `lib/`; `TV_ANDROID_JAR` — именно файл `android.jar`. `TV_APK_OUTPUT` необязателен: выше указан выходной путь по умолчанию.

Не использовать промежуточные `resources.apk`, `unsigned.apk` и `aligned.apk` для установки. Готовый подписанный файл — `android-tv/build/race-to-the-bottom-tv.apk`. Сборщик завершает работу проверкой подписи и выводом package/version через `aapt2 dump badging`. Ошибка любого шага прерывает сборку: старый APK по тому же пути не считать новым успешным результатом.

Дополнительная проверка готового файла:

```sh
"$TV_JAVA_HOME/bin/java" -jar "$TV_BUILD_TOOLS/lib/apksigner.jar" verify --verbose --print-certs "$TV_APK_OUTPUT"
"$TV_BUILD_TOOLS/aapt2" dump badging "$TV_APK_OUTPUT"
```

Проверить package `com.racetothebottom.tv`, новые версии и успешную подпись. Для обновления сравнить SHA-256 сертификата с предыдущим рабочим APK той же командой `apksigner verify --print-certs`.

## Установка на телевизор по сети

Компьютер и ТВ должны находиться в одной локальной сети. Включить отладку на телевизоре и разрешить первое подключение на его экране. Ниже — ранее использованный способ для TCL Android 11; на других устройствах адрес/порт и способ сопряжения могут отличаться. Для режима с pairing использовать данные, показанные самим телевизором.

```sh
export TV_ADB='/Users/once/Documents/Codex/2026-10-22/b/work/android-tools/platform-tools/platform-tools/adb'
export TV_TARGET='192.168.1.58:5555'
```

`192.168.1.58` — прежний адрес TCL, **перед запуском заменить актуальным IP телевизора**. На другом компьютере заменить также путь к `adb`.

```sh
"$TV_ADB" connect "$TV_TARGET"
"$TV_ADB" devices
"$TV_ADB" -s "$TV_TARGET" install --no-incremental -r "$TV_APK_OUTPUT"
"$TV_ADB" -s "$TV_TARGET" shell am start -n com.racetothebottom.tv/.MainActivity
```

Продолжать установку только при статусе `device`, а не `unauthorized`/`offline`. `-r` обновляет приложение с сохранением его данных. При несовпадении подписи сначала найти прежний ключ; не обходить ошибку удалением приложения, если нужно сохранить данные WebView и привязку доски. После установки приложение появляется в меню Android TV; отладку можно отключить.

## Проверка на ТВ и диагностика

1. Запустить приложение: доска должна открыть или восстановить лобби с кодом и QR.
2. Подключить минимум двух игроков с телефонов, проверить лидерство, раунд и раскрытие.
3. Нажать **Назад** или **Menu** на пульте: проверить **Обновить доску**, выход и повторное открытие.
4. Убедиться, что доска восстанавливается после перезапуска; проверить читаемость рынка и таблицы с расстояния. Компоновка рассчитана в том числе на 960×540 логических пикселей.

WebView разрешает навигацию только на фиксированный HTTPS-домен сайта, без JavaScript-моста к Android и доступа к локальным файлам. Экран остаётся включённым, ориентация альбомная. Ключи управления в APK не встроены.

При сетевой ошибке доступен повтор подключения. Краткий журнал (с установленным выше `TV_ADB` и `TV_TARGET`):

```sh
"$TV_ADB" -s "$TV_TARGET" shell tail -30 /sdcard/Android/data/com.racetothebottom.tv/files/connection-check.txt
```

В журнале — этапы загрузки и HTTP-статусы, без тел запросов/ответов и ключей; размер ограничен 64 КиБ. `Website loaded` подтверждает загрузку сайта, успешные ответы игровых функций — связь с сервером. При новом домене или переходе со старой bundled-версии 1.5 меняется origin хранилища WebView: прежняя сессия автоматически не переносится и может создаться новая доска.
