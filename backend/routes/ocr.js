import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import { authenticateToken } from '../middleware/auth.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pdfParse = null;
const getPdfParse = () => {
  if (!pdfParse) {
    try {
      const require = createRequire(import.meta.url);
      pdfParse = require('pdf-parse');
    } catch (e) {
      console.warn('pdf-parse lazy load warning:', e.message);
    }
  }
  return pdfParse;
};

// Trigger nodemon reload
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authenticateToken);

/**
 * Clean OCR text by removing common noise characters
 */
const cleanOcrText = (text) => {
  return text
    .replace(/[^\x00-\x7F\s]/g, ' ')   // Remove non-ASCII (Urdu chars etc.)
    .replace(/\r\n/g, '\n')             // Normalize line endings
    .replace(/[ \t]+/g, ' ')            // Collapse multiple spaces/tabs
    .replace(/\n{3,}/g, '\n\n')         // Collapse excessive newlines
    .trim();
};

/**
 * Extract CNIC data using multiple strategies for robustness
 */
/**
 * Helper to fix common OCR digit-to-letter misreads
 */
const fixOcrDigits = (str) => {
  return str
    .replace(/O/gi, '0')
    .replace(/[Il]/g, '1')
    .replace(/S/gi, '5')
    .replace(/B/g, '8')
    .replace(/Z/gi, '2');
};

/**
 * Score a name candidate to prioritize valid multi-word names and penalize OCR noise
 */
const CNIC_NOISE_WORDS = new Set([
  'gney', 'attorney', 'sign', 'signature', 'sig', 'specimen', 'card', 'holder',
  'national', 'republic', 'pakistan', 'islamic', 'identity', 'number', 'reg',
  'general', 'registrar', 'head', 'authority', 'nadra', 'govt', 'gov', 'pak',
  'sai', 'sam', 'nam', 'namo', 'nene', 'nal', 'fath', 'fathar', 'fathor', 'fathsr',
  'fatner', 'husb', 'father', 'husband', 'mother', 'date', 'birth', 'gender',
  'sex', 'country', 'stay', 'expiry', 'issue', 'address', 'nic', 'cnic', 'puck',
  'name', 'narne', 'neme', 'nama', 'of', 'the', 'and', 'for', 'with',
  'valid', 'from', 'till', 'renewal', 'fee', 'status', 'photo',
  'thumb', 'impression', 'print', 'finger', 'left', 'right',
  'registration', 'form', 'office', 'district', 'province', 'tehsil',
  'holders', 'des', 'der', 'sur', 'soi', 'sor', 'so', 'do', 'wo',
  'mr', 'mrs', 'ms', 'miss', 'dr', 'pk', 'pkr', 'id', 'no', 'num', 's/o', 'd/o', 'w/o'
]);

/**
 * Clean and format candidate name string by stripping CNIC noise words
 */
const cleanNameCandidate = (rawStr) => {
  if (!rawStr) return null;

  let text = rawStr
    .replace(/(?:Father|Husband|Mother|Name|Narne|Namo|Nene|Holder|Card|Nal|Neme|Nama|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|Fther|Feather|Fether|Husb|S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of|Wife\s+of)\s*[:\-]?/gi, ' ')
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  const words = text.split(' ').filter(w => w.length > 0);

  const validWords = words.filter(word => {
    const lower = word.toLowerCase();
    if (CNIC_NOISE_WORDS.has(lower)) return false;
    if (word.length < 2) return false;
    return true;
  });

  if (validWords.length < 1) return null;

  return validWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Extract all dates from OCR text with flexible separators and digit misread fixes
 */
const extractAllDatesFromText = (rawText) => {
  if (!rawText) return [];
  const clean = cleanOcrText(rawText);
  const dates = [];

  const regex = /([0-9OolISB]{1,2})[\s.\-\/,:]{1,3}([0-9OolISB]{1,2})[\s.\-\/,:]{1,3}([0-9OolISB]{4})/g;

  let match;
  while ((match = regex.exec(clean)) !== null) {
    const dayVal = parseInt(fixOcrDigits(match[1]));
    const monthVal = parseInt(fixOcrDigits(match[2]));
    const yearVal = parseInt(fixOcrDigits(match[3]));

    if (dayVal >= 1 && dayVal <= 31 && monthVal >= 1 && monthVal <= 12 && yearVal >= 1950 && yearVal <= 2035) {
      const formattedDay = dayVal.toString().padStart(2, '0');
      const formattedMonth = monthVal.toString().padStart(2, '0');
      const matchIndex = match.index;

      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(clean.length, matchIndex + match[0].length + 30);
      const context = clean.substring(start, end);

      dates.push({
        dateStr: `${formattedDay}/${formattedMonth}/${yearVal}`,
        year: yearVal,
        context
      });
    }
  }

  return dates;
};

/**
 * Extract CNIC data using robust strategies tailored for Pakistani CNICs
 */
const extractCNICData = (rawText) => {
  const text = rawText || '';
  const cleanText = cleanOcrText(text);
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('--- OCR Raw Text ---');
  console.log(rawText);
  console.log('--- OCR Lines ---');
  lines.forEach((l, i) => console.log(`  [${i}]: "${l}"`));

  // ===== 1. CNIC Number =====
  let cnic = null;
  const robustCnicPattern = /\b([0-9OolISB]{5})[-\s]?([0-9OolISB]{7})[-\s]?([0-9OolISB])\b/i;
  const cnicMatch = cleanText.match(robustCnicPattern);
  if (cnicMatch) {
    const part1 = fixOcrDigits(cnicMatch[1]);
    const part2 = fixOcrDigits(cnicMatch[2]);
    const part3 = fixOcrDigits(cnicMatch[3]);
    cnic = `${part1}-${part2}-${part3}`;
  }

  // ===== 2. Holder Name =====
  let name = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Name|Narne|Namo|Nene|Holder|Card|Nal|Neme|Nama)/i.test(line) && !/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Fathor|Fathar|Falher|Fathsr|Fatner|Husb)/i.test(line)) {
      name = cleanNameCandidate(line);
      if (name && name.split(' ').length >= 2) break;

      for (let j = 1; j <= 2; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) break;
        const cand = cleanNameCandidate(nextLine);
        if (cand && cand.split(' ').length >= 2) { name = cand; break; }
      }
      if (name) break;
    }
  }

  // Fallback for Name: scan top lines for any 2+ word candidate that isn't header noise
  if (!name) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:Republic|Pakistan|National|Identity|Card|Islamic|Address|Expiry|Issue|Birth|Gender|Father|Husband)/i.test(line)) continue;
      const cand = cleanNameCandidate(line);
      if (cand && cand.split(' ').length >= 2) {
        name = cand;
        break;
      }
    }
  }

  // ===== 3. Father / Husband Name =====
  let fatherName = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Father|Husband|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|Fther|Feather|Fether|Husb|S\/O|D\/O|W\/O|Son\s+of|Daughter\s+of|Wife\s+of)/i.test(line)) {
      fatherName = cleanNameCandidate(line);
      if (fatherName && fatherName.split(' ').length >= 2 && (!name || fatherName.toLowerCase() !== name.toLowerCase())) break;

      for (let j = 1; j <= 2; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) break;
        const cand = cleanNameCandidate(nextLine);
        if (cand && cand.split(' ').length >= 2 && (!name || cand.toLowerCase() !== name.toLowerCase())) {
          fatherName = cand;
          break;
        }
      }
      if (fatherName) break;
    }
  }

  // Fallback for Father Name: scan lines after holder name for another 2+ word candidate
  if (!fatherName) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:Republic|Pakistan|National|Identity|Card|Islamic|Address|Expiry|Issue|Birth|Gender|CNIC|Date|Name)/i.test(line)) continue;
      const cand = cleanNameCandidate(line);
      if (cand && cand.split(' ').length >= 2 && (!name || cand.toLowerCase() !== name.toLowerCase())) {
        fatherName = cand;
        break;
      }
    }
  }

  // ===== 4. Date of Birth =====
  let dateOfBirth = null;
  const allDates = extractAllDatesFromText(cleanText);

  // Attempt A: Context contains "Birth", "DOB", etc.
  const birthDateObj = allDates.find(d => /Birth|DOB|D\.O\.B|Bate|Dote|Dafe/i.test(d.context));
  if (birthDateObj) {
    dateOfBirth = birthDateObj.dateStr;
  }

  // Attempt B (Earliest Date Rule): DOB is ALWAYS the earliest date on a Pakistani CNIC (1950-2012)
  if (!dateOfBirth && allDates.length > 0) {
    const birthCandidates = allDates.filter(d => d.year <= 2012 && d.year >= 1950);
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

  // ===== 6. Address =====
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

  const result = {
    cnic,
    name,
    father_name: fatherName,
    date_of_birth: dateOfBirth,
    gender,
    address,
    raw_text: rawText
  };

  console.log('--- Extracted CNIC Data ---');
  console.log(JSON.stringify(result, null, 2));

  return result;
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

  const subjectPatterns = {
    'Physics': /Physics[\s:]+(\d+)/i,
    'Chemistry': /Chemistry[\s:]+(\d+)/i,
    'Biology': /Biology[\s:]+(\d+)/i,
    'Mathematics': /Mathematics[\s:]+(\d+)/i,
    'Computer Science': /Computer[\s:]+(\d+)/i,
    'English': /English[\s:]+(\d+)/i,
    'Urdu': /Urdu[\s:]+(\d+)/i,
    'Pakistan Studies': /Pakistan Studies[\s:]+(\d+)/i,
    'Islamic Studies': /Islamic Studies[\s:]+(\d+)/i
  };

  const subjectScores = {};
  Object.entries(subjectPatterns).forEach(([subject, pattern]) => {
    const match = text.match(pattern);
    if (match) {
      subjectScores[subject] = parseInt(match[1]);
    }
  });

  return {
    percentage: percentage,
    grade: gradeMatch ? gradeMatch[1] : null,
    passing_year: passingYear,
    board: board,
    roll_number: rollMatch ? rollMatch[1] : null,
    obtained_marks: obtainedMarks,
    total_marks: totalMarks,
    subject_scores: subjectScores,
    raw_text: text
  };
};

router.post('/extract', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const { document_type } = req.body;
    const fileBuffer = req.file.buffer;

    console.log(`\n=== OCR Request: type=${document_type}, file=${req.file.originalname}, size=${req.file.size} bytes ===`);

    let extractedText = '';
    let confidence = 100;

    // Check file format
    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    const isImage = req.file.mimetype.startsWith('image/') || /\.(png|jpe?g)$/i.test(req.file.originalname);

    if (!isPdf && !isImage) {
      return res.status(400).json({ error: 'Only PDF, PNG, or JPG/JPEG documents are allowed.' });
    }

    if (isPdf) {
      try {
        const pdfParser = getPdfParse();
        if (pdfParser) {
          const pdfData = await pdfParser(fileBuffer);
          extractedText = pdfData.text || '';
          console.log(`PDF digital text extraction complete. Extracted length: ${extractedText.length}`);
        }
      } catch (pdfError) {
        console.error('pdf-parse error, falling back to Tesseract:', pdfError);
      }
    }

    // Fallback to Tesseract OCR if PDF digital text extraction returned no text, or if file is an image
    if (!extractedText || extractedText.trim().length < 50) {
      console.log('Running Tesseract OCR on the file buffer...');
      try {
        // Use createWorker for more reliable processing with local traineddata
        const worker = await Tesseract.createWorker('eng', 1, {
          langPath: path.join(__dirname, '..'),
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });

        // Set page segmentation mode to automatic for best results
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });

        const result = await worker.recognize(fileBuffer);
        extractedText = result?.data?.text || '';
        confidence = result?.data?.confidence || 0;

        console.log(`OCR Complete: confidence=${confidence}%, text length=${extractedText.length}`);

        await worker.terminate();
      } catch (tesseractError) {
        console.error('Tesseract error:', tesseractError);
        // If we don't have any extracted text from digital parse either, fail
        if (!extractedText) {
          return res.status(500).json({
            error: 'OCR processing failed',
            details: tesseractError.message
          });
        }
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        error: 'No text could be extracted from the document. Please ensure it is clear and legible.'
      });
    }

    let extractedData;
    if (document_type === 'cnic') {
      extractedData = extractCNICData(extractedText);
    } else if (document_type === 'academic') {
      extractedData = extractAcademicData(extractedText);
    } else {
      extractedData = {
        raw_text: extractedText,
        cnic: extractCNICData(extractedText).cnic,
        academic: extractAcademicData(extractedText)
      };
    }

    // Auto-Reject Blurry / Unreadable Documents
    const cleanLen = (extractedText || '').trim().length;
    if (cleanLen < 20) {
      return res.status(400).json({
        error: 'Document Rejected: The uploaded image is too blurry or low resolution. Please upload a clear, focused photo.'
      });
    }

    if (confidence > 0 && confidence < 35) {
      return res.status(400).json({
        error: `Document Rejected: Image clarity is too low (OCR Confidence: ${Math.round(confidence)}%). Please upload a clearer image.`
      });
    }

    if (document_type === 'cnic' && !extractedData?.cnic && !extractedData?.name) {
      return res.status(400).json({
        error: 'Document Rejected: Could not read key CNIC details (CNIC Number or Name) from this image. Please upload a clearer photo of your CNIC/B-Form.'
      });
    }

    res.json({
      message: 'Document processed successfully',
      extracted_data: extractedData,
      confidence: confidence
    });
  } catch (error) {
    console.error('OCR extraction error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

router.post('/verify-cnic', async (req, res) => {
  try {
    const { cnic, name } = req.body;

    // CNIC should be in format XXXXX-XXXXXXX-X (15 chars with dashes)
    const isValidFormat = cnic && /^\d{5}-\d{7}-\d$/.test(cnic);
    const isValid = isValidFormat && name && name.length >= 2;

    res.json({
      valid: isValid,
      message: isValid ? 'CNIC verified successfully' : 'CNIC verification failed'
    });
  } catch (error) {
    console.error('CNIC verification error:', error);
    res.status(500).json({ error: 'Failed to verify CNIC' });
  }
});

// ===== Persistent Document Database Endpoints =====

// 1. Upload & Persist Document in Database
router.post('/upload-document', async (req, res) => {
  try {
    const {
      type,
      name,
      file_data,
      file_url,
      mime_type,
      size,
      extracted_data,
      confidence
    } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: 'Document type and name are required' });
    }

    const userId = req.user.id;

    // Upsert document record in MongoDB Document collection
    const document = await Document.findOneAndUpdate(
      { user_id: userId, type: type },
      {
        user_id: userId,
        type: type,
        name: name,
        file_data: file_data || null,
        file_url: file_url || null,
        mime_type: mime_type || 'application/pdf',
        size: size || 0,
        extracted_data: extracted_data || {},
        confidence: confidence !== undefined ? confidence : 100,
        uploaded_at: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Synchronize user.uploaded_documents array
    const user = await User.findById(userId);
    if (user) {
      const currentUploaded = user.uploaded_documents || [];
      if (!currentUploaded.includes(type)) {
        user.uploaded_documents = [...currentUploaded, type];
        await user.save();
      }
    }

    res.status(200).json({
      message: 'Document saved in database successfully',
      document
    });
  } catch (error) {
    console.error('Save document error:', error);
    res.status(500).json({ error: 'Failed to save document in database' });
  }
});

// 2. Fetch All Stored Documents for Current User
router.get('/my-documents', async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await Document.find({ user_id: userId }).sort({ uploaded_at: 1 });

    const user = await User.findById(userId);
    const userDocTypes = user?.uploaded_documents || [];

    const existingTypes = new Set(documents.map(d => d.type));
    const resultDocs = documents.map(d => d.toObject());

    const typeNames = {
      cnic: 'CNIC / B-Form',
      photograph: 'Recent Photograph',
      matric: 'Matric Certificate',
      intermediate: 'Intermediate Certificate',
      transcript: 'Transcript / Mark Sheet',
      domicile: 'Domicile Certificate'
    };

    // If User record already has verified/uploaded types without a Document record, synthesize entry so it stays visible
    for (const dt of userDocTypes) {
      if (!existingTypes.has(dt)) {
        resultDocs.push({
          _id: `synthesized-${dt}`,
          user_id: userId,
          type: dt,
          name: `${typeNames[dt] || dt}`,
          file_data: null,
          file_url: null,
          extracted_data: {},
          confidence: 100,
          uploaded_at: user.updated_at || user.created_at || new Date()
        });
      }
    }

    res.json({
      documents: resultDocs,
      uploaded_types: userDocTypes,
      is_verified: user?.is_verified ?? false
    });
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// 3. Delete Document by Type from Database
router.delete('/my-documents/type/:docType', async (req, res) => {
  try {
    const userId = req.user.id;
    const { docType } = req.params;

    // Delete from Document collection
    await Document.deleteMany({ user_id: userId, type: docType });

    // Update User.uploaded_documents
    const user = await User.findById(userId);
    if (user) {
      const remaining = (user.uploaded_documents || []).filter(t => t !== docType);
      user.uploaded_documents = remaining;

      // Check if any mandatory document is missing
      const mandatoryTypes = ['cnic', 'photograph', 'matric', 'intermediate'];
      const hasAllMandatory = mandatoryTypes.every(m => remaining.includes(m));
      if (!hasAllMandatory) {
        user.is_verified = false;
      }

      await user.save();

      return res.json({
        message: 'Document deleted from database successfully',
        uploaded_documents: user.uploaded_documents,
        is_verified: user.is_verified
      });
    }

    res.json({ message: 'Document deleted from database' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// 4. Delete Document by ID from Database
router.delete('/my-documents/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    let docType = null;
    if (id.startsWith('synthesized-')) {
      docType = id.replace('synthesized-', '');
    } else {
      const doc = await Document.findOne({ _id: id, user_id: userId });
      if (doc) {
        docType = doc.type;
        await Document.deleteOne({ _id: id });
      }
    }

    const user = await User.findById(userId);
    if (user && docType) {
      const remaining = (user.uploaded_documents || []).filter(t => t !== docType);
      user.uploaded_documents = remaining;

      const mandatoryTypes = ['cnic', 'photograph', 'matric', 'intermediate'];
      const hasAllMandatory = mandatoryTypes.every(m => remaining.includes(m));
      if (!hasAllMandatory) {
        user.is_verified = false;
      }

      await user.save();
    }

    res.json({
      message: 'Document deleted from database successfully',
      uploaded_documents: user?.uploaded_documents || [],
      is_verified: user?.is_verified ?? false
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// 5. Retrieve Single Document Data / File
router.get('/document/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only allow owner or admin
    if (doc.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ document: doc });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

export default router;


