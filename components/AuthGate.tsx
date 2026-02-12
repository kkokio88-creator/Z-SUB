import React, { useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, LogIn, RefreshCw } from 'lucide-react';

const AuthGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isOfflineMode, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">시스템 초기화 중...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await login(email, password);
    if (!result.success) setError(result.error || '로그인에 실패했습니다.');
    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Leaf className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-gray-800">Z-SUB</span>
          </div>
          <h2 className="text-center text-lg font-bold text-gray-800 mb-2">로그인</h2>
          <p className="text-center text-sm text-gray-500 mb-6">
            {isOfflineMode ? '오프라인 모드입니다.' : '관리자 계정으로 로그인하세요.'}
          </p>
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 mb-4">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="admin@z-sub.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
