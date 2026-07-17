import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { useLang } from '../../store/lang';
import { Button, Input, Card } from '../../components/ui';

export default function Login() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await setAuth(data.accessToken, null);
      navigate('/dashboard');
    } catch {
      setError(lang === 'ne' ? 'गलत प्रमाणपत्र' : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1 font-deva">{t('action.signin')}</h1>
        <p className="text-sm text-foreground-muted mb-6">{t('app.name')}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('field.email')}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1" autoComplete="username" />
          </div>
          <div>
            <label className="text-sm font-medium">{t('field.password')}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1" autoComplete="current-password" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (lang === 'ne' ? 'साइन इन गर्दै...' : 'Signing in...') : t('action.signin')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
