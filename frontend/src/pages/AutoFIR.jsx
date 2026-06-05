import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Mic, MicOff, Globe, ShieldAlert,
  UploadCloud, CheckCircle2, History, AlertTriangle, ArrowRight, Printer, RefreshCw
} from 'lucide-react';
import {
  generateFIR,
  getFIRList,
  uploadEvidence,
  getFIRLanguages,
  updateFIRStatus
} from '../services/api';

const FIR_TRANSLATIONS = {
  en: {
    title: "FIRST INFORMATION REPORT (FIR) DRAFT",
    incidentSummary: "Incident Summary",
    location: "Location",
    time: "Time",
    evidence: "Evidence (if any)",
    complaintType: "Complaint Type",
    legalStatement: "Legal Statement Draft",
    statementPrefix: "I hereby solemnly declare that the facts stated above are true to the best of my knowledge and belief.",
  },
  hi: {
    title: "प्रथम सूचना रिपोर्ट (FIR) प्रारूप",
    incidentSummary: "घटना का सारांश (Incident Summary)",
    location: "स्थान (Location)",
    time: "समय (Time)",
    evidence: "साक्ष्य (Evidence)",
    complaintType: "शिकायत का प्रकार (Complaint Type)",
    legalStatement: "कानूनी बयान मसौदा (Legal Statement Draft)",
    statementPrefix: "मैं एतद्द्वारा सत्यनिष्ठा से घोषणा करता/करती हूँ कि ऊपर बताए गए तथ्य मेरी सर्वोत्तम जानकारी और विश्वास के अनुसार सत्य हैं।",
  },
  ta: {
    title: "முதல் தகவல் அறிக்கை (FIR) வரைவு",
    incidentSummary: "சம்பவ சுருக்கம் (Incident Summary)",
    location: "இடம் (Location)",
    time: "நேரம் (Time)",
    evidence: "ஆதாரம் (Evidence)",
    complaintType: "புகார் வகை (Complaint Type)",
    legalStatement: "சட்ட அறிக்கை வரைவு (Legal Statement Draft)",
    statementPrefix: "மேலே கூறப்பட்ட உண்மைகள் எனது அறிவிற்கும் நம்பிக்கத்திற்கும் எட்டிய வரை உண்மை என்று நான் இதன் மூலம் உறுதியளிக்கிறேன்.",
  },
  te: {
    title: "ప్రథమ సమాచార నిവേదిక (FIR) డ్రాఫ్ట్",
    incidentSummary: "సంఘటన సారాంశం (Incident Summary)",
    location: "స్థలం (Location)",
    time: "సమయం (Time)",
    evidence: "ఆధారం (Evidence)",
    complaintType: "ఫిర్యాదు రకం (Complaint Type)",
    legalStatement: "చట్టపరమైన ప్రకటన ముసాయిదా (Legal Statement Draft)",
    statementPrefix: "పైన పేర్కొన్న విషయాలు నా పరిజ్ఞానం మరియు నമ്മకం మేరకు నిజమని నేను దీని ద్వారా ప్రమాణీకరిస్తున్నాను.",
  },
  kn: {
    title: "ಪ್ರಥಮ ಮಾಹಿತಿ ವರದಿ (FIR) ಕರಡು",
    incidentSummary: "ಘಟನೆಯ ಸಾರಾಂಶ (Incident Summary)",
    location: "ಸ್ಥಳ (Location)",
    time: "ಸಮಯ (Time)",
    evidence: "ಪುರಾವೆಗಳು (Evidence)",
    complaintType: "ದೂರಿನ ಪ್ರಕಾರ (Complaint Type)",
    legalStatement: "ಕಾನೂನು ಹೇಳಿಕೆಯ ಕರಡು (Legal Statement Draft)",
    statementPrefix: "ಮೇಲೆ ತಿಳಿಸಲಾದ ಸಂಗതിಗಳು ನನ್ನ ತಿಳುವಳಿಕೆ ಮತ್ತು ನಂಬಿಕೆಯ ಪ್ರಕಾರ ನಿಜವೆಂದು ನಾನು ಈ ಮೂಲಕ ಪ್ರಾಮಾಣಿಕವಾಗಿ ಘೋಷಿಸುತ್ತೇನೆ.",
  },
  ml: {
    title: "പ്രഥമ വിവര റിപ്പോർട്ട് (FIR) ഡ്രാഫ്റ്റ്",
    incidentSummary: "സംഭവത്തിന്റെ സംഗ്രഹം (Incident Summary)",
    location: "സ്ഥലം (Location)",
    time: "സമയം (Time)",
    evidence: "തെളിവുകൾ (Evidence)",
    complaintType: "പരാതിയുടെ തരം (Complaint Type)",
    legalStatement: "നിയമപരമായ പ്രസ്താവന ഡ്രാഫ്റ്റ് (Legal Statement Draft)",
    statementPrefix: "മുകളിൽ പ്രസ്താവിച്ചിരിക്കുന്ന വസ്തുതകൾ എന്റെ അറിവിലും വിശ്വാസത്തിലും സത്യമാണെന്ന് ഞാൻ ഇതിനാൽ സത്യപ്രതിജ്ഞ ചെയ്യുന്നു.",
  }
};

const TRANSLATION_MAP = {
  hi: {
    "Priya Sharma": "प्रिया शर्मा",
    "New Delhi, India": "नई दिल्ली, भारत",
    "Whitefield, Bangalore": "व्हाइटफील्ड, बैंगलोर",
    "T Nagar, Chennai": "टी नगर, चेन्नई",
    "Connaught Place, Delhi": "कनॉट प्लेस, दिल्ली",
    "Lajpat Nagar, Delhi": "लाजपत नगर, दिल्ली",
    "Bandra West, Mumbai": "बांद्रा पश्चिम, मुंबई",
    "Andheri West, Mumbai": "अंधेरी पश्चिम, मुंबई",
    "Hitech City, Hyderabad": "हाइटेक सिटी, हैदराबाद",
    "Secunderabad, Hyderabad": "सिकंदराबाद, हैदराबाद",
    "Someone is following me": "कोई मेरा पीछा कर रहा है",
    "Online phishing transaction theft of 50000 rupees": "50000 रुपये की ऑनलाइन फ़िशिंग लेनदेन चोरी",
    "Unknown caller claiming to be a bank agent": "बैंक एजेंट होने का दावा करने वाला अज्ञात कॉलर",
    "Help, I feel unsafe walking home": "मदद करें, मुझे घर चलने में असुरक्षित महसूस हो रहा है",
    "No description provided": "कोई विवरण प्रदान नहीं किया गया",
    "cybercrime": "साइबर अपराध",
    "theft": "चोरी",
    "stalking": "पीछा करना (Stalking)",
    "harassment": "उत्पीड़न",
    "fraud": "धोखाधड़ी",
    "General Incident": "सामान्य घटना",
    "No files attached": "कोई फाइल संलग्न नहीं है",
    "No files attached yet.": "अभी तक कोई फाइल संलग्न नहीं है।",
    "N/A": "लागू नहीं",
    "Unknown": "अज्ञात",
  },
  ta: {
    "Priya Sharma": "பிரியா சர்மா",
    "New Delhi, India": "புது தில்லி, இந்தியா",
    "Whitefield, Bangalore": "ஒயிட்பீல்ட், பெங்களூர்",
    "T Nagar, Chennai": "தி நகர், சென்னை",
    "Connaught Place, Delhi": "கனாட் பிளேஸ், டெல்லி",
    "Lajpat Nagar, Delhi": "லஜ்பத் நகர், டெல்லி",
    "Bandra West, Mumbai": "பாந்த்ரா மேற்கு, மும்பை",
    "Andheri West, Mumbai": "அந்தேரி மேற்கு, மும்பை",
    "Hitech City, Hyderabad": "ஹைடெக் சிட்டி, ஹைதராபாத்",
    "Secunderabad, Hyderabad": "செகந்திரาபாத், ஹைதராபாத்",
    "Someone is following me": "யாரோ என்னை பின்தொடர்கிறார்கள்",
    "Online phishing transaction theft of 50000 rupees": "50000 ரூபாய் ஆன்லைன் பிஷிங் பரிவர்த்தனை திருட்டு",
    "Unknown caller claiming to be a bank agent": "வங்கி முகவர் என்று கூறிக்கொள்ளும் அறியப்படாத அழைப்பாளர்",
    "Help, I feel unsafe walking home": "உதவி, நான் வீட்டிற்கு நடப்பது பாதுகாப்பற்றதாக உணர்கிறேன்",
    "No description provided": "விளக்கம் எதுவும் வழங்கப்படவில்லை",
    "cybercrime": "சைபர் குற்றம்",
    "theft": "திருட்டு",
    "stalking": "பின்தொடர்தல்",
    "harassment": "துன்புறுத்தல்",
    "fraud": "மோசடி",
    "General Incident": "பொதுவான சம்பவம்",
    "No files attached": "கோப்புகள் எதுவும் இணைக்கப்படவில்லை",
    "No files attached yet.": "இன்னும் கோப்புகள் எதுவும் இணைக்கப்படவில்லை.",
    "N/A": "இல்லை",
    "Unknown": "அறியப்படாதவர்",
  },
  te: {
    "Priya Sharma": "ప్రియా శర్మ",
    "New Delhi, India": "న్యూ ఢిల్లీ, భారతదేశం",
    "Whitefield, Bangalore": "వైట్‌ఫీల్డ్, బెంగళూరు",
    "T Nagar, Chennai": "టి నగర్, చెన్నై",
    "Connaught Place, Delhi": "కన్నాట్ ప్లేస్, ఢిల్లీ",
    "Lajpat Nagar, Delhi": "లజపత్ నగర్, ఢిల్లీ",
    "Bandra West, Mumbai": "బాంద్రా వెస్ట్, ముంబై",
    "Andheri West, Mumbai": "అంధేరి వెస్ట్, ముంబై",
    "Hitech City, Hyderabad": "హైటెక్ సిటీ, హైదరాబాద్",
    "Secunderabad, Hyderabad": "సికింద్రాబాద్, హైదరాబాద్",
    "Someone is following me": "ఎవరో నన్ను వెంబడిస్తున్నారు",
    "Online phishing transaction theft of 50000 rupees": "50000 రూపాయల ఆన్‌లైన్ ఫిషింగ్ లావాదేవీల దొంగతనం",
    "Unknown caller claiming to be a bank agent": "బ్యాంక్ ఏజెంట్ అని చెప్పుకునే తెలియని కాలర్",
    "Help, I feel unsafe walking home": "సహాయం చేయండి, నేను ఇంటికి నడవడానికి అసురక్షితంగా భావిస్తున్నాను",
    "No description provided": "ఎలాంటి వివరణ ఇవ్వలేదు",
    "cybercrime": "సైబర్ క్రైమ్",
    "theft": "దొంగతనం",
    "stalking": "వెంబడించడం",
    "harassment": "వేధింపులు",
    "fraud": "మోసం",
    "General Incident": "సాధారణ సంఘటన",
    "No files attached": "ఫైల్‌లు ఏవీ జోడించబడలేదు",
    "No files attached yet.": "ఇంకా ఫైల్‌లు ఏవీ జోడించబడలేదు.",
    "N/A": "వర్తించదు",
    "Unknown": "తెలియదు",
  },
  kn: {
    "Priya Sharma": "ಪ್ರಿಯಾ ಶರ್ಮಾ",
    "New Delhi, India": "ನವದೆಹಲಿ, ಭಾರತ",
    "Whitefield, Bangalore": "ವೈಟ್‌ಫೀಲ್ಡ್, ಬೆಂಗಳೂರು",
    "T Nagar, Chennai": "ಟಿ ನಗರ, ಚೆನ್ನೈ",
    "Connaught Place, Delhi": "ಕನಾಟ್ ಪ್ಲೇಸ್, ದೆಹಲಿ",
    "Lajpat Nagar, Delhi": "ಲಜಪತ್ ನಗರ, ದೆಹಲಿ",
    "Bandra West, Mumbai": "ಬಾಂದ್ರಾ ಪಶ್ಚಿಮ, ಮುಂಬೈ",
    "Andheri West, Mumbai": "ಅಂಧೇರಿ ಪಶ್ಚಿಮ, ಮುಂಬೈ",
    "Hitech City, Hyderabad": "ಹೈಟೆಕ್ ಸಿಟಿ, ಹೈದರಾಬಾದ್",
    "Secunderabad, Hyderabad": "ಸಿಕಂದರಾಬಾದ್, ಹೈದರಾಬಾದ್",
    "Someone is following me": "ಯಾರೋ ನನ್ನನ್ನು ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ",
    "Online phishing transaction theft of 50000 rupees": "50000 ರೂಪಾಯಿ ಆನ್‌ಲೈನ್ ಫಿಶಿಂಗ್ ವಹಿವಾಟು ಕಳ್ಳತನ",
    "Unknown caller claiming to be a bank agent": "ಬ್ಯಾಂಕ್ ಏಜೆಂಟ್ ಎಂದು ಹೇಳಿಕೊಳ್ಳುವ ಅಪರಿಚಿತ ಕರೆದಾರ",
    "Help, I feel unsafe walking home": "ಸಹಾಯ ಮಾಡಿ, ನನಗೆ ಮನೆಗೆ ನಡೆಯಲು ಅಸುರಕ್ಷಿತ ಅನಿಸುತ್ತಿದೆ",
    "No description provided": "ಯಾವುದೇ ವಿವರಣೆ ನೀಡಲಾಗಿಲ್ಲ",
    "cybercrime": "ಸೈಬರ್ ಅಪರಾಧ",
    "theft": "ಕಳ್ಳತನ",
    "stalking": "ಹಿಂಬಾಲಿಸುವುದು",
    "harassment": "ಕಿರುಕುಳ",
    "fraud": "ವಂಚನೆ",
    "General Incident": "ಸಾಮಾನ್ಯ ಘಟನೆ",
    "No files attached": "ಯಾವುದೇ ಫೈಲ್‌ಗಳನ್ನು ಲಗತ್ತಿಸಲಾಗಿಲ್ಲ",
    "No files attached yet.": "ಇನ್ನೂ ಯಾವುದೇ ಫೈಲ್‌ಗಳನ್ನು ಲಗತ್ತಿಸಲಾಗಿಲ್ಲ.",
    "N/A": "ಲಭ್ಯವಿಲ್ಲ",
    "Unknown": "ಅಪರಿಚಿತ",
  },
  ml: {
    "Priya Sharma": "പ്രിയ ശർമ്മ",
    "New Delhi, India": "ന്യൂഡൽഹി, ഇന്ത്യ",
    "Whitefield, Bangalore": "വൈറ്റ്ഫീൽഡ്, ബാംഗ്ലൂർ",
    "T Nagar, Chennai": "ടി നഗർ, ചെന്നൈ",
    "Connaught Place, Delhi": "കനോട്ട് പ്ലേസ്, ഡെൽഹി",
    "Lajpat Nagar, Delhi": "ലജ്പത് നഗർ, ഡെൽഹി",
    "Bandra West, Mumbai": "ബാന്ദ്ര വെസ്റ്റ്, മുംബൈ",
    "Andheri West, Mumbai": "അന്ധേരി വെസ്റ്റ്, മുംബൈ",
    "Hitech City, Hyderabad": "ഹൈടെക് സിറ്റി, ഹൈദരാബാദ്",
    "Secunderabad, Hyderabad": "സെക്കന്തരാബാദ്, ഹൈദരാബാദ്",
    "Someone is following me": "ആരോ എന്നെ പിന്തുടരുന്നു",
    "Online phishing transaction theft of 50000 rupees": "50000 രൂപ ഓൺലൈൻ ഫിഷിംഗ് ഇടപാട് മോഷണം",
    "Unknown caller claiming to be a bank agent": "ബാങ്ക് ഏജന്റാണെന്ന് അവകാശപ്പെടുന്ന അപരിചിതനായ വിളിച്ചയാൾ",
    "Help, I feel unsafe walking home": "സഹായം, എനിക്ക് വീട്ടിലേക്ക് നടക്കാൻ സുരക്ഷിതമല്ലാത്തതായി തോന്നുന്നു",
    "No description provided": "വിവരണം ഒന്നും നൽകിയിട്ടില്ല",
    "cybercrime": "സൈബർ കുറ്റകൃത്യം",
    "theft": "മോഷണം",
    "stalking": "പിന്തുടരൽ",
    "harassment": "പീഡനം",
    "fraud": "തട്ടിപ്പ്",
    "General Incident": "പൊതുവായ സംഭവം",
    "No files attached": "ഫയലുകളൊന്നും അറ്റാച്ചുചെയ്തിട്ടില്ല",
    "No files attached yet.": "ഫയലുകളൊന്നും ഇതുവരെ അറ്റാച്ചുചെയ്തിട്ടില്ല.",
    "N/A": "ബാധകമല്ല",
    "Unknown": "അജ്ഞാതൻ",
  }
};

const translateVal = (val, targetLang) => {
  if (!val) return 'N/A';
  if (targetLang === 'en') return val;
  const map = TRANSLATION_MAP[targetLang];
  if (!map) return val;
  if (map[val]) return map[val];
  // Substring replacement for common entities
  let result = val;
  Object.keys(map).forEach(key => {
    result = result.replaceAll(key, map[key]);
  });
  return result;
};

export default function AutoFIR() {
  const [desc, setDesc] = useState('');
  const [lang, setLang] = useState('en');
  const [name, setName] = useState('Priya Sharma');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [location, setLocation] = useState('New Delhi, India');
  const [accused, setAccused] = useState('Unknown caller claiming to be a bank agent');
  
  const [languages, setLanguages] = useState({});
  const [firs, setFirs] = useState([]);
  const [activeFir, setActiveFir] = useState(null);
  
  const [generating, setGenerating] = useState(false);
  const [recording, setRecording] = useState(false);
  
  // File Upload states
  const [uploading, setUploading] = useState(false);
  const [evidenceList, setEvidenceList] = useState([]);
  
  const recognitionRef = useRef(null);

  // Load languages and past FIR complaints
  const loadInitialData = async () => {
    try {
      const [langRes, listRes] = await Promise.all([
        getFIRLanguages(),
        getFIRList(1)
      ]);
      if (langRes.success) setLanguages(langRes.languages);
      if (listRes.success) setFirs(listRes.firs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Check browser SpeechRecognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';
      
      rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setDesc(prev => prev + ' ' + finalTranscript);
        }
      };
      
      rec.onend = () => setRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type incident description.");
      return;
    }
    
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      recognitionRef.current.start();
      setRecording(true);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!desc.trim()) return;

    setGenerating(true);
    try {
      const res = await generateFIR({
        user_id: 1,
        incident_description: desc,
        language: lang,
        complainant_name: name,
        complainant_phone: phone,
        incident_location: location,
        accused_description: accused
      });
      if (res.fir_id) {
        setActiveFir(res);
        setEvidenceList([]); // clear for new FIR
        loadInitialData(); // reload history
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeFir) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fir_id', activeFir.fir_id);

    try {
      const res = await uploadEvidence(formData);
      if (res.success) {
        setEvidenceList(prev => [...prev, res]);
        // Refresh active FIR details
        loadInitialData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("fir-print-area")?.innerText;
    const originalContent = document.body.innerHTML;
    
    const w = window.open();
    w.document.write(`
      <html>
        <head><title>FeelSafe Generated FIR Draft</title></head>
        <body style="font-family: monospace; white-space: pre-wrap; padding: 40px; background: white; color: black;">
          ${printContent}
        </body>
      </html>
    `);
    w.print();
    w.close();
  };

  const handleStatusCycle = async (firId, currentStatus) => {
    let nextStatus = 'FILED';
    let officer = null;
    if (currentStatus === 'FILED') {
      nextStatus = 'ASSIGNED';
      officer = 'Inspector Suresh Kumar';
    } else if (currentStatus === 'ASSIGNED') {
      nextStatus = 'RESOLVED';
    } else {
      nextStatus = 'FILED';
    }

    try {
      const res = await updateFIRStatus(firId, nextStatus, officer);
      if (res.success) {
        loadInitialData();
        if (activeFir && activeFir.fir_id === firId) {
          setActiveFir(prev => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTimelineClass = (status, stage) => {
    const order = ['FILED', 'ASSIGNED', 'RESOLVED'];
    const statusIndex = order.indexOf(status);
    const stageIndex = order.indexOf(stage);

    if (statusIndex >= stageIndex) return 'bg-[#00FF9D] text-[#0B1020]';
    return 'bg-gray-800 text-gray-400';
  };

  const getStructuredPreviewText = () => {
    const trans = FIR_TRANSLATIONS[lang] || FIR_TRANSLATIONS['en'];
    const evText = evidenceList.length > 0
      ? evidenceList.map(e => `${e.filename} (SHA-256: ${e.sha256_hash.substring(0, 16)}...)`).join('\n   ')
      : translateVal('No files attached', lang);
    
    return `
[ ${trans.title} ]
=========================================

1. ${trans.incidentSummary}:
   ${translateVal(desc, lang)}

2. ${trans.location}:
   ${translateVal(location, lang)}

3. ${trans.time}:
   ${new Date().toLocaleString()}

4. ${trans.evidence}:
   ${evText}

5. ${trans.complaintType}:
   ${translateVal(activeFir?.crime_type || 'General Incident', lang).toUpperCase()}

6. ${trans.legalStatement}:
   ${trans.statementPrefix}

   Name: ${translateVal(name, lang)}
   Phone: ${phone}
=========================================
`.trim();
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-[#00E5FF]" />
        <div>
          <h1 className="text-3xl font-black">AI Auto FIR & Complaint Generator</h1>
          <p className="text-gray-400 text-sm mt-1">
            Instantly compile verified, structured legal drafts in 22 regional languages with SHA-256 evidence anchoring.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#00E5FF]" /> Complainant Details
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-gray-400 font-semibold">Full Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold">Mobile Number</label>
                <input 
                  type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold">Incident Location</label>
                <input 
                  type="text" required value={location} onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold">Accused/Suspect Details</label>
                <input 
                  type="text" value={accused} onChange={(e) => setAccused(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-gray-400 font-semibold">Translate Draft To</label>
                  <span className="text-[10px] text-[#00E5FF] font-bold">Supported Languages</span>
                </div>
                <select 
                  value={lang} onChange={(e) => setLang(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF] font-bold"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-400 font-semibold">Describe Incident</label>
                  <button 
                    type="button" 
                    onClick={toggleRecording}
                    className={`p-1.5 rounded-lg border transition-all ${
                      recording ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-[#00E5FF] hover:bg-white/10'
                    }`}
                  >
                    {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
                <textarea 
                  rows="4" required value={desc} onChange={(e) => setDesc(e.target.value)}
                  placeholder="Describe what happened, date, time, loss incurred, details of calls or threats received..."
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF] resize-none"
                />
                <span className="text-[10px] text-gray-500">You can use voice dictation to speak details in English.</span>
              </div>

              <button 
                type="submit" 
                disabled={generating || !desc.trim()}
                className="w-full py-3 rounded-2xl bg-[#00E5FF] text-[#0B1020] font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,229,255,0.3)] flex items-center justify-center gap-2"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Generate Structured FIR Draft
              </button>
            </form>
          </div>
        </div>

        {/* Center/Right Draft Preview Panel */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeFir ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-6 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[80px] opacity-10" />
                
                {/* Tracker Timeline */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="font-bold text-lg text-white">FIR Draft Status</h3>
                    <div className="text-xs text-[#00E5FF] font-semibold mt-0.5">Complaints ID: {activeFir.fir_number}</div>
                  </div>
                  
                  {/* Interactive Status Cycle for Demo */}
                  <button 
                    onClick={() => handleStatusCycle(activeFir.fir_id, activeFir.status)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-400 font-bold transition-all flex items-center gap-1.5"
                  >
                    Simulate Status Shift <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Timeline display */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] py-2">
                  <div className="space-y-1">
                    <div className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center font-bold ${getTimelineClass(activeFir.status, 'FILED')}`}>1</div>
                    <div className="font-semibold text-white">FILED / DRAFTED</div>
                  </div>
                  <div className="space-y-1">
                    <div className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center font-bold ${getTimelineClass(activeFir.status, 'ASSIGNED')}`}>2</div>
                    <div className="font-semibold text-white">ASSIGNED OFFICER</div>
                  </div>
                  <div className="space-y-1">
                    <div className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center font-bold ${getTimelineClass(activeFir.status, 'RESOLVED')}`}>3</div>
                    <div className="font-semibold text-white">RESOLVED</div>
                  </div>
                </div>

                {/* Document Display */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400">Structured Template Preview</span>
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#00FF9D] transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Draft
                    </button>
                  </div>

                  <div 
                    id="fir-print-area" 
                    className="p-4 bg-black/40 border border-white/5 rounded-2xl max-h-[300px] overflow-y-auto text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed scrollbar-thin"
                  >
                    {activeFir?.draft_translated}
                  </div>
                </div>

                {/* Evidence Attachment System */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-[#7C4DFF]" /> Cryptographic Evidence Locker
                    </h4>
                    <span className="text-[10px] text-gray-500">SHA-256 anchored integrity</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Upload button */}
                    <div className="flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-4 hover:border-[#00E5FF]/40 transition-colors relative">
                      <input 
                        type="file" 
                        onChange={handleEvidenceUpload}
                        disabled={uploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="text-center space-y-1">
                        <UploadCloud className="w-6 h-6 text-gray-400 mx-auto" />
                        <div className="text-xs font-bold text-gray-300">Click or Drag Evidence</div>
                        <div className="text-[10px] text-gray-500">Image, Video, Audio, Logs</div>
                      </div>
                    </div>

                    {/* Hashes List */}
                    <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                      {evidenceList.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500 italic">No files attached yet.</div>
                      ) : (
                        evidenceList.map((ev, i) => (
                          <div key={i} className="p-2 bg-black/40 rounded-xl border border-white/5 space-y-1">
                            <div className="flex justify-between text-[10px] text-white font-bold">
                              <span className="truncate max-w-[120px]">{ev.filename}</span>
                              <span className="text-[#00FF9D]">{ev.file_size_kb} KB</span>
                            </div>
                            <div className="text-[9px] text-[#00E5FF] font-mono select-all truncate">
                              SHA-256: {ev.sha256_hash}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass p-12 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center space-y-3 h-[450px]">
                <FileText className="w-16 h-16 opacity-30 text-[#00E5FF] animate-pulse" />
                <h3 className="font-bold text-lg text-white">Generate FIR Draft Preview</h3>
                <p className="text-gray-500 text-xs max-w-sm">
                  Once details are generated, the structured template layout, print services, and SHA-256 evidence anchoring will activate here.
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Past complaints / list */}
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#7C4DFF]" /> Filed Complaints History
            </h3>

            {firs.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500">No complaints filed yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-1">
                {firs.map((f) => (
                  <div 
                    key={f.id}
                    onClick={() => {
                      setActiveFir({
                        fir_id: f.id,
                        fir_number: f.fir_number,
                        status: f.status,
                        draft_translated: f.structured_draft,
                        language: f.language
                      });
                      setLang(f.language);
                      setDesc(f.incident_description);
                      setLocation(f.incident_location || 'India');
                    }}
                    className="p-3.5 bg-black/30 hover:bg-black/55 border border-white/5 hover:border-white/10 rounded-2xl transition-all cursor-pointer space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#00E5FF]">{f.fir_number}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                        f.status === 'RESOLVED' ? 'bg-[#00FF9D]/15 text-[#00FF9D]' : 'bg-[#FFC857]/15 text-[#FFC857]'
                      }`}>{f.status}</span>
                    </div>
                    <p className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed">{f.incident_description}</p>
                    <div className="flex justify-between text-[9px] text-gray-500 pt-1 border-t border-white/5">
                      <span>Date: {f.incident_date}</span>
                      <span>Lang: {f.language.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
