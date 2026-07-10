# Males Ngisi Task Tracker Makanya Bikin Extension Buat Jira

Biar extension ini jalan, lo harus nyambungin ke Google Cloud Service Account supaya dia punya akses buat ngedit Google Sheet lo.

### Step 0: Clone Repository-nya
Buka terminal dan clone repo ini ke laptop lo:
```bash
git clone https://github.com/annurdien/malesngisitasktrackermakanyabikinextension.git
cd malesngisitasktrackermakanyabikinextension
```
*(Kalo lo download file ZIP, tinggal di-extract aja trus buka foldernya).*

### Step 1: Bikin Project di Google Cloud & Aktifin API-nya
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Bikin **Project Baru** (namain aja "Jira Task Tracker" atau terserah lo).
3. Di kolom pencarian atas, cari **Google Sheets API**.
4. Klik trus pencet **Enable**.

### Step 2: Bikin Service Account (File .json lo)
1. Di Google Cloud Console, liat sidebar kiri, cari **IAM & Admin > Service Accounts**.
2. Klik **+ Create Service Account** di atas.
3. Kasih nama (misal `sheet-automation`) trus klik **Create and Continue**.
4. Gak usah ribet ngasih role khusus, langsung aja klik **Done**.
5. Nah, sekarang service account baru lo bakal muncul di list. Klik **tiga titik** (Actions) di sebelahnya, pilih **Manage keys**.
6. Klik **Add Key > Create new key**.
7. Pilih format **JSON** trus klik Create.
8. File `credentials.json` bakal ke-download ke laptop lo. Simpen baik-baik ya!

### Step 3: Kasih Akses Service Account ke Google Sheet Lo
Anggap aja service account ini kayak robot. Lo harus invite si robot ini ke Sheet lo layaknya temen kerja biasa.
1. Buka file `credentials.json` yang barusan lo download pake text editor (Notepad, VSCode, dll).
2. Cari baris yang tulisannya `"client_email"` (bentuknya kira-kira `something@your-project.iam.gserviceaccount.com`). Copy alamat email itu.
3. Buka Google Sheet yang mau lo jadiin Task Tracker.
4. Klik tombol **Share** warna ijo gede di pojok kanan atas.
5. Paste email service account tadi dan pastiin role-nya jadi **Editor**.
6. Klik **Send**.

### Step 4: Install Extension di Chrome
1. Buka Google Chrome trus ke `chrome://extensions/`.
2. Nyalain toggle **Developer mode** di pojok kanan atas (sampe warnanya biru).
3. Klik tombol **Load unpacked** di kiri atas.
4. Pilih folder `malesngisitasktrackermakanyabikinextension` (folder repo ini).
5. Voila! Extension-nya udah kepasang di browser lo.

### Step 5: Setting Extension-nya
1. Klik icon **Puzzle** di Chrome trus pin extension **Jira Task Tracker** biar gampang diakses.
2. Klik icon extension-nya trus pilih **Options**.
3. **Credentials**: Buka file `credentials.json` lo tadi, copy semua teksnya, trus paste ke kotak Credentials.
4. **Spreadsheet URL**: Paste full link (URL) dari Google Sheet lo. Tenang aja, extension ini bakal otomatis nge-ekstrak Spreadsheet ID sama Sheet ID-nya.
5. Lo juga bisa milih animasi apa yang mau muncul pas sukses nambahin task di menu *Success Animation Type*.
6. Terakhir, klik **Save Settings**.

---

## Cara Pake

1. Buka task/issue apa aja di Jira lo.
2. Nanti bakal muncul tombol **Add to Task Tracker** baru di sebelah tombol-tombol status bawaan Jira.
3. Klik aja! Bakal muncul pop-up buat masukin Due Date.
4. Klik **Confirm** dan nikmatin animasinya pas task lo otomatis ke-sync ke Google Sheet! Gampang banget kan?
