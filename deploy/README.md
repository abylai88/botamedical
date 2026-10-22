# Публикация сайта BOTA на своём сервере (VPS в Казахстане)

Инструкция для новичка, по шагам. Сервер — любой VPS с **Ubuntu 24.04**, расположенный в Казахстане
(по закону РК персональные данные покупателей должны храниться в Казахстане). Провайдер не важен.

Как всё устроено:

```
Посетитель ──HTTPS──▶ Caddy (порты 80/443, сертификат сам) ──▶ сайт BOTA (127.0.0.1:3000, служба systemd)
                                                                    │
                                                    /var/lib/bota/data — база, order-key, фото
```

Обозначения в командах — замените на свои:

| В инструкции | Что подставить |
|---|---|
| `IP_СЕРВЕРА` | IP-адрес сервера из панели провайдера |
| `abylai` | имя вашего пользователя на сервере (можно оставить) |
| `example.kz` | ваш домен |

Где какая команда выполняется:

- **PowerShell** — на вашем компьютере с Windows.
- **Сервер** — в окне, где вы подключились к серверу через `ssh`.

Строки, которые начинаются с `#`, — пояснения, их вводить не нужно.

---

## 0. Что подготовить заранее

1. **VPS в Казахстане**, Ubuntu 24.04, минимум 1 ядро, **2 ГБ памяти**, 20 ГБ диска. При 1 ГБ сборка сайта
   может не поместиться в память — тогда обязательно сделайте шаг «Файл подкачки».
2. **Домен** (например, `.kz`). В настройках DNS у регистратора создайте две записи типа **A**:
   `example.kz → IP_СЕРВЕРА` и `www.example.kz → IP_СЕРВЕРА`. Записи начинают работать через 5 минут – 24 часа.
3. **SSH-ключ** на компьютере. Проверьте в PowerShell:

   ```powershell
   Test-Path $env:USERPROFILE\.ssh\id_ed25519.pub
   ```

   Если `False` — создайте ключ (на вопросы можно нажимать Enter, но лучше задать пароль на ключ):

   ```powershell
   ssh-keygen -t ed25519
   ```

   Публичная часть ключа — файл `id_ed25519.pub`, её можно показывать. Файл `id_ed25519` **без** `.pub` — секретный,
   никому не отправляйте.

---

## 1. Первичная настройка сервера

### 1.1. Первый вход и свой пользователь

Многие провайдеры при создании сервера просят вставить публичный ключ — вставьте содержимое
`id_ed25519.pub` (`Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub`). Если провайдер дал только пароль root,
загрузите ключ сами:

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@IP_СЕРВЕРА "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

Войдите на сервер и создайте своего пользователя (работать под root каждый день опасно):

```powershell
ssh root@IP_СЕРВЕРА
```

```bash
# Сервер (пока под root)
apt update && apt full-upgrade -y
timedatectl set-timezone Asia/Almaty
adduser abylai                # придумайте пароль — он нужен для sudo, не для входа
usermod -aG sudo abylai
rsync --archive --chown=abylai:abylai ~/.ssh /home/abylai
```

**Не закрывая это окно**, откройте второе окно PowerShell и проверьте вход новым пользователем:

```powershell
ssh abylai@IP_СЕРВЕРА
```

```bash
# Сервер (второе окно)
sudo whoami                   # должно ответить: root
```

Дальше всё делаем под `abylai`.

### 1.2. Вход только по ключу, root запрещён

```bash
# Сервер
sudo tee /etc/ssh/sshd_config.d/00-bota.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sudo sshd -t && sudo systemctl restart ssh
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication) '
```

Должно быть `permitrootlogin no`, `passwordauthentication no`, `kbdinteractiveauthentication no`.
Файл назван `00-…`, чтобы он был главнее файла провайдера (например, `50-cloud-init.conf`).

**Проверка:** откройте ещё одно окно PowerShell и снова войдите `ssh abylai@IP_СЕРВЕРА`. Получилось — можно
закрывать старые окна. Не получилось — исправляйте в окне, которое ещё открыто.

### 1.3. Firewall: открыты только 22, 80 и 443

```bash
# Сервер
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH        # 22 — вход по SSH
sudo ufw allow 80/tcp         # HTTP: нужен Caddy для получения сертификата и перенаправления на HTTPS
sudo ufw allow 443            # HTTPS
sudo ufw enable               # на вопрос ответьте y
sudo ufw status verbose
```

Если в панели провайдера есть свой firewall («группы безопасности»), откройте там те же порты: 22, 80, 443.

### 1.4. Автоматические обновления безопасности

```bash
# Сервер
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades     # выберите «Yes»
cat /etc/apt/apt.conf.d/20auto-upgrades
```

В выводе должны быть две строки со значением `"1"`. Обновления ядра требуют перезагрузки: раз в месяц
проверяйте `ls /var/run/reboot-required` — если файл есть, выполните `sudo reboot` в спокойное время.

### 1.5. Файл подкачки (если памяти 2 ГБ или меньше)

```bash
# Сервер
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h                       # строка Swap: 2.0Gi
```

---

## 2. Установка Node.js 24, Caddy и нужных программ

```bash
# Сервер: git, curl, sqlite3 (проверка и бэкап базы), age (шифрование бэкапов)
sudo apt install -y git curl sqlite3 age

# Node.js 24 из официального репозитория NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node -v                       # должно быть v24.…

# Caddy из официального репозитория
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
caddy version
```

---

## 3. Пользователи, код и служебные скрипты

На сервере три «участника», у каждого только свои права:

| Кто | Что может | Зачем |
|---|---|---|
| `root` (через `sudo`) | всё; владеет кодом сайта и служебными скриптами | обновление, бэкап-скрипты, восстановление |
| `bota-build` | писать только в папку новой версии (`/srv/bota/releases/…`) во время её сборки | `npm ci` и сборка сайта не работают от root |
| `bota` | **читать** код, писать только в `/var/lib/bota` (данные) и `/var/cache/bota` (кеш картинок) | от него работает сайт |

Если сайт взломают, злоумышленник получит права `bota`: не сможет изменить ни код, ни скрипты, которые потом
запускает root, ни системные файлы.

```bash
# Сервер: пользователи без пароля и без входа по SSH
sudo adduser --system --group --no-create-home --home /nonexistent --shell /usr/sbin/nologin bota
sudo adduser --system --group --home /var/cache/bota-build --shell /usr/sbin/nologin bota-build

# Код: репозиторий принадлежит root
sudo install -d -o root -g root -m 755 /srv/bota
sudo git clone https://github.com/abylai88/botamedical.git /srv/bota/repo

# Служебные скрипты и службы: копии из репозитория в /usr/local/sbin и /etc/systemd/system, владелец root
sudo bash /srv/bota/repo/deploy/install.sh
ls -l /usr/local/sbin/bota-*                   # -rwxr-xr-x root root … bota-update, bota-backup, bota-restore

# Настройки: адрес сайта
sudo install -d -m 755 /etc/bota
sudo cp /srv/bota/repo/deploy/bota.env.example /etc/bota/bota.env
sudo nano /etc/bota/bota.env  # APP_ORIGIN=https://ваш-домен ; сохранить: Ctrl+O, Enter, выйти: Ctrl+X
```

Команды дальше вызываются коротко: `sudo bota-update`, `sudo bota-restore`. Сами скрипты лежат в
`/usr/local/sbin` и меняются только командой `sudo bash /srv/bota/repo/deploy/install.sh`.

---

## 4. Данные: перенос с компьютера или новый ключ

Делается **до первого запуска** сайта на сервере. Выберите один вариант:

- **есть `.local` с компьютера** (товары, фото, заказы) — шаги 4.1–4.2. Ваш `order-key` переносится вместе
  с базой, новый ключ **не создавайте** (шаг 4.3 пропустите);
- **начинаете с пустой базы** — только шаг 4.3 (новый ключ), затем раздел 5.

Если сайт уже запускался, он создал пустую базу — это не страшно, пока на сервере нет настоящих заказов:
перенос её заменит.

Что переносим:

- из `.local` — базу `bota.sqlite` (вместе с `bota.sqlite-wal` и `bota.sqlite-shm`, если они есть), ключ
  `order-key` и папку `uploads` с загруженными фото. Папки `deploy` и `handoff` серверу не нужны.
- `models` — исходники 3D-модели (350 МБ). Сайт их не использует; на сервер их кладём только как архивную копию.

### 4.1. На компьютере

1. **Остановите сайт на компьютере** — закройте окно `start-bota.cmd`. Копировать базу работающего сайта нельзя.
2. Запомните отпечаток ключа (это не сам ключ, его можно показывать):

   ```powershell
   Get-FileHash "C:\Users\User Home\Projects\bota\site\.local\order-key"
   ```

3. Скопируйте папки на сервер в вашу домашнюю папку (она закрыта для других пользователей):

   ```powershell
   scp -r "C:\Users\User Home\Projects\bota\site\.local" abylai@IP_СЕРВЕРА:bota-local
   scp -r "C:\Users\User Home\Projects\bota\site\models" abylai@IP_СЕРВЕРА:bota-models
   ```

   Размер и число файлов `models` для сверки:

   ```powershell
   Get-ChildItem -Recurse -File "C:\Users\User Home\Projects\bota\site\models" | Measure-Object Length -Sum
   ```

**Папку `.local` на компьютере не удаляйте**: это ваша копия на случай ошибки.

### 4.2. На сервере

```bash
# Сервер
sudo systemctl stop bota 2>/dev/null || true
sudo install -d -o bota -g bota -m 700 /var/lib/bota /var/lib/bota/data
sudo cp ~/bota-local/bota.sqlite* ~/bota-local/order-key /var/lib/bota/data/
if [ -d ~/bota-local/uploads ]; then sudo cp -r ~/bota-local/uploads /var/lib/bota/data/; fi
sudo chown -R bota:bota /var/lib/bota
sudo chmod -R u=rwX,go= /var/lib/bota

# Проверки
sudo sha256sum /var/lib/bota/data/order-key                              # совпадает с Get-FileHash (регистр букв не важен)
sudo -u bota sqlite3 /var/lib/bota/data/bota.sqlite 'PRAGMA integrity_check;'  # должно быть: ok
sudo ls -la /var/lib/bota/data                                           # владелец bota, права drwx------ / -rw-------

# models
sudo mv ~/bota-models /srv/bota/models
sudo chown -R root:root /srv/bota/models      # сайту эти файлы не нужны, доступ только у root
sudo chmod -R u=rwX,go= /srv/bota/models
sudo find /srv/bota/models -type f | wc -l     # число файлов = Count из PowerShell
sudo du -sb /srv/bota/models                   # байты ≈ Sum из PowerShell
```

`sqlite3` запускаем от имени `bota`, а не через `sudo` напрямую: иначе служебные файлы базы могут стать
принадлежать root, и сайт не сможет в неё писать.

Временную копию `~/bota-local` удалите только после шага 5, когда убедитесь, что в админке есть ваши товары
и заказы: `rm -rf ~/bota-local`.

### 4.3. Новый ключ order-key (только если данные НЕ переносятся)

`order-key` шифрует имена и телефоны покупателей в заказах. Сайт сам его не создаёт: **без ключа заказы не
принимаются** — покупатель увидит «Не удалось оформить заказ» (и ссылку на WhatsApp, если номер указан в админке). Ключ создаётся одной
командой при установке, **до первого запуска** (без него `bota-update` посчитает сайт неготовым), и его копия
должна оказаться у вас **до приёма первого заказа**.

> ⚠️ **Без order-key резервные копии бесполезны.** В копиях контакты покупателей зашифрованы этим ключом,
> а сам ключ в копии не входит. Сервер сломался, ключа у вас нет — заказы не прочитать никогда.

```bash
# Сервер: папка данных и ключ (если ключ уже есть, команда ничего не меняет и просто покажет отпечаток)
sudo install -d -o bota -g bota -m 700 /var/lib/bota /var/lib/bota/data
cd /srv/bota/repo && sudo -u bota env BOTA_DATA_DIR=/var/lib/bota/data node scripts/order-key.mjs
# покажет "SHA-256 fingerprint: …" — это отпечаток, не сам ключ

# Временная копия для скачивания (в вашей домашней папке, доступ только у вас)
sudo install -m 600 -o "$USER" -g "$USER" /var/lib/bota/data/order-key ~/order-key
```

```powershell
# PowerShell: скачать и сверить отпечаток — должен совпасть с тем, что показал сервер
scp abylai@IP_СЕРВЕРА:order-key "$env:USERPROFILE\Documents\order-key"
Get-FileHash "$env:USERPROFILE\Documents\order-key"
```

Сохраните файл на флешку и вложением в менеджер паролей, проверьте, что обе копии открываются, удалите его
из «Документов». После этого удалите временную копию на сервере:

```bash
# Сервер
shred -u ~/order-key
```

---

## 5. Сборка и запуск сайта (systemd)

```bash
# Сервер
sudo systemctl enable bota                     # запускать сайт после перезагрузки сервера
sudo bota-update                               # первая сборка (1–3 минуты) и запуск
sudo systemctl status bota --no-pager          # Active: active (running)
curl http://127.0.0.1:3000/healthz             # {"status":"ok"} — процесс сайта работает
curl http://127.0.0.1:3000/readyz              # {"status":"ready"} — база открыта, order-key работает
cd /srv/bota/current && sudo -u bota env BOTA_DATA_DIR=/var/lib/bota/data node --conditions=react-server scripts/db-verify.mjs
# "OK: … orders decrypted" — все заказы открываются ключом (содержимое не выводится)
```

`/readyz` отвечает 200, только если сайт действительно может принимать и читать заказы. Если там
`not ready` — нет `order-key` (шаг 4.3) или ключ не тот, что был у базы (сверьте отпечаток).

Служба перезапускается сама, если сайт упал. Журнал сайта: `sudo journalctl -u bota -n 100 --no-pager`.

### 5.1. Администратор (только если данные НЕ переносились)

```bash
cd /srv/bota/current && sudo -u bota env BOTA_DATA_DIR=/var/lib/bota/data node --conditions=react-server scripts/admin.mjs
```

### Проверка изоляции (один раз после первого запуска)

В `bota.service` включены ограничения: только чтение для всей системы, кроме данных и кеша, запрет на
повышение прав, фильтр системных вызовов и т. п. На компьютере с Windows их проверить нельзя, поэтому
проверяем на сервере:

```bash
# Сервер
# 1. Сайт не может писать в свой код (ожидается: Permission denied)
sudo -u bota touch /srv/bota/current/test
# 2. Оценка изоляции от systemd: внизу строка "Overall exposure level" — должно быть OK или MEDIUM, не UNSAFE
systemd-analyze security bota --no-pager | tail -n 3
```

3. Откройте в браузере главную, каталог, страницу товара с фотографиями, корзину, оформите тестовый заказ,
   войдите в `/admin`, загрузите фото товара. Потом удалите тестовый заказ в админке.
4. Проверьте журнал — после этих действий не должно быть ошибок доступа:

   ```bash
   sudo journalctl -u bota --since "30 min ago" --no-pager | grep -iE 'EACCES|EPERM|EROFS|read-only|Failed to write' || echo "ошибок доступа нет"
   ```

Если сайт не запускается или в журнале есть такие ошибки — пришлите вывод
`sudo journalctl -u bota -n 100 --no-pager`. Временно, для диагностики, можно закомментировать (поставить `#`
в начале) строку `SystemCallFilter=` в `/etc/systemd/system/bota.service`, затем
`sudo systemctl daemon-reload && sudo systemctl restart bota`. Если помогло — дело в фильтре вызовов.

### Про TRUST_PROXY=1

Уже включён в `bota.service`. Сайт слушает только `127.0.0.1`, поэтому к нему можно попасть лишь через Caddy,
а Caddy сам записывает настоящий IP посетителя в `X-Forwarded-For`. Так лимиты входа и заказов считаются для
каждого посетителя отдельно. Проверка: `sudo systemctl show bota -p Environment | tr ' ' '\n' | grep TRUST`.
Если когда-нибудь сайт будет слушать не `127.0.0.1`, а внешний адрес, `TRUST_PROXY` нужно убрать.

---

## 6. HTTPS через Caddy

Перед этим шагом DNS-записи домена должны указывать на сервер: `ping example.kz` показывает IP_СЕРВЕРА.

```bash
# Сервер
sudo cp /srv/bota/repo/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile                 # замените example.kz на свой домен (почта уже указана)
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager      # ищите "certificate obtained successfully"
```

Откройте `https://ваш-домен` — должен быть замок в адресной строке. Сертификат Caddy продлевает сам.
Затем откройте `https://ваш-домен/admin`, войдите и проверьте товары и заказы.

---

## 7. Обновление сайта

Когда в ветке `main` на GitHub появились изменения:

```bash
# Сервер
sudo bota-update
```

Как это устроено:

```
/srv/bota/releases/20261101-120000-a1b2c3d   ← версии сайта, каждая в своей папке (хранятся 3 последние)
/srv/bota/releases/20261105-093000-e4f5a6b
/srv/bota/current → releases/20261105-093000-e4f5a6b   ← ссылка на рабочую версию
```

1. Скрипт проверяет, что на диске есть хотя бы 1,5 ГБ, и собирает новую версию в новой папке
   (от имени `bota-build`). Текущая версия всё это время работает и не трогается.
2. Если сборка не удалась — новая папка удаляется, сайт остаётся как был.
3. Ссылка `current` переключается на новую версию, сайт перезапускается, скрипт ждёт ответа 200 от `/readyz`
   (до 30 попыток).
4. Если новая версия не ответила — ссылка возвращается на прежнюю готовую версию **без пересборки**,
   сайт перезапускается и снова проверяется. Сайт недоступен только на время перезапуска (секунды).

Посмотреть версии: `ls -l /srv/bota/releases /srv/bota/current`.

Вернуть предыдущую версию вручную (например, если ошибка заметна только в работе):

```bash
# Сервер
sudo bota-update --rollback                    # на ближайшую готовую версию старше рабочей
sudo bota-update --rollback ИМЯ_ПАПКИ          # или на конкретную (имя — из ls /srv/bota/releases)
```

Откат тоже проверяет `/readyz` и, если выбранная версия не заработала, возвращает ту, что была.

`bota-update`, `bota-update --rollback` и `bota-restore` не запускаются одновременно: если одна из команд уже
идёт, вторая сразу завершится с сообщением «Уже идёт обновление, восстановление или откат сайта».

Если в новой версии изменились служебные скрипты или службы, `bota-update` напишет об этом. Тогда выполните:

```bash
sudo bash /srv/bota/repo/deploy/install.sh && sudo systemctl restart bota
```

Помните: всё, что попало в `main`, после `bota-update` окажется на сайте.

---

## 8. Резервные копии: настройка (один раз)

Каждую ночь около 03:30 команда `bota-backup` (скрипт `deploy/backup.sh`) делает копию базы (через `sqlite3 .backup` — это
правильная копия даже во время работы сайта) и папки `uploads`, шифрует её и кладёт в `/var/backups/bota`.
Хранятся 14 последних копий, но не старше 30 дней. Лишние удаляет отдельная команда `bota-backup-prune` со своим
таймером (около 05:00): она срабатывает каждый день, даже если ночной бэкап не удался.

**Три вещи, которые нужно хранить отдельно друг от друга:**

| Что | Где лежит | Зачем |
|---|---|---|
| Копии `bota-ДАТА.tar.gz.age` | сервер + раз в неделю на компьютер | сами данные, зашифрованы |
| Секретный ключ бэкапов `bota-backup-key.txt` | только у вас: флешка + менеджер паролей | без него копию не расшифровать |
| `order-key` | на сервере в `/var/lib/bota/data` + у вас (флешка + менеджер паролей) | без него не прочитать контакты в заказах |

`order-key` в копию специально не входит: тот, кто украдёт копию, не прочитает контакты покупателей.
Ваш `order-key` — это файл `.local\order-key` на компьютере (после переноса на сервере тот же самый).
Сделайте ему две копии: на флешку и вложением в менеджер паролей. Если потеряете и его, и сервер — заказы не прочитать никак.

### 8.1. Папка для копий

```bash
# Сервер
sudo groupadd --system botabackup
sudo usermod -aG botabackup abylai           # чтобы вы могли скачивать копии без sudo
sudo install -d -o bota -g botabackup -m 2750 /var/backups/bota
```

После этого **выйдите с сервера (`exit`) и зайдите снова** — иначе новая группа не применится.

### 8.2. Ключ шифрования

Ключ создаём на сервере, секретную часть забираем себе и удаляем с сервера. На сервере остаётся только
открытая часть: ею можно зашифровать, но нельзя расшифровать.

```bash
# Сервер
age-keygen -o ~/bota-backup-key.txt                            # покажет "Public key: age1…"
age-keygen -y ~/bota-backup-key.txt | sudo tee /etc/bota/backup-recipient.txt
```

```powershell
# PowerShell: забираем секретный ключ
scp abylai@IP_СЕРВЕРА:bota-backup-key.txt "$env:USERPROFILE\Documents\bota-backup-key.txt"
```

Перенесите `bota-backup-key.txt` на флешку и в менеджер паролей, затем удалите его из «Документов».
Убедитесь, что флешка открывается и файл на месте, и только потом удалите ключ с сервера:

```bash
# Сервер
shred -u ~/bota-backup-key.txt
```

### 8.3. Включаем ежедневный запуск

Службы и таймеры бэкапа и очистки уже установил `install.sh` (шаг 3).

```bash
# Сервер
sudo systemctl start bota-backup.service                # первая копия прямо сейчас
sudo journalctl -u bota-backup -n 20 --no-pager         # "Готово: /var/backups/bota/bota-…"
ls -l /var/backups/bota
sudo systemctl enable --now bota-backup.timer
sudo systemctl enable --now bota-backup-prune.timer     # ежедневная очистка старых копий
systemctl list-timers 'bota-backup*'                    # когда следующие запуски
sudo systemctl start bota-backup-prune.service          # проверить очистку сейчас
sudo journalctl -u bota-backup-prune -n 20 --no-pager   # "Очистка: удалено …, осталось копий: …"
sudo systemctl enable --now bota-spam-purge.timer       # ежедневное удаление спам-заказов старше 30 дней
sudo systemctl start bota-spam-purge.service            # проверить сейчас
sudo journalctl -u bota-spam-purge -n 20 --no-pager     # "Очистка спама: удалено …"
```

Если копия не сделалась, `systemctl status bota-backup` покажет `failed`, а журнал — причину.

---

## 9. Раз в неделю: скачать копию на компьютер

Если сервер сломается или провайдер пропадёт, копии на самом сервере не помогут. Раз в неделю скачивайте
свежую копию:

```powershell
# PowerShell
$dest = "$env:USERPROFILE\Documents\BOTA-backups"
New-Item -ItemType Directory -Force $dest | Out-Null
$latest = ssh abylai@IP_СЕРВЕРА "ls -1t /var/backups/bota/bota-*.tar.gz.age | head -n 1"
scp "abylai@IP_СЕРВЕРА:$latest" $dest
Get-ChildItem $dest | Sort-Object LastWriteTime -Descending | Format-Table Name, Length, LastWriteTime
```

Проверьте, что дата в имени файла — вчерашняя или сегодняшняя. Если копия старая, значит ночные копии
не делаются: смотрите раздел 8.3.

Правила хранения на компьютере:

- держите **4 последние** копии (месяц), более старые удаляйте — так обещано в политике конфиденциальности;
- **не загружайте копии в Google Drive, iCloud, Dropbox и другие облака**: их серверы не в Казахстане.
  Компьютер и флешка — можно;
- не кладите `bota-backup-key.txt` и `order-key` в папку `BOTA-backups`.

---

## 10. Восстановление сайта из копии

Команда `bota-restore` (скрипт `deploy/restore.sh`) работает так:

1. Пока сайт работает: проверяет свободное место, расшифровывает копию в рабочую папку root
   `/var/lib/bota-restore` (скрипт сам проверяет, что она на том же разделе диска, что и данные), проверяет
   базу (`PRAGMA integrity_check`), кладёт к ней ваш текущий `order-key` и проверяет, что последние заказы
   из копии им расшифровываются (`db-verify`). Если копия повреждена, в ней есть ссылки вместо файлов
   или ключ не подходит — сайт не трогается вообще.
2. Останавливает сайт, переименованием откладывает текущие данные в `/var/lib/bota-restore/before-restore-ДАТА`
   (ничего не удаляет) и ставит на их место подготовленную папку.
3. Запускает сайт и ждёт ответа 200 от `/readyz` (база открыта, заказы читаются).
4. Если на шаге 2 или 3 что-то не так (или вы нажали Ctrl+C) — возвращает прежние данные на место
   и снова запускает сайт. Неудачная попытка остаётся в `/var/lib/bota-restore/failed-restore-ДАТА` для разбора.

Root при этом не доверяет папкам, куда пишет сайт: `order-key` читается с правами пользователя `bota`,
а если вместо файла или папки данных подложена ссылка — восстановление отказывается работать.

### Если сервер новый

Сначала пройдите шаги 1–3 этой инструкции. Затем положите `order-key` и выполните шаг 5 (сборка и запуск):

```powershell
# PowerShell: путь к order-key — где вы его храните (флешка и т. п.)
scp "E:\order-key" abylai@IP_СЕРВЕРА:order-key
```

```bash
# Сервер
sudo install -d -o bota -g bota -m 700 /var/lib/bota /var/lib/bota/data
sudo install -o bota -g bota -m 600 ~/order-key /var/lib/bota/data/order-key
shred -u ~/order-key
```

Ключ уже на месте, поэтому шаг 4.3 пропустите. Потом шаг 5, шаг 8.1 и шаг 6 (HTTPS). Новый ключ из 8.2 не создавайте: открытый ключ получим из прежнего
секретного во время восстановления (ниже), а потом включите копии по шагу 8.3.

### Восстановление (новый или старый сервер)

```powershell
# PowerShell: копия и секретный ключ бэкапов на сервер
scp "$env:USERPROFILE\Documents\BOTA-backups\bota-ДАТА.tar.gz.age" abylai@IP_СЕРВЕРА:
scp "E:\bota-backup-key.txt" abylai@IP_СЕРВЕРА:
```

```bash
# Сервер
sudo bota-restore ~/bota-ДАТА.tar.gz.age ~/bota-backup-key.txt
# Только на новом сервере: открытый ключ для будущих копий
age-keygen -y ~/bota-backup-key.txt | sudo tee /etc/bota/backup-recipient.txt
shred -u ~/bota-backup-key.txt          # секретный ключ на сервере не оставляем
rm ~/bota-ДАТА.tar.gz.age
```

Если сервер старый и нужная копия ещё лежит на нём, скачивать её не надо: укажите путь
`/var/backups/bota/bota-ДАТА.tar.gz.age` (список: `ls -1t /var/backups/bota`).

После восстановления откройте `/admin`: товары на месте, в заказах видны имена и телефоны. Если контакты
в заказах не открываются — на сервере не тот `order-key`. Когда всё в порядке, удалите отложенные данные
(команду покажет скрипт): `sudo rm -rf /var/lib/bota-restore/before-restore-ДАТА`.

---

## Если что-то не работает

| Признак | Что проверить |
|---|---|
| Сайт не открывается совсем | `sudo ufw status`, firewall в панели провайдера, `sudo systemctl status caddy` |
| Ошибка 502 | сайт не запущен: `sudo systemctl status bota`, `sudo journalctl -u bota -n 100` |
| Нет сертификата | DNS ещё не обновился или закрыт порт 80: `sudo journalctl -u caddy -n 50` |
| Сборка падает с `Killed` | не хватает памяти — шаг 1.5 «Файл подкачки» |
| `HTTPS required for non-loopback origin` | в `/etc/bota/bota.env` адрес должен начинаться с `https://` |
