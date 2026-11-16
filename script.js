/**
 * ასტრიდ ლინდგრენის კვირეული - ძირითადი ლოგიკა (script.js)
 * სუფთა, უსაფრთხო ES6+ კოდი საგანმანათლებლო პორტალისთვის
 */

// Global State
const state = {
  soundEnabled: true,
  currentQuizIndex: 0,
  quizScore: 0,
  selectedCharacterMatcher: null,
  matchedPairsCount: 0,
  brushColor: '#2c3e50',
  brushSize: 8,
  activeStamp: null,
  isDrawing: false,
  lastX: 0,
  lastY: 0
};

// ==========================================================================
// Web Audio API Sound Synthesizer (No external audio files needed!)
// ==========================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, startTime = 0) {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Cheerful chime for correct answer
  chimeSuccess() {
    this.playTone(523.25, 'triangle', 0.15, 0);     // C5
    this.playTone(659.25, 'triangle', 0.15, 0.12);  // E5
    this.playTone(783.99, 'triangle', 0.18, 0.24);  // G5
    this.playTone(1046.50, 'triangle', 0.35, 0.36); // C6
  }

  // Gentle encouraging tone for retry
  tryAgainTone() {
    this.playTone(440, 'sine', 0.2, 0);
    this.playTone(392, 'sine', 0.3, 0.18);
  }

  // Soft click
  clickTone() {
    this.playTone(600, 'sine', 0.05, 0);
  }

  // Fanfare for awards
  fanfare() {
    this.playTone(523.25, 'triangle', 0.12, 0);
    this.playTone(523.25, 'triangle', 0.12, 0.12);
    this.playTone(523.25, 'triangle', 0.12, 0.24);
    this.playTone(659.25, 'triangle', 0.25, 0.36);
    this.playTone(783.99, 'triangle', 0.25, 0.55);
    this.playTone(1046.50, 'triangle', 0.5, 0.8);
  }
}

const sfx = new SoundFX();

// ==========================================================================
// Confetti Animation Engine
// ==========================================================================
class ConfettiEngine {
  constructor() {
    this.canvas = document.getElementById('confetti-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  launch(count = 70) {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: window.innerWidth / 2 + (Math.random() * 200 - 100),
        y: window.innerHeight * 0.4 + (Math.random() * 100 - 50),
        w: Math.random() * 10 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 14,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.28,
        opacity: 1
      });
    }

    if (!this.animId) {
      this.render();
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.007;

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.render());
    } else {
      this.animId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

const confetti = new ConfettiEngine();

// ==========================================================================
// Speech Synthesis (Text-To-Speech) Helper
// ==========================================================================
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    alert('ბრაუზერს არ აქვს ხმის გახმოვანების მხარდაჭერა.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88; // Slightly slower, clear for 2nd graders and L2 learners
  utterance.pitch = 1.1; // Friendly warm pitch

  // Try finding Georgian voice
  const voices = window.speechSynthesis.getVoices();
  const kaVoice = voices.find(v => v.lang.startsWith('ka') || v.lang.includes('GEO'));
  if (kaVoice) {
    utterance.voice = kaVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// ==========================================================================
// TAB NAVIGATION
// ==========================================================================
function initTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sfx.clickTone();
      const targetId = tab.getAttribute('data-tab');

      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
        targetPane.focus();
      }

      window.scrollTo({ top: 140, behavior: 'smooth' });
    });
  });
}

// ==========================================================================
// ACCESSIBILITY & HEADER CONTROLS
// ==========================================================================
function initHeaderControls() {
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const soundText = soundToggleBtn.querySelector('.ctrl-text');

  soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      soundIcon.textContent = '🔊';
      soundText.textContent = 'ხმა: ჩართულია';
      sfx.clickTone();
    } else {
      soundIcon.textContent = '🔇';
      soundText.textContent = 'ხმა: გამორთულია';
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  });

  const fontIncreaseBtn = document.getElementById('font-increase-btn');
  fontIncreaseBtn.addEventListener('click', () => {
    sfx.clickTone();
    document.body.classList.toggle('large-font');
    const isLarge = document.body.classList.contains('large-font');
    fontIncreaseBtn.querySelector('.ctrl-text').textContent = isLarge ? 'სტანდარტული შრიფტი' : 'დიდი შრიფტი';
  });

  // Help Modal
  const helpBtn = document.getElementById('help-modal-btn');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('close-help-modal');
  const modalOkBtn = document.getElementById('modal-ok-btn');

  const openModal = () => {
    sfx.clickTone();
    helpModal.classList.remove('hidden');
  };
  const closeModal = () => {
    sfx.clickTone();
    helpModal.classList.add('hidden');
  };

  helpBtn.addEventListener('click', openModal);
  closeHelpBtn.addEventListener('click', closeModal);
  modalOkBtn.addEventListener('click', closeModal);

  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeModal();
  });
}

// ==========================================================================
// TAB 1: CHARACTER CARDS INTERACTIONS
// ==========================================================================
function initCharacterCards() {
  // Voice read aloud on each card
  document.querySelectorAll('.btn-speak').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.clickTone();
      const textToSpeak = btn.getAttribute('data-text');
      speakText(textToSpeak);
    });
  });

  // Secret Gifts popup messages
  const characterGifts = {
    pippi: {
      title: '🪙 პეპის ოქროს მონეტა და რჩევა:',
      msg: '„მსოფლიოში ყველაზე დიდი ძალა კეთილი გულია! დაიცავი და დაეხმარე მათ, ვისაც ეს სჭირდება!“ ✨'
    },
    karlsson: {
      title: '🍩 კარლსონის ტკბილი რჩევა:',
      msg: '„გაუღიმე შენს გვერდით მჯდომ თანაკლასელს და უთხარი: მიხარია, რომ ჩემი მეგობარი ხარ!“ 🎈'
    },
    emil: {
      title: '🪵 ემილის ხის კაცუნა და რჩევა:',
      msg: '„თუ რამე შეგეშლება, ნუ შეგეშინდება! მთავარია, შეცდომა სიკეთითა და მზრუნველობით გამოასწორო!“ 🌟'
    },
    ronia: {
      title: '🌿 რონიას საგაზაფხულო ყვავილი:',
      msg: '„ნამდვილი მეგობრობა ყველა ბარიერს ამარცხებს! გაუწოდე ხელი ახალ მეგობარს და ერთად ითამაშეთ!“ 🕊️'
    }
  };

  document.querySelectorAll('.btn-secret-gift').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.chimeSuccess();
      confetti.launch(30);
      const giftKey = btn.getAttribute('data-gift');
      const gift = characterGifts[giftKey];
      if (gift) {
        alert(`${gift.title}\n\n${gift.msg}`);
      }
    });
  });
}

// ==========================================================================
// TAB 2: INTERACTIVE QUIZ & VALUE MATCHING GAME
// ==========================================================================
const quizData = [
  {
    category: '📖 პეპი გრძელწინდა',
    question: 'რა არის პეპი გრძელწინდას ყველაზე დიდი ძალა?',
    options: [
      { text: 'სიკეთე, გულუხვობა და სუსტების დაცვა ❤️', correct: true, feedback: 'სწორია! პეპი ძალიან ძლიერია, მაგრამ მისი მთავარი ძალა კეთილი გულია!' },
      { text: 'მხოლოდ ხეებზე ხტომა და ცელქობა 🌳', correct: false, feedback: 'პეპის ხეებზე ხტომა უყვარს, მაგრამ მისი მთავარი ძალა სიკეთეა!' },
      { text: 'ბევრი ტკბილეულის მარტო ჭამა 🍬', correct: false, feedback: 'პეპი ტკბილეულს ყოველთვის მეგობრებს უნაწილებს!' }
    ]
  },
  {
    category: '🚁 სახურავის ბინადარი კარლსონი',
    question: 'როგორ დაეხმარა კარლსონი პატარა ბიჭუნას?',
    options: [
      { text: 'ყველა მისი სათამაშო დაუმალა 📦', correct: false, feedback: 'არა, კარლსონი ბიჭუნას მეგობარი გახდა!' },
      { text: 'გახდა მისი მხიარული მეგობარი და გაუქრო მარტოობა 🤝', correct: true, feedback: 'ყოჩაღ! კარლსონმა ბიჭუნა გაახალისა და მარტოობას დააღწია თავი!' },
      { text: 'მხოლოდ სახურავიდან უყურებდა 🏠', correct: false, feedback: 'კარლსონი ბიჭუნას ოთახში სტუმრობდა და მასთან მეგობრობდა!' }
    ]
  },
  {
    category: '👦🏼 ემილის თავგადასავალი',
    question: 'რა კეთილშობილური საქციელი ჩაიდინა ემილმა თავისი მეგობარი ალფრედისთვის?',
    options: [
      { text: 'დიდ ქარბუქში ექიმთან წაიყვანა და გადაარჩინა ❄️', correct: true, feedback: 'ნამდვილად! ემილმა დიდი სიმამაცე და ერთგულება გამოიჩინა!' },
      { text: 'მხოლოდ ხის კაცუნა გამოუთალა 🪵', correct: false, feedback: 'ხის კაცუნებს ემილი თლიდა, მაგრამ ალფრედი ქარბუქში გადაარჩინა!' },
      { text: 'თავზე წვნიანის ქვაბი დაახურა 🍲', correct: false, feedback: 'ეს მისი მხიარული შემთხვევა იყო, მთავარი კი მეგობრის გადარჩენაა!' }
    ]
  },
  {
    category: '🌲 ყაჩაღის ასული რონია',
    question: 'როგორ მოიქცნენ რონია და ბირკი, მიუხედავად იმისა, რომ მათი ოჯახები ერთმანეთს ემტერებოდნენ?',
    options: [
      { text: 'ისინიც ერთმანეთს ემტერებოდნენ ⚔️', correct: false, feedback: 'არა, რონიამ და ბირკმა მტრობას მეგობრობა ამჯობინეს!' },
      { text: 'დამეგობრდნენ და მშვიდობა აირჩიეს 🕊️', correct: true, feedback: 'საოცარი პასუხია! მეგობრობამ ყველა დაბრკოლება დაამარცხა!' },
      { text: 'ერთმანეთს საერთოდ არ ელაპარაკებოდნენ 🤐', correct: false, feedback: 'ისინი ერთად თამაშობდნენ ტყეში და საუკეთესო მეგობრები გახდნენ!' }
    ]
  },
  {
    category: '🏛️ ბიბლიოთეკის წესები',
    question: 'როგორ უნდა მოვიქცეთ საუნივერსიტეტო ბიბლიოთეკაში?',
    options: [
      { text: 'ხმამაღლა უნდა ვიყვიროთ და ვითამაშოთ 📢', correct: false, feedback: 'ბიბლიოთეკაში ხმაური სხვებს კითხვაში ხელს უშლის!' },
      { text: 'ჩურჩულით ვისაუბროთ და წიგნებს ფრთხილად მოვეპყროთ 📖', correct: true, feedback: 'ყოჩაღ! ბიბლიოთეკაში სიმშვიდე და წიგნების გაფრთხილება მთავარი წესია!' },
      { text: 'წიგნის ფურცლები უნდა მოვხიოთ ✂️', correct: false, feedback: 'წიგნს სუფთა ხელებითა და სიფრთხილით ვფურცლავთ!' }
    ]
  },
  {
    category: '🤝 მეგობრობა და ინკლუზია',
    question: 'თუ შენი თანაკლასელი ჯერ კარგად ვერ საუბრობს ქართულად, როგორ მოიქცევი?',
    options: [
      { text: 'გავუღიმებ, დავეხმარები და ერთად ვითამაშებთ 🌟', correct: true, feedback: 'ბრწყინვალეა! ღიმილი და დახმარება საუკეთესო გზაა დამეგობრებისთვის!' },
      { text: 'არ დაველაპარაკები 🚶‍♂️', correct: false, feedback: 'ყველა ბავშვს სჭირდება მეგობარი და მხარდაჭერა!' },
      { text: 'დავტოვებ მარტო 🙁', correct: false, feedback: 'კარგი მეგობარი არავის ტოვებს მარტო!' }
    ]
  }
];

function initQuiz() {
  const qBadge = document.getElementById('q-category-badge');
  const qText = document.getElementById('q-text');
  const qOptions = document.getElementById('q-options');
  const qReadBtn = document.getElementById('q-read-btn');
  const nextQBtn = document.getElementById('next-q-btn');
  const feedbackBox = document.getElementById('quiz-feedback');
  const feedbackTitle = document.getElementById('feedback-title');
  const feedbackMsg = document.getElementById('feedback-message');
  const feedbackIcon = document.getElementById('feedback-icon');
  const progressText = document.getElementById('quiz-progress-text');
  const progressFill = document.getElementById('quiz-progress-fill');
  const starCount = document.getElementById('quiz-star-count');

  const quizCard = document.getElementById('quiz-question-card');
  const finishedCard = document.getElementById('quiz-finished-card');
  const restartBtn = document.getElementById('restart-quiz-btn');
  const finalScoreText = document.getElementById('final-score-text');

  function renderQuestion(index) {
    const q = quizData[index];
    qBadge.textContent = q.category;
    qText.textContent = q.question;
    feedbackBox.classList.add('hidden');
    nextQBtn.classList.add('hidden');

    progressText.textContent = `შეკითხვა: ${index + 1} / ${quizData.length}`;
    progressFill.style.width = `${((index + 1) / quizData.length) * 100}%`;
    starCount.textContent = `${state.quizScore} ⭐`;

    qOptions.innerHTML = '';

    const letters = ['A', 'B', 'C'];
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="opt-badge">${letters[idx]}</span><span>${opt.text}</span>`;

      btn.addEventListener('click', () => handleOptionClick(opt, btn));
      qOptions.appendChild(btn);
    });
  }

  function handleOptionClick(selectedOption, clickedBtn) {
    const allBtns = qOptions.querySelectorAll('.option-btn');

    if (selectedOption.correct) {
      sfx.chimeSuccess();
      confetti.launch(25);
      clickedBtn.classList.add('correct');
      allBtns.forEach(b => b.disabled = true);

      feedbackBox.className = 'quiz-feedback-box';
      feedbackIcon.textContent = '🎉';
      feedbackTitle.textContent = 'ყოჩაღ! სწორია! 🌟';
      feedbackMsg.textContent = selectedOption.feedback;
      feedbackBox.classList.remove('hidden');

      state.quizScore++;
      starCount.textContent = `${state.quizScore} ⭐`;

      nextQBtn.classList.remove('hidden');
    } else {
      sfx.tryAgainTone();
      clickedBtn.classList.add('incorrect');

      feedbackBox.className = 'quiz-feedback-box try-again';
      feedbackIcon.textContent = '💡';
      feedbackTitle.textContent = 'თითქმის გამოიცანი! სცადე კიდევ ერთხელ ❤️';
      feedbackMsg.textContent = selectedOption.feedback;
      feedbackBox.classList.remove('hidden');

      // Allow clicking another option
      setTimeout(() => {
        clickedBtn.classList.remove('incorrect');
      }, 1200);
    }
  }

  qReadBtn.addEventListener('click', () => {
    sfx.clickTone();
    const currentQ = quizData[state.currentQuizIndex];
    speakText(currentQ.question);
  });

  nextQBtn.addEventListener('click', () => {
    sfx.clickTone();
    state.currentQuizIndex++;
    if (state.currentQuizIndex < quizData.length) {
      renderQuestion(state.currentQuizIndex);
    } else {
      // Quiz completed!
      quizCard.classList.add('hidden');
      finishedCard.classList.remove('hidden');
      finalScoreText.textContent = `${quizData.length}-დან ${state.quizScore} ვარსკვლავი`;
      sfx.fanfare();
      confetti.launch(80);
    }
  });

  restartBtn.addEventListener('click', () => {
    sfx.clickTone();
    state.currentQuizIndex = 0;
    state.quizScore = 0;
    quizCard.classList.remove('hidden');
    finishedCard.classList.add('hidden');
    renderQuestion(0);
  });

  // Initial render
  renderQuestion(0);
}

// Matching Mini-Game Logic (Bidirectional & Kid-Friendly)
function initMatchingGame() {
  const charItems = document.querySelectorAll('#matcher-chars .matcher-item');
  const valItems = document.querySelectorAll('#matcher-values .matcher-item');
  const resultBanner = document.getElementById('matcher-result');

  let selectedChar = null;
  let selectedVal = null;

  function checkMatch() {
    if (!selectedChar || !selectedVal) return;

    const charId = selectedChar.getAttribute('data-id');
    const valId = selectedVal.getAttribute('data-id');

    if (charId === valId) {
      // Matched!
      sfx.chimeSuccess();
      confetti.launch(25);
      selectedChar.classList.remove('selected');
      selectedChar.classList.add('matched');
      selectedVal.classList.remove('selected');
      selectedVal.classList.add('matched');
      state.matchedPairsCount++;

      selectedChar = null;
      selectedVal = null;

      if (state.matchedPairsCount === 4) {
        sfx.fanfare();
        resultBanner.classList.remove('hidden');
        confetti.launch(70);
      }
    } else {
      // Mismatch
      sfx.tryAgainTone();
      selectedChar.classList.add('mismatch');
      selectedVal.classList.add('mismatch');

      const tempChar = selectedChar;
      const tempVal = selectedVal;
      selectedChar = null;
      selectedVal = null;

      setTimeout(() => {
        tempChar.classList.remove('selected', 'mismatch');
        tempVal.classList.remove('selected', 'mismatch');
      }, 700);
    }
  }

  charItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.classList.contains('matched')) return;
      sfx.clickTone();

      if (selectedChar === item) {
        item.classList.remove('selected');
        selectedChar = null;
        return;
      }

      charItems.forEach(c => c.classList.remove('selected'));
      item.classList.add('selected');
      selectedChar = item;

      checkMatch();
    });
  });

  valItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.classList.contains('matched')) return;
      sfx.clickTone();

      if (selectedVal === item) {
        item.classList.remove('selected');
        selectedVal = null;
        return;
      }

      valItems.forEach(v => v.classList.remove('selected'));
      item.classList.add('selected');
      selectedVal = item;

      checkMatch();
    });
  });
}

// ==========================================================================
// TAB 3: CREATIVE WORKSHOP (CANVAS, PROMPTS, KINDNESS TREE)
// ==========================================================================
const pairPrompts = [
  '🤝 ჰკითხეთ ერთმანეთს: რომელია თქვენი საყვარელი თამაში ეზოში?',
  '🗣️ ასწავლეთ ერთმანეთს ერთი სიტყვა: როგორ იტყვით თქვენს ენაზე „მეგობრობას“ ან „გამარჯობას“?',
  '🎨 ერთად მოიფიქრეთ და დახატეთ პეპის სახლის (ვილა „ვილეკულას“) ახალი მხიარული ოთახი!',
  '🍎 როლური თამაში: ერთი არის კარლსონი, მეორე - ბიჭუნა. გაუზიარეთ ერთმანეთს ვაშლი ან კანფეტი!',
  '🌟 შექმენით „საიდუმლო მეგობრული მისალმება“ (ხელის ჩამორთმევა ან თითების შეხება)!',
  '🪵 ემილის დავალება: გაიხსენეთ ერთი შემთხვევა, როცა ვინმეს დაეხმარეთ და უამბეთ მეწყვილეს.',
  '🌲 რონიას დავალება: წარმოიდგინეთ, რომ ჯადოსნურ ტყეში ხართ. რა ხმებს გაიგონებდით?',
  '🤗 უთხარით თქვენს მეწყვილეს ერთი კეთილი სიტყვა, რაც მასში ყველაზე მეტად მოგწონთ!'
];

function initCreativeWorkshop() {
  // 1. Discussion Prompts Generator
  const rollBtn = document.getElementById('roll-prompt-btn');
  const promptText = document.getElementById('prompt-text');

  rollBtn.addEventListener('click', () => {
    sfx.clickTone();
    const randomIndex = Math.floor(Math.random() * pairPrompts.length);
    promptText.textContent = pairPrompts[randomIndex];
    promptText.parentElement.style.animation = 'none';
    setTimeout(() => {
      promptText.parentElement.style.animation = 'popIn 0.3s ease-out';
    }, 10);
  });

  // 2. Interactive Digital Drawing Canvas
  const canvas = document.getElementById('drawing-board');
  if (canvas) {
    const ctx = canvas.getContext('2d');

    // Fixed internal resolution for consistent drawing on any device & smartboard
    canvas.width = 800;
    canvas.height = 420;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Color pickers
    const colorDots = document.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        sfx.clickTone();
        colorDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        state.brushColor = dot.getAttribute('data-color');
        state.activeStamp = null;
        document.querySelectorAll('.stamp-btn').forEach(s => s.classList.remove('active'));
      });
    });

    // Brush sizes
    const brushBtns = document.querySelectorAll('.brush-size-btn');
    brushBtns.forEach(b => {
      b.addEventListener('click', () => {
        sfx.clickTone();
        brushBtns.forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        state.brushSize = parseInt(b.getAttribute('data-size'), 10);
      });
    });

    // Stamps
    const stampBtns = document.querySelectorAll('.stamp-btn');
    stampBtns.forEach(s => {
      s.addEventListener('click', () => {
        sfx.clickTone();
        if (s.classList.contains('active')) {
          s.classList.remove('active');
          state.activeStamp = null;
        } else {
          stampBtns.forEach(btn => btn.classList.remove('active'));
          s.classList.add('active');
          state.activeStamp = s.getAttribute('data-stamp');
        }
      });
    });

    // Drawing handlers (Mouse + Touch with responsive scaling)
    function getCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
      const scaleX = rect.width ? (canvas.width / rect.width) : 1;
      const scaleY = rect.height ? (canvas.height / rect.height) : 1;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function startDrawing(e) {
      e.preventDefault();
      const { x, y } = getCoords(e);

      if (state.activeStamp) {
        // Draw Stamp
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.activeStamp, x, y);
        sfx.clickTone();
        return;
      }

      state.isDrawing = true;
      state.lastX = x;
      state.lastY = y;
    }

    function draw(e) {
      if (!state.isDrawing || state.activeStamp) return;
      e.preventDefault();
      const { x, y } = getCoords(e);

      ctx.beginPath();
      ctx.moveTo(state.lastX, state.lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = state.brushColor;
      ctx.lineWidth = state.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      state.lastX = x;
      state.lastY = y;
    }

    function stopDrawing() {
      state.isDrawing = false;
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);

    // Clear canvas
    document.getElementById('clear-canvas-btn').addEventListener('click', () => {
      sfx.clickTone();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    // Save/Download drawing
    document.getElementById('download-canvas-btn').addEventListener('click', () => {
      sfx.chimeSuccess();
      const link = document.createElement('a');
      link.download = 'astrid-lindgren-drawing.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }

  // 3. Tree of Kindness
  const leafPickers = document.querySelectorAll('.btn-leaf-pick');
  const leavesArea = document.getElementById('tree-leaves');

  leafPickers.forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.chimeSuccess();
      confetti.launch(15);
      const word = btn.getAttribute('data-word');

      const leaf = document.createElement('span');
      leaf.className = 'leaf-bubble';
      leaf.textContent = word;
      leavesArea.appendChild(leaf);
    });
  });
}

// ==========================================================================
// TAB 4: UNIVERSITY LIBRARY QUEST & CERTIFICATE GENERATOR
// ==========================================================================
function initLibraryQuest() {
  const checkboxes = document.querySelectorAll('.quest-checkbox');
  const questCount = document.getElementById('quest-count');
  const questProgressBar = document.getElementById('quest-progress-bar');
  const questAwardBox = document.getElementById('quest-award-box');

  const generateCertBtn = document.getElementById('generate-certificate-btn');
  const studentNameInput = document.getElementById('student-name-input');
  const studentClassSelect = document.getElementById('student-class-select');
  const printableCert = document.getElementById('printable-certificate');
  const certNameDisplay = document.getElementById('cert-name-display');
  const certClassDisplay = document.getElementById('cert-class-display');
  const printCertBtn = document.getElementById('print-cert-btn');

  function updateQuestProgress() {
    let checkedCount = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) checkedCount++;
    });

    questCount.textContent = `${checkedCount} / ${checkboxes.length}`;
    questProgressBar.style.width = `${(checkedCount / checkboxes.length) * 100}%`;

    if (checkedCount === checkboxes.length) {
      // Quest Complete!
      sfx.fanfare();
      confetti.launch(70);
      questAwardBox.classList.remove('hidden');
    }
  }

  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        sfx.chimeSuccess();
      } else {
        sfx.clickTone();
      }
      updateQuestProgress();
    });
  });

  generateCertBtn.addEventListener('click', () => {
    const name = studentNameInput.value.trim();
    if (!name) {
      alert('გთხოვთ, ჩაწეროთ მოსწავლის სახელი და გვარი!');
      studentNameInput.focus();
      return;
    }

    sfx.fanfare();
    confetti.launch(50);
    certNameDisplay.textContent = name;
    certClassDisplay.textContent = studentClassSelect.value;
    printableCert.classList.remove('hidden');
    printableCert.scrollIntoView({ behavior: 'smooth' });
  });

  printCertBtn.addEventListener('click', () => {
    window.print();
  });
}

// ==========================================================================
// Initialization on DOMContentLoaded
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTabNavigation();
  initHeaderControls();
  initCharacterCards();
  initQuiz();
  initMatchingGame();
  initCreativeWorkshop();
  initLibraryQuest();
});
