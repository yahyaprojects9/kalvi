import { useEffect, useState } from "react";
import { getLocalItems } from "@/lib/mock-data";
import { useLang } from "@/lib/lang-context";

const DEFAULT_ITEMS_EN = [
  "Wear a helmet and follow traffic signals near school zones.",
  "Never share OTPs, passwords, or personal details with strangers.",
  "Study in short focused blocks and revise the same day.",
  "Emergency: 112 · Childline: 1098 · Ambulance: 108.",
  "Wash hands, drink clean water, and report fever early.",
  "Use pedestrian crossings and avoid mobile phones while walking on roads.",
  "Say no to drugs and seek help from a trusted teacher.",
  "Save water at school and home. Close taps after use.",
];

const DEFAULT_ITEMS_TA = [
  "பள்ளி பகுதிகளில் ஹெல்மெட் அணிந்து போக்குவரத்து சிக்னல்களை பின்பற்றுங்கள்.",
  "அந்நியர்களுடன் OTP, கடவுச்சொல், தனிப்பட்ட தகவல்களை பகிர வேண்டாம்.",
  "குறுகிய கவன நேரங்களில் படித்து, அதே நாளில் மறுபார்வை செய்யுங்கள்.",
  "அவசரம்: 112 · குழந்தைகள் உதவி எண்: 1098 · ஆம்புலன்ஸ்: 108.",
  "கைகளை சுத்தமாக கழுவி, தூய நீர் குடித்து, காய்ச்சல் ஏற்பட்டால் உடனே தெரிவிக்கவும்.",
  "சாலையில் நடக்கும் போது பாதசாரி கடவை பயன்படுத்தி, கைபேசியை தவிர்க்கவும்.",
  "மருந்து/போதைப் பழக்கங்களுக்கு இல்லை என்று சொல்லி, நம்பகமான ஆசிரியரிடம் உதவி கேளுங்கள்.",
  "பள்ளியிலும் வீட்டிலும் தண்ணீரை சேமியுங்கள். பயன்படுத்தியதும் குழாயை மூடுங்கள்.",
];

export function InfoMarquee() {
  const { lang } = useLang();
  const defaultItems = lang === "ta" ? DEFAULT_ITEMS_TA : DEFAULT_ITEMS_EN;
  const [items, setItems] = useState(defaultItems);

  useEffect(() => {
    const load = () => {
      const adminItems = getLocalItems<{ message: string }>("info_bar", []);
      setItems(adminItems.length ? adminItems.map((item) => item.message) : defaultItems);
    };
    load();
    window.addEventListener("kalvi:info_bar", load);
    return () => window.removeEventListener("kalvi:info_bar", load);
  }, [defaultItems]);

  return (
    <div className="-mt-4 mx-3 mb-4 overflow-hidden rounded-md border border-primary/20 bg-primary py-2 text-primary-foreground shadow-sm">
      <div className="animate-marquee flex gap-10 whitespace-nowrap px-4 text-xs font-semibold">
        {[...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
