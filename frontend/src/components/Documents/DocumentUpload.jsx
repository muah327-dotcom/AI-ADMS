import React, { useState, useCallback, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { useDropzone } from 'react-dropzone';
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

const fixOcrDigits = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/[Oo]/g, '0')
    .replace(/[Il|!ij]/g, '1')
    .replace(/[Zz]/g, '2')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/[Gg]/g, '9');
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
  'ur', 'pk', 'pkr', 'govt', 'nadra', 'card', 'cnic', 'smart', 'nic', 'holder'
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
const scoreNameCandidate = (candidateStr) => {
  if (!candidateStr) return 0;
  const words = candidateStr.toLowerCase().split(/\s+/);
  let score = 0;
  for (const word of words) {
    if (PAKISTANI_NAME_PARTS.has(word)) {
      score += 10; // Strong match
    }
  }
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

  // 2. Remove known label prefixes with flexible spacing and punctuation
  text = text
    .replace(/(?:^|\b)(?:Name\s*of\s*(?:Father|Guardian|Parent|Candidate|Student|Examinee)|Father(?:[''`]?s)?(?:\s*[\/\&]\s*(?:Husband|Guardian|Mother)(?:[''`]?s)?)?|Husband(?:[''`]?s)?|Guardian(?:[''`]?s)?|Parent(?:[''`]?s)?|Candidate\s*Name|Student\s*Name|Candidate|Student|FatherName|FathersName|F\/Name|F\.Name|FName|F\s*Name|P\/Name|P\.Name|Walad|Waldiat|Card\s*Holder|Holder[''`]?s?|Neme|Nama|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|Fther|Feather|Fether|Husb|Son\s+of|Daughter\s+of|Wife\s+of|S\/O|D\/O|W\/O|S\.O|D\.O|W\.O|Name|Narne|Namo)\b[\s:.\-\/_=]*/gi, ' ')
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  let words = text.split(' ').filter(w => w.length > 0);
  let validWords = words.filter(word => {
    const lower = word.toLowerCase();
    if (CNIC_HEADER_NOISE.has(lower)) return false;
    if (URDU_OCR_NOISE_TOKENS.has(lower)) return false;
    if (word.length < 2) return false;
    // Must contain at least one vowel or vowel sound (a, e, i, o, u, y)
    const vowels = (lower.match(/[aeiouy]/g) || []).length;
    if (vowels === 0) return false;
    return true;
  });

  if (validWords.length < 1) return null;

  // 3. NOISE STRIPPING:
  // If the candidate contains known Pakistani name dictionary words,
  // trim away any leading or trailing words that are NOT recognized in the name dictionary.
  // For example: ["Anty", "Muhammad", "Zahid"] -> "Anty" is stripped -> ["Muhammad", "Zahid"]!
  const hasRecognizedPart = validWords.some(w => PAKISTANI_NAME_PARTS.has(w.toLowerCase()));
  if (hasRecognizedPart) {
    // Strip leading non-dictionary words (e.g. "Anty", "Namo", Urdu artifacts)
    while (validWords.length > 0 && !PAKISTANI_NAME_PARTS.has(validWords[0].toLowerCase())) {
      validWords.shift();
    }
    // Strip trailing non-dictionary words (e.g. Urdu artifacts on right edge)
    while (validWords.length > 0 && !PAKISTANI_NAME_PARTS.has(validWords[validWords.length - 1].toLowerCase())) {
      validWords.pop();
    }
  }

  if (validWords.length < 1) return null;
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(?:Name|Narne|Namo|Nene|Holder|Neme|Nama)\b/i.test(line) &&
      !/\b(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|National|Database|Stay)\b/i.test(line)) {
      name = cleanNameCandidate(line);
      if (name) {
        nameLineIndex = i;
        break;
      }

      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/\b(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|National|Republic|Database|Stay)\b/i.test(nextLine)) break;
        const cand = cleanNameCandidate(nextLine);
        if (cand) {
          name = cand;
          nameLineIndex = i + j;
          break;
        }
      }
      if (name) break;
    }
  }

  // Fallback for Name: scan top 8 lines
  if (!name) {
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i];
      if (/(?:Republic|Pakistan|National|Identity|Card|Islamic|Address|Expiry|Issue|Birth|Gender|Father|Husband|NADRA|Database|Country|Stay)/i.test(line)) continue;
      const cand = cleanNameCandidate(line);
      if (cand && cand.split(' ').length >= 2) {
        name = cand;
        nameLineIndex = i;
        break;
      }
    }
  }

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

    // Pick the highest scoring candidate
    fatherName = unique[0].name;
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
    // Pick best from fallback
    if (fatherCandidates.length > 0) {
      fatherCandidates.sort((a, b) => b.score - a.score);
      fatherName = fatherCandidates[0].name;
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

  return null;
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
 * Extract Academic Data (Matric / Intermediate / Transcript) with high precision
 */
const extractAcademicData = (text) => {
  const cleanText = cleanOcrText(text);

  // 1. Board Name Detection & Normalization
  let board = null;
  const biseMatch = text.match(/(?:Board\s+of\s+Intermediate(?:\s+(?:and|&|&amp;)?\s+Secondary\s+Education)?|BISE)[\s,:]*([A-Za-z\s]+?)(?:,|\.|\n|$)/i);
  if (biseMatch) {
    const rawCity = biseMatch[1].trim();
    board = normalizeBoardName(rawCity);
  }
  if (!board) {
    board = normalizeBoardName(text);
  }

  // 2. Passing Year Extraction
  let passingYear = null;
  const cleanedForYear = text.replace(/([12])([OolISBZ])([0-9OolISBZ]{2})/g, (m, p1, p2, p3) => `${p1}${fixOcrDigits(p2)}${fixOcrDigits(p3)}`);

  const annualExamMatch = cleanedForYear.match(/(?:Annual|Supplementary|Special|Bi-Annual|Spring|Fall)\s+(?:Exam(?:ination)?\s+)?([12][09]\d{2})/i);
  const examMatch = cleanedForYear.match(/(?:Examination|Exam|Session|Passing|Held\s+in|Year|Dated)[\s,:]+([12][09]\d{2})/i);
  const rangeMatch = cleanedForYear.match(/(?:20\d{2}|19\d{2})\s*-\s*(20\d{2}|19\d{2})/);
  const rangeShortMatch = cleanedForYear.match(/\b(20\d{2})\s*-\s*(\d{2})\b/);

  if (annualExamMatch) {
    passingYear = annualExamMatch[1];
  } else if (examMatch) {
    passingYear = examMatch[1];
  } else if (rangeMatch) {
    passingYear = rangeMatch[1];
  } else if (rangeShortMatch) {
    passingYear = `20${rangeShortMatch[2]}`;
  } else {
    const yearMatches = [...cleanedForYear.matchAll(/\b(199\d|20[0-2]\d)\b/g)];
    if (yearMatches.length > 0) {
      const currentYear = new Date().getFullYear();
      const validYears = yearMatches.map(m => parseInt(m[1])).filter(y => y >= 1995 && y <= currentYear + 1);
      if (validYears.length > 0) {
        passingYear = Math.max(...validYears).toString();
      }
    }
  }

  // 3. Roll Number
  let rollNumber = null;
  const rollMatch = text.match(/Roll\s*(?:No|Number|#)?[\s:.]+([A-Za-z0-9-]+)/i);
  if (rollMatch) {
    const rawRoll = rollMatch[1].trim();
    if (rawRoll.length >= 4 && rawRoll.length <= 15) {
      rollNumber = rawRoll;
    }
  }

  // 4. Obtained Marks & Total Marks Extraction (Multi-Strategy)
  let obtainedMarks = null;
  let totalMarks = null;

  // Pre-clean text: collapse spaced digits (e.g. "9 5 0" -> "950", "1 1 0 0" -> "1100")
  let cleanSpacedDigits = text.replace(/(?<=\b\d)\s+(?=\d\b)/g, '');

  const cleanedNumText = cleanSpacedDigits
    .replace(/([0-9])([OolISBZ])([0-9])/gi, (m, p1, p2, p3) => `${p1}${fixOcrDigits(p2)}${p3}`)
    .replace(/([0-9]{2,3})([OolISBZ])\b/gi, (m, p1, p2) => `${p1}${fixOcrDigits(p2)}`);

  // a) Ratio patterns (e.g. 980/1100, 980 / 1100, 0980/1100, 980|1100, 980 I 1100, 980 out of 1100)
  const ratioPattern = /\b([0-9OolISBZ]{3,4})\s*(?:\/|\\|\||I|l|out\s+of|\bof\b|:|-)\s*([0-9OolISBZ]{3,4})\b/gi;
  const ratioMatches = [...cleanedNumText.matchAll(ratioPattern)];
  for (const match of ratioMatches) {
    const obtCandidate = parseInt(fixOcrDigits(match[1]), 10);
    const totCandidate = parseInt(fixOcrDigits(match[2]), 10);
    if (!isNaN(obtCandidate) && !isNaN(totCandidate)) {
      if (totCandidate >= 300 && totCandidate <= 1200 && obtCandidate <= totCandidate && obtCandidate >= 100) {
        obtainedMarks = obtCandidate;
        totalMarks = totCandidate;
        break;
      }
    }
  }

  // b) Explicit field labels (handling "(in figures)", "(in words)", newlines, etc.)
  if (!obtainedMarks) {
    const obtPatterns = [
      /(?:Marks\s*Obtained|Obtained\s*Marks|Total\s*Marks\s*Obtained|Marks\s*Secured|Secured\s*Marks|Marks\s*Obt|Obt\s*Marks)[\s\S]{0,35}?([0-9OolISBZ]{3,4})\b/gi,
      /(?:(?<!Total\s+|Max\s+|Maximum\s+)Marks\s*[\(]?in\s+figures[\)]?|Marks\s*in\s*Figures)[\s:\-.\n]*([0-9OolISBZ]{3,4})\b/gi,
      /(?:secured|obtained|passed\s+with|with)[\s:\-]*([0-9OolISBZ]{3,4})\s*(?:marks)?\b/gi,
      /(?:GRAND\s+TOTAL|G\.\s*TOTAL|AGGREGATE)[\s\S]{0,25}?([0-9OolISBZ]{3,4})\b/gi
    ];

    for (const pat of obtPatterns) {
      const matches = [...cleanedNumText.matchAll(pat)];
      for (const m of matches) {
        if (m && m[1]) {
          const val = parseInt(fixOcrDigits(m[1]), 10);
          if (!isNaN(val) && val >= 100 && val <= 1200 && val !== 1100 && val !== 1050) {
            obtainedMarks = val;
            break;
          }
        }
      }
      if (obtainedMarks) break;
    }
  }

  if (!totalMarks) {
    const totPatterns = [
      /(?:Total\s*Marks|Maximum\s*Marks|Max\s*Marks|Out\s*of|Total)[\s\S]{0,30}?(?:\(in\s+figures\))?[\s:\-.\n]*([0-9OolISBZ]{3,4})\b/gi,
      /\b(1100|1050|550|500|850|1200)\b/
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

  // c) English Word-based marks parsing (e.g., "Nine Hundred Fifty")
  if (!obtainedMarks) {
    const wordNum = wordsToNumber(text);
    if (wordNum && wordNum >= 100 && wordNum <= 1200) {
      obtainedMarks = wordNum;
    }
  }

  // d) Summary row search (GRAND TOTAL / TOTAL / AGGREGATE row)
  if (!obtainedMarks || !totalMarks) {
    const totalRows = [...cleanedNumText.matchAll(/(?:GRAND\s+TOTAL|TOTAL\s+MARKS|TOTAL|AGGREGATE|RESULT)[\s:\-]+([0-9OolISBZ\s]{3,30})/gi)];
    for (const rowMatch of totalRows) {
      const numbersInRow = rowMatch[1].split(/\s+/).map(n => parseInt(fixOcrDigits(n), 10)).filter(n => !isNaN(n) && n >= 100 && n <= 1200);
      if (numbersInRow.length >= 2) {
        const stdTotals = [1100, 1050, 850, 550, 500, 600, 1200, 800, 400];
        const foundTotal = numbersInRow.find(n => stdTotals.includes(n)) || Math.max(...numbersInRow);
        const foundObt = numbersInRow.find(n => n !== foundTotal && n <= foundTotal && n >= 100);
        if (foundTotal && !totalMarks) totalMarks = foundTotal;
        if (foundObt && !obtainedMarks) obtainedMarks = foundObt;
      }
    }
  }

  // e) Generic Pakistani standard total marks scan if total is still missing
  if (!totalMarks) {
    const stdTotals = [1100, 550, 1050, 500, 1200, 850, 800, 600];
    for (const stdTot of stdTotals) {
      if (new RegExp(`\\b${stdTot}\\b`).test(cleanedNumText)) {
        totalMarks = stdTot;
        break;
      }
    }
  }

  // f) Fallback: If obtained is missing but there are numbers <= totalMarks in text
  if (!obtainedMarks && totalMarks) {
    const allNums = [...cleanedNumText.matchAll(/\b([0-9OolISBZ]{3,4})\b/g)]
      .map(m => parseInt(fixOcrDigits(m[1]), 10))
      .filter(n => !isNaN(n) && n >= 150 && n < totalMarks && n !== totalMarks);
    if (allNums.length > 0) {
      obtainedMarks = Math.max(...allNums);
    }
  }

  // g) Auto-deduce standard total marks if obtained is found
  if (obtainedMarks && !totalMarks) {
    totalMarks = obtainedMarks > 550 ? 1100 : 550;
  }

  // Ensure obtainedMarks <= totalMarks
  if (obtainedMarks && totalMarks && obtainedMarks > totalMarks) {
    const temp = obtainedMarks;
    obtainedMarks = totalMarks;
    totalMarks = temp;
  }

  // Percentage & Grade calculation / extraction
  let percentageMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  let percentage = percentageMatch ? parseFloat(percentageMatch[1]) : null;
  if (!percentage && obtainedMarks && totalMarks && totalMarks > 0) {
    percentage = parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(2));
  }

  let grade = null;
  const gradeMatch = text.match(/Grade[\s:]+([A-F][+-]?|A-1)/i);
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
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Name\s*(?:of\s+)?(?:Candidate|Student|Examinee)|Student\s*Name|Candidate\s*Name)\s*[:\-]?/i.test(line)
      && !/(?:Father|Husband|Mother|Guardian|Board|Institution|School|College)/i.test(line)) {
      const sameLineMatch = line.match(/(?:Name\s*(?:of\s+)?(?:Candidate|Student|Examinee)|Student\s*Name|Candidate\s*Name)\s*[:\-]?\s*(.+)$/i);
      if (sameLineMatch && sameLineMatch[1]) {
        const val = cleanNameCandidate(sameLineMatch[1]);
        if (val && val.length >= 3) name = val;
      }
      if (!name) {
        for (let j = 1; j <= 3; j++) {
          const nextLine = lines[i + j];
          if (!nextLine) break;
          if (/(?:Father|Husband|Mother|Guardian|Board|Institution|School|College|Roll|Marks)/i.test(nextLine)) break;
          const val = cleanNameCandidate(nextLine);
          if (val && val.length >= 3) { name = val; break; }
        }
      }
      if (name) break;
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

  return {
    percentage: percentage,
    grade: grade,
    passing_year: passingYear,
    board: board,
    roll_number: rollNumber,
    obtained_marks: obtainedMarks,
    total_marks: totalMarks,
    name: name,
    father_name: fatherName,
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
      if (currentDocType !== 'cnic') rejectCurrentDoc = true;
    }
  }
  if (userProfile?.father_name && currentFatherName) {
    if (!namesMatch(currentFatherName, userProfile.father_name)) {
      warnings.push(`Father's name detected as "${currentFatherName}" on ${currentLabel}, which differs from your registered father's name ("${userProfile.father_name}"). If the document picture is blurry, printed text may be misread.`);
      if (currentDocType !== 'cnic') rejectCurrentDoc = true;
    }
  }

  uploadedFiles.forEach((file, index) => {
    if (!file.extractedData) return;
    const existingData = file.extractedData;
    const existingLabel = docTypeLabels[file.type] || 'Uploaded Document';

    if (currentName && existingData.name) {
      if (!namesMatch(currentName, existingData.name)) {
        warnings.push(`Candidate name extracted from ${currentLabel} ("${currentName}") differs from ${existingLabel} ("${existingData.name}"). Ensure images are clear and readable.`);
        if (currentDocType === 'cnic') {
          warnings.push(`${existingLabel} has been removed because candidate name does not match your CNIC.`);
          removeIndices.push(index);
        } else {
          rejectCurrentDoc = true;
        }
      }
    }

    if (currentFatherName && existingData.father_name) {
      if (!namesMatch(currentFatherName, existingData.father_name)) {
        warnings.push(`Father's name extracted from ${currentLabel} ("${currentFatherName}") differs from ${existingLabel} ("${existingData.father_name}"). Please verify image clarity.`);
        if (currentDocType === 'cnic') {
          warnings.push(`${existingLabel} has been removed because father's name does not match your CNIC.`);
          removeIndices.push(index);
        } else {
          rejectCurrentDoc = true;
        }
      }
    }
  });

  return { warnings, rejectCurrentDoc, removeIndices };
};

/**
 * Multi-stage canvas preprocessing for optimal Tesseract OCR precision:
 * 1. Upscale to 2400-3000px resolution (300 DPI equivalent)
 * 2. Luminance Grayscale conversion
 * 3. Contrast Stretching (Histogram Normalization)
 * 4. Local Adaptive Thresholding (eliminates phone camera shadows/gradients)
 * 5. 3x3 Convolution Sharpening (crisp text edges)
 */
const preprocessImageForOcr = (imageOrCanvas, mode = 'adaptive') => {
  return new Promise((resolve) => {
    const processCanvas = (srcCanvas) => {
      try {
        const width = srcCanvas.width;
        const height = srcCanvas.height;

        const targetWidth = Math.max(width, 2400);
        const scale = targetWidth / width;
        const targetHeight = Math.round(height * scale);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetWidth;
        outCanvas.height = targetHeight;

        const ctx = outCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const d = imgData.data;
        const numPixels = targetWidth * targetHeight;

        // Step 1: Compute grayscale luminance buffer
        const grayBuf = new Uint8Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
          const idx = i * 4;
          grayBuf[i] = Math.round(0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2]);
        }

        // Step 2: Contrast Stretching (find 2nd and 98th percentiles)
        const hist = new Int32Array(256);
        for (let i = 0; i < numPixels; i++) {
          hist[grayBuf[i]]++;
        }
        let count = 0;
        let minP = 0;
        let maxP = 255;
        const lowCut = numPixels * 0.02;
        const highCut = numPixels * 0.98;
        for (let i = 0; i < 256; i++) {
          count += hist[i];
          if (count >= lowCut && minP === 0) minP = i;
          if (count >= highCut) { maxP = i; break; }
        }
        const range = Math.max(maxP - minP, 1);

        // Normalize grayscale buffer
        for (let i = 0; i < numPixels; i++) {
          const stretched = Math.min(255, Math.max(0, Math.round(((grayBuf[i] - minP) / range) * 255)));
          grayBuf[i] = stretched;
        }

        if (mode === 'grayscale') {
          // Output high-contrast grayscale directly
          for (let i = 0; i < numPixels; i++) {
            const idx = i * 4;
            const v = grayBuf[i];
            d[idx] = v;
            d[idx + 1] = v;
            d[idx + 2] = v;
          }
        } else {
          // Step 3: Adaptive Binarization (Sauvola / Bradley Integral Image technique)
          // Compute integral image for fast local window averages
          const integral = new Float64Array((targetWidth + 1) * (targetHeight + 1));
          for (let y = 0; y < targetHeight; y++) {
            let rowSum = 0;
            const yOffset = (y + 1) * (targetWidth + 1);
            const prevYOffset = y * (targetWidth + 1);
            const grayRowOffset = y * targetWidth;
            for (let x = 0; x < targetWidth; x++) {
              rowSum += grayBuf[grayRowOffset + x];
              integral[yOffset + x + 1] = integral[prevYOffset + x + 1] + rowSum;
            }
          }

          const s = Math.max(Math.round(targetWidth / 16), 15);
          const t = 0.15; // 15% below local mean threshold

          for (let y = 0; y < targetHeight; y++) {
            const y1 = Math.max(0, y - s);
            const y2 = Math.min(targetHeight, y + s);
            const yOffset = y * targetWidth;
            for (let x = 0; x < targetWidth; x++) {
              const x1 = Math.max(0, x - s);
              const x2 = Math.min(targetWidth, x + s);
              const count = (x2 - x1) * (y2 - y1);
              const sum = integral[y2 * (targetWidth + 1) + x2]
                - integral[y1 * (targetWidth + 1) + x2]
                - integral[y2 * (targetWidth + 1) + x1]
                + integral[y1 * (targetWidth + 1) + x1];
              const mean = sum / count;
              const idx = (yOffset + x) * 4;
              const val = grayBuf[yOffset + x] < mean * (1 - t) ? 0 : 255;
              d[idx] = val;
              d[idx + 1] = val;
              d[idx + 2] = val;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(outCanvas);
      } catch (err) {
        console.warn('Advanced preprocessing canvas failed, using original canvas:', err);
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
        const ctx = tempCanvas.getContext('2d');
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

  // 2. OCR confidence check: if confidence is below 35%, document is unclear
  if (confidence > 0 && confidence < 35) {
    return {
      isValid: false,
      reason: `Image clarity is too low (OCR Confidence: ${Math.round(confidence)}%). Please upload a clear, well-lit document image.`
    };
  }

  // 3. Document-specific required key fields check:
  if (docType === 'cnic') {
    const hasCnic = !!extractedData?.cnic;
    const hasName = !!extractedData?.name;

    if (!hasCnic && !hasName) {
      return {
        isValid: false,
        reason: 'Could not read key CNIC details (CNIC Number or Name) from this picture. The image may be blurry or poorly lit. Please upload a clearer photo of your CNIC/B-Form.'
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
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState('cnic');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processingFile, setProcessingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const fileInputRef = useRef(null);

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
    matric_board: '',
    matric_passing_year: '',
    matric_obtained_marks: '',
    matric_total_marks: '',
    // Academic Information - Intermediate
    inter_board: '',
    inter_passing_year: '',
    inter_obtained_marks: '',
    inter_total_marks: ''
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
        matric_board: user.matric_board || prev.matric_board,
        matric_passing_year: user.matric_passing_year || prev.matric_passing_year,
        matric_obtained_marks: user.matric_obtained_marks || prev.matric_obtained_marks,
        matric_total_marks: user.matric_total_marks || prev.matric_total_marks,
        inter_board: user.inter_board || prev.inter_board,
        inter_passing_year: user.inter_passing_year || prev.inter_passing_year,
        inter_obtained_marks: user.inter_obtained_marks || prev.inter_obtained_marks,
        inter_total_marks: user.inter_total_marks || prev.inter_total_marks
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
        if (extractedData.board) {
          updated.matric_board = extractedData.board;
          newFilledFields.add('matric_board');
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
        if (extractedData.board) {
          updated.inter_board = extractedData.board;
          newFilledFields.add('inter_board');
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
        formFields: ['matric_board', 'matric_passing_year', 'matric_obtained_marks', 'matric_total_marks'],
        dbFields: {
          matric_board: null,
          matric_passing_year: null,
          matric_obtained_marks: null,
          matric_total_marks: null
        }
      };
    }
    if (docType === 'intermediate' || docType === 'transcript') {
      return {
        formFields: ['inter_board', 'inter_passing_year', 'inter_obtained_marks', 'inter_total_marks'],
        dbFields: {
          inter_board: null,
          inter_passing_year: null,
          inter_obtained_marks: null,
          inter_total_marks: null
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

        toast.success('Photograph uploaded & saved to database successfully!');
        setUploading(false);
        setProcessingFile(null);
        return;
      }

      let extractedText = '';
      let confidence = 0;

      if (isPdf) {
        // Extract text/OCR from PDF client-side
        const pdfResult = await extractTextFromPDF(file, (progress) => {
          console.log(`OCR Progress: ${(progress * 100).toFixed(0)}%`);
        });
        extractedText = pdfResult.text;
        confidence = pdfResult.confidence;
      } else {
        // Pass 1: Run Tesseract OCR on adaptive-binarized canvas
        const processedCanvas = await preprocessImageForOcr(file, 'adaptive');
        const result = await Tesseract.recognize(processedCanvas, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress (Pass 1): ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });
        extractedText = result?.data?.text || '';
        confidence = result?.data?.confidence || 0;

        // Map document types and check if key fields are missing
        const docCategory = (documentType === 'matric' || documentType === 'intermediate' || documentType === 'transcript')
          ? 'academic' : documentType === 'cnic' ? 'cnic' : 'other';

        let pass1Data = docCategory === 'cnic' ? extractCNICData(extractedText) : extractAcademicData(extractedText);
        const pass1Incomplete = (docCategory === 'cnic' && (!pass1Data.cnic || !pass1Data.name)) ||
          (docCategory === 'academic' && (!pass1Data.obtained_marks || !pass1Data.board));

        // Pass 2: If Pass 1 is incomplete or has low confidence, try high-contrast grayscale pass
        if (pass1Incomplete || confidence < 65) {
          try {
            console.log('Running OCR Pass 2 with enhanced grayscale canvas...');
            const grayCanvas = await preprocessImageForOcr(file, 'grayscale');
            const result2 = await Tesseract.recognize(grayCanvas, 'eng');
            const text2 = result2?.data?.text || '';
            const conf2 = result2?.data?.confidence || 0;

            if (text2 && text2.length > 20) {
              const pass2Data = docCategory === 'cnic' ? extractCNICData(text2) : extractAcademicData(text2);
              const pass2Score = Object.values(pass2Data).filter(v => v !== null && v !== undefined && v !== '').length;
              const pass1Score = Object.values(pass1Data).filter(v => v !== null && v !== undefined && v !== '').length;

              if (pass2Score >= pass1Score || conf2 > confidence) {
                console.log('Pass 2 yielded superior extraction results.');
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
      const docCategory = (documentType === 'matric' || documentType === 'intermediate' || documentType === 'transcript')
        ? 'academic' : documentType === 'cnic' ? 'cnic' : 'other';

      let extractedData;
      if (docCategory === 'cnic') {
        extractedData = extractCNICData(extractedText);
      } else if (docCategory === 'academic') {
        extractedData = extractAcademicData(extractedText);
      } else {
        extractedData = { ...extractCNICData(extractedText), ...extractAcademicData(extractedText) };
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

      // If CNIC was uploaded and existing documents don't match, remove conflicting docs and clear their form and database data
      if (removeIndices.length > 0) {
        let combinedDbFields = {};
        let combinedFormFields = [];

        removeIndices.forEach(idx => {
          const removedFile = uploadedFiles[idx];
          if (removedFile) {
            const { formFields, dbFields } = getDocTypeFieldsToClear(removedFile.type);
            combinedFormFields = [...combinedFormFields, ...formFields];
            combinedDbFields = { ...combinedDbFields, ...dbFields };
          }
        });

        const remainingFiles = uploadedFiles.filter((_, i) => !removeIndices.includes(i));
        const remainingDocTypes = remainingFiles.map(f => f.type);

        // Clear in local form state
        setFormData(prev => {
          const updated = { ...prev };
          combinedFormFields.forEach(f => {
            updated[f] = '';
          });
          return updated;
        });

        // Remove from OCR filled fields
        setOcrFilledFields(prev => {
          const next = new Set(prev);
          combinedFormFields.forEach(f => next.delete(f));
          return next;
        });

        const dbPayload = {
          ...combinedDbFields,
          is_verified: false,
          uploaded_documents: remainingDocTypes
        };

        // Invalidate verification & update context state
        setUser(prev => prev ? ({ ...prev, ...dbPayload }) : prev);

        try {
          const token = localStorage.getItem('token');
          if (token) {
            removeIndices.forEach(idx => {
              const rf = uploadedFiles[idx];
              if (rf?.type) {
                fetch(`/api/ocr/my-documents/type/${rf.type}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                }).catch(console.error);
              }
            });

            fetch('/api/auth/profile', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(dbPayload)
            }).catch(console.error);
          }
        } catch (err) {
          console.error(err);
        }

        setUploadedFiles(remainingFiles);
        nameWarnings.forEach(warning => {
          toast.error(warning, { duration: 8000, icon: '⚠️' });
        });
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

      toast.success('Document processed & stored in database successfully!');
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

    const docLabel = documentTypes.find(d => d.id === docTypeToRemove)?.name || 'Document';
    toast.success(`${docLabel} and its data removed from database.`);
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
      { key: 'matric_board', label: 'Matric Board' },
      { key: 'matric_passing_year', label: 'Matric Passing Year' },
      { key: 'matric_obtained_marks', label: 'Matric Obtained Marks' },
      { key: 'matric_total_marks', label: 'Matric Total Marks' },
      { key: 'inter_board', label: 'Intermediate Board' },
      { key: 'inter_passing_year', label: 'Intermediate Passing Year' },
      { key: 'inter_obtained_marks', label: 'Intermediate Obtained Marks' },
      { key: 'inter_total_marks', label: 'Intermediate Total Marks' },
    ];

    const missingFields = requiredFields.filter(f => !formData[f.key] || String(formData[f.key]).trim() === '');
    if (missingFields.length > 0) {
      const fieldNames = missingFields.slice(0, 3).map(f => f.label).join(', ');
      const extra = missingFields.length > 3 ? ` and ${missingFields.length - 3} more` : '';
      toast.error(`Please fill all required fields: ${fieldNames}${extra}`, { duration: 6000 });
      return;
    }

    // Validate Pakistani Phone Numbers
    if (!isValidPakistaniPhone(formData.phone)) {
      toast.error('Please enter a valid Pakistani Mobile Number (format: 03XX-XXXXXXX)', { duration: 5000 });
      return;
    }

    if (!isValidPakistaniPhone(formData.father_phone)) {
      toast.error("Please enter a valid Father's / Guardian Mobile Number (format: 03XX-XXXXXXX)", { duration: 5000 });
      return;
    }

    if (formData.alternate_phone && !isValidPakistaniPhone(formData.alternate_phone, true)) {
      toast.error('Please enter a valid Alternate Mobile Number in Pakistani format (03XX-XXXXXXX)', { duration: 5000 });
      return;
    }

    // Validate CNIC format
    if (!/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic.trim())) {
      toast.error('Please enter a valid CNIC / B-Form Number in format XXXXX-XXXXXXX-X', { duration: 5000 });
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
        matric_board: formData.matric_board,
        matric_passing_year: formData.matric_passing_year ? parseInt(formData.matric_passing_year) : undefined,
        matric_obtained_marks: formData.matric_obtained_marks ? parseInt(formData.matric_obtained_marks) : undefined,
        matric_total_marks: formData.matric_total_marks ? parseInt(formData.matric_total_marks) : undefined,
        inter_board: formData.inter_board,
        inter_passing_year: formData.inter_passing_year ? parseInt(formData.inter_passing_year) : undefined,
        inter_obtained_marks: formData.inter_obtained_marks ? parseInt(formData.inter_obtained_marks) : undefined,
        inter_total_marks: formData.inter_total_marks ? parseInt(formData.inter_total_marks) : undefined,
        is_verified: true,
        uploaded_documents: uploadedFiles.map(f => f.type)
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

  // Check if a document type is already uploaded
  const isDocUploaded = (typeId) => uploadedFiles.some(f => f.type === typeId);

  // Mandatory document verification computation
  const mandatoryDocTypes = documentTypes.filter(d => d.required);
  const uploadedDocTypeIds = uploadedFiles.map(f => f.type);
  const missingMandatoryDocs = mandatoryDocTypes.filter(d => !uploadedDocTypeIds.includes(d.id));
  const isFullyVerified = Boolean(
    user?.is_verified &&
    missingMandatoryDocs.length === 0 &&
    uploadedFiles.length >= mandatoryDocTypes.length
  );

  // Input field helper with OCR indicator
  const renderField = (label, field, type = 'text', options = {}) => {
    const isOcrFilled = ocrFilledFields.has(field);
    return (
      <div className={options.colSpan2 ? 'sm:col-span-2' : ''}>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {isOcrFilled && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-purple-400 font-normal">
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
            className={`w-full px-4 py-2.5 bg-[#0f0f0f] border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white transition-all ${isOcrFilled ? 'border-purple-500/50' : 'border-gray-700'
              } ${options.disabled ? 'text-gray-500 cursor-not-allowed' : ''}`}
          >
            <option value="">{options.placeholder || 'Select...'}</option>
            {(options.selectOptions || []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={formData[field] || ''}
            onChange={(e) => handleFormChange(field, e.target.value)}
            placeholder={options.placeholder || ''}
            maxLength={options.maxLength}
            disabled={options.disabled}
            className={`w-full px-4 py-2.5 bg-[#0f0f0f] border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500 transition-all ${isOcrFilled ? 'border-purple-500/50' : 'border-gray-700'
              } ${options.disabled ? 'text-gray-500 cursor-not-allowed' : ''}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Document Upload & Verification</h1>
        <p className="text-gray-400 mt-1">Upload your documents for automatic data extraction and verify your admission information</p>
      </div>

      {/* Verification Status Card */}
      {isFullyVerified ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-300">Profile & Mandatory Documents Verified</h4>
              <p className="text-xs text-emerald-200/80 mt-0.5">All required non-optional documents have been verified. You can now submit program applications.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold whitespace-nowrap">
            Verified
          </span>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                {missingMandatoryDocs.length > 0
                  ? `Verification Pending — ${missingMandatoryDocs.length} Mandatory Document(s) Missing`
                  : 'Verification Pending — Review & Submit Profile'}
              </h4>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                {missingMandatoryDocs.length > 0 ? (
                  <>
                    Please upload the missing mandatory documents:{' '}
                    <span className="font-semibold text-amber-100">
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
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-semibold whitespace-nowrap">
            Verification Pending
          </span>
        </div>
      )}

      {/* Step Indicator */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">1</div>
            <span className="text-sm font-medium">Upload Documents</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-700">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: uploadedFiles.length > 0 ? '100%' : '0%' }} />
          </div>
          <div className={`flex items-center gap-2 ${uploadedFiles.length > 0 ? 'text-cyan-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${uploadedFiles.length > 0 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>2</div>
            <span className="text-sm font-medium">OCR Extraction</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-700">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: ocrFilledFields.size > 0 ? '100%' : '0%' }} />
          </div>
          <div className={`flex items-center gap-2 ${ocrFilledFields.size > 0 ? 'text-cyan-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ocrFilledFields.size > 0 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>3</div>
            <span className="text-sm font-medium">Verify & Submit</span>
          </div>
        </div>
      </div>

      {/* Hidden file input for card-click uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Document Type Selection — click a card to upload */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Upload Documents</h3>
        <p className="text-sm text-gray-500 mb-4">Click on a document type to upload &bull; Supported: PDF, PNG, JPG (max 10MB)</p>
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
                  ? 'border-cyan-500 bg-cyan-500/10 animate-pulse'
                  : uploaded
                    ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                    : 'border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                  } ${uploading && !isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {uploaded && !isProcessing && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  </div>
                )}
                {isProcessing ? (
                  <Loader2 className="h-7 w-7 mb-2 text-cyan-400 animate-spin" />
                ) : (
                  <Icon className={`h-7 w-7 mb-2 transition-colors ${uploaded ? 'text-green-400' : 'text-gray-500 group-hover:text-cyan-400'}`} />
                )}
                <h4 className={`font-medium text-sm ${isProcessing ? 'text-white' : uploaded ? 'text-green-300' : 'text-gray-300 group-hover:text-white'}`}>
                  {isProcessing ? 'Processing...' : type.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isProcessing && processingFile ? processingFile.name : type.desc}
                </p>
                {!type.required && !isProcessing && <span className="text-xs text-gray-600 mt-1 block">Optional</span>}
                {!uploaded && !isProcessing && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 group-hover:text-cyan-400/70 transition-colors">
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
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Uploaded Documents ({uploadedFiles.length})</h3>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              Persisted in Database
            </span>
          </div>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={file._id || index} className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <FileText className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm">{file.name}</p>
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full font-medium border border-emerald-500/30">
                        Saved in DB
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">
                      {documentTypes.find(t => t.id === file.type)?.name}
                      {file.confidence ? ` • Confidence: ${file.confidence?.toFixed(1)}%` : ''}
                      {file.uploaded_at ? ` • ${new Date(file.uploaded_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.file_data && (
                    <a
                      href={file.file_data}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors border border-cyan-500/30 font-medium"
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    title="Delete document from database"
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
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
      <div className="bg-cyan-500/10 rounded-xl p-6 border border-cyan-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-cyan-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-cyan-400">Tips for Best Results</h4>
            <ul className="text-sm text-cyan-300/80 mt-2 space-y-1 list-disc list-inside">
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
        <div className="relative bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
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
                <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <User className="h-4 w-4 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Personal Information</h3>
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

            <hr className="border-gray-800" />

            {/* Contact Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Phone className="h-4 w-4 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Contact Information</h3>
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

            <hr className="border-gray-800" />

            {/* Academic Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <GraduationCap className="h-4 w-4 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Academic Information</h3>
              </div>

              {/* Matric Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-400" />
                  Matric / SSC Details
                </h4>
                <div className="grid sm:grid-cols-2 gap-4 pl-6 border-l-2 border-yellow-500/20">
                  {renderField('Board', 'matric_board', 'text', { placeholder: 'e.g., BISE Lahore' })}
                  {renderField('Passing Year', 'matric_passing_year', 'number', { placeholder: 'e.g., 2022' })}
                  {renderField('Marks Obtained', 'matric_obtained_marks', 'number', { placeholder: 'e.g., 950' })}
                  {renderField('Total Marks', 'matric_total_marks', 'number', { placeholder: 'e.g., 1100' })}
                </div>
              </div>

              {/* Intermediate Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-400" />
                  Intermediate / HSSC Details
                </h4>
                <div className="grid sm:grid-cols-2 gap-4 pl-6 border-l-2 border-blue-500/20">
                  {renderField('Board', 'inter_board', 'text', { placeholder: 'e.g., BISE Lahore' })}
                  {renderField('Passing Year', 'inter_passing_year', 'number', { placeholder: 'e.g., 2024' })}
                  {renderField('Marks Obtained', 'inter_obtained_marks', 'number', { placeholder: 'e.g., 450' })}
                  {renderField('Total Marks', 'inter_total_marks', 'number', { placeholder: 'e.g., 550' })}
                </div>
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* Declaration */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Declaration</h3>
              </div>
              <div className="space-y-4 bg-[#0f0f0f] rounded-xl p-5 border border-gray-800">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={declarations.confirmCorrect}
                      onChange={(e) => setDeclarations(prev => ({ ...prev, confirmCorrect: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded border-2 border-gray-600 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center">
                      {declarations.confirmCorrect && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
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
                    <div className="w-5 h-5 rounded border-2 border-gray-600 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center">
                      {declarations.understandFalseInfo && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
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
