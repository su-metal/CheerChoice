/**
 * CheerChoice - Pose Detector HTML for WebView
 *
 * MediaPipe Pose を使った運動検出ロジックを含む自己完結型HTML。
 * WebView に埋め込んで使用する。
 *
 * 運動検出ロジックは THE TOLL (app.js) から移植。
 */

export function getPoseDetectorHtml(
  exerciseType: string,
  targetReps: number,
  voiceFeedbackEnabled: boolean = true
): string {
  // exerciseType を THE TOLL 形式に変換 (squat → SQUAT)
  const exType = exerciseType.toUpperCase();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      overflow: hidden;
      background: #000;
    }
    #video-container {
      position: relative;
      width: 100%; height: 100%;
    }
    video {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }
    canvas {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }
    #loading {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 18px;
      font-family: sans-serif;
      text-align: center;
      z-index: 10;
    }
    #loading .spinner {
      width: 40px; height: 40px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #guide {
      position: absolute;
      bottom: 60px; left: 50%;
      transform: translateX(-50%);
      color: #fff;
      font-size: 16px;
      font-family: sans-serif;
      background: rgba(0,0,0,0.6);
      padding: 8px 16px;
      border-radius: 20px;
      z-index: 10;
      display: none;
    }
    #flash-border {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      border: 6px solid transparent;
      pointer-events: none;
      z-index: 50;
      transition: border-color 0.05s ease-in;
    }
    #flash-border.flash {
      border-color: #A28FDB;
    }
  </style>
</head>
<body>
  <div id="video-container">
    <video id="camera" autoplay playsinline muted></video>
    <canvas id="pose-canvas"></canvas>
    <div id="loading">
      <div class="spinner"></div>
      Loading AI Model...
    </div>
    <div id="guide">SHOW FULL BODY</div>
    <div id="flash-border"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>

  <script>
  (function() {
    'use strict';

    // ============================================
    // Config from React Native
    // ============================================
    const EXERCISE_TYPE = '${exType}';
    const TARGET_REPS = ${targetReps};
    const VOICE_ENABLED = ${voiceFeedbackEnabled ? 'true' : 'false'};

    // ============================================
    // State
    // ============================================
    const state = {
      count: 0,
      isDown: false,
      pushupBaseline: null,
      situpBaseline: null,
      calibrationBuffer: [],
      startTime: Date.now(),
      _lastPersonTs: null,
      initialized: false
    };

    // ============================================
    // DOM
    // ============================================
    const videoEl = document.getElementById('camera');
    const canvasEl = document.getElementById('pose-canvas');
    const loadingEl = document.getElementById('loading');
    const guideEl = document.getElementById('guide');
    const ctx = canvasEl.getContext('2d');

    // ============================================
    // RN Communication
    // ============================================
    function sendToRN(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    // ============================================
    // Sound & Visual Feedback
    // ============================================
    var femaleVoice = null;
    function findFemaleVoice() {
      if (femaleVoice) return;
      var voices = speechSynthesis.getVoices();
      // Prefer English female voices
      var preferred = ['female', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'tessa'];
      for (var i = 0; i < voices.length; i++) {
        var name = voices[i].name.toLowerCase();
        if (voices[i].lang.startsWith('en') && preferred.some(function(p) { return name.indexOf(p) >= 0; })) {
          femaleVoice = voices[i];
          return;
        }
      }
      // Fallback: any English voice
      for (var j = 0; j < voices.length; j++) {
        if (voices[j].lang.startsWith('en')) {
          femaleVoice = voices[j];
          return;
        }
      }
    }

    if (window.speechSynthesis) {
      speechSynthesis.onvoiceschanged = findFemaleVoice;
      findFemaleVoice();
    }

    function speakCount(num) {
      try {
        if (!VOICE_ENABLED) return;
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        var utter = new SpeechSynthesisUtterance(String(num));
        utter.rate = 1.1;
        utter.pitch = 1.2;
        utter.volume = 1.0;
        utter.lang = 'en-US';
        findFemaleVoice();
        if (femaleVoice) utter.voice = femaleVoice;
        speechSynthesis.speak(utter);
      } catch (e) {}
    }

    var flashEl = document.getElementById('flash-border');
    var flashTimer = null;
    function flashBorder() {
      flashEl.classList.add('flash');
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(function() {
        flashEl.classList.remove('flash');
      }, 200);
    }

    // ============================================
    // Exercise Detection (from THE TOLL app.js)
    // ============================================
    function calculateAngle(a, b, c) {
      const r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let deg = Math.abs(r * 180 / Math.PI);
      return deg > 180 ? 360 - deg : deg;
    }

    function handleSquatDetection(lm) {
      const leftAngle = calculateAngle(lm[23], lm[25], lm[27]);
      const rightAngle = calculateAngle(lm[24], lm[26], lm[28]);

      // Wait 2 seconds for user to get ready
      if (Date.now() - state.startTime < 2000) return;

      if (!state.isDown && leftAngle < 105 && rightAngle < 105) {
        state.isDown = true;
      } else if (state.isDown && leftAngle > 165 && rightAngle > 165) {
        countRep();
      }
    }

    function handlePushupDetection(lm) {
      if (lm[11].visibility < 0.6 || lm[12].visibility < 0.6) {
        state.calibrationBuffer = [];
        return;
      }

      const shoulderY = (lm[11].y + lm[12].y) / 2;

      // Calibration: wait for stable baseline
      if (state.pushupBaseline === null) {
        showGuide('STAY STILL - CALIBRATING');

        state.calibrationBuffer.push(shoulderY);

        if (state.calibrationBuffer.length > 30) {
          const avg = state.calibrationBuffer.reduce((a, b) => a + b) / state.calibrationBuffer.length;
          const variance = state.calibrationBuffer.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / state.calibrationBuffer.length;

          if (variance < 0.0001) {
            state.pushupBaseline = avg;
            state.calibrationBuffer = [];
            hideGuide();
          } else {
            state.calibrationBuffer.shift();
          }
        }
        return;
      }

      const thresholdDown = 0.12;
      const thresholdUp = 0.05;
      const diff = Math.abs(shoulderY - state.pushupBaseline);

      if (!state.isDown && diff > thresholdDown) {
        state.isDown = true;
      } else if (state.isDown && diff < thresholdUp) {
        countRep();
      }
    }

    function handleSitupDetection(lm) {
      const pts = [lm[0], lm[11], lm[12]].filter(function(p) { return p.visibility > 0.5; });
      if (pts.length === 0) {
        state.calibrationBuffer = [];
        return;
      }

      const currentY = pts.reduce(function(sum, p) { return sum + p.y; }, 0) / pts.length;

      // Calibration
      if (state.situpBaseline === null) {
        showGuide('STAY STILL - CALIBRATING');

        state.calibrationBuffer.push(currentY);

        if (state.calibrationBuffer.length > 30) {
          const avg = state.calibrationBuffer.reduce((a, b) => a + b) / state.calibrationBuffer.length;
          const variance = state.calibrationBuffer.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / state.calibrationBuffer.length;

          if (variance < 0.0001) {
            state.situpBaseline = avg;
            state.calibrationBuffer = [];
            hideGuide();
          } else {
            state.calibrationBuffer.shift();
          }
        }
        return;
      }

      const thresholdDown = 0.18;
      const thresholdUp = 0.07;
      const diff = Math.abs(currentY - state.situpBaseline);

      if (!state.isDown && diff > thresholdDown) {
        state.isDown = true;
      } else if (state.isDown && diff < thresholdUp) {
        countRep();
      }
    }

    function countRep() {
      state.isDown = false;
      state.count++;
      speakCount(state.count);
      flashBorder();
      sendToRN({ type: 'count', count: state.count });
    }

    // ============================================
    // Drawing
    // ============================================
    function drawPose(lm, w, h) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      var connections = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
      connections.forEach(function(pair) {
        var a = pair[0], b = pair[1];
        ctx.beginPath();
        ctx.moveTo(lm[a].x * w, lm[a].y * h);
        ctx.lineTo(lm[b].x * w, lm[b].y * h);
        ctx.stroke();
      });

      // Draw joint dots
      ctx.fillStyle = 'rgba(162, 143, 219, 0.9)';
      [11,12,13,14,15,16,23,24,25,26,27,28].forEach(function(idx) {
        ctx.beginPath();
        ctx.arc(lm[idx].x * w, lm[idx].y * h, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // ============================================
    // Guide helpers
    // ============================================
    function showGuide(text) {
      guideEl.textContent = text;
      guideEl.style.display = 'block';
    }

    function hideGuide() {
      guideEl.style.display = 'none';
    }

    // ============================================
    // Pose Results Handler
    // ============================================
    function onPoseResults(results) {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      if (!results.poseLandmarks) {
        showGuide('NO PERSON DETECTED');
        // Reset baselines if no person for 2+ seconds
        if (state._lastPersonTs && Date.now() - state._lastPersonTs > 2000) {
          state.pushupBaseline = null;
          state.situpBaseline = null;
          state.calibrationBuffer = [];
        }
        return;
      }

      var lm = results.poseLandmarks;
      state._lastPersonTs = Date.now();

      // Check required landmarks visibility
      var requiredLandmarks = [];
      var visibilityMsg = 'SHOW FULL BODY';

      if (EXERCISE_TYPE === 'SQUAT') {
        requiredLandmarks = [11, 12, 23, 24, 25, 26, 27, 28];
        visibilityMsg = 'SHOW FULL BODY';
      } else if (EXERCISE_TYPE === 'PUSHUP') {
        requiredLandmarks = [11, 12, 23, 24];
        visibilityMsg = 'SHOW YOUR TORSO';
      } else if (EXERCISE_TYPE === 'SITUP') {
        requiredLandmarks = [0, 11, 12];
        visibilityMsg = 'SHOW UPPER BODY';
      }

      var isVisible = requiredLandmarks.every(function(idx) {
        return lm[idx] && lm[idx].visibility > 0.5;
      });

      if (!isVisible) {
        showGuide(visibilityMsg);
        return;
      }

      hideGuide();
      drawPose(lm, canvasEl.width, canvasEl.height);

      if (EXERCISE_TYPE === 'SQUAT') {
        handleSquatDetection(lm);
      } else if (EXERCISE_TYPE === 'PUSHUP') {
        handlePushupDetection(lm);
      } else if (EXERCISE_TYPE === 'SITUP') {
        handleSitupDetection(lm);
      }
    }

    // ============================================
    // Initialize MediaPipe
    // ============================================
    function sleep(ms) {
      return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    async function tryGetUserMediaWithRetry(constraints, retries) {
      var lastError = null;
      for (var i = 0; i < retries; i++) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          lastError = err;
          // NotReadableError often recovers by short delay/retry.
          if (err && err.name === 'NotReadableError' && i < retries - 1) {
            await sleep(350);
            continue;
          }
          throw err;
        }
      }
      throw lastError || new Error('Could not access camera');
    }

    async function getCameraStreamWithFallback() {
      const attempts = [
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: { facingMode: { ideal: 'user' } }, audio: false },
        { video: true, audio: false }
      ];

      let lastError = null;
      for (var i = 0; i < attempts.length; i++) {
        try {
          return await tryGetUserMediaWithRetry(attempts[i], 3);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error('Could not access camera');
    }

    async function initMediaPipe() {
      try {
        // Release stale stream if exists.
        try {
          if (videoEl.srcObject && videoEl.srcObject.getTracks) {
            videoEl.srcObject.getTracks().forEach(function(track) { track.stop(); });
            videoEl.srcObject = null;
          }
        } catch (e) {}

        // Check getUserMedia availability
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          // Try legacy API as polyfill
          if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
            navigator.mediaDevices = navigator.mediaDevices || {};
            navigator.mediaDevices.getUserMedia = function(constraints) {
              var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
              return new Promise(function(resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
              });
            };
          } else {
            throw new Error('No navigator.mediaDevices.getUserMedia exists.');
          }
        }

        // First get camera stream to confirm it works
        var stream = await getCameraStreamWithFallback();
        videoEl.srcObject = stream;

        // Some WebViews reject play() promise without user gesture.
        // Do not treat this as fatal if frames can still be read.
        try { await videoEl.play(); } catch (e) {}

        // Wait for video dimensions
        await new Promise(function(resolve, reject) {
          var timeoutId = setTimeout(function() {
            reject(new Error('Video metadata timeout'));
          }, 4000);

          function check() {
            if (videoEl.videoWidth && videoEl.videoHeight) {
              clearTimeout(timeoutId);
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          }
          check();
        });

        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;

        // Now init MediaPipe
        var pose = new Pose({
          locateFile: function(file) {
            return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file;
          }
        });

        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onPoseResults);

        // Process frames in a loop
        async function processFrame() {
          if (!state.initialized) return;
          try {
            await pose.send({ image: videoEl });
          } catch (e) {}
          requestAnimationFrame(processFrame);
        }

        loadingEl.style.display = 'none';
        state.initialized = true;
        state.startTime = Date.now();
        sendToRN({ type: 'ready' });

        processFrame();

      } catch (err) {
        var baseMessage = (err && err.name ? err.name + ': ' : '') + ((err && err.message) || 'Could not access camera');
        var message = baseMessage;
        if (err && err.name === 'NotReadableError') {
          message = baseMessage + ' (Front camera may be in use by another app/session. Please retry.)';
        }
        loadingEl.innerHTML = '<div style="color:#FF6B6B;font-size:16px;">Camera Error</div><div style="color:#aaa;font-size:14px;margin-top:8px;">' + message + '</div>';
        sendToRN({ type: 'error', message: message });
      }
    }

    // Start (single automatic retry for flaky device camera init)
    initMediaPipe().catch(function() {
      setTimeout(function() {
        initMediaPipe();
      }, 500);
    });
  })();
  </script>
</body>
</html>
`;
}
