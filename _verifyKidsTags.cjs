const fs = require('fs');
const csv = fs.readFileSync('_sheet_반찬.csv', 'utf-8');
const lines = csv.split('\n').slice(1);

const GUBUN_MAP = { '국':'국/찌개','시즌국':'국/찌개','메인':'메인요리','밥류':'메인요리',
  '볶음':'밑반찬','조림':'밑반찬','무침':'밑반찬','전':'밑반찬','장아찌':'밑반찬','김치':'밑반찬','협업':'디저트'};

const KIDS_EXCLUDE = ['고추장','매콤','매운','청양','얼큰','두루치기','짜글이','고들빼기','곤드레','취나물',
  '마늘종','마늘쫑','피마자','쑥갓','시래기된장지짐','생채','무말랭이','겉절이','파래김','부추',
  '봄나물','달래','양배추와맛쌈장'];
const KIDS_FRIENDLY = ['아이들','불고기','잡채','함박','돈까스','스테이크','계란','달걀','감자','고구마',
  '소세지','소시지','떡갈비','볶음밥','덮밥','오므라이스','카레','커리','탕수','미트볼','장조림',
  '어묵','계란말이','미역국','된장국','콩나물국','곰탕','사골','두부','마카로니','파스타','까르보나라',
  '천사채','옥수수','참치','주먹밥','토마토','궁중떡볶이','간장','케찹','맛살','새우','샐러드','피클',
  '메추리알','버섯볶음','애호박','감자채','감자햄','양배추햄','한우두부','한우무','한우표고','한우가지',
  '한돈가지','보리새우간장','숙주나물','콩나물무침','무나물','가지나물','깻잎순된장','브로콜리',
  '닭가슴살두부','영양과채','저당메추리알','닭곰탕','배추된장국','소고기무국','맑은','순한',
  '황태미역국','콩나물황태국','배추국','보리새우아욱국','시래기된장국',
  '동그랑땡','짜장','소고기야채'];

function isKidFriendly(name, isSpicy) {
  if (isSpicy) return false;
  if (name.startsWith('아이들')) return true;
  const n = name.replace(/\s+/g,'');
  if (KIDS_EXCLUDE.some(kw => n.includes(kw))) return false;
  if (KIDS_FRIENDLY.some(kw => n.includes(kw))) return true;
  return false;
}

// Simple CSV field parse
function parseCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { fields.push(field); field = ''; }
    else { field += ch; }
  }
  fields.push(field);
  return fields;
}

const results = { '국/찌개':[], '메인요리':[], '밑반찬':[] };
const notKids = { '국/찌개':[], '메인요리':[], '밑반찬':[] };
const seen = new Set();

for (const line of lines) {
  const row = parseCSVLine(line);
  const gubun = (row[0]||'').trim();
  const name = (row[1]||'').trim();
  const code = (row[3]||'').trim();
  const unused = row[8] === 'TRUE';
  const spicy = row[9] === 'TRUE';
  const cat = GUBUN_MAP[gubun];
  if (!cat || cat === '디저트' || !name || !code || unused) continue;
  const key = code;
  if (seen.has(key)) continue;
  seen.add(key);

  if (isKidFriendly(name, spicy)) {
    results[cat].push(name);
  } else if (!spicy) {
    notKids[cat].push(name);
  }
}

console.log('========================================');
console.log('  아이선호 자동 태깅 검증 결과');
console.log('========================================\n');
for (const [cat, items] of Object.entries(results)) {
  console.log(`\n[${cat}] ${items.length}개:`);
  items.forEach(i => console.log(`  ✅ ${i}`));
}
console.log('\n\n========================================');
console.log('  미태깅 항목 (비매운, 아이선호 미해당)');
console.log('========================================');
for (const [cat, items] of Object.entries(notKids)) {
  if (items.length === 0) continue;
  console.log(`\n[${cat}] ${items.length}개:`);
  items.forEach(i => console.log(`  ⬜ ${i}`));
}
console.log('\n--- 요약 ---');
const total = Object.values(results).reduce((s,a) => s+a.length, 0);
const notTotal = Object.values(notKids).reduce((s,a) => s+a.length, 0);
console.log(`아이선호 태깅: ${total}개`);
console.log(`미태깅(비매운): ${notTotal}개`);
console.log(`매운맛(제외): ${seen.size - total - notTotal}개 (별도 isSpicy 필터)`);
