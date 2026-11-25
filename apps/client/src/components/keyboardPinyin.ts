import cnchar from 'cnchar';
import input from 'cnchar-input';
import words from 'cnchar-words';
import poly from 'cnchar-poly';

// All dictionaries ship locally; no typed text is sent to an input-method service.
cnchar.use(words, poly, input);
export interface PinyinCandidate { text: string; consumed: number }
const common = Array.from('的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政日那社义事平形相全表间样与关各重线内数正心反你明看原又么利比但质气第向道命此变条只没结解问意建月公无军很情者最立代想已通并提直题党程展五果料象员位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处理世谢谢您好呢吗展厅导览产品中心案例内容检索');
const rank = new Map(common.map((char, index) => [char, index]));
const preferred = ['你好', '您好', '谢谢', '请问', '世界', '中国'];
let contextKey = '', contextWords: { text: string; pinyin: string }[] = [];

export function pinyinCandidates(raw: string, phrases: string[] = []): PinyinCandidate[] {
  const pinyin = raw.toLowerCase().replace(/[^a-zv]/g, '').slice(0, 24);
  if (!pinyin) return [];
  const key = JSON.stringify(phrases);
  if (key !== contextKey) {
    contextKey = key;
    contextWords = [...new Set([...preferred, ...phrases])].flatMap(phrase => {
      const chars = Array.from(phrase.replace(/[^\u4e00-\u9fff]/g, '')).slice(0, 8);
      return chars.map((_, i) => {
        const text = chars.slice(0, i + 1).join('');
        return { text, pinyin: String(cnchar.spell(text, 'low')).toLowerCase().replace(/ü/g, 'v') };
      });
    });
  }
  const result: PinyinCandidate[] = [];
  const seen = new Set<string>();
  const add = (text: string, consumed: number) => {
    if (!/^[\u4e00-\u9fff]+$/.test(text) || !consumed || seen.has(text)) return;
    seen.add(text); result.push({ text, consumed });
  };
  // Contextual words preserve the names already configured in this scene.
  for (const word of contextWords) if (word.pinyin === pinyin) add(word.text, pinyin.length);
  const rows = cnchar.input(pinyin.slice(0, 12).replace(/v/g, 'ü'), { associate: true });
  for (const row of rows) {
    for (const phrase of (row.association[0] || '').split(' ')) {
      const length = Array.from(phrase).length;
      if (length <= row.split.length) add(phrase, row.split.slice(0, length).join('').length);
    }
  }
  for (const row of rows.slice().sort((a, b) => b.split[0].length - a.split[0].length)) {
    const candidates = Array.from(row.words[0] || '').sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
    for (const char of candidates) add(char, row.split[0].length);
  }
  return result.slice(0, 100);
}
