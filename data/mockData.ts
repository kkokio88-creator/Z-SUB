// Shared mock data used across Dashboard and RevenueAnalysis

export const MONTHLY_FINANCIALS = [
  { month: '1월', revenue: 42000000, cost: 29400000, profit: 12600000 },
  { month: '2월', revenue: 45000000, cost: 31000000, profit: 14000000 },
  { month: '3월', revenue: 48500000, cost: 33500000, profit: 15000000 },
  { month: '4월', revenue: 52000000, cost: 35000000, profit: 17000000 },
  { month: '5월', revenue: 58000000, cost: 39000000, profit: 19000000 },
  { month: '6월 (E)', revenue: 64000000, cost: 42000000, profit: 22000000 },
];

export const REVENUE_BY_CATEGORY = [
  { name: '아이 식단', value: 35 },
  { name: '시니어 식단', value: 20 },
  { name: '가족 식단', value: 30 },
  { name: '실속/기타', value: 15 },
];

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#94a3b8'];

export const SUBSCRIBER_MOCK_DATA = (() => {
  // Static seed-based data to avoid non-deterministic renders
  const targetData = [
    { target: '아이 식단', base: 635, newSub: 42, churn: 2.1, sat: 4.8 },
    { target: '든든한 아이 식단', base: 420, newSub: 28, churn: 1.5, sat: 4.7 },
    { target: '골고루 반찬 식단', base: 315, newSub: 18, churn: 3.2, sat: 4.3 },
    { target: '건강한 시니어 식단', base: 280, newSub: 15, churn: 4.1, sat: 4.5 },
    { target: '시니어 식단', base: 335, newSub: 12, churn: 5.5, sat: 4.2 },
    { target: '청소연구소 식단', base: 180, newSub: 35, churn: 4.0, sat: 4.4 },
    { target: '청소연구소 메인 식단', base: 120, newSub: 22, churn: 3.8, sat: 4.3 },
    { target: '실속 식단', base: 382, newSub: 20, churn: 2.0, sat: 4.6 },
    { target: '가족 식단', base: 540, newSub: 38, churn: 3.5, sat: 4.5 },
    { target: '든든한 가족 식단', base: 420, newSub: 32, churn: 2.8, sat: 4.6 },
  ];

  return targetData.map(d => {
    const isPremium = d.target.includes('든든한');
    return {
      target: d.target,
      totalSubscribers: d.base,
      newSubscribers: d.newSub,
      churnRate: d.churn,
      satisfaction: d.sat,
      revenue: d.base * (isPremium ? 58000 : 42000),
      tiers: [
        { name: 'VIP', value: Math.floor(d.base * 0.2) },
        { name: '골드', value: Math.floor(d.base * 0.35) },
        { name: '일반', value: Math.floor(d.base * 0.45) },
      ],
      demographics: d.target.includes('아이')
        ? [
            { name: '30대 부모', value: 60 },
            { name: '40대 부모', value: 30 },
            { name: '기타', value: 10 },
          ]
        : d.target.includes('시니어')
          ? [
              { name: '50대 자녀', value: 40 },
              { name: '60대 본인', value: 20 },
              { name: '70대 이상', value: 40 },
            ]
          : [
              { name: '20-30대', value: 30 },
              { name: '40대', value: 40 },
              { name: '50대+', value: 30 },
            ],
    };
  });
})();
