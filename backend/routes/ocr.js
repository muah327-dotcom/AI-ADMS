import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import { authenticateToken } from '../middleware/auth.js';
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
  'name', 'narne', 'neme'
]);

const sanitizeNameString = (nameStr) => {
  if (!nameStr) return null;

  let cleaned = nameStr
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  const words = cleaned.split(' ').filter(w => w.length > 0);

  const validWords = words.filter((word, idx) => {
    const lower = word.toLowerCase();

    // 1. Strip known CNIC label & OCR noise words
    if (CNIC_NOISE_WORDS.has(lower)) return false;

    // 2. Strip lowercase-only words at the start of the name (e.g., "gney" in "gney Muhammad Zahid")
    if (idx === 0 && word === lower && words.length > 1) return false;

    // 3. Strip trailing short noise (1-2 chars) at the end
    if (idx === words.length - 1 && word.length <= 2 && words.length > 1) return false;

    // 4. Strip single char words unless first word
    if (word.length === 1 && idx !== 0) return false;

    return true;
  });

  if (validWords.length === 0) return null;

  const result = validWords.join(' ');
  if (CNIC_NOISE_WORDS.has(result.toLowerCase()) || result.length < 3) return null;

  return result;
};

const getCandidateScore = (nameStr) => {
  const words = nameStr.split(/\s+/).filter(w => w.length > 0);
  let score = nameStr.length;
  if (words.length >= 2) score += 20;

  const hasSingleCharWord = words.some(w => w.length === 1);
  if (hasSingleCharWord) score -= 15;

  if (words.length === 1 && nameStr.length <= 4) score -= 30;
  if (/^(Nal|Nam|Nom|Nene|Namo)$/i.test(nameStr)) score -= 50;
  return score;
};

const cleanAndScoreCandidates = (candidates) => {
  if (!candidates || candidates.length === 0) return null;

  const scored = candidates
    .map(c => {
      const clean = sanitizeNameString(c);
      return {
        original: c,
        clean: clean || '',
        score: clean ? getCandidateScore(clean) : -100
      };
    })
    .filter(item => item.clean && item.clean.length >= 3);

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].clean;
};

/**
 * Extract CNIC data using multiple strategies for robustness
 */
const extractCNICData = (rawText) => {
  const text = rawText || '';
  const cleanText = cleanOcrText(text);
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('--- OCR Raw Text ---');
  console.log(rawText);
  console.log('--- OCR Clean Text ---');
  console.log(cleanText);
  console.log('--- OCR Lines ---');
  lines.forEach((l, i) => console.log(`  [${i}]: "${l}"`));

  // ===== 1. CNIC Number (Robust) =====
  let cnic = null;
  const robustCnicPattern = /\b([0-9OolISB]{5})[-\s]?([0-9OolISB]{7})[-\s]?([0-9OolISB])\b/i;
  const cnicMatch = cleanText.match(robustCnicPattern);
  if (cnicMatch) {
    const part1 = fixOcrDigits(cnicMatch[1]);
    const part2 = fixOcrDigits(cnicMatch[2]);
    const part3 = fixOcrDigits(cnicMatch[3]);
    cnic = `${part1}-${part2}-${part3}`;
  }

  // ===== 2. Name (Robust Unified) =====
  let name = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Name|Narne|Namo|Nene|Holder|Card|Nal)/i.test(line) && !/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex)/i.test(line)) {
      const candidates = [];
      const sameLineMatch = line.match(/(?:Name|Narne|Namo|Nene|Holder|Card|Nal)\s*[^A-Za-z]*(.+)$/i);
      if (sameLineMatch && sameLineMatch[1]) {
        candidates.push(sameLineMatch[1]);
      }
      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) {
          break;
        }
        candidates.push(nextLine);
      }
      name = cleanAndScoreCandidates(candidates);
      if (name) break;
    }
  }

  // ===== 3. Father / Husband Name (Robust Unified) =====
  let fatherName = null;
  let fatherLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Father|Husband|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|F[ao]th|Husb)/i.test(line) && !/(?:Date|Birth|CNIC|Identity|Gender|Sex)/i.test(line)) {
      fatherLineIndex = i;
      const candidates = [];
      const sameLineMatch = line.match(/(?:Father|Husband|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|F[ao]th|Husb)(?:[\s']*(?:Name|Narne|Namo))?\s*[^A-Za-z]*(.+)$/i);
      if (sameLineMatch && sameLineMatch[1]) {
        candidates.push(sameLineMatch[1]);
      }
      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) {
          break;
        }
        candidates.push(nextLine);
      }
      fatherName = cleanAndScoreCandidates(candidates);
      if (fatherName) break;
    }
  }

  // Fallback: if father name not found, look for lines after the name section
  // that contain a multi-word name-like string (common on Pakistani CNICs where
  // the "Father" label is in Urdu and not recognized by OCR)
  if (!fatherName && name) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip the line that contains the holder's name
      if (line.includes(name)) continue;
      // Skip lines that are clearly labels or contain known fields
      if (/(?:Name|Narne|Namo|Nal|Date|Birth|Gender|Sex|CNIC|Identity|Country|Expiry|Issue|Card|National|Address|Republic)/i.test(line)) continue;
      // Skip lines that look like CNIC numbers or dates
      if (/\d{5}-\d{7}-\d/.test(line) || /\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4}/.test(line)) continue;

      const cleanLine = line.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').replace(/^[A-Za-z]{1,2}\s+(?=[A-Z])/, '').trim();
      const words = cleanLine.split(/\s+/).filter(w => w.length > 1);
      // A valid father name should have 2+ words, all starting with uppercase
      if (words.length >= 2 && words.every(w => /^[A-Z]/.test(w)) && cleanLine !== name) {
        fatherName = cleanLine;
        break;
      }
    }
  }

  // ===== 4. Date of Birth (Robust) =====
  let dateOfBirth = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Date\s*(?:of)?\s*Birth|Birth\s*Date|D\.?O\.?B/i.test(line)) {
      for (let j = 0; j <= 2; j++) {
        const checkLine = lines[i + j];
        if (!checkLine) continue;
        const tokens = checkLine.split(/\s+/);
        for (const token of tokens) {
          const dateMatch = token.match(/\b([0-9OolISB]{1,2})[.\-\/]([0-9OolISB]{1,2})[.\-\/]([0-9OolISB]{4})\b/i);
          if (dateMatch) {
            const day = fixOcrDigits(dateMatch[1]).padStart(2, '0');
            const month = fixOcrDigits(dateMatch[2]).padStart(2, '0');
            const year = fixOcrDigits(dateMatch[3]);
            if (parseInt(day) <= 31 && parseInt(month) <= 12 && parseInt(year) >= 1950 && parseInt(year) <= 2015) {
              dateOfBirth = `${day}/${month}/${year}`;
              break;
            }
          }
        }
        if (dateOfBirth) break;
      }
    }
    if (dateOfBirth) break;
  }

  // ===== 5. Gender (Robust) =====
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

  if (name) {
    name = sanitizeNameString(name);
  }
  if (fatherName) {
    fatherName = sanitizeNameString(fatherName);
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

router.get('/my-documents', async (req, res) => {
  try {
    res.json({ documents: [] });
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;

