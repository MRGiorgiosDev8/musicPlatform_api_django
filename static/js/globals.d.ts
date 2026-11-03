/**
 * Внешние глобалы vendor-библиотек (gsap и плагины, bootstrap, wavesurfer,
 * emoji-picker): теперь импортируются из node_modules и выставляются на window
 * модулем static/js/entry/vendor-globals.js ДО выполнения first-party модулей
 * (см. base.html и docs о глобальном контракте). Типы намеренно широкие —
 * это сторонний код вне нашей типизации, dependency не добавляем.
 */
declare const gsap: any;
declare const bootstrap: any;
declare const SplitText: any;
