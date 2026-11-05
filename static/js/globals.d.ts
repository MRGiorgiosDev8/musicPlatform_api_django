/**
 * Внешние глобалы vendor-библиотек (gsap и плагины, bootstrap, wavesurfer,
 * emoji-picker): теперь импортируются из node_modules и выставляются на window
 * модулем static/js/entry/vendor-globals.ts ДО выполнения first-party модулей
 * (см. base.html и docs о глобальном контракте). Типы намеренно широкие —
 * это сторонний код вне нашей типизации, dependency не добавляем.
 */
declare const gsap: any;
declare const bootstrap: any;
declare const SplitText: any;

/**
 * Bootstrap импортируется как npm-модуль в static/js/entry/vendor-globals.ts.
 * У пакета нет встроенных TypeScript-деклараций, поэтому объявляем модуль
 * как shorthand ambient module: все его импорты получают тип any.
 */
declare module 'bootstrap';

/**
 * Глобалы, восстанавливаемые на window модулями vendor-globals.ts / utils.ts /
 * spinner_animation.ts и читаемые first-party модулями без импортов.
 * `gsap` и `MorphSVGPlugin` объявлены в navbar_logo_collapse_animation.ts и
 * wavesurfer_morph_button.ts (interface Window), здесь их не дублируем.
 */
interface Window {
  bootstrap: any;
  WaveSurfer: any;
  Spinners: any;
  Utils: any;
  ScrollToPlugin: any;
  CustomBounce: any;
  CustomEase: any;
  SplitText: any;
  ScrambleTextPlugin: any;
  DrawSVGPlugin: any;
  /**
   * Хелперы радиальной reveal-анимации (radial_reveal_animation.ts выставляет их
   * на window): обязательны как `window.*`, но могут быть не заданы в рантайме.
   */
  showActiveReveal: ((btn: Element | null | undefined) => void) | undefined;
  hideActiveReveal: ((btn: Element | null | undefined) => void) | undefined;
}

/**
 * Хелперы радиальной reveal-анимации (radial_reveal_animation.ts выставляет их
 * на window): utils.ts обращается к ним как к глобалам.
 */
declare const showActiveReveal: ((btn: Element | null | undefined) => void) | undefined;
declare const hideActiveReveal: ((btn: Element | null | undefined) => void) | undefined;

/**
 * marquee-анимация (utils.ts / index) вешает на элемент кастомный cleanup-хук.
 */
interface Element {
  __marqueeCleanup?: () => void;
}
