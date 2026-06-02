const TAMIL_BLOCK = /[\u0B80-\u0BFF]/;

const TAMIL_VOWELS: Record<string, string> = {
  அ: "a",
  ஆ: "aa",
  இ: "i",
  ஈ: "ii",
  உ: "u",
  ஊ: "uu",
  எ: "e",
  ஏ: "ee",
  ஐ: "ai",
  ஒ: "o",
  ஓ: "oo",
  ஔ: "au",
};

const TAMIL_VOWEL_SIGNS: Record<string, string> = {
  "ா": "aa",
  "ி": "i",
  "ீ": "ii",
  "ு": "u",
  "ூ": "uu",
  "ெ": "e",
  "ே": "ee",
  "ை": "ai",
  "ொ": "o",
  "ோ": "oo",
  "ௌ": "au",
};

const TAMIL_CONSONANTS: Record<string, string> = {
  க: "k",
  ங: "ng",
  ச: "ch",
  ஜ: "j",
  ஞ: "nj",
  ட: "t",
  ண: "n",
  த: "th",
  ந: "n",
  ப: "p",
  ம: "m",
  ய: "y",
  ர: "r",
  ல: "l",
  வ: "v",
  ழ: "zh",
  ள: "l",
  ற: "r",
  ன: "n",
  ஷ: "sh",
  ஸ: "s",
  ஹ: "h",
};

const LATIN_CONSONANTS: Array<[string, string]> = [
  ["ng", "ங"],
  ["nj", "ஞ"],
  ["zh", "ழ"],
  ["sh", "ஷ"],
  ["ch", "ச"],
  ["th", "த"],
  ["dh", "த"],
  ["ph", "ப"],
  ["bh", "ப"],
  ["kh", "க"],
  ["rr", "ற"],
  ["nn", "ன"],
  ["ll", "ள"],
  ["k", "க"],
  ["g", "க"],
  ["c", "ச"],
  ["s", "ஸ"],
  ["j", "ஜ"],
  ["t", "ட"],
  ["d", "ட"],
  ["n", "ந"],
  ["p", "ப"],
  ["b", "ப"],
  ["m", "ம"],
  ["y", "ய"],
  ["r", "ர"],
  ["l", "ல"],
  ["v", "வ"],
  ["w", "வ"],
  ["h", "ஹ"],
  ["f", "ப"],
  ["z", "ஸ"],
  ["q", "க"],
  ["x", "க்ஸ"],
];

const LATIN_VOWELS: Array<[string, string]> = [
  ["aa", "ா"],
  ["ii", "ீ"],
  ["uu", "ூ"],
  ["ee", "ே"],
  ["oo", "ோ"],
  ["ai", "ை"],
  ["au", "ௌ"],
  ["a", ""],
  ["i", "ி"],
  ["u", "ு"],
  ["e", "ெ"],
  ["o", "ொ"],
];

const LATIN_STANDALONE_VOWELS: Array<[string, string]> = [
  ["aa", "ஆ"],
  ["ii", "ஈ"],
  ["uu", "ஊ"],
  ["ee", "ஏ"],
  ["oo", "ஓ"],
  ["ai", "ஐ"],
  ["au", "ஔ"],
  ["a", "அ"],
  ["i", "இ"],
  ["u", "உ"],
  ["e", "எ"],
  ["o", "ஒ"],
];

function matchPrefix(input: string, index: number, table: Array<[string, string]>): [string, string] | null {
  for (const [latin, tamil] of table) {
    if (input.startsWith(latin, index)) {
      return [latin, tamil];
    }
  }
  return null;
}

export function isTamilText(value: string): boolean {
  return TAMIL_BLOCK.test(value);
}

export function tamilToEnglishName(value: string): string {
  let output = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (TAMIL_VOWELS[ch]) {
      output += TAMIL_VOWELS[ch];
      continue;
    }
    if (TAMIL_CONSONANTS[ch]) {
      const base = TAMIL_CONSONANTS[ch];
      const mark = value[i + 1];
      if (mark === "்") {
        output += base;
        i += 1;
        continue;
      }
      if (mark && TAMIL_VOWEL_SIGNS[mark]) {
        output += `${base}${TAMIL_VOWEL_SIGNS[mark]}`;
        i += 1;
        continue;
      }
      output += `${base}a`;
      continue;
    }
    output += ch;
  }
  return output;
}

export function englishToTamilName(value: string): string {
  const input = value.toLowerCase();
  let result = "";
  let index = 0;

  while (index < input.length) {
    const current = input[index];

    if (current === " ") {
      result += current;
      index += 1;
      continue;
    }

    const consonant = matchPrefix(input, index, LATIN_CONSONANTS);
    if (consonant) {
      const [latinConsonant, tamilConsonant] = consonant;
      index += latinConsonant.length;

      const vowel = matchPrefix(input, index, LATIN_VOWELS);
      if (vowel) {
        const [latinVowel, tamilVowelSign] = vowel;
        result += `${tamilConsonant}${tamilVowelSign}`;
        index += latinVowel.length;
      } else {
        result += tamilConsonant;
      }
      continue;
    }

    const standaloneVowel = matchPrefix(input, index, LATIN_STANDALONE_VOWELS);
    if (standaloneVowel) {
      const [latinVowel, tamilVowel] = standaloneVowel;
      result += tamilVowel;
      index += latinVowel.length;
      continue;
    }

    result += value[index];
    index += 1;
  }

  return result;
}
