/**
 * src/utils/navigatorData.js
 * Multi-lingual data resources and emergency classifier helper for FeelSafe Emergency Navigator.
 */

// Geodesic distance in km helper
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const STRINGS = {
  en: {
    splashTitle: "Select Navigation Language",
    splashSubtitle: "Choose your preferred language for emergency guidance and service routing.",
    title: "AI Emergency Government Navigator",
    subtitle: "GPS Location-Aware Emergency Assistant & Safety Route Navigator",
    searchPlaceholder: "Search nearest police station, hospital, ambulance, cyber cell...",
    searchBtn: "Search",
    searchingBtn: "Searching...",
    gpsLabel: "GPS Lock",
    gpsDetecting: "Detecting current position...",
    gpsDenied: "GPS Permission Denied - Delhi Fallback",
    gpsUnsupported: "Geolocation Unsupported - Delhi Fallback",
    radiusLabel: "Proximity Radius",
    severityLabel: "Severity Level",
    callNowBtn: "CALL HELPLINE",
    sosTriggerTitle: "🚨 High Urgency Detected!",
    sosTriggerDesc: "We detected high-urgency keywords in your description. Would you like to trigger a One-Touch SOS Alert to notify your saved contacts and emergency services?",
    sosBtnText: "Yes, Send SOS",
    cancelBtnText: "Cancel",
    sosActiveTitle: "SOS ALERT TRANSMITTING",
    sosTriggerIn: "Triggering SOS Alert in",
    sosLogSuccess: "SOS successfully pushed to FeelSafe backend services!",
    sosLogSms: "SMS GATEWAY LOG",
    sosLogEscalation: "ESCALATION THREAD",
    sosLogWhatsapp: "OPEN WHATSAPP WEB ALERT",
    sosLogBroadcasting: "Broadcasting GPS coordinates...",
    sosPanelTitle: "One-Touch SOS Action",
    sosPanelDesc: "Sends current coordinates, category info, and alerts to saved contacts via backend Twilio gateways.",
    sosPanelBtn: "SEND SOS ALERT",
    recommendedHelplineTitle: "Recommended Call Hotline",
    recommendedHelplineSubtitle: "AI Assistant Recommendation",
    categoryLabels: {
      "Medical": "🚨 Category: Medical Emergency",
      "Crime": "🚨 Category: Crime / Personal Threat",
      "Cybercrime": "🚨 Category: Cybercrime / Online Fraud",
      "Accident": "🚨 Category: Accident / Road Crisis",
      "Document loss": "🚨 Category: Document Loss",
      "Mental distress": "🚨 Category: Mental Distress"
    },
    chatHeader: "Emergency Crisis Advisor",
    chatPlaceholder: "Describe your emergency or use voice input to classify...",
    chatListening: "Listening... Speak now...",
    chatNoMessages: "Describe your emergency in text or tap the microphone icon below for speech-to-text classification.",
    nearestServicesTitle: "Nearest Emergency Services",
    guidesTitle: "🧭 Step-by-Step Emergency Guide",
    proceduresTitle: "📄 Government Procedure Navigator",
    showRouteBtn: "Navigate",
    routingBtn: "Routing...",
    clearRouteBtn: "Clear Route",
    noResultsText: "No live services returned. Try querying another emergency term.",
    activeRouteTitle: "🗺️ Active Emergency Navigation Route",
    distanceLabel: "Distance",
    activeNavHudTitle: "Active Emergency Navigation HUD",
    activeNavHudSubtitle: "Keep this panel open. SOS system is armed.",
    endNavBtn: "End Navigation",
    simulationFinished: "You have arrived at your emergency destination.",
    stepsLabel: "📌 Immediate Action Steps:",
    helplinesLabel: "☎ Local Helplines:",
    linksLabel: "🌐 Official Portals:",
    safetyLabel: "🛡️ Safety Protocols:",
    navigatingTo: "Navigating to",
    routeFallbackWarning: "⚠️ Road routing service unavailable. Showing straight-line path to destination."
  },
  hi: {
    splashTitle: "नेविगेशन भाषा चुनें",
    splashSubtitle: "आपातकालीन मार्गदर्शन और सेवा मार्ग के लिए अपनी पसंदीदा भाषा चुनें।",
    title: "एआई आपातकालीन सरकारी नेविगेटर",
    subtitle: "जीपीएस स्थान-जागरूक आपातकालीन सहायक और सुरक्षा मार्ग नेविगेटर",
    searchPlaceholder: "निकटतम पुलिस स्टेशन, अस्पताल, एम्बुलेंस, साइबर सेल खोजें...",
    searchBtn: "खोजें",
    searchingBtn: "खोज जारी...",
    gpsLabel: "जीपीएस लॉक",
    gpsDetecting: "वर्तमान स्थिति का पता लगाया जा रहा है...",
    gpsDenied: "जीपीएस अनुमति अस्वीकृत - दिल्ली डिफ़ॉल्ट",
    gpsUnsupported: "भौगोलिक स्थान असमर्थित - दिल्ली डिफ़ॉल्ट",
    radiusLabel: "खोज त्रिज्या",
    severityLabel: "तीव्रता स्तर",
    callNowBtn: "हेल्पलाइन कॉल करें",
    sosTriggerTitle: "🚨 अत्यधिक आपातकाल पाया गया!",
    sosTriggerDesc: "हमने आपकी जानकारी में उच्च-तीव्रता वाले शब्द पाए हैं। क्या आप अपने सहेजे गए संपर्कों को सूचित करने के लिए वन-टच एसओएस (SOS) भेजना चाहते हैं?",
    sosBtnText: "हाँ, एसओएस भेजें",
    cancelBtnText: "रद्द करें",
    sosActiveTitle: "एसओएस अलर्ट भेजा जा रहा है",
    sosTriggerIn: "एसओएस अलर्ट ट्रिगर होने में",
    sosLogSuccess: "एसओएस सफलतापूर्वक फीलसेफ बैकएंड सेवाओं पर भेजा गया!",
    sosLogSms: "एसएमएस गेटवे लॉग",
    sosLogEscalation: "वृद्धि थ्रेड",
    sosLogWhatsapp: "व्हाट्सएप वेब अलर्ट खोलें",
    sosLogBroadcasting: "जीपीएस निर्देशांक प्रसारित किया जा रहा है...",
    sosPanelTitle: "वन-टच एसओएस एक्शन",
    sosPanelDesc: "बैकएंड ट्विलियो गेटवे के माध्यम से सहेजे गए संपर्कों को वर्तमान निर्देशांक, श्रेणी की जानकारी और अलर्ट भेजता है।",
    sosPanelBtn: "एसओएस अलर्ट भेजें",
    recommendedHelplineTitle: "अनुशंसित कॉल हॉटलाइन",
    recommendedHelplineSubtitle: "एआई सहायक अनुशंसा",
    categoryLabels: {
      "Medical": "🚨 श्रेणी: चिकित्सा आपातकाल",
      "Crime": "🚨 श्रेणी: अपराध / व्यक्तिगत खतरा",
      "Cybercrime": "🚨 श्रेणी: साइबर अपराध / ऑनलाइन धोखाधड़ी",
      "Accident": "🚨 श्रेणी: दुर्घटना / सड़क संकट",
      "Document loss": "🚨 श्रेणी: दस्तावेज़ गुम होना",
      "Mental distress": "🚨 श्रेणी: मानसिक संकट"
    },
    chatHeader: "आपातकालीन संकट सलाहकार",
    chatPlaceholder: "वर्गीकृत करने के लिए अपनी आपातकालीन स्थिति का वर्णन करें या वॉयस इनपुट का उपयोग करें...",
    chatListening: "सुन रहा हूँ... अब बोलें...",
    chatNoMessages: "अपनी आपातकालीन स्थिति के बारे में लिखें या भाषण से पाठ वर्गीकरण के लिए नीचे माइक्रोफ़ोन आइकन पर टैप करें।",
    nearestServicesTitle: "निकटतम आपातकालीन सेवाएं",
    guidesTitle: "🧭 चरण-दर-चरण आपातकालीन मार्गदर्शिका",
    proceduresTitle: "📄 सरकारी प्रक्रिया गाइड",
    showRouteBtn: "मार्गदर्शन",
    routingBtn: "मार्ग खोज...",
    clearRouteBtn: "मार्ग हटाएं",
    noResultsText: "कोई सेवा नहीं मिली। अन्य आपातकालीन शब्द खोजें।",
    activeRouteTitle: "🗺️ सक्रिय आपातकालीन नेविगेशन मार्ग",
    distanceLabel: "दूरी",
    activeNavHudTitle: "सक्रिय आपातकालीन नेविगेशन HUD",
    activeNavHudSubtitle: "इस पैनल को खुला रखें। एसओएस प्रणाली सक्रिय है।",
    endNavBtn: "नेविगेशन समाप्त करें",
    simulationFinished: "आप अपने आपातकालीन गंतव्य पर पहुंच गए हैं।",
    stepsLabel: "📌 तत्काल आवश्यक कदम:",
    helplinesLabel: "☎ स्थानीय हेल्पलाइन नंबर:",
    linksLabel: "🌐 आधिकारिक पोर्टल:",
    safetyLabel: "🛡️ सुरक्षा प्रोटोकॉल:",
    navigatingTo: "नेविगेट कर रहे हैं",
    routeFallbackWarning: "⚠️ सड़क मार्ग सेवा अनुपलब्ध है। गंतव्य का सीधा मार्ग दिखाया जा रहा है।"
  },
  kn: {
    splashTitle: "ನ್ಯಾವಿಗೇಷನ್ ಭಾಷೆಯನ್ನು ಆರಿಸಿ",
    splashSubtitle: "ತುರ್ತು ಮಾರ್ಗದರ್ಶನ ಮತ್ತು ಸೇವಾ ಮಾರ್ಗಗಳಿಗಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    title: "AI ತುರ್ತು ಸರ್ಕಾರಿ ನ್ಯಾವಿಗೇಟರ್",
    subtitle: "ಜಿಪಿಎಸ್ ಸ್ಥಳ ಆಧಾರಿತ ತುರ್ತು ಸಹಾಯ ಮತ್ತು ಸುರಕ್ಷತಾ ಮಾರ್ಗ ನ್ಯಾವಿಗೇಟರ್",
    searchPlaceholder: "ಹತ್ತಿರದ ಪೊಲೀಸ್ ಠಾಣೆ, ಆಸ್ಪತ್ರೆ, ಆಂಬ್ಯುಲೆನ್ಸ್, ಸೈಬರ್ ಸೆಲ್ ಹುಡುಕಿ...",
    searchBtn: "ಹುಡುಕು",
    searchingBtn: "ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    gpsLabel: "ಜಿಪಿಎಸ್ ಲಾಕ್",
    gpsDetecting: "ಪ್ರಸ್ತುತ ಸ್ಥಳ ಪತ್ತೆಹಚ್ಚಲಾಗುತ್ತಿದೆ...",
    gpsDenied: "ಜಿಪಿಎಸ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ - ದೆಹಲಿ ಡೀಫಾಲ್ಟ್",
    gpsUnsupported: "ಜಿಯೋಲೋಕಲೈಸೇಶನ್ ಬೆಂಬಲವಿಲ್ಲ - ದೆಹಲಿ ಡೀಫಾಲ್ಟ್",
    radiusLabel: "ಹುಡುಕಾಟದ ವ್ಯಾಪ್ತಿ",
    severityLabel: "ತೀವ್ರತೆಯ ಮಟ್ಟ",
    callNowBtn: "ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡಿ",
    sosTriggerTitle: "🚨 ಹೆಚ್ಚಿನ ತುರ್ತು ಪತ್ತೆಯಾಗಿದೆ!",
    sosTriggerDesc: "ನಿಮ್ಮ ವಿವರಣೆಯಲ್ಲಿ ಹೆಚ್ಚಿನ ತುರ್ತು ಪದಗಳು ಕಂಡುಬಂದಿವೆ. ನಿಮ್ಮ ಉಳಿಸಿದ ಸಂಪರ್ಕಗಳಿಗೆ ತಿಳಿಸಲು ಒನ್-ಟಚ್ SOS ಎಚ್ಚರಿಕೆಯನ್ನು ಕಳುಹಿಸಲು ಬಯಸುವಿರಾ?",
    sosBtnText: "ಹೌದು, SOS ಕಳುಹಿಸಿ",
    cancelBtnText: "ರದ್ದುಮಾಡಿ",
    sosActiveTitle: "SOS ಎಚ್ಚರಿಕೆ ರವಾನೆಯಾಗುತ್ತಿದೆ",
    sosTriggerIn: "SOS ಎಚ್ಚರಿಕೆ ಪ್ರಚೋದಿಸಲು",
    sosLogSuccess: "SOS ಅನ್ನು ಫೀಲ್‌ಸೇಫ್ ಬ್ಯಾಕೆಂಡ್ ಸೇವೆಗಳಿಗೆ ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ!",
    sosLogSms: "SMS ಗೇಟ್‌ವೇ ಲಾಗ್",
    sosLogEscalation: "ಎಸ್ಕಲೇಶನ್ ಥ್ರೆಡ್",
    sosLogWhatsapp: "WhatsApp ವೆಬ್ ಅಲರ್ಟ್ ತೆರೆಯಿರಿ",
    sosLogBroadcasting: "ಜಿಪಿಎಸ್ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಪ್ರಸಾರ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    sosPanelTitle: "ಒನ್-ಟಚ್ SOS ಕ್ರಿಯೆ",
    sosPanelDesc: "ಬ್ಯಾಕೆಂಡ್ ಟ್ವಿಲಿಯೋ ಗೇಟ್‌ವೇಗಳ ಮೂಲಕ ಉಳಿಸಿದ ಸಂಪರ್ಕಗಳಿಗೆ ಪ್ರಸ್ತುತ ನಿರ್ದೇಶಾಂಕಗಳು, ವರ್ಗ ಮಾಹಿತಿ ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳನ್ನು ಕಳುಹಿಸುತ್ತದೆ.",
    sosPanelBtn: "SOS ಅಲರ್ಟ್ ಕಳುಹಿಸಿ",
    recommendedHelplineTitle: "ಶಿಫಾರಸು ಮಾಡಲಾದ ಸಹಾಯವಾಣಿ",
    recommendedHelplineSubtitle: "AI ಸಹಾಯಕ ಶಿಫಾರಸು",
    categoryLabels: {
      "Medical": "🚨 ವರ್ಗ: ವೈದ್ಯಕೀಯ ತುರ್ತು",
      "Crime": "🚨 ವರ್ಗ: ಅಪರಾಧ / ವೈಯಕ್ತಿಕ ಬೆದರಿಕೆ",
      "Cybercrime": "🚨 ವರ್ಗ: ಸೈಬರ್ ಅಪರಾಧ / ಆನ್‌ಲೈನ್ ವಂಚನೆ",
      "Accident": "🚨 ವರ್ಗ: ಅಪಘಾತ / ರಸ್ತೆ ಬಿಕ್ಕಟ್ಟು",
      "Document loss": "🚨 ವರ್ಗ: ದಾಖಲೆ ನಷ್ಟ",
      "Mental distress": "🚨 ವರ್ಗ: ಮಾನಸಿಕ ಸಂಕಷ್ಟ"
    },
    chatHeader: "ತುರ್ತು ಬಿಕ್ಕಟ್ಟು ಸಲಹೆಗಾರ",
    chatPlaceholder: "ವರ್ಗೀಕರಿಸಲು ನಿಮ್ಮ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ವಿವರಿಸಿ ಅಥವಾ ಧ್ವನಿ ಬಳಸಿ...",
    chatListening: "ಕೇಳುತ್ತಿರುವೆ... ಈಗ ಮಾತನಾಡಿ...",
    chatNoMessages: "ನಿಮ್ಮ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ವಿವರಿಸಿ ಅಥವಾ ಧ್ವನಿ ವರ್ಗೀಕರಣಕ್ಕಾಗಿ ಮೈಕ್ರೊಫೋನ್ ಟ್ಯಾಪ್ ಮಾಡಿ.",
    nearestServicesTitle: "ಹತ್ತಿರದ ತುರ್ತು ಸೇವೆಗಳು",
    guidesTitle: "🧭 ಹಂತ ಹಂತದ ತುರ್ತು ಮಾರ್ಗದರ್ಶಿ",
    proceduresTitle: "📄 ಸರ್ಕಾರಿ ಪ್ರಕ್ರಿಯೆ ಮಾರ್ಗದರ್ಶಿ",
    showRouteBtn: "ಮಾರ್ಗ ತೋರಿಸು",
    routingBtn: "ಮಾರ್ಗ ಶೋಧ...",
    clearRouteBtn: "ಮಾರ್ಗ ರದ್ದುಮಾಡಿ",
    noResultsText: "ಯಾವುದೇ ಸೇವೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ಬೇರೆ ಪದವನ್ನು ಹುಡುಕಿ.",
    activeRouteTitle: "🗺️ ಸಕ್ರಿಯ ತುರ್ತು ನ್ಯಾವಿಗೇಷನ್ ಮಾರ್ಗ",
    distanceLabel: "ದೂರ",
    activeNavHudTitle: "ಸಕ್ರಿಯ ತುರ್ತು ನ್ಯಾವಿಗೇಷನ್ HUD",
    activeNavHudSubtitle: "ಈ ಫಲಕವನ್ನು ಮುಕ್ತವಾಗಿಡಿ. SOS ವ್ಯವಸ್ಥೆ ಸಕ್ರಿಯವಾಗಿದೆ.",
    endNavBtn: "ನ್ಯಾವಿಗೇಷನ್ ಕೊನೆಗೊಳಿಸಿ",
    simulationFinished: "ನೀವು ನಿಮ್ಮ ತುರ್ತು ಗಮ್ಯಸ್ಥಾನವನ್ನು ತಲುಪಿದ್ದೀರಿ.",
    stepsLabel: "📌 ತಕ್ಷಣದ ಅಗತ್ಯ ಕ್ರಮಗಳು:",
    helplinesLabel: "☎ ಸ್ಥಳೀಯ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳು:",
    linksLabel: "🌐 ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳು:",
    safetyLabel: "🛡️ ಸುರಕ್ಷತಾ ನಿಯಮಗಳು:",
    navigatingTo: "ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ",
    routeFallbackWarning: "⚠️ ರಸ್ತೆ ಮಾರ್ಗ ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ. ಗಮ್ಯಸ್ಥಾನದ ನೇರ ಮಾರ್ಗವನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
  }
};

// Keyword definitions per language for emergency classification
export const EMERGENCY_KEYWORDS = {
  en: {
    medical: ["bleeding", "ambulance", "heart attack", "accident", "injured", "pain", "hospital", "breathing", "unconscious", "doctor", "chest pain", "breathless", "stroke", "burn", "choking", "fracture", "blood", "medical", "clinic", "pharmacy", "chemist"],
    crime: ["theft", "stolen", "robbed", "crime", "kidnapped", "attacked", "assault", "police", "threatened", "stalked", "violence", "burglar", "weapon", "harassment", "eve-teasing", "thief", "gun", "knife", "mugged", "abducted", "rape", "murder", "cop", "station"],
    cyber: ["hacked", "cyber", "scam", "fraud", "upi", "otp", "phishing", "online", "bank", "account hack", "ransomware", "cybercrime", "credit card", "debit card", "password stolen", "phishing link", "money stolen", "impersonation", "cyber cell"],
    accident: ["crash", "collision", "wreck", "fire", "smoke", "road block", "hit and run", "runover", "blast", "explosion", "derailed", "highway accident", "car pileup"],
    doc: ["lost aadhaar", "lost pan", "lost passport", "lost document", "lost wallet", "lost card", "aadhaar card", "pan card", "driving license", "passport lost", "certificate lost", "marksheet lost", "voter id lost"],
    mental: ["depressed", "anxious", "mental", "distress", "suicide", "panicking", "worry", "stress", "crying", "anxiety", "depression", "panic attack", "mental health", "therapy", "lonely", "hopeless"],
    highUrgency: ["help", "kidnapped", "bleeding", "followed", "murder", "weapon", "gun", "knife", "dying", "heart attack", "unconscious", "assault", "abducted", "rape", "fire"]
  },
  hi: {
    medical: ["दर्द", "चोट", "अस्पताल", "डॉक्टर", "एम्बुलेंस", "खून", "सांस", "बेहोश", "चिकित्सा", "दुर्घटना", "दवा", "फ़ार्मेसी", "केमिस्ट"],
    crime: ["पुलिस", "चोरी", "लूट", "हमला", "अपहरण", "हथियार", "धमकी", "पीछा", "हिंसा", "चोर", "बंदूक", "चाकू", "बलात्कार", "हत्या", "थाना"],
    cyber: ["हैक", "साइबर", "धोखाधड़ी", "ऑनलाइन", "बैंक", "ओटीपी", "घोटाला", "पैसे चोरी", "पासवर्ड", "यूपीआई", "फ़िशिंग"],
    accident: ["टक्कर", "दुर्घटना", "आग", "धुआं", "विस्फोट", "हाईवे हादसा", "हादसा"],
    doc: ["खो गया", "गुम", "आधार", "पैन", "पासपोर्ट", "दस्तावेज", "लाइसेंस", "कार्ड"],
    mental: ["तनाव", "चिंता", "अवसाद", "मानसिक", "आत्महत्या", "रोना", "अकेलापन", "घबराहट"],
    highUrgency: ["बचाओ", "मदद", "अपहरण", "खून", "पीछा", "हत्या", "हथियार", "बंदूक", "चाकू", "बेहोश", "हमला", "बलात्कार", "आग"]
  },
  kn: {
    medical: ["ನೋವು", "ಗಾಯ", "ಆಸ್ಪತ್ರೆ", "ವೈದ್ಯರು", "ಆಂಬ್ಯುಲೆನ್ಸ್", "ರಕ್ತ", "ಉಸಿರಾಟ", "ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ", "ಚಿಕಿತ್ಸೆ", "ಅಪಘಾತ", "ಔಷಧಿ", "ಕ್ಲಿನಿಕ್"],
    crime: ["ಪೊಲೀಸ್", "ಕಳ್ಳತನ", "ದರೋಡೆ", "ದಾಳಿ", "ಅಪಹರಣ", "ಆಯುಧ", "ಬೆದರಿಕೆ", "ಹಿಂಸೆ", "ಬಂದೂಕು", "ಚಾಕು", "ಕೊಲೆ", "ಠಾಣೆ"],
    cyber: ["ಹ್ಯಾಕ್", "ಸೈಬರ್", "ವಂಚನೆ", "ಆನ್‌ಲೈನ್", "ಬ್ಯಾಂಕ್", "ಒಟಿಪಿ", "ಹಗರಣ", "ಹಣ ಕಳ್ಳತನ", "ಪಾಸ್‌ವರ್ಡ್", "ಯುಪಿಐ"],
    accident: ["ಡಿಕ್ಕಿ", "ಅಪಘಾತ", "ಬೆಂಕಿ", "ಹೊಗೆ", "ಸ್ಫೋಟ", "ಹೆದ್ದಾರಿ ಅಪಘಾತ", "ಅನಾಹುತ"],
    doc: ["ಕಳೆದುಹೋಗಿದೆ", "ಕಳುವಾಗಿದೆ", "ಆಧಾರ್", "ಪಾನ್", "ಪಾಸ್‌ಪೋರ್ಟ್", "ದಾಖಲೆ", "ಲೈಸೆನ್ಸ್", "ಕಾರ್ಡ್"],
    mental: ["ಒತ್ತಡ", "ಆತಂಕ", "ಖಿನ್ನತೆ", "ಮಾನಸಿಕ", "ಆತ್ಮಹತ್ಯೆ", "ಅಳು", "ಒಂಟಿತನ", "ಭಯ"],
    highUrgency: ["ಕಾಪಾಡಿ", "ಸಹಾಯ", "ಅಪಹರಣ", "ರಕ್ತ", "ಕೊಲೆ", "ಆಯುಧ", "ಬಂದೂಕು", "ಚಾಕು", "ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ", "ದಾಳಿ", "ಬೆಂಕಿ"]
  }
};

// Frontend emergency classifier
export function classifyEmergency(text) {
  const t = (text || '').toLowerCase();

  // Combine keywords across languages to catch multilingual inputs properly
  const getMatches = (key) => {
    let count = 0;
    // Check English
    EMERGENCY_KEYWORDS.en[key].forEach(kw => {
      if (t.includes(kw)) count++;
    });
    // Check Hindi
    EMERGENCY_KEYWORDS.hi[key].forEach(kw => {
      if (t.includes(kw)) count++;
    });
    // Check Kannada
    EMERGENCY_KEYWORDS.kn[key].forEach(kw => {
      if (t.includes(kw)) count++;
    });
    return count;
  };

  const matches = {
    "Medical": getMatches("medical"),
    "Crime": getMatches("crime"),
    "Cybercrime": getMatches("cyber"),
    "Accident": getMatches("accident"),
    "Document loss": getMatches("doc"),
    "Mental distress": getMatches("mental")
  };

  let category = "Crime";
  let maxMatches = 0;

  Object.entries(matches).forEach(([cat, val]) => {
    if (val > maxMatches) {
      maxMatches = val;
      category = cat;
    }
  });

  // Fallbacks if no direct match
  if (maxMatches === 0) {
    if (t.includes("lost") || t.includes("missing") || t.includes("खो") || t.includes("ಕಳೆದು")) {
      category = "Document loss";
    } else if (t.includes("online") || t.includes("money") || t.includes("scam") || t.includes("upi") || t.includes("cyber") || t.includes("पैसा") || t.includes("ಹಣ") || t.includes("ವಂಚನೆ")) {
      category = "Cybercrime";
    } else if (t.includes("pain") || t.includes("hurt") || t.includes("sick") || t.includes("hospital") || t.includes("doctor") || t.includes("दर्द") || t.includes("ನೋವು") || t.includes("ಆಸ್ಪತ್ರೆ")) {
      category = "Medical";
    } else if (t.includes("accident") || t.includes("car") || t.includes("crash") || t.includes("दुर्घटना") || t.includes("ಅಪಘಾತ")) {
      category = "Accident";
    } else if (t.includes("sad") || t.includes("kill") || t.includes("die") || t.includes("तनाव") || t.includes("ಆತಂಕ") || t.includes("ಖಿನ್ನತೆ")) {
      category = "Mental distress";
    } else {
      category = "Crime";
    }
  }

  // Severity classification
  let severity = "LOW";
  const hasHighUrgency = [
    ...EMERGENCY_KEYWORDS.en.highUrgency,
    ...EMERGENCY_KEYWORDS.hi.highUrgency,
    ...EMERGENCY_KEYWORDS.kn.highUrgency
  ].some(kw => t.includes(kw));

  if (hasHighUrgency) {
    severity = "HIGH";
  } else {
    const mediumKeywords = [
      "stolen", "hacked", "scam", "lost", "accident", "injured", "pain", "panic", "threatened", "stalked",
      "चोरी", "हैक", "दुर्घटना", "घबराहट", "ಕಳ್ಳತನ", "ಹ್ಯಾಕ್", "ಅಪಘಾತ", "ಭಯ"
    ];
    const hasMedUrgency = mediumKeywords.some(kw => t.includes(kw));
    if (hasMedUrgency) {
      severity = "MEDIUM";
    }
  }

  return { category, severity };
}

// Helpline number mappings
export const getPrimaryHelpline = (cat) => {
  switch (cat) {
    case "Medical": return { label: "Ambulance", number: "108" };
    case "Crime": return { label: "Police Emergency", number: "112" };
    case "Cybercrime": return { label: "Cyber Security", number: "1930" };
    case "Accident": return { label: "Ambulance", number: "108" };
    case "Document loss": return { label: "Police Response", number: "112" };
    case "Mental distress": return { label: "KIRAN Counseling", number: "18005990019" };
    default: return { label: "Emergency Services", number: "112" };
  }
};

// Pre-defined localizations for procedures
export const PROCEDURES = {
  en: {
    fir: {
      title: "FIR Filing Steps",
      steps: [
        "Go to the nearest police station or file an e-FIR on your state police web portal.",
        "Provide detailed incident description, date, time, and location.",
        "Sign the complaint form and ensure you receive a free copy of the registered FIR with a tracking ID.",
        "Keep the copy safely for legal record."
      ]
    },
    aadhaar: {
      title: "Lost Aadhaar/PAN Procedure",
      steps: [
        "File a Lost Document Report (LDR) on your local state police website.",
        "Visit the official UIDAI portal (myaadhaar.uidai.gov.in) or UTIITSL/NSDL PAN portal.",
        "Order a reprint or download an e-Aadhaar/e-PAN using your verified mobile number.",
        "In case of theft, report immediately to prevent identity fraud."
      ]
    },
    cyber: {
      title: "Cyber Complaint Process",
      steps: [
        "Report immediately by dialing the national helpline number 1930.",
        "Register your official complaint online at cybercrime.gov.in.",
        "Keep all evidence ready (screenshots, transaction receipts, bank statements, chat records).",
        "Block compromised cards or accounts immediately."
      ]
    },
    recovery: {
      title: "Emergency Document Recovery",
      steps: [
        "File a police lost report (LDR) immediately for passports, licenses, or property deeds.",
        "For Passport: Visit Passport Seva portal and apply under Re-issue category.",
        "For Driving License: Apply for duplicate DL on Sarathi Parivahan portal.",
        "Provide the police LDR copy as required verification."
      ]
    }
  },
  hi: {
    fir: {
      title: "प्राथमिकी (FIR) दर्ज करने के चरण",
      steps: [
        "निकटतम पुलिस स्टेशन जाएं या राज्य पुलिस पोर्टल पर ई-एफआईआर दर्ज करें।",
        "घटना का विवरण, दिनांक, समय और स्थान की पूरी जानकारी प्रदान करें।",
        "शिकायत फॉर्म पर हस्ताक्षर करें और पंजीकृत प्राथमिकी की एक मुफ्त प्रति (ट्रैकिंग आईडी के साथ) प्राप्त करें।",
        "कानूनी रिकॉर्ड के लिए इस प्रति को सुरक्षित रखें।"
      ]
    },
    aadhaar: {
      title: "गुम हुआ आधार/पैन कार्ड प्रक्रिया",
      steps: [
        "स्थानीय राज्य पुलिस की वेबसाइट पर गुमशुदा दस्तावेज़ रिपोर्ट (LDR) दर्ज करें।",
        "आधिकारिक यूआईडीएआई (myaadhaar.uidai.gov.in) या यूटीआईआईटीएसएल/एनएसडीएल पैन पोर्टल पर जाएं।",
        "अपने सत्यापित मोबाइल नंबर का उपयोग करके पुनर्मुद्रण (Reprint) या ई-आधार/ई-पैन डाउनलोड करें।",
        "पहचान धोखाधड़ी को रोकने के लिए चोरी होने पर तुरंत रिपोर्ट दर्ज करें।"
      ]
    },
    cyber: {
      title: "साइबर शिकायत प्रक्रिया",
      steps: [
        "राष्ट्रीय हेल्पलाइन नंबर 1930 पर डायल करके तुरंत रिपोर्ट करें।",
        "cybercrime.gov.in पर जाकर ऑनलाइन अपनी शिकायत दर्ज करें।",
        "सभी साक्ष्य (स्क्रीनशॉट, लेनदेन रसीदें, बैंक विवरण, चैट रिकॉर्ड) तैयार रखें।",
        "प्रभावित कार्ड या बैंक खातों को तुरंत ब्लॉक करें।"
      ]
    },
    recovery: {
      title: "आपातकालीन दस्तावेज़ पुनर्प्राप्ति",
      steps: [
        "पासपोर्ट, लाइसेंस या संपत्ति के दस्तावेजों के लिए तुरंत पुलिस रिपोर्ट (LDR) दर्ज करें।",
        "पासपोर्ट के लिए: पासपोर्ट सेवा पोर्टल पर जाएं और री-इश्यू श्रेणी के तहत आवेदन करें।",
        "ड्राइविंग लाइसेंस के लिए: सारथी परिवहन पोर्टल पर डुप्लीकेट डीएल के लिए आवेदन करें।",
        "आवश्यक सत्यापन के लिए पुलिस एलडीआर प्रति प्रस्तुत करें।"
      ]
    }
  },
  kn: {
    fir: {
      title: "ಎಫ್‌ಐಆರ್ (FIR) ದಾಖಲಿಸುವ ಹಂತಗಳು",
      steps: [
        "ಹತ್ತಿರದ ಪೊಲೀಸ್ ಠಾಣೆಗೆ ಹೋಗಿ ಅಥವಾ ನಿಮ್ಮ ರಾಜ್ಯದ ಪೊಲೀಸ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಇ-ಎಫ್‌ಐಆರ್ ದಾಖಲಿಸಿ.",
        "ಘಟನೆಯ ವಿವರ, ದಿನಾಂಕ, ಸಮಯ ಮತ್ತು ಸ್ಥಳದ ಸಂಪೂರ್ಣ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಿ.",
        "ದೂರು ನಮೂನೆಗೆ ಸಹಿ ಮಾಡಿ ಮತ್ತು ಟ್ರ್ಯಾಕಿಂಗ್ ಐಡಿಯೊಂದಿಗೆ ಉಚಿತ ಎಫ್‌ಐಆರ್ ನಕಲನ್ನು ಪಡೆಯಿರಿ.",
        "ಕಾನೂನು ದಾಖಲೆಗಾಗಿ ಈ ನಕಲನ್ನು ಸುರಕ್ಷಿತವಾಗಿರಿಸಿ."
      ]
    },
    aadhaar: {
      title: "ಕಳೆದುಹೋದ ಆಧಾರ್/ಪ್ಯಾನ್ ಕಾರ್ಡ್ ಪ್ರಕ್ರಿಯೆ",
      steps: [
        "ನಿಮ್ಮ ಸ್ಥಳೀಯ ರಾಜ್ಯ ಪೊಲೀಸ್ ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ಕಳೆದುಹೋದ ದಾಖಲೆ ವರದಿ (LDR) ದಾಖಲಿಸಿ.",
        "ಅಧಿಕೃತ ಯುಐಡಿಎಐ (myaadhaar.uidai.gov.in) ಅಥವಾ ಪ್ಯಾನ್ ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ.",
        "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಬಳಸಿ ಇ-ಆಧಾರ್/ಇ-ಪ್ಯಾನ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ ಅಥವಾ ಮರುಮುದ್ರಣಕ್ಕೆ ವಿನಂತಿಸಿ.",
        "ಗುರುತು ವಂಚನೆ ತಡೆಯಲು ಕಳುವಾಗಿದ್ದರೆ ತಕ್ಷಣ ವರದಿ ಮಾಡಿ."
      ]
    },
    cyber: {
      title: "ಸೈಬರ್ ದೂರು ಪ್ರಕ್ರಿಯೆ",
      steps: [
        "ರಾಷ್ಟ್ರೀಯ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆ 1930 ಗೆ ಕರೆ ಮಾಡುವ ಮೂಲಕ ತಕ್ಷಣ ವರದಿ ಮಾಡಿ.",
        "cybercrime.gov.in ನಲ್ಲಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ನಿಮ್ಮ ದೂರನ್ನು ದಾಖಲಿಸಿ.",
        "ಎಲ್ಲಾ ಪುರಾವೆಗಳನ್ನು (ಸ್ಕ್ರೀನ್‌ಶಾಟ್‌ಗಳು, ವಹಿವಾಟು ರಶೀದಿಗಳು, ಬ್ಯಾಂಕ್ ಹೇಳಿಕೆಗಳು) ಸಿದ್ಧವಾಗಿಡಿ.",
        "ಬಾಧಿತ ಕಾರ್ಡ್‌ಗಳು ಅಥವಾ ಬ್ಯಾಂಕ್ ಖಾತೆಗಳನ್ನು ತಕ್ಷಣವೇ ಬ್ಲಾಕ್ ಮಾಡಿ."
      ]
    },
    recovery: {
      title: "ತುರ್ತು ದಾಖಲೆ ಮರುಪಡೆಯುವಿಕೆ",
      steps: [
        "ಪಾಸ್‌ಪೋರ್ಟ್, ಚಾಲನಾ ಪರವಾನಗಿ ಕಳೆದುಹೋದರೆ ತಕ್ಷಣ ಪೊಲೀಸ್ ವರದಿ (LDR) ದಾಖಲಿಸಿ.",
        "ಪಾಸ್‌ಪೋರ್ಟ್‌ಗಾಗಿ: ಪಾಸ್‌ಪೋರ್ಟ್ ಸೇವಾ ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ ಮರು-ವಿತರಣೆಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
        "ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್‌ಗಾಗಿ: ಸಾರಥಿ ಪರಿವಾಹನ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನಕಲಿ ಡಿಎಲ್‌ಗಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
        "ಅಗತ್ಯವಿರುವ ಪರಿಶೀಲನೆಗಾಗಿ ಪೊಲೀಸ್ ಎಲ್‌ಡಿಆರ್ ನಕಲನ್ನು ಒದಗಿಸಿ."
      ]
    }
  }
};

// Highly localized response data for each category to look completely premium and robust
export const EMERGENCY_GUIDES = {
  en: {
    "Medical": {
      steps: [
        "Call Ambulance 108 immediately.",
        "Check if victim is breathing and conscious.",
        "Apply clean pressure to bleeding wounds.",
        "Secure the airway and keep them warm."
      ],
      helplines: [
        { label: "Ambulance", number: "108" },
        { label: "Emergency Response", number: "112" }
      ],
      links: [
        { name: "MOHFW Portal", url: "https://mohfw.gov.in" }
      ],
      safety: "Do not move the victim unless they are in immediate hazard. Stay calm."
    },
    "Crime": {
      steps: [
        "Get to a well-lit, populated safe zone immediately.",
        "Call Police 112 or 100 to report the threat.",
        "Note details of clothing, appearance, or vehicle numbers.",
        "Shout loudly for help if in close proximity danger."
      ],
      helplines: [
        { label: "Police Help", number: "112" },
        { label: "Women Helpline", number: "181" }
      ],
      links: [
        { name: "National Crime Portal", url: "https://cybercrime.gov.in" }
      ],
      safety: "Run if possible. Do not engage with attackers. Shield vital areas."
    },
    "Cybercrime": {
      steps: [
        "Report immediately by calling national cyber toll-free number 1930.",
        "Log your complaint on official cybercrime.gov.in website.",
        "Collect and save screenshots, bank SMS, and transaction IDs.",
        "Call your bank customer care immediately to block cards and freeze account."
      ],
      helplines: [
        { label: "Cybercrime Helpline", number: "1930" },
        { label: "Police Alert", number: "112" }
      ],
      links: [
        { name: "Official Cyber Portal", url: "https://cybercrime.gov.in" }
      ],
      safety: "Never share OTPs, UPI PINs, or credentials. Discard unsolicited links."
    },
    "Accident": {
      steps: [
        "Turn on vehicle hazards and move off the active road lane.",
        "Dial 112 or 108 immediately for police and paramedic dispatch.",
        "Photograph the vehicle license plates and structural collision damage.",
        "Exchange insurer details without initiating arguments."
      ],
      helplines: [
        { label: "Ambulance Service", number: "108" },
        { label: "Police ERSS", number: "112" }
      ],
      links: [
        { name: "MORTH Road Safety", url: "https://morth.nic.in" }
      ],
      safety: "Keep a safe distance from damaged cars due to spark/leak fires."
    },
    "Document loss": {
      steps: [
        "File a Lost Document Report (LDR) immediately at the local police station.",
        "Register/log on the official issuing authority portal (UIDAI, NSDL, PAN, Passport).",
        "Initiate duplicate reprint applications online via verified logins.",
        "Monitor credit logs and bank profiles to block identity theft attempts."
      ],
      helplines: [
        { label: "Police Services", number: "112" }
      ],
      links: [
        { name: "UIDAI Aadhaar Portal", url: "https://myaadhaar.uidai.gov.in" }
      ],
      safety: "Keep digital scanned copies of important cards in secure cloud locks."
    },
    "Mental distress": {
      steps: [
        "Sit down, take slow 4-count breaths. Inhale and exhale deeply.",
        "Call national helpline KIRAN 1800-599-0019 to talk to a counselor.",
        "Contact a family member, close companion, or trustable contact.",
        "Call Tele-MANAS helpline at 14416 for immediate professional support."
      ],
      helplines: [
        { label: "KIRAN Counseling", number: "18005990019" },
        { label: "Tele-MANAS Helpline", number: "14416" }
      ],
      links: [
        { name: "Mental Health Guidance", url: "https://mohfw.gov.in" }
      ],
      safety: "Focus on your breathing. You are not alone and help is one call away."
    }
  },
  hi: {
    "Medical": {
      steps: [
        "तुरंत एम्बुलेंस 108 पर कॉल करें।",
        "जांचें कि पीड़ित सांस ले रहा है और होश में है।",
        "बहते हुए घावों पर साफ पट्टी या दबाव लगाएं।",
        "श्वसन मार्ग सुरक्षित करें और उन्हें गर्म रखें।"
      ],
      helplines: [
        { label: "एम्बुलेंस", number: "108" },
        { label: "आपातकालीन प्रतिक्रिया", number: "112" }
      ],
      links: [
        { name: "एमओएचएफडब्ल्यू पोर्टल", url: "https://mohfw.gov.in" }
      ],
      safety: "जब तक कोई तत्काल खतरा न हो, पीड़ित को न हिलाएं। शांत रहें।"
    },
    "Crime": {
      steps: [
        "तुरंत रोशनी वाले और भीड़भाड़ वाले सुरक्षित क्षेत्र में जाएं।",
        "खतरे की रिपोर्ट करने के लिए पुलिस 112 या 100 पर कॉल करें।",
        "कपड़ों, रूप-रंग या वाहन नंबरों का विवरण नोट करें।",
        "यदि पास में खतरा हो तो मदद के लिए जोर-जोर से चिल्लाएं।"
      ],
      helplines: [
        { label: "पुलिस सहायता", number: "112" },
        { label: "महिला हेल्पलाइन", number: "181" }
      ],
      links: [
        { name: "राष्ट्रीय अपराध पोर्टल", url: "https://cybercrime.gov.in" }
      ],
      safety: "यदि संभव हो तो भागें। हमलावरों से न उलझें। महत्वपूर्ण अंगों की रक्षा करें।"
    },
    "Cybercrime": {
      steps: [
        "राष्ट्रीय साइबर टोल-फ्री नंबर 1930 पर कॉल करके तुरंत रिपोर्ट करें।",
        "आधिकारिक cybercrime.gov.in वेबसाइट पर अपनी शिकायत दर्ज करें।",
        "स्क्रीनशॉट, बैंक एसएमएस और लेनदेन आईडी एकत्र और सुरक्षित रखें।",
        "कार्ड ब्लॉक करने और खाता फ्रीज करने के लिए तुरंत अपने बैंक ग्राहक सेवा को कॉल करें।"
      ],
      helplines: [
        { label: "साइबर अपराध हेल्पलाइन", number: "1930" },
        { label: "पुलिस अलर्ट", number: "112" }
      ],
      links: [
        { name: "आधिकारिक साइबर पोर्टल", url: "https://cybercrime.gov.in" }
      ],
      safety: "ओटीपी, यूपीआई पिन या क्रेडेंशियल कभी साझा न करें। अवांछित लिंक पर क्लिक न करें।"
    },
    "Accident": {
      steps: [
        "वाहन की हैजर्ड लाइटें चालू करें और सक्रिय सड़क लेन से हट जाएं।",
        "पुलिस और पैरामेडिक भेजने के लिए तुरंत 112 या 108 डायल करें।",
        "वाहन की नंबर प्लेट और दुर्घटना में हुई क्षति की तस्वीरें लें।",
        "बिना विवाद किए बीमा विवरणों का आदान-प्रदान करें।"
      ],
      helplines: [
        { label: "एम्बुलेंस सेवा", number: "108" },
        { label: "पुलिस ईआरएसएस", number: "112" }
      ],
      links: [
        { name: "सड़क सुरक्षा मंत्रालय", url: "https://morth.nic.in" }
      ],
      safety: "चिंगारी/रिसाव से लगने वाली आग के कारण दुर्घटनाग्रस्त कारों से सुरक्षित दूरी बनाए रखें।"
    },
    "Document loss": {
      steps: [
        "स्थानीय पुलिस स्टेशन में तुरंत दस्तावेज़ गुम होने की रिपोर्ट (LDR) दर्ज करें।",
        "आधिकारिक जारीकर्ता प्राधिकरण पोर्टल (UIDAI, NSDL, PAN, पासपोर्ट) पर लॉग इन करें।",
        "सत्यापित लॉगिन के माध्यम से ऑनलाइन डुप्लीकेट रिप्रिंट आवेदन शुरू करें।",
        "पहचान की चोरी को रोकने के लिए क्रेडिट लॉग और बैंक प्रोफाइल की निगरानी करें।"
      ],
      helplines: [
        { label: "पुलिस सेवाएं", number: "112" }
      ],
      links: [
        { name: "यूआईडीएआई आधार पोर्टल", url: "https://myaadhaar.uidai.gov.in" }
      ],
      safety: "महत्वपूर्ण कार्डों की डिजिटल स्कैन प्रतियां सुरक्षित क्लाउड स्टोरेज में रखें।"
    },
    "Mental distress": {
      steps: [
        "बैठ जाएं, धीमी सांसें लें। गहरी सांस अंदर लें और बाहर छोड़ें।",
        "परामर्शदाता से बात करने के लिए राष्ट्रीय हेल्पलाइन किरण 1800-599-0019 पर कॉल करें।",
        "परिवार के किसी सदस्य, करीबी साथी या विश्वसनीय संपर्क से बात करें।",
        "तत्काल पेशेवर सहायता के लिए टेली-मानस हेल्पलाइन 14416 पर कॉल करें।"
      ],
      helplines: [
        { label: "किरण परामर्श", number: "18005990019" },
        { label: "टेली-मानस हेल्पलाइन", number: "14416" }
      ],
      links: [
        { name: "मानसिक स्वास्थ्य मार्गदर्शन", url: "https://mohfw.gov.in" }
      ],
      safety: "अपनी सांस पर ध्यान केंद्रित करें। आप अकेले नहीं हैं और सहायता केवल एक कॉल दूर है।"
    }
  },
  kn: {
    "Medical": {
      steps: [
        "ತಕ್ಷಣ ಆಂಬ್ಯುಲೆನ್ಸ್ 108 ಗೆ ಕರೆ ಮಾಡಿ.",
        "ಸಂತ್ರಸ್ತರು ಉಸಿರಾಡುತ್ತಿದ್ದಾರೆಯೇ ಮತ್ತು ಪ್ರಜ್ಞೆ ಇದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ.",
        "ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿರುವ ಗಾಯಗಳಿಗೆ ಸ್ವಚ್ಛವಾದ ಬಟ್ಟೆಯಿಂದ ಒತ್ತಡ ಹಾಕಿ.",
        "ಉಸಿರಾಟದ ಮಾರ್ಗವನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ ಮತ್ತು ಅವರನ್ನು ಬೆಚ್ಚಗಿಡಿ."
      ],
      helplines: [
        { label: "ಆಂಬ್ಯುಲೆನ್ಸ್", number: "108" },
        { label: "ತುರ್ತು ಪ್ರತಿಕ್ರಿಯೆ", number: "112" }
      ],
      links: [
        { name: "MOHFW ವೆಬ್‌ಸೈಟ್", url: "https://mohfw.gov.in" }
      ],
      safety: "ತಕ್ಷಣದ ಅಪಾಯವಿಲ್ಲದ ಹೊರತು ಸಂತ್ರಸ್ತರನ್ನು ಸ್ಥಳಾಂತರಿಸಬೇಡಿ. ಶಾಂತವಾಗಿರಿ."
    },
    "Crime": {
      steps: [
        "ತಕ್ಷಣವೇ ಬೆಳಕಿರುವ ಮತ್ತು ಜನರು ಇರುವ ಸುರಕ್ಷಿತ ಪ್ರದೇಶಕ್ಕೆ ಹೋಗಿ.",
        "ಬೆದರಿಕೆಯನ್ನು ವರದಿ ಮಾಡಲು ಪೊಲೀಸ್ 112 ಅಥವಾ 100 ಗೆ ಕರೆ ಮಾಡಿ.",
        "ಬಟ್ಟೆ, ನೋಟ ಅಥವಾ ವಾಹನ ಸಂಖ್ಯೆಗಳ ವಿವರಗಳನ್ನು ಗಮನಿಸಿ.",
        "ಹತ್ತಿರದಲ್ಲಿ ಅಪಾಯವಿದ್ದರೆ ಸಹಾಯಕ್ಕಾಗಿ ಜೋರಾಗಿ ಕಿರುಚಿಕೊಳ್ಳಿ."
      ],
      helplines: [
        { label: "ಪೊಲೀಸ್ ಸಹಾಯ", number: "112" },
        { label: "ಮಹಿಳಾ ಸಹಾಯವಾಣಿ", number: "181" }
      ],
      links: [
        { name: "ರಾಷ್ಟ್ರೀಯ ಅಪರಾಧ ಪೋರ್ಟಲ್", url: "https://cybercrime.gov.in" }
      ],
      safety: "ಸಾಧ್ಯವಾದರೆ ಓಡಿಹೋಗಿ. ದಾಳಿಕೋರರೊಂದಿಗೆ ಜಗಳವಾಡಬೇಡಿ. ಮುಖ್ಯ ಅಂಗಗಳನ್ನು ರಕ್ಷಿಸಿಕೊಳ್ಳಿ."
    },
    "Cybercrime": {
      steps: [
        "ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆ 1930 ಗೆ ಕರೆ ಮಾಡಿ ತಕ್ಷಣವೇ ವರದಿ ಮಾಡಿ.",
        "cybercrime.gov.in ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ನಿಮ್ಮ ದೂರನ್ನು ದಾಖಲಿಸಿ.",
        "ಸ್ಕ್ರೀನ್‌ಶಾಟ್‌ಗಳು, ಬ್ಯಾಂಕ್ ಸಂದೇಶಗಳು ಮತ್ತು ವಹಿವಾಟು ರಶೀದಿಗಳನ್ನು ಸಂಗ್ರಹಿಸಿಡಿ.",
        "ಕಾರ್ಡ್ ಬ್ಲಾಕ್ ಮಾಡಲು ಮತ್ತು ಬ್ಯಾಂಕ್ ಖಾತೆ ಮುಚ್ಚಲು ತಕ್ಷಣವೇ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಗ್ರಾಹಕ ಸೇವೆಗೆ ಕರೆ ಮಾಡಿ."
      ],
      helplines: [
        { label: "ಸೈಬರ್ ಸಹಾಯವಾಣಿ", number: "1930" },
        { label: "ಪೊಲೀಸ್ ಅಲರ್ಟ್", number: "112" }
      ],
      links: [
        { name: "ಅಧಿಕೃತ ಸೈಬರ್ ಪೋರ್ಟಲ್", url: "https://cybercrime.gov.in" }
      ],
      safety: "ಒಟಿಪಿ, ಯುಪಿಐ ಪಿನ್ ಅಥವಾ ಬ್ಯಾಂಕಿಂಗ್ ವಿವರಗಳನ್ನು ಯಾರಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ."
    },
    "Accident": {
      steps: [
        "ವಾಹನದ ಹ್ಯಾಜರ್ಡ್ ಲೈಟ್‌ಗಳನ್ನು ಆನ್ ಮಾಡಿ ಮತ್ತು ರಸ್ತೆಯಿಂದ ಪಕ್ಕಕ್ಕೆ ಸರಿಸಿ.",
        "ಪೊಲೀಸ್ ಮತ್ತು ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗಾಗಿ ತಕ್ಷಣ 112 ಅಥವಾ 108 ಗೆ ಕರೆ ಮಾಡಿ.",
        "ವಾಹನ ಸಂಖ್ಯೆ ಮತ್ತು ಹಾನಿಯ ಚಿತ್ರಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ.",
        "ಯಾವುದೇ ವಿವಾದವಿಲ್ಲದೆ ವಿಮಾ ವಿವರಗಳನ್ನು ವಿನಿಮಯ ಮಾಡಿಕೊಳ್ಳಿ."
      ],
      helplines: [
        { label: "ಆಂಬ್ಯುಲೆನ್ಸ್ ಸೇವೆ", number: "108" },
        { label: "ಪೊಲೀಸ್ ERSS", number: "112" }
      ],
      links: [
        { name: "ರಸ್ತೆ ಸುರಕ್ಷತೆ ಇಲಾಖೆ", url: "https://morth.nic.in" }
      ],
      safety: "ಬೆಂಕಿ ಅನಾಹುತಗಳನ್ನು ತಪ್ಪಿಸಲು ಅಪಘಾತಕ್ಕೀಡಾದ ಕಾರುಗಳಿಂದ ಸುರಕ್ಷಿತ ದೂರ ಕಾಯ್ದುಕೊಳ್ಳಿ."
    },
    "Document loss": {
      steps: [
        "ಸ್ಥಳೀಯ ಪೊಲೀಸ್ ಠಾಣೆಯಲ್ಲಿ ತಕ್ಷಣ ದಾಖಲೆ ನಷ್ಟದ ವರದಿ (LDR) ದಾಖಲಿಸಿ.",
        "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳಿಗೆ (UIDAI, NSDL, PAN, ಪಾಸ್‌ಪೋರ್ಟ್) ಭೇಟಿ ನೀಡಿ.",
        "ಸತ್ಯೀಕೃತ ಲಾಗಿನ್ ಮೂಲಕ ನಕಲಿ ದಾಖಲೆಗಾಗಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
        "ಗುರುತು ವಂಚನೆ ತಡೆಯಲು ಬ್ಯಾಂಕ್ ಖಾತೆಗಳ ಮೇಲೆ ನಿಗಾ ಇರಿಸಿ."
      ],
      helplines: [
        { label: "ಪೊಲೀಸ್ ಸೇವೆಗಳು", number: "112" }
      ],
      links: [
        { name: "ಯುಐಡಿಎಐ ಆಧಾರ್ ಪೋರ್ಟಲ್", url: "https://myaadhaar.uidai.gov.in" }
      ],
      safety: "ಪ್ರಮುಖ ಕಾರ್ಡ್‌ಗಳ ಡಿಜಿಟಲ್ ಪ್ರತಿಗಳನ್ನು ಸುರಕ್ಷಿತ ಕ್ಲೌಡ್ ಸ್ಟೋರೇಜ್‌ನಲ್ಲಿ ಇರಿಸಿ."
    },
    "Mental distress": {
      steps: [
        "ಕುಳಿತುಕೊಳ್ಳಿ, ನಿಧಾನವಾಗಿ ಉಸಿರಾಡಿ. ದೀರ್ಘವಾಗಿ ಉಸಿರನ್ನು ತೆಗೆದುಕೊಂಡು ಬಿಡಿ.",
        "ಕೌನ್ಸಿಲರ್ ಜೊತೆ ಮಾತನಾಡಲು ರಾಷ್ಟ್ರೀಯ ಸಹಾಯವಾಣಿ ಕಿರಣ್ 1800-599-0019 ಗೆ ಕರೆ ಮಾಡಿ.",
        "ಕುಟುಂಬದ ಸದಸ್ಯರು ಅಥವಾ ನಂಬಿಕಸ್ಥ ಸ್ನೇಹಿತರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
        "ತಕ್ಷಣದ ವೃತ್ತಿಪರ ಸಹಾಯಕ್ಕಾಗಿ ಟೆಲಿ-ಮಾನಸ್ ಸಹಾಯವಾಣಿ 14416 ಗೆ ಕರೆ ಮಾಡಿ."
      ],
      helplines: [
        { label: "ಕಿರಣ್ ಸಹಾಯವಾಣಿ", number: "18005990019" },
        { label: "ಟೆಲಿ-ಮಾನಸ್ ಸಹಾಯವಾಣಿ", number: "14416" }
      ],
      links: [
        { name: "ಮಾನಸಿಕ ಆರೋಗ್ಯ ಮಾರ್ಗದರ್ಶಿ", url: "https://mohfw.gov.in" }
      ],
      safety: "ನಿಮ್ಮ ಉಸಿರಾಟದ ಕಡೆ ಗಮನ ಕೊಡಿ. ಸಹಾಯಕ್ಕಾಗಿ ತಕ್ಷಣ ಸಂಪರ್ಕಿಸಿ."
    }
  }
};

export function generateResponseForCategory(category, lang) {
  const language = lang === 'hi' || lang === 'kn' ? lang : 'en';
  return EMERGENCY_GUIDES[language][category] || EMERGENCY_GUIDES[language]["Crime"];
}

// Fallback Mock services near current center coordinate to guarantee rich listings
export const generateFallbackMockServices = (center, queryType, radiusKm) => {
  const [lat, lon] = center;
  const list = [
    { name: "Fortis Emergency Care Wing", type: "hospital", symbol: "🏥", phone: "108", latOffset: 0.015, lonOffset: -0.012 },
    { name: "Apollo Chemist & Clinic", type: "medical store", symbol: "💊", phone: "102", latOffset: 0.005, lonOffset: -0.004 },
    { name: "Metro General Hospital", type: "hospital", symbol: "🏥", phone: "011-26515050", latOffset: -0.02, lonOffset: 0.025 },
    { name: "Police Chowki Branch", type: "police", symbol: "🛡️", phone: "112", latOffset: -0.01, lonOffset: -0.015 },
    { name: "Central PCR Division", type: "police", symbol: "🛡️", phone: "112", latOffset: 0.022, lonOffset: 0.012 },
    { name: "Nari Suraksha Crisis Center", type: "women safety center", symbol: "👩‍✈️", phone: "181", latOffset: 0.008, lonOffset: 0.022 },
    { name: "District Cyber Crime Unit", type: "cyber cell", symbol: "💻", phone: "1930", latOffset: -0.025, lonOffset: -0.008 },
    { name: "Apollo Pharmacy Store", type: "medical store", symbol: "💊", phone: "102", latOffset: -0.015, lonOffset: 0.015 },
    { name: "City Hospital Trauma Center", type: "hospital", symbol: "🏥", phone: "108", latOffset: 0.035, lonOffset: -0.04 },
    { name: "State Cyber Crime Cell HQ", type: "cyber cell", symbol: "💻", phone: "1930", latOffset: 0.042, lonOffset: 0.038 },
  ];

  return list.map((item, index) => {
    const sLat = lat + item.latOffset;
    const sLon = lon + item.lonOffset;
    const dist = haversineDistance(lat, lon, sLat, sLon);
    return {
      id: `fallback-${index}`,
      name: item.name,
      type: item.type,
      symbol: item.symbol,
      phone: item.phone,
      position: [sLat, sLon],
      distance_km: Math.round(dist * 10) / 10
    };
  })
  .filter(item => {
    if (queryType) {
      const q = queryType.toLowerCase();
      return item.type.toLowerCase().includes(q) || 
             item.name.toLowerCase().includes(q);
    }
    return true;
  })
  .filter(item => item.distance_km <= radiusKm);
};
