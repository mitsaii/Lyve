import { latestArtistInboxHandlesByRegion, InboxRegion } from './artistInbox'

export interface Artist {
  name: string
  instagram: string
  region: 'western' | 'kpop' | 'jpop' | 'taiwan'
  description: string
  genre?: string
}

const baseArtistList: Artist[] = [
  // KPOP 新生代頂流
  { name: 'NewJeans', instagram: '@newjeans_official', region: 'kpop', description: 'HYBE 新生代頂流女團', genre: 'kpop' },
  { name: 'aespa', instagram: '@aespa_official', region: 'kpop', description: 'SM 一線女團，虛擬角色設定獨特', genre: 'kpop' },
  { name: 'IVE', instagram: '@ivestarship', region: 'kpop', description: 'Starship 新代表女團', genre: 'kpop' },
  { name: 'BABYMONSTER', instagram: '@babymonster_ygofficial', region: 'kpop', description: 'YG 新代表女團', genre: 'kpop' },
  { name: 'LE SSERAFIM', instagram: '@le_sserafim', region: 'kpop', description: 'HYBE 實力派女團', genre: 'kpop' },
  { name: 'KISS OF LIFE', instagram: '@kiss_of_life_official', region: 'kpop', description: '實力派新秀，歐美街頭辣妹感', genre: 'kpop' },
  { name: 'NMIXX', instagram: '@nmixx_official', region: 'kpop', description: 'JYP 新代表女團', genre: 'kpop' },
  { name: 'RIIZE', instagram: '@riize_official', region: 'kpop', description: 'SM 新代表男團', genre: 'kpop' },
  { name: 'TWS', instagram: '@tws_pledis', region: 'kpop', description: '微風感清爽少年團', genre: 'kpop' },
  { name: 'BOYNEXTDOOR', instagram: '@boynextdoor_official', region: 'kpop', description: 'HYBE 新男團', genre: 'kpop' },
  { name: 'ZeroBaseOne', instagram: '@zerobaseoneofficial', region: 'kpop', description: 'MNET 生存秀出道男團', genre: 'kpop' },
  { name: 'Stray Kids', instagram: '@straykids_official_jp', region: 'kpop', description: 'JYP 頂流男團日本帳號', genre: 'kpop' },
  { name: 'ATEEZ', instagram: '@ateez_official_', region: 'kpop', description: 'Coachella 焦點男團', genre: 'kpop' },
  { name: 'TXT', instagram: '@txt_bighit', region: 'kpop', description: 'HYBE 青少年男團', genre: 'kpop' },
  { name: 'ENHYPEN', instagram: '@enhypen', region: 'kpop', description: 'HYBE 新代表男團', genre: 'kpop' },
  { name: 'GIDLE', instagram: '@official_g_i_dle', region: 'kpop', description: 'CUBE 獨立女團', genre: 'kpop' },
  { name: 'STAYC', instagram: '@stayc_highup', region: 'kpop', description: 'High Up 實力派女團', genre: 'kpop' },
  { name: 'ITZY', instagram: '@itzy.all.in.us', region: 'kpop', description: '勁歌熱舞代表', genre: 'kpop' },
  { name: 'NCT 127', instagram: '@nct_127', region: 'kpop', description: 'SM 超大型男團分隊', genre: 'kpop' },
  { name: 'NCT Dream', instagram: '@nct_dream', region: 'kpop', description: 'SM 年下系列男團分隊', genre: 'kpop' },
  { name: 'WayV', instagram: '@wayvofficial', region: 'kpop', description: 'SM 中國籍男團分隊', genre: 'kpop' },

  // JPOP 實力與前衛
  { name: 'YOASOBI', instagram: '@yoasobi_staff_', region: 'jpop', description: '日本當紅製作人組合', genre: 'jpop' },
  { name: '藤井風', instagram: '@fujiikaze', region: 'jpop', description: 'City Pop 天才製作人歌手', genre: 'jpop' },
  { name: 'あいみょん', instagram: '@aimyon36', region: 'jpop', description: '日本唱作才女', genre: 'jpop' },
  { name: 'King Gnu', instagram: '@kinggnu_official', region: 'jpop', description: '日本搖滾樂團', genre: 'jpop' },
  { name: 'Hige DANdism', instagram: '@officialhigedandism', region: 'jpop', description: '日本搖滾樂團', genre: 'jpop' },
  { name: 'Vaundy', instagram: '@vaundy_engawa', region: 'jpop', description: '神祕感製作人', genre: 'jpop' },
  { name: '成人式', instagram: '@ado1024sweetpotetes', region: 'jpop', description: '日本獨立歌手', genre: 'jpop' },
  { name: 'milet', instagram: '@milet_music', region: 'jpop', description: '日本R&B歌手', genre: 'jpop' },
  { name: 'RADWIMPS', instagram: '@radwimps_jp', region: 'jpop', description: '日本搖滾樂團', genre: 'jpop' },
  { name: 'LiSA', instagram: '@li_sa_olivia_29', region: 'jpop', description: '日本動漫配樂創作者', genre: 'jpop' },
  { name: 'ONE OK ROCK', instagram: '@oneokrockofficial', region: 'jpop', description: '國際知名日本搖滾樂團', genre: 'bands' },
  { name: 'Mrs. GREEN APPLE', instagram: '@mrsgreenapple', region: 'jpop', description: '日本新世代搖滾樂團', genre: 'jpop' },
  { name: 'Creepy Nuts', instagram: '@creepy_nuts_', region: 'jpop', description: '日本嘻哈二人組', genre: 'jpop' },
  { name: 'CHAiMISAKA', instagram: '@chanmina_official', region: 'jpop', description: '日本VTUBER兼音樂創作者', genre: 'jpop' },
  { name: 'ZUTOMAYO', instagram: '@zutomayo', region: 'jpop', description: '神祕ACG樂團', genre: 'jpop' },
  { name: 'Sumika', instagram: '@sumika_inc', region: 'jpop', description: '日本搖滾樂團', genre: 'jpop' },
  { name: 'SPITZ', instagram: '@spitz__1987', region: 'jpop', description: '日本傳奇搖滾樂團', genre: 'bands' },
  { name: 'HYDE', instagram: '@hydeofficial', region: 'jpop', description: '日本攻殼機動隊等知名樂團主唱', genre: 'bands' },
  { name: 'SixTONES', instagram: '@sixtones_official', region: 'jpop', description: 'Johnny\'s 當紅男團', genre: 'jpop' },
  { name: 'Snow Man', instagram: '@snowman_official_j', region: 'jpop', description: 'Johnny\'s 當紅男團', genre: 'jpop' },
  { name: 'Naniwa Danshi', instagram: '@naniwadanshi728official', region: 'jpop', description: 'Johnny\'s 新銳男團', genre: 'jpop' },
  { name: 'BE:FIRST', instagram: '@befirst__official', region: 'jpop', description: '日本跳舞選拔團體', genre: 'jpop' },
  { name: 'JO1', instagram: '@jo1_gotothetop', region: 'jpop', description: '日本全能偶像男團', genre: 'jpop' },
  { name: 'INI', instagram: '@ini__official', region: 'jpop', description: 'JO1 子團男團', genre: 'jpop' },
  { name: '谷育英', instagram: '@taniyuuki_official', region: 'jpop', description: '日本創作歌手', genre: 'jpop' },
  { name: 'Imase', instagram: '@imase1109', region: 'jpop', description: '日本個性創作歌手', genre: 'jpop' },
  { name: 'IMyMelody', instagram: '@im_yumiki', region: 'jpop', description: '日本創作歌手', genre: 'jpop' },
  { name: 'Tessy', instagram: '@tessy_0827', region: 'jpop', description: '日本創作女歌手', genre: 'jpop' },

  // 歐美頂流與樂團
  { name: 'Billie Eilish', instagram: '@billieeilish', region: 'western', description: '當紅英倫才女', genre: 'pop' },
  { name: 'Dua Lipa', instagram: '@dualipa', region: 'western', description: '英國流行女歌手', genre: 'pop' },
  { name: 'Olivia Rodrigo', instagram: '@oliviarodrigo', region: 'western', description: '美國新世代才女', genre: 'pop' },
  { name: 'Taylor Swift', instagram: '@taylorswift', region: 'western', description: '美國天后級歌手', genre: 'pop' },
  { name: 'Tate McRae', instagram: '@tatemcrae', region: 'western', description: '加拿大當紅創作才女', genre: 'pop' },
  { name: 'Troye Sivan', instagram: '@troyesivan', region: 'western', description: '澳洲創意歌手', genre: 'pop' },
  { name: 'The Weeknd', instagram: '@theweeknd', region: 'western', description: '加拿大R&B天王', genre: 'pop' },
  { name: 'Coldplay', instagram: '@coldplay', region: 'western', description: '英國搖滾傳奇樂團', genre: 'bands' },
  { name: 'Arctic Monkeys', instagram: '@arcticmonkeys', region: 'western', description: '英倫搖滾代表', genre: 'bands' },
  { name: 'Conan Gray', instagram: '@conangray', region: 'western', description: '美國獨立創作歌手', genre: 'pop' },
  { name: 'Gracie Abrams', instagram: '@gracieabrams', region: 'western', description: '美國indie pop 才女', genre: 'pop' },
  { name: 'Tame Impala', instagram: '@tameimpala', region: 'western', description: '澳洲迷幻搖滾大師', genre: 'bands' },
  { name: 'The Killers', instagram: '@thekillers', region: 'western', description: '美國搖滾樂團', genre: 'bands' },
  { name: 'Glass Animals', instagram: '@glassanimals', region: 'western', description: '英國另類搖滾樂團', genre: 'bands' },
  { name: 'LANY', instagram: '@lany', region: 'western', description: '美國indie pop 樂團', genre: 'pop' },
  { name: 'Vampire Weekend', instagram: '@vampireweekend', region: 'western', description: '美國indie rock 樂團', genre: 'bands' },
  { name: 'Pixies', instagram: '@pixiesofficial', region: 'western', description: '美國另類搖滾先驅', genre: 'bands' },
  { name: 'Big Thief', instagram: '@bigthiefmusic', region: 'western', description: '美國folk rock 樂團', genre: 'bands' },
  { name: 'Interpol', instagram: '@interpol', region: 'western', description: '美國post-punk 樂團', genre: 'bands' },
  { name: 'Slow Pulp', instagram: '@slowpulpband', region: 'western', description: '美國indie pop 樂團', genre: 'pop' },
  { name: 'The Beaches', instagram: '@thebeachesband', region: 'western', description: '加拿大indie rock 樂團', genre: 'bands' },
  { name: 'Phoebe Bridgers', instagram: '@phoebebridgers', region: 'western', description: '美國indie folk 才女', genre: 'pop' },
  { name: 'boygenius', instagram: '@boygenius', region: 'western', description: '美國超級樂團組合', genre: 'bands' },
  { name: 'Clairo', instagram: '@clairo', region: 'western', description: '美國indie pop 才女', genre: 'pop' },
  { name: 'beabadoobee', instagram: '@beadoobee', region: 'western', description: '英國indie rock 才女', genre: 'bands' },
  { name: 'The Marías', instagram: '@themarías', region: 'western', description: '美國dream pop 樂團', genre: 'pop' },
  { name: 'Men I Trust', instagram: '@menitrust', region: 'western', description: '加拿大另類搖滾樂團', genre: 'bands' },
  { name: 'Alvvays', instagram: '@alvvaysband', region: 'western', description: '加拿大indie rock 樂團', genre: 'bands' },
  { name: 'Fontaines D.C.', instagram: '@fontainesdc', region: 'western', description: '愛爾蘭post-punk 樂團', genre: 'bands' },
  { name: 'IDLES', instagram: '@idlesband', region: 'western', description: '英國punk 樂團', genre: 'bands' },
  { name: 'Wet Leg', instagram: '@wetlegband', region: 'western', description: '英國indie rock 樂團', genre: 'bands' },
  { name: 'Wolf Alice', instagram: '@wolfaliceband', region: 'western', description: '英國indie rock 樂團', genre: 'bands' },
  { name: 'The Last Dinner Party', instagram: '@thelastdinnerparty', region: 'western', description: '新興英國另類搖滾樂團', genre: 'bands' },
  { name: 'Ethel Cain', instagram: '@ethelcain', region: 'western', description: '美國gothic folk 才女', genre: 'bands' },
  { name: 'Faye Webster', instagram: '@faye_webster', region: 'western', description: '美國indie 才女', genre: 'pop' },
  { name: 'Mitski', instagram: '@mitskithoughts', region: 'western', description: '美國indie rock 才女', genre: 'pop' },
  { name: 'Lana Del Rey', instagram: '@lanadelrey', region: 'western', description: '美國另類流行女歌手', genre: 'pop' },
  { name: 'Sam Smith', instagram: '@samsmith', region: 'western', description: '英國靈魂樂歌手', genre: 'pop' },
  { name: 'Harry Styles', instagram: '@harrystyles', region: 'western', description: 'One Direction 成員', genre: 'pop' },
  { name: 'Niall Horan', instagram: '@niallhoran', region: 'western', description: 'One Direction 前成員', genre: 'pop' },
  { name: 'Liam Payne', instagram: '@liampayne', region: 'western', description: 'One Direction 前成員', genre: 'pop' },
  { name: 'Louis Tomlinson', instagram: '@louist91', region: 'western', description: 'One Direction 前成員', genre: 'pop' },
  { name: 'Zayn Malik', instagram: '@zayn', region: 'western', description: 'One Direction 前成員', genre: 'pop' },
  { name: 'SZA', instagram: '@sza', region: 'western', description: '美國R&B天后', genre: 'pop' },
  { name: 'Doja Cat', instagram: '@dojacat', region: 'western', description: '美國嘻哈創意天后', genre: 'pop' },
  { name: 'Post Malone', instagram: '@postmalone', region: 'western', description: '美國hiphop 當紅天王', genre: 'pop' },
  { name: 'Bruno Mars', instagram: '@brunomars', region: 'western', description: '美國流行天王', genre: 'pop' },
  { name: 'Anderson .Paak', instagram: '@anderson._paak', region: 'western', description: '美國R&B大師', genre: 'pop' },
  { name: 'Silk Sonic', instagram: '@silksonic', region: 'western', description: 'Bruno Mars & Anderson .Paak 超級樂團', genre: 'pop' },
  { name: 'Paramore', instagram: '@paramore', region: 'western', description: '美國pop-punk 樂團', genre: 'bands' },
  { name: 'Fall Out Boy', instagram: '@fob', region: 'western', description: '美國pop-punk 樂團', genre: 'bands' },
  { name: 'Panic! at the Disco', instagram: '@panicatthedisco', region: 'western', description: '美國theatric-pop 樂團', genre: 'bands' },
  { name: 'Green Day', instagram: '@greenday', region: 'western', description: '美國punk rock 傳奇樂團', genre: 'bands' },
  { name: 'My Chemical Romance', instagram: '@mychemicalromance', region: 'western', description: '美國emo rock 樂團', genre: 'bands' },
  { name: 'The Smashing Pumpkins', instagram: '@thesmashingpumpkins', region: 'western', description: '美國另類搖滾傳奇樂團', genre: 'bands' },
  { name: 'Deftones', instagram: '@deftones', region: 'western', description: '美國nu-metal 樂團', genre: 'bands' },

  // SM Entertainment 御用帳號
  { name: 'SM Town', instagram: '@smtown', region: 'kpop', description: 'SM Entertainment 官方帳號', genre: 'kpop' },
  // JYP Entertainment 御用帳號
  { name: 'JYP Entertainment', instagram: '@jypentertainment', region: 'kpop', description: 'JYP Entertainment 官方帳號', genre: 'kpop' },
  // YG Entertainment 御用帳號
  { name: 'YG Entertainment', instagram: '@yg_ent_official', region: 'kpop', description: 'YG Entertainment 官方帳號', genre: 'kpop' },
  // HYBE 御用帳號
  { name: 'HYBE Labels', instagram: '@hybe.labels.editorial', region: 'kpop', description: 'HYBE 官方帳號', genre: 'kpop' },

  // 歐美頂流與樂團 (Western)
  { name: 'Sabrina Carpenter', instagram: '@sabrinacarpenter', region: 'western', description: '當紅甜心天后', genre: 'pop' },
  {
    name: 'The 1975',
    instagram: '@the1975',
    region: 'western',
    description: '英國獨立搖滾代表，視覺風格極具藝術與菸草味',
    genre: 'bands'
  },
  {
    name: 'Chappell Roan',
    instagram: '@chappellroan',
    region: 'western',
    description: '2026 樂壇黑馬，變裝皇后般的華麗舞台妝容是看點',
    genre: 'pop'
  },
  {
    name: 'Maneskin',
    instagram: '@maneskinofficial',
    region: 'western',
    description: '義大利搖滾樂團，打破性別邊界的火辣搖滾穿搭',
    genre: 'bands'
  },

  // KPOP 高質感帳號 (Korea)
  {
    name: 'KISS OF LIFE',
    instagram: '@kissoflife_s2',
    region: 'kpop',
    description: '實力派新秀，IG 風格非常具有歐美街頭辣妹感',
    genre: 'kpop'
  },

  // JPOP 實力與前衛 (Japan)
  {
    name: 'KIRINJI',
    instagram: '@kirinji_official',
    region: 'jpop',
    description: 'City Pop 老將，IG 展現優雅的高級音樂人生活感',
    genre: 'jpop'
  },
  {
    name: 'SEKAI NO OWARI',
    instagram: '@sekainoowari',
    region: 'jpop',
    description: '充滿童話與奇幻色彩的視覺風格',
    genre: 'jpop'
  },
  {
    name: 'Chilli Beans.',
    instagram: '@chillibeansmusic',
    region: 'jpop',
    description: '日本大勢女子樂團，曲風隨興灑脫，IG 很有日雜感',
    genre: 'jpop'
  },

  // 台灣獨立樂團 (隱藏名單)
  {
    name: '傻子與白痴',
    instagram: '@foolandidiot_official',
    region: 'taiwan',
    description: '主唱蔡維澤領軍，走精緻、冷冽的時尚與搖滾風',
    genre: 'bands'
  },
  {
    name: '拍謝少年',
    instagram: '@sorry_youth_band',
    region: 'taiwan',
    description: '最有台灣海口味的搖滾樂團，IG 很有台式美學',
    genre: 'bands'
  },
  {
    name: '大象體操',
    instagram: '@elephant_gym_official',
    region: 'taiwan',
    description: '數字搖滾指標，經常分享國際巡演的精彩瞬間',
    genre: 'bands'
  },
  {
    name: '海豚刑警',
    instagram: '@illu_police',
    region: 'taiwan',
    description: '搞怪少女風，IG 充滿大量手繪與可愛的混亂美感',
    genre: 'pop'
  },
]

function dedupeArtistsByInstagram(input: Artist[]): Artist[] {
  const seen = new Set<string>()
  const result: Artist[] = []

  for (const artist of input) {
    const key = artist.instagram.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(artist)
    }
  }

  return result
}

export const artistList: Artist[] = dedupeArtistsByInstagram(baseArtistList)

type ArtistRegion = Artist['region']

function mapInboxRegionToArtistRegion(region: InboxRegion): ArtistRegion {
  if (region === 'kpop') return 'kpop'
  if (region === 'jpop') return 'jpop'
  if (region === 'western') return 'western'
  if (region === 'taiwan_festival') return 'taiwan'
  return 'western'
}

function handleToFallbackName(handle: string): string {
  const withoutPrefix = handle.startsWith('@') ? handle.slice(1) : handle
  return withoutPrefix.replace(/[._]+/g, ' ').trim()
}

const existingInstagramSet = new Set(artistList.map((artist) => artist.instagram.toLowerCase()))

const inboxFallbackArtists: Artist[] = []

for (const batch of latestArtistInboxHandlesByRegion) {
  for (const handle of batch.handles) {
    const key = handle.toLowerCase()
    if (existingInstagramSet.has(key)) continue

    existingInstagramSet.add(key)
    inboxFallbackArtists.push({
      name: handleToFallbackName(handle),
      instagram: handle,
      region: mapInboxRegionToArtistRegion(batch.region),
      description: '待補齊藝人資料（由 IG 名單自動加入）',
      genre: batch.region === 'kpop' ? 'kpop' : batch.region === 'jpop' ? 'jpop' : 'pop'
    })
  }
}

export const trackedArtistList: Artist[] = [...artistList, ...inboxFallbackArtists]
