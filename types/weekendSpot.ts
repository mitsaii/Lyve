export interface WeekendBuyChannel {
  nameZh: string
  nameEn: string
  url: string
  noteZh: string
  noteEn: string
}

export interface WeekendSpot {
  id: string
  emoji: string
  titleZh: string
  titleEn: string
  cityZh: string
  cityEn: string
  categoryZh: string
  categoryEn: string
  whenZh: string
  whenEn: string
  summaryZh: string
  summaryEn: string
  detailZh: string
  detailEn: string
  buyChannels: WeekendBuyChannel[]
  sourceName: string
  sourceUrl: string
  verifiedAt: string
}
