import { useLang } from '../store/lang';
import { formatNPR, formatBS, fiscalYear } from './nepal';

export function useFmt() {
  const { lang } = useLang();
  return {
    money: (a: number | string) => formatNPR(a, lang === 'ne'),
    bs: (d: Date | string) => formatBS(d, lang === 'ne'),
    fiscalYear: () => fiscalYear(),
  };
}
