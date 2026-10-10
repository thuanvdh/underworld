# UNDERWORLD: LOOT & RAID — THIẾT KẾ CHI TIẾT

> Phiên bản: 0.1 · Ngày: 10/10/2026
> Đi kèm: [underworld_gdd.md](underworld_gdd.md) (tài liệu thiết kế tổng thể)
> Tài liệu này chốt **số liệu, nội dung, màn hình, bot và dữ liệu** để đội lập trình và đội nội dung bắt tay làm được ngay.
> Các con số về chiến đấu, quái, nâng cấp, rơi đồ và AFK đã được **chỉnh bằng mô phỏng v1** (mục 25). Các phần còn lại vẫn là giá trị khởi điểm, chờ chỉnh tiếp khi có beta.
> Mã nguồn tham chiếu: `packages/shared` (dữ liệu, công thức), `packages/combat` (chiến đấu), `tools/sim` (mô phỏng).

---

## Mục lục

1. Phong cách hình ảnh và âm thanh
2. Sơ đồ màn hình Mini App
3. Wireframe các màn hình chính
4. Hệ thống chiến đấu
5. Lớp nhân vật và kỹ năng
6. Cấp độ và chỉ số
7. Quái vật và độ khó
8. Nội dung 6 chương
9. Phúc lợi (Boon)
10. Trang bị: chỉ số, độ hiếm, chỉ số phụ
11. Nâng cấp, phân rã, chế tạo, đúc lại
12. Bảng rơi đồ
13. AFK và năng lượng
14. Kinh tế hằng ngày (người chơi không nạp)
15. Đấu trường
16. Cướp kho và truy nã
17. Bang hội
18. Nhiệm vụ và thành tựu
19. Battle Pass
20. Cửa hàng
21. Bot Telegram
22. Mô hình dữ liệu
23. API
24. Thứ tự làm việc cho đội lập trình
25. Mô phỏng v1: kết quả và các thay đổi

---

## 1. Phong cách hình ảnh và âm thanh

**Đề xuất chốt: pixel art 32-bit, tông tối với điểm sáng neon.**

| Lý do | Giải thích |
|---|---|
| Nhẹ | Sprite sheet nhỏ, tải nhanh trên mạng yếu. Bản tải đầu dưới 2MB |
| Rẻ và nhanh | Một họa sĩ pixel làm được toàn bộ MVP. Có thể mua asset pack để làm mẫu thử |
| Toàn cầu | Pixel art được người chơi mọi nước chấp nhận, không gắn với văn hóa nào |
| Khác phim *Underworld* | Không bị liên tưởng tới phong cách điện ảnh của loạt phim |

**Bảng màu:**

| Vai trò | Màu |
|---|---|
| Nền | Đen than `#0E0E14`, xám đá `#1C1C26` |
| Hành động | Xanh ngọc neon `#4FE3E0` (nút hành động, tab đang chọn, thanh năng lượng kỹ năng, vòng Perfect). Chữ trên nút dùng `#0E0E14` |
| Huyền Thoại | Cam neon `#FF7A1A` chuyển sang vàng `#FFC93C`. **Chỉ dùng cho đồ Huyền Thoại và logo**, không nút hay tab nào dùng cam |
| Điểm nhấn phụ | Xanh lục độc `#5CFF8F` (máu, hồi phục), tím `#B46CFF` (Sử Thi, phép) |
| Nguy hiểm | Đỏ `#FF3B4E` (sát thương, cướp kho) |

**Kích thước:**
- Nhân vật và quái thường: 48×48 px, phóng to ×3 khi hiển thị.
- Boss: 96×96 đến 128×128 px.
- Biểu tượng vật phẩm: 32×32 px.
- Giao diện (nút, khung) dùng 9-slice để co giãn theo độ dài chữ của từng ngôn ngữ.

**Âm thanh:**
- Nhạc nền lo-fi tối, mỗi chương một bài (vòng lặp 60–90 giây, nén OGG/AAC, tải dần).
- Hiệu ứng ngắn: chém, bắn, nổ, rơi đồ (mỗi độ hiếm một âm riêng), lên cấp, nâng cấp thành công/thất bại.
- **Mặc định tắt âm thanh** (người dùng Telegram hay mở app ở nơi công cộng). Có nút bật nhanh ở thanh trên cùng.
- **Rung (haptic):** dùng `HapticFeedback` của Telegram khi rơi đồ hiếm, chí mạng, kỹ năng Perfect.

---

## 2. Sơ đồ màn hình Mini App

**Thanh điều hướng dưới cùng (5 tab):**

```
[ ⚔️ Vực Sâu ] [ 🧍 Nhân vật ] [ 🏟️ PvP ] [ 🛡️ Hội ] [ 💎 Cửa hàng ]
```

Tab chưa mở khóa hiện biểu tượng khóa kèm cấp mở (ví dụ "🔒 Cấp 8"). Người mới chỉ thấy 2 tab đầu (mục 14 GDD).

**Sơ đồ:**

```
Vực Sâu (Home)
 ├── Bản đồ chương → Chọn tầng → Chiến đấu → Kết quả
 ├── Kho AFK (nhận thưởng)
 ├── Nhiệm vụ (ngày / tuần / tân thủ / thành tựu)
 ├── Sự kiện
 └── Thư (phần thưởng hệ thống, bồi thường)

Nhân vật
 ├── Trang bị (6 ô) → Chi tiết đồ → Nâng cấp / Đúc lại / Phân rã
 ├── Túi đồ (lọc theo ô, độ hiếm; phân rã hàng loạt)
 ├── Lò rèn (Chế tạo)
 ├── Kỹ năng
 └── Skin

PvP
 ├── Đấu trường → Chọn đối thủ → Trận đấu → Kết quả
 ├── Cướp kho → Tìm mục tiêu → Trận đấu → Kết quả
 ├── Nhật ký (bị cướp, nút Trả thù)
 ├── Bảng Truy nã
 └── Đội hình phòng thủ

Hội
 ├── Tổng quan (cấp, thành viên, thông báo)
 ├── Boss hội
 ├── Chiến tranh hội
 ├── Cống hiến & Cửa hàng hội
 └── Quản lý (chỉ Hội trưởng / Phó hội)

Cửa hàng
 ├── Kim Cương (gói Stars)
 ├── Ưu đãi (nạp đầu, thẻ tháng, thẻ tuần, gói tăng trưởng)
 ├── Rương Ngầm
 ├── Battle Pass
 └── Cửa hàng Đấu trường / Chợ Đen (sự kiện)

Cài đặt (từ avatar)
 ├── Ngôn ngữ, Âm thanh, Rung
 ├── Thông báo (bật/tắt từng loại)
 ├── Vùng (đổi miễn phí 72 giờ đầu)
 └── Hỗ trợ, Điều khoản, Quyền riêng tư, Xóa dữ liệu
```

---

## 3. Wireframe các màn hình chính

Màn hình dọc, thiết kế cho chiều rộng 360–430 px. Thanh trên cùng cố định ở mọi màn hình.

### 3.1. Thanh trên cùng

```
┌──────────────────────────────────────────┐
│ (ava) Lv 23   ⚡ 70/100   🪙 48.2K  💎 340 │
│       ⚔ 2,480 Power                  [⚙] │
└──────────────────────────────────────────┘
```

### 3.2. Vực Sâu (Home)

```
┌──────────────────────────────────────────┐
│ [Thanh trên cùng]                        │
├──────────────────────────────────────────┤
│  🎉 Gold Rush — 2d 14h        [Xem >]    │  ← banner sự kiện
├──────────────────────────────────────────┤
│                                          │
│        (Nhân vật đứng giữa cảnh          │
│         chương hiện tại, có hoạt ảnh)    │
│                                          │
│   📦 Kho AFK  ███████░░░  8h 20m         │
│              [ Nhận thưởng ]             │
│                                          │
├──────────────────────────────────────────┤
│  ➜ Mục tiêu: Nâng Giày lên +5            │  ← luôn 1 mục tiêu kế tiếp
├──────────────────────────────────────────┤
│   [ ⚔️  XUỐNG VỰC SÂU — Tầng 24  ]        │  ← nút chính, xanh ngọc neon
│                                          │
│   [📜 Nhiệm vụ •]  [✉️ Thư]  [🎁 Sự kiện] │
├──────────────────────────────────────────┤
│ ⚔️Vực Sâu │🧍Nhân vật│🏟️PvP│🛡️Hội│💎Shop│
└──────────────────────────────────────────┘
```

### 3.3. Chiến đấu

```
┌──────────────────────────────────────────┐
│ Tầng 24 · Đợt 2/3              [⏩x2] [⏸] │
├──────────────────────────────────────────┤
│  Boon: 🩸Máu Điên  ⚡Tay Nhanh            │
│                                          │
│   (Hunter)          (Quái) (Quái) (Quái)  │
│   ███████░ HP       ██░   ████░  ███░    │
│                 -1,240!  CRIT            │
│                                          │
├──────────────────────────────────────────┤
│              ◯  ← vòng thu nhỏ           │
│          [  🌀 CHÉM XOÁY  ]               │  ← sáng lên khi đầy năng lượng
│          ████████████ 100%               │
│                     [AUTO: TẮT]          │
└──────────────────────────────────────────┘
```

**Cơ chế nút kỹ năng:** khi năng lượng đầy, một vòng tròn thu nhỏ dần quanh nút. Bấm khi vòng trùng viền nút là **Perfect** (+30% sát thương), gần trùng là **Good** (+10%), bấm sớm hoặc trễ là **Normal**. Chế độ tự động luôn tính là Normal.

### 3.4. Chọn phúc lợi (sau mỗi đợt quái)

```
┌──────────────────────────────────────────┐
│           CHỌN MỘT PHÚC LỢI              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │   🩸     │ │   ⚡     │ │   🪙     │   │
│ │Máu Điên  │ │Tay Nhanh │ │ Tham Lam │   │
│ │+30% ATK  │ │Kỹ năng   │ │+50% vàng │   │
│ │khi HP<50%│ │hồi +25%  │ │−10% DEF  │   │
│ └──────────┘ └──────────┘ └──────────┘   │
│        [🔄 Đổi lại — 1 lần miễn phí]      │
└──────────────────────────────────────────┘
```

### 3.5. Kết quả trận

```
┌──────────────────────────────────────────┐
│            ⭐⭐⭐  CHIẾN THẮNG            │
│   🪙 +3,240   ✨ +1,850 EXP   🔩 +6 Đá    │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│ │ 🗡 │ │ 🪖 │ │ 👢 │ │ 🔩 │  ← rơi đồ     │
│ │EPIC│ │RARE│ │UNC │ │x3  │   có cột sáng│
│ └────┘ └────┘ └────┘ └────┘              │
│  Pity Gravedigger: 12/40                 │
│ [ Trang bị ngay ]   [ Tầng tiếp theo ▶ ] │
└──────────────────────────────────────────┘
```

### 3.6. Nhân vật / Trang bị

```
┌──────────────────────────────────────────┐
│ [Thanh trên cùng]                        │
│   ┌────┐                    ┌────┐       │
│   │ 🪖 │ +7                 │ 🗡 │ +12   │
│   └────┘     (Hunter        └────┘       │
│   ┌────┐      đứng giữa)    ┌────┐       │
│   │ 🥋 │ +5                 │ 🧤 │ +4    │
│   └────┘                    └────┘       │
│   ┌────┐                    ┌────┐       │
│   │ 👢 │ +2 ⬆               │ 📿 │ +6    │
│   └────┘                    └────┘       │
│  Bộ Gravedigger: 4/6 ✓ (2) ✓ (4) ✗ (6)  │
│  HP 6,820  ATK 912  DEF 305  SPD 118     │
│  Crit 14%  CritDmg 172%  Lifesteal 4%    │
│ [Túi đồ]  [Lò rèn]  [Kỹ năng]  [Skin]    │
└──────────────────────────────────────────┘
```

Mũi tên ⬆ trên ô đồ nghĩa là có đồ tốt hơn trong túi hoặc có thể nâng cấp. Bấm giữ để trang bị nhanh.

### 3.7. Nâng cấp

```
┌──────────────────────────────────────────┐
│  🗡 Rìu Đào Mộ  [EPIC]  ilvl 24   +11    │
│  ATK  416 → 441                          │
│  Tỉ lệ thành công: 60%  (+ May mắn 20%)  │
│  🍀 Tích lũy may mắn: ████░░░░░░ 40%     │
│  Chi phí: 🪙 7,200   🔩 12               │
│        [  NÂNG CẤP  ]   [ x5 tự động ]   │
└──────────────────────────────────────────┘
```

### 3.8. Đấu trường

```
┌──────────────────────────────────────────┐
│  🏆 VÀNG II · 1,462 điểm · Mùa 3: 9d 4h  │
│  Lượt hôm nay: 3/5          [ + Mua ]    │
│ ┌──────────────────────────────────────┐ │
│ │ (ava) DarkKnight   ⚔2,210  +14 điểm │ │  dễ
│ │ (ava) Mira_X       ⚔2,495  +22 điểm │ │  ngang
│ │ (ava) Rusty_Bolt   ⚔2,890  +31 điểm │ │  khó
│ └──────────────────────────────────────┘ │
│        [🔄 Đổi đối thủ — 30 💎]            │
│ [Đội hình phòng thủ] [Xếp hạng] [Shop]   │
└──────────────────────────────────────────┘
```

### 3.9. Hội

```
┌──────────────────────────────────────────┐
│ 🐉 BLACK DRAGONS  Lv 6 · 27/34 · EN      │
│ 📢 "War tối nay, ai chưa đánh boss nhé"   │
├──────────────────────────────────────────┤
│ 🐲 Boss hội   ███████░░░ 68%   [Đánh 2/2]│
│ ⚔️ Chiến tranh: vs Fire Snakes 18⭐-14⭐   │
│ 🎁 Cống hiến hôm nay  [ Góp ]            │
├──────────────────────────────────────────┤
│ Thành viên   Cống hiến tuần   Online     │
│ 👑 Ryn        4,820           ●          │
│ ⭐ Mira_X     3,915           2h         │
│ ...                                      │
│ [Cửa hàng hội]  [Group Telegram ↗]       │
└──────────────────────────────────────────┘
```

### 3.10. Cửa hàng

```
┌──────────────────────────────────────────┐
│ ┌─────────── ƯU ĐÃI NẠP ĐẦU ───────────┐ │
│ │ Nhân đôi Kim Cương + Vũ khí          │ │
│ │ Huyền Thoại + Skin Pioneer           │ │
│ └──────────────────────────────────────┘ │
│  Thẻ tháng  250⭐   │  Thẻ tuần  75⭐      │
│  3,300 💎 tổng      │  520 💎 tổng         │
│ ─────────── KIM CƯƠNG ───────────────    │
│  140💎 25⭐  │ 300💎 50⭐  │ 1,600💎 250⭐ │
│  3,400💎 500⭐│7,000💎 1000⭐│18,000💎 2500⭐│
│ ─────────── RƯƠNG NGẦM ──────────────    │
│  [Miễn phí 1/1]  [x1 160💎]  [x10 1500💎] │
│  Tỉ lệ rơi ⓘ     Đảm bảo Huyền Thoại 41/60│
└──────────────────────────────────────────┘
```

---

## 4. Hệ thống chiến đấu

### 4.1. Vòng lặp tick

- Trận đấu chạy **20 tick/giây** (mỗi tick 50 ms). Tốc độ x2 chỉ tăng tốc hiển thị, không đổi logic.
- Mỗi đơn vị có **Thanh hành động (Action Gauge)** từ 0 đến 1.000. Mỗi tick cộng thêm `SPD / 2`.
  - SPD 100 → hành động mỗi 20 tick (1 lần/giây).
  - SPD 150 → khoảng 0,67 giây/lần.
- Đầy 1.000 thì đơn vị đánh thường một lần, thanh trừ đi 1.000.
- **Giới hạn trận:** 150 giây với hầm ngục (4 đợt), 60 giây với PvP. Hết giờ thì bên tấn công thua (PvP) hoặc tính thua (hầm ngục).

### 4.2. Năng lượng kỹ năng

| Hành động | Năng lượng nhận |
|---|---|
| Đánh thường trúng | +12 |
| Bị đánh trúng | +6 |
| Hạ một kẻ địch | +10 |
| Đầy | 100 → kỹ năng sẵn sàng |

Sau khi dùng kỹ năng, năng lượng về 0.

### 4.3. Công thức sát thương

```
Sát thương thô  = ATK × Hệ số đòn
Giảm do phòng thủ = 100 / (100 + DEF_hiệu_dụng)
DEF_hiệu_dụng   = DEF đối thủ × (1 − Xuyên giáp%)
Sát thương      = Sát thương thô × Giảm do phòng thủ × (1 + Tăng sát thương%) × (1 − Giảm sát thương nhận%)
Nếu chí mạng    : × Sát thương chí mạng%
Nếu kỹ năng     : × Hệ số thời điểm (Normal 1.0 / Good 1.1 / Perfect 1.3)
Dao động        : × ngẫu nhiên [0.95, 1.05] (từ seed)
Làm tròn xuống số nguyên, tối thiểu 1
```

- Mọi phép tính dùng **số nguyên × 1.000** (fixed-point) để client và máy chủ cho kết quả giống hệt nhau.
- Trình sinh số ngẫu nhiên: **xoshiro128\*\*** khởi tạo từ seed của trận. Thứ tự gọi ngẫu nhiên cố định (chí mạng → dao động → hiệu ứng).

### 4.4. Hiệu ứng trạng thái

| Hiệu ứng | Tác dụng | Cộng dồn |
|---|---|---|
| Độc (Poison) | Mất X máu mỗi giây | Tối đa 5 lớp |
| Chậm (Slow) | −30% SPD | Không, làm mới thời gian |
| Choáng (Stun) | Không hành động | Không. Boss chỉ bị choáng tối đa 0,5 giây và miễn choáng 5 giây sau đó |
| Khiên (Shield) | Hấp thụ sát thương | Không, lấy giá trị lớn hơn |
| Cuồng nộ (Enrage) | Boss +50% ATK khi trận kéo dài quá 60 giây | — |

### 4.5. Lực chiến (Power)

```
Power = HP × 0.1 + ATK × 1.0 + DEF × 0.8 + max(0, SPD − 100) × 5
      + Crit% × ATK × 0.005 + (CritDmg% − 150) × ATK × 0.002
      + Lifesteal% × HP × 0.002
```

Nhân vật cấp 1 không trang bị: khoảng 116 Power. Hướng dẫn tân thủ trong GDD (120 → 185 sau món đồ đầu) khớp với công thức này.

---

## 5. Lớp nhân vật và kỹ năng

Mỗi lớp có **1 kỹ năng chủ động** (nút bấm) và **3 nội tại** mở theo cấp. Kỹ năng chủ động được nâng cấp theo cấp nhân vật (cấp 1, 20, 40, 60).

### 5.1. Đồ Tể (Butcher)

| Kỹ năng | Mở | Tác dụng |
|---|---|---|
| **Chém Xoáy (Whirlwind)** — chủ động | Cấp 1 | 3 nhát, mỗi nhát 120% ATK lên **tất cả** kẻ địch. Hồi máu bằng 25% sát thương gây ra. Nâng cấp: 130% / 140% / 150%, hồi 30% |
| Da Dày (Thick Hide) | Cấp 10 | Giảm 10% sát thương nhận |
| Cuồng Nộ (Bloodrage) | Cấp 25 | Khi HP dưới 50%: +25% ATK |
| Phản Đòn (Retaliate) | Cấp 40 | Phản lại 15% sát thương cận chiến nhận vào |

### 5.2. Xạ Thủ (Gunslinger)

| Kỹ năng | Mở | Tác dụng |
|---|---|---|
| **Phát Bắn Định Mệnh (Deadeye)** — chủ động | Cấp 1 | 1 phát 420% ATK vào kẻ địch máu cao nhất, **chắc chắn chí mạng**. Nâng cấp: 460% / 500% / 550% |
| Mắt Ưng (Hawk Eye) | Cấp 10 | +10% Chí mạng |
| Đạn Xuyên (Piercing Rounds) | Cấp 25 | Bỏ qua 20% DEF |
| Bắn Kép (Double Tap) | Cấp 40 | 20% cơ hội đánh thường 2 lần |

### 5.3. Phù Thủy Ngầm (Hexer)

| Kỹ năng | Mở | Tác dụng |
|---|---|---|
| **Mưa Độc (Plague Rain)** — chủ động | Cấp 1 | 80% ATK lên tất cả kẻ địch, gây Độc 25% ATK/giây trong 5 giây và Chậm 3 giây. Nâng cấp: Độc 30% / 35% / 40% |
| Lời Nguyền (Curse) | Cấp 10 | Kẻ địch bị Độc giảm 10% ATK |
| Lây Lan (Contagion) | Cấp 25 | Kẻ địch chết khi đang bị Độc sẽ lây toàn bộ lớp Độc sang kẻ gần nhất |
| Hồn Choáng (Soul Shock) | Cấp 40 | Mưa Độc gây Choáng 1,5 giây (boss 0,5 giây) |

### 5.4. Chỉ số gốc theo lớp

| Lớp | HP | ATK | DEF | SPD | Crit | CritDmg |
|---|---|---|---|---|---|---|
| Đồ Tể | 500 + 60/cấp | 50 + 6/cấp | 20 + 2,5/cấp | 100 | 5% | 150% |
| Xạ Thủ | 460 + 50/cấp | 60 + 7,5/cấp | 18 + 2/cấp | 110 | 15% | 150% |
| Phù Thủy Ngầm | 480 + 55/cấp | 55 + 7/cấp | 20 + 2,2/cấp | 105 | 5% | 150% |

Xạ Thủ và Phù Thủy Ngầm được tăng máu và phòng thủ sau mô phỏng v1: bản đầu chỉ thắng tầng 1 với tỉ lệ 43% và 13% khi ở cấp 1.

---

## 6. Cấp độ và chỉ số

### 6.1. Đường cong EXP

```
EXP cần để lên cấp L+1 = 100 × L^1.9 (làm tròn tới hàng chục)
```

| Cấp | EXP lên cấp tiếp | Tổng EXP tích lũy |
|---|---|---|
| 1 | 100 | 0 |
| 5 | 2.130 | 2.670 |
| 10 | 7.940 | 23.540 |
| 20 | 29.650 | 189.850 |
| 30 | 64.050 | 630.900 |
| 45 | 138.390 | 2.078.720 |
| 59 | 231.540 | 4.595.400 |

Tổng EXP từ cấp 1 lên 60: 4.826.940.

**Nhịp lên cấp theo mô phỏng v1** (trung vị, người chơi không nạp):

| Nhóm | Cấp 20 | Cấp 30 | Cấp 45 | Cấp 60 |
|---|---|---|---|---|
| Mục tiêu GDD | Ngày 1 | Ngày 3 | Ngày 14 | Ngày 30–40 |
| Chơi nhẹ (2 lần/ngày) | Ngày 3 | Ngày 9 | Ngày 25 | Chưa tới sau 30 ngày (cấp 49) |
| Chơi đều (4 lần/ngày) | Ngày 2 | Ngày 4 | Ngày 11 | Ngày 22 |
| Chơi nhiều (6 lần/ngày) | Ngày 1 | Ngày 3 | Ngày 9 | Ngày 18 |

Đầu game vẫn chậm hơn mục tiêu khoảng 1 ngày, cuối game nhanh hơn khoảng 1 tuần. Xem hướng chỉnh ở mục 25.

### 6.2. Mở khóa theo cấp

| Cấp | Mở khóa |
|---|---|
| 1 | Hầm ngục, Túi đồ, Trang bị |
| 3 | Nâng cấp |
| 5 | Chọn lớp (sau khi thử ở tầng 4–5) |
| 6 | Phúc lợi |
| 7 | AFK |
| 8 | Đấu trường |
| 10 | Nhiệm vụ ngày, Lịch 7 ngày, Phân rã hàng loạt, Cửa hàng (ưu đãi) |
| 12 | Bang hội |
| 15 | Cướp kho, Chế tạo |
| 18 | Rương Ngầm |
| 20 | Đúc lại, Battle Pass |
| 25 | Bảng Truy nã |
| 60 + tầng 60 | Tầng Vô Tận |

---

## 7. Quái vật và độ khó

### 7.1. Hệ số theo tầng

```
Hệ số tầng f = 1.09^(f − 1)
Tầng 1: 1.0 · Tầng 10: 2.2 · Tầng 20: 5.1 · Tầng 30: 12.2 · Tầng 40: 28.8 · Tầng 50: 68.2 · Tầng 60: 161.5
```

**Chỉ số quái gốc (tầng 1)** nhân với hệ số tầng:

| Loại | HP | ATK | DEF | SPD |
|---|---|---|---|---|
| Quái thường | 120 | 10 | 5 | 90 |
| Quái tinh nhuệ (đợt 3) | 300 | 17 | 10 | 95 |
| Boss tầng | 900 | 24 | 15 | 95 |
| Boss chương (tầng 10/20/...) | 1.400 | 26 | 20 | 100 |
| Quái triệu hồi (chuột con, bào tử) | 60 | 6 | 3 | 100 |

Mọi boss nhận thêm **+50% ATK sau 60 giây** đánh boss (chống kéo dài trận).

DEF của quái chỉ nhân với `hệ số^0.5` để không tăng quá nhanh.

### 7.2. Lực chiến khuyến nghị

| Chương | Tầng | Power khuyến nghị |
|---|---|---|
| 1 | 1–10 | 100 – 450 |
| 2 | 11–20 | 450 – 850 |
| 3 | 21–30 | 850 – 1.300 |
| 4 | 31–40 | 1.300 – 1.900 |
| 5 | 41–50 | 1.900 – 4.000 (boss tầng 50 cần khoảng 4.000) |
| 6 | 51–60 | 4.000 – 5.800 (boss tầng 60 cần khoảng 5.500–6.000) |
| Vô Tận | 61+ | Hệ số tiếp tục 1.06^(f − 60) |

Bảng này lấy từ mô phỏng v1 (lực chiến trung vị của người chơi khi vượt từng chương).
Mốc tham chiếu: nhân vật cấp 60 mặc đủ 6 món Huyền Thoại ilvl 60 +15 có khoảng 6.300–6.600 Power.

Power hiện tại thấp hơn 70% mức khuyến nghị thì nút đánh hiện cảnh báo vàng. Thấp hơn 50% thì hiện cảnh báo đỏ kèm gợi ý cách mạnh lên.

### 7.3. Chấm sao

| Sao | Điều kiện |
|---|---|
| ⭐ | Thắng |
| ⭐⭐ | Thắng, HP còn trên 50% |
| ⭐⭐⭐ | Thắng, HP còn trên 50% và dưới 90 giây |

Đạt 3 sao thì mở **Quét nhanh** cho tầng đó.

---

## 8. Nội dung 6 chương

| Chương | Tên (EN) | Quái thường | Boss chương | Cơ chế boss | Bộ trang bị |
|---|---|---|---|---|---|
| 1 | Cống Ngầm (The Sewers) | Chuột Đột Biến, Gián Sắt, Kẻ Lang Thang | **Vua Chuột Mập (Fat Rat King)** | Mỗi khi mất 25% máu thì gọi 3 chuột con. Dùng kỹ năng diện rộng để dọn | **Kẻ Lang Thang (Drifter)** |
| 2 | Nghĩa Địa Sắt (Iron Graveyard) | Xương Máy, Ma Thợ Mỏ, Quạ Gỉ | **Người Đào Mộ (The Gravedigger)** | Tạo Khiên Xương bằng 30% máu mỗi 15 giây. Kỹ năng Perfect phá khiên ngay | **Kẻ Đào Mộ (Gravedigger)** |
| 3 | Chợ Ma (Ghost Market) | Con Buôn Bóng Ma, Chó Canh, Kẻ Móc Túi | **Bà Chủ Nợ (The Debt Collector)** | Mỗi 20 giây cướp 1 phúc lợi của người chơi. Hạ boss thì lấy lại | **Kẻ Buôn Lậu (Smuggler)** |
| 4 | Lò Đúc (The Foundry) | Thợ Lò Cháy, Nhện Máy, Golem Nhỏ | **Golem Lò Nung (Furnace Golem)** | Gồng 3 giây rồi đập một đòn 300% ATK. Kỹ năng trúng lúc boss đang gồng sẽ ngắt đòn | **Kẻ Sinh Từ Lửa (Forgeborn)** |
| 5 | Vườn Nấm Độc (Fungal Depths) | Người Nấm, Ruồi Bào Tử, Rễ Quấn | **Mẹ Nấm (The Spore Mother)** | Vùng độc gây 1% máu tối đa/giây cho người chơi. Mỗi 12 giây sinh 2 bào tử, sau 6 giây bào tử còn sống sẽ nổ gây 35% ATK của boss | **Bào Tử (Sporeborne)** |
| 6 | Ngai Vực Thẳm (Abyss Throne) | Hiệp Sĩ Rỗng, Tế Sư Bóng Tối, Cẩu Vực Sâu | **Kẻ Gác Vực (The Warden)** | 3 giai đoạn. 66%: gọi 2 Hiệp Sĩ Rỗng. 33%: Cuồng nộ +20% ATK, SPD +10 | **Chúa Tể Ngầm (Underlord)** |

### 8.1. Hiệu ứng bộ trang bị

| Bộ | 2 món | 4 món | 6 món |
|---|---|---|---|
| **Drifter** | +8% ATK | Hạ kẻ địch: +10 SPD trong 5 giây | Kỹ năng đầu tiên trong trận +50% sát thương |
| **Gravedigger** | +10% HP | Hồi 5% máu sau mỗi đợt quái | Chết lần đầu thì hồi sinh với 30% máu (1 lần/trận) |
| **Smuggler** | +10% vàng nhận được | +12% Chí mạng | Chí mạng cộng thêm 5 năng lượng kỹ năng |
| **Forgeborn** | +12% DEF | Phản lại 10% sát thương nhận | HP dưới 30%: nhận khiên bằng 25% HP tối đa (1 lần/trận) |
| **Sporeborne** | +8% HP | Đánh thường gây Độc 10% ATK/giây trong 3 giây | Sát thương Độc +50% |
| **Underlord** | +10% ATK | +20% Sát thương chí mạng | Kỹ năng chủ động +40% sát thương và hồi 10% HP |

**Hiệu ứng bộ áp dụng cả trong PvP**, nên chọn bộ là một phần chiến thuật. Ví dụ: Gravedigger mạnh khi phòng thủ, Drifter mạnh khi tấn công nhanh.

---

## 9. Phúc lợi (Boon)

Sau mỗi đợt quái, người chơi chọn 1 trong 3 phúc lợi. Có 1 lượt đổi lại miễn phí mỗi trận. Phúc lợi chỉ có trong hầm ngục, **không có trong PvP**.

| Độ hiếm | Tỉ lệ xuất hiện | Phúc lợi |
|---|---|---|
| Thường | 60% | **Sắc Bén (Sharpened):** +12% ATK · **Da Cứng (Tough Skin):** +12% DEF · **Sức Bền (Vigor):** +15% HP tối đa, hồi 15% · **Nhanh Chân (Swift):** +10 SPD · **Tham Lam (Greed):** +50% vàng, −10% DEF |
| Hiếm | 30% | **Máu Điên (Blood Frenzy):** HP dưới 50% thì +30% ATK · **Tay Nhanh (Quick Hands):** năng lượng kỹ năng +25% · **Hút Hồn (Leech):** +8% hút máu · **Mắt Sát Thủ (Killer Eye):** +10% chí mạng · **Thợ Săn Kho Báu (Treasure Hunter):** +1 lượt rơi đồ ở đợt cuối |
| Sử Thi | 10% | **Hai Lần (Echo):** kỹ năng chủ động kích hoạt thêm 1 lần với 50% sức mạnh · **Bất Tử (Undying):** lần đầu nhận đòn chí tử thì còn 1 HP · **Cơn Thịnh Nộ (Wrath):** mỗi lần hạ kẻ địch +5% ATK (cộng dồn tối đa 10 lần) · **Vận May (Fortune):** độ hiếm rơi đồ của tầng này tăng 1 bậc với 20% cơ hội |

---

## 10. Trang bị: chỉ số, độ hiếm, chỉ số phụ

### 10.1. Cấp vật phẩm (ilvl)

- Đồ rơi ở tầng *f* có `ilvl = f` (AFK: ilvl bằng tầng cao nhất đã vượt). Đồ chế tạo lấy ilvl theo bản vẽ.
- Nhân vật mặc được đồ có ilvl ≤ cấp nhân vật + 5.

### 10.2. Chỉ số chính theo ô

| Ô | Chỉ số chính (Thường, +0) |
|---|---|
| Vũ khí | ATK = 10 + 4 × ilvl |
| Mũ | HP = 50 + 20 × ilvl |
| Áo | HP = 80 + 30 × ilvl · DEF = 5 + 1,5 × ilvl |
| Găng | ATK = 5 + 2 × ilvl |
| Giày | DEF = 3 + 1 × ilvl · SPD = 2 + 0,15 × ilvl |
| Bùa | 1 trong 3: Chí mạng 3% + 0,08% × ilvl / Sát thương chí mạng 10% + 0,3% × ilvl / Hút máu 2% + 0,06% × ilvl |

**Hệ số độ hiếm** (nhân vào chỉ số chính):

| Thường | Tốt | Hiếm | Sử Thi | Huyền Thoại |
|---|---|---|---|---|
| ×1,00 | ×1,20 | ×1,45 | ×1,75 | ×2,10 |

### 10.3. Chỉ số phụ

Số chỉ số phụ theo độ hiếm: 0 / 1 / 2 / 3 / 4. Mỗi chỉ số phụ chỉ xuất hiện một lần trên một món, và không trùng với chỉ số chính.

| Chỉ số phụ | Khoảng giá trị (ilvl 60) | Ghi chú |
|---|---|---|
| ATK% | 3 – 8% | |
| HP% | 3 – 8% | |
| DEF% | 3 – 8% | |
| ATK cộng thẳng | 15 – 40 | Nhân với ilvl/60 |
| HP cộng thẳng | 150 – 400 | Nhân với ilvl/60 |
| SPD | 2 – 6 | |
| Chí mạng | 2 – 5% | |
| Sát thương chí mạng | 4 – 10% | |
| Hút máu | 1 – 3% | |
| Giảm sát thương nhận | 1 – 3% | |

Chỉ số phần trăm có giá trị thấp hơn ở ilvl thấp: `giá trị × (0,5 + 0,5 × ilvl/60)`.

### 10.4. Hiệu ứng Huyền Thoại

Mỗi đồ Huyền Thoại có thêm **một hiệu ứng đặc biệt** chọn ngẫu nhiên từ danh sách theo ô. Ví dụ:

| Ô | Hiệu ứng |
|---|---|
| Vũ khí | *Lưỡi Khát Máu:* đánh thường có 10% cơ hội gây thêm 100% ATK |
| Áo | *Giáp Gai:* phản lại 8% mọi sát thương nhận |
| Giày | *Bước Bóng:* 10% né đòn đánh thường |
| Bùa | *Tim Vực Sâu:* bắt đầu trận với 50 năng lượng kỹ năng |

### 10.5. Đặt tên đồ

Tên = `[Tiền tố theo chỉ số phụ mạnh nhất] + [Tên gốc theo ô và chương]`. Ví dụ: *Savage Gravedigger's Axe*, *Swift Drifter Boots*.
Tên gốc và tiền tố là các chuỗi dịch riêng, ghép lại theo quy tắc ngữ pháp từng ngôn ngữ (ICU MessageFormat).

---

## 11. Nâng cấp, phân rã, chế tạo, đúc lại

### 11.1. Chi phí nâng cấp (đồ ilvl 30, độ hiếm bất kỳ)

Mỗi cấp nâng thêm **+6% chỉ số chính gốc** (+15 = +90%).

| Lên | Vàng | Đá Cường Hóa | Tỉ lệ gốc | Thất bại thì |
|---|---|---|---|---|
| +1 | 200 | 1 | 100% | — |
| +2 | 400 | 1 | 100% | — |
| +3 | 700 | 2 | 100% | — |
| +4 | 1.100 | 2 | 100% | — |
| +5 | 1.600 | 3 | 100% | — |
| +6 | 2.200 | 4 | 100% | — |
| +7 | 3.000 | 5 | 100% | — |
| +8 | 4.000 | 6 | 100% | — |
| +9 | 5.200 | 8 | 100% | — |
| +10 | 7.000 | 10 | 70% | +10% may mắn |
| +11 | 9.000 | 12 | 60% | +10% may mắn |
| +12 | 12.000 | 15 | 50% | +10% may mắn |
| +13 | 16.000 | 18 | 40% | +8% may mắn |
| +14 | 21.000 | 22 | 30% | +8% may mắn |
| +15 | 28.000 | 26 | 25% | +8% may mắn |

- **Hệ số theo ilvl:** vàng × `max(0,15; (ilvl/30)^1,5)`, đá × `max(1; ilvl/20)` (làm tròn lên). Đồ ilvl 30 có hệ số vàng 1,0, ilvl 60 là 2,83. Nhờ vậy nâng cấp vẫn tốn kém khi đồ tốt dần lên.
- **Tỉ lệ thực tế** = tỉ lệ gốc + Tích lũy may mắn / 2. May mắn đạt 100% thì chắc chắn thành công. Thành công thì may mắn về 0.
- **Chuyển cấp:** đồ mới cùng ô nhận `floor(80% × cấp cũ)`, miễn phí.

### 11.2. Phân rã

| Độ hiếm | Bụi Sắt | Tinh Thể | Lõi Huyền Thoại |
|---|---|---|---|
| Thường | 1 | — | — |
| Tốt | 3 | — | — |
| Hiếm | 8 | 1 | — |
| Sử Thi | 20 | 5 | — |
| Huyền Thoại | 50 | 15 | 1 |

Phân rã đồ đã nâng cấp hoàn lại **50% Đá Cường Hóa** đã dùng.
**Quy đổi:** 10 Bụi Sắt → 1 Đá Cường Hóa (tại Lò rèn).

### 11.3. Chế tạo

| Công thức | Nguyên liệu | Kết quả |
|---|---|---|
| Đồ bộ theo ô | Bản vẽ bộ (rơi từ boss chương) + 40 Bụi Sắt + 10 Tinh Thể | Đồ thuộc bộ đó, độ hiếm tối thiểu **Hiếm** (Hiếm 70%, Sử Thi 27%, Huyền Thoại 3%) |
| Đồ bộ cao cấp | Bản vẽ bộ + 30 Tinh Thể + 1 Lõi Huyền Thoại | Đồ thuộc bộ đó, tối thiểu **Sử Thi** (Sử Thi 85%, Huyền Thoại 15%) |
| Huyền Thoại chắc chắn | Bản vẽ bộ + 5 Lõi Huyền Thoại + 60 Tinh Thể | Đồ Huyền Thoại thuộc bộ đó, chọn ô |

ilvl của đồ chế tạo = tầng boss rơi ra bản vẽ.

### 11.4. Đúc lại

- Chọn 1 chỉ số phụ để quay lại (giữ loại chỉ số, đổi giá trị; hoặc đổi sang loại khác với chi phí gấp đôi).
- Chi phí: 5 Tinh Thể + 2.000 Vàng × hệ số ilvl. Mỗi lần đúc lại cùng một món tăng chi phí thêm 20%, tối đa ×3.
- **Khóa chỉ số:** khi đúc lại, người chơi xem kết quả mới và chọn giữ kết quả cũ hoặc mới.

---

## 12. Bảng rơi đồ

### 12.1. Mỗi lượt hầm ngục

| Nguồn | Vàng | EXP | Đá Cường Hóa | Trang bị |
|---|---|---|---|---|
| Mỗi đợt quái thường | 50 × hệ số tầng^0.7 | 80 × hệ số tầng^0.6 | 15% rơi 1 | 15% rơi 1 món |
| Đợt tinh nhuệ | ×1,5 | ×1,5 | 30% rơi 1–2 | 25% rơi 1 món |
| Boss tầng | ×3 | ×3 | Chắc chắn 2–4 | Chắc chắn 1 món |
| Boss chương | ×6 | ×6 | Chắc chắn 6–10 | Chắc chắn 2 món, trong đó 1 món thuộc **bộ của chương** (tối thiểu Hiếm). 15% rơi bản vẽ bộ |

**Lần đầu vượt một tầng** nhận gấp 3 vàng và EXP (không nhân đá, không nhân trang bị) và 20 💎 ở mỗi boss chương.

**Thua trận** vẫn nhận 50% vàng và EXP của các đợt quái đã dọn (không có đá, không có đồ), cùng 80% năng lượng hoàn lại. Không lượt nào là công cốc.

### 12.2. Tỉ lệ độ hiếm

| Nguồn | Thường | Tốt | Hiếm | Sử Thi | Huyền Thoại |
|---|---|---|---|---|---|
| Quái thường | 60% | 28% | 10% | 1,8% | 0,2% |
| Boss tầng | 30% | 40% | 22% | 7% | 1% |
| Boss chương | — | — | 70% | 26% | 4% |
| AFK (mỗi giờ 1 lượt rơi đồ) | 55% | 30% | 12% | 2,7% | 0,3% |

**Bảo hiểm rơi đồ:** mỗi boss chương có bộ đếm riêng cho từng người chơi. 40 lượt không ra Huyền Thoại thì lượt thứ 41 chắc chắn ra. Ra Huyền Thoại (do may mắn hoặc bảo hiểm) thì bộ đếm về 0.

### 12.3. Rương Ngầm

| Độ hiếm | Tỉ lệ |
|---|---|
| Hiếm | 78,5% |
| Sử Thi | 20% |
| Huyền Thoại | 1,5% |

- 10 lượt chắc chắn có ít nhất 1 Sử Thi.
- Đếm bảo hiểm 60 lượt cho Huyền Thoại, **giữ qua các mùa.**
- Đồ trong rương có ilvl = tầng cao nhất người chơi đã vượt, nên rương luôn có ích.

---

## 13. AFK và năng lượng

### 13.1. Tốc độ AFK mỗi giờ (theo tầng cao nhất *f* đã vượt)

| Phần thưởng | Mỗi giờ |
|---|---|
| Vàng | 250 × 1,05^(f − 1) |
| EXP | 250 × 1,045^(f − 1) |
| Đá Cường Hóa | 0,5 + 0,05 × f (phần lẻ cộng dồn) |
| Bụi Sắt | 2 + 0,1 × f |
| Trang bị | 1 lượt rơi mỗi giờ (bảng ở mục 12.2) |

Ví dụ tầng 30: khoảng **1.030 vàng/giờ**, 12 giờ khoảng 12.300 vàng. Tầng 60: khoảng 4.450 vàng/giờ.

### 13.2. Quy tắc

- Tối đa 12 giờ (thẻ tháng: 16 giờ, +30%).
- Kho AFK = phần thưởng tích lũy chưa nhận. Két sắt giữ an toàn 40% (nâng cấp tới 60%).
- **Nâng két sắt:** 45% (20.000 vàng) · 50% (60.000) · 55% (150.000) · 60% (400.000).
- Nhận nhanh 2 giờ: lần đầu mỗi ngày miễn phí, sau đó 50 / 80 / 120 / 160 💎 (tối đa 5 lần/ngày).

### 13.3. Năng lượng

| Thông số | Giá trị |
|---|---|
| Tối đa | 100 (có thể vượt tối đa khi nhận từ quà, tối đa 300) |
| Hồi | 1 điểm / 4 phút |
| Mỗi lượt | 10 |
| Mua thêm | 60 năng lượng: 50 / 80 / 120 💎 (tối đa 3 lần/ngày) |
| Nhiệm vụ ngày | Tặng 40 năng lượng |
| Người mới | Tầng 1–15 miễn phí trong 48 giờ đầu |

---

## 14. Kinh tế hằng ngày (người chơi không nạp)

Số liệu từ **mô phỏng v1** (300 người chơi × 30 ngày, mục 25). Người chơi "chơi đều": mở app 4 lần/ngày, 8 lượt mỗi lần, bấm kỹ năng ở mức Good. Giá trị là trung vị.

### 14.1. Tiến trình và dòng vàng

| Ngày | Cấp | Tầng | Power | Cấp nâng trung bình | Vàng thu/ngày | Vàng tiêu/ngày | Vàng tồn |
|---|---|---|---|---|---|---|---|
| 1 | 18 | 34 | 1.253 | +8,7 | 144.700 | 49.100 | 99.600 |
| 3 | 27 | 46 | 1.859 | +10,5 | 174.500 | 78.600 | 296.100 |
| 7 | 37 | 49 | 2.706 | +12,0 | 205.400 | 114.100 | 694.500 |
| 14 | 50 | 59 | 4.087 | +12,2 | 269.200 | 149.500 | 1.635.900 |
| 30 | 60 | 60 | 5.709 | +14,3 | 282.100 | 231.700 | 2.903.600 |

**Nguồn vàng (toàn bộ người chơi):** hầm ngục 59% · AFK 35% · nhiệm vụ ngày 5% · bang hội 2%.
**Kim Cương miễn phí:** khoảng **81 💎/ngày** (mục tiêu 60–80).

### 14.2. Vấn đề còn lại: thừa vàng

- Người chơi chỉ tiêu khoảng **61%** số vàng kiếm được. Vàng tồn tăng liên tục (gần 3 triệu ở ngày 30).
- Nguyên nhân: tốc độ nâng cấp bị giới hạn bởi **Đá Cường Hóa**, không phải vàng.
- Mô phỏng chưa tính các chỗ tiêu vàng khác: đúc lại, chế tạo, két sắt, góp hội, cửa hàng. Dù tính thêm, vẫn nên có một chỗ tiêu vàng không giới hạn.
- **Đã áp dụng:** mua Đá Cường Hóa bằng vàng ở Lò rèn. 20 viên đầu mỗi ngày giá 2.000 vàng/viên, sau mỗi 20 viên giá tăng 10%, tối đa 100 viên/ngày, làm mới hằng ngày.
- **Kết quả mô phỏng sau khi áp dụng:** tỉ lệ tiêu vàng tăng từ 61% lên **95%**, vàng tồn ngày 30 của người chơi đều giảm từ khoảng 2,9 triệu xuống khoảng 71.000. Nhịp tiến độ gần như không đổi.

### 14.3. Người nạp so với người không nạp

| Chỉ số sau 30 ngày | Không nạp | Thẻ tháng (250⭐) | Nạp vừa (khoảng 2.000⭐/tháng) |
|---|---|---|---|
| Kim Cương | khoảng 2.100 | khoảng 5.400 | khoảng 17.000 |
| Tốc độ tài nguyên | ×1,0 | ×1,3 | khoảng ×2,0 |
| Power ước tính | 100% | khoảng 125% | khoảng 180% |

Mục tiêu GDD: chênh lệch tối đa khoảng ×3.

---

## 15. Đấu trường

### 15.1. Điểm và bậc

- Điểm bắt đầu: **1.000.**
- Điểm thắng/thua theo công thức Elo, hệ số K = 32. Thắng tối thiểu +8, tối đa +40. Thua tối đa −25.
- Thua khi phòng thủ chỉ mất **một nửa** số điểm thông thường (người chơi offline không bị phạt nặng).

| Bậc | Điểm | Huy hiệu/ngày | Kim Cương/ngày | Thưởng cuối mùa |
|---|---|---|---|---|
| Đồng (I–III) | < 1.200 | 50 | 10 | 100 💎 |
| Bạc (I–III) | 1.200 – 1.399 | 80 | 15 | 200 💎 |
| Vàng (I–III) | 1.400 – 1.599 | 120 | 20 | 350 💎 |
| Bạch Kim (I–III) | 1.600 – 1.799 | 160 | 30 | 500 💎 |
| Kim Cương (I–III) | 1.800 trở lên | 200 | 40 | 800 💎 |
| Chúa Tể Ngầm | Top 100 Khu và ≥ 2.000 | 250 | 50 | 1.000 💎 + khung avatar + danh hiệu |

### 15.2. Ghép đối thủ

- 3 đối thủ: **dễ** (điểm −150 đến −50), **ngang** (±50), **khó** (+50 đến +200).
- Không đủ người thật trong khoảng điểm thì dùng **bot** có chỉ số tương đương (hiển thị tên bình thường, đánh dấu nội bộ).
- Đổi danh sách đối thủ: miễn phí 1 lần/ngày, sau đó 30 💎.

### 15.3. Cửa hàng Đấu trường (đổi Huy hiệu)

| Vật phẩm | Giá | Giới hạn |
|---|---|---|
| Đá Cường Hóa ×10 | 100 | 5/tuần |
| Tinh Thể ×5 | 150 | 3/tuần |
| Bản vẽ bộ (chọn chương đã vượt) | 800 | 1/tuần |
| Lõi Huyền Thoại | 1.500 | 1/tuần |
| Skin mùa | 3.000 | 1/mùa |

---

## 16. Cướp kho và truy nã

### 16.1. Công thức cướp

```
Phần có thể cướp  = Kho AFK × (1 − Tỉ lệ két sắt)
Người bị cướp mất = 10% × Phần có thể cướp       (chỉ vàng, Đá Cường Hóa và Bụi Sắt; không mất trang bị)
Người cướp nhận   = 80% × Người bị cướp mất
Giới hạn nhận     = 6 × tốc độ AFK vàng mỗi giờ của người cướp (chống người cấp thấp cướp kho khổng lồ)
```

### 16.2. Tìm mục tiêu

- Danh sách 3 mục tiêu cùng Khu, Power ±20%, không có khiên, không có bảo hộ tân thủ, tài khoản trên 3 ngày tuổi.
- Hiển thị **ước tính số vàng có thể cướp** để người chơi chọn mục tiêu béo bở.
- Đổi danh sách: miễn phí 3 lần/ngày.
- Không cướp được cùng một người quá **1 lần/ngày** (trừ trả thù).

### 16.3. Truy nã

- Mỗi ngày, 5 người cướp thành công nhiều nhất Khu lên Bảng Truy nã, kèm tiền thưởng: `2.000 × số lần cướp thành công` vàng.
- Mỗi người chơi được săn truy nã 2 lần/ngày (không tốn lượt cướp). Điều kiện: Power ±30%.
- Hạ được người bị truy nã: nhận tiền thưởng và **gấp đôi** số vàng cướp được. Người bị truy nã không mất thêm gì ngoài lượng cướp thông thường.

---

## 17. Bang hội

### 17.1. Cấp hội

| Cấp | EXP hội cần | Thành viên tối đa | Mở khóa |
|---|---|---|---|
| 1 | — | 30 | Boss hội, Cống hiến |
| 2 | 20.000 | 30 | Cửa hàng hội cấp 1 |
| 3 | 60.000 | 32 | Buff hội: +3% vàng |
| 4 | 140.000 | 32 | Chiến tranh hội |
| 5 | 280.000 | 34 | Buff hội: +3% ATK |
| 6 | 500.000 | 34 | Cửa hàng hội cấp 2 |
| 7 | 800.000 | 36 | Buff hội: +5% AFK |
| 8 | 1.200.000 | 38 | Buff hội: +3% HP |
| 9 | 1.800.000 | 40 | Cửa hàng hội cấp 3 |
| 10 | 2.600.000 | 40 | Khung tên hội vàng |

### 17.2. Cống hiến hằng ngày (1 lần/ngày)

| Mức | Chi phí | Điểm cống hiến cá nhân | EXP hội |
|---|---|---|---|
| Cơ bản | 5.000 vàng | 50 | 100 |
| Tốt | 30.000 vàng | 150 | 300 |
| Hào phóng | 100 💎 | 400 | 800 |

### 17.3. Boss hội

- Máu boss = `5.000.000 × 1,25^(cấp hội − 1)`. Mỗi thành viên 2 lượt/ngày, mỗi lượt 60 giây.
- Thưởng chung theo % máu cả hội gây ra: 25% / 50% / 75% / 100% → rương hội cấp 1–4 cho tất cả thành viên đã đánh ít nhất 1 lượt.
- Thưởng riêng: điểm cống hiến = sát thương / 10.000 (tối đa 300/ngày).

### 17.4. Chiến tranh hội

- Mỗi hội chọn **20 thành viên** tham chiến (mặc định 20 người có Power cao nhất). Mỗi người có 2 lượt tấn công.
- Đội phòng thủ của hội đối thủ: 20 thành viên, mỗi người có thể bị tấn công nhiều lần.
- Sao mỗi trận thắng: còn trên 70% HP = 3 sao, 30–70% = 2 sao, dưới 30% = 1 sao. Mỗi người phòng thủ chỉ tính số sao cao nhất mà hội đối thủ lấy được trên họ (tối đa 60 sao toàn hội).
- Bằng sao thì xét tổng % HP còn lại.
- Thưởng: thắng 300 điểm cống hiến + rương chiến tranh. Thua 120 điểm cống hiến.

### 17.5. Cửa hàng hội (đổi điểm cống hiến)

| Vật phẩm | Giá | Giới hạn |
|---|---|---|
| Đá Cường Hóa ×20 | 300 | 5/tuần |
| Bản vẽ bộ | 1.200 | 1/tuần |
| Lõi Huyền Thoại | 2.000 | 1/tuần (cửa hàng cấp 2) |
| Rương Ngầm ×1 | 1.000 | 2/tuần (cửa hàng cấp 3) |

---

## 18. Nhiệm vụ và thành tựu

### 18.1. Nhiệm vụ ngày (mở ở cấp 10)

Mỗi nhiệm vụ cho **20 điểm hoạt động**.

| Nhiệm vụ |
|---|
| Nhận Kho AFK 2 lần |
| Hoàn thành 3 lượt hầm ngục |
| Đánh 2 trận đấu trường |
| Nâng cấp trang bị 1 lần |
| Đánh boss hội 1 lượt |
| Cướp kho hoặc săn truy nã 1 lần |

**Rương hoạt động:**

| Điểm | Thưởng |
|---|---|
| 40 | 5.000 vàng + 20 năng lượng |
| 80 | 15 💎 + 5 Đá Cường Hóa |
| 100 | 15 💎 + 5.000 vàng + 20 năng lượng + 5 Đá Cường Hóa |

Chỉ cần 5/6 nhiệm vụ để đạt 100 điểm, người chơi không phải làm tất cả.

### 18.2. Nhiệm vụ tuần

| Nhiệm vụ | Thưởng |
|---|---|
| Đạt 500 điểm hoạt động trong tuần | 60 💎 |
| Tham gia chiến tranh hội | 40 💎 |
| Thắng 15 trận đấu trường | 30 Đá Cường Hóa |
| Vượt 3 tầng mới hoặc đạt 1 mốc Tầng Vô Tận | 20.000 vàng |

### 18.3. Thành tựu (ví dụ)

| Nhóm | Mốc | Thưởng |
|---|---|---|
| Vượt tầng | 10 / 20 / 30 / 40 / 50 / 60 | 50 / 80 / 120 / 160 / 200 / 300 💎 |
| Lên cấp | 10 / 20 / 30 / 40 / 50 / 60 | 30 / 50 / 80 / 120 / 160 / 250 💎 |
| Sưu tầm Huyền Thoại | 1 / 5 / 10 / 25 | Danh hiệu + 50–200 💎 |
| Đủ bộ 6 món | Mỗi bộ | Danh hiệu theo bộ + 100 💎 |
| Đấu trường | Thắng 10 / 50 / 200 / 1.000 | 20–200 💎 |
| Nâng cấp | Món đầu tiên +10 / +12 / +15 | 50 / 100 / 300 💎 |

---

## 19. Battle Pass

- Mùa 28 ngày, **40 cấp**. Mỗi cấp cần 1.000 điểm Pass.
- Điểm Pass: 1 điểm hoạt động ngày = 10 điểm Pass (tối đa 1.000/ngày), nhiệm vụ tuần +2.000 mỗi nhiệm vụ.
- Người chơi đều đặn đạt cấp 40 vào khoảng ngày 22–25.
- Mua bằng **450⭐** (hoặc **3.000 💎** cho người không nạp, có thể tích trong khoảng 6 tuần).

| Cấp | Miễn phí | Cao cấp |
|---|---|---|
| 1 | 5.000 vàng | Skin vũ khí mùa |
| 5 | 10 Đá Cường Hóa | 100 💎 |
| 10 | 30 💎 | Bản vẽ bộ (chọn) |
| 15 | 20.000 vàng | Lõi Huyền Thoại ×2 |
| 20 | Rương Ngầm ×1 | 200 💎 + Rương Ngầm ×3 |
| 25 | 15 Tinh Thể | Khung avatar mùa |
| 30 | 50 💎 | Đồ Huyền Thoại theo lớp (ilvl = tầng cao nhất) |
| 35 | 30.000 vàng | 300 💎 |
| 40 | Danh hiệu mùa | **Skin nhân vật mùa** + Rương Ngầm ×5 |

Các cấp ở giữa xen kẽ vàng, đá, năng lượng. Tổng giá trị cao cấp: khoảng 1.000 💎, 9 lượt rương, 1 Huyền Thoại, 2 skin.

---

## 20. Cửa hàng

### 20.1. Gói Stars

Xem GDD mục 13.2 và 13.3. Mã gói dùng trong hệ thống:

| Mã | Giá | Nội dung |
|---|---|---|
| `gems_140` | 25⭐ | 140 💎 |
| `gems_300` | 50⭐ | 300 💎 |
| `gems_1600` | 250⭐ | 1.600 💎 |
| `gems_3400` | 500⭐ | 3.400 💎 |
| `gems_7000` | 1.000⭐ | 7.000 💎 |
| `gems_18000` | 2.500⭐ | 18.000 💎 |
| `pass_monthly` | 250⭐ | Thẻ tháng |
| `pass_weekly` | 75⭐ | Thẻ tuần |
| `battlepass_s{n}` | 450⭐ | Battle Pass mùa n |
| `growth_fund` | 500⭐ | Gói tăng trưởng |
| `offer_{id}` | 100–250⭐ | Gói theo hoàn cảnh |

### 20.2. Cửa hàng Kim Cương (làm mới hằng ngày)

| Vật phẩm | Giá |
|---|---|
| Đá Cường Hóa ×30 | 120 💎 (3 lần/ngày) |
| Tinh Thể ×10 | 150 💎 (2 lần/ngày) |
| Năng lượng ×60 | 50 / 80 / 120 💎 |
| Đổi lớp | Miễn phí (cấp độ dùng chung, mỗi lớp có túi đồ riêng) |
| Đổi tên | 200 💎 (lần đầu miễn phí) |
| Skin | 600 – 1.800 💎 |

### 20.3. Chợ Đen (sự kiện tuần 4)

Bán 6 vật phẩm ngẫu nhiên bằng vàng hoặc Huy hiệu: bản vẽ, Lõi Huyền Thoại, đồ Sử Thi có chỉ số phụ tốt. Làm mới mỗi 8 giờ.

---

## 21. Bot Telegram

### 21.1. Lệnh

| Lệnh | Tác dụng | Dùng ở |
|---|---|---|
| `/start` | Chào mừng + nút mở Mini App. Nhận tham số giới thiệu `ref_<id>` | Chat riêng |
| `/play` | Nút mở Mini App | Chat riêng, group |
| `/profile` | Thẻ thông tin: cấp, Power, bậc đấu trường, hội | Chat riêng, group |
| `/guild` | Tình trạng hội: boss hội, chiến tranh, người chưa đánh | Group hội |
| `/top` | Top 10 thành viên hội theo cống hiến tuần | Group hội |
| `/link` | Hội trưởng gắn group hiện tại với hội | Group |
| `/settings` | Bật/tắt thông báo, đổi ngôn ngữ | Chat riêng |
| `/help` | Hướng dẫn và liên hệ hỗ trợ | Mọi nơi |

### 21.2. Mẫu tin nhắn (tiếng Anh là gốc)

**Chào mừng (`/start`):**
> 🕳️ **Welcome to the Undercity, Hunter.**
> Monsters below. Loot everywhere. Rivals who want your stash.
> **[⚔️ Play now]**

**Kho AFK đầy:**
> 📦 **Kat:** "Your stash is full. Every minute you wait is gold you lose."
> **[Claim]**

**Bị cướp:**
> ⚔️ **Three-Scars:** "**{name}** just raided **{gold}** gold from your stash. You gonna let that slide?"
> **[⚔️ Revenge]** **[🛡️ View stash]**

**Phòng thủ thành công:**
> 🛡️ **Three-Scars:** "**{name}** tried to raid you and crawled home empty-handed."

**Group hội, boss hội:**
> 🐲 **Guild Boss** — {percent}% HP left. **{count}** members haven't attacked yet: {mentions}
> **[⚔️ Attack]**

**Group hội, chiến tranh:**
> ⚔️ **Guild War** vs **{enemy}** — {our_stars}⭐ : {their_stars}⭐ · {hours}h left
> **[Join the fight]**

**Rơi Huyền Thoại (thẻ chia sẻ):**
> 🔥 **{name}** just pulled a **LEGENDARY {item}** from the Abyss!
> **[Play UNDERWORLD]**

### 21.3. Quy tắc gửi

- Tối đa 3 tin chủ động/ngày/người chơi. Tin trong group hội không tính vào giới hạn này nhưng tối đa 6 tin/ngày/group.
- Giờ yên tĩnh 23:00–07:00 theo múi giờ thiết bị người chơi.
- Người chơi chặn bot thì đánh dấu `bot_blocked = true` và dừng gửi.
- Hàng đợi gửi toàn hệ thống: 25 tin/giây (dưới giới hạn khoảng 30 tin/giây của Telegram), 1 tin/giây cho mỗi group.

---

## 22. Mô hình dữ liệu

PostgreSQL. Mọi thời gian lưu dạng `timestamptz` UTC. Số tiền là `bigint`.

```sql
-- Tài khoản và Khu
regions        (id, code, name_key, tz_offset_minutes, reset_hour)
realms         (id, region_id, number, status, opened_at, player_count)
players        (id, telegram_id UNIQUE, username, display_name, language, device_tz,
                realm_id, class, level, exp, power,
                created_at, last_seen_at, bot_blocked, newbie_protect_until, region_change_until)

-- Tiền tệ và sổ cái
balances       (player_id PK, gold, gems, arena_badges, guild_merit, gems_debt)
materials      (player_id, material_code, amount, PRIMARY KEY (player_id, material_code))
ledger         (id, player_id, currency_or_material, delta, balance_after,
                reason, ref_type, ref_id, idempotency_key UNIQUE, created_at)

-- Vật phẩm
items          (id, player_id, slot, base_code, set_code, rarity, ilvl,
                main_stat jsonb, substats jsonb, legendary_effect, enhance_level,
                luck, reforge_count, equipped bool, locked bool, created_at, source)
pity_counters  (player_id, counter_code, value, PRIMARY KEY (player_id, counter_code))

-- Tiến trình
dungeon_progress (player_id, floor, stars, first_clear_at, PRIMARY KEY (player_id, floor))
afk_state        (player_id PK, last_claim_at, vault_level, fast_claims_today)
energy_state     (player_id PK, value, updated_at)   -- tính lười khi đọc

-- Trận đấu
battles        (id, player_id, type, floor_or_target, seed, snapshot jsonb,
                input_log jsonb, result jsonb, status, started_at, finished_at)

-- PvP
arena          (player_id PK, season_id, rating, tier, attempts_today, defense_snapshot jsonb)
raids          (id, attacker_id, defender_id, success, gold_lost, gold_gained,
                is_revenge, battle_id, created_at)
shields        (player_id PK, until)
bounties       (realm_id, date, player_id, reward, hunted_count)

-- Bang hội
guilds         (id, realm_id, name, tag, language, level, exp, leader_id,
                telegram_chat_id, announcement, created_at)
guild_members  (guild_id, player_id, role, joined_at, weekly_merit, PRIMARY KEY (guild_id, player_id))
guild_boss     (guild_id, date, hp_max, hp_left)
guild_boss_hits(guild_id, date, player_id, damage, attempts)
guild_wars     (id, region_id, week, guild_a, guild_b, stars_a, stars_b, status)
guild_war_attacks (war_id, attacker_id, defender_id, stars, hp_left_pct, battle_id)

-- Thanh toán
purchases      (id, player_id, product_code, stars, telegram_payment_charge_id UNIQUE,
                status, refunded_at, created_at)
subscriptions  (player_id, product_code, starts_at, ends_at, last_daily_claim)

-- Nhiệm vụ, sự kiện, thư
quest_progress (player_id, quest_code, period_key, progress, claimed)
battlepass     (player_id, season_id, points, premium, claimed_free int[], claimed_premium int[])
mail           (id, player_id, title_key, body_key, params jsonb, attachments jsonb,
                expires_at, claimed_at)
events         (id, region_id, code, starts_at, ends_at, config jsonb)
feature_flags  (key, scope, scope_value, enabled)   -- scope: global / region / country
```

**Nguyên tắc ghi:**
- Mọi thay đổi `balances`, `materials`, `items` nằm trong **một transaction** cùng bản ghi `ledger`.
- `SELECT ... FOR UPDATE` trên hàng `balances` của người chơi trước khi trừ tiền.
- Cướp kho khóa hàng `afk_state` của **cả hai** người theo thứ tự `player_id` tăng dần để tránh deadlock.

---

## 23. API

REST qua HTTPS. Mọi yêu cầu gửi kèm header `X-Telegram-Init-Data` (máy chủ xác thực HMAC). Yêu cầu thay đổi tài sản bắt buộc có header `Idempotency-Key`.

| Nhóm | Phương thức và đường dẫn | Mô tả |
|---|---|---|
| Auth | `POST /auth/session` | Xác thực initData, tạo hoặc lấy người chơi, trả về JWT ngắn hạn |
| Người chơi | `GET /me` | Hồ sơ, số dư, năng lượng, AFK, mục tiêu kế tiếp |
| | `PATCH /me/settings` | Ngôn ngữ, thông báo, Vùng |
| Hầm ngục | `GET /dungeon/chapters` | Tiến trình và sao các tầng |
| | `POST /battles/dungeon/start` | `{floor}` → `{battleId, seed, snapshot, enemies}` |
| | `POST /battles/{id}/finish` | `{inputLog, clientResult}` → máy chủ chạy lại, trả phần thưởng |
| | `POST /dungeon/sweep` | `{floor, times}` |
| AFK | `GET /afk` | Kho hiện tại, phần trong két sắt |
| | `POST /afk/claim` · `POST /afk/fast-claim` | |
| Trang bị | `GET /items` | Lọc theo ô, độ hiếm |
| | `POST /items/{id}/equip` · `/enhance` · `/reforge` · `/lock` | |
| | `POST /items/salvage` | `{itemIds[]}` hoặc `{maxRarity}` |
| | `POST /craft` | `{recipeCode, slot?}` |
| Đấu trường | `GET /arena` · `GET /arena/opponents` · `POST /arena/refresh` | |
| | `POST /battles/arena/start` | `{opponentId}` → máy chủ tính trận luôn, trả kết quả và dữ liệu phát lại |
| | `PUT /arena/defense` | Lưu đội hình phòng thủ |
| Cướp kho | `GET /raid/targets` · `POST /raid/{targetId}` · `POST /raid/revenge/{raidId}` | |
| | `GET /raid/log` · `GET /bounties` · `POST /bounties/{playerId}/hunt` | |
| Hội | `GET /guilds?lang=&q=` · `POST /guilds` · `POST /guilds/{id}/join` · `POST /guilds/leave` | |
| | `GET /guild` · `POST /guild/donate` · `POST /guild/boss/attack` | |
| | `GET /guild/war` · `POST /guild/war/attack/{defenderId}` | |
| | `PATCH /guild/members/{id}` | Đổi vai trò, mời ra |
| Cửa hàng | `GET /shop` · `POST /shop/buy` | Mua bằng Kim Cương/Vàng/Huy hiệu |
| | `POST /payments/invoice` | `{productCode}` → link hóa đơn Stars |
| Rương | `POST /chest/open` | `{count: 1 | 10, free?: bool}` |
| Nhiệm vụ | `GET /quests` · `POST /quests/{code}/claim` · `GET /battlepass` · `POST /battlepass/claim` | |
| Thư | `GET /mail` · `POST /mail/{id}/claim` · `POST /mail/claim-all` | |
| Webhook bot | `POST /telegram/webhook` | Nhận `pre_checkout_query`, `successful_payment`, lệnh bot, `my_chat_member` |

**WebSocket** (`/ws`) chỉ dùng cho: cập nhật boss hội trực tiếp, điểm chiến tranh hội, thông báo trong app (bị cướp, thư mới). Mất kết nối thì quay về gọi REST định kỳ.

---

## 24. Thứ tự làm việc cho đội lập trình

| Tuần | Việc |
|---|---|
| 1 | Khung dự án (monorepo: `apps/miniapp`, `apps/api`, `apps/bot`, `packages/combat`, `packages/shared`). Xác thực Telegram. CI/CD. Hạ tầng i18n |
| 2 | `packages/combat`: vòng tick, công thức, RNG có seed, kỹ năng Đồ Tể. **Test chạy lại cho cùng kết quả trên Node và trình duyệt** |
| 3 | Bảng dữ liệu tĩnh (quái, chương, bảng rơi, chỉ số đồ) dạng JSON có kiểm tra schema. API hầm ngục start/finish, ledger |
| 4 | Mini App: thanh trên, Home, màn chiến đấu (PixiJS), kết quả trận, rơi đồ |
| 5 | Trang bị, túi đồ, nâng cấp, phân rã. AFK và năng lượng |
| 6 | Hướng dẫn tân thủ theo kịch bản GDD mục 14.2. Đo phễu sự kiện |
| 7 | Kiểm thử nội bộ bản 1. **Đánh giá: đánh và rơi đồ có vui không?** |
| 8–11 | Bản 2: Đấu trường, Cướp kho, bot thông báo, thanh toán Stars, tầng 31–60 |
| 12–16 | Bản 3: Bang hội, Xạ Thủ, Phù Thủy Ngầm, Battle Pass, Rương Ngầm, dịch 4 ngôn ngữ |

**Công cụ cần làm sớm:**
- **Trang quản trị:** tra cứu người chơi, xem ledger, gửi thư bồi thường, bật/tắt feature flag, chỉnh sự kiện.
- **Script mô phỏng kinh tế:** dùng chính `packages/combat` và bảng dữ liệu tĩnh để mô phỏng 1.000 người chơi trong 30 ngày. Kết quả dùng để chỉnh các con số trong tài liệu này.

---

## 25. Mô phỏng v1: kết quả và các thay đổi

**Cách chạy:** `npm run sim -- --players 300 --days 30 --seed 1` (khoảng 45 giây). Người chơi ảo dùng **chính engine chiến đấu và bảng rơi đồ của game**, chia 3 nhóm: chơi nhẹ 35%, chơi đều 45%, chơi nhiều 20%. Có 8% mua thẻ tháng. Mỗi lớp nhân vật chiếm 1/3.

### 25.1. Vấn đề phát hiện và cách đã sửa

| Vấn đề | Số liệu trước khi sửa | Đã sửa |
|---|---|---|
| Xạ Thủ và Phù Thủy cấp 1 thua tầng 1 | Tỉ lệ thắng 43% và 13% | Tăng HP/DEF gốc, giảm ATK quái đầu game. Giờ cả 3 lớp thắng 100% |
| Thua trận không được gì, nên người kẹt ở tầng 1 không bao giờ lên cấp | 7/60 người chơi kẹt ở tầng 0 | Thua vẫn nhận 50% vàng và EXP của các đợt đã dọn |
| Cấp 60 quá sớm | Ngày 8 (chơi đều) | Đường cong EXP L^1,9, EXP theo tầng mũ 0,6. Giờ là ngày 22 |
| Hết nội dung quá sớm | Qua tầng 60 vào ngày 7 | Hệ số tầng 1,09 và chi phí nâng cấp tăng theo ilvl. Giờ qua tầng 60 vào khoảng ngày 30 |
| Nâng cấp quá rẻ | Đồ +15 vào ngày 14, sau đó không còn gì để tiêu vàng | Chi phí theo `(ilvl/30)^1,5`, đá theo `ilvl/20`, bỏ nhân 3 đá khi vượt tầng lần đầu |
| Tường ở boss tầng 50 | 131/150 người kẹt nhiều ngày | Vùng độc 2% → 1%/giây; bào tử nổ 80% → 35% ATK; HP boss chương 2.500 → 1.400 |
| Boss tầng 60 không thể thắng | Thua cả khi mặc đồ Huyền Thoại +15 (hệ số tầng 1,10) | Hệ số tầng 1,10 → 1,09; Cuồng nộ của Kẻ Gác Vực giảm |
| Đồ Tể yếu nhất cuối game | Tầng 57 so với tầng 59 của Xạ Thủ ở ngày 30 | Chém Xoáy +10% mỗi bậc |

### 25.2. Kết quả hiện tại

- **Thời lượng nội dung:** người chơi đều qua tầng 60 vào khoảng ngày 30, người chơi nhẹ ở tầng 59 vào ngày 30. Đúng mục tiêu 30–40 ngày.
- **Cân bằng lớp:** đến ngày 30 cả 3 lớp đều qua tầng 60, lực chiến 5.400–6.000.
- **Mốc khó:** boss tầng 50 và tầng 60 là hai điểm người chơi dừng lại vài ngày để nâng đồ. Đây là chủ đích (mốc chương), không còn là bức tường.
- **Kim Cương:** khoảng 81 💎/ngày cho người không nạp.

### 25.3. Việc cần chỉnh tiếp

1. **Đầu game:** cấp 20 vào ngày 2 thay vì ngày 1. Nên tăng EXP cho chuỗi nhiệm vụ tân thủ ngày 1.
2. ~~**Thừa vàng**~~: đã thêm mua đá ở Lò rèn (mục 14.2). Tỉ lệ tiêu vàng hiện là 95%.
3. **Phù Thủy Ngầm** tiến chậm hơn 2 lớp kia ở ngày 7–14 (tầng 49 so với 54). Theo dõi thêm sau khi có dữ liệu beta.
4. **Mô phỏng chưa có:** PvP, bang hội, chế tạo, đúc lại, Tầng Vô Tận, người nạp lớn. Các phần này cần thêm vào trước khi soft launch.

### 25.4. Cập nhật: túi đồ theo lớp và hướng dẫn tân thủ

- **Đồ thuộc lớp:** mỗi món có `classId`. Tỉ lệ rơi: 60% lớp đang chơi, 20% mỗi lớp còn lại. Mô phỏng 300 người chơi × 30 ngày cho thấy lực chiến chỉ thấp hơn khoảng 2–6%, mốc qua tầng 60 vẫn quanh ngày 30, nên không cần cân bằng lại.
- **Thưởng hướng dẫn:** lần đầu qua tầng 1 chắc chắn rơi áo Hiếm, boss tầng 3 lần đầu chắc chắn rơi vũ khí Sử Thi. Cả hai đều thuộc lớp đang chơi.
- **Mở theo cấp:** Phúc lợi chỉ xuất hiện từ cấp 6. Nâng cấp ở cấp 3 và AFK ở cấp 7 mở kèm popup giới thiệu của NPC.
- **Trong trận đầu:** lần đầu kỹ năng sẵn sàng, game chậm lại và có ngón tay chỉ nút. Boss tầng 3 có gợi ý phá khiên bằng Perfect. Màn kết quả có nút trang bị ngay món tốt nhất.
