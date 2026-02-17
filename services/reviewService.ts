import type { PlanReviewRecord, PlanStatus, ReviewDepartment, DepartmentReview } from '../types';

const STORAGE_KEY = 'zsub_plan_reviews';

const DEPARTMENT_LABELS: Record<ReviewDepartment, string> = {
  quality: '품질팀',
  development: '개발팀',
  process: '공정팀',
};

export { DEPARTMENT_LABELS };

const loadReviews = (): PlanReviewRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return [];
};

const saveReviews = (reviews: PlanReviewRecord[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
};

export const getReview = (planId: string): PlanReviewRecord | null => {
  return loadReviews().find(r => r.planId === planId) || null;
};

export const requestReview = (planId: string, requestedBy: string): PlanReviewRecord => {
  const reviews = loadReviews();

  // Remove existing review for same plan
  const filtered = reviews.filter(r => r.planId !== planId);

  const newReview: PlanReviewRecord = {
    planId,
    status: 'review_requested',
    requestedAt: new Date().toISOString(),
    requestedBy,
    departments: (['quality', 'development', 'process'] as ReviewDepartment[]).map(dept => ({
      department: dept,
      reviewer: '',
      status: 'pending',
      comment: '',
      reviewedAt: null,
    })),
    finalizedAt: null,
  };

  filtered.unshift(newReview);
  saveReviews(filtered);
  return newReview;
};

export const submitDepartmentReview = (
  planId: string,
  department: ReviewDepartment,
  reviewer: string,
  approved: boolean,
  comment: string
): PlanReviewRecord | null => {
  const reviews = loadReviews();
  const review = reviews.find(r => r.planId === planId);
  if (!review) return null;

  const dept = review.departments.find(d => d.department === department);
  if (!dept) return null;

  dept.reviewer = reviewer;
  dept.status = approved ? 'approved' : 'rejected';
  dept.comment = comment;
  dept.reviewedAt = new Date().toISOString();

  // Check if all departments approved
  const allApproved = review.departments.every(d => d.status === 'approved');
  if (allApproved) {
    review.status = 'approved';
  }

  // If any rejected, keep as review_requested
  const anyRejected = review.departments.some(d => d.status === 'rejected');
  if (anyRejected) {
    review.status = 'review_requested';
  }

  saveReviews(reviews);
  return review;
};

export const finalizeReview = (planId: string): PlanReviewRecord | null => {
  const reviews = loadReviews();
  const review = reviews.find(r => r.planId === planId);
  if (!review || review.status !== 'approved') return null;

  review.status = 'finalized';
  review.finalizedAt = new Date().toISOString();
  saveReviews(reviews);
  return review;
};
