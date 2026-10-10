# UNDERWORLD: LOOT & RAID — TÀI LIỆU THIẾT KẾ GAME (GDD)

> Phiên bản: 0.3 (bản nháp) · Ngày: 10/10/2026
> Tên game: **UNDERWORLD** (tên đầy đủ: *UNDERWORLD: Loot & Raid*)
> Nền tảng: Telegram Mini App + Telegram Bot
> Thị trường: **Quốc tế, không bao gồm Việt Nam** (đa ngôn ngữ, đa múi giờ)
> Thể loại: Nhập vai cày đồ (loot RPG) + idle + PvP bất đồng bộ + bang hội
> Mô hình: Free-to-play, nạp Telegram Stars
>
> Thiết kế chi tiết (số liệu, màn hình, bot, dữ liệu, API): [underworld_detailed_design.md](underworld_detailed_design.md)
>
> **Thay đổi so với 0.2:** chốt tên UNDERWORLD. Chốt chỉ làm thị trường nước ngoài: bỏ tiếng Việt khỏi game, thay bằng tiếng Tây Ban Nha trong đợt ra mắt. Cập nhật các mục 2, 3, 15, 16, 17, 20, 21, 23 và Phụ lục A.
>
> **Thay đổi so với 0.1:** chuyển từ thị trường Việt Nam sang quốc tế. Thêm mục 17 (Phát hành toàn cầu và bản địa hóa), thêm Phụ lục A (thuật ngữ Việt–Anh).

---

## Mục lục

1. Tóm tắt
2. Rà soát: những điểm chưa hợp lý và cách sửa
3. Định vị, thị trường và người chơi mục tiêu
4. Bối cảnh thế giới
5. Vòng chơi cốt lõi
6. Nhân vật, lớp và chỉ số
7. Hầm ngục (chơi solo chủ động)
8. Cày offline (AFK)
9. Trang bị và hệ thống cày đồ
10. PvP: Đấu trường, Cướp kho, Truy nã
11. Bang hội
12. Tiền tệ và kinh tế
13. Nạp Telegram Stars
14. Trải nghiệm người chơi mới (30 phút đầu, 7 ngày đầu)
15. Giữ chân người chơi và cơ chế bắt kịp
16. Thu hút người chơi và lan truyền
17. Phát hành toàn cầu và bản địa hóa
18. Kiến trúc kỹ thuật
19. Chống gian lận
20. Pháp lý và chính sách nền tảng
21. Lộ trình MVP
22. Chỉ số cần theo dõi
23. Quyết định đã chốt và câu hỏi còn mở

Phụ lục A. Bảng thuật ngữ Việt–Anh

---

## 1. Tóm tắt

**Một câu:** Bạn là một Kẻ Săn (Hunter) trong thành phố ngầm. Bạn xuống hầm ngục lấy đồ, đánh và cướp người chơi khác, rồi cùng bang hội chiếm các quận của thành phố.

**Bốn cảm xúc game phải tạo ra:**

| Cảm xúc | Đến từ đâu |
|---|---|
| **Hồi hộp khi rơi đồ** | Đồ có độ hiếm và chỉ số ngẫu nhiên, boss rơi đồ, bảo hiểm rơi đồ |
| **Mạnh lên nhìn thấy được** | Lực chiến tăng sau mỗi lần thay đồ hoặc nâng cấp, vượt tầng mới |
| **Tức và muốn trả thù** | Bị cướp kho, bot nhắn thông báo, bấm nút trả thù |
| **Thuộc về một nhóm** | Bang hội gắn với group Telegram, cùng đánh boss hội, chiến tranh chiếm quận |

**Nguyên tắc thiết kế xuyên suốt:**

1. **Mỗi lần mở app ngắn (3–5 phút) nhưng luôn có thưởng.**
2. **Người nạp mạnh nhanh hơn, không phải mạnh vô hạn.** Người cày vẫn có đường lên.
3. **Người mới không bao giờ bị phạt nặng.** Họ được bảo vệ, được đuổi kịp, được chào đón.
4. **Mọi tính toán quan trọng nằm ở máy chủ.**
5. **Toàn cầu từ ngày đầu:** không viết cứng chữ, giờ hay giá vào mã nguồn. Mọi thứ phụ thuộc ngôn ngữ, múi giờ và khu vực đều cấu hình được.

---

## 2. Rà soát: những điểm chưa hợp lý và cách sửa

Phần này liệt kê các lỗ hổng tìm thấy khi rà lại ý tưởng ban đầu, cùng các vấn đề phát sinh khi mở rộng ra thị trường toàn cầu. Các mục tiếp theo của tài liệu đã áp dụng cách sửa.

### 2.1. Thiết kế gameplay và kinh tế

| # | Vấn đề | Vì sao chưa hợp lý | Cách sửa (đã áp dụng) |
|---|---|---|---|
| 1 | Bán rương bằng Stars trực tiếp, giá 100⭐ cho 10 lượt | Quá rẻ so với giá trị và mất cân đối với các gói khác. Bán thẳng bằng Stars khó điều chỉnh giá về sau | Dùng **Kim Cương** làm tiền trung gian. Stars → Kim Cương → mọi thứ. Định giá lại: 10 lượt rương ≈ 250⭐ (mục 13) |
| 2 | "Mọi món trả phí đều kiếm được bằng cày" nhưng Battle Pass lại có đồ Huyền Thoại trên đường thưởng trả phí | Hai điều này mâu thuẫn nhau | Đồ trong Battle Pass **cũng rơi từ boss**. Pass chỉ giúp nhận sớm hơn, cộng thêm skin độc quyền (không tăng chỉ số) |
| 3 | Nâng cấp từ +10 có thể tụt cấp, phải mua đá bảo hộ | Người chơi cảm thấy bị ép nạp và rất dễ bỏ game sau một lần tụt | **Không tụt cấp.** Thất bại sẽ cộng *Tích lũy may mắn*, lần sau tỉ lệ cao hơn, và chắc chắn thành công sau N lần |
| 4 | Cướp 15% kho AFK, khiên 4 giờ | Người chơi đi ngủ 8 tiếng có thể bị cướp 2–3 lần, sáng dậy mất phần lớn thành quả và thấy bất công | Có **Két sắt** giữ an toàn 40% kho. Mỗi lần mất tối đa 10%. **Tối đa 3 lần bị cướp mỗi ngày** |
| 5 | Cướp kho có thể bị lợi dụng bằng acc phụ (cho acc chính cướp acc phụ để chuyển tài nguyên) | Đây là lỗ hổng kinh tế điển hình | Chỉ cướp được người trong khoảng lực chiến ±20%. Người cướp chỉ nhận **80%** số người bị cướp mất (20% bị tiêu hủy). Tài khoản dưới 3 ngày tuổi không thể bị cướp. Phát hiện các cặp tài khoản cướp nhau lặp lại |
| 6 | Dùng một máy chủ chung cho tất cả | Người vào sau không bao giờ đuổi kịp người vào trước, xếp hạng bị chiếm hết | Chia **Khu (Realm)** khoảng 2.000 người, mở theo đợt. Có cơ chế bắt kịp cho người chậm (mục 15) |
| 7 | Năng lượng giới hạn số lượt hầm ngục ngay từ đầu | Người mới đang hào hứng thì bị chặn lại, cảm giác rất tệ | **Tầng 1–15 không tốn năng lượng** trong 48 giờ đầu |
| 8 | "Máy chủ tính trận đấu" nhưng người chơi lại bấm kỹ năng theo thời điểm | Hai yêu cầu này mâu thuẫn nếu không có thiết kế rõ | Mô phỏng **tất định theo seed**. Máy chủ cấp seed, client chơi và gửi lên chuỗi thao tác, máy chủ chạy lại để xác thực kết quả (mục 18) |
| 9 | Chiến tranh hội ghép thành viên đánh theo cặp | Hai hội chênh số thành viên thì không ghép cặp được, người vắng mặt làm cả hội thua | Mỗi thành viên có **2 lượt tấn công** trong một khung thời gian dài, đánh bất đồng bộ. Ghép hội theo tổng lực chiến của 20 thành viên mạnh nhất |
| 10 | Hội trưởng bỏ game thì hội bị kẹt | Thành viên không làm gì được | Hội trưởng vắng mặt 7 ngày thì **tự động chuyển quyền** cho phó hội năng nổ nhất |
| 11 | MVP chỉ có 30 tầng | Người cày nhiều sẽ hết nội dung trong 2–3 ngày | MVP có **60 tầng**, chặn theo lực chiến, và có tầng vô tận cho người chơi top |
| 12 | Nạp lần đầu tặng vũ khí Sử Thi, trong khi hướng dẫn tân thủ cũng tặng Sử Thi miễn phí | Phần thưởng nạp không còn hấp dẫn | Nạp lần đầu tặng **vũ khí Huyền Thoại cấp khởi đầu** và skin |
| 13 | Chưa xử lý việc hoàn tiền Stars | Telegram cho phép hoàn tiền, nên người chơi có thể nạp, tiêu, rồi đòi hoàn | Khi bị hoàn tiền: trừ Kim Cương, cho số dư âm, khóa mua cho tới khi trả đủ |
| 14 | Bot thông báo nhiều | Bot dễ bị người chơi chặn, sau đó mất luôn kênh kéo người quay lại | **Tối đa 3 thông báo chủ động mỗi ngày**, không gửi vào giờ ngủ theo giờ địa phương. Người chơi tự bật/tắt từng loại |
| 15 | Ý tưởng Underworld ban đầu có chợ tự do, ý tưởng mới không nhắc | Có chợ thì mở đường cho acc phụ và mua bán bằng tiền thật ngoài game | **MVP không có giao dịch giữa người chơi.** Giai đoạn sau mở chợ nguyên liệu có thuế 10–15%, không mở giao dịch trực tiếp |
| 16 | Đấu trường ghép theo điểm, nhưng người nạp nhiều vẫn chiếm top | Người cày thấy top là không thể chạm tới | Phần thưởng top chủ yếu là danh hiệu và skin. Phần thưởng theo **bậc** (Vàng, Kim Cương...) mới là phần thưởng giá trị, và người cày đều đặn đạt được |
| 17 | Hướng dẫn tân thủ chưa được thiết kế | Đây là lý do số 1 khiến người mới thấy chán | Thêm mục 14 về 30 phút đầu và 7 ngày đầu |

### 2.2. Vấn đề khi mở rộng ra thị trường toàn cầu

| # | Vấn đề | Vì sao chưa hợp lý | Cách sửa (đã áp dụng) |
|---|---|---|---|
| 18 | Tên "UNDERWORLD" | Đây là tên một loạt phim nổi tiếng, và nhiều game khác đã dùng. Có rủi ro tranh chấp nhãn hiệu, và chỉ một từ "Underworld" thì khó tìm thấy | **Đã chốt giữ tên UNDERWORLD.** Giảm rủi ro bằng cách luôn dùng **tên đầy đủ "UNDERWORLD: Loot & Raid"** cùng logo riêng, và tra cứu, đăng ký nhãn hiệu cho nhóm game và phần mềm (mục 20.1). Không dùng hình ảnh, phông chữ hay phong cách gợi tới loạt phim |
| 19 | Reset hằng ngày "lúc 0 giờ" và chiến tranh hội "0 giờ thứ 7 đến 20 giờ Chủ nhật" | Chỉ hợp với múi giờ Việt Nam. Người chơi ở châu Mỹ sẽ bị reset giữa buổi chiều, và chiến tranh hội rơi vào giờ làm việc | Mỗi Khu gắn với một **Vùng (Region)** có múi giờ riêng. Mọi giờ reset và sự kiện tính theo giờ của Vùng (mục 17.3) |
| 20 | NPC tên Việt (Lão Tý, Mèo Đen, Gã Ba Sẹo), lời thoại nhiều tiếng lóng | Người chơi quốc tế không hiểu, và tiếng lóng không dịch được | Mỗi NPC có **tên gốc tiếng Anh** cùng tên bản địa hóa theo ngôn ngữ. Lời thoại tránh chơi chữ không dịch được (mục 4, 17) |
| 21 | Pháp lý chỉ tính Việt Nam | Mỗi thị trường có luật riêng về loot box, dữ liệu cá nhân và độ tuổi | Viết lại mục 20: bật/tắt tính năng theo quốc gia, công khai tỉ lệ rơi, tuân thủ GDPR. **Không nhắm tới Việt Nam** (mục 20.5) |
| 22 | Giá Stars giống nhau cho mọi nước | 250⭐ là rẻ ở Mỹ nhưng đắt ở Indonesia hay Nigeria. Người chơi ở thị trường mới nổi sẽ không nạp | Thêm **gói nhỏ 25⭐** và **ưu đãi khởi đầu theo khu vực**. Bảng giá chính vẫn giống nhau toàn cầu (mục 13) |
| 23 | Một ngôn ngữ cho cộng đồng và chăm sóc khách hàng | Người chơi không nói tiếng Anh sẽ bị bỏ rơi | Mỗi ngôn ngữ chính có kênh, group và người quản trị riêng. Bot hỗ trợ trả lời theo ngôn ngữ người chơi (mục 16, 17) |
| 24 | Lời thoại "mày/tao" kiểu giang hồ | Chỉ hợp với tiếng Việt. Ngôn ngữ khác cần sắc thái riêng | Quy định **giọng văn** chung (thô ráp, hài hước, chợ đen) và để người dịch bản xứ tự chọn cách xưng hô hợp văn hóa |

---

## 3. Định vị, thị trường và người chơi mục tiêu

### 3.1. Người chơi mục tiêu

- Người dùng Telegram 18–35 tuổi, thích game nhập vai nhẹ, có thói quen mở điện thoại nhiều lần mỗi ngày.
- Đã chơi hoặc biết các game idle RPG (AFK Arena, Soul Knight, các game tap-to-earn trên Telegram).
- Có nhóm bạn trên Telegram.
- Phần lớn dùng **Android tầm trung và thấp**, mạng di động không ổn định (đặc biệt ở Đông Nam Á, Nam Á, châu Phi, Mỹ Latinh).

### 3.2. Định vị

*"A real loot RPG with PvP raids and guild wars — right inside Telegram. No download. 5 minutes at a time."*

(*"Game nhập vai cày đồ có PvP cướp kho và chiến tranh bang hội thật, ngay trong Telegram. Không cần tải. 5 phút mỗi lần."*)

**Tuyên bố rõ ràng ngay từ đầu:** game **không có token, không có airdrop, không quy đổi ra tiền thật.** Phần lớn người chơi Telegram đang mặc định "game Telegram = sẽ có token". Nếu không nói rõ, game sẽ thu hút người đến để farm, và họ sẽ bỏ đi khi biết sự thật, làm hỏng dữ liệu và cộng đồng.

### 3.3. Thị trường

Người dùng Telegram tập trung nhiều ở các khu vực như Nam Á, Đông Nam Á, Nga và các nước SNG (CIS), Trung Đông, châu Phi và Mỹ Latinh. Các khu vực này cũng là nơi game Mini App phổ biến nhất. **Số liệu thay đổi nhanh, cần cập nhật số liệu mới nhất trước khi chốt kế hoạch.**

| Nhóm | Thị trường | Lý do | Lưu ý |
|---|---|---|---|
| **A: Ra mắt** | Quốc tế nói tiếng Anh (Philippines, Ấn Độ, Nigeria, Mỹ, Anh...), Nga và các nước SNG, Indonesia, Mỹ Latinh nói tiếng Tây Ban Nha | Đông người dùng Telegram, đã quen game Mini App. Mỹ Latinh giúp Vùng châu Mỹ có đủ người chơi ngay từ đầu | Tiếng Nga và tiếng Ukraina là **hai bản riêng**, không gộp |
| **B: Mở rộng** | Brazil, Thổ Nhĩ Kỳ, Ukraina, Ấn Độ (tiếng Hindi) | Thị trường lớn, tăng trưởng nhanh | Brazil có quy định riêng về loot box với trẻ vị thành niên (mục 20) |
| **C: Sau này** | Trung Đông và Bắc Phi (tiếng Ả Rập, viết từ phải sang trái), Thái Lan, phần còn lại của châu Phi | Tiềm năng lớn | Cần hỗ trợ RTL trong giao diện. Nhạy cảm với cơ chế giống cờ bạc |
| **Không nhắm tới** | **Việt Nam** (mục 20.5). Các quốc gia và vùng bị cấm vận, nơi Telegram bị chặn hoặc hạn chế | Yêu cầu cấp phép (Việt Nam). Rủi ro pháp lý và thanh toán | Không có tiếng Việt trong game, không quảng bá. Kiểm tra với luật sư (mục 20) |

**Chiến lược ra mắt:** soft launch 4–6 tuần ở 2–3 thị trường thử nghiệm, rồi mới mở toàn cầu (mục 16.3).

---

## 4. Bối cảnh thế giới

Sau Đại Sụp Đổ, loài người sống trong **Thành Phố Ngầm (The Undercity)**: một mê cung gồm 12 quận xây chồng lên nhau dưới lòng đất. Bên dưới thành phố là **Vực Sâu (The Abyss)**, những tầng hầm cổ đầy quái vật và kho báu của nền văn minh cũ.

- **Kẻ Săn (Hunter)** là người chơi. Họ xuống Vực Sâu kiếm đồ, đem về bán và tự trang bị.
- Các **bang hội** tranh nhau cai quản các quận để thu thuế và giữ quyền xuống những tầng sâu nhất.
- **Giọng văn:** thô ráp, chợ đen, hài hước nhẹ. NPC nói ngắn, có cá tính.
- **Thế giới không gắn với một nền văn hóa cụ thể**, để người chơi ở mọi nơi đều thấy quen. Tránh biểu tượng tôn giáo và chính trị.

**NPC chính** (dẫn dắt hướng dẫn tân thủ và sự kiện). Tên gốc là tiếng Anh. Mỗi ngôn ngữ có thể đặt tên bản địa hóa. Tên tiếng Việt chỉ dùng trong tài liệu nội bộ:

| Tên gốc (EN) | Tên tiếng Việt (nội bộ) | Vai trò |
|---|---|---|
| **Old Rusty** | Lão Tý | Thợ rèn già, cộc cằn. Quản lý nâng cấp và chế tạo |
| **Kat** | Mèo Đen | Cô môi giới tin tức. Đăng nhiệm vụ, báo truy nã |
| **Three-Scars** | Gã Ba Sẹo | Ông trùm đấu trường. Quản lý PvP |

---

## 5. Vòng chơi cốt lõi

```
     ┌───────────────────────────────────────────┐
     │                                           ▼
 [Hầm ngục / AFK] ──► [Nhận đồ + nguyên liệu] ──► [Thay đồ / Nâng cấp]
     ▲                                           │
     │                                           ▼
 [Vượt tầng mới] ◄── [Lực chiến tăng] ──► [Đấu trường / Cướp kho / Boss hội]
                                                 │
                                                 ▼
                                    [Thưởng xếp hạng, danh hiệu, khoe]
```

**Vòng ngắn (mỗi lần mở app):** nhận AFK → đi 1–3 lượt hầm ngục → thay đồ → đánh 1–2 trận PvP.
**Vòng trung (mỗi ngày):** nhiệm vụ ngày, boss hội, hết năng lượng.
**Vòng dài (tuần, mùa):** chiến tranh hội, mùa đấu trường 14 ngày, Battle Pass, sự kiện.

---

## 6. Nhân vật, lớp và chỉ số

### 6.1. Lớp nhân vật

| Lớp | Phong cách | Kỹ năng đặc trưng | Cảm giác khi chơi |
|---|---|---|---|
| **Đồ Tể (Butcher)** | Cận chiến, trâu | *Chém Xoáy*: gây sát thương lan, hồi máu theo sát thương | Khó chết, đánh đều tay |
| **Xạ Thủ (Gunslinger)** | Tầm xa, chí mạng | *Phát Bắn Định Mệnh*: tích tụ rồi bắn một phát cực mạnh | Số sát thương bùng nổ, rất "đã" |
| **Phù Thủy Ngầm (Hexer)** | Phép, hiệu ứng | *Mưa Độc*: gây độc, làm chậm, choáng | Điều khiển trận đấu |

- MVP bản 1 chỉ có **Đồ Tể**. Hai lớp còn lại ra ở bản 3.
- Được **đổi lớp miễn phí trong 72 giờ đầu.** Sau đó đổi lớp tốn Kim Cương, nhưng giữ nguyên trang bị (trang bị dùng chung cho cả 3 lớp).

### 6.2. Chỉ số

| Chỉ số | Tác dụng |
|---|---|
| Máu (HP) | Hết máu là thua |
| Tấn công (ATK) | Sát thương cơ bản |
| Phòng thủ (DEF) | Giảm sát thương nhận vào |
| Tốc độ (SPD) | Ai ra đòn trước, ra đòn nhiều hơn |
| Chí mạng % / Sát thương chí mạng % | Mặc định 5% / 150% |
| Hút máu % | Hồi máu theo sát thương gây ra |

**Công thức cơ bản (bản nháp, sẽ cân chỉnh bằng mô phỏng):**

```
Sát thương = ATK × Hệ số kỹ năng × 100 / (100 + DEF đối thủ)
Nếu chí mạng: × Sát thương chí mạng %
Lực chiến (hiển thị) = HP×0.1 + ATK×1 + DEF×0.8 + SPD×2 + (Chí mạng% × ATK × 0.5) + ...
```

**Lực chiến** là con số người chơi nhìn thấy nhiều nhất. Mỗi lần nó tăng, game phải có hiệu ứng số nhảy lên để người chơi cảm nhận rõ mình vừa mạnh hơn.

### 6.3. Nhịp lên cấp (mục tiêu)

| Mốc | Thời gian chơi |
|---|---|
| Cấp 10 | 15–20 phút đầu |
| Cấp 20 | Hết ngày 1 |
| Cấp 30 | Ngày 3 |
| Cấp 45 | Ngày 14 |
| Cấp 60 (giới hạn MVP) | Khoảng ngày 30–40 |

---

## 7. Hầm ngục (chơi solo chủ động)

### 7.1. Cấu trúc

- **6 chương × 10 tầng = 60 tầng** trong MVP. Mỗi chương có môi trường, quái và boss riêng.
- Mỗi tầng gồm **3 đợt quái và 1 boss nhỏ.** Tầng 10, 20, ... là **boss chương** với cơ chế riêng (ví dụ: boss tạo khiên, phải bấm kỹ năng phá khiên đúng lúc).
- Một lượt kéo dài 1,5–3 phút.
- **Tầng Vô Tận (Endless Depths)** mở sau tầng 60: độ khó tăng dần, có bảng xếp hạng tuần theo Khu và **bảng xếp hạng toàn cầu**. Đây là nội dung cho người chơi top.

### 7.2. Cách đánh

- Đánh thường **tự động.**
- **Kỹ năng chủ động:** thanh năng lượng đầy thì người chơi bấm. Bấm đúng thời điểm (khi quái đang tụ lại, khi boss đang gồng chiêu) sẽ gây thêm sát thương. Có kỹ năng, nhưng không cần phản xạ nhanh.
- Có chế độ **tự động hoàn toàn** cho những tầng đã vượt (chơi lại để cày).
- **Quét nhanh:** tầng đã đạt 3 sao có thể quét ngay để nhận thưởng mà không cần đánh, vẫn tốn năng lượng.
- **Chịu được mạng yếu:** trận đấu chạy hoàn toàn trên máy, chỉ cần mạng lúc bắt đầu và kết thúc trận. Mất mạng giữa trận thì kết quả được gửi lại khi có mạng.

### 7.3. Phúc lợi ngẫu nhiên

Sau mỗi đợt quái, người chơi chọn **1 trong 3 phúc lợi** chỉ có hiệu lực trong lượt đó. Ví dụ:

- *Máu Điên (Blood Frenzy):* +30% ATK khi máu dưới 50%.
- *Tay Nhanh (Quick Hands):* kỹ năng hồi nhanh hơn 25%.
- *Tham Lam (Greed):* +50% vàng rơi, nhưng −10% DEF.

Phúc lợi khiến mỗi lượt chơi khác nhau và cho người chơi những quyết định nhỏ.

### 7.4. Năng lượng

| Thông số | Giá trị |
|---|---|
| Năng lượng tối đa | 100 |
| Chi phí mỗi lượt | 10 (quét nhanh cũng 10) |
| Hồi | 1 điểm / 4 phút (đầy sau khoảng 6,7 giờ) |
| **Người mới** | **Tầng 1–15 miễn phí trong 48 giờ đầu** |
| Thua trận | Hoàn lại 80% năng lượng |

### 7.5. Khi bị kẹt

Không vượt được một tầng 3 lần liên tiếp thì Lão Tý (Old Rusty) xuất hiện gợi ý **cụ thể**:
*"Giày của mày mới +2, nâng lên +5 là qua."* Kèm theo nút đi thẳng tới chỗ nâng cấp.

Bị kẹt hơn 24 giờ ở một tầng thì nhận buff *"Quyết Tâm"* +10% chỉ số cho tầng đó, cộng dồn tối đa +30%. Người chơi không bao giờ bị kẹt mãi mãi.

---

## 8. Cày offline (AFK)

- Nhân vật tự cày ở tầng cao nhất đã vượt. Tích lũy **vàng, EXP, nguyên liệu, đôi khi có trang bị.**
- Tích lũy tối đa **12 giờ** (thẻ tháng nâng lên 16 giờ và +30% tốc độ).
- Phần thưởng nằm trong **Kho AFK (Stash)** cho tới khi người chơi bấm nhận. Kho AFK là thứ có thể bị cướp (mục 10.2).
- **Két sắt (Vault):** 40% Kho AFK luôn an toàn. Có thể nâng cấp lên 60% bằng vàng.
- **Nhận nhanh:** mỗi ngày được nhận ngay 2 giờ AFK miễn phí 1 lần. Các lần sau tốn Kim Cương, giá tăng dần, tối đa 5 lần mỗi ngày.

---

## 9. Trang bị và hệ thống cày đồ

### 9.1. Ô trang bị

**6 ô:** Vũ khí · Mũ · Áo · Găng · Giày · Bùa.

Mỗi ô có một **chỉ số chính cố định** (vũ khí luôn có ATK, áo luôn có HP...) và **chỉ số phụ ngẫu nhiên** theo độ hiếm.

### 9.2. Độ hiếm

| Độ hiếm | Màu | Số chỉ số phụ | Tỉ lệ rơi ở quái thường (tham khảo) |
|---|---|---|---|
| Thường (Common) | Xám | 0 | 60% |
| Tốt (Uncommon) | Xanh lá | 1 | 28% |
| Hiếm (Rare) | Xanh dương | 2 | 10% |
| Sử Thi (Epic) | Tím | 3 | 1,8% |
| Huyền Thoại (Legendary) | Cam | 4 + hiệu ứng đặc biệt | 0,2% (boss chương cao hơn) |

**Hiệu ứng rơi đồ phải "đã":** cột sáng theo màu, rung nhẹ, âm thanh riêng. Đồ Huyền Thoại có hoạt ảnh riêng và nút **chia sẻ vào chat**.

Độ hiếm được phân biệt bằng **cả màu và biểu tượng/khung viền**, để người mù màu cũng nhận ra.

### 9.3. Bộ trang bị

Mỗi chương có 1 bộ riêng, rơi từ boss chương đó. Mặc đủ **2 / 4 / 6 món** cùng bộ thì mở hiệu ứng tương ứng. Ví dụ, bộ **"Kẻ Đào Mộ" (Gravedigger)** (chương 2):
- 2 món: +10% HP.
- 4 món: hồi 5% máu sau mỗi đợt quái.
- 6 món: lần đầu tiên chết trong trận sẽ hồi sinh với 30% máu.

Bộ trang bị là lý do để người chơi **quay lại cày một boss cụ thể.**

### 9.4. Nâng cấp (+1 đến +15)

| Cấp | Tỉ lệ thành công | Khi thất bại |
|---|---|---|
| +1 → +9 | 100% | — |
| +10 → +12 | 70% → 50% | Không tụt cấp, +10% Tích lũy may mắn |
| +13 → +15 | 40% → 25% | Không tụt cấp, +8% Tích lũy may mắn |

Tích lũy may mắn đầy 100% thì lần tiếp theo chắc chắn thành công. Nguyên liệu bị mất khi thất bại, nhưng người chơi **không bao giờ bị lùi cấp.**

**Chuyển cấp:** khi thay đồ mới cùng ô, được chuyển **80% cấp cường hóa** sang đồ mới. Người chơi không còn sợ thay đồ.

### 9.5. Phân rã và chế tạo

- **Phân rã (Salvage):** đồ không dùng tách ra nguyên liệu (Bụi Sắt, Tinh Thể, Lõi Huyền Thoại). Có nút **phân rã hàng loạt** theo độ hiếm.
- **Chế tạo (Craft):** nguyên liệu + bản vẽ (rơi từ boss) → đồ có độ hiếm tối thiểu được đảm bảo.
- **Đúc lại (Reforge):** tốn nguyên liệu để quay lại 1 chỉ số phụ.

### 9.6. Bảo hiểm rơi đồ (pity)

- Mỗi boss chương có bộ đếm riêng. **40 lượt chưa ra Huyền Thoại thì lượt 41 chắc chắn ra.**
- Bộ đếm hiển thị công khai cho người chơi: *"Còn 12 lượt nữa chắc chắn ra Huyền Thoại."* Con số này tự nó là lý do để quay lại.

---

## 10. PvP: Đấu trường, Cướp kho, Truy nã

**Nguyên tắc:** mọi PvP đều **bất đồng bộ.** Bạn đánh với bản sao của đối thủ (dùng đội hình và trang bị của họ, do AI điều khiển). Không cần hai người online cùng lúc, không bị ảnh hưởng bởi mạng chập chờn, và **người chơi ở các múi giờ khác nhau vẫn đánh được với nhau.**

Người chơi thiết lập **Đội hình phòng thủ:** chọn bộ trang bị và thứ tự kỹ năng dùng khi bị người khác tấn công.

### 10.1. Đấu trường xếp hạng (Arena)

| Thông số | Giá trị |
|---|---|
| Mở khóa | Cấp 8 |
| Lượt miễn phí | 5 lượt/ngày (hồi vào **giờ reset của Vùng**, mục 17.3) |
| Mua thêm | Tối đa 5 lượt/ngày, giá Kim Cương tăng dần |
| Chọn đối thủ | 3 đối thủ: 1 dễ, 1 ngang sức, 1 khó (khó thì thắng được nhiều điểm hơn) |
| Bậc | Đồng → Bạc → Vàng → Bạch Kim → Kim Cương → Chúa Tể Ngầm (Underlord) |
| Mùa giải | 14 ngày. Hết mùa: thưởng theo bậc, hạ điểm mềm (giữ khoảng 60%) |
| Thưởng hằng ngày | Huy Hiệu Đấu Trường theo bậc, đổi đồ ở Cửa hàng Đấu trường |

**3 trận đầu tiên** của mỗi người chơi được ghép với **bot có sức mạnh thấp hơn** để chắc chắn thắng và trải nghiệm việc lên bậc.

**Thưởng giá trị nằm ở bậc, không ở top.** Người chơi cày đều đặn có thể đạt Kim Cương. Top 100 Chúa Tể Ngầm chỉ nhận thêm khung avatar, danh hiệu và skin (không tăng chỉ số).

### 10.2. Cướp kho (Raid)

| Thông số | Giá trị |
|---|---|
| Mở khóa | Cấp 15 |
| Lượt cướp | 3 lượt/ngày |
| Mục tiêu | Người chơi **cùng Khu**, trong khoảng **±20% lực chiến**, tài khoản trên 3 ngày tuổi, không có khiên |
| Mất khi bị cướp | 10% phần **không nằm trong két sắt** của Kho AFK |
| Người cướp nhận | 80% số người bị cướp mất (20% bị tiêu hủy để chống acc phụ) |
| Khiên sau khi bị cướp | 4 giờ |
| Giới hạn bị cướp | **Tối đa 3 lần thành công mỗi ngày** |
| Phòng thủ thành công | Người phòng thủ nhận thưởng nhỏ và bot báo *"Bạn đã đẩy lùi [Tên]!"* |

**Trả thù (Revenge):** bị cướp thì bot nhắn (theo ngôn ngữ của người chơi):

> ⚔️ **Gã Ba Sẹo (Three-Scars):** *"[Tên] vừa cướp 2.300 vàng của mày. Định để yên à?"*
> **[⚔️ Trả thù]** **[🛡️ Xem kho]**

- Trả thù **không tốn lượt cướp**, nhận +20% sát thương, có hiệu lực trong 24 giờ.
- Trả thù thắng thì lấy lại số đã mất cộng thêm 20%.
- Giới hạn tin nhắn bị cướp: gộp lại, tối đa 1 tin mỗi 4 giờ, không gửi vào giờ ngủ (mục 15.4).

**Bảo hộ tân thủ:** không thể bị cướp cho tới **cấp 20 hoặc hết 72 giờ đầu** (lấy mốc đến sau, tối đa 7 ngày). Nếu người mới tự đi cướp người khác thì mất bảo hộ, và game cảnh báo rõ trước khi xác nhận.

### 10.3. Bảng Truy nã (Bounty Board)

- Ai cướp thành công nhiều nhất trong ngày sẽ lên **Bảng Truy nã** của Khu.
- Hạ được người bị truy nã (phải trong khoảng lực chiến ±30%) thì nhận **gấp đôi thưởng** và huy hiệu "Thợ Săn Tiền Thưởng".
- Kẻ mạnh nhất cũng có rủi ro, và kẻ yếu hơn có lý do để đoàn kết.

---

## 11. Bang hội (Guild)

### 11.1. Cơ bản

| Thông số | Giá trị |
|---|---|
| Mở khóa | Cấp 12 (game gợi ý hội phù hợp và có nút **vào nhanh**) |
| Thành viên | Tối đa 30 (tăng theo cấp hội, tối đa 40) |
| Vai trò | Hội trưởng · Phó hội (tối đa 3) · Tinh anh · Thành viên |
| Ngôn ngữ hội | Hội trưởng chọn **ngôn ngữ chính** của hội. Gợi ý hội ưu tiên hội cùng ngôn ngữ với người chơi |
| Cấp hội | Tăng bằng điểm cống hiến của thành viên. Mở khóa thêm chỉ số buff chung và cửa hàng |
| Chuyển quyền tự động | Hội trưởng vắng mặt 7 ngày thì chuyển cho phó hội có cống hiến cao nhất |
| Giới hạn rời hội | Rời hội phải chờ 24 giờ mới vào hội khác (chống nhảy hội để ăn thưởng) |
| Tên hội | Qua bộ lọc từ ngữ xấu **đa ngôn ngữ**. Có nút báo cáo |

**Hội tân thủ:** hệ thống tạo sẵn một vài hội do NPC quản lý cho người mới, **mỗi ngôn ngữ chính có hội riêng.** Người chơi thật vào hội NPC sẽ được hội thật mời gọi. Hội thật **nhận thưởng khi chiêu mộ người mới** và giữ được họ qua 7 ngày.

### 11.2. Hoạt động

**Boss hội (hằng ngày):**
- Mỗi thành viên có 2 lượt đánh mỗi ngày. Sát thương của cả hội được cộng dồn.
- Thưởng chung theo mốc máu boss mà cả hội đạt được, và thưởng riêng theo sát thương. **Người yếu cũng góp được.**
- Boss hội reset vào **giờ reset của Vùng.** Thành viên ở múi giờ khác nhau vẫn có cả ngày để đánh.

**Cống hiến hằng ngày:** góp vàng hoặc Kim Cương để nhận điểm cống hiến, đổi đồ ở **Cửa hàng hội** (bản vẽ hiếm, đá nâng cấp).

**Chiến tranh hội (cuối tuần):**

| Thông số | Giá trị |
|---|---|
| Đăng ký | Thứ 6. Ghép hội **cùng Vùng** theo tổng lực chiến của 20 thành viên mạnh nhất |
| Diễn ra | **44 giờ**, từ 00:00 thứ 7 đến 20:00 Chủ nhật **theo giờ của Vùng.** Đánh bất đồng bộ, nên thành viên ở múi giờ lệch vẫn kịp tham gia |
| Cách chơi | Mỗi thành viên có 2 lượt tấn công vào đội phòng thủ của hội đối thủ. Thắng nhận 1–3 sao tùy lượng máu còn lại |
| Thắng | Hội có nhiều sao hơn |
| Thưởng | Thưởng thắng/thua (thua vẫn có thưởng). Điểm mùa giải hội |

**Bản đồ 12 quận (giai đoạn sau MVP):** điểm mùa giải quyết định hội nào cai quản quận nào. Quận trung tâm có danh hiệu hiển thị toàn Khu và thu thuế nhỏ (buff AFK cho thành viên).

### 11.3. Liên kết với Telegram

- Mỗi hội có thể **gắn với một group Telegram.** Bot hoạt động trong group, nói theo **ngôn ngữ chính của hội**:
  - *"🐉 Boss hội còn 12% máu, còn 7 người chưa đánh!"*
  - *"⚔️ Chiến tranh hội bắt đầu! Đối thủ: Hội Rắn Lửa."*
  - Lệnh `/guild` xem tình trạng hội, `/top` xem bảng xếp hạng thành viên. Lệnh bot dùng **tên tiếng Anh thống nhất**, phần mô tả lệnh được bản địa hóa.
- Đây là kênh giữ chân mạnh nhất: người chơi bị bạn bè trong group kéo vào chơi.

---

## 12. Tiền tệ và kinh tế

### 12.1. Các loại tiền (giữ ít nhất có thể)

| Tiền | Nguồn | Dùng để |
|---|---|---|
| **Vàng (Gold)** | Hầm ngục, AFK, cướp kho, nhiệm vụ | Nâng cấp, chế tạo, két sắt, mua lượt thường |
| **Kim Cương (Gems)** 💎 | **Nạp Stars**, cộng một lượng nhỏ miễn phí (nhiệm vụ, thành tựu, đấu trường) | Rương, Battle Pass, tăng tốc, đổi lớp, mua lượt |
| **Huy Hiệu Đấu Trường (Arena Badges)** | Đấu trường | Cửa hàng Đấu trường |
| **Điểm Cống Hiến (Guild Merit)** | Hoạt động bang hội | Cửa hàng hội |

Nguyên liệu nâng cấp và chế tạo là vật phẩm, không tính là tiền.

**Người mới chỉ thấy Vàng và Kim Cương.** Hai loại còn lại chỉ xuất hiện khi tính năng tương ứng được mở khóa.

### 12.2. Cân bằng nguồn sinh và nguồn tiêu

| Nguồn sinh Vàng | Nguồn tiêu Vàng |
|---|---|
| AFK, hầm ngục, nhiệm vụ | Nâng cấp (tăng theo cấp số nhân) |
| Cướp kho (đã bị trừ 20%) | Chế tạo, đúc lại |
| | Nâng cấp két sắt, góp hội |

**Kim Cương miễn phí:** người chơi không nạp, chơi đều đặn, nhận khoảng **60–80 💎/ngày**. Mức này đủ để mở 10 lượt rương sau khoảng 3 tuần, hoặc mua Battle Pass sau khoảng 5–6 tuần. Người không nạp vẫn được trải nghiệm mọi thứ.

### 12.3. Không có giao dịch giữa người chơi trong MVP

- Không có chợ, không có chuyển đồ trực tiếp. Lý do: chống acc phụ, chống mua bán bằng tiền thật ngoài game, đơn giản hóa cân bằng.
- **Giai đoạn sau:** mở **Chợ nguyên liệu** (chỉ nguyên liệu, không mở trang bị), thuế 10–15%, giá có trần và sàn.

---

## 13. Nạp Telegram Stars

### 13.1. Nguyên tắc

1. Mọi khoản nạp dùng **Telegram Stars**. Với hàng hóa số trong Mini App, đây là yêu cầu của Telegram và các kho ứng dụng. Ưu điểm cho thị trường toàn cầu: **không cần tích hợp cổng thanh toán từng nước**, Telegram lo việc người dùng mua Stars.
2. Stars được đổi thành **Kim Cương**. Mọi thứ trong game định giá bằng Kim Cương, giúp dễ chạy khuyến mãi và điều chỉnh giá.
3. **Người nạp mạnh nhanh hơn, không mạnh độc quyền.** Mục tiêu: người nạp vừa tiến nhanh khoảng 2–3 lần người không nạp, không phải 10 lần.
4. **Không hiện popup cửa hàng trước cấp 10.** Không chặn người chơi bằng màn hình đòi nạp.
5. **Minh bạch giá:** mỗi gói ghi rõ số Stars. Ở thị trường có yêu cầu (ví dụ EU), cân nhắc hiển thị thêm giá trị tiền thật tham khảo (mục 20).

### 13.2. Gói Kim Cương (giống nhau toàn cầu)

| Gói | Giá | Kim Cương | Thưởng lần đầu |
|---|---|---|---|
| **Túi mini** | **25 ⭐** | **140 💎** | Nhân đôi |
| Túi nhỏ | 50 ⭐ | 300 💎 | Nhân đôi |
| Túi vừa | 250 ⭐ | 1.600 💎 | Nhân đôi |
| Rương | 500 ⭐ | 3.400 💎 | Nhân đôi |
| Két | 1.000 ⭐ | 7.000 💎 | Nhân đôi |
| Kho báu | 2.500 ⭐ | 18.000 💎 | Nhân đôi |

> Tham khảo: người dùng mua khoảng 50⭐ với giá khoảng 1 USD. Giá thực tế khác nhau theo nền tảng (iOS, Android, Fragment) và khu vực, và game **không kiểm soát được** mức giá này.
>
> **Túi mini 25⭐** dành cho thị trường có thu nhập thấp: giúp người chơi trải nghiệm việc nạp lần đầu với số tiền rất nhỏ.

### 13.3. Gói đặc biệt

| Gói | Giá | Nội dung | Ghi chú |
|---|---|---|---|
| **Nạp lần đầu** | Bất kỳ gói nào (kể cả 25⭐) | Vũ khí Huyền Thoại cấp khởi đầu (theo lớp) + skin "Kẻ Tiên Phong" | Chỉ 1 lần |
| **Thẻ tháng** | 250 ⭐ | Nhận ngay 300 💎, sau đó 100 💎/ngày × 30 ngày (tổng 3.300 💎). AFK +30%, tối đa 16 giờ. +2 lượt đấu trường/ngày | Giá trị gấp khoảng 2 lần gói 250⭐, là gói chính để người chơi nạp đều đặn |
| **Thẻ tuần** | 75 ⭐ | Nhận ngay 100 💎, sau đó 60 💎/ngày × 7 ngày. AFK +15% | Bản nhỏ của thẻ tháng cho thị trường thu nhập thấp |
| **Battle Pass mùa** (28 ngày) | 450 ⭐ | Đường thưởng cao cấp: 1 đồ Huyền Thoại (cũng rơi từ boss), đá nâng cấp, skin độc quyền | Đường miễn phí vẫn có thưởng tốt |
| **Gói tăng trưởng** | 500 ⭐ | Nhận Kim Cương khi đạt cấp 20/30/40/50/60, tổng khoảng 10.000 💎 | Mua sớm thì lời nhiều |
| **Gói theo hoàn cảnh** | 100–250 ⭐ | Ví dụ: kẹt tầng 3 lần thì có gói *"Đá nâng cấp ×20"* | **Tối đa 1 lần/ngày**, chỉ hiện sau cấp 10 |

### 13.4. Ưu đãi theo khu vực

- **Bảng giá chính (mục 13.2) giống nhau toàn cầu.** Người chơi ở mọi nơi nhìn thấy cùng một giá, tránh cảm giác bất công khi so sánh với nhau.
- **Ưu đãi khởi đầu** (gói nạp đầu, gói chào mừng) có thể khác nhau theo nhóm thị trường. Ví dụ: thị trường thu nhập thấp được ưu tiên hiển thị túi mini và thẻ tuần.
- Xác định nhóm thị trường bằng ngôn ngữ Telegram, múi giờ thiết bị và Vùng đã chọn. **Không dùng để thay đổi giá đã niêm yết.**
- Theo dõi tỉ lệ nạp theo khu vực (mục 22) để điều chỉnh ưu đãi.

### 13.5. Rương Ngầm (Abyss Chest)

| Thông số | Giá trị |
|---|---|
| Giá | 160 💎/lượt · 1.500 💎/10 lượt (≈ 250⭐) |
| Miễn phí | 1 lượt/ngày |
| Đảm bảo | 10 lượt chắc chắn có ít nhất 1 Sử Thi. **60 lượt chắc chắn có Huyền Thoại** |
| Công khai | **Bảng tỉ lệ rơi hiển thị trong game**, bằng ngôn ngữ của người chơi |
| Theo quốc gia | **Tắt mua rương bằng Kim Cương trả phí** ở những nơi luật cấm loot box trả phí. Ở đó rương chỉ mở bằng lượt miễn phí hoặc Huy Hiệu (mục 20) |

### 13.6. Giới hạn để giữ công bằng

- Mua thêm lượt hầm ngục, đấu trường và nhận nhanh AFK đều có **giới hạn mỗi ngày**, kể cả với người nạp.
- Cướp kho ghép theo lực chiến ±20%, nên người nạp lớn chỉ đánh được nhau.
- Vinh danh song song **top cày** (Tầng Vô Tận, chiến tranh hội) và top lực chiến.

### 13.7. Kỹ thuật thanh toán

- Dùng Bot API: `sendInvoice` / `createInvoiceLink` với tiền tệ `XTR` → xử lý `pre_checkout_query` → nhận `successful_payment`.
- **Chỉ cộng Kim Cương khi máy chủ nhận được `successful_payment`.** Lưu `telegram_payment_charge_id` để chống cộng trùng.
- Tên và mô tả trên hóa đơn được **bản địa hóa** theo ngôn ngữ người chơi.
- **Hoàn tiền:** khi Stars bị hoàn, trừ Kim Cương. Nếu không đủ thì cho số dư âm và khóa mua.
- Doanh thu Stars được rút về qua Fragment, có thời gian chờ. Cần tính trong kế hoạch dòng tiền, cùng nghĩa vụ thuế tại nước đăng ký công ty.

---

## 14. Trải nghiệm người chơi mới (30 phút đầu, 7 ngày đầu)

> **Mục tiêu:** người chơi phải cảm thấy **vui trong 30 giây đầu, mạnh lên trong 5 phút đầu, có lý do quay lại trước khi rời app.**

### 14.1. Các lý do người mới thấy chán, và cách tránh

| Lý do người mới bỏ game | Cách tránh trong UNDERWORLD |
|---|---|
| Tải lâu, màn hình trắng | Bản tải đầu dưới 3 giây trên mạng 4G yếu (dưới 2MB), tài nguyên còn lại tải dần. Tài nguyên phát qua CDN toàn cầu |
| Game không đúng ngôn ngữ | **Tự nhận ngôn ngữ** từ Telegram, đổi được bất cứ lúc nào ở góc màn hình |
| Phải đăng ký, điền tên, đọc cốt truyện dài | Lấy tên từ Telegram. Cốt truyện chỉ 3 khung tranh, bỏ qua được |
| Bị dạy quá nhiều thứ cùng lúc | **Mỗi 3–5 phút chỉ mở 1 tính năng mới**, hướng dẫn tối đa 2 câu, 1–2 lần chạm |
| Quá nhiều loại tiền và nút bấm | Màn hình ban đầu chỉ có Hầm ngục, Túi đồ, Nhân vật. Các nút khác hiện dần |
| Không thấy mình mạnh lên | Rơi đồ liên tục ở 10 tầng đầu, lực chiến nhảy số rõ ràng |
| Bị chặn bởi năng lượng | Tầng 1–15 miễn phí trong 48 giờ |
| Bị người cũ đánh tơi tả | Bảo hộ tân thủ, 3 trận đấu trường đầu gặp bot |
| Bị đòi nạp quá sớm | Không có popup cửa hàng trước cấp 10 |
| Không biết làm gì tiếp | Luôn có **1 mũi tên mục tiêu kế tiếp** trên màn hình chính |
| Chơi một mình, không quen ai | Gợi ý hội tân thủ **cùng ngôn ngữ** ở cấp 12, có nút vào nhanh |

### 14.2. Kịch bản 30 phút đầu

| Thời điểm | Chuyện gì xảy ra | Cảm xúc mong muốn |
|---|---|---|
| **0:00** | Bấm Start bot → nút **"⚔️ Chơi ngay"** → Mini App mở. Ngôn ngữ và Vùng được chọn tự động (mục 17.3) | Không phải chờ |
| **0:05** | 3 khung tranh: *"Thành phố ngầm... Vực Sâu... Mày là Kẻ Săn."* (bỏ qua được). Hình ảnh kể chuyện là chính, ít chữ | Tò mò |
| **0:15** | **Vào trận luôn.** Quái yếu, số sát thương to. Ngón tay chỉ vào nút kỹ năng: *"Bấm!"*. Quái nổ tung | Đã tay |
| **0:50** | Rơi món đồ đầu tiên (Hiếm, xanh dương). Có cột sáng, gợi ý **"Trang bị"**. Lực chiến 120 → 185 | Vui, thấy mạnh lên |
| **1:30** | Lên cấp 2, 3. Mỗi lần lên cấp có hiệu ứng | Tiến bộ nhanh |
| **2:30** | Boss tầng 3. Bấm kỹ năng phá khiên boss. **Chắc chắn rơi vũ khí Sử Thi (tím)** | Phấn khích |
| **4:00** | Lão Tý (Old Rusty) xuất hiện: mở **Nâng cấp**, hướng dẫn nâng vũ khí lên +3 (miễn phí) | Biết cách mạnh hơn |
| **6:00** | Tầng 4–5: **thử nhanh cả 3 lớp**, mỗi lớp 1 đợt quái, rồi chọn lớp (có thể đổi miễn phí trong 72 giờ) | Có quyền lựa chọn |
| **8:00** | Mở **phúc lợi ngẫu nhiên** ở tầng 6 | Mới mẻ |
| **10:00** | Mở **AFK**: *"Nhân vật vẫn cày khi mày đi vắng."* Tặng ngay 2 giờ AFK. Nhận một đống đồ | Bất ngờ, hào phóng |
| **12:00** | Cấp 8 → mở **Đấu trường**. 3 trận đầu gặp bot, thắng cả 3, lên bậc Đồng II | Thắng người khác (cảm giác vậy) |
| **15:00** | Hoàn thành **chuỗi nhiệm vụ tân thủ đầu tiên**, nhận 300 💎 | Được thưởng |
| **18:00** | Cấp 10. Boss chương 1 (tầng 10), rơi 1–2 món của bộ trang bị chương 1 | Mục tiêu mới: đủ bộ |
| **20:00** | Mở **Lịch đăng nhập 7 ngày**: hiện rõ **ngày 7 nhận vũ khí Huyền Thoại** | Lý do quay lại |
| **25:00** | Cấp 12 → gợi ý **vào hội tân thủ cùng ngôn ngữ**, một nút là vào | Có nhóm |
| **Lúc rời app** | *"Kho AFK sẽ đầy sau 2 giờ. Bật thông báo để Mèo Đen (Kat) báo cho mày nhé?"* | Hẹn quay lại |

**Chỉ số phải đạt cho kịch bản này (đo riêng cho từng ngôn ngữ và khu vực):**
- Rơi món đồ đầu tiên: dưới 60 giây.
- Lên cấp lần đầu: dưới 90 giây.
- Đánh boss đầu tiên: dưới 3 phút.
- Tỉ lệ hoàn thành hướng dẫn: trên 85%.

### 14.3. 7 ngày đầu

| Ngày | Mục tiêu | Thưởng đăng nhập | Tính năng mở |
|---|---|---|---|
| 1 | Cấp 20, qua chương 1–2 | 500 💎 | Hầm ngục, AFK, Nâng cấp, Đấu trường, Hội |
| 2 | Có 2 món cùng bộ | Đá nâng cấp ×20 | Phân rã hàng loạt, Chế tạo |
| 3 | Lên Đồng I đấu trường, đánh boss hội | 1 lượt Rương Ngầm ×10 miễn phí | **Cướp kho** (cấp 15). Hết 72 giờ bảo hộ nếu đã cấp 20 |
| 4 | Qua chương 3 | Skin "Tân Binh Ngầm" | Đúc lại chỉ số |
| 5 | Tham gia chiến tranh hội đầu tiên | 1.000 💎 | Chiến tranh hội |
| 6 | Đạt cấp 30 | Bản vẽ Sử Thi | Tầng thử thách sự kiện |
| 7 | — | **Vũ khí Huyền Thoại (theo lớp)** | Battle Pass |

"Ngày" được tính theo **giờ reset của Vùng** người chơi.

**Chuỗi nhiệm vụ tân thủ 7 ngày** chạy song song: mỗi ngày 5 nhiệm vụ, hoàn thành hết thì nhận thưởng lớn ở ngày 7. Mỗi nhiệm vụ dạy người chơi một hệ thống.

### 14.4. Quy tắc giao diện cho người mới

- Mỗi popup **tối đa 2 dòng chữ** (tính theo ngôn ngữ dài nhất, ví dụ tiếng Nga, tiếng Đức).
- Mỗi màn hình **tối đa 1 nút được tô sáng** (việc nên làm tiếp).
- Có **chấm đỏ** ở nơi có thứ để nhận hoặc nâng cấp, nhưng không quá 3 chấm cùng lúc.
- Tất cả số liệu quan trọng (lực chiến, cấp, vàng) **nằm cố định ở đầu màn hình.**
- Điều khiển bằng **một tay**, nút to, phù hợp màn hình dọc.
- **Dùng biểu tượng nhiều hơn chữ**: người chơi hiểu được ngay cả khi bản dịch chưa hoàn hảo.

---

## 15. Giữ chân người chơi và cơ chế bắt kịp

### 15.1. Lý do quay lại theo nhịp thời gian

| Nhịp | Lý do |
|---|---|
| Mỗi vài giờ | Kho AFK đầy, năng lượng đầy, có thể bị cướp |
| Mỗi ngày | Nhiệm vụ ngày, boss hội, lượt rương miễn phí, lượt đấu trường |
| Mỗi tuần | Chiến tranh hội, Tầng Vô Tận xếp hạng tuần, sự kiện tuần |
| Mỗi mùa (14–28 ngày) | Mùa đấu trường, Battle Pass, bộ trang bị mới, chương mới |

### 15.2. Cơ chế bắt kịp

- **Khu mới** mở theo đợt **trong từng Vùng** (khi Khu cũ đầy khoảng 2.000 người, hoặc mỗi 2–4 tuần). Người mới vào Khu mới, cạnh tranh với những người cùng xuất phát điểm.
- **Buff bắt kịp:** người chơi dưới mức cấp trung bình của Khu được +50% EXP và +30% AFK.
- **Gộp Khu** (cùng Vùng) khi số người hoạt động trong một Khu giảm thấp, để giữ đông vui.
- **Thưởng quay lại:** vắng mặt 7 ngày trở lên thì nhận gói quay lại (Kim Cương, đá nâng cấp, 24 giờ AFK) cùng buff 3 ngày.

### 15.3. Sự kiện (lịch mẫu theo tháng)

| Tuần | Sự kiện |
|---|---|
| 1 | **Cuộc Săn Vàng (Gold Rush):** hầm ngục rơi gấp đôi vàng |
| 2 | **Boss Thế Giới (World Boss):** cả Khu cùng đánh một boss khổng lồ, thưởng theo mốc |
| 3 | **Giải Đấu Ngầm (Underground Cup):** giải đấu loại trực tiếp cuối tuần |
| 4 | **Chợ Đen Mở Cửa (Black Market):** cửa hàng hiếm bán đồ bằng Vàng/Huy Hiệu |

**Sự kiện theo mùa và lễ hội địa phương:** dùng chủ đề trung tính toàn cầu (Halloween, năm mới, mùa hè). Có thể thêm skin hoặc trang trí theo lễ hội từng Vùng (Tết Âm lịch và Eid cho Vùng châu Á, Carnival và Día de Muertos cho Vùng châu Mỹ...), **chỉ là trang trí, không ảnh hưởng sức mạnh.**

### 15.4. Thông báo qua bot (tối đa 3 tin chủ động mỗi ngày)

- Tin nhắn gửi **theo ngôn ngữ của người chơi.**
- **Giờ yên tĩnh:** không gửi tin chủ động từ 23:00 đến 07:00 theo **múi giờ của thiết bị người chơi** (lấy từ Mini App). Tin phát sinh trong giờ này được gộp lại, gửi lúc 07:00.

| Loại | Ví dụ | Mặc định |
|---|---|---|
| Kho AFK đầy | *"📦 Kho đầy rồi, không nhận là phí đấy."* | Bật |
| Bị cướp | *"⚔️ [Tên] vừa cướp kho của mày. [Trả thù]"* | Bật (gộp, tối đa 1 tin/4 giờ) |
| Boss hội / chiến tranh hội | Gửi vào group hội | Bật |
| Năng lượng đầy | *"⚡ Năng lượng đầy, xuống Vực Sâu thôi."* | Tắt |
| Sự kiện mới | *"🎉 Cuộc Săn Vàng bắt đầu!"* | Bật |

---

## 16. Thu hút người chơi và lan truyền

### 16.1. Lan truyền trong game

| Cơ chế | Cách hoạt động |
|---|---|
| **Thẻ khoe đồ** | Rơi Huyền Thoại hoặc lên bậc mới thì có nút chia sẻ một thẻ đẹp vào chat. Chữ trên thẻ theo ngôn ngữ người gửi. Bạn bè bấm vào là vào game qua link giới thiệu |
| **Mời bạn** | Người được mời đạt **cấp 15** thì cả hai nhận thưởng. Đạt cấp 30 thì có thêm thưởng. (Chống acc ảo vì phải chơi thật) |
| **Đội bạn bè** | Mời bạn vào cùng hội: cả hai nhận +10% AFK trong 7 ngày. Người được mời **tự động vào cùng Vùng** với người mời |
| **Bot trong group** | Bang hội gắn group Telegram, bot hoạt động công khai trong group nên ai trong group cũng thấy |
| **Kênh chính thức** | Kênh tiếng Anh là kênh chính, cùng các kênh theo ngôn ngữ. Thông báo: *"Hội Rồng Đen vừa chiếm Quận Trung Tâm!"*, *"[Tên] là người đầu tiên vượt tầng 60!"* |

### 16.2. Trước khi ra mắt

1. **Bot đăng ký sớm (đa ngôn ngữ):** người đăng ký nhận danh hiệu **"Người Tiên Phong" (Pioneer)** cùng skin độc quyền. Có bảng xếp hạng người mời nhiều nhất.
2. **Beta kín 300–800 người**, lấy từ các group game Telegram ở nhiều khu vực (tiếng Anh, Nga, Indonesia, Tây Ban Nha). Thu phản hồi, cân chỉnh kinh tế, kiểm tra bản dịch.
3. **Chuẩn bị cộng đồng:** kênh thông báo và group thảo luận cho từng ngôn ngữ chính, mỗi group có quản trị viên bản xứ.

### 16.3. Ra mắt theo từng bước

| Bước | Thời gian | Thị trường | Mục tiêu |
|---|---|---|---|
| **Soft launch** | 4–6 tuần | 2–3 thị trường thử nghiệm, ví dụ Philippines (tiếng Anh, chi phí quảng cáo thấp), Indonesia, một nước SNG hoặc Mỹ Latinh | Kiểm tra retention, tỉ lệ nạp, độ ổn định máy chủ. Sửa trước khi chi nhiều tiền quảng cáo |
| **Ra mắt nhóm A** | — | Toàn bộ thị trường nhóm A (mục 3.3) | Đạt chỉ số mục 22 |
| **Mở rộng nhóm B** | Sau 1–3 tháng | Thêm ngôn ngữ và Vùng | Theo dữ liệu thị trường |

### 16.4. Kênh tiếp cận

- **Telegram Ads:** quảng cáo trên các kênh game, nhắm theo ngôn ngữ.
- **KOL và streamer theo khu vực:** ưu tiên KOL vừa và nhỏ trong từng cộng đồng ngôn ngữ (chi phí thấp, tỉ lệ chuyển đổi tốt).
- **Quảng bá chéo** với các Mini App khác (đổi lượt hiển thị).
- **Danh mục Mini App của Telegram:** đăng ký và tối ưu mô tả, ảnh bằng nhiều ngôn ngữ.
- **Sự kiện ra mắt 14 ngày:** đua top ở các Khu đầu tiên của mỗi Vùng, thưởng danh hiệu vĩnh viễn "Huyền Thoại Khu 1".

### 16.5. Thông điệp

- ✅ *"Loot. Raid. Conquer. A real RPG inside Telegram — 5 minutes at a time."*
- ✅ *"No download. No token. Just the game."*
- ❌ Không hứa airdrop, không gợi ý "chơi kiếm tiền" (play-to-earn).

---

## 17. Phát hành toàn cầu và bản địa hóa

### 17.1. Ngôn ngữ

| Đợt | Ngôn ngữ | Thời điểm |
|---|---|---|
| **1 (ra mắt)** | Tiếng Anh (ngôn ngữ gốc), Nga, Indonesia, Tây Ban Nha (Mỹ Latinh) | Soft launch |
| **2** | Bồ Đào Nha (Brazil), Thổ Nhĩ Kỳ, Ukraina, Hindi | Ra mắt nhóm B |
| **3** | Ả Rập (cần giao diện RTL), Thái, Ba Tư (nếu pháp lý cho phép) | Sau này |

**Không có tiếng Việt trong game** (mục 20.5).

**Ngôn ngữ gốc là tiếng Anh.** Mọi nội dung viết bằng tiếng Anh trước, rồi dịch sang các ngôn ngữ khác. (Tài liệu thiết kế này viết bằng tiếng Việt cho nhóm nội bộ, nhưng chữ trong game bắt đầu từ tiếng Anh. Xem Phụ lục A.)

**Chọn ngôn ngữ:**
1. Lấy `language_code` từ dữ liệu Telegram của người chơi.
2. Nếu ngôn ngữ đó chưa có bản dịch thì dùng tiếng Anh.
3. Người chơi đổi được ngôn ngữ bất cứ lúc nào. Bot dùng cùng ngôn ngữ với game.

### 17.2. Quy trình dịch

- **Không viết cứng chữ** trong mã nguồn và trong hình ảnh. Mọi chữ là chuỗi có khóa (key), dùng định dạng ICU MessageFormat để xử lý số nhiều và giống đực/cái.
- **Quy trình:** viết tiếng Anh → bản dịch nháp (công cụ dịch hoặc AI) → **người dịch bản xứ duyệt** → kiểm thử trong game.
- Dùng nền tảng quản lý bản dịch (Crowdin, Lokalise hoặc tương đương) để người dịch làm việc song song.
- **Pseudo-localization:** chạy thử giao diện với chuỗi kéo dài 40% và ký tự đặc biệt để tìm chỗ vỡ chữ trước khi có bản dịch thật.
- **Hướng dẫn giọng văn** cho người dịch: thô ráp, hài hước, chợ đen. Người dịch tự chọn cách xưng hô và tiếng lóng hợp với văn hóa mình.
- **Cộng đồng góp bản dịch** (giai đoạn sau): người chơi đề xuất sửa bản dịch, nhận danh hiệu.

### 17.3. Vùng, múi giờ và Khu

Mỗi **Khu (Realm)** thuộc về một **Vùng (Region)**. Vùng quyết định giờ reset hằng ngày và lịch sự kiện.

| Vùng | Múi giờ chuẩn | Giờ reset hằng ngày (giờ địa phương của Vùng) | Phục vụ chủ yếu |
|---|---|---|---|
| **Châu Á** | UTC+7 | 05:00 | Đông Nam Á, Nam Á, Đông Á |
| **Châu Âu – SNG – Châu Phi** | UTC+3 | 05:00 | Nga, SNG, châu Âu, Trung Đông, châu Phi |
| **Châu Mỹ** | UTC−4 | 05:00 | Bắc Mỹ, Mỹ Latinh |

- Reset lúc **05:00** thay vì 00:00 để người chơi thức khuya vẫn hoàn thành nhiệm vụ trong ngày.
- **Gợi ý Vùng tự động** theo múi giờ thiết bị (lấy từ trình duyệt của Mini App) và ngôn ngữ Telegram. Người chơi được **đổi Vùng miễn phí trong 72 giờ đầu.**
- Người được mời qua link giới thiệu sẽ vào cùng Vùng với người mời (để chơi cùng bạn bè).
- **Bảng xếp hạng:** theo Khu (chính), theo Vùng, và một số bảng toàn cầu (Tầng Vô Tận, thành tựu) để tạo cảm giác cạnh tranh quốc tế.
- Ngôn ngữ **không** bị gắn với Khu: người Nga và người Indonesia có thể chơi cùng một Khu, mỗi người thấy giao diện bằng ngôn ngữ của mình.

### 17.4. Văn hóa và nội dung

- **Tránh:** biểu tượng tôn giáo, biểu tượng chính trị, bản đồ và cờ của các nước thật, cử chỉ tay có thể bị hiểu là xúc phạm.
- **Trang phục và hình ảnh:** để mức "phù hợp 13+". Tránh hở hang quá mức để giữ được các thị trường bảo thủ.
- **Cơ chế giống cờ bạc** (rương ngẫu nhiên): thận trọng ở các thị trường nhạy cảm. Bật/tắt theo quốc gia (mục 20).
- **Màu sắc:** không dùng màu làm tín hiệu duy nhất (người mù màu, và ý nghĩa màu khác nhau giữa các nền văn hóa).
- **Định dạng số:** hiển thị số theo ngôn ngữ người chơi (1,000 trong tiếng Anh, 1.000 trong tiếng Indonesia và Tây Ban Nha, 1 000 trong tiếng Nga). Số lớn viết gọn: 1.2K, 3.4M.
- **Tên người chơi và tên hội:** hỗ trợ Unicode (chữ Cyrillic, có dấu, Ả Rập). Lọc từ ngữ xấu đa ngôn ngữ, chặn ký tự giả mạo (ví dụ chữ Cyrillic trông giống chữ Latin dùng để mạo danh).

### 17.5. Phông chữ và giao diện

- Phông chữ phải hỗ trợ: Latin mở rộng (tiếng Tây Ban Nha, tiếng Thổ Nhĩ Kỳ), Cyrillic. Đợt sau thêm Ả Rập và Devanagari (Hindi).
- Giao diện co giãn được khi chữ dài hơn **30–40%** so với tiếng Anh. Không đặt chữ trong khung có kích thước cố định.
- Chuẩn bị sẵn cho **RTL** (Ả Rập, Ba Tư) từ đầu bằng CSS logical properties (`margin-inline-start`...), dù đợt 3 mới dùng.

### 17.6. Cộng đồng và hỗ trợ

| Hạng mục | Cách làm |
|---|---|
| **Kênh thông báo** | 1 kênh chính tiếng Anh, cùng 1 kênh cho mỗi ngôn ngữ chính |
| **Group thảo luận** | Mỗi ngôn ngữ chính 1 group, mỗi group có quản trị viên bản xứ (ban đầu có thể là người chơi tình nguyện, nhận quyền lợi trong game) |
| **Hỗ trợ khách hàng** | Bot hỗ trợ trả lời câu hỏi thường gặp theo ngôn ngữ người chơi. Câu hỏi khó chuyển thành phiếu hỗ trợ cho nhân viên. Mục tiêu phản hồi dưới 24 giờ |
| **Thông báo bảo trì, cập nhật** | Ghi giờ theo **UTC và giờ địa phương** của người đọc |

---

## 18. Kiến trúc kỹ thuật

### 18.1. Tổng quan

```
[Telegram Client]
   ├── Bot (grammY / Node.js) ── thông báo, lệnh trong group, hóa đơn Stars
   └── Mini App (React + Vite + PixiJS cho trận đấu, i18n)
            │  HTTPS + WebSocket          ▲ tài nguyên tĩnh qua CDN toàn cầu
            ▼
[API Gateway / NestJS]
   ├── Auth (xác thực initData của Telegram bằng HMAC)
   ├── Player / Inventory / Upgrade
   ├── Combat (mô phỏng tất định, chạy lại để xác thực)
   ├── PvP (đấu trường, cướp kho, truy nã)
   ├── Guild (hội, boss hội, chiến tranh)
   ├── Shop / Payment (Stars)
   ├── Event / Quest (lịch theo Vùng)
   └── Localization (chuỗi dịch, ngôn ngữ người chơi)
            │
   ┌────────┼────────┐
[PostgreSQL] [Redis] [BullMQ: tác vụ hẹn giờ, thông báo theo múi giờ]
```

### 18.2. Mô phỏng trận đấu tất định (quan trọng nhất)

1. Client xin bắt đầu trận → máy chủ tạo **seed ngẫu nhiên**, lưu kèm trạng thái nhân vật.
2. Client chạy mô phỏng bằng **cùng một gói mã TypeScript dùng chung** với máy chủ. Người chơi bấm kỹ năng → client ghi lại `[thời điểm tick, kỹ năng]`.
3. Kết thúc trận → client gửi **chuỗi thao tác** lên. Nếu mất mạng thì lưu tạm và gửi lại khi có mạng.
4. Máy chủ **chạy lại mô phỏng** với seed và chuỗi thao tác → tự tính kết quả. **Không tin kết quả do client gửi.**
5. Phần thưởng do máy chủ tính và ghi trong một transaction.

PvP bất đồng bộ chạy hoàn toàn trên máy chủ (không có thao tác của người chơi), client chỉ phát lại kết quả.

Thiết kế này **chịu được độ trễ mạng cao** (người chơi ở xa máy chủ), nên giai đoạn đầu chỉ cần **một vùng máy chủ** cho toàn cầu.

### 18.3. Hạ tầng cho người chơi toàn cầu

| Giai đoạn | Cách làm |
|---|---|
| **MVP và soft launch** | 1 vùng máy chủ chính (ví dụ châu Âu, ở giữa châu Á và châu Mỹ, gần các trung tâm dữ liệu của Telegram). Tài nguyên tĩnh (hình, âm thanh, mã Mini App) phát qua **CDN toàn cầu** |
| **Khi tăng trưởng** | Mỗi Vùng có thể là một **shard** cơ sở dữ liệu riêng (Khu → Vùng → shard). Thêm máy chủ ở châu Á và châu Mỹ khi độ trễ hoặc tải yêu cầu |
| **Dữ liệu cá nhân** | Chỉ lưu ID Telegram và dữ liệu chơi game. Xem yêu cầu GDPR ở mục 20 |

### 18.4. Các yêu cầu khác

- **Tính toán chỉ dùng số nguyên** (hoặc fixed-point) để mô phỏng giống hệt nhau trên mọi thiết bị.
- **AFK tính theo thời gian máy chủ** (`last_claim_at`), không dùng đồng hồ của client.
- **Mọi thời điểm lưu theo UTC.** Chỉ đổi sang giờ địa phương khi hiển thị. Giờ reset tính theo cấu hình múi giờ của Vùng.
- **Mọi thay đổi Vàng, Kim Cương, vật phẩm** đều ghi vào bảng nhật ký (ledger), kèm lý do và mã tham chiếu.
- **Chống xử lý lặp:** mỗi yêu cầu thay đổi tài sản có `idempotency_key`.
- **Giới hạn gửi tin của bot:** Telegram giới hạn khoảng 30 tin/giây. Thông báo đi qua hàng đợi có điều tiết, xếp lịch theo múi giờ người nhận.
- **Hiệu năng Mini App:** bản tải đầu dưới 2MB, hình ảnh dạng WebP/atlas, chạy ổn trên Android tầm thấp và mạng 3G/4G yếu. Gói ngôn ngữ tải riêng theo ngôn ngữ đang dùng.
- **Cờ tính năng theo quốc gia:** bật/tắt tính năng (rương trả phí, sự kiện) theo quốc gia hoặc Vùng mà không cần cập nhật bản mới.

---

## 19. Chống gian lận

| Mối đe dọa | Biện pháp |
|---|---|
| Sửa chỉ số hoặc kết quả trận ở client | Mô phỏng tất định, máy chủ chạy lại (mục 18.2) |
| Giả mạo danh tính Telegram | Xác thực chữ ký `initData` ở máy chủ, kiểm tra `auth_date` |
| Acc phụ chuyển tài nguyên | Không có giao dịch trong MVP. Cướp kho bị trừ 20% và chặn theo lực chiến cùng tuổi tài khoản. Phát hiện cặp cướp nhau lặp lại |
| Acc ảo ăn thưởng giới thiệu | Chỉ trả thưởng khi người được mời đạt cấp 15/30 |
| Bot tự động cày, xưởng farm acc | Năng lượng giới hạn, AFK có trần. Phát hiện nhịp thao tác bất thường (đều tuyệt đối, chơi 24/7) và cụm tài khoản có hành vi giống nhau |
| Đổi Vùng liên tục để lợi dụng giờ reset | Chỉ đổi Vùng miễn phí trong 72 giờ đầu. Sau đó đổi Vùng mất phí và có thời gian chờ 30 ngày |
| Gửi yêu cầu trùng để nhân đôi thưởng | `idempotency_key`, khóa hàng trong DB, transaction |
| Nạp rồi hoàn tiền Stars | Trừ Kim Cương, cho số dư âm, khóa mua |
| Lỗi nhân bản đồ | Đối soát ledger hằng ngày. Có công cụ rollback theo người chơi |
| Mạo danh bằng tên giống người khác | Chặn ký tự đồng dạng (homoglyph), tên hiển thị kèm mã định danh ngắn |

---

## 20. Pháp lý và chính sách nền tảng

> ⚠️ Phần này chỉ là danh sách việc cần kiểm tra, **không phải tư vấn pháp lý.** Luật thay đổi thường xuyên. **Cần tham khảo luật sư có kinh nghiệm về game quốc tế trước khi ra mắt.**

### 20.1. Pháp nhân, thuế và nền tảng

- **Nơi đăng ký công ty** quyết định nghĩa vụ thuế với doanh thu Stars (rút về qua Fragment dưới dạng TON). Cần kế toán quen với doanh thu tài sản số.
- **Chính sách Telegram:** tuân thủ điều khoản Mini App, Bot và thanh toán Stars. Hàng hóa số bắt buộc dùng Stars.
- **Cấm vận:** không nhắm tới các quốc gia, vùng và cá nhân bị cấm vận. Kiểm tra với luật sư về danh sách áp dụng cho pháp nhân của mình.
- **Nhãn hiệu UNDERWORLD:**
  - Tra cứu "UNDERWORLD" trong nhóm game và phần mềm (nhóm 9 và 41 theo phân loại Nice) tại USPTO (Mỹ), EUIPO (EU) và WIPO (quốc tế) trước khi quảng bá.
  - Đăng ký **tên đầy đủ "UNDERWORLD: Loot & Raid" kèm logo**. Tên và logo kết hợp dễ được chấp nhận hơn một từ thông dụng.
  - Không dùng hình ảnh, phông chữ hay nhân vật gợi tới loạt phim *Underworld*.
  - Nếu luật sư đánh giá rủi ro cao ở thị trường nào, chuẩn bị sẵn tên phụ cho riêng thị trường đó.
  - Giữ chỗ sớm tên bot Telegram (ví dụ `@UnderworldLootBot`), kênh chính thức, tên miền và tài khoản mạng xã hội.

### 20.2. Dữ liệu cá nhân

| Quy định | Yêu cầu chính |
|---|---|
| **GDPR (EU) / UK GDPR** | Chính sách quyền riêng tư rõ ràng, chỉ thu thập dữ liệu cần thiết, cho phép người chơi **xem và xóa dữ liệu**, có thỏa thuận xử lý dữ liệu với nhà cung cấp dịch vụ |
| **Luật dữ liệu các nước khác** (Brazil LGPD, Indonesia PDP, Nga, Ấn Độ DPDP...) | Rà soát yêu cầu đồng ý, lưu trữ và chuyển dữ liệu ra nước ngoài. **Lưu ý Nga:** có luật yêu cầu lưu dữ liệu cá nhân công dân Nga trên máy chủ đặt tại Nga. Cần luật sư đánh giá trước khi mở thị trường Nga |
| **Thực tế** | Game chỉ cần ID Telegram, tên hiển thị, ngôn ngữ, múi giờ và dữ liệu chơi. **Không thu số điện thoại, email, vị trí chính xác** |

### 20.3. Độ tuổi

- Đặt mức **13+** (hoặc cao hơn tùy thị trường), phù hợp với độ tuổi tối thiểu của Telegram và các quy định bảo vệ trẻ em (ví dụ COPPA của Mỹ với trẻ dưới 13).
- Cân nhắc **giới hạn nạp** cho người chơi trẻ ở các thị trường có yêu cầu.

### 20.4. Loot box (rương ngẫu nhiên trả phí)

| Thị trường | Tình trạng (cần kiểm tra lại) | Cách xử lý |
|---|---|---|
| **Bỉ** | Coi loot box trả phí là cờ bạc | **Tắt mua rương bằng Kim Cương trả phí** |
| **Hàn Quốc** | Bắt buộc công khai tỉ lệ rơi | Công khai tỉ lệ (áp dụng cho mọi nơi) |
| **Nhật Bản** | Cấm cơ chế "kompu gacha" (phải gom đủ bộ từ rương mới nhận thưởng) | Không thiết kế thưởng gom bộ từ rương |
| **Úc** | Game có loot box trả phí bị nâng mức phân loại độ tuổi | Ghi chú phân loại nếu phát hành chính thức tại Úc |
| **Brazil** | Có quy định mới hạn chế loot box với trẻ vị thành niên | Kiểm tra kỹ trước khi mở Brazil (nhóm B) |
| **EU (bảo vệ người tiêu dùng)** | Có hướng dẫn về tiền ảo trong game: minh bạch giá trị tiền thật, không gây áp lực mua, đặc biệt với trẻ em | Hiển thị số Stars rõ ràng, không đếm ngược giả tạo, không nhắm ưu đãi vào người chơi trẻ |

**Áp dụng chung toàn cầu:** công khai tỉ lệ rơi, có bảo hiểm rơi đồ, rương luôn mở được bằng lượt miễn phí.

### 20.5. Việt Nam: không nhắm tới

**Quyết định:** game chỉ phát hành cho thị trường nước ngoài, **không nhắm tới người chơi Việt Nam.** Lý do: game có người chơi Việt Nam có thể phải xin giấy phép trò chơi điện tử trên mạng (Nghị định 147/2024/NĐ-CP và các văn bản liên quan).

**Cách thể hiện việc không nhắm tới Việt Nam:**
- **Không có tiếng Việt** trong game, bot, kênh và tài liệu công khai.
- **Không quảng bá** ở Việt Nam: không chạy Telegram Ads nhắm Việt Nam, không hợp tác KOL hoặc group game Việt Nam, không đăng bài trong cộng đồng Việt.
- Không có Vùng, sự kiện hay ưu đãi riêng cho Việt Nam.
- Điều khoản sử dụng ghi rõ danh sách quốc gia được phục vụ.
- **Cân nhắc chặn theo quốc gia:** Telegram không cung cấp quốc gia của người dùng cho Mini App, nên chỉ có thể dựa vào địa chỉ IP (chặn ở CDN hoặc máy chủ). Cách này không chính xác tuyệt đối (VPN). Luật sư quyết định có cần chặn hay không.
- Beta và soft launch **không tuyển người chơi từ Việt Nam.**

**Cần luật sư xác nhận:**
- Các bước trên đã đủ để không bị coi là cung cấp game cho người chơi Việt Nam chưa?
- Đội ngũ phát triển ở Việt Nam thì pháp nhân nên đăng ký ở đâu (mục 20.1)?
- Nếu sau này muốn vào Việt Nam: tự xin giấy phép hay hợp tác với nhà phát hành trong nước đã có giấy phép?

### 20.6. Không có token

Game không phát hành token, không cho rút tiền thật, không cho đổi vật phẩm ra tiền. Điều này giúp giảm đáng kể rủi ro pháp lý tài chính ở mọi thị trường.

---

## 21. Lộ trình MVP

| Bản | Thời gian (ước tính) | Nội dung | Câu hỏi cần trả lời |
|---|---|---|---|
| **0. Thiết kế và mô phỏng** | 2–3 tuần | Chốt chỉ số, bảng rơi đồ, đường cong lên cấp. Viết script mô phỏng 1.000 người chơi trong 30 ngày. **Tra cứu và nộp đơn nhãn hiệu UNDERWORLD: Loot & Raid**, giữ chỗ tên bot và kênh. Tư vấn pháp lý ban đầu (pháp nhân, Việt Nam, loot box) | Kinh tế có vỡ không? Nhịp lên cấp có đúng mục tiêu không? Nhãn hiệu có rủi ro ở thị trường nào? |
| **1. Lõi solo** | 5–6 tuần | Đăng nhập Telegram, Đồ Tể, 30 tầng đầu, AFK, 6 ô đồ, nâng cấp, phân rã, **hướng dẫn tân thủ đầy đủ**. **Hạ tầng i18n** (tiếng Anh + 1 ngôn ngữ thử), cấu hình Vùng và múi giờ | **Bản thân việc đánh và rơi đồ có vui không?** Hướng dẫn hoàn thành trên 85%? |
| **2. PvP và nạp** | 3–4 tuần | Đấu trường, cướp kho, trả thù, bot thông báo (giờ yên tĩnh theo múi giờ), nạp Stars (gói Kim Cương, nạp đầu, thẻ tháng, thẻ tuần), tầng 31–60 | Người chơi có quay lại vì PvP không? Tỉ lệ nạp? |
| **3. Bang hội và bản địa hóa** | 4–5 tuần | Hội, boss hội, cửa hàng hội, bot trong group, Xạ Thủ và Phù Thủy Ngầm, Battle Pass, Rương Ngầm (có cờ tắt theo quốc gia). **Dịch đủ 4 ngôn ngữ đợt 1** (Anh, Nga, Indonesia, Tây Ban Nha), điều khoản sử dụng ghi rõ quốc gia được phục vụ, chính sách quyền riêng tư, chức năng xóa dữ liệu | Người trong hội có giữ chân tốt hơn không? Bản dịch có ổn không? |
| **— Beta kín —** | 2–3 tuần | 300–800 người, nhiều khu vực | Đạt ngưỡng chỉ số mục 22? |
| **— Soft launch —** | 4–6 tuần | 2–3 thị trường thử nghiệm (mục 16.3) | Chỉ số ổn định ở quy mô lớn hơn? Chi phí thu hút một người chơi? |
| **4. Ra mắt nhóm A** | — | Chiến tranh hội, Tầng Vô Tận (bảng toàn cầu), Truy nã, sự kiện, đủ 3 Vùng | — |
| **5. Sau ra mắt** | — | Ngôn ngữ đợt 2, thị trường nhóm B, bản đồ 12 quận, chợ nguyên liệu, chương mới mỗi mùa | — |

**Nguyên tắc:** nếu bản 1 chưa vui thì **sửa lõi**, chưa làm bản 2. Nếu soft launch chưa đạt chỉ số thì **chưa chi nhiều tiền quảng cáo.**

---

## 22. Chỉ số cần theo dõi

### 22.1. Ngưỡng mục tiêu (tham khảo cho game idle RPG)

| Chỉ số | Mục tiêu |
|---|---|
| Hoàn thành hướng dẫn tân thủ | ≥ 85% |
| Retention D1 | ≥ 40% |
| Retention D7 | ≥ 15% |
| Retention D30 | ≥ 5% |
| Vào hội trước ngày 3 (trong số người còn chơi) | ≥ 50% |
| Thời gian chơi trung bình/ngày | 15–25 phút, 3+ lần mở app |
| Tỉ lệ người nạp | 2–5% (khác nhau nhiều theo khu vực) |
| Quay lại sau khi bị cướp (trong 1 giờ) | ≥ 40% |

### 22.2. Chia theo khu vực và ngôn ngữ

**Mọi chỉ số trên đều phải xem theo từng ngôn ngữ, Vùng và quốc gia**, không chỉ con số tổng. Ví dụ:

- Retention D1 tiếng Indonesia thấp hơn hẳn tiếng Anh → có thể do bản dịch hướng dẫn tân thủ kém, hoặc tải chậm trên mạng yếu.
- Tỉ lệ nạp ở một nước thấp → thử ưu đãi khởi đầu khác (mục 13.4).
- **Doanh thu trung bình mỗi người chơi (ARPU) và chi phí thu hút một người chơi (CPI)** theo quốc gia → quyết định nơi chi tiền quảng cáo.
- Thời gian tải Mini App theo quốc gia → quyết định khi nào cần thêm máy chủ hoặc CDN.

### 22.3. Phễu người chơi mới (theo dõi từng bước để biết người chơi bỏ ở đâu)

`Bấm Start bot → Mở Mini App → Tải xong → Đánh xong trận 1 → Trang bị món đầu → Hạ boss tầng 3 → Chọn lớp → Nhận AFK → Đấu trường trận 1 → Cấp 10 → Vào hội → Quay lại ngày 2`

### 22.4. Kinh tế

- Tổng Vàng và Kim Cương sinh ra và tiêu đi mỗi ngày (theo Khu).
- Phân bố cấp cường hóa trang bị theo thời gian chơi.
- Tầng mà người chơi bị kẹt lâu nhất (cảnh báo vấn đề cân bằng).
- Chênh lệch lực chiến giữa người nạp và người không nạp cùng thời gian chơi (mục tiêu ≤ 3 lần).

---

## 23. Quyết định đã chốt và câu hỏi còn mở

### 23.1. Đã chốt

| Ngày | Quyết định |
|---|---|
| 10/10/2026 | Tên game: **UNDERWORLD** (tên đầy đủ *UNDERWORLD: Loot & Raid*) |
| 10/10/2026 | Thị trường: **chỉ nước ngoài, không nhắm tới Việt Nam.** Không có tiếng Việt trong game |
| 10/10/2026 | Ngôn ngữ ra mắt: Anh, Nga, Indonesia, Tây Ban Nha (Mỹ Latinh) |

### 23.2. Còn mở

1. **Phong cách hình ảnh:** pixel art (rẻ, nhẹ, dễ được chấp nhận toàn cầu) hay 2D vẽ tay (đẹp hơn, tốn chi phí)?
2. **Thị trường soft launch:** chọn 2–3 nước nào? Tiêu chí: chi phí quảng cáo thấp, đủ đông người dùng Telegram, ngôn ngữ đã có bản dịch.
3. **Pháp nhân:** đăng ký công ty ở đâu (ví dụ Singapore, Estonia, UAE...) để thuận lợi về thuế, nhận doanh thu Stars và pháp lý cho game quốc tế?
4. **Chặn IP Việt Nam:** có cần chặn kỹ thuật hay chỉ cần không nhắm tới (mục 20.5)?
5. **Quy mô Khu:** 2.000 người là hợp lý hay nên nhỏ hơn để đông vui hơn ở giai đoạn đầu?
6. **Cướp kho:** người chơi có được chọn **tắt PvP cướp kho** (đổi lại AFK −20%) không? Cách này giữ được người chơi không thích bị đánh, nhưng giảm kịch tính.
7. **Thú cưng / đồng hành:** có thêm lớp hệ thống này ở giai đoạn sau để tăng chiều sâu và doanh thu không?
8. **Đội ngũ vận hành:** ai theo dõi kinh tế và cộng đồng hằng ngày? Tuyển quản trị viên bản xứ cho tiếng Nga, Indonesia và Tây Ban Nha bằng cách nào?

---

## Phụ lục A. Bảng thuật ngữ Việt–Anh

Dùng thống nhất trong mã nguồn, chuỗi dịch và tài liệu. Cột tiếng Anh là **tên gốc trong game.** Cột tiếng Việt **chỉ dùng trong tài liệu nội bộ**, không xuất hiện trong game.

| Tiếng Việt | Tiếng Anh (gốc) | Ghi chú |
|---|---|---|
| Thành Phố Ngầm | The Undercity | Bối cảnh |
| Vực Sâu | The Abyss | Hầm ngục |
| Kẻ Săn | Hunter | Người chơi |
| Khu | Realm | Máy chủ ~2.000 người |
| Vùng | Region | Châu Á / Châu Âu–SNG–Châu Phi / Châu Mỹ |
| Lực chiến | Power | |
| Năng lượng | Energy | |
| Phúc lợi | Boon | Chọn 1 trong 3 sau mỗi đợt quái |
| Tầng Vô Tận | Endless Depths | |
| Đồ Tể | Butcher | Lớp nhân vật |
| Xạ Thủ | Gunslinger | Lớp nhân vật |
| Phù Thủy Ngầm | Hexer | Lớp nhân vật |
| Lão Tý | Old Rusty | NPC thợ rèn |
| Mèo Đen | Kat | NPC môi giới tin tức |
| Gã Ba Sẹo | Three-Scars | NPC ông trùm đấu trường |
| Thường / Tốt / Hiếm / Sử Thi / Huyền Thoại | Common / Uncommon / Rare / Epic / Legendary | Độ hiếm |
| Nâng cấp / Cường hóa | Enhance | +1 đến +15 |
| Tích lũy may mắn | Luck Meter | |
| Phân rã | Salvage | |
| Chế tạo | Craft | |
| Đúc lại | Reforge | |
| Bảo hiểm rơi đồ | Pity | |
| Kho AFK | Stash | |
| Két sắt | Vault | |
| Đấu trường | Arena | |
| Chúa Tể Ngầm | Underlord | Bậc cao nhất đấu trường |
| Cướp kho | Raid | |
| Trả thù | Revenge | |
| Khiên | Shield | |
| Bảng Truy nã | Bounty Board | |
| Bang hội | Guild | |
| Boss hội | Guild Boss | |
| Chiến tranh hội | Guild War | |
| Điểm Cống Hiến | Guild Merit | |
| Vàng | Gold | Tiền mềm |
| Kim Cương | Gems | Tiền cứng |
| Huy Hiệu Đấu Trường | Arena Badges | |
| Rương Ngầm | Abyss Chest | |
| Thẻ tháng / Thẻ tuần | Monthly Pass / Weekly Pass | |
| Người Tiên Phong | Pioneer | Danh hiệu đăng ký sớm |
