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
  return text
    .replace(/[^\x00-\x7F\s]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const fixOcrDigits = (str) => {
  return str
    .replace(/O/gi, '0')
    .replace(/[Il]/g, '1')
    .replace(/S/gi, '5')
    .replace(/B/g, '8')
    .replace(/Z/gi, '2');
};

const CNIC_NOISE_WORDS = new Set([
  // CNIC labels & header text
  'gney', 'attorney', 'sign', 'signature', 'sig', 'specimen', 'card', 'holder',
  'national', 'republic', 'pakistan', 'islamic', 'identity', 'number', 'reg',
  'general', 'registrar', 'head', 'authority', 'nadra', 'govt', 'gov', 'pak',
  'holders', 'registration', 'form', 'office', 'district', 'province', 'tehsil',
  'valid', 'from', 'till', 'renewal', 'fee', 'status', 'photo',
  'thumb', 'impression', 'print', 'finger', 'left', 'right',
  'country', 'stay', 'expiry', 'issue', 'address', 'nic', 'cnic',
  // Name / Father field labels & OCR misreads
  'name', 'narne', 'neme', 'nama', 'namo', 'nene', 'nal', 'nam',
  'father', 'husband', 'mother', 'fath', 'fathar', 'fathor', 'fathsr',
  'fatner', 'fathe', 'fther', 'feather', 'fether', 'falher', 'husb',
  'date', 'birth', 'gender', 'sex',
  // Common short prepositions / conjunctions / titles
  'of', 'the', 'and', 'for', 'with', 'son', 'daughter', 'wife',
  'mr', 'mrs', 'ms', 'miss', 'dr', 'pk', 'pkr', 'id', 'no', 'num',
  'des', 'der', 'sur', 'soi', 'sor', 'so', 'do', 'wo',
  'sai', 'sam', 'puck',
  // Common Urdu OCR misreads that appear as mixed-case English gibberish
  'ath', 'aih', 'aith', 'uch', 'akh', 'oth', 'uth', 'asi', 'isi', 'usi',
  'gir', 'gar', 'ger', 'gur', 'ghr', 'ghi', 'gha', 'ghu',
  'sak', 'sek', 'sik', 'sok', 'suk', 'sal', 'sel', 'sil', 'sol', 'sul',
  'puk', 'pek', 'pik', 'pak', 'por', 'pur', 'par', 'per', 'pir', 'pul',
  'dal', 'dil', 'dul', 'dar', 'dir', 'dur', 'dak', 'dik', 'duk',
  'bal', 'bil', 'bul', 'bar', 'bir', 'bur', 'bak', 'bik', 'buk',
  'kal', 'kil', 'kul', 'kar', 'kir', 'kur', 'kha', 'khi', 'khu',
  'hal', 'hil', 'hul', 'har', 'hir', 'hur',
  'tal', 'til', 'tul', 'tar', 'tir', 'tur', 'tha', 'thi', 'thu',
  'mal', 'mil', 'mul', 'mar', 'mir', 'mur',
  'wal', 'wil', 'wul', 'war', 'wir', 'wur',
  'nal', 'nil', 'nul', 'nar', 'nir', 'nur',
  'ral', 'ril', 'rul', 'rar', 'rir', 'rur',
  'jal', 'jil', 'jul', 'jar', 'jir', 'jur',
  'zal', 'zil', 'zul', 'zar', 'zir', 'zur',
  'ain', 'ein', 'oin', 'aen', 'een', 'oen',
  'che', 'chi', 'cha', 'chu', 'cho',
  'sha', 'shi', 'shu', 'sho', 'she',
  'aye', 'ays', 'ayn', 'aan', 'aab', 'aam', 'aas', 'aal',
  'lam', 'mim', 'nun', 'waw', 'yaa', 'raa', 'zaa', 'taa', 'haa', 'kaf',
  'daal', 'jeem', 'sheen', 'ghain', 'kaaf',
  'bin', 'bint', 'ibn',
  // Misc single-syllable gibberish from watermarks/card elements
  'cae', 'cai', 'cay', 'ceo', 'cie', 'cio', 'coe', 'coi', 'coy',
  'dae', 'dai', 'day', 'dei', 'die', 'doe', 'doi', 'doy', 'due', 'dui',
  'fae', 'fai', 'fay', 'fie', 'foe', 'foi', 'foy', 'fue', 'fui',
  'gae', 'gai', 'gay', 'gie', 'goe', 'goi', 'goy', 'gue', 'gui',
  'hae', 'hai', 'hay', 'hie', 'hoe', 'hoi', 'hoy', 'hue', 'hui',
  'jae', 'jai', 'jay', 'jie', 'joe', 'joi', 'joy', 'jue', 'jui',
  'kai', 'kay', 'kie', 'koe', 'koi', 'koy', 'kue', 'kui',
  'lai', 'lay', 'lei', 'lie', 'loi', 'loy', 'lue', 'lui',
  'mae', 'mai', 'may', 'mei', 'mie', 'moe', 'moi', 'moy', 'mue', 'mui',
  'nae', 'nai', 'nay', 'nie', 'noe', 'noi', 'noy', 'nue', 'nui',
  'pai', 'pay', 'pie', 'poi', 'poy', 'pue', 'pui',
  'rae', 'rai', 'ray', 'rei', 'rie', 'roe', 'roi', 'roy', 'rue', 'rui',
  'sae', 'say', 'sei', 'sie', 'soe', 'soy', 'sue', 'sui',
  'tae', 'tai', 'tay', 'tie', 'toe', 'toi', 'toy', 'tue', 'tui',
  'vai', 'vay', 'vie', 'voe', 'voi', 'voy', 'vue', 'vui',
  'wae', 'wai', 'way', 'wie', 'woe', 'woi', 'woy', 'wue', 'wui',
  'yae', 'yai', 'yay', 'yie', 'yoe', 'yoi', 'yoy', 'yue', 'yui',
  'zae', 'zai', 'zay', 'zie', 'zoe', 'zoi', 'zoy', 'zue', 'zui',
  // Two-letter fragments
  'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'az',
  'ba', 'be', 'bi', 'bo', 'bu', 'ca', 'ce', 'ci', 'co', 'cu',
  'da', 'de', 'di', 'du', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef', 'eg', 'eh', 'ei', 'ej', 'ek', 'el', 'em', 'en', 'eo', 'ep', 'eq', 'er', 'es', 'et', 'eu', 'ev', 'ew', 'ex', 'ey', 'ez',
  'fa', 'fe', 'fi', 'fo', 'fu', 'ga', 'ge', 'gi', 'go', 'gu',
  'ha', 'he', 'hi', 'ho', 'hu', 'ia', 'ib', 'ic', 'ie', 'ig', 'ih', 'ii', 'ij', 'ik', 'il', 'im', 'in', 'io', 'ip', 'iq', 'ir', 'is', 'it', 'iu', 'iv', 'iw', 'ix', 'iy', 'iz',
  'ja', 'je', 'ji', 'jo', 'ju', 'ka', 'ke', 'ki', 'ko', 'ku',
  'la', 'le', 'li', 'lo', 'lu', 'ma', 'me', 'mi', 'mo', 'mu',
  'na', 'ne', 'ni', 'nu', 'oa', 'ob', 'oc', 'od', 'oe', 'og', 'oh', 'oi', 'oj', 'ok', 'ol', 'om', 'on', 'oo', 'op', 'oq', 'or', 'os', 'ot', 'ou', 'ov', 'ow', 'ox', 'oy', 'oz',
  'pa', 'pe', 'pi', 'po', 'pu', 'qa', 'qe', 'qi', 'qo', 'qu',
  'ra', 're', 'ri', 'ro', 'ru', 'sa', 'se', 'si', 'ta', 'te', 'ti', 'to', 'tu',
  'ua', 'ub', 'uc', 'ud', 'ue', 'uf', 'ug', 'uh', 'ui', 'uj', 'uk', 'ul', 'um', 'un', 'uo', 'up', 'uq', 'ur', 'us', 'ut', 'uu', 'uv', 'uw', 'ux', 'uy', 'uz',
  'va', 've', 'vi', 'vo', 'vu', 'wa', 'we', 'wi', 'xu', 'ya', 'ye', 'yi', 'yo', 'yu',
  'za', 'ze', 'zi', 'zo', 'zu'
]);

/**
 * Detect gibberish/nonsense words from OCR misreads.
 * Pakistani CNIC names are real English transliterations of Urdu names (e.g. MUHAMMAD, AHMED, ZAHID, BIBI).
 * OCR misreads of Urdu script produce nonsense like "Gney", "Athiy", "Pukr", "Skhr" etc.
 */
const isLikelyGibberish = (word) => {
  if (!word || word.length < 2) return true;
  const w = word.toLowerCase();

  // 3+ consecutive consonants (very rare in valid Pakistani names transliterated to English)
  if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(w)) return true;

  // Word of 4+ characters with zero vowels
  const vowelCount = (w.match(/[aeiouy]/g) || []).length;
  if (w.length >= 4 && vowelCount === 0) return true;

  // Very high consonant ratio for 5+ char words (e.g. "pukrn" has 4 consonants, 1 vowel)
  if (w.length >= 5 && (w.length - vowelCount) / Math.max(vowelCount, 1) > 4) return true;

  // Ends with unusual double consonants that don't appear in Pakistani names
  if (/[bcfgjkpqvwxz]{2}$/.test(w)) return true;

  // Starts with unusual consonant clusters not found in Urdu/Arabic transliterations
  if (/^[bcdfghjklmnpqrstvwxyz]{3,}/i.test(w)) return true;

  // Very short word (2 chars) — already handled by noise list, but double-check
  if (w.length === 2) return true;

  return false;
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
    const d = fixOcrDigits(p1).padStart(2, '0');
    const mo = monthMap[p2.toLowerCase().substring(0, 3)] || '01';
    const y = fixOcrDigits(p3);
    return `${d}/${mo}/${y}`;
  });

  // Convert spaced or punctuated dates e.g. "15 . 08 . 2001" or "15,08,2001" or "15-08-2001"
  str = str.replace(/\b([0-9OolISB]{1,2})\s*[\.,:\-\/]\s*([0-9OolISB]{1,2})\s*[\.,:\-\/]\s*([0-9OolISB]{4})\b/gi, (m, p1, p2, p3) => {
    const d = fixOcrDigits(p1).padStart(2, '0');
    const mo = fixOcrDigits(p2).padStart(2, '0');
    const y = fixOcrDigits(p3);
    return `${d}/${mo}/${y}`;
  });

  return str;
};

/**
 * Extract clean English name (Holder or Father) by strictly filtering out Urdu OCR misreads.
 * Pakistani CNICs print English names in UPPERCASE. Urdu text below gets misread as gibberish.
 */
const extractEnglishNameFromLine = (line, isFather = false) => {
  if (!line) return null;

  // Remove all known label text and OCR variations of labels
  let text = line
    .replace(/(?:Father'?s?|Husband'?s?|Mother'?s?|Guardian'?s?|Name|Narne|Namo|Nene|Holder'?s?|Card|Nal|Neme|Nama|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|Fther|Feather|Fether|Husb|S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of|Wife\s+of|Identity|National|Republic|Islamic|Pakistan|NADRA|Signature|Specimen|Attorney|Registration|Authority|Registrar|General|Head|Country|Stay|Address|Gender|Birth|Date|Expiry|Issue|Valid|Renewal|Photo|Thumb|Impression|Print|Finger|Number|CNIC|NIC|Govt|Gov|Office|District|Province|Tehsil|Form|Status|Fee)\s*[:\-]?/gi, ' ')
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  const words = text.split(' ').filter(w => w.length > 0);

  // Strict word filtering for Pakistani CNIC names
  const validWords = words.filter(word => {
    const lower = word.toLowerCase();

    // Reject noise words
    if (CNIC_NOISE_WORDS.has(lower)) return false;

    // Reject very short words (less than 3 chars) — valid Pakistani names are 3+ chars
    // Exception: common real name parts like "Al" are too risky to keep (noise overlap)
    if (word.length < 3) return false;

    // Reject entirely lowercase words (Urdu misreads)
    if (word === lower) return false;

    // Must start with Uppercase letter A-Z
    if (!/^[A-Z]/.test(word)) return false;

    // Reject gibberish patterns
    if (isLikelyGibberish(word)) return false;

    return true;
  });

  if (validWords.length === 0) return null;

  // Pakistani CNIC names are typically 2-4 words max (e.g. "Muhammad Ahmed Khan")
  // Trim to max 4 words to drop any trailing OCR artifacts
  const trimmedWords = validWords.slice(0, 4);

  // Format in Title Case (e.g., "Muhammad Zahid")
  const formatted = trimmedWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  if (formatted.length < 3 || CNIC_NOISE_WORDS.has(formatted.toLowerCase())) return null;

  return formatted;
};

const preprocessCNICText = (rawText) => {
  if (!rawText) return [];
  let text = cleanOcrText(rawText);

  // Insert line breaks before major CNIC field labels if they were merged onto one line by OCR
  text = text.replace(/(?<=\s|^)(Father\s*Name|Husband\s*Name|Father|Husband|Fathor|Fathar|Falher|Fathsr|Fatner|Father's\s*Name|Date\s*of\s*Birth|Birth\s*Date|D\.?O\.?B|Gender|Sex|Identity\s*Number|CNIC|NIC|Country\s*of\s*Stay|Date\s*of\s*Issue|Date\s*of\s*Expiry)(?=[:\s]|$)/gi, '\n$1');

  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
};

const extractCNICData = (rawText) => {
  const text = rawText || '';
  const cleanText = cleanOcrText(text);
  const normalizedText = normalizeDatesInText(cleanText);
  const lines = preprocessCNICText(normalizedText);

  // 1. CNIC Number
  let cnic = null;
  const robustCnicPattern = /\b([0-9OolISB]{5})[-\s]?([0-9OolISB]{7})[-\s]?([0-9OolISB])\b/i;
  const cnicMatch = cleanText.match(robustCnicPattern);
  if (cnicMatch) {
    cnic = `${fixOcrDigits(cnicMatch[1])}-${fixOcrDigits(cnicMatch[2])}-${fixOcrDigits(cnicMatch[3])}`;
  }

  // 2. Name
  let name = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Name|Narne|Namo|Nene|Holder|Card|Nal|Neme|Nama)/i.test(line) && !/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Fathor|Fathar|Falher|Fathsr|Fatner|Husb)/i.test(line)) {
      name = extractEnglishNameFromLine(line);
      if (name) break;

      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) break;
        name = extractEnglishNameFromLine(nextLine);
        if (name) break;
      }
      if (name) break;
    }
  }

  // Fallback for Holder Name: Take the first multi-word English name line near top
  if (!name) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:Republic|Pakistan|National|Identity|Card|Islamic|Address|Expiry|Issue|Birth|Gender)/i.test(line)) continue;
      const candidate = extractEnglishNameFromLine(line);
      if (candidate && candidate.split(' ').length >= 2) {
        name = candidate;
        break;
      }
    }
  }

  // 3. Father / Husband Name
  let fatherName = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Father|Husband|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|Fther|Feather|Fether|Husb|S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of|Wife\s+of)/i.test(line)) {
      fatherName = extractEnglishNameFromLine(line, true);
      if (fatherName && (!name || fatherName.toLowerCase() !== name.toLowerCase())) break;

      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) break;
        fatherName = extractEnglishNameFromLine(nextLine, true);
        if (fatherName && (!name || fatherName.toLowerCase() !== name.toLowerCase())) break;
      }
      if (fatherName) break;
    }
  }

  // Fallback for Father Name: scan lines after holder's name for another valid English name line
  if (!fatherName) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:Republic|Pakistan|National|Identity|Card|Islamic|Address|Expiry|Issue|Birth|Gender|CNIC|Date)/i.test(line)) continue;
      const candidate = extractEnglishNameFromLine(line, true);
      if (candidate && candidate.split(' ').length >= 2) {
        if (!name || candidate.toLowerCase() !== name.toLowerCase()) {
          fatherName = candidate;
          break;
        }
      }
    }
  }

  // 4. Date of Birth
  let dateOfBirth = null;
  const allDates = [];

  for (const line of lines) {
    const matches = [...line.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)];
    for (const match of matches) {
      const dayVal = parseInt(match[1]);
      const monthVal = parseInt(match[2]);
      const yearVal = parseInt(match[3]);

      if (dayVal >= 1 && dayVal <= 31 && monthVal >= 1 && monthVal <= 12 && yearVal >= 1950 && yearVal <= 2035) {
        allDates.push({
          dateStr: `${match[1]}/${match[2]}/${match[3]}`,
          year: yearVal,
          line
        });
      }
    }
  }

  // Attempt A: Date line explicitly contains "Birth" / "DOB" / "Date of Birth"
  const birthDateObj = allDates.find(d => /Birth|DOB|D\.O\.B|Bate|Dote|Dafe/i.test(d.line));
  if (birthDateObj) {
    dateOfBirth = birthDateObj.dateStr;
  }

  // Attempt B (Earliest Date Rule): DOB is ALWAYS the earliest date on a Pakistani CNIC (1950-2012)!
  if (!dateOfBirth && allDates.length > 0) {
    const birthCandidates = allDates.filter(d => d.year <= 2012 && d.year >= 1950);
    if (birthCandidates.length > 0) {
      birthCandidates.sort((a, b) => a.year - b.year);
      dateOfBirth = birthCandidates[0].dateStr;
    }
  }

  // 5. Gender
  let gender = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Gender|Sex/i.test(line)) {
      for (let j = 0; j <= 2; j++) {
        const checkLine = lines[i + j];
        if (!checkLine) continue;
        for (const token of checkLine.split(/[\s/]+/)) {
          const cleanToken = token.trim().toUpperCase();
          if (cleanToken === 'M' || cleanToken === 'MALE') { gender = 'male'; break; }
          else if (cleanToken === 'F' || cleanToken === 'FEMALE') { gender = 'female'; break; }
        }
        if (gender) break;
      }
    }
    if (gender) break;
  }

  // Gender fallback: scan entire text for standalone Male/Female
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

  // Gender fallback: infer from CNIC last digit (Pakistani CNICs: odd = male, even = female)
  if (!gender && cnic) {
    const lastDigit = parseInt(cnic.replace(/-/g, '').slice(-1));
    if (!isNaN(lastDigit)) {
      gender = lastDigit % 2 !== 0 ? 'male' : 'female';
    }
  }

  // 6. Address
  let address = null;
  const addressPatterns = [
    /(?:Address|Addr)\s*[:\-\/\s]+([A-Za-z0-9][A-Za-z0-9 ,.\/#\-]{10,})/im,
    /(?:Address|Addr)\s*\n\s*([A-Za-z0-9][A-Za-z0-9 ,.\/#\-]{10,})/im,
  ];
  for (const pattern of addressPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      address = match[1].trim().replace(/\s*(Country|Expiry|Date).*$/i, '').trim();
      if (address.length < 10) address = null;
      else break;
    }
  }

  return { cnic, name, father_name: fatherName, date_of_birth: dateOfBirth, gender, address };
};

// Board normalization dictionary for Pakistani Boards & common OCR misreads
const normalizeBoardName = (rawText) => {
  if (!rawText) return null;
  const str = rawText.toLowerCase();

  // Known city/board mappings & common OCR misreads (e.g. Latiore -> Lahore)
  if (/federal|fbise|islamabad/i.test(str)) return "FBISE Islamabad";
  if (/lahore|latiore|lafore|lahor|lahere|lahr|latior/i.test(str)) return "BISE Lahore";
  if (/gujranwala|gujranwla|gujrat/i.test(str)) return "BISE Gujranwala";
  if (/rawalpindi|rawalpind|rwp|pindi/i.test(str)) return "BISE Rawalpindi";
  if (/multan|mooltan/i.test(str)) return "BISE Multan";
  if (/faisalabad|faislabad|lyallpur/i.test(str)) return "BISE Faisalabad";
  if (/sargodha|sargoda/i.test(str)) return "BISE Sargodha";
  if (/sahiwal|sahiwa/i.test(str)) return "BISE Sahiwal";
  if (/bahawalpur|bahawlpur|bwl/i.test(str)) return "BISE Bahawalpur";
  if (/dg\s*khan|d\.g\s*khan|dera\s*ghazi\s*khan/i.test(str)) return "BISE DG Khan";
  if (/karachi|khi/i.test(str)) return "BISE Karachi";
  if (/hyderabad/i.test(str)) return "BISE Hyderabad";
  if (/sukkur/i.test(str)) return "BISE Sukkur";
  if (/larkana/i.test(str)) return "BISE Larkana";
  if (/mirpurkhas/i.test(str)) return "BISE Mirpurkhas";
  if (/peshawar|psh/i.test(str)) return "BISE Peshawar";
  if (/swat/i.test(str)) return "BISE Swat";
  if (/kohat/i.test(str)) return "BISE Kohat";
  if (/abbottabad|abottabad/i.test(str)) return "BISE Abbottabad";
  if (/bannu/i.test(str)) return "BISE Bannu";
  if (/mardan/i.test(str)) return "BISE Mardan";
  if (/malakand/i.test(str)) return "BISE Malakand";
  if (/quetta/i.test(str)) return "BISE Quetta";
  if (/aga\s*khan|aku/i.test(str)) return "Aga Khan Board";
  if (/cambridge|cie|edexcel|igcse/i.test(str)) return "Cambridge Board";

  return null;
};

// Convert number words in English (e.g., "Nine Hundred Fifty") to digits
const wordsToNumber = (text) => {
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

const extractAcademicData = (text) => {
  const cleanText = cleanOcrText(text);

  // 1. Board Name Detection & Normalization
  let board = null;
  const biseMatch = text.match(/(?:Board\s+of\s+Intermediate(?:\s+(?:and|&|&amp;)?\s+Secondary\s+Education)?|BISE)[\s,:]*([A-Za-z]+)/i);
  if (biseMatch) {
    const rawCity = biseMatch[1].trim();
    board = normalizeBoardName(rawCity);
    if (!board) {
      const formattedCity = rawCity.charAt(0).toUpperCase() + rawCity.slice(1).toLowerCase();
      board = `BISE ${formattedCity}`;
    }
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
  const rollMatch = text.match(/Roll\s*(?:No|Number|#)?[\s:.]+([A-Za-z0-9-]+)/i);

  // 4. Obtained Marks & Total Marks Extraction
  let obtainedMarks = null;
  let totalMarks = null;

  // Pre-clean text: collapse spaced digits (e.g. "9 5 0" -> "950", "1 1 0 0" -> "1100")
  let cleanSpacedDigits = text.replace(/(?<=\b\d)\s+(?=\d\b)/g, '');

  const cleanedNumText = cleanSpacedDigits
    .replace(/([0-9])([OolISBZ])([0-9])/gi, (m, p1, p2, p3) => `${p1}${fixOcrDigits(p2)}${p3}`)
    .replace(/([0-9]{2,3})([OolISBZ])\b/gi, (m, p1, p2) => `${p1}${fixOcrDigits(p2)}`);

  // a) Ratio patterns (e.g. 950 / 1100, 450/550, 450 out of 550, 450 of 550, 950-1100, 950:1100)
  const ratioMatches = [...cleanedNumText.matchAll(/\b([0-9OolISBZ]{2,4})\s*(?:\/|\\|out\s+of|\bof\b|:|-)\s*([0-9OolISBZ]{3,4})\b/gi)];
  for (const match of ratioMatches) {
    const obtCandidate = parseInt(fixOcrDigits(match[1]));
    const totCandidate = parseInt(fixOcrDigits(match[2]));
    if (!isNaN(obtCandidate) && !isNaN(totCandidate)) {
      if (totCandidate >= 300 && totCandidate <= 1200 && obtCandidate <= totCandidate && obtCandidate >= 100) {
        obtainedMarks = obtCandidate;
        totalMarks = totCandidate;
        break;
      }
    }
  }

  // b) Explicit field labels if missing
  if (!obtainedMarks) {
    const obtMatch = cleanedNumText.match(/(?:Marks\s*Obtained|Obtained\s*Marks|Total\s*Marks\s*Obtained|Marks\s*Secured|Secured\s*Marks|Marks\s*Obt|Obt\s*Marks|Obtained|securing|passed\s+with|with)[\s:\-]*([0-9OolISBZ]{3,4})\s*(?:marks)?\b/i)
      || cleanedNumText.match(/([0-9OolISBZ]{3,4})\s*marks\b/i);
    if (obtMatch) {
      const val = parseInt(fixOcrDigits(obtMatch[1]));
      if (!isNaN(val) && val >= 100 && val <= 1200) obtainedMarks = val;
    }
  }

  if (!totalMarks) {
    const totMatch = cleanedNumText.match(/(?:Total\s*Marks|Maximum\s*Marks|Max\s*Marks|Out\s*of|Total)[\s:\-]*([0-9OolISBZ]{3,4})\b/i);
    if (totMatch) {
      const val = parseInt(fixOcrDigits(totMatch[1]));
      if (!isNaN(val) && val >= 300 && val <= 1200) totalMarks = val;
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
      const numbersInRow = rowMatch[1].split(/\s+/).map(n => parseInt(fixOcrDigits(n))).filter(n => !isNaN(n) && n >= 100 && n <= 1200);
      if (numbersInRow.length >= 2) {
        const stdTotals = [1100, 1050, 850, 550, 500, 600, 1200, 800, 400];
        const foundTotal = numbersInRow.find(n => stdTotals.includes(n)) || Math.max(...numbersInRow);
        const foundObt = numbersInRow.find(n => n !== foundTotal && n <= foundTotal && n >= 100);
        if (foundTotal && !totalMarks) totalMarks = foundTotal;
        if (foundObt && !obtainedMarks) obtainedMarks = foundObt;
      }
    }
  }

  // e) Generic Pakistani total marks scan if total is still missing
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
      .map(m => parseInt(fixOcrDigits(m[1])))
      .filter(n => !isNaN(n) && n >= 150 && n < totalMarks && n !== totalMarks);
    if (allNums.length > 0) {
      obtainedMarks = Math.max(...allNums);
    }
  }

  // g) Fallback: If totalMarks is missing but obtainedMarks is found, default to standard Pakistani total (1100 or 550)
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

  const gradeMatch = text.match(/Grade[\s:]+([A-F][+-]?)/i);

  // Extract candidate name from academic certificate
  let name = null;
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Name\s*(?:of\s+)?(?:Candidate|Student|Examinee)|Student\s*Name|Candidate\s*Name)\s*[:\-]?/i.test(line)
        && !/(?:Father|Husband|Mother|Board|Institution|School|College)/i.test(line)) {
      const sameLineMatch = line.match(/(?:Name\s*(?:of\s+)?(?:Candidate|Student|Examinee)|Student\s*Name|Candidate\s*Name)\s*[:\-]?\s*(.+)$/i);
      if (sameLineMatch && sameLineMatch[1]) {
        const val = sameLineMatch[1].replace(/[^A-Za-z\s]/g, '').trim();
        if (val.length >= 3) name = val;
      }
      if (!name) {
        for (let j = 1; j <= 2; j++) {
          const nextLine = lines[i + j];
          if (!nextLine) break;
          if (/(?:Father|Husband|Mother|Board|Institution|School|College|Roll|Marks)/i.test(nextLine)) break;
          const val = nextLine.replace(/[^A-Za-z\s]/g, '').trim();
          if (val.length >= 3) { name = val; break; }
        }
      }
      if (name) break;
    }
  }

  // Extract father name
  let fatherName = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Father|Guardian|Parent)[\s']?s?\s*(?:Name)?\s*[:\-]?/i.test(line)
        && !/(?:Date|Birth|CNIC|Identity|Gender|Board|Institution|School)/i.test(line)) {
      const sameLineMatch = line.match(/(?:Father|Guardian|Parent)[\s']?s?\s*(?:Name)?\s*[:\-]?\s*(.+)$/i);
      if (sameLineMatch && sameLineMatch[1]) {
        const val = sameLineMatch[1].replace(/[^A-Za-z\s]/g, '').trim();
        if (val.length >= 3) fatherName = val;
      }
      if (!fatherName) {
        for (let j = 1; j <= 2; j++) {
          const nextLine = lines[i + j];
          if (!nextLine) break;
          if (/(?:Name|Roll|Marks|Board|Institution|School|College|Date)/i.test(nextLine)) break;
          const val = nextLine.replace(/[^A-Za-z\s]/g, '').trim();
          if (val.length >= 3) { fatherName = val; break; }
        }
      }
      if (fatherName) break;
    }
  }

  return {
    percentage: percentage,
    grade: gradeMatch ? gradeMatch[1] : null,
    passing_year: passingYear,
    board: board,
    roll_number: rollMatch ? rollMatch[1] : null,
    obtained_marks: obtainedMarks,
    total_marks: totalMarks,
    name: name,
    father_name: fatherName,
  };
};

// ===== Cross-Document Name Verification =====
const normalizeNameForComparison = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')  // remove non-alpha
    .replace(/\s+/g, ' ')      // collapse whitespace
    .trim();
};

const namesMatch = (name1, name2) => {
  if (!name1 || !name2) return true; // can't compare if either is missing, skip
  const n1 = normalizeNameForComparison(name1);
  const n2 = normalizeNameForComparison(name2);
  if (!n1 || !n2) return true;

  // Exact match
  if (n1 === n2) return true;

  // Check if one name contains the other (handles middle name differences)
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Token-based comparison: if all tokens of the shorter name appear in the longer name
  const tokens1 = n1.split(' ');
  const tokens2 = n2.split(' ');
  const shorter = tokens1.length <= tokens2.length ? tokens1 : tokens2;
  const longer = tokens1.length > tokens2.length ? tokens1 : tokens2;
  const allShorterInLonger = shorter.every(t => longer.some(lt => lt === t || lt.includes(t) || t.includes(lt)));
  if (allShorterInLonger) return true;

  return false;
};

// ===== Cross-Document Identity Verification =====
const crossDocumentVerification = (currentDocType, currentExtractedData, uploadedFiles, userProfile) => {
  const warnings = [];
  let rejectCurrentDoc = false;
  const removeIndices = []; // indices of existing docs to remove if CNIC overrides them

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

  // 1. Compare against user profile (if profile details are present)
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

  // 2. Compare against EVERY previously uploaded document in uploadedFiles
  uploadedFiles.forEach((file, index) => {
    if (!file.extractedData) return;
    const existingData = file.extractedData;
    const existingLabel = docTypeLabels[file.type] || 'Uploaded Document';

    // Candidate Name Check
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

    // Father Name Check
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

// Helper function to scale up and enhance contrast of images/canvases for Tesseract OCR
const preprocessImageForOcr = (imageOrCanvas) => {
  return new Promise((resolve) => {
    const processCanvas = (srcCanvas) => {
      try {
        let width = srcCanvas.width;
        let height = srcCanvas.height;

        const targetWidth = Math.max(width, 2200);
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
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          let v = (gray - 128) * 1.35 + 128;
          v = Math.min(255, Math.max(0, v));
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(outCanvas);
      } catch (err) {
        console.warn('Preprocessing canvas failed, using original canvas:', err);
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
        tempCanvas.width = img.width || 1000;
        tempCanvas.height = img.height || 1000;
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
  let pageCount = pdf.numPages;

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.5 }); // Use 2.5 scale for high resolution rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const processedCanvas = await preprocessImageForOcr(canvas);

    // Run Tesseract OCR on page canvas
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

  // Pre-populate form from existing user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || prev.full_name,
        father_name: user.father_name || prev.father_name,
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

  // Auto-fill form fields based on OCR extracted data and document type
  const autoFillFromOCR = (extractedData, docType) => {
    const newFilledFields = new Set(ocrFilledFields);

    setFormData(prev => {
      const updated = { ...prev };

      if (docType === 'cnic') {
        if (extractedData.name) {
          updated.full_name = extractedData.name;
          newFilledFields.add('full_name');
        }
        if (extractedData.father_name) {
          updated.father_name = extractedData.father_name;
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

  // Clear auto-filled form fields for a given document type (used when a document is rejected or removed)
  const clearOCRFieldsForDocType = (docType) => {
    const fieldsToClear = [];
    if (docType === 'cnic') {
      fieldsToClear.push('full_name', 'father_name', 'date_of_birth', 'gender', 'cnic', 'address', 'permanent_address');
    } else if (docType === 'matric') {
      fieldsToClear.push('matric_board', 'matric_passing_year', 'matric_obtained_marks', 'matric_total_marks');
    } else if (docType === 'intermediate' || docType === 'transcript') {
      fieldsToClear.push('inter_board', 'inter_passing_year', 'inter_obtained_marks', 'inter_total_marks');
    }

    if (fieldsToClear.length > 0) {
      setFormData(prev => {
        const updated = { ...prev };
        fieldsToClear.forEach(field => {
          // Only clear fields that were auto-filled by OCR, not user-entered ones
          if (ocrFilledFields.has(field)) {
            updated[field] = '';
          }
        });
        return updated;
      });

      setOcrFilledFields(prev => {
        const next = new Set(prev);
        fieldsToClear.forEach(field => next.delete(field));
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
      // Photograph doesn't need OCR but still must be a valid format (PDF or image)
      if (documentType === 'photograph') {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: documentType,
          extractedData: null,
          confidence: 100
        }]);
        toast.success('Photograph uploaded successfully!');
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
        // Run Tesseract OCR on preprocessed image canvas for higher accuracy
        const processedCanvas = await preprocessImageForOcr(file);
        const result = await Tesseract.recognize(processedCanvas, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });
        extractedText = result?.data?.text || '';
        confidence = result?.data?.confidence || 0;
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

      // If CNIC was uploaded and existing documents don't match, remove conflicting docs and clear their form data
      if (removeIndices.length > 0) {
        // Clear auto-filled form data for each removed document
        removeIndices.forEach(idx => {
          const removedFile = uploadedFiles[idx];
          if (removedFile) {
            clearOCRFieldsForDocType(removedFile.type);
          }
        });
        setUploadedFiles(prev => prev.filter((_, i) => !removeIndices.includes(i)));
        nameWarnings.forEach(warning => {
          toast.error(warning, { duration: 8000, icon: '⚠️' });
        });
      }

      setUploadedFiles(prev => [...prev, {
        name: file.name,
        type: documentType,
        extractedData,
        confidence
      }]);

      // Auto-fill form fields from OCR data
      autoFillFromOCR(extractedData, documentType);

      toast.success('Document processed & data extracted successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error processing document');
    } finally {
      setUploading(false);
      setProcessingFile(null);
      setUploadingDocType(null);
    }
  }, [documentType, ocrFilledFields]);

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

  const removeFile = (index) => {
    // Clear auto-extracted form data for the removed document type
    const removedFile = uploadedFiles[index];
    if (removedFile) {
      clearOCRFieldsForDocType(removedFile.type);
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        cnic: formData.cnic,
        father_name: formData.father_name,
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
        setUser({ ...user, ...data.user, is_verified: true });
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
      {user?.is_verified ? (
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
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">Verification Mandatory Notice</h4>
              <p className="text-xs text-amber-200/80 mt-0.5">All non-optional documents (CNIC, Photograph, Matric Certificate, Intermediate Certificate) must be uploaded to verify your profile and enable application submission.</p>
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
          <h3 className="text-lg font-semibold text-white mb-4">Uploaded Documents ({uploadedFiles.length})</h3>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded">
                    <FileText className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {documentTypes.find(t => t.id === file.type)?.name}
                      {file.confidence ? ` • Confidence: ${file.confidence?.toFixed(1)}%` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
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
                {renderField('CNIC / B-Form Number', 'cnic', 'text', { placeholder: 'XXXXX-XXXXXXX-X' })}
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
                {renderField('Mobile Number', 'phone', 'tel', { placeholder: '03XX-XXXXXXX' })}
                {renderField("Father's / Guardian Phone Number", 'father_phone', 'tel', { placeholder: '03XX-XXXXXXX' })}
                {renderField('Alternate Mobile Number', 'alternate_phone', 'tel', { placeholder: '03XX-XXXXXXX (Optional)' })}
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
