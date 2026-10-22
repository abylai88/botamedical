# Публикация сайта BOTA на своём сервере (VPS в Казахстане)

Инструкция для новичка, по шагам. Сервер — любой VPS с **Ubuntu 24.04**, расположенный в Казахстане
(по закону РК персональные данные покупателей должны храниться в Казахстане). Провайдер не важен.

Как всё устроено:

```
Посетитель ──HTTPS──▶ Caddy (порты 80/443, сертификат сам) ──▶ сайт BOTA (127.0.0.1:3000, служба systemd)
                                                                    │
                                                    /var/lib/bota — база, order-key, фото
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
| `bota-build` | писать только в папку новой версии во время её сборки | `npm ci` и сборка сайта не работают от root |
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

## 4. Перенос данных с компьютера (.local и models)

Делается **до первого запуска** сайта на сервере. Если сайт уже запускался, он создал пустую базу и новый
`order-key` — это не страшно, пока на сервере нет настоящих заказов: перенос их заменит.

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
sudo install -d -o bota -g bota -m 700 /var/lib/bota
sudo cp ~/bota-local/bota.sqlite* ~/bota-local/order-key /var/lib/bota/
if [ -d ~/bota-local/uploads ]; then sudo cp -r ~/bota-local/uploads /var/lib/bota/; fi
sudo chown -R bota:bota /var/lib/bota
sudo chmod -R u=rwX,go= /var/lib/bota

# Проверки
sudo sha256sum /var/lib/bota/order-key                                   # совпадает с Get-FileHash (регистр букв не важен)
sudo -u bota sqlite3 /var/lib/bota/bota.sqlite 'PRAGMA integrity_check;'  # должно быть: ok
sudo ls -la /var/lib/bota                                                # владелец bota, права drwx------ / -rw-------

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

---

## 5. Сборка и запуск сайта (systemd)

```bash
# Сервер
sudo systemctl enable bota                     # запускать сайт после перезагрузки сервера
sudo bota-update                               # первая сборка (1–3 минуты) и запуск
sudo systemctl status bota --no-pager          # Active: active (running)
curl http://127.0.0.1:3000/healthz             # {"status":"ok"}
```

Служба перезапускается сама, если сайт упал. Журнал сайта: `sudo journalctl -u bota -n 100 --no-pager`.

Если данные **не** переносились (новая пустая база), создайте администратора:

```bash
cd /srv/bota/app && sudo -u bota env BOTA_DATA_DIR=/var/lib/bota node --conditions=react-server scripts/admin.mjs
```

### Проверка изоляции (один раз после первого запуска)

В `bota.service` включены ограничения: только чтение для всей системы, кроме данных и кеша, запрет на
повышение прав, фильтр системных вызовов и т. п. На компьютере с Windows их проверить нельзя, поэтому
проверяем на сервере:

```bash
# Сервер
# 1. Сайт не может писать в свой код (ожидается: Permission denied)
sudo -u bota touch /srv/bota/app/test
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

Скрипт скачивает изменения в `/srv/bota/repo`, собирает новую версию в отдельной папке (от имени `bota-build`,
пока сайт работает на старой), передаёт её root и переключает сайт на неё. Если сборка не удалась, сайт
остаётся на прежней версии.

Если в новой версии изменились служебные скрипты или службы, `bota-update` напишет об этом. Тогда выполните:

```bash
sudo bash /srv/bota/repo/deploy/install.sh && sudo systemctl restart bota
```

Помните: всё, что попало в `main`, после `bota-update` окажется на сайте.

---

## 8. Резервные копии: настройка (один раз)

Каждую ночь около 03:30 команда `bota-backup` (скрипт `deploy/backup.sh`) делает копию базы (через `sqlite3 .backup` — это
правильная копия даже во время работы сайта) и папки `uploads`, шифрует её и кладёт в `/var/backups/bota`.
Хранятся 14 последних копий, старые удаляются сами.

**Три вещи, которые нужно хранить отдельно друг от друга:**

| Что | Где лежит | Зачем |
|---|---|---|
| Копии `bota-ДАТА.tar.gz.age` | сервер + раз в неделю на компьютер | сами данные, зашифрованы |
| Секретный ключ бэкапов `bota-backup-key.txt` | только у вас: флешка + менеджер паролей | без него копию не расшифровать |
| `order-key` | на сервере в `/var/lib/bota` + у вас (флешка + менеджер паролей) | без него не прочитать контакты в заказах |

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

Службу и таймер уже установил `install.sh` (шаг 3).

```bash
# Сервер
sudo systemctl start bota-backup.service                # первая копия прямо сейчас
sudo journalctl -u bota-backup -n 20 --no-pager         # "Готово: /var/backups/bota/bota-…"
ls -l /var/backups/bota
sudo systemctl enable --now bota-backup.timer
systemctl list-timers bota-backup.timer                 # когда следующий запуск
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

Команда `bota-restore` (скрипт `deploy/restore.sh`) расшифровывает копию, проверяет базу, останавливает сайт, **откладывает**
текущие данные в `/var/lib/bota/before-restore-ДАТА` (ничего не удаляет), кладёт данные из копии и запускает сайт.

### Если сервер новый

Сначала пройдите шаги 1–3 этой инструкции. Затем положите `order-key` и выполните шаг 5 (сборка и запуск):

```powershell
# PowerShell: путь к order-key — где вы его храните (флешка и т. п.)
scp "E:\order-key" abylai@IP_СЕРВЕРА:order-key
```

```bash
# Сервер
sudo install -d -o bota -g bota -m 700 /var/lib/bota
sudo install -o bota -g bota -m 600 ~/order-key /var/lib/bota/order-key
shred -u ~/order-key
```

Потом шаг 5, шаг 8.1 и шаг 6 (HTTPS). Новый ключ из 8.2 не создавайте: открытый ключ получим из прежнего
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
(команду покажет скрипт): `sudo rm -rf /var/lib/bota/before-restore-ДАТА`.

---

## Если что-то не работает

| Признак | Что проверить |
|---|---|
| Сайт не открывается совсем | `sudo ufw status`, firewall в панели провайдера, `sudo systemctl status caddy` |
| Ошибка 502 | сайт не запущен: `sudo systemctl status bota`, `sudo journalctl -u bota -n 100` |
| Нет сертификата | DNS ещё не обновился или закрыт порт 80: `sudo journalctl -u caddy -n 50` |
| Сборка падает с `Killed` | не хватает памяти — шаг 1.5 «Файл подкачки» |
| `HTTPS required for non-loopback origin` | в `/etc/bota/bota.env` адрес должен начинаться с `https://` |
