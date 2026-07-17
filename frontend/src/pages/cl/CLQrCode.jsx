import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Share2, Copy, QrCode as QrIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import clApi from '../../lib/clApi';
import { useCLAuth } from '../../lib/clAuth.jsx';

export default function CLQrCode() {
  const { cl } = useCLAuth();
  const [scans, setScans] = useState({ poster: 0, whatsapp: 0, standee: 0, other: 0 });
  const [ordersFromQR, setOrdersFromQR] = useState(0);
  const qrRef = useRef(null);

  useEffect(() => {
    // Fetch fresh dashboard to get up-to-date qrScans and orders count
    clApi.get('/cl/dashboard').then((r) => {
      const q = r.data.stats?.qrScans || {};
      setScans(q);
      setOrdersFromQR(r.data.stats?.totalOrders || 0);
    });
  }, []);

  const shareLink = `https://groveno.app/qr?cl=${cl?.clCode || ''}`;
  const totalScans = (scans.poster || 0) + (scans.whatsapp || 0) + (scans.standee || 0) + (scans.other || 0);

  // Use QR image service (no lib dep). 400px, dark green foreground.
  const qrImgUrl = useMemo(() => {
    const data = encodeURIComponent(shareLink);
    return `https://api.qrserver.com/v1/create-qr-code/?data=${data}&size=440x440&color=14532d&bgcolor=ffffff&margin=8&ecc=M`;
  }, [shareLink]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied!');
    } catch { toast.error('Copy failed'); }
  };

  const download = async () => {
    try {
      const res = await fetch(qrImgUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `groveno-qr-${cl?.clCode || 'cl'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const whatsapp = () => {
    const msg = `🌱 Fresh groceries delivered to *${cl?.societyName || 'our society'}* by Groveno Fresh!\n\n` +
      `Use my link to order & I'll earn a small commission that supports our community.\n${shareLink}\n\n` +
      `You'll also get 50 Groveno Coins on your first CL order 🎉`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 pb-6" data-testid="cl-page-qr">
      <h1 className="text-xl font-semibold text-slate-900 mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>My QR Code</h1>
      <p className="text-sm text-slate-500 mb-4">Share this with your community to earn commission on every order.</p>

      <div className="card p-6 text-center mb-4" ref={qrRef}>
        <div className="inline-block p-3 bg-white rounded-2xl border-2 border-brand-100">
          <img src={qrImgUrl} alt="Your QR code" className="h-64 w-64" data-testid="cl-qr-image" />
        </div>
        <div className="mt-3 text-xs uppercase tracking-wider text-slate-500">CL Code</div>
        <div className="text-2xl font-bold text-brand-700 tracking-wider" style={{ fontFamily: 'DM Sans, sans-serif' }} data-testid="cl-qr-code-text">
          {cl?.clCode || '—'}
        </div>

        <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 break-all flex items-center gap-2 justify-between">
          <QrIcon size={12} className="text-slate-400 shrink-0" />
          <span className="flex-1 text-left" data-testid="cl-qr-link">{shareLink}</span>
          <button onClick={copyLink} className="btn-ghost !p-1 !text-brand-700" data-testid="cl-qr-copy"><Copy size={12} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button className="btn-outline py-3 text-sm" onClick={download} data-testid="cl-qr-download">
          <Download size={16} /> Download QR
        </button>
        <button className="btn-primary py-3 text-sm" onClick={whatsapp} data-testid="cl-qr-whatsapp">
          <Share2 size={16} /> Share on WhatsApp
        </button>
      </div>

      <div className="card p-4">
        <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3">Scan Analytics</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-700" data-testid="cl-total-scans">{totalScans}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Total Scans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-700" data-testid="cl-orders-from-qr">{ordersFromQR}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Total Orders</div>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
          <ScanRow label="Poster" value={scans.poster} />
          <ScanRow label="WhatsApp" value={scans.whatsapp} />
          <ScanRow label="Standee" value={scans.standee} />
          <ScanRow label="Other" value={scans.other} />
        </div>
      </div>
    </div>
  );
}

function ScanRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value || 0}</span>
    </div>
  );
}
