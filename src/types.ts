export interface DayOff {
  work: Record<'today' | 'tomorrow', boolean>;
  school: Record<'today' | 'tomorrow', boolean>;
}
export interface Position {
  lat: number;
  lng: number;
}

export interface Place {
  placeName: string;
  isDayOff: DayOff;
  isPosition: boolean;
  countyName: string;
  position?: Position;
}
export interface County {
  countyName: string;
  isDayOff: DayOff;
  place?: Place[];
}
export type TyphoonData = {
  typhoon: boolean;
  data?: County[];
};
export type TyphoonDataCache = TyphoonData & {
  time: number;
};

export interface School {
  name?: string;
  county: string;
  urban: string;
  lat: number;
  lng: number;
}

export enum ResponseFormat {
  JSON = 'JSON',
  XML = 'XML',
}

export enum TyphoonDataSet {
  analysis = 'analysisData',
  forecast = 'forecastData',
}

export interface TyphoonDetailRequestFields {
  Authorization: string;
  limit?: number;
  offset?: number;
  cwaTdNo?: number;
  format?: ResponseFormat;
  dataset: TyphoonDataSet;
  tau?: number; // 預報時距
}

// W-C0034-005 颱風警報資料相關型別

export interface QuadrantRadius {
  value: string;
  dir: Direction;
}

export interface QuadrantRadii {
  radius: QuadrantRadius[];
}

export interface WindCircle {
  radius: string;
  quadrantRadii?: QuadrantRadii;
}

export interface MultiLangText {
  value: string;
  lang: 'zh-hant' | 'en-us';
}

export type Direction =
  | 'N'
  | 'NNE'
  | 'NE'
  | 'ENE'
  | 'E'
  | 'ESE'
  | 'SE'
  | 'SSE'
  | 'S'
  | 'SSW'
  | 'SW'
  | 'WSW'
  | 'W'
  | 'WNW'
  | 'NW'
  | 'NNW';

export interface AnalysisFix {
  fixTime: string;
  coordinate: string;
  maxWindSpeed: string;
  maxGustSpeed?: string;
  pressure: string;
  movingSpeed: string;
  movingDirection: Direction;
  movingPrediction: MultiLangText[];
  circleOf15Ms?: WindCircle;
  circleOf25Ms?: WindCircle;
}

export interface ForecastFix {
  initTime: string;
  tau: string;
  coordinate: string;
  maxWindSpeed?: string;
  maxGustSpeed?: string;
  pressure: string;
  movingSpeed: string;
  movingDirection: Direction;
  radiusOf70PercentProbability: string;
  stateTransfers?: MultiLangText[];
}

export interface TyphoonInfo {
  year: number;
  typhoonName: string;
  cwaTyphoonName: string;
  cwaTdNo: string;
  cwaTyNo: string;
  analysisData: {
    fix: AnalysisFix[];
  };
  forecastData: {
    fix: ForecastFix[];
  };
}

export interface TyphoonWarningResponse {
  success: string;
  result: {
    resource_id: string;
    fields: Array<{
      id: string;
      type: string;
    }>;
  };
  records: {
    dataid: string;
    note: string;
    tropicalCyclones: {
      tropicalCyclone: TyphoonInfo[];
    };
  };
}

export interface TyphoonWarningRequestParams {
  Authorization?: string;
  limit?: number;
  offset?: number;
  format?: ResponseFormat;
  fixTime?: string[]; // 過去及現在定位時間，格式為「yyyy-MM-ddThh:mm:ss」
  tau?: number[]; // 預報時距，輸入數字6~120
  timeFrom?: string; // 時間區段開始，格式為「yyyy-MM-ddThh:mm:ss」
  timeTo?: string; // 時間區段結束，格式為「yyyy-MM-ddThh:mm:ss」
  sort?: string[]; // 對「cwaTdNo」進行升冪排序
  forceRefresh?: boolean; // 強制刷新快取
}

export type TyphoonWarningDataCache = TyphoonWarningResponse & {
  cacheTime: number;
};
