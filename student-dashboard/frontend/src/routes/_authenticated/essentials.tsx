import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, Heart, AlertTriangle, ArrowLeft, Youtube } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useLang } from "@/lib/lang-context";
import { GovIdentity } from "@/components/gov-brand";
import { ResponsiveYouTube, stopAllYouTubePlayers } from "@/components/responsive-youtube";

export const Route = createFileRoute("/_authenticated/essentials")({
  component: EssentialsPage,
});

type Section = "tamil" | "anthem" | "emergency" | "special" | "safety" | "traffic" | "values";
type Bilingual = { en: string; ta: string };

const TAM_THAI_LYRICS = `நீராருங் கடலுடுத்த நிலமடந்தைக் கெழிலொழுகும்
சீராரும் வதனமெனத் திகழ் பரதக் கண்டமிதில்
தெக்கணமும் அதிற்சிறந்த திராவிட நல் திருநாடும்
தக்கசிறு பிறைநுதலும் தரித்தநறுந் திலகமுமே
அத்திலக வாசனைபோல் அனைத்துலகும் இன்பமுற
எத்திசையும் புகழ் மணக்க இருந்த பெருந் தமிழணங்கே!
தமிழணங்கே!
உன்சீரிளமைத் திறம் வியந்து
செயல் மறந்து வாழ்த்துதுமே!
வாழ்த்துதுமே!
வாழ்த்துதுமே!`;

const NATIONAL_ANTHEM = `ஜன கண மன அதினாயக ஜய ஹே
பாரத பாக்ய விதாதா
பஞ்சாப், சிந்து, குஜராத், மராத்தா
திராவிட, உட்கலா, பங்கா
விந்த்யா, ஹிமாச்சல், யமுனா, கங்கா
உச்சல ஜலதி தரங்கா
தவ சுப நாமே ஜாகே
தவ சுப ஆசீஷ் மாஙே
காஹே தவ ஜய கீதா
ஜன கண மங்கள தாயக ஜய ஹே
பாரத பாக்ய விதாதா
ஜய ஹே, ஜய ஹே, ஜய ஹே
ஜய ஜய ஜய ஜய ஹே

-- Roman transliteration --
Jana-gana-mana-adhinayaka, jaya he
Bharata-bhagya-vidhata
Punjab-Sindh-Gujarat-Maratha
Dravida-Utkala-Banga
Vindhya-Himachal-Yamuna-Ganga
Uchchala-jaladhi-taranga
Tava shubha name jage
Tava shubha ashish maange
Gaye tava jaya gatha
Jana-gana-mangala-dayaka jaya he
Bharata-bhagya-vidhata
Jaya he, jaya he, jaya he
Jaya jaya jaya, jaya he`;

const TAM_THAI_LINES = [
  "நீராரும் கடலுடுத்த நிலமடந்தைக் கெழிலொழுகும்",
  "சீராரும் வதனமெனத் திகழ் பரதக் கண்டமிதில்",
  "தெக்கணமும் அதிற்சிறந்த திராவிட நல் திருநாடும்",
  "தக்கசிறு பிறைநுதலும் தரித்தநறும் திலகமுமே",
  "அத்திலக வாசனைபோல் அனைத்துலகும் இன்பமுற",
  "எத்திசையும் புகழ் மணக்க இருந்த பெருந் தமிழணங்கே!",
  "தமிழணங்கே!",
  "உன்சீரிளமைத் திறம் வியந்து",
  "செயல் மறந்து வாழ்த்துதுமே!",
  "வாழ்த்துதுமே!",
  "வாழ்த்துதுமே!",
];

const TAM_THAI_TRANSLITERATION = [
  "Neerarum kadaludutha nilamadanthai kezhilozhugum",
  "Seerarum vadhanamena thigazh Bharatha kandamithil",
  "Thekkanamum adhil sirandha Dravida nal thirunaadum",
  "Thakka siru pirai nudhalum thariththa narum thilagamume",
  "Ath thilaga vaasanai pol anaithulagum inbamura",
  "Ethisaiyum pugazh manakka irundha perum Thamizh anange",
  "Thamizh anange",
  "Un seerilamai thiram viyandhu",
  "Seyal marandhu vaazhthudhume",
  "Vaazhthudhume",
  "Vaazhthudhume",
];

const NATIONAL_ANTHEM_LINES = [
  "ஜன கண மன அதிநாயக ஜய ஹே",
  "பாரத பாக்ய விதாதா",
  "பஞ்சாப் சிந்து குஜராத் மராட்டா",
  "திராவிட உத்கல பங்கா",
  "விந்திய ஹிமாச்சல யமுனா கங்கா",
  "உச்சல ஜலதி தரங்கா",
  "தவ சுப நாமே ஜாகே",
  "தவ சுப ஆசிஷ் மாங்கே",
  "காஹே தவ ஜய காதா",
  "ஜன கண மங்கள தாயக ஜய ஹே",
  "பாரத பாக்ய விதாதா",
  "ஜய ஹே, ஜய ஹே, ஜய ஹே",
  "ஜய ஜய ஜய ஜய ஹே",
  "",
  "Roman transliteration",
  "Jana-gana-mana-adhinayaka, jaya he",
  "Bharata-bhagya-vidhata",
  "Punjab-Sindh-Gujarat-Maratha",
  "Dravida-Utkala-Banga",
  "Vindhya-Himachal-Yamuna-Ganga",
  "Uchchala-jaladhi-taranga",
  "Tava shubha name jage",
  "Tava shubha ashish maange",
  "Gaye tava jaya gatha",
  "Jana-gana-mangala-dayaka jaya he",
  "Bharata-bhagya-vidhata",
  "Jaya he, jaya he, jaya he",
  "Jaya jaya jaya, jaya he",
];

const NATIONAL_ANTHEM_TRANSLITERATION = [
  "Jana gana mana adhinayaka jaya he",
  "Bharata bhagya vidhata",
  "Punjab Sindh Gujarat Maratha",
  "Dravida Utkala Banga",
  "Vindhya Himachala Yamuna Ganga",
  "Uchchala jaladhi taranga",
  "Tava shubha name jage",
  "Tava shubha ashish mange",
  "Gahe tava jaya gatha",
  "Jana gana mangala dayaka jaya he",
  "Bharata bhagya vidhata",
  "Jaya he, jaya he, jaya he",
  "Jaya jaya jaya jaya he",
  "",
  "Roman transliteration",
  "Jana-gana-mana-adhinayaka, jaya he",
  "Bharata-bhagya-vidhata",
  "Punjab-Sindh-Gujarat-Maratha",
  "Dravida-Utkala-Banga",
  "Vindhya-Himachal-Yamuna-Ganga",
  "Uchchala-jaladhi-taranga",
  "Tava shubha name jage",
  "Tava shubha ashish maange",
  "Gaye tava jaya gatha",
  "Jana-gana-mangala-dayaka jaya he",
  "Bharata-bhagya-vidhata",
  "Jaya he, jaya he, jaya he",
  "Jaya jaya jaya, jaya he",
];

const SPECIAL_ESSENTIALS = [
  {
    id: "Rt1h0jcXgGA",
    title: "Safety Rules or Traffic Rules",
    description: "Road safety habits and traffic rules for students.",
  },
  {
    id: "W2CqND5ee_g",
    title: "Good Touch and Bad Touch",
    description: "Personal safety awareness explained for children.",
  },
  {
    id: "1wvIxB1au38",
    title: "Safety Rules in School, House and Road",
    description: "Everyday safety practices at school, home, and road.",
  },
  {
    id: "ZLHT8oKN_RE",
    title: "Cleanliness",
    description: "Clean habits and hygiene awareness for students.",
  },
];

const EMERGENCY_CONTACTS: { label: Bilingual; number: string }[] = [
  { label: { en: "Police", ta: "காவல்துறை" }, number: "100" },
  { label: { en: "Ambulance", ta: "மருத்துவ உதவி" }, number: "108" },
  { label: { en: "Child Helpline", ta: "குழந்தைகள் உதவி வரி" }, number: "1098" },
  { label: { en: "Fire Service", ta: "தீயணைப்பு சேவை" }, number: "101" },
];

const SAFETY_TIPS: { title: Bilingual; tips: Bilingual[] }[] = [
  {
    title: { en: "Anti-Bullying", ta: "வன்முறை எதிர்ப்பு" },
    tips: [
      { en: "Tell a teacher or parent if bullied", ta: "வன்முறை நடந்தால் ஆசிரியர் அல்லது பெற்றோரிடம் சொல்லுங்கள்" },
      { en: "Don't respond to bullies with violence", ta: "வன்முறைக்கு வன்முறையால் பதிலளிக்க வேண்டாம்" },
      { en: "Stay with friends, don't be alone", ta: "நண்பர்களுடன் சேர்ந்து இருங்கள், தனியாக இருக்க வேண்டாம்" },
      { en: "Keep evidence of bullying", ta: "வன்முறை நடந்ததற்கான ஆதாரம் வைத்திருங்கள்" },
    ],
  },
  {
    title: { en: "Stranger Awareness", ta: "அந்நியர் விழிப்புணர்வு" },
    tips: [
      { en: "Never talk to strangers alone", ta: "அந்நியர்களுடன் தனியாக பேச வேண்டாம்" },
      { en: "Don't share personal information", ta: "தனிப்பட்ட தகவல்களை பகிர வேண்டாம்" },
      { en: "Trust your instincts", ta: "உங்கள் உள்ளுணர்வை நம்புங்கள்" },
      { en: "Always inform parents about whereabouts", ta: "எங்கு செல்கிறீர்கள் என்று பெற்றோருக்கு தெரியப்படுத்துங்கள்" },
    ],
  },
  {
    title: { en: "Basic Safety Tips", ta: "அடிப்படை பாதுகாப்பு குறிப்புகள்" },
    tips: [
      { en: "Know your full address and phone number", ta: "முழு முகவரி மற்றும் தொலைபேசி எண்ணை தெரிந்து வையுங்கள்" },
      { en: "Have emergency contact numbers memorized", ta: "அவசர தொடர்பு எண்களை மனப்பாடம் செய்து வையுங்கள்" },
      { en: "Don't open doors to strangers", ta: "அந்நியர்களுக்கு கதவு திறக்க வேண்டாம்" },
      { en: "Stay alert in public places", ta: "பொது இடங்களில் விழிப்புடன் இருங்கள்" },
    ],
  },
];

const TRAFFIC_SAFETY: { title: Bilingual; info: Bilingual }[] = [
  {
    title: { en: "Traffic Signals", ta: "போக்குவரத்து சிக்னல்கள்" },
    info: {
      en: "Red = Stop, Yellow = Wait/Slow down, Green = Go. Always cross at signals.",
      ta: "சிவப்பு = நிறு, மஞ்சள் = காத்திரு/மெதுவாக, பச்சை = செல். எப்போதும் சிக்னலில் கடக்கவும்.",
    },
  },
  {
    title: { en: "Zebra Crossing", ta: "பாசங்கேரை குறுக்குக் கடத்தல்" },
    info: {
      en: "Use zebra crossings to cross roads safely. Look both ways before crossing.",
      ta: "பாதையை பாதுகாப்பாக கடக்க பாசங்கேரை குறுக்குக் கடத்தலை பயன்படுத்துங்கள். கடக்கும் முன் இரு பக்கமும் பாருங்கள்.",
    },
  },
  {
    title: { en: "Helmet Safety", ta: "ஹெல்மெட் பாதுகாப்பு" },
    info: {
      en: "Always wear a helmet when on two-wheelers. It saves lives in accidents.",
      ta: "இரண்டு சக்கர வாகனத்தில் செல்லும்போது எப்போதும் ஹெல்மெட் அணியுங்கள். விபத்துகளில் உயிர்களை காப்பாற்றும்.",
    },
  },
  {
    title: { en: "School Bus Safety", ta: "பள்ளி பேருந்து பாதுகாப்பு" },
    info: {
      en: "Sit inside the bus, don't put head/hands out. Follow driver's instructions.",
      ta: "பேருந்துக்குள் அமர்ந்து இருங்கள், தலை/கைகளை வெளியே வைக்க வேண்டாம். ஓட்டுநரின் அறிவுறுத்தல்களை பின்பற்றுங்கள்.",
    },
  },
];

const VALUES: { title: Bilingual; description: Bilingual }[] = [
  {
    title: { en: "Good Touch / Bad Touch", ta: "நல்ல தொடு / கெட்ட தொடு" },
    description: {
      en: "Understand safe and unsafe touches. Report uncomfortable situations to trusted adults.",
      ta: "பாதுகாப்பான மற்றும் பாதுகாப்பற்ற தொடுகளை புரிந்து கொள்ளுங்கள். அசௌகரியமான சூழ்நிலைகளை நம்பகமான பெரியவர்களிடம் தெரிவிக்கவும்.",
    },
  },
  {
    title: { en: "Respect for Elders", ta: "மூத்தோர் மரியாதை" },
    description: {
      en: "Show respect to parents, teachers, and elders. Listen to their guidance.",
      ta: "பெற்றோர், ஆசிரியர்கள் மற்றும் மூத்தோருக்கு மரியாதை காட்டுங்கள். அவர்களின் வழிகாட்டுதலை கேளுங்கள்.",
    },
  },
  {
    title: { en: "Kindness & Compassion", ta: "அன்பும் இரக்கமும்" },
    description: {
      en: "Help others in need. Be kind to classmates and everyone around you.",
      ta: "தேவையுள்ளவர்களுக்கு உதவுங்கள். வகுப்பு தோழர்கள் மற்றும் உங்களைச் சுற்றியுள்ள அனைவரிடமும் அன்பாக இருங்கள்.",
    },
  },
  {
    title: { en: "Honesty & Responsibility", ta: "நேர்மையும் பொறுப்பும்" },
    description: {
      en: "Be truthful and take responsibility for your actions. Admit mistakes honestly.",
      ta: "உண்மையாக இருங்கள், உங்கள் செயல்களுக்கு பொறுப்பேற்குங்கள். தவறுகளை நேர்மையாக ஒப்புக்கொள்ளுங்கள்.",
    },
  },
  {
    title: { en: "Cleanliness & Hygiene", ta: "தூய்மையும் சுகாதாரமும்" },
    description: {
      en: "Maintain personal and environmental cleanliness. Wash hands, keep surroundings clean.",
      ta: "தனிப்பட்ட மற்றும் சுற்றுச்சூழல் தூய்மையை பராமரிக்கவும். கைகளை கழுவுங்கள், சுற்றுப்புறத்தை சுத்தமாக வைத்திருங்கள்.",
    },
  },
  {
    title: { en: "Helping Others", ta: "பிறருக்கு உதவுதல்" },
    description: {
      en: "Volunteer to help friends, family, and community. Make a positive difference.",
      ta: "நண்பர்கள், குடும்பம் மற்றும் சமூகத்திற்கு உதவ தன்னார்வலராக இருங்கள். நல்ல மாற்றத்தை உருவாக்குங்கள்.",
    },
  },
];

function pick(text: Bilingual, lang: string): string {
  return lang === "ta" ? text.ta : text.en;
}

function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  return <ResponsiveYouTube url={`https://www.youtube.com/watch?v=${id}`} title={title} />;
}

function VideoCard({
  video,
}: {
  video: (typeof SPECIAL_ESSENTIALS)[number];
}) {
  return (
    <Card className="w-full border-0 shadow-[var(--shadow-card)]">
      <ResponsiveYouTube url={`https://www.youtube.com/watch?v=${video.id}`} title={video.title} />
      <div className="p-4">
        <h3 className="text-sm font-bold leading-snug text-foreground">{video.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{video.description}</p>
      </div>
    </Card>
  );
}

function EssentialsPage() {
  const { t, lang } = useLang();
  const readHashSection = () => {
    if (typeof window === "undefined") return "special";
    const hash = window.location.hash.replace("#", "") as Section;
    return ["tamil", "anthem", "emergency", "special", "safety", "traffic", "values"].includes(hash)
      ? hash
      : "special";
  };
  const [activeSection, setActiveSection] = useState<Section>(readHashSection);

  useEffect(() => {
    return () => stopAllYouTubePlayers();
  }, [activeSection]);

  useEffect(() => {
    const handleHashChange = () => setActiveSection(readHashSection());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const sections: { id: Section; label: string }[] = [
    { id: "special", label: t("special") },
    { id: "safety", label: t("safety") },
    { id: "traffic", label: t("traffic") },
    { id: "values", label: t("values") },
    { id: "tamil", label: t("thamizhThaiVazhthu") },
    { id: "anthem", label: t("nationalAnthem") },
    { id: "emergency", label: t("emergencyContacts") },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <Link
          to="/home"
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("back")}
        </Link>
        <GovIdentity compact className="mb-4" />
        <h1 className="text-2xl font-bold text-primary">{t("studentEssentials")}</h1>
        <p className="text-xs opacity-70">{t("safetyValuesAwareness")}</p>
      </header>

      <div className="sticky top-0 z-30 border-b border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => {
                stopAllYouTubePlayers();
                window.history.replaceState(null, "", `#${sec.id}`);
                setActiveSection(sec.id);
              }}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                activeSection === sec.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {activeSection === "tamil" && (
          <div className="space-y-3">
            <Card className="border-0 p-4 shadow-[var(--shadow-card)]">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <Youtube className="h-5 w-5 text-primary" />
                {t("thamizhThaiVazhthu")}
              </h2>
              <YouTubeEmbed id="032ozzPv-nQ" title={t("thamizhThaiVazhthu")} />
            </Card>
          </div>
        )}

        {activeSection === "anthem" && (
          <div className="space-y-3">
            <Card className="border-0 p-4 shadow-[var(--shadow-card)]">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <Youtube className="h-5 w-5 text-primary" />
                {t("nationalAnthem")}
              </h2>
              <YouTubeEmbed id="HtMF973tXIY" title={t("nationalAnthem")} />
            </Card>
          </div>
        )}

        {activeSection === "emergency" && (
          <div className="space-y-3">
            {EMERGENCY_CONTACTS.map((contact) => (
              <Card
                key={contact.number}
                className="border-0 p-4 shadow-[var(--shadow-card)] active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{pick(contact.label, lang)}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("emergencyNumber")}:
                    </p>
                  </div>
                  <a
                    href={`tel:${contact.number}`}
                    className="text-2xl font-bold text-primary"
                  >
                    {contact.number}
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeSection === "special" && (
          <div className="space-y-3">
            <Card className="border-0 p-4 shadow-[var(--shadow-card)]">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Youtube className="h-5 w-5 text-primary" />
                {t("specialEssentials")}
              </h2>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2">
              {SPECIAL_ESSENTIALS.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                />
              ))}
            </div>
          </div>
        )}

        {activeSection === "safety" && (
          <div className="space-y-3">
            {SAFETY_TIPS.map((section) => (
              <Card key={section.title.en} className="border-0 p-4 shadow-[var(--shadow-card)]">
                <h3 className="mb-2 flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  {pick(section.title, lang)}
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {section.tips.map((tip, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-primary">-</span>
                      <span>{pick(tip, lang)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}

        {activeSection === "traffic" && (
          <div className="space-y-3">
            {TRAFFIC_SAFETY.map((item) => (
              <Card key={item.title.en} className="border-0 p-4 shadow-[var(--shadow-card)]">
                <h3 className="mb-2 font-bold text-primary">{pick(item.title, lang)}</h3>
                <p className="text-sm text-muted-foreground">{pick(item.info, lang)}</p>
              </Card>
            ))}
          </div>
        )}

        {activeSection === "values" && (
          <div className="space-y-3">
            {VALUES.map((value) => (
              <Card key={value.title.en} className="border-0 p-4 shadow-[var(--shadow-card)]">
                <h3 className="mb-2 flex items-center gap-2 font-bold">
                  <Heart className="h-4 w-4 text-accent" />
                  {pick(value.title, lang)}
                </h3>
                <p className="text-sm text-muted-foreground">{pick(value.description, lang)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
