import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Info, Share2, Smartphone, X } from "lucide-react";
import { getShareDetails, socialShareLinks } from "@/lib/shareSite";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function SiteActions() {
  const [deferredInstall, setDeferredInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dialog, setDialog] = useState<"share" | "install" | null>(null);
  const [status, setStatus] = useState("");
  const [share, setShare] = useState(() => getShareDetails(window.location, import.meta.env.BASE_URL));

  useEffect(() => {
    setInstalled(isInstalled());
    const ready = (event: Event) => {
      event.preventDefault();
      setDeferredInstall(event as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredInstall(null);
      setDialog(null);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [dialog]);

  const openShare = () => {
    setShare(getShareDetails(window.location, import.meta.env.BASE_URL));
    setStatus("");
    setDialog("share");
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(share.description + "\n" + share.url);
      setStatus("تم نسخ الوصف والرابط.");
    } catch {
      setStatus("تعذّر النسخ التلقائي؛ يمكنك تحديد الرابط ونسخه من الحقل أدناه.");
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      setStatus("اختر تطبيقًا من الخيارات أو انسخ الرابط.");
      return;
    }
    try {
      await navigator.share({ title: share.title, text: share.description, url: share.url });
      setStatus("تم فتح واجهة المشاركة.");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setStatus("تعذّرت المشاركة المباشرة. جرّب الخيارات أدناه.");
    }
  };

  const install = async () => {
    if (installed) return;
    if (!deferredInstall) {
      setDialog("install");
      return;
    }
    try {
      await deferredInstall.prompt();
      const result = await deferredInstall.userChoice;
      setDeferredInstall(null);
      if (result.outcome === "accepted") {
        setStatus("تم قبول طلب التثبيت. سيُضيف المتصفح التطبيق عند اكتمال العملية.");
      } else {
        setStatus("يمكنك تثبيت الموقع لاحقًا من قائمة المتصفح.");
      }
    } catch {
      setDialog("install");
    }
  };

  const links = socialShareLinks(share);

  return (
    <>
      <div className="site-action-buttons" aria-label="مشاركة الموقع وتثبيته">
        <button type="button" onClick={openShare} className="site-action site-action--share" title="مشاركة الموقع">
          <Share2 size={17} aria-hidden="true" /><span>مشاركة</span>
        </button>
        <button
          type="button"
          onClick={install}
          disabled={installed}
          className="site-action site-action--install"
          title={installed ? "التطبيق مثبت" : "تثبيت تطبيق الطقس"}
        >
          {installed ? <Check size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
          <span>{installed ? "مثبّت" : "تثبيت"}</span>
        </button>
      </div>

      {dialog && (
        <div className="site-actions-backdrop" role="presentation" onMouseDown={() => setDialog(null)}>
          <section
            className="site-actions-modal"
            role="dialog"
            aria-modal="true"
            aria-label={dialog === "share" ? "مشاركة الطقس الجزائري" : "طريقة تثبيت التطبيق"}
            dir="rtl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="site-actions-modal__heading">
              <span>{dialog === "share" ? <Share2 size={19} aria-hidden="true" /> : <Smartphone size={19} aria-hidden="true" />}
                {dialog === "share" ? "شارك الطقس الجزائري" : "تثبيت الطقس الجزائري"}
              </span>
              <button type="button" onClick={() => setDialog(null)} aria-label="إغلاق النافذة"><X size={20} /></button>
            </div>

            {dialog === "share" ? (
              <>
                <div className="site-share-preview">
                  <img src={import.meta.env.BASE_URL + "icons/icon-192.png"} alt="أيقونة الطقس الجزائري" width="60" height="60" />
                  <div><strong>{share.title}</strong><p>{share.description}</p></div>
                </div>
                <label className="site-share-url-label" htmlFor="site-share-url">رابط الصفحة</label>
                <input id="site-share-url" type="text" dir="ltr" readOnly onFocus={(event) => event.target.select()} value={share.url} />
                <div className="site-share-channels">
                  <button type="button" onClick={nativeShare}><Share2 size={17} aria-hidden="true" /> مشاركة مباشرة</button>
                  <button type="button" onClick={copyShare}><Copy size={17} aria-hidden="true" /> نسخ الرابط والوصف</button>
                  <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">واتساب <ExternalLink size={14} aria-hidden="true" /></a>
                  <a href={links.telegram} target="_blank" rel="noopener noreferrer">تيليغرام <ExternalLink size={14} aria-hidden="true" /></a>
                  <a href={links.facebook} target="_blank" rel="noopener noreferrer">فيسبوك <ExternalLink size={14} aria-hidden="true" /></a>
                  <a href={links.x} target="_blank" rel="noopener noreferrer">X <ExternalLink size={14} aria-hidden="true" /></a>
                </div>
                <p className="site-actions-hint"><Info size={15} aria-hidden="true" /> تعتمد صورة المعاينة في المنصات الاجتماعية على وسوم Open Graph الخاصة بالرابط الذي تشاركه.</p>
              </>
            ) : (
              <>
                <p className="site-install-intro">أضف تطبيق الطقس إلى شاشتك الرئيسية للوصول السريع، دون إنشاء حساب.</p>
                <div className="site-install-instructions">
                  <strong>على iPhone / iPad (Safari)</strong>
                  <p>اضغط زر المشاركة في Safari، ثم «إضافة إلى الشاشة الرئيسية».</p>
                  <strong>على Android أو الكمبيوتر</strong>
                  <p>افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إن كان الخيار متاحًا.</p>
                </div>
                <p className="site-actions-hint">قد لا يتوفر التثبيت في بعض المتصفحات أو أثناء التصفح الخاص. تظهر نافذة التثبيت المباشر عندما يتيحها المتصفح.</p>
              </>
            )}
            {status && <p role="status" className="site-actions-status">{status}</p>}
          </section>
        </div>
      )}
    </>
  );
}
