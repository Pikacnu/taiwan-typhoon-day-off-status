import { createWriteStream, existsSync, mkdirSync } from 'fs';
import type { School } from './types';

const logFile = `./logs/log_${Date.now()}.txt`;
if (!existsSync('./logs')) {
  mkdirSync('./logs');
}

const logStream = createWriteStream(logFile, { flags: 'a' });

export const logger = {
  log: (...args: any[]) => {
    const logMessage = `${new Date().toISOString()} | ${args.join(' ')}`;
    logStream.write(logMessage + '\n');
    console.log(logMessage);
  },
};

process.on('SIGINT', async () => {
  logger.log('Process interrupted. Exiting...');
  logStream.end(() => {
    process.exit();
  });
});

export const schoolNameProcess = (name: string) => {
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

export const isSchool = (name: string) => {
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

export const schoolCoreName = (name: string) =>
  schoolNameProcess(name).replace(/^(市立|縣立|國立|私立)/, '');

/**
 * 從公告的地點字串找出對應學校。
 * 可處理「巴崚國民小學、三光國民小學」這種多校合併字串（傳入單一校名時）。
 */
export const findSchoolByName = (
  placeName: string,
  county: string,
  schoolData: School[],
): School | undefined => {
  const target = schoolCoreName(placeName);
  if (!target) return undefined;
  const normalizedCounty = county.replaceAll('臺', '台');
  return schoolData
    .filter((school) => school.name && school.county === normalizedCounty)
    .map((school) => ({ school, coreName: schoolCoreName(school.name!) }))
    .filter(({ coreName }) => coreName !== '' && target.includes(coreName))
    .sort((a, b) => b.coreName.length - a.coreName.length)[0]?.school;
};
