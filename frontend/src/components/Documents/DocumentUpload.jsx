import React, { useState, useCallback, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Upload,
  FileText,
  CreditCard,
  Award,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Scan,
  Sparkles,
  Camera,
  GraduationCap,
  ScrollText,
  MapPin,
  User,
  Phone,
  Mail,
  Save,
  ShieldAlert,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ===== OCR Extraction Helpers (client-side) =====
const cleanOcrText = (text) => {
  if (!text) return '';
  return text
    .replace(/[^\x00-\x7F\s]/g, ' ')   // Remove non-ASCII
    .replace(/\r\n/g, '\n')             // Normalize line endings
    .replace(/[ \t]+/g, ' ')            // Collapse multiple spaces/tabs
    .replace(/\n{3,}/g, '\n\n')         // Collapse excessive newlines
    .trim();
};

// Collapse spaced digit runs, e.g. "9 5 0" -> "950", "1 1 0 0" -> "1100", "Marks 9 8 0" -> "Marks 980"
const collapseSpacedDigits = (text) => {
  if (!text) return '';
  return text.replace((/\b\d(?:\s+\d)+\b/g), (m) => m.replace(/\s+/g, ''));
};

const fixOcrDigits = (str) => {
  if (!str) return '';
  const s = String(str);
  // Count how many characters are digits to infer if this string is a numeric field
  const digits = (s.match(/\d/g) || []).length;
  // If the string is mostly digits (>= half), it is a numeric value like CNIC/marks/year.
  // Aggressively remap letters that OCR confuses with digits.
  if (digits >= Math.max(1, s.trim().length * 0.5)) {
    return s
      .replace(/[Oo]/g, '0')
      .replace(/[Il|!ij]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[Gg]/g, '9');
  }
  // Otherwise treat it as a word (e.g. "Board", "Science", "Marks") and do NOT remap letters,
  // only collapsing obvious spacing between digits.
  return s;
};

/**
 * Fix only the digit-like characters within a numeric run, leaving surrounding words intact.
 * Used to clean marks/year numbers embedded in mixed text without corrupting words like "Board".
 */
const fixNumericRuns = (str) => {
  if (!str) return '';
  // Match runs that are mostly digits (may contain O/l/I/S/B ambiguities between digits)
  return str.replace(/(?<![A-Za-z])([0-9OolISBZ]+)(?![A-Za-z])/gi, (m) => fixOcrDigits(m));
};

const CNIC_HEADER_NOISE = new Set([
  'national', 'identity', 'card', 'republic', 'islamic', 'pakistan', 'nadra',
  'database', 'government', 'govt', 'gov', 'pak', 'authority', 'registrar', 'general', 'head',
  'registration', 'form', 'office', 'district', 'province', 'tehsil', 'specimen',
  'signature', 'sign', 'sig', 'attorney', 'gney', 'holder', 'holders', 'valid',
  'from', 'till', 'renewal', 'fee', 'status', 'photo', 'thumb', 'impression',
  'print', 'finger', 'left', 'right', 'country', 'stay', 'expiry', 'issue',
  'address', 'nic', 'cnic', 'name', 'father', 'husband', 'mother', 'gender',
  'sex', 'birth', 'date', 'son', 'daughter', 'wife', 'mr', 'mrs', 'ms', 'miss',
  'dr', 'id', 'no', 'num', 'of', 'the', 'and', 'for', 'with', 'pkr', 'smart',
  'computerized', 'citizen', 'director', 'directorate', 'board', 'education',
  'pakistani', 'temporary', 'permanent', 'present', 'cardholder',
  'block', 'letters', 'capital', 'figures', 'words', 'english', 'urdu',
  'candidate', 'student', 'examinee', 'applicant', 'guardian', 'parent',
  'examination', 'certificate', 'secondary', 'intermediate', 'session', 'annual',
  'passed', 'promoted', 'group', 'science', 'arts', 'general', 'result', 'roll',
  'pre', 'engineering', 'technology', 'commerce', 'humanities', 'faculty',
  'fot', 'serial', 'photo', 'for', 'the', 'reg', 'ref', 'page', 'part', 'note',
  'in', 'at', 'on', 'to', 'by', 'is', 'as', 'an', 'cnicno', 'nicno', 'idno',
  'occupation', 'profession', 'income', 'salary', 'deceased', 'alive', 'cell', 'mobile'
]);

const URDU_OCR_NOISE_TOKENS = new Set([
  'anty', 'anly', 'anfy', 'anhy', 'rerpa', 'en', 'eh', 'namo', 'neme', 'nama', 'narne',
  'wale', 'wald', 'waldiat', 'shn', 'kpa', 'pak', 'biah', 'sn', 'so', 'do', 'wo',
  'fo', 'mo', 'no', 'kr', 'mr', 'ms', 'dr', 'alr', 'dlr', 'sih', 'hls', 'hsn',
  'trn', 'trq', 'zhd', 'md', 'amd', 'mhd', 'mhm', 'fsh', 'psh', 'kzn', 'gzn',
  'hzn', 'yzn', 'wld', 'wly', 'jld', 'ald', 'bld', 'kld', 'ild', 'fld', 'cld',
  'sod', 'tod', 'mod', 'pod', 'lah', 'mdh', 'fath', 'fthr', 'fthrname',
  'ur', 'pk', 'pkr', 'govt', 'nadra', 'card', 'cnic', 'smart', 'nic', 'holder',
  // Common 2-char OCR garble from Urdu script (CNIC-specific)
  'hy', 'ee', 'oo', 'nee', 'naa', 'laa', 'raa', 'haa', 'daa', 'baa', 'kaa',
  'taa', 'faa', 'maa', 'zaa', 'sa', 'ya', 'ga', 'pa', 'cha', 'ja',
  'bm', 'cm', 'dm', 'hm', 'km', 'lm', 'nm', 'pm', 'rm', 'sm', 'tm', 'zm',
  'ah', 'eh', 'oh', 'uh', 'yh'
]);

/**
 * Comprehensive Pakistani/Muslim name dictionary for validating OCR-extracted name candidates.
 * When Tesseract reads Urdu script in English-only mode, it produces gibberish Latin characters
 * (e.g., "Rerpa En Eh" or "Anty" from حسن طارق or محمد زاہد). This dictionary helps distinguish real English names
 * from OCR-misread Urdu and strips any ghost/noise tokens.
 */
const PAKISTANI_NAME_PARTS = new Set([
  // Common Pakistani/Muslim male first and middle names
  'muhammad', 'mohammad', 'mohammed', 'ahmed', 'ahmad', 'ali', 'hassan', 'hasan', 'hussain', 'husain',
  'usman', 'othman', 'osman', 'umar', 'omer', 'omar', 'umer', 'aamir', 'amir', 'abid', 'abdul',
  'abdullah', 'abrar', 'adeel', 'adil', 'afzal', 'ahsan', 'ehsan', 'aijaz', 'ejaz', 'ajmal',
  'akbar', 'akram', 'alam', 'amjad', 'ameen', 'amin', 'anis', 'anees', 'anwar', 'aqeel',
  'arif', 'arshad', 'asghar', 'ashfaq', 'ashraf', 'asif', 'aslam', 'ata', 'atta', 'atif',
  'azam', 'azhar', 'aziz', 'babar', 'baig', 'bari', 'bashir', 'bilal', 'burhan', 'daud',
  'dawood', 'fahad', 'faheem', 'faisal', 'faiz', 'farhan', 'farid', 'fareed', 'farooq', 'farrukh',
  'faseeh', 'fassih', 'fazal', 'ghani', 'ghulam', 'habib', 'hafeez', 'hafiz', 'haider', 'hyder',
  'hameed', 'hamid', 'hamza', 'hanif', 'haroon', 'haris', 'harris', 'hayat', 'humayun', 'ibad',
  'ibrahim', 'idrees', 'idris', 'iftikhar', 'ijaz', 'ikram', 'ilyas', 'elias', 'imran', 'inayat',
  'intizar', 'iqbal', 'irfan', 'erfan', 'ishaq', 'ismail', 'jaffar', 'jafar', 'jahangir', 'jalil',
  'jamal', 'jameel', 'jamil', 'javed', 'javid', 'jawad', 'junaid', 'kabir', 'kamran', 'kashif',
  'karim', 'kareem', 'khawar', 'khurram', 'khurshid', 'latif', 'liaqat', 'liaquat', 'luqman',
  'maalik', 'malik', 'majeed', 'majid', 'manzoor', 'maqbool', 'maqsood', 'masood', 'masud',
  'mazhar', 'mehmood', 'mahmood', 'mahmoud', 'mian', 'mirza', 'mohsin', 'mubarak', 'mudassar',
  'mudassir', 'mujahid', 'mukhtar', 'mumtaz', 'munir', 'muneer', 'murad', 'murtaza', 'musa',
  'musaddiq', 'mushahid', 'mushtaq', 'mustafa', 'muzaffar', 'muzammil', 'naeem', 'nasir', 'nasser',
  'naseem', 'nasim', 'naveed', 'navid', 'nazir', 'nazeer', 'niaz', 'nouman', 'nauman', 'noman',
  'noor', 'obaid', 'ubaid', 'owais', 'awais', 'parvez', 'pervaiz', 'pervez', 'qadir', 'qadeer',
  'qamar', 'qasim', 'qureshi', 'rafi', 'rafiq', 'rafeeq', 'rahim', 'raheem', 'raja', 'rashid',
  'rasheed', 'rauf', 'raza', 'razaq', 'razzaq', 'rehman', 'rahman', 'riaz', 'rizwan', 'saad',
  'sabir', 'sadiq', 'saeed', 'safdar', 'sajid', 'sajjad', 'saleem', 'salim', 'sami', 'sameer',
  'samir', 'sarfraz', 'sarwar', 'shahbaz', 'shahid', 'shahrukh', 'shakeel', 'shakil', 'shams',
  'shafiq', 'shafeeq', 'shaukat', 'shehzad', 'shahzad', 'shoaib', 'shuaib', 'siddiq', 'siddique',
  'sohail', 'suhail', 'subhan', 'suleman', 'sulaiman', 'sultan', 'tahir', 'talha', 'tanveer',
  'tanvir', 'tariq', 'taufeeq', 'tauqeer', 'tauseef', 'touseef', 'umair', 'usmaan', 'wahab',
  'waheed', 'wajid', 'waleed', 'walid', 'waqar', 'waqas', 'waseem', 'wasim', 'yaqoob', 'yaqub',
  'yaseen', 'yasin', 'yasir', 'younas', 'younus', 'younis', 'yousaf', 'yousuf', 'yusuf', 'zafar',
  'zahid', 'zaheer', 'zain', 'zakir', 'zaman', 'zameer', 'zia', 'zubair', 'zulfiqar', 'zulfikar',

  // Common Pakistani/Muslim female first and middle names
  'aisha', 'ayesha', 'amina', 'aminah', 'amna', 'anum', 'anmol', 'asma', 'bushra', 'faiza',
  'fatima', 'fathima', 'fariha', 'gulnaz', 'hina', 'huma', 'iqra', 'khadija', 'maryam', 'mariam',
  'mehnaz', 'mahnoor', 'nadia', 'naheed', 'naila', 'nasreen', 'nazia', 'nighat', 'noreen',
  'parveen', 'rabia', 'riffat', 'rubina', 'rukhsana', 'saima', 'sajida', 'samina', 'sana',
  'shagufta', 'shaista', 'shamim', 'sughra', 'sumera', 'sumaira', 'tahira', 'uzma', 'yasmin',
  'yasmeen', 'zainab', 'zubaida', 'sadia', 'hira', 'komal', 'aiman', 'misbah', 'sidra',
  'tayyaba', 'salma', 'kulsoom', 'razia', 'farzana', 'shabana',

  // Common Pakistani family/surname/caste/tribal names
  'khan', 'malik', 'sheikh', 'shaikh', 'shah', 'butt', 'bhatti', 'chaudhry', 'chaudhary',
  'choudhry', 'chughtai', 'syed', 'mir', 'mughal', 'awan', 'abbasi', 'qureshi', 'hashmi',
  'kazmi', 'naqvi', 'rizvi', 'zaidi', 'gilani', 'geelani', 'gardezi', 'bukhari', 'jilani',
  'niazi', 'lodhi', 'gul', 'jan', 'begum', 'bibi', 'khatoon', 'bano', 'sultana', 'pasha',
  'bakhsh', 'baksh', 'din', 'uddin', 'ullah', 'elahi', 'ilahi', 'akhtar', 'akhter', 'hayat',
  'haq', 'rehman', 'rahman', 'sattar', 'ghaffar', 'mannan', 'qayyum', 'memon', 'ansari',
  'rajput', 'arain', 'jutt', 'jatt', 'baloch', 'baluch', 'marri', 'bugti', 'mengal', 'durrani',
  'yousafzai', 'afridi', 'shinwari', 'khattak', 'bangash', 'orakzai', 'mehsud', 'wazir',
  'mohmand', 'tareen', 'leghari', 'mazari', 'khosa', 'rind', 'lashari', 'alvi', 'usmani',
  'farooqi', 'siddiqui', 'chishti', 'qadri', 'suharwardi', 'rehmani', 'madni', 'qasmi',
  'faridi', 'sabri', 'khokhar', 'dogar', 'gujjar', 'gurmani', 'tiwana', 'warraich', 'cheema',
  'tarar', 'virk', 'sandhu', 'bajwa', 'dhillon', 'soomro', 'bhutto', 'talpur', 'chandio',
  'kalhoro', 'makhdoom', 'pirzada', 'khuhro', 'jatoi', 'mahar', 'gabol', 'achakzai', 'kakar',
  'marwat', 'swati', 'kansi', 'panhwar', 'dareshak', 'dasti', 'malghani',

  // Connectors & honorifics
  'ul', 'ur', 'bin', 'ibn', 'bint', 'al', 'un', 'ud', 'us',
  'maula', 'maulana', 'haji', 'hajji'
]);

/**
 * Score a name candidate based on how many words match known Pakistani name parts.
 * Higher score = more likely a real English name vs OCR-misread Urdu gibberish.
 */
// Connectors that appear inside Pakistani names ("Zia ul Haq", "Muhammad bin Qasim")
// but carry no identifying weight on their own. Two-letter noise matches these
// constantly, which is enough to make a garbage candidate look validated.
const NAME_PARTICLES = new Set(['ul', 'ur', 'al', 'un', 'ud', 'us', 'bin', 'ibn', 'bint', 'din']);

// Shape test for a value sitting directly under its label. The name dictionary cannot
// cover real Pakistani names -- "Rida Nadeem", "Nameera" and "Iman Ayaz" all read
// perfectly off the card and all scored zero -- so where the layout itself identifies
// the field, a candidate is accepted on its form instead: one to four purely
// alphabetic words, nothing shorter than three letters unless it is a known particle,
// and at least four letters overall. Noise fails this because it arrives studded with
// one- and two-character fragments and stray punctuation.
const looksLikeName = (candidateStr) => {
  if (!candidateStr) return false;
  const words = candidateStr.trim().split(/\s+/);
  if (words.length < 1 || words.length > 4) return false;
  if (candidateStr.replace(/\s/g, '').length < 4) return false;
  return words.every(w =>
    /^[A-Za-z]+$/.test(w) && (w.length >= 3 || NAME_PARTICLES.has(w.toLowerCase()))
  );
};

const scoreNameCandidate = (candidateStr) => {
  if (!candidateStr) return 0;
  const words = candidateStr.toLowerCase().split(/\s+/);
  let dictionaryHits = 0;
  for (const word of words) {
    if (PAKISTANI_NAME_PARTS.has(word) && !NAME_PARTICLES.has(word)) dictionaryHits++;
  }
  if (dictionaryHits === 0) {
    // The word-count bonus used to be awarded on its own, so any two-to-four word run
    // of OCR noise scored 2 and cleared every `score > 0` acceptance test in this file.
    // That is how "Risa Gos" and "Anne Inert" were accepted as real names. A candidate
    // with no recognisable name part in it is not evidence of anything.
    return 0;
  }
  let score = dictionaryHits * 10;
  // Bonus for multi-word names (real names tend to be 2-4 words)
  if (words.length >= 2 && words.length <= 4) score += 2;
  return score;
};

/**
 * Filter, clean, and format candidate name string
 */
const cleanNameCandidate = (rawStr) => {
  if (!rawStr) return null;

  // 1. Remove bracketed descriptions e.g. (in block letters), [in English], {in figures}, etc.
  let text = rawStr
    .replace(/\([^\)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^\}]*\}/g, ' ');

  // 1b. Tesseract often loses the space between two capitalised words, yielding
  // "YawarHayat". Left joined, neither half matches the name dictionary and the whole
  // candidate scores zero. Split on the lower-to-upper boundary.
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 2. Remove known label prefixes with flexible spacing and punctuation
  text = text
    .replace(/(?:^|\b)(?:Name\s*of\s*(?:Father|Guardian|Parent|Candidate|Student|Examinee)|Father(?:[''`]?s)?(?:\s*[\/\&]\s*(?:Husband|Guardian|Mother)(?:[''`]?s)?)?|Husband(?:[''`]?s)?|Guardian(?:[''`]?s)?|Parent(?:[''`]?s)?|Candidate\s*Name|Student\s*Name|Candidate|Student|FatherName|FathersName|F\/Name|F\.Name|FName|F\s*Name|P\/Name|P\.Name|Walad|Waldiat|Card\s*Holder|Holder[''`]?s?|Neme|Nama|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|Fther|Feather|Fether|Husb|Son\s+of|Daughter\s+of|Wife\s+of|S\/O|D\/O|W\/O|S\.O|D\.O|W\.O|Name|Narne|Namo)\b[\s:.\-\/_=]*/gi, ' ')
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  let words = text.split(' ').filter(w => w.length > 0);

  // Board certificates print field values in capitals, so a lowercase word inside an
  // otherwise capitalised value is bleed from the watermark or a neighbouring column --
  // "MUHAMMAD NADEEM drone]" and "MUHAMMAD AHMAD . ~~ sas boil". When the candidate
  // clearly carries capitalised words, the lowercase ones are dropped. CNIC values are
  // printed in title case, so this never fires there.
  const capitalised = words.filter(w => w.length >= 3 && w === w.toUpperCase());
  if (capitalised.length >= 2) {
    words = words.filter(w => w === w.toUpperCase());
  }
  let validWords = words.filter(word => {
    const lower = word.toLowerCase();
    if (CNIC_HEADER_NOISE.has(lower)) return false;
    if (URDU_OCR_NOISE_TOKENS.has(lower)) return false;
    // Words must be ≥ 3 chars UNLESS they're in the Pakistani name dictionary (e.g. "ali", "mir", "jan")
    if (word.length < 3 && !PAKISTANI_NAME_PARTS.has(lower)) return false;
    // Must contain at least one vowel or vowel sound (a, e, i, o, u, y)
    const vowels = (lower.match(/[aeiouy]/g) || []).length;
    if (vowels === 0) return false;
    return true;
  });

  if (validWords.length < 1) return null;

  // (Removed aggressive dictionary-based trimming to avoid truncating real names like 'Nadeem' that aren't in the list)

  if (validWords.length < 1) return null;

  // With two or more recognisable name parts, the name is the span between the first
  // and the last of them: anything outside that span is border or label noise. This is
  // what turns "Entry Muhammad Zahid" into "Muhammad Zahid". It is deliberately not
  // applied when only one part matches, because then a leading or trailing token is
  // just as likely to be a real name that is missing from the dictionary -- "Yawar
  // Hayat" and "Muhammad Yawar" must both survive intact.
  const isAnchor = w => {
    const lw = w.toLowerCase();
    return PAKISTANI_NAME_PARTS.has(lw) && !NAME_PARTICLES.has(lw);
  };
  const anchors = validWords.map((w, i) => (isAnchor(w) ? i : -1)).filter(i => i >= 0);
  if (anchors.length >= 2) {
    validWords = validWords.slice(anchors[0], anchors[anchors.length - 1] + 1);
  }

  // A single short fragment ahead of the name is a common OCR bleed from the garbled
  // Urdu label that sits to the left of the value ("ene Ayaz Ahmad"). At most one
  // leading token is dropped, only when it is 3 characters or fewer, is not itself a
  // name part, and leaves a recognisable two-word name behind -- so "Yawar Hayat"
  // (5-character first name) and "Mir Hassan" (a listed part) are untouched.
  if (validWords.length >= 3 && anchors.length >= 1) {
    const first = validWords[0].toLowerCase();
    if (!isAnchor(validWords[0]) && first.length <= 3 && isAnchor(validWords[validWords.length - 1])) {
      validWords = validWords.slice(1);
    }
  }

  // Drop short trailing fragments that are not recognisable name parts. Watermark and
  // border text bleeds into the end of the candidate as 3-4 letter runs -- "Muhammad
  // Zahid Vre", "Muhammad Ahmad Jes". Only trailing tokens are considered, only when
  // they are 4 characters or shorter (so real short-but-unlisted names survive), and
  // only while at least one dictionary-matched word remains.
  const hasDictionaryWord = arr => arr.some(w => PAKISTANI_NAME_PARTS.has(w.toLowerCase()));
  if (hasDictionaryWord(validWords)) {
    while (validWords.length > 1) {
      const last = validWords[validWords.length - 1].toLowerCase();
      if (PAKISTANI_NAME_PARTS.has(last) || last.length > 4) break;
      const candidate = validWords.slice(0, -1);
      if (!hasDictionaryWord(candidate)) break;
      validWords = candidate;
    }
  }

  const trimmed = validWords.slice(0, 4);

  return trimmed
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Normalize dates in OCR text (handling spaced dots, commas, dashes, colons, and month names)
 */
const normalizeDatesInText = (textStr) => {
  if (!textStr) return '';

  let str = textStr;
  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // Convert month name dates e.g. "15 Aug 2001" or "15-AUG-2001"
  str = str.replace(/\b([0-9]{1,2})\s*[\s.\-\/]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[\s.\-\/]\s*([0-9]{4})\b/gi, (m, p1, p2, p3) => {
    const d = p1.padStart(2, '0');
    const mo = monthMap[p2.toLowerCase().substring(0, 3)] || '01';
    return `${d}/${mo}/${p3}`;
  });

  // Convert punctuated dates e.g. "15.08.2001"
  str = str.replace(/\b([0-9OolISBZ]{1,2})\s*[\.,:\-\/]\s*([0-9OolISBZ]{1,2})\s*[\.,:\-\/]\s*([0-9OolISBZ]{4})\b/gi, (m, p1, p2, p3) => {
    const d = fixOcrDigits(p1).padStart(2, '0');
    const mo = fixOcrDigits(p2).padStart(2, '0');
    const y = fixOcrDigits(p3);
    return `${d}/${mo}/${y}`;
  });

  return str;
};

/**
 * Extract all dates from OCR text with context
 */
const extractAllDatesFromText = (rawText) => {
  if (!rawText) return [];
  const clean = cleanOcrText(rawText);
  const normalized = normalizeDatesInText(clean);
  const dates = [];

  const regex = /\b([0-9]{2})\/([0-9]{2})\/([0-9]{4})\b/g;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const dayVal = parseInt(match[1]);
    const monthVal = parseInt(match[2]);
    const yearVal = parseInt(match[3]);

    if (dayVal >= 1 && dayVal <= 31 && monthVal >= 1 && monthVal <= 12 && yearVal >= 1950 && yearVal <= 2035) {
      const matchIndex = match.index;
      const start = Math.max(0, matchIndex - 35);
      const end = Math.min(normalized.length, matchIndex + match[0].length + 35);
      const context = normalized.substring(start, end);

      dates.push({
        dateStr: `${match[1]}/${match[2]}/${match[3]}`,
        year: yearVal,
        context
      });
    }
  }

  return dates;
};

/**
 * Extract CNIC data using robust multi-strategy methods tailored for Pakistani CNICs
 */
const extractCNICData = (rawText) => {
  const text = rawText || '';
  const cleanText = cleanOcrText(text);
  const normalizedText = normalizeDatesInText(cleanText);
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ===== 1. CNIC Number (13 digits: 5-7-1) =====
  let cnic = null;

  // Pattern A: Standard formatted or dashed/spaced CNIC: 35201-1234567-1 or 35201 1234567 1 or 35201.1234567.1
  const cnicPattern = /\b([0-9OolISBZ]{5})[\s.\-\/]?([0-9OolISBZ]{7})[\s.\-\/]?([0-9OolISBZ])\b/i;
  const cnicMatch = cleanText.match(cnicPattern);
  if (cnicMatch) {
    const p1 = fixOcrDigits(cnicMatch[1]);
    const p2 = fixOcrDigits(cnicMatch[2]);
    const p3 = fixOcrDigits(cnicMatch[3]);
    if (p1.length === 5 && p2.length === 7 && p3.length === 1) {
      cnic = `${p1}-${p2}-${p3}`;
    }
  }

  // Pattern B: Search after keyword labels if not found
  if (!cnic) {
    const labelMatch = cleanText.match(/(?:Identity\s*Number|CNIC|NIC|Card\s*No|ID\s*No)[\s:\-]*([0-9OolISBZ\s.\-\/]{13,20})/i);
    if (labelMatch) {
      const digitsOnly = fixOcrDigits(labelMatch[1]).replace(/\D/g, '');
      if (digitsOnly.length === 13) {
        cnic = `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 12)}-${digitsOnly.slice(12)}`;
      }
    }
  }

  // Pattern C: Any continuous 13-digit sequence
  if (!cnic) {
    const rawDigits = fixOcrDigits(cleanText).replace(/[^0-9]/g, ' ');
    const thirteenDigitMatch = rawDigits.match(/\b([1-8][0-9]{12})\b/);
    if (thirteenDigitMatch) {
      const d = thirteenDigitMatch[1];
      cnic = `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
    }
  }

  // ===== 2. Holder Name =====
  let name = null;
  let nameLineIndex = -1;
  // Set when the name was accepted on layout alone, with no dictionary corroboration.
  let nameNeedsVerification = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(?:Name|Narne|Namo|Nene|Holder|Neme|Nama)\b/i.test(line) &&
      !/\b(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|National|Database|Stay)\b/i.test(line)) {
      // Held in a local until it has earned the field. Assigning straight to `name`
      // left an unscored candidate behind when the lookahead below found nothing, and
      // the `if (name) break` after it then accepted that leftover -- which is how the
      // label line "heh Name" produced the candidate name "Heh".
      const sameLineCandidate = cleanNameCandidate(line);
      if (sameLineCandidate && scoreNameCandidate(sameLineCandidate) > 0) {
        // High-quality match on same line — accept immediately
        name = sameLineCandidate;
        nameLineIndex = i;
        break;
      }

      // Try lookahead up to 3 lines (the name may be on the next line in Urdu/English dual CNICs)
      let shapedFallback = null;
      let shapedIndex = -1;
      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/\b(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|National|Republic|Database|Stay)\b/i.test(nextLine)) break;
        const cand = cleanNameCandidate(nextLine);
        if (cand && scoreNameCandidate(cand) > 0) {
          name = cand;
          nameLineIndex = i + j;
          break;
        }
        // Remember the first well-formed candidate under the label in case no line
        // matches the dictionary at all.
        if (!shapedFallback && cand && looksLikeName(cand)) {
          shapedFallback = cand;
          shapedIndex = i + j;
        }
      }
      if (!name && shapedFallback) {
        name = shapedFallback;
        nameLineIndex = shapedIndex;
        nameNeedsVerification = true;
      }
      if (name) break;

      // The label used to be treated as strong enough on its own: if nothing scored,
      // whatever followed it was accepted anyway, "as last resort". On a card where the
      // name row is destroyed by the hologram that turns noise into a confident answer
      // and writes it to the student's profile. A missing name is recoverable; a wrong
      // one silently replaces the applicant's identity. Leave it null.
      if (!name) break;
    }
  }

  // There is deliberately no unanchored fallback scan here. One used to walk the first
  // eight lines and take any candidate that scored, with no way to tell the holder's
  // row from the father's: on a card whose holder name ("Iman Ayaz") contained no
  // listed name part, it skipped past it and returned the FATHER's name as the
  // candidate -- then the father field was dropped as a duplicate. Reading one person's
  // name into another person's field is the worst outcome this extractor can produce,
  // and it is worse than reading nothing. Without a label anchor, the field stays null.

  // ===== 3. Father / Husband Name (Multi-Strategy with Dictionary Scoring) =====
  // Pakistani CNICs show names in both English and Urdu. Tesseract (English mode) misreads
  // Urdu script as gibberish Latin characters (e.g., "Rerpa En Eh" from حسن طارق).
  // We collect ALL candidates and pick the one with the highest Pakistani name dictionary score.
  let fatherName = null;

  const isDifferentFromHolder = (cand) => {
    if (!cand) return false;
    if (!name) return true;
    return cand.toLowerCase() !== name.toLowerCase();
  };

  const isFatherLine = (lineStr) => {
    if (!lineStr) return false;
    if (/(?:CNIC|NIC|Identity|Cell|Mobile|Phone|Contact|Occupation|Profession|Income|Salary|Sign|Signature|Thumb|Address|Live|Dead|Status|Deceased|Alive|Date\s*of\s*Birth|DOB|Issue|Expiry)\b/i.test(lineStr)) {
      return false;
    }
    return /(?:Father(?:[''`]?s)?(?:\s*[\/\&]\s*(?:Husband|Guardian|Mother)(?:[''`]?s)?)?|Husband(?:[''`]?s)?|Guardian(?:[''`]?s)?|Parent(?:[''`]?s)?|Name\s*of\s*Father|FatherName|FathersName|F\/Name|F\.Name|FName|F\s*Name|Walad|Waldiat|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|Fther|Feather|Fether|Husb|S\/O|D\/O|W\/O|S\.O|D\.O|W\.O|Son\s+of|Daughter\s+of)\b/i.test(lineStr);
  };

  // Collect all father name candidates with their scores
  const fatherCandidates = [];

  // Strategy A: Same-line extraction from label line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isFatherLine(line)) {
      const sameLineCandidate = cleanNameCandidate(line);
      if (sameLineCandidate) {
        fatherCandidates.push({ name: sameLineCandidate, score: scoreNameCandidate(sameLineCandidate), strategy: 'A' });
      }
    }
  }

  // Strategy B: Multi-line lookahead (collect ALL candidates from subsequent lines)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isFatherLine(line)) {
      for (let j = 1; j <= 6; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/^[0-9\s.\-\/:]+$/.test(nextLine)) continue;
        if (/(?:Identity\s*Number|CNIC|NIC|Date\s*of\s*Birth|DOB|Gender|Country|Stay|Address|Expiry|Issue)/i.test(nextLine)) break;

        const cand = cleanNameCandidate(nextLine);
        if (cand) {
          fatherCandidates.push({ name: cand, score: scoreNameCandidate(cand), strategy: 'B' });
        }
      }
      break; // Only process the first father label block
    }
  }

  // Strategy C: Positional scan (lines after Holder Name)
  if (nameLineIndex >= 0) {
    for (let i = nameLineIndex + 1; i < Math.min(lines.length, nameLineIndex + 8); i++) {
      const line = lines[i];
      if (/(?:Republic|Pakistan|National|Identity|Card|Islamic|Address|Expiry|Issue|Birth|Gender|CNIC|Date|Stay|Country|NADRA)/i.test(line)) continue;
      const cand = cleanNameCandidate(line);
      if (cand && isDifferentFromHolder(cand)) {
        fatherCandidates.push({ name: cand, score: scoreNameCandidate(cand), strategy: 'C' });
      }
    }
  }

  // Strategy D: Regex across full text
  const regexPatterns = [
    /(?:Father(?:[''`]?s)?(?:\s*[\/\&]\s*(?:Husband|Guardian)(?:[''`]?s)?)?|Husband(?:[''`]?s)?|Guardian(?:[''`]?s)?|Parent(?:[''`]?s)?|F\/Name|F\.Name|FName|Walad|Waldiat|S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of)[\s:\-._\n\r]+([A-Za-z\s]{2,40})/gi,
    /(?:Father|Husband|Guardian)[\s\S]{1,60}?([A-Z][a-zA-Z]*(?:\s+[A-Za-z]+){0,3})/gi
  ];
  for (const pat of regexPatterns) {
    const matches = [...cleanText.matchAll(pat)];
    for (const m of matches) {
      if (m && m[1]) {
        const cand = cleanNameCandidate(m[1]);
        if (cand && isDifferentFromHolder(cand)) {
          fatherCandidates.push({ name: cand, score: scoreNameCandidate(cand), strategy: 'D' });
        }
      }
    }
  }

  // Pick the best candidate: highest dictionary score wins; ties broken by strategy priority (A > B > C > D)
  if (fatherCandidates.length > 0) {
    // Deduplicate by name
    const seen = new Set();
    const unique = fatherCandidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by score descending
    unique.sort((a, b) => b.score - a.score);

    console.log('--- Father Name Candidates ---');
    unique.forEach(c => console.log(`  [${c.strategy}] "${c.name}" (score: ${c.score})`));

    // Pick the highest scoring candidate — but only if it scored at all. Previously the
    // top candidate was taken unconditionally, so when every candidate was noise the
    // highest-ranked piece of noise became the father's name.
    if (unique[0].score > 0) {
      fatherName = unique[0].name;
    } else {
      console.warn('[OCR] No father-name candidate matched a recognisable name part; leaving it blank.');
    }
  }

  // Strategy E: Fallback scan (only if no candidates found above)
  if (!fatherName) {
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (/(?:Republic|Pakistan|National|Identity|Card|Islamic|Address|Expiry|Issue|Birth|Gender|CNIC|Date|Stay|Country|NADRA|Database)/i.test(line)) continue;
      const cand = cleanNameCandidate(line);
      if (cand && isDifferentFromHolder(cand)) {
        fatherCandidates.push({ name: cand, score: scoreNameCandidate(cand), strategy: 'E' });
      }
    }
    // Pick best from fallback, again only when it scored.
    if (fatherCandidates.length > 0) {
      fatherCandidates.sort((a, b) => b.score - a.score);
      if (fatherCandidates[0].score > 0) {
        fatherName = fatherCandidates[0].name;
      }
    }
  }

  // ===== 4. Date of Birth =====
  let dateOfBirth = null;
  const allDates = extractAllDatesFromText(normalizedText);

  // Strategy A: Context contains "Birth", "DOB", etc.
  const birthDateObj = allDates.find(d => /Birth|DOB|D\.O\.B|Bate|Dote|Dafe/i.test(d.context));
  if (birthDateObj) {
    dateOfBirth = birthDateObj.dateStr;
  }

  // Strategy B (Earliest Valid Date Rule): DOB is ALWAYS the earliest date on a Pakistani CNIC (1950-2015)
  if (!dateOfBirth && allDates.length > 0) {
    const currentYear = new Date().getFullYear();
    const birthCandidates = allDates.filter(d => d.year <= currentYear - 12 && d.year >= 1950);
    if (birthCandidates.length > 0) {
      birthCandidates.sort((a, b) => a.year - b.year);
      dateOfBirth = birthCandidates[0].dateStr;
    }
  }

  // ===== 5. Gender =====
  let gender = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Gender|Sex/i.test(line)) {
      for (let j = 0; j <= 2; j++) {
        const checkLine = lines[i + j];
        if (!checkLine) continue;
        const tokens = checkLine.split(/[\s/]+/);
        for (const token of tokens) {
          const cleanToken = token.trim().toUpperCase();
          if (cleanToken === 'M' || cleanToken === 'MALE') {
            gender = 'male';
            break;
          } else if (cleanToken === 'F' || cleanToken === 'FEMALE') {
            gender = 'female';
            break;
          }
        }
        if (gender) break;
      }
    }
    if (gender) break;
  }

  // Gender text search fallback
  if (!gender) {
    for (const line of lines) {
      const tokens = line.split(/[\s/,;:]+/);
      for (const token of tokens) {
        const t = token.trim().toUpperCase();
        if (t === 'MALE') { gender = 'male'; break; }
        if (t === 'FEMALE') { gender = 'female'; break; }
      }
      if (gender) break;
    }
  }

  // Gender 100% Deterministic Fallback: NADRA Pakistani CNIC 13th digit (odd = male, even = female)
  if (!gender && cnic) {
    const lastDigit = parseInt(cnic.replace(/\D/g, '').slice(-1));
    if (!isNaN(lastDigit)) {
      gender = lastDigit % 2 !== 0 ? 'male' : 'female';
    }
  }

  // ===== 6. Address =====
  let address = null;
  const addressPatterns = [
    /(?:Present\s*Address|Permanent\s*Address|Address|Addr)\s*[:\-\/\s]+([A-Za-z0-9][A-Za-z0-9 ,.\/#\-]{10,})/im,
    /(?:Present\s*Address|Permanent\s*Address|Address|Addr)\s*\n\s*([A-Za-z0-9][A-Za-z0-9 ,.\/#\-]{10,})/im,
    /(?:House\s*No|H\s*No|St\s*No|Street|Mohallah|Village|Tehsil|District)[\s:\-]+([A-Za-z0-9 ,.\/#\-]{10,})/im
  ];

  for (const pattern of addressPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      address = match[1].trim().replace(/\s*(Country|Expiry|Date|Issue|Stay).*$/i, '').trim();
      if (address.length >= 10) break;
      else address = null;
    }
  }

  return {
    cnic,
    name,
    // True when the name was taken from the line under its label without any
    // dictionary corroboration, so the UI can ask the applicant to confirm it.
    name_verification_needed: nameNeedsVerification || undefined,
    father_name: fatherName,
    date_of_birth: dateOfBirth,
    gender,
    address,
    raw_text: rawText
  };
};

// Comprehensive Board normalization dictionary for 28+ Pakistani Boards & common OCR misreads
const normalizeBoardName = (rawText) => {
  if (!rawText) return null;
  const str = rawText.toLowerCase();

  // Federal
  if (/federal|fbise|islamabad|isb\b/i.test(str)) return "FBISE Islamabad";

  // Punjab Boards
  if (/lahore|latiore|lafore|lahor|lahere|lahr|latior|lhr\b/i.test(str)) return "BISE Lahore";
  if (/gujranwala|gujranwla|gujrat|grw\b|sialkot/i.test(str)) return "BISE Gujranwala";
  if (/rawalpindi|rawalpind|rwp\b|pindi|attock|chakwal|jhelum/i.test(str)) return "BISE Rawalpindi";
  if (/multan|mooltan|mlt\b|khanewal|vehari/i.test(str)) return "BISE Multan";
  if (/faisalabad|faislabad|lyallpur|fsd\b|jhang/i.test(str)) return "BISE Faisalabad";
  if (/sargodha|sargoda|sgd\b|mianwali|bhakkar/i.test(str)) return "BISE Sargodha";
  if (/sahiwal|sahiwa|swl\b|okara|pakpattan/i.test(str)) return "BISE Sahiwal";
  if (/bahawalpur|bahawlpur|bwl\b|bwp\b|rahim\s*yar\s*khan/i.test(str)) return "BISE Bahawalpur";
  if (/dg\s*khan|d\.g\s*khan|dera\s*ghazi\s*khan|dgk\b|muzaffargarh/i.test(str)) return "BISE DG Khan";
  if (/pbte|punjab\s*board\s*of\s*technical|technical\s*education\s*punjab/i.test(str)) return "PBTE Lahore";

  // Sindh Boards
  if (/bsek|karachi\s*secondary|secondary\s*karachi/i.test(str)) return "BISE Karachi (BSEK)";
  if (/biek|karachi\s*inter|karachi|khi\b/i.test(str)) return "BISE Karachi";
  if (/hyderabad|hyd\b|jamshoro|thatta/i.test(str)) return "BISE Hyderabad";
  if (/sukkur|skr\b|khairpur/i.test(str)) return "BISE Sukkur";
  if (/larkana|lrk\b|shikarpur|jacobabad/i.test(str)) return "BISE Larkana";
  if (/mirpurkhas|mirpur\s*khas|mpk\b|sanghar/i.test(str)) return "BISE Mirpurkhas";
  if (/shaheed\s*benazirabad|benazirabad|nawabshah|sba\b/i.test(str)) return "BISE Shaheed Benazirabad";
  if (/sbte|sindh\s*board\s*of\s*technical/i.test(str)) return "SBTE Karachi";

  // Khyber Pakhtunkhwa (KPK) Boards
  if (/peshawar|psh\b|charsadda/i.test(str)) return "BISE Peshawar";
  if (/abbottabad|abottabad|atd\b|hazara|haripur|mansehra/i.test(str)) return "BISE Abbottabad";
  if (/swat|saidu\s*sharif|shangla/i.test(str)) return "BISE Swat";
  if (/malakand|dir\b|bajaur/i.test(str)) return "BISE Malakand";
  if (/mardan|swabi/i.test(str)) return "BISE Mardan";
  if (/kohat|hangu|karak/i.test(str)) return "BISE Kohat";
  if (/bannu|lakki\s*marwat/i.test(str)) return "BISE Bannu";
  if (/di\s*khan|d\.i\s*khan|dera\s*ismail\s*khan/i.test(str)) return "BISE DI Khan";

  // Balochistan Boards
  if (/quetta|qta\b|balochistan\s*board/i.test(str)) return "BISE Quetta";
  if (/turbat|kech|gwadar/i.test(str)) return "BISE Turbat";
  if (/khuzdar|kalat/i.test(str)) return "BISE Khuzdar";
  if (/loralai|zhob/i.test(str)) return "BISE Loralai";

  // Azad Jammu & Kashmir (AJK)
  if (/mirpur|ajk\b|azad\s*kashmir|azad\s*jammu/i.test(str)) return "BISE Mirpur (AJK)";

  // International / Specialized Boards
  if (/aga\s*khan|aku|aku-eb|akueb/i.test(str)) return "Aga Khan Board";
  if (/cambridge|cie|edexcel|igcse|gce|o\s*level|o-level|a\s*level|a-level|pearson/i.test(str)) return "Cambridge Board";
  if (/wafaq|madaris|tanzeem/i.test(str)) return "Wafaq-ul-Madaris";

  // Fuzzy fallback: match OCR-garbled city names against known board cities
  const boardCities = [
    'lahore', 'gujranwala', 'gujrat', 'sialkot', 'rawalpindi', 'multan',
    'faisalabad', 'sargodha', 'sahiwal', 'bahawalpur', 'dg khan', 'dera ghazi khan',
    'karachi', 'hyderabad', 'sukkur', 'larkana', 'mirpurkhas', 'benazirabad', 'nawabshah',
    'peshawar', 'abbottabad', 'swat', 'malakand', 'mardan', 'kohat', 'bannu', 'di khan',
    'quetta', 'turbat', 'khuzdar', 'loralai', 'mirpur', 'islamabad'
  ];
  const CITY_TO_BOARD = {
    lahore: 'BISE Lahore', gujranwala: 'BISE Gujranwala', gujrat: 'BISE Gujranwala',
    sialkot: 'BISE Gujranwala', rawalpindi: 'BISE Rawalpindi', multan: 'BISE Multan',
    faisalabad: 'BISE Faisalabad', sargodha: 'BISE Sargodha', sahiwal: 'BISE Sahiwal',
    bahawalpur: 'BISE Bahawalpur', 'dg khan': 'BISE DG Khan', 'dera ghazi khan': 'BISE DG Khan',
    karachi: 'BISE Karachi', hyderabad: 'BISE Hyderabad', sukkur: 'BISE Sukkur',
    larkana: 'BISE Larkana', mirpurkhas: 'BISE Mirpurkhas', benazirabad: 'BISE Shaheed Benazirabad',
    nawabshah: 'BISE Shaheed Benazirabad', peshawar: 'BISE Peshawar', abbottabad: 'BISE Abbottabad',
    swat: 'BISE Swat', malakand: 'BISE Malakand', mardan: 'BISE Mardan', kohat: 'BISE Kohat',
    bannu: 'BISE Bannu', 'di khan': 'BISE DI Khan', quetta: 'BISE Quetta', turbat: 'BISE Turbat',
    khuzdar: 'BISE Khuzdar', loralai: 'BISE Loralai', mirpur: 'BISE Mirpur (AJK)', islamabad: 'FBISE Islamabad'
  };

  const cleanCityInput = str.replace(/[^a-z\s&]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanCityInput.length >= 4) {
    let bestCity = null;
    let bestDist = Infinity;
    for (const city of boardCities) {
      const dist = levenshteinDistance(cleanCityInput, city);
      if (dist < bestDist) { bestDist = dist; bestCity = city; }
    }
    // Accept if within ~30% of the city's length (tolerates minor OCR garbling)
    if (bestCity && bestDist <= Math.max(2, Math.round(bestCity.length * 0.3)) && cleanCityInput.length >= bestCity.length - 2) {
      return CITY_TO_BOARD[bestCity];
    }
  }

  return null;
};

// Levenshtein distance for fuzzy OCR board-city matching
const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
};

// Convert number words in English (e.g., "Nine Hundred Fifty") to digits
const wordsToNumber = (text) => {
  if (!text) return null;
  const wordsMap = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000
  };

  const matches = text.match(/(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|\band\b|\s+)+/gi);
  if (!matches) return null;

  for (const matchStr of matches) {
    const tokens = matchStr.toLowerCase().trim().split(/[\s\-]+/);
    if (tokens.length < 2) continue;
    let current = 0;
    let total = 0;
    let valid = false;

    for (const token of tokens) {
      if (token === 'and') continue;
      const val = wordsMap[token];
      if (val !== undefined) {
        valid = true;
        if (val === 100) {
          current = (current || 1) * 100;
        } else if (val === 1000) {
          current = (current || 1) * 1000;
          total += current;
          current = 0;
        } else {
          current += val;
        }
      } else {
        break;
      }
    }
    total += current;
    if (valid && total >= 100 && total <= 1200) {
      return total;
    }
  }
  return null;
};

/**
 * Perform targeted OCR on cropped region for specific fields
 */
const performTargetedFieldOcr = async (canvas, lines, docCategory, fieldType = 'name') => {
  if (!lines || lines.length === 0) return null;

  let labelLine = null;
  for (const line of lines) {
    const text = line.text || '';
    if (fieldType === 'name') {
      if (docCategory === 'cnic') {
        if (/(?:Name|Narne|Namo|Nene|Holder|Neme|Nama)\b/i.test(text) &&
          !/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|National|Database|Stay)/i.test(text)) {
          labelLine = line;
          break;
        }
      } else {
        if (/(?:Name\s*(?:of\s+)?(?:Candidate|Student|Examinee)|Student\s*Name|Candidate\s*Name)/i.test(text) &&
          !/(?:Father|Husband|Mother|Guardian|Board|Institution|School|College)/i.test(text)) {
          labelLine = line;
          break;
        }
      }
    } else if (fieldType === 'father_name') {
      if (docCategory === 'cnic') {
        if (/(?:Father(?:[''`]?s)?(?:\s*[\/\&]\s*(?:Husband|Guardian|Mother)(?:[''`]?s)?)?|Husband(?:[''`]?s)?|Name\s*of\s*Father|FatherName|F\/Name|Walad)/i.test(text) &&
          !/(?:Name|Narne|Namo)/i.test(text.replace(/(?:Father|Husband|Name)/gi, ''))) {
          labelLine = line;
          break;
        }
      } else {
        if (/(?:Father|Husband|S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of|Name\s*of\s*Father)/i.test(text)) {
          labelLine = line;
          break;
        }
      }
    }
  }

  if (!labelLine || !labelLine.bbox) return null;

  const bbox = labelLine.bbox;
  let cropX, cropY, cropWidth, cropHeight;

  if (docCategory === 'cnic') {
    // CNIC field is usually below or right below the label
    cropX = Math.max(0, bbox.x0 - 20);
    cropY = bbox.y1 - 5;
    cropWidth = Math.min(canvas.width - cropX, 800);
    cropHeight = 100; // Enough for one or two lines
  } else {
    // Academic certificates: often right of the label on the same line or just below
    cropX = bbox.x1 + 10;
    cropY = Math.max(0, bbox.y0 - 15);
    cropWidth = Math.min(canvas.width - cropX, 1200);
    cropHeight = bbox.y1 - bbox.y0 + 30;
  }

  // Ensure dimensions are positive
  cropWidth = Math.max(0, Math.min(canvas.width - cropX, cropWidth));
  cropHeight = Math.max(0, Math.min(canvas.height - cropY, cropHeight));

  if (cropWidth <= 10 || cropHeight <= 10) return null;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const ctx = croppedCanvas.getContext('2d');
  ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  try {
    const result = await Tesseract.recognize(croppedCanvas, 'eng', {
      tessedit_pageseg_mode: Tesseract.PSM ? Tesseract.PSM.SINGLE_LINE : '7'
    });
    return {
      text: result?.data?.text || '',
      confidence: result?.data?.confidence || 0
    };
  } catch (err) {
    console.error('Targeted OCR failed:', err);
    return null;
  }
};


/**
 * Extract Subject Marks from Academic Document Table
 */
const extractSubjectMarks = (text) => {
  const subjects = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const knownSubjects = [
    'URDU', 'ENGLISH', 'ISLAMIYAT', 'ISLAMIC EDUCATION', 'PAKISTAN STUDIES',
    'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'COMPUTER SCIENCE',
    'GENERAL SCIENCE', 'ISLAMIC STUDIES', 'PUNJABI', 'ARABIC', 'EDUCATION',
    'ECONOMICS', 'CIVICS', 'HISTORY', 'GEOGRAPHY', 'STATISTICS', 'ACCOUNTING'
  ];

  for (let line of lines) {
    if (/(?:DETAIL\s*OF\s*MARKS|MARKS\s*OBTAINED|SUBJECTS?|TOTAL|MAXIMUM|ROLL\s*NO|NAME|DATE|GRADE|RESULT|BOARD|BISE)/i.test(line)) {
      continue;
    }

    // Allow optional leading serial number e.g. "1. URDU"
    // Capture subject name (letters/spaces) and then a sequence of numbers (with spaces)
    // Ignore optional trailing grade like A+, B, PASS, FAIL
    const match = line.match(/^(?:[\d\s\.\)\-]*)([A-Za-z\s&]+)[\s=:\-]+([\d\sOolISBZ]{2,})(?:[A-F][+-]?|A-1|PASS|FAIL)?\s*$/i);

    if (match) {
      let subjName = match[1].replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      let numsStr = match[2].trim();

      if (subjName.length < 3 || ['THE', 'AND', 'FOR', 'PART', 'OBTAINED', 'GRAND', 'AGGREGATE'].includes(subjName)) {
        continue;
      }

      const isKnown = knownSubjects.some(ks => subjName.includes(ks));
      if (isKnown || subjName.length >= 4) {
        // Fix OCR digits
        const fixedNums = fixNumericRuns(numsStr);
        const numbers = fixedNums.split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));

        if (numbers.length > 0) {
          // The last number is typically the Total Obtained Marks for that subject
          let obtainedMarks = numbers[numbers.length - 1];

          if (obtainedMarks >= 0 && obtainedMarks <= 250) {
            subjects.push({ name: subjName, obtainedMarks });
          }
        }
      }
    }
  }

  // Clean duplicates (in case of double read)
  const uniqueSubjects = [];
  const seenNames = new Set();
  for (const sub of subjects) {
    if (!seenNames.has(sub.name)) {
      seenNames.add(sub.name);
      uniqueSubjects.push(sub);
    }
  }

  return uniqueSubjects;
};


/**
 * Extract Academic Data (Matric / Intermediate / Transcript) with high precision
 */
const extractAcademicData = (text) => {
  const cleanText = cleanOcrText(text);

  // 1. Board Name Detection & Normalization
  let board = null;
  let documentLevel = null;
  const textForBoard = text;

  // Detect both qualification titles before deciding. The word "Intermediate"
  // in a board name is institution wording, not an HSSC qualification title.
  const qualificationText = textForBoard.replace(
    /\bBOARD\s+OF\s+INTERMEDIATE\s*(?:&|AND)\s*SECONDARY\s+EDUCATION\b/gi,
    ' '
  );
  const hasMatricEvidence = /SECONDARY\s+SCHOOL\s+CERTIFICATE|\bSSC\b|\bMATRIC(?:ULATION)?\b|10TH\s+CLASS/i.test(qualificationText);
  const hasIntermediateEvidence = /HIGHER\s+SECONDARY\s+SCHOOL\s+CERTIFICATE|\bHSSC\b|\bINTERMEDIATE\s+(?:EXAMINATION|CERTIFICATE)\b|12TH\s+CLASS|\bF\.?\s*SC\b|\bF\.?\s*A\b|\bI\.?\s*CS\b|\bI\.?\s*COM\b/i.test(qualificationText);
  const hasSecondYearEvidence = /(?:PART\s*[- ]?II|SECOND\s+YEAR)/i.test(qualificationText) &&
    /(?:MARKSHEET|MARK\s*SHEET|RESULT|EXAMINATION|CERTIFICATE|INTERMEDIATE|HSSC)/i.test(qualificationText);

  if (hasIntermediateEvidence || hasSecondYearEvidence) {
    documentLevel = 'intermediate';
  } else if (hasMatricEvidence) {
    documentLevel = 'matric';
  }

  // a) Look for "Board of Intermediate/Secondary Education <City>"
  const biseMatch = textForBoard.match(/(?:Board\s+of\s+Intermediate(?:\s+(?:and|&|&amp;)?\s+Secondary\s+Education)?|BISE|Board\s+of\s+Secondary\s+Education)[\s,:]*([A-Za-z\s]+?)(?:,|\.|\n|$)/i);
  if (biseMatch) {
    const rawCity = biseMatch[1].trim();
    board = normalizeBoardName(rawCity);
  }

  // b) If that failed, scan line-by-line and normalize the candidate that is most board-like
  if (!board) {
    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      // Only consider lines mentioning a board and not obviously unrelated
      if (!/board|bise|biek|bsek|pbte|sbte|federal|examination\s+(?:board|authority)|secondary\s+education|intermediate\s+education/i.test(line)) continue;
      if (/\b(?:roll\s*no|total|obtained|marks|grade|result|subject|group)\b/i.test(line)) continue;
      const norm = normalizeBoardName(line.replace(/\bboard\b/gi, ' ').replace(/\bof\b/gi, ' ').replace(/\b(?:for|the|education|secondary|intermediate|and|&)\b/gi, ' ').replace(/[0-9]+/g, ' '));
      if (norm) { board = norm; break; }
    }
  }

  // c) Whole-text fallback
  if (!board) {
    board = normalizeBoardName(textForBoard);
  }

  // 2. Passing Year Extraction
  let passingYear = null;
  // Collapse spaced digit runs and fix letter/digit ambiguities inside numeric runs only
  const cleanedForYear = fixNumericRuns(collapseSpacedDigits(text));

  const annualExamMatch = cleanedForYear.match(/(?:Annual|Supplementary|Special|Bi-Annual|Bi\s*Annual|Spring|Fall|March|May|June|August|October)\s+(?:Exam(?:ination)?\s+)?([12][09]\d{2})/i);
  const examMatch = cleanedForYear.match(/(?:Examination|Exam|Session|Passing|Held\s+in|Held\s*on|Year|Dated|Date)[\s,:]+\s*([12][09]\d{2})/i);
  const rangeMatch = cleanedForYear.match(/(?:20\d{2}|19\d{2})\s*[-–—]\s*(20\d{2}|19\d{2})/);
  const rangeShortMatch = cleanedForYear.match(/\b(20\d{2})\s*[-–—]\s*(\d{2})\b/);

  const currentYear = new Date().getFullYear();
  const isValidYear = (y) => y >= 1990 && y <= currentYear + 1;

  if (annualExamMatch && isValidYear(parseInt(annualExamMatch[1], 10))) {
    passingYear = annualExamMatch[1];
  } else if (examMatch && isValidYear(parseInt(examMatch[1], 10))) {
    passingYear = examMatch[1];
  } else if (rangeShortMatch) {
    // "2022-23" -> 2023 (the passing year is the end of the session)
    const endYear = parseInt(`20${rangeShortMatch[2]}`, 10);
    if (isValidYear(endYear)) passingYear = String(endYear);
  } else if (rangeMatch) {
    // "2019-2020" -> end year
    const endYear = parseInt(rangeMatch[2], 10);
    if (isValidYear(endYear)) passingYear = String(endYear);
  } else {
    const yearMatches = [...cleanedForYear.matchAll(/\b(199\d|20[0-2]\d)\b/g)];
    if (yearMatches.length > 0) {
      const validYears = yearMatches.map(m => parseInt(m[1])).filter(isValidYear);
      if (validYears.length > 0) {
        passingYear = Math.max(...validYears).toString();
      }
    }
  }

  // 3. Roll Number
  // The label itself is frequently misread ("Ro11 No.", "Rol1 No", "RoII No"), so the
  // l/I/1 confusion is tolerated. Requiring a literal "Roll" loses the field even when
  // the digits beside it are perfectly legible.
  let rollNumber = null;
  // The "No" is often mangled -- Lahore's "Roll No. 559892" came through as "Rolle.
  // 559892" -- so one or two stray letters are allowed in that slot. The value is then
  // required to be digits, which is what stops the looser anchor picking up words.
  const rollMatch = text.match(/R[o0][l1I|]{1,2}\s*(?:N[o0]|Number|#|[A-Za-z]{1,2})?[\s:.]+([A-Za-z0-9-]+)/i);
  if (rollMatch) {
    const rawRoll = rollMatch[1].trim();
    if (/^\d{4,10}$/.test(rawRoll)) {
      rollNumber = rawRoll;
    }
  }

  // 4. Obtained Marks & Total Marks Extraction (Multi-Strategy)
  let obtainedMarks = null;
  let totalMarks = null;

  // Pre-clean: collapse spaced digits so "9 8 0" -> "980" and "1 1 0 0" -> "1100"
  const cleanSpacedDigits = collapseSpacedDigits(text);
  // Fix letter/digit ambiguity ONLY inside numeric runs (never corrupts words like "Board")
  const cleanedNumText = fixNumericRuns(cleanSpacedDigits);

  // Standard Pakistani board totals, ordered by how frequently they appear as TOTAL
  const STD_TOTALS = [1100, 1050, 1200, 850, 800, 550, 600, 500, 400];

  // Sanity: a plausible Obtained marks value (must be < total; never a standard TOTAL itself)
  const looksLikeObtained = (val, total) =>
    !isNaN(val) && val >= 100 && val <= 1200 &&
    val !== 1100 && val !== 1050 && val !== 1200 && val !== 850 && val !== 800 &&
    val !== 550 && val !== 500 && val !== 600 &&
    (!total ? true : val < total);

  // a) Ratio patterns (e.g. 980/1100, 0980/1100, 980 out of 1100, 980 / 1100)
  // Reject ambiguous separators like "-" or ":" that could be dates/ranges.
  const ratioPattern = /\b([0-9OolISBZ]{3,4})\s*(?:\/|\\|\||I\s*\|?|out\s+of|\bof\b|out\s*of)\s*([0-9OolISBZ]{3,4})\b/gi;
  const ratioMatches = [...cleanedNumText.matchAll(ratioPattern)];
  for (const match of ratioMatches) {
    const obtCandidate = parseInt(fixOcrDigits(match[1]), 10);
    const totCandidate = parseInt(fixOcrDigits(match[2]), 10);
    if (obtCandidate >= 100 && obtCandidate <= 1200 &&
      STD_TOTALS.includes(totCandidate) &&
      obtCandidate < totCandidate) {
      obtainedMarks = obtCandidate;
      totalMarks = totCandidate;
      break;
    }
    // Fallback: total is in range but not an exact standard value
    if (obtCandidate >= 100 && obtCandidate <= 1200 &&
      totCandidate >= 300 && totCandidate <= 1200 &&
      obtCandidate < totCandidate) {
      obtainedMarks = obtCandidate;
      totalMarks = totCandidate;
      break;
    }
  }

  // b) Same-line Total and Obtained (e.g. TOTAL MARKS: 1100 MARKS OBTAINED: 798)
  if (!obtainedMarks || !totalMarks) {
    const sameLinePattern = /(?:TOTAL(?:\s*MARKS)?|MAXIMUM(?:\s*MARKS)?)\s*[:\-]?\s*([0-9OolISBZ]{3,4})[\s\S]{1,30}?(?:MARKS\s*OBTAINED|OBTAINED(?:\s*MARKS)?|SECURED)\s*[:\-]?\s*([0-9OolISBZ]{3,4})/gi;
    const sameLineMatches = [...cleanedNumText.matchAll(sameLinePattern)];
    for (const match of sameLineMatches) {
      const totCandidate = parseInt(fixOcrDigits(match[1]), 10);
      const obtCandidate = parseInt(fixOcrDigits(match[2]), 10);
      if (totCandidate >= 300 && totCandidate <= 1200 && obtCandidate >= 100 && obtCandidate <= totCandidate) {
        totalMarks = totCandidate;
        obtainedMarks = obtCandidate;
        break;
      }
    }
  }

  // b.2) Explicit field labels
  if (!obtainedMarks) {
    const obtPatterns = [
      /(?:Marks\s*Obtained|Obtained\s*Marks|Marks\s*Secured|Secured\s*Marks|Marks\s*Obt|Obt\s*Marks|Marks\s*in\s*Figures)[\s:\-\=]{1,5}([0-9OolISBZ]{3,4})\b/gi,
      /(?:Total\s*Marks\s*Obtained)[\s:\-\=]{1,5}([0-9OolISBZ]{3,4})\b/gi,
      /(?:secured|obtained|passed\s*with|got|scored)[\s:\-]+([0-9OolISBZ]{3,4})\s*(?:marks)?\b/gi,
      /(?:GRAND\s+TOTAL|G\.\s*TOTAL|AGGREGATE|GRAND)[\s:\-\=]{1,5}([0-9OolISBZ]{3,4})\b/gi
    ];

    for (const pat of obtPatterns) {
      const matches = [...cleanedNumText.matchAll(pat)];
      for (const m of matches) {
        if (m && m[1]) {
          const val = parseInt(fixOcrDigits(m[1]), 10);
          if (looksLikeObtained(val, totalMarks)) {
            obtainedMarks = val;
            break;
          }
        }
      }
      if (obtainedMarks) break;
    }
  }

  // c) Explicit TOTAL labels
  if (!totalMarks) {
    const totPatterns = [
      /(?:Total\s*Marks|Maximum\s*Marks|Max\s*Marks|Grand\s*Total|Out\s*of)[\s:\-\=]{1,5}([0-9OolISBZ]{3,4})\b/gi
    ];

    for (const pat of totPatterns) {
      const match = cleanedNumText.match(pat);
      if (match && match[1]) {
        const val = parseInt(fixOcrDigits(match[1]), 10);
        if (!isNaN(val) && val >= 300 && val <= 1200) {
          totalMarks = val;
          break;
        }
      }
    }
  }

  // d) English Word-based marks parsing (e.g., "Nine Hundred Fifty")
  if (!obtainedMarks) {
    const wordNum = wordsToNumber(text);
    if (wordNum && wordNum >= 100 && wordNum <= 1200) {
      obtainedMarks = wordNum;
    }
  }

  // e) Summary row search (GRAND TOTAL / TOTAL / AGGREGATE row with two numbers in it)
  if (!obtainedMarks || !totalMarks) {
    // Look for lines containing both numbers together
    const totalRows = [...cleanedNumText.matchAll(/(?:GRAND\s+TOTAL|TOTAL\s+MARKS|TOTAL|AGGREGATE|RESULT)[\s:\-]+([0-9OolISBZ\s]+)/gi)];
    for (const rowMatch of totalRows) {
      const numbersInRow = rowMatch[1].split(/\s+/)
        .map(n => parseInt(fixOcrDigits(n), 10))
        .filter(n => !isNaN(n) && n >= 100 && n <= 1200);
      if (numbersInRow.length >= 2) {
        const foundTotal = numbersInRow.find(n => STD_TOTALS.includes(n)) || Math.max(...numbersInRow);
        const foundObt = numbersInRow.find(n => n !== foundTotal && n < foundTotal && n >= 100);
        if (foundTotal && !totalMarks) totalMarks = foundTotal;
        if (foundObt && !obtainedMarks) obtainedMarks = foundObt;
      }
    }
  }

  // f) Generic Pakistani standard total marks scan if total is still missing
  if (!totalMarks) {
    for (const stdTot of STD_TOTALS) {
      if (new RegExp(`\\b${stdTot}\\b`).test(cleanedNumText)) {
        totalMarks = stdTot;
        break;
      }
    }
  }

  // g) Fallback: If obtained is missing but there are plausible numbers < totalMarks
  if (!obtainedMarks && totalMarks) {
    const allNums = [...cleanedNumText.matchAll(/\b([0-9OolISBZ]{3,4})\b/g)]
      .map(m => parseInt(fixOcrDigits(m[1]), 10))
      .filter(n => !isNaN(n) && n >= 150 && n < totalMarks && n !== totalMarks && !STD_TOTALS.includes(n));
    if (allNums.length > 0) {
      obtainedMarks = Math.max(...allNums);
    }
  }

  // h) Auto-deduce standard total marks if obtained is found and total still missing
  if (obtainedMarks && !totalMarks) {
    totalMarks = obtainedMarks > 550 ? 1100 : 550;
  }

  // Only swap if obtained > total AND obtained is a standard total AND total is a plausible obtained score
  if (obtainedMarks && totalMarks && obtainedMarks > totalMarks) {
    if (STD_TOTALS.includes(obtainedMarks) && totalMarks < obtainedMarks) {
      const temp = obtainedMarks;
      obtainedMarks = totalMarks;
      totalMarks = temp;
    } else {
      // If we got absurd marks (e.g. 1100 obtained, 798 total) and 1100 is a standard total, we cap it.
      totalMarks = obtainedMarks;
      obtainedMarks = null; // We failed to find the real obtained marks
    }
  }

  // ===== Total marks corroboration =====
  // The total decides the percentage, so a number picked out of the subject table is
  // not good enough. On a real certificate the total appears in a summary line
  // ("TOTAL MARKS : 1100", "secured 972/1100 marks"). When OCR mangles that line, the
  // table scan can return a subject maximum instead -- 835/850 = 98.24%, which is
  // internally consistent and therefore invisible to every downstream check.
  // If the total cannot be corroborated, it is discarded so the document is flagged
  // for a clearer upload rather than silently recorded with an inflated percentage.
  let totalMarksCorroborated = false;

  // "TOTAL MARKS : 1100" is frequently read as "TOTAL MARKS : | 100" -- the leading 1
  // becomes a pipe and gains a space. Requiring digits straight after the label missed
  // it, the total was then discarded as uncorroborated, and a perfectly good
  // certificate was rejected. Read the characters after the label and repair them.
  const totalAfterLabel = (() => {
    // Lahore prints "TOTAL MARKS (In Figures) 1100 904", so the label is not always
    // followed directly by the number. A parenthetical immediately after the label is
    // skipped; without this the window held only "(In Figures)" and the total was lost,
    // which rejected the whole certificate.
    const m = cleanedNumText.match(/TOTAL\s*MARKS\s*(?:\([^)]{0,20}\)\s*)?[:\-]?\s*/i);
    if (!m) return null;
    const tail = cleanedNumText.slice(m.index + m[0].length, m.index + m[0].length + 14);
    const candidates = [];

    // A pipe here is ambiguous. In "TOTAL MARKS : | 1100 |" it is a table border; in
    // "TOTAL MARKS : | 100" it is the leading 1 of 1100, misread and spaced away from
    // the rest. Both readings are collected and the marks decide between them: a total
    // below the obtained marks is impossible, which rules the wrong one out.
    const asBorder = tail.replace(/[|!]/g, ' ');
    (asBorder.match(/\d{3,4}/g) || []).forEach(t => candidates.push(parseInt(t, 10)));

    const asOne = tail
      .replace(/[|!Il]/g, '1')
      .replace(/[Oo]/g, '0')
      .replace(/[^0-9\s]/g, ' ')
      .trim()
      .replace(/^(\d)\s+(\d{2,3})\b/, '$1$2');
    (asOne.match(/\d{3,4}/g) || []).forEach(t => candidates.push(parseInt(t, 10)));

    const plausible = candidates.filter(n =>
      n >= 100 && n <= 2000 &&
      (obtainedMarks === null || obtainedMarks === undefined || n >= obtainedMarks)
    );
    if (!plausible.length) return null;
    const standard = plausible.find(n => STD_TOTALS.includes(n));
    return String(standard !== undefined ? standard : plausible[0]);
  })();

  const explicitTotal =
    (totalAfterLabel ? [null, totalAfterLabel] : null) ||
    cleanedNumText.match(/TOTAL\s*MARKS\s*[:\-]?\s*([0-9]{3,4})\b/i) ||
    cleanedNumText.match(/(?:secured|obtained)\s+[0-9]{2,4}\s*\/\s*([0-9]{3,4})\b/i) ||
    cleanedNumText.match(/\b[0-9]{2,4}\s*\/\s*([0-9]{3,4})\s*marks\b/i) ||
    cleanedNumText.match(/out\s*of\s*([0-9]{3,4})\b/i);

  if (explicitTotal) {
    const stated = parseInt(fixOcrDigits(explicitTotal[1]), 10);
    if (!isNaN(stated) && stated >= 100 && stated <= 2000) {
      if (obtainedMarks === null || obtainedMarks === undefined || obtainedMarks <= stated) {
        totalMarks = stated;
        totalMarksCorroborated = true;
      }
    }
  }

  if (!totalMarksCorroborated && totalMarks) {
    console.warn(`[OCR] Total marks (${totalMarks}) could not be corroborated by a summary line; discarding.`);
    totalMarks = null;
  }

  // ===== Percentage =====
  // Always derive the percentage from the marks. Scraping the first "NN%" out of the
  // page body is unsafe: on real board certificates the first match is almost always
  // the grade-threshold footnote ("...overall Grade 'C' (50% marks)") or OCR noise,
  // not the candidate's score. A printed percentage is used only when marks could not
  // be read, and only when it carries a label identifying it as the candidate's own.
  let percentage = null;
  let percentageSource = null;

  if (obtainedMarks !== null && obtainedMarks !== undefined &&
    totalMarks !== null && totalMarks !== undefined && totalMarks > 0) {
    percentage = parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2));
    percentageSource = 'computed';
  } else {
    const labelledPercentage =
      text.match(/(?:percent(?:age)?|%\s*age|overall\s*marks)\D{0,15}?(\d{1,3}(?:\.\d+)?)\s*%/i) ||
      text.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*(?:marks\s*)?obtained/i);
    if (labelledPercentage) {
      const candidate = parseFloat(labelledPercentage[1]);
      if (candidate > 0 && candidate <= 100) {
        percentage = candidate;
        percentageSource = 'printed';
      }
    }
  }

  // ===== Grade =====
  // The grade must sit on the same line as its label. The previous pattern allowed any
  // whitespace between "Grade" and the letter, so a table header ending in "GRADE"
  // followed by a newline matched the first letter of the next line.
  let grade = null;
  const gradeNearResult = cleanText.match(
    /(?:MARKS\s*OBTAINED\s*:?\s*\d+|secured\s+[\d/\s]+marks)[^\n]{0,40}?GRADE[ \t]*[-:]?[ \t]*(A\+|A-1|A1|[A-F][+-]?)(?![A-Za-z0-9])/i
  );
  const gradeSameLine = cleanText.match(
    /\bGrade[ \t]*[-:]?[ \t]*(A\+|A-1|A1|[A-F][+-]?)(?![A-Za-z0-9])/i
  );
  const gradeMatch = gradeNearResult || gradeSameLine;
  if (gradeMatch) {
    grade = gradeMatch[1].toUpperCase();
  } else if (percentage) {
    if (percentage >= 80) grade = 'A+';
    else if (percentage >= 70) grade = 'A';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';
    else if (percentage >= 33) grade = 'E';
    else grade = 'F';
  }

  // Extract candidate name from academic certificate
  let name = null;
  let academicNameNeedsVerification = false;
  let nameLineIndex = -1;
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A bare "NAME" is what the Punjab boards actually print on intermediate result
    // intimations; requiring "Name of Candidate" missed it entirely. The exclusion
    // below still keeps this off the FATHER'S NAME row and the institution rows.
    // One source for the anchor, used by both the test and the capture below. They were
    // written out twice and had already drifted apart once.
    // "Certified that <NAME>" is how Lahore introduces the candidate: there is no NAME
    // label anywhere on the certificate.
    const NAME_ANCHOR = '(?:Name\\s*(?:of\\s+)?(?:Candidate|Student|Examinee)|Student\\s*Name|Candidate\\s*Name|Certified\\s+that|\\bNAME\\b)';
    if (new RegExp(NAME_ANCHOR + '\\s*[:\\-]?', 'i').test(line)
      && !/(?:Father|Husband|Mother|Guardian|Board|Institution|School|College)/i.test(line)) {
      const sameLineMatch = line.match(new RegExp(NAME_ANCHOR + '\\s*[:\\-]?\\s*(.+)$', 'i'));
      // As on the CNIC, a dictionary match is preferred but is not required: the name
      // list cannot cover real Pakistani names, and "RIDA NADEEM" printed against its
      // own NAME label is identified by the layout regardless. A candidate accepted on
      // form alone is flagged for the applicant to confirm.
      let shapedFallback = null;
      if (sameLineMatch && sameLineMatch[1]) {
        const val = cleanNameCandidate(sameLineMatch[1]);
        if (val && val.length >= 3 && scoreNameCandidate(val) > 0) name = val;
        else if (val && looksLikeName(val)) shapedFallback = val;
      }
      if (!name) {
        for (let j = 1; j <= 3; j++) {
          const nextLine = lines[i + j];
          if (!nextLine) break;
          if (/(?:Father|Husband|Mother|Guardian|Board|Institution|School|College|Roll|Marks)/i.test(nextLine)) break;
          const val = cleanNameCandidate(nextLine);
          if (val && val.length >= 3 && scoreNameCandidate(val) > 0) { name = val; break; }
          if (!shapedFallback && val && looksLikeName(val)) shapedFallback = val;
        }
      }
      if (!name && shapedFallback) {
        name = shapedFallback;
        academicNameNeedsVerification = true;
      }
      if (name) break;
    }
  }

  // Academic name fallback: look for S/O line and take the name on the line above or same line before S/O
  if (!name) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\b(?:S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of|Wife\s+of)\b/i.test(line)) {
        // Check same line before the S/O marker
        const beforeSdo = line.split(/\b(?:S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of|Wife\s+of)\b/i)[0];
        const sameLineName = cleanNameCandidate(beforeSdo);
        if (sameLineName && sameLineName.split(' ').length >= 2 && scoreNameCandidate(sameLineName) > 0) {
          name = sameLineName;
          nameLineIndex = i;
          break;
        }
        // Check the line above the S/O line
        if (i > 0) {
          const prevLine = lines[i - 1];
          if (!/(?:Father|Husband|Mother|Board|Roll|Marks|Total|Obtained|Grade|College|School|Institution)/i.test(prevLine)) {
            const prevName = cleanNameCandidate(prevLine);
            if (prevName && prevName.split(' ').length >= 2 && scoreNameCandidate(prevName) > 0) {
              name = prevName;
              nameLineIndex = i - 1;
              break;
            }
          }
        }
      }
    }
  }

  // Academic name fallback: scan first 10 lines for a high-quality standalone name
  if (!name) {
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (/(?:Board|Roll|Marks|Total|Obtained|Grade|Result|College|School|Institution|Examination|Session|Annual|Supplementary)/i.test(line)) continue;
      if (/(?:Father|Husband|Mother|Guardian|S\/O|D\/O|W\/O)/i.test(line)) continue;
      const cand = cleanNameCandidate(line);
      if (cand && cand.split(' ').length >= 2 && scoreNameCandidate(cand) > 0) {
        name = cand;
        nameLineIndex = i;
        break;
      }
    }
  }

  // Extract father name from academic certificate (Multi-candidate with Dictionary Scoring)
  let fatherName = null;
  const isDifferentFromCandidate = (cand) => {
    if (!cand) return false;
    if (!name) return true;
    return cand.toLowerCase() !== name.toLowerCase();
  };

  const isAcademicFatherLine = (lineStr) => {
    if (!lineStr) return false;
    if (/(?:Board\s+of|Examination|Secondary|Higher|Intermediate|Roll\s*No|Total|Obtained|Marks|Grade|Result|Date|Birth|CNIC|Identity|Gender|Institution|School|College)\b/i.test(lineStr)) {
      return false;
    }
    return /(?:Father(?:[''`]?s)?(?:\s*[\/\&]\s*(?:Husband|Guardian|Mother)(?:[''`]?s)?)?|Husband(?:[''`]?s)?|Guardian(?:[''`]?s)?|Parent(?:[''`]?s)?|Name\s*of\s*Father|FatherName|FathersName|F\/Name|F\.Name|FName|F\s*Name|Walad|Waldiat|S\/O|D\/O|W\/O|S\.O|D\.O|W\.O|Son\s+of|Daughter\s+of)\b/i.test(lineStr);
  };

  const academicFatherCandidates = [];

  // Strategy 1: Same line extraction
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isAcademicFatherLine(line)) {
      const sameLineCand = cleanNameCandidate(line);
      if (sameLineCand) {
        academicFatherCandidates.push({ name: sameLineCand, score: scoreNameCandidate(sameLineCand), strategy: '1' });
      }
    }
  }

  // Strategy 2: Multi-line lookahead
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isAcademicFatherLine(line)) {
      for (let j = 1; j <= 6; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/^[0-9\s.\-\/:]+$/.test(nextLine)) continue;
        if (/(?:Roll\s*No|Marks|Board|Examination|Total|Obtained|Grade|Result|Institution|School|College)/i.test(nextLine)) break;
        const cand = cleanNameCandidate(nextLine);
        if (cand) {
          academicFatherCandidates.push({ name: cand, score: scoreNameCandidate(cand), strategy: '2' });
        }
      }
      break;
    }
  }

  // Strategy 3: Fallback regex scan for Father Name in academic documents
  const academicRegexPatterns = [
    /(?:Father(?:[''`]?s)?(?:\s*[\/\&]\s*(?:Husband|Guardian)(?:[''`]?s)?)?|Husband(?:[''`]?s)?|Guardian(?:[''`]?s)?|Parent(?:[''`]?s)?|F\/Name|F\.Name|FName|Walad|Waldiat|S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of)[\s:\-._\n\r]+([A-Za-z\s]{2,40})/gi,
    /(?:Father|Guardian|Parent)[\s\S]{1,50}?([A-Z][a-zA-Z]*(?:\s+[A-Za-z]+){0,3})/gi
  ];
  for (const pat of academicRegexPatterns) {
    const matches = [...cleanText.matchAll(pat)];
    for (const m of matches) {
      if (m && m[1]) {
        const cand = cleanNameCandidate(m[1]);
        if (cand && isDifferentFromCandidate(cand)) {
          academicFatherCandidates.push({ name: cand, score: scoreNameCandidate(cand), strategy: '3' });
        }
      }
    }
  }

  if (academicFatherCandidates.length > 0) {
    const seen = new Set();
    const unique = academicFatherCandidates.filter(c => {
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    unique.sort((a, b) => b.score - a.score);
    fatherName = unique[0].name;
  }

  // Extract subject marks
  const subjects = extractSubjectMarks(text);

  // Cross-validate total obtained marks with subject marks
  if (subjects.length > 0) {
    const sumMarks = subjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
    // If the extracted obtained_marks is missing or completely wrong, but the sum makes sense:
    if (!obtainedMarks || (Math.abs(obtainedMarks - sumMarks) > 50 && sumMarks > 100 && sumMarks <= (totalMarks || 1200))) {
      obtainedMarks = sumMarks;
    }
  }

  // Extract Intermediate Qualification (always attempt — autoFillFromOCR gates on user-selected docType)
  let interQualification = null;
  // The group is printed against its own label. Scanning the whole page instead matched
  // the words "COMPUTER SCIENCE" in the subject table and reported ICS for a candidate
  // whose group is GENERAL SCIENCE -- and the qualification decides eligibility.
  // Not every board prints a GROUP label -- Lahore sets the group on its own line under
  // the exam title. Where there is no label, the page is searched with the subject table
  // removed first, because a General Science candidate sits COMPUTER SCIENCE as a subject
  // and matching it reported them as ICS. A subject row carries its marks; the group line
  // never does, so the marks are what tell them apart.
  const groupLabel = cleanText.match(/\bGROUP\b\s*[:\-]?\s*([A-Za-z][A-Za-z \-\.]{3,32})/i);
  const withoutSubjectRows = cleanText
    .split('\n')
    .filter(line => {
      if (/\d{2,3}\s+\d{2,3}\b/.test(line)) return false;   // "200 178" -- maximum and obtained
      if (/^\W*\d{1,2}\s*[.)]\s/.test(line)) return false;  // "7. COMPUTER SCIENCE"
      if (/\bTOTAL\b/i.test(line)) return false;            // the totals row
      return true;
    })
    .join('\n');
  const qt = (groupLabel ? groupLabel[1] : withoutSubjectRows).toLowerCase();
  if (/\b(?:computer\s*sciences?|ics)\b/i.test(qt)) {
    interQualification = 'ICS';
  } else if (/\b(?:pre\s*[-_]?\s*engineering|engineering\s*group)\b/i.test(qt)) {
    interQualification = 'FSc Pre-Engineering';
  } else if (/\b(?:pre\s*[-_]?\s*medical|medical\s*group)\b/i.test(qt)) {
    interQualification = 'FSc Pre-Medical';
  } else if (/\b(?:commerce|i\s*\.?\s*com|intermediate\s+commerce)\b/i.test(qt)) {
    interQualification = 'I.Com';
  } else if (/\b(?:dae|diploma\s+of\s+associate\s+engineering)\b/i.test(qt)) {
    interQualification = 'DAE';
  } else if (/\b(?:general\s*science)\b/i.test(qt)) {
    interQualification = 'General Science';
  } else if (/\b(?:arts|humanities|faculty\s+of\s+arts|f\s*\.?\s*a\s*\.?)\b/i.test(qt)) {
    interQualification = 'FA';
  }
  console.log('[OCR] Extracted inter_qualification:', interQualification);

  return {
    document_level: documentLevel,
    percentage: percentage,
    percentage_source: percentageSource,
    grade: grade,
    passing_year: passingYear,
    board: board,
    roll_number: rollNumber,
    obtained_marks: obtainedMarks,
    total_marks: totalMarks,
    subjects: subjects,
    name: name,
    name_verification_needed: academicNameNeedsVerification || undefined,
    father_name: fatherName,
    inter_qualification: interQualification,
    raw_text: text
  };
};

// ===== Cross-Document Name Verification =====
const normalizeNameForComparison = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const namesMatch = (name1, name2) => {
  if (!name1 || !name2) return true;
  const n1 = normalizeNameForComparison(name1);
  const n2 = normalizeNameForComparison(name2);
  if (!n1 || !n2) return true;

  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  const tokens1 = n1.split(' ').filter(t => t.length > 2);
  const tokens2 = n2.split(' ').filter(t => t.length > 2);
  if (tokens1.length === 0 || tokens2.length === 0) return true;

  const sharedTokens = tokens1.filter(t => tokens2.includes(t));
  if (sharedTokens.length >= 1) return true;

  return false;
};

// ===== Cross-Document Identity Verification =====
const crossDocumentVerification = (currentDocType, currentExtractedData, uploadedFiles, userProfile) => {
  const warnings = [];
  let rejectCurrentDoc = false;
  const removeIndices = [];

  if (!currentExtractedData) return { warnings, rejectCurrentDoc, removeIndices };

  const currentName = currentExtractedData.name || null;
  const currentFatherName = currentExtractedData.father_name || null;

  const docTypeLabels = {
    cnic: 'CNIC / B-Form',
    matric: 'Matric Certificate',
    intermediate: 'Intermediate Certificate',
    transcript: 'Transcript / Mark Sheet',
    photograph: 'Photograph',
    domicile: 'Domicile Certificate'
  };
  const currentLabel = docTypeLabels[currentDocType] || 'Document';

  if (userProfile?.full_name && currentName) {
    if (!namesMatch(currentName, userProfile.full_name)) {
      warnings.push(`Candidate name detected as "${currentName}" on ${currentLabel}, which differs from your account profile ("${userProfile.full_name}"). Image blur, camera glare, or dark lighting usually causes OCR to misread printed text.`);
      if (currentDocType !== 'cnic' && currentDocType !== 'matric' && currentDocType !== 'intermediate') rejectCurrentDoc = true;
    }
  }
  if (userProfile?.father_name && currentFatherName) {
    if (!namesMatch(currentFatherName, userProfile.father_name)) {
      warnings.push(`Father's name detected as "${currentFatherName}" on ${currentLabel}, which differs from your registered father's name ("${userProfile.father_name}"). If the document picture is blurry, printed text may be misread.`);
      if (currentDocType !== 'cnic' && currentDocType !== 'matric' && currentDocType !== 'intermediate') rejectCurrentDoc = true;
    }
  }

  uploadedFiles.forEach((file, index) => {
    if (!file.extractedData) return;
    const existingData = file.extractedData;
    const existingLabel = docTypeLabels[file.type] || 'Uploaded Document';

    if (currentName && existingData.name) {
      if (!namesMatch(currentName, existingData.name)) {
        warnings.push(`Candidate name extracted from ${currentLabel} ("${currentName}") differs from ${existingLabel} ("${existingData.name}"). Ensure images are clear and readable.`);
      }
    }

    if (currentFatherName && existingData.father_name) {
      if (!namesMatch(currentFatherName, existingData.father_name)) {
        warnings.push(`Father's name extracted from ${currentLabel} ("${currentFatherName}") differs from ${existingLabel} ("${existingData.father_name}"). Please verify image clarity.`);
      }
    }
  });

  return { warnings, rejectCurrentDoc, removeIndices };
};

/**
 * Canvas preprocessing for Tesseract.
 *
 * Benchmarked against the previous implementation (upscale to 2400px, contrast
 * stretch, local adaptive threshold, 3x3 sharpen) over five real certificates:
 * that pipeline recovered 34 of 38 printed values at 48.0 avg confidence in
 * 12.8s. Plain grayscale at a moderate resolution recovered 37 of 38 at 52.8
 * confidence in 9.6s. The aggressive filtering was destroying detail on phone
 * photos rather than recovering it, so it has been removed.
 *
 *   mode 'gray'   - grayscale only. Default, and the best performer.
 *   mode 'binary' - grayscale + global Otsu threshold. Used for the second pass
 *                   so the two passes actually see different images.
 *
 * Deskew was tested and is deliberately absent: measured skew on real uploads was
 * 0.00-2.25 degrees and rotating made results slightly worse. Revisit only if
 * genuinely tilted uploads appear in practice.
 */
const OCR_TARGET_WIDTH = 2200;
const OCR_MIN_WIDTH = 1000;

const otsuThreshold = (gray) => {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
};

const preprocessImageForOcr = (imageOrCanvas, mode = 'gray') => {
  const binarize = mode === 'binary' || mode === 'grayscale';
  return new Promise((resolve) => {
    const processCanvas = (srcCanvas) => {
      try {
        const srcWidth = srcCanvas.width || 1;
        const srcHeight = srcCanvas.height || 1;

        // Resize toward a moderate width. Large phone photos are scaled DOWN,
        // which is what the benchmark rewarded; small images are scaled up a
        // little so glyphs are not below Tesseract's usable x-height.
        let scale = 1;
        if (srcWidth > OCR_TARGET_WIDTH) scale = OCR_TARGET_WIDTH / srcWidth;
        else if (srcWidth < OCR_MIN_WIDTH) scale = OCR_MIN_WIDTH / srcWidth;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = Math.max(1, Math.round(srcWidth * scale));
        outCanvas.height = Math.max(1, Math.round(srcHeight * scale));

        const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, outCanvas.width, outCanvas.height);

        const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
        const d = imgData.data;
        const numPixels = outCanvas.width * outCanvas.height;

        const gray = new Uint8Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
          const idx = i * 4;
          gray[i] = (0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2]) | 0;
        }

        if (binarize) {
          const threshold = otsuThreshold(gray);
          for (let i = 0; i < numPixels; i++) {
            const idx = i * 4;
            const v = gray[i] < threshold ? 0 : 255;
            d[idx] = d[idx + 1] = d[idx + 2] = v;
          }
        } else {
          for (let i = 0; i < numPixels; i++) {
            const idx = i * 4;
            d[idx] = d[idx + 1] = d[idx + 2] = gray[i];
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(outCanvas);
      } catch (err) {
        console.warn('Preprocessing failed, using original canvas:', err);
        resolve(srcCanvas);
      }
    };

    if (imageOrCanvas instanceof HTMLCanvasElement) {
      processCanvas(imageOrCanvas);
    } else {
      const img = new Image();
      const url = URL.createObjectURL(imageOrCanvas);
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width || 1200;
        tempCanvas.height = img.height || 1200;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        processCanvas(tempCanvas);
      };
      img.onerror = () => resolve(imageOrCanvas);
      img.src = url;
    }
  });
};

// Extract text from PDF: digital text directly or OCR via canvas rendering
const extractTextFromPDF = async (file, onProgress) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js library is not loaded. Please refresh the page.');
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  // 1. Try digital text extraction first
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  if (fullText.trim().length > 50) {
    console.log('Extracted digital text directly from PDF');
    return { text: fullText, confidence: 100 };
  }

  // 2. Scanned PDF fallback: render pages to canvas and run Tesseract OCR
  console.log('Scanned PDF detected. Rendering to canvas and running OCR...');
  let ocrText = '';
  let totalConfidence = 0;
  const pageCount = pdf.numPages;

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    const processedCanvas = await preprocessImageForOcr(canvas);

    const result = await Tesseract.recognize(processedCanvas, 'eng', {
      tessedit_pageseg_mode: '6',
      logger: m => {
        if (onProgress && m.status === 'recognizing text') {
          const overallProgress = ((i - 1) / pageCount) + (m.progress / pageCount);
          onProgress(overallProgress);
        }
      }
    });

    ocrText += (result?.data?.text || '') + '\n';
    totalConfidence += result?.data?.confidence || 0;
  }

  return {
    text: ocrText,
    confidence: Math.round(totalConfidence / pageCount)
  };
};

// ===== Numeric Plausibility Gate =====
// Clarity and document-type checks only test whether fields are PRESENT. This tests
// whether they AGREE. Without it, a document reporting 1% while carrying 972/1100
// marks passes every check and is written to the database, where it decides merit rank.
const ACADEMIC_TOTAL_MIN = 100;
const ACADEMIC_TOTAL_MAX = 2000;

const validateAcademicPlausibility = (docType, data) => {
  if (docType !== 'matric' && docType !== 'intermediate') {
    return { isValid: true, reason: null };
  }
  const d = data || {};
  const missing = v => v === null || v === undefined || v === '';
  const obtained = Number(d.obtained_marks);
  const total = Number(d.total_marks);
  const pct = Number(d.percentage);

  if (missing(d.obtained_marks) || missing(d.total_marks) ||
    !Number.isFinite(total) || !Number.isFinite(obtained)) {
    return { isValid: false, reason: 'Obtained and total marks could not be read reliably from this document. Please upload a clearer, straight-on photo.' };
  }
  if (total < ACADEMIC_TOTAL_MIN || total > ACADEMIC_TOTAL_MAX) {
    return { isValid: false, reason: `Total marks read as ${total}, which is outside the expected range. Please upload a clearer image.` };
  }
  if (obtained < 0 || obtained > total) {
    return { isValid: false, reason: `Obtained marks (${obtained}) cannot exceed total marks (${total}). Please upload a clearer image.` };
  }
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
    return { isValid: false, reason: 'Percentage could not be determined from this document. Please upload a clearer image.' };
  }

  // The percentage must agree with the marks it was derived from.
  const expected = (obtained / total) * 100;
  if (Math.abs(pct - expected) > 0.5) {
    return {
      isValid: false,
      reason: `Percentage (${pct}%) does not match the marks read from this document (${obtained}/${total} = ${expected.toFixed(2)}%). Please upload a clearer image.`
    };
  }

  const year = Number(d.passing_year);
  if (d.passing_year && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1)) {
    return { isValid: false, reason: `Passing year read as ${d.passing_year}, which is not a valid year. Please upload a clearer image.` };
  }

  const subjectSum = Array.isArray(d.subjects)
    ? d.subjects.map(s => Number(s.obtainedMarks)).filter(Number.isFinite).reduce((a, b) => a + b, 0)
    : 0;
  if (subjectSum > total) {
    return { isValid: false, reason: 'Subject marks add up to more than the total marks on this document. Please upload a clearer image.' };
  }

  return { isValid: true, reason: null };
};

// ===== Two-pass merge =====
// Tesseract's reported confidence measures glyph certainty, not whether the right
// fields were found. Selecting a whole pass on confidence loses good fields: in
// testing, a pass that scored 41 vs 34 dropped the roll number entirely and changed
// obtained marks from 972 to 688. Fields are therefore merged individually, and a
// value is only taken when it is independently plausible.
const FIELD_IS_VALID = {
  cnic: v => /^\d{5}-\d{7}-\d$/.test(String(v || '')),
  date_of_birth: v => /^\d{2}\/\d{2}\/\d{4}$/.test(String(v || '')),
  gender: v => v === 'male' || v === 'female',
  name: v => /^[A-Za-z][A-Za-z .'-]{2,}$/.test(String(v || '')) && String(v).trim().split(/\s+/).length <= 5,
  father_name: v => /^[A-Za-z][A-Za-z .'-]{2,}$/.test(String(v || '')) && String(v).trim().split(/\s+/).length <= 5,
  board: v => typeof v === 'string' && v.trim().length > 3,
  roll_number: v => /^\d{4,10}$/.test(String(v || '')),
  passing_year: v => {
    const y = Number(v);
    return Number.isInteger(y) && y >= 1950 && y <= new Date().getFullYear() + 1;
  },
  obtained_marks: v => Number.isFinite(Number(v)) && Number(v) >= 0,
  total_marks: v => {
    const t = Number(v);
    return Number.isFinite(t) && t >= ACADEMIC_TOTAL_MIN && t <= ACADEMIC_TOTAL_MAX;
  },
  percentage: v => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) <= 100,
  subjects: v => Array.isArray(v) && v.length > 0
};

const isFieldValid = (key, value) => {
  if (value === null || value === undefined || value === '') return false;
  const check = FIELD_IS_VALID[key];
  return check ? check(value) : true;
};

const countValidFields = (data) =>
  Object.entries(data || {}).filter(([k, v]) => k !== 'raw_text' && isFieldValid(k, v)).length;

const mergeExtractionPasses = (primary, secondary) => {
  if (!secondary) return { ...primary };
  const merged = { ...primary };
  const keys = new Set([...Object.keys(primary || {}), ...Object.keys(secondary || {})]);

  const NAME_FIELDS = new Set(['name', 'father_name']);

  keys.forEach(key => {
    if (key === 'raw_text') return;
    const a = primary ? primary[key] : undefined;
    const b = secondary[key];

    // Names are both valid-looking far more often than they are equal: one pass reads
    // "Muhammad Zahid" and the other "Muhammad Zawid", and a shape check cannot tell
    // them apart. Where both passes produced a usable name and they disagree, prefer
    // the one with more recognised name parts -- that is real corroboration rather
    // than a coin toss on which pass ran first.
    if (NAME_FIELDS.has(key) && isFieldValid(key, a) && isFieldValid(key, b) && a !== b) {
      if (scoreNameCandidate(b) > scoreNameCandidate(a)) merged[key] = b;
      return;
    }

    if (isFieldValid(key, a)) return;              // primary already good, keep it
    if (isFieldValid(key, b)) { merged[key] = b; return; }
    if ((a === null || a === undefined || a === '') && b !== undefined) merged[key] = b;
  });

  // Marks may now come from different passes, so the percentage is re-derived to
  // keep the record internally consistent.
  const obtained = Number(merged.obtained_marks);
  const total = Number(merged.total_marks);
  if (Number.isFinite(obtained) && Number.isFinite(total) && total > 0) {
    merged.percentage = parseFloat(((obtained / total) * 100).toFixed(2));
    merged.percentage_source = 'computed';
  }
  return merged;
};

// ===== Document Quality & Clarity Validator =====
const validateDocumentClarity = (docType, extractedData, confidence, rawText) => {
  const cleanLen = (rawText || '').trim().length;

  // 1. Text length check: if less than 20 characters extracted, image is unreadable
  if (cleanLen < 20) {
    return {
      isValid: false,
      reason: 'The uploaded image is too blurry or low resolution. Very little text could be read. Please upload a clear, focused photo.'
    };
  }

  // 2. Document-specific required key fields.
  //
  // Mean OCR confidence is deliberately NOT a rejection criterion. On an identity card
  // the average is dominated by the guilloche and hologram background, which Tesseract
  // reads as dozens of junk words: measured on a real card, the actual field words
  // averaged 94 while the background averaged 34, with 62% of all words below 40. A
  // clean, correctly-read CNIC therefore scores in the 30s and a fixed cutoff rejects
  // good uploads. Whether the required fields came out is the criterion; the confidence
  // figure is reported alongside a failure to help explain it, never to cause one.
  const clarityHint = confidence > 0 && confidence < 35
    ? ` (OCR confidence was low, ${Math.round(confidence)}%.)`
    : '';

  if (docType === 'cnic') {
    const hasCnic = !!extractedData?.cnic;
    const hasName = !!extractedData?.name;
    const hasDob = !!extractedData?.date_of_birth;

    if (!hasCnic && !(hasName && hasDob)) {
      return {
        isValid: false,
        reason: `Could not read the CNIC number, or a name and date of birth, from this picture.${clarityHint} Please upload a clearer, straight-on photo of your CNIC/B-Form.`
      };
    }
  } else if (docType === 'matric') {
    const hasObtMarks = extractedData?.obtained_marks !== null && extractedData?.obtained_marks !== undefined;
    const hasTotMarks = extractedData?.total_marks !== null && extractedData?.total_marks !== undefined;
    const hasBoard = !!extractedData?.board;
    const hasYear = !!extractedData?.passing_year;

    if (!hasObtMarks && !hasTotMarks && !hasBoard && !hasYear) {
      return {
        isValid: false,
        reason: 'Could not read Matric result card details (marks, board, or passing year). The image is not clear enough. Please upload a clear image of your Matric certificate.'
      };
    }
  } else if (docType === 'intermediate' || docType === 'transcript') {
    const hasObtMarks = extractedData?.obtained_marks !== null && extractedData?.obtained_marks !== undefined;
    const hasTotMarks = extractedData?.total_marks !== null && extractedData?.total_marks !== undefined;
    const hasBoard = !!extractedData?.board;
    const hasYear = !!extractedData?.passing_year;

    if (!hasObtMarks && !hasTotMarks && !hasBoard && !hasYear) {
      return {
        isValid: false,
        reason: 'Could not read Intermediate result card details (marks, board, or passing year). Please upload a clear, high-resolution document image.'
      };
    }
  }

  return { isValid: true, reason: null };
};

const verifyAcademicDocument = (docType, extractedData, confidence, rawText) => {
  if (docType !== 'matric' && docType !== 'intermediate') {
    return { isValid: true, reason: null };
  }

  const text = String(rawText || '').toLowerCase();
  const expectedMarkers = docType === 'matric'
    ? /secondary\s+school\s+certificate|\bmatric(?:ulation)?\b|\bssc\b|10th\s+class|grade\s*x\b/i
    : /\bintermediate\b|higher\s+secondary\s+certificate|\bhssc\b|12th\s+class|f\.?\s*sc|f\.?\s*a\b|i\.?\s*cs|i\.?\s*com/i;
  const oppositeMarkers = docType === 'matric'
    ? /\bintermediate\b|higher\s+secondary\s+certificate|\bhssc\b|12th\s+class|f\.?\s*sc|f\.?\s*a\b|i\.?\s*cs|i\.?\s*com/i
    : /secondary\s+school\s+certificate|\bmatric(?:ulation)?\b|\bssc\b|10th\s+class|grade\s*x\b/i;
  const detectedLevel = extractedData?.document_level;
  const hasExpectedLevel = detectedLevel === docType;
  const hasOppositeLevel = detectedLevel !== docType;
  const hasAcademicStructure = Boolean(
    extractedData?.board ||
    extractedData?.passing_year ||
    extractedData?.obtained_marks !== null && extractedData?.obtained_marks !== undefined ||
    extractedData?.total_marks !== null && extractedData?.total_marks !== undefined ||
    extractedData?.subjects?.length
  );
  const hasConsistentMarks = (
    extractedData?.obtained_marks === null || extractedData?.obtained_marks === undefined ||
    extractedData?.total_marks === null || extractedData?.total_marks === undefined ||
    (Number(extractedData.obtained_marks) >= 0 && Number(extractedData.total_marks) > 0 &&
      Number(extractedData.obtained_marks) <= Number(extractedData.total_marks))
  );
  const passingYear = Number(extractedData?.passing_year);
  const hasValidPassingYear = !extractedData?.passing_year ||
    (Number.isInteger(passingYear) && passingYear >= 1900 && passingYear <= new Date().getFullYear() + 1);
  const subjectMarks = Array.isArray(extractedData?.subjects)
    ? extractedData.subjects.map(subject => Number(subject.obtainedMarks)).filter(Number.isFinite)
    : [];
  const hasConsistentSubjectTotals = subjectMarks.length === 0 ||
    !Number.isFinite(Number(extractedData?.total_marks)) ||
    subjectMarks.reduce((sum, marks) => sum + marks, 0) <= Number(extractedData.total_marks);
  // Mean OCR confidence is a poor proxy for correctness on these documents: the
  // watermarks and borders generate many low-confidence junk words that drag the
  // average down even when every field read cleanly. The plausibility gate checks the
  // numbers against each other instead, which is the check that actually matters, so
  // only a genuinely unreadable scan is excluded here.
  const hasSufficientConfidence = confidence === 0 || confidence >= 15;

  if (hasOppositeLevel || (oppositeMarkers.test(text) && !expectedMarkers.test(text))) {
    return {
      isValid: false,
      reason: docType === 'matric'
        ? 'Invalid document. Please upload your Matric/SSC certificate.'
        : 'Invalid document. Please upload your Intermediate/HSSC certificate.'
    };
  }

  if (!hasExpectedLevel || !hasAcademicStructure || !hasConsistentMarks ||
    !hasValidPassingYear || !hasConsistentSubjectTotals || !hasSufficientConfidence) {
    return {
      isValid: false,
      reason: docType === 'matric'
        ? 'Document verification failed. Please upload the original, unedited Matric/SSC document.'
        : 'Document verification failed. Please upload the original, unedited Intermediate/HSSC document.'
    };
  }

  return { isValid: true, reason: null };
};
// ===== End OCR Helpers =====

// Dictionary of common Urdu names to standard English spelling
const URDU_TO_ENGLISH_NAMES = {
  'محمد': 'Muhammad',
  'احمد': 'Ahmed',
  'علی': 'Ali',
  'حسن': 'Hassan',
  'حسین': 'Hussain',
  'خان': 'Khan',
  'زاہد': 'Zahid',
  'عمر': 'Umar',
  'عثمان': 'Usman',
  'ابوبکر': 'Abu Bakr',
  'بلال': 'Bilal',
  'حمزہ': 'Hamza',
  'طارق': 'Tariq',
  'طاہر': 'Tahir',
  'راشد': 'Rashid',
  'ساجد': 'Sajid',
  'ماجد': 'Majid',
  'ناصر': 'Nasir',
  'عامر': 'Aamir',
  'فاروق': 'Farooq',
  'سلمان': 'Salman',
  'عمران': 'Imran',
  'عرفان': 'Irfan',
  'کامران': 'Kamran',
  'ریحان': 'Rehan',
  'فیصل': 'Faisal',
  'رضوان': 'Rizwan',
  'عدنان': 'Adnan',
  'ارسلان': 'Arslan',
  'وقاص': 'Waqas',
  'وقار': 'Waqar',
  'یاسر': 'Yasir',
  'شاہ': 'Shah',
  'شاہ زیب': 'Shahzaib',
  'شہزاد': 'Shehzad',
  'خالد': 'Khalid',
  'شاہد': 'Shahid',
  'نوید': 'Naveed',
  'ندیم': 'Nadeem',
  'وسیم': 'Waseem',
  'نعیم': 'Naeem',
  'سلیم': 'Saleem',
  'کلیم': 'Kaleem',
  'رحمان': 'Rehman',
  'عبدالرحمان': 'Abdul Rehman',
  'عبداللہ': 'Abdullah',
  'عبدالعزیز': 'Abdul Aziz',
  'غلام': 'Ghulam',
  'ضیاء': 'Zia',
  'محبوب': 'Mehboob',
  'افتخار': 'Iftikhar',
  'اصغر': 'Asghar',
  'اکبر': 'Akbar',
  'انور': 'Anwar',
  'اقبال': 'Iqbal',
  'اسلم': 'Aslam',
  'اکرم': 'Akram',
  'امجد': 'Amjad',
  'اشرف': 'Ashraf',
  'افضل': 'Afzal',
  'اعجاز': 'Aijaz',
  'فاطمہ': 'Fatima',
  'عائشہ': 'Ayesha',
  'مریم': 'Maryam',
  'زینب': 'Zainab',
  'خدیجہ': 'Khadija',
  'حفصہ': 'Hafsa',
  'صائمہ': 'Saima',
  'نائلہ': 'Naila',
  'بی بی': 'Bibi',
  'بیگم': 'Begum',
  'سعدیہ': 'Sadia',
  'شازیہ': 'Shazia',
  'نادیہ': 'Nadia',
  'روبینہ': 'Rubina',
  'فرزانہ': 'Farzana',
  'شبانہ': 'Shabana',
  'طاہرہ': 'Tahira',
  'عاصمہ': 'Asma',
  'ثمینہ': 'Samina',
  'کلثوم': 'Kulsoom',
  'رضیہ': 'Razia',
  'پروین': 'Parveen',
  'نسرین': 'Nasreen',
  'سلمیٰ': 'Salma',
  'عظمیٰ': 'Uzma',
  'بشریٰ': 'Bushra',
  'صغریٰ': 'Sughra',
  'کبریٰ': 'Kubra',
  'طیبہ': 'Tayyaba',
  'حرا': 'Hira',
  'اقراء': 'Iqra',
  'سدرہ': 'Sidra',
  'کومل': 'Komal',
  'ثناء': 'Sana',
  'حنا': 'Hina',
  'ماہ نور': 'Mahnoor',
  'ایمن': 'Aiman',
  'مصباح': 'Misbah'
};

const sanitizeToEnglishName = (name) => {
  if (!name) return '';
  let str = String(name).trim();
  if (/[\u0600-\u06FF]/.test(str)) {
    const parts = str.split(/\s+/).map(p => {
      const clean = p.replace(/[^\u0600-\u06FF]/g, '');
      return URDU_TO_ENGLISH_NAMES[clean] || clean;
    });
    str = parts.join(' ').replace(/[\u0600-\u06FF]/g, '').trim();
  }
  const cleaned = cleanNameCandidate(str);
  if (cleaned) return cleaned;
  return str.replace(/[^A-Za-z\s.\-']/g, '').replace(/\s+/g, ' ').trim();
};

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const DocumentUpload = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState('cnic');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processingFile, setProcessingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const fileInputRef = useRef(null);
  const [formErrors, setFormErrors] = useState({});
  const formRefs = useRef({});

  // Formal Document Rejection Modal state
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    title: 'Document Image Rejected',
    reason: '',
    docTypeLabel: ''
  });

  // Declaration checkboxes
  const [declarations, setDeclarations] = useState({
    confirmCorrect: false,
    understandFalseInfo: false
  });

  // Admission form state
  const [formData, setFormData] = useState({
    // Personal Information
    full_name: '',
    father_name: '',
    date_of_birth: '',
    gender: '',
    cnic: '',
    // Contact Information
    email: '',
    phone: '',
    alternate_phone: '',
    father_phone: '',
    address: '',
    permanent_address: '',
    // Academic Information - Matric
    matric_passing_year: '',
    matric_obtained_marks: '',
    matric_total_marks: '',
    // Academic Information - Intermediate
    inter_passing_year: '',
    inter_obtained_marks: '',
    inter_total_marks: '',
    inter_qualification: ''
  });

  // Track which fields were auto-filled by OCR
  const [ocrFilledFields, setOcrFilledFields] = useState(new Set());

  // Fetch persisted documents from MongoDB
  const fetchUserDocuments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/ocr/my-documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          const docs = data.documents.map(d => ({
            _id: d._id,
            name: d.name,
            type: d.type,
            extractedData: d.extracted_data || d.extractedData || null,
            confidence: d.confidence !== undefined ? d.confidence : 100,
            file_data: d.file_data || null,
            file_url: d.file_url || null,
            uploaded_at: d.uploaded_at || d.created_at
          }));
          setUploadedFiles(docs);

          // Auto-populate formData from existing documents
          docs.forEach(doc => {
            if (doc.extractedData) {
              autoFillFromOCR(doc.extractedData, doc.type);
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching user documents from database:', err);
    }
  }, []);

  useEffect(() => {
    fetchUserDocuments();
  }, [fetchUserDocuments]);

  // Pre-populate form from existing user data (strictly sanitized to English letters)
  useEffect(() => {
    if (user) {
      const cleanFullName = sanitizeToEnglishName(user.full_name);
      const cleanFatherName = sanitizeToEnglishName(user.father_name);
      setFormData(prev => ({
        ...prev,
        full_name: cleanFullName || prev.full_name,
        father_name: cleanFatherName || prev.father_name,
        date_of_birth: user.date_of_birth || prev.date_of_birth,
        gender: user.gender || prev.gender,
        cnic: user.cnic || prev.cnic,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        alternate_phone: user.alternate_phone || prev.alternate_phone,
        father_phone: user.father_phone || prev.father_phone,
        address: user.address || prev.address,
        permanent_address: user.permanent_address || prev.permanent_address,
        matric_passing_year: user.matric_passing_year || prev.matric_passing_year,
        matric_obtained_marks: user.matric_obtained_marks || prev.matric_obtained_marks,
        matric_total_marks: user.matric_total_marks || prev.matric_total_marks,
        inter_passing_year: user.inter_passing_year || prev.inter_passing_year,
        inter_obtained_marks: user.inter_obtained_marks || prev.inter_obtained_marks,
        inter_total_marks: user.inter_total_marks || prev.inter_total_marks,
        inter_qualification: user.inter_qualification || prev.inter_qualification
      }));
    }
  }, [user]);

  const documentTypes = [
    { id: 'cnic', name: 'CNIC / B-Form', icon: CreditCard, desc: 'Identity document', required: true },
    { id: 'photograph', name: 'Recent Photograph', icon: Camera, desc: 'Passport size photo', required: true },
    { id: 'matric', name: 'Matric Certificate', icon: Award, desc: 'SSC / O-Level', required: true },
    { id: 'intermediate', name: 'Intermediate Certificate', icon: GraduationCap, desc: 'HSSC / A-Level', required: true },
    { id: 'transcript', name: 'Transcript', icon: ScrollText, desc: 'Detailed marks', required: false },
    { id: 'domicile', name: 'Domicile Certificate', icon: MapPin, desc: 'Optional', required: false }
  ];

  // Auto-fill form fields based on OCR extracted data and document type (strictly English)
  const autoFillFromOCR = (extractedData, docType) => {
    const newFilledFields = new Set(ocrFilledFields);

    setFormData(prev => {
      const updated = { ...prev };

      if (docType === 'cnic') {
        if (extractedData.name) {
          updated.full_name = sanitizeToEnglishName(extractedData.name);
          newFilledFields.add('full_name');
        }
        if (extractedData.father_name) {
          updated.father_name = sanitizeToEnglishName(extractedData.father_name);
          newFilledFields.add('father_name');
        }
        if (extractedData.date_of_birth) {
          updated.date_of_birth = extractedData.date_of_birth;
          newFilledFields.add('date_of_birth');
        }
        if (extractedData.gender) {
          updated.gender = extractedData.gender;
          newFilledFields.add('gender');
        }
        if (extractedData.cnic) {
          updated.cnic = extractedData.cnic;
          newFilledFields.add('cnic');
        }
        if (extractedData.address) {
          updated.address = extractedData.address;
          newFilledFields.add('address');
          updated.permanent_address = extractedData.address;
          newFilledFields.add('permanent_address');
        }
      }

      if (docType === 'matric') {
        if (extractedData.name && (!updated.full_name || updated.full_name.trim() === '')) {
          updated.full_name = sanitizeToEnglishName(extractedData.name);
          newFilledFields.add('full_name');
        }
        if (extractedData.father_name && (!updated.father_name || updated.father_name.trim() === '')) {
          updated.father_name = sanitizeToEnglishName(extractedData.father_name);
          newFilledFields.add('father_name');
        }
        if (extractedData.passing_year) {
          updated.matric_passing_year = extractedData.passing_year;
          newFilledFields.add('matric_passing_year');
        }
        if (extractedData.obtained_marks !== undefined && extractedData.obtained_marks !== null && extractedData.obtained_marks !== '') {
          updated.matric_obtained_marks = extractedData.obtained_marks.toString();
          newFilledFields.add('matric_obtained_marks');
        }
        if (extractedData.total_marks !== undefined && extractedData.total_marks !== null && extractedData.total_marks !== '') {
          updated.matric_total_marks = extractedData.total_marks.toString();
          newFilledFields.add('matric_total_marks');
        }
      }

      if (docType === 'intermediate' || docType === 'transcript') {
        if (extractedData.name && (!updated.full_name || updated.full_name.trim() === '')) {
          updated.full_name = sanitizeToEnglishName(extractedData.name);
          newFilledFields.add('full_name');
        }
        if (extractedData.father_name && (!updated.father_name || updated.father_name.trim() === '')) {
          updated.father_name = sanitizeToEnglishName(extractedData.father_name);
          newFilledFields.add('father_name');
        }
        if (extractedData.passing_year) {
          updated.inter_passing_year = extractedData.passing_year;
          newFilledFields.add('inter_passing_year');
        }
        if (extractedData.obtained_marks !== undefined && extractedData.obtained_marks !== null && extractedData.obtained_marks !== '') {
          updated.inter_obtained_marks = extractedData.obtained_marks.toString();
          newFilledFields.add('inter_obtained_marks');
        }
        if (extractedData.total_marks !== undefined && extractedData.total_marks !== null && extractedData.total_marks !== '') {
          updated.inter_total_marks = extractedData.total_marks.toString();
          newFilledFields.add('inter_total_marks');
        }
        if (extractedData.inter_qualification) {
          updated.inter_qualification = extractedData.inter_qualification;
          newFilledFields.add('inter_qualification');
        }
      }

      return updated;
    });

    setOcrFilledFields(newFilledFields);
  };

  // ===== Pakistani Phone & CNIC Formatters & Validators =====
  const formatPakistaniPhone = (value) => {
    if (!value) return '';
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length >= 12) {
      digits = '0' + digits.slice(2);
    }
    digits = digits.slice(0, 11);
    if (digits.length <= 4) {
      return digits;
    }
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  };

  const formatPakistaniCnic = (value) => {
    if (!value) return '';
    let digits = value.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) {
      return digits;
    } else if (digits.length <= 12) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    } else {
      return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
    }
  };

  const isValidPakistaniPhone = (value, isOptional = false) => {
    if (!value || value.trim() === '') {
      return isOptional;
    }
    const cleaned = value.trim();
    return /^03[0-9]{2}-[0-9]{7}$/.test(cleaned) || /^03[0-9]{9}$/.test(cleaned);
  };

  // Returns exact form fields and database null fields associated with each document type
  const getDocTypeFieldsToClear = (docType) => {
    if (docType === 'cnic') {
      return {
        formFields: ['father_name', 'date_of_birth', 'gender', 'cnic', 'address', 'permanent_address'],
        dbFields: {
          father_name: null,
          date_of_birth: null,
          gender: null,
          cnic: null,
          address: null,
          permanent_address: null
        }
      };
    }
    if (docType === 'matric') {
      return {
        formFields: ['matric_passing_year', 'matric_obtained_marks', 'matric_total_marks'],
        dbFields: {
          matric_passing_year: null,
          matric_obtained_marks: null,
          matric_total_marks: null
        }
      };
    }
    if (docType === 'intermediate' || docType === 'transcript') {
      return {
        formFields: ['inter_passing_year', 'inter_obtained_marks', 'inter_total_marks', 'inter_qualification'],
        dbFields: {
          inter_passing_year: null,
          inter_obtained_marks: null,
          inter_total_marks: null,
          inter_qualification: null
        }
      };
    }
    return { formFields: [], dbFields: {} };
  };

  // Clear auto-filled form fields for a given document type
  const clearOCRFieldsForDocType = (docType) => {
    const { formFields } = getDocTypeFieldsToClear(docType);

    if (formFields.length > 0) {
      setFormData(prev => {
        const updated = { ...prev };
        formFields.forEach(field => {
          updated[field] = '';
        });
        return updated;
      });

      setOcrFilledFields(prev => {
        const next = new Set(prev);
        formFields.forEach(field => next.delete(field));
        return next;
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles, fileRejections) => {
    if (fileRejections && fileRejections.length > 0) {
      toast.error('Only PDF, PNG, or JPG/JPEG documents are allowed.');
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name);

    if (!isPdf && !isImage) {
      toast.error('Only PDF, PNG, or JPG/JPEG documents are allowed.');
      return;
    }

    setProcessingFile(file);
    setUploading(true);
    setUploadingDocType(documentType);

    try {
      // Read file to Base64 for database persistence and immediate preview
      const base64Data = await readFileAsBase64(file);

      // Photograph doesn't need OCR but still must be a valid format (PDF or image)
      if (documentType === 'photograph') {
        const token = localStorage.getItem('token');
        let savedDoc = null;
        if (token) {
          try {
            const saveRes = await fetch('/api/ocr/upload-document', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: documentType,
                name: file.name,
                file_data: base64Data,
                mime_type: file.type || 'image/jpeg',
                size: file.size,
                extracted_data: {},
                confidence: 100
              })
            });
            if (saveRes.ok) {
              const saveJson = await saveRes.json();
              savedDoc = saveJson.document;
            }
          } catch (saveErr) {
            console.error('Failed to persist photograph to database:', saveErr);
          }
        }

        setUploadedFiles(prev => {
          const filtered = prev.filter(f => f.type !== documentType);
          return [...filtered, {
            _id: savedDoc?._id || `doc-${Date.now()}`,
            name: file.name,
            type: documentType,
            extractedData: null,
            confidence: 100,
            file_data: base64Data,
            uploaded_at: savedDoc?.uploaded_at || new Date()
          }];
        });

        setUser(prev => {
          if (!prev) return prev;
          const current = prev.uploaded_documents || [];
          return current.includes(documentType) ? prev : { ...prev, uploaded_documents: [...current, documentType] };
        });

        toast.success(`${documentTypes.find(d => d.id === documentType)?.name || 'Document'} uploaded`);
        setUploading(false);
        setProcessingFile(null);
        return;
      }

      let extractedText = '';
      let confidence = 0;
      // Holds the per-field merge of pass 1 and pass 2 when a second pass runs.
      let mergedPassData = null;

      if (isPdf) {
        // Extract text/OCR from PDF client-side
        const pdfResult = await extractTextFromPDF(file, (progress) => {
          console.log(`OCR Progress: ${(progress * 100).toFixed(0)}%`);
        });
        extractedText = pdfResult.text;
        confidence = pdfResult.confidence;
      } else {
        // Pass 1: Run Tesseract OCR on the grayscale canvas.
        // PSM 6 ("uniform block of text") beats the default auto-segmentation on
        // certificates, where watermarks and borders confuse layout analysis.
        const processedCanvas = await preprocessImageForOcr(file, 'gray');
        const result = await Tesseract.recognize(processedCanvas, 'eng', {
          tessedit_pageseg_mode: '6',
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress (Pass 1): ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });
        extractedText = result?.data?.text || '';
        confidence = result?.data?.confidence || 0;
        const ocrLines = result?.data?.lines || [];

        // Map document types and check if key fields are missing
        const docCategory = (documentType === 'matric' || documentType === 'intermediate' || documentType === 'transcript')
          ? 'academic' : documentType === 'cnic' ? 'cnic' : 'other';

        let pass1Data = docCategory === 'cnic' ? extractCNICData(extractedText) : extractAcademicData(extractedText);

        // Targeted OCR as fallback for Name if full-text extraction failed
        if (!pass1Data.name) {
          let targetedNameData = await performTargetedFieldOcr(processedCanvas, ocrLines, docCategory, 'name');
          if (targetedNameData && targetedNameData.text && targetedNameData.confidence > 60) {
            const cleanedTargetedName = cleanNameCandidate(targetedNameData.text);
            if (cleanedTargetedName && scoreNameCandidate(cleanedTargetedName) > 0) {
              pass1Data.name = cleanedTargetedName;
              pass1Data.name_verification_needed = true;
              console.log(`[OCR] Used targeted OCR for name: "${cleanedTargetedName}" (confidence: ${Math.round(targetedNameData.confidence)})`);
            } else {
              console.log(`[OCR] Rejected targeted OCR for name: "${targetedNameData.text}" (failed validation)`);
            }
          } else if (targetedNameData && targetedNameData.text) {
            console.log(`[OCR] Rejected targeted OCR for name due to low confidence (${Math.round(targetedNameData.confidence)})`);
          }
        }

        // Targeted OCR as fallback for Father Name if full-text extraction failed
        if (!pass1Data.father_name) {
          let targetedFatherNameData = await performTargetedFieldOcr(processedCanvas, ocrLines, docCategory, 'father_name');
          if (targetedFatherNameData && targetedFatherNameData.text && targetedFatherNameData.confidence > 60) {
            const cleanedTargetedFatherName = cleanNameCandidate(targetedFatherNameData.text);
            if (cleanedTargetedFatherName && scoreNameCandidate(cleanedTargetedFatherName) > 0 && cleanedTargetedFatherName.toLowerCase() !== pass1Data.name?.toLowerCase()) {
              pass1Data.father_name = cleanedTargetedFatherName;
              console.log(`[OCR] Used targeted OCR for father name: "${cleanedTargetedFatherName}" (confidence: ${Math.round(targetedFatherNameData.confidence)})`);
            } else {
              console.log(`[OCR] Rejected targeted OCR for father name: "${targetedFatherNameData.text}" (failed validation)`);
            }
          } else if (targetedFatherNameData && targetedFatherNameData.text) {
            console.log(`[OCR] Rejected targeted OCR for father name due to low confidence (${Math.round(targetedFatherNameData.confidence)})`);
          }
        }

        const pass1Incomplete = (docCategory === 'cnic' && (!pass1Data.cnic || !pass1Data.name)) ||
          (docCategory === 'academic' && (!pass1Data.obtained_marks || !pass1Data.board));

        // Pass 2: If Pass 1 is incomplete or has low confidence, try high-contrast grayscale pass
        if (pass1Incomplete || confidence < 65) {
          try {
            console.log('Running OCR Pass 2 on binarized canvas...');
            const binaryCanvas = await preprocessImageForOcr(file, 'binary');
            const result2 = await Tesseract.recognize(binaryCanvas, 'eng', { tessedit_pageseg_mode: '6' });
            const text2 = result2?.data?.text || '';
            const conf2 = result2?.data?.confidence || 0;

            if (text2 && text2.length > 20) {
              const pass2Data = docCategory === 'cnic' ? extractCNICData(text2) : extractAcademicData(text2);
              const pass1Valid = countValidFields(pass1Data);
              const pass2Valid = countValidFields(pass2Data);
              console.log(`[OCR] valid fields - pass 1: ${pass1Valid}, pass 2: ${pass2Valid}`);

              // Merge per field rather than replacing the whole result, so a pass
              // cannot take away a field the other pass read correctly.
              mergedPassData = mergeExtractionPasses(pass1Data, pass2Data);
              // The raw text of whichever pass produced more valid fields is kept,
              // because the document-type and clarity checks read it.
              if (pass2Valid > pass1Valid) {
                extractedText = text2;
                confidence = Math.max(confidence, conf2);
              }
            }
          } catch (pass2Err) {
            console.warn('Pass 2 OCR notice:', pass2Err);
          }
        }
      }

      if (!extractedText || extractedText.trim().length === 0) {
        toast.error('No text could be extracted from the document. Please ensure it is clear and legible.');
        setUploading(false);
        setProcessingFile(null);
        return;
      }

      // Map document types and run extraction
      const docCategoryFinal = (documentType === 'matric' || documentType === 'intermediate' || documentType === 'transcript')
        ? 'academic' : documentType === 'cnic' ? 'cnic' : 'other';

      let extractedData;
      if (docCategoryFinal === 'cnic') {
        extractedData = extractCNICData(extractedText);
      } else if (docCategoryFinal === 'academic') {
        extractedData = extractAcademicData(extractedText);
      } else {
        extractedData = { ...extractCNICData(extractedText), ...extractAcademicData(extractedText) };
      }

      // When two passes ran, prefer the per-field merge over either pass alone.
      if (mergedPassData) {
        extractedData = mergeExtractionPasses(mergedPassData, extractedData);
        extractedData.raw_text = extractedText;
      }

      // Override fields with targeted extraction ONLY if full-text extraction failed
      if (!isPdf && !extractedData.name && typeof processedCanvas !== 'undefined' && typeof ocrLines !== 'undefined') {
        let targetedNameData = await performTargetedFieldOcr(processedCanvas, ocrLines, docCategoryFinal, 'name');
        if (targetedNameData && targetedNameData.text && targetedNameData.confidence > 60) {
          const cleanedTargetedName = cleanNameCandidate(targetedNameData.text);
          if (cleanedTargetedName && scoreNameCandidate(cleanedTargetedName) > 0) {
            extractedData.name = cleanedTargetedName;
            extractedData.name_verification_needed = true;
            console.log(`[OCR] Fallback: Used targeted OCR for name: "${cleanedTargetedName}"`);
          }
        }
      }

      if (!isPdf && !extractedData.father_name && typeof processedCanvas !== 'undefined' && typeof ocrLines !== 'undefined') {
        let targetedFatherNameData = await performTargetedFieldOcr(processedCanvas, ocrLines, docCategoryFinal, 'father_name');
        if (targetedFatherNameData && targetedFatherNameData.text && targetedFatherNameData.confidence > 60) {
          const cleanedTargetedFatherName = cleanNameCandidate(targetedFatherNameData.text);
          if (cleanedTargetedFatherName && scoreNameCandidate(cleanedTargetedFatherName) > 0 && cleanedTargetedFatherName.toLowerCase() !== extractedData.name?.toLowerCase()) {
            extractedData.father_name = cleanedTargetedFatherName;
            console.log(`[OCR] Fallback: Used targeted OCR for father name: "${cleanedTargetedFatherName}"`);
          }
        }
      }

      // Verify document type/integrity before any document or profile database mutation.
      if (documentType === 'matric' || documentType === 'intermediate') {
        const verification = verifyAcademicDocument(documentType, extractedData, confidence, extractedText);
        if (!verification.isValid) {
          toast.error(verification.reason, { duration: 7000 });
          setUploading(false);
          setProcessingFile(null);
          return;
        }

        // Numbers must agree with each other before anything is stored. The checks
        // above only confirm that fields exist.
        const plausibility = validateAcademicPlausibility(documentType, extractedData);
        if (!plausibility.isValid) {
          console.warn('[OCR] Plausibility gate rejected document:', plausibility.reason, extractedData);
          setRejectionModal({
            isOpen: true,
            badge: 'Data Validation Advisory',
            title: 'Marks Could Not Be Read Reliably',
            reason: plausibility.reason,
            docTypeLabel: documentTypes.find(d => d.id === documentType)?.name || 'Document'
          });
          setUploading(false);
          setProcessingFile(null);
          return;
        }
      }

      // Auto-Reject Blurry / Unreadable Documents with Formal Centered Modal
      const clarityCheck = validateDocumentClarity(documentType, extractedData, confidence, extractedText);
      if (!clarityCheck.isValid) {
        const docLabel = documentTypes.find(d => d.id === documentType)?.name || 'Document';
        setRejectionModal({
          isOpen: true,
          badge: 'Quality & Clarity Advisory',
          title: 'Document Image Unclear',
          reason: clarityCheck.reason,
          docTypeLabel: docLabel
        });
        setUploading(false);
        setProcessingFile(null);
        return;
      }

      // Cross-document identity verification before adding to list
      const { warnings: nameWarnings, rejectCurrentDoc, removeIndices } = crossDocumentVerification(documentType, extractedData, uploadedFiles, user);

      // If document fails identity verification against previously uploaded documents or user profile, show advisory Modal
      if (rejectCurrentDoc) {
        const docLabel = documentTypes.find(d => d.id === documentType)?.name || 'Document';
        const mismatchReason = nameWarnings.length > 0
          ? nameWarnings.join(' ')
          : 'Candidate name or Father\'s name on this document could not be matched with your applicant profile.';

        setRejectionModal({
          isOpen: true,
          badge: 'Document Verification Advisory',
          title: 'Document Unclear or Name Misread',
          reason: mismatchReason,
          docTypeLabel: docLabel
        });
        setUploading(false);
        setProcessingFile(null);
        return;
      }

      // Persist document to MongoDB Database
      const token = localStorage.getItem('token');
      let savedDoc = null;
      if (token) {
        try {
          const saveRes = await fetch('/api/ocr/upload-document', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: documentType,
              name: file.name,
              file_data: base64Data,
              mime_type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
              size: file.size,
              extracted_data: extractedData,
              confidence: confidence
            })
          });
          if (saveRes.ok) {
            const saveJson = await saveRes.json();
            savedDoc = saveJson.document;
          }
        } catch (saveErr) {
          console.error('Failed to persist document to database:', saveErr);
        }
      }

      setUploadedFiles(prev => {
        const filtered = prev.filter(f => f.type !== documentType);
        return [...filtered, {
          _id: savedDoc?._id || `doc-${Date.now()}`,
          name: file.name,
          type: documentType,
          extractedData,
          confidence,
          file_data: base64Data,
          uploaded_at: savedDoc?.uploaded_at || new Date()
        }];
      });

      setUser(prev => {
        if (!prev) return prev;
        const current = prev.uploaded_documents || [];
        return current.includes(documentType) ? prev : { ...prev, uploaded_documents: [...current, documentType] };
      });

      // Auto-fill form fields from OCR data
      autoFillFromOCR(extractedData, documentType);

      toast.success(`${documentTypes.find(d => d.id === documentType)?.name || 'Document'} uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error processing document');
    } finally {
      setUploading(false);
      setProcessingFile(null);
      setUploadingDocType(null);
    }
  }, [documentType, ocrFilledFields, uploadedFiles, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: uploading
  });

  // Handle clicking a document type card: set the type and open file browser
  const handleCardClick = (typeId) => {
    if (uploading) return;
    setDocumentType(typeId);
    // Use a microtask to ensure documentType state is set before triggering file input
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset so same file can be re-selected
        fileInputRef.current.click();
      }
    }, 0);
  };

  // Handle file input change (convert to same flow as onDrop)
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name);
    if (!isPdf && !isImage) {
      toast.error('Only PDF, PNG, or JPG/JPEG documents are allowed.');
      return;
    }
    onDrop([file], []);
  };

  const removeFile = async (index) => {
    const removedFile = uploadedFiles[index];
    if (!removedFile) return;

    const docTypeToRemove = removedFile.type;
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);

    const updatedDocTypeIds = updatedFiles.map(f => f.type);
    const mandatoryTypes = documentTypes.filter(d => d.required);
    const stillHasAllMandatory = mandatoryTypes.every(d => updatedDocTypeIds.includes(d.id));

    const { formFields, dbFields } = getDocTypeFieldsToClear(docTypeToRemove);

    // 1. Clear fields from form state
    setFormData(prev => {
      const updated = { ...prev };
      formFields.forEach(f => {
        updated[f] = '';
      });
      return updated;
    });

    // 2. Remove from OCR filled fields
    setOcrFilledFields(prev => {
      const next = new Set(prev);
      formFields.forEach(f => next.delete(f));
      return next;
    });

    // 3. Prepare payload for DB to clear fields and reset verification
    const dbPayload = {
      ...dbFields,
      is_verified: false,
      uploaded_documents: updatedDocTypeIds
    };

    // 4. Update user in AuthContext immediately
    setUser(prev => prev ? ({ ...prev, ...dbPayload }) : prev);

    // 5. Delete document record from MongoDB Document collection and update User profile
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Delete from Document collection
        await fetch(`/api/ocr/my-documents/type/${docTypeToRemove}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Update User profile in MongoDB
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dbPayload)
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(prev => ({ ...prev, ...data.user }));
          }
        }
      }
    } catch (err) {
      console.error('Error clearing document data from database:', err);
    }

    if (!stillHasAllMandatory) {
      toast.error('Profile is no longer verified. Please upload all required documents to verify your profile.', { duration: 5000 });
    }
  };

  const handleFormChange = (field, value) => {
    let processedValue = value;

    // Strictly enforce English letters for Full Name & Father Name
    if (field === 'full_name' || field === 'father_name') {
      processedValue = sanitizeToEnglishName(value);
    } else if (field === 'phone' || field === 'father_phone' || field === 'alternate_phone') {
      processedValue = formatPakistaniPhone(value);
    } else if (field === 'cnic') {
      processedValue = formatPakistaniCnic(value);
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    // Clear error for this field when user types
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    // If user manually changes an OCR-filled field, remove the OCR indicator
    if (ocrFilledFields.has(field)) {
      setOcrFilledFields(prev => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  const handleSubmitProfile = async () => {
    // Validate all form fields are filled
    const requiredFields = [
      { key: 'full_name', label: 'Full Name' },
      { key: 'father_name', label: "Father's Name" },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'cnic', label: 'CNIC' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'father_phone', label: "Father's Phone" },
      { key: 'address', label: 'Current Address' },
      { key: 'permanent_address', label: 'Permanent Address' },
      { key: 'matric_passing_year', label: 'Matric Passing Year' },
      { key: 'matric_obtained_marks', label: 'Matric Obtained Marks' },
      { key: 'matric_total_marks', label: 'Matric Total Marks' },
      { key: 'inter_passing_year', label: 'Intermediate Passing Year' },
      { key: 'inter_obtained_marks', label: 'Intermediate Obtained Marks' },
      { key: 'inter_total_marks', label: 'Intermediate Total Marks' },
    ];

    const errors = {};
    requiredFields.forEach(f => {
      if (!formData[f.key] || String(formData[f.key]).trim() === '') {
        errors[f.key] = `${f.label} is required.`;
      }
    });

    // Format-specific validation
    if (formData.phone && !isValidPakistaniPhone(formData.phone)) {
      errors.phone = 'Please enter a valid Pakistani Mobile Number (format: 03XX-XXXXXXX).';
    }
    if (formData.father_phone && !isValidPakistaniPhone(formData.father_phone)) {
      errors.father_phone = "Please enter a valid Father's / Guardian Mobile Number (format: 03XX-XXXXXXX).";
    }
    if (formData.alternate_phone && !isValidPakistaniPhone(formData.alternate_phone, true)) {
      errors.alternate_phone = 'Please enter a valid Alternate Mobile Number (03XX-XXXXXXX).';
    }
    if (formData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic.trim())) {
      errors.cnic = 'Please enter a valid CNIC / B-Form Number in format XXXXX-XXXXXXX-X.';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Scroll to first error field
      const firstErrorKey = Object.keys(errors)[0];
      const ref = formRefs.current[firstErrorKey];
      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ref.focus({ preventScroll: true });
      }
      return;
    }

    // Check required documents are uploaded
    const requiredDocs = documentTypes.filter(d => d.required);
    const missingDocs = requiredDocs.filter(d => !uploadedFiles.some(f => f.type === d.id));
    if (missingDocs.length > 0) {
      const docNames = missingDocs.map(d => d.name).join(', ');
      toast.error(`Verification Blocked: All non-optional documents (${docNames}) are mandatory. You must upload them before your profile can be verified and applications submitted.`, { duration: 7000 });
      return;
    }

    if (!declarations.confirmCorrect || !declarations.understandFalseInfo) {
      toast.error('Please accept both declarations before submitting');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      const educationPayload = { matric: {}, intermediate: {} };
      uploadedFiles.forEach(file => {
        if ((file.type === 'matric' || file.extractedData?.document_level === 'matric') && file.extractedData?.subjects) {
          educationPayload.matric.subjects = file.extractedData.subjects;
          educationPayload.matric.totalMarks = file.extractedData.total_marks || formData.matric_total_marks;
          educationPayload.matric.obtainedMarks = file.extractedData.obtained_marks || formData.matric_obtained_marks;
        }
        if ((file.type === 'intermediate' || file.type === 'transcript' || file.extractedData?.document_level === 'intermediate') && file.extractedData?.subjects) {
          educationPayload.intermediate.subjects = file.extractedData.subjects;
          educationPayload.intermediate.totalMarks = file.extractedData.total_marks || formData.inter_total_marks;
          educationPayload.intermediate.obtainedMarks = file.extractedData.obtained_marks || formData.inter_obtained_marks;
        }
      });

      const payload = {
        full_name: sanitizeToEnglishName(formData.full_name),
        phone: formData.phone,
        address: formData.address,
        cnic: formData.cnic,
        father_name: sanitizeToEnglishName(formData.father_name),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        alternate_phone: formData.alternate_phone,
        father_phone: formData.father_phone,
        permanent_address: formData.permanent_address,
        matric_passing_year: formData.matric_passing_year ? parseInt(formData.matric_passing_year) : undefined,
        matric_obtained_marks: formData.matric_obtained_marks ? parseInt(formData.matric_obtained_marks) : undefined,
        matric_total_marks: formData.matric_total_marks ? parseInt(formData.matric_total_marks) : undefined,
        inter_passing_year: formData.inter_passing_year ? parseInt(formData.inter_passing_year) : undefined,
        inter_obtained_marks: formData.inter_obtained_marks ? parseInt(formData.inter_obtained_marks) : undefined,
        inter_total_marks: formData.inter_total_marks ? parseInt(formData.inter_total_marks) : undefined,
        inter_qualification: formData.inter_qualification || undefined,
        is_verified: true,
        uploaded_documents: uploadedFiles.map(f => f.type),
        education: educationPayload
      };

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setUser({ ...user, ...data.user, is_verified: true, uploaded_documents: uploadedFiles.map(f => f.type) });
        toast.success('Profile & all mandatory documents verified successfully!');
        setTimeout(() => {
          navigate('/dashboard/applications');
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  // Union in-memory uploads with persisted user.uploaded_documents from DB
  const uploadedDocTypeIds = Array.from(new Set([
    ...uploadedFiles.map(f => f.type),
    ...(user?.uploaded_documents || [])
  ]));
  // Check if a document type is already uploaded
  const isDocUploaded = (typeId) => uploadedDocTypeIds.includes(typeId);

  // Mandatory document verification computation
  const mandatoryDocTypes = documentTypes.filter(d => d.required);
  const missingMandatoryDocs = mandatoryDocTypes.filter(d => !uploadedDocTypeIds.includes(d.id));
  const isFullyVerified = Boolean(
    user?.is_verified &&
    missingMandatoryDocs.length === 0
  );
  const renderSubjects = (subjects) => {
    if (!subjects || subjects.length === 0) return null;
    return (
      <div className="mt-4 col-span-1 sm:col-span-2">
        <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Extracted Subjects (Auto-Parsed from Document)</h5>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {subjects.map((sub, idx) => (
            <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate" title={sub.name}>{sub.name}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{sub.obtainedMarks} <span className="text-[10px] text-gray-400 font-normal">marks</span></div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Input field helper with OCR indicator
  const renderField = (label, field, type = 'text', options = {}) => {
    const isOcrFilled = ocrFilledFields.has(field);
    const hasError = !!formErrors[field];
    const isRequired = !options.optional;
    return (
      <div className={options.colSpan2 ? 'sm:col-span-2' : ''} ref={el => { formRefs.current[field] = el; }}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {isRequired && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
          {isOcrFilled && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-purple-400 dark:text-purple-300 font-normal">
              <Sparkles className="h-3 w-3" />
              Auto-filled
            </span>
          )}
        </label>
        {type === 'select' ? (
          <select
            value={formData[field] || ''}
            onChange={(e) => handleFormChange(field, e.target.value)}
            disabled={options.disabled}
            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 dark:text-white transition-all ${
              hasError ? 'border-red-500 dark:border-red-400 ring-1 ring-red-500/30' :
              isOcrFilled ? 'border-purple-500/50' : 'border-gray-300 dark:border-gray-600'
            } ${options.disabled ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`}
          >
            <option value="">{options.placeholder || 'Select...'}</option>
            {(options.selectOptions || []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            ref={el => { formRefs.current[field] = el; }}
            type={type}
            value={formData[field] || ''}
            onChange={(e) => handleFormChange(field, e.target.value)}
            placeholder={options.placeholder || ''}
            maxLength={options.maxLength}
            disabled={options.disabled}
            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all ${
              hasError ? 'border-red-500 dark:border-red-400 ring-1 ring-red-500/30' :
              isOcrFilled ? 'border-purple-500/50' : 'border-gray-300 dark:border-gray-600'
            } ${options.disabled ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`}
          />
        )}
        {hasError && (
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {formErrors[field]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Document Upload & Verification</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Upload your documents for automatic data extraction and verify your admission information</p>
      </div>

      {/* Verification Status Card */}
      {isFullyVerified ? (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Profile & Mandatory Documents Verified</h4>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-200/80 mt-0.5">All required non-optional documents have been verified. You can now submit program applications.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 rounded-full text-xs font-semibold whitespace-nowrap">
            Verified
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {missingMandatoryDocs.length > 0
                  ? `Verification Pending — ${missingMandatoryDocs.length} Mandatory Document(s) Missing`
                  : 'Verification Pending — Review & Submit Profile'}
              </h4>
              <p className="text-xs text-amber-600/80 dark:text-amber-200/80 mt-1 leading-relaxed">
                {missingMandatoryDocs.length > 0 ? (
                  <>
                    Please upload the missing mandatory documents:{' '}
                    <span className="font-semibold text-amber-700 dark:text-amber-100">
                      {missingMandatoryDocs.map(d => d.name).join(', ')}
                    </span>
                    . Your profile cannot be verified until all non-optional documents are uploaded.
                  </>
                ) : (
                  'All mandatory documents are uploaded. Please review the auto-filled information below and click "Submit Verified Profile" to complete verification.'
                )}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 rounded-full text-xs font-semibold whitespace-nowrap">
            Verification Pending
          </span>
        </div>
      )}

      {/* Hidden file input for card-click uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Document Type Selection — click a card to upload */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Upload Documents</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click on a document type to upload &bull; Supported: PDF, PNG, JPG (max 10MB)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {documentTypes.map((type) => {
            const Icon = type.icon;
            const uploaded = isDocUploaded(type.id);
            const isProcessing = uploading && uploadingDocType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => handleCardClick(type.id)}
                disabled={uploading}
                className={`p-4 rounded-xl border-2 text-left transition-all relative group ${isProcessing
                  ? 'border-primary-500 bg-primary-50 animate-pulse'
                  : uploaded
                    ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                    : 'border-gray-200 hover:border-primary-500/50 hover:bg-cyan-500/5'
                  } ${uploading && !isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {uploaded && !isProcessing && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  </div>
                )}
                {isProcessing ? (
                  <Loader2 className="h-7 w-7 mb-2 text-primary-600 animate-spin" />
                ) : (
                  <Icon className={`h-7 w-7 mb-2 transition-colors ${uploaded ? 'text-green-400' : 'text-gray-500 group-hover:text-primary-600'}`} />
                )}
                <h4 className={`font-medium text-sm ${isProcessing ? 'text-gray-900 dark:text-white' : uploaded ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                  {isProcessing ? 'Processing...' : type.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isProcessing && processingFile ? processingFile.name : type.desc}
                </p>
                {!type.required && !isProcessing && <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 block">Optional</span>}
                {!uploaded && !isProcessing && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    <Upload className="h-3 w-3" />
                    <span>Click to upload</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Uploaded Documents ({uploadedFiles.length})</h3>
          </div>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={file._id || index} className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary-50 rounded-lg border border-primary-500/20">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{file.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                      {documentTypes.find(t => t.id === file.type)?.name}
                      {file.confidence ? ` • Confidence: ${file.confidence?.toFixed(1)}%` : ''}
                      {file.uploaded_at ? ` • ${new Date(file.uploaded_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeFile(index)}
                    title="Delete document from database"
                    className="p-2 text-red-400 dark:text-red-400 hover:text-red-300 dark:hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-6 border border-primary-500/20 dark:border-primary-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-primary-600 dark:text-primary-400">Tips for Best Results</h4>
            <ul className="text-sm text-primary-700/80 dark:text-primary-300/80 mt-2 space-y-1 list-disc list-inside">
              <li>Ensure documents are clear and well-lit</li>
              <li>Make sure all text is readable and not blurry</li>
              <li>Upload the complete document without cropping</li>
              <li>Supported file formats: PDF, PNG, JPG</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== BASIC ADMISSION FORM ===== */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-30" />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-purple-600 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Basic Admission Form</h2>
                <p className="text-sm text-cyan-100 mt-0.5">
                  Fields marked with <Sparkles className="h-3 w-3 inline text-purple-200" /> are auto-filled from your uploaded documents
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Personal Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-primary-50 rounded-lg border border-primary-500/20">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {renderField('Full Name', 'full_name', 'text', { placeholder: 'Enter full name' })}
                {renderField("Father / Guardian Name", 'father_name', 'text', { placeholder: "Enter father's name" })}
                {renderField('Date of Birth', 'date_of_birth', 'text', { placeholder: 'DD/MM/YYYY' })}
                {renderField('Gender', 'gender', 'select', {
                  placeholder: 'Select gender',
                  selectOptions: [
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]
                })}
                {renderField('CNIC / B-Form Number', 'cnic', 'text', { placeholder: 'XXXXX-XXXXXXX-X', maxLength: 15 })}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Contact Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Phone className="h-4 w-4 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {renderField('Email Address', 'email', 'email', { placeholder: 'student@example.com', disabled: true })}
                {renderField('Mobile Number (Pakistani format)', 'phone', 'tel', { placeholder: '03XX-XXXXXXX', maxLength: 12 })}
                {renderField("Father's / Guardian Mobile Number", 'father_phone', 'tel', { placeholder: '03XX-XXXXXXX', maxLength: 12 })}
                {renderField('Alternate Mobile Number', 'alternate_phone', 'tel', { placeholder: '03XX-XXXXXXX (Optional)', maxLength: 12 })}
                {renderField('Current Address', 'address', 'text', { placeholder: 'Enter current address', colSpan2: true })}
                {renderField('Permanent Address', 'permanent_address', 'text', { placeholder: 'Enter permanent address', colSpan2: true })}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Academic Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <GraduationCap className="h-4 w-4 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Information</h3>
              </div>

              {/* Matric Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-400" />
                  Matric / SSC Details
                </h4>
                <div className="grid sm:grid-cols-2 gap-4 pl-6 border-l-2 border-yellow-500/20">
                  {renderField('Passing Year', 'matric_passing_year', 'number', { placeholder: 'e.g., 2022', disabled: true })}
                  {renderField('Marks Obtained', 'matric_obtained_marks', 'number', { placeholder: 'e.g., 950', disabled: true })}
                  {renderField('Total Marks', 'matric_total_marks', 'number', { placeholder: 'e.g., 1100', disabled: true })}
                  {renderSubjects(uploadedFiles.find(f => f.type === 'matric' || f.extractedData?.document_level === 'matric')?.extractedData?.subjects || user?.education?.matric?.subjects)}
                </div>
              </div>

              {/* Intermediate Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-400" />
                  Intermediate / HSSC Details
                </h4>
                <div className="grid sm:grid-cols-2 gap-4 pl-6 border-l-2 border-blue-500/20">
                  {renderField('Intermediate Qualification', 'inter_qualification', 'text', { placeholder: 'e.g., FSc Pre-Medical', disabled: true })}
                  {renderField('Passing Year', 'inter_passing_year', 'number', { placeholder: 'e.g., 2024', disabled: true })}
                  {renderField('Marks Obtained', 'inter_obtained_marks', 'number', { placeholder: 'e.g., 450', disabled: true })}
                  {renderField('Total Marks', 'inter_total_marks', 'number', { placeholder: 'e.g., 550', disabled: true })}
                  {renderSubjects(uploadedFiles.find(f => f.type === 'intermediate' || f.type === 'transcript' || f.extractedData?.document_level === 'intermediate')?.extractedData?.subjects || user?.education?.intermediate?.subjects)}
                </div>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Declaration */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Declaration</h3>
              </div>
              <div className="space-y-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={declarations.confirmCorrect}
                      onChange={(e) => setDeclarations(prev => ({ ...prev, confirmCorrect: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded border-2 border-gray-400 dark:border-gray-500 peer-checked:bg-cyan-500 peer-checked:border-primary-500 transition-all flex items-center justify-center">
                      {declarations.confirmCorrect && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    I confirm that the extracted information is correct and I have reviewed all the auto-filled fields for accuracy.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={declarations.understandFalseInfo}
                      onChange={(e) => setDeclarations(prev => ({ ...prev, understandFalseInfo: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded border-2 border-gray-400 dark:border-gray-500 peer-checked:bg-cyan-500 peer-checked:border-primary-500 transition-all flex items-center justify-center">
                      {declarations.understandFalseInfo && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    I understand that providing false information may result in cancellation of my admission.
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                onClick={handleSubmitProfile}
                disabled={saving || !declarations.confirmCorrect || !declarations.understandFalseInfo}
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Submit Verified Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formal Centered Educational Verification Advisory Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-indigo-500/20 rounded-2xl shadow-2xl shadow-indigo-950/50 overflow-hidden transform transition-all animate-scaleUp">

            {/* Top Academic Gradient Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-amber-500" />

            <div className="p-6">
              {/* Close Icon Button */}
              <button
                onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex-shrink-0">
                  <ShieldAlert className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/20 mb-1.5">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    {rejectionModal.badge || 'Document Verification Advisory'}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 tracking-tight">
                    {rejectionModal.title || 'Document Unclear or Name Misread'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Target Document: <span className="text-slate-200 font-semibold">{rejectionModal.docTypeLabel}</span>
                  </p>
                </div>
              </div>

              {/* Verification Detail Callout */}
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl mb-5 space-y-1.5">
                <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-indigo-400" />
                  Verification Detail
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {rejectionModal.reason}
                </p>
              </div>

              {/* Image Guidelines Box */}
              <div className="p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-xl mb-6 space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
                  Recommendations for Successful Verification:
                </h4>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>Ensure the document is laid flat under bright, uniform lighting.</li>
                  <li>Avoid camera flash glare, reflections, dark shadows, or motion blur.</li>
                  <li>Verify all text, name fields, roll numbers, and board seals are in sharp focus.</li>
                  <li>For best OCR accuracy, upload a high-resolution image (JPG/PNG) or original digital PDF.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all text-xs flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Clear Image Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
