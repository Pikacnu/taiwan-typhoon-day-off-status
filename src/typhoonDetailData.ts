import type {
  TyphoonWarningResponse,
  TyphoonWarningRequestParams,
  TyphoonWarningDataCache,
} from './types';
import { ResponseFormat } from './types';

const CWAAPIKey = process.env.CWA_OPENDATA_APIKEY;

// 快取設定
const CACHE_DURATION = 1000 * 60 * 5; // 5 分鐘快取
let cache: TyphoonWarningDataCache | null = null;

/**
 * 取得颱風警報資料 (W-C0034-005)
 * @param params 請求參數物件
 * @param params.Authorization API 授權金鑰 (預設從環境變數讀取)
 * @param params.limit 限制回傳筆數 (預設不限制,獲取所有資料)
 * @param params.offset 資料偏移量 (預設 0)
 * @param params.format 回傳格式 (預設 JSON)
 * @param params.fixTime 過去及現在定位時間，格式為「yyyy-MM-ddThh:mm:ss」
 * @param params.tau 預報時距，輸入數字6~120，可輸入多筆
 * @param params.timeFrom 時間區段開始，格式為「yyyy-MM-ddThh:mm:ss」
 * @param params.timeTo 時間區段結束，格式為「yyyy-MM-ddThh:mm:ss」
 * @param params.sort 對「cwaTdNo」進行升冪排序
 * @param params.forceRefresh 強制刷新快取 (預設 false)
 * @returns 颱風警報資料
 */
async function getTyphoonWarningData(
  params: TyphoonWarningRequestParams = {},
): Promise<TyphoonWarningResponse> {
  const {
    Authorization,
    limit,
    offset = 0,
    format = ResponseFormat.JSON,
    fixTime,
    tau,
    timeFrom,
    timeTo,
    sort,
    forceRefresh = false,
  } = params;

  const now = Date.now();

  // 檢查快取是否有效 (只有在沒有特殊篩選條件時才使用快取)
  const hasFilterParams = fixTime || tau || timeFrom || timeTo || sort;
  if (
    !forceRefresh &&
    !hasFilterParams &&
    cache &&
    now - cache.cacheTime < CACHE_DURATION
  ) {
    return cache;
  }

  const apiKey = Authorization || CWAAPIKey;

  if (!apiKey) {
    throw new Error('CWA_OPENDATA_APIKEY is not defined');
  }

  const queryParams = new URLSearchParams({
    Authorization: apiKey,
    format: format,
    offset: offset.toString(),
  });

  // 只在有設定 limit 時才加入參數
  if (limit !== undefined) {
    queryParams.set('limit', limit.toString());
  }

  // 加入 fixTime (多個時間)
  if (fixTime && fixTime.length > 0) {
    fixTime.forEach((time) => {
      queryParams.append('fixTime', time);
    });
  }

  // 加入 tau (多個預報時距)
  if (tau && tau.length > 0) {
    tau.forEach((t) => {
      queryParams.append('tau', t.toString());
    });
  }

  // 加入時間區段
  if (timeFrom) {
    queryParams.set('timeFrom', timeFrom);
  }

  if (timeTo) {
    queryParams.set('timeTo', timeTo);
  }

  // 加入排序
  if (sort && sort.length > 0) {
    sort.forEach((s) => {
      queryParams.append('sort', s);
    });
  }

  const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-005?${queryParams.toString()}&dataset=`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch typhoon warning data: ${response.statusText}`,
    );
  }

  const data: TyphoonWarningResponse = await response.json();

  // 只在沒有特殊篩選條件時才更新快取
  if (!hasFilterParams) {
    cache = {
      ...data,
      cacheTime: now,
    };
  }

  return data;
}

/**
 * 清除颱風警報資料快取
 */
function clearTyphoonWarningCache(): void {
  cache = null;
}

/**
 * 取得快取資訊
 * @returns 快取時間和剩餘有效時間(毫秒)
 */
function getCacheInfo(): {
  cacheTime: number | null;
  remainingTime: number | null;
} {
  if (!cache) {
    return { cacheTime: null, remainingTime: null };
  }

  const now = Date.now();
  const remainingTime = Math.max(0, CACHE_DURATION - (now - cache.cacheTime));

  return {
    cacheTime: cache.cacheTime,
    remainingTime,
  };
}

export {
  getTyphoonWarningData,
  clearTyphoonWarningCache,
  getCacheInfo,
  CACHE_DURATION,
};
