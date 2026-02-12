import { describe, it, expect } from 'vitest';
import { parseCSV, mapRowToMenuItem, executeImport, type ColumnMapping } from '../services/importService';
import { MenuCategory, Season } from '../types';

describe('parseCSV', () => {
  it('헤더와 행을 올바르게 파싱', () => {
    const csv = '이름,분류,원가\n소고기볶음,메인요리,3000\n된장국,국/찌개,1200';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['이름', '분류', '원가']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['소고기볶음', '메인요리', '3000']);
  });

  it('빈 문자열이면 빈 결과', () => {
    const result = parseCSV('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('헤더만 있으면 행 0개', () => {
    const result = parseCSV('이름,분류,원가');
    expect(result.headers).toEqual(['이름', '분류', '원가']);
    expect(result.rows).toHaveLength(0);
  });

  it('쉼표 포함 값은 따옴표로 처리', () => {
    const csv = '이름,태그\n"소고기,야채볶음","인기,건강"';
    const result = parseCSV(csv);
    expect(result.rows[0][0]).toBe('소고기,야채볶음');
    expect(result.rows[0][1]).toBe('인기,건강');
  });

  it('빈 줄 무시', () => {
    const csv = '이름\n소고기\n\n된장국\n';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
  });
});

describe('mapRowToMenuItem', () => {
  const headers = ['이름', '분류', '원가', '판매가', '주재료', '태그', '시즌'];
  const mappings: ColumnMapping[] = [
    { csvColumn: '이름', fieldName: 'name' },
    { csvColumn: '분류', fieldName: 'category' },
    { csvColumn: '원가', fieldName: 'cost' },
    { csvColumn: '판매가', fieldName: 'recommendedPrice' },
    { csvColumn: '주재료', fieldName: 'mainIngredient' },
    { csvColumn: '태그', fieldName: 'tags' },
    { csvColumn: '시즌', fieldName: 'season' },
  ];

  it('올바르게 매핑', () => {
    const row = ['소고기볶음', '메인요리', '3000', '8000', 'beef', '인기,건강', '사계절'];
    const item = mapRowToMenuItem(row, headers, mappings);
    expect(item.name).toBe('소고기볶음');
    expect(item.category).toBe(MenuCategory.MAIN);
    expect(item.cost).toBe(3000);
    expect(item.recommendedPrice).toBe(8000);
    expect(item.mainIngredient).toBe('beef');
    expect(item.tags).toEqual(['인기', '건강']);
    expect(item.season).toBe(Season.ALL);
  });

  it('숫자 필드는 Number로 변환', () => {
    const row = ['테스트', '밑반찬', 'abc', '5000', 'veg', '', ''];
    const item = mapRowToMenuItem(row, headers, mappings);
    expect(item.cost).toBe(0);
    expect(item.recommendedPrice).toBe(5000);
  });

  it('매핑 안 함 필드는 무시', () => {
    const partialMappings: ColumnMapping[] = [
      { csvColumn: '이름', fieldName: 'name' },
      { csvColumn: '분류', fieldName: '' },
    ];
    const row = ['소고기볶음', '메인요리', '3000', '8000', 'beef', '', ''];
    const item = mapRowToMenuItem(row, headers, partialMappings);
    expect(item.name).toBe('소고기볶음');
    expect(item.category).toBeUndefined();
  });

  it('유효하지 않은 카테고리는 기본값(밑반찬) 사용', () => {
    const row = ['테스트', '잘못된값', '1000', '3000', 'veg', '', ''];
    const item = mapRowToMenuItem(row, headers, mappings);
    expect(item.category).toBe(MenuCategory.SIDE);
  });

  it('유효하지 않은 시즌은 사계절로 기본', () => {
    const row = ['테스트', '밑반찬', '1000', '3000', 'veg', '', '잘못된계절'];
    const item = mapRowToMenuItem(row, headers, mappings);
    expect(item.season).toBe(Season.ALL);
  });
});

describe('executeImport', () => {
  const headers = ['이름', '분류', '원가'];
  const mappings: ColumnMapping[] = [
    { csvColumn: '이름', fieldName: 'name' },
    { csvColumn: '분류', fieldName: 'category' },
    { csvColumn: '원가', fieldName: 'cost' },
  ];

  it('정상 데이터 가져오기', () => {
    const rows = [
      ['소고기볶음', '메인요리', '3000'],
      ['된장국', '국/찌개', '1200'],
    ];
    const result = executeImport(rows, headers, mappings, new Set());
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('이름 없는 행은 건너뜀', () => {
    const rows = [
      ['', '메인요리', '3000'],
      ['된장국', '국/찌개', '1200'],
    ];
    const result = executeImport(rows, headers, mappings, new Set());
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('빈 데이터', () => {
    const result = executeImport([], headers, mappings, new Set());
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
