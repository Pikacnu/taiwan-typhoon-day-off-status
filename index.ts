import { JSDOM } from 'jsdom';
import { readFile } from 'fs/promises';
import { Glob } from 'bun';

interface DayOff {
  work: Record<'today' | 'tomorrow', boolean>;
  school: Record<'today' | 'tomorrow', boolean>;
}
interface Position {
  lat: number;
  lng: number;
}

interface Place {
  placeName: string;
  isDayOff: DayOff;
  isPosition: boolean;
  countyName: string;
  position?: Position;
}
interface County {
  countyName: string;
  isDayOff: DayOff;
  place?: Place[];
}
type TyphoonData = {
  typhoon: boolean;
  data?: County[];
};
type TyphoonDataCache = TyphoonData & {
  time: number;
};

interface School {
  name?: string;
  county: string;
  urban: string;
  lat: number;
  lng: number;
}

const logger = {
  log: (...args: any[]) => {
    console.log(`${new Date().toISOString()} | ${args.join(' ')}`);
  },
};

const schoolNameProcess = (name: string) => {
  if (name.includes('不含')) return '';
  const replace = [
    ['國民小學', '國小'],
    ['國民中學', '國中'],
    ['高級中學', '高中'],
    ['高級職業學校', '高職'],
    ['高級工業職業學校', '高工'],
    ['高級商業職業學校', '高商'],
    ['臺', '台'],
  ];
  replace.forEach(([from, to]) => {
    name = name.replaceAll(from, to);
  });
  return name;
};

const isSchool = (name: string) => {
  const schoolTypes = [
    '國小',
    '國中',
    '高中',
    '高職',
    '高工',
    '高商',
    '大學',
    '國民小學',
    '國民中學',
    '高級中學',
    '高級職業學校',
    '高級工業職業學校',
    '高級商業職業學校',
  ];
  return schoolTypes.some((type) => name.includes(type));
};

async function getDataFromOfficialSite(): Promise<TyphoonData> {
  const file = await readFile('./schools/schools.json', 'utf-8');
  const schoolData: School[] = await JSON.parse(file);

  const request = await (
    await fetch(
      //'https://web.archive.org/web/20241002112759/https://www.dgpa.gov.tw/typh/daily/nds.html',
      //'https://web.archive.org/web/20241003115552/https://www.dgpa.gov.tw/typh/daily/nds.html',
      //'https://web.archive.org/web/20241003133115/https://www.dgpa.gov.tw/typh/daily/nds.html',
      //'https://web.archive.org/web/20241004092829/https://www.dgpa.gov.tw/typh/daily/nds.html',
      'https://www.dgpa.gov.tw/typh/daily/nds.html',
    )
  ).text();
  let VirtualDOM = new JSDOM(request).window.document;
  let rows = VirtualDOM.querySelectorAll('tbody.Table_Body>tr');
  let row: any[] = [];
  try {
    const FirstData = rows.item(0)?.children[0].children[0];
    if (FirstData.children.length !== 0 && FirstData.children[0].textContent) {
      // If the first row has no children, it means there is no data
      const firstDataText = FirstData.children[0].textContent;
      if (firstDataText.includes('無停班停課訊息')) {
        console.log(`${new Date().toISOString()} | Fetch | Typhoon Data`);
        return { typhoon: false };
      }
    }
  } catch (error) {}

  for (let i = 0; i < rows?.length! - 1; i++) {
    const element = rows?.item(i);
    const countyName = element?.children[0].children[0].textContent;
    const infolines = element?.children[1].children;
    let info: string[] = [];
    for (let j = 0; j < infolines?.length!; j++) {
      info.push(infolines?.item(j)?.textContent!);
    }
    const countyData: DayOff = info
      .filter((value) => value !== '')
      .filter((value) => !value.includes('未達'))
      .filter((value) => value.match(/^[今明]/gm))
      .map((info) => {
        const status = info.split('、');
        const day = info.includes('今天') ? 'today' : 'tomorrow';
        return status.map((str) => {
          const isDayOff = str.includes('停止');
          const type = str.includes('上班') ? 'work' : 'school';
          return {
            [type]: {
              [day]: isDayOff,
            },
          };
        });
      })
      .reduce((acc, cur) => Object.assign(acc, cur[0], cur[1]), {} as DayOff);
    const placeData: Place[] = info
      .filter((value) => value !== '' && !value.includes('尚未列入警戒區'))
      .filter((value) => !value.match(/^[今明]/gm))
      .map((value) => {
        let temp = value.split(':');
        const placeName = temp[0];
        const info = temp.filter((_, index) => index !== 0).join(':');
        const day = info.includes('今天') ? 'today' : 'tomorrow';
        const status = info.split('、').map((str) => {
          const type = str.includes('上班') ? 'work' : 'school';
          const isDayOff = str.includes('停止');
          return {
            [type]: {
              [day]: isDayOff,
            },
          };
        });

        const processedName = schoolNameProcess(placeName);

        const school = isSchool(processedName)
          ? schoolData
              .filter(
                (school) =>
                  school.county === countyName?.replaceAll('臺', '台'),
              )
              .map((school) => {
                const regex = new RegExp(`([${school.name}])`);
                const score = (regex.exec(processedName)?.length ?? 0) - 1;
                return [score, school] as [number, School];
              })
              .filter((school) => school[0] > 0)
              .sort((b, a) => b[0] - a[0])[0]?.[1]
          : undefined;

        const isPosition = school !== undefined;
        if (isPosition) {
          delete school.name;
        }
        const dayoff = status.reduce((acc, cur) => {
          return Object.assign(acc, cur);
        }, {});
        return Object.assign(
          {
            placeName: placeName,
            isDayOff: {
              ...countyData,
              ...dayoff,
            },
          },
          {
            isPosition: isPosition,
            position: school,
          },
          {
            countyName: countyName || '',
          },
        );
      });
    const result: County = {
      countyName: countyName || '',
      isDayOff: countyData,
      place: placeData,
    };
    row.push(result);
  }
  logger.log(`${'Fetch'.padEnd(6)} | Typhoon Data`);
  return { typhoon: true, data: row };
}

logger.log('Preparing cache function...');

let cacheFunction = await (async (): Promise<
  () => Promise<TyphoonDataCache>
> => {
  let cache: TyphoonData;
  try {
    cache = await getDataFromOfficialSite();
  } catch (error) {
    logger.log(`${'Error'.padEnd(6)} | ${error}`);
    cache = { typhoon: false };
    logger.log(`${'Fetch'.padEnd(6)} | Typhoon Data`);
  }
  let time = Date.now();
  return async (): Promise<TyphoonDataCache> => {
    if (Date.now() - time > 1000 * 60 * 2) {
      cache = await getDataFromOfficialSite();
      time = Date.now();
    }
    return {
      ...cache,
      time,
    };
  };
})();

const Port = process.env.PORT || 3000;
const Host = process.env.HOST || 'localhost';

logger.log('Server is starting...');
logger.log(`Server is running at http://${Host}:${Port}/`);

const htmlScanner = new Glob('*.html');
const htmlFilesPath = './rawhtml/preview';
const htmlFiles: Map<string, string> = new Map();
const isCacheFile = false;

for await (const file of htmlScanner.scan(htmlFilesPath)) {
  htmlFiles.set(
    file.split('.').shift()!,
    isCacheFile
      ? await Bun.file(`${htmlFilesPath}/${file}`).text()
      : htmlFilesPath + `/${file}`,
  );
}

const i18nScanner = new Glob('*.json');
const i18nFilesPath = './i18n';
const i18nFiles: Map<string, Record<string, string>> = new Map();

for await (const file of i18nScanner.scan(i18nFilesPath)) {
  i18nFiles.set(
    file.split('.').shift()!,
    await Bun.file(`${i18nFilesPath}/${file}`).json(),
  );
}

const server = Bun.serve({
  port: Port,
  hostname: Host,
  async fetch(req: Request) {
    let url = new URL(req.url);
    //cloudflare ip
    const ip = req.headers.get('cf-connecting-ip');
    //cloudflare country
    const country = req.headers.get('cf-ipcountry');
    //cloudflare city
    const city = req.headers.get('cf-ipcity');
    logger.log(
      `${req.method.padEnd(6)} | ${url.pathname} | ${city ? country : ''} ${
        country ? country : ''
      } ${ip ? ip : ''}`,
    );
    const targetLanguage =
      req.headers.get('accept-language')?.split(',')[0] || 'en';
    const i18nFile = i18nFiles.get(targetLanguage);

    const processFile = (text: string) => {
      if (!i18nFile) return text;
      return text.replaceAll(/\{\{(\S+)\}\}/gm, (_, key: string) => {
        return i18nFile[key] || key;
      });
    };

    if (url.pathname === '/') {
      return new Response(
        processFile(await Bun.file('./rawhtml/default.html').text()),
        {
          headers: {
            'content-type': 'text/html',
            'Cache-Control': 'no-store, max-age:0',
          },
          status: 200,
        },
      );
    }

    const fileInMap = htmlFiles.get(
      url.pathname.split('/').pop()!.split('.').shift()!,
    );

    if (fileInMap) {
      if (isCacheFile) {
        return new Response(fileInMap, {
          headers: {
            'content-type': 'text/html',
            'Cache-Control': 'no-store, max-age:0',
          },
        });
      }
      return new Response(await Bun.file(fileInMap).text(), {
        headers: {
          'content-type': 'text/html',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (url.pathname === '/api/typhoon') {
      try {
        return new Response(JSON.stringify(await cacheFunction()), {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'content-type': 'application/json',
            'Cache-Control': 'no-store, max-age:0',
          },
          status: 200,
        });
      } catch (error) {
        console.error(`${new Date().toISOString()} | Error | ${error}`);
        return new Response('500 Internal Server Error', { status: 500 });
      }
    }

    if (url.pathname === '/api/geoJson/town') {
      return new Response(Bun.file('./tw_town.json'), {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'content-type': 'application/json',
        },
        status: 200,
      });
    }

    if (url.pathname === '/api/geoJson/county') {
      return new Response(Bun.file('./tw_county.json'), {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'content-type': 'application/json',
        },
        status: 200,
      });
    }
    return new Response('404 Not Found', { status: 404 });
  },
});
