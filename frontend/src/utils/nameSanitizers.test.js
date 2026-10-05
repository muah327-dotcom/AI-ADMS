import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeProfileName } from './nameSanitizers.js';

test('preserves a complete three-part OCR name with an unlisted surname', () => {
  assert.equal(sanitizeProfileName('Muhammad Waqas Nadeem'), 'Muhammad Waqas Nadeem');
});

test('preserves a complete father name with an unlisted surname', () => {
  assert.equal(sanitizeProfileName('Muhammad Arshad Nadeem'), 'Muhammad Arshad Nadeem');
});

test('removes non-English OCR noise without truncating name words', () => {
  assert.equal(sanitizeProfileName('محمد  Muhammad   Waqas Nadeem 123'), 'Muhammad Waqas Nadeem');
});
