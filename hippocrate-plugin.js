/**
 * Hippocrate Plugin — Drop-in wake word listener + floating icon
 * 
 * USAGE: Add this to any page:
 *   <script src="hippocrate-plugin.js"></script>
 * 
 * Features:
 *  - Floating ⚕️ Siri-like button (bottom-right corner)
 *  - Tap to open Hippocrate.html
 *  - Long-press to activate voice (wake word listener)
 *  - Continuous wake word detection for "Hippocrate"
 *  - Visual feedback: pulses when listening, glows when wake word heard
 */
(function () {
    'use strict';

    // Don't inject if already on Hippocrate page
    if (window.location.pathname.includes('Hippocrate.html')) return;

    const HIPPO_URL = 'Hippocrate.html';
    let wakeRecognition = null;
    let wakeActive = localStorage.getItem('hippo_wake') === 'true';
    let longPressTimer = null;

    // ─── Inject Styles ───
    const style = document.createElement('style');
    style.textContent = `
    @keyframes hippoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes hippoPulse{0%,100%{box-shadow:0 4px 20px rgba(109,40,217,.3)}50%{box-shadow:0 4px 30px rgba(109,40,217,.6),0 0 0 8px rgba(109,40,217,.1)}}
    @keyframes hippoGlow{0%{box-shadow:0 0 0 0 rgba(34,211,238,.5)}70%{box-shadow:0 0 0 14px rgba(34,211,238,0)}100%{box-shadow:0 0 0 0 rgba(34,211,238,0)}}
    @keyframes hippoFadeIn{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}

    #hippocrateFloatingBtn{
      position:fixed;bottom:24px;right:24px;z-index:99999;
      width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;
      background:linear-gradient(135deg,#6d28d9,#7c3aed);
      color:#fff;font-size:26px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 20px rgba(109,40,217,.35);
      transition:all .3s ease;
      animation:hippoFadeIn .4s ease,hippoFloat 3s ease-in-out infinite;
      -webkit-tap-highlight-color:transparent;
      user-select:none;
    }
    #hippocrateFloatingBtn:hover{
      transform:scale(1.1);
      box-shadow:0 6px 25px rgba(109,40,217,.45);
    }
    #hippocrateFloatingBtn:active{
      transform:scale(.95);
    }
    #hippocrateFloatingBtn.listening{
      animation:hippoPulse 2s infinite;
    }
    #hippocrateFloatingBtn.heard{
      background:linear-gradient(135deg,#0891b2,#22d3ee);
      animation:hippoGlow 1s ease 3;
    }

    #hippocrateTooltip{
      position:fixed;bottom:88px;right:20px;z-index:99999;
      background:#fff;color:#1e293b;
      padding:8px 14px;border-radius:10px;
      font-family:'Inter','Plus Jakarta Sans',sans-serif;
      font-size:12px;font-weight:600;
      box-shadow:0 4px 15px rgba(0,0,0,.12);
      opacity:0;pointer-events:none;
      transition:opacity .3s;white-space:nowrap;
      border:1px solid #e2e8f0;
    }
    #hippocrateTooltip::after{
      content:'';position:absolute;bottom:-6px;right:24px;
      width:12px;height:12px;background:#fff;
      border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;
      transform:rotate(45deg);
    }
    #hippocrateTooltip.show{opacity:1;}

    #hippocrateWakeBadge{
      position:fixed;bottom:84px;right:32px;z-index:99999;
      width:18px;height:18px;border-radius:50%;
      background:#22c55e;border:2px solid #fff;
      display:none;
      box-shadow:0 2px 6px rgba(0,0,0,.15);
    }
    #hippocrateWakeBadge.active{display:block;}
  `;
    document.head.appendChild(style);

    // ─── Create FAB ───
    const btn = document.createElement('button');
    btn.id = 'hippocrateFloatingBtn';
    btn.innerHTML = '⚕️';
    btn.setAttribute('aria-label', 'Open Hippocrate AI');
    document.body.appendChild(btn);

    // ─── Tooltip ───
    const tooltip = document.createElement('div');
    tooltip.id = 'hippocrateTooltip';
    tooltip.textContent = 'Ask Hippocrate';
    document.body.appendChild(tooltip);

    // ─── Wake Badge (green dot) ───
    const badge = document.createElement('div');
    badge.id = 'hippocrateWakeBadge';
    document.body.appendChild(badge);

    // ─── Events ───
    // Single tap → open Hippocrate
    btn.addEventListener('click', function (e) {
        if (longPressTimer) return; // ignore if was long press
        window.location.href = HIPPO_URL;
    });

    // Long press → toggle wake word
    btn.addEventListener('pointerdown', function () {
        longPressTimer = setTimeout(function () {
            longPressTimer = 'fired';
            wakeActive = !wakeActive;
            localStorage.setItem('hippo_wake', wakeActive);
            if (wakeActive) {
                startWake();
                flashTooltip('🎙️ Wake word ON — say "Hippocrate"');
            } else {
                stopWake();
                flashTooltip('Wake word OFF');
            }
        }, 600);
    });

    btn.addEventListener('pointerup', function () {
        if (longPressTimer !== 'fired') clearTimeout(longPressTimer);
        longPressTimer = null;
    });

    btn.addEventListener('pointerleave', function () {
        if (longPressTimer !== 'fired') clearTimeout(longPressTimer);
        longPressTimer = null;
    });

    // Hover tooltip
    btn.addEventListener('mouseenter', function () {
        tooltip.textContent = wakeActive ? '🎙️ Listening · Tap to open' : 'Ask Hippocrate';
        tooltip.classList.add('show');
    });
    btn.addEventListener('mouseleave', function () {
        tooltip.classList.remove('show');
    });

    // ─── Wake Word ───
    function startWake() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
        stopWake();
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        wakeRecognition = new SR();
        wakeRecognition.continuous = true;
        wakeRecognition.interimResults = true;
        wakeRecognition.lang = 'en-IN';

        btn.classList.add('listening');
        badge.classList.add('active');

        wakeRecognition.onresult = function (e) {
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript.toLowerCase();
                if (t.includes('hippocrate') || t.includes('hippocrat') || t.includes('hipocrate') || t.includes('hypocrite') || t.includes('hippo crate')) {
                    btn.classList.remove('listening');
                    btn.classList.add('heard');
                    flashTooltip('✨ Opening Hippocrate...');
                    stopWake();
                    setTimeout(function () { window.location.href = HIPPO_URL; }, 800);
                    return;
                }
            }
        };

        wakeRecognition.onerror = function (e) {
            if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('Hippo wake err:', e.error);
        };

        wakeRecognition.onend = function () {
            if (wakeActive) {
                try { wakeRecognition.start(); } catch (e) { }
            }
        };

        try { wakeRecognition.start(); } catch (e) { }
    }

    function stopWake() {
        btn.classList.remove('listening', 'heard');
        badge.classList.remove('active');
        if (wakeRecognition) {
            try { wakeRecognition.abort(); } catch (e) { }
            wakeRecognition = null;
        }
    }

    function flashTooltip(msg) {
        tooltip.textContent = msg;
        tooltip.classList.add('show');
        setTimeout(function () { tooltip.classList.remove('show'); }, 2500);
    }

    // ─── Auto-start if wake was enabled ───
    if (wakeActive) {
        // Small delay to not interfere with page load
        setTimeout(startWake, 1000);
    }

})();
