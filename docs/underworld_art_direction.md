# UNDERWORLD: LOOT & RAID — Ý TƯỞNG THIẾT KẾ ĐỒ HỌA

> Ngày: 10/10/2026
> Tài liệu liên quan: [underworld_gdd.md](underworld_gdd.md), [underworld_detailed_design.md](underworld_detailed_design.md)

## Định hướng nghệ thuật

UNDERWORLD: Loot & Raid dùng **pixel art 32-bit, tông tối với điểm sáng neon**: một thành phố ngầm bẩn, ẩm, nhưng đồ rơi ra thì sáng rực. Hướng này giữ nguyên đề xuất ở thiết kế chi tiết §1 và mở rộng thành bộ quy tắc cho họa sĩ.

**Câu chốt cho cả đội:** "Bóng tối là nền, đồ rơi là ngôi sao." Mọi thứ trong cảnh đều tối và ít bão hòa, để màu độ hiếm và nút hành động nổi lên ngay.

**Bốn trụ cột hình ảnh**

1. **Đọc được ở 360 px:** màn hình dọc, một tay. Nhân vật, quái và số sát thương phải nhận ra trong 0,5 giây trên Android tầm thấp.
2. **Loot là nhân vật chính:** hiệu ứng rơi đồ, khung độ hiếm và thẻ khoe đồ được đầu tư nhiều nhất, vì đây là cảm xúc số 1 của game.
3. **Thô ráp nhưng hài hước:** gỉ sét, ống cống, biển hiệu chợ đen; quái có nét ngớ ngẩn (Vua Chuột Mập đội vương miện nắp lon). Hợp giọng văn "chợ đen, hài nhẹ" của GDD.
4. **Nhẹ:** bản tải đầu dưới 2 MB, sprite atlas WebP, ít lớp hiệu ứng chồng nhau.

**Từ khóa mood:** dieselpunk dưới lòng đất, chợ đêm neon, hầm mỏ cổ, nấm phát quang, kim loại gỉ.

**Tham chiếu tinh thần** (chỉ để tham khảo cảm giác, không sao chép): độ "đã" khi rơi đồ của Diablo, nhịp chiến đấu tự động của AFK Arena, cách dùng ánh sáng trong pixel art của Dead Cells và Moonlighter.

**Tránh để không bị liên tưởng tới phim *Underworld*:** tông xanh thép lạnh đơn sắc, áo da bó, ma cà rồng và người sói, phông chữ gothic. Theo GDD §17.4 cũng tránh biểu tượng tôn giáo, chính trị, cờ thật, và giữ trang phục ở mức 13+.

## Bảng màu và ánh sáng

Nền chiếm khoảng 80% diện tích màn hình với độ bão hòa thấp; màu neon chỉ dành cho thứ người chơi cần bấm hoặc cần thèm.

**Màu hệ thống**

| Vai trò | Màu | Dùng cho |
| --- | --- | --- |
| Nền sâu | `#0E0E14` đen than | Nền app, nền cảnh chiến đấu |
| Nền khối | `#1C1C26` xám đá | Panel, thẻ, thanh điều hướng |
| Viền kim loại | `#3A3A4A` | Khung 9-slice, đường kẻ |
| Chữ chính | `#E8E6E3` | Chữ, số liệu |
| Hành động và kỹ năng | `#4FE3E0` xanh ngọc neon, chữ trên nút `#0E0E14` | Nút "Xuống Vực Sâu", tab đang chọn, thanh năng lượng kỹ năng, vòng Perfect. Một màu cho mọi thứ "bấm được" |
| Hồi phục | `#5CFF8F` xanh lục độc | Thanh máu, hồi máu, buff |
| Nguy hiểm | `#FF3B4E` đỏ | Sát thương nhận, cướp kho, boss gồng chiêu, chấm đỏ cần nhận |
| Tiền tệ | `#FFC93C` vàng | Vàng, số Lực chiến nhảy lên |

**Màu độ hiếm** (GDD §9.2): luôn đi kèm hình dạng khung riêng, vì GDD §17.4 cấm dùng màu làm tín hiệu duy nhất.

| Độ hiếm | Màu | Khung | Cột sáng khi rơi |
| --- | --- | --- | --- |
| Thường | `#9A9AA8` xám | Viền đơn, góc vuông | Không có |
| Tốt | `#7BD94A` xanh lá ngả vàng | Viền đơn, 1 góc cắt | Thấp, không hạt |
| Hiếm | `#3FA0FF` xanh dương | Viền đôi | Trung bình, ít hạt |
| Sử Thi | `#B46CFF` tím | Viền đôi + 4 đinh tán đá quý | Cao, hạt xoáy |
| Huyền Thoại | `#FF7A1A` → `#FFC93C` cam sang vàng | Viền lửa hoạt ảnh + vương miện nhỏ | Cột cao hết màn hình, lóe sáng |

Màu "Tốt" được ngả sang vàng lá để không trùng với xanh hồi phục `#5CFF8F`. Huyền Thoại dùng dải chuyển cam sang vàng có lấp lánh. **Cam neon `#FF7A1A` chỉ dành cho Huyền Thoại và logo:** không nút hay tab nào dùng cam, nên mỗi lần màu cam xuất hiện là một khoảnh khắc đặc biệt.

**Ánh sáng**

- Mỗi cảnh có **một nguồn sáng chủ đạo** có trong thế giới: đèn dầu, biển neon, lò lửa, nấm phát quang. Không dùng ánh sáng trời.
- Sáng và tối vẽ sẵn bằng dải màu (ramp) 4–5 nấc cho mỗi vật liệu, không dùng shader đổ bóng để nhẹ máy.
- Nhân vật có **viền sáng 1 px** (rim light) theo màu nguồn sáng của chương, để luôn tách khỏi nền tối.
- Quái thường tối hơn nhân vật một nấc; boss có đôi mắt hoặc lõi phát sáng để ánh mắt tìm về trước.

## Nhân vật, NPC và quái

Mỗi nhân vật phải nhận ra được **chỉ bằng bóng đen** (silhouette) ở kích thước 48×48 px. Đây là bài kiểm tra đầu tiên cho mọi bản phác.

**Quy chuẩn kích thước** (thiết kế chi tiết §1): nhân vật và quái thường 48×48 px, hiển thị ×3; boss 96×96 đến 128×128 px; biểu tượng vật phẩm 32×32 px. Tỉ lệ cơ thể hơi chibi (đầu khoảng 1/3 chiều cao) để mặt và vũ khí vẫn rõ khi nhỏ.

**Ba lớp nhân vật**

| Lớp | Bóng dáng | Màu nhận diện | Đạo cụ chính | Điểm nhấn |
| --- | --- | --- | --- | --- |
| Đồ Tể (Butcher) | To ngang, vai rộng, khối tam giác ngược | Nâu da, đỏ rỉ sét | Rìu/dao chặt thịt cỡ lớn, tạp dề da | *Chém Xoáy*: vệt xoáy đỏ, bắn hạt máu xanh lục khi hồi máu |
| Xạ Thủ (Gunslinger) | Mảnh, cao, áo khoác dài bay | Xám khói, đồng thau | Súng lục nòng dài, kính bảo hộ phát sáng | *Phát Bắn Định Mệnh*: nòng súng tích sáng vàng rồi bắn tia cắt ngang màn hình |
| Phù Thủy Ngầm (Hexer) | Mũ trùm nhọn, áo choàng rách | Tím đậm, xanh độc | Đèn lồng chứa khí độc, mặt nạ lọc khí | *Mưa Độc*: mây xanh lục đổ giọt, quái bị phủ màu xanh khi trúng độc |

**Trang bị hiển thị trên người:** để tiết kiệm, chỉ **vũ khí** đổi hình theo món đang cầm (thay sprite tay cầm). Mặc đủ 4 món cùng bộ thì đổi sang **trang phục của bộ** bằng hoán màu (palette swap) cộng một phụ kiện đặc trưng: Drifter có khăn quàng rách, Gravedigger có xẻng vai, Underlord có vương miện sắt gãy. Người khác nhìn được bộ đồ của bạn trong Đấu trường và Cướp kho.

**Skin** (bán trong cửa hàng và Battle Pass, không tăng chỉ số): vẽ lại toàn bộ sprite, khác hẳn palette swap của bộ đồ, để người trả tiền thấy rõ giá trị. Mỗi skin có hiệu ứng kỹ năng đổi màu riêng.

**Ba NPC** (chân dung bán thân 96×96 px cho hộp thoại, 3 biểu cảm: bình thường, cười, cáu)

- **Old Rusty:** thợ rèn già một mắt kính hàn, râu cháy xém, tay máy. Luôn đứng trước ánh lửa lò rèn màu cam.
- **Kat:** cô môi giới tin tức đội mũ trùm có tai mèo, mắt phát sáng xanh ngọc, cầm tấm bảng truy nã. Đứng dưới biển neon hồng.
- **Three-Scars:** ông trùm đấu trường to lớn, ba vết sẹo chéo trên mặt, xì gà, áo khoác lông. Xuất hiện trong mọi thông báo bị cướp, nên biểu cảm "cười khẩy" là quan trọng nhất.

**Quái và boss:** mỗi chương có 3 quái thường, 1 quái tinh anh và 1 boss chương (thiết kế chi tiết §8). Quần thể mỗi chương dùng chung bảng màu của chương đó. Quái tinh anh là quái thường phóng to 1,25 lần thêm giáp và viền đỏ, để tiết kiệm công vẽ. Boss phải thể hiện cơ chế của nó ngay trên hình: Người Đào Mộ mang khiên xương trên lưng, Golem Lò Nung có bụng lò sáng dần khi gồng, Bà Chủ Nợ cầm sổ nợ hút biểu tượng phúc lợi.

## Môi trường và màn chơi

Sáu chương đi dần xuống sâu, và màu chủ đạo đổi rõ rệt sau mỗi chương để người chơi **cảm nhận được mình đang tiến bộ** ngay cả khi không đọc chữ.

| Chương | Không khí | Màu chủ đạo | Nguồn sáng | Cột mốc nhận diện |
| --- | --- | --- | --- | --- |
| 1. Cống Ngầm | Ẩm, bẩn, hài hước | Xanh rêu, nâu bùn | Đèn dầu vàng đục | Ống cống khổng lồ, ngai vàng bằng rác của Vua Chuột |
| 2. Nghĩa Địa Sắt | Lạnh, lặng | Xám sắt, gỉ cam | Ma trơi xanh nhạt | Nghĩa địa robot, cần cẩu mỏ gãy |
| 3. Chợ Ma | Náo nhiệt, mờ ám | Tím, hồng neon | Biển hiệu neon, đèn lồng | Sạp hàng trôi nổi, két sắt khổng lồ của Bà Chủ Nợ |
| 4. Lò Đúc | Nóng, ồn ào | Đỏ, cam lửa | Dòng kim loại nóng chảy | Bánh răng khổng lồ, nồi nấu thép |
| 5. Vườn Nấm Độc | Kỳ lạ, ngột ngạt | Xanh lục độc, tím phấn | Nấm phát quang | Nấm khổng lồ, bào tử bay lơ lửng |
| 6. Ngai Vực Thẳm | Uy nghiêm, đáng sợ | Đen, vàng cổ | Khe nứt phát sáng vàng | Cổng đá cổ, ngai sắt của Kẻ Gác Vực |

Chương 2 và 6 là hai chương dễ bị hiểu là tôn giáo nhất: nghĩa địa dùng bảng số và đống phế liệu thay cho bia mộ chữ thập; "Tế Sư Bóng Tối" mặc áo thợ mỏ có đèn, không mang biểu tượng tôn giáo.

**Cấu trúc cảnh chiến đấu** (dọc, rộng 360–430 px)

- **3 lớp parallax:** nền xa (tĩnh, tối nhất), nền giữa (cột mốc của chương), mặt đất nơi nhân vật đứng. Thêm 1 lớp tiền cảnh mờ (ống nước, xích) trước màn để tạo chiều sâu.
- **Vùng chiến đấu chỉ chiếm dải giữa màn hình;** nửa dưới dành cho nút kỹ năng (wireframe §3.3). Nền phía dưới tối dần để nút nổi.
- Hunter đứng bên trái, quái bên phải. Khi chuyển sang RTL (đợt 3) chỉ lật giao diện, **không lật cảnh chiến đấu**.
- Mỗi chương có 3 biến thể nền (tầng 1–4, 5–9, tầng boss) để 10 tầng không nhàm chán.

**Màn hình Vực Sâu (Home)** là cảnh sống: Hunter đứng thở ở cảnh chương hiện tại, bên cạnh là rương Kho AFK đầy dần (nắp rương hé mở, ánh vàng tràn ra khi đầy). **Bản đồ chương** là một mặt cắt dọc thành phố ngầm, cuộn từ trên xuống, mỗi tầng một chấm sáng trên đường đi xuống Vực Sâu.

**Các khu vực khác:** Đấu trường là hố đấu vây lưới sắt có khán giả bóng đen; Lò rèn của Old Rusty đỏ lửa; Trụ sở hội có cờ hội (biểu tượng ghép từ 3 lớp: nền, hình, màu) do hội trưởng chọn.

## Giao diện UI/HUD và phông chữ

Giao diện theo phong cách **tấm kim loại tán đinh với viền neon**: panel tối, góc có đinh tán, viền 1 px sáng lên khi được chọn. Mọi khung là 9-slice để co giãn khi chữ dài thêm 30–40% (GDD §17.5).

**Quy tắc bố cục**

- **Thanh trên cùng cố định:** avatar, cấp, năng lượng, vàng, Kim Cương, Lực chiến. Lực chiến dùng số to nhất màn hình, màu vàng.
- **Thanh điều hướng dưới:** 5 biểu tượng pixel 24×24 px, tab đang chọn nổi lên 4 px và sáng xanh ngọc. Tab chưa mở hiện ổ khóa sắt kèm cấp mở.
- **Mỗi màn hình chỉ 1 nút xanh ngọc neon** (GDD §14.4). Nút phụ dùng nền xám đá, viền kim loại.
- **Vùng bấm tối thiểu 44×44 px**, nút chính nằm trong 1/3 dưới màn hình cho ngón cái.
- **Chấm đỏ** là viên đá đỏ phát sáng nhỏ, tối đa 3 chấm cùng lúc.
- **Biểu tượng thay chữ:** mỗi chỉ số (HP, ATK, DEF, SPD, chí mạng, hút máu) và mỗi loại tiền có biểu tượng pixel 16×16 px riêng, dùng thống nhất mọi nơi. Không dùng emoji hệ thống trong app vì mỗi máy vẽ một kiểu; emoji chỉ dùng trong tin nhắn bot.

**Phông chữ:** hai lớp, vì phông pixel thường thiếu Cyrillic và khó đọc ở đoạn dài.

| Lớp | Dùng cho | Yêu cầu | Ứng viên (cần kiểm tra bản quyền và bộ ký tự) |
| --- | --- | --- | --- |
| Tiêu đề và số | Số sát thương, Lực chiến, tiêu đề ngắn, logo | Pixel, có Latin mở rộng + Cyrillic | Pixelify Sans, hoặc tự vẽ bộ chữ số bitmap |
| Nội dung | Mô tả đồ, hội thoại NPC, cài đặt | Dễ đọc ở 14 px, Latin mở rộng + Cyrillic, sau này Ả Rập và Devanagari | Họ Noto Sans |

Bộ chữ số nên vẽ riêng có viền đen 1 px để đọc được trên mọi nền, kèm các ký tự `K M , . +` để viết số gọn theo §17.4.

**Logo:** chữ UNDERWORLD vuông, nặng như tấm thép đúc, chữ O thay bằng miệng hố sâu phát sáng cam; dòng "Loot & Raid" nhỏ bên dưới. Luôn đi cùng tên đầy đủ và tránh mọi nét gothic của phim (GDD §2.2).

**Thẻ khoe đồ** (GDD §16.1): ảnh 1200×630 px gửi vào chat Telegram, gồm sprite món đồ phóng to, khung độ hiếm, tên người chơi và logo. Chữ trên thẻ sinh từ chuỗi dịch, không vẽ cứng vào ảnh.

## Hiệu ứng, animation và phản hồi

Ngân sách hiệu ứng dồn vào ba khoảnh khắc tạo cảm xúc trong GDD §1: **rơi đồ, mạnh lên, bị cướp**. Phần còn lại giữ đơn giản.

**Rơi đồ theo độ hiếm** (GDD §9.2: cột sáng, rung, âm riêng)

| Độ hiếm | Hình ảnh | Rung (HapticFeedback) | Âm thanh |
| --- | --- | --- | --- |
| Thường, Tốt | Vật phẩm nảy nhẹ rồi bay vào túi | Không | Tiếng "tách" ngắn |
| Hiếm | Cột sáng xanh dương cao 1/3 cảnh | Nhẹ | Tiếng chuông |
| Sử Thi | Cột tím cao 2/3 cảnh, hạt xoáy, dừng trận 0,3 giây | Trung bình | Hợp âm ngân dài |
| Huyền Thoại | Màn hình tối đi, cột cam vàng xuyên màn hình, món đồ xoay chậm rồi hiện tên + nút chia sẻ | Mạnh, 2 nhịp | Đoạn nhạc riêng 2 giây |

Trong Kho AFK và quét nhanh, hiệu ứng được rút gọn thành lưới ô lật lần lượt, nhưng món Sử Thi trở lên vẫn có cột sáng riêng.

**Mạnh lên:** số Lực chiến đếm lên từng số trong 0,6 giây, phóng to 120% rồi thu về, kèm mũi tên xanh và "+65". Lên cấp có vòng sáng bắt từ chân nhân vật. Nâng cấp thành công có tia lửa bắn từ đe rèn; thất bại thì khói xám và thanh May mắn tăng lên, để thất bại vẫn có cảm giác tiến triển.

**Bị cướp:** vết cào đỏ chéo trên Kho AFK, tiền vàng bay ra khỏi rương, Three-Scars hiện lên với biểu cảm cười khẩy. Nút Trả thù là nút xanh ngọc duy nhất trên màn hình.

**Chiến đấu**

- **Số sát thương:** trắng là thường; vàng, to hơn 1,5 lần, có chữ CRIT là chí mạng; đỏ là sát thương nhận vào; xanh lục là hồi máu. Số bay lên và mờ đi trong 0,8 giây, tối đa 8 số cùng lúc.
- **Vòng Perfect:** vòng xanh ngọc thu nhỏ quanh nút kỹ năng (wireframe §3.3). Perfect: chữ PERFECT, rung màn hình 4 px và dừng hình 0,1 giây; Good: chữ GOOD nhỏ hơn, không rung.
- **Báo hiệu của boss:** mọi đòn cần phản ứng đều có vạch đỏ nhấp nháy và biểu tượng "!" trên đầu boss (khiên xương, Golem gồng chiêu 3 giây). Đây là lúc game dạy người chơi bấm kỹ năng đúng lúc.
- **Phúc lợi:** 3 lá bài lật ra từ dưới lên, biểu tượng lớn 32×32 px; được chọn thì lá bài bay vào thanh phúc lợi trên đầu.

**Số khung hình mỗi động tác** (chạy 10–12 khung/giây, giữ chất pixel)

| Đối tượng | Đứng thở | Đánh thường | Kỹ năng | Trúng đòn | Chết |
| --- | --- | --- | --- | --- | --- |
| Hunter (mỗi lớp) | 4 | 6 | 10 | 2 | 6 |
| Quái thường | 4 | 5 | — | 2 | 5 |
| Boss chương | 6 | 8 | 12 (đòn cơ chế) | 2 | 10 |

**Giới hạn hiệu năng:** tối đa khoảng 60 hạt trên màn hình, không dùng blur hay shader toàn màn hình. Cài đặt có mục "Giảm hiệu ứng" cho máy yếu và người nhạy cảm với rung lắc màn hình.

## Danh sách asset và lộ trình

Asset được làm theo đúng thứ tự các bản MVP ở GDD §21, để bản 1 chỉ cần đủ hình cho câu hỏi "đánh và rơi đồ có vui không?". Số lượng dưới đây là ước tính để lập kế hoạch với họa sĩ.

| Bản | Nhân vật và quái | Môi trường | UI và hiệu ứng | Vật phẩm |
| --- | --- | --- | --- | --- |
| 0. Thiết kế | Bản phác bóng dáng 3 lớp, dùng asset pack mua sẵn để làm mẫu thử | 1 cảnh mẫu chương 1 để chốt chất liệu | **Art bible** (tài liệu này + bảng màu .ase), logo nháp | 6 icon mẫu, mỗi ô 1 cái |
| 1. Lõi solo | Đồ Tể đủ 5 động tác; 9 quái + 3 tinh anh (phóng to, đổi màu) + 3 boss chương 1–3; Old Rusty, Kat | Chương 1–3 × 3 biến thể nền; màn Home; bản đồ chương; 3 khung tranh mở đầu | Bộ UI kit 9-slice, thanh trên, thanh dưới, 5 khung độ hiếm, hiệu ứng rơi đồ, vòng Perfect, bộ chữ số, phúc lợi | 18 icon trang bị (6 ô × 3 chương), 3 trang phục bộ, icon nguyên liệu và tiền |
| 2. PvP và nạp | 9 quái + 3 tinh anh + 3 boss chương 4–6; Three-Scars | Chương 4–6 × 3 biến thể; hố Đấu trường | Hiệu ứng bị cướp và trả thù, huy hiệu 6 bậc đấu trường, giao diện cửa hàng, thẻ khoe đồ | 18 icon trang bị chương 4–6, 3 trang phục bộ, hình gói Kim Cương |
| 3. Bang hội | Xạ Thủ, Phù Thủy Ngầm; boss hội; 1 skin Battle Pass mỗi lớp | Trụ sở hội | Bộ ghép cờ hội, hoạt ảnh mở Rương Ngầm, giao diện Battle Pass, kiểm tra chữ dài tiếng Nga và Tây Ban Nha | Icon cửa hàng hội, khung avatar |
| 4. Ra mắt | Boss thế giới | Tầng Vô Tận (hoán màu chương 6) | Chiến tranh hội, Bảng Truy nã, banner sự kiện | Vật phẩm sự kiện |

**Cách làm việc với họa sĩ**

- [ ] Chốt bảng màu và cảnh mẫu chương 1 trước khi vẽ hàng loạt.
- [ ] Kiểm tra mọi sprite ở kích thước thật trên một máy Android tầm thấp, không chỉ trên màn hình máy tính.
- [ ] Chạy thử khung độ hiếm qua bộ lọc mù màu (deuteranopia, protanopia).
- [ ] Đóng gói sprite thành atlas WebP theo chương, tải dần khi người chơi tới chương đó, để bản tải đầu dưới 2 MB.
