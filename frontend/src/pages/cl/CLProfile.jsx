import { useState } from 'react';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Home, Building2, Landmark, KeyRound, Loader2 } from 'lucide-react';
import clApi from '../../lib/clApi';
import { useCLAuth } from '../../lib/clAuth.jsx';

export default function CLProfile() {
  const { cl, refresh, setCl } = useCLAuth();
  const [name, setName] = useState(cl?.name || '');
  const [email, setEmail] = useState(cl?.email || '');
  const [bank, setBank] = useState({
    accountHolder: cl?.bankDetails?.accountHolder || '',
    accountNumber: cl?.bankDetails?.accountNumber || '',
    ifsc: cl?.bankDetails?.ifsc || '',
    bankName: cl?.bankDetails?.bankName || '',
  });
  const [saving, setSaving] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  if (!cl) return null;

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await clApi.put('/cl/profile', { name, email, bankDetails: bank });
      setCl(data.cl);
      localStorage.setItem('groveno_cl_user', JSON.stringify(data.cl));
      toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      await clApi.post('/cl/change-password', { oldPassword: oldPw, newPassword: newPw });
      toast.success('Password updated');
      setOldPw(''); setNewPw('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPwSaving(false); }
  };

  return (
    <div className="p-4 pb-6" data-testid="cl-page-profile">
      <h1 className="text-xl font-semibold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Profile</h1>
      <p className="text-sm text-slate-500 mb-4">Manage your account and payout details</p>

      {/* CL Code — prominent */}
      <div className="rounded-2xl p-5 mb-4 bg-brand-50 border border-brand-100 text-center">
        <div className="text-xs uppercase tracking-wider text-brand-800/70 font-medium">Your CL Code</div>
        <div className="text-3xl font-bold text-brand-700 tracking-widest mt-1" style={{ fontFamily: 'DM Sans, sans-serif' }} data-testid="cl-profile-code">
          {cl.clCode}
        </div>
        <div className="text-xs text-slate-500 mt-1">{cl.societyName}</div>
      </div>

      <form onSubmit={saveProfile} className="card p-4 mb-3 space-y-3">
        <h4 className="text-sm font-semibold text-slate-800 mb-1">Personal Info</h4>

        <FieldRow icon={User} label="Name">
          <input required className="input" value={name} onChange={(e) => setName(e.target.value)} data-testid="cl-profile-name" />
        </FieldRow>

        <FieldRow icon={Phone} label="Phone" locked>
          <input className="input bg-slate-50" value={cl.phone} readOnly />
        </FieldRow>

        <FieldRow icon={Mail} label="Email">
          <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="cl-profile-email" />
        </FieldRow>

        <FieldRow icon={Home} label="Society" locked>
          <input className="input bg-slate-50" value={cl.societyName} readOnly />
        </FieldRow>

        <h4 className="text-sm font-semibold text-slate-800 pt-2 border-t border-slate-100 mt-2">Bank Details</h4>

        <FieldRow icon={User} label="Account Holder">
          <input className="input" value={bank.accountHolder} onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })} data-testid="cl-bank-holder" />
        </FieldRow>
        <FieldRow icon={Landmark} label="Account Number">
          <input className="input" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} data-testid="cl-bank-account" />
        </FieldRow>
        <FieldRow icon={Building2} label="IFSC">
          <input className="input uppercase" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })} data-testid="cl-bank-ifsc" />
        </FieldRow>
        <FieldRow icon={Building2} label="Bank Name">
          <input className="input" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} data-testid="cl-bank-name" />
        </FieldRow>

        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5" data-testid="cl-profile-save">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <form onSubmit={changePw} className="card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <KeyRound size={14} /> Change Password
        </h4>
        <div>
          <label className="label block">Current Password</label>
          <input type="password" required className="input" value={oldPw} onChange={(e) => setOldPw(e.target.value)} data-testid="cl-pw-old" />
        </div>
        <div>
          <label className="label block">New Password (min 6 chars)</label>
          <input type="password" required minLength={6} className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="cl-pw-new" />
        </div>
        <button type="submit" disabled={pwSaving} className="btn-outline w-full py-2.5" data-testid="cl-pw-submit">
          {pwSaving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function FieldRow({ icon: Icon, label, children, locked }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <Icon size={11} className="text-slate-400" /> {label}
        {locked && <span className="text-[10px] text-slate-400">(cannot change)</span>}
      </label>
      {children}
    </div>
  );
}
