/**
 * Vendor-инициализация Vite-бандла (Фаза 4: node_modules вместо static/vendor).
 *
 * Модуль обязан импортироваться ПЕРВЫМ в bootstrap.js: по ESM-семантике его
 * тело выполняется до всех последующих first-party импортов. Этим
 * воспроизводится прежний порядок base.html, где vendor-скрипты грузились
 * классическими <script> ДО first-party JS:
 *  - window.gsap / window.bootstrap / window.WaveSurfer и плагины GSAP
 *    выставляются раньше модулей, ссылающихся на эти глобалы;
 *  - CSS подключается в прежнем каскадном порядке <link> из base.html:
 *    bootstrap-icons -> bootstrap -> hamburgers.
 */
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'hamburgers/dist/hamburgers.min.css';

// Bootstrap JS (модалки, оффканва, тултипы и пр.)
import * as bootstrap from 'bootstrap';

// GSAP + плагины (прежний набор из static/vendor/gsap)
import { gsap } from 'gsap';
import ScrollToPlugin from 'gsap/ScrollToPlugin';
import CustomBounce from 'gsap/CustomBounce';
import CustomEase from 'gsap/CustomEase';
import SplitText from 'gsap/SplitText';
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin';
import DrawSVGPlugin from 'gsap/DrawSVGPlugin';
import MorphSVGPlugin from 'gsap/MorphSVGPlugin';

// Wavesurfer (превью-плееры)
import WaveSurfer from 'wavesurfer.js';

// emoji-picker-element: custom element <emoji-picker> регистрируется при импорте
import 'emoji-picker-element';

gsap.registerPlugin(
  ScrollToPlugin,
  CustomBounce,
  CustomEase,
  SplitText,
  ScrambleTextPlugin,
  DrawSVGPlugin,
  MorphSVGPlugin
);

// Восстановление глобального контракта, который раньше обеспечивали
// классические vendor-скрипты: first-party модули обращаются к этим именам
// без импортов (см. static/js/globals.d.ts).
window.gsap = gsap;
window.bootstrap = bootstrap;
window.WaveSurfer = WaveSurfer;
window.ScrollToPlugin = ScrollToPlugin;
window.CustomBounce = CustomBounce;
window.CustomEase = CustomEase;
window.SplitText = SplitText;
window.ScrambleTextPlugin = ScrambleTextPlugin;
window.DrawSVGPlugin = DrawSVGPlugin;
window.MorphSVGPlugin = MorphSVGPlugin;
