-- 真實演唱會資訊種子資料

do $$
begin
	alter table concerts
		add constraint concerts_unique_show
		unique (artist, date_str, city_zh, venue_zh, tour_zh);
exception
	when duplicate_object or sqlstate '42P07' then
		null;
end $$;

insert into concerts (artist, emoji, date_str, city_zh, city_en, venue_zh, venue_en, tour_zh, tour_en, price_zh, price_en, platform, platform_url, genre, status, is_hot, grad_css, image_url) values

-- 近期熱門演出
('ONE OK ROCK', '🎸', '2026/04/25–26', '台北', 'Taipei', '台北大巨蛋', 'Taipei Dome', 'LUXURY DISEASE 亞洲巡演', 'LUXURY DISEASE Asia Tour', 'NT$ 1,880-6,280', 'NT$ 1,880-6,280', 'KKTIX', 'https://kktix.com', 'bands', 'selling', true, 'linear-gradient(135deg, #1a1a1a 0%, #b91d1d 100%)', 'https://www.mtv.com.tw/uploads/files/30827/conversions/ONEOKROCK-sl.jpg?v=1715668134'),

('TWICE', '✨', '2026/03/20-22', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', 'READY TO BE 世界巡演', 'READY TO BE World Tour', 'NT$ 1,800-8,800 (含VIP)', 'NT$ 1,800-8,800 (w/ VIP)', 'ibon', 'https://ibon.com.tw', 'kpop', 'sold_out', true, 'linear-gradient(135deg, #ff6b9d 0%, #feca57 100%)', 'https://dynamicmedia.livenationinternational.com/p/l/m/7edc73df-70ef-49b8-93ac-7f8bff7e8e5a.jpg'),

('林俊傑', '🎤', '2026/05/09-11', '高雄', 'Kaohsiung', '高雄巨蛋', 'Kaohsiung Arena', 'JJ20 世界巡迴演唱會', 'JJ20 World Tour', 'NT$ 2,000-8,000', 'NT$ 2,000-8,000', 'KKTIX', 'https://kktix.com', 'cpop', 'selling', true, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'https://i.kfs.io/artist/global/8280,0v23/fit/500x500.jpg'),

('茄子蛋', '🥚', '2026/06/14', '台中', 'Taichung', '台中圓滿戶外劇場', 'Taichung Fulfillment Amphitheater', '浪流連 演唱會', 'Vagrancy Concert', 'NT$ 1,200-3,200', 'NT$ 1,200-3,200', 'KKTIX', 'https://kktix.com', 'bands', 'pending', false, 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', null),

('告五人', '🌟', '2026/07/19-20', '台北', 'Taipei', '台北流行音樂中心', 'Taipei Music Center', '帶你飛 演唱會', 'Take You Flying Concert', 'NT$ 1,500-3,500', 'NT$ 1,500-3,500', 'ibon', 'https://ibon.com.tw', 'cpop', 'pending', false, 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', null),

('五月天', '🎸', '2026/08/08-10', '台北', 'Taipei', '台北大巨蛋', 'Taipei Dome', '好好好想見到你 巡演', 'MAYDAY 2026', 'NT$ 2,200-6,600', 'NT$ 2,200-6,600', 'KKTIX', 'https://kktix.com', 'bands', 'pending', true, 'linear-gradient(135deg, #3498db 0%, #2ecc71 100%)', 'https://s.yimg.com/ny/api/res/1.2/qhgRRVysbv7QXIlh.Et2vg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTY0MDtoPTQzNQ--/https://media.zenfs.com/zh-tw/__647/2f134a1e2835d69416d7032df1940c02'),

('張惠妹', '👑', '2026/09/25-27', '高雄', 'Kaohsiung', '高雄世運主場館', 'National Stadium', 'asMEI 巡迴演唱會', 'asMEI Tour', 'NT$ 2,500-8,000', 'NT$ 2,500-8,000', 'KKTIX', 'https://kktix.com', 'cpop', 'pending', false, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', null),

('動力火車', '🚂', '2026/10/05', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', '繼續轉動 演唱會', 'Keep Rolling Concert', 'NT$ 1,800-4,800', 'NT$ 1,800-4,800', 'ibon', 'https://ibon.com.tw', 'cpop', 'pending', false, 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', null),

('BLACKPINK', '💗', '2026/11/15-16', '台北', 'Taipei', '台北大巨蛋', 'Taipei Dome', 'BORN PINK 世界巡演', 'BORN PINK World Tour', 'NT$ 2,800-12,800 (含VIP)', 'NT$ 2,800-12,800 (w/ VIP)', 'ibon', 'https://ibon.com.tw', 'kpop', 'pending', true, 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', 'https://upload.wikimedia.org/wikipedia/commons/1/18/20240809_Blackpink_Pink_Carpet_09.png'),

('張學友', '🎵', '2026/12/20-22', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', '60+ 巡迴演唱會', '60+ Tour', 'NT$ 2,400-8,800', 'NT$ 2,400-8,800', 'KKTIX', 'https://kktix.com', 'cpop', 'pending', false, 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', null),

-- 新增 J-POP 真實場次（僅保留未來日期）
('back number', '🎶', '2026/08/22-23', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', 'Grateful Yesterdays Tour 2026 亞洲巡演', 'Grateful Yesterdays Tour 2026 Asia Tour', '票價待公布', 'TBA', '官方網站', 'https://backnumber.info/feature/stadiumtour2026_schedule', 'jpop', 'pending', true, 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)', 'https://i.kfs.io/article5_cover/global/11613846v3/fit/800x420.jpg'),

('Vaundy', '🔥', '2026/10/31-11/01', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', 'ASIA ARENA TOUR 2026「HORO」', 'ASIA ARENA TOUR 2026 "HORO"', '票價待公布', 'TBA', '官方網站', 'https://vaundy.jp/live/', 'jpop', 'pending', true, 'linear-gradient(135deg, #232526 0%, #414345 100%)', 'https://vaundy.jp/og_image.png'),

('IVE', '💫', '2026/09/11-12', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', 'IVE WORLD TOUR <SHOW WHAT I AM> 台北站', 'IVE WORLD TOUR <SHOW WHAT I AM> IN TAIPEI', 'NT$ 800-7,800', 'NT$ 800-7,800', '拓元售票', 'https://www.livenation.com.tw/en/event/ive-world-tour-show-what-i-am-in-taipei-taipei-tickets-edp1663145', 'kpop', 'pending', true, 'linear-gradient(135deg, #ff6a88 0%, #6a11cb 100%)', 'https://ian.marieclaire.com.tw/assets/mc/202208/6303629B7B6A91661166235.png?t=sc&w=1200%2C675&format=jpg'),

('Laufey', '🎻', '2026/05/15', '台北', 'Taipei', '國立體育大學綜合體育館（林口體育館）', 'NTSU Arena (Linkou Arena)', 'A Matter of Time Tour 台北站', 'A Matter of Time Tour Taipei', 'NT$ 2,980-9,480', 'NT$ 2,980-9,480', '拓元售票', 'https://www.livenation.com.tw/en/event/laufey-a-matter-of-time-tour-taipei-tickets-edp1656959', 'western', 'selling', true, 'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)', null),

('LANY', '🌙', '2026/09/26', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', 'soft world tour 台北站', 'soft world tour Taipei', 'NT$ 800-8,880', 'NT$ 800-8,880', '拓元售票', 'https://www.livenation.com.tw/en/event/lany-soft-world-tour-taipei-tickets-edp1660106', 'western', 'selling', true, 'linear-gradient(135deg, #232526 0%, #414345 100%)', null),

('孫燕姿', '🌇', '2026/05/15-17', '台北', 'Taipei', '臺北大巨蛋', 'Taipei Dome', '就在日落以後巡迴演唱會 台北站', '"AUT NIHILO" Sun Yanzi in Concert – Taipei', '票價待公布', 'TBA', 'KKTIX', 'https://www.livenation.com.tw/en/event/%E5%9C%8B%E6%B3%B0%E4%B8%96%E8%8F%AF%E9%8A%80%E8%A1%8C-%E5%AD%AB%E7%87%95%E5%A7%BF-%E5%B0%B1%E5%9C%A8%E6%97%A5%E8%90%BD%E4%BB%A5%E5%BE%8C-%E5%B7%A1%E8%BF%B4%E6%BC%94%E5%94%B1%E6%9C%83-%E5%8F%B0%E5%8C%97-taipei-tickets-edp1656574', 'cpop', 'selling', true, 'linear-gradient(135deg, #c79081 0%, #dfa579 100%)', 'https://media.gq.com.tw/photos/5dbc6a118569400008318d84/16:9/w_1280,c_limit/2017072171662441.jpg'),

('TREASURE', '💎', '2026/03/28', '台北', 'Taipei', '國立體育大學綜合體育館（林口體育館）', 'NTSU Arena (Linkou Arena)', '2025-26 TREASURE TOUR [PULSE ON] IN TAIPEI', '2025-26 TREASURE TOUR [PULSE ON] IN TAIPEI', 'NT$ 2,800-7,800', 'NT$ 2,800-7,800', '拓元售票', 'https://www.livenation.com.tw/show/1628468/2025-26-treasure-tour-pulse-on-in-taipei/taipei/2026-03-28/zh', 'kpop', 'pending', true, 'linear-gradient(135deg, #2b2d42 0%, #8d99ae 100%)', 'https://a.ksd-i.com/a/2020-08-18/129330-866498.jpg'),

('NCT WISH', '🟢', '2026/02/28', '台北', 'Taipei', '國立體育大學綜合體育館（林口體育館）', 'NTSU Arena (Linkou Arena)', '2026 NCT WISH ASIA TOUR LOG in 台北', '2026 NCT WISH ASIA TOUR LOG in Taipei', '票價待公布', 'TBA', 'Kpopn', 'https://www.kpopn.com/2025/10/22/news-nct-wish-taiwan-concert', 'kpop', 'sold_out', false, 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', null),

('G.E.M. 鄧紫棋', '🎙️', '2026/04/09-12', '台北', 'Taipei', '臺北大巨蛋', 'Taipei Dome', 'I AM GLORIA 世界巡迴演唱會 2.0 台北站', 'I AM GLORIA World Tour 2.0 Taipei', '票價待公布', 'TBA', 'Live Nation Taiwan', 'https://www.livenation.com.tw/event/all', 'cpop', 'pending', true, 'linear-gradient(135deg, #3a1c71 0%, #d76d77 100%)', null),

('2AM', '🎤', '2026/05/24', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 2AM 台灣演唱會', '2026 2AM Taiwan Concert', '票價待公布', 'TBA', 'KSD 韓星網', 'https://www.koreastardaily.com/tc/news/162092', 'kpop', 'pending', false, 'linear-gradient(135deg, #1d2b64 0%, #f8cdda 100%)', 'https://a.ksd-i.com/a/2026-03-26/162092-1053642.jpg'),

-- 已售罄場次
('蔡依林', '💎', '2026/02/28', '台北', 'Taipei', '台北小巨蛋', 'Taipei Arena', 'Ugly Beauty 2.0', 'Ugly Beauty 2.0', 'NT$ 2,000-6,600', 'NT$ 2,000-6,600', 'KKTIX', 'https://kktix.com', 'cpop', 'sold_out', false, 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)', null),

('周杰倫', '🎹', '2026/03/01-03', '台北', 'Taipei', '台北大巨蛋', 'Taipei Dome', '嘉年華世界巡演', 'Carnival World Tour', 'NT$ 2,400-12,000', 'NT$ 2,400-12,000', 'ibon', 'https://ibon.com.tw', 'cpop', 'sold_out', false, 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', null),

('Super Junior', '⚡', '2026/01/24-25', '高雄', 'Kaohsiung', '高雄巨蛋', 'Kaohsiung Arena', 'SUPER SHOW 10 高雄站', 'SUPER SHOW 10 Kaohsiung', '票價待公布', 'TBA', 'Kpopn', 'https://www.kpopn.com/2025/12/15/news-leeteuk-spoil-ss10-kaohsiung', 'kpop', 'sold_out', false, 'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)', 'https://www.kpopn.com/upload/d22435d35d7fa39aeaeb.jpg'),

-- 台灣指標性音樂祭
('大港開唱', '⚓', '2026/03/21-22', '高雄', 'Kaohsiung', '高雄駁二藝術特區', 'Pier-2 Art Center Kaohsiung', '2026 大港開唱音樂節', 'Megaport Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/megaportfest/', 'festival', 'sold_out', true, 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', 'https://pier2.org/upload/event/EQQHXLVR1225336.jpeg'),

('貴人散步音樂節', '🌿', '2026/04/25-26', '台北', 'Taipei', '多場地（台北市區）', 'Multiple Venues (Taipei)', '2026 貴人散步音樂節', 'LucyFest 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/lucyfest_tw/', 'festival', 'pending', false, 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)', null),

('春浪音樂節', '🌊', '2026/05/02-03', '新北', 'New Taipei', '淡水沙崙海水浴場', 'Danshui Shalun Beach', '2026 春浪音樂節', 'Spring Wave Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/springwaveofficial/', 'festival', 'pending', false, 'linear-gradient(135deg, #2196f3 0%, #00bcd4 50%, #26c6da 100%)', null),

('火球祭', '🔥', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 火球祭', 'Fireball Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/fireball_fest/', 'festival', 'pending', false, 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', null),

('浪人祭', '🌅', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 浪人祭', 'Vagabond Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/vagabondfest.tw/', 'festival', 'pending', false, 'linear-gradient(135deg, #e96c19 0%, #f9d423 100%)', null),

('月光·海音樂會', '🌙', '2026/08/15', '台東', 'Taitung', '台東都蘭部落廣場', 'Dulan Aboriginal Plaza, Taitung', '2026 月光·海音樂會', 'Moonlight Ocean Concert 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/taiwaneastcoastlandartfestival/', 'festival', 'pending', false, 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', null),

('世界音樂節@臺灣', '🌍', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 世界音樂節@臺灣', 'World Music Festival Taiwan 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/worldmusicfestivaltaiwan/', 'festival', 'pending', false, 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', null),

('覺醒音樂節', '⚡', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 覺醒音樂節', 'Energy & Noisy Music Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/e_and_n_tw/', 'festival', 'pending', false, 'linear-gradient(135deg, #4776e6 0%, #8e54e9 100%)', null),

('簡單生活節', '🍃', '2026/11/28-29', '台北', 'Taipei', '大佳河濱公園', 'Dajia Riverside Park', '2026 簡單生活節', 'Simple Life Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/simplelife_ontheway/', 'festival', 'pending', true, 'linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)', null),

('有機體音樂節', '🌱', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 有機體音樂節', 'Organik Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/organik_festival/', 'festival', 'pending', false, 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', null),

('Smoke Machine Taipei', '💨', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 Smoke Machine Taipei', 'Smoke Machine Taipei 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/smoke_machine_taipei/', 'festival', 'pending', false, 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', null),

('島嶼音樂節', '🏝️', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 島嶼音樂節', 'Islander Music Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/islander_fest/', 'festival', 'pending', false, 'linear-gradient(135deg, #00b4d8 0%, #90e0ef 100%)', null),

('霓虹綠洲音樂祭', '🌈', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 霓虹綠洲音樂祭', 'Neon Oasis Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/neon_oasis_fest/', 'festival', 'pending', false, 'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)', null),

('打狗祭', '🎸', '日期待公布', '高雄', 'Kaohsiung', '場地待公布', 'Venue TBA', '2026 打狗祭', 'Takao Rock Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/takao_rock/', 'festival', 'pending', false, 'linear-gradient(135deg, #373b44 0%, #4286f4 100%)', null),

('So Wonderful Festival', '✨', '日期待公布', '台北', 'Taipei', '場地待公布', 'Venue TBA', '2026 So Wonderful Festival', 'So Wonderful Festival 2026', '票價待公布', 'TBA', 'Instagram', 'https://www.instagram.com/so_wonderful_festival/', 'festival', 'pending', false, 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', null)
on conflict on constraint concerts_unique_show do update
set
	emoji = excluded.emoji,
	city_en = excluded.city_en,
	venue_en = excluded.venue_en,
	tour_en = excluded.tour_en,
	price_zh = excluded.price_zh,
	price_en = excluded.price_en,
	platform = excluded.platform,
	platform_url = excluded.platform_url,
	genre = excluded.genre,
	status = excluded.status,
	is_hot = excluded.is_hot,
	grad_css = excluded.grad_css,
	image_url = excluded.image_url;
