// js/quiz.js

/* =====================================================
   KAHVE QUİZİ - "Hangi Kahvesin?"
   Dallanma mantığı (branching logic) ile kullanıcıya
   2 soru sorup en uygun kahveyi önerir.
===================================================== */

// Kullanıcının verdiği cevapları burada tutuyoruz
let quizAnswers = {
    step1: null,
    step2: null
};

// Şu an hangi soruda olduğumuzu takip ediyoruz
let quizStep = 1;

// Soru havuzu: her adımda sorulacak soru ve seçenekleri burada tanımlı
const quizSteps = {
    1: {
        soru: "Sert ve yoğun kahve sever misin?",
        secenekler: [
            { etiket: "Evet", deger: "evet" },
            { etiket: "Hayır", deger: "hayir" }
        ]
    },
    2: {
        soru: "Sütlü mü seversin, yoksa sade mi?",
        secenekler: [
            { etiket: "Sütlü", deger: "sutlu" },
            { etiket: "Sade", deger: "sade" }
        ]
    },
    // Sert sevmeyenlere farklı bir 2. soru soruyoruz (dallanma burada başlıyor)
    "2-hayir": {
        soru: "Meyvemsi ve çiçeksi tatları sever misin?",
        secenekler: [
            { etiket: "Evet", deger: "evet" },
            { etiket: "Hayır", deger: "hayir" }
        ]
    }
};

// Cevap kombinasyonlarına göre önerilecek kahveler
const sonucHaritasi = {
    "evet-sutlu": "Premium Espresso Blend (Sütlü içimlik için birebir)",
    "evet-sade": "Premium Espresso Blend",
    "hayir-evet": "Etiyopya Yirgacheffe",
    "hayir-hayir": "Kolombiya Supremo"
};

// DOM elemanlarına referanslar (sayfa yüklenince alınacak)
let quizQuestionBox, quizQuestionText, quizButtonsWrapper, quizResultBox, resultCoffeeSpan;

document.addEventListener('DOMContentLoaded', () => {
    quizQuestionBox = document.getElementById('quiz-question-box');
    quizQuestionText = document.getElementById('quiz-question');
    quizButtonsWrapper = quizQuestionBox ? quizQuestionBox.querySelector('.quiz-buttons') : null;
    quizResultBox = document.getElementById('quiz-result');
    resultCoffeeSpan = document.getElementById('result-coffee');

    // Quiz bu sayfada yoksa hiçbir şey yapma
    if (!quizQuestionBox || !quizResultBox) return;

    // İlk soruyu ekrana bas
    renderStep(1);
});

/* =====================================================
   BİR SORUYU EKRANA ÇİZ
===================================================== */
function renderStep(stepKey) {
    const stepData = quizSteps[stepKey];
    if (!stepData) return;

    quizQuestionText.textContent = stepData.soru;

    // Butonları temizleyip yeniden oluştur
    quizButtonsWrapper.innerHTML = "";

    stepData.secenekler.forEach((secenek, index) => {
        const btn = document.createElement('button');
        btn.className = index === 0 ? 'btn-premium primary' : 'btn-premium secondary';
        btn.textContent = secenek.etiket;
        btn.onclick = () => nextQuiz(secenek.deger);
        quizButtonsWrapper.appendChild(btn);
    });
}

/* =====================================================
   KULLANICI BİR SEÇENEĞE TIKLADIĞINDA ÇALIŞIR
   (HTML'deki onclick="nextQuiz('evet')" bu fonksiyonu çağırır)
===================================================== */
function nextQuiz(cevap) {
    if (quizStep === 1) {
        quizAnswers.step1 = cevap;

        if (cevap === 'evet') {
            // Sert sevenlere sütlü/sade sorusu sorulacak
            quizStep = 2;
            renderStep(2);
        } else {
            // Sert sevmeyenlere farklı bir soru sorulacak
            quizStep = '2-hayir';
            renderStep('2-hayir');
        }
        return;
    }

    // İkinci soru cevaplandı, sonucu hesapla ve göster
    quizAnswers.step2 = cevap;
    showResult();
}

/* =====================================================
   SONUCU HESAPLA VE EKRANA GETİR
===================================================== */
function showResult() {
    const anahtar = `${quizAnswers.step1}-${quizAnswers.step2}`;
    const oneriKahve = sonucHaritasi[anahtar] || "Kolombiya Supremo";

    resultCoffeeSpan.textContent = oneriKahve;

    quizQuestionBox.classList.add('hidden');
    quizResultBox.classList.remove('hidden');
}

/* =====================================================
   "TEKRAR ÇÖZ" BUTONU
   (HTML'deki onclick="resetQuiz()" bu fonksiyonu çağırır)
===================================================== */
function resetQuiz() {
    quizStep = 1;
    quizAnswers = { step1: null, step2: null };

    quizResultBox.classList.add('hidden');
    quizQuestionBox.classList.remove('hidden');

    renderStep(1);
}

/* =====================================================
   END
===================================================== */